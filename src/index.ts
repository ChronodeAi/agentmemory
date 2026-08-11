import { registerWorker } from "iii-sdk";
import {
  loadConfig,
  getEnvVar,
  loadEmbeddingConfig,
  loadFallbackConfig,
  loadClaudeBridgeConfig,
  loadTeamConfig,
  loadSnapshotConfig,
  isGraphExtractionEnabled,
  isAutoCompressEnabled,
  isConsolidationEnabled,
  isContextInjectionEnabled,
  isDropStaleIndexEnabled,
} from "./config.js";
import {
  createProvider,
  createFallbackProvider,
  createEmbeddingProvider,
  createImageEmbeddingProvider,
} from "./providers/index.js";
import { StateKV } from "./state/kv.js";
import { VectorIndex } from "./state/vector-index.js";
import { HybridSearch } from "./state/hybrid-search.js";
import { IndexPersistence } from "./state/index-persistence.js";
import { createStartupGate } from "./state/startup-gate.js";
import { createStartupTimeBudget } from "./state/startup-timeout.js";
import { registerPrivacyFunction } from "./functions/privacy.js";
import { registerObserveFunction } from "./functions/observe.js";
import { registerImageQuotaCleanup } from "./functions/image-quota-cleanup.js";
import { registerVisionSearchFunctions } from "./functions/vision-search.js";
import { registerSlotsFunctions, isSlotsEnabled, isReflectEnabled } from "./functions/slots.js";
import { registerDiskSizeManager } from "./functions/disk-size-manager.js";
import { registerCompressFunction } from "./functions/compress.js";
import {
  registerSearchFunction,
  rebuildIndex,
  getSearchIndex,
  getSearchIndexDrift,
  getSearchIndexRuntimeStatus,
  flushIndexSave,
  incrementalVectorRepairLimit,
  markSearchIndexReady,
  reconcileCanonicalSearchIndex,
  repairVectorIndexFromKeyword,
  scheduleIndexSave,
  setVectorIndex,
  setEmbeddingProvider,
  setIndexPersistence,
} from "./functions/search.js";
import { registerContextFunction } from "./functions/context.js";
import { registerSummarizeFunction } from "./functions/summarize.js";
import { registerMigrateFunction } from "./functions/migrate.js";
import { registerFileIndexFunction } from "./functions/file-index.js";
import { registerConsolidateFunction } from "./functions/consolidate.js";
import { registerPatternsFunction } from "./functions/patterns.js";
import { registerRememberFunction } from "./functions/remember.js";
import { registerEvictFunction } from "./functions/evict.js";
import { registerRelationsFunction } from "./functions/relations.js";
import { registerTimelineFunction } from "./functions/timeline.js";
import { registerSmartSearchFunction } from "./functions/smart-search.js";
import {
  createSignedContextDeliveryVerifier,
  registerCodingMemoryFunctions,
} from "./functions/coding-memory.js";
import { registerPromotionFunctions } from "./functions/promotions.js";
import { registerRecentSearchesSweepFunction } from "./functions/recent-searches-sweep.js";
import { registerProfileFunction } from "./functions/profile.js";
import { registerAutoForgetFunction } from "./functions/auto-forget.js";
import { registerExportImportFunction } from "./functions/export-import.js";
import { registerEnrichFunction } from "./functions/enrich.js";
import { registerClaudeBridgeFunction } from "./functions/claude-bridge.js";
import { registerGraphFunction } from "./functions/graph.js";
import { registerConsolidationPipelineFunction } from "./functions/consolidation-pipeline.js";
import { registerTeamFunction } from "./functions/team.js";
import {
  reconcileGovernanceDeleteIntents,
  registerGovernanceFunction,
} from "./functions/governance.js";
import { registerSnapshotFunction } from "./functions/snapshot.js";
import { registerActionsFunction } from "./functions/actions.js";
import { registerFrontierFunction } from "./functions/frontier.js";
import { registerLeasesFunction } from "./functions/leases.js";
import { registerRoutinesFunction } from "./functions/routines.js";
import { registerSignalsFunction } from "./functions/signals.js";
import { registerCheckpointsFunction } from "./functions/checkpoints.js";
import { registerFlowCompressFunction } from "./functions/flow-compress.js";
import { registerMeshFunction } from "./functions/mesh.js";
import { registerBranchAwareFunction } from "./functions/branch-aware.js";
import { registerSentinelsFunction } from "./functions/sentinels.js";
import { registerSketchesFunction } from "./functions/sketches.js";
import { registerCrystallizeFunction } from "./functions/crystallize.js";
import { registerDiagnosticsFunction } from "./functions/diagnostics.js";
import { registerFacetsFunction } from "./functions/facets.js";
import { registerVerifyFunction } from "./functions/verify.js";
import { registerCascadeFunction } from "./functions/cascade.js";
import { registerLessonsFunctions } from "./functions/lessons.js";
import { registerObsidianExportFunction } from "./functions/obsidian-export.js";
import { registerReflectFunctions } from "./functions/reflect.js";
import { registerWorkingMemoryFunctions } from "./functions/working-memory.js";
import { registerSkillExtractFunctions } from "./functions/skill-extract.js";
import { registerSlidingWindowFunction } from "./functions/sliding-window.js";
import { registerQueryExpansionFunction } from "./functions/query-expansion.js";
import { registerTemporalGraphFunctions } from "./functions/temporal-graph.js";
import { registerRetentionFunctions } from "./functions/retention.js";
import { registerCompressFileFunction } from "./functions/compress-file.js";
import { registerReplayFunctions } from "./functions/replay.js";
import { registerApiTriggers } from "./triggers/api.js";
import {
  reconcileBackgroundPipelines,
  registerEventTriggers,
} from "./triggers/events.js";
import { registerMcpEndpoints } from "./mcp/server.js";
import { getAllTools } from "./mcp/tools-registry.js";
import { startViewerServer } from "./viewer/server.js";
import { MetricsStore } from "./eval/metrics-store.js";
import { DedupMap } from "./functions/dedup.js";
import { registerHealthMonitor } from "./health/monitor.js";
import { recoverAuditGaps } from "./functions/audit.js";
import { initMetrics, OTEL_CONFIG } from "./telemetry/setup.js";
import { VERSION } from "./version.js";
import { bootLog, logger } from "./logger.js";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import {
  DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  isStrictCapabilityMode,
} from "./auth.js";

