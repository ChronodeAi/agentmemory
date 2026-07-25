import { createHash } from "node:crypto";
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

interface InjectionMetrics {
  samplesMs: number[];
  packetCount: number;
  lastAt: string;
}

type ContextClass = "advisory" | "gate-critical";
type ContextSourceName =
  | "slots"
  | "profile"
  | "lessons"
  | "episodic"
  | "file_history";
type ContextSourceStatus = "ok" | "unavailable" | "failed";

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

interface SourceRead<T> {
  value: T;
  outcome: ContextSourceOutcome;
}

const PACKET_TTL_MS = 5 * 60 * 1000;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function receiptHash(providerReceipt: string): string {
  return createHash("sha256").update(providerReceipt).digest("hex");
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

async function hasBeenInjected(
  kv: StateKV,
  sessionId: string,
  sourceId: string,
): Promise<boolean> {
  const scope = KV.injectedSources(sessionId);
  const legacyMarker = await kv
    .get<{ sourceId: string }>(scope, sourceId)
    .catch(() => null);
  if (legacyMarker) return true;
  const records = await kv.list<ContextAcknowledgement>(scope).catch(() => []);
  return records.some(
    (record) =>
      record.kind === "context_acknowledgement" &&
      record.sessionId === sessionId &&
      record.sourceIds.includes(sourceId),
  );
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
      const contextClass: ContextClass =
        data.context_class === "gate-critical" ? "gate-critical" : "advisory";
      const required = contextClass === "gate-critical";

      const [slotsRead, profileRead, lessonsRead, episodicRead, fileRead] =
        await Promise.all([
          isSlotsEnabled()
            ? readSource(
                "slots",
                required,
                [] as MemorySlot[],
                () => listPinnedSlots(kv, project),
                (items) => items.length,
              )
            : Promise.resolve<SourceRead<MemorySlot[]>>({
                value: [],
                outcome: {
                  source: "slots",
                  required,
                  status: "unavailable",
                  itemCount: 0,
                  error: "slots are disabled",
                },
              }),
          readSource(
            "profile",
            required,
            null as ProjectProfile | null,
            () => kv.get<ProjectProfile>(KV.profiles, project),
            (value) => (value ? 1 : 0),
          ),
          readSource(
            "lessons",
            required,
            [] as Lesson[],
            async () =>
              (await kv.list<Lesson>(KV.lessons))
                .filter(
                  (lesson) => !lesson.deleted && lesson.project === project,
                )
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10),
            (items) => items.length,
          ),
          readSource(
            "episodic",
            required,
            { results: [] } as { results: Array<Record<string, unknown>> },
            async () => {
              const result = await sdk.trigger({
                function_id: "mem::search",
                payload: {
                  query,
                  project,
                  limit: 5,
                  format: "narrative",
                  token_budget: budgets.episodic,
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
                required,
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
      const profile = profileRead.value;
      const projectLessons = lessonsRead.value;
      const searchResult = episodicRead.value;
      const fileResult = fileRead.value;
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
          error: "required context sources are incomplete",
        };
      }

      const selectedSourceIds: string[] = [];
      const sections: string[] = [];
      const slotSources = slots.map(
        (slot) => `slot:${project}:${slot.label}:${slot.updatedAt}`,
      );
      const freshSlotSources: string[] = [];
      for (const sourceId of slotSources) {
        if (!(await hasBeenInjected(kv, sessionId, sourceId))) {
          freshSlotSources.push(sourceId);
        }
      }
      const profileSource = profile
        ? `profile:${project}:${profile.updatedAt}`
        : undefined;
      const profileIsFresh =
        profileSource &&
        !(await hasBeenInjected(kv, sessionId, profileSource));
      if (freshSlotSources.length > 0 || profileIsFresh) {
        const identityParts: string[] = [];
        const pinned = renderPinnedContext(slots);
        if (pinned && freshSlotSources.length > 0) identityParts.push(pinned);
        if (profile && profileSource && profileIsFresh) {
          identityParts.push(
            [
              "# project profile",
              `Concepts: ${profile.topConcepts
                .slice(0, 8)
                .map((item) => item.concept)
                .join(", ")}`,
              `Files: ${profile.topFiles
                .slice(0, 5)
                .map((item) => item.file)
                .join(", ")}`,
              `Conventions: ${profile.conventions.join("; ")}`,
            ].join("\n"),
          );
          selectedSourceIds.push(profileSource);
        }
        if (identityParts.length > 0) {
          sections.push(fit(identityParts.join("\n\n"), budgets.identity));
          selectedSourceIds.push(...freshSlotSources);
        }
      }

      const freshLessons: Lesson[] = [];
      for (const lesson of projectLessons) {
        if (!(await hasBeenInjected(kv, sessionId, lesson.id))) {
          freshLessons.push(lesson);
        }
      }
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

      const searchRows =
        searchResult &&
        typeof searchResult === "object" &&
        Array.isArray((searchResult as { results?: unknown[] }).results)
          ? (searchResult as { results: Array<Record<string, unknown>> }).results
          : [];
      const freshRows: Array<Record<string, unknown>> = [];
      for (const row of searchRows.slice(0, 5)) {
        const sourceId =
          typeof row.obsId === "string"
            ? row.obsId
            : row.observation &&
                typeof row.observation === "object" &&
                typeof (row.observation as Record<string, unknown>).id ===
                  "string"
              ? ((row.observation as Record<string, unknown>).id as string)
              : undefined;
        if (sourceId && !(await hasBeenInjected(kv, sessionId, sourceId))) {
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
      const freshFileSources = (
        await Promise.all(
          fileSourceIds.map(async (id) => ({
            id,
            fresh: !(await hasBeenInjected(kv, sessionId, id)),
          })),
        )
      ).filter((item) => item.fresh);
      if (fileContext && freshFileSources.length > 0) {
        sections.push(fit(fileContext, budgets.files));
        selectedSourceIds.push(...freshFileSources.map((item) => item.id));
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
      await kv.set(
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
        sourceIds: uniqueSourceIds,
        sources: sourceOutcomes,
        completeness,
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

      return withKeyedLock(`context-ack:${sessionId}:${packetId}`, async () => {
        const scope = KV.injectedSources(sessionId);
        const providerReceiptHash = receiptHash(providerReceipt);
        const existing = await kv.get<ContextAcknowledgement>(
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

        const packet = await kv.get<ContextPacketRecord>(
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
            const existingReceipt = await kv.get<{
              packetId: string;
              project: string;
              sessionId: string;
            }>(KV.contextDeliveryReceipts, receiptId);
            if (existingReceipt) return false;
            await kv.set(KV.contextDeliveryReceipts, receiptId, {
              packetId,
              project,
              sessionId,
              providerId,
              contextSha256: packet.contextSha256,
              claimedAt: new Date().toISOString(),
            });
            return true;
          },
        );
        if (!receiptClaim) {
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
        await kv.set(scope, `ack:${packetId}`, acknowledgement);
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
          idempotent: false,
          packetId,
          sourceIds: packet.sourceIds,
          acknowledgedAt,
        };
      });
    },
  );

  sdk.registerFunction(
    "mem::commit-link",
    async (data: { sha?: string; sessionId?: string; project?: string }) => {
      const sha = typeof data.sha === "string" ? data.sha.trim() : "";
      const project =
        typeof data.project === "string" ? data.project.trim() : "";
      const sessionId =
        typeof data.sessionId === "string" ? data.sessionId.trim() : undefined;
      if (!sha || !project) {
        return { success: false, error: "sha and project are required" };
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
      ] = await Promise.all([
        kv.list<Session>(KV.sessions),
        kv.list<Memory>(KV.memories),
        kv.list<Lesson>(KV.lessons),
        kv.list<Insight>(KV.insights),
        kv.list<AccessLog>(KV.accessLog),
        kv.get<InjectionMetrics>(KV.projectMetrics(project), "injection"),
        kv.list<PromotionCandidate>(KV.promotionCandidates(project)),
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
      const commits = substantive.filter(
        (session) => (session.commitShas?.length ?? 0) > 0,
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
          substantive.length > 0 ? commits.length / substantive.length : 1,
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
