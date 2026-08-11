import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectEngineResources,
  parseEngineProcessSample,
} from "../src/health/engine-resources.js";

const directories: string[] = [];

describe("iii engine resource collection", () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("binds process and store measurements to the exact pidfile", () => {
    const root = mkdtempSync(join(tmpdir(), "agentmemory-engine-health-"));
    directories.push(root);
    const state = join(root, "data", "state_store.db");
    const stream = join(root, "data", "stream_store");
    mkdirSync(state, { recursive: true });
    mkdirSync(stream, { recursive: true });
    writeFileSync(join(root, "iii.pid"), `${process.pid}\n`, "utf8");
    writeFileSync(join(state, "state.bin"), "state", "utf8");
    writeFileSync(join(stream, "stream.bin"), "stream", "utf8");

    const sample = () => ({ cpuPercent: 12.5, rssBytes: 64 * 1024 * 1024 });
    const first = collectEngineResources(undefined, undefined, root, sample);
    expect(first).toMatchObject({
      status: "ok",
      pid: process.pid,
      stateStore: { bytes: 5, files: 1, partial: false },
      streamStore: { bytes: 6, files: 1, partial: false },
    });
    writeFileSync(join(state, "second.bin"), "more", "utf8");
    const second = collectEngineResources(first, 60_000, root, sample);
    expect(second.stateStore).toMatchObject({
      bytes: 9,
      files: 2,
      growthBytes: 4,
      growthBytesPerMinute: 4,
    });
  });

  it("rejects a reused pid that no longer belongs to iii-engine", () => {
    expect(
      parseEngineProcessSample(
        "123 12.5 65536 /Users/base/.agentmemory/bin/iii --config runtime.yaml",
        123,
      ),
    ).toEqual({ cpuPercent: 12.5, rssBytes: 64 * 1024 * 1024 });
    expect(() =>
      parseEngineProcessSample("123 12.5 65536 /usr/bin/node worker.js", 123),
    ).toThrow("not iii-engine");
  });
});
