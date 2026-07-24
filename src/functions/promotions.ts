import type { ISdk } from "iii-sdk";
import type { StateKV } from "../state/kv.js";
import {
  KV,
  fingerprintId,
  jaccardSimilarity,
} from "../state/schema.js";
import type {
  CompressedObservation,
  PromotionCandidate,
  PromotionCategory,
  Session,
} from "../types.js";
import { recordAudit } from "./audit.js";

const VERIFIED_RE =
  /\b(pass(?:ed|ing)?|success(?:ful)?|verified|fixed|exit(?:ed)?\s+(?:code\s+)?0|tests?\s+(?:pass|green))\b/i;
const WORKFLOW_RE =
  /\b(workflow|procedure|process|ritual|runbook|sequence|step|command)\b/i;
const ARCHITECTURE_RE =
  /\b(architecture|architectural|adr|service boundary|data model|schema|protocol)\b/i;
const PREFERENCE_RE =
  /\b(prefer|preference|always use|never use|style|convention)\b/i;
const SECURITY_RE =
  /\b(security|secret|credential|authentication|authorization|privacy|policy|threat)\b/i;
const BUSINESS_RE =
  /\b(business|customer|pricing|market|revenue|product policy|commercial)\b/i;

function observationText(observation: CompressedObservation): string {
  return [
    observation.title,
    observation.subtitle,
    observation.narrative,
    ...observation.facts,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(text: string): PromotionCategory {
  if (SECURITY_RE.test(text)) return "security";
  if (ARCHITECTURE_RE.test(text)) return "architecture";
  if (PREFERENCE_RE.test(text)) return "preference";
  if (BUSINESS_RE.test(text)) return "business";
  if (WORKFLOW_RE.test(text)) return "workflow";
  return "workflow";
}

function canUseAsFreshEvidence(observation: CompressedObservation): boolean {
  const text = observationText(observation);
  return (
    Boolean(text) &&
    !text.includes("<agentmemory-context") &&
    !/\brecalled memory\b/i.test(text)
  );
}

async function saveCandidate(
  kv: StateKV,
  candidate: PromotionCandidate,
): Promise<PromotionCandidate> {
  const existing = await kv.list<PromotionCandidate>(
    KV.promotionCandidates(candidate.project),
  );
  const duplicate = existing.find(
    (item) =>
      item.sessionId === candidate.sessionId &&
      item.category === candidate.category &&
      jaccardSimilarity(
        item.content.toLowerCase(),
        candidate.content.toLowerCase(),
      ) >= 0.82,
  );
  if (duplicate) return duplicate;
  await kv.set(
    KV.promotionCandidates(candidate.project),
    candidate.id,
    candidate,
  );
  return candidate;
}

export function registerPromotionFunctions(
  sdk: ISdk,
  kv: StateKV,
): void {
  sdk.registerFunction(
    "mem::promotion-generate",
    async (data: { sessionId?: string; project?: string }) => {
      const sessionId =
        typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      if (!sessionId || !project) {
        return { success: false, error: "sessionId and project are required" };
      }
      const session = await kv.get<Session>(KV.sessions, sessionId);
      if (!session || session.project !== project) {
        return {
          success: false,
          error: "session does not belong to project",
        };
      }

      const observations = (
        await kv.list<CompressedObservation>(KV.observations(sessionId))
      )
        .filter(canUseAsFreshEvidence)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() -
            new Date(b.timestamp).getTime(),
        );
      if (observations.length === 0) {
        return { success: true, candidates: [], promoted: 0 };
      }

      const now = new Date().toISOString();
      const drafts: PromotionCandidate[] = [];
      const failures = observations.filter(
        (observation) => observation.type === "error",
      );
      for (const failure of failures.slice(-2)) {
        const failureAt = new Date(failure.timestamp).getTime();
        const verification = observations.find(
          (observation) =>
            new Date(observation.timestamp).getTime() >= failureAt &&
            (observation.type === "command_run" ||
              observation.type === "task" ||
              observation.type === "discovery") &&
            VERIFIED_RE.test(observationText(observation)),
        );
        const sourceObservationIds = [
          failure.id,
          ...(verification ? [verification.id] : []),
        ];
        const content = verification
          ? `${failure.title}: ${failure.facts[0] ?? failure.narrative}. Verified by ${verification.title}.`
          : `${failure.title}: ${failure.facts[0] ?? failure.narrative}.`;
        drafts.push({
          id: fingerprintId(
            "promo",
            `${project}:${sessionId}:bug:${content.toLowerCase()}`,
          ),
          project,
          sessionId,
          category: "bug",
          title: `Verified fix: ${failure.title}`.slice(0, 160),
          content: content.slice(0, 2000),
          status: "pending",
          requiresExplicitApproval: false,
          freshVerification: Boolean(verification),
          sourceObservationIds,
          failureObservationIds: [failure.id],
          verificationObservationIds: verification ? [verification.id] : [],
          commitSha: session.commitShas?.at(-1),
          createdAt: now,
          updatedAt: now,
        });
      }

      const decisions = observations
        .filter(
          (observation) =>
            observation.type === "decision" ||
            (observation.type === "discovery" &&
              observation.importance >= 7),
        )
        .sort((a, b) => b.importance - a.importance);
      for (const observation of decisions) {
        if (drafts.length >= 3) break;
        const text = observationText(observation);
        const category = classify(text);
        const verification = observations.find(
          (candidate) =>
            new Date(candidate.timestamp).getTime() >=
              new Date(observation.timestamp).getTime() &&
            candidate.id !== observation.id &&
            VERIFIED_RE.test(observationText(candidate)),
        );
        const explicit = [
          "architecture",
          "preference",
          "security",
          "business",
        ].includes(category);
        drafts.push({
          id: fingerprintId(
            "promo",
            `${project}:${sessionId}:${category}:${text.toLowerCase()}`,
          ),
          project,
          sessionId,
          category,
          title: observation.title.slice(0, 160),
          content: text.slice(0, 2000),
          status: "pending",
          requiresExplicitApproval: explicit,
          freshVerification: Boolean(verification),
          sourceObservationIds: [
            observation.id,
            ...(verification ? [verification.id] : []),
          ],
          failureObservationIds: [],
          verificationObservationIds: verification ? [verification.id] : [],
          commitSha: session.commitShas?.at(-1),
          createdAt: now,
          updatedAt: now,
        });
      }

      const candidates: PromotionCandidate[] = [];
      let promoted = 0;
      for (const draft of drafts.slice(0, 3)) {
        const candidate = await saveCandidate(kv, draft);
        if (
          !candidate.requiresExplicitApproval &&
          candidate.freshVerification &&
          candidate.sourceObservationIds.length >= 2 &&
          candidate.status === "pending"
        ) {
          const result = (await sdk.trigger({
            function_id: "mem::lesson-save",
            payload: {
              content: candidate.content,
              context: `Verified ${candidate.category} lesson from session ${sessionId}`,
              confidence: 0.8,
              project,
              tags: [candidate.category, "verified"],
              source: "consolidation",
              sourceIds: [
                ...candidate.sourceObservationIds,
                ...(candidate.commitSha ? [candidate.commitSha] : []),
              ],
            },
          })) as { lesson?: { id?: string } };
          candidate.status = "auto_promoted";
          candidate.promotedRecordId = result.lesson?.id;
          candidate.updatedAt = new Date().toISOString();
          candidate.decidedAt = candidate.updatedAt;
          await kv.set(
            KV.promotionCandidates(project),
            candidate.id,
            candidate,
          );
          promoted++;
        }
        candidates.push(candidate);
      }

      await recordAudit(kv, "consolidate", "mem::promotion-generate", [], {
        project,
        sessionId,
        candidates: candidates.length,
        promoted,
      }).catch(() => {});
      return { success: true, candidates, promoted };
    },
  );

  sdk.registerFunction(
    "mem::promotion-list",
    async (data: {
      project?: string;
      sessionId?: string;
      status?: PromotionCandidate["status"];
    }) => {
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      if (!project) return { success: false, error: "project is required" };
      let candidates = await kv.list<PromotionCandidate>(
        KV.promotionCandidates(project),
      );
      if (data.sessionId) {
        candidates = candidates.filter(
          (candidate) => candidate.sessionId === data.sessionId,
        );
      }
      if (data.status) {
        candidates = candidates.filter(
          (candidate) => candidate.status === data.status,
        );
      }
      candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { success: true, candidates };
    },
  );

  sdk.registerFunction(
    "mem::promotion-decide",
    async (data: {
      project?: string;
      candidateId?: string;
      action?: "accept" | "reject";
      canonicalAdr?: string;
      commitSha?: string;
    }) => {
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      const candidateId =
        typeof data?.candidateId === "string"
          ? data.candidateId.trim()
          : "";
      if (!project || !candidateId || !data.action) {
        return {
          success: false,
          error: "project, candidateId, and action are required",
        };
      }
      const candidate = await kv.get<PromotionCandidate>(
        KV.promotionCandidates(project),
        candidateId,
      );
      if (!candidate || candidate.project !== project) {
        return { success: false, error: "promotion candidate not found" };
      }
      if (
        candidate.status === "accepted" ||
        candidate.status === "rejected" ||
        candidate.status === "auto_promoted"
      ) {
        return { success: true, alreadyDecided: true, candidate };
      }

      const now = new Date().toISOString();
      if (data.action === "reject") {
        candidate.status = "rejected";
        candidate.updatedAt = now;
        candidate.decidedAt = now;
        await kv.set(
          KV.promotionCandidates(project),
          candidate.id,
          candidate,
        );
        return { success: true, candidate };
      }

      if (
        (candidate.category === "bug" ||
          candidate.category === "workflow") &&
        !candidate.freshVerification
      ) {
        return {
          success: false,
          error: "fresh passing verification is required before promotion",
        };
      }
      if (
        candidate.category === "architecture" &&
        (!data.canonicalAdr?.trim() || !data.commitSha?.trim())
      ) {
        return {
          success: false,
          error:
            "architecture promotion requires canonicalAdr and commitSha provenance",
        };
      }

      const commitSha = data.commitSha?.trim() || candidate.commitSha;
      const canonicalAdr = data.canonicalAdr?.trim();
      let promotedRecordId: string | undefined;
      if (candidate.category === "bug" || candidate.category === "workflow") {
        const result = (await sdk.trigger({
          function_id: "mem::lesson-save",
          payload: {
            content: candidate.content,
            context: `Explicitly accepted ${candidate.category} lesson`,
            confidence: 0.8,
            project,
            tags: [candidate.category, "verified", "accepted"],
            source: "manual",
            sourceIds: [
              ...candidate.sourceObservationIds,
              ...(commitSha ? [commitSha] : []),
            ],
          },
        })) as { lesson?: { id?: string } };
        promotedRecordId = result.lesson?.id;
      } else {
        const content =
          candidate.category === "architecture"
            ? `Accepted architecture decision. Authority: ${canonicalAdr}. Commit: ${commitSha}.`
            : `Accepted ${candidate.category} decision: ${candidate.content}`;
        const result = (await sdk.trigger({
          function_id: "mem::remember",
          payload: {
            content,
            type:
              candidate.category === "preference"
                ? "preference"
                : candidate.category === "architecture"
                  ? "architecture"
                  : "fact",
            concepts: [candidate.category, "accepted-decision"],
            files: canonicalAdr ? [canonicalAdr] : [],
            sourceObservationIds: candidate.sourceObservationIds,
            project,
          },
        })) as { memory?: { id?: string } };
        promotedRecordId = result.memory?.id;
      }

      candidate.status = "accepted";
      candidate.canonicalAdr = canonicalAdr;
      candidate.commitSha = commitSha;
      candidate.promotedRecordId = promotedRecordId;
      candidate.updatedAt = now;
      candidate.decidedAt = now;
      await kv.set(
        KV.promotionCandidates(project),
        candidate.id,
        candidate,
      );
      await recordAudit(kv, "consolidate", "mem::promotion-decide", [
        candidate.id,
      ], {
        project,
        action: "accept",
        promotedRecordId,
        canonicalAdr,
        commitSha,
      }).catch(() => {});
      return { success: true, candidate };
    },
  );
}
