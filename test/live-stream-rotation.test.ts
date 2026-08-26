import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "../src/logger.js";
import {
  DEFAULT_LIVE_STREAM_MAX_BYTES,
  DEFAULT_LIVE_STREAM_PREV_TTL_DAYS,
  ROTATION_COOLDOWN_MS,
  resolveLiveStreamMaxBytes,
  resolveLiveStreamPrevTtlDays,
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
  vi.restoreAllMocks();
});

describe("DEFAULT_LIVE_STREAM_MAX_BYTES", () => {
  it("caps the viewer stream at 32 MiB", () => {
    expect(DEFAULT_LIVE_STREAM_MAX_BYTES).toBe(33554432);
  });
});

describe("resolveLiveStreamPrevTtlDays", () => {
  it("defaults to 30 days when unset", () => {
    expect(DEFAULT_LIVE_STREAM_PREV_TTL_DAYS).toBe(30);
    expect(resolveLiveStreamPrevTtlDays({})).toBe(DEFAULT_LIVE_STREAM_PREV_TTL_DAYS);
  });

  it("honors a positive override and truncates fractions", () => {
    expect(resolveLiveStreamPrevTtlDays({ AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "7" })).toBe(7);
    expect(resolveLiveStreamPrevTtlDays({ AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "1.9" })).toBe(1);
  });

  it("treats zero as an opt-out that keeps every generation", () => {
    expect(resolveLiveStreamPrevTtlDays({ AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "0" })).toBe(0);
  });

  it("falls back to the default for invalid values", () => {
    expect(resolveLiveStreamPrevTtlDays({ AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "soon" })).toBe(
      DEFAULT_LIVE_STREAM_PREV_TTL_DAYS,
    );
    expect(resolveLiveStreamPrevTtlDays({ AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "-5" })).toBe(
      DEFAULT_LIVE_STREAM_PREV_TTL_DAYS,
    );
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
  let clock = 1_700_000_000_000;

  beforeEach(() => {
    clock += ROTATION_COOLDOWN_MS * 2;
  });

  function seedStream(dataDir: string, bytes: number): string {
    const store = join(dataDir, "data", "stream_store");
    mkdirSync(store, { recursive: true });
    const filePath = join(store, VIEWER_STREAM_NAME);
    writeFileSync(filePath, Buffer.alloc(bytes, 0x61));
    return filePath;
  }

  // Seeds a stale generation at <path>.prev with a backdated mtime so the
  // injected nowMs clock decides its TTL age deterministically.
  function seedPrevious(filePath: string, bytes: number, ageDays: number): void {
    const previousPath = `${filePath}.prev`;
    writeFileSync(previousPath, Buffer.alloc(bytes, 0x01));
    const stamped = new Date(clock - ageDays * 24 * 60 * 60 * 1000);
    utimesSync(previousPath, stamped, stamped);
  }

  it("rotates once to .prev when the injected cap is tiny", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    const rotated = rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock });

    expect(rotated).toBe(true);
    expect(existsSync(filePath)).toBe(false);
    const previous = readFileSync(`${filePath}.prev`);
    expect(previous.length).toBe(64);
  });

  it("starts fresh so the next append recreates the stream file", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock });

    writeFileSync(filePath, Buffer.alloc(8, 0x62));

    expect(readFileSync(filePath).length).toBe(8);
    expect(existsSync(`${filePath}.prev`)).toBe(true);
  });

  it("keeps the file when it is within the cap", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 16);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(false);
    expect(existsSync(filePath)).toBe(true);
    expect(existsSync(`${filePath}.prev`)).toBe(false);
  });

  it("overwrites a previous generation instead of failing", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    writeFileSync(`${filePath}.prev`, Buffer.alloc(4, 0x01));

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(true);
    expect(readFileSync(`${filePath}.prev`).length).toBe(64);
  });

  it("is a no-op when no stream file exists yet", () => {
    const dataDir = tempDataDir();

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(false);
  });

  it("swallows rotation errors and keeps the oversized file", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    // A directory at <path>.prev makes rmSync fail without recursive, which
    // forces the rename path into its best-effort catch.
    mkdirSync(`${filePath}.prev`);
    writeFileSync(join(`${filePath}.prev`, "occupied"), "x");

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(false);
    expect(existsSync(filePath)).toBe(true);
  });

  it("triggers from a tiny injected env cap without explicit maxBytes", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 48);

    const rotated = rotateLiveStreamIfOversized({
      dataDir,
      nowMs: clock,
      env: { AGENTMEMORY_LIVE_STREAM_MAX_BYTES: "16" },
    });

    expect(rotated).toBe(true);
    expect(existsSync(`${filePath}.prev`)).toBe(true);
  });

  it("does nothing at cap zero (explicit opt-out)", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 0, nowMs: clock })).toBe(false);
    expect(existsSync(`${filePath}.prev`)).toBe(false);
  });

  it("suppresses a second rotation within the cooldown window", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(true);
    writeFileSync(filePath, Buffer.alloc(64, 0x63));

    expect(
      rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock + ROTATION_COOLDOWN_MS - 1 }),
    ).toBe(false);
    expect(existsSync(`${filePath}.prev`)).toBe(true);
  });

  it("rotates again once the cooldown window has passed", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    expect(rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock })).toBe(true);
    writeFileSync(filePath, Buffer.alloc(64, 0x63));

    expect(
      rotateLiveStreamIfOversized({ dataDir, maxBytes: 32, nowMs: clock + ROTATION_COOLDOWN_MS }),
    ).toBe(true);
    expect(existsSync(filePath)).toBe(false);
    expect(readFileSync(`${filePath}.prev`).length).toBe(64);
  });

  it("removes an expired .prev before renaming current into place", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    seedPrevious(filePath, 4, 40); // older than the 30-day TTL

    const rotated = rotateLiveStreamIfOversized({
      dataDir,
      maxBytes: 32,
      nowMs: clock,
      env: { AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "30" },
    });

    expect(rotated).toBe(true);
    const previous = readFileSync(`${filePath}.prev`);
    expect(previous.length).toBe(64); // former current content, not the stale marker
  });

  it("leaves a fresh .prev alone until the rename replaces it", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    seedPrevious(filePath, 4, 1); // well inside the TTL window

    const rotated = rotateLiveStreamIfOversized({
      dataDir,
      maxBytes: 32,
      nowMs: clock,
      env: { AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "30" },
    });

    expect(rotated).toBe(true);
    expect(readFileSync(`${filePath}.prev`).length).toBe(64);
  });

  it("still rotates from scratch when no .prev exists yet", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);

    expect(existsSync(`${filePath}.prev`)).toBe(false);
    expect(
      rotateLiveStreamIfOversized({
        dataDir,
        maxBytes: 32,
        nowMs: clock,
        env: { AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "30" },
      }),
    ).toBe(true);
    expect(readFileSync(`${filePath}.prev`).length).toBe(64);
  });

  it("warns and keeps the oversized stream when an expired .prev cannot be removed", () => {
    const dataDir = tempDataDir();
    const filePath = seedStream(dataDir, 64);
    // A non-empty directory at <path>.prev defeats rmSync without recursive.
    mkdirSync(`${filePath}.prev`);
    writeFileSync(join(`${filePath}.prev`, "occupied"), "x");
    const stamped = new Date(clock - 40 * 24 * 60 * 60 * 1000);
    utimesSync(`${filePath}.prev`, stamped, stamped);
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

    expect(
      rotateLiveStreamIfOversized({
        dataDir,
        maxBytes: 32,
        nowMs: clock,
        env: { AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS: "30" },
      }),
    ).toBe(false);

    expect(warnSpy.mock.calls.some(([message]) => String(message).includes("could not be removed"))).toBe(
      true,
    );
    expect(existsSync(filePath)).toBe(true);
  });
});
