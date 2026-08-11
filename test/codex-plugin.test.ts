import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");
const pluginRoot = join(repoRoot, "plugin");

function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

type HookHandler = { type: string; command: string };
type HookEntry = { hooks: HookHandler[] };

function hookCommands(path: string): string[] {
  const manifest = readJson<{ hooks: Record<string, HookEntry[]> }>(path);
  return Object.values(manifest.hooks).flatMap((entries) =>
    entries.flatMap((entry) => entry.hooks.map((handler) => handler.command)),
  );
}

describe("Plugin hook manifests", () => {
  it("quote plugin script paths so roots with spaces stay intact", () => {
    for (const manifest of ["hooks.json", "hooks.codex.json"]) {
      const commands = hookCommands(join(pluginRoot, "hooks", manifest));
      expect(commands.length, `${manifest} should contain hook commands`).toBeGreaterThan(0);

      for (const command of commands) {
        expect(command).toMatch(/^node "\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/[^\s"]+\.mjs"$/);
      }
    }
  });

  it("ships self-contained scripts without stale source-map sidecars", () => {
    const scriptsDirectory = join(pluginRoot, "scripts");
    const entries = readdirSync(scriptsDirectory);
    expect(
      entries.filter(
        (entry) => entry.endsWith(".map") || entry.endsWith(".d.mts"),
      ),
    ).toEqual([]);
    for (const entry of entries.filter((name) => name.endsWith(".mjs"))) {
      expect(readFileSync(join(scriptsDirectory, entry), "utf8")).not.toContain(
        "sourceMappingURL",
      );
    }
  });
});

