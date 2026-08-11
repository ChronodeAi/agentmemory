import { execFileSync } from "node:child_process";
import {
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import type { HealthSnapshot } from "../types.js";

type EngineResources = NonNullable<HealthSnapshot["engineResources"]>;
type StoreInventory = NonNullable<EngineResources["stateStore"]>;

const MAX_STORE_FILES = 20_000;

function inventory(path: string): StoreInventory {
  let bytes = 0;
  let files = 0;
  let partial = false;
  const pending = [path];
  while (pending.length > 0) {
    const current = pending.pop()!;
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) continue;
    if (stat.isFile()) {
      bytes += stat.size;
      files += 1;
      if (files >= MAX_STORE_FILES) {
        partial = pending.length > 0;
        break;
      }
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const entry of readdirSync(current)) pending.push(join(current, entry));
  }
  return { bytes, files, partial };
}

function readEnginePid(root: string): number | null {
  try {
    const raw = readFileSync(join(root, "iii.pid"), "utf8").trim();
    if (!/^[1-9][0-9]*$/.test(raw)) return null;
    const pid = Number(raw);
    return Number.isSafeInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

export function parseEngineProcessSample(
  output: string,
  pid: number,
): { cpuPercent: number; rssBytes: number } {
  const match = output
    .trim()
    .match(/^([0-9]+)\s+([0-9.]+)\s+([0-9]+)\s+(.+)$/);
  if (!match || Number(match[1]) !== pid) {
    throw new Error("engine process sample did not match the pidfile");
  }
  const executable = match[4].trim().split(/\s+/, 1)[0];
  if (!["iii", "iii.exe"].includes(basename(executable))) {
    throw new Error("pidfile process identity is not iii-engine");
  }
  const cpuPercent = Number(match[2]);
  const rssKib = Number(match[3]);
  if (!Number.isFinite(cpuPercent) || !Number.isFinite(rssKib)) {
    throw new Error("engine process sample was invalid");
  }
  return { cpuPercent, rssBytes: rssKib * 1024 };
}

function processSample(pid: number): { cpuPercent: number; rssBytes: number } {
  const output = execFileSync(
    "ps",
    [
      "-ww",
      "-o",
      "pid=",
      "-o",
      "%cpu=",
      "-o",
      "rss=",
      "-o",
      "command=",
      "-p",
      String(pid),
    ],
    { encoding: "utf8", timeout: 2_000 },
  );
  return parseEngineProcessSample(output, pid);
}

function withGrowth(
  current: StoreInventory,
  previous: StoreInventory | undefined,
  elapsedMs: number | undefined,
): StoreInventory {
  if (!previous || !elapsedMs || elapsedMs <= 0) return current;
  const growthBytes = current.bytes - previous.bytes;
  return {
    ...current,
    growthBytes,
    growthBytesPerMinute: growthBytes / elapsedMs * 60_000,
  };
}

export function collectEngineResources(
  previous?: EngineResources,
  elapsedMs?: number,
  root = join(homedir(), ".agentmemory"),
  sampleProcess: (pid: number) => {
    cpuPercent: number;
    rssBytes: number;
  } = processSample,
): EngineResources {
  const stateStore = inventory(join(root, "data", "state_store.db"));
  const streamStore = inventory(join(root, "data", "stream_store"));
  const pid = readEnginePid(root);
  if (!pid) {
    return { status: "unavailable", stateStore, streamStore };
  }
  try {
    const process = sampleProcess(pid);
    const nextState = withGrowth(stateStore, previous?.stateStore, elapsedMs);
    const nextStream = withGrowth(streamStore, previous?.streamStore, elapsedMs);
    return {
      status: nextState.partial || nextStream.partial ? "partial" : "ok",
      pid,
      ...process,
      stateStore: nextState,
      streamStore: nextStream,
    };
  } catch (error) {
    return {
      status: "error",
      pid,
      error: error instanceof Error ? error.message : String(error),
      stateStore,
      streamStore,
    };
  }
}
