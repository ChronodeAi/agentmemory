import { describe, expect, it, vi } from "vitest";
import type { ISdk } from "iii-sdk";
import { createStartupGate } from "../src/state/startup-gate.js";

describe("startup gate", () => {
  it("blocks registered handlers until canonical startup work completes", async () => {
    let wrappedHandler: ((data: unknown) => Promise<unknown>) | undefined;
    const raw = {
      registerFunction: vi.fn((_id, handler) => {
        wrappedHandler = handler;
        return { unregister: vi.fn() };
      }),
      trigger: vi.fn(),
    } as unknown as ISdk;
    const gate = createStartupGate(raw);
    const handler = vi.fn(async (data: unknown) => data);

    gate.sdk.registerFunction("mem::write", handler);
    const invocation = wrappedHandler!({ value: 1 });
    await Promise.resolve();

    expect(handler).not.toHaveBeenCalled();
    gate.open();
    await expect(invocation).resolves.toEqual({ value: 1 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not gate external HTTP invocation configuration", () => {
    const registerFunction = vi.fn(() => ({ unregister: vi.fn() }));
    const raw = { registerFunction } as unknown as ISdk;
    const gate = createStartupGate(raw);
    const config = { url: "http://127.0.0.1/internal", method: "POST" as const };

    gate.sdk.registerFunction("external", config);

    expect(registerFunction).toHaveBeenCalledWith("external", config, undefined);
  });
});