describe("Codex plugin manifest (developers.openai.com/codex/plugins)", () => {
  it("ships .codex-plugin/plugin.json with kebab-case name + version + references", () => {
    const manifestPath = join(pluginRoot, ".codex-plugin/plugin.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = readJson<{
      name: string;
      version: string;
      description?: string;
      skills?: string;
      mcpServers?: string;
      hooks?: string;
    }>(manifestPath);
    expect(manifest.name).toBe("agentmemory");
    expect(manifest.name).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(manifest.skills).toBeDefined();
    expect(manifest.mcpServers).toBeDefined();
    expect(manifest.hooks).toBeDefined();
  });

  it("manifest version matches main package.json", () => {
    const pkgVer = readJson<{ version: string }>(join(repoRoot, "package.json")).version;
    const codexVer = readJson<{ version: string }>(
      join(pluginRoot, ".codex-plugin/plugin.json"),
    ).version;
    expect(codexVer).toBe(pkgVer);
  });

  it("all referenced manifest paths resolve to existing files / directories", () => {
    const manifest = readJson<{ skills: string; mcpServers: string; hooks: string }>(
      join(pluginRoot, ".codex-plugin/plugin.json"),
    );
    expect(existsSync(join(pluginRoot, manifest.skills))).toBe(true);
    expect(existsSync(join(pluginRoot, manifest.mcpServers))).toBe(true);
    expect(existsSync(join(pluginRoot, manifest.hooks))).toBe(true);
  });

  it("plugin MCP server inherits remote agentmemory environment overrides", () => {
    const mcp = readJson<{
      mcpServers: Record<
        string,
        {
          command: string;
          args: string[];
          env?: Record<string, string>;
        }
      >;
    }>(join(pluginRoot, ".mcp.json"));

    expect(mcp.mcpServers.agentmemory?.command).toBe("node");
    expect(mcp.mcpServers.agentmemory?.args).toEqual([
      "${CLAUDE_PLUGIN_ROOT}/scripts/standalone.mjs",
    ]);

    // env interpolation must include defaults so Claude Code (and
    // any other MCP host that fails parse on unset ${VAR}) doesn't drop
    // the server silently when the user hasn't exported the var.
    expect(mcp.mcpServers.agentmemory?.env?.AGENTMEMORY_URL).toMatch(
      /\$\{AGENTMEMORY_URL:-/,
    );
    expect(mcp.mcpServers.agentmemory?.env?.AGENTMEMORY_SECRET).toMatch(
      /\$\{AGENTMEMORY_SECRET:-/,
    );
  });

  it("launches the bundled MCP server and completes initialize", async () => {
    const isolatedRoot = mkdtempSync(
      join(tmpdir(), "agentmemory-plugin-publish-tree-"),
    );
    const isolatedPlugin = join(isolatedRoot, "plugin");
    const home = join(isolatedRoot, "home");
    cpSync(pluginRoot, isolatedPlugin, { recursive: true });
    const { NODE_PATH: _nodePath, ...cleanEnv } = process.env;
    const child = spawn(
      process.execPath,
      [join(isolatedPlugin, "scripts/standalone.mjs")],
      {
        env: {
          ...cleanEnv,
          HOME: home,
          AGENTMEMORY_URL: "http://127.0.0.1:9",
          AGENTMEMORY_SECRET: "",
        },
        cwd: isolatedPlugin,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    try {
      const response = await new Promise<Record<string, unknown>>(
        (resolveResponse, rejectResponse) => {
          const timer = setTimeout(() => {
            rejectResponse(
              new Error(`bundled MCP initialize timed out: ${stderr.slice(-500)}`),
            );
          }, 5_000);
          let stdout = "";
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", (chunk: string) => {
            stdout += chunk;
            const newline = stdout.indexOf("\n");
            if (newline < 0) return;
            clearTimeout(timer);
            resolveResponse(
              JSON.parse(stdout.slice(0, newline)) as Record<string, unknown>,
            );
          });
          child.once("error", (error) => {
            clearTimeout(timer);
            rejectResponse(error);
          });
          child.once("exit", (code) => {
            if (code === null || code === 0) return;
            clearTimeout(timer);
            rejectResponse(
              new Error(`bundled MCP exited ${code}: ${stderr.slice(-500)}`),
            );
          });
          child.stdin.write(
            `${JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2025-03-26",
                capabilities: {},
                clientInfo: { name: "agentmemory-test", version: "1.0.0" },
              },
            })}\n`,
          );
        },
      );
      const packageVersion = readJson<{ version: string }>(
        join(repoRoot, "package.json"),
      ).version;
      expect(response).toMatchObject({
        jsonrpc: "2.0",
        id: 1,
        result: {
          serverInfo: {
            name: "agentmemory",
            version: packageVersion,
          },
        },
      });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
      rmSync(isolatedRoot, { recursive: true, force: true });
    }
  });

  it("hooks.codex.json covers the full Codex coding lifecycle", () => {
    const hooksPath = join(pluginRoot, "hooks/hooks.codex.json");
    const hooks = readJson<{ hooks: Record<string, unknown> }>(hooksPath);
    const events = Object.keys(hooks.hooks);
    const codexSupported = new Set([
      "SessionStart",
      "UserPromptSubmit",
      "PreToolUse",
      "PostToolUse",
      "PostToolUseFailure",
      "PreCompact",
      "SubagentStart",
      "SubagentStop",
      "TaskCompleted",
      "Stop",
      "SessionEnd",
    ]);
    for (const event of events) {
      expect(codexSupported.has(event), `unexpected event "${event}" in hooks.codex.json`).toBe(true);
    }
    expect(events).toContain("SessionStart");
    expect(events).toContain("UserPromptSubmit");
    expect(events).toContain("PreToolUse");
    expect(events).toContain("PostToolUse");
    expect(events).toContain("PostToolUseFailure");
    expect(events).toContain("PreCompact");
    expect(events).toContain("SubagentStart");
    expect(events).toContain("SubagentStop");
    expect(events).toContain("TaskCompleted");
    expect(events).toContain("Stop");
    expect(events).toContain("SessionEnd");
  });

  it("hook command scripts referenced in hooks.codex.json exist on disk", () => {
    const hooks = readJson<{ hooks: Record<string, HookEntry[]> }>(
      join(pluginRoot, "hooks/hooks.codex.json"),
    );
    const scriptRefs = new Set<string>();
    for (const entries of Object.values(hooks.hooks)) {
      for (const entry of entries) {
        for (const handler of entry.hooks) {
          const match = handler.command.match(/\$\{CLAUDE_PLUGIN_ROOT\}\/(scripts\/[^\s"]+)/);
          if (match) scriptRefs.add(match[1]);
        }
      }
    }
    expect(scriptRefs.size).toBeGreaterThan(0);
    for (const rel of scriptRefs) {
      expect(existsSync(join(pluginRoot, rel)), `missing hook script: ${rel}`).toBe(true);
    }
  });
});

describe("Codex marketplace.json (.codex-plugin/marketplace.json at repo root)", () => {
  it("ships a marketplace manifest pointing at the plugin/ subdirectory", () => {
    const marketplacePath = join(repoRoot, ".codex-plugin/marketplace.json");
    expect(existsSync(marketplacePath)).toBe(true);
    const marketplace = readJson<{
      name: string;
      plugins: Array<{
        name: string;
        source: { source: string; url: string; path: string; ref?: string };
      }>;
    }>(marketplacePath);
    expect(marketplace.name).toBe("agentmemory");
    expect(marketplace.plugins).toHaveLength(1);
    const entry = marketplace.plugins[0];
    expect(entry.name).toBe("agentmemory");
    expect(entry.source.source).toBe("git-subdir");
    expect(entry.source.path).toBe("./plugin");
    expect(entry.source.url).toMatch(/rohitg00\/agentmemory/);
  });
});
