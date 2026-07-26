import { afterEach, describe, expect, it, vi } from "vitest";
import { PROJECT_CAPABILITY_PROJECT_HEADER } from "../src/auth.js";
import { deliverProjectRequest } from "../src/hooks/_delivery.js";
import {
  deliverObservation,
  reportObservationDeliveryFailure,
} from "../src/hooks/_observe-delivery.js";

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_EXIT_CODE = process.exitCode;

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.exitCode = ORIGINAL_EXIT_CODE;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("hook project delivery", () => {
  it("retries transient failures and binds the exact project", async () => {
    process.env["AGENTMEMORY_URL"] = "http://memory.invalid";
    process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"] = "true";
    process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET"] = "test-secret";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, retryable: true, error: "busy" }),
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, stored: true }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deliverProjectRequest(
        "/agentmemory/session/commit",
        "github.com/example/project",
        { project: "github.com/example/project", sha: "abc123" },
        { attempts: 2, timeoutMs: 250 },
      ),
    ).resolves.toMatchObject({ success: true, stored: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(request.headers).toMatchObject({
      [PROJECT_CAPABILITY_PROJECT_HEADER]: "github.com/example/project",
      Authorization: expect.stringMatching(/^Bearer /),
    });
  });

  it("rejects an application-level failure returned with HTTP 200", async () => {
    process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"] = "false";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: "project mismatch" }),
          { status: 200 },
        ),
      ),
    );

    await expect(
      deliverProjectRequest(
        "/agentmemory/session/end",
        "github.com/example/project",
        {
          project: "github.com/example/project",
          sessionId: "ses_test",
        },
        { timeoutMs: 250 },
      ),
    ).rejects.toThrow("project mismatch");
  });

  it("never treats an empty HTTP 200 response as successful delivery", async () => {
    process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"] = "true";
    process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET"] = "test-secret";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deliverProjectRequest(
        "/agentmemory/session/end",
        "github.com/example/project",
        {
          project: "github.com/example/project",
          sessionId: "ses_test",
        },
        { attempts: 1, timeoutMs: 250 },
      ),
    ).rejects.toThrow("invalid JSON object");

    await expect(
      deliverObservation({
        project: "github.com/example/project",
        session_id: "ses_test",
        hook_event_name: "PostToolUse",
      }),
    ).rejects.toThrow("invalid JSON object");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("reports telemetry delivery failure without failing the host command", () => {
    const write = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);
    process.exitCode = undefined;

    reportObservationDeliveryFailure(new Error("memory service unavailable"));

    expect(write).toHaveBeenCalledWith(
      "[agentmemory] memory service unavailable\n",
    );
    expect(process.exitCode).toBeUndefined();
  });
});
