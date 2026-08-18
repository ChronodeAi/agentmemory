import { createHash, createHmac } from "node:crypto";
import type { ISdk } from "iii-sdk";
import type {
  CommitLink,
  Insight,
  Lesson,
  Memory,
  MemorySlot,
  PromotionCandidate,
  ProjectProfile,
  Session,
} from "../types.js";
import { generateId, KV } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import {
  isSlotsEnabled,
  listPinnedSlots,
  renderPinnedContext,
} from "./slots.js";
import type { AccessLog } from "./access-tracker.js";
import { recordAudit } from "./audit.js";
import { timingSafeCompare } from "../auth.js";
import {
  hasRichCommitProvenance,
  parseCommitProvenanceTransitions,
  parseCredentialFreeWorktreeId,
  parseGitObjectId,
} from "../commit-provenance.js";
import {
  evaluateContextCandidate,
  type ContextEligibilityDecision,
  type ContextEligibilityReason,
} from "../context-eligibility.js";

export { evaluateContextCandidate } from "../context-eligibility.js";
export type {
  ContextEligibilityDecision,
  ContextEligibilityReason,
} from "../context-eligibility.js";

interface InjectionMetrics {
  samplesMs: number[];
  packetCount: number;
  lastAt: string;
}

export type ContextClass = "advisory" | "gate-critical";
export type ContextSourceName =
  | "slots"
  | "profile"
  | "lessons"
  | "episodic"
  | "file_history";
type ContextSourceStatus = "ok" | "unavailable" | "failed";

export interface ContextEligibilityExclusion {
  source: ContextSourceName;
  candidateId?: string;
  reason: ContextEligibilityReason;
}

export interface ContextSourcePolicy {
  source: ContextSourceName;
  advisory: "optional";
  gateCritical: "required" | "optional";
}

export const CONTEXT_SOURCE_POLICIES: Readonly<
  Record<ContextSourceName, ContextSourcePolicy>
> = {
  slots: { source: "slots", advisory: "optional", gateCritical: "optional" },
  profile: {
    source: "profile",
    advisory: "optional",
    gateCritical: "optional",
  },
  lessons: {
    source: "lessons",
    advisory: "optional",
    gateCritical: "required",
  },
  episodic: {
    source: "episodic",
    advisory: "optional",
    gateCritical: "required",
  },
  file_history: {
    source: "file_history",
    advisory: "optional",
    gateCritical: "required",
  },
};

interface ContextSourceOutcome {
  source: ContextSourceName;
  status: ContextSourceStatus;
  required: boolean;
  itemCount: number;
  error?: string;
}

interface ContextPacketRecord {
  kind: "context_packet";
  packetId: string;
  project: string;
  sessionId: string;
  sourceIds: string[];
  contextSha256: string;
  nonce: string;
  generatedAt: string;
  expiresAt: string;
}

interface ContextAcknowledgement {
  kind: "context_acknowledgement";
  packetId: string;
  project: string;
  sessionId: string;
  sourceIds: string[];
  providerReceiptHash: string;
  providerId: string;
  receiptId: string;
  acknowledgedAt: string;
}

export interface ContextDeliveryVerification {
  verified: boolean;
  providerId?: string;
  receiptId?: string;
  error?: string;
}

export type ContextDeliveryVerifier = (input: {
  providerReceipt: string;
  packetId: string;
  project: string;
  sessionId: string;
  sourceIds: string[];
  contextSha256: string;
  nonce: string;
  generatedAt: string;
  expiresAt: string;
}) => Promise<ContextDeliveryVerification>;

export interface SignedContextDeliveryClaims {
  version: 1;
  audience: "agentmemory:context-delivery";
  packetId: string;
  project: string;
  sessionId: string;
  contextSha256: string;
  nonce: string;
  expiresAt: string;
  providerId: string;
  receiptId: string;
}

interface SourceRead<T> {
  value: T;
  outcome: ContextSourceOutcome;
}

const PACKET_TTL_MS = 5 * 60 * 1000;
const CONTEXT_DELIVERY_RECEIPT_VERSION = "amack1";
const PROFILE_QUERY_STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "into",
  "local",
  "project",
  "runtime",
  "the",
  "this",
  "with",
]);

function profileForQuery(
  profile: ProjectProfile,
  query: string,
): ProjectProfile | null {
  const terms = (query.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) ?? [])
    .filter((term) => term.length >= 3 && !PROFILE_QUERY_STOP_WORDS.has(term));
  if (terms.length === 0) return profile;
  const matches = (value: string) => {
    const normalized = value.toLowerCase();
    return terms.some((term) => normalized.includes(term));
  };
  const topConcepts = profile.topConcepts.filter((item) => matches(item.concept));
  const topFiles = profile.topFiles.filter((item) => matches(item.file));
  const conventions = profile.conventions.filter(matches);
  if (
    topConcepts.length === 0 &&
    topFiles.length === 0 &&
    conventions.length === 0
  ) {
    return null;
  }
  return { ...profile, topConcepts, topFiles, conventions };
}

const EPISODIC_DEDUP_STOP_WORDS = new Set([
  "and",
  "for",
  "from",
  "into",
  "local",
  "the",
  "this",
  "with",
]);
const CURRENTNESS_QUERY_PATTERN =
  /\b(?:authoritative|current|latest|live|now|today)\b/i;

function contextTerms(value: string): Set<string> {
  return new Set(
    (value.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) ?? []).filter(
      (term) =>
        term.length >= 3 && !EPISODIC_DEDUP_STOP_WORDS.has(term),
    ),
  );
}

function lessonQueryScore(lesson: Lesson, queryTerms: Set<string>): number {
  if (queryTerms.size === 0) return 0;
  const tags = Array.isArray(lesson.tags) ? lesson.tags : [];
  const lessonTerms = contextTerms(
    `${lesson.content} ${lesson.context ?? ""} ${tags.join(" ")}`,
  );
  let shared = 0;
  for (const term of queryTerms) {
    if (lessonTerms.has(term)) shared += 1;
  }
  return shared / queryTerms.size;
}

