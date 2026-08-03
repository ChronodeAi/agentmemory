import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const prompts = vi.hoisted(() => ({
  note: vi.fn(),
  multiselect: vi.fn(async () => {
    throw new Error("interactive multiselect should not run in non-TTY onboarding");
  }),
  select: vi.fn(async () => {
    throw new Error("interactive select should not run in non-TTY onboarding");
  }),
  confirm: vi.fn(async () => true),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
  log: {
    warn: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@clack/prompts", () => prompts);
vi.mock("../src/cli/connect/index.js", () => ({
  resolveAdapter: vi.fn(),
  runAdapter: vi.fn(),
}));

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];
const AUTH_ENV_KEYS = [
  "AGENTMEMORY_SECRET",
  "AGENTMEMORY_SECRET_FILE",
  "AGENTMEMORY_ADMIN_SECRET",
  "AGENTMEMORY_ADMIN_SECRET_FILE",
  "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
  "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE",
  "AGENTMEMORY_PROJECT_CAPABILITY_TOKEN",
  "AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE",
  "AGENTMEMORY_STRICT_CAPABILITY_MODE",
] as const;
const ORIGINAL_AUTH_ENV = new Map(
  AUTH_ENV_KEYS.map((key) => [key, process.env[key]]),
);
const stdinTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
const stdoutTtyDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");

let sandboxHome: string;

function setTTY(value: boolean): void {
  Object.defineProperty(process.stdin, "isTTY", { value, configurable: true });
  Object.defineProperty(process.stdout, "isTTY", { value, configurable: true });
}

function restoreTTY(): void {
  if (stdinTtyDescriptor) Object.defineProperty(process.stdin, "isTTY", stdinTtyDescriptor);
  else delete (process.stdin as NodeJS.ReadStream & { isTTY?: boolean }).isTTY;
  if (stdoutTtyDescriptor) Object.defineProperty(process.stdout, "isTTY", stdoutTtyDescriptor);
  else delete (process.stdout as NodeJS.WriteStream & { isTTY?: boolean }).isTTY;
}

async function freshOnboarding() {
  vi.resetModules();
  return await import("../src/cli/onboarding.js");
}

describe("cli onboarding", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-onboarding-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    for (const key of AUTH_ENV_KEYS) delete process.env[key];
    setTTY(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreTTY();
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    for (const key of AUTH_ENV_KEYS) {
      const value = ORIGINAL_AUTH_ENV.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("does not prompt and records default preferences when onboarding runs without a TTY", async () => {
    const { runOnboarding } = await freshOnboarding();

    const result = await runOnboarding();

    expect(result).toEqual({ agents: [], provider: null });
    expect(prompts.multiselect).not.toHaveBeenCalled();
    expect(prompts.select).not.toHaveBeenCalled();
    expect(prompts.confirm).not.toHaveBeenCalled();

    const preferencesPath = join(sandboxHome, ".agentmemory", "preferences.json");
    expect(existsSync(preferencesPath)).toBe(true);
    const preferences = JSON.parse(readFileSync(preferencesPath, "utf-8"));
    expect(preferences).toMatchObject({
      schemaVersion: 1,
      lastAgent: null,
      lastAgents: [],
      lastProvider: null,
      skipSplash: true,
    });
    expect(typeof preferences.firstRunAt).toBe("string");

    const envPath = join(sandboxHome, ".agentmemory", ".env");
    const env = readFileSync(envPath, "utf8");
    expect(env).toContain("AGENTMEMORY_SECRET_FILE=~/.agentmemory/secret");
    expect(env).toContain(
      "AGENTMEMORY_ADMIN_SECRET_FILE=~/.agentmemory/admin-secret",
    );
    expect(env).toContain(
      "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE=~/.agentmemory/project-capability-secret",
    );
    for (const name of ["secret", "admin-secret", "project-capability-secret"]) {
      const path = join(sandboxHome, ".agentmemory", name);
      expect(readFileSync(path, "utf8").trim().length).toBeGreaterThanOrEqual(32);
      expect(statSync(path).mode & 0o777).toBe(0o600);
    }
  });
});
