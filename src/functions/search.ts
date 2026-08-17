import type { ISdk } from 'iii-sdk'
import type { CompactSearchResult, CompressedObservation, Memory, SearchResult, Session } from '../types.js'
import { KV } from '../state/schema.js'
import { StateKV } from '../state/kv.js'
import { SearchIndex } from '../state/search-index.js'
import { VectorIndex } from '../state/vector-index.js'
import type { EmbeddingProvider } from '../types.js'
import { memoryToObservation } from '../state/memory-utils.js'
import { recordAccessBatch } from './access-tracker.js'
import { logger } from "../logger.js";
import { getAgentId, isAgentScopeIsolated } from "../config.js";
import { requireProjectReadScope } from "../project-scope.js";
import { providerProcessingLocation } from "./model-processing.js";
import { isRetrievalGeneratedObservation } from "./retrieval-evidence.js";

let index: SearchIndex | null = null
let vectorIndex: VectorIndex | null = null
let currentEmbeddingProvider: EmbeddingProvider | null = null
const vectorExcludedIds = new Set<string>()
let rebuildInFlight: Promise<number> | null = null
let suppressIndexPersistence = false

export interface SearchIndexRuntimeStatus {
  status: "initializing" | "rebuilding" | "ready" | "partial" | "failed"
  keywordEntries: number
  vectorEntries: number
  startedAt?: string
  error?: string
}

let searchIndexRuntimeStatus: SearchIndexRuntimeStatus = {
  status: "initializing",
  keywordEntries: 0,
  vectorEntries: 0,
}

export function getSearchIndexRuntimeStatus(): SearchIndexRuntimeStatus {
  if (searchIndexRuntimeStatus.status === "rebuilding") {
    return {
      ...searchIndexRuntimeStatus,
      keywordEntries: getSearchIndex().size,
      vectorEntries: getVectorIndex()?.size ?? 0,
    }
  }
  return { ...searchIndexRuntimeStatus }
}

export function markSearchIndexReady(
  keywordEntries: number,
  vectorEntries: number,
  vectorExpected: boolean,
  aligned = true,
): void {
  const requiredVectorEntries = Math.max(
    0,
    keywordEntries - vectorExcludedIds.size,
  )
  const status =
    vectorExpected && (!aligned || vectorEntries !== requiredVectorEntries)
      ? "partial"
      : "ready"
  searchIndexRuntimeStatus = {
    status,
    keywordEntries,
    vectorEntries,
  }
  suppressIndexPersistence = status !== "ready"
}

export function getSearchIndex(): SearchIndex {
  if (!index) index = new SearchIndex()
  return index
}

export function setVectorIndex(idx: VectorIndex | null): void {
  vectorIndex = idx
  vectorExcludedIds.clear()
}

export function getVectorIndex(): VectorIndex | null {
  return vectorIndex
}

export function getSearchIndexDrift(): {
  missingVectorIds: string[]
  orphanVectorIds: string[]
} {
  const idx = getSearchIndex()
  const vi = getVectorIndex()
  if (!vi) return { missingVectorIds: [], orphanVectorIds: [] }

  const keywordEntries = idx.entriesSnapshot()
  const keywordIds = new Set(keywordEntries.map((entry) => entry.obsId))
  return {
    missingVectorIds: keywordEntries
      .filter(
        (entry) =>
          !vectorExcludedIds.has(entry.obsId) && !vi.has(entry.obsId),
      )
      .map((entry) => entry.obsId),
    orphanVectorIds: vi
      .ids()
      .filter(
        (obsId) =>
          !keywordIds.has(obsId) || vectorExcludedIds.has(obsId),
      ),
  }
}

export function setEmbeddingProvider(provider: EmbeddingProvider | null): void {
  currentEmbeddingProvider = provider
  vectorExcludedIds.clear()
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  return currentEmbeddingProvider
}

export function vectorIndexRemove(id: string): void {
  vectorIndex?.remove(id);
  vectorExcludedIds.delete(id);
}

// Persistence sync hook. Without this, index removals only live in
// memory; a crash/SIGKILL before graceful shutdown reloads a stale
// snapshot at boot and the deleted entry resurrects in the index.
// Wired by src/index.ts after IndexPersistence is constructed; no-op
// until then so unit tests that exercise the delete paths in
// isolation don't need to wire persistence.
let indexPersistence: {
  scheduleSave: () => void;
  save: () => Promise<void>;
  cancelScheduledSave?: () => void;
} | null = null;
let indexDriftRepair: (() => Promise<void>) | null = null;

