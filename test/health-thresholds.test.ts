import { describe, expect, it } from "vitest";
import { registerHealthMonitor } from "../src/health/monitor.js";
import {
  evaluateHealth,
  healthStatusExitCode,
} from "../src/health/thresholds.js";
import type { HealthSnapshot } from "../src/types.js";
import { mockKV, mockSdk } from "./helpers/mocks.js";

function snap(over: Partial<HealthSnapshot> = {}): HealthSnapshot {
  const now = Date.now();
  return {
    collectedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 60_000).toISOString(),
    connectionState: "connected",
    workers: [{ id: "worker-1", name: "worker", status: "running" }],
    workerProbeStatus: "ok",
    slotBackend: { status: "ok" },
    memory: {
      heapUsed: 0,
      heapTotal: 1,
      rss: 0,
      external: 0,
      systemTotal: 16 * 1024 * 1024 * 1024,
    },
    cpu: { userMicros: 0, systemMicros: 0, percent: 0 },
    eventLoopLagMs: 0,
    uptimeSeconds: 1,
    kvConnectivity: { status: "ok", latencyMs: 1 },
    status: "healthy",
    alerts: [],
    ...over,
  };
}

describe("evaluateHealth memory severity", () => {
  it("returns a failing automation exit code unless health is explicit", () => {
    expect(healthStatusExitCode("healthy")).toBe(0);
    expect(healthStatusExitCode("degraded")).toBe(1);
    expect(healthStatusExitCode("critical")).toBe(1);
    expect(healthStatusExitCode("unknown")).toBe(1);
    expect(healthStatusExitCode(undefined)).toBe(1);
  });

  it("fails health when KV or worker probing is unavailable", () => {
    expect(
      evaluateHealth(
        snap({ kvConnectivity: { status: "error", error: "synthetic" } }),
      ),
    ).toMatchObject({ status: "critical", alerts: ["kv_unavailable"] });
    expect(
      evaluateHealth(snap({ workerProbeStatus: "error" })),
    ).toMatchObject({ status: "critical", alerts: ["worker_probe_failed"] });
  });

  it.each([
    ["empty", "workers_missing"],
    ["invalid", "worker_probe_invalid"],
  ] as const)("fails closed for a %s worker result", (workerProbeStatus, alert) => {
    expect(
      evaluateHealth(snap({ workers: [], workerProbeStatus })),
    ).toMatchObject({ status: "critical", alerts: [alert] });
  });

  it("fails closed when slots are unavailable or the snapshot expired", () => {
    expect(
      evaluateHealth(
        snap({
          slotBackend: { status: "error", error: "synthetic" },
        }),
      ),
    ).toMatchObject({
      status: "critical",
      alerts: ["slot_backend_unavailable"],
    });

    expect(
      evaluateHealth(
        snap({ expiresAt: new Date(Date.now() - 1).toISOString() }),
      ),
    ).toMatchObject({
      status: "critical",
      alerts: ["health_snapshot_stale"],
    });
  });

  it("stays healthy when heap fills a tiny steady-state process (issue #158)", () => {
    const s = snap({
      memory: {
        heapUsed: 45 * 1024 * 1024,
        heapTotal: 46 * 1024 * 1024,
        rss: 120 * 1024 * 1024,
        external: 0,
      },
    });
    const { status, alerts, notes } = evaluateHealth(s);
    expect(status).toBe("healthy");
    expect(alerts.find((a) => a.startsWith("memory_critical_"))).toBeUndefined();
    expect(alerts.find((a) => a.startsWith("memory_warn_"))).toBeUndefined();
    expect(alerts.find((a) => a.startsWith("memory_heap_tight_"))).toBeUndefined();
    expect(notes.find((n) => n.startsWith("memory_heap_tight_"))).toBeDefined();
  });

  it("goes critical when heap ratio is high AND RSS is above the floor", () => {
    const s = snap({
      memory: {
        heapUsed: 970 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        rss: 1100 * 1024 * 1024,
        external: 0,
      },
    });
    const { status, alerts } = evaluateHealth(s);
    expect(status).toBe("critical");
    expect(alerts.some((a) => a.startsWith("memory_critical_"))).toBe(true);
  });

  it("records heap_tight in the warn band when RSS is below the floor", () => {
    const s = snap({
      memory: {
        heapUsed: 85 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 50 * 1024 * 1024,
        external: 0,
      },
    });
    const { status, alerts, notes } = evaluateHealth(s);
    expect(status).toBe("healthy");
    expect(notes.some((n) => n.startsWith("memory_heap_tight_"))).toBe(true);
    expect(alerts.some((a) => a.startsWith("memory_heap_tight_"))).toBe(false);
    expect(alerts.some((a) => a.startsWith("memory_warn_"))).toBe(false);
    expect(alerts.some((a) => a.startsWith("memory_critical_"))).toBe(false);
  });

  it("goes degraded when heap is above warn AND RSS is above the floor", () => {
    const s = snap({
      memory: {
        heapUsed: 850 * 1024 * 1024,
        heapTotal: 1000 * 1024 * 1024,
        rss: 900 * 1024 * 1024,
        external: 0,
      },
    });
    const { status, alerts } = evaluateHealth(s, { memoryRssFloorBytes: 800 * 1024 * 1024 });
    expect(status).toBe("degraded");
    expect(alerts.some((a) => a.startsWith("memory_warn_"))).toBe(true);
  });

  it("respects caller-supplied memoryRssFloorBytes", () => {
    const s = snap({
      memory: {
        heapUsed: 98,
        heapTotal: 100,
        rss: 50 * 1024 * 1024,
        external: 0,
      },
    });
    const loose = evaluateHealth(s, { memoryRssFloorBytes: 10 * 1024 * 1024 });
    expect(loose.status).toBe("critical");
    const strict = evaluateHealth(s, { memoryRssFloorBytes: 1024 * 1024 * 1024 });
    expect(strict.status).toBe("healthy");
  });

  it("accounts for RSS and external memory even when heap usage is low", () => {
    const rss = evaluateHealth(
      snap({
        memory: {
          heapUsed: 10,
          heapTotal: 100,
          rss: 9 * 1024 * 1024 * 1024,
          external: 0,
          systemTotal: 16 * 1024 * 1024 * 1024,
        },
      }),
    );
    expect(rss.status).toBe("critical");
    expect(
      rss.alerts.some((alert) => alert.startsWith("memory_rss_critical_")),
    ).toBe(true);

    const external = evaluateHealth(
      snap({
        memory: {
          heapUsed: 10,
          heapTotal: 100,
          rss: 100 * 1024 * 1024,
          external: 2 * 1024 * 1024 * 1024,
          systemTotal: 16 * 1024 * 1024 * 1024,
        },
      }),
    );
    expect(external.status).toBe("critical");
    expect(
      external.alerts.some((alert) =>
        alert.startsWith("memory_external_critical_"),
      ),
    ).toBe(true);
  });

  it("reports capture capacity and recent delivery failures", () => {
    const exhausted = evaluateHealth(
      snap({
        captureAdmission: {
          active: 10,
          limit: 10,
          rejected: 1,
          rejectedSinceLastCollection: 1,
          failedSinceLastCollection: 2,
        },
      }),
    );
    expect(exhausted.status).toBe("critical");
    expect(exhausted.alerts).toEqual(
      expect.arrayContaining([
        "capture_capacity_exhausted",
        "capture_rejected_1",
        "capture_failed_2",
      ]),
    );
  });
});

