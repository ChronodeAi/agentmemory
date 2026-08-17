import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createProjectCapabilityToken,
  DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  isStrictCapabilityMode,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../auth.js";

const DEFAULT_URL = "http://localhost:3111";
const DEFAULT_HEALTH_PROBE_TIMEOUT_MS = 2_000;
const CALL_TIMEOUT_MS = 15_000;
const LOCAL_MODE_TTL_MS = 30_000;
const CAPABILITY_TTL_SECONDS = 300;

function probeTimeoutMs(): number {
  const raw = process.env["AGENTMEMORY_PROBE_TIMEOUT_MS"];
  if (!raw) return DEFAULT_HEALTH_PROBE_TIMEOUT_MS;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_HEALTH_PROBE_TIMEOUT_MS;
}

function forceProxy(): boolean {
  const raw = process.env["AGENTMEMORY_FORCE_PROXY"];
  return raw === "1" || raw === "true";
}

export interface ProxyHandle {
  mode: "proxy";
  baseUrl: string;
  call: (path: string, init?: RequestInit) => Promise<unknown>;
}

export interface LocalHandle {
  mode: "local";
}

export type Handle = ProxyHandle | LocalHandle;

let cached: Handle | null = null;
let cachedAt = 0;
let probeInFlight: Promise<Handle> | null = null;

// `${VAR}`-style placeholders ship in plugin/.mcp.json so MCP hosts that
// expand them (Claude Code, Cursor) substitute the user's shell value.
// Hosts that DON'T expand pass the literal string `"${AGENTMEMORY_URL}"`
// through to our subprocess — that string is truthy, defeats the `||`
// fallback, and would have us POST to `${AGENTMEMORY_URL}/agentmemory/...`
// (DNS failure). Strip any literal placeholder we see so the fallback
// engages instead.
export function resolveEnvOrEmpty(name: string): string {
  const raw = process.env[name];
  if (!raw) return "";
  if (raw.startsWith("${") && raw.endsWith("}")) return "";
  return raw;
}

function resolveEnvValue(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  const placeholder = trimmed.match(
    /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-(.*))?\}$/,
  );
  return placeholder ? (placeholder[1]?.trim() ?? "") : trimmed;
}

function userEnv(): Record<string, string> {
  const path = join(homedir(), ".agentmemory", ".env");
  if (!existsSync(path)) return {};
  const vars: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      const quote = value[0] === "'" || value[0] === '"' ? value[0] : "";
      if (quote) {
        const close = value.indexOf(quote, 1);
        value = close >= 0 ? value.slice(1, close) : value.slice(1);
      } else {
        const comment = value.indexOf(" #");
        if (comment >= 0) value = value.slice(0, comment).trim();
      }
      vars[key] = value;
    }
  } catch {
    return {};
  }
  return vars;
}

function configuredEnvValue(
  name: string,
  fileEnv: Record<string, string>,
): string {
  const raw = Object.prototype.hasOwnProperty.call(process.env, name)
    ? process.env[name]
    : fileEnv[name];
  return resolveEnvValue(raw);
}

