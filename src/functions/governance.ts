import type { ISdk } from "iii-sdk";
import type { Memory, GovernanceFilter, AuditEntry } from "../types.js";
import { generateId, KV } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import { safeAudit, queryAudit } from "./audit.js";
import { deleteAccessLogStrict } from "./access-tracker.js";
import { getSearchIndex, vectorIndexRemove, flushIndexSave } from "./search.js";
import { logger } from "../logger.js";

const GOVERNANCE_DELETE_LOCK = "mem:governance-delete";
const DEFAULT_RECOVERY_AUDIT_LIMIT = 100_000;
const MAX_RECOVERY_AUDIT_LIMIT = 1_000_000;

interface ConfirmedCandidate {
  id: string;
}

interface DeleteResult {
  id: string;
  deleted: boolean;
  errors: string[];
}

function recoveryAuditLimit(): number {
  const raw = process.env.AGENTMEMORY_STARTUP_GOVERNANCE_MAX_AUDIT_ENTRIES;
  if (!raw) return DEFAULT_RECOVERY_AUDIT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, MAX_RECOVERY_AUDIT_LIMIT)
    : DEFAULT_RECOVERY_AUDIT_LIMIT;
}

function parseIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
}

function parseConfirmedCandidates(details: Record<string, unknown>): ConfirmedCandidate[] {
  if (!Array.isArray(details.confirmedCandidates)) return [];
  return details.confirmedCandidates.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const id = (value as Record<string, unknown>).id;
    return typeof id === "string" && id.length > 0 ? [{ id }] : [];
  });
}

