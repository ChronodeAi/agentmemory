import { describe, expect, it, vi } from "vitest";
import { registerMcpEndpoints } from "../src/mcp/server.js";
import { registerApiTriggers } from "../src/triggers/api.js";
import { getAllTools } from "../src/mcp/tools-registry.js";
import {
  createProjectCapabilityToken,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../src/auth.js";
import {
  API_CONTRACT_VERSION,
  BACKEND_BUILD_ID,
  VIEWER_BUILD_ID,
} from "../src/version.js";

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
  it("binds REST project requests to capabilities and global requests to admins", async () => {
    const { functions } = registerSurfaces(
      ((sdk: unknown, kv: unknown) =>
        registerApiTriggers(
          sdk as never,
          kv as never,
          "legacy-secret",
          undefined,
          undefined,
          "admin-secret",
          "capability-secret",
          true,
          "agentmemory",
        )) as never,
    );
    const middleware = functions.get("middleware::api-auth")!;
    const capability = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project: "project-a",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      "capability-secret",
    );
    const headers = {
      authorization: `Bearer ${capability}`,
      [PROJECT_CAPABILITY_PROJECT_HEADER]: "project-a",
    };

    await expect(
      middleware({ request: { headers } }),
    ).resolves.toEqual({ action: "continue" });
    await expect(
      middleware({ request: { headers, body: { project: "project-b" } } }),
    ).resolves.toMatchObject({
      action: "respond",
      response: {
        status_code: 401,
        body: { error: "project_binding_mismatch" },
      },
    });
    await expect(
      middleware({
        request: { headers, query_params: { scope: "global" } },
      }),
    ).resolves.toMatchObject({
      action: "respond",
      response: {
        status_code: 401,
        body: { error: "global_unauthorized" },
      },
    });
    await expect(
      middleware({
        request: {
          headers: { authorization: "Bearer admin-secret" },
          query_params: { scope: "global" },
        },
      }),
    ).resolves.toEqual({ action: "continue" });

    const projectHandler = functions.get("api::patterns")!;
    await expect(
      projectHandler({
        headers,
        body: { project: "project-a" },
      }),
    ).resolves.toMatchObject({
      status_code: 200,
      body: { success: true },
    });
  });

  it("reserves migration for administrators and preserves rollback semantics", async () => {
    const { functions, trigger } = registerSurfaces(
      ((sdk: unknown, kv: unknown) =>
        registerApiTriggers(
          sdk as never,
          kv as never,
          "legacy-secret",
          undefined,
          undefined,
          "admin-secret",
          "capability-secret",
          true,
          "agentmemory",
        )) as never,
    );
    const migrate = functions.get("api::migrate")!;
    const capability = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project: "project-a",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      "capability-secret",
    );

    await expect(
      migrate({
        headers: { authorization: `Bearer ${capability}` },
        body: { dbPath: "/tmp/source.sqlite", action: "rollback" },
      }),
    ).resolves.toMatchObject({ status_code: 401 });
    await expect(
      migrate({
        headers: { authorization: "Bearer admin-secret" },
        body: { dbPath: "/tmp/source.sqlite", action: "invalid" },
      }),
    ).resolves.toMatchObject({ status_code: 400 });

    trigger.mockResolvedValueOnce({
      success: false,
      status: "rolled-back",
      rollback: { success: true },
    });
    await expect(
      migrate({
        headers: { authorization: "Bearer admin-secret" },
        body: { dbPath: "/tmp/source.sqlite", action: "rollback" },
      }),
    ).resolves.toMatchObject({
      status_code: 200,
      body: { operationSucceeded: true },
    });
    expect(trigger).toHaveBeenLastCalledWith({
      function_id: "mem::migrate",
      payload: {
        dbPath: "/tmp/source.sqlite",
        action: "rollback",
      },
    });

    trigger.mockResolvedValueOnce({
      success: false,
      status: "rollback-incomplete",
      error: "rollback incomplete",
      rollback: { success: false },
    });
    await expect(
      migrate({
        headers: { authorization: "Bearer admin-secret" },
        body: { dbPath: "/tmp/source.sqlite", action: "rollback" },
      }),
    ).resolves.toMatchObject({
      status_code: 503,
      body: { operationSucceeded: false },
    });
  });

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

  it("maps REST capture and acknowledgement rejection to non-success status", async () => {
    const { functions, trigger } = registerSurfaces(
      registerApiTriggers as never,
    );
    const observe = functions.get("api::observe")!;
    trigger.mockResolvedValueOnce({
      success: false,
      retryable: true,
      error: "capture_capacity_exceeded",
    });
    const observeResponse = (await observe({
      body: {
        hookType: "post_tool_use",
        sessionId: "session-1",
        project: "github.com/chronodeai/agentmemory",
        cwd: "/tmp/project",
        timestamp: new Date().toISOString(),
      },
    })) as { status_code: number; body: { success?: boolean } };
    expect(observeResponse).toMatchObject({
      status_code: 429,
      body: { success: false },
    });

    const acknowledge = functions.get("api::context-acknowledge")!;
    trigger.mockResolvedValueOnce({
      success: false,
      acknowledged: false,
      error:
        "trusted provider delivery verification is unavailable; source suppression denied",
    });
    const acknowledgementResponse = (await acknowledge({
      body: {
        project: "github.com/chronodeai/agentmemory",
        sessionId: "session-1",
        packetId: "ctxpkt-1",
        providerReceipt: "receipt-1",
      },
    })) as { status_code: number; body: { success?: boolean } };
    expect(acknowledgementResponse).toMatchObject({
      status_code: 503,
      body: { success: false },
    });
  });

  it("reports build identity and typed component health", async () => {
    const { functions } = registerSurfaces(
      registerApiTriggers as never,
    );
    const response = (await functions.get("api::health")!({})) as {
      status_code: number;
      body: {
        status: string;
        build: {
          backend: string;
          viewer: string;
          apiContract: number;
        };
        components: {
          backend: { status: string };
          slots: { status: string };
          viewer: { status: string };
        };
      };
    };

    expect(response.status_code).toBe(503);
    expect(response.body.status).toBe("critical");
    expect(response.body.build.backend).toBe(BACKEND_BUILD_ID);
    expect(response.body.build.viewer).toBe(VIEWER_BUILD_ID);
    expect(response.body.build.apiContract).toBe(API_CONTRACT_VERSION);
    expect(response.body.components.backend.status).toBe("critical");
    expect(response.body.components.slots.status).toBe("error");
    expect(["unavailable", "error", "ok"]).toContain(
      response.body.components.viewer.status,
    );
  });

  it("exposes and dispatches the acknowledgement MCP tool", async () => {
    expect(
      getAllTools().find(
        (tool) => tool.name === "memory_context_acknowledge",
      )?.inputSchema.required,
    ).toEqual(["project", "sessionId", "packetId", "providerReceipt"]);

    const { functions, trigger } = registerSurfaces(
      ((sdk: unknown, kv: unknown) =>
        registerMcpEndpoints(
          sdk as never,
          kv as never,
          "synthetic-secret",
          "admin-secret",
          "capability-secret",
          true,
          "agentmemory",
        )) as never,
    );
    const handler = functions.get("mcp::tools::call");
    const capability = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project: "github.com/chronodeai/agentmemory",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      "capability-secret",
    );
    const response = (await handler!({
      headers: { authorization: `Bearer ${capability}` },
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

  it("returns MCP error semantics when acknowledgement is rejected", async () => {
    const { functions, trigger } = registerSurfaces(
      ((sdk: unknown, kv: unknown) =>
        registerMcpEndpoints(
          sdk as never,
          kv as never,
          undefined,
          undefined,
          "capability-secret",
          true,
          "agentmemory",
        )) as never,
    );
    trigger.mockResolvedValueOnce({
      success: false,
      acknowledged: false,
      error: "invalid context acknowledgement",
    });
    const project = "github.com/chronodeai/agentmemory";
    const capability = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project,
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      "capability-secret",
    );
    const handler = functions.get("mcp::tools::call");
    const response = (await handler!({
      headers: { authorization: `Bearer ${capability}` },
      body: {
        name: "memory_context_acknowledge",
        arguments: {
          project,
          sessionId: "session-1",
          packetId: "ctxpkt-1",
          providerReceipt: "invalid-receipt",
        },
      },
    })) as {
      status_code: number;
      body: { isError?: boolean; content?: unknown[] };
    };

    expect(response.status_code).toBe(400);
    expect(response.body.isError).toBe(true);
    expect(response.body.content).toHaveLength(1);
  });

  it("binds MCP data access to the capability project and reserves global reads for admins", async () => {
    const { functions } = registerSurfaces(
      ((sdk: unknown, kv: unknown) =>
        registerMcpEndpoints(
          sdk as never,
          kv as never,
          undefined,
          "admin-secret",
          "capability-secret",
          true,
          "agentmemory",
        )) as never,
    );
    const capability = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project: "project-a",
        expiresAt: Math.floor(Date.now() / 1000) + 60,
      },
      "capability-secret",
    );
    const headers = { authorization: `Bearer ${capability}` };

    const toolResponse = (await functions.get("mcp::tools::call")!({
      headers,
      body: {
        name: "memory_context_acknowledge",
        arguments: {
          project: "project-b",
          sessionId: "session-1",
          packetId: "ctxpkt-1",
          providerReceipt: "provider-receipt-1",
        },
      },
    })) as { status_code: number; body: { error?: string } };
    expect(toolResponse).toMatchObject({
      status_code: 401,
      body: { error: "capability_wrong_project" },
    });

    const projectResourceResponse = (await functions.get(
      "mcp::resources::read",
    )!({
      headers,
      body: { uri: "agentmemory://project/project-b/profile" },
    })) as { status_code: number; body: { error?: string } };
    expect(projectResourceResponse).toMatchObject({
      status_code: 401,
      body: { error: "capability_wrong_project" },
    });

    const globalResourceResponse = (await functions.get(
      "mcp::resources::read",
    )!({
      headers,
      body: { uri: "agentmemory://memories/latest" },
    })) as { status_code: number; body: { error?: string } };
    expect(globalResourceResponse).toMatchObject({
      status_code: 401,
      body: { error: "global_unauthorized" },
    });

    const promptResponse = (await functions.get("mcp::prompts::get")!({
      headers,
      body: {
        name: "detect_patterns",
        arguments: { project: "project-b" },
      },
    })) as { status_code: number; body: { error?: string } };
    expect(promptResponse).toMatchObject({
      status_code: 401,
      body: { error: "capability_wrong_project" },
    });
  });
});
