import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform, release, tmpdir, totalmem } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { StringDecoder } from "node:string_decoder";

import {
  isPackageCompatibilityNode,
  localProcessTreeMetrics,
  matchesR13LocalProfile,
  normalizeTestPath,
  parseWorkerPidLedger,
  R13_LOCAL_PROFILE,
  r13ChildEnvironment,
  sha256,
  terminateProcessTree,
  validateFinalWorkerLedger,
} from "./lib.mjs";

const root = resolve(import.meta.dirname, "../..");
const args = new Set(process.argv.slice(2));
const preflightOnly = args.has("--preflight-only");
const repeatArg = process.argv.find((arg) => arg.startsWith("--repeat="));
const repeat = Number(repeatArg?.slice("--repeat=".length) ?? "1");
const timeoutMs = 30 * 60 * 1000;
const rssLimit = Math.min(4 * 1024 ** 3, Math.floor(totalmem() * 0.5));
const realHome = homedir();

if (!Number.isInteger(repeat) || repeat < 1 || repeat > 5) {
  throw new Error("--repeat must be an integer from 1 to 5");
}

function exec(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
    const detail = result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`;
    throw new Error(`${command} ${commandArgs.join(" ")} failed: ${detail}`);
  }
  return result.stdout.trim();
}

function trackedTests() {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
        files.push(relative(root, path).replaceAll("\\", "/"));
      }
    }
  };
  visit(join(root, "test"));
  return files.sort();
}

function expectedTestManifest() {
  return JSON.parse(
    readFileSync(join(root, "ci/r13-test-manifest.json"), "utf8"),
  );
}

function testContentSha(tests) {
  const hash = createHash("sha256");
  for (const path of tests) {
    hash.update(`PATH\0${path}\0`);
    hash.update(readFileSync(join(root, path)));
  }
  return hash.digest("hex");
}

function npmVersion() {
  const npm = join(dirname(process.execPath), platform() === "win32" ? "npm.cmd" : "npm");
  return exec(npm, ["--version"]);
}

function sourceSha() {
  return exec("git", ["rev-parse", "HEAD"]);
}

function sourceState() {
  const head = sourceSha();
  const diff = spawnSync("git", ["diff", "--binary", "HEAD", "--", "."], {
    cwd: root,
    encoding: null,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (diff.error || diff.status !== 0) {
    throw new Error(
      `unable to fingerprint tracked source: ${diff.error?.message ?? diff.stderr?.toString().trim()}`,
    );
  }
  const untrackedResult = spawnSync(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  );
  if (untrackedResult.error || untrackedResult.status !== 0) {
    throw new Error(
      `unable to fingerprint untracked source: ${untrackedResult.error?.message ?? untrackedResult.stderr?.trim()}`,
    );
  }
  const excluded = new Set([".aiwg/sessions.json", "node_modules"]);
  const untracked = untrackedResult.stdout
    .split("\0")
    .filter(Boolean)
    .filter((path) => !excluded.has(path) && !path.startsWith(".r13-receipts/"))
    .sort();
  const hash = createHash("sha256");
  hash.update(`HEAD\0${head}\0`);
  hash.update(diff.stdout);
  for (const path of untracked) {
    hash.update(`\0PATH\0${path}\0`);
    hash.update(readFileSync(join(root, path)));
  }
  return {
    head,
    dirty: diff.stdout.length > 0 || untracked.length > 0,
    treeSha256: hash.digest("hex"),
    untracked,
  };
}

function observedEnvironment() {
  const environment = {
    profile_id: R13_LOCAL_PROFILE.id,
    platform: platform(),
    macos_version: exec("/usr/bin/sw_vers", ["-productVersion"]),
    macos_build: exec("/usr/bin/sw_vers", ["-buildVersion"]),
    kernel_release: release(),
    architecture: process.arch,
    node: process.version,
    npm: npmVersion(),
  };
  return {
    ...environment,
    exact_local_profile: matchesR13LocalProfile(environment),
    package_compatibility_ci_node: isPackageCompatibilityNode(environment.node),
  };
}

function writePreferences(home) {
  const dir = join(home, ".agentmemory");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "preferences.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        lastAgent: null,
        lastAgents: [],
        lastProvider: null,
        skipSplash: true,
        skipNpxHint: true,
        skipGlobalInstall: true,
        skipConsoleInstall: true,
        firstRunAt: "2026-07-25T00:00:00.000Z",
        injectContextChosen: true,
      },
      null,
      2,
    )}\n`,
  );
}

