import { describe, expect, it, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getSearchIndex,
  isMemoryIndexReady,
  reconcileCanonicalSearchIndex,
} from "../src/functions/search.js";
import { KV } from "../src/state/schema.js";
import type { Memory } from "../src/types.js";

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
    list: async <T>(scope: string): Promise<T[]> => {
      const entries = store.get(scope);
      return entries ? (Array.from(entries.values()) as T[]) : [];
    },
  };
}

// Startup reconciliation walks the full KV.memories corpus exactly like a
// rebuild does, so success must leave the same memoryIndexReady guarantee
// behind — and a failed walk must not.
describe("reconcileCanonicalSearchIndex readiness", () => {
  it("marks the memory index ready only after a clean reconciliation", async () => {
    const kv = mockKV();
    const memory: Memory = {
      id: "mem_ready_1",
      title: "Deploy runbook",
      content: "Ship via the staged rollout pipeline.",
      concepts: ["deploy"],
      files: [],
      sessionIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      strength: 7,
      version: 1,
      isLatest: true,
    } as Memory;
    await kv.set(KV.memories, memory.id, memory);

    expect(isMemoryIndexReady()).toBe(false);

    const failingKv = {
      ...kv,
      list: async <T>(scope: string): Promise<T[]> => {
        if (scope === KV.memories) throw new Error("memory corpus unavailable");
        return kv.list<T>(scope);
      },
    };
    await expect(
      reconcileCanonicalSearchIndex(failingKv as never),
    ).rejects.toThrow("memory corpus unavailable");
    expect(isMemoryIndexReady()).toBe(false);

    const result = await reconcileCanonicalSearchIndex(kv as never);
    expect(result).toMatchObject({ canonicalEntries: 1 });
    expect(getSearchIndex().has(memory.id)).toBe(true);
    expect(isMemoryIndexReady()).toBe(true);
  });
});
