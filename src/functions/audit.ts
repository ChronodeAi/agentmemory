import type { AuditEntry } from "../types.js";
import { KV, generateId } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { logger } from "../logger.js";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { withProcessLock } from "../state/process-lock.js";

type AuditPersistenceHealth = NonNullable<
  import("../types.js").HealthSnapshot["auditPersistence"]
>;

let auditPersistence: AuditPersistenceHealth = createAuditPersistenceHealth();
const volatileAuditGaps = new Map<string, AuditGapRecord>();
let recoveryInFlight: Promise<number> | null = null;
const AUDIT_SPOOL_SCHEMA_VERSION = 1;
const AUDIT_SPOOL_MAX_BYTES = 16 * 1024 * 1024;
const DEFAULT_STARTUP_AUDIT_GAP_LIMIT = 100_000;
const MAX_STARTUP_AUDIT_GAP_LIMIT = 1_000_000;

type AuditGapRecord = {
  entry: AuditEntry;
  queuedAt: string;
  errorCode: string;
};

type AuditGapEnvelope = {
  schemaVersion: 1;
  gap: AuditGapRecord;
};

function startupAuditGapLimit(): number {
  const raw = process.env.AGENTMEMORY_STARTUP_AUDIT_GAP_MAX_ENTRIES;
  if (!raw) return DEFAULT_STARTUP_AUDIT_GAP_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(parsed, MAX_STARTUP_AUDIT_GAP_LIMIT)
    : DEFAULT_STARTUP_AUDIT_GAP_LIMIT;
}

function auditGapSpoolPath(): string {
  return (
    process.env["AGENTMEMORY_AUDIT_GAP_FILE"]?.trim() ||
    join(homedir(), ".agentmemory", "audit-gaps.json")
  );
}

function auditGapSpoolDirectory(): string {
  return `${auditGapSpoolPath()}.d`;
}

