import type { ISdk } from "iii-sdk";
import { resolve } from "node:path";
import { homedir } from "node:os";
import {
  KV,
  fingerprintId,
  generateId,
} from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import type {
  Memory,
  Session,
  CompressedObservation,
  SessionSummary,
} from "../types.js";
import { logger } from "../logger.js";

const ALLOWED_DIRS = [resolve(homedir(), ".agentmemory")];

type ProjectRecord = Record<string, unknown> & { project?: string };

export interface ProjectScopeMigrationResult {
  scanned: number;
  normalized: number;
  unchanged: number;
  quarantined: number;
  exactDuplicatesSuperseded: number;
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
  return ALLOWED_DIRS.some((dir) => resolved.startsWith(dir + "/"));
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

export function registerMigrateFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction("mem::migrate",
    async (data: {
      dbPath?: string;
      step?: string;
      dryRun?: boolean;
      projectAliases?: Record<string, string>;
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
          error: `Path not allowed. Must be under: ${ALLOWED_DIRS.join(", ")}`,
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
        let sessionCount = 0;
        let obsCount = 0;
        let summaryCount = 0;

        const sessions = db
          .prepare("SELECT * FROM sessions ORDER BY created_at DESC")
          .all() as any[];
        for (const row of sessions) {
          const session: Session = {
            id: row.session_id || row.id,
            project: row.project_path || row.project || "unknown",
            cwd: row.cwd || row.project_path || "",
            startedAt:
              row.created_at || row.started_at || new Date().toISOString(),
            endedAt: row.ended_at || row.updated_at,
            status: "completed",
            observationCount: 0,
          };
          await kv.set(KV.sessions, session.id, session);
          sessionCount++;
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

        for (const row of observations) {
          const sessionId = row.session_id || "migrated";
          const obs: CompressedObservation = {
            id: row.id || generateId("mig"),
            sessionId,
            timestamp: row.created_at || new Date().toISOString(),
            type: row.type || "other",
            title: row.title || row.summary || "Migrated observation",
            subtitle: row.subtitle,
            facts: safeJsonParse(row.facts, []),
            narrative: row.narrative || row.content || "",
            concepts: safeJsonParse(row.concepts, []),
            files: safeJsonParse(row.files, []),
            importance: row.importance || 5,
          };
          await kv.set(KV.observations(sessionId), obs.id, obs);
          obsCount++;
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
            createdAt: row.created_at || new Date().toISOString(),
            title: row.title || "Migrated session",
            narrative: row.narrative || row.summary || "",
            keyDecisions: safeJsonParse(row.key_decisions, []),
            filesModified: safeJsonParse(row.files_modified, []),
            concepts: safeJsonParse(row.concepts, []),
            observationCount: row.observation_count || 0,
          };
          await kv.set(KV.summaries, row.session_id, summary);
          summaryCount++;
        }

        logger.info("Migration complete", {
          sessionCount,
          obsCount,
          summaryCount,
        });
        return { success: true, sessionCount, obsCount, summaryCount };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("Migration failed", { error: msg });
        return { success: false, error: "Migration failed" };
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
