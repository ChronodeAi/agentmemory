import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    delete process.env["AGENTMEMORY_SLOTS"];
    sdk = mockSdk();
    kv = mockKV();
    registerCodingMemoryFunctions(
      sdk as never,
      kv as never,
      async (input) => ({
        verified:
          input.providerReceipt.startsWith("provider-receipt-") &&
          input.packetId.length > 0 &&
          input.project === project &&
          input.sessionId === sessionId,
        providerId: "test-provider",
        receiptId: input.providerReceipt,
      }),
    );
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

  it("rejects an unknown context class", async () => {
    expect(
      await sdk.trigger("mem::context-packet", {
        project,
        sessionId,
        context_class: "automatic",
      }),
    ).toEqual({
      success: false,
      error: "context_class must be advisory or gate-critical",
    });
  });

  it("caps packets at 2,000 tokens and suppresses sources only after acknowledgement", async () => {
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
      packetId: string;
      status: string;
      sources: Array<{ source: string; status: string }>;
    };

    expect(first.success).toBe(true);
    expect(first.status).toBe("degraded");
    expect(first.tokens).toBeLessThanOrEqual(2000);
    expect(first.sourceIds.filter((id) => id.startsWith("obs-"))).toHaveLength(5);
    expect(first.context).toContain("Verify recalled facts");
    expect(first.context).not.toContain("This must never leak");
    expect(first.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "lessons", status: "ok" }),
        expect.objectContaining({ source: "episodic", status: "ok" }),
        expect.objectContaining({ source: "file_history", status: "ok" }),
      ]),
    );

    const retryBeforeAcknowledgement = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
    }) as { success: boolean; sourceIds: string[] };

    expect(retryBeforeAcknowledgement.success).toBe(true);
    expect(retryBeforeAcknowledgement.sourceIds).toContain("lesson-1");

    const acknowledgement = await sdk.trigger("mem::context-acknowledge", {
      project,
      sessionId,
      packetId: first.packetId,
      providerReceipt: "provider-receipt-1",
    }) as { success: boolean; acknowledged: boolean; idempotent: boolean };
    const duplicate = await sdk.trigger("mem::context-acknowledge", {
      project,
      sessionId,
      packetId: first.packetId,
      providerReceipt: "provider-receipt-1",
    }) as { success: boolean; acknowledged: boolean; idempotent: boolean };

    expect(acknowledgement).toMatchObject({
      success: true,
      acknowledged: true,
      idempotent: false,
    });
    expect(duplicate).toMatchObject({
      success: true,
      acknowledged: true,
      idempotent: true,
    });
    expect(
      await sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: first.packetId,
        providerReceipt: "different-receipt",
      }),
    ).toEqual({
      success: false,
      error: "acknowledgement does not match the recorded delivery",
    });

    const afterAcknowledgement = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
    }) as { success: boolean; sourceIds: string[] };

    expect(afterAcknowledgement.success).toBe(true);
    expect(afterAcknowledgement.sourceIds).toEqual([]);
    expect(
      await sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: (afterAcknowledgement as { packetId: string }).packetId,
        providerReceipt: "provider-receipt-1",
      }),
    ).toEqual({
      success: false,
      acknowledged: false,
      error: "provider delivery receipt has already been used",
    });
  });

  it("rejects project/session-mismatched and invalid acknowledgements", async () => {
    const packet = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
    }) as { packetId: string };

    expect(
      await sdk.trigger("mem::context-acknowledge", {
        project: "github.com/chronodeai/other",
        sessionId,
        packetId: packet.packetId,
        providerReceipt: "provider-receipt-1",
      }),
    ).toMatchObject({ success: false });
    expect(
      await sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: "missing-packet",
        providerReceipt: "provider-receipt-1",
      }),
    ).toEqual({ success: false, error: "context packet not found" });

    const stored = await kv.get<{
      packetId: string;
      expiresAt: string;
    }>(
      KV.injectedSources(sessionId),
      `packet:${packet.packetId}`,
    );
    await kv.set(
      KV.injectedSources(sessionId),
      `packet:${packet.packetId}`,
      { ...stored!, expiresAt: new Date(Date.now() - 1_000).toISOString() },
    );
    expect(
      await sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: packet.packetId,
        providerReceipt: "provider-receipt-1",
      }),
    ).toEqual({ success: false, error: "context packet has expired" });
  });

  it("fails closed when trusted provider receipt verification is unavailable", async () => {
    const isolatedSdk = mockSdk();
    registerCodingMemoryFunctions(isolatedSdk as never, kv as never);
    const packet = await isolatedSdk.trigger("mem::context-packet", {
      project,
      sessionId,
    }) as { packetId: string };

    await expect(
      isolatedSdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: packet.packetId,
        providerReceipt: "invented-receipt",
      }),
    ).resolves.toEqual({
      success: false,
      acknowledged: false,
      error:
        "trusted provider delivery verification is unavailable; source suppression denied",
    });
  });

  it("does not honor legacy source markers and returns typed ledger failures", async () => {
    await kv.set(KV.injectedSources(sessionId), "lesson-1", {
      sourceId: "lesson-1",
      injectedAt: new Date().toISOString(),
    });
    const packet = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
    }) as { sourceIds: string[] };
    expect(packet.sourceIds).toContain("lesson-1");

    const originalList = kv.list.bind(kv);
    vi.spyOn(kv, "list").mockImplementation(async <T>(scope: string) => {
      if (scope === KV.injectedSources(sessionId)) {
        throw new Error("state backend unavailable");
      }
      return originalList<T>(scope);
    });
    await expect(
      sdk.trigger("mem::context-packet", { project, sessionId }),
    ).rejects.toMatchObject({
      name: "DeliveryLedgerError",
      code: "delivery_ledger_unavailable",
      operation: "list",
    });
  });

  it("repairs a receipt claim after an acknowledgement write failure", async () => {
    const packet = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
    }) as { packetId: string };
    const originalSet = kv.set.bind(kv);
    let failAcknowledgementWrite = true;
    vi.spyOn(kv, "set").mockImplementation(
      async <T>(scope: string, key: string, value: T) => {
        if (
          failAcknowledgementWrite &&
          scope === KV.injectedSources(sessionId) &&
          key === `ack:${packet.packetId}`
        ) {
          throw new Error("ack write interrupted");
        }
        return originalSet(scope, key, value);
      },
    );

    await expect(
      sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: packet.packetId,
        providerReceipt: "provider-receipt-repair",
      }),
    ).resolves.toMatchObject({
      success: false,
      acknowledged: false,
      code: "delivery_ledger_unavailable",
      operation: "write",
    });

    failAcknowledgementWrite = false;
    await expect(
      sdk.trigger("mem::context-acknowledge", {
        project,
        sessionId,
        packetId: packet.packetId,
        providerReceipt: "provider-receipt-repair",
      }),
    ).resolves.toMatchObject({
      success: true,
      acknowledged: true,
      idempotent: true,
    });
  });

  it("returns typed advisory degradation and gate-critical failure without suppression", async () => {
    sdk.override("mem::search", async () => {
      throw new Error("search backend unavailable");
    });
    sdk.override("mem::file-context", async () => ({
      context: "",
      sourceIds: [],
      outcome: {
        source: "file_history",
        status: "failed",
        error: "file index unavailable",
      },
    }));

    const advisory = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
      context_class: "advisory",
    }) as {
      success: boolean;
      status: string;
      completeness: { complete: boolean; failed: string[] };
      sources: Array<{ source: string; status: string; error?: string }>;
      sourceIds: string[];
    };

    expect(advisory.success).toBe(true);
    expect(advisory.status).toBe("degraded");
    expect(advisory.completeness.complete).toBe(false);
    expect(advisory.completeness.failed).toEqual(
      expect.arrayContaining(["episodic", "file_history"]),
    );
    expect(advisory.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "episodic",
          status: "failed",
          error: "search backend unavailable",
        }),
        expect.objectContaining({
          source: "file_history",
          status: "failed",
          error: "file index unavailable",
        }),
      ]),
    );

    const gateCritical = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
      files: ["src/index.ts"],
      context_class: "gate-critical",
    }) as {
      success: boolean;
      status: string;
      context: string;
      packetId?: string;
      sourceIds: string[];
    };

    expect(gateCritical).toMatchObject({
      success: false,
      status: "failed",
      context: "",
      sourceIds: [],
    });
    expect(gateCritical.packetId).toBeUndefined();

    sdk.override("mem::search", async () => ({
      results: [{ obsId: "retryable", observation: { title: "Retry", narrative: "still available" } }],
    }));
    const retry = await sdk.trigger("mem::context-packet", {
      project,
      sessionId,
    }) as { sourceIds: string[] };
    expect(retry.sourceIds).toContain("retryable");
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
