import { describe, expect, it } from "vitest";
import { logger } from "../src/logger.js";
import { getProcessBootIdentity } from "../src/runtime-identity.js";

describe("structured runtime logger", () => {
  it("binds redacted events to one immutable process boot", () => {
    const writes: string[] = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      logger.info("pipeline accepted", {
        pipelineRunId: "pipeline-1",
        prompt: "<private>synthetic memory content</private>",
      });
      logger.warn("pipeline failed", {
        pipelineRunId: "pipeline-2",
        token: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
      });
    } finally {
      process.stderr.write = originalWrite;
    }

    const events = writes.map((line) =>
      JSON.parse(line.slice(line.indexOf("{"))) as Record<string, unknown>,
    );
    const boot = getProcessBootIdentity();
    expect(events).toHaveLength(2);
    expect(events.map((event) => event["pipelineRunId"])).toEqual([
      "pipeline-1",
      "pipeline-2",
    ]);
    for (const event of events) {
      expect(event).toMatchObject({
        bootId: boot.id,
        bootStartedAt: boot.startedAt,
        pid: process.pid,
      });
      expect(Number.isNaN(Date.parse(String(event["timestamp"])))).toBe(false);
    }
    const output = writes.join("");
    expect(output).not.toContain("synthetic memory content");
    expect(output).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(output).toContain("[REDACTED]");
    expect(output).toContain("[REDACTED_SECRET]");
  });
});