async function deleteConfirmedCandidate(
  kv: StateKV,
  functionId: string,
  operationId: string,
  memory: Memory,
): Promise<DeleteResult> {
  if (memory.imageRef) {
    return {
      id: memory.id,
      deleted: false,
      errors: ["image_backed_memory_requires_memory_forget"],
    };
  }
  try {
    await kv.delete(KV.memories, memory.id);
  } catch (error) {
    logger.warn("Governance canonical delete failed", {
      memoryId: memory.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { id: memory.id, deleted: false, errors: ["delete_failed"] };
  }

  const errors: string[] = [];
  try {
    await deleteAccessLogStrict(kv, memory.id);
  } catch {
    errors.push("access_cleanup_unknown");
  }
  try {
    getSearchIndex().remove(memory.id);
    vectorIndexRemove(memory.id);
  } catch {
    errors.push("index_cleanup_unknown");
  }

  // Recovery only attributes a deletion when this durable progress row exists.
  // If the process stops after the canonical delete but before this row, the
  // restart outcome is explicitly unknown and no destructive replay occurs.
  await safeAudit(kv, "delete", functionId, [memory.id], {
    operationId,
    phase: "progress",
    candidateId: memory.id,
    cleanupComplete: errors.length === 0,
    cleanupErrors: errors,
  });
  return { id: memory.id, deleted: true, errors };
}

function summarize(results: DeleteResult[]): {
  deletedIds: string[];
  failures: Array<{ id: string; error: string }>;
  cleanupUnknownIds: string[];
} {
  const deletedIds = results.filter((result) => result.deleted).map((result) => result.id);
  const failures = results.flatMap((result) =>
    result.errors.map((error) => ({ id: result.id, error })),
  );
  const cleanupUnknownIds = results
    .filter((result) => result.deleted && result.errors.length > 0)
    .map((result) => result.id);
  return { deletedIds, failures, cleanupUnknownIds };
}

export function registerGovernanceFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction(
    "mem::governance-delete",
    async (data: {
      memoryIds: string[];
      reason?: string;
      project?: string;
      scope?: "global";
    }) => {
      if (!Array.isArray(data.memoryIds) || data.memoryIds.length === 0) {
        return { success: false, error: "memoryIds array is required" };
      }
      const project =
        typeof data.project === "string" && data.project.trim()
          ? data.project.trim()
          : undefined;
      const globalScope = data.scope === "global";
      if (
        (data.scope !== undefined && !globalScope) ||
        Boolean(project) === globalScope
      ) {
        return {
          success: false,
          error: "exactly_one_project_or_global_scope_required",
        };
      }
      return withKeyedLock(GOVERNANCE_DELETE_LOCK, async () => {
        const requestedIds = [...new Set(data.memoryIds)];
        const confirmed: Memory[] = [];
        const missingIds: string[] = [];
        const outOfScopeIds: string[] = [];
        const lookupFailures: Array<{ id: string; error: string }> = [];
        for (const id of requestedIds) {
          try {
            const memory = await kv.get<Memory>(KV.memories, id);
            if (
              memory &&
              (data.scope === "global" ||
                memory.project === project)
            ) {
              confirmed.push(memory);
            } else if (memory) {
              outOfScopeIds.push(id);
            }
            else missingIds.push(id);
          } catch (error) {
            lookupFailures.push({ id, error: "lookup_failed" });
            logger.warn("Governance lookup failed", {
              memoryId: id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        const operationId = generateId("govdel");
        await safeAudit(kv, "delete", "mem::governance-delete", [], {
          reason: data.reason || "manual deletion",
          requestedIds,
          confirmedCandidates: confirmed.map((memory) => ({ id: memory.id })),
          candidateIds: confirmed.map((memory) => memory.id),
          missingIds,
          outOfScopeIds,
          lookupFailedIds: lookupFailures.map((failure) => failure.id),
          operationId,
          phase: "intent",
        });

        const results: DeleteResult[] = [];
        for (const memory of confirmed) {
          results.push(
            await deleteConfirmedCandidate(
              kv,
              "mem::governance-delete",
              operationId,
              memory,
            ),
          );
        }
        const summary = summarize(results);
        const failures = [
          ...lookupFailures,
          ...outOfScopeIds.map((id) => ({
            id,
            error: "project_scope_mismatch",
          })),
          ...summary.failures,
        ];
        if (summary.deletedIds.length > 0) await flushIndexSave();
        await safeAudit(kv, "delete", "mem::governance-delete", summary.deletedIds, {
          reason: data.reason || "manual deletion",
          deleted: summary.deletedIds.length,
          missingIds,
          outOfScopeIds,
          failedIds: [...new Set(failures.map((failure) => failure.id))],
          cleanupUnknownIds: summary.cleanupUnknownIds,
          operationId,
          phase: "outcome",
          outcomeCertainty:
            summary.cleanupUnknownIds.length === 0 ? "complete" : "cleanup_unknown",
        });

        logger.info("Governance delete", {
          requested: requestedIds.length,
          deleted: summary.deletedIds.length,
          failed: failures.length,
        });
        return {
          success: failures.length === 0,
          deleted: summary.deletedIds.length,
          total: requestedIds.length,
          failures: failures.length > 0 ? failures : undefined,
        };
      });
    },
  );

  sdk.registerFunction(
    "mem::governance-bulk",
    async (data: GovernanceFilter & { dryRun?: boolean }) => {
      const hasFilter =
        (data.type && data.type.length > 0) ||
        data.dateFrom ||
        data.dateTo ||
        data.qualityBelow !== undefined;
      if (!hasFilter && !data.dryRun) {
        return {
          success: false,
          error: "At least one filter is required for non-dryRun bulk delete",
        };
      }

      return withKeyedLock(GOVERNANCE_DELETE_LOCK, async () => {
        let candidates = await kv.list<Memory>(KV.memories);
        if (data.type && data.type.length > 0) {
          candidates = candidates.filter((memory) => data.type!.includes(memory.type));
        }
        if (data.dateFrom) {
          const from = new Date(data.dateFrom).getTime();
          if (Number.isNaN(from)) return { success: false, error: "Invalid dateFrom format" };
          candidates = candidates.filter(
            (memory) => new Date(memory.createdAt).getTime() >= from,
          );
        }
        if (data.dateTo) {
          const to = new Date(data.dateTo).getTime();
          if (Number.isNaN(to)) return { success: false, error: "Invalid dateTo format" };
          candidates = candidates.filter(
            (memory) => new Date(memory.createdAt).getTime() <= to,
          );
        }
        if (data.qualityBelow !== undefined) {
          candidates = candidates.filter((memory) => memory.strength < data.qualityBelow!);
        }
        if (data.dryRun) {
          return {
            success: true,
            dryRun: true,
            wouldDelete: candidates.length,
            ids: candidates.map((memory) => memory.id),
          };
        }

        const operationId = generateId("govdel");
        await safeAudit(kv, "delete", "mem::governance-bulk", [], {
          filter: data,
          plannedDeletes: candidates.length,
          confirmedCandidates: candidates.map((memory) => ({ id: memory.id })),
          candidateIds: candidates.map((memory) => memory.id),
          operationId,
          phase: "intent",
        });

        const results: DeleteResult[] = [];
        for (let offset = 0; offset < candidates.length; offset += 50) {
          results.push(
            ...(await Promise.all(
              candidates.slice(offset, offset + 50).map((memory) =>
                deleteConfirmedCandidate(
                  kv,
                  "mem::governance-bulk",
                  operationId,
                  memory,
                ),
              ),
            )),
          );
        }
        const summary = summarize(results);
        if (summary.deletedIds.length > 0) await flushIndexSave();
        await safeAudit(kv, "delete", "mem::governance-bulk", summary.deletedIds, {
          deleted: summary.deletedIds.length,
          failed: summary.failures.length,
          failedIds: [...new Set(summary.failures.map((failure) => failure.id))],
          cleanupUnknownIds: summary.cleanupUnknownIds,
          operationId,
          phase: "outcome",
          outcomeCertainty:
            summary.cleanupUnknownIds.length === 0 ? "complete" : "cleanup_unknown",
        });
        return {
          success: summary.failures.length === 0,
          deleted: summary.deletedIds.length,
          failed: summary.failures.length,
          failures: summary.failures.length > 0 ? summary.failures : undefined,
        };
      });
    },
  );

  sdk.registerFunction(
    "mem::audit-query",
    async (data?: {
      operation?: AuditEntry["operation"];
      dateFrom?: string;
      dateTo?: string;
      limit?: number;
      project?: string;
    }) => queryAudit(kv, data),
  );
}

export async function reconcileGovernanceDeleteIntents(
  kv: StateKV,
): Promise<number> {
  const recoverableFunctions = new Set([
    "mem::governance-delete",
    "mem::governance-bulk",
  ]);
  const allEntries = await kv.list<AuditEntry>(KV.audit);
  const limit = recoveryAuditLimit();
  if (allEntries.length > limit) {
    throw new Error(
      `governance audit inventory exceeds startup limit (${allEntries.length}/${limit})`,
    );
  }
  const entries = allEntries.filter((entry) => entry.operation === "delete");
  const keyFor = (entry: AuditEntry): string =>
    `${entry.functionId}:${String(entry.details.operationId)}`;
  const completed = new Set(
    entries
      .filter(
        (entry) =>
          recoverableFunctions.has(entry.functionId) &&
          entry.details.phase === "outcome" &&
          typeof entry.details.operationId === "string",
      )
      .map(keyFor),
  );
  const progress = new Map<string, AuditEntry>();
  for (const entry of entries) {
    if (
      recoverableFunctions.has(entry.functionId) &&
      entry.details.phase === "progress" &&
      typeof entry.details.operationId === "string" &&
      typeof entry.details.candidateId === "string"
    ) {
      progress.set(`${keyFor(entry)}:${entry.details.candidateId}`, entry);
    }
  }

  let recovered = 0;
  for (const entry of entries) {
    const operationId = entry.details.operationId;
    const key = keyFor(entry);
    if (
      !recoverableFunctions.has(entry.functionId) ||
      entry.details.phase !== "intent" ||
      typeof operationId !== "string" ||
      completed.has(key)
    ) {
      continue;
    }
    const confirmed = parseConfirmedCandidates(entry.details);
    const legacyIds = confirmed.length === 0 ? parseIds(entry.details.candidateIds) : [];
    const deletedIds: string[] = [];
    const retainedIds: string[] = [];
    const unknownIds = [...legacyIds];
    const cleanupUnknownIds: string[] = [];
    for (const candidate of confirmed) {
      const progressEntry = progress.get(`${key}:${candidate.id}`);
      if (progressEntry) {
        deletedIds.push(candidate.id);
        if (progressEntry.details.cleanupComplete !== true) {
          cleanupUnknownIds.push(candidate.id);
        }
        continue;
      }
      const memory = await kv.get<Memory>(KV.memories, candidate.id);
      if (memory) retainedIds.push(candidate.id);
      else unknownIds.push(candidate.id);
    }
    await safeAudit(kv, "delete", entry.functionId, deletedIds, {
      operationId,
      phase: "outcome",
      recoveredAfterRestart: true,
      deleted: deletedIds.length,
      retainedIds,
      unknownIds,
      cleanupUnknownIds,
      outcomeCertainty:
        unknownIds.length === 0 && cleanupUnknownIds.length === 0
          ? "complete"
          : "unknown",
    });
    completed.add(key);
    recovered += 1;
  }
  return recovered;
}
