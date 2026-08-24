import { describe, expect, it } from "vitest";
import {
  createProjectCapabilityToken,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../src/auth.js";
import { registerApiTriggers } from "../src/triggers/api.js";
import { registerExportImportFunction } from "../src/functions/export-import.js";
import { queryAudit, recordAudit } from "../src/functions/audit.js";
import { KV } from "../src/state/schema.js";

type Handler = (request: {
  headers?: Record<string, string>;
  query_params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}) => Promise<{
  status_code: number;
  body: Record<string, unknown>;
}>;

const ADMIN_SECRET = "export-audit-admin-secret";
const CAPABILITY_SECRET = "export-audit-capability-secret";
const PROJECT_A = "github.com/example/project-a";
const PROJECT_B = "github.com/example/project-b";

function projectHeaders(project: string): Record<string, string> {
  const token = createProjectCapabilityToken(
    {
      version: 1,
      audience: "agentmemory",
      project,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    },
    CAPABILITY_SECRET,
  );
  return {
    authorization: `Bearer ${token}`,
    [PROJECT_CAPABILITY_PROJECT_HEADER]: project,
  };
}

function adminHeaders(): Record<string, string> {
  return { authorization: `Bearer ${ADMIN_SECRET}` };
}

function createApi() {
  const functions = new Map<string, Handler>();
  const captured: Array<{ function_id: string; payload: unknown }> = [];
  const store = new Map<string, Map<string, unknown>>();
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Handler,
    ) => {
      functions.set(
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id,
        handler,
      );
    },
    registerTrigger: () => {},
    trigger: async (request: { function_id: string; payload?: unknown }) => {
      captured.push(request);
      return { success: true };
    },
  };
  const kv = makeKv(store);
  registerApiTriggers(
    sdk as never,
    kv as never,
    "legacy-secret",
    undefined,
    undefined,
    ADMIN_SECRET,
    CAPABILITY_SECRET,
    true,
    "agentmemory",
  );
  return { functions, captured, store };
}

function makeKv(store: Map<string, Map<string, unknown>>) {
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, value);
      return value;
    },
    update: async () => undefined,
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> =>
      Array.from(store.get(scope)?.values() ?? []) as T[],
  };
}

describe("REST export/audit project scoping", () => {
  it("rejects unscoped export and audit requests", async () => {
    const { functions } = createApi();
    const exportRoute = functions.get("api::export")!;
    const auditRoute = functions.get("api::audit")!;

    await expect(exportRoute({ headers: adminHeaders() })).resolves.toMatchObject({
      status_code: 400,
      body: {
        error: expect.stringContaining("project is required"),
      },
    });
    await expect(auditRoute({ headers: adminHeaders() })).resolves.toMatchObject({
      status_code: 400,
      body: {
        error: expect.stringContaining("project is required"),
      },
    });
  });

  it("passes the requested project through a project-scoped export", async () => {
    const { functions, captured } = createApi();
    const response = await functions.get("api::export")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A },
    });
    expect(response.status_code).toBe(200);
    const exportCall = captured.find((c) => c.function_id === "mem::export");
    expect(exportCall?.payload).toMatchObject({ project: PROJECT_A });
  });

  it("requires administrative authority for global export/audit scope", async () => {
    const { functions } = createApi();
    await expect(
      functions.get("api::export")!({
        headers: projectHeaders(PROJECT_A),
        query_params: { scope: "global" },
      }),
    ).resolves.toMatchObject({ status_code: 401 });
    await expect(
      functions.get("api::audit")!({
        headers: projectHeaders(PROJECT_A),
        query_params: { scope: "global" },
      }),
    ).resolves.toMatchObject({ status_code: 401 });

    // Admin clears the middleware-level gate; the handler passes global
    // through instead of a project filter.
    const { functions: f2, captured } = createApi();
    const ok = await f2.get("api::audit")!({
      headers: adminHeaders(),
      query_params: { scope: "global" },
    });
    expect(ok.status_code).toBe(200);
    const auditCall = captured.find((c) => c.function_id === "mem::audit-query");
    expect(auditCall?.payload).not.toHaveProperty("project");
  });
});

