import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openReadonlyMigrationDatabase,
  runMigrationCli,
} from "../src/functions/migrate.js";
import { StateKV } from "../src/state/kv.js";

const tempRoots: string[] = [];
const nodeMajor = Number(process.versions.node.split(".")[0]);
const itWithNodeSqlite = nodeMajor >= 22 ? it : it.skip;

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("SQLite migration runtime", () => {
  itWithNodeSqlite(
    "uses the built-in read-only backend when better-sqlite3 is unavailable",
    async () => {
      const root = mkdtempSync(join(tmpdir(), "agentmemory-migration-"));
      tempRoots.push(root);
      const dbPath = join(root, "legacy.db");
      const { DatabaseSync } = await import("node:sqlite");
      const writer = new DatabaseSync(dbPath);
      writer.exec(
        "CREATE TABLE sessions (session_id TEXT PRIMARY KEY); " +
          "INSERT INTO sessions VALUES ('legacy-session');",
      );
      writer.close();

      const opened = await openReadonlyMigrationDatabase(dbPath, {
        loadBetterSqlite3: async () => {
          throw new Error("optional dependency absent");
        },
      });

      expect(opened.backend).toBe("node:sqlite");
      expect(
        opened.database.prepare("SELECT session_id FROM sessions").all(),
      ).toEqual([{ session_id: "legacy-session" }]);
      opened.database.close();
    },
  );
});

describe("migration CLI local authentication", () => {
  it("reads the administrative credential from its configured file", async () => {
    const root = mkdtempSync(join(tmpdir(), "agentmemory-migration-auth-"));
    tempRoots.push(root);
    const secretPath = join(root, "admin-secret");
    writeFileSync(secretPath, "admin-from-file\n", { mode: 0o600 });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(init?.headers).toMatchObject({
          authorization: "Bearer admin-from-file",
        });
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    const exitCode = await runMigrationCli(
      ["--step", "infer-memory-projects"],
      {
        env: {
          AGENTMEMORY_ADMIN_SECRET_FILE: secretPath,
          AGENTMEMORY_URL: "http://127.0.0.1:7411",
        },
        fetchImpl: fetchImpl as typeof fetch,
        stdout: (text) => stdout.push(text),
        stderr: (text) => stderr.push(text),
      },
    );

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(stderr).toEqual([]);
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      operationSucceeded: true,
      endpoint: "http://127.0.0.1:7411/agentmemory/migrate",
    });
    expect(stdout.join("")).not.toContain("admin-from-file");
  });
});

describe("StateKV missing-value contract", () => {
  it("normalizes the engine's undefined missing value to null", async () => {
    const trigger = vi.fn().mockResolvedValue(undefined);
    const kv = new StateKV({ trigger } as never);

    await expect(kv.get("mem:sessions", "missing")).resolves.toBeNull();
    expect(trigger).toHaveBeenCalledWith({
      function_id: "state::get",
      payload: { scope: "mem:sessions", key: "missing" },
    });
  });
});
