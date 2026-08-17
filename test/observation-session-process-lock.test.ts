import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { withProcessLock } from "../src/state/process-lock.js";

const fixture = fileURLToPath(
  new URL("./fixtures/observation-session-process.ts", import.meta.url),
);
const directories: string[] = [];

function run(
  state: string,
  receipt: string,
  lockRoot: string,
  project: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        fixture,
        state,
        receipt,
        "shared-session",
        project,
        "/tmp/shared",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, AGENTMEMORY_PROCESS_LOCK_DIR: lockRoot },
        stdio: "pipe",
      },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`fixture exited ${code}: ${stderr}`));
    });
  });
}

describe("observation session cross-process ownership", () => {
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("allows exactly one project to establish a missing session", async () => {
    const directory = mkdtempSync(join(tmpdir(), "agentmemory-session-lock-"));
    directories.push(directory);
    const state = join(directory, "state.json");
    const receiptA = join(directory, "a.json");
    const receiptB = join(directory, "b.json");
    const lockRoot = join(directory, "locks");

    await Promise.all([
      run(state, receiptA, lockRoot, "github.com/example/a"),
      run(state, receiptB, lockRoot, "github.com/example/b"),
    ]);
    const receipts = [receiptA, receiptB].map(
      (path) => JSON.parse(readFileSync(path, "utf8")) as {
        result: { success: boolean; created?: boolean; error?: string };
      },
    );
    expect(receipts.filter((receipt) => receipt.result.success)).toHaveLength(1);
    expect(
      receipts.filter((receipt) => !receipt.result.success)[0]?.result.error,
    ).toMatch(/session project does not match observation/);
    const persisted = JSON.parse(readFileSync(state, "utf8")) as Record<
      string,
      { project: string }
    >;
    expect([
      "github.com/example/a",
      "github.com/example/b",
    ]).toContain(persisted["shared-session"]?.project);
  });

  it("immediately reaps a completely published lock whose owner died", async () => {
    const directory = mkdtempSync(join(tmpdir(), "agentmemory-dead-lock-"));
    directories.push(directory);
    const key = "restart-after-crash";
    const digest = createHash("sha256").update(key).digest("hex");
    const lockPath = join(directory, `${digest}.lock`);
    mkdirSync(lockPath, { recursive: true });
    writeFileSync(
      join(lockPath, "owner.json"),
      JSON.stringify({
        pid: 2_147_483_647,
        token: "dead-owner",
        acquiredAt: new Date().toISOString(),
      }),
      "utf8",
    );

    await expect(
      withProcessLock(key, async () => "acquired", {
        root: directory,
        timeoutMs: 250,
        staleAfterMs: 60_000,
      }),
    ).resolves.toBe("acquired");
  });
});
