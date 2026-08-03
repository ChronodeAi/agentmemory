import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_HOME = process.env["HOME"];
const ORIGINAL_USERPROFILE = process.env["USERPROFILE"];

let sandboxHome: string;

async function freshConfig() {
  vi.resetModules();
  return await import("../src/config.js");
}

function writeEnv(contents: string) {
  const dir = join(sandboxHome, ".agentmemory");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, ".env"), contents);
}

describe("loadEnvFile", () => {
  beforeEach(() => {
    sandboxHome = mkdtempSync(join(tmpdir(), "agentmemory-env-"));
    process.env["HOME"] = sandboxHome;
    process.env["USERPROFILE"] = sandboxHome;
    delete process.env["AGENTMEMORY_AUTO_COMPRESS"];
    delete process.env["AGENTMEMORY_DROP_STALE_INDEX"];
    delete process.env["CONSOLIDATION_ENABLED"];
    delete process.env["GRAPH_EXTRACTION_ENABLED"];
    delete process.env["TOKEN"];
    delete process.env["HASHVAL"];
    delete process.env["AGENTMEMORY_SECRET"];
    delete process.env["AGENTMEMORY_SECRET_FILE"];
    delete process.env["AGENTMEMORY_ADMIN_SECRET"];
    delete process.env["AGENTMEMORY_ADMIN_SECRET_FILE"];
  });

  afterEach(() => {
    if (ORIGINAL_HOME === undefined) delete process.env["HOME"];
    else process.env["HOME"] = ORIGINAL_HOME;
    if (ORIGINAL_USERPROFILE === undefined) delete process.env["USERPROFILE"];
    else process.env["USERPROFILE"] = ORIGINAL_USERPROFILE;
    delete process.env["AGENTMEMORY_SECRET"];
    delete process.env["AGENTMEMORY_SECRET_FILE"];
    delete process.env["AGENTMEMORY_ADMIN_SECRET"];
    delete process.env["AGENTMEMORY_ADMIN_SECRET_FILE"];
    rmSync(sandboxHome, { recursive: true, force: true });
  });

  it("strips trailing inline # comments on unquoted values", async () => {
    writeEnv(
      [
        "AGENTMEMORY_AUTO_COMPRESS=true   # opt in to LLM compression",
        "CONSOLIDATION_ENABLED=true       # daily summarization",
        "GRAPH_EXTRACTION_ENABLED=true    # entity graph",
      ].join("\n"),
    );
    const cfg = await freshConfig();
    expect(cfg.isAutoCompressEnabled()).toBe(true);
    expect(cfg.isConsolidationEnabled()).toBe(true);
    expect(cfg.isGraphExtractionEnabled()).toBe(true);
  });

  it("preserves # inside double-quoted values", async () => {
    writeEnv('TOKEN="abc#def"');
    const cfg = await freshConfig();
    expect(cfg.getEnvVar("TOKEN")).toBe("abc#def");
  });

  it("preserves # inside single-quoted values", async () => {
    writeEnv("TOKEN='abc#def'");
    const cfg = await freshConfig();
    expect(cfg.getEnvVar("TOKEN")).toBe("abc#def");
  });

  it("treats hash without leading space as part of value", async () => {
    writeEnv("HASHVAL=abc#def");
    const cfg = await freshConfig();
    expect(cfg.getEnvVar("HASHVAL")).toBe("abc#def");
  });

  it("strips inline comment after a quoted value and unwraps quotes", async () => {
    writeEnv('TOKEN="abc" # trailing comment');
    const cfg = await freshConfig();
    expect(cfg.getEnvVar("TOKEN")).toBe("abc");
  });

  it("strips inline comment after a single-quoted value and unwraps quotes", async () => {
    writeEnv("TOKEN='abc' # trailing comment");
    const cfg = await freshConfig();
    expect(cfg.getEnvVar("TOKEN")).toBe("abc");
  });

  it("reads AGENTMEMORY_DROP_STALE_INDEX from the env file", async () => {
    writeEnv("AGENTMEMORY_DROP_STALE_INDEX=true");
    const cfg = await freshConfig();
    expect(cfg.isDropStaleIndexEnabled()).toBe(true);
  });

  it("reads supported REST credentials from a secret file", async () => {
    const secretPath = join(sandboxHome, "agentmemory.secret");
    writeFileSync(secretPath, "secret-from-file\n");
    writeEnv(`AGENTMEMORY_SECRET_FILE=${secretPath}`);

    const cfg = await freshConfig();
    expect(cfg.getEnvVar("AGENTMEMORY_SECRET")).toBe("secret-from-file");
  });

  it("preserves direct process-environment precedence over a secret file", async () => {
    const secretPath = join(sandboxHome, "agentmemory.secret");
    writeFileSync(secretPath, "secret-from-file\n");
    writeEnv(`AGENTMEMORY_SECRET_FILE=${secretPath}`);
    process.env["AGENTMEMORY_SECRET"] = "secret-from-process";

    const cfg = await freshConfig();
    expect(cfg.getEnvVar("AGENTMEMORY_SECRET")).toBe(
      "secret-from-process",
    );
  });

  it("reads the administrative credential from its configured file", async () => {
    const secretPath = join(sandboxHome, "agentmemory.admin");
    writeFileSync(secretPath, "admin-from-file\n");
    writeEnv(`AGENTMEMORY_ADMIN_SECRET_FILE=${secretPath}`);

    const cfg = await freshConfig();
    expect(cfg.getEnvVar("AGENTMEMORY_ADMIN_SECRET")).toBe("admin-from-file");
  });

  it("reports the configured retrieval mode accurately in zero-LLM mode", async () => {
    const keys = [
      "OPENAI_API_KEY",
      "MINIMAX_API_KEY",
      "ANTHROPIC_API_KEY",
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY",
      "OPENROUTER_API_KEY",
      "VOYAGE_API_KEY",
      "COHERE_API_KEY",
      "EMBEDDING_PROVIDER",
      "AGENTMEMORY_ALLOW_AGENT_SDK",
    ];
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    const stderr = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      for (const key of keys) delete process.env[key];
      let cfg = await freshConfig();
      cfg.loadConfig();
      let output = stderr.mock.calls.map(([value]) => String(value)).join("");
      expect(output).toContain(
        "BM25-only retrieval; semantic embeddings are not configured",
      );
      expect(output).not.toContain("on-device embeddings");

      stderr.mockClear();
      process.env["EMBEDDING_PROVIDER"] = "local";
      cfg = await freshConfig();
      cfg.loadConfig();
      output = stderr.mock.calls.map(([value]) => String(value)).join("");
      expect(output).toContain("BM25 + local semantic embeddings");
    } finally {
      stderr.mockRestore();
      for (const [key, value] of previous) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