function agentmemorySecret(): string {
  const fileEnv = userEnv();
  const direct = configuredEnvValue("AGENTMEMORY_SECRET", fileEnv);
  if (direct) return direct;
  const secretFile = configuredEnvValue("AGENTMEMORY_SECRET_FILE", fileEnv);
  if (!secretFile) return "";
  const path = secretFile.startsWith("~/")
    ? join(homedir(), secretFile.slice(2))
    : secretFile;
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

function secretFromEnvironmentOrFile(
  directName: string,
  fileName: string,
  defaultFileName?: string,
): string {
  const fileEnv = userEnv();
  const direct = configuredEnvValue(directName, fileEnv);
  if (direct) return direct;
  const configuredFile =
    configuredEnvValue(fileName, fileEnv) ||
    (defaultFileName
      ? join(homedir(), ".agentmemory", defaultFileName)
      : "");
  if (!configuredFile) return "";
  const path = configuredFile.startsWith("~/")
    ? join(homedir(), configuredFile.slice(2))
    : configuredFile;
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

function projectCapability(project: string): string {
  const fileEnv = userEnv();
  const configuredToken = configuredEnvValue(
    "AGENTMEMORY_PROJECT_CAPABILITY_TOKEN",
    fileEnv,
  );
  if (configuredToken) return configuredToken;
  const signingSecret = secretFromEnvironmentOrFile(
    "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
    "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE",
    "project-capability-secret",
  );
  if (signingSecret) {
    const issuedAt = Math.floor(Date.now() / 1000);
    return createProjectCapabilityToken(
      {
        version: 1,
        audience:
          configuredEnvValue(
            "AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE",
            fileEnv,
          ) || DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
        project,
        issuedAt,
        expiresAt: issuedAt + CAPABILITY_TTL_SECONDS,
      },
      signingSecret,
    );
  }
  if (!isStrictCapabilityMode(
    configuredEnvValue("AGENTMEMORY_STRICT_CAPABILITY_MODE", fileEnv),
  )) {
    return agentmemorySecret();
  }
  throw new Error(
    "project capability credentials are unavailable; configure AGENTMEMORY_PROJECT_CAPABILITY_SECRET or its secret file",
  );
}

function baseUrl(): string {
  return (resolveEnvOrEmpty("AGENTMEMORY_URL") || DEFAULT_URL).replace(/\/+$/, "");
}

function authHeader(): Record<string, string> {
  const secret = agentmemorySecret();
  return secret ? { authorization: `Bearer ${secret}` } : {};
}

function requestBody(init?: RequestInit): Record<string, unknown> {
  if (typeof init?.body !== "string") return {};
  try {
    const parsed = JSON.parse(init.body) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function requestAuthHeaders(
  path: string,
  init?: RequestInit,
): Record<string, string> {
  const body = requestBody(init);
  const argumentsBody =
    body["arguments"] &&
    typeof body["arguments"] === "object" &&
    !Array.isArray(body["arguments"])
      ? (body["arguments"] as Record<string, unknown>)
      : {};
  const parsedUrl = new URL(path, DEFAULT_URL);
  const scope =
    body["scope"] ??
    argumentsBody["scope"] ??
    parsedUrl.searchParams.get("scope");
  const projectValue =
    body["project"] ??
    argumentsBody["project"] ??
    parsedUrl.searchParams.get("project");
  const project =
    typeof projectValue === "string" ? projectValue.trim() : "";

  if (scope === "global" || parsedUrl.pathname === "/agentmemory/migrate") {
    const adminSecret = secretFromEnvironmentOrFile(
      "AGENTMEMORY_ADMIN_SECRET",
      "AGENTMEMORY_ADMIN_SECRET_FILE",
    );
    const secret = adminSecret || agentmemorySecret();
    return secret ? { authorization: `Bearer ${secret}` } : {};
  }
  if (!project) return authHeader();
  const capability = projectCapability(project);
  return {
    authorization: `Bearer ${capability}`,
    [PROJECT_CAPABILITY_PROJECT_HEADER]: project,
  };
}

/**
 * Probes the agentmemory server's livez endpoint. Returns a Response-shaped
 * object whose `ok` flag drives the proxy/local-fallback decision.
 *
 * Tests can swap this via {@link setLivezProbe} to avoid the real 2s
 * AbortController race that destabilises mcp-standalone test runs (#449).
 * Production callers should leave it on the default.
 */
export type LivezProbe = (
  url: string,
  timeoutMs: number,
  headers: Record<string, string>,
) => Promise<{ ok: boolean; status?: number; statusText?: string }>;

const defaultLivezProbe: LivezProbe = async (url, timeoutMs, headers) => {
  const res = await fetch(`${url}/agentmemory/livez`, {
    method: "GET",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return { ok: res.ok, status: res.status, statusText: res.statusText };
};

let livezProbe: LivezProbe = defaultLivezProbe;

/**
 * Override the livez probe. Intended for tests — production code should rely
 * on the default fetch-based probe. Calling without an argument restores the
 * default. Pair with {@link resetHandleForTests} so the cached handle is
 * dropped before the next call.
 */
export function setLivezProbe(fn?: LivezProbe): void {
  livezProbe = fn ?? defaultLivezProbe;
}

async function probe(url: string): Promise<boolean> {
  const timeout = probeTimeoutMs();
  try {
    const res = await livezProbe(url, timeout, authHeader());
    if (!res.ok) {
      process.stderr.write(
        `[@agentmemory/mcp] livez probe ${url}/agentmemory/livez -> ${res.status ?? "?"} ${res.statusText ?? ""}; falling back to local InMemoryKV (set AGENTMEMORY_FORCE_PROXY=1 to skip the probe)\n`,
      );
    }
    return res.ok;
  } catch (err) {
    process.stderr.write(
      `[@agentmemory/mcp] livez probe ${url}/agentmemory/livez failed in ${timeout}ms: ${err instanceof Error ? err.message : String(err)}; falling back to local InMemoryKV (set AGENTMEMORY_FORCE_PROXY=1 to skip the probe, or raise AGENTMEMORY_PROBE_TIMEOUT_MS)\n`,
    );
    return false;
  }
}

export function invalidateHandle(): void {
  cached = null;
  cachedAt = 0;
}

export async function resolveHandle(): Promise<Handle> {
  const now = Date.now();
  if (cached) {
    if (cached.mode === "local" && now - cachedAt >= LOCAL_MODE_TTL_MS) {
      cached = null;
      cachedAt = 0;
    } else {
      return cached;
    }
  }
  if (probeInFlight) return probeInFlight;
  const url = baseUrl();
  const skipProbe = forceProxy();
  probeInFlight = (async () => {
    const up = skipProbe ? true : await probe(url);
    if (skipProbe) {
      process.stderr.write(
        `[@agentmemory/mcp] AGENTMEMORY_FORCE_PROXY set; skipping livez probe and trusting ${url}\n`,
      );
    }
    if (up) {
      const handle: ProxyHandle = {
        mode: "proxy",
        baseUrl: url,
        call: async (path, init) => {
          const res = await fetch(`${url}${path}`, {
            ...init,
            headers: {
              "content-type": "application/json",
              ...requestAuthHeaders(path, init),
              ...(init?.headers as Record<string, string> | undefined),
            },
            signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          });
          if (!res.ok) {
            throw new Error(
              `${init?.method || "GET"} ${path} -> ${res.status} ${res.statusText}`,
            );
          }
          const text = await res.text();
          return text ? JSON.parse(text) : null;
        },
      };
      cached = handle;
      cachedAt = Date.now();
      return handle;
    }
    const local: LocalHandle = { mode: "local" };
    cached = local;
    cachedAt = Date.now();
    return local;
  })();
  try {
    return await probeInFlight;
  } finally {
    probeInFlight = null;
  }
}

export function resetHandleForTests(): void {
  cached = null;
  cachedAt = 0;
  probeInFlight = null;
  livezProbe = defaultLivezProbe;
}
