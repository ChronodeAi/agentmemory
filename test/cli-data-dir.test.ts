import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveDataDir } from "../src/cli-data-dir.js";

const roots: string[] = [];

function temporaryRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveDataDir", () => {
  it("prefers --data-dir over AGENTMEMORY_DATA_DIR", () => {
    expect(
      resolveDataDir({
        args: ["--data-dir", "~/flag-state"],
        env: { AGENTMEMORY_DATA_DIR: "~/env-state" },
        cwd: "/repo/project",
        home: "/home/alex",
        platform: "linux",
      }),
    ).toEqual({ dataDir: "/home/alex/flag-state", source: "flag" });
  });

  it("uses AGENTMEMORY_DATA_DIR when the flag is absent", () => {
    expect(
      resolveDataDir({
        args: [],
        env: { AGENTMEMORY_DATA_DIR: "state" },
        cwd: "/repo/project",
        home: "/home/alex",
        platform: "linux",
      }),
    ).toEqual({ dataDir: "/repo/project/state", source: "env" });
  });

  it("preserves an existing Chronode store before platform defaults", () => {
    const home = temporaryRoot("agentmemory-home-");
    const data = join(home, ".agentmemory", "data");
    mkdirSync(data, { recursive: true });
    writeFileSync(join(data, "state_store.db"), "sentinel");

    expect(
      resolveDataDir({
        args: [],
        env: {},
        cwd: "/repo/project",
        home,
        platform: "darwin",
      }),
    ).toEqual({ dataDir: data, source: "chronode" });
  });

  it("isolates alternate instances beneath an existing Chronode store", () => {
    const home = temporaryRoot("agentmemory-home-");
    const data = join(home, ".agentmemory", "data");
    mkdirSync(join(data, "stream_store"), { recursive: true });

    expect(
      resolveDataDir({
        args: ["--instance", "2"],
        env: {},
        cwd: "/repo/project",
        home,
        platform: "darwin",
      }),
    ).toEqual({
      dataDir: join(data, "instance-2"),
      source: "chronode",
    });
  });

  it("adopts only a recognized cwd legacy store", () => {
    const cwd = temporaryRoot("agentmemory-project-");
    const home = temporaryRoot("agentmemory-home-");
    mkdirSync(join(cwd, "data"));
    expect(
      resolveDataDir({ args: [], env: {}, cwd, home, platform: "linux" }),
    ).toEqual({
      dataDir: join(home, ".local", "share", "agentmemory"),
      source: "default",
    });

    writeFileSync(join(cwd, "data", "iii-config.yaml"), "workers: []\n");
    expect(
      resolveDataDir({ args: [], env: {}, cwd, home, platform: "linux" }),
    ).toEqual({ dataDir: join(cwd, "data"), source: "legacy" });
  });

  it("uses platform defaults when no existing store is present", () => {
    expect(
      resolveDataDir({
        args: [],
        env: {},
        cwd: "/repo/project",
        home: "/Users/alex",
        platform: "darwin",
      }),
    ).toEqual({
      dataDir: "/Users/alex/Library/Application Support/agentmemory",
      source: "default",
    });
    expect(
      resolveDataDir({
        args: [],
        env: { APPDATA: "C:\\Users\\alex\\AppData\\Roaming" },
        cwd: "C:\\repo",
        home: "C:\\Users\\alex",
        platform: "win32",
      }).source,
    ).toBe("default");
  });
});