// The CLI imports this worker after iii is ready. Older bundled configs also
// spawned it through iii-exec, which could leave a detached duplicate during
// upgrades. Write the worker pid alongside iii.pid so `agentmemory stop` can
// target the active worker and clean up that legacy state.
function workerPidfilePath(): string {
  return join(homedir(), ".agentmemory", "worker.pid");
}
function writeWorkerPidfile(): void {
  try {
    const p = workerPidfilePath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, `${process.pid}\n`, { encoding: "utf-8" });
  } catch {
    // best-effort; stop still has the engine pidfile + port scan fallback
  }
}
function clearWorkerPidfile(): void {
  try {
    unlinkSync(workerPidfilePath());
  } catch {}
}

function hasGetMeter(
  sdk: unknown,
): sdk is { getMeter: (name: string) => unknown } {
  return (
    typeof sdk === "object" &&
    sdk !== null &&
    "getMeter" in sdk &&
    typeof (sdk as { getMeter?: unknown }).getMeter === "function"
  );
}

// Top-level safety net for iii-engine invocation timeouts (issue #204).
// Under sustained write load (e.g. Claude Code hooks across many
// projects) `state::set` can occasionally exceed the SDK's 30s timeout.
// We don't want one such timeout to terminate the long-lived memory
// service — the rejection is surfaced to the relevant call site via
// .catch() where it matters; everything else is logged-and-continued.
// Throttle logs to avoid spamming on bursts.
let lastUnhandledLogAt = 0;
process.on("unhandledRejection", (reason) => {
  const now = Date.now();
  if (now - lastUnhandledLogAt < 60_000) return;
  lastUnhandledLogAt = now;
  const r = reason as { code?: string; function_id?: string; message?: string };
  logger.warn("unhandled rejection suppressed", {
    code: r?.code,
    functionId: r?.function_id,
    message:
      r?.message ??
      (reason instanceof Error ? reason.message : "unclassified rejection"),
  });
});