describe("mem::export project filtering", () => {
  it("returns filtered data for a project and everything only for global", async () => {
    const store = new Map<string, Map<string, unknown>>();
    const kv = makeKv(store);
    const functions = new Map<
      string,
      (data?: Record<string, unknown>) => Promise<unknown>
    >();
    const sdk = {
      registerFunction: (id: string, handler: never) => {
        functions.set(id, handler as never);
      },
      registerTrigger: () => {},
    };
    registerExportImportFunction(sdk as never, kv as never);

    await kv.set(KV.sessions, "ses-a", {
      id: "ses-a",
      project: PROJECT_A,
    });
    await kv.set(KV.sessions, "ses-b", {
      id: "ses-b",
      project: PROJECT_B,
    });
    await kv.set(`mem:obs:ses-a`, "obs-1", { id: "obs-1" });
    await kv.set(KV.memories, "mem-a", {
      id: "mem-a",
      project: PROJECT_A,
    });
    await kv.set(KV.memories, "mem-b", {
      id: "mem-b",
      project: PROJECT_B,
    });
    await kv.set(KV.summaries, "sum-a", {
      sessionId: "ses-a",
      project: PROJECT_A,
    });
    await kv.set(KV.sentinels, "sen-x", { id: "sen-x" });
    await kv.set(KV.accessLog, "acc-x", { memoryId: "mem-a" });

    const memExport = functions.get("mem::export")!;

    const scopedExport = (await memExport({ project: PROJECT_A })) as {
      sessions: Array<{ id: string }>;
      memories: Array<{ id: string }>;
      summaries: Array<{ sessionId: string }>;
      observations: Record<string, unknown>;
      sentinels?: unknown[];
      accessLogs?: unknown[];
    };
    expect(scopedExport.sessions.map((s) => s.id)).toEqual(["ses-a"]);
    expect(scopedExport.memories.map((m) => m.id)).toEqual(["mem-a"]);
    expect(scopedExport.summaries.map((s) => s.sessionId)).toEqual(["ses-a"]);
    expect(Object.keys(scopedExport.observations)).toEqual(["ses-a"]);
    // Non-attributable sections are omitted rather than leaked.
    expect(scopedExport.sentinels).toBeUndefined();
    expect(scopedExport.accessLogs).toBeUndefined();

    const globalExport = (await memExport({ scope: "global" })) as {
      sessions: Array<{ id: string }>;
      memories: Array<{ id: string }>;
      sentinels?: unknown[];
    };
    expect(globalExport.sessions.map((s) => s.id).sort()).toEqual([
      "ses-a",
      "ses-b",
    ]);
    expect(globalExport.memories.map((m) => m.id).sort()).toEqual([
      "mem-a",
      "mem-b",
    ]);
    expect(globalExport.sentinels).toBeDefined();

    const unscoped = (await memExport()) as {
      memories: Array<{ id: string }>;
    };
    expect(unscoped.memories.map((m) => m.id).sort()).toEqual([
      "mem-a",
      "mem-b",
    ]);
  });
});

describe("queryAudit project filtering", () => {
  it("filters to entries attributed to the project; global sees all", async () => {
    const store = new Map<string, Map<string, unknown>>();
    const kv = makeKv(store);

    await recordAudit(kv as never, "remember", "mem::remember", ["m1"], {
      project: PROJECT_A,
    });
    await recordAudit(kv as never, "remember", "mem::remember", ["m2"], {
      project: PROJECT_B,
    });
    await recordAudit(kv as never, "index_persist", "sys::persist", [], {});

    const projectEntries = await queryAudit(kv as never, {
      project: PROJECT_A,
    });
    expect(projectEntries).toHaveLength(1);
    expect(projectEntries[0]!.details["project"]).toBe(PROJECT_A);

    const allEntries = await queryAudit(kv as never, {});
    expect(allEntries).toHaveLength(3);
  });
});
