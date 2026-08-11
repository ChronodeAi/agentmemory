import { SearchIndex } from "./search-index.js";
import { VectorIndex } from "./vector-index.js";
import type { StateKV } from "./kv.js";
import { KV, generateId } from "./schema.js";
import { logger } from "../logger.js";
import { safeAudit } from "../functions/audit.js";

const DEBOUNCE_MS = 5000;
const FAILURE_LOG_THROTTLE_MS = 60_000;
const INDEX_PERSISTENCE_FUNCTION_ID = "mem::index-persistence";
const BM25_KEY = "data";
const BM25_MANIFEST_KEY = "data:manifest";
const BM25_SHARD_SCOPE_PREFIX = `${KV.bm25Index}:bm25:`;
const VECTOR_KEY = "vectors";
const VECTOR_MANIFEST_KEY = "vectors:manifest";
const VECTOR_SHARD_SCOPE_PREFIX = `${KV.bm25Index}:vectors:`;
const INDEX_SHARD_KEY = "data";
const DEFAULT_INDEX_SHARD_CHARS = 2_000_000;

type IndexShardGeneration = {
  generation?: string;
  shards: Array<{ scope: string; key: string; chars: number }>;
  chars: number;
};

type IndexShardManifest = IndexShardGeneration & {
  v: 1;
  previous?: IndexShardGeneration;
};

type IndexPersistenceOptions = {
  shardChars?: number;
  createGeneration?: () => string;
};

function shardChars(options: IndexPersistenceOptions): number {
  const configured = options.shardChars;
  if (typeof configured !== "number" || !Number.isFinite(configured)) {
    return DEFAULT_INDEX_SHARD_CHARS;
  }
  const wholeChars = Math.floor(configured);
  return wholeChars >= 1 ? wholeChars : DEFAULT_INDEX_SHARD_CHARS;
}

function createIndexGeneration(): string {
  return generateId("idx");
}

