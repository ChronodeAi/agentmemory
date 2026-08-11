import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registerLessonsFunctions } from "../src/functions/lessons.js";
import { registerPromotionFunctions } from "../src/functions/promotions.js";
import { registerSmartSearchFunction } from "../src/functions/smart-search.js";
import {
  getBackgroundPipelineHealth,
  resetBackgroundPipelineHealthForTests,
} from "../src/health/background-pipeline.js";
import { InMemoryKV } from "../src/mcp/in-memory-kv.js";
import { KV } from "../src/state/schema.js";
import { registerApiTriggers } from "../src/triggers/api.js";
import { registerEventTriggers } from "../src/triggers/events.js";
import type {
  CompressedObservation,
  PromotionCandidate,
  Session,
} from "../src/types.js";
import { mockSdk } from "./helpers/mocks.js";

const PROJECT = "github.com/example/promotion-canary";
const OTHER_PROJECT = "github.com/example/unrelated";

type UpdateOperation = {
  type: "set";
  path: string;
  value: unknown;
};

class PersistedTestKV extends InMemoryKV {
  override async set<T = unknown>(
    scope: string,
    key: string,
    data: T,
  ): Promise<T> {
    const result = await super.set(scope, key, data);
    this.persist();
    return result;
  }

  override async delete(scope: string, key: string): Promise<void> {
    await super.delete(scope, key);
    this.persist();
  }

  async update<T = unknown>(
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

function observation(
  id: string,
  type: CompressedObservation["type"],
  timestamp: string,
  narrative: string,
  concepts: string[] = [],
): CompressedObservation {
  return {
    id,
    sessionId: "session-canary",
    timestamp,
    type,
    title: narrative,
    narrative,
    facts: [narrative],
    concepts,
    files: ["src/auth.ts"],
    importance: 9,
  };
}

function registerCanaryRuntime(
  kv: PersistedTestKV,
): ReturnType<typeof mockSdk> {
  const sdk = mockSdk();
  registerLessonsFunctions(sdk as never, kv as never);
  registerPromotionFunctions(sdk as never, kv as never);
  registerSmartSearchFunction(sdk as never, kv as never, async () => []);
  sdk.registerFunction("mem::summarize", async () => ({
    success: true,
    summary: "Synthetic promotion canary completed",
  }));
  registerEventTriggers(sdk as never, kv as never);
  registerApiTriggers(sdk as never, kv as never);
  return sdk;
}

async function waitForPipelineSuccess(runId: string): Promise<void> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const health = getBackgroundPipelineHealth();
    if (health.lastRunId === runId && health.status === "succeeded") return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error(`promotion pipeline ${runId} did not complete`);
}

describe("file-backed promotion lifecycle acceptance", () => {
  let directory: string;
  let persistPath: string;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), "agentmemory-promotion-canary-"));
    persistPath = join(directory, "state.json");
    process.env["AGENTMEMORY_REFLECT"] = "false";
    process.env["GRAPH_EXTRACTION_ENABLED"] = "false";
    resetBackgroundPipelineHealthForTests();
  });

  afterEach(() => {
    delete process.env["AGENTMEMORY_REFLECT"];
    delete process.env["GRAPH_EXTRACTION_ENABLED"];
    resetBackgroundPipelineHealthForTests();
    rmSync(directory, { recursive: true, force: true });
  });

  it("promotes once, survives state reopen, and fails closed across projects", async () => {
    const kv = new PersistedTestKV(persistPath);
    const sdk = registerCanaryRuntime(kv);
    await kv.set<Session>(KV.sessions, "session-canary", {
      id: "session-canary",
      project: PROJECT,
      cwd: "/tmp/promotion-canary",
      startedAt: "2026-08-11T00:00:00.000Z",
      status: "active",
      observationCount: 2,
      commitShas: ["a".repeat(40)],
    });
    await kv.set(
      KV.observations("session-canary"),
      "failure",
      observation(
        "failure",
        "error",
        "2026-08-11T00:01:00.000Z",
        "Authentication test failed before the verified fix",
      ),
    );
    await kv.set(
      KV.observations("session-canary"),
      "verification",
      observation(
        "verification",
        "command_run",
        "2026-08-11T00:02:00.000Z",
        "Authentication test passed after the verified fix",
        [
          "evidence:kind:test",
          "evidence:status:verified",
          "evidence:source:ci:test-run:canary",
        ],
      ),
    );

    const ended = (await sdk.trigger("api::session::end", {
      body: { sessionId: "session-canary", project: PROJECT },
    })) as {
      status_code: number;
      body: { pipelineRunId: string; pipelineAccepted: boolean };
    };
    expect(ended).toMatchObject({
      status_code: 200,
      body: { pipelineAccepted: true },
    });
    await waitForPipelineSuccess(ended.body.pipelineRunId);

    const candidates = await kv.list<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      status: "auto_promoted",
      promotedRecordId: expect.any(String),
    });

    const firstRecall = (await sdk.trigger("mem::smart-search", {
      query: "Authentication test failed",
      project: PROJECT,
    })) as { lessons: Array<{ lessonId: string }> };
    expect(firstRecall.lessons[0]?.lessonId).toBe(
      candidates[0].promotedRecordId,
    );

    const duplicate = await sdk.trigger("api::session::end", {
      body: { sessionId: "session-canary", project: PROJECT },
    });
    expect(duplicate).toMatchObject({
      status_code: 200,
      body: {
        alreadyClosed: true,
        pipelineRunId: ended.body.pipelineRunId,
      },
    });
    expect(
      await kv.list<PromotionCandidate>(KV.promotionCandidates(PROJECT)),
    ).toHaveLength(1);
    expect(getBackgroundPipelineHealth()).toMatchObject({
      accepted: 1,
      started: 1,
      succeeded: 1,
      failed: 0,
      promoted: 1,
    });

    const reopenedKv = new PersistedTestKV(persistPath);
    const reopenedSdk = registerCanaryRuntime(reopenedKv);
    const reopenedCandidates = await reopenedKv.list<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
    );
    expect(reopenedCandidates[0]?.promotedRecordId).toBe(
      candidates[0].promotedRecordId,
    );

    const reopenedRecall = (await reopenedSdk.trigger("mem::smart-search", {
      query: "Authentication test failed",
      project: PROJECT,
    })) as { lessons: Array<{ lessonId: string }> };
    expect(reopenedRecall.lessons[0]?.lessonId).toBe(
      candidates[0].promotedRecordId,
    );

    const isolatedRecall = (await reopenedSdk.trigger("mem::smart-search", {
      query: "Authentication test failed",
      project: OTHER_PROJECT,
    })) as { lessons: Array<{ lessonId: string }> };
    expect(isolatedRecall.lessons).toEqual([]);
  });
});
