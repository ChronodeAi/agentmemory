import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/config.js", () => ({
  getAgentId: vi.fn(() => undefined),
  getConsolidationCooldownMs: vi.fn(() => 300_000),
  getEnvVar: vi.fn(() => undefined),
  isConsolidationEnabled: vi.fn(() => true),
  isGraphExtractionEnabled: vi.fn(() => false),
}));
vi.mock("../src/functions/slots.js", () => ({
  isReflectEnabled: vi.fn(() => false),
}));
vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getConsolidationCooldownMs } from "../src/config.js";
import { registerEventTriggers } from "../src/triggers/events.js";
import { KV } from "../src/state/schema.js";

function persistentKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: vi.fn(async (scope: string, key: string) => store.get(scope)?.get(key) ?? null),
    set: vi.fn(async (scope: string, key: string, value: unknown) => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, value);
      return value;
    }),
    delete: vi.fn(async (scope: string, key: string) => store.get(scope)?.delete(key)),
    update: vi.fn(async () => {}),
    list: vi.fn(async () => []),
    seedSession: (id: string, project: string) => {
      if (!store.has(KV.sessions)) store.set(KV.sessions, new Map());
      store.get(KV.sessions)!.set(id, {
        id,
        project,
        cwd: "/repo",
        startedAt: "2026-08-07T00:00:00.000Z",
        status: "active",
        observationCount: 0,
      });
    },
  };
}

function mockSdk(rejectFor?: string) {
  const handlers = new Map<string, Function>();
  const trigger = vi.fn(async (input: { function_id: string; payload?: unknown }) => {
    if (input.function_id === rejectFor) throw new Error("synthetic failure");
    if (input.function_id === "mem::summarize") return { success: true };
    if (input.function_id === "mem::promotion-generate") return { success: true };
    return { success: true };
  });
  return {
    sdk: {
      registerFunction: (id: string, handler: Function) => handlers.set(id, handler),
      registerTrigger: () => {},
      trigger,
    },
    handlers,
    trigger,
  };
}

function callsFor(trigger: ReturnType<typeof vi.fn>, functionId: string) {
  return trigger.mock.calls.filter(
    (call) => (call[0] as { function_id: string }).function_id === functionId,
  );
}

describe("project-scoped session-stop consolidation", () => {
  beforeEach(() => {
    vi.mocked(getConsolidationCooldownMs).mockReturnValue(300_000);
  });

  it("runs once per project and carries canonical project scope", async () => {
    const kv = persistentKV();
    kv.seedSession("s1", "github.com/acme/a");
    kv.seedSession("s2", "github.com/acme/b");
    const { sdk, handlers, trigger } = mockSdk();
    registerEventTriggers(sdk as never, kv as never);
    const stopped = handlers.get("event::session::stopped")!;

    await stopped({ sessionId: "s1", project: "github.com/acme/a" });
    await stopped({ sessionId: "s1", project: "github.com/acme/a" });
    await stopped({ sessionId: "s2", project: "github.com/acme/b" });

    const consolidate = callsFor(trigger, "mem::consolidate-pipeline");
    expect(consolidate).toHaveLength(2);
    expect(consolidate.map((call) => call[0].payload)).toEqual([
      { tier: "all", force: true, project: "github.com/acme/a" },
      { tier: "all", force: true, project: "github.com/acme/b" },
    ]);
    expect(callsFor(trigger, "mem::auto-crystallize")).toHaveLength(2);
  });

  it("serializes concurrent stops and honors recovery suppression", async () => {
    const kv = persistentKV();
    kv.seedSession("s1", "github.com/acme/a");
    const { sdk, handlers, trigger } = mockSdk();
    registerEventTriggers(sdk as never, kv as never);
    const stopped = handlers.get("event::session::stopped")!;

    await Promise.all([
      stopped({ sessionId: "s1", project: "github.com/acme/a" }),
      stopped({ sessionId: "s1", project: "github.com/acme/a" }),
      stopped({
        sessionId: "s1",
        project: "github.com/acme/a",
        skipConsolidation: true,
      }),
    ]);

    expect(callsFor(trigger, "mem::consolidate-pipeline")).toHaveLength(1);
  });

  it("does not process a mismatched project", async () => {
    const kv = persistentKV();
    kv.seedSession("s1", "github.com/acme/a");
    const { sdk, handlers, trigger } = mockSdk();
    registerEventTriggers(sdk as never, kv as never);

    const result = await handlers.get("event::session::stopped")!({
      sessionId: "s1",
      project: "github.com/acme/b",
    });
    expect(result).toEqual({
      success: false,
      error: "session_not_found_or_project_mismatch",
    });
    expect(callsFor(trigger, "mem::summarize")).toHaveLength(0);
  });

  it("clears the reservation after a scheduling failure so the next stop retries", async () => {
    const kv = persistentKV();
    kv.seedSession("s1", "github.com/acme/a");
    const failed = mockSdk("mem::consolidate-pipeline");
    registerEventTriggers(failed.sdk as never, kv as never);
    await failed.handlers.get("event::session::stopped")!({
      sessionId: "s1",
      project: "github.com/acme/a",
    });

    const retry = mockSdk();
    registerEventTriggers(retry.sdk as never, kv as never);
    await retry.handlers.get("event::session::stopped")!({
      sessionId: "s1",
      project: "github.com/acme/a",
    });
    expect(callsFor(retry.trigger, "mem::consolidate-pipeline")).toHaveLength(1);
  });
});

describe("session-end hook ownership", () => {
  const source = readFileSync("src/hooks/session-end.ts", "utf8");

  it("leaves consolidation to the server-side stop lifecycle", () => {
    expect(source).toContain("/agentmemory/session/end");
    expect(source).not.toContain("/agentmemory/crystals/auto");
    expect(source).not.toContain("/agentmemory/consolidate-pipeline");
    expect(source).not.toContain("CONSOLIDATION_ENABLED");
  });
});
