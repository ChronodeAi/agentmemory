import { beforeEach, describe, expect, it } from "vitest";
import { registerPromotionFunctions } from "../src/functions/promotions.js";
import { KV } from "../src/state/schema.js";
import type {
  CompressedObservation,
  PromotionCandidate,
  Session,
} from "../src/types.js";
import { mockKV, mockSdk } from "./helpers/mocks.js";

const PROJECT = "github.com/example/project";

function observation(
  id: string,
  type: CompressedObservation["type"],
  title: string,
  timestamp: string,
  narrative = title,
): CompressedObservation {
  return {
    id,
    sessionId: "session-1",
    timestamp,
    type,
    title,
    narrative,
    facts: [narrative],
    concepts: [],
    files: ["src/app.ts"],
    importance: 8,
  };
}

describe("evidence-gated promotions", () => {
  let kv: ReturnType<typeof mockKV>;
  let sdk: ReturnType<typeof mockSdk>;

  beforeEach(async () => {
    kv = mockKV();
    sdk = mockSdk();
    sdk.registerFunction("mem::lesson-save", async (data) => ({
      success: true,
      lesson: { id: "lesson-1", ...(data as object) },
    }));
    sdk.registerFunction("mem::remember", async (data) => ({
      success: true,
      memory: { id: "memory-1", ...(data as object) },
    }));
    registerPromotionFunctions(sdk as never, kv as never);
    await kv.set<Session>(KV.sessions, "session-1", {
      id: "session-1",
      project: PROJECT,
      cwd: "/tmp/project",
      startedAt: "2026-01-01T00:00:00.000Z",
      status: "completed",
      observationCount: 3,
      commitShas: ["a".repeat(40)],
    });
    await kv.set(
      KV.observations("session-1"),
      "failure",
      observation(
        "failure",
        "error",
        "Tests failed",
        "2026-01-01T00:01:00.000Z",
        "Authentication test failed before the fix",
      ),
    );
    await kv.set(
      KV.observations("session-1"),
      "verified",
      observation(
        "verified",
        "command_run",
        "Tests passed",
        "2026-01-01T00:02:00.000Z",
        "All tests passed with exit code 0",
      ),
    );
    await kv.set(
      KV.observations("session-1"),
      "decision",
      observation(
        "decision",
        "decision",
        "Architecture decision",
        "2026-01-01T00:03:00.000Z",
        "Architecture ADR selected a stable service boundary",
      ),
    );
  });

  it("creates no more than three candidates and auto-promotes verified fixes", async () => {
    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as {
      candidates: PromotionCandidate[];
      promoted: number;
    };
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    expect(result.promoted).toBe(1);
    expect(
      result.candidates.find((item) => item.category === "bug")?.status,
    ).toBe("auto_promoted");
    expect(
      result.candidates.find((item) => item.category === "architecture")
        ?.status,
    ).toBe("pending");
  });

  it("requires ADR and commit provenance for architecture acceptance", async () => {
    await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    });
    const listed = (await sdk.trigger("mem::promotion-list", {
      project: PROJECT,
    })) as { candidates: PromotionCandidate[] };
    const architecture = listed.candidates.find(
      (item) => item.category === "architecture",
    )!;
    const denied = (await sdk.trigger("mem::promotion-decide", {
      project: PROJECT,
      candidateId: architecture.id,
      action: "accept",
    })) as { success: boolean };
    expect(denied.success).toBe(false);

    const accepted = (await sdk.trigger("mem::promotion-decide", {
      project: PROJECT,
      candidateId: architecture.id,
      action: "accept",
      canonicalAdr: "docs/adr/001-service-boundary.md",
      commitSha: "b".repeat(40),
    })) as { success: boolean; candidate: PromotionCandidate };
    expect(accepted.success).toBe(true);
    expect(accepted.candidate.status).toBe("accepted");
    expect(accepted.candidate.promotedRecordId).toBe("memory-1");
  });

  it("never treats recalled context as fresh promotion evidence", async () => {
    await kv.set(
      KV.observations("session-1"),
      "recalled",
      observation(
        "recalled",
        "decision",
        "Recalled policy",
        "2026-01-01T00:04:00.000Z",
        "<agentmemory-context>architecture policy</agentmemory-context>",
      ),
    );
    await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    });
    const listed = (await sdk.trigger("mem::promotion-list", {
      project: PROJECT,
    })) as { candidates: PromotionCandidate[] };
    expect(
      listed.candidates.some((candidate) =>
        candidate.sourceObservationIds.includes("recalled"),
      ),
    ).toBe(false);
  });
});
