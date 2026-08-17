import { describe, expect, it, vi } from "vitest";
import {
  probeManagedLaunchAgents,
  unloadManagedLaunchAgents,
  type ManagedLaunchAgentRuntime,
} from "../src/managed-launch-agent.js";

function runtime(
  run: ManagedLaunchAgentRuntime["run"],
  overrides: Partial<ManagedLaunchAgentRuntime> = {},
): ManagedLaunchAgentRuntime {
  return {
    hostPlatform: "darwin",
    uid: 501,
    launchctlPath: "/bin/launchctl",
    run,
    ...overrides,
  };
}

describe("managed launch-agent ownership", () => {
  it("fails closed when launchctl is unavailable on macOS", () => {
    expect(
      probeManagedLaunchAgents(
        runtime(vi.fn(), { launchctlPath: undefined }),
      ),
    ).toEqual({ status: "indeterminate", detail: "launchctl is unavailable" });
  });

  it("treats only launchctl EX_NOTFOUND as definitely absent", () => {
    const absent = vi.fn(() => ({ status: 113 }));
    expect(probeManagedLaunchAgents(runtime(absent))).toEqual({ status: "absent" });
    expect(absent).toHaveBeenCalledTimes(2);

    expect(
      probeManagedLaunchAgents(runtime(() => ({ status: 1 }))),
    ).toMatchObject({ status: "indeterminate" });
    expect(
      probeManagedLaunchAgents(
        runtime(() => ({ status: null, error: new Error("timeout") })),
      ),
    ).toMatchObject({ status: "indeterminate", detail: expect.stringContaining("timeout") });
  });

  it("discovers both upstream and Chronode launchd labels", () => {
    const run = vi.fn((_binary: string, args: string[]) => ({
      status: args[1]?.endsWith("com.chronode.agentmemory") ? 0 : 113,
    }));
    expect(probeManagedLaunchAgents(runtime(run))).toEqual({
      status: "loaded",
      services: ["gui/501/com.chronode.agentmemory"],
      launchctlPath: "/bin/launchctl",
      uid: 501,
    });
  });

  it("boots out every loaded supervisor before reporting success", () => {
    const run = vi.fn((_binary: string, args: string[]) => {
      if (args[0] === "print") return { status: 0 };
      return { status: 0 };
    });
    expect(unloadManagedLaunchAgents(runtime(run))).toEqual({
      status: "unloaded",
      services: [
        "gui/501/com.agentmemory.server",
        "gui/501/com.chronode.agentmemory",
      ],
    });
    expect(run.mock.calls.filter((call) => call[1][0] === "bootout")).toHaveLength(2);
  });

  it("fails closed when any supervisor cannot be booted out", () => {
    const run = vi.fn((_binary: string, args: string[]) =>
      args[0] === "print"
        ? { status: 0 }
        : { status: 5, stderr: "bootout denied" },
    );
    expect(unloadManagedLaunchAgents(runtime(run))).toEqual({
      status: "indeterminate",
      detail: "bootout denied",
    });
  });

  it("does not consult launchctl on non-macOS hosts", () => {
    const run = vi.fn();
    expect(
      probeManagedLaunchAgents(runtime(run, { hostPlatform: "linux" })),
    ).toEqual({ status: "absent" });
    expect(run).not.toHaveBeenCalled();
  });
});
