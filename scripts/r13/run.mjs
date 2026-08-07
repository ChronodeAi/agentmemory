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

import {
  isAcceptedNode,
  normalizeTestPath,
  processExitDiagnostic,
  processTreeMetrics,
  sha256,
  terminateProcessTree,
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
  return spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  }).stdout.trim();
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
  return exec("npm", ["--version"]);
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

function sanitizedEnvironment(home, port, secret, capabilitySecret) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (
      /(?:OPENAI|ANTHROPIC|COHERE|VOYAGE|GEMINI|OPENROUTER|MINIMAX|AWS|AZURE|GOOGLE).*(?:KEY|TOKEN|SECRET|CREDENTIAL)/i.test(
        key,
      )
    ) {
      delete env[key];
    }
  }
  return {
    ...env,
    HOME: home,
    CI: "1",
    NO_COLOR: "1",
    AGENTMEMORY_SECRET: secret,
    AGENTMEMORY_PROJECT_CAPABILITY_SECRET: capabilitySecret,
    AGENTMEMORY_URL: `http://127.0.0.1:${port}`,
    AGENTMEMORY_INJECT_CONTEXT: "false",
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

async function waitForService(
  base,
  service,
  stdoutPath,
  stderrPath,
  timeout = 45_000,
) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const exitDiagnostic = processExitDiagnostic(
      service,
      stdoutPath,
      stderrPath,
    );
    if (exitDiagnostic) throw new Error(exitDiagnostic);
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
  throw new Error(
    `Agentmemory did not become live at ${base}; diagnostics: stdout=${stdoutPath}, stderr=${stderrPath}`,
  );
}