async function main() {
  const config = loadConfig();
  const embeddingConfig = loadEmbeddingConfig();
  const fallbackConfig = loadFallbackConfig();

  const provider =
    fallbackConfig.providers.length > 0
      ? createFallbackProvider(config.provider, fallbackConfig)
      : createProvider(config.provider);

  const embeddingProvider = createEmbeddingProvider();
  const imageEmbeddingProvider = createImageEmbeddingProvider();

  bootLog(`Starting worker v${VERSION}...`);
  bootLog(`Engine: ${config.engineUrl}`);
  bootLog(
    `Provider: ${config.provider.provider} (${config.provider.model})`,
  );
  if (embeddingProvider) {
    bootLog(
      `Embedding provider: ${embeddingProvider.name} (${embeddingProvider.dimensions} dims)`,
    );
  } else {
    bootLog(`Embedding provider: none (BM25-only mode)`);
  }
  if (imageEmbeddingProvider) {
    bootLog(
      `Image embedding provider: ${imageEmbeddingProvider.name} (${imageEmbeddingProvider.dimensions} dims) — vision-search active`,
    );
  }
  bootLog(
    `REST API: http://localhost:${config.restPort}/agentmemory/*`,
  );
  bootLog(`Streams: ws://localhost:${config.streamsPort}`);

  const connectedSdk = registerWorker(config.engineUrl, {
    workerName: "agentmemory",
    invocationTimeoutMs: 180000,
    otel: {
      serviceName: OTEL_CONFIG.serviceName,
      serviceVersion: OTEL_CONFIG.serviceVersion,
      metricsExportIntervalMs: OTEL_CONFIG.metricsExportIntervalMs,
    },
    // Explicit worker telemetry metadata. iii-sdk falls back to
    // auto-detection (cwd / package.json name / hostname) when this
    // is omitted, which produces inconsistent values per host —
    // `agentmemory`, `node`, `npm`, occasionally the user's home
    // directory basename. Pinning the value here gives every install
    // the same stable project identifier for downstream attribution
    // and grouping in the engine's metrics + traces output.
    telemetry: {
      project_name: "agentmemory",
      language: "node",
      framework: "iii-sdk",
    },
  });
  const startupGate = createStartupGate(connectedSdk);
  const sdk = startupGate.sdk;

  writeWorkerPidfile();

  const kv = new StateKV(sdk);
  const secret = getEnvVar("AGENTMEMORY_SECRET");
  const adminSecret = getEnvVar("AGENTMEMORY_ADMIN_SECRET");
  const projectCapabilitySecret = getEnvVar(
    "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
  );
  const contextAckSecret = getEnvVar("AGENTMEMORY_CONTEXT_ACK_SECRET");
  const strictCapabilityMode = isStrictCapabilityMode(
    getEnvVar("AGENTMEMORY_STRICT_CAPABILITY_MODE"),
  );
  const metricsStore = new MetricsStore(kv);
  const dedupMap = new DedupMap();

  const vectorIndex = embeddingProvider ? new VectorIndex() : null;

  setVectorIndex(vectorIndex);
  setEmbeddingProvider(embeddingProvider);

  const meterAccessor = hasGetMeter(sdk)
    ? (sdk.getMeter.bind(sdk) as (name: string) => unknown)
    : undefined;

  initMetrics(meterAccessor as ((name: string) => import("@opentelemetry/api").Meter) | undefined);

  registerPrivacyFunction(sdk);
  registerObserveFunction(sdk, kv, dedupMap, config.maxObservationsPerSession);
  registerImageQuotaCleanup(sdk, kv);
  registerVisionSearchFunctions(sdk, kv, imageEmbeddingProvider);
  if (isSlotsEnabled()) {
    registerSlotsFunctions(sdk, kv);
  }
  registerDiskSizeManager(sdk, kv);
  registerCompressFunction(sdk, kv, provider, metricsStore);
  registerSearchFunction(sdk, kv);
  registerContextFunction(sdk, kv, config.tokenBudget);
  registerSummarizeFunction(sdk, kv, provider, metricsStore);
  registerMigrateFunction(sdk, kv);
  registerFileIndexFunction(sdk, kv);
  registerConsolidateFunction(sdk, kv, provider);
  registerPatternsFunction(sdk, kv);
  registerRememberFunction(sdk, kv);
  registerEvictFunction(sdk, kv);

  registerRelationsFunction(sdk, kv);
  registerTimelineFunction(sdk, kv);
  registerProfileFunction(sdk, kv);
  registerAutoForgetFunction(sdk, kv);
  registerExportImportFunction(sdk, kv);
  registerEnrichFunction(sdk, kv);

  const claudeBridgeConfig = loadClaudeBridgeConfig();
  if (claudeBridgeConfig.enabled) {
    registerClaudeBridgeFunction(sdk, kv, claudeBridgeConfig);
    bootLog(
      `Claude bridge: syncing to ${claudeBridgeConfig.memoryFilePath}`,
    );
  }

  if (isGraphExtractionEnabled()) {
    registerGraphFunction(sdk, kv, provider);
    bootLog(`Knowledge graph: extraction enabled`);
  }

  registerConsolidationPipelineFunction(sdk, kv, provider);
  bootLog(`Consolidation pipeline: registered (CONSOLIDATION_ENABLED=${isConsolidationEnabled() ? "true" : "false"})`);

  if (isAutoCompressEnabled()) {
    bootLog(
      `WARNING: AGENTMEMORY_AUTO_COMPRESS=true — every PostToolUse observation will be sent to your LLM provider for compression. This spends API tokens proportional to your session tool-use frequency. Set AGENTMEMORY_AUTO_COMPRESS=false to disable.`,
    );
  } else {
    bootLog(
      `Auto-compress: OFF (default) — observations indexed via zero-LLM synthetic compression. Set AGENTMEMORY_AUTO_COMPRESS=true to opt-in to LLM-powered summaries (uses your API key).`,
    );
  }

  if (isContextInjectionEnabled()) {
    bootLog(
      `WARNING: AGENTMEMORY_INJECT_CONTEXT=true — the PreToolUse and SessionStart hooks will inject up to ~4000 chars of memory context into every tool turn. On Claude Pro this burns session tokens proportional to your tool-call frequency. Set AGENTMEMORY_INJECT_CONTEXT=false to disable.`,
    );
  } else {
    bootLog(
      `Context injection: OFF (default) — hooks capture observations but do not inject context into Claude Code's conversation. Set AGENTMEMORY_INJECT_CONTEXT=true to opt-in (warning: expect your Claude Pro allocation to drain faster).`,
    );
  }

  const teamConfig = loadTeamConfig();
  if (teamConfig) {
    registerTeamFunction(sdk, kv, teamConfig);
    bootLog(
      `Team memory: ${teamConfig.teamId} (${teamConfig.mode})`,
    );
  }

  registerGovernanceFunction(sdk, kv);

  registerActionsFunction(sdk, kv);
  registerFrontierFunction(sdk, kv);
  registerLeasesFunction(sdk, kv);
  registerRoutinesFunction(sdk, kv);
  registerSignalsFunction(sdk, kv);
  registerCheckpointsFunction(sdk, kv);
  registerMeshFunction(sdk, kv, adminSecret);
  registerBranchAwareFunction(sdk, kv);
  registerFlowCompressFunction(sdk, kv, provider);
  registerSentinelsFunction(sdk, kv);
  registerSketchesFunction(sdk, kv);
  registerCrystallizeFunction(sdk, kv, provider);
  registerDiagnosticsFunction(sdk, kv);
  registerFacetsFunction(sdk, kv);
  registerVerifyFunction(sdk, kv);
  registerLessonsFunctions(sdk, kv);
  registerObsidianExportFunction(sdk, kv);
  registerReflectFunctions(sdk, kv, provider);
  registerWorkingMemoryFunctions(sdk, kv, config.tokenBudget);
  registerSkillExtractFunctions(sdk, kv, provider);
  registerCascadeFunction(sdk, kv);

  registerSlidingWindowFunction(sdk, kv, provider);
  registerQueryExpansionFunction(sdk, kv, provider);
  registerTemporalGraphFunctions(sdk, kv, provider);
  registerRetentionFunctions(sdk, kv);
  registerCompressFileFunction(sdk, kv, provider);
  registerReplayFunctions(sdk, kv);
  bootLog(
    `v0.6 advanced retrieval: sliding-window, query-expansion, temporal-graph, retention-scoring`,
  );
  bootLog(
    `Orchestration layer: actions, frontier, leases, routines, signals, checkpoints, flow-compress, mesh, branch-aware, sentinels, sketches, crystallize, diagnostics, facets`,
  );
  if (isSlotsEnabled()) {
    bootLog(
      `Slots: enabled (pinned editable memory). Reflect on Stop hook: ${isReflectEnabled() ? "on" : "off"}`,
    );
  }

  const snapshotConfig = loadSnapshotConfig();
  if (snapshotConfig.enabled) {
    registerSnapshotFunction(sdk, kv, snapshotConfig.dir);
    bootLog(
      `Git snapshots: ${snapshotConfig.dir} (every ${snapshotConfig.interval}s)`,
    );
  }

  const bm25Index = getSearchIndex();
  const graphWeight = parseFloat(getEnvVar("AGENTMEMORY_GRAPH_WEIGHT") || "0.3");
  const hybridSearch = new HybridSearch(
    bm25Index,
    vectorIndex,
    embeddingProvider,
    kv,
    embeddingConfig.bm25Weight,
    embeddingConfig.vectorWeight,
    graphWeight,
  );

  registerSmartSearchFunction(sdk, kv, (query, limit, processingContext) =>
    hybridSearch.search(query, limit, processingContext),
  );
  registerCodingMemoryFunctions(
    sdk,
    kv,
    createSignedContextDeliveryVerifier(contextAckSecret),
  );
  registerPromotionFunctions(sdk, kv);
  registerRecentSearchesSweepFunction(sdk, kv);

  registerApiTriggers(
    sdk,
    kv,
    secret,
    metricsStore,
    provider,
    adminSecret,
    projectCapabilitySecret,
    strictCapabilityMode,
    DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  );
  registerEventTriggers(sdk, kv);
  registerMcpEndpoints(
    sdk,
    kv,
    secret,
    adminSecret,
    projectCapabilitySecret,
    strictCapabilityMode,
    DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  );

  const indexPersistence = new IndexPersistence(kv, bm25Index, vectorIndex);
  const healthMonitor = registerHealthMonitor(sdk, kv, {
    getSearchIndexStatus: getSearchIndexRuntimeStatus,
    getIndexPersistenceStatus: () => indexPersistence.getHealthStatus(),
  });
  const startupMaintenanceBudget = createStartupTimeBudget();
  try {
    const recoveredAuditRows = await startupMaintenanceBudget.run(
      "audit-gap recovery",
      () => recoverAuditGaps(kv),
    );
    if (recoveredAuditRows > 0) {
      bootLog(`Recovered ${recoveredAuditRows} pending audit rows`);
    }
  } catch (error) {
    logger.warn("Pending audit recovery failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  try {
    const recoveredDeletes = await startupMaintenanceBudget.run(
      "governance-delete reconciliation",
      () => reconcileGovernanceDeleteIntents(kv),
    );
    if (recoveredDeletes > 0) {
      bootLog(`Reconciled ${recoveredDeletes} interrupted governance deletes`);
    }
  } catch (error) {
    logger.warn("Governance delete reconciliation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  // Wire the persistence hook so delete paths can flush BM25/vector
  // index mutations to disk. Without this, an in-memory remove can be
  // lost across a hard process exit and the persisted snapshot
  // restores the deleted entry at next boot.
  setIndexPersistence(indexPersistence, {
    repairDrift: async () => {
      await repairVectorIndexFromKeyword(kv);
      void healthMonitor.collectNow().catch(() => undefined);
    },
  });

  const loaded = await indexPersistence.load().catch((err) => {
    logger.warn("Failed to load persisted index", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  });
  if (loaded?.bm25 && loaded.bm25.size > 0) {
    bm25Index.restoreFrom(loaded.bm25);
    bootLog(
      `Loaded persisted BM25 index (${bm25Index.size} docs)`,
    );
  }
  if (loaded?.vector && vectorIndex && loaded.vector.size > 0) {
    // Persisted vectors carry whatever dimension the provider had when
    // they were written. If the active provider declares a different
    // dimension — or if the on-disk index contains a mix of dimensions
    // (legacy indexes written before the live-API guard in this PR) —
    // restoring would silently corrupt search: cosineSimilarity returns
    // 0 on cross-dim pairs, so affected observations stop matching
    // anything and recall degrades without an error. Walk every stored
    // vector instead of trusting the first; refuse to load if anything
    // is off.
    const activeDim = embeddingProvider?.dimensions ?? 0;
    const { mismatches, seenDimensions } =
      activeDim > 0
        ? loaded.vector.validateDimensions(activeDim)
        : { mismatches: [], seenDimensions: new Set<number>() };

    if (mismatches.length > 0) {
      const sample = mismatches
        .slice(0, 5)
        .map((m) => `${m.obsId} (dim=${m.dim})`)
        .join(", ");
      const distinct = Array.from(seenDimensions).sort((a, b) => a - b).join(", ");
      const dropStale = isDropStaleIndexEnabled();
      if (dropStale) {
        console.warn(
          `[agentmemory] Persisted vector index has ${mismatches.length} of ` +
            `${loaded.vector.size} vectors with the wrong dimension. Active ` +
            `provider (${embeddingProvider?.name}) declares ${activeDim}; ` +
            `dimensions seen on disk: ${distinct}. ` +
            `AGENTMEMORY_DROP_STALE_INDEX=true is set — discarding the persisted ` +
            `vectors. Live observations will rebuild the index over time.`,
        );
      } else {
        throw new Error(
          `[agentmemory] Refusing to start: persisted vector index has ` +
            `${mismatches.length} of ${loaded.vector.size} vectors with the ` +
            `wrong dimension. Active provider (${embeddingProvider?.name}) ` +
            `declares ${activeDim}; dimensions seen on disk: ${distinct}. ` +
            `First mismatched obsIds: ${sample}. Loading would silently corrupt ` +
            `search (cross-dimension cosine returns 0). Choose one:\n` +
            `  - Re-embed the existing index against the new provider, then start.\n` +
            `  - Set AGENTMEMORY_DROP_STALE_INDEX=true to discard the persisted ` +
            `vectors and rebuild from live observations.\n` +
            `  - Switch the embedding provider back to the one that wrote the index.`,
        );
      }
    } else {
      vectorIndex.restoreFrom(loaded.vector);
      bootLog(
        `Loaded persisted vector index (${vectorIndex.size} vectors)`,
      );
    }
  }

  let canonicalIndexChanged = false;
  if (loaded?.bm25 && loaded.bm25.size > 0) {
    const reconciliation = await startupMaintenanceBudget.run(
      "canonical search-index reconciliation",
      () => reconcileCanonicalSearchIndex(kv),
    );
    canonicalIndexChanged =
      reconciliation.addedKeywordEntries > 0 ||
      reconciliation.removedKeywordEntries > 0;
    if (canonicalIndexChanged) {
      bootLog(
        `Reconciled persisted search index with canonical state: ` +
          `${reconciliation.addedKeywordEntries} added, ` +
          `${reconciliation.removedKeywordEntries} removed`,
      );
    }
  }

  const vectorExpected = embeddingProvider !== null && vectorIndex !== null;
  const initialDrift = vectorExpected
    ? getSearchIndexDrift()
    : { missingVectorIds: [], orphanVectorIds: [] };
  const driftCount =
    initialDrift.missingVectorIds.length +
    initialDrift.orphanVectorIds.length;
  const incrementalRepairLimit = incrementalVectorRepairLimit(bm25Index.size);
  const needsRebuild =
    bm25Index.size === 0 ||
    (vectorExpected && driftCount > incrementalRepairLimit);

  if (needsRebuild) {
    const indexCount = await startupMaintenanceBudget.run(
      "canonical search-index rebuild",
      () => rebuildIndex(kv),
    );
    if (indexCount > 0) bootLog(`Search index rebuilt: ${indexCount} entries`);
    scheduleIndexSave();
    void healthMonitor.collectNow().catch(() => undefined);
  } else {
    if (vectorExpected && driftCount > 0) {
      const repaired = await startupMaintenanceBudget.run(
        "vector-index repair",
        () => repairVectorIndexFromKeyword(kv),
      );
      bootLog(
        `Repaired ${repaired} persisted vector index entr${
          repaired === 1 ? "y" : "ies"
        }`,
      );
    }
    const repairedDrift = vectorExpected
      ? getSearchIndexDrift()
      : { missingVectorIds: [], orphanVectorIds: [] };
    markSearchIndexReady(
      bm25Index.size,
      vectorIndex?.size ?? 0,
      embeddingProvider !== null,
      repairedDrift.missingVectorIds.length === 0 &&
        repairedDrift.orphanVectorIds.length === 0,
    );
    if (indexPersistence.needsRepair()) {
      bootLog("Recovered a persisted index from its retained generation");
      scheduleIndexSave();
    }
    // Canonical reconciliation above already backfills every current memory.
    // Keeping a second unbounded KV walk here duplicated work and could hide
    // a failed inventory read behind a warning after readiness was computed.
    const finalDrift = vectorExpected
      ? getSearchIndexDrift()
      : { missingVectorIds: [], orphanVectorIds: [] };
    markSearchIndexReady(
      bm25Index.size,
      vectorIndex?.size ?? 0,
      embeddingProvider !== null,
      finalDrift.missingVectorIds.length === 0 &&
        finalDrift.orphanVectorIds.length === 0,
    );
    if (canonicalIndexChanged) scheduleIndexSave();
    void healthMonitor.collectNow().catch(() => undefined);
  }

  // Every registered local function waits on this gate. Opening it only
  // after canonical reconciliation prevents startup writes from racing the
  // snapshot used to repair persisted derived indexes.
  startupGate.open();
  try {
    const recovery = await reconcileBackgroundPipelines(sdk, kv);
    if (recovery.replayed > 0 || recovery.exhausted > 0) {
      bootLog(
        `Background pipeline recovery: ${recovery.replayed} replayed, ${recovery.exhausted} exhausted`,
      );
    }
  } catch (error) {
    logger.warn("Background pipeline recovery failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Ready / Endpoints lines are emitted via `bootLog` so they're
  // buffered in quiet mode and printed verbatim under --verbose. The
  // CLI surfaces a compact summary when it sees the worker reach
  // ready state.
  const startupSearchStatus = getSearchIndexRuntimeStatus();
  bootLog(
    startupSearchStatus.status === "ready"
      ? `Ready. ${embeddingProvider ? "Triple-stream (BM25+Vector+Graph)" : "BM25+Graph"} search active.`
      : `Operational with ${startupSearchStatus.status} search index; health remains degraded until repair completes.`,
  );
  bootLog(
    `REST API: 135 endpoints at http://localhost:${config.restPort}/agentmemory/*`,
  );
  bootLog(
    `MCP surface (opt-in via \`npx @agentmemory/mcp\`): ${getAllTools().length} tools · 5 resources · 3 prompts`,
  );

  const viewerPort = config.restPort + 2;
  const viewerServer = startViewerServer(
    viewerPort,
    kv,
    sdk,
    secret,
    config.restPort,
    {
      adminSecret,
      projectCapabilitySecret,
      audience: getEnvVar("AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE"),
      strictCapabilityMode,
    },
  );

  const autoForgetIntervalMs = parseInt(process.env.AUTO_FORGET_INTERVAL_MS || "3600000", 10);
  const consolidationIntervalMs = parseInt(process.env.CONSOLIDATION_INTERVAL_MS || "7200000", 10);

  if (process.env.AUTO_FORGET_ENABLED !== "false") {
    const autoForgetTimer = setInterval(async () => {
      try {
        await sdk.trigger({ function_id: "mem::auto-forget", payload: { dryRun: false } });
      } catch {}
    }, autoForgetIntervalMs);
    autoForgetTimer.unref();
    bootLog(`Auto-forget: enabled (every ${autoForgetIntervalMs / 60000}m)`);
  }

  if (process.env.LESSON_DECAY_ENABLED !== "false") {
    const lessonDecayTimer = setInterval(async () => {
      try {
        await sdk.trigger({ function_id: "mem::lesson-decay-sweep", payload: {} });
      } catch {}
    }, 86400000);
    lessonDecayTimer.unref();
    bootLog(`Lesson decay sweep: enabled (every 24h)`);
  }

  if (process.env.INSIGHT_DECAY_ENABLED !== "false") {
    const insightDecayTimer = setInterval(async () => {
      try {
        await sdk.trigger({ function_id: "mem::insight-decay-sweep", payload: {} });
      } catch {}
    }, 86400000);
    insightDecayTimer.unref();
  }

  // #771: hourly TTL sweep for the followup-rate diagnostic. The
  // recent-searches scope only needs the last entry per session;
  // sweeping anything older than the retention window keeps the scope
  // from growing unbounded across long-lived deployments.
  const recentSearchesSweepTimer = setInterval(async () => {
    try {
      await sdk.trigger({
        function_id: "mem::diagnostic::recent-searches-sweep",
        payload: {},
      });
    } catch {}
  }, 60 * 60 * 1000);
  recentSearchesSweepTimer.unref();

  if (isConsolidationEnabled()) {
    const consolidationTimer = setInterval(async () => {
      try {
        await sdk.trigger({ function_id: "mem::consolidate-pipeline", payload: {} });
      } catch {}
    }, consolidationIntervalMs);
    consolidationTimer.unref();
    bootLog(`Auto-consolidation: enabled (every ${consolidationIntervalMs / 60000}m)`);
  }

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n[agentmemory] Shutting down...`);
    const hardExit = setTimeout(() => {
      clearWorkerPidfile();
      process.exit(0);
    }, 20_000);
    hardExit.unref();
    try {
      healthMonitor.stop();
      dedupMap.stop();
      indexPersistence.stop();
      await Promise.race([
        new Promise<void>((resolve) => viewerServer.close(() => resolve())),
        new Promise<void>((resolve) => setTimeout(resolve, 750)),
      ]);
      await Promise.race([
        flushIndexSave().catch((err) => {
          console.warn(`[agentmemory] Failed to save index on shutdown:`, err);
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 15_000)),
      ]);
      await Promise.race([
        sdk.shutdown(),
        new Promise<void>((resolve) => setTimeout(resolve, 1000)),
      ]);
    } finally {
      clearTimeout(hardExit);
      clearWorkerPidfile();
      process.exit(0);
    }
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  clearWorkerPidfile();
  console.error(`[agentmemory] Fatal:`, err);
  process.exit(1);
});
