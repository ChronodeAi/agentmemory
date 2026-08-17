import { describe, expect, it } from "vitest";
import {
  CONTEXT_SOURCE_POLICIES,
  createSignedContextDeliveryReceipt,
  createSignedContextDeliveryVerifier,
  evaluateContextCandidate,
} from "../src/functions/coding-memory.js";

describe("context candidate eligibility", () => {
  it.each([
    [{ id: "expired", expiresAt: "2000-01-01T00:00:00.000Z" }, "expired"],
    [{ id: "deleted", deleted: true }, "deleted"],
    [{ id: "superseded", isLatest: false }, "superseded"],
    [{ id: "contradicted", contradicted: true }, "contradicted"],
    [
      { id: "gate", gateAuthority: true, status: "pending" },
      "unaccepted_gate_authority",
    ],
    [{ id: "recall", recalledOnly: true }, "recalled_only"],
    [{ title: "no source identity" }, "provenance_missing"],
  ] as const)("rejects ineligible candidates with reason %s", (candidate, reason) => {
    expect(
      evaluateContextCandidate(candidate, {
        contextClass: "gate-critical",
        now: Date.parse("2026-07-25T00:00:00.000Z"),
      }),
    ).toEqual({ eligible: false, reason });
  });

  it("declares source-specific required and optional gate policy", () => {
    expect(CONTEXT_SOURCE_POLICIES.slots.gateCritical).toBe("optional");
    expect(CONTEXT_SOURCE_POLICIES.profile.gateCritical).toBe("optional");
    expect(CONTEXT_SOURCE_POLICIES.lessons.gateCritical).toBe("required");
    expect(CONTEXT_SOURCE_POLICIES.episodic.gateCritical).toBe("required");
    expect(CONTEXT_SOURCE_POLICIES.file_history.gateCritical).toBe("required");
  });
});

describe("signed context delivery acknowledgement", () => {
  it("verifies a packet-bound receipt and rejects a different project", async () => {
    const secret = "distinct-context-ack-secret";
    const claims = {
      version: 1 as const,
      audience: "agentmemory:context-delivery" as const,
      packetId: "ctxpkt-1",
      project: "github.com/chronodeai/project-a",
      sessionId: "session-1",
      contextSha256: "digest",
      nonce: "nonce",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      providerId: "test-provider",
      receiptId: "receipt-1",
    };
    const providerReceipt = createSignedContextDeliveryReceipt(claims, secret);
    const verify = createSignedContextDeliveryVerifier(secret);
    const input = {
      providerReceipt,
      packetId: claims.packetId,
      project: claims.project,
      sessionId: claims.sessionId,
      sourceIds: ["source-1"],
      contextSha256: claims.contextSha256,
      nonce: claims.nonce,
      generatedAt: new Date().toISOString(),
      expiresAt: claims.expiresAt,
    };

    await expect(verify(input)).resolves.toEqual({
      verified: true,
      providerId: "test-provider",
      receiptId: "receipt-1",
    });
    await expect(
      verify({ ...input, project: "github.com/chronodeai/project-b" }),
    ).resolves.toMatchObject({
      verified: false,
      error: "context acknowledgement does not match packet",
    });
  });
});