function installEngine(home) {
  const source =
    process.env.R13_III_BINARY ??
    join(realHome, ".agentmemory", "bin", platform() === "win32" ? "iii.exe" : "iii");
  if (!existsSync(source)) return { source: null, sha256: null, verified: false };
  const targetDir = join(home, ".agentmemory", "bin");
  const target = join(targetDir, basename(source));
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(source, target);
  const digest = sha256(readFileSync(target));
  const expected = process.env.R13_III_SHA256;
  if (expected && digest !== expected) {
    throw new Error(`iii-engine SHA-256 mismatch: expected ${expected}, got ${digest}`);
  }
  let verified = Boolean(expected);
  const provenancePath = `${source}.provenance.json`;
  if (existsSync(provenancePath)) {
    const provenance = JSON.parse(readFileSync(provenancePath, "utf8"));
    const manifest = JSON.parse(
      readFileSync(join(root, "ci/iii-engine-sha256.json"), "utf8"),
    );
    const asset = manifest.assets?.[`${platform()}-${process.arch}`];
    verified =
      provenance.version === manifest.version &&
      provenance.asset === asset?.name &&
      provenance.archive_sha256 === asset?.sha256 &&
      provenance.binary_sha256 === digest;
  }
  if (!verified && process.env.R13_ALLOW_UNVERIFIED_III !== "1") {
    throw new Error(
      "iii-engine provenance is unverified; run npm run test:r13:install-engine",
    );
  }
  return { source, sha256: digest, verified };
}

async function waitForService(base, child, failureProvider, timeout = 45_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const failure = failureProvider();
    if (failure) throw new Error(failure);
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `Agentmemory service exited before readiness: exit=${child.exitCode} signal=${child.signalCode}`,
      );
    }
    try {
      const response = await fetch(`${base}/agentmemory/livez`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return;
    } catch {
      // Service is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  }
  throw new Error(`Agentmemory did not become live at ${base}`);
}

async function terminate(child, sampledPids = []) {
  return terminateProcessTree(
    child,
    (roots) => localProcessTreeMetrics(roots),
    { sampledPids },
  );
}

function fileSha(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function redactText(value, sensitiveValues) {
  let redacted = value;
  for (const sensitive of sensitiveValues) {
    if (sensitive) redacted = redacted.replaceAll(sensitive, "[REDACTED]");
  }
  return redacted;
}

export function redactingAppender(path, sensitiveValues) {
  const decoder = new StringDecoder("utf8");
  const secrets = [...new Set(sensitiveValues.filter(Boolean))];
  let tail = "";

  function safePrefixLength(value) {
    let safeLength = value.length;
    for (const secret of secrets) {
      const longestPartialLength = Math.min(value.length, secret.length - 1);
      for (let length = longestPartialLength; length > 0; length -= 1) {
        if (value.endsWith(secret.slice(0, length))) {
          safeLength = Math.min(safeLength, value.length - length);
          break;
        }
      }
    }
    return safeLength;
  }

  return {
    write(chunk) {
      const combined = tail + decoder.write(chunk);
      const emitLength = safePrefixLength(combined);
      if (emitLength > 0) {
        appendFileSync(path, redactText(combined.slice(0, emitLength), secrets));
      }
      tail = combined.slice(emitLength);
    },
    finish() {
      tail += decoder.end();
      if (tail) appendFileSync(path, redactText(tail, secrets));
      tail = "";
    },
  };
}

function scrubSensitiveFile(path, sensitiveValues) {
  if (!existsSync(path)) return;
  const original = readFileSync(path, "utf8");
  const redacted = redactText(original, sensitiveValues);
  if (redacted !== original) writeFileSync(path, redacted);
}

const governedArtifacts = [
  "stderr.log",
  "stdout.log",
  "telemetry.jsonl",
  "tracked-tests.txt",
  "vitest.json",
  "worker-pids.txt",
];

function writeReceipt(receiptDir, receipt) {
  for (const artifact of governedArtifacts) {
    const path = join(receiptDir, artifact);
    if (existsSync(path)) receipt.artifact_sha256[artifact] = fileSha(path);
  }
  const receiptPath = join(receiptDir, "receipt.json");
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  writeFileSync(
    join(receiptDir, "receipt.sha256"),
    `${fileSha(receiptPath)}  receipt.json\n`,
  );
}

function resultFiles(vitestJson) {
  const parsed = JSON.parse(readFileSync(vitestJson, "utf8"));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.testResults)) {
    throw new Error("Vitest JSON must contain a testResults array");
  }
  const files = parsed.testResults
    .map((result) => normalizeTestPath(root, result.name))
    .sort();
  const assertions = parsed.testResults.flatMap(
    (result) => result.assertionResults ?? [],
  );
  return {
    files,
    assertions,
    skipped: assertions
      .filter((assertion) =>
        ["pending", "todo", "skipped", "disabled"].includes(assertion.status),
      )
      .map((assertion) => assertion.fullName ?? assertion.title),
  };
}