function observationTimestamp(row: Record<string, unknown>): number | null {
  const observation =
    row.observation && typeof row.observation === "object"
      ? (row.observation as Record<string, unknown>)
      : row;
  const timestamp = String(observation.timestamp ?? row.timestamp ?? "");
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function episodicSourceId(
  row: Record<string, unknown>,
): string | undefined {
  if (typeof row.obsId === "string") return row.obsId;
  if (
    row.observation &&
    typeof row.observation === "object" &&
    typeof (row.observation as Record<string, unknown>).id === "string"
  ) {
    return (row.observation as Record<string, unknown>).id as string;
  }
  return undefined;
}

function hasStructuredEpisodicEvidence(
  row: Record<string, unknown>,
): boolean {
  const observation =
    row.observation && typeof row.observation === "object"
      ? (row.observation as Record<string, unknown>)
      : row;
  const confidence = observation.confidence;
  if (typeof confidence !== "number" || confidence >= 0.5) return true;
  for (const key of ["facts", "concepts", "files"] as const) {
    if (Array.isArray(observation[key]) && observation[key].length > 0) {
      return true;
    }
  }
  return /(?:error|failure|commit|decision|migration|task_completed)/i.test(
    String(observation.type ?? ""),
  );
}

function episodicTokenSet(row: Record<string, unknown>): Set<string> {
  const observation =
    row.observation && typeof row.observation === "object"
      ? (row.observation as Record<string, unknown>)
      : row;
  const text = `${String(observation.title ?? "")} ${String(
    observation.narrative ?? "",
  )}`.toLowerCase();
  const tokens = text.match(/[a-z0-9][a-z0-9._-]*/g) ?? [];
  return new Set(
    tokens
      .map((token) => token.replace(/[-_]?\d{6,}[a-z0-9-]*/g, ""))
      .filter(
        (token) =>
          token.length >= 3 && !EPISODIC_DEDUP_STOP_WORDS.has(token),
      ),
  );
}

function episodicSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size < 6 || b.size < 6) return 0;
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  return shared / (a.size + b.size - shared);
}

function deduplicateEpisodicRows(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const selected: Array<{ row: Record<string, unknown>; tokens: Set<string> }> = [];
  for (const row of rows) {
    const tokens = episodicTokenSet(row);
    if (
      selected.some(
        (candidate) => episodicSimilarity(tokens, candidate.tokens) >= 0.8,
      )
    ) {
      continue;
    }
    selected.push({ row, tokens });
  }
  return selected.map((item) => item.row);
}

export class DeliveryLedgerError extends Error {
  readonly code = "delivery_ledger_unavailable";

  constructor(
    readonly operation: "read" | "list" | "write",
    cause: unknown,
  ) {
    super(`delivery ledger ${operation} failed: ${errorMessage(cause)}`);
    this.name = "DeliveryLedgerError";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function receiptHash(providerReceipt: string): string {
  return createHash("sha256").update(providerReceipt).digest("hex");
}

function sourceRequired(
  source: ContextSourceName,
  contextClass: ContextClass,
  requested = true,
): boolean {
  return (
    requested &&
    contextClass === "gate-critical" &&
    CONTEXT_SOURCE_POLICIES[source].gateCritical === "required"
  );
}

function selectEligible<T>(
  source: ContextSourceName,
  candidates: T[],
  contextClass: ContextClass,
  toRecord: (candidate: T) => Record<string, unknown>,
  candidateId: (candidate: T) => string | undefined,
  exclusions: ContextEligibilityExclusion[],
  now: number,
): T[] {
  const eligible: T[] = [];
  for (const candidate of candidates) {
    const id = candidateId(candidate);
    const decision = evaluateContextCandidate(toRecord(candidate), {
      contextClass,
      candidateId: id,
      now,
    });
    if (decision.eligible) {
      eligible.push(candidate);
    } else {
      exclusions.push({
        source,
        ...(id ? { candidateId: id } : {}),
        reason: decision.reason ?? "provenance_missing",
      });
    }
  }
  return eligible;
}

function deliveryReceiptSignature(
  encodedClaims: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${CONTEXT_DELIVERY_RECEIPT_VERSION}.${encodedClaims}`)
    .digest("base64url");
}

export function createSignedContextDeliveryReceipt(
  claims: SignedContextDeliveryClaims,
  secret: string,
): string {
  if (!secret) throw new Error("context acknowledgement secret is required");
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${CONTEXT_DELIVERY_RECEIPT_VERSION}.${encoded}.${deliveryReceiptSignature(encoded, secret)}`;
}

export function createSignedContextDeliveryVerifier(
  secret: string | undefined,
): ContextDeliveryVerifier {
  return async (input) => {
    if (!secret) {
      return {
        verified: false,
        error: "context acknowledgement verification is unavailable",
      };
    }
    const parts = input.providerReceipt.split(".");
    if (
      parts.length !== 3 ||
      parts[0] !== CONTEXT_DELIVERY_RECEIPT_VERSION ||
      !timingSafeCompare(
        parts[2],
        deliveryReceiptSignature(parts[1], secret),
      )
    ) {
      return { verified: false, error: "invalid context acknowledgement" };
    }
    let claims: SignedContextDeliveryClaims;
    try {
      claims = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      ) as SignedContextDeliveryClaims;
    } catch {
      return { verified: false, error: "invalid context acknowledgement" };
    }
    if (
      claims.version !== 1 ||
      claims.audience !== "agentmemory:context-delivery" ||
      claims.packetId !== input.packetId ||
      claims.project !== input.project ||
      claims.sessionId !== input.sessionId ||
      claims.contextSha256 !== input.contextSha256 ||
      claims.nonce !== input.nonce ||
      claims.expiresAt !== input.expiresAt ||
      typeof claims.providerId !== "string" ||
      !claims.providerId.trim() ||
      typeof claims.receiptId !== "string" ||
      !claims.receiptId.trim()
    ) {
      return {
        verified: false,
        error: "context acknowledgement does not match packet",
      };
    }
    if (Date.now() > new Date(claims.expiresAt).getTime()) {
      return { verified: false, error: "context acknowledgement has expired" };
    }
    return {
      verified: true,
      providerId: claims.providerId.trim(),
      receiptId: claims.receiptId.trim(),
    };
  };
}

async function readSource<T>(
  source: ContextSourceName,
  required: boolean,
  fallback: T,
  read: () => Promise<T>,
  itemCount: (value: T) => number,
): Promise<SourceRead<T>> {
  try {
    const value = await read();
    const count = itemCount(value);
    return {
      value,
      outcome: {
        source,
        required,
        status: count > 0 ? "ok" : "unavailable",
        itemCount: count,
      },
    };
  } catch (error) {
    return {
      value: fallback,
      outcome: {
        source,
        required,
        status: "failed",
        itemCount: 0,
        error: errorMessage(error),
      },
    };
  }
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 3);
}

