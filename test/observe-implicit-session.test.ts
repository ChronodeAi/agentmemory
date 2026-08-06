import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    store,
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    update: async (scope: string, key: string, updates: Array<{ path: string; value: unknown }>) => {
      const m = store.get(scope);
      if (!m) return;
      const v = (m.get(key) as Record<string, unknown>) ?? {};
      for (const u of updates) v[u.path] = u.value;
      m.set(key, v);
    },
    delete: async (scope: string, key: string) => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      const m = store.get(scope);
      return m ? (Array.from(m.values()) as T[]) : [];
    },
  };
}

function mockSdk() {
  const fns = new Map<string, Function>();
  return {
    fns,
    registerFunction: (
      idOrOpts: string | { id: string },
      fn: Function,
    ) => {
      const id = typeof idOrOpts === "string" ? idOrOpts : idOrOpts.id;
      fns.set(id, fn);
    },
    trigger: async (
      idOrInput: string | { function_id: string; payload: unknown; action?: unknown },
      data?: unknown,
    ) => {
      const id = typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload = typeof idOrInput === "string" ? data : idOrInput.payload;
      const fn = fns.get(id);
      if (fn) return fn(payload);
      return null;
    },
  };
}

describe("observe implicit session create (#638)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    const { setIndexPersistence, setVectorIndex } = await import(
      "../src/functions/search.js"
    );
    setIndexPersistence(null);
    setVectorIndex(null);
  });

  it("creates the session on first observe when project+cwd present and session record missing", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const sdk = mockSdk();
    const kv = mockKV();
    registerObserveFunction(sdk as never, kv as never);

    const result = (await sdk.trigger("mem::observe", {
      sessionId: "ses_opencode_abc",
      project: "/home/user/myrepo",
      cwd: "/home/user/myrepo",
      hookType: "prompt_submit",
      timestamp: new Date().toISOString(),
      data: { prompt: "ship the helm chart" },
    })) as { observationId: string };

    expect(result.observationId).toBeTruthy();

    const sessionScope = kv.store.get("mem:sessions");
    expect(sessionScope).toBeTruthy();
    const session = sessionScope!.get("ses_opencode_abc") as Record<string, unknown>;
    expect(session).toBeTruthy();
    expect(session.id).toBe("ses_opencode_abc");
    expect(session.project).toBe("/home/user/myrepo");
    expect(session.cwd).toBe("/home/user/myrepo");
    expect(session.status).toBe("active");
    expect(session.observationCount).toBe(1);
    expect(session.firstPrompt).toBe("ship the helm chart");
  });

  it("does not implicit-create when project+cwd missing (test-payload back-compat)", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const sdk = mockSdk();
    const kv = mockKV();
    registerObserveFunction(sdk as never, kv as never);

    await sdk.trigger("mem::observe", {
      sessionId: "ses_no_project",
      hookType: "post_tool_use",
      timestamp: new Date().toISOString(),
      data: { tool_name: "Read", tool_input: { file_path: "x.ts" } },
    });

    const sessionScope = kv.store.get("mem:sessions");
    // Either no scope at all, or no entry for this session
    expect(sessionScope?.get("ses_no_project")).toBeUndefined();
  });

  it("schedules persistence after indexing a synthetic observation", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const { setIndexPersistence } = await import("../src/functions/search.js");
    const scheduleSave = vi.fn();
    setIndexPersistence({ scheduleSave, save: vi.fn(async () => undefined) });
    const sdk = mockSdk();
    const kv = mockKV();
    registerObserveFunction(sdk as never, kv as never);

    await sdk.trigger("mem::observe", {
      sessionId: "ses_persist",
      project: "/home/user/myrepo",
      cwd: "/home/user/myrepo",
      hookType: "prompt_submit",
      timestamp: new Date().toISOString(),
      data: { prompt: "persist this indexed observation" },
    });

    expect(scheduleSave).toHaveBeenCalledTimes(1);
  });

  it("stores retrieval metadata without indexing it as new evidence", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const { getSearchIndex, setIndexPersistence } = await import(
      "../src/functions/search.js"
    );
    const scheduleSave = vi.fn();
    setIndexPersistence({ scheduleSave, save: vi.fn(async () => undefined) });
    const sdk = mockSdk();
    const kv = mockKV();
    registerObserveFunction(sdk as never, kv as never);

    const result = (await sdk.trigger("mem::observe", {
      sessionId: "ses_retrieval_metadata",
      project: "/home/user/myrepo",
      cwd: "/home/user/myrepo",
      hookType: "post_tool_use",
      timestamp: new Date().toISOString(),
      data: {
        tool_name: "mcp__agentmemory__memory_context_packet",
        tool_output: { context: "previously recalled content" },
      },
    })) as { observationId: string };

    const stored = kv.store
      .get("mem:obs:ses_retrieval_metadata")
      ?.get(result.observationId) as { recalledOnly?: boolean };
    expect(stored.recalledOnly).toBe(true);
    expect(getSearchIndex().size).toBe(0);
    expect(scheduleSave).not.toHaveBeenCalled();
  });

  it("removes compacted observations from both keyword and vector indexes", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const {
      getSearchIndex,
      setIndexPersistence,
      setVectorIndex,
    } = await import("../src/functions/search.js");
    const { VectorIndex } = await import("../src/state/vector-index.js");
    const sdk = mockSdk();
    const kv = mockKV();
    const vector = new VectorIndex();
    const scheduleSave = vi.fn();
    setVectorIndex(vector);
    setIndexPersistence({ scheduleSave, save: vi.fn(async () => undefined) });
    sdk.fns.set("mem::summarize", async () => ({ success: true }));

    await kv.set("mem:sessions", "ses_compact", {
      id: "ses_compact",
      project: "/home/user/myrepo",
      cwd: "/home/user/myrepo",
      startedAt: "2026-01-01T00:00:00.000Z",
      status: "active",
      observationCount: 99,
    });
    for (let i = 0; i < 99; i += 1) {
      const observation = {
        id: `obs_old_${i}`,
        sessionId: "ses_compact",
        timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
        type: "conversation",
        title: `old observation ${i}`,
        facts: [],
        narrative: `old narrative ${i}`,
        concepts: [],
        files: [],
        importance: 1,
      };
      await kv.set("mem:obs:ses_compact", observation.id, observation);
      getSearchIndex().add(observation as never);
      vector.add(
        observation.id,
        observation.sessionId,
        new Float32Array([i + 1, 1]),
      );
    }
    registerObserveFunction(sdk as never, kv as never, undefined, 100);

    const result = (await sdk.trigger("mem::observe", {
      sessionId: "ses_compact",
      project: "/home/user/myrepo",
      cwd: "/home/user/myrepo",
      hookType: "prompt_submit",
      timestamp: new Date().toISOString(),
      data: { prompt: "trigger bounded rolling compaction" },
    })) as { observationId?: string };

    expect(result.observationId).toBeTruthy();
    expect(vector.size).toBe(79);
    expect(getSearchIndex().size).toBe(80);
    expect(scheduleSave).toHaveBeenCalledTimes(2);
  });

  it("rejects an observation that does not match an existing session scope", async () => {
    const { registerObserveFunction } = await import("../src/functions/observe.js");
    const sdk = mockSdk();
    const kv = mockKV();
    registerObserveFunction(sdk as never, kv as never);

    await kv.set("mem:sessions", "ses_existing", {
      id: "ses_existing",
      project: "/orig/project",
      cwd: "/orig/cwd",
      startedAt: "2026-01-01T00:00:00Z",
      status: "active",
      observationCount: 7,
      firstPrompt: "original first prompt",
    });

    const result = await sdk.trigger("mem::observe", {
      sessionId: "ses_existing",
      project: "/different/project",
      cwd: "/different/cwd",
      hookType: "post_tool_use",
      timestamp: new Date().toISOString(),
      data: { tool_name: "Read" },
    });

    const session = kv.store.get("mem:sessions")!.get("ses_existing") as Record<string, unknown>;
    expect(result).toEqual({
      success: false,
      error: "session project or cwd does not match observation",
    });
    expect(session.project).toBe("/orig/project");
    expect(session.firstPrompt).toBe("original first prompt");
    expect(session.observationCount).toBe(7);
    expect(session.updatedAt).toBeUndefined();
    expect(
      kv.store.get("mem:obs:ses_existing")?.size ?? 0,
    ).toBe(0);
  });
});
