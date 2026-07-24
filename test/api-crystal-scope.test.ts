import { describe, expect, it, vi } from "vitest";
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

  registerApiTriggers(sdk as never, {} as never);
  const handler = functions.get("api::crystal-list");
  if (!handler) throw new Error("api::crystal-list was not registered");
  return { handler, trigger };
}

describe("GET /agentmemory/crystals scope", () => {
  it("passes explicit global scope to the crystal list function", async () => {
    const { handler, trigger } = registerCrystalApi();

    const response = (await handler({
      headers: {},
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
      headers: {},
      query_params: {},
    })) as { status_code: number; body: { error: string } };

    expect(response.status_code).toBe(400);
    expect(response.body.error).toContain("project is required");
    expect(trigger).not.toHaveBeenCalled();
  });
});
