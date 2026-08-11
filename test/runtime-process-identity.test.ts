import { describe, expect, it } from "vitest";
import {
  parseUnixProcessSample,
  runtimeProcessSampleMatches,
} from "../src/runtime-process-identity.js";

const workerScript = "/opt/agentmemory/dist/cli.mjs";
const engineConfig = "/opt/agentmemory/config/iii-config.yaml";

describe("runtime process identity", () => {
  it("parses a POSIX process sample with a stable start time", () => {
    const sample = parseUnixProcessSample(
      `42 Mon Aug 11 15:00:00 2026 /usr/bin/node ${workerScript}`,
      42,
    );
    expect(sample).toMatchObject({
      pid: 42,
      executable: "/usr/bin/node",
    });
    expect(sample.startedAtMs).toBeGreaterThan(0);
  });

  it("requires the owned iii executable and rejects PID reuse", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    const sample = {
      pid: 42,
      startedAtMs,
      executable: "/opt/agentmemory/iii",
      command: `/opt/agentmemory/iii --config ${engineConfig}`,
    };
    expect(
      runtimeProcessSampleMatches(sample, {
        kind: "engine",
        pidfileMtimeMs: startedAtMs + 500,
        expectedExecutable: "/opt/agentmemory/iii",
        expectedEngineConfigPath: engineConfig,
      }),
    ).toBe(true);
    expect(
      runtimeProcessSampleMatches(sample, {
        kind: "engine",
        pidfileMtimeMs: startedAtMs + 500,
        expectedExecutable: "/other/iii",
        expectedEngineConfigPath: engineConfig,
      }),
    ).toBe(false);
    expect(
      runtimeProcessSampleMatches(sample, {
        kind: "engine",
        pidfileMtimeMs: startedAtMs + 500,
        expectedEngineConfigPath: engineConfig,
      }),
    ).toBe(false);
    expect(
      runtimeProcessSampleMatches(sample, {
        kind: "engine",
        pidfileMtimeMs: startedAtMs - 2_000,
        expectedExecutable: "/opt/agentmemory/iii",
        expectedEngineConfigPath: engineConfig,
      }),
    ).toBe(false);
  });

  it("requires the exact engine config instance", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    const sample = {
      pid: 42,
      startedAtMs,
      executable: "/opt/agentmemory/iii",
      command: `/opt/agentmemory/iii --config ${engineConfig}`,
    };
    expect(
      runtimeProcessSampleMatches(sample, {
        kind: "engine",
        pidfileMtimeMs: startedAtMs + 500,
        expectedExecutable: "/opt/agentmemory/iii",
        expectedEngineConfigPath: "/tmp/other-iii-config.yaml",
      }),
    ).toBe(false);
    expect(
      runtimeProcessSampleMatches(
        { ...sample, command: `/opt/agentmemory/iii --config=${engineConfig}` },
        {
          kind: "engine",
          pidfileMtimeMs: startedAtMs + 500,
          expectedExecutable: "/opt/agentmemory/iii",
          expectedEngineConfigPath: engineConfig,
        },
      ),
    ).toBe(true);
  });

  it("keeps POSIX executable identity case-sensitive", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 42,
          startedAtMs,
          executable: "/opt/Agentmemory/iii",
          command: `/opt/Agentmemory/iii --config ${engineConfig}`,
        },
        {
          kind: "engine",
          pidfileMtimeMs: startedAtMs + 500,
          expectedExecutable: "/opt/agentmemory/iii",
          expectedEngineConfigPath: engineConfig,
        },
      ),
    ).toBe(false);
  });

  it("matches exact quoted Windows paths case-insensitively", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 42,
          startedAtMs,
          executable: "C:\\Agentmemory\\BIN\\iii.exe",
          command:
            '"C:\\Agentmemory\\BIN\\iii.exe" --config "C:\\Agentmemory\\Config\\iii config.yaml"',
        },
        {
          kind: "engine",
          pidfileMtimeMs: startedAtMs + 500,
          expectedExecutable: "c:\\agentmemory\\bin\\III.EXE",
          expectedEngineConfigPath:
            "c:\\agentmemory\\config\\III CONFIG.yaml",
        },
      ),
    ).toBe(true);
  });

  it("requires the exact packaged worker script", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    const expectation = {
      kind: "worker" as const,
      pidfileMtimeMs: startedAtMs + 500,
      expectedWorkerScripts: [workerScript],
    };
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 84,
          startedAtMs,
          executable: "/usr/bin/node",
          command: `/usr/bin/node ${workerScript}`,
        },
        expectation,
      ),
    ).toBe(true);
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 84,
          startedAtMs,
          executable: "/usr/bin/node",
          command: "/usr/bin/node /tmp/dist/cli.mjs --label agentmemory",
        },
        expectation,
      ),
    ).toBe(false);
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 84,
          startedAtMs,
          executable: "/usr/bin/node",
          command: `/usr/bin/node ${workerScript}.replaced`,
        },
        expectation,
      ),
    ).toBe(false);
  });

  it("matches the packaged Windows worker script case-insensitively", () => {
    const startedAtMs = Date.parse("2026-08-11T15:00:00Z");
    expect(
      runtimeProcessSampleMatches(
        {
          pid: 84,
          startedAtMs,
          executable: "C:\\Program Files\\nodejs\\NODE.EXE",
          command:
            '"C:\\Program Files\\nodejs\\node.exe" "C:\\Agentmemory\\dist\\CLI.MJS"',
        },
        {
          kind: "worker",
          pidfileMtimeMs: startedAtMs + 500,
          expectedWorkerScripts: ["c:\\agentmemory\\dist\\cli.mjs"],
        },
      ),
    ).toBe(true);
  });
});
