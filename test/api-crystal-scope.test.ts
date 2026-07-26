import { describe, expect, it, vi } from "vitest";
import { registerMcpEndpoints } from "../src/mcp/server.js";
import { registerApiTriggers } from "../src/triggers/api.js";

function registerCrystalApi() {
  const functions = new Map<string, (request: unknown) => Promise<unknown>>();
  const trigger = vi.fn(async () => ({ success: true, crystals: [] }));
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: (request: unknown) => Promise<unknown>,
    ) => {
      const id =
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id;
      functions.set(id, handler);
    },
    registerTrigger: () => {},
    trigger,
  };

  registerApiTriggers(
    sdk as never,
    {} as never,
    "synthetic-secret",
    undefined,
    undefined,
    "admin-secret",
  );
  const handler = functions.get("api::crystal-list");
  if (!handler) throw new Error("api::crystal-list was not registered");
  return { handler, trigger };
}

describe("GET /agentmemory/crystals scope", () => {
  it("passes explicit global scope to the crystal list function", async () => {
    const { handler, trigger } = registerCrystalApi();

    const response = (await handler({
      headers: { authorization: "Bearer admin-secret" },
      query_params: { scope: "global" },
    })) as { status_code: number };

    expect(response.status_code).toBe(200);
    expect(trigger).toHaveBeenCalledWith({
      function_id: "mem::crystal-list",
      payload: {
        scope: "global",
        sessionId: undefined,
        limit: undefined,
      },
    });
  });

  it("still rejects an omitted project and scope", async () => {
    const { handler, trigger } = registerCrystalApi();

    const response = (await handler({
      headers: { authorization: "Bearer synthetic-secret" },
      query_params: {},
    })) as { status_code: number; body: { error: string } };

    expect(response.status_code).toBe(400);
    expect(response.body.error).toContain("project is required");
    expect(trigger).not.toHaveBeenCalled();
  });
});

type Handler = (request: unknown) => Promise<unknown>;

function registerSecuritySurfaces(
  register: (
    sdk: unknown,
    kv: unknown,
    secret?: string,
  ) => void,
  secret?: string,
  adminSecret?: string,
) {
  const functions = new Map<string, Handler>();
  const triggers: Array<{
    type: string;
    function_id: string;
    config: {
      api_path: string;
      http_method: string;
      middleware_function_ids?: string[];
    };
  }> = [];
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Handler,
    ) => {
      const id =
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id;
      functions.set(id, handler);
    },
    registerTrigger: (trigger: (typeof triggers)[number]) => {
      triggers.push(trigger);
    },
    trigger: vi.fn(async () => ({})),
  };
  const kv = {
    get: async () => undefined,
    set: async () => undefined,
    delete: async () => undefined,
    list: async () => [],
  };

  if (register === (registerApiTriggers as never)) {
    (registerApiTriggers as never)(
      sdk,
      kv,
      secret,
      undefined,
      undefined,
      adminSecret,
    );
  } else {
    (registerMcpEndpoints as never)(sdk, kv, secret, adminSecret);
  }
  return { functions, triggers };
}

describe("required service authentication", () => {
  it("makes protected REST middleware unavailable without a secret", async () => {
    const { functions } = registerSecuritySurfaces(
      registerApiTriggers as never,
    );
    const auth = functions.get("middleware::api-auth");

    expect(auth).toBeDefined();
    await expect(auth!({ request: { headers: {} } })).resolves.toEqual({
      action: "respond",
      response: {
        status_code: 503,
        body: { error: "authentication_unavailable" },
      },
    });
  });

  it("protects every REST route outside the exact health allowlist", () => {
    const { triggers } = registerSecuritySurfaces(
      registerApiTriggers as never,
      "synthetic-secret",
    );
    const publicRoutes = new Set([
      "GET /agentmemory/livez",
    ]);
    const missing = triggers
      .filter(
        (trigger) =>
          !publicRoutes.has(
            `${trigger.config.http_method} ${trigger.config.api_path}`,
          ),
      )
      .filter(
        (trigger) =>
          !trigger.config.middleware_function_ids?.includes(
            "middleware::api-auth",
          ),
      )
      .map(
        (trigger) =>
          `${trigger.config.http_method} ${trigger.config.api_path}`,
      );

    expect(missing).toEqual([]);
  });

  it("rejects missing and wrong REST credentials and accepts the configured secret", async () => {
    const { functions } = registerSecuritySurfaces(
      registerApiTriggers as never,
      "synthetic-secret",
    );
    const auth = functions.get("middleware::api-auth");

    expect(auth).toBeDefined();
    await expect(auth!({ request: { headers: {} } })).resolves.toMatchObject({
      action: "respond",
      response: { status_code: 401 },
    });
    await expect(
      auth!({
        request: { headers: { authorization: "Bearer wrong-secret" } },
      }),
    ).resolves.toMatchObject({
      action: "respond",
      response: { status_code: 401 },
    });
    await expect(
      auth!({
        request: { headers: { authorization: "Bearer synthetic-secret" } },
      }),
    ).resolves.toEqual({ action: "continue" });
  });

  it("requires the administrative credential for REST global scope", async () => {
    const { functions } = registerSecuritySurfaces(
      registerApiTriggers as never,
      "project-secret",
      "admin-secret",
    );
    const auth = functions.get("middleware::api-auth")!;
    const request = (authorization: string) => ({
      request: {
        headers: { authorization },
        body: { scope: "global" },
      },
    });

    await expect(
      auth(request("Bearer project-secret")),
    ).resolves.toMatchObject({
      action: "respond",
      response: { status_code: 401, body: { error: "global_unauthorized" } },
    });
    await expect(auth(request("Bearer admin-secret"))).resolves.toEqual({
      action: "continue",
    });
  });

  it("makes protected MCP endpoints unavailable without a secret", async () => {
    const { functions } = registerSecuritySurfaces(
      registerMcpEndpoints as never,
    );
    const listTools = functions.get("mcp::tools::list");

    expect(listTools).toBeDefined();
    await expect(listTools!({ headers: {} })).resolves.toEqual({
      status_code: 503,
      body: { error: "authentication_unavailable" },
    });
  });

  it("requires the administrative credential for MCP global scope", async () => {
    const { functions } = registerSecuritySurfaces(
      registerMcpEndpoints as never,
      "project-secret",
      "admin-secret",
    );
    const callTool = functions.get("mcp::tools::call")!;
    const request = (authorization: string) => ({
      headers: { authorization },
      body: {
        name: "memory_sessions",
        arguments: { scope: "global" },
      },
    });

    await expect(
      callTool(request("Bearer project-secret")),
    ).resolves.toMatchObject({
      status_code: 401,
      body: { error: "global_unauthorized" },
    });
    await expect(
      callTool(request("Bearer admin-secret")),
    ).resolves.toMatchObject({ status_code: 200 });
  });
});
