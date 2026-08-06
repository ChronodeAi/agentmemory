import { describe, expect, it, vi } from "vitest";
import { registerFileIndexFunction } from "../src/functions/file-index.js";
import { KV } from "../src/state/schema.js";

type FileContextHandler = (data: {
  project: string;
  sessionId: string;
  files: string[];
}) => Promise<{
  context: string;
  sourceIds: string[];
  outcome: {
    source: "file_history";
    status: "ok" | "unavailable" | "failed";
    itemCount: number;
    error?: string;
  };
}>;

function wireFileContext(list: (scope: string) => Promise<unknown[]>) {
  let handler: FileContextHandler | undefined;
  const sdk = {
    registerFunction: vi.fn((id: string, value: FileContextHandler) => {
      if (id === "mem::file-context") handler = value;
    }),
  };
  const kv = {
    get: async () => null,
    set: async (_scope: string, _key: string, value: unknown) => value,
    delete: async () => undefined,
    list,
  };
  registerFileIndexFunction(sdk as never, kv as never);
  if (!handler) throw new Error("mem::file-context not registered");
  return handler;
}

describe("mem::file-context typed source outcomes", () => {
  it("returns unavailable when the source is readable but has no history", async () => {
    const handler = wireFileContext(async () => []);

    const result = await handler({
      project: "github.com/chronodeai/agentmemory",
      sessionId: "session-1",
      files: ["src/index.ts"],
    });

    expect(result).toEqual({
      context: "",
      sourceIds: [],
      outcome: {
        source: "file_history",
        status: "unavailable",
        itemCount: 0,
      },
    });
  });

  it("returns failed with diagnostics when session history cannot be read", async () => {
    const handler = wireFileContext(async () => {
      throw new Error("state backend unavailable");
    });

    const result = await handler({
      project: "github.com/chronodeai/agentmemory",
      sessionId: "session-1",
      files: ["src/index.ts"],
    });

    expect(result).toEqual({
      context: "",
      sourceIds: [],
      outcome: {
        source: "file_history",
        status: "failed",
        itemCount: 0,
        error: "state backend unavailable",
      },
    });
  });

  it("loads bounded session histories concurrently", async () => {
    let observationReads = 0;
    let releaseReads!: () => void;
    let signalAllStarted!: () => void;
    const blocked = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    const allStarted = new Promise<void>((resolve) => {
      signalAllStarted = resolve;
    });
    const handler = wireFileContext(async (scope) => {
      if (scope === KV.sessions) {
        return [
          {
            id: "session-2",
            project: "github.com/chronodeai/agentmemory",
            startedAt: "2026-08-04T00:00:00.000Z",
          },
          {
            id: "session-3",
            project: "github.com/chronodeai/agentmemory",
            startedAt: "2026-08-03T00:00:00.000Z",
          },
        ];
      }
      observationReads += 1;
      if (observationReads === 2) signalAllStarted();
      await blocked;
      return [];
    });

    const pending = handler({
      project: "github.com/chronodeai/agentmemory",
      sessionId: "session-1",
      files: ["src/index.ts"],
    });
    const concurrent = await Promise.race([
      allStarted.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 100)),
    ]);
    releaseReads();
    await pending;

    expect(concurrent).toBe(true);
    expect(observationReads).toBe(2);
  });
});
