import { afterEach, describe, it, expect, vi } from "vitest";

vi.mock("@huggingface/transformers", () => {
  throw new Error("not installed");
});

import { rerank, isRerankerAvailable } from "../src/state/reranker.js";

describe("reranker", () => {
  it("returns results unchanged when @huggingface/transformers is unavailable", async () => {
    const results = [
      {
        observation: {
          id: "o1",
          title: "First",
          narrative: "First result",
        },
        bm25Score: 0.5,
        vectorScore: 0.6,
        graphScore: 0,
        combinedScore: 0.8,
        sessionId: "s1",
      },
      {
        observation: {
          id: "o2",
          title: "Second",
          narrative: "Second result",
        },
        bm25Score: 0.3,
        vectorScore: 0.4,
        graphScore: 0,
        combinedScore: 0.5,
        sessionId: "s1",
      },
    ] as any;

    const reranked = await rerank("test query", results);
    expect(reranked).toEqual(results);
  });

  it("isRerankerAvailable returns false when not loaded", () => {
    expect(isRerankerAvailable()).toBe(false);
  });

  it("handles single result gracefully", async () => {
    const results = [
      {
        observation: { id: "o1", title: "Only" },
        combinedScore: 1.0,
      },
    ] as any;

    const reranked = await rerank("query", results);
    expect(reranked).toHaveLength(1);
  });

  it("handles empty results", async () => {
    const reranked = await rerank("query", []);
    expect(reranked).toHaveLength(0);
  });
});

describe("reranker with loaded pipeline", () => {
  afterEach(() => {
    vi.doUnmock("@huggingface/transformers");
    vi.resetModules();
  });

  it("loads the q8 pipeline and reorders by its score", async () => {
    const classifier = vi.fn(async (text: string) => [
      { score: text.includes("First") ? 0.9 : 0.1 },
    ]);
    const pipeline = vi.fn(async () => classifier);
    vi.doMock("@huggingface/transformers", () => ({ pipeline }));
    vi.resetModules();
    const { rerank: freshRerank } = await import("../src/state/reranker.js");

    const results = [
      { observation: { id: "o2", title: "Second", narrative: "" }, combinedScore: 0.9 },
      { observation: { id: "o1", title: "First", narrative: "" }, combinedScore: 0.5 },
    ] as any;
    const reranked = await freshRerank("query", results);

    expect(pipeline).toHaveBeenCalledWith(
      "text-classification",
      "Xenova/ms-marco-MiniLM-L-6-v2",
      { dtype: "q8" },
    );
    expect(reranked[0].observation.id).toBe("o1");
  });
});
