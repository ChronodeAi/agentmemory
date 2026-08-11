import { writeFileSync } from "node:fs";
import { InMemoryKV } from "../../src/mcp/in-memory-kv.js";
import { KV } from "../../src/state/schema.js";
import {
  reconcileBackgroundPipelines,
  registerEventTriggers,
} from "../../src/triggers/events.js";
import type { Session } from "../../src/types.js";

type UpdateOperation = {
  type: "set";
  path: string;
  value: unknown;
};

class PersistedTestKV extends InMemoryKV {
  override async set<T = unknown>(
    scope: string,
    key: string,
    data: T,
  ): Promise<T> {
    const result = await super.set(scope, key, data);
    this.persist();
    return result;
  }

  override async delete(scope: string, key: string): Promise<void> {
    await super.delete(scope, key);
    this.persist();
  }

  async update<T = unknown>(
    scope: string,
    key: string,
    operations: UpdateOperation[],
  ): Promise<T> {
    const current = (await this.get<Record<string, unknown>>(scope, key)) ?? {};
    const next = structuredClone(current);
    for (const operation of operations) {
      const segments = operation.path.split(".").filter(Boolean);
      let target: Record<string, unknown> = next;
      for (const segment of segments.slice(0, -1)) {
        const child = target[segment];
        if (!child || typeof child !== "object" || Array.isArray(child)) {
          target[segment] = {};
        }
        target = target[segment] as Record<string, unknown>;
      }
      target[segments.at(-1)!] = operation.value;
    }
    return this.set(scope, key, next as T);
  }
}

type Handler = (payload: unknown) => Promise<unknown> | unknown;

function createSdk() {
  const functions = new Map<string, Handler>();
  return {
    registerFunction(
      idOrOptions: string | { id: string },
      handler: Handler,
    ): void {
      const id =
        typeof idOrOptions === "string" ? idOrOptions : idOrOptions.id;
      functions.set(id, handler);
    },
    registerTrigger(): void {},
    async trigger(
      idOrInput:
        | string
        | { function_id: string; payload: unknown; action?: unknown },
      payload?: unknown,
    ): Promise<unknown> {
      const id =
        typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const input =
        typeof idOrInput === "string" ? payload : idOrInput.payload;
      const handler = functions.get(id);
      if (!handler) throw new Error(`No function: ${id}`);
      return handler(input);
    },
  };
}

function session(
  id: string,
  status: NonNullable<Session["backgroundPipelineStatus"]>,
  attempts: number,
): Session {
  return {
    id,
    project: "github.com/example/restart-canary",
    cwd: "/tmp/restart-canary",
    startedAt: "2026-08-11T00:00:00.000Z",
    endedAt: "2026-08-11T00:01:00.000Z",
    status: "completed",
    observationCount: 0,
    backgroundPipelineRunId: `pipeline-${id}`,
    backgroundPipelineStatus: status,
    backgroundPipelineStage:
      status === "accepted" ? "dispatch" : "summary",
    backgroundPipelineAttempts: attempts,
    backgroundPipelineAcceptedAt: "2026-08-11T00:01:00.000Z",
    ...(status === "failed"
      ? {
          backgroundPipelineErrorCode: "SIMULATED_CRASH",
          backgroundPipelineFinishedAt: "2026-08-11T00:01:30.000Z",
        }
      : {}),
  };
}

async function waitForTerminalState(
  kv: PersistedTestKV,
  ids: string[],
): Promise<Session[]> {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const sessions = await Promise.all(
      ids.map((id) => kv.get<Session>(KV.sessions, id)),
    );
    if (
      sessions.every(
        (entry) =>
          entry?.backgroundPipelineStatus === "succeeded" ||
          (entry?.backgroundPipelineStatus === "failed" &&
            (entry.backgroundPipelineAttempts ?? 0) >= 3),
      )
    ) {
      return sessions as Session[];
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("replayed background pipelines did not reach terminal state");
}

const [mode, statePath, receiptPath] = process.argv.slice(2);
if (!mode || !statePath || !receiptPath) {
  throw new Error("usage: background-pipeline-process <seed|recover> <state> <receipt>");
}

const kv = new PersistedTestKV(statePath);
if (mode === "seed") {
  await kv.set(KV.sessions, "accepted", session("accepted", "accepted", 0));
  await kv.set(KV.sessions, "running", session("running", "running", 1));
  await kv.set(KV.sessions, "retryable", session("retryable", "failed", 2));
  await kv.set(KV.sessions, "exhausted", session("exhausted", "failed", 3));
  writeFileSync(receiptPath, JSON.stringify({ seededByPid: process.pid }));
} else if (mode === "recover") {
  const sdk = createSdk();
  sdk.registerFunction("mem::summarize", async () => ({ success: true }));
  sdk.registerFunction("mem::promotion-generate", async () => ({
    success: true,
    candidates: [],
    promoted: 0,
  }));
  registerEventTriggers(sdk as never, kv as never);
  const reconciliation = await reconcileBackgroundPipelines(
    sdk as never,
    kv as never,
  );
  const sessions = await waitForTerminalState(kv, [
    "accepted",
    "running",
    "retryable",
    "exhausted",
  ]);
  writeFileSync(
    receiptPath,
    JSON.stringify({
      recoveredByPid: process.pid,
      reconciliation,
      sessions: sessions.map((entry) => ({
        id: entry.id,
        status: entry.backgroundPipelineStatus,
        attempts: entry.backgroundPipelineAttempts,
        errorCode: entry.backgroundPipelineErrorCode ?? null,
      })),
    }),
  );
} else {
  throw new Error(`unknown mode: ${mode}`);
}