describe("health dependency probing", () => {
  it.each([
    [{ workers: [] }, "workers_missing"],
    [{ workers: "not-an-array" }, "worker_probe_invalid"],
  ])("fails closed for malformed engine worker output", async (result, alert) => {
    const sdk = mockSdk();
    const kv = mockKV();
    sdk.registerFunction("engine::workers::list", async () => result);
    const monitor = registerHealthMonitor(sdk as never, kv as never);
    try {
      const snapshot = await monitor.collectNow();
      expect(snapshot.status).toBe("critical");
      expect(snapshot.alerts).toContain(alert);
    } finally {
      monitor.stop();
    }
  });

  it("fails closed when the slot backend cannot be listed", async () => {
    const sdk = mockSdk();
    sdk.registerFunction("engine::workers::list", async () => ({
      workers: [{ id: "worker-1", name: "worker", status: "running" }],
    }));
    const base = mockKV();
    const kv = {
      ...base,
      list: async () => {
        throw new Error("synthetic slot failure");
      },
    };
    const monitor = registerHealthMonitor(sdk as never, kv as never);
    try {
      const snapshot = await monitor.collectNow();
      expect(snapshot.status).toBe("critical");
      expect(snapshot.alerts).toContain("slot_backend_unavailable");
    } finally {
      monitor.stop();
    }
  });
});
