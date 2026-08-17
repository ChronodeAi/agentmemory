import type { ISdk } from "iii-sdk";
import type {
  CompressedObservation,
  Memory,
  Session,
  MemoryProvider,
  PromotionCandidate,
} from "../types.js";
import { KV, fingerprintId, generateId } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { recordAudit } from "./audit.js";

const CONSOLIDATION_SYSTEM = `You are a memory consolidation engine. Given a set of related observations from coding sessions, synthesize them into a single long-term memory.

Output XML:
<memory>
  <type>pattern|preference|architecture|bug|workflow|fact</type>
  <title>Concise memory title (max 80 chars)</title>
  <content>2-4 sentence description of the learned insight</content>
  <concepts>
    <concept>key term</concept>
  </concepts>
  <files>
    <file>relevant/file/path</file>
  </files>
  <strength>1-10 how confident/important this memory is</strength>
</memory>`;

import { getXmlTag, getXmlChildren } from "../prompts/xml.js";
import { logger } from "../logger.js";
import { getEnvVar } from "../config.js";
import {
  recordMatchesProject,
  requireProjectReadScope,
} from "../project-scope.js";

const VERIFIED_RE =
  /\b(pass(?:ed|ing)?|success(?:ful)?|verified|fixed|exit(?:ed)?\s+(?:code\s+)?0|tests?\s+(?:pass|green))\b/i;

function parseMemoryXml(
  xml: string,
  sessionIds: string[],
): Omit<Memory, "id" | "createdAt" | "updatedAt"> | null {
  const type = getXmlTag(xml, "type");
  const title = getXmlTag(xml, "title");
  const content = getXmlTag(xml, "content");
  if (!type || !title || !content) return null;

  const validTypes = new Set([
    "pattern",
    "preference",
    "architecture",
    "bug",
    "workflow",
    "fact",
  ]);

  return {
    type: (validTypes.has(type) ? type : "fact") as Memory["type"],
    title,
    content,
    concepts: getXmlChildren(xml, "concepts", "concept"),
    files: getXmlChildren(xml, "files", "file"),
    sessionIds,
    strength: Math.max(
      1,
      Math.min(10, parseInt(getXmlTag(xml, "strength") || "5", 10) || 5),
    ),
    version: 1,
    isLatest: true,
  };
}

