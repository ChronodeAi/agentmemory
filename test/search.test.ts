import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getSearchIndex,
  getVectorIndex,
  flushIndexSave,
  getSearchIndexDrift,
  getSearchIndexRuntimeStatus,
  markSearchIndexReady,
  reconcileCanonicalSearchIndex,
  rebuildIndex,
  repairVectorIndexFromKeyword,
  registerSearchFunction,
  scheduleIndexSave,
  setEmbeddingProvider,
  setIndexPersistence,
  setVectorIndex,
  vectorIndexAddGuarded,
} from "../src/functions/search.js";
import { VectorIndex } from "../src/state/vector-index.js";
import { KV } from "../src/state/schema.js";
import type { CompressedObservation, Session } from "../src/types.js";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> => {
      return (store.get(scope)?.get(key) as T) ?? null;
    },
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      const entries = store.get(scope);
      return entries ? (Array.from(entries.values()) as T[]) : [];
    },
  };
}

function mockSdk() {
  const functions = new Map<string, Function>();
  return {
    registerFunction: (idOrOpts: string | { id: string }, handler: Function) => {
      const id = typeof idOrOpts === "string" ? idOrOpts : idOrOpts.id;
      functions.set(id, handler);
    },
    registerTrigger: () => {},
    trigger: async (
      idOrInput: string | { function_id: string; payload: unknown },
      data?: unknown,
    ) => {
      const id = typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload = typeof idOrInput === "string" ? data : idOrInput.payload;
      const fn = functions.get(id);
      if (!fn) throw new Error(`No function: ${id}`);
      if (
        id === "mem::search" &&
        payload &&
        typeof payload === "object" &&
        !("project" in payload) &&
        !("scope" in payload)
      ) {
        return fn({ project: "demo", ...payload });
      }
      return fn(payload);
    },
  };
}

