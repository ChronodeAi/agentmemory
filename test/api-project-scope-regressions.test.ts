import { describe, expect, it } from "vitest";
import {
  createProjectCapabilityToken,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../src/auth.js";
import { registerApiTriggers } from "../src/triggers/api.js";

type Handler = (request: {
  headers?: Record<string, string>;
  query_params?: Record<string, unknown>;
  path_params?: Record<string, unknown>;
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
  it("bounds session summaries while preserving aggregate dashboard counts", async () => {
    const { functions, kv } = createSurfaces();
    await kv.set("mem:sessions", "session-a1", {
      id: "session-a1",
      project: PROJECT_A,
      status: "completed",
      observationCount: 1,
      startedAt: "2026-07-25T01:00:00.000Z",
    });
    await kv.set("mem:sessions", "session-a2", {
      id: "session-a2",
      project: PROJECT_A,
      status: "active",
      observationCount: 2,
      startedAt: "2026-07-25T02:00:00.000Z",
    });
    await kv.set("mem:sessions", "session-a3", {
      id: "session-a3",
      project: PROJECT_A,
      status: "completed",
      observationCount: 3,
      startedAt: "2026-07-25T03:00:00.000Z",
    });
    await kv.set("mem:sessions", "session-b1", {
      id: "session-b1",
      project: PROJECT_B,
      status: "active",
      observationCount: 100,
      startedAt: "2026-07-25T04:00:00.000Z",
    });

    const response = await functions.get("api::sessions")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A, limit: "2" },
    });

    expect(response.status_code).toBe(200);
    expect(
      (response.body["sessions"] as Array<{ id: string }>).map(({ id }) => id),
    ).toEqual(["session-a3", "session-a2"]);
    expect(response.body).toMatchObject({
      total: 3,
      active: 1,
      totalObservations: 6,
    });

    const unbounded = await functions.get("api::sessions")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A },
    });
    expect(
      (unbounded.body["sessions"] as Array<{ id: string }>).map(({ id }) => id),
    ).toEqual(["session-a1", "session-a2", "session-a3"]);

    await expect(
      functions.get("api::sessions")!({
        headers: projectHeaders(PROJECT_A),
        query_params: { project: PROJECT_A, limit: "not-a-number" },
      }),
    ).resolves.toMatchObject({ status_code: 400 });
  });

  it("loads session summaries in bounded ordered batches within project scope", async () => {
    const { functions, kv } = createSurfaces();
    for (let index = 1; index <= 23; index += 1) {
      const id = `session-a${String(index).padStart(2, "0")}`;
      await kv.set("mem:sessions", id, {
        id,
        project: PROJECT_A,
        status: "completed",
        observationCount: index,
        startedAt: `2026-07-25T00:${String(index).padStart(2, "0")}:00.000Z`,
      });
      await kv.set("mem:summaries", id, {
        sessionId: id,
        project: PROJECT_A,
        createdAt: "2026-07-25T01:00:00.000Z",
        title: `summary-${id}`,
        narrative: "",
        keyDecisions: [],
        filesModified: [],
        concepts: [],
        observationCount: index,
      });
    }
    for (let index = 1; index <= 3; index += 1) {
      const id = `session-b${index}`;
      await kv.set("mem:sessions", id, {
        id,
        project: PROJECT_B,
        status: "completed",
        observationCount: 100,
        startedAt: `2026-07-25T01:0${index}:00.000Z`,
      });
      await kv.set("mem:summaries", id, {
        sessionId: id,
        project: PROJECT_B,
        createdAt: "2026-07-25T01:00:00.000Z",
        title: `summary-${id}`,
        narrative: "",
        keyDecisions: [],
        filesModified: [],
        concepts: [],
        observationCount: 100,
      });
    }

    const originalGet = kv.get;
    let inFlight = 0;
    let maxInFlight = 0;
    const summaryReads: string[] = [];
    kv.get = async <T>(scope: string, key: string): Promise<T | null> => {
      if (scope !== "mem:summaries") return originalGet<T>(scope, key);
      summaryReads.push(key);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;
      return originalGet<T>(scope, key);
    };

    const response = await functions.get("api::sessions")!({
      headers: projectHeaders(PROJECT_A),
      query_params: { project: PROJECT_A, limit: "23" },
    });

    expect(response.status_code).toBe(200);
    const sessions = response.body["sessions"] as Array<{
      id: string;
      summary?: { title: string };
    }>;
    const expectedIds = Array.from({ length: 23 }, (_, index) =>
      `session-a${String(23 - index).padStart(2, "0")}`,
    );
    expect(sessions.map((session) => session.id)).toEqual(expectedIds);
    expect(sessions.map((session) => session.summary?.title)).toEqual(
      expectedIds.map((id) => `summary-${id}`),
    );
    expect(summaryReads).toEqual(expectedIds);
    expect(summaryReads.every((id) => id.startsWith("session-a"))).toBe(true);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
  });

  it("bounds dashboard collection payloads and reports their full totals", async () => {
    const { functions, kv } = createSurfaces();
    const surfaces = [
      { trigger: "api::semantic-list", scope: "mem:semantic", key: "semantic" },
      { trigger: "api::procedural-list", scope: "mem:procedural", key: "procedural" },
      { trigger: "api::relations-list", scope: "mem:relations", key: "relations" },
    ] as const;

    for (const surface of surfaces) {
      for (let index = 1; index <= 3; index += 1) {
        await kv.set(surface.scope, `${surface.key}-${index}`, {
          id: `${surface.key}-${index}`,
        });
      }

      const bounded = await functions.get(surface.trigger)!({
        headers: adminHeaders(),
        query_params: { scope: "global", limit: "2" },
      });
      expect(bounded.status_code).toBe(200);
      expect(bounded.body[surface.key]).toHaveLength(2);
      expect(bounded.body["total"]).toBe(3);

      const compatible = await functions.get(surface.trigger)!({
        headers: adminHeaders(),
        query_params: { scope: "global" },
      });
      expect(compatible.body[surface.key]).toHaveLength(3);

      await expect(
        functions.get(surface.trigger)!({
          headers: adminHeaders(),
          query_params: { scope: "global", limit: "invalid" },
        }),
      ).resolves.toMatchObject({ status_code: 400 });
    }
  });

  it("fails closed across projects for memory collections, by-id reads, relations, and replay", async () => {
    const { functions, kv } = createSurfaces();
    const now = "2026-07-25T00:00:00.000Z";
    for (const [suffix, project] of [
      ["a", PROJECT_A],
      ["b", PROJECT_B],
      ["legacy", undefined],
    ] as const) {
      await kv.set("mem:memories", `memory-${suffix}`, {
        id: `memory-${suffix}`,
        project,
        isLatest: true,
      });
      await kv.set("mem:semantic", `semantic-${suffix}`, {
        id: `semantic-${suffix}`,
        project,
      });
      await kv.set("mem:procedural", `procedural-${suffix}`, {
        id: `procedural-${suffix}`,
        project,
      });
      await kv.set("mem:sessions", `session-${suffix}`, {
        id: `session-${suffix}`,
        project,
        status: "completed",
        observationCount: 1,
        startedAt: now,
      });
    }
    await kv.set("mem:relations", "relation-a", {
      sourceId: "memory-a",
      targetId: "semantic-a",
      type: "related",
      createdAt: now,
    });
    await kv.set("mem:relations", "relation-cross", {
      sourceId: "memory-a",
      targetId: "memory-b",
      type: "related",
      createdAt: now,
    });

    const query_params = { project: PROJECT_A };
    const headers = projectHeaders(PROJECT_A);
    const expected = [
      ["api::memories", "memories", "memory-a"],
      ["api::semantic-list", "semantic", "semantic-a"],
      ["api::procedural-list", "procedural", "procedural-a"],
    ] as const;
    for (const [trigger, key, id] of expected) {
      const response = await functions.get(trigger)!({ headers, query_params });
      expect(
        (response.body[key] as Array<{ id: string }>).map((record) => record.id),
      ).toEqual([id]);
      expect(response.body["total"]).toBe(1);
    }

    const relations = await functions.get("api::relations-list")!({
      headers,
      query_params,
    });
    expect(
      (relations.body["relations"] as Array<{ sourceId: string; targetId: string }>),
    ).toEqual([
      expect.objectContaining({ sourceId: "memory-a", targetId: "semantic-a" }),
    ]);

    await expect(
      functions.get("api::memory-by-id")!({
        headers,
        query_params,
        path_params: { id: "memory-b" },
      }),
    ).resolves.toMatchObject({ status_code: 404 });

    const ownMemory = await functions.get("api::memory-by-id")!({
      headers,
      query_params,
      path_params: { id: "memory-a" },
    });
    expect(ownMemory).toMatchObject({
      status_code: 200,
      body: { memory: { id: "memory-a", project: PROJECT_A } },
    });

    const replaySessions = await functions.get("api::replay::sessions")!({
      headers,
      query_params,
    });
    expect(
      (replaySessions.body["sessions"] as Array<{ id: string }>).map(({ id }) => id),
    ).toEqual(["session-a"]);
    await expect(
      functions.get("api::replay::load")!({
        headers,
        query_params: { ...query_params, sessionId: "session-b" },
      }),
    ).resolves.toMatchObject({ status_code: 404 });

    const globalCount = await functions.get("api::memories")!({
      headers: adminHeaders(),
      query_params: { scope: "global", count: "true" },
    });
    expect(globalCount.body["total"]).toBe(3);

    await expect(
      functions.get("api::memories")!({ headers, query_params: {} }),
    ).resolves.toMatchObject({ status_code: 400 });
  });

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
