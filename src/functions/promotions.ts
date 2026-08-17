import type { ISdk } from "iii-sdk";
import type { StateKV } from "../state/kv.js";
import {
  KV,
  fingerprintId,
  jaccardSimilarity,
} from "../state/schema.js";
import type {
  CompressedObservation,
  ObservationType,
  PromotionCandidate,
  PromotionCategory,
  Session,
} from "../types.js";
import { safeAudit } from "./audit.js";

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

type EvidenceKind =
  | "test"
  | "runtime"
  | "commit"
  | "adr"
  | "recall"
  | "recalled"
  | "summary"
  | "summary-only";

type EvidenceVerificationStatus =
  | "verified"
  | "accepted"
  | "unverified"
  | "rejected";

interface EvidenceNode {
  id: string;
  kind: EvidenceKind;
  sourceIds: string[];
  verificationStatus: EvidenceVerificationStatus;
  parentIds: string[];
}

interface EvidenceMetadata {
  typed: boolean;
  node?: EvidenceNode;
}

interface EvidenceTrace {
  observationIds: string[];
  sourceIds: string[];
}

type PromotionPersistenceOperation = "auto_promote" | "accept";
type PromotionPersistenceTarget = "lesson" | "memory";

interface PromotionPersistenceFailure {
  code: "PROMOTION_PERSISTENCE_FAILED";
  operation: PromotionPersistenceOperation;
  target: PromotionPersistenceTarget;
  reason:
    | "downstream_rejected"
    | "success_not_confirmed"
    | "missing_record_id"
    | "exception";
  message: string;
}

interface PromotionPersistenceError {
  code: "PROMOTION_PERSISTENCE_FAILED";
  message: string;
  failures: PromotionPersistenceFailure[];
}

type PromotionPersistenceResult =
  | { recordId: string }
  | { failure: PromotionPersistenceFailure };

const EVIDENCE_KINDS = new Set<EvidenceKind>([
  "test",
  "runtime",
  "commit",
  "adr",
  "recall",
  "recalled",
  "summary",
  "summary-only",
]);
const EVIDENCE_STATUSES = new Set<EvidenceVerificationStatus>([
  "verified",
  "accepted",
  "unverified",
  "rejected",
]);
const AUTO_PROMOTION_EVIDENCE_KINDS = new Set<EvidenceKind>([
  "test",
  "runtime",
  "commit",
]);
const RECALL_OR_SUMMARY_KINDS = new Set<EvidenceKind>([
  "recall",
  "recalled",
  "summary",
  "summary-only",
]);
const SOURCE_DECLARABLE_EVIDENCE_KINDS = new Set<EvidenceKind>([
  "test",
  "runtime",
  "commit",
  "adr",
]);
const OBSERVATION_TYPES = new Set<ObservationType>([
  "file_read",
  "file_write",
  "file_edit",
  "command_run",
  "search",
  "web_fetch",
  "conversation",
  "error",
  "decision",
  "discovery",
  "subagent",
  "notification",
  "task",
  "image",
  "other",
]);

function isCompressedObservation(
  value: unknown,
): value is CompressedObservation {
  if (!value || typeof value !== "object") return false;
  const observation = value as Partial<CompressedObservation>;
  return (
    typeof observation.id === "string" &&
    observation.id.length > 0 &&
    typeof observation.sessionId === "string" &&
    observation.sessionId.length > 0 &&
    typeof observation.timestamp === "string" &&
    observation.timestamp.length > 0 &&
    typeof observation.type === "string" &&
    OBSERVATION_TYPES.has(observation.type as ObservationType) &&
    typeof observation.title === "string" &&
    typeof observation.narrative === "string" &&
    Array.isArray(observation.facts) &&
    observation.facts.every((fact) => typeof fact === "string") &&
    Array.isArray(observation.concepts) &&
    observation.concepts.every((concept) => typeof concept === "string") &&
    Array.isArray(observation.files) &&
    observation.files.every((file) => typeof file === "string") &&
    typeof observation.importance === "number" &&
    Number.isFinite(observation.importance)
  );
}

