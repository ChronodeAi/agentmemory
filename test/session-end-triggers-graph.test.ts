import { beforeEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { registerApiTriggers } from "../src/triggers/api.js";
import {
  dispatchSessionStopped,
  reconcileBackgroundPipelines,
  registerEventTriggers,
} from "../src/triggers/events.js";
import {
  getBackgroundPipelineHealth,
  resetBackgroundPipelineHealthForTests,
} from "../src/health/background-pipeline.js";

type Handler = (data: Record<string, unknown>) => Promise<Record<string, unknown>>;

function createLifecycleSurfaces(
  trigger: (request: {
    function_id: string;
    payload?: Record<string, unknown>;
  }) => unknown,
) {
  const functions = new Map<string, Handler>();
  const sessions = new Map<string, Record<string, unknown>>();
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Handler,
    ) => {
      functions.set(
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id,
        handler,
      );
    },
    registerTrigger: () => {},
    trigger,
  };
  const kv = {
    get: async <T>(_scope: string, key: string): Promise<T | null> =>
      (sessions.get(key) as T) ?? null,
    set: async <T>(_scope: string, key: string, value: T): Promise<T> => {
      sessions.set(key, value as Record<string, unknown>);
      return value;
    },
    update: async (
      _scope: string,
      key: string,
      operations: Array<{ path: string; value: unknown }>,
    ) => {
      const current = sessions.get(key) ?? {};
      for (const operation of operations) current[operation.path] = operation.value;
      sessions.set(key, current);
      return current;
    },
    list: async <T>() => Array.from(sessions.values()) as T[],
    delete: async () => undefined,
  };
  return { functions, sessions, sdk, kv };
}

