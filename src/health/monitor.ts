import type { ISdk } from "iii-sdk";
import { randomUUID } from "node:crypto";
import { totalmem } from "node:os";
import type { HealthSnapshot } from "../types.js";
import type { StateKV } from "../state/kv.js";
import { KV } from "../state/schema.js";
import { evaluateHealth } from "./thresholds.js";
import { getCaptureAdmissionMetrics } from "../functions/observe.js";
import { logger } from "../logger.js";

const HEALTH_INTERVAL_MS = 30_000;
const HEALTH_TTL_MS = HEALTH_INTERVAL_MS * 3;
const PROBE_TIMEOUT_MS = 5_000;
let latestInMemoryHealth: HealthSnapshot | null = null;

function criticalCollectionSnapshot(error: string): HealthSnapshot {
  const now = Date.now();
  const mem = process.memoryUsage();
  return {
    collectedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + HEALTH_TTL_MS).toISOString(),
    connectionState: "failed",
    workers: [],
    workerProbeStatus: "error",
    slotBackend: { status: "error", error },
    memory: {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
      systemTotal: totalmem(),
    },
    cpu: { userMicros: 0, systemMicros: 0, percent: 0 },
    eventLoopLagMs: 0,
    uptimeSeconds: process.uptime(),
    kvConnectivity: { status: "error", error },
    captureAdmission: getCaptureAdmissionMetrics(),
    status: "critical",
    alerts: ["health_collection_failed"],
  };
}

