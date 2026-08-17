import type { ISdk } from "iii-sdk";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { KV, generateId } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { recordAudit } from "./audit.js";
import { VERSION } from "../version.js";
import { logger } from "../logger.js";

const COMMIT_HASH_RE = /^[0-9a-f]{7,40}$/i;
const NAMESPACE_KEY_LEDGER = "mem:snapshot:namespace-keys";
const TRACKING_INSTALLED = Symbol("snapshot-key-tracking-installed");
const execFileAsync = promisify(execFile);

type PersistedRecord = {
  key: string;
  value: unknown;
};

type PersistedNamespace = {
  scope: string;
  records: PersistedRecord[];
  sha256: string;
};

type NamespaceTemplate = {
  name: string;
  template: string;
  anchors: string[];
};

type PersistedNamespaceManifest = {
  version: 1;
  fixed: Array<{ name: string; scope: string }>;
  dynamic: NamespaceTemplate[];
  resolvedScopes: string[];
};

type SnapshotState = {
  formatVersion: 2;
  version: string;
  timestamp: string;
  namespaceManifest: PersistedNamespaceManifest;
  namespaces: PersistedNamespace[];
  stateSha256: string;
};

export type SnapshotIncompleteResult = {
  success: false;
  status: "incomplete";
  error: string;
  rollback?: {
    attempted: boolean;
    success: boolean;
    evidencePath: string;
    beforeSha256?: string;
    afterSha256?: string;
    error?: string;
  };
};

const DYNAMIC_NAMESPACE_TEMPLATES: NamespaceTemplate[] = [
  {
    name: "observations",
    template: "mem:obs:{sessionId}",
    anchors: ["mem:sessions"],
  },
  {
    name: "embeddings",
    template: "mem:emb:{observationId}",
    anchors: ["mem:obs:{sessionId}"],
  },
  {
    name: "teamShared",
    template: "mem:team:{teamId}:shared",
    anchors: ["TEAM_ID"],
  },
  {
    name: "teamUsers",
    template: "mem:team:{teamId}:users:{userId}",
    anchors: ["TEAM_ID", "USER_ID"],
  },
  {
    name: "teamProfile",
    template: "mem:team:{teamId}:profile",
    anchors: ["TEAM_ID"],
  },
  {
    name: "enrichedChunks",
    template: "mem:enriched:{sessionId}",
    anchors: ["mem:sessions"],
  },
  {
    name: "latentEmbeddings",
    template: "mem:latent:{observationId}",
    anchors: ["mem:obs:{sessionId}"],
  },
  {
    name: "projectSlots",
    template: "mem:slots:project:{projectSha256Prefix}",
    anchors: ["record.project"],
  },
  {
    name: "injectedSources",
    template: "mem:injected-sources:{sessionId}",
    anchors: ["mem:sessions"],
  },
  {
    name: "factLedger",
    template: "mem:fact-ledger:{sessionId}",
    anchors: ["mem:sessions"],
  },
  {
    name: "projectMetrics",
    template: "mem:project-metrics:{projectSha256Prefix}",
    anchors: ["record.project"],
  },
  {
    name: "promotionCandidates",
    template: "mem:promotion-candidates:{projectSha256Prefix}",
    anchors: ["record.project"],
  },
  {
    name: "migrationStage",
    template: "mem:migration:staging:{generation}",
    anchors: ["mem:migration:reports"],
  },
];

function fixedNamespaces(): Array<{ name: string; scope: string }> {
  const namespaces: Array<{ name: string; scope: string }> = [
    { name: "snapshotNamespaceKeys", scope: NAMESPACE_KEY_LEDGER },
  ];
  for (const [name, value] of Object.entries(KV)) {
    if (typeof value === "string") namespaces.push({ name, scope: value });
  }
  return namespaces.sort((a, b) => a.scope.localeCompare(b.scope));
}

export const PERSISTED_NAMESPACE_MANIFEST = {
  version: 1,
  fixed: fixedNamespaces(),
  dynamic: DYNAMIC_NAMESPACE_TEMPLATES,
} as const;

