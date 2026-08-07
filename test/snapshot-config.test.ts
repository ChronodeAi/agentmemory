import { afterEach, describe, expect, it } from "vitest";
import { loadSnapshotConfig } from "../src/config.js";

const SNAPSHOT_KEYS = [
  "SNAPSHOT_INTERVAL",
  "SNAPSHOT_ENABLED",
  "SNAPSHOT_DIR",
] as const;
const DEFAULT_INTERVAL_SECONDS = 3600;

describe("loadSnapshotConfig", () => {
  const saved = Object.fromEntries(
    SNAPSHOT_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof SNAPSHOT_KEYS)[number], string | undefined>;

  afterEach(() => {
    for (const key of SNAPSHOT_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it.each([
    "0",
    "-1",
    "-3600",
    "0.5",
    "5abc",
    "not-a-number",
    "Infinity",
    "2147484",
  ])(
    "falls back to the default interval for %s",
    (interval) => {
      process.env["SNAPSHOT_INTERVAL"] = interval;

      expect(loadSnapshotConfig().interval).toBe(DEFAULT_INTERVAL_SECONDS);
    },
  );

  it("accepts a positive interval", () => {
    process.env["SNAPSHOT_INTERVAL"] = "120";

    expect(loadSnapshotConfig().interval).toBe(120);
  });

  it("accepts the one-second minimum interval", () => {
    process.env["SNAPSHOT_INTERVAL"] = "1";

    expect(loadSnapshotConfig().interval).toBe(1);
  });
});
