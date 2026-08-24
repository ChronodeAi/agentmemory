import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockKV, mockSdk } from "./helpers/mocks.js";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const PROJECT = "github.com/example/repository";

async function setup() {
  vi.resetModules();
  const search = await import("../src/functions/search.js");
  const { registerRememberFunction } = await import(
    "../src/functions/remember.js"
  );
  const sdk = mockSdk({ looseTrigger: true });
  const kv = mockKV();
  registerRememberFunction(sdk as never, kv as never);
  return { sdk, kv, search };
}

describe("mem::remember supersession and recall hygiene", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("removes the superseded version from the search index", async () => {
    const { sdk, search } = await setup();
    const first = (await sdk.trigger("mem::remember", {
      content: "the deploy pipeline uses blue green rollout with health gates",
      type: "architecture",
      project: PROJECT,
    })) as { memory: { id: string } };
    const idx = search.getSearchIndex();
    expect(idx.has(first.memory.id)).toBe(true);

    const second = (await sdk.trigger("mem::remember", {
      content:
        "the deploy pipeline uses blue green rollout with health gates always",
      type: "architecture",
      project: PROJECT,
    })) as { memory: { id: string; supersedes: string[] } };

    expect(second.memory.supersedes).toContain(first.memory.id);
    expect(idx.has(first.memory.id)).toBe(false);
    expect(idx.has(second.memory.id)).toBe(true);
  });

  it("reports a close-but-below-threshold match as similarTo without superseding", async () => {
    const { sdk } = await setup();
    const first = (await sdk.trigger("mem::remember", {
      content: "redis cache layer fronting the primary database for hot reads",
      type: "architecture",
      project: PROJECT,
    })) as { memory: { id: string } };

    const second = (await sdk.trigger("mem::remember", {
      content:
        "redis cache layer fronting the primary database misses cold writes entirely",
      type: "architecture",
      project: PROJECT,
    })) as {
      memory: { id: string; version: number };
      similarTo?: { id: string; similarity: number };
    };

    expect(second.memory.version).toBe(1);
    expect(second.similarTo).toBeDefined();
    expect(second.similarTo!.id).toBe(first.memory.id);
    expect(second.similarTo!.similarity).toBeGreaterThan(0.4);
    expect(second.similarTo!.similarity).toBeLessThanOrEqual(0.7);
  });

  it("still finds the supersession target through index-backed candidates", async () => {
    const { sdk, kv, search } = await setup();
    for (let i = 0; i < 30; i++) {
      await sdk.trigger("mem::remember", {
        content: `unrelated filler memory number ${i} about topic-${i} with words w${i}a w${i}b`,
        type: "fact",
        project: PROJECT,
      });
    }
    const target = (await sdk.trigger("mem::remember", {
      content:
        "session tokens rotate every fifteen minutes via the auth broker",
      type: "workflow",
      project: PROJECT,
    })) as { memory: { id: string } };

    // A completed rebuild marks the memory corpus as covered, so the
    // next save resolves supersession candidates through the index.
    await search.rebuildIndex(kv);

    const update = (await sdk.trigger("mem::remember", {
      content:
        "session tokens rotate every fifteen minutes via the auth broker service",
      type: "workflow",
      project: PROJECT,
    })) as { memory: { supersedes: string[]; version: number } };

    expect(update.memory.supersedes).toContain(target.memory.id);
    expect(update.memory.version).toBe(2);
  });

  it("falls back to a full scan when the index is cold", async () => {
    const { sdk } = await setup();
    // No rebuild ran in this process: memoryIndexReady is false, so the
    // candidate lookup must use the KV list path and still supersede.
    const first = (await sdk.trigger("mem::remember", {
      content: "cron scheduler drifts under daylight saving transitions",
      type: "bug",
      project: PROJECT,
    })) as { memory: { id: string } };

    const second = (await sdk.trigger("mem::remember", {
      content: "cron scheduler drifts under daylight saving transitions badly",
      type: "bug",
      project: PROJECT,
    })) as { memory: { supersedes: string[] } };

    expect(second.memory.supersedes).toContain(first.memory.id);
  });
});
