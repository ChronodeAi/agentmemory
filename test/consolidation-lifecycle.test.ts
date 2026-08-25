import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryKV } from "../src/mcp/in-memory-kv.js";
import { KV } from "../src/state/schema.js";
import { registerEventTriggers } from "../src/triggers/events.js";
import type { Session } from "../src/types.js";
import { mockSdk } from "./helpers/mocks.js";

const PROJECT = "github.com/example/consolidation-lifecycle";

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];

type UpdateOperation = {
  type: "set";
  path: string;
  value: unknown;
};

class TestKV extends InMemoryKV {
  override async update<T = unknown>(
    scope: string,
    key: string,
    operations: UpdateOperation[],
  ): Promise<T> {
    const current = (await this.get<Record<string, unknown>>(scope, key)) ?? {};
    const next = structuredClone(current);
    for (const operation of operations) {
      const segments = operation.path.split(".").filter(Boolean);
      let target: Record<string, unknown> = next;
      for (const segment of segments.slice(0, -1)) {
        const child = target[segment];
        if (!child || typeof child !== "object" || Array.isArray(child)) {
          target[segment] = {};
        }
        target = target[segment] as Record<string, unknown>;
      }
      target[segments.at(-1)!] = operation.value;
    }
    return this.set(scope, key, next as T);
  }
}

function sessionRow(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    project: PROJECT,
    cwd: "/tmp/consolidation-lifecycle",
    startedAt: "2026-08-11T00:00:00.000Z",
    status: "active",
    observationCount: 1,
    ...overrides,
  } as Session;
}

const ENV_KEYS = [
  "CONSOLIDATION_ENABLED",
  "AGENTMEMORY_PROVIDER",
  "AGENTMEMORY_CONSOLIDATION_COOLDOWN_MS",
  "AGENTMEMORY_REFLECT",
  "GRAPH_EXTRACTION_ENABLED",
] as const;

