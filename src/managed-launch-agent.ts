import { spawnSync } from "node:child_process";
import { accessSync, constants, existsSync } from "node:fs";
import { platform } from "node:os";
import { delimiter, join } from "node:path";

export const AGENTMEMORY_LAUNCHD_LABELS = [
  "com.agentmemory.server",
  "com.chronode.agentmemory",
] as const;

interface LaunchctlResult {
  status: number | null;
  error?: Error;
  stdout?: string;
  stderr?: string;
}

export interface ManagedLaunchAgentRuntime {
  hostPlatform: NodeJS.Platform;
  uid?: number;
  launchctlPath?: string;
  run: (binary: string, args: string[]) => LaunchctlResult;
}

export type ManagedLaunchAgentProbe =
  | { status: "absent" }
  | {
      status: "loaded";
      services: string[];
      launchctlPath: string;
      uid: number;
    }
  | { status: "indeterminate"; detail: string };

export type ManagedLaunchAgentUnload =
  | { status: "absent" }
  | { status: "unloaded"; services: string[] }
  | { status: "indeterminate"; detail: string };

function findLaunchctl(): string | undefined {
  if (existsSync("/bin/launchctl")) return "/bin/launchctl";
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, "launchctl");
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }
  return undefined;
}

export function defaultManagedLaunchAgentRuntime(): ManagedLaunchAgentRuntime {
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  return {
    hostPlatform: platform(),
    uid,
    launchctlPath: findLaunchctl(),
    run: (binary, args) => {
      const result = spawnSync(binary, args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 10_000,
      });
      return {
        status: result.status,
        error: result.error,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    },
  };
}

export function probeManagedLaunchAgents(
  runtime = defaultManagedLaunchAgentRuntime(),
): ManagedLaunchAgentProbe {
  if (runtime.hostPlatform !== "darwin") return { status: "absent" };
  if (runtime.uid === undefined) {
    return { status: "indeterminate", detail: "macOS user id is unavailable" };
  }
  if (!runtime.launchctlPath) {
    return { status: "indeterminate", detail: "launchctl is unavailable" };
  }

  const loaded: string[] = [];
  for (const label of AGENTMEMORY_LAUNCHD_LABELS) {
    const service = `gui/${runtime.uid}/${label}`;
    const result = runtime.run(runtime.launchctlPath, ["print", service]);
    if (result.error) {
      return {
        status: "indeterminate",
        detail: `${label} probe failed: ${result.error.message}`,
      };
    }
    if (result.status === 0) {
      loaded.push(service);
      continue;
    }
    // launchctl uses EX_NOTFOUND (113) when the label is definitely absent.
    if (result.status !== 113) {
      return {
        status: "indeterminate",
        detail: `${label} probe exited ${result.status ?? "without status"}`,
      };
    }
  }
  return loaded.length > 0
    ? {
        status: "loaded",
        services: loaded,
        launchctlPath: runtime.launchctlPath,
        uid: runtime.uid,
      }
    : { status: "absent" };
}

export function unloadManagedLaunchAgents(
  runtime = defaultManagedLaunchAgentRuntime(),
): ManagedLaunchAgentUnload {
  const probe = probeManagedLaunchAgents(runtime);
  if (probe.status !== "loaded") return probe;
  for (const service of probe.services) {
    const result = runtime.run(probe.launchctlPath, ["bootout", service]);
    if (result.error || result.status !== 0) {
      return {
        status: "indeterminate",
        detail:
          result.error?.message ||
          result.stderr?.trim() ||
          `launchctl bootout exited ${result.status ?? "without status"}`,
      };
    }
  }
  return { status: "unloaded", services: probe.services };
}
