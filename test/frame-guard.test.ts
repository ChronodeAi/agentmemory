import { describe, expect, it } from "vitest";
import { registerExportImportFunction } from "../src/functions/export-import.js";
import {
  SAFE_PAYLOAD_BYTES,
  checkPayloadFrameSize,
  payloadByteLength,
} from "../src/state/frame-guard.js";
import { KV } from "../src/state/schema.js";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, value);
      return value;
    },
    delete: async (scope: string, key: string) => store.get(scope)?.delete(key),
    list: async <T>(scope: string): Promise<T[]> =>
      [...(store.get(scope)?.values() ?? [])] as T[],
  };
}

function mockSdk() {
  const functions = new Map<string, Function>();
  return {
    registerFunction: (id: string, handler: Function) => functions.set(id, handler),
    registerTrigger: () => {},
    trigger: async (input: { function_id: string; payload?: unknown }) =>
      functions.get(input.function_id)?.(input.payload),
  };
}

describe("transport frame guard", () => {
  it("measures UTF-8 bytes and accepts bounded payloads", () => {
    expect(payloadByteLength({ value: "memory" })).toBe(
      Buffer.byteLength(JSON.stringify({ value: "memory" }), "utf8"),
    );
    expect(checkPayloadFrameSize({ value: "memory" }, "narrow it")).toBeNull();
  });

  it("returns a bounded error instead of the oversized export", async () => {
    const kv = mockKV();
    await kv.set(KV.memories, "mem_large", {
      id: "mem_large",
      type: "fact",
      title: "large",
      content: "z".repeat(SAFE_PAYLOAD_BYTES + 4096),
      concepts: [],
      files: [],
      sessionIds: [],
      strength: 5,
      version: 1,
      isLatest: true,
      createdAt: "2026-08-07T00:00:00.000Z",
      updatedAt: "2026-08-07T00:00:00.000Z",
    });
    const sdk = mockSdk();
    registerExportImportFunction(sdk as never, kv as never);

    const result = (await sdk.trigger({
      function_id: "mem::export",
      payload: {},
    })) as { oversized?: boolean; success?: boolean; bytes?: number };

    expect(result).toMatchObject({ oversized: true, success: false });
    expect(result.bytes).toBeGreaterThan(SAFE_PAYLOAD_BYTES);
    expect(payloadByteLength(result)).toBeLessThan(2048);
  });
});
