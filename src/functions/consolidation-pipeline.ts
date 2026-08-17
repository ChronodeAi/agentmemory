import type { ISdk } from "iii-sdk";
import { createHash } from "node:crypto";
import type {
  SemanticMemory,
  ProceduralMemory,
  SessionSummary,
  Session,
  Memory,
  MemoryProvider,
} from "../types.js";
import { KV, generateId } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import {
  SEMANTIC_MERGE_SYSTEM,
  buildSemanticMergePrompt,
  PROCEDURAL_EXTRACTION_SYSTEM,
  buildProceduralExtractionPrompt,
} from "../prompts/consolidation.js";
import { recordAudit } from "./audit.js";
import {
  getConsolidationDecayDays,
  getEnvVar,
  isConsolidationEnabled,
} from "../config.js";
import { logger } from "../logger.js";
import {
  recordMatchesProject,
  requireProjectReadScope,
} from "../project-scope.js";

const SEMANTIC_FACT_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "been",
  "being",
  "for",
  "from",
  "in",
  "include",
  "includes",
  "including",
  "involve",
  "involves",
  "involving",
  "is",
  "it",
  "its",
  "of",
  "on",
  "project",
  "provider",
  "providers",
  "specifically",
  "system",
  "that",
  "the",
  "this",
  "to",
  "use",
  "used",
  "uses",
  "using",
  "utilize",
  "utilized",
  "utilizes",
  "with",
]);

const SEMANTIC_TOKEN_ALIASES: Record<string, string> = {
  audits: "audit",
  commands: "command",
  dimensions: "dimension",
  embeddings: "embedding",
  facts: "fact",
  integrations: "integration",
  methods: "method",
  services: "service",
  tests: "test",
  vectors: "vector",
};

function semanticFactTokens(value: string): Set<string> {
  const raw = value.toLowerCase().match(/[a-z0-9]+(?:[.-][a-z0-9]+)*/g) ?? [];
  return new Set(
    raw
      .map((token) => SEMANTIC_TOKEN_ALIASES[token] ?? token)
      .filter(
        (token) =>
          token.length > 1 && !SEMANTIC_FACT_STOP_WORDS.has(token),
      ),
  );
}

function semanticFactsMatch(a: string, b: string): boolean {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const aTokens = semanticFactTokens(a);
  const bTokens = semanticFactTokens(b);
  const smaller = Math.min(aTokens.size, bTokens.size);
  if (smaller < 2) return false;
  let shared = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) shared++;
  }
  const union = aTokens.size + bTokens.size - shared;
  return shared / union >= 0.68 || shared / smaller >= 0.8;
}

