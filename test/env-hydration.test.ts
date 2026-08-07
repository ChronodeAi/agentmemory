import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;
let sandboxHome: string;

async function freshConfig() {
  vi.resetModules();
  return import("../src/config.js");
}

function writeEnv(contents: string): void {
  const dir = join(sandboxHome, ".agentmemory");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".env"), contents);
}

describe("Agentmemory environment hydration", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-env-"));
    process.env.HOME = sandboxHome;
    process.env.USERPROFILE = sandboxHome;
    delete process.env.HYDRATE_ONLY;
    delete process.env.HYDRATE_PRECEDENCE;
  });

  afterEach(() => {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    if (originalUserProfile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = originalUserProfile;
    delete process.env.HYDRATE_ONLY;
    delete process.env.HYDRATE_PRECEDENCE;
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("hydrates file-only values for modules that read process.env", async () => {
    writeEnv("HYDRATE_ONLY=from-file");
    const config = await freshConfig();
    expect(process.env.HYDRATE_ONLY).toBeUndefined();
    config.hydrateProcessEnvFromFile();
    expect(process.env.HYDRATE_ONLY).toBe("from-file");
  });

  it("preserves process-environment precedence", async () => {
    writeEnv("HYDRATE_PRECEDENCE=from-file");
    process.env.HYDRATE_PRECEDENCE = "from-process";
    const config = await freshConfig();
    config.hydrateProcessEnvFromFile();
    expect(process.env.HYDRATE_PRECEDENCE).toBe("from-process");
  });

  it("invalidates the cache when the file changes", async () => {
    writeEnv("HYDRATE_ONLY=first");
    const config = await freshConfig();
    expect(config.getEnvVar("HYDRATE_ONLY")).toBe("first");
    writeEnv("HYDRATE_ONLY=second-value");
    expect(config.getEnvVar("HYDRATE_ONLY")).toBe("second-value");
  });
});