// #666: api::session::end must publish the session-stopped lifecycle so
// summarize + slot-reflect + graph extraction actually fire. Before this
// fix the `event::session::stopped` handler in events.ts was a dead
// subscriber — no code published `agentmemory.session.stopped`, so graph
// nodes / lessons / crystals never materialized despite the handler
// existing. Direct fire-and-forget trigger keeps the HTTP response fast
// (kv.update runs synchronously, downstream pipeline fan-outs without
// blocking).
describe("api::session::end → event::session::stopped (#666)", () => {
  beforeEach(() => {
    process.env["AGENTMEMORY_REFLECT"] = "false";
    process.env["GRAPH_EXTRACTION_ENABLED"] = "false";
    resetBackgroundPipelineHealthForTests();
  });

  it("closes quickly, records dispatch acceptance, and is idempotent", async () => {
    const calls: Array<{ function_id: string; payload?: Record<string, unknown> }> = [];
    const pending = new Promise(() => undefined);
    const surfaces = createLifecycleSurfaces((request) => {
      calls.push(request);
      return pending;
    });
    surfaces.sessions.set("session-1", {
      id: "session-1",
      project: "github.com/example/project",
      cwd: "/tmp/project",
      status: "active",
      startedAt: new Date().toISOString(),
      observationCount: 1,
      backgroundPipelineStartedAt: "2026-01-01T00:00:01.000Z",
      backgroundPipelineFinishedAt: "2026-01-01T00:00:02.000Z",
      backgroundPipelineErrorCode: "STALE",
      backgroundPipelineSummaryStatus: "succeeded",
      backgroundPipelinePromotionStatus: "failed",
    });
    registerApiTriggers(surfaces.sdk as never, surfaces.kv as never);
    const handler = surfaces.functions.get("api::session::end")!;

    const first = await handler({
      body: {
        sessionId: "session-1",
        project: "github.com/example/project",
      },
    });
    expect(first).toMatchObject({
      status_code: 200,
      body: { success: true, pipelineAccepted: true },
    });
    const runId = (first.body as Record<string, unknown>)["pipelineRunId"];
    expect(runId).toEqual(expect.any(String));
    expect(calls).toEqual([
      expect.objectContaining({
        function_id: "event::session::stopped",
        payload: {
          sessionId: "session-1",
          project: "github.com/example/project",
          pipelineRunId: runId,
        },
      }),
    ]);
    expect(getBackgroundPipelineHealth()).toMatchObject({
      status: "active",
      accepted: 1,
      activeAccepted: 1,
      lastRunId: runId,
    });
    expect(surfaces.sessions.get("session-1")).toMatchObject({
      backgroundPipelineRunId: runId,
      backgroundPipelineStatus: "accepted",
      backgroundPipelineStage: "dispatch",
      backgroundPipelineAttempts: 1,
      backgroundPipelineStartedAt: null,
      backgroundPipelineFinishedAt: null,
      backgroundPipelineErrorCode: null,
      backgroundPipelineSummaryStatus: null,
      backgroundPipelinePromotionStatus: null,
    });

    const duplicate = await handler({
      body: {
        sessionId: "session-1",
        project: "github.com/example/project",
      },
    });
    expect(duplicate).toMatchObject({
      status_code: 200,
      body: { success: true, alreadyClosed: true, pipelineRunId: runId },
    });
    expect(calls).toHaveLength(1);
    expect(getBackgroundPipelineHealth().accepted).toBe(1);
  });

  it("serializes concurrent session-end requests into one pipeline run", async () => {
    const calls: Array<{ function_id: string; payload?: Record<string, unknown> }> = [];
    const pending = new Promise(() => undefined);
    const surfaces = createLifecycleSurfaces((request) => {
      calls.push(request);
      return pending;
    });
    surfaces.sessions.set("session-concurrent", {
      id: "session-concurrent",
      project: "github.com/example/project",
      cwd: "/tmp/project",
      status: "active",
      startedAt: new Date().toISOString(),
      observationCount: 1,
    });
    registerApiTriggers(surfaces.sdk as never, surfaces.kv as never);
    const handler = surfaces.functions.get("api::session::end")!;
    const request = {
      body: {
        sessionId: "session-concurrent",
        project: "github.com/example/project",
      },
    };

    const [first, second] = await Promise.all([
      handler(request),
      handler(request),
    ]);
    const firstRunId = (first.body as Record<string, unknown>)["pipelineRunId"];
    const secondRunId = (second.body as Record<string, unknown>)["pipelineRunId"];
    expect(firstRunId).toEqual(expect.any(String));
    expect(secondRunId).toBe(firstRunId);
    expect(calls).toHaveLength(1);
    expect(getBackgroundPipelineHealth()).toMatchObject({
      accepted: 1,
      activeAccepted: 1,
    });
  });

  it("returns a retryable failure when dispatch is immediately rejected", async () => {
    const surfaces = createLifecycleSurfaces((request) => {
      if (request.function_id === "event::session::stopped") {
        return Promise.reject(new Error("dispatch unavailable"));
      }
      return { success: true };
    });
    surfaces.sessions.set("session-dispatch-rejected", {
      id: "session-dispatch-rejected",
      project: "github.com/example/project",
      cwd: "/tmp/project",
      status: "active",
      startedAt: new Date().toISOString(),
      observationCount: 1,
    });
    registerApiTriggers(surfaces.sdk as never, surfaces.kv as never);

    const response = await surfaces.functions.get("api::session::end")!({
      body: {
        sessionId: "session-dispatch-rejected",
        project: "github.com/example/project",
      },
    });

    expect(response).toMatchObject({
      status_code: 503,
      body: {
        success: false,
        pipelineAccepted: false,
        retryable: true,
      },
    });
    expect(surfaces.sessions.get("session-dispatch-rejected")).toMatchObject({
      status: "completed",
      backgroundPipelineStatus: "failed",
      backgroundPipelineAttempts: 1,
    });
  });

  it("serializes duplicate stopped-session workers and settles one run", async () => {
    const calls: string[] = [];
    const surfaces = createLifecycleSurfaces(async (request) => {
      calls.push(request.function_id);
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      return request.function_id === "mem::promotion-generate"
        ? { success: true, candidates: [], promoted: 0 }
        : { success: true, summary: "bounded" };
    });
    surfaces.sessions.set("session-worker-race", {
      id: "session-worker-race",
      project: "github.com/example/project",
      backgroundPipelineRunId: "pipeline-worker-race",
      backgroundPipelineStatus: "accepted",
      backgroundPipelineAttempts: 0,
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);
    const handler = surfaces.functions.get("event::session::stopped")!;
    const payload = {
      sessionId: "session-worker-race",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-worker-race",
    };

    const [first, second] = await Promise.all([
      handler(payload),
      handler(payload),
    ]);
    expect(first).toMatchObject({ success: true });
    expect(second).toMatchObject({
      success: true,
      alreadyProcessed: true,
    });
    expect(calls).toEqual(["mem::summarize", "mem::promotion-generate"]);
    expect(getBackgroundPipelineHealth()).toMatchObject({
      accepted: 1,
      started: 1,
      succeeded: 1,
      activeAccepted: 0,
      activeRunning: 0,
    });
  });

  it("records summary and promotion success", async () => {
    const calls: string[] = [];
    const surfaces = createLifecycleSurfaces(async (request) => {
      calls.push(request.function_id);
      if (request.function_id === "mem::summarize") {
        return { success: true, summary: "bounded" };
      }
      if (request.function_id === "mem::promotion-generate") {
        return { success: true, candidates: [{ id: "candidate-1" }], promoted: 1 };
      }
      return { success: true };
    });
    surfaces.sessions.set("session-1", {
      id: "session-1",
      project: "github.com/example/project",
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    const result = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-1",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-1",
    });
    expect(result).toMatchObject({ success: true, pipelineRunId: "pipeline-1" });
    expect(calls.slice(0, 2)).toEqual(["mem::summarize", "mem::promotion-generate"]);
    expect(getBackgroundPipelineHealth()).toMatchObject({
      status: "succeeded",
      accepted: 1,
      started: 1,
      succeeded: 1,
      failed: 0,
      candidates: 1,
      promoted: 1,
      lastOutcome: "succeeded",
    });
  });

  it("surfaces structured promotion persistence failure", async () => {
    const calls: string[] = [];
    let failPromotion = true;
    const surfaces = createLifecycleSurfaces(async (request) => {
      calls.push(request.function_id);
      if (request.function_id === "mem::summarize") return { success: true };
      if (request.function_id === "mem::promotion-generate") {
        return failPromotion
          ? {
              success: false,
              error: { code: "PROMOTION_PERSISTENCE_FAILED" },
              candidates: [{ id: "candidate-1" }],
              promoted: 0,
            }
          : { success: true, candidates: [], promoted: 0 };
      }
      return { success: true };
    });
    surfaces.sessions.set("session-1", {
      id: "session-1",
      project: "github.com/example/project",
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    const result = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-1",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-2",
    });
    expect(result).toMatchObject({
      success: false,
      error: "promotion_failed",
      pipelineRunId: "pipeline-2",
    });
    expect(getBackgroundPipelineHealth()).toMatchObject({
      status: "failed",
      failed: 1,
      lastStage: "promotion",
      lastErrorCode: "PROMOTION_PERSISTENCE_FAILED",
    });
    expect(surfaces.sessions.get("session-1")).toMatchObject({
      backgroundPipelineStatus: "failed",
      backgroundPipelineStage: "promotion",
      backgroundPipelineSummaryStatus: "succeeded",
      backgroundPipelinePromotionStatus: "failed",
    });

    failPromotion = false;
    const retry = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-1",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-2",
    });
    expect(retry).toMatchObject({ success: true, pipelineRunId: "pipeline-2" });
    expect(calls).toEqual([
      "mem::summarize",
      "mem::promotion-generate",
      "mem::promotion-generate",
    ]);
    expect(surfaces.sessions.get("session-1")).toMatchObject({
      backgroundPipelineStatus: "succeeded",
      backgroundPipelineAttempts: 2,
      backgroundPipelineSummaryStatus: "succeeded",
      backgroundPipelinePromotionStatus: "succeeded",
    });
  });

  it("still evaluates promotion when summary throws", async () => {
    const calls: string[] = [];
    let failSummary = true;
    const surfaces = createLifecycleSurfaces(async (request) => {
      calls.push(request.function_id);
      if (request.function_id === "mem::summarize" && failSummary) {
        throw Object.assign(new Error("state::set timed out"), { code: "TIMEOUT" });
      }
      return { success: true };
    });
    surfaces.sessions.set("session-1", {
      id: "session-1",
      project: "github.com/example/project",
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    const result = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-1",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-3",
    });
    expect(result).toMatchObject({ success: false, error: "summary_failed" });
    expect(calls).toContain("mem::promotion-generate");
    expect(getBackgroundPipelineHealth()).toMatchObject({
      status: "failed",
      lastStage: "summary",
      lastErrorCode: "TIMEOUT",
    });
    expect(surfaces.sessions.get("session-1")).toMatchObject({
      backgroundPipelineStatus: "failed",
      backgroundPipelineStage: "summary",
      backgroundPipelineSummaryStatus: "failed",
      backgroundPipelinePromotionStatus: "succeeded",
    });

    failSummary = false;
    const retry = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-1",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-3",
    });
    expect(retry).toMatchObject({ success: true, pipelineRunId: "pipeline-3" });
    expect(calls).toEqual([
      "mem::summarize",
      "mem::promotion-generate",
      "mem::summarize",
    ]);
    expect(surfaces.sessions.get("session-1")).toMatchObject({
      backgroundPipelineStatus: "succeeded",
      backgroundPipelineAttempts: 2,
      backgroundPipelineSummaryStatus: "succeeded",
      backgroundPipelinePromotionStatus: "succeeded",
    });
  });

  it("treats expected summary unavailability as a skip and still promotes", async () => {
    const calls: string[] = [];
    const surfaces = createLifecycleSurfaces(async (request) => {
      calls.push(request.function_id);
      if (request.function_id === "mem::summarize") {
        return { success: false, error: "no_observations" };
      }
      if (request.function_id === "mem::promotion-generate") {
        return { success: true, candidates: [], promoted: 0 };
      }
      return { success: true };
    });
    surfaces.sessions.set("session-empty", {
      id: "session-empty",
      project: "github.com/example/project",
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    const result = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-empty",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-empty",
    });
    expect(result).toMatchObject({
      success: true,
      summarySkipped: "no_observations",
    });
    expect(calls.slice(0, 2)).toEqual([
      "mem::summarize",
      "mem::promotion-generate",
    ]);
    expect(surfaces.sessions.get("session-empty")).toMatchObject({
      backgroundPipelineStatus: "succeeded",
      backgroundPipelineSummaryStatus: "skipped",
      backgroundPipelinePromotionStatus: "succeeded",
    });
  });

  it("replays durable interrupted work and preserves exhausted failures", async () => {
    const calls: Array<{ function_id: string; payload?: Record<string, unknown> }> = [];
    const pending = new Promise(() => undefined);
    const surfaces = createLifecycleSurfaces((request) => {
      calls.push(request);
      return pending;
    });
    surfaces.sessions.set("interrupted", {
      id: "interrupted",
      project: "github.com/example/project",
      cwd: "/tmp/project",
      status: "completed",
      startedAt: new Date().toISOString(),
      observationCount: 1,
      backgroundPipelineRunId: "pipeline-interrupted",
      backgroundPipelineStatus: "running",
      backgroundPipelineStage: "summary",
      backgroundPipelineAttempts: 1,
    });
    surfaces.sessions.set("exhausted", {
      id: "exhausted",
      project: "github.com/example/other",
      cwd: "/tmp/other",
      status: "completed",
      startedAt: new Date().toISOString(),
      observationCount: 1,
      backgroundPipelineRunId: "pipeline-exhausted",
      backgroundPipelineStatus: "failed",
      backgroundPipelineStage: "promotion",
      backgroundPipelineAttempts: 3,
      backgroundPipelineErrorCode: "PROMOTION_PERSISTENCE_FAILED",
    });
    surfaces.sessions.set("accepted-exhausted", {
      id: "accepted-exhausted",
      project: "github.com/example/accepted",
      status: "completed",
      backgroundPipelineRunId: "pipeline-accepted-exhausted",
      backgroundPipelineStatus: "accepted",
      backgroundPipelineStage: "dispatch",
      backgroundPipelineAttempts: 3,
    });
    surfaces.sessions.set("running-exhausted", {
      id: "running-exhausted",
      project: "github.com/example/running",
      status: "completed",
      backgroundPipelineRunId: "pipeline-running-exhausted",
      backgroundPipelineStatus: "running",
      backgroundPipelineStage: "summary",
      backgroundPipelineAttempts: 3,
    });

    const result = await reconcileBackgroundPipelines(
      surfaces.sdk as never,
      surfaces.kv as never,
    );
    expect(result).toEqual({ replayed: 1, exhausted: 3 });
    expect(calls).toEqual([
      expect.objectContaining({
        function_id: "event::session::stopped",
        payload: expect.objectContaining({
          sessionId: "interrupted",
          pipelineRunId: "pipeline-interrupted",
        }),
      }),
    ]);
    expect(surfaces.sessions.get("interrupted")).toMatchObject({
      backgroundPipelineStatus: "accepted",
      backgroundPipelineStage: "summary",
    });
    expect(getBackgroundPipelineHealth()).toMatchObject({
      activeAccepted: 1,
      unresolvedFailed: 3,
    });
    expect(surfaces.sessions.get("accepted-exhausted")).toMatchObject({
      backgroundPipelineStatus: "failed",
      backgroundPipelineErrorCode: "BACKGROUND_PIPELINE_RETRY_EXHAUSTED",
    });
    expect(surfaces.sessions.get("running-exhausted")).toMatchObject({
      backgroundPipelineStatus: "failed",
      backgroundPipelineErrorCode: "BACKGROUND_PIPELINE_RETRY_EXHAUSTED",
    });
  });

  it("does not let a late dispatch rejection overwrite terminal success", async () => {
    let rejectDispatch!: (error: Error) => void;
    const dispatch = new Promise<never>((_resolve, reject) => {
      rejectDispatch = reject;
    });
    const surfaces = createLifecycleSurfaces((request) => {
      if (request.function_id === "event::session::stopped") return dispatch;
      if (request.function_id === "mem::promotion-generate") {
        return { success: true, candidates: [], promoted: 0 };
      }
      return { success: true, summary: "bounded" };
    });
    surfaces.sessions.set("session-late-dispatch", {
      id: "session-late-dispatch",
      project: "github.com/example/project",
      backgroundPipelineRunId: "pipeline-late-dispatch",
      backgroundPipelineStatus: "accepted",
      backgroundPipelineAttempts: 0,
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    expect(await dispatchSessionStopped(
      surfaces.sdk as never,
      surfaces.kv as never,
      {
        sessionId: "session-late-dispatch",
        project: "github.com/example/project",
        pipelineRunId: "pipeline-late-dispatch",
      },
    )).toBe(true);
    expect(await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-late-dispatch",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-late-dispatch",
    })).toMatchObject({ success: true });

    rejectDispatch(new Error("late dispatch rejection"));
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(surfaces.sessions.get("session-late-dispatch")).toMatchObject({
      backgroundPipelineStatus: "succeeded",
      backgroundPipelineErrorCode: null,
    });
    expect(getBackgroundPipelineHealth()).toMatchObject({
      succeeded: 1,
      failed: 0,
    });
  });

  it("bounds repeated dispatch rejection at three attempts", async () => {
    const surfaces = createLifecycleSurfaces((request) => {
      if (request.function_id === "event::session::stopped") {
        return Promise.reject(new Error("dispatch unavailable"));
      }
      return { success: true };
    });
    surfaces.sessions.set("session-dispatch-exhausted", {
      id: "session-dispatch-exhausted",
      project: "github.com/example/project",
      backgroundPipelineRunId: "pipeline-dispatch-exhausted",
      backgroundPipelineStatus: "accepted",
      backgroundPipelineAttempts: 0,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(
        await dispatchSessionStopped(
          surfaces.sdk as never,
          surfaces.kv as never,
          {
            sessionId: "session-dispatch-exhausted",
            project: "github.com/example/project",
            pipelineRunId: "pipeline-dispatch-exhausted",
          },
        ),
      ).toBe(false);
    }
    expect(
      await dispatchSessionStopped(
        surfaces.sdk as never,
        surfaces.kv as never,
        {
          sessionId: "session-dispatch-exhausted",
          project: "github.com/example/project",
          pipelineRunId: "pipeline-dispatch-exhausted",
        },
      ),
    ).toBe(false);
    expect(surfaces.sessions.get("session-dispatch-exhausted")).toMatchObject({
      backgroundPipelineStatus: "failed",
      backgroundPipelineAttempts: 3,
    });
  });

  it("treats an exhausted durable redelivery as terminal", async () => {
    const calls: string[] = [];
    const surfaces = createLifecycleSurfaces((request) => {
      calls.push(request.function_id);
      return { success: true };
    });
    surfaces.sessions.set("session-terminal-redelivery", {
      id: "session-terminal-redelivery",
      project: "github.com/example/project",
      backgroundPipelineRunId: "pipeline-terminal-redelivery",
      backgroundPipelineStatus: "failed",
      backgroundPipelineAttempts: 3,
    });
    registerEventTriggers(surfaces.sdk as never, surfaces.kv as never);

    const result = await surfaces.functions.get("event::session::stopped")!({
      sessionId: "session-terminal-redelivery",
      project: "github.com/example/project",
      pipelineRunId: "pipeline-terminal-redelivery",
    });
    expect(result).toMatchObject({
      success: false,
      terminal: true,
      error: "background_pipeline_retry_exhausted",
    });
    expect(calls).toEqual([]);
  });

  it("automatic graph extraction honors strict session privacy", () => {
    const events = readFileSync("src/triggers/events.ts", "utf-8");
    expect(events).toMatch(/session\.privacy !== "strict"/);
    expect(events).toMatch(/session\.externalProcessing !== false/);
    expect(events).toMatch(/AGENTMEMORY_LOCAL_PROCESSING/);
  });
});