async function loadCompressedObservations(
  kv: StateKV,
  sessionId: string,
): Promise<{
  observations: CompressedObservation[];
  nonCompressedObservationsSkipped: number;
}> {
  const stored = await kv.list<unknown>(KV.observations(sessionId));
  const observations = stored.filter(isCompressedObservation).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  return {
    observations,
    nonCompressedObservationsSkipped: stored.length - observations.length,
  };
}

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

function conceptValues(concepts: string[], names: string[]): string[] {
  const values: string[] = [];
  for (const concept of concepts) {
    for (const name of names) {
      const prefix = `${name}:`;
      if (concept.startsWith(prefix)) {
        const value = concept.slice(prefix.length).trim();
        if (value) values.push(value);
      }
    }
  }
  return values;
}

/**
 * Evidence metadata travels through the existing `concepts` field:
 * evidence:kind:<kind>, evidence:status:<status>, evidence:source:<id>, and
 * optional evidence:parent:<observation-id>. The hyphenated prefix variants
 * remain accepted for payload producers that cannot emit multi-colon tags.
 */
function evidenceMetadata(
  observation: CompressedObservation,
): EvidenceMetadata {
  const kinds = conceptValues(observation.concepts, [
    "evidence:kind",
    "evidence-kind",
  ]);
  const statuses = conceptValues(observation.concepts, [
    "evidence:status",
    "evidence-status",
  ]);
  const sourceIds = conceptValues(observation.concepts, [
    "evidence:source",
    "evidence-source",
  ]);
  const parentIds = conceptValues(observation.concepts, [
    "evidence:parent",
    "evidence-parent",
  ]);
  const typed =
    kinds.length > 0 ||
    statuses.length > 0 ||
    sourceIds.length > 0 ||
    parentIds.length > 0;
  if (!typed) return { typed: false };

  const id = observation.id.trim();
  const uniqueKinds = [...new Set(kinds)];
  const uniqueStatuses = [...new Set(statuses)];
  const kind = uniqueKinds[0] as EvidenceKind | undefined;
  const verificationStatus = uniqueStatuses[0] as
    | EvidenceVerificationStatus
    | undefined;
  if (
    !id ||
    uniqueKinds.length !== 1 ||
    !kind ||
    !EVIDENCE_KINDS.has(kind) ||
    uniqueStatuses.length !== 1 ||
    !verificationStatus ||
    !EVIDENCE_STATUSES.has(verificationStatus) ||
    sourceIds.length === 0
  ) {
    return { typed: true };
  }

  return {
    typed: true,
    node: {
      id,
      kind,
      sourceIds: [...new Set(sourceIds)],
      verificationStatus,
      parentIds: [...new Set(parentIds)],
    },
  };
}

function buildEvidenceGraph(
  observations: CompressedObservation[],
): Map<string, EvidenceNode> {
  const graph = new Map<string, EvidenceNode>();
  const duplicateIds = new Set<string>();
  for (const observation of observations) {
    const metadata = evidenceMetadata(observation);
    if (!metadata.node) continue;
    if (graph.has(metadata.node.id)) duplicateIds.add(metadata.node.id);
    graph.set(metadata.node.id, metadata.node);
  }
  for (const duplicateId of duplicateIds) graph.delete(duplicateId);
  return graph;
}

function evidenceStatusIsAccepted(node: EvidenceNode): boolean {
  if (AUTO_PROMOTION_EVIDENCE_KINDS.has(node.kind)) {
    return node.verificationStatus === "verified";
  }
  if (node.kind === "adr") {
    return node.verificationStatus === "accepted";
  }
  return false;
}

