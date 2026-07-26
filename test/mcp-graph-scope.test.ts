import { describe, expect, it, vi } from "vitest";
import { createProjectCapabilityToken } from "../src/auth.js";
import { registerMcpEndpoints } from "../src/mcp/server.js";

const ADMIN_SECRET = "mcp-graph-admin-secret";
const CAPABILITY_SECRET = "mcp-graph-capability-secret";
const PROJECT = "github.com/example/project";

function setup() {
  const functions = new Map<string, Function>();
  const trigger = vi.fn(async () => ({ nodes: [], edges: [] }));
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Function,
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
    list: async () => [],
  };
  registerMcpEndpoints(
    sdk as never,
    kv as never,
    "legacy-secret",
    ADMIN_SECRET,
    CAPABILITY_SECRET,
    true,
  );
  return {
    call: functions.get("mcp::tools::call")!,
    trigger,
  };
}

function capabilityHeaders(project = PROJECT) {
  const token = createProjectCapabilityToken(
    {
      version: 1,
      audience: "agentmemory",
      project,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    },
    CAPABILITY_SECRET,
  );
  return { authorization: `Bearer ${token}` };
}

describe("memory_graph_query MCP scope", () => {
  it("propagates exact project scope", async () => {
    const { call, trigger } = setup();
    const response = await call({
      headers: capabilityHeaders(),
      body: {
        name: "memory_graph_query",
        arguments: { project: PROJECT, query: "adapter", limit: 5 },
      },
    });

    expect(response.status_code).toBe(200);
    expect(trigger).toHaveBeenCalledWith({
      function_id: "mem::graph-query",
      payload: {
        project: PROJECT,
        query: "adapter",
        limit: 5,
      },
    });
  });

  it("rejects omitted or conflicting scope", async () => {
    const { call, trigger } = setup();
    const headers = { authorization: `Bearer ${ADMIN_SECRET}` };

    expect(
      (
        await call({
          headers,
          body: { name: "memory_graph_query", arguments: {} },
        })
      ).status_code,
    ).toBe(400);
    expect(
      (
        await call({
          headers,
          body: {
            name: "memory_graph_query",
            arguments: { project: PROJECT, scope: "global" },
          },
        })
      ).status_code,
    ).toBe(400);
    expect(trigger).not.toHaveBeenCalled();
  });

  it("permits explicit global scope only with admin authorization", async () => {
    const projectClient = setup();
    const denied = await projectClient.call({
      headers: capabilityHeaders(),
      body: {
        name: "memory_graph_query",
        arguments: { scope: "global" },
      },
    });
    expect(denied.status_code).toBe(401);

    const adminClient = setup();
    const allowed = await adminClient.call({
      headers: { authorization: `Bearer ${ADMIN_SECRET}` },
      body: {
        name: "memory_graph_query",
        arguments: { scope: "global" },
      },
    });
    expect(allowed.status_code).toBe(200);
    expect(adminClient.trigger).toHaveBeenCalledWith({
      function_id: "mem::graph-query",
      payload: { scope: "global" },
    });
  });
});