function assertManifestCoversKv(): void {
  const governedDynamic = Object.entries(KV)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name)
    .sort();
  const declaredDynamic = DYNAMIC_NAMESPACE_TEMPLATES.map(({ name }) => name).sort();
  const declaredKvDynamic = declaredDynamic.filter(
    (name) => name !== "migrationStage",
  );
  if (canonicalJson(governedDynamic) !== canonicalJson(declaredKvDynamic)) {
    throw new Error(
      `Persisted namespace manifest drift: KV dynamic=${governedDynamic.join(",")}; ` +
        `manifest dynamic=${declaredDynamic.join(",")}`,
    );
  }
}

async function gitExec(dir: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd: dir,
    encoding: "utf8",
  });
  return stdout.trim();
}

async function ensureGitRepo(dir: string): Promise<void> {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, ".git"))) {
    await gitExec(dir, ["init"]);
    await gitExec(dir, ["config", "user.email", "agentmemory@local"]);
    await gitExec(dir, ["config", "user.name", "agentmemory"]);
  }
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function stringField(
  record: Record<string, unknown>,
  fields: string[],
): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function recordKey(scope: string, value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const scopeFields: Record<string, string[]> = {
    [KV.summaries]: ["sessionId"],
    [KV.profiles]: ["project"],
    [KV.commits]: ["sha"],
    [KV.accessLog]: ["memoryId"],
    [KV.metrics]: ["functionId"],
    [KV.imageEmbeddings]: ["imageRef"],
    [KV.recentSearches]: ["sessionId"],
  };
  if (scope.startsWith("mem:injected-sources:")) {
    const packetId = stringField(record, ["packetId"]);
    return packetId ? `packet:${packetId}` : undefined;
  }
  return stringField(record, [
    ...(scopeFields[scope] ?? []),
    "id",
    "key",
    "receiptId",
    "sessionId",
    "memoryId",
    "sha",
    "project",
    "label",
    "imageRef",
    "filePath",
    "functionId",
  ]);
}

function ledgerRecordId(scope: string, key: string): string {
  return `namespace-key:${createHash("sha256")
    .update(`${scope}\u0000${key}`)
    .digest("hex")}`;
}

