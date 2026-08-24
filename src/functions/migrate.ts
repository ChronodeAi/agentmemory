import type { ISdk } from "iii-sdk";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  KV,
  fingerprintId,
} from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import type {
  Memory,
  Session,
  CompressedObservation,
  SessionSummary,
} from "../types.js";
import { logger } from "../logger.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import { resolveDataDir } from "../data-dir.js";

function allowedDirs(): string[] {
  return [resolve(resolveDataDir())];
}

type ProjectRecord = Record<string, unknown> & { project?: string };

export interface ProjectScopeMigrationResult {
  scanned: number;
  normalized: number;
  unchanged: number;
  quarantined: number;
  exactDuplicatesSuperseded: number;
}

interface MigrationTarget {
  id: string;
  scope: string;
  key: string;
  value: unknown;
  before: unknown;
  beforeExists: boolean;
}

interface MigrationJournal {
  id: string;
  generation: string;
  sourceSha256: string;
  sourcePath: string;
  status:
    | "staging"
    | "staged"
    | "promoting"
    | "completed"
    | "rolling-back"
    | "rolled-back"
    | "rollback-incomplete";
  stageScope: string;
  total: number;
  progress: number;
  promotedTargetIds: string[];
  inFlightTargetId?: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    sessionCount: number;
    obsCount: number;
    summaryCount: number;
  };
  rollback?: {
    attemptedAt: string;
    restored: number;
    success: boolean;
    skippedConflicts?: string[];
    error?: string;
  };
}

interface StagedMigrationInput {
  generation: string;
  sourceSha256: string;
  sourcePath: string;
  targets: Array<{ scope: string; key: string; value: unknown }>;
  counts: MigrationJournal["counts"];
  action?: "resume" | "rollback";
}

export interface StagedMigrationResult {
  success: boolean;
  status:
    | "complete"
    | "incomplete"
    | "rolled-back"
    | "rollback-incomplete";
  generation: string;
  resumed: boolean;
  sessionCount: number;
  obsCount: number;
  summaryCount: number;
  promoted: number;
  rollback?: MigrationJournal["rollback"];
  error?: string;
}

interface MigrationCliRequest {
  dbPath?: string;
  step?:
    | "infer-memory-projects"
    | "normalize-project-scopes"
    | "transition-project-processing-policy";
  dryRun?: boolean;
  projectAliases?: Record<string, string>;
  project?: string;
  privacy?: "standard" | "private" | "strict";
  externalProcessing?: boolean;
  acknowledgeHistoricalContent?: boolean;
  action?: "resume" | "rollback";
}

export interface ProjectProcessingPolicyTransitionInput {
  project: string;
  privacy: "standard" | "private" | "strict";
  externalProcessing: boolean;
  acknowledgeHistoricalContent?: boolean;
  dryRun?: boolean;
}

export interface MigrationCliOutput {
  operationSucceeded: boolean;
  endpoint?: string;
  request?: MigrationCliRequest;
  httpStatus?: number;
  result?: unknown;
  error?: {
    code:
      | "invalid-arguments"
      | "missing-auth"
      | "invalid-endpoint"
      | "request-failed"
      | "invalid-response"
      | "operation-incomplete";
    message: string;
  };
}

export interface MigrationCliDependencies {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
}

interface ProjectScopeDescriptor {
  scope: string;
  key: (record: ProjectRecord) => string | undefined;
  copyToCanonicalKey?: boolean;
}

const PROJECT_SCOPES: ProjectScopeDescriptor[] = [
  { scope: KV.sessions, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.summaries, key: (record) => asRecordKey(record["sessionId"]) },
  { scope: KV.memories, key: (record) => asRecordKey(record["id"]) },
  {
    scope: KV.profiles,
    key: (record) => asRecordKey(record["project"]),
    copyToCanonicalKey: true,
  },
  { scope: KV.semantic, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.procedural, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.actions, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.sketches, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.crystals, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.lessons, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.insights, key: (record) => asRecordKey(record["id"]) },
  { scope: KV.commits, key: (record) => asRecordKey(record["sha"]) },
];

function asRecordKey(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeProjectValue(
  value: unknown,
  aliases: Map<string, string>,
): { raw?: string; canonical?: string; ambiguous: boolean } {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw || /^(?:unknown|unscoped|none|null|default)$/i.test(raw)) {
    return { ...(raw ? { raw } : {}), ambiguous: true };
  }
  const canonical = aliases.get(raw) ?? aliases.get(raw.toLowerCase()) ?? raw;
  return { raw, canonical, ambiguous: false };
}

function buildAliasMap(projectAliases: Record<string, string>): Map<string, string> {
  const entries = Object.entries(projectAliases);
  if (entries.length > 200) {
    throw new Error("projectAliases may contain at most 200 entries");
  }
  const aliases = new Map<string, string>();
  for (const [source, target] of entries) {
    const from = source.trim();
    const to = target.trim();
    if (!from || !to) {
      throw new Error("projectAliases keys and values must be non-empty strings");
    }
    aliases.set(from, to);
    aliases.set(from.toLowerCase(), to);
    aliases.set(to, to);
    aliases.set(to.toLowerCase(), to);
  }
  return aliases;
}

function exactMemoryFingerprint(memory: Memory, project: string): string {
  const content = memory.content.trim().toLowerCase().replace(/\s+/g, " ");
  return `${project}\u0000${memory.type}\u0000${content}`;
}

