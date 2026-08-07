import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@huggingface/transformers");
  vi.resetModules();
});

describe("LocalEmbeddingProvider", () => {
  it("gives a clear install hint when the optional package is missing", async () => {
    vi.doMock("@huggingface/transformers");
    vi.resetModules();
    const { LocalEmbeddingProvider } = await import(
      "../src/providers/embedding/local.js"
    );
    await expect(new LocalEmbeddingProvider().embed("hello")).rejects.toThrow(
      "Install @huggingface/transformers for local embeddings",
    );
  });

  it("uses q8 and maps extractor output to local vectors", async () => {
    const extractor = vi.fn(async (texts: string[]) => ({
      tolist: () => texts.map(() => [0.1, 0.2, 0.3]),
    }));
    const pipeline = vi.fn(async () => extractor);
    vi.doMock("@huggingface/transformers", () => ({ pipeline }));
    vi.resetModules();
    const { LocalEmbeddingProvider } = await import(
      "../src/providers/embedding/local.js"
    );

    const provider = new LocalEmbeddingProvider();
    const vectors = await provider.embedBatch(["a", "b"]);
    expect(provider.processingLocation).toBe("local");
    expect(pipeline).toHaveBeenCalledWith(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8" },
    );
    expect(extractor).toHaveBeenCalledWith(["a", "b"], {
      pooling: "mean",
      normalize: true,
    });
    expect(vectors).toEqual([
      new Float32Array([0.1, 0.2, 0.3]),
      new Float32Array([0.1, 0.2, 0.3]),
    ]);
  });
});
