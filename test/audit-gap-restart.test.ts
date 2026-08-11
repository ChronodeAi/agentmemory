import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const fixture = fileURLToPath(
  new URL("./fixtures/audit-gap-process.ts", import.meta.url),
);
const directories: string[] = [];
const execFileAsync = promisify(execFile);

function runProcess(
  mode: "seed" | "recover",
  state: string,
  spool: string,
  receipt: string,
  token = "canary",
): void {
  execFileSync(
    process.execPath,
    ["--import", "tsx", fixture, mode, state, spool, receipt, token],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
      timeout: 10_000,
    },
  );
}

describe("audit gap process-boundary recovery", () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("recovers the exact audit row after primary-state failure and process exit", () => {
    const directory = mkdtempSync(join(tmpdir(), "agentmemory-audit-restart-"));
    directories.push(directory);
    const state = join(directory, "state.json");
    const spool = join(directory, "audit-gaps.json");
    const seedReceipt = join(directory, "seed.json");
    const recoveryReceipt = join(directory, "recovery.json");

    runProcess("seed", state, spool, seedReceipt);
    const seed = JSON.parse(readFileSync(seedReceipt, "utf8")) as {
      seededByPid: number;
      gapCount: number;
      functionId: string;
    };
    expect(seed).toMatchObject({
      gapCount: 1,
      functionId: "process-boundary-canary",
    });

    runProcess("recover", state, spool, recoveryReceipt);
    const recovery = JSON.parse(readFileSync(recoveryReceipt, "utf8")) as {
      recoveredByPid: number;
      recovered: number;
      audits: Array<{ functionId: string; targetIds: string[] }>;
      health: { status: string; pending: number; recovered: number };
      spoolGapCount: number;
    };
    expect(recovery.recoveredByPid).not.toBe(seed.seededByPid);
    expect(recovery.recovered).toBe(1);
    expect(recovery.audits).toEqual([
      {
        id: expect.any(String),
        functionId: "process-boundary-canary",
        targetIds: ["synthetic-observation-canary"],
      },
    ]);
    expect(recovery.health).toMatchObject({
      status: "ready",
      pending: 0,
      recovered: 1,
    });
    expect(recovery.spoolGapCount).toBe(0);
  });

  it("preserves every audit gap written by concurrent processes", async () => {
    const directory = mkdtempSync(join(tmpdir(), "agentmemory-audit-concurrent-"));
    directories.push(directory);
    const state = join(directory, "state.json");
    const spool = join(directory, "audit-gaps.json");
    const tokens = Array.from({ length: 8 }, (_, index) => `writer-${index}`);

    await Promise.all(
      tokens.map((token) =>
        execFileAsync(
          process.execPath,
          [
            "--import",
            "tsx",
            fixture,
            "seed",
            state,
            spool,
            join(directory, `${token}.json`),
            token,
          ],
          {
            cwd: process.cwd(),
            env: process.env,
            timeout: 10_000,
          },
        ),
      ),
    );

    const recoveryReceipt = join(directory, "recovery.json");
    runProcess("recover", state, spool, recoveryReceipt);
    const recovery = JSON.parse(readFileSync(recoveryReceipt, "utf8")) as {
      recovered: number;
      audits: Array<{ functionId: string; targetIds: string[] }>;
      spoolGapCount: number;
    };
    expect(recovery.recovered).toBe(tokens.length);
    expect(recovery.audits.map((entry) => entry.functionId).sort()).toEqual(
      tokens.map((token) => `process-boundary-${token}`).sort(),
    );
    expect(recovery.audits.map((entry) => entry.targetIds[0]).sort()).toEqual(
      tokens.map((token) => `synthetic-observation-${token}`).sort(),
    );
    expect(recovery.spoolGapCount).toBe(0);
  });
});
