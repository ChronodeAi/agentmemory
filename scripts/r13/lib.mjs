import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isPackageCompatibilityNode(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (major === 20 && minor >= 19) || major === 22;
}

export const R13_LOCAL_PROFILE = Object.freeze({
  id: "R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1",
  platform: "darwin",
  macosVersion: "26.5.1",
  macosBuild: "25F80",
  architecture: "arm64",
  node: "v24.16.0",
  npm: "11.13.0",
});

export function matchesR13LocalProfile(observed) {
  return Boolean(observed &&
    observed.profile_id === R13_LOCAL_PROFILE.id &&
    observed.platform === R13_LOCAL_PROFILE.platform &&
    observed.macos_version === R13_LOCAL_PROFILE.macosVersion &&
    observed.macos_build === R13_LOCAL_PROFILE.macosBuild &&
    observed.architecture === R13_LOCAL_PROFILE.architecture &&
    observed.node === R13_LOCAL_PROFILE.node &&
    observed.npm === R13_LOCAL_PROFILE.npm);
}

const INHERITED_CHILD_ENVIRONMENT_KEYS = Object.freeze([
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
  "LOGNAME",
  "SHELL",
  "TEMP",
  "TMP",
  "TMPDIR",
  "TZ",
  "USER",
]);

export function r13ChildEnvironment(parentEnvironment, {
  home,
  port,
  secret,
  capabilitySecret,
  nodeBinDirectory,
  vitestJson,
  workerPidFile,
}) {
  const environment = {};
  for (const key of INHERITED_CHILD_ENVIRONMENT_KEYS) {
    const value = parentEnvironment?.[key];
    if (typeof value === "string" && value.length > 0) environment[key] = value;
  }
  return {
    ...environment,
    PATH: `${nodeBinDirectory}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: home,
    CI: "1",
    NO_COLOR: "1",
    AGENTMEMORY_SECRET: secret,
    AGENTMEMORY_PROJECT_CAPABILITY_SECRET: capabilitySecret,
    AGENTMEMORY_URL: `http://127.0.0.1:${port}`,
    AGENTMEMORY_INJECT_CONTEXT: "false",
    R13_VITEST_JSON: vitestJson,
    R13_WORKER_PID_FILE: workerPidFile,
  };
}

export function normalizeTestPath(root, value) {
  const absolute = resolve(value);
  const normalized = relative(root, absolute).replaceAll("\\", "/");
  return normalized.startsWith("test/") ? normalized : value.replaceAll("\\", "/");
}

const DEFAULT_PROCESS_LIMIT = 512;
const DEFAULT_DEPTH_LIMIT = 32;

function validPid(value) {
  return Number.isSafeInteger(value) && value > 1;
}

function canonicalPids(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const pids = [...new Set(values.map((value) => Number(value)))];
  if (pids.length === 0 || pids.some((pid) => !validPid(pid))) {
    throw new Error(`${label} must contain positive process IDs`);
  }
  return pids;
}

function parsePidList(rows, label) {
  if (typeof rows !== "string") throw new TypeError(`${label} must be a string`);
  if (rows.trim() === "") return [];
  return rows.trim().split(/\s+/).map((value) => {
    if (!/^\d+$/.test(value) || !validPid(Number(value))) {
      throw new Error(`${label} contained an invalid process ID`);
    }
    return Number(value);
  });
}

export function parseWorkerPidLedger(rows) {
  if (typeof rows !== "string") throw new TypeError("worker PID ledger must be a string");
  if (rows === "") return [];
  if (!rows.endsWith("\n")) {
    throw new Error("worker PID ledger must end with a newline");
  }
  const lines = rows.slice(0, -1).split("\n");
  if (lines.some((line) => !/^\d+$/.test(line) || !validPid(Number(line)))) {
    throw new Error("worker PID ledger must contain exactly one valid PID per line");
  }
  return lines.map(Number);
}

export function validateFinalWorkerLedger(rows, observedLiveWorkerPids, peakWorkerCount) {
  const workerPids = [...new Set(parseWorkerPidLedger(rows))];
  if (workerPids.length === 0 || peakWorkerCount === 0) {
    throw new Error("R-13 observed zero verified Vitest workers");
  }
  if (peakWorkerCount !== 1) {
    throw new Error(`R-13 expected exactly one concurrent worker, found ${peakWorkerCount}`);
  }
  const observed = new Set(observedLiveWorkerPids);
  const ledger = new Set(workerPids);
  const unexpected = [...observed].filter((pid) => !ledger.has(pid));
  if (unexpected.length > 0) {
    throw new Error(
      `R-13 telemetry observed worker(s) absent from the ledger: ${unexpected.join(",")}`,
    );
  }
  if (workerPids.every((pid) => !observed.has(pid))) {
    throw new Error("R-13 telemetry never observed a ledger Vitest worker live");
  }
  return workerPids;
}

