import { describe, it, expect, afterEach } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_LIVE_STREAM_MAX_BYTES,
  resolveLiveStreamMaxBytes,
  rotateLiveStreamIfOversized,
  viewerLiveStreamPath,
} from "../src/state/live-stream-rotation.js";

const VIEWER_STREAM_NAME = "stream%3Amem-live%3Aviewer.bin";

let cleanup: Array<() => void> = [];
function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "agentmemory-live-stream-"));
  cleanup.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

afterEach(() => {
  for (const done of cleanup) done();
  cleanup = [];
});

describe("DEFAULT_LIVE_STREAM_MAX_BYTES", () => {
  it("caps the viewer stream at 32 MiB", () => {
    expect(DEFAULT_LIVE_STREAM_MAX_BYTES).toBe(33554432);
  });
});

describe("resolveLiveStreamMaxBytes", () => {
  it("defaults when unset", () => {
    expect(resolveLiveStreamMaxBytes({})).toBe(DEFAULT_LIVE_STREAM_MAX_BYTES);
  });

  it("honors a positive override", () => {
    expect(resolveLiveStreamMaxBytes({ AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "4096" })).toBe(4096);
  });

  it("treats zero as an explicit opt-out", () => {
    expect(resolveLiveStreamMaxBytes({ AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "0" })).toBe(0);
  });

  it("falls back to the default for invalid values", () => {
    expect(
      resolveLiveStreamMaxBytes({ AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "not-a-number" }),
    ).toBe(DEFAULT_LIVE_STREAM_MAX_BYTES);
    expect(
      resolveLiveStreamMaxBytes({ AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "-5" }),
    ).toBe(DEFAULT_LIVE_STREAM_MAX_BYTES);
    expect(
      resolveLiveStreamMaxBytes({ AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "1.5" }),
    ).toBe(1);
  });
});

describe("viewerLiveStreamPath", () => {
  it("mirrors the iii-stream file-backed adapter layout under <data-dir>/data", () => {
    expect(viewerLiveStreamPath("/root")).toBe(
      join("/root", "data", "stream_store", VIEWER_STREAM_NAME),
    );
  });
});

describe("rotateLiveStreamIfOversized", () => {
  function seedStream(dataDir: string, bytes: number): string {
    const store = join(dataDir, "data", "stream_store");
    mkdirSync(store, { recursive: true });
    const filePath = join(store, VIEWER_STREAM_NAME);
    writeFileSync(filePath, Buffer.alloc(bytes, 0x61));
    return filePath;
  }

  it("rotates once to .prev when the injected cap is tiny", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    const rotated = rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 });

    expect(rotated).toBe(true);
    expect(existsSync(filePath)).toBe(false);
    const previous = readFileSync(`${filePath}.prev`);
    expect(previous.length).toBe(64);
  });

  it("starts fresh so the next append recreates the stream file", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 });

    writeFileSync(filePath, Buffer.alloc(8, 0x62));

    expect(readFileSync(filePath).length).toBe(8);
    expect(existsSync(`${filePath}.prev`)).toBe(true);
  });

  it("keeps the file when it is within the cap", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 16);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 })).toBe(false);
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(`${filePath}.prev`)).toBe(false);
  });

  it("overwrites a previous generation instead of failing", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    writeFileSync(`${filePath}.prev`, Buffer.alloc(4, 0x01));

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 })).toBe(true);
    expect(readFileSync(`${filePath}.prev`).length).toBe(64);
  });

  it("is a no-op when no stream file exists yet", () => {
    const dataDir = tempDataDir();

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 })).toBe(false);
  });

  it("swallows rotation errors and keeps the oversized file", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    // A directory at <path>.prev makes rmSync fail without recursive, which
    // forces the rename path into its best-effort catch.
    mkdirSync(`${filePath}.prev`);
    writeFileSync(join(`${filePath}.prev`, "occupied"), "x");

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32 })).toBe(false);
    expect(existsSync(filePath)).toBe(true);
  });

  it("triggers from a tiny injected env cap without explicit maxBytes", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 48);

    const rotated = rotateLiveStreamIfOversized({
      dataDir,
      env: { AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "16" },
    });

    expect(rotated).toBe(true);
    expect(existsSync(`${filePath}.prev`)).toBe(true);
  });

  it("does nothing at cap zero (explicit opt-out)", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 0 })).toBe(false);
    expect(existsSync(`${filePath}.prev`)).toBe(false);
  });
});
