import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocked = vi.hoisted(() => ({
  stateJson: "",
  writes: [] as Array<{ path: string; content: string }>,
}));

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:util", async () => {
  const actual = await vi.importActual<typeof import("node:util")>("node:util");
  return {
    ...actual,
    promisify:
      () =>
      async (_command: string, args: string[]) => {
        if (args[0] === "show") return { stdout: mocked.stateJson, stderr: "" };
        if (args[0] === "rev-parse") {
          return { stdout: "abc1234\n", stderr: "" };
        }
        if (args[0] === "log") {
          return {
            stdout:
              "abc1234|2026-02-01T00:00:00.000Z|Test snapshot\n",
            stderr: "",
          };
        }
        return { stdout: "", stderr: "" };
      },
  };
});

vi.mock("node:fs", () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn((path: string, content: string) => {
    mocked.writes.push({ path, content });
    if (path.endsWith("state.json")) mocked.stateJson = content;
  }),
}));

import {
  PERSISTED_NAMESPACE_MANIFEST,
  registerSnapshotFunction,
} from "../src/functions/snapshot.js";
import { logger } from "../src/logger.js";
import {
  runMigrationCli,
  runStagedMigration,
} from "../src/functions/migrate.js";
import type { Memory, Session } from "../src/types.js";

function migrationTargetId(scope: string, key: string): string {
  return `target_${createHash("sha256")
    .update(`${scope}\u0000${key}`)
    .digest("hex")
    .slice(0, 16)}`;
}

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  let failNextSet:
    | { scope: string; key?: string; remaining: number }
    | undefined;
  let failNextGet:
    | { scope: string; key?: string; remaining: number; skip: number }
    | undefined;
  let failNextList:
    | { scope: string; remaining: number; skip: number }
    | undefined;
  let failNextDelete:
    | { scope: string; key?: string; remaining: number; error: unknown }
    | undefined;
  return {
    store,
    failSet(scope: string, key?: string, times = 1) {
      failNextSet = { scope, key, remaining: times };
    },
    failGet(scope: string, key?: string, times = 1, skip = 0) {
      failNextGet = { scope, key, remaining: times, skip };
    },
    failList(scope: string, times = 1, skip = 0) {
      failNextList = { scope, remaining: times, skip };
    },
    failDelete(scope: string, key?: string, error: unknown = new Error("injected delete failure")) {
      failNextDelete = { scope, key, remaining: 1, error };
    },
    get: async <T>(scope: string, key: string): Promise<T | null> => {
      if (
        failNextGet?.remaining &&
        failNextGet.scope === scope &&
        (failNextGet.key === undefined || failNextGet.key === key)
      ) {
        if (failNextGet.skip > 0) {
          failNextGet.skip--;
        } else {
          failNextGet.remaining--;
          throw new Error(`injected get failure for ${scope}/${key}`);
        }
      }
      return (store.get(scope)?.get(key) as T) ?? null;
    },
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (
        failNextSet?.remaining &&
        failNextSet.scope === scope &&
        (failNextSet.key === undefined || failNextSet.key === key)
      ) {
        failNextSet.remaining--;
        throw new Error(`injected set failure for ${scope}/${key}`);
      }
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    update: async <T>(
      scope: string,
      key: string,
      _ops: Array<{ type: string; path: string; value?: unknown }>,
    ): Promise<T> => {
      return (store.get(scope)?.get(key) as T) ?? (undefined as T);
    },
    delete: async (scope: string, key: string): Promise<void> => {
      if (
        failNextDelete?.remaining &&
        failNextDelete.scope === scope &&
        (failNextDelete.key === undefined || failNextDelete.key === key)
      ) {
        failNextDelete.remaining--;
        throw failNextDelete.error;
      }
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      if (failNextList?.remaining && failNextList.scope === scope) {
        if (failNextList.skip > 0) {
          failNextList.skip--;
        } else {
          failNextList.remaining--;
          throw new Error(`injected list failure for ${scope}`);
        }
      }
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
      const id =
        typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload =
        typeof idOrInput === "string" ? data : idOrInput.payload;
      const fn = functions.get(id);
      if (!fn) throw new Error(`No function: ${id}`);
      return fn(payload);
    },
  };
}

