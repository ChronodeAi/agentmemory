import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  isAcceptedNode,
  normalizeTestPath,
  processExitDiagnostic,
  processTreeMetrics,
  processTreeRss,
  sha256,
  terminateProcessTree,
} from "./lib.mjs";
import {
  qualificationErrors,
  sourceState,
  validateReceipt,
  validateReceiptFile,
} from "./validate-receipts.mjs";

const root = resolve(import.meta.dirname, "../..");
const frozenManifest = JSON.parse(
  readFileSync(join(root, "ci/r13-test-manifest.json"), "utf8"),
);
const linkedSource = {
  head: "a".repeat(40),
  dirty: false,
  treeSha256: "b".repeat(64),
};

function passingReceipt() {
  return {
    schema_version: 1,
    risk_id: "R-13",
    run_id: "negative-test",
    source_sha: linkedSource.head,
    source_tree_sha256: linkedSource.treeSha256,
    source_worktree_dirty: false,
    qualification_waivers: [],
    environment: {
      platform: "linux",
      release: "test",
      architecture: "x64",
      node: "v22.12.0",
      npm: "11.0.0",
      qualified_node_profile: true,
      mandatory_auth_configured: true,
      mandatory_project_capability_auth_configured: true,
    },
    limits: {
      timeout_ms: 1_000,
      max_workers: 1,
      rss_bytes: 1_000_000,
    },
    tests: {
      expected_count: frozenManifest.count,
      expected_manifest_sha256: frozenManifest.sha256,
      expected_content_sha256: frozenManifest.content_sha256,
      observed_count: frozenManifest.count,
      missing: [],
      extra: [],
      skipped: [],
      mandatory_auth_tests: ["rejects unauthenticated requests"],
      missing_auth_tests: [],
    },
    process: {
      argv: ["vitest", "run"],
      started_at: "2026-07-25T00:00:00.000Z",
      ended_at: "2026-07-25T00:00:00.100Z",
      duration_ms: 100,
      exit_code: 0,
      signal: null,
      peak_rss_bytes: 100,
      service_pid: 123,
      worker_pids: ["124"],
      peak_concurrent_workers: 1,
      iii_sha256: "c".repeat(64),
      iii_sha_verified: true,
    },
    result: "pass",
    failures: [],
    artifact_sha256: {},
  };
}

function passErrors(receipt) {
  return qualificationErrors(receipt, {
    root,
    requirePass: true,
    observedSource: linkedSource,
  });
}

