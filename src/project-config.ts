import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseDotenv } from "dotenv";
import { parse as parseYaml } from "yaml";

export type ProjectPrivacy = "standard" | "private" | "strict";
export type CaptureProfile = "minimal" | "balanced" | "full";

export interface AgentmemoryProjectConfig {
  schema_version: 1;
  project_id: string;
  privacy: ProjectPrivacy;
  capture_profile: CaptureProfile;
  source_roots: string[];
  decision_roots: string[];
  exclude_globs: string[];
  external_processing: boolean;
  root: string;
  manifest_path?: string;
  override_path?: string;
}

type ConfigLayer = Partial<
  Omit<
    AgentmemoryProjectConfig,
    "schema_version" | "project_id" | "root" | "manifest_path" | "override_path"
  >
> & {
  schema_version?: number;
  project_id?: string;
};

const PRIVACY_ORDER: Record<ProjectPrivacy, number> = {
  standard: 0,
  private: 1,
  strict: 2,
};

export const DEFAULT_EXCLUDE_GLOBS = [
  "**/.env",
  "**/.env.*",
  "**/*secret*",
  "**/*credential*",
  "**/.git/**",
  "**/node_modules/**",
  "**/.cache/**",
  "**/dist/**",
  "**/build/**",
  "**/target/**",
  "**/.codex/**",
  "**/.claude/**",
  "**/.agents/**",
  "**/.aiwg/working/**",
] as const;

function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      if (glob[i + 2] === "/") {
        pattern += "(?:.*/)?";
        i += 2;
      } else {
        pattern += ".*";
        i++;
      }
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`, "i");
}

export function normalizedProjectPath(path: string, root: string): string {
  const absolute = isAbsolute(path) ? path : resolve(root, path);
  return relative(root, absolute).replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isProjectPathExcluded(
  path: string,
  config: Pick<AgentmemoryProjectConfig, "root" | "exclude_globs">,
): boolean {
  const normalized = normalizedProjectPath(path, config.root);
  return config.exclude_globs.some((glob) => globToRegExp(glob).test(normalized));
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  if (value.trim().toLowerCase() === "true") return true;
  if (value.trim().toLowerCase() === "false") return false;
  return undefined;
}

function asList(value: unknown): string[] | undefined {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : undefined;
  if (!raw) return undefined;
  const result = raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return result.length > 0 ? result : undefined;
}

function asPrivacy(value: unknown): ProjectPrivacy | undefined {
  return value === "standard" || value === "private" || value === "strict"
    ? value
    : undefined;
}

function asCaptureProfile(value: unknown): CaptureProfile | undefined {
  return value === "minimal" || value === "balanced" || value === "full"
    ? value
    : undefined;
}

function userHome(): string {
  return process.env["HOME"] || process.env["USERPROFILE"] || homedir();
}

function expandHome(path: string): string {
  if (path === "~") return userHome();
  if (path.startsWith("~/")) return join(userHome(), path.slice(2));
  return path;
}

function canonicalPath(path: string): string {
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    return absolute;
  }
}

export function projectPathHash(path: string): string {
  return createHash("sha256")
    .update(canonicalPath(path))
    .digest("hex")
    .slice(0, 24);
}

function git(cwd: string, args: string[]): string | undefined {
  try {
    const output = execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 750,
    }).trim();
    return output || undefined;
  } catch {
    return undefined;
  }
}

export function findProjectRoot(cwd = process.cwd()): string {
  const requested = canonicalPath(cwd);
  return canonicalPath(
    git(requested, ["rev-parse", "--show-toplevel"]) ?? requested,
  );
}

export function normalizeGitRemote(remote: string): string | undefined {
  let value = remote.trim();
  if (!value) return undefined;

  const scpMatch = value.match(/^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/);
  if (scpMatch && !value.includes("://")) {
    value = `ssh://${scpMatch[1]}/${scpMatch[2]}`;
  }

  try {
    const parsed = new URL(value);
    if (!parsed.hostname || parsed.protocol === "file:") return undefined;
    const path = decodeURIComponent(parsed.pathname)
      .replace(/^\/+/, "")
      .replace(/\/+$/, "")
      .replace(/\.git$/i, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) return undefined;
    const hostname = parsed.hostname.toLowerCase();
    const host = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    const normalizedSegments = ["github.com", "gitlab.com"].includes(hostname)
      ? segments.map((segment) => segment.toLowerCase())
      : segments;
    return `${host}/${normalizedSegments.join("/")}`;
  } catch {
    return undefined;
  }
}

export function inferProjectId(root: string): string {
  const remote =
    git(root, ["remote", "get-url", "origin"]) ??
    git(root, ["remote", "get-url", "--all", "upstream"]);
  const normalizedRemote = remote ? normalizeGitRemote(remote) : undefined;
  if (remote && !normalizedRemote) {
    throw new Error("configured Git remote cannot be normalized safely");
  }
  return normalizedRemote ?? `local/${projectPathHash(root)}`;
}

function readConfigFile(path: string): ConfigLayer | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const parsed = parseYaml(readFileSync(path, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return undefined;
    }
    const raw = parsed as Record<string, unknown>;
    return {
      schema_version:
        typeof raw["schema_version"] === "number"
          ? raw["schema_version"]
          : undefined,
      project_id: asString(raw["project_id"]),
      privacy: asPrivacy(raw["privacy"]),
      capture_profile: asCaptureProfile(raw["capture_profile"]),
      source_roots: asList(raw["source_roots"]),
      decision_roots: asList(raw["decision_roots"]),
      exclude_globs: asList(raw["exclude_globs"]),
      external_processing: asBoolean(raw["external_processing"]),
    };
  } catch {
    return undefined;
  }
}

