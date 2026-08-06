import type { HealthSnapshot } from "../types.js";

interface ThresholdConfig {
  eventLoopLagWarnMs: number;
  eventLoopLagCriticalMs: number;
  cpuWarnPercent: number;
  cpuCriticalPercent: number;
  memoryWarnPercent: number;
  memoryCriticalPercent: number;
  memoryHeapFloorBytes: number;
  memoryRssFloorBytes: number;
  memoryRssWarnSystemPercent: number;
  memoryRssCriticalSystemPercent: number;
  memoryExternalWarnBytes: number;
  memoryExternalCriticalBytes: number;
}

const DEFAULTS: ThresholdConfig = {
  eventLoopLagWarnMs: 100,
  eventLoopLagCriticalMs: 500,
  cpuWarnPercent: 80,
  cpuCriticalPercent: 90,
  memoryWarnPercent: 80,
  memoryCriticalPercent: 95,
  memoryHeapFloorBytes: 512 * 1024 * 1024,
  memoryRssFloorBytes: 512 * 1024 * 1024,
  memoryRssWarnSystemPercent: 25,
  memoryRssCriticalSystemPercent: 50,
  memoryExternalWarnBytes: 512 * 1024 * 1024,
  memoryExternalCriticalBytes: 1024 * 1024 * 1024,
};

export function healthStatusExitCode(status: unknown): 0 | 1 {
  return status === "healthy" ? 0 : 1;
}

const DOCTOR_ADVISORY_ALERTS = [
  /^cpu_warn_\d+%$/,
  /^event_loop_lag_warn_\d+ms$/,
  /^recovery_window$/,
];

export function healthStatusAllowsDoctor(
  status: unknown,
  alerts: string[] = [],
): boolean {
  if (status === "healthy") return true;
  return (
    status === "degraded" &&
    alerts.length > 0 &&
    alerts.every((alert) =>
      DOCTOR_ADVISORY_ALERTS.some((pattern) => pattern.test(alert)),
    )
  );
}

