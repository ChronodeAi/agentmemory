import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];
let home: string;

async function freshModule() {
  vi.resetModules();
  return import("../src/cli/local-access.js");
}

describe("local access setup", () => {
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), "agentmemory-local-access-"));
    process.env["HOME"] = home;
    process.env["USERPROFILE"] = home;
    for (const key of [
      "AGENTMEMORY_SECRET",
      "AGENTMEMORY_SECRET_FILE",
      "AGENTMEMORY_ADMIN_SECRET",
      "AGENTMEMORY_ADMIN_SECRET_FILE",
      "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
      "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE",
      "AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE",
      "AGENTMEMORY_STRICT_CAPABILITY_MODE",
    ]) delete process.env[key];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    rmSync(home, { recursive: true, force: true });
  });

  it("creates the expected files and remains byte-idempotent", async () => {
    const { ensureLocalAccessConfiguration } = await freshModule();
    const first = ensureLocalAccessConfiguration();
    const before = new Map(
      ["secret", "admin-secret", "project-capability-secret"].map((name) => [
        name,
        readFileSync(join(home, ".agentmemory", name), "utf8"),
      ]),
    );
    const envBefore = readFileSync(first.envPath, "utf8");

    const second = ensureLocalAccessConfiguration();
    expect(second.createdFiles).toEqual([]);
    expect(second.appendedKeys).toEqual([]);
    expect(readFileSync(first.envPath, "utf8")).toBe(envBefore);
    for (const [name, value] of before) {
      expect(readFileSync(join(home, ".agentmemory", name), "utf8")).toBe(value);
    }
  });

  it("preserves an explicitly configured value", async () => {
    const envPath = join(home, ".agentmemory", ".env");
    const { ensureLocalAccessConfiguration } = await freshModule();
    ensureLocalAccessConfiguration(envPath);
    writeFileSync(
      envPath,
      "AGENTMEMORY_SECRET=operator-managed\nAGENTMEMORY_STRICT_CAPABILITY_MODE=false\n",
      { mode: 0o600 },
    );
    rmSync(join(home, ".agentmemory", "secret"));

    const result = ensureLocalAccessConfiguration(envPath);
    expect(existsSync(join(home, ".agentmemory", "secret"))).toBe(false);
    const env = readFileSync(envPath, "utf8");
    expect(env).toContain("AGENTMEMORY_SECRET=operator-managed");
    expect(env).toContain("AGENTMEMORY_STRICT_CAPABILITY_MODE=false");
    expect(result.appendedKeys).not.toContain("AGENTMEMORY_SECRET_FILE");
    expect(result.appendedKeys).not.toContain("AGENTMEMORY_STRICT_CAPABILITY_MODE");
  });
});
