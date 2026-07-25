import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function isAcceptedNode(version) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (major === 20 && minor >= 19) || major === 22;
}

export function normalizeTestPath(root, value) {
  const absolute = resolve(value);
  const normalized = relative(root, absolute).replaceAll("\\", "/");
  return normalized.startsWith("test/") ? normalized : value.replaceAll("\\", "/");
}

export function processTreeMetrics(rows, roots) {
  if (typeof rows !== "string") {
    throw new TypeError("process table must be a string");
  }
  const entries = rows
    .trim()
    .split("\n")
    .map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s*(.*)$/);
      if (!match) return null;
      return {
        pid: Number(match[1]),
        ppid: Number(match[2]),
        rss: Number(match[3]),
        command: match[4],
      };
    })
    .filter(Boolean);
  const included = new Set(roots.filter(Boolean));
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries) {
      if (included.has(entry.ppid) && !included.has(entry.pid)) {
        included.add(entry.pid);
        changed = true;
      }
    }
  }
  const processTree = entries.filter((entry) => included.has(entry.pid));
  return {
    rssBytes: processTree.reduce(
      (total, entry) => total + entry.rss * 1024,
      0,
    ),
    workerCount: processTree.filter((entry) =>
      /tinypool.*entry\/process|vitest.*worker/i.test(entry.command),
    ).length,
    pids: processTree.map((entry) => entry.pid),
  };
}

export function processTreeRss(rows, roots) {
  return processTreeMetrics(rows, roots).rssBytes;
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

function signalTree(child, signal, rowsProvider) {
  if (!child?.pid || exited(child)) return;
  let pids = [child.pid];
  try {
    pids = processTreeMetrics(rowsProvider(), [child.pid]).pids;
  } catch {
    // The root PID remains a safe fallback when telemetry races process exit.
  }
  for (const pid of [...pids].reverse()) {
    try {
      process.kill(pid, signal);
    } catch (error) {
      if (error?.code !== "ESRCH") throw error;
    }
  }
}

export async function terminateProcessTree(
  child,
  rowsProvider,
  { graceMs = 2_000, killWaitMs = 5_000 } = {},
) {
  if (exited(child)) return;
  signalTree(child, "SIGTERM", rowsProvider);
  if (await waitForExit(child, graceMs)) return;
  signalTree(child, "SIGKILL", rowsProvider);
  if (!(await waitForExit(child, killWaitMs))) {
    throw new Error(`process tree rooted at ${child.pid} did not terminate`);
  }
}