// #666: viewer's "Build Graph" button used to POST /agentmemory/graph/build
// which returned 404 because the endpoint was never registered. Backfill
// the knowledge graph from existing compressed observations across every
// session in batches.
describe("api::graph-build endpoint (#666)", () => {
  const api = readFileSync("src/triggers/api.ts", "utf-8");

  it("registers api::graph-build function", () => {
    expect(api).toMatch(/registerFunction\("api::graph-build"/);
  });

  it("registers HTTP trigger at /agentmemory/graph/build", () => {
    expect(api).toMatch(
      /api_path:\s*"\/agentmemory\/graph\/build",\s*http_method:\s*"POST"/,
    );
  });

  it("iterates sessions and calls mem::graph-extract", () => {
    expect(api).toMatch(/kv\.list<Session>\(KV\.sessions\)/);
    expect(api).toMatch(/kv\.list<CompressedObservation>\(KV\.observations\(sid\)\)/);
    expect(api).toMatch(
      /sdk\.trigger\(\{\s*function_id:\s*"mem::graph-extract"/,
    );
    expect(api).toMatch(/payload:\s*\{\s*observations:\s*batch,\s*project\s*\}/);
  });

  it("filters observations that have a title (compressed only)", () => {
    expect(api).toMatch(/typeof o\.title === "string" && o\.title\.length > 0/);
  });

  it("respects batchSize override with a 100-item upper bound", () => {
    expect(api).toMatch(/Math\.min\(100,\s*Number\(.*batchSize/);
  });

  it("surfaces partial backfill failures instead of unconditional success", () => {
    expect(api).toMatch(/status_code:\s*batchesFailed === 0 \? 200 : 503/);
    expect(api).toMatch(
      /success:\s*batchesFailed === 0,[\s\S]*?batchesFailed,[\s\S]*?nodes:\s*totalNodes/,
    );
  });
});

// #666: `agentmemory status` showed Memories/Observations as 0 because it
// fetched /agentmemory/export which times out on iii-engine's file-based
// KV under concurrent kv.list() pressure. Switch to /memories for the
// memory count and derive observation count from sessions[].observationCount.
describe("agentmemory status no longer depends on /export (#666)", () => {
  const cli = readFileSync("src/cli.ts", "utf-8");

  it("status uses a scoped count-only memories endpoint instead of export", () => {
    expect(cli).toMatch(
      /const memoriesQuery = globalScope[\s\S]*?memories\?count=true&scope=global[\s\S]*?memories\?count=true&project=/,
    );
    expect(cli).toMatch(/apiFetch<any>\(base,\s*memoriesQuery\)/);
    expect(cli).not.toMatch(/apiFetch<any>\(base,\s*"export"\)/);
  });

  it("status derives obsCount from sessions[].observationCount", () => {
    expect(cli).toMatch(
      /sessionList\.reduce\([\s\S]*?observationCount/,
    );
  });

  it("status reads memCount from memoriesRes.latestCount (count endpoint)", () => {
    expect(cli).toMatch(/memoriesRes\?\.latestCount\s*\?\?\s*memoriesRes\?\.total/);
  });
});