async function supersedeExactMemoryDuplicates(
  kv: StateKV,
  aliases: Map<string, string>,
  dryRun: boolean,
): Promise<number> {
  const memories = await kv.list<Memory>(KV.memories);
  const groups = new Map<string, Memory[]>();
  for (const memory of memories) {
    const project = normalizeProjectValue(memory.project, aliases);
    if (project.ambiguous || !project.canonical || !memory.content.trim()) continue;
    const fingerprint = exactMemoryFingerprint(memory, project.canonical);
    const group = groups.get(fingerprint) ?? [];
    group.push(memory);
    groups.set(fingerprint, group);
  }

  let superseded = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const aTime = Date.parse(a.updatedAt || a.createdAt) || 0;
      const bTime = Date.parse(b.updatedAt || b.createdAt) || 0;
      return aTime - bTime || a.id.localeCompare(b.id);
    });
    const winner = group[group.length - 1];
    const losers = group.slice(0, -1);
    const existing = new Set(winner.supersedes ?? []);
    const pending = losers.filter(
      (memory) => memory.isLatest || !existing.has(memory.id),
    );
    if (pending.length === 0) continue;
    superseded += pending.length;
    if (dryRun) continue;

    for (const loser of losers) {
      if (loser.isLatest) {
        loser.isLatest = false;
        await kv.set(KV.memories, loser.id, loser);
      }
      existing.add(loser.id);
    }
    winner.supersedes = [...existing];
    winner.updatedAt = new Date().toISOString();
    await kv.set(KV.memories, winner.id, winner);
  }
  return superseded;
}

