import type { ISdk } from "iii-sdk";
import type { EmbeddingProvider, Session } from "../types.js";
import { KV } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { isManagedImagePath } from "../utils/image-store.js";
import { recordAudit } from "./audit.js";
import { logger } from "../logger.js";
import {
  modelProcessingForProviderAttempt,
  providerProcessingLocation,
  type ProviderAttemptDecision,
  type ProviderProcessingLocation,
} from "./model-processing.js";

interface StoredEmbedding {
  imageRef: string;
  vector: number[];
  modelName: string;
  dimensions: number;
  updatedAt: string;
  project?: string;
  sessionId?: string;
  observationId?: string;
  processingLocation: ProviderProcessingLocation;
}

export function registerVisionSearchFunctions(
  sdk: ISdk,
  kv: StateKV,
  imageProvider: EmbeddingProvider | null,
  processingLocation?: ProviderProcessingLocation,
): void {
  const providerLocation = imageProvider
    ? processingLocation ?? providerProcessingLocation(imageProvider)
    : processingLocation;

  async function authorize(
    project: string,
    sessionId: string | undefined,
    purpose: string,
    dataClass: string,
    sourceProvenance: string,
  ): Promise<ProviderAttemptDecision | { policyDecision: "deny"; error: string }> {
    if (!imageProvider || !providerLocation) {
      return { policyDecision: "deny", error: "image embeddings disabled" };
    }
    const decision = await modelProcessingForProviderAttempt(kv, {
      project,
      sessionId,
      provider: imageProvider.name,
      purpose,
      dataClass,
      sourceProvenance,
      processingLocation: providerLocation,
    });
    return decision.allowed
      ? decision.attempt!
      : {
          ...decision.attempt!,
          policyDecision: "deny",
          error: decision.error ?? "provider processing denied",
        };
  }

  sdk.registerFunction(
    "mem::vision-embed",
    async (data: {
      imageRef: string;
      project?: string;
      sessionId?: string;
      observationId?: string;
    }) => {
      if (!imageProvider?.embedImage) {
        return { success: false, error: "image embeddings disabled (set AGENTMEMORY_IMAGE_EMBEDDINGS=true)" };
      }
      if (!data?.imageRef || typeof data.imageRef !== "string") {
        return { success: false, error: "imageRef required" };
      }
      if (!isManagedImagePath(data.imageRef)) {
        return { success: false, error: "imageRef must point to a file under the managed image store" };
      }
      const refCount = await kv.get<number>(KV.imageRefs, data.imageRef);
      if (!refCount || Number(refCount) < 1) {
        return { success: false, error: "imageRef not registered in mem:image-refs" };
      }
      const session = data.sessionId
        ? await kv.get<Session>(KV.sessions, data.sessionId).catch(() => null)
        : null;
      if (data.sessionId && !session) {
        return { success: false, error: "session_not_found" };
      }
      const project = data.project ?? session?.project;
      if (!project) {
        return { success: false, error: "project is required" };
      }
      if (session && session.project !== project) {
        return { success: false, error: "project scope does not match session" };
      }
      const processing = await authorize(
        project,
        data.sessionId,
        "vision_embedding",
        "managed_image_reference",
        data.observationId ? "observation_image" : "vision_embed_request",
      );
      if (processing.policyDecision === "deny") {
        return {
          success: false,
          error:
            "error" in processing
              ? processing.error
              : "provider processing denied",
          processing,
        };
      }
      try {
        const vec = await imageProvider.embedImage(data.imageRef);
        const stored: StoredEmbedding = {
          imageRef: data.imageRef,
          vector: Array.from(vec),
          modelName: imageProvider.name,
          dimensions: imageProvider.dimensions,
          updatedAt: new Date().toISOString(),
          project,
          sessionId: data.sessionId,
          observationId: data.observationId,
          processingLocation: processing.processingLocation,
        };
        await kv.set(KV.imageEmbeddings, data.imageRef, stored);
        await recordAudit(kv, "vision_embed", "mem::vision-embed", [data.imageRef], {
          modelName: imageProvider.name,
          dimensions: stored.dimensions,
          sessionId: data.sessionId,
          observationId: data.observationId,
          processing,
        });
        return {
          success: true,
          imageRef: data.imageRef,
          dimensions: stored.dimensions,
          processing,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn("vision-embed failed", { imageRef: data.imageRef, error: msg });
        return { success: false, error: msg };
      }
    },
  );

  sdk.registerFunction(
    "mem::vision-search",
    async (data: {
      queryText?: string;
      queryImageRef?: string;
      queryImageBase64?: string;
      topK?: number;
      project: string;
      sessionId?: string;
    }) => {
      if (!imageProvider?.embedImage) {
        return { success: false, error: "image embeddings disabled (set AGENTMEMORY_IMAGE_EMBEDDINGS=true)" };
      }
      if (!data?.project || typeof data.project !== "string") {
        return { success: false, error: "project is required" };
      }
      if (data.sessionId) {
        const session = await kv
          .get<Session>(KV.sessions, data.sessionId)
          .catch(() => null);
        if (!session) {
          return { success: false, error: "session_not_found" };
        }
        if (session.project !== data.project) {
          return { success: false, error: "project scope does not match session" };
        }
      }
      const requestedTopK =
        typeof data?.topK === "number" && Number.isFinite(data.topK)
          ? Math.trunc(data.topK)
          : 10;
      const topK = Math.min(50, Math.max(1, requestedTopK));

      let queryVec: Float32Array | null = null;
      try {
        if (data?.queryText) {
          const processing = await authorize(
            data.project,
            data.sessionId,
            "vision_query_embedding",
            "query_text",
            "vision_search_request",
          );
          if (processing.policyDecision === "deny") {
            return {
              success: false,
              error:
                "error" in processing
                  ? processing.error
                  : "provider processing denied",
              processing,
            };
          }
          queryVec = await imageProvider.embed(data.queryText);
        } else if (data?.queryImageBase64) {
          const processing = await authorize(
            data.project,
            data.sessionId,
            "vision_query_embedding",
            "image_base64",
            "vision_search_request",
          );
          if (processing.policyDecision === "deny") {
            return {
              success: false,
              error:
                "error" in processing
                  ? processing.error
                  : "provider processing denied",
              processing,
            };
          }
          const b64 = data.queryImageBase64.startsWith("data:")
            ? data.queryImageBase64
            : `data:image/png;base64,${data.queryImageBase64}`;
          queryVec = await imageProvider.embedImage(b64);
        } else if (data?.queryImageRef) {
          if (!isManagedImagePath(data.queryImageRef)) {
            return { success: false, error: "queryImageRef must point to a file under the managed image store" };
          }
          const refCount = await kv.get<number>(KV.imageRefs, data.queryImageRef);
          if (!refCount || Number(refCount) < 1) {
            return { success: false, error: "queryImageRef not registered in mem:image-refs" };
          }
          const processing = await authorize(
            data.project,
            data.sessionId,
            "vision_query_embedding",
            "managed_image_reference",
            "vision_search_request",
          );
          if (processing.policyDecision === "deny") {
            return {
              success: false,
              error:
                "error" in processing
                  ? processing.error
                  : "provider processing denied",
              processing,
            };
          }
          queryVec = await imageProvider.embedImage(data.queryImageRef);
        } else {
          return { success: false, error: "queryText, queryImageRef, or queryImageBase64 required" };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, error: `query embed failed: ${msg}` };
      }

      if (!queryVec) return { success: false, error: "failed to build query vector" };

      const stored = await kv.list<StoredEmbedding>(KV.imageEmbeddings);
      const projectStored = stored.filter((item) => item.project === data.project);
      const filtered = data.sessionId
        ? projectStored.filter((item) => item.sessionId === data.sessionId)
        : projectStored;

      const scored = filtered.map((s) => ({
        imageRef: s.imageRef,
        score: cosine(queryVec!, s.vector),
        sessionId: s.sessionId,
        observationId: s.observationId,
        updatedAt: s.updatedAt,
      }));
      scored.sort((a, b) => b.score - a.score);
      return { success: true, results: scored.slice(0, topK), total: scored.length };
    },
  );
}

function cosine(a: Float32Array, b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