test("accepts only the declared Node profiles", () => {
  assert.equal(isAcceptedNode("v20.19.0"), true);
  assert.equal(isAcceptedNode("v20.18.9"), false);
  assert.equal(isAcceptedNode("v22.12.0"), true);
  assert.equal(isAcceptedNode("v24.15.9"), false);
  assert.equal(isAcceptedNode("v24.16.0"), true);
  assert.equal(isAcceptedNode("v26.0.0"), false);
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

test("reports an early service exit without embedding raw output", () => {
  const active = { exitCode: null, signalCode: null };
  assert.equal(processExitDiagnostic(active, "/tmp/stdout", "/tmp/stderr"), null);

  const exited = { exitCode: 1, signalCode: null, stderr: "secret-value" };
  const diagnostic = processExitDiagnostic(
    exited,
    "/tmp/stdout",
    "/tmp/stderr",
  );
  assert.match(diagnostic, /exit_code=1, signal=none/);
  assert.match(diagnostic, /stdout=\/tmp\/stdout, stderr=\/tmp\/stderr/);
  assert.doesNotMatch(diagnostic, /secret-value/);
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

test("rejects forged nested receipt fields and additional properties", () => {
  const receipt = passingReceipt();
  receipt.environment.qualified_node_profile = false;
  receipt.environment.forged = true;
  const errors = validateReceipt(receipt, {
    root,
    requirePass: true,
    observedSource: linkedSource,
  });
  assert.ok(
    errors.some((error) => error.includes("environment.forged is not allowed")),
  );
  assert.ok(
    errors.some((error) => error.includes("qualified_node_profile")),
  );
});

test("rejects test manifest and content drift", () => {
  const receipt = passingReceipt();
  receipt.tests.expected_manifest_sha256 = "d".repeat(64);
  receipt.tests.expected_content_sha256 = "e".repeat(64);
  assert.ok(
    passErrors(receipt).some((error) =>
      error.includes("test manifest/content does not match source"),
    ),
  );
});

test("rejects missing auth, dirty source, timeout, and RSS violations", () => {
  const receipt = passingReceipt();
  receipt.environment.mandatory_auth_configured = false;
  receipt.environment.mandatory_project_capability_auth_configured = false;
  receipt.source_worktree_dirty = true;
  receipt.process.duration_ms = receipt.limits.timeout_ms + 1;
  receipt.process.peak_rss_bytes = receipt.limits.rss_bytes + 1;
  const errors = qualificationErrors(receipt, {
    root,
    requirePass: true,
    observedSource: { ...linkedSource, dirty: true },
  });
  assert.ok(errors.includes("mandatory authentication was not configured"));
  assert.ok(
    errors.includes(
      "mandatory project capability authentication was not configured",
    ),
  );
  assert.ok(errors.includes("passing source is dirty"));
  assert.ok(errors.includes("wall-clock timeout exceeded"));
  assert.ok(errors.includes("RSS ceiling exceeded"));
});

test("rejects nonzero exit, missing files, and skipped tests", () => {
  const receipt = passingReceipt();
  receipt.process.exit_code = 1;
  receipt.tests.missing = ["test/missing.test.ts"];
  receipt.tests.skipped = ["must run"];
  const errors = passErrors(receipt);
  assert.ok(errors.includes("test process did not exit cleanly"));
  assert.ok(errors.includes("tests.missing must be empty"));
  assert.ok(errors.includes("tests.skipped must be empty"));
});

test("keeps waived successful runs provisional and ineligible for qualification", () => {
  const receipt = passingReceipt();
  receipt.environment.node = "v26.0.0";
  receipt.environment.qualified_node_profile = false;
  receipt.source_worktree_dirty = true;
  receipt.process.iii_sha_verified = false;
  receipt.result = "provisional-pass";
  receipt.qualification_waivers = [
    "unqualified-node-profile",
    "dirty-source",
    "unverified-iii-provenance",
  ];
  const observedSource = { ...linkedSource, dirty: true };

  assert.deepEqual(
    qualificationErrors(receipt, {
      root,
      observedSource,
    }),
    [],
  );
  assert.ok(
    qualificationErrors(receipt, {
      root,
      observedSource,
      requirePass: true,
    }).includes("receipt is not a passing qualification receipt"),
  );
});

test("rejects tampered artifacts and forged receipt sidecars", () => {
  const directory = mkdtempSync(join(tmpdir(), "r13-validator-"));
  try {
    const artifact = join(directory, "tracked-tests.txt");
    writeFileSync(artifact, "original\n");
    const source = sourceState(root);
    const receipt = {
      ...passingReceipt(),
      source_sha: source.head,
      source_tree_sha256: source.treeSha256,
      source_worktree_dirty: source.dirty,
      result: "preflight-pass",
      process: {},
      failures: [],
      artifact_sha256: {
        "tracked-tests.txt": sha256(readFileSync(artifact)),
      },
    };
    const receiptPath = join(directory, "receipt.json");
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    writeFileSync(
      join(directory, "receipt.sha256"),
      `${sha256(readFileSync(receiptPath))}  receipt.json\n`,
    );
    writeFileSync(artifact, "tampered\n");
    assert.throws(
      () => validateReceiptFile(receiptPath, { root }),
      /artifact hash mismatch/,
    );
    writeFileSync(artifact, "original\n");
    const forged = { ...receipt, run_id: "forged-after-signing" };
    writeFileSync(receiptPath, `${JSON.stringify(forged, null, 2)}\n`);
    assert.throws(
      () => validateReceiptFile(receiptPath, { root }),
      /receipt\.sha256 mismatch/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
