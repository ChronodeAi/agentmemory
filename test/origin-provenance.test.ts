import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    store,
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    update: async (
      scope: string,
      key: string,
      updates: Array<{ path: string; value: unknown }>,
    ) => {
      const m = store.get(scope);
      if (!m) return;
      const v = (m.get(key) as Record<string, unknown>) ?? {};
      for (const u of updates) v[u.path] = u.value;
      m.set(key, v);
    },
    delete: async (scope: string, key: string) => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      const m = store.get(scope);
      return m ? (Array.from(m.values()) as T[]) : [];
    },
  };
}

function mockSdk() {
  const fns = new Map<string, Function>();
  return {
    fns,
    registerFunction: (idOrOpts: string | { id: string }, fn: Function) => {
      const id = typeof idOrOpts === "string" ? idOrOpts : idOrOpts.id;
      fns.set(id, fn);
    },
    trigger: async (
      idOrInput: string | { function_id: string; payload: unknown },
      data?: unknown,
    ) => {
      const id =
        typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload = typeof idOrInput === "string" ? data : idOrInput.payload;
      const fn = fns.get(id);
      if (fn) return fn(payload);
      return null;
    },
  };
}

const PROJECT = "/home/user/myrepo";

async function withIndexPersistence(
  run: () => Promise<void>,
): Promise<void> {
  const search = await import("../src/functions/search.js");
  search.setIndexPersistence({
    scheduleSave: vi.fn(),
    save: vi.fn(async () => undefined),
  });
  try {
    await run();
  } finally {
    search.setIndexPersistence(null);
    search.setVectorIndex(null);
  }
}