export function getUserProjectConfigPath(root: string): string {
  return join(
    userHome(),
    ".agentmemory",
    "projects",
    `${projectPathHash(root)}.yaml`,
  );
}

export function loadAgentmemoryEnvironment(): Record<string, string> {
  const envPath = join(userHome(), ".agentmemory", ".env");
  let fileEnv: Record<string, string> = {};
  if (existsSync(envPath)) {
    try {
      fileEnv = parseDotenv(readFileSync(envPath));
    } catch {
      fileEnv = {};
    }
  }
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  if (!asString(process.env["AGENTMEMORY_SECRET"])) {
    const secretFile = asString(process.env["AGENTMEMORY_SECRET_FILE"]);
    if (secretFile) {
      try {
        const secret = readFileSync(expandHome(secretFile), "utf8").trim();
        if (secret) process.env["AGENTMEMORY_SECRET"] = secret;
      } catch {
        // Authentication remains unset and the server applies its normal policy.
      }
    }
  }
  return { ...fileEnv, ...process.env } as Record<string, string>;
}

function envLayer(env: Record<string, string>): ConfigLayer {
  return {
    project_id:
      asString(env["AGENTMEMORY_PROJECT_ID"]) ??
      asString(env["AGENTMEMORY_PROJECT_NAME"]),
    privacy: asPrivacy(env["AGENTMEMORY_PRIVACY"]),
    capture_profile: asCaptureProfile(env["AGENTMEMORY_CAPTURE_PROFILE"]),
    source_roots: asList(env["AGENTMEMORY_SOURCE_ROOTS"]),
    decision_roots: asList(env["AGENTMEMORY_DECISION_ROOTS"]),
    exclude_globs: asList(env["AGENTMEMORY_EXCLUDE_GLOBS"]),
    external_processing: asBoolean(env["AGENTMEMORY_EXTERNAL_PROCESSING"]),
  };
}

function mostRestrictivePrivacy(layers: ConfigLayer[]): ProjectPrivacy {
  let selected: ProjectPrivacy = "strict";
  let found = false;
  for (const layer of layers) {
    if (!layer.privacy) continue;
    if (!found || PRIVACY_ORDER[layer.privacy] > PRIVACY_ORDER[selected]) {
      selected = layer.privacy;
    }
    found = true;
  }
  return found ? selected : "strict";
}

function firstDefined<T>(
  layersHighToLow: ConfigLayer[],
  select: (layer: ConfigLayer) => T | undefined,
  fallback: T,
): T {
  for (const layer of layersHighToLow) {
    const value = select(layer);
    if (value !== undefined) return value;
  }
  return fallback;
}

export function resolveProjectConfig(cwd = process.cwd()): AgentmemoryProjectConfig {
  const env = loadAgentmemoryEnvironment();
  const root = findProjectRoot(cwd);
  const manifestPath = join(root, ".agentmemory", "project.yaml");
  const explicitOverride = asString(env["AGENTMEMORY_PROJECT_CONFIG"]);
  const overridePath = explicitOverride
    ? canonicalPath(
        isAbsolute(explicitOverride)
          ? expandHome(explicitOverride)
          : join(root, explicitOverride),
      )
    : getUserProjectConfigPath(root);
  const repository = readConfigFile(manifestPath) ?? {};
  const user = readConfigFile(overridePath) ?? {};
  const processLayer = envLayer(env);
  const configuredProjectId =
    asString(processLayer.project_id) ??
    asString(user.project_id) ??
    asString(repository.project_id);
  const inferred: ConfigLayer = {
    schema_version: 1,
    project_id: configuredProjectId ?? inferProjectId(root),
    privacy: "strict",
    capture_profile: "balanced",
    source_roots: ["src", "test", "tests"],
    decision_roots: [
      ".aiwg/architecture/adr",
      ".aiwg/architecture/adrs",
      ".aiwg/decisions/adr",
      "docs/adr",
      "docs/adrs",
    ],
    exclude_globs: [...DEFAULT_EXCLUDE_GLOBS],
    external_processing: false,
  };
  const highToLow = [processLayer, user, repository, inferred];
  const privacy = mostRestrictivePrivacy([
    repository,
    user,
    processLayer,
  ]);
  const requestedExternal = firstDefined(
    highToLow,
    (layer) => layer.external_processing,
    false,
  );

  return {
    schema_version: 1,
    project_id: firstDefined(
      highToLow,
      (layer) => asString(layer.project_id),
      `local/${projectPathHash(root)}`,
    ),
    privacy,
    capture_profile: firstDefined(
      highToLow,
      (layer) => layer.capture_profile,
      "balanced",
    ),
    source_roots: firstDefined(
      highToLow,
      (layer) => layer.source_roots,
      ["src", "test", "tests"],
    ),
    decision_roots: firstDefined(
      highToLow,
      (layer) => layer.decision_roots,
      [],
    ),
    exclude_globs: firstDefined(
      highToLow,
      (layer) => layer.exclude_globs,
      [...DEFAULT_EXCLUDE_GLOBS],
    ),
    external_processing: privacy === "strict" ? false : requestedExternal,
    root,
    ...(existsSync(manifestPath) ? { manifest_path: manifestPath } : {}),
    ...(existsSync(overridePath) ? { override_path: overridePath } : {}),
  };
}

export function projectDisplayName(projectId: string): string {
  return basename(projectId) || projectId;
}