describe("Snapshot Functions", () => {
  let sdk: ReturnType<typeof mockSdk>;
  let kv: ReturnType<typeof mockKV>;
  const snapshotDir = "/tmp/agentmemory-snapshots";

  beforeEach(async () => {
    sdk = mockSdk();
    kv = mockKV();
    mocked.stateJson = "";
    mocked.writes = [];
    vi.clearAllMocks();
    registerSnapshotFunction(sdk as never, kv as never, snapshotDir);

    const session: Session = {
      id: "ses_1",
      project: "test",
      cwd: "/tmp",
      startedAt: "2026-02-01T00:00:00Z",
      status: "completed",
      observationCount: 1,
    };
    await kv.set("mem:sessions", "ses_1", session);

    const memory: Memory = {
      id: "mem_1",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
      type: "pattern",
      title: "Test pattern",
      content: "Always test",
      concepts: [],
      files: [],
      sessionIds: ["ses_1"],
      project: "test",
      strength: 5,
      version: 1,
      isLatest: true,
    };
    await kv.set("mem:memories", "mem_1", memory);
    await kv.set("mem:obs:ses_1", "obs_1", {
      id: "obs_1",
      sessionId: "ses_1",
      project: "test",
    });
  });

  it("persists the complete fixed and dynamic namespace manifest", async () => {
    const result = (await sdk.trigger("mem::snapshot-create", {
      message: "Test snapshot",
    })) as {
      success: boolean;
      status: string;
      snapshot: {
        commitHash: string;
        stats: { namespaces: number; records: number };
      };
    };

    expect(result).toMatchObject({
      success: true,
      status: "complete",
      snapshot: { commitHash: "abc1234" },
    });
    const state = JSON.parse(mocked.stateJson);
    expect(state.formatVersion).toBe(2);
    expect(state.namespaceManifest.fixed).toEqual(
      PERSISTED_NAMESPACE_MANIFEST.fixed,
    );
    expect(state.namespaceManifest.dynamic).toEqual(
      PERSISTED_NAMESPACE_MANIFEST.dynamic,
    );
    expect(state.namespaceManifest.resolvedScopes).toContain("mem:obs:ses_1");
    expect(state.namespaceManifest.resolvedScopes).toContain(
      "mem:emb:obs_1",
    );
    expect(state.namespaces.every((entry: { sha256?: string }) => entry.sha256))
      .toBe(true);
  });

  it("preserves project-qualified graph name-index keys without ledger help", async () => {
    kv.store.set(
      "mem:graph:nodes",
      new Map([
        [
          "node_polygres",
          {
            id: "node_polygres",
            project: "github.com/chronodeai/memetics",
            type: "technology",
            name: "Polygres",
            properties: {},
            sourceObservationIds: ["obs_1"],
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      ]),
    );
    kv.store.set(
      "mem:graph:name-index",
      new Map([
        [
          "github.com/chronodeai/memetics|technology|Polygres",
          "node_polygres",
        ],
      ]),
    );

    const result = await sdk.trigger("mem::snapshot-create", {
      message: "Project graph index",
    });

    expect(result).toMatchObject({ success: true, status: "complete" });
    const state = JSON.parse(mocked.stateJson) as {
      namespaces: Array<{
        scope: string;
        records: Array<{ key: string; value: unknown }>;
      }>;
    };
    expect(
      state.namespaces.find(
        ({ scope }) => scope === "mem:graph:name-index",
      )?.records,
    ).toEqual([
      {
        key: "github.com/chronodeai/memetics|technology|Polygres",
        value: "node_polygres",
      },
    ]);
  });

  it("preserves a legacy graph name-index key during snapshot migration", async () => {
    kv.store.set(
      "mem:graph:nodes",
      new Map([
        [
          "node_legacy",
          {
            id: "node_legacy",
            type: "concept",
            name: "Legacy",
            properties: {},
            sourceObservationIds: ["obs_1"],
            createdAt: "2026-07-25T00:00:00.000Z",
          },
        ],
      ]),
    );
    kv.store.set(
      "mem:graph:name-index",
      new Map([["concept|Legacy", "node_legacy"]]),
    );

    const result = await sdk.trigger("mem::snapshot-create", {
      message: "Legacy graph index",
    });

    expect(result).toMatchObject({ success: true, status: "complete" });
    const state = JSON.parse(mocked.stateJson) as {
      namespaces: Array<{
        scope: string;
        records: Array<{ key: string; value: unknown }>;
      }>;
    };
    expect(
      state.namespaces.find(
        ({ scope }) => scope === "mem:graph:name-index",
      )?.records,
    ).toEqual([{ key: "concept|Legacy", value: "node_legacy" }]);
  });

  it("does not misreport a committed primary write when ledger tracking fails", async () => {
    kv.failSet("mem:snapshot:namespace-keys");

    await expect(
      kv.set("mem:memories", "mem_primary", {
        id: "mem_primary",
        project: "test",
      }),
    ).resolves.toMatchObject({ id: "mem_primary" });

    expect(kv.store.get("mem:memories")?.get("mem_primary")).toMatchObject({
      id: "mem_primary",
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Snapshot namespace key ledger update failed",
      expect.objectContaining({
        scope: "mem:memories",
        key: "mem_primary",
      }),
    );
  });

  it("snapshot creation fails closed on an authoritative list failure", async () => {
    kv.failList("mem:sessions");

    const result = await sdk.trigger("mem::snapshot-create", {
      message: "Must not commit",
    });

    expect(result).toMatchObject({
      success: false,
      status: "incomplete",
      error: "injected list failure for mem:sessions",
    });
    expect(mocked.stateJson).toBe("");
  });

  it("snapshot creation fails closed on an authoritative get failure", async () => {
    kv.failGet("mem:memories", "mem_1");

    const result = await sdk.trigger("mem::snapshot-create", {
      message: "Must not commit",
    });

    expect(result).toMatchObject({
      success: false,
      status: "incomplete",
      error: "injected get failure for mem:memories/mem_1",
    });
    expect(mocked.stateJson).toBe("");
  });

  it("exact restore deletes post-snapshot residue and verifies hashes", async () => {
    await sdk.trigger("mem::snapshot-create", { message: "Exact" });
    await kv.set("mem:memories", "mem_residue", {
      id: "mem_residue",
      project: "test",
    });
    await kv.set("mem:obs:ses_1", "obs_residue", {
      id: "obs_residue",
      sessionId: "ses_1",
    });

    const result = (await sdk.trigger("mem::snapshot-restore", {
      commitHash: "abc1234",
    })) as {
      success: boolean;
      status: string;
      verifiedNamespaces: number;
    };

    expect(result.success).toBe(true);
    expect(result.status).toBe("complete");
    expect(result.verifiedNamespaces).toBeGreaterThan(0);
    expect(await kv.get("mem:memories", "mem_residue")).toBeNull();
    expect(await kv.get("mem:obs:ses_1", "obs_residue")).toBeNull();
    expect(await kv.get("mem:memories", "mem_1")).not.toBeNull();
  });

  it("returns typed incomplete and preserves rollback evidence", async () => {
    await sdk.trigger("mem::snapshot-create", { message: "Rollback" });
    const before = await kv.get("mem:memories", "mem_1");
    kv.failSet("mem:memories", "mem_1");

    const result = (await sdk.trigger("mem::snapshot-restore", {
      commitHash: "abc1234",
    })) as {
      success: boolean;
      status: string;
      rollback: {
        attempted: boolean;
        success: boolean;
        evidencePath: string;
      };
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe("incomplete");
    expect(result.rollback).toMatchObject({
      attempted: true,
      success: true,
    });
    expect(result.rollback.evidencePath).toContain("rollback-evidence");
    expect(await kv.get("mem:memories", "mem_1")).toEqual(before);
  });

  it("snapshot restore fails closed when current-state listing fails", async () => {
    await sdk.trigger("mem::snapshot-create", { message: "List failure" });
    kv.failList("mem:sessions");

    const result = (await sdk.trigger("mem::snapshot-restore", {
      commitHash: "abc1234",
    })) as {
      success: boolean;
      status: string;
      rollback: { attempted: boolean };
    };

    expect(result).toMatchObject({
      success: false,
      status: "incomplete",
      error: "injected list failure for mem:sessions",
      rollback: { attempted: false },
    });
  });

  it("snapshot restore cannot claim equality after verification get failure", async () => {
    await sdk.trigger("mem::snapshot-create", { message: "Get failure" });
    kv.failGet("mem:memories", "mem_1", 1, 1);

    const result = (await sdk.trigger("mem::snapshot-restore", {
      commitHash: "abc1234",
    })) as {
      success: boolean;
      status: string;
      rollback: { attempted: boolean; success: boolean };
    };

    expect(result).toMatchObject({
      success: false,
      status: "incomplete",
      error: "injected get failure for mem:memories/mem_1",
      rollback: { attempted: true, success: true },
    });
  });

  it("snapshot-list returns git history and restore validates input", async () => {
    const list = (await sdk.trigger("mem::snapshot-list", {})) as {
      snapshots: Array<{ commitHash: string }>;
    };
    expect(list.snapshots).toEqual([
      expect.objectContaining({ commitHash: "abc1234" }),
    ]);
    await expect(sdk.trigger("mem::snapshot-restore", {})).resolves.toMatchObject({
      success: false,
      status: "rejected",
    });
  });
});

describe("staged migration", () => {
  it("serializes concurrent calls for the same generation", async () => {
    const kv = mockKV();
    const originalSet = kv.set.bind(kv);
    let activeTargetWrites = 0;
    let maximumConcurrentTargetWrites = 0;
    kv.set = async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (scope === "mem:sessions" && key === "session") {
        activeTargetWrites++;
        maximumConcurrentTargetWrites = Math.max(
          maximumConcurrentTargetWrites,
          activeTargetWrites,
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
        try {
          return await originalSet(scope, key, value);
        } finally {
          activeTargetWrites--;
        }
      }
      return originalSet(scope, key, value);
    };
    const input = {
      generation: "migration_concurrent",
      sourceSha256: "e".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        {
          scope: "mem:sessions",
          key: "session",
          value: { id: "session", value: "new" },
        },
      ],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    };

    const [first, second] = await Promise.all([
      runStagedMigration(kv as never, input),
      runStagedMigration(kv as never, input),
    ]);

    expect(maximumConcurrentTargetWrites).toBe(1);
    expect(first).toMatchObject({
      success: true,
      status: "complete",
      resumed: false,
    });
    expect(second).toMatchObject({
      success: true,
      status: "complete",
      resumed: true,
    });
    expect(await kv.get("mem:sessions", "session")).toEqual({
      id: "session",
      value: "new",
    });
  });

  it("serializes distinct generations that share the migration target space", async () => {
    const kv = mockKV();
    const originalSet = kv.set.bind(kv);
    let activeTargetWrites = 0;
    let maximumConcurrentTargetWrites = 0;
    kv.set = async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (scope === "mem:sessions") {
        activeTargetWrites++;
        maximumConcurrentTargetWrites = Math.max(
          maximumConcurrentTargetWrites,
          activeTargetWrites,
        );
        await new Promise((resolve) => setTimeout(resolve, 10));
        try {
          return await originalSet(scope, key, value);
        } finally {
          activeTargetWrites--;
        }
      }
      return originalSet(scope, key, value);
    };
    const base = {
      sourcePath: "/tmp/source.db",
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    };

    const [first, second] = await Promise.all([
      runStagedMigration(kv as never, {
        ...base,
        generation: "migration_global_lock_1",
        sourceSha256: "2".repeat(64),
        targets: [
          {
            scope: "mem:sessions",
            key: "session-1",
            value: { id: "session-1" },
          },
        ],
      }),
      runStagedMigration(kv as never, {
        ...base,
        generation: "migration_global_lock_2",
        sourceSha256: "3".repeat(64),
        targets: [
          {
            scope: "mem:sessions",
            key: "session-2",
            value: { id: "session-2" },
          },
        ],
      }),
    ]);

    expect(maximumConcurrentTargetWrites).toBe(1);
    expect(first).toMatchObject({ success: true, resumed: false });
    expect(second).toMatchObject({ success: true, resumed: false });
  });

  it("rolls back only targets recorded as promoted", async () => {
    const kv = mockKV();
    const generation = "migration_partial_promotion";
    const stageScope = `mem:migration:staging:${generation}`;
    const promoted = {
      id: migrationTargetId("mem:sessions", "promoted"),
      scope: "mem:sessions",
      key: "promoted",
      value: { id: "promoted", value: "migration" },
      before: { id: "promoted", value: "before" },
      beforeExists: true,
    };
    const untouched = {
      id: migrationTargetId("mem:sessions", "untouched"),
      scope: "mem:sessions",
      key: "untouched",
      value: { id: "untouched", value: "migration" },
      before: { id: "untouched", value: "before" },
      beforeExists: true,
    };
    await kv.set(stageScope, promoted.id, promoted);
    await kv.set(stageScope, untouched.id, untouched);
    await kv.set(promoted.scope, promoted.key, promoted.value);
    await kv.set(untouched.scope, untouched.key, {
      id: "untouched",
      value: "concurrent",
    });
    await kv.set("mem:migration:reports", generation, {
      id: generation,
      generation,
      sourceSha256: "f".repeat(64),
      sourcePath: "/tmp/source.db",
      status: "promoting",
      stageScope,
      total: 2,
      progress: 1,
      promotedTargetIds: [promoted.id],
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      counts: { sessionCount: 2, obsCount: 0, summaryCount: 0 },
    });

    const result = await runStagedMigration(kv as never, {
      generation,
      sourceSha256: "f".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        { scope: promoted.scope, key: promoted.key, value: promoted.value },
        { scope: untouched.scope, key: untouched.key, value: untouched.value },
      ],
      counts: { sessionCount: 2, obsCount: 0, summaryCount: 0 },
      action: "rollback",
    });

    expect(result).toMatchObject({
      status: "rolled-back",
      rollback: { restored: 1, success: true },
    });
    expect(await kv.get(promoted.scope, promoted.key)).toEqual(promoted.before);
    expect(await kv.get(untouched.scope, untouched.key)).toEqual({
      id: "untouched",
      value: "concurrent",
    });
  });

  it("does not overwrite a promoted target after ownership changes", async () => {
    const kv = mockKV();
    const generation = "migration_ownership_conflict";
    const stageScope = `mem:migration:staging:${generation}`;
    const target = {
      id: migrationTargetId("mem:sessions", "session"),
      scope: "mem:sessions",
      key: "session",
      value: { id: "session", value: "migration" },
      before: { id: "session", value: "before" },
      beforeExists: true,
    };
    await kv.set(stageScope, target.id, target);
    await kv.set(target.scope, target.key, {
      id: "session",
      value: "concurrent",
    });
    await kv.set("mem:migration:reports", generation, {
      id: generation,
      generation,
      sourceSha256: "1".repeat(64),
      sourcePath: "/tmp/source.db",
      status: "promoting",
      stageScope,
      total: 1,
      progress: 1,
      promotedTargetIds: [target.id],
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    });

    const result = await runStagedMigration(kv as never, {
      generation,
      sourceSha256: "1".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        { scope: target.scope, key: target.key, value: target.value },
      ],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
      action: "rollback",
    });

    expect(result).toMatchObject({
      status: "rollback-incomplete",
      rollback: {
        success: false,
        skippedConflicts: [target.id],
      },
    });
    expect(await kv.get(target.scope, target.key)).toEqual({
      id: "session",
      value: "concurrent",
    });
  });

  it("resumes an interrupted staging generation idempotently", async () => {
    const kv = mockKV();
    const generation = "migration_staging_resume";
    const stageScope = `mem:migration:staging:${generation}`;
    const firstTarget = {
      id: "target_existing",
      scope: "mem:sessions",
      key: "session-1",
      value: { id: "session-1" },
      before: null,
      beforeExists: false,
    };
    const targets = [
      {
        scope: firstTarget.scope,
        key: firstTarget.key,
        value: firstTarget.value,
      },
      {
        scope: "mem:sessions",
        key: "session-2",
        value: { id: "session-2" },
      },
    ];
    firstTarget.id = migrationTargetId(firstTarget.scope, firstTarget.key);
    await kv.set(stageScope, firstTarget.id, firstTarget);
    await kv.set("mem:migration:reports", generation, {
      id: generation,
      generation,
      sourceSha256: "d".repeat(64),
      sourcePath: "/tmp/source.db",
      status: "staging",
      stageScope,
      total: targets.length,
      progress: 0,
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      counts: { sessionCount: 2, obsCount: 0, summaryCount: 0 },
    });

    const result = await runStagedMigration(kv as never, {
      generation,
      sourceSha256: "d".repeat(64),
      sourcePath: "/tmp/source.db",
      targets,
      counts: { sessionCount: 2, obsCount: 0, summaryCount: 0 },
    });

    expect(result).toMatchObject({
      success: true,
      status: "complete",
      resumed: true,
      promoted: 2,
    });
    expect(await kv.get("mem:sessions", "session-1")).toEqual({
      id: "session-1",
    });
    expect(await kv.get("mem:sessions", "session-2")).toEqual({
      id: "session-2",
    });
  });

  it("is generation-idempotent and supports explicit rollback", async () => {
    const kv = mockKV();
    await kv.set("mem:sessions", "session", { id: "session", value: "old" });
    const input = {
      generation: "migration_generation",
      sourceSha256: "a".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        {
          scope: "mem:sessions",
          key: "session",
          value: { id: "session", value: "new" },
        },
        {
          scope: "mem:sessions",
          key: "created",
          value: { id: "created" },
        },
      ],
      counts: { sessionCount: 2, obsCount: 0, summaryCount: 0 },
    };

    const first = await runStagedMigration(kv as never, input);
    const repeated = await runStagedMigration(kv as never, input);
    const rolledBack = await runStagedMigration(kv as never, {
      ...input,
      action: "rollback",
    });

    expect(first).toMatchObject({
      success: true,
      status: "complete",
      resumed: false,
    });
    expect(repeated).toMatchObject({
      success: true,
      status: "complete",
      resumed: true,
    });
    expect(rolledBack).toMatchObject({
      success: false,
      status: "rolled-back",
      rollback: { success: true },
    });
    expect(await kv.get("mem:sessions", "session")).toEqual({
      id: "session",
      value: "old",
    });
    expect(await kv.get("mem:sessions", "created")).toBeNull();
  });

  it("automatically rolls back a failed promotion and keeps its journal", async () => {
    const kv = mockKV();
    await kv.set("mem:sessions", "session", { id: "session", value: "old" });
    kv.failSet("mem:sessions", "session");
    const result = await runStagedMigration(kv as never, {
      generation: "migration_failure",
      sourceSha256: "b".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        {
          scope: "mem:sessions",
          key: "session",
          value: { id: "session", value: "new" },
        },
      ],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    });

    expect(result).toMatchObject({
      success: false,
      status: "rolled-back",
      rollback: { success: true },
    });
    expect(await kv.get("mem:sessions", "session")).toEqual({
      id: "session",
      value: "old",
    });
    expect(
      await kv.get("mem:migration:reports", "migration_failure"),
    ).toMatchObject({
      status: "rolled-back",
      rollback: { success: true },
    });
  });

  it("preserves object-shaped rollback diagnostics with target context", async () => {
    const kv = mockKV();
    const input = {
      generation: "migration_delete_diagnostic",
      sourceSha256: "d".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        {
          scope: "mem:sessions",
          key: "created",
          value: { id: "created", value: "migration" },
        },
      ],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    };
    await runStagedMigration(kv as never, input);
    kv.failDelete("mem:sessions", "created", {
      code: "state-delete-failed",
      message: "synthetic object failure",
    });

    const result = await runStagedMigration(kv as never, {
      ...input,
      action: "rollback",
    });

    expect(result).toMatchObject({
      status: "rollback-incomplete",
      rollback: { restored: 0, success: false },
    });
    expect(result.error).toContain("state-delete-failed");
    expect(result.error).toContain("synthetic object failure");
    expect(result.error).toContain(
      migrationTargetId("mem:sessions", "created"),
    );
    expect(result.error).not.toContain("[object Object]");
  });

  it("recovers a legacy journal that marked an undefined value as existing", async () => {
    const kv = mockKV();
    const generation = "migration_legacy_undefined";
    const scope = "mem:sessions";
    const key = "created";
    const id = migrationTargetId(scope, key);
    const value = { id: key, value: "migration" };
    await kv.set(`mem:migration:staging:${generation}`, id, {
      id,
      scope,
      key,
      value,
      before: undefined,
      beforeExists: true,
    });
    await kv.set(scope, key, value);
    await kv.set("mem:migration:reports", generation, {
      id: generation,
      generation,
      sourceSha256: "e".repeat(64),
      sourcePath: "/tmp/source.db",
      status: "rollback-incomplete",
      stageScope: `mem:migration:staging:${generation}`,
      total: 1,
      progress: 1,
      promotedTargetIds: [id],
      createdAt: "2026-08-03T00:00:00.000Z",
      updatedAt: "2026-08-03T00:00:00.000Z",
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    });

    const result = await runStagedMigration(kv as never, {
      generation,
      sourceSha256: "e".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [{ scope, key, value }],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
      action: "rollback",
    });

    expect(result).toMatchObject({
      status: "rolled-back",
      rollback: { restored: 1, success: true },
    });
    expect(await kv.get(scope, key)).toBeNull();
  });

  it("rolls back a target written before its promotion journal update", async () => {
    const kv = mockKV();
    await kv.set("mem:sessions", "session", { id: "session", value: "old" });
    const originalSet = kv.set.bind(kv);
    let reportWrites = 0;
    kv.set = async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (
        scope === "mem:migration:reports" &&
        key === "migration_journal_crash"
      ) {
        reportWrites++;
        if (reportWrites === 4) {
          throw new Error("injected post-write journal failure");
        }
      }
      return originalSet(scope, key, value);
    };

    const result = await runStagedMigration(kv as never, {
      generation: "migration_journal_crash",
      sourceSha256: "4".repeat(64),
      sourcePath: "/tmp/source.db",
      targets: [
        {
          scope: "mem:sessions",
          key: "session",
          value: { id: "session", value: "new" },
        },
      ],
      counts: { sessionCount: 1, obsCount: 0, summaryCount: 0 },
    });

    expect(result).toMatchObject({
      success: false,
      status: "rolled-back",
      rollback: { restored: 1, success: true },
    });
    expect(await kv.get("mem:sessions", "session")).toEqual({
      id: "session",
      value: "old",
    });
  });
});