export function evaluateHealth(
  snapshot: HealthSnapshot,
  config: Partial<ThresholdConfig> = {},
): { status: "healthy" | "degraded" | "critical"; alerts: string[]; notes: string[] } {
  const cfg = { ...DEFAULTS, ...config };
  const alerts: string[] = [];
  const notes: string[] = [];
  let critical = false;
  let degraded = false;

  if (snapshot.kvConnectivity?.status !== "ok") {
    alerts.push("kv_unavailable");
    critical = true;
  }
  if (snapshot.workerProbeStatus !== "ok") {
    alerts.push(
      snapshot.workerProbeStatus === "empty"
        ? "workers_missing"
        : snapshot.workerProbeStatus === "invalid"
          ? "worker_probe_invalid"
          : "worker_probe_failed",
    );
    critical = true;
  }
  if (snapshot.slotBackend?.status !== "ok") {
    alerts.push("slot_backend_unavailable");
    critical = true;
  }
  if (snapshot.searchIndex?.status === "failed") {
    alerts.push("search_index_failed");
    critical = true;
  } else if (snapshot.searchIndex?.status === "partial") {
    const pendingVectors =
      snapshot.searchIndex.keywordEntries - snapshot.searchIndex.vectorEntries;
    const activeCaptures = snapshot.captureAdmission?.active ?? 0;
    const boundedCatchup = Math.max(activeCaptures, 1);
    if (
      pendingVectors > 0 &&
      pendingVectors <= boundedCatchup
    ) {
      notes.push(`search_index_catching_up_${pendingVectors}`);
    } else {
      alerts.push("search_index_partial");
      degraded = true;
    }
  } else if (snapshot.searchIndex?.status === "rebuilding") {
    alerts.push("search_index_rebuilding");
    degraded = true;
  } else if (snapshot.searchIndex?.status === "initializing") {
    alerts.push("search_index_initializing");
    degraded = true;
  }
  if (
    snapshot.expiresAt &&
    Date.parse(snapshot.expiresAt) <= Date.now()
  ) {
    alerts.push("health_snapshot_stale");
    critical = true;
  }

  if (
    snapshot.connectionState === "disconnected" ||
    snapshot.connectionState === "failed"
  ) {
    alerts.push(`connection_${snapshot.connectionState}`);
    critical = true;
  } else if (snapshot.connectionState === "reconnecting") {
    alerts.push("connection_reconnecting");
    degraded = true;
  }

  if (snapshot.eventLoopLagMs > cfg.eventLoopLagCriticalMs) {
    alerts.push(
      `event_loop_lag_critical_${Math.round(snapshot.eventLoopLagMs)}ms`,
    );
    critical = true;
  } else if (snapshot.eventLoopLagMs > cfg.eventLoopLagWarnMs) {
    alerts.push(`event_loop_lag_warn_${Math.round(snapshot.eventLoopLagMs)}ms`);
    degraded = true;
  }

  if (snapshot.cpu.percent > cfg.cpuCriticalPercent) {
    alerts.push(`cpu_critical_${Math.round(snapshot.cpu.percent)}%`);
    critical = true;
  } else if (snapshot.cpu.percent > cfg.cpuWarnPercent) {
    alerts.push(`cpu_warn_${Math.round(snapshot.cpu.percent)}%`);
    degraded = true;
  }

  const memPercent =
    snapshot.memory.heapTotal > 0
      ? (snapshot.memory.heapUsed / snapshot.memory.heapTotal) * 100
      : 0;
  const rss = snapshot.memory.rss ?? 0;
  const external = snapshot.memory.external ?? 0;
  const systemTotal = snapshot.memory.systemTotal ?? 0;
  const rssSystemPercent =
    systemTotal > 0 ? (rss / systemTotal) * 100 : 0;
  const heapAboveFloor = snapshot.memory.heapUsed >= cfg.memoryHeapFloorBytes;
  const rssAboveFloor = rss >= cfg.memoryRssFloorBytes;
  const actionableHeapPressure = heapAboveFloor && rssAboveFloor;
  const memMb = Math.round(rss / (1024 * 1024));
  if (memPercent > cfg.memoryCriticalPercent && actionableHeapPressure) {
    alerts.push(`memory_critical_${Math.round(memPercent)}%_rss${memMb}mb`);
    critical = true;
  } else if (memPercent > cfg.memoryWarnPercent && actionableHeapPressure) {
    alerts.push(`memory_warn_${Math.round(memPercent)}%_rss${memMb}mb`);
    degraded = true;
  } else if (memPercent > cfg.memoryWarnPercent) {
    notes.push(`memory_heap_tight_${Math.round(memPercent)}%_rss${memMb}mb`);
  }
  if (rssSystemPercent > cfg.memoryRssCriticalSystemPercent) {
    alerts.push(`memory_rss_critical_${Math.round(rssSystemPercent)}%`);
    critical = true;
  } else if (rssSystemPercent > cfg.memoryRssWarnSystemPercent) {
    alerts.push(`memory_rss_warn_${Math.round(rssSystemPercent)}%`);
    degraded = true;
  }
  if (external > cfg.memoryExternalCriticalBytes) {
    alerts.push(
      `memory_external_critical_${Math.round(external / (1024 * 1024))}mb`,
    );
    critical = true;
  } else if (external > cfg.memoryExternalWarnBytes) {
    alerts.push(
      `memory_external_warn_${Math.round(external / (1024 * 1024))}mb`,
    );
    degraded = true;
  }

  const admission = snapshot.captureAdmission;
  if (admission) {
    if (admission.limit > 0 && admission.active >= admission.limit) {
      alerts.push("capture_capacity_exhausted");
      critical = true;
    } else if (
      admission.limit > 0 &&
      admission.active / admission.limit >= 0.9
    ) {
      alerts.push("capture_capacity_pressure");
      degraded = true;
    }
    if ((admission.rejectedSinceLastCollection ?? 0) > 0) {
      alerts.push(
        `capture_rejected_${admission.rejectedSinceLastCollection}`,
      );
      degraded = true;
    }
    if ((admission.failedSinceLastCollection ?? 0) > 0) {
      alerts.push(`capture_failed_${admission.failedSinceLastCollection}`);
      degraded = true;
    }
  }

  const status = critical ? "critical" : degraded ? "degraded" : "healthy";
  return { status, alerts, notes };
}
