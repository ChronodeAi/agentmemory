import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  isPackageCompatibilityNode,
  localProcessTreeMetrics,
  matchesR13LocalProfile,
  normalizeTestPath,
  parseWorkerPidLedger,
  processTreeMetrics,
  processTreeRss,
  R13_LOCAL_PROFILE,
  r13ChildEnvironment,
  sha256,
  terminateProcessTree,
  validateFinalWorkerLedger,
} from "./lib.mjs";
import {
  qualificationErrors,
  sourceState,
  validateReceipt,
  validateReceiptFile,
} from "./validate-receipts.mjs";
import { redactingAppender } from "./run.mjs";

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
      profile_id: R13_LOCAL_PROFILE.id,
      platform: "darwin",
      macos_version: "26.5.1",
      macos_build: "25F80",
      kernel_release: "25.5.0",
      architecture: "arm64",
      node: "v24.16.0",
      npm: "11.13.0",
      exact_local_profile: true,
      package_compatibility_ci_node: false,
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
      stage: "complete",
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
      descendant_churn_count: 0,
      iii_sha256: "c".repeat(64),
      iii_sha_verified: true,
      cleanup: {
        attempted: true,
        service_sampled_pids: [123],
        test_sampled_pids: [124],
        service_verified_gone: true,
        test_verified_gone: true,
        fallback_stop_required: true,
        fallback_stop_succeeded: true,
        temp_home_removed: true,
      },
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

test("keeps package compatibility CI 20/22 separate from exact local qualification", () => {
  assert.equal(isPackageCompatibilityNode("v20.19.0"), true);
  assert.equal(isPackageCompatibilityNode("v20.18.9"), false);
  assert.equal(isPackageCompatibilityNode("v22.12.0"), true);
  assert.equal(isPackageCompatibilityNode("v24.0.0"), false);
  assert.equal(matchesR13LocalProfile(passingReceipt().environment), true);
});

test("builds a minimal child environment and excludes inherited sensitive controls", () => {
  const parent = {
    PATH: "/bin:/usr/bin",
    TMPDIR: "/tmp/",
    LANG: "en_US.UTF-8",
    NODE_OPTIONS: "present",
    DYLD_INSERT_LIBRARIES: "present",
    LD_PRELOAD: "present",
    HTTP_PROXY: "present",
    npm_config_registry: "present",
    NPM_TOKEN: "present",
    OPENAI_API_KEY: "present",
    DATABASE_URL: "present",
    AWS_SECRET_ACCESS_KEY: "present",
    PROJECT_ARBITRARY_VARIABLE: "present",
  };
  const environment = r13ChildEnvironment(parent, {
    home: "/tmp/r13-home",
    port: 4311,
    secret: "synthetic-secret",
    capabilitySecret: "synthetic-capability",
    nodeBinDirectory: "/opt/r13-node/bin",
    vitestJson: "/tmp/vitest.json",
    workerPidFile: "/tmp/workers.txt",
  });
  assert.deepEqual(
    Object.keys(environment).sort(),
    [
      "AGENTMEMORY_INJECT_CONTEXT",
      "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
      "AGENTMEMORY_SECRET",
      "AGENTMEMORY_URL",
      "CI",
      "HOME",
      "LANG",
      "NO_COLOR",
      "PATH",
      "R13_VITEST_JSON",
      "R13_WORKER_PID_FILE",
      "TMPDIR",
    ].sort(),
  );
  for (const denied of Object.keys(parent).filter((key) => !["PATH", "TMPDIR", "LANG"].includes(key))) {
    assert.equal(Object.hasOwn(environment, denied), false);
  }
});

