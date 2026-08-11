import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { ensureObservationSession } from "../../src/functions/observe.js";

const [statePath, receiptPath, sessionId, project, cwd] = process.argv.slice(2);
if (!statePath || !receiptPath || !sessionId || !project || !cwd) {
  throw new Error("missing observation-session fixture arguments");
}

function readState(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(statePath, "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const kv = {
  get: async (_scope: string, key: string) => readState()[key] ?? null,
  set: async (_scope: string, key: string, value: unknown) => {
    const state = readState();
    state[key] = value;
    const temporary = `${statePath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(state)}\n`, "utf8");
    renameSync(temporary, statePath);
    return value;
  },
};

const result = await ensureObservationSession(kv as never, {
  sessionId,
  project,
  cwd,
  timestamp: new Date().toISOString(),
});
writeFileSync(
  receiptPath,
  `${JSON.stringify({ pid: process.pid, result })}\n`,
  "utf8",
);