function semanticBatchFingerprint(summaries: SessionSummary[]): string {
  const payload = summaries
    .map((summary) => ({
      sessionId: summary.sessionId,
      createdAt: summary.createdAt,
      title: summary.title,
      narrative: summary.narrative,
      concepts: summary.concepts,
    }))
    .sort(
      (a, b) =>
        a.sessionId.localeCompare(b.sessionId) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function collapseSemanticDuplicates(
  kv: StateKV,
  memories: SemanticMemory[],
): Promise<{ active: SemanticMemory[]; superseded: number }> {
  const candidates = memories
    .filter((memory) => !memory.supersededBy)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        semanticFactTokens(b.fact).size - semanticFactTokens(a.fact).size ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const active: SemanticMemory[] = [];
  let superseded = 0;
  for (const memory of candidates) {
    const canonical = active.find((item) =>
      semanticFactsMatch(item.fact, memory.fact),
    );
    if (!canonical) {
      active.push(memory);
      continue;
    }
    const now = new Date().toISOString();
    canonical.confidence = Math.max(canonical.confidence, memory.confidence);
    canonical.strength = Math.max(canonical.strength, memory.strength);
    canonical.accessCount += memory.accessCount;
    canonical.sourceSessionIds = [
      ...new Set([...canonical.sourceSessionIds, ...memory.sourceSessionIds]),
    ];
    canonical.sourceMemoryIds = [
      ...new Set([...canonical.sourceMemoryIds, ...memory.sourceMemoryIds]),
    ];
    canonical.lastAccessedAt = now;
    canonical.updatedAt = now;
    memory.supersededBy = canonical.id;
    memory.supersededAt = now;
    memory.updatedAt = now;
    await kv.set(KV.semantic, canonical.id, canonical);
    await kv.set(KV.semantic, memory.id, memory);
    superseded++;
  }
  return { active, superseded };
}

function applyDecay(
  items: Array<{
    strength: number;
    lastAccessedAt?: string;
    updatedAt: string;
  }>,
  decayDays: number,
): void {
  if (decayDays <= 0 || !Number.isFinite(decayDays)) return;
  const now = Date.now();
  for (const item of items) {
    const lastAccess = item.lastAccessedAt || item.updatedAt;
    const daysSince =
      (now - new Date(lastAccess).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > decayDays) {
      const decayPeriods = Math.floor(daysSince / decayDays);
      item.strength = Math.max(
        0.1,
        item.strength * Math.pow(0.9, decayPeriods),
      );
    }
  }
}

export function registerConsolidationPipelineFunction(
  sdk: ISdk,
  kv: StateKV,
  provider: MemoryProvider,
): void {
  sdk.registerFunction("mem::consolidate-pipeline", 
    async (data?: {
      tier?: string;
      force?: boolean;
      project?: string;
      scope?: "project" | "global";
    }) => {
      const projectScope = requireProjectReadScope(
        data,
        "mem::consolidate-pipeline",
      );
      const project =
        projectScope.kind === "project" ? projectScope.project : undefined;
      if (!data?.force && !isConsolidationEnabled()) {
        return { success: false, skipped: true, reason: "Consolidation disabled: set CONSOLIDATION_ENABLED=true or configure an LLM provider (ANTHROPIC_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY / GEMINI_API_KEY / GOOGLE_API_KEY / MINIMAX_API_KEY / OPENAI_BASE_URL / AGENTMEMORY_PROVIDER=agent-sdk)" };
      }
      if (getEnvVar("AGENTMEMORY_LOCAL_PROCESSING") !== "true") {
        const scopedSessions = (await kv.list<Session>(KV.sessions)).filter(
          (session) => recordMatchesProject(session.project, projectScope),
        );
        if (
          scopedSessions.some(
            (session) =>
              session.privacy === "strict" ||
              session.externalProcessing === false,
          )
        ) {
          return {
            success: false,
            error:
              "external_processing_disabled_for_strict_project; configure a local provider and AGENTMEMORY_LOCAL_PROCESSING=true",
          };
        }
      }
      const tier = data?.tier || "all";
      const decayDays = getConsolidationDecayDays();
      const results: Record<string, unknown> = {};

      if (tier === "all" || tier === "semantic") {
        const summaries = (await kv.list<SessionSummary>(KV.summaries)).filter(
          (summary) => recordMatchesProject(summary.project, projectScope),
        );
        const existingSemantic = (
          await kv.list<SemanticMemory>(KV.semantic)
        ).filter((memory) =>
          recordMatchesProject(memory.project, projectScope),
        );
        const collapsedSemantic = await collapseSemanticDuplicates(
          kv,
          existingSemantic,
        );
        const activeSemantic = collapsedSemantic.active;

        if (summaries.length >= 5) {
          const recentSummaries = summaries
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 20);
          const sourceFingerprint = semanticBatchFingerprint(recentSummaries);
          if (
            activeSemantic.some(
              (memory) => memory.sourceFingerprint === sourceFingerprint,
            )
          ) {
            results.semantic = {
              skipped: true,
              reason: "summary batch already consolidated",
              newFacts: 0,
              reinforcedFacts: 0,
              duplicatesSuperseded: collapsedSemantic.superseded,
              totalSummaries: summaries.length,
            };
          } else {
            const prompt = buildSemanticMergePrompt(
              recentSummaries.map((s) => ({
                title: s.title,
                narrative: s.narrative,
                concepts: s.concepts,
              })),
            );

            try {
              const response = await provider.summarize(
                SEMANTIC_MERGE_SYSTEM,
                prompt,
              );

              const factRegex = /<fact\s+confidence="([^"]+)">([^<]+)<\/fact>/g;
              let match;
              let newFacts = 0;
              let reinforcedFacts = 0;
              let lowConfidenceFactsSkipped = 0;
              const now = new Date().toISOString();
              const sourceSessionIds = recentSummaries.map(
                (summary) => summary.sessionId,
              );

              while ((match = factRegex.exec(response)) !== null) {
                const parsedConf = parseFloat(match[1]);
                const confidence = Number.isNaN(parsedConf)
                  ? 0.5
                  : Math.min(1, Math.max(0, parsedConf));
                const fact = match[2].trim();
                if (!fact) continue;
                if (confidence < 0.5) {
                  lowConfidenceFactsSkipped++;
                  continue;
                }

                const existing = activeSemantic.find((memory) =>
                  semanticFactsMatch(memory.fact, fact),
                );
                if (existing) {
                  if (
                    semanticFactTokens(fact).size >
                      semanticFactTokens(existing.fact).size &&
                    confidence >= existing.confidence - 0.1
                  ) {
                    existing.fact = fact;
                  }
                  existing.accessCount++;
                  existing.lastAccessedAt = now;
                  existing.updatedAt = now;
                  existing.confidence = Math.max(
                    existing.confidence,
                    confidence,
                  );
                  existing.strength = Math.max(existing.strength, confidence);
                  existing.sourceFingerprint = sourceFingerprint;
                  existing.sourceSessionIds = [
                    ...new Set([
                      ...existing.sourceSessionIds,
                      ...sourceSessionIds,
                    ]),
                  ];
                  await kv.set(KV.semantic, existing.id, existing);
                  reinforcedFacts++;
                } else {
                  const sem: SemanticMemory = {
                    id: generateId("sem"),
                    project,
                    fact,
                    confidence,
                    sourceFingerprint,
                    sourceSessionIds,
                    sourceMemoryIds: [],
                    accessCount: 1,
                    lastAccessedAt: now,
                    strength: confidence,
                    createdAt: now,
                    updatedAt: now,
                  };
                  await kv.set(KV.semantic, sem.id, sem);
                  activeSemantic.push(sem);
                  newFacts++;
                }
              }
              results.semantic = {
                newFacts,
                reinforcedFacts,
                lowConfidenceFactsSkipped,
                duplicatesSuperseded: collapsedSemantic.superseded,
                totalSummaries: summaries.length,
                sourceFingerprint,
              };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              logger.error("Semantic consolidation failed", { error: msg });
              results.semantic = {
                error: msg,
                duplicatesSuperseded: collapsedSemantic.superseded,
              };
            }
          }
        } else {
          results.semantic = {
            skipped: true,
            reason: "fewer than 5 summaries",
            duplicatesSuperseded: collapsedSemantic.superseded,
          };
        }
      }

      if (tier === "all" || tier === "reflect") {
        try {
          const reflectResult = await sdk.trigger({ function_id: "mem::reflect", payload: {
            maxClusters: 10,
            project,
            scope: projectScope.kind,
          } });
          results.reflect = reflectResult;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn("Reflect tier failed", { error: msg });
          results.reflect = { error: msg };
        }
      }

      if (tier === "all" || tier === "procedural") {
        const memories = (await kv.list<Memory>(KV.memories)).filter(
          (memory) => recordMatchesProject(memory.project, projectScope),
        );
        const patterns = memories
          .filter((m) => m.isLatest && m.type === "pattern")
          .map((m) => ({
            content: m.content,
            frequency: m.sessionIds.length || 1,
          }))
          .filter((p) => p.frequency >= 2);

        if (patterns.length >= 2) {
          const prompt = buildProceduralExtractionPrompt(patterns);

          try {
            const response = await provider.summarize(
              PROCEDURAL_EXTRACTION_SYSTEM,
              prompt,
            );

            const procRegex =
              /<procedure\s+name="([^"]+)"\s+trigger="([^"]+)">([\s\S]*?)<\/procedure>/g;
            let match;
            let newProcs = 0;
            const now = new Date().toISOString();
            const existingProcs = (
              await kv.list<ProceduralMemory>(KV.procedural)
            ).filter((memory) =>
              recordMatchesProject(memory.project, projectScope),
            );

            while ((match = procRegex.exec(response)) !== null) {
              const name = match[1];
              const trigger = match[2];
              const stepsBlock = match[3];
              const steps: string[] = [];

              const stepRegex = /<step>([^<]+)<\/step>/g;
              let stepMatch;
              while ((stepMatch = stepRegex.exec(stepsBlock)) !== null) {
                steps.push(stepMatch[1].trim());
              }

              const existing = existingProcs.find(
                (p) => p.name.toLowerCase() === name.toLowerCase(),
              );
              if (existing) {
                existing.frequency++;
                existing.updatedAt = now;
                existing.strength = Math.min(1, existing.strength + 0.1);
                await kv.set(KV.procedural, existing.id, existing);
              } else {
                const proc: ProceduralMemory = {
                  id: generateId("proc"),
                  project,
                  name,
                  steps,
                  triggerCondition: trigger,
                  frequency: 1,
                  sourceSessionIds: [],
                  strength: 0.5,
                  createdAt: now,
                  updatedAt: now,
                };
                await kv.set(KV.procedural, proc.id, proc);
                newProcs++;
              }
            }
            results.procedural = {
              newProcedures: newProcs,
              patternsAnalyzed: patterns.length,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error("Procedural extraction failed", { error: msg });
            results.procedural = { error: msg };
          }
        } else {
          results.procedural = {
            skipped: true,
            reason: "fewer than 2 recurring patterns",
          };
        }
      }

      if (tier === "all" || tier === "decay") {
        const semantic = (await kv.list<SemanticMemory>(KV.semantic)).filter(
          (memory) => recordMatchesProject(memory.project, projectScope),
        );
        applyDecay(semantic, decayDays);
        for (const s of semantic) {
          await kv.set(KV.semantic, s.id, s);
        }

        const procedural = (
          await kv.list<ProceduralMemory>(KV.procedural)
        ).filter((memory) =>
          recordMatchesProject(memory.project, projectScope),
        );
        applyDecay(procedural, decayDays);
        for (const p of procedural) {
          await kv.set(KV.procedural, p.id, p);
        }

        results.decay = {
          semantic: semantic.length,
          procedural: procedural.length,
        };
      }

      if (process.env["OBSIDIAN_AUTO_EXPORT"] === "true") {
        try {
          await sdk.trigger({ function_id: "mem::obsidian-export", payload: {} });
          results.obsidianExport = { success: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logger.warn("Obsidian auto-export failed", { error: msg });
          results.obsidianExport = { success: false, error: msg };
        }
      }

      await recordAudit(kv, "consolidate", "mem::consolidate-pipeline", [], {
        tier,
        project,
        scope: projectScope.kind,
        results,
      });

      logger.info("Consolidation pipeline complete", {
        tier,
        project,
        scope: projectScope.kind,
        results,
      });
      return { success: true, results };
    },
  );
}