describe("mem::search", () => {
  let sdk: ReturnType<typeof mockSdk>;
  let kv: ReturnType<typeof mockKV>;

  beforeEach(async () => {
    sdk = mockSdk();
    kv = mockKV();
    registerSearchFunction(sdk as never, kv as never);

    const session: Session = {
      id: "ses_1",
      project: "demo",
      cwd: "/tmp/demo",
      startedAt: "2026-01-01T00:00:00Z",
      status: "completed",
      observationCount: 2,
    };
    await kv.set(KV.sessions, session.id, session);

    const obsA: CompressedObservation = {
      id: "obs_a",
      sessionId: "ses_1",
      timestamp: "2026-01-01T00:00:00Z",
      type: "decision",
      title: "Auth middleware decision",
      subtitle: "JWT strategy",
      facts: ["Use rotating refresh tokens"],
      narrative: "Implemented auth middleware with JWT refresh rotation.",
      concepts: ["auth", "jwt"],
      files: ["src/auth.ts"],
      importance: 8,
    };
    const obsB: CompressedObservation = {
      id: "obs_b",
      sessionId: "ses_1",
      timestamp: "2026-01-02T00:00:00Z",
      type: "file_edit",
      title: "UI button styling",
      facts: ["Updated primary button color"],
      narrative: "Adjusted button styles in the settings page.",
      concepts: ["ui", "css"],
      files: ["src/ui/button.tsx"],
      importance: 4,
    };

    await kv.set(KV.observations("ses_1"), obsA.id, obsA);
    await kv.set(KV.observations("ses_1"), obsB.id, obsB);

    // Module-level SearchIndex singleton would leak across tests; reset.
    getSearchIndex().clear();
    setVectorIndex(null);
    setEmbeddingProvider(null);
    setIndexPersistence(null);
  });

  it("returns full format by default", async () => {
    const result = (await sdk.trigger("mem::search", {
      query: "auth middleware",
    })) as { format: string; results: Array<{ observation: CompressedObservation }> };

    expect(result.format).toBe("full");
    expect(result.results).toHaveLength(1);
    expect(result.results[0]?.observation.id).toBe("obs_a");
  });

  it("returns compact format when requested", async () => {
    const result = (await sdk.trigger("mem::search", {
      query: "auth",
      format: "compact",
    })) as { format: string; results: Array<{ obsId: string; title: string }> };

    expect(result.format).toBe("compact");
    expect(result.results[0]?.obsId).toBe("obs_a");
    expect(result.results[0]?.title).toBe("Auth middleware decision");
  });

  it("does not return Agentmemory retrieval outputs as new evidence", async () => {
    const recalledOutput: CompressedObservation = {
      id: "obs_recalled_output",
      sessionId: "ses_1",
      timestamp: "2026-01-03T00:00:00Z",
      type: "command_run",
      title: "mcp__agentmemory__memory_context_packet",
      facts: [],
      narrative: "Auth middleware recall result copied from an earlier packet.",
      concepts: ["auth"],
      files: [],
      importance: 5,
    };
    await kv.set(
      KV.observations("ses_1"),
      recalledOutput.id,
      recalledOutput,
    );

    const result = (await sdk.trigger("mem::search", {
      query: "auth middleware",
      format: "compact",
      limit: 5,
    })) as { results: Array<{ obsId: string }> };

    expect(result.results.map((item) => item.obsId)).toContain("obs_a");
    expect(result.results.map((item) => item.obsId)).not.toContain(
      recalledOutput.id,
    );
  });

  it("filters legacy natural-language memory retrieval titles", async () => {
    const legacyRecallOutput: CompressedObservation = {
      id: "obs_legacy_recall_output",
      sessionId: "ses_1",
      timestamp: "2026-01-03T00:00:00Z",
      type: "command_run",
      title: "View context from memory file",
      facts: [],
      narrative: "Auth middleware context copied from long-term memory.",
      concepts: ["auth"],
      files: [],
      importance: 5,
    };
    await kv.set(
      KV.observations("ses_1"),
      legacyRecallOutput.id,
      legacyRecallOutput,
    );

    const result = (await sdk.trigger("mem::search", {
      query: "auth middleware",
      format: "compact",
      limit: 5,
    })) as { results: Array<{ obsId: string }> };

    expect(result.results.map((item) => item.obsId)).toContain("obs_a");
    expect(result.results.map((item) => item.obsId)).not.toContain(
      legacyRecallOutput.id,
    );
  });

  it("returns narrative text and respects token budget", async () => {
    const result = (await sdk.trigger("mem::search", {
      query: "auth ui",
      format: "narrative",
      token_budget: 20,
    })) as {
      format: string;
      results: Array<{ obsId: string }>;
      text: string;
      tokens_used: number;
      tokens_budget: number;
      truncated: boolean;
    };

    expect(result.format).toBe("narrative");
    expect(result.tokens_budget).toBe(20);
    expect(result.tokens_used).toBeLessThanOrEqual(20);
    expect(typeof result.text).toBe("string");
    expect(result.results.length).toBeLessThanOrEqual(2);
    expect(result.truncated).toBe(true);
  });

  it("rejects invalid format values", async () => {
    await expect(
      sdk.trigger("mem::search", { query: "auth", format: "verbose" }),
    ).rejects.toThrow("format must be one of");
  });

  it("surfaces saved memories from KV.memories (#265)", async () => {
    // mem::remember persists to KV.memories under a synthetic sessionId
    // ("memory") that has no corresponding KV.observations entry. mem::search
    // must fall back to KV.memories or memory_recall returns empty.
    await kv.set(KV.memories, "mem_x1", {
      id: "mem_x1",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
      type: "fact",
      title: "Pineapple belongs on pizza",
      content: "Pineapple belongs on pizza for testing fallback path.",
      concepts: ["pineapple", "pizza"],
      files: [],
      sessionIds: [],
      strength: 7,
      version: 1,
      isLatest: true,
      project: "demo",
    });
    // Force the rebuild to pick up the new memory (mem::search only
    // rebuilds on first call when idx.size === 0).
    await rebuildIndex(kv as never);

    const result = (await sdk.trigger("mem::search", {
      query: "pineapple pizza",
      format: "compact",
    })) as { results: Array<{ obsId: string; title: string }> };

    const hit = result.results.find((r) => r.obsId === "mem_x1");
    expect(hit).toBeDefined();
    expect(hit?.title).toBe("Pineapple belongs on pizza");
  });

  it("rebuildIndex populates the vector index", async () => {
    const mockEmbedder = {
      name: "test",
      dimensions: 3,
      embed: async (_text: string) => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch: async (_texts: string[]) =>
        _texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    };
    setEmbeddingProvider(mockEmbedder);
    setVectorIndex(new VectorIndex());

    await rebuildIndex(kv as never);

    const vi = getVectorIndex();
    expect(vi).not.toBeNull();
    expect(vi!.size).toBeGreaterThan(0);

    // Cleanup
    setVectorIndex(null);
    setEmbeddingProvider(null);
  });

  it("repairs bounded vector tail drift before a rebuild completes", async () => {
    const embedBatch = vi.fn(async (texts: string[]) => {
      const returned =
        embedBatch.mock.calls.length === 1 ? texts.slice(0, -1) : texts;
      return returned.map(() => new Float32Array([0.1, 0.2, 0.3]));
    });
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    setVectorIndex(new VectorIndex());

    await rebuildIndex(kv as never);

    expect(embedBatch).toHaveBeenCalledTimes(2);
    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus().status).toBe("ready");
    setVectorIndex(null);
    setEmbeddingProvider(null);
  });

  it("coalesces concurrent rebuilds and suppresses partial persistence", async () => {
    let releaseSessionList!: () => void;
    let signalSessionList!: () => void;
    const sessionListStarted = new Promise<void>((resolve) => {
      signalSessionList = resolve;
    });
    const sessionListBlocked = new Promise<void>((resolve) => {
      releaseSessionList = resolve;
    });
    let blocked = false;
    const guardedKv = {
      ...kv,
      list: vi.fn(async <T>(scope: string): Promise<T[]> => {
        if (!blocked && scope === KV.sessions) {
          blocked = true;
          signalSessionList();
          await sessionListBlocked;
        }
        return kv.list<T>(scope);
      }),
    };
    const scheduleSave = vi.fn();
    const save = vi.fn(async () => undefined);
    const cancelScheduledSave = vi.fn();
    setIndexPersistence({
      scheduleSave,
      save,
      cancelScheduledSave,
    });

    const first = rebuildIndex(guardedKv as never);
    await sessionListStarted;
    scheduleIndexSave();
    await flushIndexSave();
    const second = rebuildIndex(guardedKv as never);
    const sharedPromise = second === first;
    const suppressedDuringRebuild =
      scheduleSave.mock.calls.length === 0 && save.mock.calls.length === 0;
    releaseSessionList();
    await Promise.all([first, second]);
    scheduleIndexSave();
    await flushIndexSave();

    expect(sharedPromise).toBe(true);
    expect(cancelScheduledSave).toHaveBeenCalledOnce();
    expect(suppressedDuringRebuild).toBe(true);
    expect(scheduleSave).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(
      guardedKv.list.mock.calls.filter(([scope]) => scope === KV.sessions),
    ).toHaveLength(1);
    setIndexPersistence(null);
  });

  it("repairs a bounded missing-vector drift without rebuilding BM25", async () => {
    const embedBatch = vi.fn(async (texts: string[]) =>
      texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    );
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    const vectors = new VectorIndex();
    setVectorIndex(vectors);
    await rebuildIndex(kv as never);
    const keywordSize = getSearchIndex().size;
    embedBatch.mockClear();

    vectors.remove("obs_b");
    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: ["obs_b"],
      orphanVectorIds: [],
    });
    const scheduleSave = vi.fn();
    setIndexPersistence({
      scheduleSave,
      save: vi.fn(async () => undefined),
    });

    const repaired = await repairVectorIndexFromKeyword(kv as never);
    await Promise.resolve();

    expect(repaired).toBe(1);
    expect(embedBatch).toHaveBeenCalledOnce();
    expect(getSearchIndex().size).toBe(keywordSize);
    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus().status).toBe("ready");
    expect(scheduleSave).toHaveBeenCalledOnce();
  });

  it("repairs a persisted index that missed canonical writes before a crash", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    getSearchIndex().add(obsA!);
    getSearchIndex().add({
      ...obsA!,
      id: "obs_stale",
      title: "stale derived row",
      narrative: "This row no longer exists in canonical state.",
    });

    const result = await reconcileCanonicalSearchIndex(kv as never);

    expect(result).toEqual({
      canonicalEntries: 2,
      addedKeywordEntries: 1,
      removedKeywordEntries: 1,
    });
    expect(getSearchIndex().has("obs_a")).toBe(true);
    expect(getSearchIndex().has("obs_b")).toBe(true);
    expect(getSearchIndex().has("obs_stale")).toBe(false);
    expect(getSearchIndex().search("button styling")[0]?.obsId).toBe("obs_b");
  });

  it("does not mutate a loaded index when canonical inventory fails", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    getSearchIndex().add(obsA!);
    const failingKv = {
      ...kv,
      list: vi.fn(async <T>(scope: string): Promise<T[]> => {
        if (scope === KV.observations("ses_1")) {
          throw new Error("canonical inventory unavailable");
        }
        return kv.list<T>(scope);
      }),
    };

    await expect(
      reconcileCanonicalSearchIndex(failingKv as never),
    ).rejects.toThrow("canonical inventory unavailable");
    expect(getSearchIndex().entriesSnapshot().map((entry) => entry.obsId)).toEqual([
      "obs_a",
    ]);
  });

  it("fails a full rebuild when any canonical observation inventory fails", async () => {
    const failingKv = {
      ...kv,
      list: vi.fn(async <T>(scope: string): Promise<T[]> => {
        if (scope === KV.observations("ses_1")) {
          throw new Error("canonical observations unavailable");
        }
        return kv.list<T>(scope);
      }),
    };

    await expect(rebuildIndex(failingKv as never)).rejects.toThrow(
      "canonical observations unavailable",
    );
    expect(getSearchIndexRuntimeStatus().status).toBe("failed");
  });

  it("fails before reconciliation mutation when the startup budget is exceeded", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    getSearchIndex().add(obsA!);
    process.env.AGENTMEMORY_STARTUP_RECONCILE_MAX_ENTRIES = "1";
    try {
      await expect(
        reconcileCanonicalSearchIndex(kv as never),
      ).rejects.toThrow("canonical search inventory exceeds startup limit");
      expect(
        getSearchIndex().entriesSnapshot().map((entry) => entry.obsId),
      ).toEqual(["obs_a"]);
    } finally {
      delete process.env.AGENTMEMORY_STARTUP_RECONCILE_MAX_ENTRIES;
    }
  });

  it("refuses to persist equal-sized indexes with different identifiers", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    const obsB = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_b",
    );
    getSearchIndex().add(obsA!);
    getSearchIndex().add(obsB!);
    const vectors = new VectorIndex();
    vectors.add("obs_a", "ses_1", new Float32Array([0.1, 0.2, 0.3]));
    vectors.add("obs_orphan", "ses_1", new Float32Array([0.1, 0.2, 0.3]));
    setVectorIndex(vectors);
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch: async (texts: string[]) =>
        texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    });
    markSearchIndexReady(2, 2, true);
    const scheduleSave = vi.fn();
    const save = vi.fn(async () => undefined);
    setIndexPersistence({ scheduleSave, save });

    scheduleIndexSave();
    await flushIndexSave();

    expect(scheduleSave).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    expect(getSearchIndexRuntimeStatus()).toMatchObject({
      status: "partial",
      keywordEntries: 2,
      vectorEntries: 2,
    });
  });

  it("automatically repairs bounded live drift before persisting", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    const obsB = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_b",
    );
    getSearchIndex().add(obsA!);
    const vectors = new VectorIndex();
    vectors.add("obs_a", "ses_1", new Float32Array([0.1, 0.2, 0.3]));
    setVectorIndex(vectors);
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch: async (texts: string[]) =>
        texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    });
    markSearchIndexReady(1, 1, true);
    const scheduleSave = vi.fn();
    let signalRepaired!: () => void;
    const repaired = new Promise<void>((resolve) => {
      signalRepaired = resolve;
    });
    setIndexPersistence(
      {
        scheduleSave,
        save: vi.fn(async () => undefined),
      },
      {
        repairDrift: async () => {
          await repairVectorIndexFromKeyword(kv as never);
          signalRepaired();
        },
      },
    );

    getSearchIndex().add(obsB!);
    scheduleIndexSave();
    await repaired;
    await Promise.resolve();

    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus().status).toBe("ready");
    expect(scheduleSave).toHaveBeenCalledOnce();
  });

  it("repairs bounded drift left by a partial rebuild before persisting", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    const obsB = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_b",
    );
    getSearchIndex().add(obsA!);
    getSearchIndex().add(obsB!);
    const vectors = new VectorIndex();
    vectors.add("obs_a", "ses_1", new Float32Array([0.1, 0.2, 0.3]));
    setVectorIndex(vectors);
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch: async (texts: string[]) =>
        texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    });
    markSearchIndexReady(2, 1, true, false);
    const scheduleSave = vi.fn();
    let signalRepaired!: () => void;
    const repaired = new Promise<void>((resolve) => {
      signalRepaired = resolve;
    });
    setIndexPersistence(
      {
        scheduleSave,
        save: vi.fn(async () => undefined),
      },
      {
        repairDrift: async () => {
          await repairVectorIndexFromKeyword(kv as never);
          signalRepaired();
        },
      },
    );

    scheduleIndexSave();
    await repaired;
    await Promise.resolve();

    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus().status).toBe("ready");
    expect(scheduleSave).toHaveBeenCalledOnce();
  });

  it("refreshes stale partial status after live indexes reach parity", async () => {
    const obsA = await kv.get<CompressedObservation>(
      KV.observations("ses_1"),
      "obs_a",
    );
    getSearchIndex().add(obsA!);
    const vectors = new VectorIndex();
    vectors.add("obs_a", "ses_1", new Float32Array([0.1, 0.2, 0.3]));
    setVectorIndex(vectors);
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch: async (texts: string[]) =>
        texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    });
    markSearchIndexReady(2, 1, true, false);
    const scheduleSave = vi.fn();
    setIndexPersistence({
      scheduleSave,
      save: vi.fn(async () => undefined),
    });

    scheduleIndexSave();

    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus()).toEqual({
      status: "ready",
      keywordEntries: 1,
      vectorEntries: 1,
    });
    expect(scheduleSave).toHaveBeenCalledOnce();
  });

  it("does not send strict-project observations to an external embedder", async () => {
    const session = await kv.get<Session>(KV.sessions, "ses_1");
    expect(session).not.toBeNull();
    await kv.set(KV.sessions, "ses_1", {
      ...session!,
      privacy: "strict",
      externalProcessing: false,
    });
    const embedBatch = vi.fn(async (texts: string[]) =>
      texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    );
    setEmbeddingProvider({
      name: "openai",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    setVectorIndex(new VectorIndex());

    await rebuildIndex(kv as never);

    expect(embedBatch).not.toHaveBeenCalled();
    expect(getVectorIndex()?.size).toBe(0);
    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus()).toEqual({
      status: "ready",
      keywordEntries: 2,
      vectorEntries: 0,
    });
    setVectorIndex(null);
    setEmbeddingProvider(null);
  });

  it("never sends project-scoped memories to an external embedder", async () => {
    await kv.set(KV.memories, "mem_private", {
      id: "mem_private",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
      type: "fact",
      title: "Project-only boundary marker",
      content: "This project memory must remain local during rebuild.",
      concepts: ["privacy"],
      files: [],
      sessionIds: ["ses_1"],
      strength: 7,
      version: 1,
      isLatest: true,
      project: "demo",
    });
    const embedBatch = vi.fn(async (texts: string[]) =>
      texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    );
    setEmbeddingProvider({
      name: "remote-test",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    setVectorIndex(new VectorIndex());

    await rebuildIndex(kv as never);

    const submitted = embedBatch.mock.calls.flatMap(([texts]) => texts);
    expect(submitted.some((text) => text.includes("boundary marker"))).toBe(false);
    expect(submitted.length).toBeGreaterThan(0);
    expect(getSearchIndexDrift()).toEqual({
      missingVectorIds: [],
      orphanVectorIds: [],
    });
    expect(getSearchIndexRuntimeStatus()).toEqual({
      status: "ready",
      keywordEntries: 3,
      vectorEntries: 2,
    });
  });

  it("bounds canonical reconciliation embedding batches", async () => {
    const embedBatch = vi.fn(async (texts: string[]) =>
      texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    );
    setEmbeddingProvider({
      name: "local-test",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    setVectorIndex(new VectorIndex());
    process.env.REBUILD_EMBED_BATCH_SIZE = "1";
    try {
      await reconcileCanonicalSearchIndex(kv as never);
      expect(embedBatch.mock.calls.length).toBe(2);
      expect(embedBatch.mock.calls.every(([texts]) => texts.length === 1)).toBe(
        true,
      );
    } finally {
      delete process.env.REBUILD_EMBED_BATCH_SIZE;
    }
  });

  it("allows strict-project observations through a local OpenAI-compatible embedder", async () => {
    const session = await kv.get<Session>(KV.sessions, "ses_1");
    expect(session).not.toBeNull();
    await kv.set(KV.sessions, "ses_1", {
      ...session!,
      privacy: "strict",
      externalProcessing: false,
    });
    const embedBatch = vi.fn(async (texts: string[]) =>
      texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    );
    setEmbeddingProvider({
      name: "openai",
      processingLocation: "local",
      dimensions: 3,
      embed: async () => new Float32Array([0.1, 0.2, 0.3]),
      embedBatch,
    });
    setVectorIndex(new VectorIndex());

    await rebuildIndex(kv as never);

    expect(embedBatch).toHaveBeenCalled();
    expect(getVectorIndex()?.size).toBeGreaterThan(0);
    setVectorIndex(null);
    setEmbeddingProvider(null);
  });

  it("allows a strict-project single write through a local OpenAI-compatible embedder", async () => {
    const embed = vi.fn(async () => new Float32Array([0.1, 0.2, 0.3]));
    setEmbeddingProvider({
      name: "openai",
      processingLocation: "local",
      dimensions: 3,
      embed,
      embedBatch: async (texts: string[]) =>
        texts.map(() => new Float32Array([0.1, 0.2, 0.3])),
    });
    setVectorIndex(new VectorIndex());

    const added = await vectorIndexAddGuarded(
      "obs_local",
      "ses_1",
      "local strict observation",
      { kind: "observation", logId: "obs_local" },
      { externalProcessing: false },
    );

    expect(added).toBe(true);
    expect(embed).toHaveBeenCalledOnce();
    expect(getVectorIndex()?.size).toBe(1);
    setVectorIndex(null);
    setEmbeddingProvider(null);
  });
});
