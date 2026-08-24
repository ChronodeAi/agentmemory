import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  DATA_DIR_ENV,
  defaultDataDir,
  expandHomePath,
  legacyDataDirInCwd,
  readDataDirFlag,
  resolveDataDir,
  resolveDataDirDetailed,
  warnOnLegacyDataDir,
} from "../src/data-dir.js";

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];

let sandboxHome: string;
let sandboxCwd: string;

function seedLegacyStore(): string {
  const dataDir = join(sandboxCwd, "data");
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(join(dataDir, "state_store.db"), "");
  return dataDir;
}

describe("readDataDirFlag", () => {
  it("reads the separated form", () => {
    expect(readDataDirFlag(["--data-dir", "/tmp/am"])).toBe("/tmp/am");
  });

  it("reads the = form", () => {
    expect(readDataDirFlag(["--data-dir=/tmp/am"])).toBe("/tmp/am");
  });

  it("returns undefined when absent or dangling", () => {
    expect(readDataDirFlag([])).toBeUndefined();
    expect(readDataDirFlag(["--verbose"])).toBeUndefined();
    expect(readDataDirFlag(["--data-dir"])).toBeUndefined();
  });
});

describe("expandHomePath", () => {
  it("expands ~ and ~/ to the given home", () => {
    const home = "/home/operator";
    expect(expandHomePath("~", home)).toBe(home);
    expect(expandHomePath("~/notes", home)).toBe(join(home, "notes"));
    expect(expandHomePath("/abs/path", home)).toBe("/abs/path");
    expect(expandHomePath("relative/path", home)).toBe("relative/path");
  });
});