export function registerConsolidateFunction(
  sdk: ISdk,
  kv: StateKV,
  provider: MemoryProvider,
): void {
  sdk.registerFunction("mem::consolidate", 
    async (data: {
      project?: string;
      scope?: "project" | "global";
      minObservations?: number;
    }) => {
      const projectScope = requireProjectReadScope(data, "mem::consolidate");
      const project =
        projectScope.kind === "project" ? projectScope.project : undefined;
      const minObs = data.minObservations ?? 10;

      const sessions = await kv.list<Session>(KV.sessions);
      const filtered = sessions.filter((session) =>
        recordMatchesProject(session.project, projectScope),
      );
      if (
        getEnvVar("AGENTMEMORY_LOCAL_PROCESSING") !== "true" &&
        filtered.some(
          (session) =>
            session.privacy === "strict" ||
            session.externalProcessing === false,
        )
      ) {
        return {
          consolidated: 0,
          error:
            "external_processing_disabled_for_strict_project; configure a local provider and AGENTMEMORY_LOCAL_PROCESSING=true",
        };
      }

      const allObs: Array<CompressedObservation & { sid: string }> = [];
      const obsPerSession: CompressedObservation[][] = [];
      for (let batch = 0; batch < filtered.length; batch += 10) {
        const chunk = filtered.slice(batch, batch + 10);
        const results = await Promise.all(
          chunk.map((s) =>
            kv
              .list<CompressedObservation>(KV.observations(s.id))
              .catch(() => [] as CompressedObservation[]),
          ),
        );
        obsPerSession.push(...results);
      }
      for (let i = 0; i < filtered.length; i++) {
        for (const obs of obsPerSession[i]) {
          if (obs.title && obs.importance >= 5) {
            allObs.push({ ...obs, sid: filtered[i].id });
          }
        }
      }

      if (allObs.length < minObs) {
        return { consolidated: 0, reason: "insufficient_observations" };
      }

      const conceptGroups = new Map<string, typeof allObs>();
      for (const obs of allObs) {
        for (const concept of obs.concepts) {
          const key = concept.toLowerCase();
          if (!conceptGroups.has(key)) conceptGroups.set(key, []);
          conceptGroups.get(key)!.push(obs);
        }
      }

      let consolidated = 0;
      const existingMemories = (await kv.list<Memory>(KV.memories)).filter(
        (memory) => recordMatchesProject(memory.project, projectScope),
      );
      const existingTitles = new Set(
        existingMemories.map((m) => m.title.toLowerCase()),
      );

      const MAX_LLM_CALLS = 10;
      let llmCallCount = 0;
      let promotionCandidates = 0;

      const sortedGroups = [...conceptGroups.entries()]
        .filter(([, g]) => g.length >= 3)
        .sort((a, b) => b[1].length - a[1].length);

      for (const [concept, obsGroup] of sortedGroups) {
        if (llmCallCount >= MAX_LLM_CALLS) break;

        const top = obsGroup
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 8);
        const sessionIds = [...new Set(top.map((o) => o.sid))];

        const prompt = top
          .map(
            (o) =>
              `[${o.type}] ${o.title}\n${o.narrative}\nFiles: ${o.files.join(", ")}\nImportance: ${o.importance}`,
          )
          .join("\n\n");

        try {
          const response = await Promise.race([
            provider.compress(
              CONSOLIDATION_SYSTEM,
              `Concept: "${concept}"\n\nObservations:\n${prompt}`,
            ),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("compress timeout")), 30_000),
            ),
          ]);
          llmCallCount++;
          const parsed = parseMemoryXml(response, sessionIds);
          if (!parsed) continue;

          const now = new Date().toISOString();
          const obsIds = [...new Set(top.map((o) => o.id))];
          if (
            parsed.type === "architecture" ||
            parsed.type === "preference"
          ) {
            if (project && promotionCandidates < 3) {
              const category =
                parsed.type === "architecture"
                  ? "architecture"
                  : "preference";
              const candidate: PromotionCandidate = {
                id: fingerprintId(
                  "promo",
                  `${project}:${sessionIds[0] ?? "consolidation"}:${category}:${parsed.content.toLowerCase()}`,
                ),
                project,
                sessionId: sessionIds[0] ?? "consolidation",
                category,
                title: parsed.title,
                content: parsed.content,
                status: "pending",
                requiresExplicitApproval: true,
                freshVerification: false,
                sourceObservationIds: obsIds,
                failureObservationIds: [],
                verificationObservationIds: [],
                createdAt: now,
                updatedAt: now,
              };
              await kv.set(
                KV.promotionCandidates(project),
                candidate.id,
                candidate,
              );
              promotionCandidates++;
            }
            continue;
          }

          if (parsed.type === "bug" || parsed.type === "workflow") {
            const failures = top.filter(
              (observation) => observation.type === "error",
            );
            const verification = top.find(
              (observation) =>
                (observation.type === "command_run" ||
                  observation.type === "task") &&
                VERIFIED_RE.test(
                  `${observation.title} ${observation.narrative} ${observation.facts.join(" ")}`,
                ),
            );
            if (project && failures.length > 0 && verification) {
              await sdk.trigger({
                function_id: "mem::lesson-save",
                payload: {
                  content: parsed.content,
                  context: parsed.title,
                  confidence: Math.min(1, parsed.strength / 10),
                  project,
                  tags: [parsed.type, "verified"],
                  source: "consolidation",
                  sourceIds: obsIds,
                },
              });
              consolidated++;
            } else if (project && promotionCandidates < 3) {
              const candidate: PromotionCandidate = {
                id: fingerprintId(
                  "promo",
                  `${project}:${sessionIds[0] ?? "consolidation"}:${parsed.type}:${parsed.content.toLowerCase()}`,
                ),
                project,
                sessionId: sessionIds[0] ?? "consolidation",
                category: parsed.type,
                title: parsed.title,
                content: parsed.content,
                status: "pending",
                requiresExplicitApproval: false,
                freshVerification: false,
                sourceObservationIds: obsIds,
                failureObservationIds: failures.map(
                  (observation) => observation.id,
                ),
                verificationObservationIds: [],
                createdAt: now,
                updatedAt: now,
              };
              await kv.set(
                KV.promotionCandidates(project),
                candidate.id,
                candidate,
              );
              promotionCandidates++;
            }
            continue;
          }

          const existingMatch = existingMemories.find(
            (m) =>
              m.title.toLowerCase() === parsed.title.toLowerCase() &&
              recordMatchesProject(m.project, projectScope),
          );

          if (existingMatch) {
            existingMatch.isLatest = false;
            await kv.set(KV.memories, existingMatch.id, existingMatch);
            await recordAudit(kv, "evolve", "mem::consolidate", [existingMatch.id], {
              action: "mark_non_latest",
              concept,
            });

            const evolved: Memory = {
              id: generateId("mem"),
              createdAt: now,
              updatedAt: now,
              ...parsed,
              version: (existingMatch.version || 1) + 1,
              parentId: existingMatch.id,
              supersedes: [
                existingMatch.id,
                ...(existingMatch.supersedes || []),
              ],
              sourceObservationIds: obsIds,
              isLatest: true,
              ...(project !== undefined && { project }),
            };
            await kv.set(KV.memories, evolved.id, evolved);
            await recordAudit(kv, "evolve", "mem::consolidate", [evolved.id], {
              action: "evolve_memory",
              oldId: existingMatch.id,
              newId: evolved.id,
              concept,
            });
            existingTitles.add(evolved.title.toLowerCase());
            consolidated++;
          } else {
            const memory: Memory = {
              id: generateId("mem"),
              createdAt: now,
              updatedAt: now,
              ...parsed,
              sourceObservationIds: obsIds,
              version: 1,
              isLatest: true,
              ...(project !== undefined && { project }),
            };
            await kv.set(KV.memories, memory.id, memory);
            await recordAudit(kv, "remember", "mem::consolidate", [memory.id], {
              action: "create_memory",
              concept,
            });
            existingTitles.add(memory.title.toLowerCase());
            consolidated++;
          }
        } catch (err) {
          logger.warn("Consolidation failed for concept", {
            concept,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      logger.info("Consolidation complete", {
        consolidated,
        promotionCandidates,
        project,
        scope: projectScope.kind,
        totalObs: allObs.length,
      });
      return {
        consolidated,
        promotionCandidates,
        totalObservations: allObs.length,
      };
    },
  );
}