export async function normalizeProjectScopes(
  kv: StateKV,
  projectAliases: Record<string, string>,
  dryRun = false,
): Promise<ProjectScopeMigrationResult> {
  const aliases = buildAliasMap(projectAliases);
  const result: ProjectScopeMigrationResult = {
    scanned: 0,
    normalized: 0,
    unchanged: 0,
    quarantined: 0,
    exactDuplicatesSuperseded: 0,
  };

  for (const descriptor of PROJECT_SCOPES) {
    const records = await kv.list<ProjectRecord>(descriptor.scope);
    for (const record of records) {
      const key = descriptor.key(record);
      if (!key) continue;
      result.scanned++;
      const project = normalizeProjectValue(record.project, aliases);
      if (project.ambiguous || !project.canonical) {
        result.quarantined++;
        if (!dryRun) {
          const quarantineId = fingerprintId(
            "quarantine",
            `${descriptor.scope}\u0000${key}`,
          );
          await kv.set(KV.migrationQuarantine, quarantineId, {
            id: quarantineId,
            sourceScope: descriptor.scope,
            sourceKey: key,
            rawProject: project.raw,
            reason: "missing-or-ambiguous-project",
            quarantinedAt: new Date().toISOString(),
          });
        }
        continue;
      }
      if (project.canonical === project.raw) {
        result.unchanged++;
        continue;
      }

      result.normalized++;
      const normalizedRecord = {
        ...record,
        project: project.canonical,
      };
      if (!dryRun) {
        const targetKey = descriptor.copyToCanonicalKey
          ? project.canonical
          : key;
        await kv.set(descriptor.scope, targetKey, normalizedRecord);
        if (descriptor.copyToCanonicalKey && targetKey !== key) {
          // Keep the legacy lookup key as a temporary alias, but normalize
          // its stored project value so a repeated migration is a no-op.
          await kv.set(descriptor.scope, key, normalizedRecord);
        }
      }
    }
  }

  result.exactDuplicatesSuperseded = await supersedeExactMemoryDuplicates(
    kv,
    aliases,
    dryRun,
  );
  if (!dryRun) {
    const reportKey = fingerprintId(
      "migration",
      JSON.stringify(
        Object.entries(projectAliases).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    await kv.set(KV.migrationReports, reportKey, {
      id: reportKey,
      step: "normalize-project-scopes",
      projectAliases,
      completedAt: new Date().toISOString(),
      ...result,
    });
  }
  logger.info("normalizeProjectScopes complete", { dryRun, ...result });
  return result;
}

function isAllowedPath(dbPath: string): boolean {
  const resolved = resolve(dbPath);
  return allowedDirs().some((dir) => resolved.startsWith(dir + "/"));
}

// Infer memory project from the majority project of its associated sessions.
// Returns { updated, skipped } — safe to run repeatedly (idempotent).
export async function inferMemoryProjects(
  kv: StateKV,
  dryRun = false,
): Promise<{ updated: number; skipped: number; ambiguous: number }> {
  const memories = await kv.list<Memory>(KV.memories);
  const sessionCache = new Map<string, Session | null>();

  const loadSession = async (sid: string): Promise<Session | null> => {
    if (sessionCache.has(sid)) return sessionCache.get(sid)!;
    const s = await kv.get<Session>(KV.sessions, sid).catch(() => null);
    sessionCache.set(sid, s);
    return s;
  };

  let updated = 0;
  let skipped = 0;
  let ambiguous = 0;

  for (const memory of memories) {
    if (memory.project) {
      skipped++;
      continue;
    }

    const sessionIds = memory.sessionIds ?? [];
    if (sessionIds.length === 0) {
      ambiguous++;
      continue;
    }

    const projects: string[] = [];
    for (const sid of sessionIds) {
      const session = await loadSession(sid);
      if (session?.project) projects.push(session.project);
    }

    if (projects.length === 0) {
      ambiguous++;
      continue;
    }

    // Majority-vote: count frequency of each project value.
    const freq = new Map<string, number>();
    for (const p of projects) freq.set(p, (freq.get(p) ?? 0) + 1);
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    const [topProject, topCount] = sorted[0];

    // Require a strict majority (> 50%) to avoid misattributing a memory
    // that was genuinely built from sessions across multiple projects.
    if (topCount <= projects.length / 2 && sorted.length > 1) {
      ambiguous++;
      continue;
    }

    if (!dryRun) {
      memory.project = topProject;
      await kv.set(KV.memories, memory.id, memory);
    }
    updated++;
  }

  logger.info("inferMemoryProjects complete", { updated, skipped, ambiguous, dryRun });
  return { updated, skipped, ambiguous };
}

function migrationStageScope(generation: string): string {
  return `mem:migration:staging:${generation}`;
}

function migrationGeneration(dbPath: string): {
  generation: string;
  sourceSha256: string;
} {
  const sourceSha256 = createHash("sha256")
    .update(readFileSync(dbPath))
    .digest("hex");
  return {
    generation: fingerprintId(
      "migration",
      `${resolve(dbPath)}\u0000${sourceSha256}`,
    ),
    sourceSha256,
  };
}

function targetId(scope: string, key: string): string {
  return fingerprintId("target", `${scope}\u0000${key}`);
}

async function rollbackMigration(
  kv: StateKV,
  journal: MigrationJournal,
  targets: MigrationTarget[],
): Promise<StagedMigrationResult> {
  const attemptedAt = new Date().toISOString();
  const rollbackTargetIds = new Set(journal.promotedTargetIds);
  if (journal.inFlightTargetId) {
    rollbackTargetIds.add(journal.inFlightTargetId);
  }
  const rollbackTargets = targets.filter((target) =>
    rollbackTargetIds.has(target.id),
  );
  const rollingBack: MigrationJournal = {
    ...journal,
    status: "rolling-back",
    updatedAt: attemptedAt,
    rollback: {
      attemptedAt,
      restored: 0,
      success: false,
      skippedConflicts: [],
    },
  };
  await kv.set(KV.migrationReports, journal.id, rollingBack);
  let restored = 0;
  const skippedConflicts: string[] = [];
  try {
    const foundTargetIds = new Set(rollbackTargets.map(({ id }) => id));
    for (const targetId of rollbackTargetIds) {
      if (!foundTargetIds.has(targetId)) skippedConflicts.push(targetId);
    }
    for (const target of rollbackTargets.slice().reverse()) {
      const current = await kv.get(target.scope, target.key);
      const currentJson = JSON.stringify(current);
      const targetJson = JSON.stringify(target.value);
      const beforeJson = JSON.stringify(
        target.beforeExists ? target.before : null,
      );
      if (currentJson === beforeJson) {
        continue;
      }
      if (currentJson !== targetJson) {
        skippedConflicts.push(target.id);
        rollingBack.rollback = {
          attemptedAt,
          restored,
          success: false,
          skippedConflicts: [...skippedConflicts],
        };
        rollingBack.updatedAt = new Date().toISOString();
        await kv.set(KV.migrationReports, journal.id, rollingBack);
        continue;
      }
      if (target.beforeExists) {
        await kv.set(target.scope, target.key, target.before);
      } else {
        await kv.delete(target.scope, target.key);
      }
      restored++;
      rollingBack.rollback = {
        attemptedAt,
        restored,
        success: false,
        skippedConflicts: [...skippedConflicts],
      };
      rollingBack.updatedAt = new Date().toISOString();
      await kv.set(KV.migrationReports, journal.id, rollingBack);
    }
    if (skippedConflicts.length > 0) {
      throw new Error(
        `Rollback ownership conflict: ${skippedConflicts.join(", ")}`,
      );
    }
    const completedAt = new Date().toISOString();
    const rolledBack: MigrationJournal = {
      ...rollingBack,
      status: "rolled-back",
      updatedAt: completedAt,
      progress: 0,
      inFlightTargetId: undefined,
      rollback: {
        attemptedAt,
        restored,
        success: true,
        skippedConflicts: [],
      },
    };
    await kv.set(KV.migrationReports, journal.id, rolledBack);
    return {
      success: false,
      status: "rolled-back",
      generation: journal.generation,
      resumed: true,
      ...journal.counts,
      promoted: Math.max(0, rollbackTargets.length - restored),
      rollback: rolledBack.rollback,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed: MigrationJournal = {
      ...rollingBack,
      status: "rollback-incomplete",
      updatedAt: new Date().toISOString(),
      rollback: {
        attemptedAt,
        restored,
        success: false,
        skippedConflicts: [...skippedConflicts],
        error: message,
      },
    };
    let reportedError = message;
    try {
      await kv.set(KV.migrationReports, journal.id, failed);
    } catch (persistenceError) {
      const persistenceMessage =
        persistenceError instanceof Error
          ? persistenceError.message
          : String(persistenceError);
      reportedError =
        `${message}; rollback journal persistence failed: ${persistenceMessage}`;
    }
    const rollback = {
      attemptedAt,
      restored,
      success: false,
      skippedConflicts: [...skippedConflicts],
      error: reportedError,
    };
    return {
      success: false,
      status: "rollback-incomplete",
      generation: journal.generation,
      resumed: true,
      ...journal.counts,
      promoted: Math.max(0, journal.promotedTargetIds.length - restored),
      rollback,
      error: reportedError,
    };
  }
}

async function runStagedMigrationLocked(
  kv: StateKV,
  input: StagedMigrationInput,
): Promise<StagedMigrationResult> {
  const reportId = input.generation;
  const stageScope = migrationStageScope(input.generation);
  let journal = await kv.get<MigrationJournal>(
    KV.migrationReports,
    reportId,
  );
  if (journal && !Array.isArray(journal.promotedTargetIds)) {
    journal = { ...journal, promotedTargetIds: [] };
  }
  const resumed = Boolean(journal);

  if (
    journal &&
    (journal.sourceSha256 !== input.sourceSha256 ||
      journal.sourcePath !== input.sourcePath)
  ) {
    return {
      success: false,
      status: "incomplete",
      generation: input.generation,
      resumed: true,
      ...input.counts,
      promoted: journal.progress,
      error: "Migration generation source hash mismatch",
    };
  }

  if (!journal) {
    const createdAt = new Date().toISOString();
    journal = {
      id: reportId,
      generation: input.generation,
      sourceSha256: input.sourceSha256,
      sourcePath: input.sourcePath,
      status: "staging",
      stageScope,
      total: input.targets.length,
      progress: 0,
      promotedTargetIds: [],
      createdAt,
      updatedAt: createdAt,
      counts: input.counts,
    };
    await kv.set(KV.migrationReports, reportId, journal);
  }
  if (journal.status === "staging") {
    const targets = input.targets
      .map((target) => ({ ...target, id: targetId(target.scope, target.key) }))
      .sort(
        (a, b) =>
          a.scope.localeCompare(b.scope) || a.key.localeCompare(b.key),
      );
    for (const target of targets) {
      const existing = await kv.get<MigrationTarget>(stageScope, target.id);
      if (existing) continue;
      const before = await kv.get(target.scope, target.key);
      const staged: MigrationTarget = {
        ...target,
        before,
        beforeExists: before !== null,
      };
      await kv.set(stageScope, staged.id, staged);
    }
    journal = {
      ...journal,
      status: "staged",
      updatedAt: new Date().toISOString(),
    };
    await kv.set(KV.migrationReports, reportId, journal);
  }

  const stagedTargets = (
    await kv.list<MigrationTarget>(stageScope)
  ).sort(
    (a, b) => a.scope.localeCompare(b.scope) || a.key.localeCompare(b.key),
  );
  const expectedTargetIds = input.targets
    .map((target) => targetId(target.scope, target.key))
    .sort();
  const stagedTargetIds = stagedTargets.map(({ id }) => id).sort();
  if (
    stagedTargets.length !== journal.total ||
    JSON.stringify(stagedTargetIds) !== JSON.stringify(expectedTargetIds)
  ) {
    return {
      success: false,
      status: "incomplete",
      generation: input.generation,
      resumed,
      ...journal.counts,
      promoted: journal.progress,
      error:
        `Staging manifest mismatch: expected ${journal.total} target(s) ` +
        `with IDs ${expectedTargetIds.join(",")}; found ${stagedTargets.length} ` +
        `with IDs ${stagedTargetIds.join(",")}`,
    };
  }

  if (input.action === "rollback") {
    return rollbackMigration(kv, journal, stagedTargets);
  }
  if (journal.status === "completed") {
    return {
      success: true,
      status: "complete",
      generation: input.generation,
      resumed: true,
      ...journal.counts,
      promoted: journal.promotedTargetIds.length,
    };
  }
  if (journal.status === "rolled-back" || journal.status === "rollback-incomplete") {
    return {
      success: false,
      status:
        journal.status === "rolled-back"
          ? "rolled-back"
          : "rollback-incomplete",
      generation: input.generation,
      resumed: true,
      ...journal.counts,
      promoted: journal.progress,
      rollback: journal.rollback,
      error:
        journal.status === "rollback-incomplete"
          ? journal.rollback?.error
          : undefined,
    };
  }

  try {
    for (let index = journal.progress; index < stagedTargets.length; index++) {
      const target = stagedTargets[index];
      journal = {
        ...journal,
        status: "promoting",
        progress: index,
        inFlightTargetId: target.id,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(KV.migrationReports, reportId, journal);
      await kv.set(target.scope, target.key, target.value);
      journal = {
        ...journal,
        progress: index + 1,
        promotedTargetIds: [
          ...new Set([...journal.promotedTargetIds, target.id]),
        ],
        inFlightTargetId: undefined,
        updatedAt: new Date().toISOString(),
      };
      await kv.set(KV.migrationReports, reportId, journal);
    }
    journal = {
      ...journal,
      status: "completed",
      progress: stagedTargets.length,
      inFlightTargetId: undefined,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(KV.migrationReports, reportId, journal);
    return {
      success: true,
      status: "complete",
      generation: input.generation,
      resumed,
      ...journal.counts,
      promoted: journal.promotedTargetIds.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const rollback = await rollbackMigration(kv, journal, stagedTargets);
    return {
      ...rollback,
      error: message,
    };
  }
}

export function runStagedMigration(
  kv: StateKV,
  input: StagedMigrationInput,
): Promise<StagedMigrationResult> {
  return withKeyedLock("migration:global", () =>
    runStagedMigrationLocked(kv, input),
  );
}

export async function transitionProjectProcessingPolicy(
  kv: StateKV,
  input: ProjectProcessingPolicyTransitionInput,
): Promise<Record<string, unknown>> {
  const project = input.project?.trim();
  if (!project || project.length > 512) {
    return {
      success: false,
      step: "transition-project-processing-policy",
      error: "project must be a non-empty canonical ID of at most 512 characters",
    };
  }
  if (!(["standard", "private", "strict"] as const).includes(input.privacy)) {
    return {
      success: false,
      step: "transition-project-processing-policy",
      error: "privacy must be standard, private, or strict",
    };
  }
  if (typeof input.externalProcessing !== "boolean") {
    return {
      success: false,
      step: "transition-project-processing-policy",
      error: "externalProcessing must be a boolean",
    };
  }
  if (input.privacy === "strict" && input.externalProcessing) {
    return {
      success: false,
      step: "transition-project-processing-policy",
      error: "strict privacy cannot enable external processing",
    };
  }
  if (
    (input.privacy !== "strict" || input.externalProcessing) &&
    input.acknowledgeHistoricalContent !== true
  ) {
    return {
      success: false,
      step: "transition-project-processing-policy",
      error:
        "acknowledgeHistoricalContent=true is required before making historical session policy less restrictive",
    };
  }

  const sessions = (await kv.list<Session>(KV.sessions)).filter(
    (session) => session.project === project,
  );
  if (sessions.length === 0) {
    return {
      success: false,
      step: "transition-project-processing-policy",
      project,
      error: "no sessions found for project",
    };
  }

  const policyCounts = new Map<string, number>();
  for (const session of sessions) {
    const key = `${session.privacy ?? "missing"}:${String(
      session.externalProcessing ?? "missing",
    )}`;
    policyCounts.set(key, (policyCounts.get(key) ?? 0) + 1);
  }
  const previousPolicies = [...policyCounts.entries()]
    .map(([policy, count]) => {
      const separator = policy.lastIndexOf(":");
      const external = policy.slice(separator + 1);
      return {
        privacy: policy.slice(0, separator),
        externalProcessing:
          external === "true"
            ? true
            : external === "false"
              ? false
              : "missing",
        count,
      };
    })
    .sort((a, b) =>
      `${a.privacy}:${a.externalProcessing}`.localeCompare(
        `${b.privacy}:${b.externalProcessing}`,
      ),
    );
  const changedSessions = sessions.filter(
    (session) =>
      session.privacy !== input.privacy ||
      session.externalProcessing !== input.externalProcessing,
  );
  const dryRun = input.dryRun ?? true;
  const baseResult = {
    step: "transition-project-processing-policy",
    project,
    privacy: input.privacy,
    externalProcessing: input.externalProcessing,
    dryRun,
    matched: sessions.length,
    changed: changedSessions.length,
    unchanged: sessions.length - changedSessions.length,
    previousPolicies,
  };

  if (dryRun) {
    return { success: true, status: "dry-run", ...baseResult };
  }
  if (changedSessions.length === 0) {
    return {
      success: true,
      status: "complete",
      generation: null,
      promoted: 0,
      ...baseResult,
    };
  }

  const descriptorBase = JSON.stringify({
    schemaVersion: 2,
    project,
    privacy: input.privacy,
    externalProcessing: input.externalProcessing,
    sessions: changedSessions
      .map((session) => ({
        id: session.id,
        privacy: session.privacy ?? "missing",
        externalProcessing: session.externalProcessing ?? "missing",
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
  let descriptor = descriptorBase;
  let generation = fingerprintId("policy", descriptor);
  let generationAvailable = false;
  for (let cycle = 0; cycle < 1_000; cycle++) {
    descriptor = cycle === 0 ? descriptorBase : `${descriptorBase}\ncycle:${cycle}`;
    generation = fingerprintId("policy", descriptor);
    if (!(await kv.get<MigrationJournal>(KV.migrationReports, generation))) {
      generationAvailable = true;
      break;
    }
  }
  if (!generationAvailable) {
    return {
      success: false,
      status: "incomplete",
      ...baseResult,
      error: "unable to allocate a unique project policy migration generation",
    };
  }
  const sourceSha256 = createHash("sha256").update(descriptor).digest("hex");
  const result = await runStagedMigration(kv, {
    generation,
    sourceSha256,
    sourcePath: `project-policy://${encodeURIComponent(project)}`,
    targets: changedSessions.map((session) => ({
      scope: KV.sessions,
      key: session.id,
      value: {
        ...session,
        privacy: input.privacy,
        externalProcessing: input.externalProcessing,
      },
    })),
    counts: {
      sessionCount: changedSessions.length,
      obsCount: 0,
      summaryCount: 0,
    },
  });
  return { ...result, ...baseResult };
}

export function registerMigrateFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction("mem::migrate",
    async (data: {
      dbPath?: string;
      step?: string;
      dryRun?: boolean;
      projectAliases?: Record<string, string>;
      project?: string;
      privacy?: "standard" | "private" | "strict";
      externalProcessing?: boolean;
      acknowledgeHistoricalContent?: boolean;
      action?: "resume" | "rollback";
    }) => {
      // In-place KV migration steps (no SQLite dependency).
      if (data.step === "infer-memory-projects") {
        const dryRun = data.dryRun ?? false;
        logger.info("Migration step: infer-memory-projects", { dryRun });
        const result = await inferMemoryProjects(kv, dryRun);
        return { success: true, step: "infer-memory-projects", ...result };
      }
      if (data.step === "normalize-project-scopes") {
        const dryRun = data.dryRun ?? false;
        const projectAliases = data.projectAliases ?? {};
        logger.info("Migration step: normalize-project-scopes", { dryRun });
        try {
          const result = await normalizeProjectScopes(
            kv,
            projectAliases,
            dryRun,
          );
          return {
            success: true,
            step: "normalize-project-scopes",
            dryRun,
            ...result,
          };
        } catch (error) {
          return {
            success: false,
            step: "normalize-project-scopes",
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
      if (data.step === "transition-project-processing-policy") {
        return transitionProjectProcessingPolicy(kv, {
          project: data.project ?? "",
          privacy: data.privacy as "standard" | "private" | "strict",
          externalProcessing: data.externalProcessing as boolean,
          acknowledgeHistoricalContent: data.acknowledgeHistoricalContent,
          dryRun: data.dryRun ?? true,
        });
      }

      if (!data.dbPath) {
        return {
          success: false,
          error: "Either step or dbPath is required",
        };
      }

      logger.info("Migration started", { dbPath: data.dbPath });

      if (!isAllowedPath(data.dbPath)) {
        return {
          success: false,
          error: `Path not allowed. Must be under: ${allowedDirs().join(", ")}`,
        };
      }

      let Database: any;
      try {
        // @ts-expect-error optional dependency
        Database = (await import("better-sqlite3")).default;
      } catch {
        return {
          success: false,
          error:
            "better-sqlite3 not installed. Run: npm install better-sqlite3",
        };
      }

      const fs = await import("node:fs");
      if (!fs.existsSync(data.dbPath)) {
        return { success: false, error: `Database not found: ${data.dbPath}` };
      }

      let db: any;
      try {
        db = Database(data.dbPath, { readonly: true });
        const source = migrationGeneration(data.dbPath);
        const migratedAt = new Date().toISOString();
        const targets: Array<{
          scope: string;
          key: string;
          value: unknown;
        }> = [];

        const sessions = db
          .prepare("SELECT * FROM sessions ORDER BY created_at DESC")
          .all() as any[];
        for (const row of sessions) {
          const session: Session = {
            id: row.session_id || row.id,
            project: row.project_path || row.project || "unknown",
            cwd: row.cwd || row.project_path || "",
            startedAt:
              row.created_at || row.started_at || migratedAt,
            endedAt: row.ended_at || row.updated_at,
            status: "completed",
            observationCount: 0,
          };
          targets.push({
            scope: KV.sessions,
            key: session.id,
            value: session,
          });
        }

        let observations: any[] = [];
        try {
          observations = db
            .prepare("SELECT * FROM observations ORDER BY created_at ASC")
            .all() as any[];
        } catch {
          try {
            observations = db
              .prepare(
                "SELECT * FROM compressed_observations ORDER BY created_at ASC",
              )
              .all() as any[];
          } catch {
            logger.warn("No observation tables found");
          }
        }

        for (const [rowIndex, row] of observations.entries()) {
          const sessionId = row.session_id || "migrated";
          const obs: CompressedObservation = {
            id:
              row.id ||
              fingerprintId(
                "mig",
                `${source.sourceSha256}\u0000observation\u0000${rowIndex}\u0000${sessionId}`,
              ),
            sessionId,
            timestamp: row.created_at || migratedAt,
            type: row.type || "other",
            title: row.title || row.summary || "Migrated observation",
            subtitle: row.subtitle,
            facts: safeJsonParse(row.facts, []),
            narrative: row.narrative || row.content || "",
            concepts: safeJsonParse(row.concepts, []),
            files: safeJsonParse(row.files, []),
            importance: row.importance || 5,
          };
          targets.push({
            scope: KV.observations(sessionId),
            key: obs.id,
            value: obs,
          });
        }

        let summaries: any[] = [];
        try {
          summaries = db
            .prepare("SELECT * FROM session_summaries")
            .all() as any[];
        } catch {
          logger.warn("No summaries table found");
        }

        for (const row of summaries) {
          const summary: SessionSummary = {
            sessionId: row.session_id,
            project: row.project || "unknown",
            createdAt: row.created_at || migratedAt,
            title: row.title || "Migrated session",
            narrative: row.narrative || row.summary || "",
            keyDecisions: safeJsonParse(row.key_decisions, []),
            filesModified: safeJsonParse(row.files_modified, []),
            concepts: safeJsonParse(row.concepts, []),
            observationCount: row.observation_count || 0,
          };
          targets.push({
            scope: KV.summaries,
            key: row.session_id,
            value: summary,
          });
        }

        const counts = {
          sessionCount: sessions.length,
          obsCount: observations.length,
          summaryCount: summaries.length,
        };
        const result = await runStagedMigration(kv, {
          ...source,
          sourcePath: resolve(data.dbPath),
          targets,
          counts,
          action: data.action,
        });
        logger.info("Migration finished", {
          success: result.success,
          status: result.status,
          generation: result.generation,
          resumed: result.resumed,
          promoted: result.promoted,
          sessionCount: result.sessionCount,
          obsCount: result.obsCount,
          summaryCount: result.summaryCount,
          error: result.error,
        });
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Migration failed", { error: msg });
        return { success: false, status: "incomplete", error: msg };
      } finally {
        try {
          if (db) db.close();
        } catch {}
      }
    },
  );
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value)) return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

const MIGRATION_CLI_USAGE = `Usage:
  node dist/functions/migrate.mjs --db-path <path> [--action resume|rollback]
  node dist/functions/migrate.mjs --step infer-memory-projects [--dry-run]
  node dist/functions/migrate.mjs --step normalize-project-scopes [--dry-run] [--project-alias <source=target>]...
  node dist/functions/migrate.mjs --step transition-project-processing-policy --project <id> --privacy <standard|private|strict> --external-processing <true|false> [--dry-run | --apply] [--acknowledge-historical-content]

Environment:
  AGENTMEMORY_ADMIN_SECRET  Required bearer credential
  AGENTMEMORY_ADMIN_SECRET_FILE
                             Secret-file alternative (default: ~/.agentmemory/admin-secret)
  AGENTMEMORY_URL           Loopback server URL (default: http://127.0.0.1:3111)

Options:
  --db-path <path>          SQLite database under the server's allowed directory
  --step <name>             Run a bounded in-place migration step
  --action <action>         resume or rollback a database migration generation
  --project-alias <a=b>     Project alias (repeatable, at most 200)
  --project <id>            Canonical project ID for a policy transition
  --privacy <level>         Target session privacy policy
  --external-processing <boolean>
                             Target external-processing consent
  --acknowledge-historical-content
                             Explicit consent for a less-restrictive transition
  --dry-run                 Do not persist an in-place migration step
  --apply                   Persist a project-processing-policy transition
  --timeout-ms <ms>         Request timeout from 1000 to 120000 (default: 30000)
  --url <url>               Override AGENTMEMORY_URL; must be loopback HTTP(S)
  -h, --help                Show this help
`;

class MigrationCliArgumentError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMigrationCliArgs(args: string[]): {
  help: boolean;
  request: MigrationCliRequest;
  url?: string;
  timeoutMs: number;
} {
  if (args.length > 420) {
    throw new MigrationCliArgumentError("Too many arguments");
  }
  if (args.some((arg) => arg.length > 4096)) {
    throw new MigrationCliArgumentError(
      "Each argument must be at most 4096 characters",
    );
  }

  const request: MigrationCliRequest = {};
  const projectAliases: Record<string, string> = {};
  let aliasCount = 0;
  let url: string | undefined;
  let timeoutMs = 30_000;
  let help = false;
  let dryRunMode: "dry-run" | "apply" | undefined;
  const seen = new Set<string>();

  const takeValue = (index: number, option: string): string => {
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new MigrationCliArgumentError(`${option} requires a value`);
    }
    return value;
  };
  const takeOnce = (option: string): void => {
    if (seen.has(option)) {
      throw new MigrationCliArgumentError(`${option} may only be provided once`);
    }
    seen.add(option);
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--dry-run") {
      takeOnce(arg);
      if (dryRunMode) {
        throw new MigrationCliArgumentError(
          "--dry-run and --apply are mutually exclusive",
        );
      }
      dryRunMode = "dry-run";
      request.dryRun = true;
      continue;
    }
    if (arg === "--apply") {
      takeOnce(arg);
      if (dryRunMode) {
        throw new MigrationCliArgumentError(
          "--dry-run and --apply are mutually exclusive",
        );
      }
      dryRunMode = "apply";
      request.dryRun = false;
      continue;
    }
    if (arg === "--db-path") {
      takeOnce(arg);
      request.dbPath = takeValue(index, arg);
      index++;
      continue;
    }
    if (arg === "--step") {
      takeOnce(arg);
      const value = takeValue(index, arg);
      if (
        value !== "infer-memory-projects" &&
        value !== "normalize-project-scopes" &&
        value !== "transition-project-processing-policy"
      ) {
        throw new MigrationCliArgumentError(`Unsupported migration step: ${value}`);
      }
      request.step = value;
      index++;
      continue;
    }
    if (arg === "--project") {
      takeOnce(arg);
      request.project = takeValue(index, arg).trim();
      index++;
      continue;
    }
    if (arg === "--privacy") {
      takeOnce(arg);
      const value = takeValue(index, arg);
      if (value !== "standard" && value !== "private" && value !== "strict") {
        throw new MigrationCliArgumentError(
          "--privacy must be standard, private, or strict",
        );
      }
      request.privacy = value;
      index++;
      continue;
    }
    if (arg === "--external-processing") {
      takeOnce(arg);
      const value = takeValue(index, arg);
      if (value !== "true" && value !== "false") {
        throw new MigrationCliArgumentError(
          "--external-processing must be true or false",
        );
      }
      request.externalProcessing = value === "true";
      index++;
      continue;
    }
    if (arg === "--acknowledge-historical-content") {
      takeOnce(arg);
      request.acknowledgeHistoricalContent = true;
      continue;
    }
    if (arg === "--action") {
      takeOnce(arg);
      const value = takeValue(index, arg);
      if (value !== "resume" && value !== "rollback") {
        throw new MigrationCliArgumentError(
          "--action must be resume or rollback",
        );
      }
      request.action = value;
      index++;
      continue;
    }
    if (arg === "--project-alias") {
      const value = takeValue(index, arg);
      index++;
      aliasCount++;
      if (aliasCount > 200) {
        throw new MigrationCliArgumentError(
          "--project-alias may be provided at most 200 times",
        );
      }
      const separator = value.indexOf("=");
      const source = value.slice(0, separator).trim();
      const target = value.slice(separator + 1).trim();
      if (
        separator <= 0 ||
        !source ||
        !target ||
        source.length > 512 ||
        target.length > 512
      ) {
        throw new MigrationCliArgumentError(
          "--project-alias must be source=target with each side at most 512 characters",
        );
      }
      if (Object.hasOwn(projectAliases, source)) {
        throw new MigrationCliArgumentError(
          `Duplicate project alias source: ${source}`,
        );
      }
      projectAliases[source] = target;
      continue;
    }
    if (arg === "--timeout-ms") {
      takeOnce(arg);
      const value = takeValue(index, arg);
      index++;
      timeoutMs = Number(value);
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1_000 ||
        timeoutMs > 120_000
      ) {
        throw new MigrationCliArgumentError(
          "--timeout-ms must be an integer from 1000 to 120000",
        );
      }
      continue;
    }
    if (arg === "--url") {
      takeOnce(arg);
      url = takeValue(index, arg);
      index++;
      continue;
    }
    throw new MigrationCliArgumentError(`Unknown argument: ${arg}`);
  }

  if (help) return { help, request, url, timeoutMs };
  if (Boolean(request.dbPath) === Boolean(request.step)) {
    throw new MigrationCliArgumentError(
      "Exactly one of --db-path or --step is required",
    );
  }
  if (request.action && !request.dbPath) {
    throw new MigrationCliArgumentError("--action requires --db-path");
  }
  if (request.dryRun && !request.step) {
    throw new MigrationCliArgumentError("--dry-run requires --step");
  }
  if (dryRunMode === "apply" && request.step !== "transition-project-processing-policy") {
    throw new MigrationCliArgumentError(
      "--apply requires --step transition-project-processing-policy",
    );
  }
  if (aliasCount > 0 && request.step !== "normalize-project-scopes") {
    throw new MigrationCliArgumentError(
      "--project-alias requires --step normalize-project-scopes",
    );
  }
  if (aliasCount > 0) request.projectAliases = projectAliases;
  const policyFieldsProvided =
    request.project !== undefined ||
    request.privacy !== undefined ||
    request.externalProcessing !== undefined ||
    request.acknowledgeHistoricalContent !== undefined;
  if (
    policyFieldsProvided &&
    request.step !== "transition-project-processing-policy"
  ) {
    throw new MigrationCliArgumentError(
      "project policy options require --step transition-project-processing-policy",
    );
  }
  if (request.step === "transition-project-processing-policy") {
    if (!request.project || request.project.length > 512) {
      throw new MigrationCliArgumentError(
        "--project is required and must be at most 512 characters",
      );
    }
    if (!request.privacy) {
      throw new MigrationCliArgumentError("--privacy is required");
    }
    if (request.externalProcessing === undefined) {
      throw new MigrationCliArgumentError(
        "--external-processing is required",
      );
    }
    if (
      request.privacy === "strict" &&
      request.externalProcessing === true
    ) {
      throw new MigrationCliArgumentError(
        "strict privacy cannot enable external processing",
      );
    }
    if (
      (request.privacy !== "strict" || request.externalProcessing) &&
      request.acknowledgeHistoricalContent !== true
    ) {
      throw new MigrationCliArgumentError(
        "--acknowledge-historical-content is required for this transition",
      );
    }
    request.dryRun ??= true;
  }
  return { help, request, url, timeoutMs };
}

function resolveMigrationEndpoint(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new MigrationCliArgumentError("AGENTMEMORY_URL is not a valid URL");
  }
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    !loopbackHosts.has(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new MigrationCliArgumentError(
      "Migration endpoint must be a loopback HTTP(S) base URL without credentials, query, fragment, or path",
    );
  }
  return `${url.origin}/agentmemory/migrate`;
}

function writeCliJson(
  write: (text: string) => void,
  output: MigrationCliOutput,
): void {
  write(`${JSON.stringify(output)}\n`);
}

export async function runMigrationCli(
  args: string[],
  dependencies: MigrationCliDependencies = {},
): Promise<number> {
  const env = dependencies.env ?? process.env;
  const writeStdout =
    dependencies.stdout ?? ((text: string) => process.stdout.write(text));
  const writeStderr =
    dependencies.stderr ?? ((text: string) => process.stderr.write(text));

  let parsed: ReturnType<typeof parseMigrationCliArgs>;
  try {
    parsed = parseMigrationCliArgs(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeCliJson(writeStderr, {
      operationSucceeded: false,
      error: { code: "invalid-arguments", message },
    });
    return 2;
  }
  if (parsed.help) {
    writeStdout(MIGRATION_CLI_USAGE);
    return 0;
  }

  let adminSecret = env["AGENTMEMORY_ADMIN_SECRET"]?.trim();
  if (!adminSecret) {
    const configuredSecretFile =
      env["AGENTMEMORY_ADMIN_SECRET_FILE"]?.trim();
    const secretFile =
      configuredSecretFile ||
      (dependencies.env === undefined
        ? resolve(homedir(), ".agentmemory", "admin-secret")
        : undefined);
    if (secretFile) {
      const expandedSecretFile = secretFile.startsWith("~/")
        ? resolve(homedir(), secretFile.slice(2))
        : resolve(secretFile);
      try {
        adminSecret = readFileSync(expandedSecretFile, "utf8").trim();
      } catch {
        adminSecret = undefined;
      }
    }
  }
  if (!adminSecret) {
    writeCliJson(writeStderr, {
      operationSucceeded: false,
      request: parsed.request,
      error: {
        code: "missing-auth",
        message:
          "AGENTMEMORY_ADMIN_SECRET or a readable AGENTMEMORY_ADMIN_SECRET_FILE is required",
      },
    });
    return 2;
  }

  let endpoint: string;
  try {
    endpoint = resolveMigrationEndpoint(
      parsed.url ?? env["AGENTMEMORY_URL"] ?? "http://127.0.0.1:3111",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeCliJson(writeStderr, {
      operationSucceeded: false,
      request: parsed.request,
      error: { code: "invalid-endpoint", message },
    });
    return 2;
  }

  let response: globalThis.Response;
  try {
    response = await (dependencies.fetchImpl ?? fetch)(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${adminSecret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(parsed.request),
      signal: AbortSignal.timeout(parsed.timeoutMs),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeCliJson(writeStderr, {
      operationSucceeded: false,
      endpoint,
      request: parsed.request,
      error: { code: "request-failed", message },
    });
    return 1;
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeCliJson(writeStderr, {
      operationSucceeded: false,
      endpoint,
      request: parsed.request,
      httpStatus: response.status,
      error: { code: "invalid-response", message },
    });
    return 1;
  }

  const rollbackSucceeded =
    parsed.request.action === "rollback" &&
    isRecord(result) &&
    result["status"] === "rolled-back" &&
    isRecord(result["rollback"]) &&
    result["rollback"]["success"] === true;
  const migrationSucceeded =
    parsed.request.action !== "rollback" &&
    isRecord(result) &&
    result["success"] === true;
  const operationSucceeded =
    response.ok && (rollbackSucceeded || migrationSucceeded);
  const output: MigrationCliOutput = {
    operationSucceeded,
    endpoint,
    request: parsed.request,
    httpStatus: response.status,
    result,
    ...(!operationSucceeded && {
      error: {
        code: "operation-incomplete" as const,
        message: response.ok
          ? "Migration endpoint did not confirm operational success"
          : `Migration endpoint returned HTTP ${response.status}`,
      },
    }),
  };
  writeCliJson(operationSucceeded ? writeStdout : writeStderr, output);
  return operationSucceeded ? 0 : 1;
}

export function isDirectMigrationCliInvocation(
  moduleUrl: string,
  argvPath: string | undefined,
  resolveRealPath: (path: string) => string = (path) => realpathSync(path),
): boolean {
  if (!argvPath) return false;
  const resolvedArgvPath = resolve(argvPath);
  if (moduleUrl === pathToFileURL(resolvedArgvPath).href) return true;
  try {
    return (
      resolveRealPath(fileURLToPath(moduleUrl)) ===
      resolveRealPath(resolvedArgvPath)
    );
  } catch {
    return false;
  }
}

const isDirectMigrationCli = isDirectMigrationCliInvocation(
  import.meta.url,
  process.argv[1],
);

if (isDirectMigrationCli) {
  process.exitCode = await runMigrationCli(process.argv.slice(2));
}