export function setIndexPersistence(
  p: {
    scheduleSave: () => void;
    save: () => Promise<void>;
    cancelScheduledSave?: () => void;
  } | null,
  options: { repairDrift?: () => Promise<void> } = {},
): void {
  indexPersistence = p;
  indexDriftRepair = options.repairDrift ?? null;
  if (p === null) suppressIndexPersistence = false;
}

export function scheduleIndexSave(): void {
  if (!indexSnapshotIsComplete(true)) return;
  indexPersistence?.scheduleSave();
}

// Synchronous flush variant for delete paths. The debounced
// scheduleSave is fine for adds (chatty), but a hard process exit
// inside the 5s debounce window would lose deletes and resurrect
// removed entries on next boot. Deletes are infrequent enough that
// awaiting a single write per operation is acceptable. save() catches
// its own errors via IndexPersistence.logFailure, so this resolves
// even when persistence fails — callers must not treat a failed
// flush as a fatal error on the delete itself (the KV delete already
// committed before this is invoked).
export async function flushIndexSave(): Promise<void> {
  if (!indexSnapshotIsComplete(false)) return;
  await indexPersistence?.save();
}

function indexSnapshotIsComplete(triggerRepair: boolean): boolean {
  // A partial rebuild must stay non-persistable, but it still needs to pass
  // through drift detection so the bounded repair can make it complete.
  // Failed/in-flight maintenance remains fully suppressed.
  if (
    suppressIndexPersistence &&
    searchIndexRuntimeStatus.status !== "partial"
  ) {
    return false
  }
  if (currentEmbeddingProvider && vectorIndex) {
    const drift = getSearchIndexDrift()
    const driftCount =
      drift.missingVectorIds.length + drift.orphanVectorIds.length
    if (driftCount > 0) {
      markSearchIndexReady(
        getSearchIndex().size,
        vectorIndex.size,
        true,
        false,
      )
      if (
        triggerRepair &&
        indexDriftRepair &&
        driftCount <= incrementalVectorRepairLimit(getSearchIndex().size)
      ) {
        void indexDriftRepair().catch((err) => {
          logger.warn("vector-index repair: automatic repair failed", {
            error: err instanceof Error ? err.message : String(err),
          })
        })
      }
      return false
    }
    if (
      searchIndexRuntimeStatus.status !== "ready" ||
      searchIndexRuntimeStatus.keywordEntries !== getSearchIndex().size ||
      searchIndexRuntimeStatus.vectorEntries !== vectorIndex.size
    ) {
      markSearchIndexReady(
        getSearchIndex().size,
        vectorIndex.size,
        true,
      )
    }
  }
  return true
}

// Hard cap on embedding input length. Most providers cap input around
// 8k tokens (~32k chars at ~4 chars/token). Truncate defensively so a
// huge memory.content can't 400 the embed call or blow context budget
// on a single doc. 16k chars ≈ 4k tokens, safely under every provider.
const EMBED_MAX_CHARS = 16_000

export function clipEmbedInput(text: string): string {
  if (text.length <= EMBED_MAX_CHARS) return text
  return text.slice(0, EMBED_MAX_CHARS)
}

function vectorItemIsEligible(externalProcessing?: boolean): boolean {
  const provider = currentEmbeddingProvider
  return (
    provider === null ||
    externalProcessing !== false ||
    providerProcessingLocation(provider) === "local"
  )
}

function setVectorEligibility(id: string, externalProcessing?: boolean): boolean {
  const eligible = vectorItemIsEligible(externalProcessing)
  if (eligible) {
    vectorExcludedIds.delete(id)
  } else {
    vectorExcludedIds.add(id)
    vectorIndex?.remove(id)
  }
  return eligible
}

