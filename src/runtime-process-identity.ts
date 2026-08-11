import { execFileSync } from "node:child_process";
import { readlinkSync, realpathSync } from "node:fs";
import { basename, resolve } from "node:path";

export type AgentmemoryProcessKind = "engine" | "worker";

export interface RuntimeProcessSample {
  pid: number;
  startedAtMs: number;
  executable: string;
  command: string;
}

export interface RuntimeProcessExpectation {
  kind: AgentmemoryProcessKind;
  pidfileMtimeMs: number;
  expectedExecutable?: string;
  expectedEngineConfigPath?: string;
  expectedWorkerScripts?: string[];
}

export function parseUnixProcessSample(
  output: string,
  pid: number,
): RuntimeProcessSample {
  const match = output
    .trim()
    .match(
      /^([0-9]+)\s+([A-Za-z]{3}\s+[A-Za-z]{3}\s+[0-9]{1,2}\s+[0-9]{2}:[0-9]{2}:[0-9]{2}\s+[0-9]{4})\s+(.+)$/,
    );
  if (!match || Number(match[1]) !== pid) {
    throw new Error("process sample did not match the pidfile");
  }
  const startedAtMs = Date.parse(match[2]);
  if (!Number.isFinite(startedAtMs)) {
    throw new Error("process start time was invalid");
  }
  const command = match[3].trim();
  return {
    pid,
    startedAtMs,
    executable: command.split(/\s+/, 1)[0],
    command,
  };
}

function captureWindowsProcess(pid: number): RuntimeProcessSample {
  const script =
    `$p=Get-CimInstance Win32_Process -Filter \"ProcessId=${pid}\";` +
    `if($null -eq $p){exit 3};` +
    `[pscustomobject]@{pid=$p.ProcessId;started=$p.CreationDate.ToUniversalTime().ToString('o');` +
    `executable=$p.ExecutablePath;command=$p.CommandLine}|ConvertTo-Json -Compress`;
  const raw = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", script],
    { encoding: "utf8", timeout: 2_000 },
  );
  const parsed = JSON.parse(raw) as {
    pid?: unknown;
    started?: unknown;
    executable?: unknown;
    command?: unknown;
  };
  const startedAtMs = Date.parse(String(parsed.started ?? ""));
  if (
    parsed.pid !== pid ||
    !Number.isFinite(startedAtMs) ||
    typeof parsed.executable !== "string" ||
    typeof parsed.command !== "string"
  ) {
    throw new Error("Windows process sample was invalid");
  }
  return {
    pid,
    startedAtMs,
    executable: parsed.executable,
    command: parsed.command,
  };
}

export function captureRuntimeProcess(
  pid: number,
  hostPlatform: NodeJS.Platform = process.platform,
): RuntimeProcessSample {
  if (hostPlatform === "win32") return captureWindowsProcess(pid);
  const output = execFileSync(
    "ps",
    [
      "-ww",
      "-o",
      "pid=",
      "-o",
      "lstart=",
      "-o",
      "command=",
      "-p",
      String(pid),
    ],
    { encoding: "utf8", timeout: 2_000 },
  );
  const sample = parseUnixProcessSample(output, pid);
  try {
    sample.executable =
      hostPlatform === "linux"
        ? readlinkSync(`/proc/${pid}/exe`)
        : execFileSync(
            "ps",
            ["-ww", "-o", "comm=", "-p", String(pid)],
            { encoding: "utf8", timeout: 2_000 },
          ).trim();
  } catch {
    // The command's first argv remains a conservative fallback. Exact path
    // matching below still fails closed if it cannot establish ownership.
  }
  return sample;
}

function isWindowsPath(value: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\");
}

function normalizedExecutable(path: string): string {
  if (isWindowsPath(path)) {
    return path.replace(/\//g, "\\").toLowerCase();
  }
  const absolute = resolve(path);
  try {
    return realpathSync.native(absolute);
  } catch {
    return absolute;
  }
}

function regexpEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function commandHasExactPathArgument(
  command: string,
  script: string,
  caseInsensitive = false,
): boolean {
  const candidates = new Set([script, resolve(script), normalizedExecutable(script)]);
  return [...candidates].some((candidate) => {
    const escaped = regexpEscape(candidate);
    const flags = caseInsensitive || isWindowsPath(candidate) ? "i" : undefined;
    return (
      new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, flags).test(command) ||
      new RegExp(`(?:^|\\s)["']${escaped}["'](?=$|\\s)`, flags).test(command)
    );
  });
}

function commandHasExactOptionPath(
  command: string,
  option: string,
  path: string,
  caseInsensitive = false,
): boolean {
  const candidates = new Set([path, resolve(path), normalizedExecutable(path)]);
  return [...candidates].some((candidate) => {
    const escaped = regexpEscape(candidate);
    const flags = caseInsensitive || isWindowsPath(candidate) ? "i" : undefined;
    return new RegExp(
      `(?:^|\\s)${regexpEscape(option)}(?:=|\\s+)(?:["']${escaped}["']|${escaped})(?=$|\\s)`,
      flags,
    ).test(command);
  });
}

export function runtimeProcessSampleMatches(
  sample: RuntimeProcessSample,
  expectation: RuntimeProcessExpectation,
): boolean {
  // lstart has one-second precision on POSIX; allow only that rounding gap.
  if (sample.startedAtMs > expectation.pidfileMtimeMs + 1_000) return false;
  const executableName = basename(sample.executable.replace(/\\/g, "/")).toLowerCase();
  const windowsCommand = executableName.endsWith(".exe");
  if (expectation.kind === "engine") {
    if (executableName !== "iii" && executableName !== "iii.exe") return false;
    if (
      !expectation.expectedExecutable ||
      !expectation.expectedEngineConfigPath
    ) {
      return false;
    }
    return (
      normalizedExecutable(sample.executable) ===
        normalizedExecutable(expectation.expectedExecutable) &&
      commandHasExactOptionPath(
        sample.command,
        "--config",
        expectation.expectedEngineConfigPath,
        windowsCommand,
      )
    );
  }
  const workerRuntime = new Set([
    "node",
    "node.exe",
    "bun",
    "bun.exe",
    "deno",
    "deno.exe",
    "agentmemory",
    "agentmemory.exe",
  ]);
  const scripts = expectation.expectedWorkerScripts ?? [];
  return (
    workerRuntime.has(executableName) &&
    scripts.length > 0 &&
    scripts.some((script) =>
      commandHasExactPathArgument(sample.command, script, windowsCommand),
    )
  );
}

export function agentmemoryProcessIdentityMatches(
  pid: number,
  expectation: RuntimeProcessExpectation,
): boolean {
  try {
    return runtimeProcessSampleMatches(
      captureRuntimeProcess(pid),
      expectation,
    );
  } catch {
    return false;
  }
}

export function runtimeProcessExecutable(pid: number): string | undefined {
  try {
    return captureRuntimeProcess(pid).executable;
  } catch {
    return undefined;
  }
}
