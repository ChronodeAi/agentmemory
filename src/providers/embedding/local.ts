import type { EmbeddingProvider } from "../../types.js";

type FeatureExtractor = (
  texts: string[],
  options: { pooling: string; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = "local";
  readonly processingLocation = "local" as const;
  readonly dimensions = 384;
  private extractor: FeatureExtractor | null = null;

  async embed(text: string): Promise<Float32Array> {
    const [result] = await this.embedBatch([text]);
    return result;
  }

  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(texts, {
      pooling: "mean",
      normalize: true,
    });
    return output.tolist().map((vector) => new Float32Array(vector));
  }

  private async getExtractor() {
    if (this.extractor) return this.extractor;

    let transformers: typeof import("@huggingface/transformers");
    try {
      transformers = await import("@huggingface/transformers");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ERR_MODULE_NOT_FOUND") {
        throw new Error(
          "Install @huggingface/transformers for local embeddings: npm install @huggingface/transformers",
        );
      }
      throw error;
    }

    this.extractor = (await transformers.pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2",
      { dtype: "q8" },
    )) as FeatureExtractor;
    return this.extractor;
  }
}
