import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("../src/state/keyed-mutex.js", () => ({
  withKeyedLock: <T>(_key: string, fn: () => Promise<T>) => fn(),
}));

import { registerCodingMemoryFunctions } from "../src/functions/coding-memory.js";
import { KV } from "../src/state/schema.js";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> =>
      (Array.from(store.get(scope)?.values() ?? []) as T[]),
  };
}

function mockSdk() {
  const functions = new Map<string, Function>();
  const overrides = new Map<string, Function>();
  return {
    registerFunction: (id: string, handler: Function) => {
      functions.set(id, handler);
    },
    trigger: async (
      idOrInput: string | { function_id: string; payload: unknown },
      payload?: unknown,
    ) => {
      const id =
        typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const data =
        typeof idOrInput === "string" ? payload : idOrInput.payload;
      const handler = overrides.get(id) ?? functions.get(id);
      if (!handler) throw new Error(`No function registered: ${id}`);
      return handler(data);
    },
    override: (id: string, handler: Function) => {
      overrides.set(id, handler);
    },
  };
}

describe("coding memory lifecycle functions", () => {
  const project = "github.com/chronodeai/memetics";
  const sessionId = "session-1";
  let sdk: ReturnType<typeof mockSdk>;
  let kv: ReturnType<typeof mockKV>;

  beforeEach(async () => {
    delete process.env["AGENTMEMORY_SLOTS"];
    sdk = mockSdk();
    kv = mockKV();
    registerCodingMemoryFunctions(sdk as never, kv as never);
    await kv.set(KV.sessions, sessionId, {
      id: sessionId,
      project,
      cwd: "/tmp/memetics",
      startedAt: new Date().toISOString(),
      status: "active",
      observationCount: 3,
    });
    await kv.set(KV.lessons, "lesson-1", {
      id: "lesson-1",
      project,
      content: "Verify recalled facts against live source and tests.",
      confidence: 0.95,
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await kv.set(KV.lessons, "other-lesson", {
      id: "other-lesson",
      project: "github.com/chronodeai/other",
      content: "This must never leak.",
      confidence: 1,
      evidence: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    sdk.override("mem::search", async () => ({
      results: Array.from({ length: 7 }, (_, index) => ({
        obsId: `obs-${index}`,
        observation: {
          id: `obs-${index}`,
          title: `Observation ${index}`,
          narrative: "x".repeat(600),
        },
      })),
    }));
    sdk.override("mem::file-context", async () => ({
      context: "# file history\nverified edit history",
      sourceIds: ["file-history-1"],
    }));
  });

  it("requires an existing session in the requested project", async () => {
    const result = await sdk.trigger("mem::context-packet", {
      project,
      sessionId: "missing",
    });

    expect(result).toEqual({
      success: false,
      error: "session does not belong to project",
    });
  });

  it("caps packets at 2,000 tokens and injects each source once per session", async () => {
    const first = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
      token_budget: 5000,
    }) as {
      success: boolean;
      context: string;
      tokens: number;
      sourceIds: string[];
    };

    expect(first.success).toBe(true);
    expect(first.tokens).toBeLessThanOrEqual(2000);
    expect(first.sourceIds.filter((id) => id.startsWith("obs-"))).toHaveLength(5);
    expect(first.context).toContain("Verify recalled facts");
    expect(first.context).not.toContain("This must never leak");

    const second = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
    }) as { success: boolean; sourceIds: string[] };

    expect(second.success).toBe(true);
    expect(second.sourceIds).toEqual([]);
  });

  it("links commits idempotently and reports project health", async () => {
    await kv.set(KV.memories, "unrelated-unscoped", {
      id: "unrelated-unscoped",
      project: undefined,
      sessionIds: ["another-project-session"],
      content: "Legacy data from another project",
      type: "fact",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      concepts: [],
      files: [],
      strength: 1,
      version: 1,
      isLatest: true,
    });
    const first = await sdk.trigger("mem::commit-link", {
      sha: "abcdef1234567890",
      sessionId,
      project,
    });
    const second = await sdk.trigger("mem::commit-link", {
      sha: "abcdef1234567890",
      sessionId,
      project,
    });
    const health = await sdk.trigger("mem::project-health", {
      project,
    }) as {
      success: boolean;
      commitCoverage: number;
      scopeCoverage: number;
      globalUnscopedRecords: number;
      projectUnscopedRecords: number;
    };

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(health.success).toBe(true);
    expect(health.commitCoverage).toBe(1);
    expect(health.scopeCoverage).toBe(1);
    expect(health.projectUnscopedRecords).toBe(0);
    expect(health.globalUnscopedRecords).toBe(1);
  });
});
