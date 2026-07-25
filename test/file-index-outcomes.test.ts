import { describe, expect, it, vi } from "vitest";
import { registerFileIndexFunction } from "../src/functions/file-index.js";

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
});