function parseMetricsRows(rows, expectedPids, discoveredParents, rootPids) {
  if (typeof rows !== "string") {
    throw new TypeError("PID/PPID/RSS telemetry must be a string");
  }
  const entries = new Map();
  for (const line of rows.trim() === "" ? [] : rows.trim().split("\n")) {
    const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)$/);
    if (!match) {
      throw new Error("PID/PPID/RSS telemetry contained unexpected fields");
    }
    const entry = {
      pid: Number(match[1]),
      ppid: Number(match[2]),
      rss: Number(match[3]),
    };
    if (!validPid(entry.pid) || !Number.isSafeInteger(entry.ppid) || entry.ppid < 0 ||
        !Number.isSafeInteger(entry.rss) || entry.rss < 0 || entries.has(entry.pid)) {
      throw new Error("PID/PPID/RSS telemetry was internally inconsistent");
    }
    entries.set(entry.pid, entry);
  }
  const expected = new Set(expectedPids);
  if ([...entries.keys()].some((pid) => !expected.has(pid))) {
    throw new Error("PID/PPID/RSS telemetry returned an unrelated PID");
  }
  for (const rootPid of rootPids) {
    if (!entries.has(rootPid)) {
      throw new Error(`process root ${rootPid} disappeared before RSS collection`);
    }
  }
  for (const [pid, entry] of entries) {
    const expectedParent = discoveredParents.get(pid);
    if (expectedParent !== undefined && entry.ppid !== expectedParent) {
      throw new Error(`discovered process ${pid} changed parent before RSS collection`);
    }
  }
  return {
    entries,
    churnedPids: [...expected].filter((pid) => !entries.has(pid)),
  };
}

export function processTreeMetrics({
  roots,
  workerPids = [],
  listChildren,
  queryMetrics,
  processLimit = DEFAULT_PROCESS_LIMIT,
  depthLimit = DEFAULT_DEPTH_LIMIT,
}) {
  const rootPids = canonicalPids(roots, "process roots");
  if (typeof listChildren !== "function" || typeof queryMetrics !== "function") {
    throw new TypeError("process telemetry providers are required");
  }
  if (!Number.isSafeInteger(processLimit) || processLimit < rootPids.length ||
      !Number.isSafeInteger(depthLimit) || depthLimit < 0) {
    throw new Error("process telemetry bounds are invalid");
  }
  const rootSet = new Set(rootPids);
  const discovered = new Set(rootPids);
  const discoveredParents = new Map();
  const owningRoot = new Map(rootPids.map((pid) => [pid, pid]));
  const queue = rootPids.map((pid) => ({ pid, depth: 0 }));
  for (let index = 0; index < queue.length; index += 1) {
    const { pid, depth } = queue[index];
    const children = parsePidList(listChildren(pid), `children of PID ${pid}`);
    if (children.length > 0 && depth >= depthLimit) {
      throw new Error(`process telemetry depth limit reached at PID ${pid}`);
    }
    for (const childPid of children) {
      if (rootSet.has(childPid) || discovered.has(childPid)) {
        throw new Error(`process telemetry returned duplicate or cyclic PID ${childPid}`);
      }
      if (discovered.size >= processLimit) {
        throw new Error("process telemetry process limit exceeded");
      }
      discovered.add(childPid);
      discoveredParents.set(childPid, pid);
      owningRoot.set(childPid, owningRoot.get(pid));
      queue.push({ pid: childPid, depth: depth + 1 });
    }
  }
  const pids = [...discovered];
  const { entries, churnedPids } = parseMetricsRows(
    queryMetrics(pids),
    pids,
    discoveredParents,
    rootPids,
  );
  const liveDescendants = new Set(
    [...entries.keys()].filter((pid) => !rootSet.has(pid)),
  );
  const ledger = new Set(workerPids.map((pid) => Number(pid)));
  if ([...ledger].some((pid) => !validPid(pid))) {
    throw new Error("worker PID ledger contained an invalid process ID");
  }
  const liveWorkerPids = [...ledger].filter((pid) => liveDescendants.has(pid));
  return {
    rssBytes: [...entries.values()].reduce((total, entry) => total + entry.rss * 1024, 0),
    workerCount: liveWorkerPids.length,
    liveWorkerPids,
    pids: [...entries.keys()],
    churnedPids,
    trees: rootPids.map((rootPid) => ({
      rootPid,
      pids: [...entries.keys()].filter((pid) => owningRoot.get(pid) === rootPid),
    })),
  };
}