function installNamespaceKeyTracking(kv: StateKV): void {
  const tracked = kv as StateKV & { [TRACKING_INSTALLED]?: boolean };
  if (tracked[TRACKING_INSTALLED]) return;
  const originalSet = kv.set.bind(kv);
  const originalDelete = kv.delete.bind(kv);
  const originalUpdate = kv.update.bind(kv);
  const track = async (scope: string, key: string): Promise<void> => {
    if (scope === NAMESPACE_KEY_LEDGER) return;
    const id = ledgerRecordId(scope, key);
    try {
      await originalSet(NAMESPACE_KEY_LEDGER, id, { id, scope, key });
    } catch (error) {
      logger.warn("Snapshot namespace key ledger update failed", {
        scope,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  kv.set = async <T>(scope: string, key: string, value: T): Promise<T> => {
    const result = await originalSet(scope, key, value);
    await track(scope, key);
    return result;
  };
  kv.update = async <T>(
    scope: string,
    key: string,
    ops: Array<{ type: string; path: string; value?: unknown }>,
  ): Promise<T> => {
    const result = await originalUpdate<T>(scope, key, ops);
    await track(scope, key);
    return result;
  };
  kv.delete = async (scope: string, key: string): Promise<void> => {
    await originalDelete(scope, key);
    if (scope !== NAMESPACE_KEY_LEDGER) {
      try {
        await originalDelete(NAMESPACE_KEY_LEDGER, ledgerRecordId(scope, key));
      } catch (error) {
        logger.warn("Snapshot namespace key ledger deletion failed", {
          scope,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  };
  tracked[TRACKING_INSTALLED] = true;
}

function ledgerKeys(scope: string, allValues: unknown[]): string[] {
  return allValues.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    return record["scope"] === scope && typeof record["key"] === "string"
      ? [record["key"]]
      : [];
  });
}

function collectStrings(
  value: unknown,
  fieldNames: Set<string>,
  output: Set<string>,
): void {
  if (Array.isArray(value)) {
    for (const child of value) collectStrings(child, fieldNames, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (fieldNames.has(key) && typeof child === "string" && child.trim()) {
      output.add(child.trim());
    } else if (fieldNames.has(key) && Array.isArray(child)) {
      for (const item of child) {
        if (typeof item === "string" && item.trim()) output.add(item.trim());
      }
    }
    collectStrings(child, fieldNames, output);
  }
}

function knownScalarKeys(
  scope: string,
  allValues: unknown[],
): string[] {
  const graphNodes = allValues.filter(
    (value): value is Record<string, unknown> =>
      Boolean(value && typeof value === "object" && "id" in value && "type" in value),
  );
  const graphEdges = allValues.filter(
    (value): value is Record<string, unknown> =>
      Boolean(
        value &&
          typeof value === "object" &&
          "sourceNodeId" in value &&
          "targetNodeId" in value,
      ),
  );
  if (scope === KV.graphNodeDegree) {
    return graphNodes
      .map((node) => stringField(node, ["id"]))
      .filter((key): key is string => Boolean(key));
  }
  if (scope === KV.graphNameIndex) {
    return graphNodes.flatMap((node) => {
      const project = stringField(node, ["project"]);
      const type = stringField(node, ["type"]);
      const name = stringField(node, ["name"]);
      if (!type || !name) return [];
      return project
        ? [`${project}|${type}|${name}`]
        : [`legacy|${type}|${name}`, `${type}|${name}`];
    });
  }
  if (scope === KV.graphEdgeKey) {
    return graphEdges.flatMap((edge) => {
      const source = stringField(edge, ["sourceNodeId"]);
      const target = stringField(edge, ["targetNodeId"]);
      const type = stringField(edge, ["type"]);
      return source && target && type ? [`${source}|${target}|${type}`] : [];
    });
  }
  if (scope === KV.graphSnapshot) return ["current"];
  if (scope === KV.claudeBridge) return ["last-read"];
  if (scope === KV.health) return ["_probe", "latest"];
  if (scope === KV.state) return ["disk-size-bytes", "disk_size_bytes"];
  if (scope.startsWith("mem:project-metrics:")) return ["injection"];
  if (scope.endsWith(":profile")) return ["profile"];
  const discovered = new Set<string>();
  if (scope === KV.imageRefs) {
    collectStrings(
      allValues,
      new Set(["imageRef", "filePath", "files"]),
      discovered,
    );
  }
  return [...discovered];
}

async function resolveDynamicScopes(
  kv: StateKV,
  fixedValues: unknown[],
  priorScopes: string[] = [],
): Promise<string[]> {
  const sessionIds = new Set<string>();
  const projects = new Set<string>();
  const migrationGenerations = new Set<string>();
  collectStrings(fixedValues, new Set(["sessionId"]), sessionIds);
  collectStrings(fixedValues, new Set(["project"]), projects);
  collectStrings(fixedValues, new Set(["generation"]), migrationGenerations);
  for (const session of await kv.list<Record<string, unknown>>(KV.sessions)) {
    const id = stringField(session, ["id"]);
    const project = stringField(session, ["project"]);
    if (id) sessionIds.add(id);
    if (project) projects.add(project);
  }

  const scopes = new Set(priorScopes);
  const observationIds = new Set<string>();
  for (const sessionId of sessionIds) {
    const observationScope = KV.observations(sessionId);
    scopes.add(observationScope);
    scopes.add(KV.enrichedChunks(sessionId));
    scopes.add(KV.injectedSources(sessionId));
    scopes.add(KV.factLedger(sessionId));
    const observations =
      await kv.list<Record<string, unknown>>(observationScope);
    for (const observation of observations) {
      const id = stringField(observation, ["id"]);
      if (id) observationIds.add(id);
      const project = stringField(observation, ["project"]);
      if (project) projects.add(project);
    }
  }
  for (const observationId of observationIds) {
    scopes.add(KV.embeddings(observationId));
    scopes.add(KV.latentEmbeddings(observationId));
  }
  for (const project of projects) {
    scopes.add(KV.projectSlots(project));
    scopes.add(KV.projectMetrics(project));
    scopes.add(KV.promotionCandidates(project));
  }
  const teamId = process.env["TEAM_ID"]?.trim();
  const userId = process.env["USER_ID"]?.trim();
  if (teamId) {
    scopes.add(KV.teamShared(teamId));
    scopes.add(KV.teamProfile(teamId));
    if (userId) scopes.add(KV.teamUsers(teamId, userId));
  }
  for (const generation of migrationGenerations) {
    scopes.add(`mem:migration:staging:${generation}`);
  }
  return [...scopes].sort();
}

async function captureScope(
  kv: StateKV,
  scope: string,
  allValues: unknown[],
): Promise<PersistedNamespace> {
  const values = await kv.list(scope);
  const registeredKeys = ledgerKeys(scope, allValues);
  if (registeredKeys.length > 0) {
    const registered = (
      await Promise.all(
        registeredKeys.map(async (key) => ({
          key,
          value: await kv.get(scope, key),
        })),
      )
    ).filter(({ value }) => value !== null);
    if (registered.length === values.length) {
      registered.sort((a, b) => a.key.localeCompare(b.key));
      return { scope, records: registered, sha256: sha256(registered) };
    }
  }
  const records: PersistedRecord[] = [];
  const unresolved: unknown[] = [];
  for (const value of values) {
    const key = recordKey(scope, value);
    if (key) records.push({ key, value });
    else unresolved.push(value);
  }
  if (unresolved.length > 0) {
    const knownKeys = knownScalarKeys(scope, allValues);
    const resolved = await Promise.all(
      knownKeys.map(async (key) => ({
        key,
        value: await kv.get(scope, key),
      })),
    );
    const scalarRecords = resolved.filter(({ value }) => value !== null);
    if (
      scalarRecords.length !== unresolved.length ||
      sha256(scalarRecords.map(({ value }) => value).sort()) !==
        sha256(unresolved.slice().sort())
    ) {
      throw new Error(
        `Cannot reconstruct ${unresolved.length} persisted key(s) in namespace ${scope}`,
      );
    }
    records.push(...scalarRecords);
  }
  records.sort((a, b) => a.key.localeCompare(b.key));
  return { scope, records, sha256: sha256(records) };
}

async function captureState(
  kv: StateKV,
  timestamp: string,
  priorScopes: string[] = [],
): Promise<SnapshotState> {
  assertManifestCoversKv();
  const fixed = fixedNamespaces();
  const fixedValues = (
    await Promise.all(fixed.map(({ scope }) => kv.list(scope)))
  ).flat();
  const dynamicScopes = await resolveDynamicScopes(kv, fixedValues, priorScopes);
  const scopes = [...new Set([...fixed.map(({ scope }) => scope), ...dynamicScopes])]
    .sort();
  const allValues = (
    await Promise.all(scopes.map((scope) => kv.list(scope)))
  ).flat();
  const namespaces = await Promise.all(
    scopes.map((scope) => captureScope(kv, scope, allValues)),
  );
  const namespaceManifest: PersistedNamespaceManifest = {
    version: 1,
    fixed,
    dynamic: DYNAMIC_NAMESPACE_TEMPLATES,
    resolvedScopes: scopes,
  };
  const stateBody = {
    formatVersion: 2 as const,
    version: VERSION,
    timestamp,
    namespaceManifest,
    namespaces,
  };
  return { ...stateBody, stateSha256: sha256(stateBody) };
}

function validateState(state: SnapshotState): void {
  if (
    state?.formatVersion !== 2 ||
    state.namespaceManifest?.version !== 1 ||
    !Array.isArray(state.namespaces)
  ) {
    throw new Error("Snapshot state is not a supported complete namespace snapshot");
  }
  const expectedHash = sha256({
    formatVersion: state.formatVersion,
    version: state.version,
    timestamp: state.timestamp,
    namespaceManifest: state.namespaceManifest,
    namespaces: state.namespaces,
  });
  if (state.stateSha256 !== expectedHash) {
    throw new Error("Snapshot state hash mismatch");
  }
  for (const namespace of state.namespaces) {
    if (namespace.sha256 !== sha256(namespace.records)) {
      throw new Error(`Snapshot namespace hash mismatch: ${namespace.scope}`);
    }
  }
}

async function applyExactState(
  kv: StateKV,
  target: SnapshotState,
  current: SnapshotState,
): Promise<void> {
  const targetByScope = new Map(
    target.namespaces.map((namespace) => [namespace.scope, namespace]),
  );
  const currentByScope = new Map(
    current.namespaces.map((namespace) => [namespace.scope, namespace]),
  );
  const scopes = new Set([
    ...target.namespaceManifest.resolvedScopes,
    ...current.namespaceManifest.resolvedScopes,
  ]);
  for (const scope of [...scopes].sort()) {
    const targetRecords = targetByScope.get(scope)?.records ?? [];
    const currentRecords = currentByScope.get(scope)?.records ?? [];
    const targetKeys = new Set(targetRecords.map(({ key }) => key));
    for (const { key } of currentRecords) {
      if (!targetKeys.has(key)) await kv.delete(scope, key);
    }
    for (const { key, value } of targetRecords) {
      await kv.set(scope, key, value);
    }
  }
}

function equalityErrors(expected: SnapshotState, actual: SnapshotState): string[] {
  const actualByScope = new Map(
    actual.namespaces.map((namespace) => [namespace.scope, namespace.sha256]),
  );
  const errors: string[] = [];
  for (const namespace of expected.namespaces) {
    if (actualByScope.get(namespace.scope) !== namespace.sha256) {
      errors.push(namespace.scope);
    }
  }
  const expectedScopes = new Set(expected.namespaceManifest.resolvedScopes);
  for (const namespace of actual.namespaces) {
    if (!expectedScopes.has(namespace.scope) && namespace.records.length > 0) {
      errors.push(namespace.scope);
    }
  }
  return [...new Set(errors)].sort();
}

function writeRollbackEvidence(
  snapshotDir: string,
  evidence: Record<string, unknown>,
): string {
  const evidenceDir = join(snapshotDir, "rollback-evidence");
  mkdirSync(evidenceDir, { recursive: true });
  const path = join(
    evidenceDir,
    `restore-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.json`,
  );
  writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return path;
}

export function registerSnapshotFunction(
  sdk: ISdk,
  kv: StateKV,
  snapshotDir: string,
): void {
  installNamespaceKeyTracking(kv);
  sdk.registerFunction(
    "mem::snapshot-create",
    async (data?: { message?: string }) => {
      try {
        await ensureGitRepo(snapshotDir);
        const timestamp = new Date().toISOString();
        const state = await captureState(kv, timestamp);
        writeFileSync(
          join(snapshotDir, "state.json"),
          `${JSON.stringify(state, null, 2)}\n`,
          "utf8",
        );
        await gitExec(snapshotDir, ["add", "state.json"]);
        const message = data?.message || `Snapshot ${timestamp}`;
        try {
          await gitExec(snapshotDir, ["commit", "-m", message]);
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          if (text.includes("nothing to commit")) {
            return {
              success: true,
              status: "complete",
              message: "No changes to snapshot",
              stateSha256: state.stateSha256,
            };
          }
          throw error;
        }
        const commitHash = await gitExec(snapshotDir, ["rev-parse", "HEAD"]);
        const stats = {
          namespaces: state.namespaces.length,
          records: state.namespaces.reduce(
            (total, namespace) => total + namespace.records.length,
            0,
          ),
        };
        const snapshot = {
          id: generateId("snap"),
          commitHash,
          createdAt: timestamp,
          message,
          stats,
          stateSha256: state.stateSha256,
        };
        await recordAudit(kv, "export", "mem::snapshot-create", [snapshot.id], {
          commitHash,
          stats,
          stateSha256: state.stateSha256,
        });
        logger.info("Snapshot created", { commitHash, ...stats });
        return { success: true, status: "complete", snapshot };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error("Snapshot failed", { error: message });
        return {
          success: false,
          status: "incomplete",
          error: message,
        } satisfies SnapshotIncompleteResult;
      }
    },
  );

  sdk.registerFunction("mem::snapshot-list", async () => {
    try {
      if (!existsSync(join(snapshotDir, ".git"))) return { snapshots: [] };
      const log = await gitExec(snapshotDir, [
        "log",
        "--format=%H|%aI|%s",
        "-20",
      ]);
      return {
        snapshots: log
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [commitHash, createdAt, ...message] = line.split("|");
            return { commitHash, createdAt, message: message.join("|") };
          }),
      };
    } catch {
      return { snapshots: [] };
    }
  });

  sdk.registerFunction(
    "mem::snapshot-restore",
    async (data: { commitHash: string } | undefined) => {
      if (!data || typeof data.commitHash !== "string" || !data.commitHash.trim()) {
        return { success: false, status: "rejected", error: "commitHash is required" };
      }
      if (!COMMIT_HASH_RE.test(data.commitHash)) {
        return {
          success: false,
          status: "rejected",
          error: "Invalid commitHash format",
        };
      }

      let before: SnapshotState | undefined;
      try {
        const content = await gitExec(snapshotDir, [
          "show",
          `${data.commitHash}:state.json`,
        ]);
        const target = JSON.parse(content) as SnapshotState;
        validateState(target);
        before = await captureState(
          kv,
          new Date().toISOString(),
          target.namespaceManifest.resolvedScopes,
        );
        await applyExactState(kv, target, before);
        const after = await captureState(
          kv,
          target.timestamp,
          target.namespaceManifest.resolvedScopes,
        );
        const mismatchedScopes = equalityErrors(target, after);
        if (mismatchedScopes.length > 0) {
          throw new Error(
            `Exact restore verification failed: ${mismatchedScopes.join(", ")}`,
          );
        }
        logger.info("Snapshot restored", {
          commitHash: data.commitHash,
          stateSha256: target.stateSha256,
        });
        return {
          success: true,
          status: "complete",
          commitHash: data.commitHash,
          stateSha256: target.stateSha256,
          verifiedNamespaces: target.namespaces.length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        let rollbackSuccess = false;
        let rollbackError: string | undefined;
        let afterSha256: string | undefined;
        if (before) {
          try {
            const interrupted = await captureState(
              kv,
              new Date().toISOString(),
              before.namespaceManifest.resolvedScopes,
            );
            await applyExactState(kv, before, interrupted);
            const rolledBack = await captureState(
              kv,
              before.timestamp,
              before.namespaceManifest.resolvedScopes,
            );
            const rollbackMismatches = equalityErrors(before, rolledBack);
            rollbackSuccess = rollbackMismatches.length === 0;
            afterSha256 = rolledBack.stateSha256;
            if (!rollbackSuccess) {
              rollbackError = `Rollback verification failed: ${rollbackMismatches.join(", ")}`;
            }
          } catch (rollbackFailure) {
            rollbackError =
              rollbackFailure instanceof Error
                ? rollbackFailure.message
                : String(rollbackFailure);
          }
        }
        const evidencePath = writeRollbackEvidence(snapshotDir, {
          type: "snapshot-restore-incomplete",
          commitHash: data.commitHash,
          failedAt: new Date().toISOString(),
          error: message,
          rollback: {
            attempted: Boolean(before),
            success: rollbackSuccess,
            beforeSha256: before?.stateSha256,
            afterSha256,
            error: rollbackError,
          },
        });
        logger.error("Snapshot restore incomplete", {
          error: message,
          rollbackSuccess,
          evidencePath,
        });
        return {
          success: false,
          status: "incomplete",
          error: message,
          rollback: {
            attempted: Boolean(before),
            success: rollbackSuccess,
            evidencePath,
            beforeSha256: before?.stateSha256,
            afterSha256,
            ...(rollbackError ? { error: rollbackError } : {}),
          },
        } satisfies SnapshotIncompleteResult;
      }
    },
  );
}
