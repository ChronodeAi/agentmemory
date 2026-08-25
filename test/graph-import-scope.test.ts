import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  bootLog: vi.fn(),
}));

import {
  registerGraphImportFunction,
} from "../src/functions/graph-import.js";
import type { GraphifyImportResult } from "../src/functions/graph-import.js";
import { registerApiTriggers } from "../src/triggers/api.js";
import { createProjectCapabilityToken } from "../src/auth.js";
import { KV } from "../src/state/schema.js";

// The engine anchors every path decision to its own process.cwd(): a
// client-supplied cwd is ignored, explicit paths must stay a graph.json
// under that directory, and on the REST surface any request carrying path
// or cwd is admin-gated. Violations are rejected with a generic message
// that does not echo the attempted path.
const FIXTURE = JSON.stringify({
  nodes: [{ id: "n1", label: "extract", file_type: "code" }],
  links: [],
});
const PROJECT = "github.com/example/repository";

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
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> =>
      Array.from(store.get(scope)?.values() ?? []) as T[],
    _store: store,
  };
}

type Handler = (payload?: unknown) => Promise<unknown>;

function integratedHarness() {
  const functions = new Map<string, Handler>();
  const sdk = {
    registerFunction: (
      idOrOptions: string | { id: string },
      handler: Handler,
    ) => {
      const id =
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id;
      functions.set(id, handler);
    },
    registerTrigger: () => {},
    // Route handlers dispatch into the real registered functions, so the
    // REST gating and the engine containment are exercised end to end.
    trigger: async (input: { function_id: string; payload: unknown }) => {
      const fn = functions.get(input.function_id);
      if (!fn) throw new Error(`No function: ${input.function_id}`);
      return fn(input.payload);
    },
  };
  return { sdk, functions };
}

describe("mem::graph::import-graphify path scoping", () => {
  let tmp: string;
  let originalCwd: string;
  let kv: ReturnType<typeof mockKV>;
  let trigger: (payload: unknown) => Promise<GraphifyImportResult>;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "am-graphify-scope-"));
    mkdirSync(join(tmp, "graphify-out"), { recursive: true });
    writeFileSync(join(tmp, "graphify-out", "graph.json"), FIXTURE);
    kv = mockKV();
    const sdk = {
      registerFunction: (
        _id: string,
        handler: (payload?: unknown) => Promise<GraphifyImportResult>,
      ) => {
        trigger = (payload: unknown) => handler(payload);
      },
      registerTrigger: () => {},
    } as never;
    registerGraphImportFunction(sdk, kv as never);
    originalCwd = process.cwd();
    process.chdir(tmp);
    // process.cwd() canonicalizes symlinked parents (macOS /var -> /private/var),
    // and the engine anchors to it — derive every expectation from this value.
    tmp = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("rejects an absolute graph.json outside the cwd without echoing the path", async () => {
    const other = mkdtempSync(join(tmpdir(), "am-graphify-outside-"));
    try {
      const outside = join(other, "graph.json");
      writeFileSync(outside, FIXTURE);
      const result = await trigger({ path: outside, cwd: tmp, project: PROJECT });
      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "path must be a graph.json inside the project cwd",
      );
      expect(JSON.stringify(result)).not.toContain(outside);
      expect(await kv.list(KV.graphNodes)).toHaveLength(0);
    } finally {
      rmSync(other, { recursive: true, force: true });
    }
  });

  it("rejects a wrong basename inside the cwd", async () => {
    const sneaky = join(tmp, "export-graph.json");
    writeFileSync(sneaky, FIXTURE);
    const result = await trigger({ path: sneaky, cwd: tmp, project: PROJECT });
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "path must be a graph.json inside the project cwd",
    );
    expect(JSON.stringify(result)).not.toContain(sneaky);
  });

  it("still imports a valid <cwd>/graphify-out/graph.json passed explicitly", async () => {
    const result = await trigger({
      path: join(tmp, "graphify-out", "graph.json"),
      cwd: tmp,
      project: PROJECT,
    });
    expect(result.success).toBe(true);
    expect(result.nodesImported).toBe(1);
    expect(await kv.list(KV.graphNodes)).toHaveLength(1);
  });

  it("ignores a client-supplied cwd and computes the default from the daemon cwd", async () => {
    // The fixture exists at <daemon cwd>/graphify-out/graph.json; a caller
    // pointing cwd elsewhere must not relocate the read.
    const decoy = mkdtempSync(join(tmpdir(), "am-graphify-decoy-"));
    try {
      mkdirSync(join(decoy, "graphify-out"), { recursive: true });
      writeFileSync(
        join(decoy, "graphify-out", "graph.json"),
        JSON.stringify({ nodes: [{ id: "evil", label: "evil" }] }),
      );
      const result = await trigger({ cwd: decoy, project: PROJECT });
      expect(result.success).toBe(true);
      expect(result.path).toBe(join(tmp, "graphify-out", "graph.json"));
      const imported = await kv.list(KV.graphNodes);
      expect(imported).toHaveLength(1);
      expect((imported[0] as { name?: string }).name).toBe("extract");
    } finally {
      rmSync(decoy, { recursive: true, force: true });
    }
  });

  it("fails honestly when the default artifact is absent at the daemon cwd", async () => {
    rmSync(join(tmp, "graphify-out", "graph.json"));
    const result = await trigger({ project: PROJECT });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Run graphify first");
  });

  it("keeps the stat-failure pointer generic for explicit paths", async () => {
    const missingExplicit = join(tmp, "missing-dir", "graph.json");
    const explicitResult = await trigger({
      path: missingExplicit,
      cwd: tmp,
      project: PROJECT,
    });
    expect(explicitResult.success).toBe(false);
    expect(explicitResult.error).toContain("Run graphify first");
    expect(explicitResult.error).not.toContain(missingExplicit);
    expect(explicitResult.path).toBeUndefined();
  });

  it("reports the exact default path on stat failure at the daemon cwd", async () => {
    // The client cannot steer the default lookup (no cwd field is honored),
    // so its stat failure may safely name the concrete location.
    rmSync(join(tmp, "graphify-out", "graph.json"));
    const result = await trigger({ project: PROJECT });
    expect(result.success).toBe(false);
    expect(result.error).toContain(join(tmp, "graphify-out", "graph.json"));
    expect(result.path).toBe(join(tmp, "graphify-out", "graph.json"));
  });
});