function fit(value: string, tokenBudget: number): string {
  if (estimateTokens(value) <= tokenBudget) return value;
  return `${value.slice(0, Math.max(0, tokenBudget * 3 - 18))}\n[truncated]`;
}

function percentile95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

function normalizedConcept(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function listAcknowledgedSourceIds(
  kv: StateKV,
  sessionId: string,
): Promise<Set<string>> {
  const scope = KV.injectedSources(sessionId);
  let records: ContextAcknowledgement[];
  try {
    records = await kv.list<ContextAcknowledgement>(scope);
  } catch (error) {
    throw new DeliveryLedgerError("list", error);
  }
  const sourceIds = new Set<string>();
  for (const record of records) {
    if (
      record.kind !== "context_acknowledgement" ||
      record.sessionId !== sessionId
    ) {
      continue;
    }
    for (const sourceId of record.sourceIds) sourceIds.add(sourceId);
  }
  return sourceIds;
}

async function ledgerGet<T>(
  kv: StateKV,
  scope: string,
  key: string,
): Promise<T | null> {
  try {
    return await kv.get<T>(scope, key);
  } catch (error) {
    throw new DeliveryLedgerError("read", error);
  }
}

async function ledgerSet<T>(
  kv: StateKV,
  scope: string,
  key: string,
  value: T,
): Promise<T> {
  try {
    return await kv.set(scope, key, value);
  } catch (error) {
    throw new DeliveryLedgerError("write", error);
  }
}

export function registerCodingMemoryFunctions(
  sdk: ISdk,
  kv: StateKV,
  verifyDelivery?: ContextDeliveryVerifier,
): void {
  sdk.registerFunction(
    "mem::context-packet",
    async (data: {
      project?: string;
      sessionId?: string;
      query?: string;
      files?: string[];
      token_budget?: number;
      context_class?: ContextClass;
    }) => {
      const started = Date.now();
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      const sessionId =
        typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
      if (!project || !sessionId) {
        return { success: false, error: "project and sessionId are required" };
      }
      if (
        data.context_class !== undefined &&
        data.context_class !== "advisory" &&
        data.context_class !== "gate-critical"
      ) {
        return {
          success: false,
          error: "context_class must be advisory or gate-critical",
        };
      }
      const session = await kv.get<Session>(KV.sessions, sessionId);
      if (!session || session.project !== project) {
        return { success: false, error: "session does not belong to project" };
      }

      const requestedBudget =
        typeof data.token_budget === "number" &&
        Number.isInteger(data.token_budget)
          ? data.token_budget
          : 2000;
      const totalBudget = Math.min(2000, Math.max(1, requestedBudget));
      const scale = totalBudget / 2000;
      const budgets = {
        identity: Math.floor(300 * scale),
        lessons: Math.floor(400 * scale),
        episodic: Math.floor(700 * scale),
        files: Math.floor(400 * scale),
        provenance: Math.max(1, Math.floor(200 * scale)),
      };
      const files = Array.isArray(data.files)
        ? data.files.filter(
            (file): file is string =>
              typeof file === "string" && Boolean(file.trim()),
          )
        : [];
      const query =
        typeof data.query === "string" && data.query.trim()
          ? data.query.trim()
          : files.join(" ") || project;
      const hasExplicitProfileQuery =
        (typeof data.query === "string" && Boolean(data.query.trim())) ||
        files.length > 0;
      const contextClass: ContextClass =
        data.context_class === "gate-critical" ? "gate-critical" : "advisory";
      const eligibilityExclusions: ContextEligibilityExclusion[] = [];
      const eligibilityNow = Date.now();

      const [slotsRead, profileRead, lessonsRead, episodicRead, fileRead] =
        await Promise.all([
          isSlotsEnabled()
            ? readSource(
                "slots",
                sourceRequired("slots", contextClass),
                [] as MemorySlot[],
                () => listPinnedSlots(kv, project),
                (items) => items.length,
              )
            : Promise.resolve<SourceRead<MemorySlot[]>>({
                value: [],
                outcome: {
                  source: "slots",
                  required: sourceRequired("slots", contextClass),
                  status: "unavailable",
                  itemCount: 0,
                  error: "slots are disabled",
                },
              }),
          readSource(
            "profile",
            sourceRequired("profile", contextClass),
            null as ProjectProfile | null,
            async () => {
              const result = await sdk.trigger({
                function_id: "mem::profile",
                payload: { project },
              });
              if (!result || typeof result !== "object" || !("profile" in result)) {
                throw new Error("project profile returned an invalid response");
              }
              return (result as { profile: ProjectProfile | null }).profile;
            },
            (value) => (value ? 1 : 0),
          ),
          readSource(
            "lessons",
            sourceRequired("lessons", contextClass),
            [] as Lesson[],
            async () =>
              (await kv.list<Lesson>(KV.lessons))
                .filter((lesson) => lesson.project === project),
            (items) => items.length,
          ),
          readSource(
            "episodic",
            sourceRequired("episodic", contextClass),
            { results: [] } as { results: Array<Record<string, unknown>> },
            async () => {
              const result = await sdk.trigger({
                function_id: "mem::search",
                payload: {
                  query,
                  project,
                  limit: 20,
                  format: "full",
                },
              });
              if (
                !result ||
                typeof result !== "object" ||
                !Array.isArray((result as { results?: unknown[] }).results)
              ) {
                throw new Error("episodic search returned an invalid response");
              }
              return result as {
                results: Array<Record<string, unknown>>;
              };
            },
            (value) => value.results.length,
          ),
          files.length > 0
            ? readSource(
                "file_history",
                sourceRequired("file_history", contextClass, true),
                { context: "", sourceIds: [] } as {
                  context: string;
                  sourceIds: string[];
                  outcome?: {
                    status?: ContextSourceStatus;
                    error?: string;
                  };
                },
                async () => {
                  const result = await sdk.trigger({
                    function_id: "mem::file-context",
                    payload: { project, sessionId, files },
                  });
                  if (!result || typeof result !== "object") {
                    throw new Error("file context returned an invalid response");
                  }
                  const typed = result as {
                    context?: unknown;
                    sourceIds?: unknown[];
                    outcome?: {
                      status?: ContextSourceStatus;
                      error?: string;
                    };
                  };
                  if (typed.outcome?.status === "failed") {
                    throw new Error(
                      typed.outcome.error ?? "file context source failed",
                    );
                  }
                  return {
                    context:
                      typeof typed.context === "string" ? typed.context : "",
                    sourceIds: Array.isArray(typed.sourceIds)
                      ? typed.sourceIds.filter(
                          (id): id is string => typeof id === "string",
                        )
                      : [],
                    outcome: typed.outcome,
                  };
                },
                (value) => value.sourceIds.length,
              )
            : Promise.resolve({
                value: { context: "", sourceIds: [] },
                outcome: {
                  source: "file_history" as const,
                  required: false,
                  status: "unavailable" as const,
                  itemCount: 0,
                  error: "no files requested",
                },
              }),
        ]);

      const slots = slotsRead.value;
      const eligibleSlots = selectEligible(
        "slots",
        slots,
        contextClass,
        (slot) => slot as unknown as Record<string, unknown>,
        (slot) => `slot:${project}:${slot.label}:${slot.updatedAt}`,
        eligibilityExclusions,
        eligibilityNow,
      );
      const queryProfile = profileRead.value
        ? hasExplicitProfileQuery
          ? profileForQuery(profileRead.value, query)
          : profileRead.value
        : null;
      const profileCandidates = queryProfile ? [queryProfile] : [];
      const eligibleProfiles = selectEligible(
        "profile",
        profileCandidates,
        contextClass,
        (profile) => profile as unknown as Record<string, unknown>,
        (profile) => `profile:${project}:${profile.updatedAt}`,
        eligibilityExclusions,
        eligibilityNow,
      );
      const profile = eligibleProfiles[0] ?? null;
      const eligibleLessons = selectEligible(
        "lessons",
        lessonsRead.value,
        contextClass,
        (lesson) => lesson as unknown as Record<string, unknown>,
        (lesson) => lesson.id,
        eligibilityExclusions,
        eligibilityNow,
      );
      const queryTermSet = contextTerms(query);
      const scoredLessons = eligibleLessons.map((lesson) => ({
        lesson,
        score: hasExplicitProfileQuery
          ? lessonQueryScore(lesson, queryTermSet)
          : 0,
      }));
      const hasRelevantLesson = scoredLessons.some((item) => item.score > 0);
      const projectLessons = scoredLessons
        .filter(
          (item) =>
            !hasExplicitProfileQuery || !hasRelevantLesson || item.score > 0,
        )
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.lesson.confidence - a.lesson.confidence,
        )
        .slice(0, 5)
        .map((item) => item.lesson);
      const verifiedLessonCutoff = CURRENTNESS_QUERY_PATTERN.test(query)
        ? projectLessons.reduce<number | null>((latest, lesson) => {
            if (
              lesson.confidence < 0.8 ||
              !Array.isArray(lesson.tags) ||
              !lesson.tags.some((tag) => tag.toLowerCase() === "verified")
            ) {
              return latest;
            }
            const createdAt = new Date(lesson.createdAt).getTime();
            if (!Number.isFinite(createdAt)) return latest;
            return latest === null ? createdAt : Math.max(latest, createdAt);
          }, null)
        : null;
      const eligibleSearchRows = selectEligible(
        "episodic",
        episodicRead.value.results,
        contextClass,
        (row) => {
          const observation =
            row.observation && typeof row.observation === "object"
              ? (row.observation as Record<string, unknown>)
              : {};
          return { ...row, ...observation };
        },
        episodicSourceId,
        eligibilityExclusions,
        eligibilityNow,
      );
      const rankedSearchRows = eligibleSearchRows
        .filter((row) => {
          if (verifiedLessonCutoff === null) return true;
          const timestamp = observationTimestamp(row);
          const observation =
            row.observation && typeof row.observation === "object"
              ? (row.observation as Record<string, unknown>)
              : row;
          const candidateId =
            typeof row.obsId === "string"
              ? row.obsId
              : typeof observation.id === "string"
                ? observation.id
                : undefined;
          if (timestamp !== null && timestamp >= verifiedLessonCutoff) {
            if (hasStructuredEpisodicEvidence(row)) return true;
            eligibilityExclusions.push({
              source: "episodic",
              ...(candidateId ? { candidateId } : {}),
              reason: "low_signal_after_verified_lesson",
            });
            return false;
          }
          eligibilityExclusions.push({
            source: "episodic",
            ...(candidateId ? { candidateId } : {}),
            reason: "stale_against_verified_lesson",
          });
          return false;
        })
        .sort(
          (a, b) =>
            (typeof b.score === "number" ? b.score : 0) -
            (typeof a.score === "number" ? a.score : 0),
        );
      const searchRows = deduplicateEpisodicRows(rankedSearchRows).slice(0, 5);
      const fileResult = fileRead.value;
      const eligibleFileSourceIds = selectEligible(
        "file_history",
        fileResult.sourceIds,
        contextClass,
        () => ({}),
        (id) => id,
        eligibilityExclusions,
        eligibilityNow,
      );
      fileResult.sourceIds = eligibleFileSourceIds;
      for (const [read, count] of [
        [slotsRead, eligibleSlots.length],
        [profileRead, profile ? 1 : 0],
        [lessonsRead, projectLessons.length],
        [episodicRead, searchRows.length],
        [fileRead, eligibleFileSourceIds.length],
      ] as Array<[SourceRead<unknown>, number]>) {
        if (read.outcome.status !== "failed") {
          read.outcome.itemCount = count;
          read.outcome.status = count > 0 ? "ok" : "unavailable";
        }
      }
      const sourceOutcomes: ContextSourceOutcome[] = [
        slotsRead.outcome,
        profileRead.outcome,
        lessonsRead.outcome,
        episodicRead.outcome,
        fileRead.outcome,
      ];
      const incompleteSources = sourceOutcomes.filter(
        (outcome) => outcome.status !== "ok",
      );
      const failedRequiredSources = incompleteSources.filter(
        (outcome) => outcome.required,
      );
      const status =
        failedRequiredSources.length > 0
          ? "failed"
          : incompleteSources.length > 0
            ? "degraded"
            : "ok";
      const completeness = {
        complete: incompleteSources.length === 0,
        available: sourceOutcomes
          .filter((outcome) => outcome.status === "ok")
          .map((outcome) => outcome.source),
        unavailable: sourceOutcomes
          .filter((outcome) => outcome.status === "unavailable")
          .map((outcome) => outcome.source),
        failed: sourceOutcomes
          .filter((outcome) => outcome.status === "failed")
          .map((outcome) => outcome.source),
      };

      if (status === "failed") {
        return {
          success: false,
          status,
          contextClass,
          context: "",
          tokens: 0,
          sourceIds: [],
          sources: sourceOutcomes,
          completeness,
          eligibility: { excluded: eligibilityExclusions },
          error: "required context sources are incomplete",
        };
      }

      const selectedSourceIds: string[] = [];
      const sections: string[] = [];
      const slotSources = eligibleSlots.map(
        (slot) => `slot:${project}:${slot.label}:${slot.updatedAt}`,
      );
      const profileSource = profile
        ? `profile:${project}:${profile.updatedAt}`
        : undefined;
      const episodicSourceIds = searchRows
        .map(episodicSourceId)
        .filter((id): id is string => Boolean(id));
      const candidateSourceIds = [
        ...slotSources,
        ...(profileSource ? [profileSource] : []),
        ...projectLessons.map((lesson) => lesson.id),
        ...episodicSourceIds,
        ...eligibleFileSourceIds,
      ];
      const acknowledgedSourceIds =
        candidateSourceIds.length > 0
          ? await listAcknowledgedSourceIds(kv, sessionId)
          : new Set<string>();
      const freshSlotSources = slotSources.filter(
        (sourceId) => !acknowledgedSourceIds.has(sourceId),
      );
      const profileIsFresh =
        profileSource &&
        !acknowledgedSourceIds.has(profileSource);
      if (freshSlotSources.length > 0 || profileIsFresh) {
        const identityParts: string[] = [];
        const pinned = renderPinnedContext(eligibleSlots);
        if (pinned && freshSlotSources.length > 0) identityParts.push(pinned);
        if (profile && profileSource && profileIsFresh) {
          const profileLines = ["# project profile"];
          if (profile.topConcepts.length > 0) {
            profileLines.push(
              `Concepts: ${profile.topConcepts
                .slice(0, 8)
                .map((item) => item.concept)
                .join(", ")}`,
            );
          }
          if (profile.topFiles.length > 0) {
            profileLines.push(
              `Files: ${profile.topFiles
                .slice(0, 5)
                .map((item) => item.file)
                .join(", ")}`,
            );
          }
          if (profile.conventions.length > 0) {
            profileLines.push(`Conventions: ${profile.conventions.join("; ")}`);
          }
          identityParts.push(
            profileLines.join("\n"),
          );
          selectedSourceIds.push(profileSource);
        }
        if (identityParts.length > 0) {
          sections.push(fit(identityParts.join("\n\n"), budgets.identity));
          selectedSourceIds.push(...freshSlotSources);
        }
      }

      const freshLessons = projectLessons.filter(
        (lesson) => !acknowledgedSourceIds.has(lesson.id),
      );
      if (freshLessons.length > 0) {
        sections.push(
          fit(
            `# verified lessons\n${freshLessons
              .map(
                (lesson) =>
                  `- (${lesson.confidence.toFixed(2)}) ${lesson.content}`,
              )
              .join("\n")}`,
            budgets.lessons,
          ),
        );
        selectedSourceIds.push(...freshLessons.map((lesson) => lesson.id));
      }

      const freshRows: Array<Record<string, unknown>> = [];
      for (const row of searchRows) {
        const sourceId = episodicSourceId(row);
        if (sourceId && !acknowledgedSourceIds.has(sourceId)) {
          freshRows.push(row);
          selectedSourceIds.push(sourceId);
        }
      }
      if (freshRows.length > 0) {
        const lines = freshRows.map((row) => {
          const observation =
            row.observation && typeof row.observation === "object"
              ? (row.observation as Record<string, unknown>)
              : row;
          return `- ${String(observation.title ?? "memory")}: ${String(
            observation.narrative ?? "",
          )}`;
        });
        sections.push(
          fit(`# relevant history\n${lines.join("\n")}`, budgets.episodic),
        );
      }

      const fileContext =
        fileResult &&
        typeof fileResult === "object" &&
        typeof (fileResult as { context?: unknown }).context === "string"
          ? (fileResult as { context: string }).context
          : "";
      const fileSourceIds =
        fileResult &&
        typeof fileResult === "object" &&
        Array.isArray((fileResult as { sourceIds?: unknown[] }).sourceIds)
          ? (fileResult as { sourceIds: unknown[] }).sourceIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [];
      const freshFileSources = fileSourceIds.filter(
        (id) => !acknowledgedSourceIds.has(id),
      );
      if (fileContext && freshFileSources.length > 0) {
        sections.push(fit(fileContext, budgets.files));
        selectedSourceIds.push(...freshFileSources);
      }

      const uniqueSourceIds = Array.from(new Set(selectedSourceIds));
      if (uniqueSourceIds.length > 0) {
        sections.push(
          fit(
            `# provenance\nproject: ${project}\nsources: ${uniqueSourceIds.join(", ")}`,
            budgets.provenance,
          ),
        );
      }

      const opening = `<agentmemory-context project="${escapeXmlAttribute(project)}">\n`;
      const closing = "\n</agentmemory-context>";
      const wrapperTokens = estimateTokens(opening + closing);
      const body = fit(
        sections.join("\n\n"),
        Math.max(1, totalBudget - wrapperTokens),
      );
      const context = body
        ? `${opening}${body}${closing}`
        : "";
      const latencyMs = Date.now() - started;
      const generatedAt = new Date().toISOString();
      const packetId = generateId("ctxpkt");
      const packet: ContextPacketRecord = {
        kind: "context_packet",
        packetId,
        project,
        sessionId,
        sourceIds: uniqueSourceIds,
        contextSha256: receiptHash(context),
        nonce: generateId("ctxnonce"),
        generatedAt,
        expiresAt: new Date(Date.now() + PACKET_TTL_MS).toISOString(),
      };
      await ledgerSet(
        kv,
        KV.injectedSources(sessionId),
        `packet:${packetId}`,
        packet,
      );
      await withKeyedLock(`metrics:${project}`, async () => {
        const prior =
          (await kv.get<InjectionMetrics>(
            KV.projectMetrics(project),
            "injection",
          )) ?? { samplesMs: [], packetCount: 0, lastAt: "" };
        prior.samplesMs.push(latencyMs);
        prior.samplesMs = prior.samplesMs.slice(-200);
        prior.packetCount += 1;
        prior.lastAt = new Date().toISOString();
        await kv.set(KV.projectMetrics(project), "injection", prior);
      });
      return {
        success: true,
        status,
        contextClass,
        context,
        tokens: estimateTokens(context),
        packetId,
        expiresAt: packet.expiresAt,
        nonce: packet.nonce,
        contextSha256: packet.contextSha256,
        sourceIds: uniqueSourceIds,
        sources: sourceOutcomes,
        completeness,
        eligibility: { excluded: eligibilityExclusions },
        latencyMs,
      };
    },
  );

  sdk.registerFunction(
    "mem::context-acknowledge",
    async (data: {
      project?: string;
      sessionId?: string;
      packetId?: string;
      providerReceipt?: string;
    }) => {
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      const sessionId =
        typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
      const packetId =
        typeof data?.packetId === "string" ? data.packetId.trim() : "";
      const providerReceipt =
        typeof data?.providerReceipt === "string"
          ? data.providerReceipt.trim()
          : "";
      if (!project || !sessionId || !packetId || !providerReceipt) {
        return {
          success: false,
          error:
            "project, sessionId, packetId, and providerReceipt are required",
        };
      }
      if (providerReceipt.length > 1024) {
        return { success: false, error: "providerReceipt is too long" };
      }
      const session = await kv.get<Session>(KV.sessions, sessionId);
      if (!session || session.project !== project) {
        return { success: false, error: "session does not belong to project" };
      }

      try {
        return await withKeyedLock(
          `context-ack:${sessionId}:${packetId}`,
          async () => {
            const scope = KV.injectedSources(sessionId);
            const providerReceiptHash = receiptHash(providerReceipt);
            const existing = await ledgerGet<ContextAcknowledgement>(
              kv,
              scope,
              `ack:${packetId}`,
            );
            if (existing) {
              if (
                existing.project !== project ||
                existing.sessionId !== sessionId ||
                existing.providerReceiptHash !== providerReceiptHash
              ) {
                return {
                  success: false,
                  error: "acknowledgement does not match the recorded delivery",
                };
              }
              return {
                success: true,
                acknowledged: true,
                idempotent: true,
                packetId,
                sourceIds: existing.sourceIds,
                acknowledgedAt: existing.acknowledgedAt,
              };
            }

            const packet = await ledgerGet<ContextPacketRecord>(
              kv,
              scope,
              `packet:${packetId}`,
            );
            if (!packet) {
              return { success: false, error: "context packet not found" };
            }
            if (
              packet.project !== project ||
              packet.sessionId !== sessionId ||
              packet.packetId !== packetId
            ) {
              return {
                success: false,
                error: "context packet does not belong to project and session",
              };
            }
            if (Date.now() > new Date(packet.expiresAt).getTime()) {
              return { success: false, error: "context packet has expired" };
            }
            if (!verifyDelivery) {
              return {
                success: false,
                acknowledged: false,
                error:
                  "trusted provider delivery verification is unavailable; source suppression denied",
              };
            }
            const verification = await verifyDelivery({
              providerReceipt,
              packetId,
              project,
              sessionId,
              sourceIds: packet.sourceIds,
              contextSha256: packet.contextSha256,
              nonce: packet.nonce,
              generatedAt: packet.generatedAt,
              expiresAt: packet.expiresAt,
            });
            if (!verification.verified) {
              return {
                success: false,
                acknowledged: false,
                error:
                  verification.error ??
                  "provider delivery receipt failed verification",
              };
            }
            const providerId = verification.providerId?.trim();
            const receiptId = verification.receiptId?.trim();
            if (!providerId || !receiptId) {
              return {
                success: false,
                acknowledged: false,
                error:
                  "verified provider delivery evidence must include providerId and receiptId",
              };
            }
            const receiptClaim = await withKeyedLock(
              `context-receipt:${receiptId}`,
              async () => {
                const existingReceipt = await ledgerGet<{
                  packetId: string;
                  project: string;
                  sessionId: string;
                  providerId: string;
                  contextSha256: string;
                }>(kv, KV.contextDeliveryReceipts, receiptId);
                if (existingReceipt) {
                  return existingReceipt.packetId === packetId &&
                    existingReceipt.project === project &&
                    existingReceipt.sessionId === sessionId &&
                    existingReceipt.providerId === providerId &&
                    existingReceipt.contextSha256 === packet.contextSha256
                    ? "existing"
                    : "conflict";
                }
                await ledgerSet(kv, KV.contextDeliveryReceipts, receiptId, {
                  packetId,
                  project,
                  sessionId,
                  providerId,
                  contextSha256: packet.contextSha256,
                  claimedAt: new Date().toISOString(),
                });
                return "created";
              },
            );
            if (receiptClaim === "conflict") {
              return {
                success: false,
                acknowledged: false,
                error: "provider delivery receipt has already been used",
              };
            }

            const acknowledgedAt = new Date().toISOString();
            const acknowledgement: ContextAcknowledgement = {
              kind: "context_acknowledgement",
              packetId,
              project,
              sessionId,
              sourceIds: packet.sourceIds,
              providerReceiptHash,
              providerId,
              receiptId,
              acknowledgedAt,
            };
            await ledgerSet(kv, scope, `ack:${packetId}`, acknowledgement);
            await recordAudit(
              kv,
              "observe",
              "mem::context-acknowledge",
              [packetId],
              {
                project,
                sessionId,
                sourceCount: packet.sourceIds.length,
                acknowledgedAt,
                providerId,
                receiptId,
              },
            );
            return {
              success: true,
              acknowledged: true,
              idempotent: receiptClaim === "existing",
              packetId,
              sourceIds: packet.sourceIds,
              acknowledgedAt,
            };
          },
        );
      } catch (error) {
        if (error instanceof DeliveryLedgerError) {
          return {
            success: false,
            acknowledged: false,
            code: error.code,
            operation: error.operation,
            error: error.message,
          };
        }
        throw error;
      }
    },
  );

  sdk.registerFunction(
    "mem::commit-link",
    async (data: {
      sha?: string;
      sessionId?: string;
      project?: string;
      baseHeadSha?: string;
      worktreeId?: string;
      fileTransitions?: unknown;
    }) => {
      const rawSha = typeof data.sha === "string" ? data.sha.trim() : "";
      const project =
        typeof data.project === "string" ? data.project.trim() : "";
      const sessionId =
        typeof data.sessionId === "string" ? data.sessionId.trim() : undefined;
      const sha = parseGitObjectId(data.sha);
      const baseHeadSha = parseGitObjectId(data.baseHeadSha);
      const worktreeId = parseCredentialFreeWorktreeId(data.worktreeId);
      const fileTransitions = parseCommitProvenanceTransitions(
        data.fileTransitions,
      );
      if (!rawSha || !project) {
        return { success: false, error: "sha and project are required" };
      }
      if (!sha) {
        return {
          success: false,
          error: "sha must be a full Git object ID",
        };
      }
      if (baseHeadSha === null) {
        return {
          success: false,
          error: "baseHeadSha must be a full Git object ID",
        };
      }
      if (worktreeId === null) {
        return {
          success: false,
          error: "worktreeId must be a credential-free worktree ID",
        };
      }
      if (fileTransitions === null) {
        return {
          success: false,
          error: "fileTransitions must contain valid commit provenance",
        };
      }
      if (sessionId) {
        const session = await kv.get<Session>(KV.sessions, sessionId);
        if (!session || session.project !== project) {
          return {
            success: false,
            error: "session does not belong to project",
          };
        }
      }
      const link = await withKeyedLock(`commit:${sha}`, async () => {
        const existing = await kv.get<CommitLink>(KV.commits, sha);
        if (existing?.project && existing.project !== project) {
          throw new Error("commit is already linked to another project");
        }
        const sessionIds = new Set(existing?.sessionIds ?? []);
        if (sessionId) sessionIds.add(sessionId);
        const value: CommitLink = {
          ...(existing ?? {
            sha,
            shortSha: sha.slice(0, 7),
            linkedAt: new Date().toISOString(),
          }),
          project,
          baseHeadSha: baseHeadSha ?? existing?.baseHeadSha,
          worktreeId: worktreeId ?? existing?.worktreeId,
          fileTransitions: fileTransitions ?? existing?.fileTransitions,
          sessionIds: Array.from(sessionIds),
        };
        await kv.set(KV.commits, sha, value);
        return value;
      });
      if (sessionId) {
        const session = await kv.get<Session>(KV.sessions, sessionId);
        if (session) {
          session.commitShas = Array.from(
            new Set([...(session.commitShas ?? []), sha]),
          );
          await kv.set(KV.sessions, sessionId, session);
        }
      }
      return { success: true, commit: link };
    },
  );

  sdk.registerFunction(
    "mem::project-health",
    async (data: { project?: string }) => {
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      if (!project) return { success: false, error: "project is required" };
      const [
        allSessions,
        allMemories,
        allLessons,
        allInsights,
        accesses,
        metrics,
        promotions,
        allCommits,
      ] = await Promise.all([
        kv.list<Session>(KV.sessions),
        kv.list<Memory>(KV.memories),
        kv.list<Lesson>(KV.lessons),
        kv.list<Insight>(KV.insights),
        kv.list<AccessLog>(KV.accessLog),
        kv.get<InjectionMetrics>(KV.projectMetrics(project), "injection"),
        kv.list<PromotionCandidate>(KV.promotionCandidates(project)),
        kv.list<CommitLink>(KV.commits),
      ]);
      const sessions = allSessions.filter(
        (session) => session.project === project,
      );
      const memories = allMemories.filter(
        (memory) => memory.project === project,
      );
      const lessons = allLessons.filter(
        (lesson) => lesson.project === project,
      );
      const insights = allInsights.filter(
        (insight) => insight.project === project,
      );
      const sourceIds = new Set([
        ...memories.map((memory) => memory.id),
        ...lessons.map((lesson) => lesson.id),
        ...insights.map((insight) => insight.id),
      ]);
      const retrievalUse = accesses
        .filter((entry) => sourceIds.has(entry.memoryId))
        .reduce((sum, entry) => sum + entry.count, 0);
      const concepts = new Map<string, number>();
      for (const value of [
        ...memories.map((memory) => memory.content),
        ...lessons.map((lesson) => lesson.content),
        ...insights.map((insight) => insight.content),
      ]) {
        const normalized = normalizedConcept(value);
        if (normalized) {
          concepts.set(normalized, (concepts.get(normalized) ?? 0) + 1);
        }
      }
      const duplicates = Array.from(concepts.values()).reduce(
        (sum, count) => sum + Math.max(0, count - 1),
        0,
      );
      const substantive = sessions.filter(
        (session) => session.observationCount > 0,
      );
      const projectCommits = allCommits.filter(
        (commit) => commit.project === project,
      );
      const linkedSessionIds = new Set(
        projectCommits.flatMap((commit) => commit.sessionIds ?? []),
      );
      const richProvenanceSessionIds = new Set(
        projectCommits
          .filter((commit) => hasRichCommitProvenance(commit))
          .flatMap((commit) => commit.sessionIds ?? []),
      );
      const linkedSessions = substantive.filter(
        (session) => linkedSessionIds.has(session.id),
      );
      const richProvenanceSessions = substantive.filter((session) =>
        richProvenanceSessionIds.has(session.id),
      );
      const scopedRecords =
        sessions.length + memories.length + lessons.length + insights.length;
      const projectSessionIds = new Set(sessions.map((session) => session.id));
      const projectMemoryIds = new Set(memories.map((memory) => memory.id));
      const projectLessonIds = new Set(lessons.map((lesson) => lesson.id));
      const unscopedMemories = allMemories.filter((memory) => !memory.project);
      const unscopedLessons = allLessons.filter((lesson) => !lesson.project);
      const unscopedInsights = allInsights.filter((insight) => !insight.project);
      const attributableUnscopedMemories = unscopedMemories.filter((memory) =>
        (memory.sessionIds ?? []).some((sessionId) =>
          projectSessionIds.has(sessionId),
        ),
      );
      for (const memory of attributableUnscopedMemories) {
        projectMemoryIds.add(memory.id);
      }
      const attributableUnscopedLessons = unscopedLessons.filter((lesson) =>
        (lesson.sourceIds ?? []).some(
          (sourceId) =>
            projectSessionIds.has(sourceId) || projectMemoryIds.has(sourceId),
        ),
      );
      for (const lesson of attributableUnscopedLessons) {
        projectLessonIds.add(lesson.id);
      }
      const attributableUnscopedInsights = unscopedInsights.filter(
        (insight) =>
          (insight.sourceMemoryIds ?? []).some((id) =>
            projectMemoryIds.has(id),
          ) ||
          (insight.sourceLessonIds ?? []).some((id) =>
            projectLessonIds.has(id),
          ),
      );
      const projectUnscopedRecords =
        attributableUnscopedMemories.length +
        attributableUnscopedLessons.length +
        attributableUnscopedInsights.length;
      const eligibleRecords =
        scopedRecords + projectUnscopedRecords;
      const promoted = promotions.filter(
        (candidate) =>
          candidate.status === "accepted" ||
          candidate.status === "auto_promoted",
      );
      return {
        success: true,
        project,
        scopeCoverage:
          eligibleRecords > 0 ? scopedRecords / eligibleRecords : 1,
        projectUnscopedRecords,
        globalUnscopedRecords:
          unscopedMemories.length +
          unscopedLessons.length +
          unscopedInsights.length,
        retrievalUse,
        duplicates,
        duplicateRate:
          memories.length + lessons.length + insights.length > 0
            ? duplicates /
              (memories.length + lessons.length + insights.length)
            : 0,
        abandonedSessions: sessions.filter(
          (session) => session.status === "abandoned",
        ).length,
        promotionCount: promoted.length,
        pendingPromotions: promotions.filter(
          (candidate) => candidate.status === "pending",
        ).length,
        injectionLatencyP95Ms: percentile95(metrics?.samplesMs ?? []),
        contextPackets: metrics?.packetCount ?? 0,
        commitCoverage:
          substantive.length > 0
            ? linkedSessions.length / substantive.length
            : 1,
        commitCoverageDetails: {
          eligibleSessions: substantive.length,
          linkedSessions: linkedSessions.length,
          richProvenanceSessions: richProvenanceSessions.length,
          missingSessionIds: substantive
            .filter((session) => !linkedSessionIds.has(session.id))
            .map((session) => session.id)
            .slice(0, 20),
          missingRichProvenanceSessionIds: substantive
            .filter(
              (session) => !richProvenanceSessionIds.has(session.id),
            )
            .map((session) => session.id)
            .slice(0, 20),
        },
        totals: {
          sessions: sessions.length,
          memories: memories.length,
          lessons: lessons.length,
          insights: insights.length,
        },
      };
    },
  );
}