function sourceIdsMatchEvidenceKind(node: EvidenceNode): boolean {
  return node.sourceIds.every((sourceId) => {
    const declaredKind = sourceId.split(":", 1)[0] as EvidenceKind;
    return (
      !SOURCE_DECLARABLE_EVIDENCE_KINDS.has(declaredKind) ||
      declaredKind === node.kind
    );
  });
}

function traceEvidence(
  nodeId: string,
  candidateId: string,
  graph: Map<string, EvidenceNode>,
  visiting: Set<string>,
  visited: Set<string>,
  trace: EvidenceTrace,
): boolean {
  if (visiting.has(nodeId)) return false;
  if (visited.has(nodeId)) return true;
  const node = graph.get(nodeId);
  if (
    !node ||
    RECALL_OR_SUMMARY_KINDS.has(node.kind) ||
    !evidenceStatusIsAccepted(node) ||
    node.sourceIds.length === 0 ||
    !sourceIdsMatchEvidenceKind(node) ||
    node.sourceIds.includes(candidateId)
  ) {
    return false;
  }

  visiting.add(nodeId);
  for (const parentId of node.parentIds) {
    if (
      parentId === candidateId ||
      !traceEvidence(
        parentId,
        candidateId,
        graph,
        visiting,
        visited,
        trace,
      )
    ) {
      visiting.delete(nodeId);
      return false;
    }
  }
  visiting.delete(nodeId);
  visited.add(nodeId);
  trace.observationIds.push(node.id);
  trace.sourceIds.push(...node.sourceIds);
  return true;
}

function findFreshEvidence(
  candidate: CompressedObservation,
  observations: CompressedObservation[],
  graph: Map<string, EvidenceNode>,
  allowedKinds: Set<EvidenceKind>,
): { observation: CompressedObservation; trace: EvidenceTrace } | undefined {
  const candidateAt = new Date(candidate.timestamp).getTime();
  for (const observation of observations) {
    if (
      observation.id === candidate.id ||
      new Date(observation.timestamp).getTime() < candidateAt
    ) {
      continue;
    }
    const node = graph.get(observation.id);
    if (!node || !allowedKinds.has(node.kind)) continue;
    const trace: EvidenceTrace = { observationIds: [], sourceIds: [] };
    if (
      traceEvidence(
        node.id,
        candidate.id,
        graph,
        new Set(),
        new Set(),
        trace,
      )
    ) {
      return {
        observation,
        trace: {
          observationIds: [...new Set(trace.observationIds)],
          sourceIds: [...new Set(trace.sourceIds)],
        },
      };
    }
  }
  return undefined;
}

function canUseAsPromotionSource(
  observation: CompressedObservation,
): boolean {
  const metadata = evidenceMetadata(observation);
  if (!metadata.typed) return Boolean(observationText(observation));
  return Boolean(
    metadata.node && !RECALL_OR_SUMMARY_KINDS.has(metadata.node.kind),
  );
}

function persistenceFailure(
  operation: PromotionPersistenceOperation,
  target: PromotionPersistenceTarget,
  reason: PromotionPersistenceFailure["reason"],
): PromotionPersistenceFailure {
  return {
    code: "PROMOTION_PERSISTENCE_FAILED",
    operation,
    target,
    reason,
    message: `${operation} did not persist a ${target} record`,
  };
}

function persistenceError(
  failures: PromotionPersistenceFailure[],
): PromotionPersistenceError {
  return {
    code: "PROMOTION_PERSISTENCE_FAILED",
    message: "promotion persistence failed; candidate remains pending",
    failures,
  };
}

