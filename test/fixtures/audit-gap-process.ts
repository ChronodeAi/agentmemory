import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAuditPersistenceHealth,
  recoverAuditGaps,
  safeAudit,
} from "../../src/functions/audit.js";
import { InMemoryKV } from "../../src/mcp/in-memory-kv.js";
import { KV } from "../../src/state/schema.js";
import type { AuditEntry } from "../../src/types.js";

const [mode, statePath, spoolPath, receiptPath, token = "canary"] =
  process.argv.slice(2);
if (!mode || !statePath || !spoolPath || !receiptPath) {
  throw new Error(
    "usage: audit-gap-process <seed|recover> <state> <spool> <receipt>",
  );
}

process.env["AGENTMEMORY_AUDIT_GAP_FILE"] = spoolPath;

function spoolRecords(): Array<{ entry: AuditEntry }> {
  const directory = `${spoolPath}.d`;
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => {
      const envelope = JSON.parse(readFileSync(join(directory, name), "utf8")) as {
        gap: { entry: AuditEntry };
      };
      return envelope.gap;
    });
}

if (mode === "seed") {
  const unavailableKv = {
    async get(): Promise<never> {
      throw new Error("primary state unavailable");
    },
    async set(): Promise<never> {
      throw new Error("primary state unavailable");
    },
    async delete(): Promise<never> {
      throw new Error("primary state unavailable");
    },
    async list(): Promise<never> {
      throw new Error("primary state unavailable");
    },
  };
  await safeAudit(
    unavailableKv as never,
    "observe",
    `process-boundary-${token}`,
    [`synthetic-observation-${token}`],
    { synthetic: true },
  );
  const records = spoolRecords();
  writeFileSync(
    receiptPath,
    JSON.stringify({
      seededByPid: process.pid,
      gapCount: records.length,
      functionId: `process-boundary-${token}`,
    }),
  );
  process.exit(0);
}

if (mode === "recover") {
  const kv = new InMemoryKV(statePath);
  const recovered = await recoverAuditGaps(kv as never);
  kv.persist();
  const audits = await kv.list<AuditEntry>(KV.audit);
  writeFileSync(
    receiptPath,
    JSON.stringify({
      recoveredByPid: process.pid,
      recovered,
      audits: audits.map((entry) => ({
        id: entry.id,
        functionId: entry.functionId,
        targetIds: entry.targetIds,
      })),
      health: getAuditPersistenceHealth(),
      spoolExists: existsSync(`${spoolPath}.d`),
      spoolGapCount: spoolRecords().length,
    }),
  );
} else if (mode !== "seed") {
  throw new Error(`unknown mode: ${mode}`);
}