function auditGapRecordPath(id: string): string {
  if (!/^aud_[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error("audit gap id is not safe for spool persistence");
  }
  return join(auditGapSpoolDirectory(), `${id}.json`);
}

function validateAuditGap(value: unknown): AuditGapRecord {
  if (!value || typeof value !== "object") {
    throw new Error("audit gap spool contains a non-object record");
  }
  const gap = value as Partial<AuditGapRecord>;
  if (
    !gap.entry ||
    typeof gap.entry !== "object" ||
    typeof gap.entry.id !== "string" ||
    !gap.entry.id.startsWith("aud_") ||
    typeof gap.queuedAt !== "string" ||
    typeof gap.errorCode !== "string"
  ) {
    throw new Error("audit gap spool contains an invalid record");
  }
  return gap as AuditGapRecord;
}

function readAuditGapSpool(): AuditGapRecord[] {
  const directory = auditGapSpoolDirectory();
  if (!existsSync(directory)) return [];
  let totalBytes = 0;
  const records: AuditGapRecord[] = [];
  for (const name of readdirSync(directory).sort()) {
    if (name.endsWith(".tmp")) continue;
    if (!/^aud_[A-Za-z0-9_-]+\.json$/.test(name)) {
      throw new Error("audit gap spool contains an unexpected entry");
    }
    const path = join(directory, name);
    totalBytes += statSync(path).size;
    if (totalBytes > AUDIT_SPOOL_MAX_BYTES) {
      throw new Error("audit gap spool exceeds its bounded size");
    }
    const parsed = JSON.parse(
      readFileSync(path, "utf8"),
    ) as Partial<AuditGapEnvelope>;
    if (
      parsed.schemaVersion !== AUDIT_SPOOL_SCHEMA_VERSION ||
      !parsed.gap
    ) {
      throw new Error("audit gap spool schema is invalid");
    }
    const gap = validateAuditGap(parsed.gap);
    if (`${gap.entry.id}.json` !== name) {
      throw new Error("audit gap spool filename does not match its record");
    }
    records.push(gap);
  }
  return records;
}

function fsyncDirectory(path: string): void {
  if (process.platform === "win32") return;
  const fd = openSync(path, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function writeAuditGapRecord(gap: AuditGapRecord): void {
  const directory = auditGapSpoolDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    chmodSync(directory, 0o700);
  } catch {}
  const envelope: AuditGapEnvelope = {
    schemaVersion: AUDIT_SPOOL_SCHEMA_VERSION,
    gap,
  };
  const encoded = `${JSON.stringify(envelope)}\n`;
  if (Buffer.byteLength(encoded) > AUDIT_SPOOL_MAX_BYTES) {
    throw new Error("audit gap record exceeds its bounded size");
  }
  const existingBytes = readdirSync(directory).reduce((total, name) => {
    if (!name.endsWith(".json")) return total;
    return total + statSync(join(directory, name)).size;
  }, 0);
  if (existingBytes + Buffer.byteLength(encoded) > AUDIT_SPOOL_MAX_BYTES) {
    throw new Error("audit gap spool would exceed its bounded size");
  }
  const path = auditGapRecordPath(gap.entry.id);
  const temporary = join(
    directory,
    `${gap.entry.id}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  let fd: number | null = null;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeFileSync(fd, encoded, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    renameSync(temporary, path);
    try {
      chmodSync(path, 0o600);
    } catch {}
    fsyncDirectory(directory);
  } catch (error) {
    if (fd !== null) closeSync(fd);
    try {
      unlinkSync(temporary);
    } catch {}
    throw error;
  }
}

function deleteAuditGapRecord(id: string): void {
  const path = auditGapRecordPath(id);
  try {
    unlinkSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  fsyncDirectory(auditGapSpoolDirectory());
}

function createAuditPersistenceHealth(): AuditPersistenceHealth {
  return {
    status: "idle",
    attempts: 0,
    succeeded: 0,
    failed: 0,
    pending: 0,
    recovered: 0,
    unresolvedFailures: 0,
  };
}

function auditErrorCode(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && code.trim()) return code.trim().slice(0, 96);
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|invocation stopped/i.test(message)
    ? "TIMEOUT"
    : "AUDIT_PERSISTENCE_FAILED";
}

export function getAuditPersistenceHealth(): AuditPersistenceHealth {
  return { ...auditPersistence };
}

export function resetAuditPersistenceHealthForTests(): void {
  auditPersistence = createAuditPersistenceHealth();
  volatileAuditGaps.clear();
  recoveryInFlight = null;
}

// Audit coverage policy (issue #125).
//
// Every structural deletion of a memory, observation, session, or
// semantic row MUST call recordAudit. Two shapes are allowed, keyed to
// whether the caller is scoped or bulk:
//
//   Scoped deletions — a user-visible, per-call action removing a
//   bounded set of items. Emit ONE audit row per call with targetIds
//   populated. Examples: mem::governance-delete, mem::forget.
//
//   Bulk deletions — automatic sweeps (retention, TTL eviction,
//   auto-forget) that can remove hundreds of rows per invocation.
//   Emit ONE batched audit row per invocation with targetIds listing
//   every removed id and details.evicted holding the count. Per-item
//   audit rows would flood the audit log during routine sweeps.
//
//   Either shape is required; silent deletes are not acceptable.
//
// operation field:
//   - "delete"          — permanent removal (governance, retention sweep, evict).
//   - "forget"          — forget/removal flows. Scoped when emitted by
//                         mem::forget (user-initiated); bulk-batched when
//                         emitted by mem::auto-forget (automatic sweep).
//   - everything else   — see AuditEntry["operation"] union in src/types.ts.
//
// When adding a new deletion path, add an explicit recordAudit call
// BEFORE kv.delete(...) and match one of the two shapes above.

function createAuditEntry(
  operation: AuditEntry["operation"],
  functionId: string,
  targetIds: string[],
  details: Record<string, unknown> = {},
  qualityScore?: number,
  userId?: string,
): AuditEntry {
  return {
    id: generateId("aud"),
    timestamp: new Date().toISOString(),
    operation,
    userId,
    functionId,
    targetIds,
    details,
    qualityScore,
  };
}

async function writeAuditEntry(
  kv: StateKV,
  entry: AuditEntry,
): Promise<AuditEntry> {
  auditPersistence.attempts += 1;
  auditPersistence.lastAttemptAt = new Date().toISOString();
  try {
    await kv.set(KV.audit, entry.id, entry);
    auditPersistence.succeeded += 1;
    auditPersistence.status =
      auditPersistence.pending > 0 ? "recovering" : "ready";
    auditPersistence.lastSuccessAt = new Date().toISOString();
    if (auditPersistence.pending === 0) {
      auditPersistence.lastErrorCode = undefined;
    }
    return entry;
  } catch (error) {
    auditPersistence.failed += 1;
    auditPersistence.status = "failed";
    auditPersistence.lastFailureAt = new Date().toISOString();
    auditPersistence.lastErrorCode = auditErrorCode(error);
    throw error;
  }
}

export async function recordAudit(
  kv: StateKV,
  operation: AuditEntry["operation"],
  functionId: string,
  targetIds: string[],
  details: Record<string, unknown> = {},
  qualityScore?: number,
  userId?: string,
): Promise<AuditEntry> {
  return writeAuditEntry(
    kv,
    createAuditEntry(
      operation,
      functionId,
      targetIds,
      details,
      qualityScore,
      userId,
    ),
  );
}

async function queueAuditGap(
  kv: StateKV,
  entry: AuditEntry,
  error: unknown,
): Promise<void> {
  const gap: AuditGapRecord = {
    entry,
    queuedAt: new Date().toISOString(),
    errorCode: auditErrorCode(error),
  };
  let spoolDurable = false;
  let stateDurable = false;
  try {
    await withProcessLock(
      "audit-gap-spool",
      () => writeAuditGapRecord(gap),
      { root: `${auditGapSpoolPath()}.locks` },
    );
    spoolDurable = true;
  } catch {}
  try {
    await kv.set(KV.auditGaps, entry.id, gap);
    stateDurable = true;
  } catch {
    if (!spoolDurable) {
      volatileAuditGaps.set(entry.id, gap);
    }
  }
  if (!spoolDurable && !stateDurable) volatileAuditGaps.set(entry.id, gap);
  auditPersistence.pending += 1;
  auditPersistence.unresolvedFailures = auditPersistence.pending;
  auditPersistence.status = spoolDurable || stateDurable ? "recovering" : "failed";
  auditPersistence.lastErrorCode = gap.errorCode;
  if (!spoolDurable && !stateDurable) {
    throw new Error("audit persistence has no durable sink");
  }
}

async function recoverAuditGapsNow(kv: StateKV): Promise<number> {
  let durable: AuditGapRecord[] = [];
  try {
    durable = await kv.list<AuditGapRecord>(KV.auditGaps);
  } catch (error) {
    auditPersistence.status = "failed";
    auditPersistence.lastErrorCode = auditErrorCode(error);
    throw error;
  }
  const limit = startupAuditGapLimit();
  if (durable.length > limit) {
    auditPersistence.status = "failed";
    auditPersistence.lastErrorCode = "AUDIT_GAP_INVENTORY_LIMIT";
    throw new Error(
      `audit-gap inventory exceeds startup limit (${durable.length}/${limit})`,
    );
  }
  const gaps = new Map<string, AuditGapRecord>();
  for (const gap of durable) gaps.set(gap.entry.id, gap);
  let spooled: AuditGapRecord[] = [];
  try {
    spooled = readAuditGapSpool();
  } catch (error) {
    auditPersistence.status = "failed";
    auditPersistence.lastErrorCode = "AUDIT_SPOOL_UNAVAILABLE";
    throw error;
  }
  for (const gap of spooled) gaps.set(gap.entry.id, gap);
  for (const [id, gap] of volatileAuditGaps) gaps.set(id, gap);
  if (gaps.size > limit) {
    auditPersistence.status = "failed";
    auditPersistence.lastErrorCode = "AUDIT_GAP_INVENTORY_LIMIT";
    throw new Error(
      `combined audit-gap inventory exceeds startup limit (${gaps.size}/${limit})`,
    );
  }
  auditPersistence.pending = gaps.size;
  auditPersistence.unresolvedFailures = gaps.size;
  if (gaps.size === 0) {
    if (auditPersistence.status === "recovering") {
      auditPersistence.status = "ready";
      auditPersistence.lastErrorCode = undefined;
    }
    return 0;
  }

  auditPersistence.status = "recovering";
  let recovered = 0;
  for (const [id, gap] of gaps) {
    try {
      await writeAuditEntry(kv, gap.entry);
      try {
        await kv.delete(KV.auditGaps, id);
      } catch (error) {
        auditPersistence.status = "failed";
        auditPersistence.lastErrorCode = auditErrorCode(error);
        break;
      }
      try {
        await withProcessLock(
          "audit-gap-spool",
          () => deleteAuditGapRecord(id),
          { root: `${auditGapSpoolPath()}.locks` },
        );
      } catch {
        auditPersistence.status = "failed";
        auditPersistence.lastErrorCode = "AUDIT_SPOOL_UNAVAILABLE";
        break;
      }
      volatileAuditGaps.delete(id);
      recovered += 1;
      auditPersistence.recovered += 1;
      auditPersistence.pending -= 1;
      auditPersistence.unresolvedFailures = auditPersistence.pending;
      auditPersistence.lastRecoveredAt = new Date().toISOString();
    } catch {
      break;
    }
  }
  if (auditPersistence.pending === 0) {
    auditPersistence.status = "ready";
    auditPersistence.lastErrorCode = undefined;
  }
  return recovered;
}

export async function recoverAuditGaps(kv: StateKV): Promise<number> {
  if (!recoveryInFlight) {
    recoveryInFlight = recoverAuditGapsNow(kv).finally(() => {
      recoveryInFlight = null;
    });
  }
  return recoveryInFlight;
}

export async function safeAudit(
  kv: StateKV,
  operation: AuditEntry["operation"],
  functionId: string,
  targetIds: string[],
  details: Record<string, unknown> = {},
  qualityScore?: number,
  userId?: string,
): Promise<void> {
  try {
    await recoverAuditGaps(kv);
  } catch {}
  const entry = createAuditEntry(
    operation,
    functionId,
    targetIds,
    details,
    qualityScore,
    userId,
  );
  try {
    await writeAuditEntry(kv, entry);
  } catch (err) {
    let gapError: unknown;
    try {
      await queueAuditGap(kv, entry, err);
    } catch (error) {
      gapError = error;
    }
    try {
      logger.warn("audit write failed", {
        functionId,
        operation,
        targetIds,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {}
    if (gapError) throw gapError;
  }
}

export async function queryAudit(
  kv: StateKV,
  filter?: {
    operation?: AuditEntry["operation"];
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  },
): Promise<AuditEntry[]> {
  const all = await kv.list<AuditEntry>(KV.audit);
  let entries = [...all].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (filter?.operation) {
    entries = entries.filter((e) => e.operation === filter.operation);
  }
  if (filter?.dateFrom) {
    const from = new Date(filter.dateFrom).getTime();
    if (Number.isNaN(from)) {
      throw new Error(`Invalid dateFrom: ${filter.dateFrom}`);
    }
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= from);
  }
  if (filter?.dateTo) {
    const to = new Date(filter.dateTo).getTime();
    if (Number.isNaN(to)) {
      throw new Error(`Invalid dateTo: ${filter.dateTo}`);
    }
    entries = entries.filter((e) => new Date(e.timestamp).getTime() <= to);
  }

  return entries.slice(0, filter?.limit || 100);
}