interface RecordedCall {
  functionId: string;
  payload: Record<string, unknown>;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

describe("session-stop consolidation lifecycle", () => {
  let kv: TestKV;
  let sdk: ReturnType<typeof mockSdk>;
  let calls: RecordedCall[];
  let savedEnv: Record<string, string | undefined>;
  let promotionShouldFail: boolean;
  let sandboxHome: string;

  function registerRuntime(): void {
    calls = [];
    promotionShouldFail = false;
    const record = (functionId: string, payload: unknown) => {
      calls.push({
        functionId,
        payload: payload as Record<string, unknown>,
      });
      return { success: true };
    };
    sdk.registerFunction("mem::consolidate-pipeline", async (payload) =>
      record("mem::consolidate-pipeline", payload),
    );
    sdk.registerFunction("mem::auto-crystallize", async (payload) =>
      record("mem::auto-crystallize", payload),
    );
    let summarizeCalls = 0;
    sdk.registerFunction("mem::summarize", async () => {
      summarizeCalls += 1;
      return { success: true, summary: "synthetic" };
    });
    (sdk as unknown as { __summarizeCalls: () => number }).__summarizeCalls =
      () => summarizeCalls;
    sdk.registerFunction("mem::promotion-generate", async () => {
      if (promotionShouldFail) {
        promotionShouldFail = false;
        return { success: false, error: "SIMULATED_PROMOTION_FAILURE" };
      }
      return { success: true, candidates: [], promoted: 0 };
    });
    registerEventTriggers(sdk as never, kv as never);
  }

  async function stop(input: {
    sessionId: string;
    project?: string;
    pipelineRunId?: string;
  }): Promise<Record<string, unknown>> {
    return (await sdk.trigger("event::session::stopped", {
      sessionId: input.sessionId,
      project: input.project ?? PROJECT,
      ...(input.pipelineRunId ? { pipelineRunId: input.pipelineRunId } : {}),
    })) as Record<string, unknown>;
  }

  function consolidationCalls(): RecordedCall[] {
    return calls.filter(
      (call) => call.functionId === "mem::consolidate-pipeline",
    );
  }

  function crystallizeCalls(): RecordedCall[] {
    return calls.filter((call) => call.functionId === "mem::auto-crystallize");
  }

  async function marker(): Promise<{ at?: number } | null> {
    return kv.get<{ at?: number }>(KV.config, "consolidation:lastRun");
  }

  beforeEach(() => {
    // Isolate the config layer from the real operator ~/.agentmemory/.env:
    // getMergedEnv() folds file values under process.env, so a real file
    // could otherwise flip the consolidation gate or the cooldown.
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-consolidation-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    savedEnv = {};
    for (const key of ENV_KEYS) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    process.env["CONSOLIDATION_ENABLED"] = "true";
    // Pin the default window explicitly: process.env beats the operator's
    // ~/.agentmemory/.env, so a real file value can't skew the debounce.
    process.env["AGENTMEMORY_CONSOLIDATION_COOLDOWN_MS"] = "300000";
    process.env["AGENTMEMORY_REFLECT"] = "false";
    process.env["GRAPH_EXTRACTION_ENABLED"] = "false";
    kv = new TestKV();
    sdk = mockSdk();
  });

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("fires corpus consolidation and crystallization once per eligible stop", async () => {
    await kv.set(KV.sessions, "s1", sessionRow("s1"));
    registerRuntime();

    const result = await stop({ sessionId: "s1" });
    expect(result).toMatchObject({ success: true });
    await flush();

    expect(consolidationCalls()).toEqual([
      {
        functionId: "mem::consolidate-pipeline",
        payload: { tier: "all", force: true, project: PROJECT },
      },
    ]);
    expect(crystallizeCalls()).toEqual([
      {
        functionId: "mem::auto-crystallize",
        payload: { olderThanDays: 0, project: PROJECT },
      },
    ]);
    const written = await marker();
    expect(typeof written?.at).toBe("number");
  });

  it("suppresses consolidation for a later stop inside the cooldown window", async () => {
    await kv.set(KV.sessions, "s1", sessionRow("s1"));
    await kv.set(KV.sessions, "s2", sessionRow("s2"));
    registerRuntime();

    await stop({ sessionId: "s1" });
    await flush();
    await stop({ sessionId: "s2" });
    await flush();

    expect(consolidationCalls()).toHaveLength(1);
    expect(crystallizeCalls()).toHaveLength(1);
  });

  it("fires again once the cooldown window has elapsed", async () => {
    await kv.set(KV.sessions, "s1", sessionRow("s1"));
    await kv.set(KV.sessions, "s2", sessionRow("s2"));
    registerRuntime();

    await stop({ sessionId: "s1" });
    await flush();
    const stale = (await marker())!;
    await kv.set(KV.config, "consolidation:lastRun", {
      at: (stale.at ?? Date.now()) - 300_001,
    });

    await stop({ sessionId: "s2" });
    await flush();

    expect(consolidationCalls()).toHaveLength(2);
  });

  it("treats AGENTMEMORY_CONSOLIDATION_COOLDOWN_MS=0 as debounce disabled", async () => {
    process.env["AGENTMEMORY_CONSOLIDATION_COOLDOWN_MS"] = "0";
    await kv.set(KV.sessions, "s1", sessionRow("s1"));
    await kv.set(KV.sessions, "s2", sessionRow("s2"));
    registerRuntime();

    await stop({ sessionId: "s1" });
    await flush();
    await stop({ sessionId: "s2" });
    await flush();

    expect(consolidationCalls()).toHaveLength(2);
  });

  it("resumes completed stages without rerunning them and still consolidates once", async () => {
    await kv.set(
      KV.sessions,
      "s-resume",
      sessionRow("s-resume", {
        backgroundPipelineRunId: "pipeline-resume-1",
        backgroundPipelineStatus: "failed",
        backgroundPipelineStage: "promotion",
        backgroundPipelineSummaryStatus: "succeeded",
        backgroundPipelineAttempts: 1,
      }),
    );
    registerRuntime();

    const first = await stop({
      sessionId: "s-resume",
      pipelineRunId: "pipeline-resume-1",
    });
    await flush();

    // Summary stage was already complete — the resume machinery must not
    // re-run mem::summarize; only promotion ran.
    const summarizeCalls = (
      sdk as unknown as { __summarizeCalls: () => number }
    ).__summarizeCalls();
    expect(summarizeCalls).toBe(0);
    expect(first).toMatchObject({ success: true });
    expect(await marker()).not.toBeNull();

    // A repeat stop on the now-succeeded pipeline short-circuits before the
    // consolidation gate: no stage rerun and no cooldown consumption.
    const second = await stop({
      sessionId: "s-resume",
      pipelineRunId: "pipeline-resume-1",
    });
    await flush();
    expect(second).toMatchObject({ success: true, alreadyProcessed: true });
    expect(consolidationCalls()).toHaveLength(1);
    expect(crystallizeCalls()).toHaveLength(1);
  });

  it("does not consume the cooldown when the pipeline fails", async () => {
    await kv.set(KV.sessions, "s-fail", sessionRow("s-fail"));
    registerRuntime();
    promotionShouldFail = true;

    const failed = await stop({
      sessionId: "s-fail",
      pipelineRunId: "pipeline-fail-1",
    });
    await flush();
    expect(failed).toMatchObject({ success: false, error: "promotion_failed" });
    expect(await marker()).toBeNull();
    expect(consolidationCalls()).toHaveLength(0);

    // Retry under the same runId succeeds — the gate is reached with an
    // empty marker and fires.
    const retried = await stop({
      sessionId: "s-fail",
      pipelineRunId: "pipeline-fail-1",
    });
    await flush();
    expect(retried).toMatchObject({ success: true });
    expect(consolidationCalls()).toHaveLength(1);
  });

  it("never fires or consumes the cooldown when consolidation is disabled", async () => {
    // Explicit env values beat ~/.agentmemory/.env in getMergedEnv
    // precedence, so this gate is deterministic regardless of the real
    // operator file on the test machine.
    process.env["AGENTMEMORY_PROVIDER"] = "noop";
    process.env["CONSOLIDATION_ENABLED"] = "false";
    await kv.set(KV.sessions, "s-keyless", sessionRow("s-keyless"));
    registerRuntime();

    const result = await stop({ sessionId: "s-keyless" });
    await flush();

    expect(result).toMatchObject({ success: true });
    expect(consolidationCalls()).toHaveLength(0);
    expect(crystallizeCalls()).toHaveLength(0);
    expect(await marker()).toBeNull();
  });

  it("serializes concurrent stops so only one passes the cooldown check", async () => {
    await kv.set(KV.sessions, "s-a", sessionRow("s-a"));
    await kv.set(KV.sessions, "s-b", sessionRow("s-b"));
    await kv.set(KV.sessions, "s-c", sessionRow("s-c"));
    registerRuntime();

    await Promise.all([
      stop({ sessionId: "s-a" }),
      stop({ sessionId: "s-b" }),
      stop({ sessionId: "s-c" }),
    ]);
    await flush();

    expect(consolidationCalls()).toHaveLength(1);
    expect(crystallizeCalls()).toHaveLength(1);
  });

  it("releases the cooldown marker when the consolidation dispatch is rejected", async () => {
    await kv.set(KV.sessions, "s-r1", sessionRow("s-r1"));
    await kv.set(KV.sessions, "s-r2", sessionRow("s-r2"));
    registerRuntime();
    // First dispatch is rejected by the provider/engine; the retry lands.
    let consolidateDispatches = 0;
    (sdk as unknown as { fns: Map<string, (data: unknown) => Promise<unknown>> }).fns.set(
      "mem::consolidate-pipeline",
      async (payload) => {
        consolidateDispatches += 1;
        if (consolidateDispatches === 1) {
          throw new Error("SIMULATED_PROVIDER_REJECTION");
        }
        calls.push({
          functionId: "mem::consolidate-pipeline",
          payload: payload as Record<string, unknown>,
        });
        return { success: true };
      },
    );

    await stop({ sessionId: "s-r1" });
    await flush();

    expect(consolidateDispatches).toBe(1);
    // The marker was written before the dispatch; the rejection handler
    // must have cleared it best-effort.
    expect(await marker()).toBeNull();

    // The next stop inside the cooldown window retries consolidation
    // instead of being debounced by a marker with no pipeline behind it.
    await stop({ sessionId: "s-r2" });
    await flush();

    expect(consolidateDispatches).toBe(2);
    expect(consolidationCalls()).toEqual([
      {
        functionId: "mem::consolidate-pipeline",
        payload: { tier: "all", force: true, project: PROJECT },
      },
    ]);
    expect(await marker()).not.toBeNull();
  });

  it("keeps the marker when crystallize is rejected but the pipeline holds a newer claim", async () => {
    await kv.set(KV.sessions, "s-x1", sessionRow("s-x1"));
    await kv.set(KV.sessions, "s-x2", sessionRow("s-x2"));
    registerRuntime();
    // Crystallize is rejected every time; the pipeline succeeds. The
    // pipeline fires after crystallize and therefore owns the newest
    // claim on the marker.
    let crystallizeDispatches = 0;
    (sdk as unknown as { fns: Map<string, (data: unknown) => Promise<unknown>> }).fns.set(
      "mem::auto-crystallize",
      async () => {
        crystallizeDispatches += 1;
        throw new Error("SIMULATED_CRYSTALLIZE_REJECTION");
      },
    );

    await stop({ sessionId: "s-x1" });
    await flush();

    expect(crystallizeDispatches).toBe(1);
    expect(consolidationCalls()).toHaveLength(1);
    const survivor = await marker();
    expect(typeof survivor?.at).toBe("number");
    expect(typeof survivor?.token).toBe("string");

    // The running pipeline must stay protected: a stop inside the cooldown
    // window is still debounced even though crystallize was rejected.
    await stop({ sessionId: "s-x2" });
    await flush();
    expect(crystallizeDispatches).toBe(1);
    expect(consolidationCalls()).toHaveLength(1);
  });

  it("a stale rejection cannot erase a newer cycle's marker", async () => {
    await kv.set(KV.sessions, "s-t1", sessionRow("s-t1"));
    await kv.set(KV.sessions, "s-t2", sessionRow("s-t2"));
    await kv.set(KV.sessions, "s-t3", sessionRow("s-t3"));
    registerRuntime();
    // First pipeline dispatch hangs until the test releases it, simulating
    // a rejection that lands long after newer cycles have claimed the mark.
    let pipelineDispatches = 0;
    let rejectFirstDispatch!: (err: Error) => void;
    const gated = new Promise<never>((_resolve, reject) => {
      rejectFirstDispatch = reject;
    });
    (sdk as unknown as { fns: Map<string, (data: unknown) => Promise<unknown>> }).fns.set(
      "mem::consolidate-pipeline",
      async (payload) => {
        pipelineDispatches += 1;
        if (pipelineDispatches === 1) return gated;
        calls.push({
          functionId: "mem::consolidate-pipeline",
          payload: payload as Record<string, unknown>,
        });
        return { success: true };
      },
    );

    // Cycle 1: crystallize succeeds, pipeline dispatch #1 stays pending.
    await stop({ sessionId: "s-t1" });
    await flush();
    expect(pipelineDispatches).toBe(1);
    expect(await marker()).not.toBeNull();

    // Cycle 2 becomes eligible only after the window elapses; it writes a
    // fresh marker and completes successfully.
    const stale = (await marker())!;
    await kv.set(KV.config, "consolidation:lastRun", {
      at: (stale.at ?? Date.now()) - 300_001,
      token: "superseded-cycle-1-claim",
    });
    await stop({ sessionId: "s-t2" });
    await flush();
    expect(pipelineDispatches).toBe(2);
    const fresh = await marker();
    expect(fresh).not.toBeNull();
    expect(fresh?.token).not.toBe("superseded-cycle-1-claim");

    // The cycle-1 rejection finally lands: its compare-and-delete finds a
    // foreign token and leaves the newer debounce standing.
    rejectFirstDispatch(new Error("SIMULATED_LATE_REJECTION"));
    await flush();
    expect(await marker()).toEqual(fresh);

    // A further stop inside the window stays debounced by that survivor.
    await stop({ sessionId: "s-t3" });
    await flush();
    expect(pipelineDispatches).toBe(2);
    expect(crystallizeCalls()).toHaveLength(2);
  });
});