describe("write-time origin provenance", () => {
  let lockRoot: string;
  let previousLockRoot: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    lockRoot = mkdtempSync(join(tmpdir(), "agentmemory-origin-locks-"));
    previousLockRoot = process.env["AGENTMEMORY_PROCESS_LOCK_DIR"];
    process.env["AGENTMEMORY_PROCESS_LOCK_DIR"] = lockRoot;
  });

  afterEach(() => {
    if (previousLockRoot === undefined) {
      delete process.env["AGENTMEMORY_PROCESS_LOCK_DIR"];
    } else {
      process.env["AGENTMEMORY_PROCESS_LOCK_DIR"] = previousLockRoot;
    }
    rmSync(lockRoot, { recursive: true, force: true });
  });

  it("stamps user channel on prompt_submit observations", async () => {
    await withIndexPersistence(async () => {
      const { registerObserveFunction } = await import(
        "../src/functions/observe.js"
      );
      const sdk = mockSdk();
      const kv = mockKV();
      registerObserveFunction(sdk as never, kv as never);

      await sdk.trigger("mem::observe", {
        sessionId: "ses_origin_user",
        project: PROJECT,
        cwd: PROJECT,
        hookType: "prompt_submit",
        timestamp: "2026-02-01T10:00:00.000Z",
        data: { prompt: "why is the graph empty" },
      });

      const raw = (await kv.list("mem:obs:ses_origin_user"))[0] as {
        origin?: { channel: string; capturedAt: string };
      };
      expect(raw.origin).toBeDefined();
      expect(raw.origin!.channel).toBe("user");
      expect(raw.origin!.capturedAt).toBe("2026-02-01T10:00:00.000Z");
    });
  });

  it("stamps tool channel with toolName detail on post_tool_use", async () => {
    await withIndexPersistence(async () => {
      const { registerObserveFunction } = await import(
        "../src/functions/observe.js"
      );
      const sdk = mockSdk();
      const kv = mockKV();
      registerObserveFunction(sdk as never, kv as never);

      await sdk.trigger("mem::observe", {
        sessionId: "ses_origin_tool",
        project: PROJECT,
        cwd: PROJECT,
        hookType: "post_tool_use",
        timestamp: "2026-02-01T10:01:00.000Z",
        data: { tool_name: "Bash", tool_input: { command: "ls" } },
      });

      const raw = (await kv.list("mem:obs:ses_origin_tool"))[0] as {
        origin?: { channel: string; detail?: string; capturedAt: string };
      };
      expect(raw.origin).toBeDefined();
      expect(raw.origin!.channel).toBe("tool");
      expect(raw.origin!.detail).toBe("Bash");
      expect(raw.origin!.capturedAt).toBe("2026-02-01T10:01:00.000Z");
    });
  });

  it("inherits origin through both compression paths", async () => {
    const raw = {
      id: "obs_o1",
      sessionId: "ses_origin_compress",
      timestamp: "2026-02-01T10:02:00.000Z",
      hookType: "post_tool_use" as const,
      toolName: "Edit",
      toolInput: { file_path: "src/a.ts" },
      raw: "",
      origin: {
        channel: "tool" as const,
        detail: "Edit",
        capturedAt: "2026-02-01T10:02:00.000Z",
      },
    };

    // Synthetic path.
    const { buildSyntheticCompression } = await import(
      "../src/functions/compress-synthetic.js"
    );
    const synthetic = buildSyntheticCompression(raw as never);
    expect(synthetic.origin).toEqual(raw.origin);

    // LLM path inherits the same block verbatim.
    const VALID_XML = `<type>file_edit</type>
<title>Edited a.ts</title>
<facts><fact>changed export</fact></facts>
<narrative>Updated the export statement</narrative>
<concepts><concept>modules</concept></concepts>
<files><file>src/a.ts</file></files>
<importance>5</importance>`;
    const provider = {
      name: "mock",
      compress: async () => VALID_XML,
      summarize: async () => "",
    };
    const kv = mockKV();
    await kv.set("mem:sessions", raw.sessionId, {
      id: raw.sessionId,
      project: PROJECT,
      cwd: PROJECT,
      startedAt: "2026-02-01T00:00:00Z",
      status: "active",
      observationCount: 1,
      privacy: "standard",
      externalProcessing: true,
    });
    const { registerCompressFunction } = await import(
      "../src/functions/compress.js"
    );
    const sdk = mockSdk();
    registerCompressFunction(sdk as never, kv as never, provider as never);

    const result = (await (
      sdk.fns.get("mem::compress") as Function
    )({
      observationId: raw.id,
      sessionId: raw.sessionId,
      raw,
    })) as { success: boolean };

    expect(result.success).toBe(true);
    const compressed = (await kv.get(
      "mem:obs:ses_origin_compress",
      raw.id,
    )) as Record<string, unknown> | null;
    expect(compressed).toBeTruthy();
    expect(compressed!["origin"]).toEqual(raw.origin);
  });

  it("stamps agent-channel origins on saved memories and import marks unmarked records", async () => {
    const { registerRememberFunction } = await import(
      "../src/functions/remember.js"
    );
    const sdk = mockSdk();
    const kv = mockKV();
    registerRememberFunction(sdk as never, kv as never);

    const saved = (await sdk.trigger("mem::remember", {
      content: "Chose sqlite WAL mode for the local queue.",
      concepts: ["sqlite", "queue"],
      files: ["src/queue.ts"],
      project: "github.com/example/repository",
    })) as { success: boolean; memory: { id: string; origin?: { channel: string } } };

    expect(saved.success).toBe(true);
    expect(saved.memory.origin).toBeDefined();
    expect(saved.memory.origin!.channel).toBe("agent");

    // Import path: a memory that already carries an origin keeps it; one
    // without is marked import-channel at its creation time.
    const { importOrigin } = await import("../src/types.js");
    const preExisting = {
      channel: "user" as const,
      capturedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(importOrigin(preExisting, "2026-02-01T10:03:00.000Z")).toBe(
      preExisting,
    );
    expect(importOrigin(undefined, "2026-02-01T10:03:00.000Z")).toEqual({
      channel: "import",
      capturedAt: "2026-02-01T10:03:00.000Z",
    });
  });
});
