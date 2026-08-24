import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// chmod is the failure surface under test; every other fs call must hit the
// real filesystem. The flag toggles the fault injection per test.
const chmodFault = vi.hoisted(() => ({ fail: false }));
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    chmodSync: ((path: Parameters<typeof actual.chmodSync>[0], mode: Parameters<typeof actual.chmodSync>[1]) => {
      if (chmodFault.fail) {
        throw Object.assign(new Error("EPERM: operation not permitted, chmod"), {
          code: "EPERM",
        });
      }
      return actual.chmodSync(path, mode);
    }) as typeof actual.chmodSync,
  };
});

import {
  ensureProjectCapabilitySecret,
  projectCapabilitySecretFile,
} from "../src/cli/connect/capability-secret.js";

const POSIX = process.platform !== "win32";
const ORIGINAL_HOME = process.env["HOME"];
const stderrWrites: string[] = [];

describe("project capability secret hardening", () => {
  let sandboxHome: string;

  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "am-capability-hardening-"));
    process.env["HOME"] = sandboxHome;
    delete process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE"];
    chmodFault.fail = false;
    stderrWrites.length = 0;
    vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it.runIf(POSIX)("creates the credential directory with mode 0700", () => {
    const path = projectCapabilitySecretFile();
    const result = ensureProjectCapabilitySecret();
    expect(result.provisioned).toBe(true);
    expect(statSync(join(path, "..")).mode & 0o777).toBe(0o700);
    expect(statSync(result.path).mode & 0o777).toBe(0o600);
  });

  it.runIf(POSIX)("refuses a symlink parked at the credential path", () => {
    const target = join(sandboxHome, "real-secret");
    writeFileSync(target, "operator-secret\n", { mode: 0o600 });
    const path = projectCapabilitySecretFile();
    mkdirSync(join(path, ".."), { recursive: true });
    symlinkSync(target, path);

    expect(() => ensureProjectCapabilitySecret()).toThrow(
      "project capability secret path is a symlink; refusing",
    );
    // The symlink target was never read or rewritten.
    expect(readFileSync(target, "utf8")).toBe("operator-secret\n");
  });

  it("removes a partially written secret when the creation chmod fails", () => {
    chmodFault.fail = true;
    const path = projectCapabilitySecretFile();
    expect(() => ensureProjectCapabilitySecret()).toThrow(
      "could not secure project capability secret (chmod failed); removed partial file",
    );
    expect(existsSync(path)).toBe(false);
  });

  it("keeps a pre-existing populated secret when its tightening chmod fails", () => {
    const path = projectCapabilitySecretFile();
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "user-chosen-secret\n", { mode: 0o600 });
    chmodFault.fail = true;

    const result = ensureProjectCapabilitySecret();
    expect(result).toEqual({ path, provisioned: false, reused: true });
    expect(readFileSync(path, "utf8")).toBe("user-chosen-secret\n");
    expect(stderrWrites.join("")).toContain("could not tighten permissions");
  });
});
