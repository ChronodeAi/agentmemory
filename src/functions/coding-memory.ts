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
import { KV } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import {
  isSlotsEnabled,
  listPinnedSlots,
  renderPinnedContext,
} from "./slots.js";
import type { AccessLog } from "./access-tracker.js";

interface InjectionMetrics {
  samplesMs: number[];
  packetCount: number;
  lastAt: string;
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
  return Boolean(
    await kv
      .get<{ sourceId: string }>(KV.injectedSources(sessionId), sourceId)
      .catch(() => null),
  );
}

async function markInjected(
  kv: StateKV,
  sessionId: string,
  sourceIds: string[],
): Promise<void> {
  const at = new Date().toISOString();
  await Promise.all(
    Array.from(new Set(sourceIds)).map((sourceId) =>
      kv.set(KV.injectedSources(sessionId), sourceId, { sourceId, at }),
    ),
  );
}

export function registerCodingMemoryFunctions(
  sdk: ISdk,
  kv: StateKV,
): void {
  sdk.registerFunction(
    "mem::context-packet",
    async (data: {
      project?: string;
      sessionId?: string;
      query?: string;
      files?: string[];
      token_budget?: number;
    }) => {
      const started = Date.now();
      const project =
        typeof data?.project === "string" ? data.project.trim() : "";
      const sessionId =
        typeof data?.sessionId === "string" ? data.sessionId.trim() : "";
      if (!project || !sessionId) {
        return { success: false, error: "project and sessionId are required" };
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

      const [slots, profile, projectLessons, searchResult, fileResult] =
        await Promise.all([
          isSlotsEnabled()
            ? listPinnedSlots(kv, project).catch(() => [] as MemorySlot[])
            : Promise.resolve([] as MemorySlot[]),
          kv.get<ProjectProfile>(KV.profiles, project).catch(() => null),
          kv
            .list<Lesson>(KV.lessons)
            .then((items) =>
              items
                .filter(
                  (lesson) => !lesson.deleted && lesson.project === project,
                )
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10),
            )
            .catch(() => [] as Lesson[]),
          sdk
            .trigger({
              function_id: "mem::search",
              payload: {
                query,
                project,
                limit: 5,
                format: "narrative",
                token_budget: budgets.episodic,
              },
            })
            .catch(() => ({ results: [] })),
          files.length > 0
            ? sdk
                .trigger({
                  function_id: "mem::file-context",
                  payload: { project, sessionId, files },
                })
                .catch(() => ({ context: "", sourceIds: [] }))
            : Promise.resolve({ context: "", sourceIds: [] }),
        ]);

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
        await markInjected(kv, sessionId, uniqueSourceIds);
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
        context,
        tokens: estimateTokens(context),
        sourceIds: uniqueSourceIds,
        latencyMs,
      };
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