test("redacts governed log secrets even when values cross chunk boundaries", () => {
  const directory = mkdtempSync(join(tmpdir(), "r13-redaction-"));
  const path = join(directory, "stdout.log");
  const secret = "cross-boundary-secret";
  try {
    writeFileSync(path, "");
    const appender = redactingAppender(path, [secret]);
    appender.write(Buffer.from("before cross-boundary-"));
    appender.write(Buffer.from("secret after"));
    appender.finish();
    const output = readFileSync(path, "utf8");
    assert.equal(output, "before [REDACTED] after");
    assert.equal(output.includes(secret), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("normalizes absolute Vitest paths to repository paths", () => {
  assert.equal(
    normalizeTestPath("/repo", "/repo/test/example.test.ts"),
    "test/example.test.ts",
  );
});

test("collects descendant RSS without command text or unrelated process rows", () => {
  const calls = [];
  const run = (command, args) => {
    calls.push([command, args]);
    if (command === "pgrep") {
      const parent = args.at(-1);
      const children = { "10": "11\n", "11": "12\n", "12": "" }[parent];
      return children
        ? { status: 0, stdout: children, stderr: "" }
        : { status: 1, stdout: "", stderr: "" };
    }
    assert.equal(command, "ps");
    assert.deepEqual(args, ["-o", "pid=,ppid=,rss=", "-p", "10,11,12"]);
    return { status: 0, stdout: "10 1 100\n11 10 50\n12 11 25\n", stderr: "" };
  };
  const metrics = localProcessTreeMetrics([10], [11, 99], { run, uid: 501 });
  assert.equal(metrics.rssBytes, (100 + 50 + 25) * 1024);
  assert.equal(metrics.workerCount, 1);
  assert.deepEqual(metrics.pids, [10, 11, 12]);
  assert.equal(calls.some(([, args]) => args.some((arg) => /command|args|env/i.test(arg))), false);
});

test("rejects command text in PID/PPID/RSS telemetry", () => {
  assert.throws(
    () => processTreeRss({
      roots: [10],
      listChildren: () => "",
      queryMetrics: () => "10 1 100 node sensitive-argument",
    }),
    /unexpected fields/,
  );
});

test("counts workers only from the ledger intersected with live descendants", () => {
  const metrics = processTreeMetrics({
    roots: [10],
    workerPids: parseWorkerPidLedger("10\n11\n11\n99\n"),
    listChildren: (pid) => pid === 10 ? "11\n12\n" : "",
    queryMetrics: () => "10 1 100\n11 10 50\n12 10 25\n",
  });
  assert.equal(metrics.workerCount, 1);
});

test("records normal descendant churn without accepting unrelated telemetry", () => {
  const metrics = processTreeMetrics({
    roots: [10],
    workerPids: [11],
    listChildren: (pid) => pid === 10 ? "11\n" : "",
    queryMetrics: () => "10 1 100\n",
  });
  assert.deepEqual(metrics.pids, [10]);
  assert.deepEqual(metrics.churnedPids, [11]);
  assert.equal(metrics.workerCount, 0);
});

test("proves one concurrent worker without requiring every transient PID sample", () => {
  assert.throws(
    () => validateFinalWorkerLedger("11\n", new Set(), 0),
    /zero verified Vitest workers/,
  );
  assert.throws(
    () => validateFinalWorkerLedger("11\n", new Set([12]), 1),
    /absent from the ledger.*12/,
  );
  assert.deepEqual(
    validateFinalWorkerLedger("11\n12\n", new Set([11]), 1),
    [11, 12],
  );
  assert.throws(
    () => validateFinalWorkerLedger("11\n12\n", new Set([11, 12]), 2),
    /exactly one concurrent worker/,
  );
  assert.throws(() => parseWorkerPidLedger("11 12\n"), /one valid PID per line/);
  assert.throws(() => parseWorkerPidLedger("11"), /end with a newline/);
});

test("rejects a process root that disappears before RSS collection", () => {
  assert.throws(
    () => processTreeMetrics({
      roots: [10],
      listChildren: () => "",
      queryMetrics: () => "",
    }),
    /process root 10 disappeared/,
  );
});

test("rejects unavailable process telemetry instead of reporting zero RSS", () => {
  assert.throws(
    () => localProcessTreeMetrics([10], [], {
      uid: 501,
      run: () => ({ status: 2, stdout: "", stderr: "telemetry denied" }),
    }),
    /process telemetry unavailable from pgrep: telemetry denied/,
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
    (roots) => ({ pids: roots }),
    { graceMs: 25, killWaitMs: 2_000 },
  );
  assert.equal(child.signalCode, "SIGKILL");
});

test("bounded non-atomic PID-only cleanup signals a sampled descendant before its root", async () => {
  const script = [
    "const { spawn } = require('node:child_process');",
    "const child = spawn(process.execPath, ['-e', \"process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)\"], { stdio: ['ignore', 'pipe', 'ignore'] });",
    "child.stdout.once('data', () => console.log(child.pid));",
    "process.on('SIGTERM', () => {});",
    "setInterval(() => {}, 1000);",
  ].join("\n");
  const rootChild = spawn(process.execPath, ["-e", script], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  const descendantPid = Number(
    await new Promise((resolvePromise) =>
      rootChild.stdout.once("data", (chunk) => resolvePromise(chunk.toString().trim())),
    ),
  );
  const report = await terminateProcessTree(
    rootChild,
    (roots) => ({ pids: [roots[0], descendantPid] }),
    { graceMs: 25, killWaitMs: 2_000 },
  );
  assert.deepEqual(report.sampledPids, [descendantPid, rootChild.pid]);
  assert.equal(report.verifiedGone, true);
  assert.throws(
    () => process.kill(descendantPid, 0),
    (error) => error?.code === "ESRCH",
  );
});

test("reports termination telemetry failure after cleaning up the known root", async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    stdio: "ignore",
  });
  await assert.rejects(
    terminateProcessTree(
      child,
      () => { throw new Error("telemetry command failed"); },
      { graceMs: 100, killWaitMs: 2_000 },
    ),
    /telemetry command failed/,
  );
  assert.notEqual(child.signalCode, null);
});

test("rejects forged nested receipt fields and additional properties", () => {
  const receipt = passingReceipt();
  receipt.environment.exact_local_profile = false;
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
    errors.some((error) => error.includes("exact_local_profile")),
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

test("rejects zero workers and unproven cleanup", () => {
  const receipt = passingReceipt();
  receipt.process.peak_concurrent_workers = 0;
  receipt.process.cleanup.test_verified_gone = false;
  const errors = passErrors(receipt);
  assert.ok(errors.includes("exactly one verified worker was not observed"));
  assert.ok(errors.includes("passing receipt lacks proven deterministic cleanup"));
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
  receipt.source_worktree_dirty = true;
  receipt.process.iii_sha_verified = false;
  receipt.result = "provisional-pass";
  receipt.qualification_waivers = [
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

test("never turns an off-profile local run into a pass or provisional pass", () => {
  const receipt = passingReceipt();
  receipt.environment.macos_build = "WRONG";
  receipt.environment.exact_local_profile = false;
  receipt.result = "provisional-pass";
  receipt.qualification_waivers = ["dirty-source"];
  receipt.source_worktree_dirty = true;
  const errors = qualificationErrors(receipt, {
    root,
    observedSource: { ...linkedSource, dirty: true },
  });
  assert.ok(errors.includes("passing receipt is outside the exact R13 local profile"));
});

test("post-preflight failure writes a governed fail receipt without secret values", () => {
  const directory = mkdtempSync(join(tmpdir(), "r13-durable-fail-"));
  const secret = "synthetic-secret-must-not-persist";
  const capabilitySecret = "synthetic-capability-must-not-persist";
  try {
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts/r13/run.mjs")],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          AGENTMEMORY_SECRET: secret,
          AGENTMEMORY_PROJECT_CAPABILITY_SECRET: capabilitySecret,
          R13_ALLOW_DIRTY_TREE: "1",
          R13_PORT: "invalid",
          R13_RECEIPT_DIR: directory,
        },
      },
    );
    assert.notEqual(result.status, 0);
    const runDirectories = readdirSync(directory);
    assert.equal(runDirectories.length, 1);
    const receiptPath = join(directory, runDirectories[0], "receipt.json");
    const serialized = readFileSync(receiptPath, "utf8");
    const receipt = JSON.parse(serialized);
    assert.equal(receipt.result, "fail");
    assert.equal(receipt.process.stage, "failed");
    assert.ok(receipt.failures.some((failure) => failure.includes("invalid R13_PORT")));
    assert.deepEqual(
      Object.keys(receipt.artifact_sha256).sort(),
      [
        "stderr.log",
        "stdout.log",
        "telemetry.jsonl",
        "tracked-tests.txt",
        "vitest.json",
        "worker-pids.txt",
      ],
    );
    assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes(capabilitySecret), false);
    validateReceiptFile(receiptPath, { root });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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
      process: { stage: "preflight" },
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