function commonReceipt(
  runId,
  tests,
  environment,
  source,
  secret,
  capabilitySecret,
) {
  return {
    schema_version: 1,
    risk_id: "R-13",
    run_id: runId,
    source_sha: source.head,
    source_tree_sha256: source.treeSha256,
    source_worktree_dirty: source.dirty,
    qualification_waivers: [],
    environment: {
      ...environment,
      mandatory_auth_configured: Boolean(secret),
      mandatory_project_capability_auth_configured:
        Boolean(capabilitySecret),
    },
    limits: {
      timeout_ms: timeoutMs,
      max_workers: 1,
      rss_bytes: rssLimit,
    },
    tests: {
      expected_count: tests.length,
      expected_manifest_sha256: sha256(`${tests.join("\n")}\n`),
      expected_content_sha256: testContentSha(tests),
    },
    process: { stage: "preflight" },
    artifact_sha256: {},
  };
}

async function runOnce(index) {
  const tests = trackedTests();
  const source = sourceState();
  const environment = observedEnvironment();
  const allowDirty = process.env.R13_ALLOW_DIRTY_TREE === "1";
  const secret = process.env.AGENTMEMORY_SECRET ?? "";
  const capabilitySecret =
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET ?? "";
  const sensitiveValues = [secret, capabilitySecret].filter(Boolean);
  const redact = (value) => redactText(String(value), sensitiveValues);
  const runId = `${Date.now()}-${index}-${randomBytes(4).toString("hex")}`;
  const receiptBase =
    process.env.R13_RECEIPT_DIR ?? join(root, ".r13-receipts");
  const receiptDir = join(receiptBase, runId);
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(join(receiptDir, "tracked-tests.txt"), `${tests.join("\n")}\n`);
  const receipt = commonReceipt(
    runId,
    tests,
    environment,
    source,
    secret,
    capabilitySecret,
  );
  const failures = [];
  if (source.dirty && allowDirty) {
    receipt.qualification_waivers.push("dirty-source");
  }
  const expectedTests = expectedTestManifest();
  const observedManifestSha = sha256(`${tests.join("\n")}\n`);
  const observedContentSha = testContentSha(tests);

  if (
    tests.length !== expectedTests.count ||
    observedManifestSha !== expectedTests.sha256
  ) {
    failures.push(
      `test manifest mismatch: expected ${expectedTests.count}/${expectedTests.sha256}, ` +
        `found ${tests.length}/${observedManifestSha}`,
    );
  }
  if (observedContentSha !== expectedTests.content_sha256) {
    failures.push(
      `test content mismatch: expected ${expectedTests.content_sha256}, found ${observedContentSha}`,
    );
  }
  if (!secret) failures.push("MISSING_MANDATORY_AUTH");
  if (!capabilitySecret) {
    failures.push("MISSING_PROJECT_CAPABILITY_AUTH");
  }
  if (!environment.exact_local_profile) {
    failures.push(
      `off-profile environment; required ${R13_LOCAL_PROFILE.id}`,
    );
  }
  if (source.dirty && !allowDirty) {
    failures.push(
      "source worktree is dirty; commit the candidate or set R13_ALLOW_DIRTY_TREE=1 for a provisional run",
    );
  }

  if (preflightOnly || failures.length > 0) {
    receipt.result = failures.length === 0 ? "preflight-pass" : "preflight-fail";
    receipt.failures = failures;
    writeReceipt(receiptDir, receipt);
    if (failures.length > 0) {
      throw new Error(failures.join("; "));
    }
    console.log(`R-13 preflight passed: ${relative(root, receiptDir)}`);
    return;
  }

  const port = Number(process.env.R13_PORT ?? 4311 + index * 100);
  const vitestJson = join(receiptDir, "vitest.json");
  const workerPids = join(receiptDir, "worker-pids.txt");
  const stdoutPath = join(receiptDir, "stdout.log");
  const stderrPath = join(receiptDir, "stderr.log");
  const telemetryPath = join(receiptDir, "telemetry.jsonl");

  let home;
  let testHome;
  let env;
  let testEnv;
  let service;
  let testProcess;
  let telemetry;
  let emergencyCleanupPromise;
  let stdoutAppender;
  let stderrAppender;
  let engine = { source: null, sha256: null, verified: false };
  let serviceError;
  let testError;
  let peakRss = 0;
  let peakConcurrentWorkers = 0;
  let descendantChurnCount = 0;
  let timedOut = false;
  let rssBreached = false;
  let telemetryFailure;
  const sampledByRoot = new Map();
  const observedLiveWorkerPids = new Set();
  const cleanup = {
    attempted: false,
    service_sampled_pids: [],
    test_sampled_pids: [],
    service_verified_gone: true,
    test_verified_gone: true,
    fallback_stop_required: false,
    fallback_stop_succeeded: false,
    temp_home_removed: false,
  };
  const recordTerminationFailure = (error) => {
    const detail = redact(error instanceof Error ? error.message : String(error));
    failures.push(`R-13 deterministic cleanup failed: ${detail}`);
  };
  const requestEmergencyCleanup = () => {
    emergencyCleanupPromise ??= Promise.allSettled([
      terminate(testProcess, sampledByRoot.get(testProcess?.pid) ?? []),
      terminate(service, sampledByRoot.get(service?.pid) ?? []),
    ]).then((results) => {
      for (const result of results) {
        if (result.status === "rejected") recordTerminationFailure(result.reason);
      }
    });
  };
  const startedAt = Date.now();
  receipt.result = "fail";
  receipt.failures = failures;
  receipt.process = {
    stage: "post-preflight-initialization",
    argv: ["vitest", "run", "--config", "vitest.r13.config.ts", "--no-color"],
    started_at: new Date(startedAt).toISOString(),
    ended_at: new Date(startedAt).toISOString(),
    duration_ms: 0,
    exit_code: null,
    signal: null,
    peak_rss_bytes: 0,
    service_pid: null,
    worker_pids: [],
    peak_concurrent_workers: 0,
    descendant_churn_count: 0,
    iii_sha256: null,
    iii_sha_verified: false,
    cleanup,
  };
  try {
    receipt.process.stage = "artifact-initialization";
    writeFileSync(workerPids, "");
    writeFileSync(stdoutPath, "");
    writeFileSync(stderrPath, "");
    writeFileSync(vitestJson, "");
    writeFileSync(telemetryPath, "");
    stdoutAppender = redactingAppender(stdoutPath, sensitiveValues);
    stderrAppender = redactingAppender(stderrPath, sensitiveValues);
    if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) {
      throw new Error(`invalid R13_PORT ${process.env.R13_PORT ?? ""}`);
    }
    receipt.process.stage = "build-check";
    if (!existsSync(join(root, "dist/cli.mjs"))) {
      throw new Error("dist/cli.mjs is missing; run npm run build before npm test");
    }

    receipt.process.stage = "engine-setup";
    home = mkdtempSync(join(tmpdir(), "agentmemory-r13-"));
    testHome = join(home, "test-home");
    mkdirSync(testHome, { recursive: true });
    writePreferences(home);
    engine = installEngine(home);
    if (!engine.verified) receipt.qualification_waivers.push("unverified-iii-provenance");
    env = r13ChildEnvironment(process.env, {
      home,
      port,
      secret,
      capabilitySecret,
      nodeBinDirectory: dirname(process.execPath),
      vitestJson,
      workerPidFile: workerPids,
    });
    testEnv = { ...env, HOME: testHome };

    receipt.process.stage = "service-spawn";
    service = spawn(process.execPath, ["dist/cli.mjs", "--port", String(port)], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    await new Promise((resolvePromise, rejectPromise) => {
      service.once("spawn", resolvePromise);
      service.once("error", rejectPromise);
    });
    receipt.process.service_pid = service.pid;
    service.stdout?.on("data", (chunk) => stdoutAppender.write(chunk));
    service.stderr?.on("data", (chunk) => stderrAppender.write(chunk));
    service.on("error", (error) => {
      serviceError ??= `Agentmemory service error event: ${redact(error.message)}`;
    });

    telemetry = setInterval(() => {
      let metrics;
      try {
        const roots = [service?.pid, testProcess?.pid].filter((pid) =>
          Number.isSafeInteger(pid) && pid > 1,
        );
        metrics = localProcessTreeMetrics(
          roots,
          parseWorkerPidLedger(readFileSync(workerPids, "utf8")),
        );
        for (const tree of metrics.trees) sampledByRoot.set(tree.rootPid, tree.pids);
        for (const pid of metrics.liveWorkerPids) observedLiveWorkerPids.add(pid);
        peakRss = Math.max(peakRss, metrics.rssBytes);
        peakConcurrentWorkers = Math.max(peakConcurrentWorkers, metrics.workerCount);
        descendantChurnCount += metrics.churnedPids.length;
        appendFileSync(
          telemetryPath,
          `${JSON.stringify({
            at: new Date().toISOString(),
            rss_bytes: metrics.rssBytes,
            worker_count: metrics.workerCount,
            churned_process_count: metrics.churnedPids.length,
          })}\n`,
        );
        if (metrics.rssBytes > rssLimit) {
          rssBreached = true;
          requestEmergencyCleanup();
        }
      } catch (error) {
        telemetryFailure ??= redact(error instanceof Error ? error.message : String(error));
        requestEmergencyCleanup();
      }
    }, 250);

    receipt.process.stage = "service-readiness";
    await waitForService(
      env.AGENTMEMORY_URL,
      service,
      () => serviceError ?? telemetryFailure,
    );
    if (telemetryFailure) throw new Error(telemetryFailure);

    receipt.process.stage = "test-spawn";
    testProcess = spawn(
      join(root, "node_modules", ".bin", "vitest"),
      ["run", "--config", "vitest.r13.config.ts", "--no-color"],
      { cwd: root, env: testEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    await new Promise((resolvePromise, rejectPromise) => {
      testProcess.once("spawn", resolvePromise);
      testProcess.once("error", rejectPromise);
    });
    testProcess.stdout?.on("data", (chunk) => stdoutAppender.write(chunk));
    testProcess.stderr?.on("data", (chunk) => stderrAppender.write(chunk));
    testProcess.on("error", (error) => {
      testError ??= `Vitest child error event: ${redact(error.message)}`;
    });

    receipt.process.stage = "test-execution";
    let deadlineTimer;
    const outcome = await Promise.race([
      new Promise((resolvePromise) => {
        testProcess.once("exit", (code, signal) =>
          resolvePromise({ code, signal }),
        );
        testProcess.once("error", (error) =>
          resolvePromise({ code: null, signal: "ERROR", error }),
        );
      }),
      new Promise((resolvePromise) =>
        {
          deadlineTimer = setTimeout(async () => {
            timedOut = true;
            try {
              await terminate(testProcess);
            } catch (error) {
              telemetryFailure = redact(error instanceof Error ? error.message : String(error));
            }
            resolvePromise({ code: null, signal: "TIMEOUT" });
          }, timeoutMs);
        },
      ),
    ]);
    clearTimeout(deadlineTimer);

    if (testError || outcome.error) {
      throw new Error(testError ?? `Vitest child error event: ${outcome.error.message}`);
    }
    receipt.process.stage = "evidence-validation";
    if (!existsSync(vitestJson) || statSync(vitestJson).size === 0) {
      throw new Error("Vitest JSON output is missing or empty");
    }
    let observed;
    try {
      observed = resultFiles(vitestJson);
    } catch (error) {
      throw new Error(`Vitest JSON output is malformed: ${error.message}`);
    }
    const missing = tests.filter((path) => !observed.files.includes(path));
    const extra = observed.files.filter((path) => !tests.includes(path));
    const pids = validateFinalWorkerLedger(
      readFileSync(workerPids, "utf8"),
      observedLiveWorkerPids,
      peakConcurrentWorkers,
    ).map(String);
    const requiredAuthTests = [
      "rejects unauthenticated requests",
      "rejects wrong bearer token",
      "rejects unauthenticated viewer requests on the API port",
    ];
    const assertionNames = observed.assertions.map(
      (assertion) => assertion.fullName ?? assertion.title ?? "",
    );
    const missingAuthTests = requiredAuthTests.filter(
      (name) => !assertionNames.some((value) => value.includes(name)),
    );
    failures.push(
      ...(telemetryFailure ? [telemetryFailure] : []),
      ...(outcome.code === 0 && !outcome.signal
        ? []
        : [`test exit=${outcome.code} signal=${outcome.signal}`]),
      ...(timedOut ? ["wall-clock timeout"] : []),
      ...(rssBreached ? ["RSS ceiling exceeded"] : []),
      ...(missing.length ? [`missing test files: ${missing.join(", ")}`] : []),
      ...(extra.length ? [`extra test files: ${extra.join(", ")}`] : []),
      ...(observed.skipped.length
        ? [`skipped tests: ${observed.skipped.join(", ")}`]
        : []),
      ...(peakConcurrentWorkers === 1
        ? []
        : [`expected exactly one concurrent worker, found ${peakConcurrentWorkers}`]),
      ...(serviceError ? [serviceError] : []),
      ...(testError ? [testError] : []),
      ...(missingAuthTests.length
        ? [`missing auth tests: ${missingAuthTests.join(", ")}`]
        : []),
    );

    Object.assign(receipt.process, {
      stage: "cleanup",
      exit_code: outcome.code,
      signal: outcome.signal,
      worker_pids: pids,
    });
    receipt.tests = {
      ...receipt.tests,
      observed_count: observed.files.length,
      missing,
      extra,
      skipped: observed.skipped,
      mandatory_auth_tests: requiredAuthTests,
      missing_auth_tests: missingAuthTests,
    };
  } catch (error) {
    failures.push(
      `${receipt.process.stage}: ${redact(error instanceof Error ? error.message : String(error))}`,
    );
  } finally {
    if (telemetry) clearInterval(telemetry);
    if (emergencyCleanupPromise) await emergencyCleanupPromise;
    cleanup.attempted = true;
    for (const [label, child] of [["test", testProcess], ["service", service]]) {
      const sampledPids = sampledByRoot.get(child?.pid) ?? [];
      try {
        const report = await terminate(child, sampledPids);
        cleanup[`${label}_sampled_pids`] = report.sampledPids;
        cleanup[`${label}_verified_gone`] = report.verifiedGone;
      } catch (error) {
        const report = error?.cleanupReport;
        if (report) {
          cleanup[`${label}_sampled_pids`] = report.sampledPids;
          cleanup[`${label}_verified_gone`] = report.verifiedGone;
        } else {
          cleanup[`${label}_verified_gone`] = false;
        }
        recordTerminationFailure(error);
      }
    }
    if (serviceError) failures.push(serviceError);
    if (testError) failures.push(testError);
    if (telemetryFailure) failures.push(telemetryFailure);
    cleanup.fallback_stop_required = Boolean(
      env &&
      !cleanup.service_verified_gone &&
      existsSync(join(root, "dist/cli.mjs")),
    );
    if (cleanup.fallback_stop_required) {
      const stop = spawnSync(
        process.execPath,
        ["dist/cli.mjs", "stop", "--force", "--port", String(port)],
        { cwd: root, env, encoding: "utf8", timeout: 15_000 },
      );
      cleanup.fallback_stop_succeeded = !stop.error && stop.status === 0 && !stop.signal;
      if (!cleanup.fallback_stop_succeeded) {
        const detail = redact(
          stop.error?.message || stop.stderr?.trim() ||
            `exit=${stop.status} signal=${stop.signal}`,
        );
        failures.push(`fallback stop failed: ${detail}`);
      }
    }
    if (home) {
      try {
        rmSync(home, { recursive: true, force: true });
        cleanup.temp_home_removed = !existsSync(home);
      } catch (error) {
        failures.push(`temporary HOME cleanup failed: ${redact(error.message)}`);
      }
      if (!cleanup.temp_home_removed) failures.push("temporary HOME was not removed");
    } else {
      cleanup.temp_home_removed = true;
    }
    Object.assign(receipt.process, {
      stage: failures.length > 0 ? "failed" : "complete",
      ended_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      peak_rss_bytes: peakRss,
      service_pid: service?.pid ?? null,
      peak_concurrent_workers: peakConcurrentWorkers,
      descendant_churn_count: descendantChurnCount,
      iii_sha256: engine.sha256,
      iii_sha_verified: engine.verified,
    });
    receipt.failures = [...new Set(failures)];
    receipt.result = receipt.failures.length > 0
      ? "fail"
      : receipt.qualification_waivers.length > 0
        ? "provisional-pass"
        : "pass";
    stdoutAppender?.finish();
    stderrAppender?.finish();
    scrubSensitiveFile(stdoutPath, sensitiveValues);
    scrubSensitiveFile(stderrPath, sensitiveValues);
    writeReceipt(receiptDir, receipt);
  }

  if (receipt.result !== "pass" && receipt.result !== "provisional-pass") {
    throw new Error(`R-13 failed: ${receipt.failures.join("; ")}`);
  }
  console.log(
    receipt.result === "pass"
      ? `R-13 passed: ${relative(root, receiptDir)}`
      : `R-13 provisional pass (${receipt.qualification_waivers.join(", ")}): ${relative(root, receiptDir)}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (let index = 0; index < repeat; index += 1) {
    await runOnce(index);
  }
}