export function registerHealthMonitor(
  sdk: ISdk,
  kv: StateKV,
  options: { collectImmediately?: boolean } = {},
): { stop: () => void; collectNow: () => Promise<HealthSnapshot> } {
  let connectionState = "connected";
  let prevCpuUsage = process.cpuUsage();
  let prevCpuTime = Date.now();
  let healthyStreak = 0;
  let recovering = false;
  let previousRejected = 0;
  let previousFailed = 0;

  const eventSdk = sdk as ISdk & {
    on?: (event: string, listener: (state?: unknown) => void) => void;
  };
  if (typeof eventSdk.on === "function") {
    eventSdk.on("connection_state", (state?: unknown) => {
      connectionState = state as string;
    });
  }

  async function collectHealth(): Promise<HealthSnapshot> {
    const mem = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    const now = Date.now();
    const uptime = process.uptime();

    const elapsedMs = now - prevCpuTime;
    const userDelta = currentCpu.user - prevCpuUsage.user;
    const systemDelta = currentCpu.system - prevCpuUsage.system;
    const cpuPercent =
      elapsedMs > 0 ? ((userDelta + systemDelta) / 1000 / elapsedMs) * 100 : 0;
    prevCpuUsage = currentCpu;
    prevCpuTime = now;

    const startMark = performance.now();
    await new Promise((resolve) => setImmediate(resolve));
    const eventLoopLagMs = performance.now() - startMark;

    let workers: HealthSnapshot["workers"] = [];
    let workerProbeStatus: HealthSnapshot["workerProbeStatus"] = "ok";
    try {
      const result = await sdk.trigger<
        unknown,
        { workers?: HealthSnapshot["workers"] }
      >({ function_id: "engine::workers::list", payload: {} });
      if (!Array.isArray(result?.workers)) {
        workerProbeStatus = "invalid";
      } else if (result.workers.length === 0) {
        workerProbeStatus = "empty";
      } else {
        workers = result.workers;
      }
    } catch {
      workerProbeStatus = "error";
    }

    let kvConnectivity: { status: string; latencyMs?: number; error?: string };
    const kvStart = performance.now();
    try {
      const probe = { ts: Date.now(), nonce: randomUUID() };
      await Promise.race([
        (async () => {
          await kv.set(KV.health, "_probe", probe);
          const readBack = await kv.get<typeof probe>(KV.health, "_probe");
          if (
            readBack?.ts !== probe.ts ||
            readBack?.nonce !== probe.nonce
          ) {
            throw new Error("kv_probe_mismatch");
          }
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS),
        ),
      ]);
      kvConnectivity = { status: "ok", latencyMs: Math.round((performance.now() - kvStart) * 100) / 100 };
    } catch {
      kvConnectivity = { status: "error", error: "kv_probe_failed", latencyMs: Math.round((performance.now() - kvStart) * 100) / 100 };
    }

    let slotBackend: HealthSnapshot["slotBackend"] = { status: "ok" };
    try {
      const slots = await Promise.race([
        kv.list(KV.globalSlots),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), PROBE_TIMEOUT_MS),
        ),
      ]);
      if (!Array.isArray(slots)) throw new Error("slot_probe_invalid");
    } catch {
      slotBackend = { status: "error", error: "slot_probe_failed" };
    }

    const admission = getCaptureAdmissionMetrics();
    const rejectedSinceLastCollection = Math.max(
      0,
      admission.rejected - previousRejected,
    );
    const failedSinceLastCollection = Math.max(
      0,
      admission.failed - previousFailed,
    );
    previousRejected = admission.rejected;
    previousFailed = admission.failed;
    const collectedAt = new Date(now).toISOString();
    const snapshot: HealthSnapshot = {
      collectedAt,
      expiresAt: new Date(now + HEALTH_TTL_MS).toISOString(),
      connectionState,
      workers,
      workerProbeStatus,
      slotBackend,
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
        systemTotal: totalmem(),
      },
      cpu: {
        userMicros: currentCpu.user,
        systemMicros: currentCpu.system,
        percent: Math.round(cpuPercent * 100) / 100,
      },
      eventLoopLagMs,
      uptimeSeconds: uptime,
      kvConnectivity,
      captureAdmission: {
        ...admission,
        failedSinceLastCollection,
        rejectedSinceLastCollection,
      },
      status: "healthy",
      alerts: [],
    };

    const evaluated = evaluateHealth(snapshot);
    if (evaluated.status === "healthy") {
      healthyStreak += 1;
      if (recovering && healthyStreak < 3) {
        snapshot.status = "degraded";
        snapshot.alerts = ["recovery_window"];
      } else {
        snapshot.status = "healthy";
        snapshot.alerts = evaluated.alerts;
        recovering = false;
      }
    } else {
      healthyStreak = 0;
      recovering = true;
      snapshot.status = evaluated.status;
      snapshot.alerts = evaluated.alerts;
    }
    snapshot.notes = evaluated.notes;

    try {
      await kv.set(KV.health, "latest", snapshot);
    } catch (error) {
      snapshot.status = "critical";
      snapshot.alerts = Array.from(
        new Set([...snapshot.alerts, "health_snapshot_persist_failed"]),
      );
      logger.error("Failed to persist health snapshot", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    latestInMemoryHealth = snapshot;
    return snapshot;
  }

  const recordCollectionFailure = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error);
    latestInMemoryHealth = criticalCollectionSnapshot(message);
    logger.error("Health collection failed", { error: message });
  };
  if (options.collectImmediately !== false) {
    collectHealth().catch(recordCollectionFailure);
  }
  const interval = setInterval(() => {
    collectHealth().catch(recordCollectionFailure);
  }, HEALTH_INTERVAL_MS);
  interval.unref();

  return {
    stop: () => clearInterval(interval),
    collectNow: collectHealth,
  };
}

export async function getLatestHealth(
  kv: StateKV,
): Promise<HealthSnapshot | null> {
  let stored: HealthSnapshot | null = null;
  try {
    stored = await kv.get<HealthSnapshot>(KV.health, "latest");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallback =
      latestInMemoryHealth ?? criticalCollectionSnapshot(message);
    return {
      ...fallback,
      status: "critical",
      alerts: Array.from(
        new Set([...fallback.alerts, "health_snapshot_read_failed"]),
      ),
    };
  }
  const candidates = [stored, latestInMemoryHealth].filter(
    (value): value is HealthSnapshot => value != null,
  );
  if (candidates.length === 0) return null;
  const latest = candidates.sort(
    (a, b) =>
      Date.parse(b.collectedAt ?? "") - Date.parse(a.collectedAt ?? ""),
  )[0]!;
  if (
    !latest.expiresAt ||
    !Number.isFinite(Date.parse(latest.expiresAt)) ||
    Date.parse(latest.expiresAt) <= Date.now()
  ) {
    return {
      ...latest,
      status: "critical",
      alerts: Array.from(
        new Set([...latest.alerts, "health_snapshot_stale"]),
      ),
    };
  }
  return latest;
}
