import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveDimensions } from "../src/providers/embedding/_dimensions.js";
import { OpenAIEmbeddingProvider } from "../src/providers/embedding/openai.js";
import { OpenRouterEmbeddingProvider } from "../src/providers/embedding/openrouter.js";

describe("resolveDimensions", () => {
  const envName = "OPENROUTER_EMBEDDING_DIMENSIONS";

  it("resolves namespaced OpenRouter model ids to their real dimensions", () => {
    expect(resolveDimensions("openai/text-embedding-3-large", undefined, envName)).toBe(3072);
    expect(resolveDimensions("openai/text-embedding-3-small", undefined, envName)).toBe(1536);
    expect(resolveDimensions("openai/text-embedding-ada-002", undefined, envName)).toBe(1536);
  });

  it("resolves bare model ids to their real dimensions", () => {
    expect(resolveDimensions("text-embedding-3-large", undefined, envName)).toBe(3072);
    expect(resolveDimensions("text-embedding-3-small", undefined, envName)).toBe(1536);
    expect(resolveDimensions("text-embedding-ada-002", undefined, envName)).toBe(1536);
  });

  it("lets a valid override win over model-derived dimensions", () => {
    expect(resolveDimensions("openai/text-embedding-3-large", "1024", envName)).toBe(1024);
    expect(resolveDimensions("text-embedding-3-small", "768", envName)).toBe(768);
  });

  it("throws with the given env name on invalid override values", () => {
    for (const bad of ["abc", "0", "-5"]) {
      expect(() => resolveDimensions("text-embedding-3-large", bad, envName)).toThrow(
        new RegExp(`${envName} must be a positive integer, got: ${bad}`),
      );
    }
  });

  it("falls back to 1536 for unknown models", () => {
    expect(resolveDimensions("mystery-self-hosted-model", undefined, envName)).toBe(1536);
    expect(resolveDimensions("someprovider/unknown-model", undefined, envName)).toBe(1536);
  });
});

describe("OpenRouterEmbeddingProvider dimensions", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["OPENROUTER_EMBEDDING_MODEL"] = "";
    process.env["OPENROUTER_EMBEDDING_DIMENSIONS"] = "";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reports 3072 for openai/text-embedding-3-large with no override", () => {
    process.env["OPENROUTER_EMBEDDING_MODEL"] = "openai/text-embedding-3-large";
    const provider = new OpenRouterEmbeddingProvider("test-key");
    expect(provider.dimensions).toBe(3072);
  });

  it("defaults to 1536 for openai/text-embedding-3-small", () => {
    const provider = new OpenRouterEmbeddingProvider("test-key");
    expect(provider.dimensions).toBe(1536);
  });

  it("lets OPENROUTER_EMBEDDING_DIMENSIONS override model-derived dimensions", () => {
    process.env["OPENROUTER_EMBEDDING_MODEL"] = "openai/text-embedding-3-large";
    process.env["OPENROUTER_EMBEDDING_DIMENSIONS"] = "1024";
    const provider = new OpenRouterEmbeddingProvider("test-key");
    expect(provider.dimensions).toBe(1024);
  });
});

describe("OpenAIEmbeddingProvider dimensions", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env["OPENAI_EMBEDDING_MODEL"] = "";
    process.env["OPENAI_EMBEDDING_DIMENSIONS"] = "";
    process.env["OPENAI_BASE_URL"] = "";
    process.env["OPENAI_EMBEDDING_BASE_URL"] = "";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to 1536 for text-embedding-3-small", () => {
    const provider = new OpenAIEmbeddingProvider("test-key");
    expect(provider.dimensions).toBe(1536);
  });

  it("reports 3072 for text-embedding-3-large", () => {
    process.env["OPENAI_EMBEDDING_MODEL"] = "text-embedding-3-large";
    const provider = new OpenAIEmbeddingProvider("test-key");
    expect(provider.dimensions).toBe(3072);
  });

  it("keeps default OpenAI embeddings marked as external processing", () => {
    const provider = new OpenAIEmbeddingProvider("test-key");
    expect(provider.processingLocation).toBe("external");
  });

  it("keeps loopback OpenAI-compatible embeddings marked as local processing", () => {
    process.env["OPENAI_EMBEDDING_BASE_URL"] = "http://localhost:1234/v1";
    const provider = new OpenAIEmbeddingProvider("test-key");
    expect(provider.processingLocation).toBe("local");
  });
});
