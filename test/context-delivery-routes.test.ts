import { describe, expect, it, vi } from "vitest";
import { registerMcpEndpoints } from "../src/mcp/server.js";
import { registerApiTriggers } from "../src/triggers/api.js";
import { getAllTools } from "../src/mcp/tools-registry.js";

type Handler = (request: unknown) => Promise<unknown>;

function registerSurfaces(
  register: (sdk: unknown, kv: unknown, secret?: string) => void,
) {
  const functions = new Map<string, Handler>();
  const triggers: Array<{
    function_id: string;
    config: {
      api_path: string;
      http_method: string;
      middleware_function_ids?: string[];
    };
  }> = [];
  const trigger = vi.fn(async () => ({ success: true, acknowledged: true }));
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
    registerTrigger: (entry: (typeof triggers)[number]) => {
      triggers.push(entry);
    },
    trigger,
  };
  const kv = {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
    list: async () => [],
  };

  register(sdk, kv, "synthetic-secret");
  return { functions, triggers, trigger };
}

describe("context delivery acknowledgement surfaces", () => {
  it("registers the authenticated REST route and whitelists its payload", async () => {
    const { functions, triggers, trigger } = registerSurfaces(
      registerApiTriggers as never,
    );
    const handler = functions.get("api::context-acknowledge");
    const route = triggers.find(
      (entry) => entry.function_id === "api::context-acknowledge",
    );

    expect(handler).toBeDefined();
    expect(route).toEqual({
      function_id: "api::context-acknowledge",
      type: "http",
      config: {
        api_path: "/agentmemory/context-acknowledge",
        http_method: "POST",
        middleware_function_ids: ["middleware::api-auth"],
      },
    });

    await handler!({
      body: {
        project: "github.com/chronodeai/agentmemory",
        sessionId: "session-1",
        packetId: "ctxpkt-1",
        providerReceipt: "provider-receipt-1",
        ignored: "must-not-pass-through",
      },
    });

    expect(trigger).toHaveBeenCalledWith({
      function_id: "mem::context-acknowledge",
      payload: {
        project: "github.com/chronodeai/agentmemory",
        sessionId: "session-1",
        packetId: "ctxpkt-1",
        providerReceipt: "provider-receipt-1",
      },
    });
  });

  it("exposes and dispatches the acknowledgement MCP tool", async () => {
    expect(
      getAllTools().find(
        (tool) => tool.name === "memory_context_acknowledge",
      )?.inputSchema.required,
    ).toEqual(["project", "sessionId", "packetId", "providerReceipt"]);

    const { functions, trigger } = registerSurfaces(
      registerMcpEndpoints as never,
    );
    const handler = functions.get("mcp::tools::call");
    const response = (await handler!({
      headers: { authorization: "Bearer synthetic-secret" },
      body: {
        name: "memory_context_acknowledge",
        arguments: {
          project: "github.com/chronodeai/agentmemory",
          sessionId: "session-1",
          packetId: "ctxpkt-1",
          providerReceipt: "provider-receipt-1",
        },
      },
    })) as { status_code: number };

    expect(response.status_code).toBe(200);
    expect(trigger).toHaveBeenCalledWith({
      function_id: "mem::context-acknowledge",
      payload: {
        project: "github.com/chronodeai/agentmemory",
        sessionId: "session-1",
        packetId: "ctxpkt-1",
        providerReceipt: "provider-receipt-1",
      },
    });
  });
});
