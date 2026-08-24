import { describe, it, expect } from "vitest";
import { InMemoryKV } from "../src/mcp/in-memory-kv.js";
import { KV } from "../src/state/schema.js";
import { registerMeshFunction } from "../src/functions/mesh.js";
import type { Memory } from "../src/types.js";
import { mockSdk } from "./helpers/mocks.js";

// Peer Memory upserts bypass every local capture surface. Records without
// an Origin must gain shared-channel provenance at receive time; records
// that already carry one keep it untouched.
function peerMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: "mem-peer-1",
    title: "Peer memory",
    content: "Synced from a mesh peer.",
    concepts: [],
    files: [],
    sessionIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    strength: 7,
    version: 1,
    isLatest: true,
    ...overrides,
  } as Memory;
}

describe("mesh receive origin stamping", () => {
  it("marks a peer record without origin with the shared channel", async () => {
    const kv = new InMemoryKV();
    const sdk = mockSdk();
    registerMeshFunction(sdk as never, kv as never, undefined);

    const result = (await sdk.trigger("mem::mesh-receive", {
      memories: [peerMemory()],
    })) as { success: boolean; accepted: number };

    expect(result).toMatchObject({ success: true, accepted: 1 });
    const stored = await kv.get<Memory>(KV.memories, "mem-peer-1");
    expect(stored?.origin?.channel).toBe("shared");
    expect(stored?.origin?.capturedAt).toBeTruthy();
    expect(Number.isNaN(new Date(stored!.origin!.capturedAt).getTime())).toBe(
      false,
    );
  });

  it("preserves an origin the peer already provided", async () => {
    const kv = new InMemoryKV();
    const sdk = mockSdk();
    registerMeshFunction(sdk as never, kv as never, undefined);
    const provided = {
      channel: "user" as const,
      detail: "typed by the operator",
      capturedAt: "2025-12-31T23:59:59.000Z",
    };

    await sdk.trigger("mem::mesh-receive", {
      memories: [peerMemory({ id: "mem-peer-2", origin: provided })],
    });

    const stored = await kv.get<Memory>(KV.memories, "mem-peer-2");
    expect(stored?.origin).toEqual(provided);
  });
});