// Single guarded vector-index write. Returns true on success. Logs and
// no-ops on:
//   - dimension mismatch (mis-configured provider would silently corrupt
//     the index per #248 otherwise — guarded at persistence load there;
//     this is the symmetric guard at the write site)
//   - embed throwing (network, rate limit, provider down)
// Always soft-fails so a downed embedder doesn't break the upstream save.
export async function vectorIndexAddGuarded(
  id: string,
  sessionId: string,
  text: string,
  context: { kind: "memory" | "observation" | "synthetic"; logId: string },
  options?: { externalProcessing?: boolean },
): Promise<boolean> {
  const vi = vectorIndex
  const ep = currentEmbeddingProvider
  if (!vi || !ep) return false
  if (!setVectorEligibility(id, options?.externalProcessing)) return false
  try {
    const embedding = await ep.embed(clipEmbedInput(text))
    if (embedding.length !== ep.dimensions) {
      logger.warn("vector-index add: dimension mismatch — skipping", {
        kind: context.kind,
        id: context.logId,
        provider: ep.name,
        expected: ep.dimensions,
        received: embedding.length,
      })
      return false
    }
    vi.add(id, sessionId, embedding)
    return true
  } catch (err) {
    logger.warn("vector-index add: embed failed — skipping", {
      kind: context.kind,
      id: context.logId,
      provider: ep.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

// Batched variant: calls EmbeddingProvider.embedBatch ONCE for the whole
// batch, then writes each resulting vector. Use this for bulk paths
// (rebuildIndex, future bulk-add APIs) where per-item serial awaits
// dominate wallclock. A batch of N has roughly the latency of a single
// embed (network + GPU setup amortized), so backfilling a 500k-obs
// corpus drops from days to hours on a per-batch endpoint like vLLM.
//
// Per-item failure shape:
//   - whole-batch network/provider error → all skipped, single warn line
//   - per-item dimension mismatch → that item skipped, others continue
export async function vectorIndexAddBatchGuarded(
  items: Array<{
    id: string
    sessionId: string
    text: string
    context: { kind: "memory" | "observation" | "synthetic"; logId: string }
    externalProcessing?: boolean
  }>,
): Promise<{ ok: number; fail: number }> {
  const vi = vectorIndex
  const ep = currentEmbeddingProvider
  if (!vi || !ep || items.length === 0) return { ok: 0, fail: 0 }
  const eligibleItems = items.filter((item) =>
    setVectorEligibility(item.id, item.externalProcessing),
  )
  const privacySkipped = items.length - eligibleItems.length
  if (eligibleItems.length === 0) {
    return { ok: 0, fail: privacySkipped }
  }

  let embeddings: Float32Array[]
  try {
    embeddings = await ep.embedBatch(
      eligibleItems.map((i) => clipEmbedInput(i.text)),
    )
  } catch (err) {
    logger.warn("vector-index add batch: embed failed — skipping batch", {
      batchSize: eligibleItems.length,
      provider: ep.name,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: 0, fail: items.length }
  }

  if (embeddings.length !== eligibleItems.length) {
    logger.warn(
      "vector-index add batch: provider returned wrong length — skipping batch",
      {
        batchSize: eligibleItems.length,
        returned: embeddings.length,
        provider: ep.name,
      },
    )
    return { ok: 0, fail: items.length }
  }

  let ok = 0
  let fail = privacySkipped
  for (let i = 0; i < eligibleItems.length; i++) {
    const item = eligibleItems[i]
    const embedding = embeddings[i]
    if (embedding.length !== ep.dimensions) {
      logger.warn("vector-index add batch: dimension mismatch — skipping item", {
        kind: item.context.kind,
        id: item.context.logId,
        provider: ep.name,
        expected: ep.dimensions,
        received: embedding.length,
      })
      fail++
      continue
    }
    try {
      vi.add(item.id, item.sessionId, embedding)
      ok++
    } catch (err) {
      logger.warn("vector-index add batch: index write failed — skipping item", {
        kind: item.context.kind,
        id: item.context.logId,
        error: err instanceof Error ? err.message : String(err),
      })
      fail++
    }
  }
  return { ok, fail }
}

// Embed-batch size for rebuild. Each item is one /v1/embeddings call's
// `input` array element; the provider sees the whole batch as one HTTP
// round-trip. 32 fits comfortably under typical per-request token budgets
// (32 × ~110 tok/item ≈ 3.5k tokens) and gets close to per-call
// throughput for GPU-backed endpoints (vLLM, Triton, etc.). Override via
// REBUILD_EMBED_BATCH_SIZE for endpoints that prefer smaller/larger
// batches. Set to 1 to fall back to the legacy per-item path.
const DEFAULT_REBUILD_EMBED_BATCH = 32
const DEFAULT_STARTUP_RECONCILE_MAX_ENTRIES = 100_000
const MAX_STARTUP_RECONCILE_ENTRIES = 1_000_000

function getRebuildEmbedBatchSize(): number {
  const raw = process.env.REBUILD_EMBED_BATCH_SIZE
  if (!raw) return DEFAULT_REBUILD_EMBED_BATCH
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0
    ? Math.min(n, 64)
    : DEFAULT_REBUILD_EMBED_BATCH
}

function getStartupReconcileMaxEntries(): number {
  const raw = process.env.AGENTMEMORY_STARTUP_RECONCILE_MAX_ENTRIES
  if (!raw) return DEFAULT_STARTUP_RECONCILE_MAX_ENTRIES
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0
    ? Math.min(n, MAX_STARTUP_RECONCILE_ENTRIES)
    : DEFAULT_STARTUP_RECONCILE_MAX_ENTRIES
}

function assertStartupReconcileBudget(entries: number): void {
  const limit = getStartupReconcileMaxEntries()
  if (entries > limit) {
    throw new Error(
      `canonical search inventory exceeds startup limit (${entries}/${limit})`,
    )
  }
}

export function rebuildIndex(kv: StateKV): Promise<number> {
  return runIndexMaintenance(async () => {
    const count = await performRebuildIndex(kv)
    const drift = getSearchIndexDrift()
    const driftCount =
      drift.missingVectorIds.length + drift.orphanVectorIds.length
    if (
      driftCount > 0 &&
      driftCount <= incrementalVectorRepairLimit(getSearchIndex().size)
    ) {
      await performVectorIndexRepair(kv)
    }
    return count
  })
}

export function repairVectorIndexFromKeyword(kv: StateKV): Promise<number> {
  const repair = runIndexMaintenance(() => performVectorIndexRepair(kv))
  void repair.then(() => {
    if (indexSnapshotIsComplete(false)) indexPersistence?.scheduleSave()
  })
  return repair
}

export async function reconcileCanonicalSearchIndex(kv: StateKV): Promise<{
  canonicalEntries: number
  addedKeywordEntries: number
  removedKeywordEntries: number
}> {
  const idx = getSearchIndex()
  const vi = getVectorIndex()
  const sessions = await kv.list<Session>(KV.sessions)
  assertStartupReconcileBudget(sessions.length)
  const canonical = new Map<
    string,
    {
      observation: CompressedObservation
      externalProcessing: boolean
      kind: "memory" | "observation"
    }
  >()

  const memories = await kv.list<Memory>(KV.memories)
  assertStartupReconcileBudget(memories.length)
  for (const memory of memories) {
    if (memory.isLatest === false || !memory.title || !memory.content) continue
    assertStartupReconcileBudget(canonical.size + 1)
    canonical.set(memory.id, {
      observation: memoryToObservation(memory),
      kind: "memory",
      // Live mem::remember forbids external embedding for every project-scoped
      // memory. Restart reconciliation must preserve that exact boundary.
      externalProcessing: memory.project === undefined,
    })
  }

  for (let offset = 0; offset < sessions.length; offset += 10) {
    const batch = sessions.slice(offset, offset + 10)
    const observationsBySession = await Promise.all(
      batch.map(async (session) => ({
        session,
        observations: await kv.list<CompressedObservation>(
          KV.observations(session.id),
        ),
      })),
    )
    for (const { session, observations } of observationsBySession) {
      assertStartupReconcileBudget(canonical.size + observations.length)
      for (const observation of observations) {
        if (
          !observation.title ||
          !observation.narrative ||
          isRetrievalGeneratedObservation(observation)
        ) {
          continue
        }
        assertStartupReconcileBudget(canonical.size + 1)
        canonical.set(observation.id, {
          observation,
          kind: "observation",
          externalProcessing:
            session.privacy !== "strict" &&
            session.externalProcessing !== false,
        })
      }
    }
  }

  let removedKeywordEntries = 0
  for (const entry of idx.entriesSnapshot()) {
    if (canonical.has(entry.obsId)) continue
    idx.remove(entry.obsId)
    vectorIndexRemove(entry.obsId)
    removedKeywordEntries++
  }

  const jobs: Parameters<typeof vectorIndexAddBatchGuarded>[0] = []
  const flush = async (): Promise<void> => {
    if (jobs.length === 0) return
    await vectorIndexAddBatchGuarded(jobs)
    jobs.length = 0
  }
  let addedKeywordEntries = 0
  for (const [id, item] of canonical) {
    if (!idx.has(id)) {
      idx.add(item.observation)
      addedKeywordEntries++
    }
    const eligible = setVectorEligibility(id, item.externalProcessing)
    if (!eligible || !vi || vi.has(id)) continue
    jobs.push({
      id,
      sessionId: item.observation.sessionId,
      text: item.observation.title + " " + item.observation.narrative,
      context: {
        kind: item.kind,
        logId: id,
      },
      externalProcessing: item.externalProcessing,
    })
    if (jobs.length >= getRebuildEmbedBatchSize()) await flush()
  }
  await flush()

  return {
    canonicalEntries: canonical.size,
    addedKeywordEntries,
    removedKeywordEntries,
  }
}

export function incrementalVectorRepairLimit(keywordEntries: number): number {
  return Math.max(32, Math.ceil(keywordEntries * 0.01))
}

function runIndexMaintenance(operation: () => Promise<number>): Promise<number> {
  if (rebuildInFlight) return rebuildInFlight
  suppressIndexPersistence = true
  indexPersistence?.cancelScheduledSave?.()
  searchIndexRuntimeStatus = {
    status: "rebuilding",
    keywordEntries: getSearchIndex().size,
    vectorEntries: getVectorIndex()?.size ?? 0,
    startedAt: new Date().toISOString(),
  }
  const run = (async () => {
    try {
      const count = await operation()
      const drift = getSearchIndexDrift()
      markSearchIndexReady(
        getSearchIndex().size,
        getVectorIndex()?.size ?? 0,
        currentEmbeddingProvider !== null,
        drift.missingVectorIds.length === 0 &&
          drift.orphanVectorIds.length === 0,
      )
      return count
    } catch (err) {
      searchIndexRuntimeStatus = {
        status: "failed",
        keywordEntries: getSearchIndex().size,
        vectorEntries: getVectorIndex()?.size ?? 0,
        error: "search_index_rebuild_failed",
      }
      throw err
    } finally {
      rebuildInFlight = null
    }
  })()
  rebuildInFlight = run
  return run
}

async function performVectorIndexRepair(kv: StateKV): Promise<number> {
  const idx = getSearchIndex()
  const vi = getVectorIndex()
  const ep = getEmbeddingProvider()
  if (!vi || !ep) return 0

  const drift = getSearchIndexDrift()
  assertStartupReconcileBudget(
    drift.missingVectorIds.length + drift.orphanVectorIds.length,
  )
  for (const obsId of drift.orphanVectorIds) vi.remove(obsId)

  const entries = new Map(
    idx.entriesSnapshot().map((entry) => [entry.obsId, entry]),
  )
  const sessions = await kv.list<Session>(KV.sessions)
  assertStartupReconcileBudget(sessions.length)
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const jobs: Parameters<typeof vectorIndexAddBatchGuarded>[0] = []
  let repaired = 0
  let failed = 0
  let attempted = 0
  const flush = async (): Promise<void> => {
    if (jobs.length === 0) return
    const result = await vectorIndexAddBatchGuarded(jobs)
    repaired += result.ok
    failed += result.fail
    attempted += jobs.length
    jobs.length = 0
  }
  for (const obsId of drift.missingVectorIds) {
    const entry = entries.get(obsId)
    if (!entry) continue
    const observation = await kv.get<CompressedObservation>(
      KV.observations(entry.sessionId),
      obsId,
    )
    if (observation && !isRetrievalGeneratedObservation(observation)) {
      const session = sessionsById.get(entry.sessionId)
      jobs.push({
        id: observation.id,
        sessionId: observation.sessionId,
        text: observation.title + " " + observation.narrative,
        context: { kind: "observation", logId: observation.id },
        externalProcessing: session
          ? session.privacy !== "strict" &&
            session.externalProcessing !== false
          : false,
      })
      if (jobs.length >= getRebuildEmbedBatchSize()) await flush()
      continue
    }

    const memory = await kv.get<Memory>(KV.memories, obsId)
    if (memory?.isLatest !== false && memory?.title && memory?.content) {
      jobs.push({
        id: memory.id,
        sessionId: memory.sessionIds?.[0] ?? "memory",
        text: memory.title + " " + memory.content,
        context: { kind: "memory", logId: memory.id },
        externalProcessing: memory.project === undefined,
      })
      if (jobs.length >= getRebuildEmbedBatchSize()) await flush()
      continue
    }

    // The keyword row points at content that no longer exists. Removing the
    // stale row restores exact identifier parity without inventing evidence.
    idx.remove(obsId)
  }

  await flush()
  if (failed > 0) {
    logger.warn("vector-index repair: some missing vectors remain", {
      attempted,
      repaired,
      failed,
    })
  }
  return repaired + drift.orphanVectorIds.length
}

async function performRebuildIndex(kv: StateKV): Promise<number> {
  const idx = getSearchIndex()
  idx.clear()

  // BM25 clear above wipes stale doc entries; the vector index has the
  // symmetric concern — memories/observations deleted between runs
  // would leave orphan embeddings here forever. Clear both before the
  // repopulation loops run, so BM25 and vector stay in sync.
  vectorIndex?.clear()
  vectorExcludedIds.clear()

  const batchSize = getRebuildEmbedBatchSize()
  // Accumulator for the batched embed flush. BM25 add is synchronous and
  // doesn't need batching — only the vector path benefits.
  type EmbedJob = {
    id: string
    sessionId: string
    text: string
    context: { kind: "memory" | "observation" | "synthetic"; logId: string }
    externalProcessing?: boolean
  }
  const pending: EmbedJob[] = []
  let count = 0

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return
    await vectorIndexAddBatchGuarded(pending)
    pending.length = 0
  }
  const enqueue = async (job: EmbedJob): Promise<void> => {
    pending.push(job)
    if (pending.length >= batchSize) await flush()
  }

  const sessions = await kv.list<Session>(KV.sessions)
  assertStartupReconcileBudget(sessions.length)
  // Memories live in their own KV scope outside per-session observation
  // scopes, so they need a separate walk. Without this, mem::remember
  // entries vanish from BM25 on every restart even after the live-write
  // fix in remember.ts (#257).
  const memories = await kv.list<Memory>(KV.memories)
  assertStartupReconcileBudget(memories.length)
  for (const memory of memories) {
    if (memory.isLatest === false) continue
    if (!memory.title || !memory.content) continue
    assertStartupReconcileBudget(count + 1)
    idx.add(memoryToObservation(memory))
    await enqueue({
      id: memory.id,
      sessionId: memory.sessionIds?.[0] ?? 'memory',
      text: memory.title + ' ' + memory.content,
      context: { kind: "memory", logId: memory.id },
      externalProcessing: memory.project === undefined,
    })
    count++
  }

  if (!sessions.length) {
    await flush()
    return count
  }

  for (let batch = 0; batch < sessions.length; batch += 10) {
    const chunk = sessions.slice(batch, batch + 10)
    const observationsBySession = await Promise.all(
      chunk.map(async (session) => ({
        session,
        observations: await kv.list<CompressedObservation>(
          KV.observations(session.id),
        ),
      })),
    )
    for (const { session, observations } of observationsBySession) {
      assertStartupReconcileBudget(count + observations.length)
      for (const obs of observations) {
        if (isRetrievalGeneratedObservation(obs)) continue
        if (obs.title && obs.narrative) {
          assertStartupReconcileBudget(count + 1)
          idx.add(obs)
          await enqueue({
            id: obs.id,
            sessionId: obs.sessionId,
            text: obs.title + ' ' + obs.narrative,
            context: { kind: "observation", logId: obs.id },
            externalProcessing:
              session.privacy !== "strict" &&
              session.externalProcessing !== false,
          })
          count++
        }
      }
    }
  }

  // Drain the last partial batch.
  await flush()
  return count
}

export function registerSearchFunction(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction(
    'mem::search',
    async (data: {
      query: string
      limit?: number
      project?: string
      cwd?: string
      format?: string
      token_budget?: number
      agentId?: string
      scope?: "project" | "global"
    }) => {
      const idx = getSearchIndex()

      // Input validation / normalization.
      if (typeof data?.query !== 'string' || !data.query.trim()) {
        throw new Error('mem::search: query must be a non-empty string')
      }
      const query = data.query.trim()
      const MAX_LIMIT = 100
      let effectiveLimit = 20
      if (data.limit !== undefined) {
        if (!Number.isInteger(data.limit) || data.limit < 1) {
          throw new Error('mem::search: limit must be a positive integer')
        }
        effectiveLimit = Math.min(data.limit, MAX_LIMIT)
      }
      const projectScope = requireProjectReadScope(data, "mem::search")
      const projectFilter =
        projectScope.kind === "project" ? projectScope.project : undefined
      const cwdFilter = typeof data.cwd === 'string' && data.cwd.trim().length > 0 ? data.cwd.trim() : undefined
      // #817: agent-scope isolation. mem::search backs REST /search,
      // memory_recall and recall_context. Without filtering here a
      // worker booted with AGENT_ID=B + AGENTMEMORY_AGENT_SCOPE=isolated
      // could read A's memories — the cross-agent leak the issue
      // documented. Mirrors the smart-search pattern: wildcard "*"
      // bypasses, explicit agentId pins, isolated mode falls back to
      // the worker's own AGENT_ID.
      //
      // Fail-closed: if isolated mode is on AND no explicit agentId
      // is given AND env AGENT_ID is unset, refuse the call rather
      // than silently dropping the filter. Allowing the call through
      // with filterAgentId=undefined is the same leak this fix is
      // supposed to close.
      const isolated = isAgentScopeIsolated();
      const explicitAgentId =
        typeof data.agentId === "string" && data.agentId.trim().length > 0
          ? data.agentId.trim()
          : undefined;
      const wildcardAgent = explicitAgentId === "*";
      const envAgentId = isolated ? getAgentId() : undefined;
      const filterAgentId = wildcardAgent
        ? undefined
        : explicitAgentId ?? envAgentId;
      if (
        isolated &&
        !wildcardAgent &&
        !explicitAgentId &&
        !envAgentId
      ) {
        throw new Error(
          "mem::search: AGENTMEMORY_AGENT_SCOPE=isolated is set but no " +
            "agent id is available (env AGENT_ID unset and no explicit " +
            "agentId in the call). Refusing to read cross-agent rows. " +
            'Pass agentId: "*" to opt in to a wildcard read.',
        );
      }
      const format = typeof data.format === 'string' ? data.format : 'full'
      if (!['full', 'compact', 'narrative'].includes(format)) {
        throw new Error("mem::search: format must be one of 'full', 'compact', or 'narrative'")
      }
      let tokenBudget: number | undefined
      if (data.token_budget !== undefined) {
        if (!Number.isInteger(data.token_budget) || data.token_budget < 1) {
          throw new Error('mem::search: token_budget must be a positive integer')
        }
        tokenBudget = data.token_budget
      }

      if (idx.size === 0) {
        const count = await rebuildIndex(kv)
        logger.info('Search index rebuilt', { entries: count })
      }

      // When filtering by project/cwd, over-fetch from the index so the
      // post-filter still has a chance of returning `effectiveLimit` results.
      // Over-fetch whenever ANY post-index filter is active. agentId
      // is dropped after the observation/memory is loaded (BM25 index
      // doesn't carry it), so without the over-fetch isolated-mode
      // queries return underfilled pages when same-agent matches
      // rank lower than cross-agent ones in the hybrid score.
      const filtering = !!(projectFilter || cwdFilter || filterAgentId)
      const fetchLimit = filtering
        ? Math.max(effectiveLimit * 10, 100)
        : Math.max(effectiveLimit * 3, 30)
      const results = idx.search(query, fetchLimit)

      // Resolve session -> project/cwd once per sessionId we touch.
      const sessionCache = new Map<string, Session | null>()
      const loadSession = async (sessionId: string): Promise<Session | null> => {
        if (sessionCache.has(sessionId)) return sessionCache.get(sessionId)!
        const s = await kv.get<Session>(KV.sessions, sessionId)
        sessionCache.set(sessionId, s ?? null)
        return s ?? null
      }

      // Cache for memory project lookups. Memories indexed via mem::remember
      // use a synthetic sessionId ('memory' or the first real sessionId) that
      // either has no KV.sessions entry or belongs to a different project.
      // When loadSession returns null we fall through to a KV.memories probe
      // so project-filtered search can include or exclude them correctly.
      const memoryProjectCache = new Map<string, string | null>()
      const loadMemoryProject = async (obsId: string): Promise<string | null> => {
        if (memoryProjectCache.has(obsId)) return memoryProjectCache.get(obsId)!
        const mem = await kv.get<Memory>(KV.memories, obsId).catch(() => null)
        const proj = mem?.project ?? null
        memoryProjectCache.set(obsId, proj)
        return proj
      }

      await Promise.all(
        [...new Set(results.map((result) => result.sessionId))].map((sessionId) =>
          loadSession(sessionId),
        ),
      )
      if (projectFilter) {
        await Promise.all(
          results
            .filter((result) => !sessionCache.get(result.sessionId))
            .map((result) => loadMemoryProject(result.obsId)),
        )
      }

      // First pass: filter by session (sequential — benefits from session cache).
      // Memory entries with a synthetic sessionId take a secondary KV.memories
      // path so project filtering works correctly for them too.
      //
      // When agentId filtering is active we can't cap at effectiveLimit
      // here — the second pass (post-load) is what drops cross-agent
      // rows, and capping early would underfill the result page. Use
      // fetchLimit as the upper bound in that case; the final
      // truncation lives at the end of the second pass.
      const earlyCap = fetchLimit
      const candidates: typeof results = []
      for (const r of results) {
        if (candidates.length >= earlyCap) break
        if (filtering) {
          const s = sessionCache.get(r.sessionId) ?? null
          if (s) {
            if (projectFilter && s.project !== projectFilter) continue
            if (cwdFilter && s.cwd !== cwdFilter) continue
          } else {
            // Session not found. Two cases arrive here:
            //   1. Synthetic sessionId — memories indexed via mem::remember use
            //      sessionIds[0] ?? 'memory'. The string 'memory' has no session
            //      entry; neither does a real sessionId when sessionIds[0] happens
            //      to be a session from a different lifecycle. Probe KV.memories
            //      directly to get the memory's own project field.
            // Deleted or legacy rows with no verifiable project remain stored
            // but are excluded from implicit project reads.
            if (projectFilter) {
              const memProject = memoryProjectCache.get(r.obsId) ?? null
              if (memProject !== projectFilter) continue
            }
            // cwd filter does not apply to unbound entries.
          }
        }
        candidates.push(r)
      }

      // Second pass: load observations in parallel. Fall back to
      // KV.memories when the observation lookup misses — entries indexed
      // via mem::remember live in the memories scope under a synthetic
      // sessionId, so the observation key never exists (#265).
      const obsResults = await Promise.all(
        candidates.map(async (r) => {
          const obs = await kv
            .get<CompressedObservation>(KV.observations(r.sessionId), r.obsId)
            .catch(() => null)
          if (obs) return obs
          const mem = await kv
            .get<Memory>(KV.memories, r.obsId)
            .catch(() => null)
          return mem ? memoryToObservation(mem) : null
        })
      )
      const enriched: SearchResult[] = []
      for (let i = 0; i < candidates.length; i++) {
        const obs = obsResults[i]
        if (!obs) continue
        if (isRetrievalGeneratedObservation(obs)) continue
        // #817: enforce agent-scope after the observation/memory is
        // loaded. The BM25 index doesn't carry agentId so the filter
        // happens post-lookup. Wildcard ("*") and no-isolation paths
        // resolved filterAgentId=undefined upstream and pass through.
        if (filterAgentId !== undefined && obs.agentId !== filterAgentId) continue
        if (enriched.length >= effectiveLimit) break
        enriched.push({
          observation: obs,
          score: candidates[i].score,
          sessionId: candidates[i].sessionId,
        })
      }

      void recordAccessBatch(
        kv,
        enriched.map((r) => r.observation.id),
      )

      const estimateTokens = (value: unknown): number =>
        Math.max(1, Math.ceil(JSON.stringify(value).length / 3))

      const applyTokenBudget = <T>(items: T[]): {
        items: T[]
        used: number
        truncated: boolean
      } => {
        if (!tokenBudget) return { items, used: items.reduce((sum, item) => sum + estimateTokens(item), 0), truncated: false }
        const selected: T[] = []
        let used = 0
        for (const item of items) {
          const itemTokens = estimateTokens(item)
          if (used + itemTokens > tokenBudget) {
            return { items: selected, used, truncated: selected.length < items.length }
          }
          selected.push(item)
          used += itemTokens
        }
        return { items: selected, used, truncated: false }
      }

      if (format === 'compact') {
        const compactResults: CompactSearchResult[] = enriched.map((r) => ({
          obsId: r.observation.id,
          sessionId: r.sessionId,
          title: r.observation.title,
          type: r.observation.type,
          score: r.score,
          timestamp: r.observation.timestamp,
        }))
        const packed = applyTokenBudget(compactResults)
        return {
          format,
          results: packed.items,
          tokens_used: packed.used,
          tokens_budget: tokenBudget,
          truncated: packed.truncated,
        }
      }

      if (format === 'narrative') {
        const narrativeResults = enriched.map((r) => ({
          obsId: r.observation.id,
          sessionId: r.sessionId,
          title: r.observation.title,
          narrative: r.observation.narrative,
          score: r.score,
          timestamp: r.observation.timestamp,
        }))
        const packed = applyTokenBudget(narrativeResults)
        const text = packed.items
          .map((r, index) => `${index + 1}. ${r.title}\n${r.narrative}`)
          .join('\n\n')
        return {
          format,
          results: packed.items,
          text,
          tokens_used: packed.used,
          tokens_budget: tokenBudget,
          truncated: packed.truncated,
        }
      }

      const packed = applyTokenBudget(enriched)

      // Avoid logging raw cwd/project (host paths). Log only that filters were active.
      logger.info('Search completed', {
        query,
        results: packed.items.length,
        hasProjectFilter: !!projectFilter,
        hasCwdFilter: !!cwdFilter,
      })
      return {
        format,
        results: packed.items,
        tokens_used: packed.used,
        tokens_budget: tokenBudget,
        truncated: packed.truncated,
      }
    }
  )
}
