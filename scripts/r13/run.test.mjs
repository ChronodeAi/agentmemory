import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

import {
  isAcceptedNode,
  normalizeTestPath,
  processTreeMetrics,
  processTreeRss,
  sha256,
  terminateProcessTree,
} from "./lib.mjs";

test("accepts only the declared Node profiles", () => {
  assert.equal(isAcceptedNode("v20.19.0"), true);
  assert.equal(isAcceptedNode("v20.18.9"), false);
  assert.equal(isAcceptedNode("v22.12.0"), true);
  assert.equal(isAcceptedNode("v24.0.0"), false);
});

test("normalizes absolute Vitest paths to repository paths", () => {
  assert.equal(
    normalizeTestPath("/repo", "/repo/test/example.test.ts"),
    "test/example.test.ts",
  );
});

test("sums a complete descendant process tree", () => {
  const rows =
    "10 1 100 node vitest\n" +
    "11 10 50 node tinypool/dist/entry/process.js\n" +
    "12 11 25 helper\n" +
    "20 1 999 unrelated\n";
  assert.equal(processTreeRss(rows, [10]), (100 + 50 + 25) * 1024);
  assert.equal(processTreeMetrics(rows, [10]).workerCount, 1);
  assert.deepEqual(processTreeMetrics(rows, [10]).pids, [10, 11, 12]);
});

test("rejects unavailable process telemetry instead of reporting zero RSS", () => {
  assert.throws(
    () => processTreeRss(undefined, [10]),
    /process table must be a string/,
  );
});

test("hashing is stable", () => {
  assert.equal(
    sha256("agentmemory"),
    "94fc11d980ea813257a38b4b8b64e175fe7a97cacaf24c96854345703378ec77",
  );
});

test("escalates to SIGKILL when a process ignores SIGTERM", async () => {
  const child = spawn(
    process.execPath,
    [
      "-e",
      "process.on('SIGTERM', () => {}); process.stdout.write('ready\\n'); setInterval(() => {}, 1000)",
    ],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  await new Promise((resolvePromise) => child.stdout.once("data", resolvePromise));
  await terminateProcessTree(
    child,
    () => `${child.pid} ${process.pid} 1024 node signal-resistant-child`,
    { graceMs: 25, killWaitMs: 2_000 },
  );
  assert.equal(child.signalCode, "SIGKILL");
});
