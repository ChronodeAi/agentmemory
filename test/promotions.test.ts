import { beforeEach, describe, expect, it } from "vitest";
import { registerPromotionFunctions } from "../src/functions/promotions.js";
import { registerLessonsFunctions } from "../src/functions/lessons.js";
import { KV } from "../src/state/schema.js";
import type {
  CompressedObservation,
  Lesson,
  PromotionCandidate,
  RawObservation,
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

function evidenceObservation(
  id: string,
  kind:
    | "test"
    | "runtime"
    | "commit"
    | "adr"
    | "recall"
    | "summary",
  status: "verified" | "accepted" | "unverified" | "rejected",
  timestamp: string,
  options: {
    sourceIds?: string[];
    parentIds?: string[];
    title?: string;
    narrative?: string;
    type?: CompressedObservation["type"];
  } = {},
): CompressedObservation {
  const result = observation(
    id,
    options.type ?? "command_run",
    options.title ?? `${kind} evidence`,
    timestamp,
    options.narrative ?? `${kind} evidence payload`,
  );
  result.concepts = [
    `evidence:kind:${kind}`,
    `evidence:status:${status}`,
    ...(options.sourceIds ?? []).map(
      (sourceId) => `evidence:source:${sourceId}`,
    ),
    ...(options.parentIds ?? []).map(
      (parentId) => `evidence:parent:${parentId}`,
    ),
  ];
  return result;
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
    await kv.set(
      KV.observations("session-1"),
      "verified",
      evidenceObservation(
        "verified",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        {
          sourceIds: ["ci:test-run:42"],
          title: "Authentication suite result",
          narrative: "Machine-readable test report attached",
        },
      ),
    );
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

  it("skips retained raw observations without failing promotion generation", async () => {
    const raw: RawObservation = {
      id: "raw-compression-failure",
      sessionId: "session-1",
      timestamp: "2026-01-01T00:01:30.000Z",
      hookType: "post_tool_failure",
      toolName: "Bash",
      raw: { status: "compression_pending" },
    };
    await kv.set(KV.observations("session-1"), raw.id, raw);
    await kv.set(
      KV.observations("session-1"),
      "verified-with-raw",
      evidenceObservation(
        "verified-with-raw",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        { sourceIds: ["test:ci-run:raw-boundary"] },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as {
      success: boolean;
      promoted: number;
      nonCompressedObservationsSkipped: number;
    };

    expect(result).toMatchObject({
      success: true,
      promoted: 1,
      nonCompressedObservationsSkipped: 1,
    });
  });

  it("keeps externally accepted ADR evidence behind explicit acceptance", async () => {
    await kv.set(
      KV.observations("session-1"),
      "accepted-adr",
      evidenceObservation(
        "accepted-adr",
        "adr",
        "accepted",
        "2026-01-01T00:04:00.000Z",
        {
          sourceIds: ["docs/adr/001-service-boundary.md"],
          title: "Ratified decision record",
        },
      ),
    );
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
    expect(architecture.freshVerification).toBe(true);
    expect(architecture.status).toBe("pending");
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

  it("rejects paraphrased recall without inspecting its prose", async () => {
    await kv.set(
      KV.observations("session-1"),
      "recalled",
      evidenceObservation(
        "recalled",
        "recall",
        "verified",
        "2026-01-01T00:04:00.000Z",
        {
          sourceIds: ["memory:prior-session"],
          type: "decision",
          title: "Previously supplied guidance",
          narrative:
            "A prior conversation described this as the successful approach",
        },
      ),
    );
    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { candidates: PromotionCandidate[]; promoted: number };
    expect(result.promoted).toBe(0);
    expect(
      result.candidates.some((candidate) =>
        candidate.sourceObservationIds.includes("recalled"),
      ),
    ).toBe(false);
  });

  it("rejects multi-hop evidence cycles", async () => {
    await kv.set(
      KV.observations("session-1"),
      "cycle-a",
      evidenceObservation(
        "cycle-a",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        {
          sourceIds: ["ci:test-run:cycle"],
          parentIds: ["cycle-b"],
        },
      ),
    );
    await kv.set(
      KV.observations("session-1"),
      "cycle-b",
      evidenceObservation(
        "cycle-b",
        "runtime",
        "verified",
        "2026-01-01T00:02:01.000Z",
        {
          sourceIds: ["runtime:cycle"],
          parentIds: ["cycle-c"],
        },
      ),
    );
    await kv.set(
      KV.observations("session-1"),
      "cycle-c",
      evidenceObservation(
        "cycle-c",
        "commit",
        "verified",
        "2026-01-01T00:02:02.000Z",
        {
          sourceIds: ["commit:cycle"],
          parentIds: ["cycle-a"],
        },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(result.promoted).toBe(0);
  });

  it("rejects direct evidence self-references", async () => {
    await kv.set(
      KV.observations("session-1"),
      "self-reference",
      evidenceObservation(
        "self-reference",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        {
          sourceIds: ["ci:test-run:self-reference"],
          parentIds: ["self-reference"],
        },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(result.promoted).toBe(0);
  });

  it("rejects evidence with an unresolved parent reference", async () => {
    await kv.set(
      KV.observations("session-1"),
      "missing-parent",
      evidenceObservation(
        "missing-parent",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        {
          sourceIds: ["ci:test-run:missing-parent"],
          parentIds: ["does-not-exist"],
        },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(result.promoted).toBe(0);
  });

  it("rejects evidence without source provenance", async () => {
    await kv.set(
      KV.observations("session-1"),
      "missing-source",
      evidenceObservation(
        "missing-source",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(result.promoted).toBe(0);
  });

  it("rejects evidence derived only from the candidate itself", async () => {
    await kv.set(
      KV.observations("session-1"),
      "self-derived",
      evidenceObservation(
        "self-derived",
        "runtime",
        "verified",
        "2026-01-01T00:02:00.000Z",
        { sourceIds: ["failure"] },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(result.promoted).toBe(0);
  });

  it("rejects ADR evidence that has not been explicitly accepted", async () => {
    await kv.set(
      KV.observations("session-1"),
      "unaccepted-adr",
      evidenceObservation(
        "unaccepted-adr",
        "adr",
        "verified",
        "2026-01-01T00:04:00.000Z",
        { sourceIds: ["docs/adr/001-service-boundary.md"] },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { candidates: PromotionCandidate[] };
    expect(
      result.candidates.find(
        (candidate) => candidate.category === "architecture",
      )?.freshVerification,
    ).toBe(false);
  });

  it.each(["test", "runtime", "commit"] as const)(
    "auto-promotes verified %s evidence with source provenance",
    async (kind) => {
      await kv.set(
        KV.observations("session-1"),
        `valid-${kind}`,
        evidenceObservation(
          `valid-${kind}`,
          kind,
          "verified",
          "2026-01-01T00:02:00.000Z",
          { sourceIds: [`${kind}:external:42`] },
        ),
      );

      const result = (await sdk.trigger("mem::promotion-generate", {
        sessionId: "session-1",
        project: PROJECT,
      })) as { promoted: number };
      expect(result.promoted).toBe(1);
    },
  );

  it("rejects provenance that explicitly declares a different evidence kind", async () => {
    await kv.set(
      KV.observations("session-1"),
      "mismatched-source",
      evidenceObservation(
        "mismatched-source",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        { sourceIds: ["commit:abc123"] },
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { candidates: PromotionCandidate[]; promoted: number };
    expect(result.promoted).toBe(0);
    expect(
      result.candidates.find((candidate) => candidate.category === "bug")
        ?.freshVerification,
    ).toBe(false);
  });

  it("keeps old untyped verification payloads fail-closed", async () => {
    await kv.set(
      KV.observations("session-1"),
      "legacy",
      observation(
        "legacy",
        "command_run",
        "Tests passed",
        "2026-01-01T00:02:00.000Z",
        "All tests passed successfully with exit code 0",
      ),
    );

    const result = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { candidates: PromotionCandidate[]; promoted: number };
    expect(result.promoted).toBe(0);
    expect(
      result.candidates.find((candidate) => candidate.category === "bug")
        ?.freshVerification,
    ).toBe(false);
  });

  it("does not trust freshVerification on a legacy pending candidate", async () => {
    await kv.set(
      KV.observations("session-1"),
      "legacy",
      observation(
        "legacy",
        "command_run",
        "Tests passed",
        "2026-01-01T00:02:00.000Z",
        "All tests passed successfully with exit code 0",
      ),
    );
    await kv.set<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
      "legacy-candidate",
      {
        id: "legacy-candidate",
        project: PROJECT,
        sessionId: "session-1",
        category: "bug",
        title: "Legacy verified fix",
        content:
          "Tests failed: Authentication test failed before the fix.",
        status: "pending",
        requiresExplicitApproval: false,
        freshVerification: true,
        sourceObservationIds: ["failure", "legacy"],
        failureObservationIds: ["failure"],
        verificationObservationIds: ["legacy"],
        createdAt: "2026-01-01T00:05:00.000Z",
        updatedAt: "2026-01-01T00:05:00.000Z",
      },
    );

    const generated = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { promoted: number };
    expect(generated.promoted).toBe(0);

    const decided = (await sdk.trigger("mem::promotion-decide", {
      project: PROJECT,
      candidateId: "legacy-candidate",
      action: "accept",
    })) as { success: boolean };
    expect(decided.success).toBe(false);
  });

  it.each([
    [
      "downstream rejection",
      { success: false, error: "storage unavailable" },
      "downstream_rejected",
    ],
    [
      "missing record id",
      { success: true, lesson: {} },
      "missing_record_id",
    ],
  ] as const)(
    "keeps an automatic candidate pending on %s",
    async (_label, persistenceResult, reason) => {
      sdk.registerFunction(
        "mem::lesson-save",
        async () => persistenceResult,
      );
      await kv.set(
        KV.observations("session-1"),
        "verified-persistence",
        evidenceObservation(
          "verified-persistence",
          "test",
          "verified",
          "2026-01-01T00:02:00.000Z",
          { sourceIds: ["test:ci-run:42"] },
        ),
      );

      const result = (await sdk.trigger("mem::promotion-generate", {
        sessionId: "session-1",
        project: PROJECT,
      })) as {
        success: boolean;
        error: {
          code: string;
          failures: Array<{
            operation: string;
            target: string;
            reason: string;
          }>;
        };
        candidates: PromotionCandidate[];
        promoted: number;
      };
      expect(result.success).toBe(false);
      expect(result.promoted).toBe(0);
      expect(result.error.code).toBe("PROMOTION_PERSISTENCE_FAILED");
      expect(result.error.failures).toContainEqual(
        expect.objectContaining({
          operation: "auto_promote",
          target: "lesson",
          reason,
        }),
      );
      expect(
        result.candidates.find((candidate) => candidate.category === "bug")
          ?.status,
      ).toBe("pending");

      const listed = (await sdk.trigger("mem::promotion-list", {
        project: PROJECT,
      })) as { candidates: PromotionCandidate[] };
      expect(
        listed.candidates.find((candidate) => candidate.category === "bug")
          ?.status,
      ).toBe("pending");
    },
  );

  it("replays a post-lesson-save crash without reinforcing the lesson twice", async () => {
    registerLessonsFunctions(sdk as never, kv as never);
    await kv.set(
      KV.observations("session-1"),
      "verified-crash-window",
      evidenceObservation(
        "verified-crash-window",
        "test",
        "verified",
        "2026-01-01T00:02:00.000Z",
        { sourceIds: ["test:crash-window:42"] },
      ),
    );

    const originalSet = kv.set.bind(kv);
    let candidateStatusWriteFailed = false;
    kv.set = async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (
        !candidateStatusWriteFailed &&
        scope === KV.promotionCandidates(PROJECT) &&
        (data as { status?: unknown }).status === "auto_promoted"
      ) {
        candidateStatusWriteFailed = true;
        const persistedBeforeCrash = structuredClone(
          data as PromotionCandidate,
        );
        persistedBeforeCrash.status = "pending";
        delete persistedBeforeCrash.promotedRecordId;
        delete persistedBeforeCrash.decidedAt;
        await originalSet(scope, key, persistedBeforeCrash as T);
        throw new Error("simulated crash after lesson persistence");
      }
      return originalSet(scope, key, data);
    };

    await expect(
      sdk.trigger("mem::promotion-generate", {
        sessionId: "session-1",
        project: PROJECT,
      }),
    ).rejects.toThrow("simulated crash after lesson persistence");

    const afterCrash = await kv.list<Lesson>(KV.lessons);
    expect(afterCrash).toHaveLength(1);
    expect(afterCrash[0]).toMatchObject({
      reinforcements: 0,
      appliedIdempotencyKeys: [expect.stringMatching(/^promo_/)],
    });

    const replay = (await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    })) as { success: boolean; promoted: number };
    expect(replay).toMatchObject({ success: true, promoted: 1 });

    const afterReplay = await kv.list<Lesson>(KV.lessons);
    expect(afterReplay).toHaveLength(1);
    expect(afterReplay[0]).toMatchObject({
      reinforcements: 0,
      appliedIdempotencyKeys: afterCrash[0].appliedIdempotencyKeys,
    });
    const candidates = await kv.list<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
    );
    expect(candidates).toContainEqual(
      expect.objectContaining({
        id: afterCrash[0].appliedIdempotencyKeys?.[0],
        status: "auto_promoted",
      }),
    );
  });

  it("keeps an explicitly accepted lesson candidate pending when lesson persistence fails", async () => {
    await kv.set(
      KV.observations("session-1"),
      "verified-manual",
      evidenceObservation(
        "verified-manual",
        "runtime",
        "verified",
        "2026-01-01T00:02:00.000Z",
        { sourceIds: ["runtime:deployment:42"] },
      ),
    );
    await kv.set<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
      "manual-bug",
      {
        id: "manual-bug",
        project: PROJECT,
        sessionId: "session-1",
        category: "bug",
        title: "Manually reviewed fix",
        content: "Authentication test failure was corrected.",
        status: "pending",
        requiresExplicitApproval: false,
        freshVerification: true,
        sourceObservationIds: ["failure", "verified-manual"],
        failureObservationIds: ["failure"],
        verificationObservationIds: ["verified-manual"],
        createdAt: "2026-01-01T00:05:00.000Z",
        updatedAt: "2026-01-01T00:05:00.000Z",
      },
    );
    sdk.registerFunction("mem::lesson-save", async () => ({
      success: false,
      error: "lesson store unavailable",
    }));

    const result = (await sdk.trigger("mem::promotion-decide", {
      project: PROJECT,
      candidateId: "manual-bug",
      action: "accept",
    })) as {
      success: boolean;
      error: {
        code: string;
        failures: Array<{ operation: string; target: string }>;
      };
      candidate: PromotionCandidate;
    };
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("PROMOTION_PERSISTENCE_FAILED");
    expect(result.error.failures[0]).toEqual(
      expect.objectContaining({ operation: "accept", target: "lesson" }),
    );
    expect(result.candidate.status).toBe("pending");

    const stored = await kv.get<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
      "manual-bug",
    );
    expect(stored?.status).toBe("pending");
  });

  it("keeps an explicitly accepted decision pending when memory persistence returns no id", async () => {
    await sdk.trigger("mem::promotion-generate", {
      sessionId: "session-1",
      project: PROJECT,
    });
    const listed = (await sdk.trigger("mem::promotion-list", {
      project: PROJECT,
    })) as { candidates: PromotionCandidate[] };
    const architecture = listed.candidates.find(
      (candidate) => candidate.category === "architecture",
    )!;
    sdk.registerFunction("mem::remember", async () => ({
      success: true,
      memory: {},
    }));

    const result = (await sdk.trigger("mem::promotion-decide", {
      project: PROJECT,
      candidateId: architecture.id,
      action: "accept",
      canonicalAdr: "docs/adr/001-service-boundary.md",
      commitSha: "b".repeat(40),
    })) as {
      success: boolean;
      error: {
        code: string;
        failures: Array<{
          operation: string;
          target: string;
          reason: string;
        }>;
      };
      candidate: PromotionCandidate;
    };
    expect(result.success).toBe(false);
    expect(result.error.code).toBe("PROMOTION_PERSISTENCE_FAILED");
    expect(result.error.failures[0]).toEqual(
      expect.objectContaining({
        operation: "accept",
        target: "memory",
        reason: "missing_record_id",
      }),
    );
    expect(result.candidate.status).toBe("pending");

    const stored = await kv.get<PromotionCandidate>(
      KV.promotionCandidates(PROJECT),
      architecture.id,
    );
    expect(stored?.status).toBe("pending");
  });
});
