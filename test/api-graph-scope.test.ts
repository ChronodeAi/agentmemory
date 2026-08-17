import { describe, expect, it, vi } from "vitest";
import { registerApiTriggers } from "../src/triggers/api.js";

type Handler = (request: any) => Promise<any>;

function registerGraphApi(options: {
  sessions?: unknown[];
  observations?: unknown[];
  triggerResult?: unknown;
} = {}) {
  const functions = new Map<string, Handler>();
  const trigger = vi.fn(async () =>
    options.triggerResult ?? { success: true },
  );
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Handler,
    ) => {
      const id =
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id;
      functions.set(id, handler);
    },
    registerTrigger: () => {},
    trigger,
  };
  const kv = {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
    list: async (scope: string) => {
      if (scope === "mem:sessions") return options.sessions ?? [];
      if (scope.startsWith("mem:obs:")) {
        return options.observations ?? [];
      }
      return [];
    },
  };
  registerApiTriggers(
    sdk as never,
    kv as never,
    "legacy-secret",
    undefined,
    undefined,
    "admin-secret",
    "capability-secret",
    true,
  );
  return {
    get(name: string): Handler {
      const handler = functions.get(name);
      if (!handler) throw new Error(`${name} was not registered`);
      return handler;
    },
    trigger,
  };
}

const adminRequest = {
  headers: { authorization: "Bearer admin-secret" },
  query_params: {},
};

describe("knowledge graph API scope", () => {
  it("rejects graph reads without a project or explicit global scope", async () => {
    const api = registerGraphApi();

    const query = await api.get("api::graph-query")({
      ...adminRequest,
      body: {},
    });
    const stats = await api.get("api::graph-stats")(adminRequest);

    expect(query.status_code).toBe(400);
    expect(stats.status_code).toBe(400);
    expect(api.trigger).not.toHaveBeenCalled();
  });

  it("passes only the exact project binding to graph reads", async () => {
    const api = registerGraphApi();
    const project = "github.com/example/project";

    const query = await api.get("api::graph-query")({
      ...adminRequest,
      body: { project, query: "adapter", limit: 5 },
    });
    const stats = await api.get("api::graph-stats")({
      ...adminRequest,
      query_params: { project },
    });

    expect(query.status_code).toBe(200);
    expect(stats.status_code).toBe(200);
    expect(api.trigger).toHaveBeenNthCalledWith(1, {
      function_id: "mem::graph-query",
      payload: {
        startNodeId: undefined,
        nodeType: undefined,
        maxDepth: undefined,
        query: "adapter",
        limit: 5,
        offset: undefined,
        project,
      },
    });
    expect(api.trigger).toHaveBeenNthCalledWith(2, {
      function_id: "mem::graph-stats",
      payload: { project },
    });
  });

  it("requires and propagates explicit global scope for graph mutation", async () => {
    const api = registerGraphApi();
    const rebuild = api.get("api::graph-snapshot-rebuild");
    const reset = api.get("api::graph-reset");

    expect(
      (
        await rebuild({
          ...adminRequest,
          body: { force: true },
        })
      ).status_code,
    ).toBe(400);
    expect(
      (
        await rebuild({
          ...adminRequest,
          body: { scope: "global", force: true },
        })
      ).status_code,
    ).toBe(200);
    expect(
      (
        await reset({
          ...adminRequest,
          body: { scope: "global" },
        })
      ).status_code,
    ).toBe(200);
    expect(api.trigger).toHaveBeenNthCalledWith(1, {
      function_id: "mem::graph-snapshot-rebuild",
      payload: { scope: "global", force: true },
    });
    expect(api.trigger).toHaveBeenNthCalledWith(2, {
      function_id: "mem::graph-reset",
      payload: { scope: "global" },
    });
  });

  it("whitelists project and observations for graph extraction", async () => {
    const api = registerGraphApi();
    const project = "github.com/example/project";
    const observations = [{ id: "obs_1", sessionId: "ses_1" }];

    const response = await api.get("api::graph-extract")({
      ...adminRequest,
      body: {
        project,
        observations,
        injected: "must-not-pass",
      },
    });

    expect(response.status_code).toBe(200);
    expect(api.trigger).toHaveBeenCalledWith({
      function_id: "mem::graph-extract",
      payload: { project, observations },
    });
  });

  it("does not convert graph extraction failure into HTTP success", async () => {
    const project = "github.com/example/project";
    const api = registerGraphApi({
      triggerResult: {
        success: false,
        retryable: true,
        error: "provider unavailable",
      },
    });

    const response = await api.get("api::graph-extract")({
      ...adminRequest,
      body: {
        project,
        observations: [{ id: "obs_1", sessionId: "ses_1" }],
      },
    });

    expect(response.status_code).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      retryable: true,
      error: "provider unavailable",
    });
  });

  it("reports partial graph-build failures as retryable service failures", async () => {
    const project = "github.com/example/project";
    const api = registerGraphApi({
      sessions: [
        {
          id: "ses_1",
          project,
          status: "completed",
          observationCount: 1,
        },
      ],
      observations: [
        {
          id: "obs_1",
          sessionId: "ses_1",
          title: "Compressed observation",
        },
      ],
      triggerResult: {
        success: false,
        error: "provider unavailable",
      },
    });

    const response = await api.get("api::graph-build")({
      ...adminRequest,
      body: { project },
    });

    expect(response.status_code).toBe(503);
    expect(response.body).toMatchObject({
      success: false,
      retryable: true,
      batches: 1,
      batchesFailed: 1,
      failures: [
        {
          sessionId: "ses_1",
          batchIndex: 0,
          error: "provider unavailable",
        },
      ],
    });
  });
});
