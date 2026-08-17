import { describe, expect, it } from "vitest";
import {
  closeStaleSessions,
  startOrResumeSession,
} from "../src/functions/session-lifecycle.js";
import { KV } from "../src/state/schema.js";
import { mockKV } from "./helpers/mocks.js";
import type { Session } from "../src/types.js";

describe("project-scoped session lifecycle", () => {
  it("starts idempotently, resumes once, and rejects project collisions", async () => {
    const kv = mockKV();
    const input = {
      sessionId: "session-1",
      project: "github.com/example/one",
      cwd: "/tmp/one",
    };
    const first = await startOrResumeSession(kv as never, input);
    const again = await startOrResumeSession(kv as never, input);
    expect(first.resumed).toBe(false);
    expect(again.resumed).toBe(false);
    expect(first.session.retainedObservationCount).toBe(0);

    await kv.set<Session>(KV.sessions, "session-1", {
      ...again.session,
      status: "completed",
      endedAt: new Date().toISOString(),
    });
    const resumed = await startOrResumeSession(kv as never, input);
    expect(resumed.resumed).toBe(true);
    expect(resumed.session.resumeCount).toBe(1);

    await expect(
      startOrResumeSession(kv as never, {
        ...input,
        project: "github.com/example/two",
      }),
    ).rejects.toThrow(/already belongs/);
  });

  it("links child sessions and closes stale sessions without deleting them", async () => {
    const kv = mockKV();
    await startOrResumeSession(kv as never, {
      sessionId: "parent",
      project: "github.com/example/project",
      cwd: "/tmp/project",
    });
    await startOrResumeSession(kv as never, {
      sessionId: "child",
      parentSessionId: "parent",
      project: "github.com/example/project",
      cwd: "/tmp/project",
    });
    const parent = await kv.get<Session>(KV.sessions, "parent");
    expect(parent?.childSessionIds).toEqual(["child"]);

    await kv.set<Session>(KV.sessions, "parent", {
      ...parent!,
      updatedAt: "2020-01-01T00:00:00.000Z",
    });
    expect(
      await closeStaleSessions(
        kv as never,
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe(1);
    const stale = await kv.get<Session>(KV.sessions, "parent");
    expect(stale?.status).toBe("abandoned");
    expect(stale?.staleClosedAt).toBeDefined();
  });
});