function statePath(scope: string, key: string): string {
  return `${scope}/${key}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isValidShardDescriptor(
  shard: unknown,
): shard is IndexShardManifest["shards"][number] {
  if (!shard || typeof shard !== "object") return false;
  const candidate = shard as { scope?: unknown; key?: unknown; chars?: unknown };
  return (
    typeof candidate.scope === "string" &&
    candidate.scope.length > 0 &&
    typeof candidate.key === "string" &&
    candidate.key.length > 0 &&
    Number.isInteger(candidate.chars) &&
    candidate.chars >= 0
  );
}

export class IndexPersistence {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastFailureLogAt = 0;
  private saveQueue: Promise<void> = Promise.resolve();
  private stopped = false;
  private retainedGenerationOverrides = new Map<
    string,
    IndexShardGeneration
  >();

  constructor(
    private kv: StateKV,
    private bm25: SearchIndex,
    private vector: VectorIndex | null,
    private options: IndexPersistenceOptions = {},
  ) {}

  scheduleSave(): void {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    // setTimeout discards the returned promise, so any rejection inside
    // save() would surface as unhandledRejection and crash the process
    // under sustained iii-engine write timeouts (issue #204). Funnel
    // rejections through logFailure() instead.
    this.timer = setTimeout(() => {
      this.save().catch((err) => this.logFailure(err));
    }, DEBOUNCE_MS);
  }

  cancelScheduledSave(): void {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  async save(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const queued = this.saveQueue.then(() => this.persistSnapshot());
    this.saveQueue = queued;
    await queued;
  }

  private async persistSnapshot(): Promise<void> {
    try {
      // Capture both synchronous snapshots before the first write yields.
      // Otherwise live hook writes can appear only in the later vector snapshot.
      const bm25Snapshot = this.bm25.serialize();
      const vectorSnapshot = this.vector?.serialize();
      await this.saveBm25Index(bm25Snapshot);
      if (vectorSnapshot !== undefined) {
        await this.saveVectorIndex(vectorSnapshot);
      }
    } catch (err) {
      this.logFailure(err);
    }
  }

  async load(): Promise<{
    bm25: SearchIndex | null;
    vector: VectorIndex | null;
  }> {
    let bm25: SearchIndex | null = null;
    let vector: VectorIndex | null = null;

    const bm25Data = await this.loadBm25Data();
    if (bm25Data && typeof bm25Data === "string") {
      bm25 = SearchIndex.deserialize(bm25Data);
    }

    const vecData = await this.loadVectorData();
    if (vecData && typeof vecData === "string") {
      vector = VectorIndex.deserialize(vecData);
    }

    return { bm25, vector };
  }

  stop(): void {
    this.stopped = true;
    this.cancelScheduledSave();
  }

  needsRepair(): boolean {
    return this.retainedGenerationOverrides.size > 0;
  }

  private logFailure(err: unknown): void {
    const now = Date.now();
    // Throttle: persistence failures under load arrive in bursts
    // (iii-engine queue pressure). Logging every debounce flush adds
    // noise without information.
    if (now - this.lastFailureLogAt < FAILURE_LOG_THROTTLE_MS) return;
    this.lastFailureLogAt = now;
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("index persistence: failed to save BM25/vector index", {
      code,
      message,
      hint:
        code === "TIMEOUT"
          ? "iii-engine state::set timed out; recent index updates remain in memory and will retry on the next debounce flush"
          : undefined,
    });
  }

  private async saveBm25Index(serialized: string): Promise<void> {
    await this.saveShardedIndex(
      serialized,
      BM25_MANIFEST_KEY,
      BM25_KEY,
      BM25_SHARD_SCOPE_PREFIX,
    );
  }

  private async saveVectorIndex(serialized: string): Promise<void> {
    await this.saveShardedIndex(
      serialized,
      VECTOR_MANIFEST_KEY,
      VECTOR_KEY,
      VECTOR_SHARD_SCOPE_PREFIX,
    );
  }

  private async saveShardedIndex(
    serialized: string,
    manifestKey: string,
    legacyKey: string,
    scopePrefix: string,
  ): Promise<void> {
    const previous = await this.kv
      .get<IndexShardManifest>(KV.bm25Index, manifestKey)
      .catch(() => null);
    const generation =
      this.options.createGeneration?.() ?? createIndexGeneration();
    const chunkChars = shardChars(this.options);
    const shards: IndexShardManifest["shards"] = [];
    const chunks: string[] = [];

    for (let offset = 0; offset < serialized.length; offset += chunkChars) {
      const shardIndex = shards.length;
      const scope = `${scopePrefix}${generation}:${String(shardIndex).padStart(
        5,
        "0",
      )}`;
      const chunk = serialized.slice(offset, offset + chunkChars);
      shards.push({ scope, key: INDEX_SHARD_KEY, chars: chunk.length });
      chunks.push(chunk);
    }

    const writeResults = await Promise.allSettled(
      shards.map((shard, index) => {
        const chunk = chunks[index] ?? "";
        return this.kv.set(shard.scope, shard.key, chunk);
      }),
    );
    const failedWrite = writeResults.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (failedWrite) {
      await this.auditIndexPersistence(
        "shard_write_batch",
        shards.map((shard) => statePath(shard.scope, shard.key)),
        {
          manifestKey,
          generation,
          chars: serialized.length,
          shards: shards.length,
          result: "failed",
          error: errorMessage(failedWrite.reason),
        },
      );
      await this.deleteShards(shards, "shard_write_rollback");
      throw failedWrite.reason;
    }
    const previousGeneration =
      this.retainedGenerationOverrides.get(manifestKey) ??
      this.asGeneration(previous);
    const nextManifest: IndexShardManifest = {
      v: 1,
      generation,
      shards,
      chars: serialized.length,
      ...(previousGeneration ? { previous: previousGeneration } : {}),
    };
    try {
      await this.kv.set<IndexShardManifest>(
        KV.bm25Index,
        manifestKey,
        nextManifest,
      );
    } catch (err) {
      if (await this.isManifestPublished(manifestKey, nextManifest)) {
        await this.auditIndexPersistence("manifest_publish", [
          statePath(KV.bm25Index, manifestKey),
        ], {
          manifestKey,
          generation,
          chars: serialized.length,
          shards: shards.length,
          result: "committed_after_error",
          error: errorMessage(err),
        });
      } else {
        await this.deleteShards(shards, "manifest_publish_rollback");
      }
      throw err;
    }

    await this.deleteKey(KV.bm25Index, legacyKey, "legacy_cleanup");
    await this.deleteSupersededGenerations(
      previous,
      previousGeneration,
      shards,
    );
    this.retainedGenerationOverrides.delete(manifestKey);
  }

  private async auditIndexPersistence(
    action: string,
    targetIds: string[],
    details: Record<string, unknown>,
  ): Promise<void> {
    await safeAudit(
      this.kv,
      "index_persist",
      INDEX_PERSISTENCE_FUNCTION_ID,
      targetIds,
      { action, ...details },
    );
  }

  private async deleteKey(
    scope: string,
    key: string,
    reason: string,
  ): Promise<void> {
    try {
      await this.kv.delete(scope, key);
    } catch (err) {
      await this.auditIndexPersistence("delete", [statePath(scope, key)], {
        scope,
        key,
        reason,
        result: "failed",
        error: errorMessage(err),
      });
    }
  }

  private async deleteShards(
    shards: IndexShardManifest["shards"],
    reason: string,
  ): Promise<void> {
    if (shards.length === 0) return;
    let deleted = 0;
    const failures: Array<{ target: string; error: string }> = [];
    for (const shard of shards) {
      const target = statePath(shard.scope, shard.key);
      try {
        await this.kv.delete(shard.scope, shard.key);
        deleted += 1;
      } catch (err) {
        failures.push({ target, error: errorMessage(err) });
      }
    }
    if (failures.length > 0) {
      await this.auditIndexPersistence(
        "shard_delete_batch",
        shards.map((shard) => statePath(shard.scope, shard.key)),
        {
          reason,
          requested: shards.length,
          deleted,
          failed: failures.length,
          failures: failures.slice(0, 10),
        },
      );
    }
    // Once a manifest is published, cleanup must not abort the paired BM25 and
    // vector save. Failed deletions leave recoverable orphan shards and are
    // audited above for later maintenance. Successful derived-index maintenance
    // stays out of the governance audit log to prevent unbounded amplification.
  }

  private async deleteSupersededGenerations(
    previousManifest: IndexShardManifest | null,
    retained: IndexShardGeneration | null,
    currentShards: IndexShardGeneration["shards"],
  ): Promise<void> {
    const retainedShardIds = new Set(
      [...currentShards, ...(retained?.shards ?? [])].map(
        (shard) => `${shard.scope}\0${shard.key}`,
      ),
    );
    const candidates = [
      this.asGeneration(previousManifest),
      this.asGeneration(previousManifest?.previous),
    ];
    const seen = new Set<string>();
    const superseded: IndexShardGeneration["shards"] = [];
    for (const generation of candidates) {
      if (!generation) continue;
      for (const shard of generation.shards) {
        const id = `${shard.scope}\0${shard.key}`;
        if (retainedShardIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        superseded.push(shard);
      }
    }
    await this.deleteShards(superseded, "previous_generation_cleanup");
  }

  private async isManifestPublished(
    manifestKey: string,
    expected: IndexShardManifest,
  ): Promise<boolean> {
    const published = await this.kv
      .get<IndexShardManifest>(KV.bm25Index, manifestKey)
      .catch(() => null);
    if (
      published?.v !== 1 ||
      published.generation !== expected.generation ||
      published.chars !== expected.chars ||
      !Array.isArray(published.shards) ||
      published.shards.length !== expected.shards.length
    ) {
      return false;
    }
    return published.shards.every((shard, index) => {
      const expectedShard = expected.shards[index];
      if (!expectedShard) return false;
      return (
        shard.scope === expectedShard.scope &&
        shard.key === expectedShard.key &&
        shard.chars === expectedShard.chars
      );
    });
  }

  private async loadBm25Data(): Promise<string | null> {
    return this.loadShardedData(BM25_KEY, BM25_MANIFEST_KEY, "BM25");
  }

  private async loadVectorData(): Promise<string | null> {
    return this.loadShardedData(VECTOR_KEY, VECTOR_MANIFEST_KEY, "vector");
  }

  private async loadShardedData(
    legacyKey: string,
    manifestKey: string,
    label: string,
  ): Promise<string | null> {
    const manifest = await this.readIndexValue<IndexShardManifest>(
      KV.bm25Index,
      manifestKey,
      label,
      "manifest",
    );
    if (!manifest.ok) return null;
    // #797: some iii-state adapters return `undefined` (not `null`) for
    // a missing key. The previous `value !== null` check passed
    // undefined through to loadManifestData, which then crashed on
    // `manifest.v` with TypeError. Treat both null and undefined as
    // "no manifest" and fall through to the legacy path. The shape
    // check stays so a malformed-but-present row still fails closed.
    if (
      manifest.value != null &&
      typeof manifest.value === "object"
    ) {
      const current = await this.loadManifestData(manifest.value, label);
      if (current !== null) {
        this.retainedGenerationOverrides.delete(manifestKey);
        return current;
      }
      if (this.asGeneration(manifest.value.previous)) {
        const fallback = await this.loadGenerationData(
          manifest.value.previous!,
          `${label} previous`,
        );
        if (fallback !== null) {
          this.retainedGenerationOverrides.set(
            manifestKey,
            this.asGeneration(manifest.value.previous)!,
          );
          logger.warn(`index persistence: ${label} using previous generation`, {
            generation: manifest.value.previous?.generation,
          });
          return fallback;
        }
      }
      return null;
    }

    const legacy = await this.readIndexValue<string>(
      KV.bm25Index,
      legacyKey,
      label,
      "legacy",
    );
    if (!legacy.ok) return null;
    if (legacy.value && typeof legacy.value === "string") return legacy.value;
    return null;
  }

  private async readIndexValue<T>(
    scope: string,
    key: string,
    label: string,
    source: "manifest" | "legacy",
  ): Promise<{ ok: true; value: T | null } | { ok: false }> {
    try {
      return { ok: true, value: await this.kv.get<T>(scope, key) };
    } catch (err) {
      logger.warn(`index persistence: ${label} ${source} read failed`, {
        scope,
        key,
        message: errorMessage(err),
      });
      return { ok: false };
    }
  }

  private async loadManifestData(
    manifest: IndexShardManifest,
    label: string,
  ): Promise<string | null> {
    const generation = this.asGeneration(manifest);
    if (manifest.v !== 1 || !generation) {
      logger.warn(`index persistence: ${label} shard manifest invalid`);
      return null;
    }
    return this.loadGenerationData(generation, label);
  }

  private asGeneration(value: unknown): IndexShardGeneration | null {
    if (!value || typeof value !== "object") return null;
    const generation = value as Partial<IndexShardGeneration>;
    if (
      !Array.isArray(generation.shards) ||
      generation.shards.length === 0 ||
      !Number.isInteger(generation.chars) ||
      (generation.chars ?? -1) < 0 ||
      (generation.generation !== undefined &&
        typeof generation.generation !== "string") ||
      !generation.shards.every(isValidShardDescriptor)
    ) {
      return null;
    }
    return {
      ...(generation.generation
        ? { generation: generation.generation }
        : {}),
      shards: generation.shards.map((shard) => ({ ...shard })),
      chars: generation.chars!,
    };
  }

  private async loadGenerationData(
    manifest: IndexShardGeneration,
    label: string,
  ): Promise<string | null> {
    const loadedShards = await Promise.all(
      manifest.shards.map(async (shard) => ({
        shard,
        chunk: await this.kv.get<string>(shard.scope, shard.key).catch(() => null),
      })),
    );
    const chunks: string[] = [];
    let chars = 0;
    for (const { shard, chunk } of loadedShards) {
      if (typeof chunk !== "string") {
        logger.warn(`index persistence: ${label} shard missing`, {
          scope: shard.scope,
          key: shard.key,
        });
        return null;
      }
      if (chunk.length !== shard.chars) {
        logger.warn(`index persistence: ${label} shard length mismatch`, {
          scope: shard.scope,
          key: shard.key,
          expected: shard.chars,
          actual: chunk.length,
        });
        return null;
      }
      chunks.push(chunk);
      chars += chunk.length;
    }
    if (chars !== manifest.chars) {
      logger.warn(`index persistence: ${label} total length mismatch`, {
        expected: manifest.chars,
        actual: chars,
      });
      return null;
    }
    return chunks.join("");
  }
}
