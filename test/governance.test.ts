import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  reconcileGovernanceDeleteIntents,
  registerGovernanceFunction,
} from "../src/functions/governance.js";
import {
  getSearchIndex,
  setIndexPersistence,
} from "../src/functions/search.js";
import { memoryToObservation } from "../src/state/memory-utils.js";
import type { Memory, AuditEntry } from "../src/types.js";

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
    trigger: async (idOrInput: string | { function_id: string; payload: unknown }, data?: unknown) => {
      const id = typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload = typeof idOrInput === "string" ? data : idOrInput.payload;
      const fn = functions.get(id);
      if (!fn) throw new Error(`No function: ${id}`);
      return fn(payload);
    },
  };
}

function makeMemory(id: string, type: Memory["type"] = "pattern"): Memory {
  return {
    id,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    type,
    title: `Memory ${id}`,
    content: `Content for ${id}`,
    concepts: ["test"],
    files: [],
    sessionIds: ["ses_1"],
    strength: 5,
    version: 1,
    isLatest: true,
  };
}

describe("Governance Functions", () => {
  let sdk: ReturnType<typeof mockSdk>;
  let kv: ReturnType<typeof mockKV>;

  beforeEach(async () => {
    sdk = mockSdk();
    kv = mockKV();
    registerGovernanceFunction(sdk as never, kv as never);

    await kv.set("mem:memories", "mem_1", makeMemory("mem_1", "pattern"));
    await kv.set("mem:memories", "mem_2", makeMemory("mem_2", "bug"));
    await kv.set("mem:memories", "mem_3", makeMemory("mem_3", "pattern"));
  });

  it("governance-delete removes specified memories", async () => {
    const result = (await sdk.trigger("mem::governance-delete", {
      memoryIds: ["mem_1"],
      reason: "outdated",
    })) as { success: boolean; deleted: number; total: number };

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(1);
    expect(result.total).toBe(1);

    const remaining = await kv.list("mem:memories");
    expect(remaining.length).toBe(2);
  });

  it("governance-delete handles non-existent IDs gracefully", async () => {
    const result = (await sdk.trigger("mem::governance-delete", {
      memoryIds: ["nonexistent_1", "nonexistent_2"],
    })) as { success: boolean; deleted: number; total: number };

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(0);
    expect(result.total).toBe(2);

    const remaining = await kv.list("mem:memories");
    expect(remaining.length).toBe(3);
  });

  it("does not delete a memory outside the requested project", async () => {
    await kv.set("mem:memories", "mem_project_a", {
      ...makeMemory("mem_project_a"),
      project: "github.com/example/a",
    });
    await kv.set("mem:memories", "mem_project_b", {
      ...makeMemory("mem_project_b"),
      project: "github.com/example/b",
    });

    const result = (await sdk.trigger("mem::governance-delete", {
      memoryIds: ["mem_project_a", "mem_project_b"],
      project: "github.com/example/a",
    })) as {
      success: boolean;
      deleted: number;
      failures: Array<{ id: string; error: string }>;
    };

    expect(result).toMatchObject({
      success: false,
      deleted: 1,
      failures: [
        { id: "mem_project_b", error: "project_scope_mismatch" },
      ],
    });
    expect(await kv.get("mem:memories", "mem_project_a")).toBeNull();
    expect(await kv.get("mem:memories", "mem_project_b")).not.toBeNull();
  });

  it("records an outcome after a partial lookup failure", async () => {
    const originalGet = kv.get;
    kv.get = vi.fn(async <T>(scope: string, key: string): Promise<T | null> => {
      if (scope === "mem:memories" && key === "mem_2") {
        throw new Error("lookup unavailable");
      }
      return originalGet<T>(scope, key);
    });

    const result = (await sdk.trigger("mem::governance-delete", {
      memoryIds: ["mem_1", "mem_2"],
    })) as { success: boolean; deleted: number };
    const entries = (await sdk.trigger("mem::audit-query", {})) as AuditEntry[];
    const intent = entries.find((entry) => entry.details.phase === "intent");
    const outcome = entries.find((entry) => entry.details.phase === "outcome");

    expect(result).toMatchObject({ success: false, deleted: 1 });
    expect(entries).toHaveLength(3);
    expect(intent?.details.operationId).toBe(outcome?.details.operationId);
    expect(outcome?.targetIds).toEqual(["mem_1"]);
    expect(outcome?.details).toMatchObject({
      phase: "outcome",
      failedIds: ["mem_2"],
    });
  });

  it("reconciles an unmatched delete intent after restart", async () => {
    await kv.delete("mem:memories", "mem_1");
    await kv.set<AuditEntry>("mem:audit", "aud_interrupted", {
      id: "aud_interrupted",
      timestamp: "2026-02-01T00:00:00Z",
      operation: "delete",
      functionId: "mem::governance-delete",
      targetIds: [],
      details: {
        operationId: "govdel_interrupted",
        phase: "intent",
        confirmedCandidates: [{ id: "mem_1" }, { id: "mem_2" }],
        candidateIds: ["mem_1", "mem_2"],
      },
    });

    await expect(
      reconcileGovernanceDeleteIntents(kv as never),
    ).resolves.toBe(1);
    await expect(
      reconcileGovernanceDeleteIntents(kv as never),
    ).resolves.toBe(0);
    const entries = await kv.list<AuditEntry>("mem:audit");
    const recovered = entries.find(
      (entry) => entry.details.recoveredAfterRestart === true,
    );
    expect(recovered?.targetIds).toEqual([]);
    expect(recovered?.details).toMatchObject({
      operationId: "govdel_interrupted",
      retainedIds: ["mem_2"],
      unknownIds: ["mem_1"],
      outcomeCertainty: "unknown",
    });
  });

  it("attributes a restart deletion only when durable progress exists", async () => {
    await kv.delete("mem:memories", "mem_1");
    await kv.set<AuditEntry>("mem:audit", "aud_intent", {
      id: "aud_intent",
      timestamp: "2026-02-01T00:00:00Z",
      operation: "delete",
      functionId: "mem::governance-delete",
      targetIds: [],
      details: {
        operationId: "govdel_progress",
        phase: "intent",
        confirmedCandidates: [{ id: "mem_1" }, { id: "mem_2" }],
      },
    });
    await kv.set<AuditEntry>("mem:audit", "aud_progress", {
      id: "aud_progress",
      timestamp: "2026-02-01T00:00:01Z",
      operation: "delete",
      functionId: "mem::governance-delete",
      targetIds: ["mem_1"],
      details: {
        operationId: "govdel_progress",
        phase: "progress",
        candidateId: "mem_1",
        cleanupComplete: true,
      },
    });

    await expect(reconcileGovernanceDeleteIntents(kv as never)).resolves.toBe(1);
    const entries = await kv.list<AuditEntry>("mem:audit");
    const recovered = entries.find(
      (entry) => entry.details.recoveredAfterRestart === true,
    );
    expect(recovered?.targetIds).toEqual(["mem_1"]);
    expect(recovered?.details).toMatchObject({
      retainedIds: ["mem_2"],
      unknownIds: [],
      outcomeCertainty: "complete",
    });
  });

  it("refuses image-backed deletion outside memory-forget", async () => {
    await kv.set("mem:memories", "mem_image", {
      ...makeMemory("mem_image"),
      imageRef: "image_1",
    });
    const result = (await sdk.trigger("mem::governance-delete", {
      memoryIds: ["mem_image"],
    })) as { success: boolean; deleted: number; failures?: unknown[] };

    expect(result).toMatchObject({ success: false, deleted: 0 });
    await expect(kv.get("mem:memories", "mem_image")).resolves.not.toBeNull();
    expect(result.failures).toContainEqual({
      id: "mem_image",
      error: "image_backed_memory_requires_memory_forget",
    });
  });

  it("governance-bulk deletes by type filter", async () => {
    const result = (await sdk.trigger("mem::governance-bulk", {
      type: ["pattern"],
    })) as { success: boolean; deleted: number };

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(2);

    const remaining = await kv.list<Memory>("mem:memories");
    expect(remaining.length).toBe(1);
    expect(remaining[0].type).toBe("bug");
  });

  it("governance-bulk respects dryRun", async () => {
    const result = (await sdk.trigger("mem::governance-bulk", {
      type: ["pattern"],
      dryRun: true,
    })) as { success: boolean; dryRun: boolean; wouldDelete: number; ids: string[] };

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.wouldDelete).toBe(2);
    expect(result.ids).toContain("mem_1");
    expect(result.ids).toContain("mem_3");

    const remaining = await kv.list("mem:memories");
    expect(remaining.length).toBe(3);
  });

  it("records bulk deletion intent separately from the successful outcome", async () => {
    const originalDelete = kv.delete;
    kv.delete = async (scope: string, key: string): Promise<void> => {
      if (scope === "mem:memories" && key === "mem_3") {
        throw new Error("simulated delete failure");
      }
      await originalDelete(scope, key);
    };

    const result = (await sdk.trigger("mem::governance-bulk", {
      type: ["pattern"],
    })) as { success: boolean; deleted: number; failed: number };
    const audits = await kv.list<AuditEntry>("mem:audit");
    const intent = audits.find((entry) => entry.details.phase === "intent");
    const outcome = audits.find((entry) => entry.details.phase === "outcome");

    expect(result).toMatchObject({ success: false, deleted: 1, failed: 1 });
    expect(intent?.targetIds).toEqual([]);
    expect(intent?.details.candidateIds).toEqual(["mem_1", "mem_3"]);
    expect(outcome?.targetIds).toEqual(["mem_1"]);
    expect(outcome?.details.failedIds).toEqual(["mem_3"]);
    expect(outcome?.details.operationId).toBe(intent?.details.operationId);
  });

  it("records a canonical bulk delete even when derived cleanup fails", async () => {
    const index = getSearchIndex();
    const remove = vi.spyOn(index, "remove");
    remove.mockImplementationOnce(() => {
      throw new Error("simulated index cleanup failure");
    });

    const result = (await sdk.trigger("mem::governance-bulk", {
      type: ["pattern"],
    })) as { success: boolean; deleted: number; failed: number };
    const audits = await kv.list<AuditEntry>("mem:audit");
    const outcome = audits.find((entry) => entry.details.phase === "outcome");

    expect(result.deleted).toBe(2);
    expect(outcome?.targetIds).toEqual(["mem_1", "mem_3"]);
    await expect(kv.get("mem:memories", "mem_1")).resolves.toBeNull();
    remove.mockRestore();
  });

  it("reconciles an unmatched bulk-delete intent after restart", async () => {
    await kv.delete("mem:memories", "mem_1");
    await kv.set<AuditEntry>("mem:audit", "aud_bulk_interrupted", {
      id: "aud_bulk_interrupted",
      timestamp: "2026-02-01T00:00:00Z",
      operation: "delete",
      functionId: "mem::governance-bulk",
      targetIds: [],
      details: {
        operationId: "govdel_bulk_interrupted",
        phase: "intent",
        confirmedCandidates: [{ id: "mem_1" }, { id: "mem_2" }],
        candidateIds: ["mem_1", "mem_2"],
      },
    });

    await expect(
      reconcileGovernanceDeleteIntents(kv as never),
    ).resolves.toBe(1);
    const entries = await kv.list<AuditEntry>("mem:audit");
    const recovered = entries.find(
      (entry) =>
        entry.functionId === "mem::governance-bulk" &&
        entry.details.recoveredAfterRestart === true,
    );
    expect(recovered?.targetIds).toEqual([]);
    expect(recovered?.details).toMatchObject({
      operationId: "govdel_bulk_interrupted",
      retainedIds: ["mem_2"],
      unknownIds: ["mem_1"],
    });
  });

  // Delete paths must tear down the BM25 index entry and trigger an
  // IndexPersistence save so a hard process exit can't restore a stale
  // snapshot at next boot.
  describe("search index cleanup on delete", () => {
    function indexedObs(id: string, title: string) {
      return memoryToObservation({
        id,
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
        type: "fact",
        title,
        content: title,
        concepts: [],
        files: [],
        sessionIds: ["ses_1"],
        strength: 5,
        version: 1,
        isLatest: true,
      });
    }

    function mockPersistence() {
      return {
        scheduleSave: vi.fn(),
        save: vi.fn(async () => {}),
      };
    }

    beforeEach(() => {
      // SearchIndex is a module-level singleton — wipe it so cases
      // don't bleed into each other.
      getSearchIndex().clear();
      setIndexPersistence(null);
    });

    // The persistence singleton is module-scoped; without this reset
    // the last test's mock would leak into sibling tests in the outer
    // suite and trigger unexpected spy invocations.
    afterEach(() => {
      setIndexPersistence(null);
    });

    it("governance-delete removes the memory from the search index", async () => {
      getSearchIndex().add(indexedObs("mem_1", "alpha"));
      getSearchIndex().add(indexedObs("mem_2", "beta"));
      expect(getSearchIndex().has("mem_1")).toBe(true);

      await sdk.trigger("mem::governance-delete", {
        memoryIds: ["mem_1"],
      });

      expect(getSearchIndex().has("mem_1")).toBe(false);
      expect(getSearchIndex().has("mem_2")).toBe(true);
    });

    it("governance-delete flushes persistence immediately", async () => {
      const persistence = mockPersistence();
      setIndexPersistence(persistence);
      getSearchIndex().add(indexedObs("mem_1", "alpha"));

      await sdk.trigger("mem::governance-delete", { memoryIds: ["mem_1"] });

      // Delete paths must use the synchronous save (not the debounced
      // scheduleSave) so a process exit immediately after delete can't
      // resurrect the entry on next boot.
      expect(persistence.save).toHaveBeenCalled();
    });

    it("governance-delete skips persistence flush when nothing was deleted", async () => {
      const persistence = mockPersistence();
      setIndexPersistence(persistence);

      await sdk.trigger("mem::governance-delete", {
        memoryIds: ["nonexistent_999"],
      });

      expect(persistence.save).not.toHaveBeenCalled();
    });

    it("governance-bulk removes deleted memories from the search index", async () => {
      getSearchIndex().add(indexedObs("mem_1", "alpha"));
      getSearchIndex().add(indexedObs("mem_2", "beta"));
      getSearchIndex().add(indexedObs("mem_3", "gamma"));

      await sdk.trigger("mem::governance-bulk", { type: ["pattern"] });

      // mem_1 and mem_3 are type "pattern" per the outer beforeEach.
      expect(getSearchIndex().has("mem_1")).toBe(false);
      expect(getSearchIndex().has("mem_3")).toBe(false);
      expect(getSearchIndex().has("mem_2")).toBe(true);
    });

    it("governance-bulk flushes persistence immediately", async () => {
      const persistence = mockPersistence();
      setIndexPersistence(persistence);
      getSearchIndex().add(indexedObs("mem_1", "alpha"));

      await sdk.trigger("mem::governance-bulk", { type: ["pattern"] });

      expect(persistence.save).toHaveBeenCalled();
    });
  });

  it("audit-query returns audit entries", async () => {
    await sdk.trigger("mem::governance-delete", {
      memoryIds: ["mem_1"],
      reason: "cleanup",
    });

    const entries = (await sdk.trigger("mem::audit-query", {})) as AuditEntry[];

    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.operation === "delete")).toBe(true);
    expect(
      entries.every(
        (entry) => entry.functionId === "mem::governance-delete",
      ),
    ).toBe(true);
    expect(entries.map((entry) => entry.details.phase).sort()).toEqual([
      "intent",
      "outcome",
      "progress",
    ]);
    expect(
      entries.find((entry) => entry.details.phase === "intent")?.targetIds,
    ).toEqual([]);
    expect(
      entries.find((entry) => entry.details.phase === "progress")?.targetIds,
    ).toEqual(["mem_1"]);
    expect(
      entries.find((entry) => entry.details.phase === "outcome")?.targetIds,
    ).toEqual(["mem_1"]);
  });
});
