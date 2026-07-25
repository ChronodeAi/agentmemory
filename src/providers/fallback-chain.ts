import type { MemoryProvider } from "../types.js";
import type { StateKV } from "../state/kv.js";
import {
  modelProcessingForProviderAttempt,
  providerProcessingLocation,
  type ProviderAttemptContext,
  type ProviderProcessingLocation,
} from "../functions/model-processing.js";

export interface FallbackProcessingContext {
  kv: StateKV;
  project: string;
  sessionId?: string;
  dataClass: string;
  sourceProvenance: string;
  providerLocations?: Record<string, ProviderProcessingLocation>;
}

export class FallbackChainProvider implements MemoryProvider {
  name: string;

  constructor(
    private providers: MemoryProvider[],
    private processingContext?: FallbackProcessingContext,
  ) {
    this.name = `fallback(${providers.map((p) => p.name).join(" -> ")})`;
  }

  async compress(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.tryAll(
      "compression",
      (p) => p.compress(systemPrompt, userPrompt),
    );
  }

  async summarize(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.tryAll(
      "summarization",
      (p) => p.summarize(systemPrompt, userPrompt),
    );
  }

  private async tryAll(
    purpose: string,
    fn: (p: MemoryProvider) => Promise<string>,
  ): Promise<string> {
    let lastError: Error | null = null;
    let policyError: Error | null = null;
    for (const provider of this.providers) {
      if (this.processingContext) {
        const attempt: ProviderAttemptContext = {
          project: this.processingContext.project,
          sessionId: this.processingContext.sessionId,
          provider: provider.name,
          purpose,
          dataClass: this.processingContext.dataClass,
          sourceProvenance: this.processingContext.sourceProvenance,
          processingLocation:
            this.processingContext.providerLocations?.[provider.name] ??
            providerProcessingLocation(provider),
        };
        const decision = await modelProcessingForProviderAttempt(
          this.processingContext.kv,
          attempt,
        );
        if (!decision.allowed) {
          policyError = new Error(decision.error);
          continue;
        }
      }
      try {
        return await fn(provider);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }
    throw lastError || policyError || new Error("No providers available");
  }
}