async function requirePersistedRecord(
  operation: PromotionPersistenceOperation,
  target: PromotionPersistenceTarget,
  trigger: () => Promise<unknown>,
): Promise<PromotionPersistenceResult> {
  let result: unknown;
  try {
    result = await trigger();
  } catch {
    return {
      failure: persistenceFailure(operation, target, "exception"),
    };
  }
  if (!result || typeof result !== "object") {
    return {
      failure: persistenceFailure(
        operation,
        target,
        "success_not_confirmed",
      ),
    };
  }

  const response = result as {
    success?: unknown;
    lesson?: { id?: unknown };
    memory?: { id?: unknown };
  };
  if (response.success === false) {
    return {
      failure: persistenceFailure(
        operation,
        target,
        "downstream_rejected",
      ),
    };
  }
  if (response.success !== true) {
    return {
      failure: persistenceFailure(
        operation,
        target,
        "success_not_confirmed",
      ),
    };
  }
  const record = target === "lesson" ? response.lesson : response.memory;
  const recordId = typeof record?.id === "string" ? record.id.trim() : "";
  if (!recordId) {
    return {
      failure: persistenceFailure(
        operation,
        target,
        "missing_record_id",
      ),
    };
  }
  return { recordId };
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

      const observationSet = await loadCompressedObservations(kv, sessionId);
      const allObservations = observationSet.observations;
      const { nonCompressedObservationsSkipped } = observationSet;
      const evidenceGraph = buildEvidenceGraph(allObservations);
      const observations = allObservations.filter(canUseAsPromotionSource);
      if (observations.length === 0) {
        await safeAudit(kv, "consolidate", "mem::promotion-generate", [], {
          project,
          sessionId,
          candidates: 0,
          promoted: 0,
          persistenceFailures: 0,
          nonCompressedObservationsSkipped,
        });
        return {
          success: true,
          candidates: [],
          promoted: 0,
          nonCompressedObservationsSkipped,
        };
      }

      const now = new Date().toISOString();
      const drafts: PromotionCandidate[] = [];
      const failures = observations.filter(
        (observation) => observation.type === "error",
      );
      for (const failure of failures.slice(-2)) {
        const verification = findFreshEvidence(
          failure,
          allObservations,
          evidenceGraph,
          AUTO_PROMOTION_EVIDENCE_KINDS,
        );
        const sourceObservationIds = [
          failure.id,
          ...(verification?.trace.observationIds ?? []),
        ];
        const content = verification
          ? `${failure.title}: ${failure.facts[0] ?? failure.narrative}. Verified by ${verification.observation.title}.`
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
          verificationObservationIds:
            verification?.trace.observationIds ?? [],
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
        const verification = findFreshEvidence(
          observation,
          allObservations,
          evidenceGraph,
          category === "architecture"
            ? new Set<EvidenceKind>([
                ...AUTO_PROMOTION_EVIDENCE_KINDS,
                "adr",
              ])
            : AUTO_PROMOTION_EVIDENCE_KINDS,
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
            ...(verification?.trace.observationIds ?? []),
          ],
          failureObservationIds: [],
          verificationObservationIds:
            verification?.trace.observationIds ?? [],
          commitSha: session.commitShas?.at(-1),
          createdAt: now,
          updatedAt: now,
        });
      }

      const candidates: PromotionCandidate[] = [];
      const persistenceFailures: PromotionPersistenceFailure[] = [];
      let promoted = 0;
      for (const draft of drafts.slice(0, 3)) {
        const candidate = await saveCandidate(kv, draft);
        if (
          !draft.requiresExplicitApproval &&
          draft.freshVerification &&
          draft.verificationObservationIds.length > 0 &&
          candidate.status === "pending"
        ) {
          const persistence = await requirePersistedRecord(
            "auto_promote",
            "lesson",
            () =>
              sdk.trigger({
                function_id: "mem::lesson-save",
                payload: {
                  content: candidate.content,
                  context: `Verified ${candidate.category} lesson from session ${sessionId}`,
                  confidence: 0.8,
                  project,
                  tags: [candidate.category, "verified"],
                  source: "consolidation",
                  idempotencyKey: candidate.id,
                  sourceIds: [
                    ...draft.sourceObservationIds,
                    ...draft.sourceObservationIds.flatMap((sourceId) => {
                      const node = evidenceGraph.get(sourceId);
                      return node?.sourceIds ?? [];
                    }),
                    ...(candidate.commitSha ? [candidate.commitSha] : []),
                  ],
                },
              }),
          );
          if ("failure" in persistence) {
            persistenceFailures.push(persistence.failure);
            candidates.push(candidate);
            continue;
          }
          candidate.status = "auto_promoted";
          candidate.requiresExplicitApproval = draft.requiresExplicitApproval;
          candidate.freshVerification = true;
          candidate.sourceObservationIds = draft.sourceObservationIds;
          candidate.failureObservationIds = draft.failureObservationIds;
          candidate.verificationObservationIds =
            draft.verificationObservationIds;
          candidate.promotedRecordId = persistence.recordId;
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

      await safeAudit(kv, "consolidate", "mem::promotion-generate", [], {
        project,
        sessionId,
        candidates: candidates.length,
        promoted,
        persistenceFailures: persistenceFailures.length,
        nonCompressedObservationsSkipped,
      });
      if (persistenceFailures.length > 0) {
        return {
          success: false,
          error: persistenceError(persistenceFailures),
          candidates,
          promoted,
          nonCompressedObservationsSkipped,
        };
      }
      return {
        success: true,
        candidates,
        promoted,
        nonCompressedObservationsSkipped,
      };
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

      let acceptedEvidenceSourceIds: string[] = [];
      if (candidate.category === "bug" || candidate.category === "workflow") {
        const { observations } = await loadCompressedObservations(
          kv,
          candidate.sessionId,
        );
        const originIds = [
          ...candidate.failureObservationIds,
          ...candidate.sourceObservationIds,
        ];
        const origin = originIds
          .map((id) =>
            observations.find((observation) => observation.id === id),
          )
          .find(
            (observation): observation is CompressedObservation =>
              Boolean(observation),
          );
        if (!origin) {
          return {
            success: false,
            error: "fresh passing verification is required before promotion",
          };
        }
        const verification = findFreshEvidence(
          origin,
          observations,
          buildEvidenceGraph(observations),
          AUTO_PROMOTION_EVIDENCE_KINDS,
        );
        if (!verification) {
          return {
            success: false,
            error: "fresh passing verification is required before promotion",
          };
        }
        candidate.freshVerification = true;
        candidate.sourceObservationIds = [
          origin.id,
          ...verification.trace.observationIds,
        ];
        candidate.verificationObservationIds =
          verification.trace.observationIds;
        acceptedEvidenceSourceIds = verification.trace.sourceIds;
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
        const persistence = await requirePersistedRecord(
          "accept",
          "lesson",
          () =>
            sdk.trigger({
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
                  ...acceptedEvidenceSourceIds,
                  ...(commitSha ? [commitSha] : []),
                ],
              },
            }),
        );
        if ("failure" in persistence) {
          return {
            success: false,
            error: persistenceError([persistence.failure]),
            candidate,
          };
        }
        promotedRecordId = persistence.recordId;
      } else {
        const content =
          candidate.category === "architecture"
            ? `Accepted architecture decision. Authority: ${canonicalAdr}. Commit: ${commitSha}.`
            : `Accepted ${candidate.category} decision: ${candidate.content}`;
        const persistence = await requirePersistedRecord(
          "accept",
          "memory",
          () =>
            sdk.trigger({
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
            }),
        );
        if ("failure" in persistence) {
          return {
            success: false,
            error: persistenceError([persistence.failure]),
            candidate,
          };
        }
        promotedRecordId = persistence.recordId;
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
      await safeAudit(kv, "consolidate", "mem::promotion-decide", [
        candidate.id,
      ], {
        project,
        action: "accept",
        promotedRecordId,
        canonicalAdr,
        commitSha,
      });
      return { success: true, candidate };
    },
  );
}