describe("resolveDataDir precedence", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-dataroot-home-"));
    sandboxCwd = mkdtempSync(join(tmpdir(), "agentmemory-dataroot-cwd-"));
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined)
      delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    delete process.env[DATA_DIR_ENV];
    rmSync(sandboxHome, { recursive: true, force: true });
    rmSync(sandboxCwd, { recursive: true, force: true });
  });

  it("defaults to ~/.agentmemory (fork-compatible), not a platform dir", () => {
    const resolved = resolveDataDirDetailed({
      argv: [],
      env: {},
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(resolved).toEqual({
      dir: join(sandboxHome, ".agentmemory"),
      source: "default",
    });
    expect(defaultDataDir(sandboxHome)).toBe(join(sandboxHome, ".agentmemory"));
  });

  it("prefers AGENTMEMORY_DATA_DIR over the default and resolves relative to cwd", () => {
    const resolved = resolveDataDirDetailed({
      argv: [],
      env: { [DATA_DIR_ENV]: "state/memory" },
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(resolved).toEqual({
      dir: join(sandboxCwd, "state/memory"),
      source: "env",
    });
  });

  it("prefers the --data-dir flag over both the environment and the default", () => {
    const resolved = resolveDataDirDetailed({
      argv: ["--data-dir", "/explicit/path"],
      env: { [DATA_DIR_ENV]: "/from/env" },
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(resolved).toEqual({ dir: "/explicit/path", source: "flag" });
  });

  it("supports tilde expansion for the flag and env values", () => {
    const flagged = resolveDataDirDetailed({
      argv: ["--data-dir=~/memories"],
      env: {},
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(flagged.dir).toBe(join(sandboxHome, "memories"));

    const fromEnv = resolveDataDirDetailed({
      argv: [],
      env: { [DATA_DIR_ENV]: "~" },
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(fromEnv.dir).toBe(sandboxHome);
  });

  it("ignores blank flag/env values and falls through to the default", () => {
    const resolved = resolveDataDirDetailed({
      argv: ["--data-dir", "   "],
      env: { [DATA_DIR_ENV]: "" },
      cwd: sandboxCwd,
      home: sandboxHome,
    });
    expect(resolved.source).toBe("default");
  });

  it("resolveDataDir returns just the directory", () => {
    expect(
      resolveDataDir({ argv: [], env: {}, cwd: sandboxCwd, home: sandboxHome }),
    ).toBe(join(sandboxHome, ".agentmemory"));
  });
});

describe("legacy ./data handling", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-legacy-home-"));
    sandboxCwd = mkdtempSync(join(tmpdir(), "agentmemory-legacy-cwd-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    delete process.env[DATA_DIR_ENV];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined)
      delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    delete process.env[DATA_DIR_ENV];
    rmSync(sandboxHome, { recursive: true, force: true });
    rmSync(sandboxCwd, { recursive: true, force: true });
  });

  it("detects a legacy store only via agentmemory markers", () => {
    expect(legacyDataDirInCwd(sandboxCwd)).toBe(false);
    const dataDir = seedLegacyStore();
    expect(legacyDataDirInCwd(sandboxCwd)).toBe(true);
    expect(dataDir).toBe(join(sandboxCwd, "data"));
  });

  it("warns when a legacy store exists and no explicit data dir was configured", () => {
    seedLegacyStore();
    const messages: string[] = [];
    const warned = warnOnLegacyDataDir({
      argv: [],
      env: {},
      cwd: sandboxCwd,
      home: sandboxHome,
      write: (message) => messages.push(message),
    });
    expect(warned).toBe(true);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("--data-dir");
    expect(messages[0]).toContain(DATA_DIR_ENV);
    expect(messages[0]).toContain(join(sandboxCwd, "data"));
    // Log-and-warn only: the legacy store must be untouched.
    expect(legacyDataDirInCwd(sandboxCwd)).toBe(true);
  });

  it("stays silent once an explicit data dir was configured", () => {
    seedLegacyStore();
    const messages: string[] = [];
    const viaFlag = warnOnLegacyDataDir({
      argv: ["--data-dir", "/elsewhere"],
      env: {},
      cwd: sandboxCwd,
      home: sandboxHome,
      write: (message) => messages.push(message),
    });
    const viaEnv = warnOnLegacyDataDir({
      argv: [],
      env: { [DATA_DIR_ENV]: "/elsewhere" },
      cwd: sandboxCwd,
      home: sandboxHome,
      write: (message) => messages.push(message),
    });
    expect(viaFlag).toBe(false);
    expect(viaEnv).toBe(false);
    expect(messages).toHaveLength(0);
  });

  it("stays silent when no legacy store exists", () => {
    const messages: string[] = [];
    const warned = warnOnLegacyDataDir({
      argv: [],
      env: {},
      cwd: sandboxCwd,
      home: sandboxHome,
      write: (message) => messages.push(message),
    });
    expect(warned).toBe(false);
    expect(messages).toHaveLength(0);
  });
});

describe("config integration", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-dataroot-cfg-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    delete process.env[DATA_DIR_ENV];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined)
      delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    delete process.env[DATA_DIR_ENV];
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  async function freshConfig() {
    vi.resetModules();
    return await import("../src/config.js");
  }

  it("loadConfig().dataDir follows AGENTMEMORY_DATA_DIR over the default", async () => {
    const cfg = await freshConfig();
    expect(cfg.loadConfig().dataDir).toBe(join(homedir(), ".agentmemory"));

    process.env[DATA_DIR_ENV] = join(sandboxHome, "relocated");
    const relocated = await freshConfig();
    expect(relocated.loadConfig().dataDir).toBe(
      join(sandboxHome, "relocated"),
    );
  });

  it("hydrates .env from the resolved data dir", async () => {
    const relocated = join(sandboxHome, "relocated");
    mkdirSync(relocated, { recursive: true });
    writeFileSync(join(relocated, ".env"), "AM_DATAROOT_PROBE=from-relocated\n");

    process.env[DATA_DIR_ENV] = relocated;
    const cfg = await freshConfig();
    cfg.hydrateProcessEnvFromFile();
    expect(process.env["AM_DATAROOT_PROBE"]).toBe("from-relocated");
    delete process.env["AM_DATAROOT_PROBE"];

    // The default location has no .env — nothing else may be hydrated from
    // the old path once the data dir moved.
    delete process.env[DATA_DIR_ENV];
    const backToDefault = await freshConfig();
    backToDefault.hydrateProcessEnvFromFile();
    expect(process.env["AM_DATAROOT_PROBE"]).toBeUndefined();
  });

  it("snapshot and standalone defaults anchor under the resolved data dir", async () => {
    process.env[DATA_DIR_ENV] = join(sandboxHome, "relocated");
    const cfg = await freshConfig();
    expect(cfg.loadSnapshotConfig().dir).toBe(
      join(join(sandboxHome, "relocated"), "snapshots"),
    );
    expect(cfg.getStandalonePersistPath()).toBe(
      join(join(sandboxHome, "relocated"), "standalone.json"),
    );
  });
});
