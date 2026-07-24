import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EXTERNAL_PROCESSING_DISABLED_ERROR,
  modelProcessingForProject,
  modelProcessingForSession,
} from "../src/functions/model-processing.js";
import { KV } from "../src/state/schema.js";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    list: async <T>(scope: string): Promise<T[]> =>
      Array.from(store.get(scope)?.values() ?? []) as T[],
  };
}

function session(
  id: string,
  project: string,
  privacy: "standard" | "strict",
) {
  return {
    id,
    project,
    cwd: "/tmp/project",
    startedAt: new Date().toISOString(),
    status: "active" as const,
    observationCount: 0,
    privacy,
    externalProcessing: privacy !== "strict",
  };
}

describe("model processing policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("blocks session and project processing for strict records", async () => {
    vi.stubEnv("AGENTMEMORY_LOCAL_PROCESSING", "false");
    const kv = mockKV();
    await kv.set(
      KV.sessions,
      "strict-session",
      session("strict-session", "github.com/example/strict", "strict"),
    );

    const bySession = await modelProcessingForSession(
      kv as never,
      "strict-session",
    );
    const byProject = await modelProcessingForProject(
      kv as never,
      "github.com/example/strict",
    );

    expect(bySession).toMatchObject({
      allowed: false,
      error: EXTERNAL_PROCESSING_DISABLED_ERROR,
    });
    expect(byProject).toMatchObject({
      allowed: false,
      error: EXTERNAL_PROCESSING_DISABLED_ERROR,
    });
  });

  it("allows strict records only after explicit local-processing enablement", async () => {
    vi.stubEnv("AGENTMEMORY_LOCAL_PROCESSING", "true");
    const kv = mockKV();
    await kv.set(
      KV.sessions,
      "strict-session",
      session("strict-session", "github.com/example/strict", "strict"),
    );

    await expect(
      modelProcessingForSession(kv as never, "strict-session"),
    ).resolves.toMatchObject({ allowed: true, mode: "local" });
  });
});
