import { describe, expect, it } from "vitest";
import {
  createProjectCapabilityToken,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../src/auth.js";
import { registerApiTriggers } from "../src/triggers/api.js";

type Handler = (request: {
  headers?: Record<string, string>;
  query_params?: Record<string, unknown>;
  body?: Record<string, unknown>;
}) => Promise<{
  status_code: number;
  body: Record<string, unknown>;
}>;

const ADMIN_SECRET = "scope-admin-secret";
const CAPABILITY_SECRET = "scope-capability-secret";
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

function createSurfaces() {
  const functions = new Map<string, Handler>();
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
    trigger: async () => ({ success: true }),
  };
  const kv = {
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
  return { functions, kv };
}

describe("REST project scope regressions", () => {
  it("filters commit listings and linked sessions by the exact project", async () => {
    const { functions, kv } = createSurfaces();
    await kv.set("mem:sessions", "session-a", {
      id: "session-a",
      project: PROJECT_A,
    });
    await kv.set("mem:sessions", "session-b", {
      id: "session-b",
      project: PROJECT_B,
    });
    await kv.set("mem:commits", "aaa1111", {
      sha: "aaa1111",
      shortSha: "aaa1111",
      project: PROJECT_A,
      sessionIds: ["session-a", "session-b"],
      linkedAt: "2026-07-25T00:00:00.000Z",
    });
    await kv.set("mem:commits", "bbb2222", {
      sha: "bbb2222",
      shortSha: "bbb2222",
      project: PROJECT_B,
      sessionIds: ["session-b"],
      linkedAt: "2026-07-25T01:00:00.000Z",
    });
    await kv.set("mem:commits", "legacy3333", {
      sha: "legacy3333",
      shortSha: "legacy3",
      sessionIds: [],
      linkedAt: "2026-07-25T02:00:00.000Z",
    });

    const commits = await functions.get("api::commits")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A },
    });
    expect(commits).toMatchObject({ status_code: 200 });
    expect(
      (commits.body["commits"] as Array<{ sha: string }>).map(({ sha }) => sha),
    ).toEqual(["aaa1111"]);

    const byCommit = await functions.get("api::session::by-commit")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A, sha: "aaa1111" },
    });
    expect(byCommit).toMatchObject({ status_code: 200 });
    expect(
      (byCommit.body["sessions"] as Array<{ id: string }>).map(({ id }) => id),
    ).toEqual(["session-a"]);

    await expect(
      functions.get("api::session::by-commit")!({
        headers: projectHeaders(PROJECT_A),
        query_params: { project: PROJECT_A, sha: "bbb2222" },
      }),
    ).resolves.toMatchObject({ status_code: 404 });

    await expect(
      functions.get("api::commits")!({
        headers: adminHeaders(),
        query_params: {},
      }),
    ).resolves.toMatchObject({ status_code: 400 });

    const global = await functions.get("api::commits")!({
      headers: adminHeaders(),
      query_params: { scope: "global" },
    });
    expect(
      (global.body["commits"] as Array<{ sha: string }>).map(({ sha }) => sha),
    ).toEqual(["legacy3333", "bbb2222", "aaa1111"]);
  });

  it("exports every mesh collection without crossing the project boundary", async () => {
    const { functions, kv } = createSurfaces();
    const now = "2026-07-25T00:00:00.000Z";
    const putPair = async (
      scope: string,
      prefix: string,
      make: (id: string, project?: string) => Record<string, unknown>,
    ) => {
      await kv.set(scope, `${prefix}_a`, make(`${prefix}_a`, PROJECT_A));
      await kv.set(scope, `${prefix}_b`, make(`${prefix}_b`, PROJECT_B));
      await kv.set(scope, `${prefix}_legacy`, make(`${prefix}_legacy`));
    };

    await putPair("mem:memories", "memory", (id, project) => ({
      id,
      project,
      createdAt: now,
      updatedAt: now,
    }));
    await putPair("mem:actions", "action", (id, project) => ({
      id,
      project,
      createdAt: now,
      updatedAt: now,
    }));
    await putPair("mem:semantic", "semantic", (id, project) => ({
      id,
      project,
      createdAt: now,
    }));
    await putPair("mem:procedural", "procedural", (id, project) => ({
      id,
      project,
      createdAt: now,
    }));
    await putPair("mem:graph:nodes", "node", (id, project) => ({
      id,
      project,
      createdAt: now,
    }));
    await kv.set("mem:graph:nodes", "node_a_2", {
      id: "node_a_2",
      project: PROJECT_A,
      createdAt: now,
    });
    await kv.set("mem:graph:edges", "edge_a", {
      id: "edge_a",
      project: PROJECT_A,
      sourceNodeId: "node_a",
      targetNodeId: "node_a_2",
      createdAt: now,
    });
    await kv.set("mem:graph:edges", "edge_cross", {
      id: "edge_cross",
      project: PROJECT_A,
      sourceNodeId: "node_a",
      targetNodeId: "node_b",
      createdAt: now,
    });
    await kv.set("mem:relations", "relation_a", {
      sourceId: "memory_a",
      targetId: "semantic_a",
      type: "related",
      createdAt: now,
    });
    await kv.set("mem:relations", "relation_cross", {
      sourceId: "memory_a",
      targetId: "memory_b",
      type: "related",
      createdAt: now,
    });

    await expect(
      functions.get("api::mesh-list")!({
        headers: projectHeaders(PROJECT_A),
      }),
    ).resolves.toMatchObject({ status_code: 401 });
    await expect(
      functions.get("api::mesh-list")!({
        headers: adminHeaders(),
      }),
    ).resolves.toMatchObject({ status_code: 200 });
    await expect(
      functions.get("api::mesh-receive")!({
        headers: adminHeaders(),
        body: {},
      }),
    ).resolves.toMatchObject({ status_code: 200 });

    const exportProject = await functions.get("api::mesh-export")!({
      headers: adminHeaders(),
      query_params: { project: PROJECT_A },
    });
    expect(exportProject.status_code).toBe(200);
    for (const collection of [
      "memories",
      "actions",
      "semantic",
      "procedural",
    ]) {
      expect(
        (exportProject.body[collection] as Array<{ project?: string }>).map(
          ({ project }) => project,
        ),
      ).toEqual([PROJECT_A]);
    }
    expect(
      (exportProject.body["relations"] as Array<{ sourceId: string }>).map(
        ({ sourceId }) => sourceId,
      ),
    ).toEqual(["memory_a"]);
    expect(
      (exportProject.body["graphEdges"] as Array<{ id: string }>).map(
        ({ id }) => id,
      ),
    ).toEqual(["edge_a"]);

    await expect(
      functions.get("api::mesh-export")!({
        headers: adminHeaders(),
        query_params: {},
      }),
    ).resolves.toMatchObject({ status_code: 400 });
    await expect(
      functions.get("api::mesh-export")!({
        headers: projectHeaders(PROJECT_A),
        query_params: { project: PROJECT_A },
      }),
    ).resolves.toMatchObject({ status_code: 401 });

    const exportGlobal = await functions.get("api::mesh-export")!({
      headers: adminHeaders(),
      query_params: { scope: "global" },
    });
    expect(exportGlobal.status_code).toBe(200);
    expect(
      (exportGlobal.body["memories"] as Array<{ id: string }>).map(
        ({ id }) => id,
      ),
    ).toEqual(["memory_a", "memory_b", "memory_legacy"]);
  });
});