function psRows() {
  const result = spawnSync("ps", ["-axo", "pid=,ppid=,rss=,command="], {
    encoding: "utf8",
  });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
    const detail =
      result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`;
    throw new Error(`R-13 process telemetry unavailable: ${detail}`);
  }
  return result.stdout;
}

async function terminate(child) {
  return terminateProcessTree(child, psRows);
}

function fileSha(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
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
  const files = (parsed.testResults ?? [])
    .map((result) => normalizeTestPath(root, result.name))
    .sort();
  const assertions = (parsed.testResults ?? []).flatMap(
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
  qualifiedNode,
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
      platform: platform(),
      release: release(),
      architecture: process.arch,
      node: process.version,
      npm: npmVersion(),
      qualified_node_profile: qualifiedNode,
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
    process: {},
    artifact_sha256: {},
  };
}

async function runOnce(index) {
  const tests = trackedTests();
  const source = sourceState();
  const qualifiedNode = isAcceptedNode(process.version);
  const allowUnqualified = process.env.R13_ALLOW_UNQUALIFIED_NODE === "1";
  const allowDirty = process.env.R13_ALLOW_DIRTY_TREE === "1";
  const secret = process.env.AGENTMEMORY_SECRET ?? "";
  const capabilitySecret =
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET ?? "";
  const runId = `${Date.now()}-${index}-${randomBytes(4).toString("hex")}`;
  const receiptBase =
    process.env.R13_RECEIPT_DIR ?? join(root, ".r13-receipts");
  const receiptDir = join(receiptBase, runId);
  mkdirSync(receiptDir, { recursive: true });
  writeFileSync(join(receiptDir, "tracked-tests.txt"), `${tests.join("\n")}\n`);
  const receipt = commonReceipt(
    runId,
    tests,
    qualifiedNode,
    source,
    secret,
    capabilitySecret,
  );
  const failures = [];
  if (!qualifiedNode && allowUnqualified) {
    receipt.qualification_waivers.push("unqualified-node-profile");
  }
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
  if (!qualifiedNode && !allowUnqualified) {
    failures.push(`unsupported Node profile ${process.version}`);
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

  if (!existsSync(join(root, "dist/cli.mjs"))) {
    throw new Error("dist/cli.mjs is missing; run npm run build before npm test");
  }

  const home = mkdtempSync(join(tmpdir(), "agentmemory-r13-"));
  writePreferences(home);
  const engine = installEngine(home);
  if (!engine.verified) {
    receipt.qualification_waivers.push("unverified-iii-provenance");
  }
  const port = Number(process.env.R13_PORT ?? 4311 + index * 100);
  const env = sanitizedEnvironment(home, port, secret, capabilitySecret);
  const vitestJson = join(receiptDir, "vitest.json");
  const workerPids = join(receiptDir, "worker-pids.txt");
  const stdoutPath = join(receiptDir, "stdout.log");
  const stderrPath = join(receiptDir, "stderr.log");
  env.R13_VITEST_JSON = vitestJson;
  env.R13_WORKER_PID_FILE = workerPids;
  writeFileSync(workerPids, "");
  writeFileSync(stdoutPath, "");
  writeFileSync(stderrPath, "");

  const service = spawn(process.execPath, ["dist/cli.mjs", "--port", String(port)], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  service.stdout.on("data", (chunk) => appendFileSync(stdoutPath, chunk));
  service.stderr.on("data", (chunk) => appendFileSync(stderrPath, chunk));

  let testProcess;
  let peakRss = 0;
  let peakConcurrentWorkers = 0;
  let timedOut = false;
  let rssBreached = false;
  let telemetryFailure;
  const startedAt = Date.now();
  const telemetryPath = join(receiptDir, "telemetry.jsonl");
  writeFileSync(telemetryPath, "");
  const telemetry = setInterval(() => {
    let rss;
    try {
      const metrics = processTreeMetrics(psRows(), [
        service.pid,
        testProcess?.pid,
      ]);
      rss = metrics.rssBytes;
      peakConcurrentWorkers = Math.max(
        peakConcurrentWorkers,
        metrics.workerCount,
      );
    } catch (error) {
      telemetryFailure = error instanceof Error ? error.message : String(error);
      void terminate(testProcess);
      void terminate(service);
      return;
    }
    peakRss = Math.max(peakRss, rss);
    appendFileSync(
      telemetryPath,
      `${JSON.stringify({
        at: new Date().toISOString(),
        rss_bytes: rss,
        worker_count: peakConcurrentWorkers,
      })}\n`,
    );
    if (rss > rssLimit) {
      rssBreached = true;
      void terminate(testProcess);
    }
  }, 250);

  try {
    await waitForService(
      env.AGENTMEMORY_URL,
      service,
      stdoutPath,
      stderrPath,
    );
    testProcess = spawn(
      join(root, "node_modules", ".bin", "vitest"),
      ["run", "--config", "vitest.r13.config.ts", "--no-color"],
      { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] },
    );
    testProcess.stdout.on("data", (chunk) => appendFileSync(stdoutPath, chunk));
    testProcess.stderr.on("data", (chunk) => appendFileSync(stderrPath, chunk));

    let deadlineTimer;
    const outcome = await Promise.race([
      new Promise((resolvePromise) => {
        testProcess.on("exit", (code, signal) =>
          resolvePromise({ code, signal }),
        );
      }),
      new Promise((resolvePromise) =>
        {
          deadlineTimer = setTimeout(async () => {
            timedOut = true;
            try {
              await terminate(testProcess);
            } catch (error) {
              telemetryFailure = error instanceof Error ? error.message : String(error);
            }
            resolvePromise({ code: null, signal: "TIMEOUT" });
          }, timeoutMs);
        },
      ),
    ]);
    clearTimeout(deadlineTimer);

    const observed = existsSync(vitestJson)
      ? resultFiles(vitestJson)
      : { files: [], assertions: [], skipped: [] };
    const missing = tests.filter((path) => !observed.files.includes(path));
    const extra = observed.files.filter((path) => !tests.includes(path));
    const pids = [
      ...new Set(
        readFileSync(workerPids, "utf8")
          .split("\n")
          .filter(Boolean),
      ),
    ];
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
      ...(peakConcurrentWorkers <= 1
        ? []
        : [`expected at most one concurrent worker, found ${peakConcurrentWorkers}`]),
      ...(missingAuthTests.length
        ? [`missing auth tests: ${missingAuthTests.join(", ")}`]
        : []),
    );

    receipt.process = {
      argv: ["vitest", "run", "--config", "vitest.r13.config.ts", "--no-color"],
      started_at: new Date(startedAt).toISOString(),
      ended_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      exit_code: outcome.code,
      signal: outcome.signal,
      peak_rss_bytes: peakRss,
      service_pid: service.pid,
      worker_pids: pids,
      peak_concurrent_workers: peakConcurrentWorkers,
      iii_sha256: engine.sha256,
      iii_sha_verified: engine.verified,
    };
    receipt.tests = {
      ...receipt.tests,
      observed_count: observed.files.length,
      missing,
      extra,
      skipped: observed.skipped,
      mandatory_auth_tests: requiredAuthTests,
      missing_auth_tests: missingAuthTests,
    };
    receipt.result =
      failures.length > 0
        ? "fail"
        : receipt.qualification_waivers.length > 0
          ? "provisional-pass"
          : "pass";
    receipt.failures = failures;
  } finally {
    clearInterval(telemetry);
    await terminate(testProcess);
    await terminate(service);
    spawnSync(
      process.execPath,
      ["dist/cli.mjs", "stop", "--force", "--port", String(port)],
      { cwd: root, env, encoding: "utf8", timeout: 15_000 },
    );
    if (process.env.R13_KEEP_HOME !== "1") rmSync(home, { recursive: true, force: true });
  }

  writeReceipt(receiptDir, receipt);

  if (receipt.result !== "pass" && receipt.result !== "provisional-pass") {
    throw new Error(`R-13 failed: ${failures.join("; ")}`);
  }
  console.log(
    receipt.result === "pass"
      ? `R-13 passed: ${relative(root, receiptDir)}`
      : `R-13 provisional pass (${receipt.qualification_waivers.join(", ")}): ${relative(root, receiptDir)}`,
  );
}

for (let index = 0; index < repeat; index += 1) {
  await runOnce(index);
}
