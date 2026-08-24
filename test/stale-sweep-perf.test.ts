import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KV } from "../src/state/schema.js";
import type { Session } from "../src/types.js";
import {
  closeStaleSessions,
  maybeCloseStaleSessions,
  resetStaleSessionSweepForTests,
  staleSessionSweepIntervalMs,
} from "../src/functions/session-lifecycle.js";
import {
  getBackgroundPipelineHealth,
  recordBackgroundPipelineFailed,
  recordBackgroundPipelineAccepted,
  recordBackgroundPipelineStarted,
  restoreBackgroundPipelineFailure,
  resetBackgroundPipelineHealthForTests,
} from "../src/health/background-pipeline.js";

function makeKv() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, value: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, value);
      return value;
    },
    update: async () => undefined,
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> =>
      Array.from(store.get(scope)?.values() ?? []) as T[],
    store,
  };
}

function staleSession(id: string, ageMs: number): Session {
  const now = Date.now();
  return {
    id,
    project: "github.com/example/project",
    cwd: "/tmp",
    startedAt: new Date(now - ageMs).toISOString(),
    updatedAt: new Date(now - ageMs).toISOString(),
    status: "active",
    observationCount: 0,
  } as Session;
}

describe("stale-session sweep throttle", () => {
  const ORIGINAL_ENV = process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"];

  beforeEach(() => {
    resetStaleSessionSweepForTests();
    delete process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"];
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"];
    } else {
      process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = ORIGINAL_ENV;
    }
    resetStaleSessionSweepForTests();
  });

  it("defaults to a 60s interval", () => {
    expect(staleSessionSweepIntervalMs()).toBe(60_000);
  });

  it("honours AGENTMEMORY_STALE_SESSION_SWEEP_MS including 0", () => {
    process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = "5000";
    expect(staleSessionSweepIntervalMs()).toBe(5000);
    process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = "0";
    expect(staleSessionSweepIntervalMs()).toBe(0);
    process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = "bogus";
    expect(staleSessionSweepIntervalMs()).toBe(60_000);
    process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = "-3";
    expect(staleSessionSweepIntervalMs()).toBe(60_000);
  });

  it("runs at most once per interval per process", async () => {
    process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"] = "60000";
    const kv = makeKv();
    await kv.set(KV.sessions, "ses-stale", staleSession("ses-stale", 48 * 3600 * 1000));

    const t0 = new Date();
    await expect(maybeCloseStaleSessions(kv, t0)).resolves.toBe(true);
    expect(
      ((await kv.get<Session>(KV.sessions, "ses-stale")) as Session).status,
    ).toBe("abandoned");

    // Inside the window: no scan, no state change even with fresh stale data.
    await kv.set(KV.sessions, "ses-stale-2", staleSession("ses-stale-2", 48 * 3600 * 1000));
    await expect(
      maybeCloseStaleSessions(kv, new Date(t0.getTime() + 30_000)),
    ).resolves.toBe(false);
    expect(
      ((await kv.get<Session>(KV.sessions, "ses-stale-2")) as Session).status,
    ).toBe("active");

    // Past the window: the sweep runs again and closes it.
    await expect(
      maybeCloseStaleSessions(kv, new Date(t0.getTime() + 61_000)),
    ).resolves.toBe(true);
    expect(
      ((await kv.get<Session>(KV.sessions, "ses-stale-2")) as Session).status,
    ).toBe("abandoned");
  });

  it("closeStaleSessions itself stays unthrottled for end-path correctness", async () => {
    const kv = makeKv();
    await kv.set(KV.sessions, "ses-a", staleSession("ses-a", 25 * 3600 * 1000));
    await expect(closeStaleSessions(kv)).resolves.toBe(1);
    await expect(closeStaleSessions(kv)).resolves.toBe(0);
  });
});

describe("background pipeline failedRuns cap", () => {
  beforeEach(() => {
    resetBackgroundPipelineHealthForTests();
  });

  afterEach(() => {
    resetBackgroundPipelineHealthForTests();
  });

  function failRun(index: number): void {
    const runId = `run-${index}`;
    recordBackgroundPipelineAccepted({
      runId,
      sessionId: `ses-${index}`,
      project: "github.com/example/project",
    });
    recordBackgroundPipelineStarted({ runId, sessionId: `ses-${index}`, project: "github.com/example/project" });
    recordBackgroundPipelineFailed({
      runId,
      sessionId: `ses-${index}`,
      project: "github.com/example/project",
      stage: "summary",
      error: new Error(`boom-${index}`),
    });
  }

  it("caps unresolved failures at 100, dropping the oldest", () => {
    for (let i = 0; i < 130; i++) failRun(i);

    const health = getBackgroundPipelineHealth();
    expect(health.unresolvedFailed).toBe(100);
    // Oldest entries (run-0..29) were evicted; the most recent survive.
    expect(health.failedProjects.length).toBeLessThanOrEqual(100);
  });

  it("keeps the newest failure visible after eviction", () => {
    for (let i = 0; i < 101; i++) failRun(i);
    const health = getBackgroundPipelineHealth();
    expect(health.lastFailureRunId).toBe("run-100");
    expect(health.unresolvedFailed).toBe(100);
  });

  it("restore path respects the same cap", () => {
    for (let i = 0; i < 120; i++) {
      restoreBackgroundPipelineFailure({
        runId: `restored-${i}`,
        sessionId: `ses-${i}`,
        project: "github.com/example/project",
        stage: "dispatch",
        errorCode: "RESTORED",
      });
    }
    expect(getBackgroundPipelineHealth().unresolvedFailed).toBe(100);
  });
});
