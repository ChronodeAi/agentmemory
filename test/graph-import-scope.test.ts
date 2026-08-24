import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  bootLog: vi.fn(),
}));

import {
  registerGraphImportFunction,
} from "../src/functions/graph-import.js";
import type { GraphifyImportResult } from "../src/functions/graph-import.js";
import { KV } from "../src/state/schema.js";

// Client-supplied explicit paths must stay inside the project cwd and keep
// the graph.json basename; violations are rejected with a generic message
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

describe("mem::graph::import-graphify path scoping", () => {
  let tmp: string;
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
  });

  afterEach(() => {
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

  it("keeps the stat-failure pointer generic for explicit paths and specific for the default", async () => {
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

    const defaultResult = await trigger({
      cwd: join(tmp, "nowhere"),
      project: PROJECT,
    });
    expect(defaultResult.success).toBe(false);
    expect(defaultResult.error).toContain(
      join(tmp, "nowhere", "graphify-out", "graph.json"),
    );
    expect(defaultResult.path).toBe(
      join(tmp, "nowhere", "graphify-out", "graph.json"),
    );
    expect(dirname(missingExplicit)).toBeTruthy();
  });
});