describe("migration CLI", () => {
  function captureCliOutput() {
    let stdout = "";
    let stderr = "";
    return {
      dependencies: {
        stdout: (text: string) => {
          stdout += text;
        },
        stderr: (text: string) => {
          stderr += text;
        },
      },
      stdout: () => stdout,
      stderr: () => stderr,
    };
  }

  it("prints help without contacting the server", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn();

    const exitCode = await runMigrationCli(["--help"], {
      ...output.dependencies,
      fetchImpl: fetchImpl as never,
      env: {},
    });

    expect(exitCode).toBe(0);
    expect(output.stdout()).toContain("Usage:");
    expect(output.stdout()).toContain("agentmemory migrate");
    expect(output.stderr()).toBe("");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects missing admin authentication before making a request", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn();

    const exitCode = await runMigrationCli(
      ["--db-path", "/tmp/source.db", "--action", "resume"],
      {
        ...output.dependencies,
        fetchImpl: fetchImpl as never,
        env: {},
      },
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(output.stderr())).toMatchObject({
      operationSucceeded: false,
      error: { code: "missing-auth" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("forwards bounded resume arguments and confirms promotion success", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, status: "complete", promoted: 3 }),
        { status: 200 },
      ),
    );

    const exitCode = await runMigrationCli(
      [
        "--db-path",
        "/tmp/source.db",
        "--action",
        "resume",
        "--timeout-ms",
        "5000",
      ],
      {
        ...output.dependencies,
        fetchImpl,
        env: { AGENTMEMORY_ADMIN_SECRET: "admin-secret" },
      },
    );

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:3111/agentmemory/migrate",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer admin-secret",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          dbPath: "/tmp/source.db",
          action: "resume",
        }),
      }),
    );
    expect(JSON.parse(output.stdout())).toMatchObject({
      operationSucceeded: true,
      result: { success: true, status: "complete" },
    });
    expect(output.stderr()).toBe("");
  });

  it("treats a fully confirmed rollback as operational success", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          status: "rolled-back",
          rollback: { restored: 2, success: true },
        }),
        { status: 200 },
      ),
    );

    const exitCode = await runMigrationCli(
      ["--db-path", "/tmp/source.db", "--action", "rollback"],
      {
        ...output.dependencies,
        fetchImpl,
        env: { AGENTMEMORY_ADMIN_SECRET: "admin-secret" },
      },
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(output.stdout())).toMatchObject({
      operationSucceeded: true,
      result: {
        success: false,
        status: "rolled-back",
        rollback: { success: true },
      },
    });
    expect(output.stderr()).toBe("");
  });

  it("returns nonzero for a partial rollback", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          status: "rollback-incomplete",
          rollback: { restored: 1, success: false },
        }),
        { status: 200 },
      ),
    );

    const exitCode = await runMigrationCli(
      ["--db-path", "/tmp/source.db", "--action", "rollback"],
      {
        ...output.dependencies,
        fetchImpl,
        env: { AGENTMEMORY_ADMIN_SECRET: "admin-secret" },
      },
    );

    expect(exitCode).toBe(1);
    expect(JSON.parse(output.stderr())).toMatchObject({
      operationSucceeded: false,
      result: {
        status: "rollback-incomplete",
        rollback: { success: false },
      },
      error: { code: "operation-incomplete" },
    });
    expect(output.stdout()).toBe("");
  });

  it("rejects non-loopback migration endpoints", async () => {
    const output = captureCliOutput();
    const fetchImpl = vi.fn();

    const exitCode = await runMigrationCli(
      ["--step", "infer-memory-projects", "--url", "https://example.com"],
      {
        ...output.dependencies,
        fetchImpl: fetchImpl as never,
        env: { AGENTMEMORY_ADMIN_SECRET: "admin-secret" },
      },
    );

    expect(exitCode).toBe(2);
    expect(JSON.parse(output.stderr())).toMatchObject({
      operationSucceeded: false,
      error: { code: "invalid-endpoint" },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
