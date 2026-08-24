import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  ensureProjectCapabilitySecret,
  generateCapabilitySecret,
  projectCapabilitySecretFile,
} from "../src/cli/connect/capability-secret.js";
import { buildDiagnostics, type DoctorEffects } from "../src/cli/doctor-diagnostics.js";

function stubEffects(
  overrides: Partial<DoctorEffects> = {},
): DoctorEffects {
  return {
    envFileExists: () => true,
    readEnvFile: () => ({}),
    runtimeEnv: () => ({ AGENTMEMORY_STRICT_CAPABILITY_MODE: "true" }),
    secretFileHasValue: () => false,
    pidfileExists: () => false,
    pidfilePidIsAlive: () => null,
    findIiiBinary: () => "/Users/test/.local/bin/iii",
    localBinIiiPath: () => "/Users/test/.local/bin/iii",
    iiiBinaryVersion: () => "0.11.2",
    viewerReachable: async () => true,
    runInit: async () => ({ ok: true }),
    openEditor: async () => ({ ok: true }),
    provisionProjectCapability: async () => ({
      ok: true,
      message: "generated",
    }),
    runIiiInstaller: async () => ({ ok: true }),
    runStop: async () => ({ ok: true }),
    runStart: async () => ({ ok: true }),
    clearEnginePidAndState: () => {},
    ...overrides,
  };
}

describe("zero-touch project capability provisioning", () => {
  const ORIGINAL_HOME = process.env["HOME"];
  let sandboxHome: string;

  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "am-capability-"));
    process.env["HOME"] = sandboxHome;
    delete process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE"];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("generates a 64-hex-char secret in a mode-0600 file", () => {
    const result = ensureProjectCapabilitySecret();
    expect(result.provisioned).toBe(true);
    expect(result.reused).toBe(false);
    expect(result.path).toBe(
      join(sandboxHome, ".agentmemory", "project-capability-secret"),
    );
    const content = readFileSync(result.path, "utf8");
    expect(content.trim()).toMatch(/^[a-f0-9]{64}$/);
    // Only the newlines differ from the raw secret.
    expect((statSync(result.path).mode & 0o777)).toBe(0o600);
  });

  it("leaves an existing populated file byte-for-byte untouched", () => {
    const path = projectCapabilitySecretFile();
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "user-chosen-secret\n", { mode: 0o600 });
    const before = statSync(path);
    const result = ensureProjectCapabilitySecret();
    expect(result).toEqual({ path, provisioned: false, reused: true });
    expect(readFileSync(path, "utf8")).toBe("user-chosen-secret\n");
    expect(statSync(path).mtimeMs).toBe(before.mtimeMs);
    expect(statSync(path).mode & 0o777).toBe(before.mode & 0o777);
  });

  it("provisions over a pre-existing empty file and enforces 0600", () => {
    const path = projectCapabilitySecretFile();
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "", { mode: 0o644 });
    const result = ensureProjectCapabilitySecret();
    expect(result.provisioned).toBe(true);
    expect(readFileSync(path, "utf8").trim()).toMatch(/^[a-f0-9]{64}$/);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("honours AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE overrides", () => {
    process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE"] =
      join(sandboxHome, "custom", "cap-secret");
    const result = ensureProjectCapabilitySecret();
    expect(result.path).toBe(join(sandboxHome, "custom", "cap-secret"));
    expect(existsSync(result.path)).toBe(true);
    expect(statSync(result.path).mode & 0o777).toBe(0o600);
  });

  it("generateCapabilitySecret returns fresh 32-byte hex values", () => {
    const a = generateCapabilitySecret();
    const b = generateCapabilitySecret();
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(b).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe("doctor capability diagnostic after zero-touch provisioning", () => {
  function findDiagnostic(effects: DoctorEffects) {
    return buildDiagnostics(effects).find(
      (d) => d.id === "project-capability-credentials",
    )!;
  }

  it("is no longer manual-only", () => {
    const diagnostic = findDiagnostic(stubEffects());
    expect(diagnostic.manualOnly).toBeFalsy();
    expect(typeof diagnostic.fix).toBe("function");
  });

  it("reports the provisioned secret file via the auto fix + recheck", async () => {
    let provisionedPath: string | null = null;
    const diagnostic = findDiagnostic(
      stubEffects({
        provisionProjectCapability: async () => {
          provisionedPath = "/tmp/test/.agentmemory/project-capability-secret";
          return { ok: true, message: `generated at ${provisionedPath}` };
        },
        secretFileHasValue: (path) => path === provisionedPath,
      }),
    );
    const ctx = {
      baseUrl: "http://localhost:3111",
      viewerUrl: "http://localhost:3113",
      envPath: "/tmp/test/.agentmemory/.env",
      pidfilePath: "/tmp/test/.agentmemory/iii.pid",
      enginePath: "/tmp/test/.agentmemory/engine-state.json",
      pinnedVersion: "0.11.2",
    };
    await expect(diagnostic.check(ctx)).resolves.toMatchObject({
      ok: false,
      detail: "no project capability signing credential",
    });
    const fixResult = await diagnostic.fix(ctx);
    expect(fixResult.ok).toBe(true);
    // After the zero-touch fix the same check reports the credential as
    // provisioned instead of demanding manual editing.
    await expect(diagnostic.check(ctx)).resolves.toMatchObject({
      ok: true,
      detail: `secret file: ${provisionedPath}`,
    });
  });
});