function commandFailure(command, result) {
  const detail = result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`;
  return new Error(`R-13 process telemetry unavailable from ${command}: ${detail}`);
}

export function localProcessTreeMetrics(roots, workerPids = [], {
  run = spawnSync,
  uid = typeof process.getuid === "function" ? process.getuid() : null,
  processLimit = DEFAULT_PROCESS_LIMIT,
  depthLimit = DEFAULT_DEPTH_LIMIT,
} = {}) {
  if (!Number.isSafeInteger(uid) || uid < 0) {
    throw new Error("R-13 process telemetry requires a local numeric user ID");
  }
  const listChildren = (pid) => {
    const result = run("pgrep", ["-U", String(uid), "-P", String(pid)], { encoding: "utf8" });
    if (!result.error && result.status === 1 && result.stdout?.trim() === "") return "";
    if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
      throw commandFailure("pgrep", result);
    }
    return result.stdout;
  };
  const queryMetrics = (pids) => {
    const result = run("ps", ["-o", "pid=,ppid=,rss=", "-p", pids.join(",")], {
      encoding: "utf8",
    });
    if (result.error || result.status !== 0 || typeof result.stdout !== "string") {
      throw commandFailure("ps", result);
    }
    return result.stdout;
  };
  return processTreeMetrics({
    roots,
    workerPids,
    listChildren,
    queryMetrics,
    processLimit,
    depthLimit,
  });
}

export function processTreeRss(options) {
  return processTreeMetrics(options).rssBytes;
}

function exited(child) {
  return !child || child.exitCode !== null || child.signalCode !== null;
}

function waitForExit(child, timeout) {
  if (exited(child)) return Promise.resolve(true);
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      child.removeListener("exit", onExit);
      resolvePromise(false);
    }, timeout);
    const onExit = () => {
      clearTimeout(timer);
      resolvePromise(true);
    };
    child.once("exit", onExit);
  });
}

function signalPid(pid, signal) {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

function pidIsAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    if (error?.code === "EPERM") return true;
    throw error;
  }
}

function orderedTreePids(pids, rootPid) {
  const unique = [...new Set(pids)].filter(validPid);
  return [
    ...unique.filter((pid) => pid !== rootPid).reverse(),
    rootPid,
  ];
}

async function waitForPidsToDisappear(pids, timeout, isAlive) {
  const deadline = Date.now() + timeout;
  let remaining = pids.filter(isAlive);
  while (remaining.length > 0 && Date.now() < deadline) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));
    remaining = remaining.filter(isAlive);
  }
  return remaining;
}

export async function terminateProcessTree(
  child,
  metricsProvider,
  {
    graceMs = 2_000,
    killWaitMs = 5_000,
    sampledPids = [],
    isAlive = pidIsAlive,
  } = {},
) {
  if (!child?.pid || !validPid(child.pid)) {
    return { sampledPids: [], termSignaledPids: [], killSignaledPids: [], verifiedGone: true };
  }
  let telemetryError;
  let exactSample = [...new Set(sampledPids.map(Number).filter(validPid))];
  if (!exited(child)) {
    try {
      exactSample = metricsProvider([child.pid]).pids;
    } catch (error) {
      telemetryError = error;
      exactSample = [child.pid];
    }
  }
  if (!exactSample.includes(child.pid)) exactSample.push(child.pid);
  const ordered = orderedTreePids(exactSample, child.pid);
  const termSignaledPids = ordered.filter(isAlive);
  for (const pid of termSignaledPids) signalPid(pid, "SIGTERM");
  if (!exited(child)) await waitForExit(child, graceMs);
  let remaining = await waitForPidsToDisappear(ordered, graceMs, isAlive);
  const killSignaledPids = ordered.filter((pid) => remaining.includes(pid));
  for (const pid of killSignaledPids) signalPid(pid, "SIGKILL");
  if (!exited(child)) await waitForExit(child, killWaitMs);
  remaining = await waitForPidsToDisappear(ordered, killWaitMs, isAlive);
  if (remaining.length > 0) {
    throw new Error(
      `sampled PID-only process tree rooted at ${child.pid} did not disappear: ${remaining.join(",")}`,
    );
  }
  const report = {
    sampledPids: ordered,
    termSignaledPids,
    killSignaledPids,
    verifiedGone: true,
  };
  if (telemetryError) {
    telemetryError.cleanupReport = report;
    throw telemetryError;
  }
  return report;
}
