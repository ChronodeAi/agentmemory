import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const fixture = fileURLToPath(
  new URL("./fixtures/background-pipeline-process.ts", import.meta.url),
);
const directories: string[] = [];

function runProcess(mode: "seed" | "recover", state: string, receipt: string) {
  execFileSync(
    process.execPath,
    ["--import", "tsx", fixture, mode, state, receipt],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        AGENTMEMORY_REFLECT: "false",
        GRAPH_EXTRACTION_ENABLED: "false",
      },
      stdio: "pipe",
      timeout: 10_000,
    },
  );
}

describe("background pipeline process-boundary recovery", () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("replays accepted and interrupted work while preserving exhausted failures", () => {
    const directory = mkdtempSync(join(tmpdir(), "agentmemory-restart-"));
    directories.push(directory);
    const state = join(directory, "state.json");
    const seedReceipt = join(directory, "seed.json");
    const recoveryReceipt = join(directory, "recovery.json");

    runProcess("seed", state, seedReceipt);
    const seed = JSON.parse(readFileSync(seedReceipt, "utf8")) as {
      seededByPid: number;
    };
    runProcess("recover", state, recoveryReceipt);
    const recovery = JSON.parse(readFileSync(recoveryReceipt, "utf8")) as {
      recoveredByPid: number;
      reconciliation: { replayed: number; exhausted: number };
      sessions: Array<{
        id: string;
        status: string;
        attempts: number;
        errorCode: string | null;
      }>;
    };

    expect(recovery.recoveredByPid).not.toBe(seed.seededByPid);
    expect(recovery.reconciliation).toEqual({ replayed: 3, exhausted: 1 });
    expect(recovery.sessions).toEqual([
      { id: "accepted", status: "succeeded", attempts: 1, errorCode: null },
      { id: "running", status: "succeeded", attempts: 2, errorCode: null },
      { id: "retryable", status: "succeeded", attempts: 3, errorCode: null },
      {
        id: "exhausted",
        status: "failed",
        attempts: 3,
        errorCode: "SIMULATED_CRASH",
      },
    ]);
  });
});
