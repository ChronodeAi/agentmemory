import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getAuditPersistenceHealth,
  queryAudit,
  recordAudit,
  resetAuditPersistenceHealthForTests,
  safeAudit,
} from "../src/functions/audit.js";

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

describe("Audit Functions", () => {
  let kv: ReturnType<typeof mockKV>;
  let auditDirectory: string;

  beforeEach(() => {
    auditDirectory = mkdtempSync(join(tmpdir(), "agentmemory-audit-unit-"));
    process.env["AGENTMEMORY_AUDIT_GAP_FILE"] = join(
      auditDirectory,
      "audit-gaps.json",
    );
    kv = mockKV();
    resetAuditPersistenceHealthForTests();
  });

  afterEach(() => {
    delete process.env["AGENTMEMORY_AUDIT_GAP_FILE"];
    rmSync(auditDirectory, { recursive: true, force: true });
  });

  it("recordAudit creates an entry with proper fields", async () => {
    const entry = await recordAudit(
      kv as never,
      "observe",
      "mem::compress",
      ["obs_1", "obs_2"],
      { count: 2 },
      0.85,
      "user-1",
    );

    expect(entry.id).toMatch(/^aud_/);
    expect(entry.timestamp).toBeDefined();
    expect(entry.operation).toBe("observe");
    expect(entry.functionId).toBe("mem::compress");
    expect(entry.targetIds).toEqual(["obs_1", "obs_2"]);
    expect(entry.details).toEqual({ count: 2 });
    expect(entry.qualityScore).toBe(0.85);
    expect(entry.userId).toBe("user-1");
    expect(getAuditPersistenceHealth()).toMatchObject({
      status: "ready",
      attempts: 1,
      succeeded: 1,
      failed: 0,
    });
  });

  it("reports a non-fatal safeAudit persistence failure", async () => {
    const failingKv = {
      ...mockKV(),
      set: vi.fn(async () => {
        throw Object.assign(new Error("state::set timed out"), { code: "TIMEOUT" });
      }),
    };

    await expect(
      safeAudit(failingKv as never, "observe", "fn", ["obs-1"]),
    ).resolves.toBeUndefined();
    expect(getAuditPersistenceHealth()).toMatchObject({
      status: "recovering",
      attempts: 1,
      succeeded: 0,
      failed: 1,
      pending: 1,
      unresolvedFailures: 1,
      lastErrorCode: "TIMEOUT",
    });
  });

  it("fails closed when neither audit sink is durable", async () => {
    const blocker = join(auditDirectory, "not-a-directory");
    writeFileSync(blocker, "blocked", { mode: 0o600 });
    process.env["AGENTMEMORY_AUDIT_GAP_FILE"] = join(blocker, "audit-gaps.json");
    const failingKv = {
      ...mockKV(),
      set: vi.fn(async () => {
        throw new Error("state sink unavailable");
      }),
    };

    await expect(
      safeAudit(failingKv as never, "delete", "fn", ["mem-1"]),
    ).rejects.toThrow("audit persistence has no durable sink");
    expect(getAuditPersistenceHealth()).toMatchObject({
      status: "failed",
      pending: 1,
      unresolvedFailures: 1,
    });
  });

  it("replays the exact missing audit row before clearing its alert", async () => {
    let fail = true;
    const base = mockKV();
    const failingKv = {
      ...base,
      set: vi.fn(async <T>(scope: string, key: string, value: T) => {
        if (fail) {
          fail = false;
          throw new Error("first write failed");
        }
        return base.set(scope, key, value);
      }),
    };
    await safeAudit(failingKv as never, "observe", "fn", ["obs-1"]);
    await safeAudit(failingKv as never, "observe", "fn", ["obs-2"]);

    expect(getAuditPersistenceHealth()).toMatchObject({
      status: "ready",
      attempts: 3,
      succeeded: 2,
      failed: 1,
      pending: 0,
      recovered: 1,
      unresolvedFailures: 0,
    });
    expect(getAuditPersistenceHealth().lastErrorCode).toBeUndefined();
    expect(await failingKv.list("mem:audit")).toHaveLength(2);
  });

  it("queryAudit returns entries sorted by timestamp desc", async () => {
    await recordAudit(kv as never, "observe", "fn1", ["a"], {});
    await new Promise((r) => setTimeout(r, 10));
    await recordAudit(kv as never, "delete", "fn2", ["b"], {});

    const entries = await queryAudit(kv as never);
    expect(entries.length).toBe(2);
    expect(
      new Date(entries[0].timestamp).getTime(),
    ).toBeGreaterThanOrEqual(new Date(entries[1].timestamp).getTime());
  });

  it("queryAudit filters by operation", async () => {
    await recordAudit(kv as never, "observe", "fn1", [], {});
    await recordAudit(kv as never, "delete", "fn2", [], {});
    await recordAudit(kv as never, "observe", "fn3", [], {});

    const entries = await queryAudit(kv as never, { operation: "observe" });
    expect(entries.length).toBe(2);
    expect(entries.every((e) => e.operation === "observe")).toBe(true);
  });

  it("queryAudit filters by dateFrom/dateTo", async () => {
    const early = await recordAudit(kv as never, "observe", "fn1", [], {});
    await new Promise((r) => setTimeout(r, 20));
    const late = await recordAudit(kv as never, "delete", "fn2", [], {});

    const entries = await queryAudit(kv as never, {
      dateFrom: late.timestamp,
    });
    expect(entries.length).toBe(1);
    expect(entries[0].operation).toBe("delete");

    const entriesBefore = await queryAudit(kv as never, {
      dateTo: early.timestamp,
    });
    expect(entriesBefore.length).toBe(1);
    expect(entriesBefore[0].operation).toBe("observe");
  });

  it("queryAudit respects limit", async () => {
    for (let i = 0; i < 10; i++) {
      await recordAudit(kv as never, "observe", `fn${i}`, [], {});
    }

    const entries = await queryAudit(kv as never, { limit: 3 });
    expect(entries.length).toBe(3);
  });
});
