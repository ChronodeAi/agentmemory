import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];

let sandboxHome: string;
const hydratedKeys = [
  "AM_HYD_MISSING",
  "AM_HYD_TAKEN",
  "AM_HYD_EMPTY",
  "AM_HYD_QUOTED",
];

async function freshConfig() {
  vi.resetModules();
  return await import("../src/config.js");
}

function writeEnv(contents: string) {
  const dir = join(sandboxHome, ".agentmemory");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".env"), contents);
}

describe("hydrateProcessEnvFromFile", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-hydrate-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    for (const key of hydratedKeys) delete process.env[key];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    for (const key of hydratedKeys) delete process.env[key];
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("sets process.env entries for names not already present", async () => {
    writeEnv("AM_HYD_MISSING=from-file\n");
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_HYD_MISSING"]).toBe("from-file");
  });

  it("leaves names that already exist in the real environment untouched", async () => {
    writeEnv("AM_HYD_TAKEN=from-file\n");
    process.env["AM_HYD_TAKEN"] = "from-process";
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_HYD_TAKEN"]).toBe("from-process");
  });

  it("treats an empty-string value as present and does not overwrite it", async () => {
    writeEnv("AM_HYD_EMPTY=from-file\n");
    process.env["AM_HYD_EMPTY"] = "";
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_HYD_EMPTY"]).toBe("");
  });

  it("ignores malformed lines without setting anything", async () => {
    writeEnv(
      [
        "# a full-line comment",
        "",
        "   ",
        "NO_EQUALS_SIGN_HERE",
        "=value-without-key",
        "AM_HYD_MISSING=valid-after-malformed",
      ].join("\n"),
    );
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_HYD_MISSING"]).toBe("valid-after-malformed");
    expect(process.env["NO_EQUALS_SIGN_HERE"]).toBeUndefined();
  });

  it("hydrates a missing quoted value with quotes unwrapped", async () => {
    writeEnv('AM_HYD_QUOTED="quoted # value"\n');
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_HYD_QUOTED"]).toBe("quoted # value");
  });

  it("keeps getEnvVar precedence on the real environment after hydration", async () => {
    writeEnv("AM_HYD_TAKEN=from-file\n");
    process.env["AM_HYD_TAKEN"] = "from-process";
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(cfg.getEnvVar("AM_HYD_TAKEN")).toBe("from-process");
  });

  it("is a no-op for config reads when ~/.agentmemory/.env does not exist", async () => {
    const before = { ...process.env };
    const cfg = await freshConfig();
    expect(() => cfg.hydrateProcessEnvFromFile()).not.toThrow();
    expect({ ...process.env }).toEqual(before);
  });
});