describe("api::graph-import-graphify path/cwd admin gating", () => {
  let tmp: string;
  let originalCwd: string;

  function capabilityHeaders(project: string): Record<string, string> {
    const now = Math.floor(Date.now() / 1000);
    const token = createProjectCapabilityToken(
      {
        version: 1,
        audience: "agentmemory",
        project,
        expiresAt: now + 60,
        issuedAt: now,
      },
      "capability-secret",
    );
    return { authorization: `Bearer ${token}` };
  }

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "am-graphify-route-"));
    mkdirSync(join(tmp, "graphify-out"), { recursive: true });
    writeFileSync(join(tmp, "graphify-out", "graph.json"), FIXTURE);
    originalCwd = process.cwd();
    process.chdir(tmp);
    // Canonicalize like the engine's process.cwd() anchor (macOS /var -> /private/var).
    tmp = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  function registerRoute() {
    const { sdk, functions } = integratedHarness();
    registerGraphImportFunction(sdk as never, mockKV() as never);
    registerApiTriggers(
      sdk as never,
      mockKV() as never,
      "legacy-secret",
      undefined,
      undefined,
      "admin-secret",
      "capability-secret",
      true,
    );
    return (
      body: Record<string, unknown>,
      headers?: Record<string, string>,
    ): Promise<{ status_code: number; body: Record<string, unknown> }> =>
      functions.get("api::graph-import-graphify")!({
        headers,
        query_params: {},
        body,
      }) as Promise<{ status_code: number; body: Record<string, unknown> }>;
  }

  it("rejects a capability request carrying an explicit path with 401", async () => {
    const route = registerRoute();
    const response = await route(
      { project: PROJECT, path: join(tmp, "graphify-out", "graph.json") },
      capabilityHeaders(PROJECT),
    );
    expect(response.status_code).toBe(401);
    expect(response.body).toEqual({ error: "global_unauthorized" });
  });

  it("rejects a capability request carrying only cwd with 401", async () => {
    const route = registerRoute();
    const response = await route(
      { project: PROJECT, cwd: tmp },
      capabilityHeaders(PROJECT),
    );
    expect(response.status_code).toBe(401);
    expect(response.body).toEqual({ error: "global_unauthorized" });
  });

  it("proceeds without path/cwd and imports the default daemon-cwd artifact", async () => {
    const route = registerRoute();
    const response = await route(
      { project: PROJECT },
      capabilityHeaders(PROJECT),
    );
    expect(response.status_code).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      path: join(tmp, "graphify-out", "graph.json"),
      nodesImported: 1,
    });
  });

  it("fails honestly when the default artifact is absent for a capability request", async () => {
    const route = registerRoute();
    rmSync(join(tmp, "graphify-out", "graph.json"));
    const response = await route({ project: PROJECT }, capabilityHeaders(PROJECT));
    expect(response.body).toMatchObject({ success: false });
    expect(String(response.body.error)).toContain("Run graphify first");
  });

  it("rejects an admin explicit path outside the daemon cwd generically", async () => {
    const route = registerRoute();
    const outsideDir = mkdtempSync(join(tmpdir(), "am-graphify-route-out-"));
    try {
      const outside = join(outsideDir, "graph.json");
      writeFileSync(outside, FIXTURE);
      const response = await route(
        { project: PROJECT, path: outside },
        { authorization: "Bearer admin-secret" },
      );
      expect(response.status_code).toBe(400);
      expect(response.body).toMatchObject({
        success: false,
        error: "path must be a graph.json inside the project cwd",
      });
      expect(JSON.stringify(response.body)).not.toContain(outside);
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("imports an admin explicit graph.json inside the daemon cwd", async () => {
    const route = registerRoute();
    const response = await route(
      { project: PROJECT, path: join(tmp, "graphify-out", "graph.json") },
      { authorization: "Bearer admin-secret" },
    );
    expect(response.status_code).toBe(200);
    expect(response.body).toMatchObject({ success: true, nodesImported: 1 });
  });
});
