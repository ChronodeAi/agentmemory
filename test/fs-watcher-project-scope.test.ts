import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  deriveProjectId,
  FilesystemWatcher,
} from "../integrations/filesystem-watcher/watcher.mjs";

interface CapturedRequest {
  body: {
    sessionId: string;
    project: string;
    cwd: string;
    data: { files: string[] };
  };
}

function initRepository(root: string, remote: string): void {
  mkdirSync(root, { recursive: true });
  execFileSync("git", ["init", "-q", root]);
  execFileSync("git", ["-C", root, "remote", "add", "origin", remote]);
}

describe("FilesystemWatcher project and root boundaries", () => {
  let sandbox: string;
  let captured: CapturedRequest[];
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), "agentmemory-watcher-"));
    captured = [];
    globalThis.fetch = vi.fn(async (_url, init) => {
      captured.push({ body: JSON.parse(String(init?.body)) });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("uses credential-free canonical remotes and separate sessions per root", async () => {
    const first = join(sandbox, "one", "repo");
    const second = join(sandbox, "two", "repo");
    initRepository(
      first,
      "https://discarded-credential@github.com/ChronodeAi/Memetics.git",
    );
    initRepository(second, "git@github.com:ChronodeAi/agentmemory.git");
    writeFileSync(join(first, "one.md"), "first");
    writeFileSync(join(second, "two.md"), "second");

    const watcher = new FilesystemWatcher({
      roots: [first, second],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    await watcher.flush(first, "one.md");
    await watcher.flush(second, "two.md");

    expect(captured.map((request) => request.body.project)).toEqual([
      "github.com/chronodeai/memetics",
      "github.com/chronodeai/agentmemory",
    ]);
    expect(captured[0].body.sessionId).not.toBe(captured[1].body.sessionId);
  });

  it("uses a stable hashed path identity when no remote exists", () => {
    const root = join(sandbox, "local-only");
    mkdirSync(root);
    expect(deriveProjectId(root)).toMatch(/^local\/[a-f0-9]{24}$/);
    expect(deriveProjectId(root)).toBe(deriveProjectId(root));
  });

  it("refuses traversal and roots outside the configured set", async () => {
    const root = join(sandbox, "root");
    mkdirSync(root);
    const watcher = new FilesystemWatcher({
      roots: [root],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    await watcher.flush(root, "../outside.md");
    await watcher.flush(join(sandbox, "other"), "file.md");
    expect(captured).toHaveLength(0);
  });

  it("refuses to read a symlink that escapes the watched root", async () => {
    const root = join(sandbox, "root");
    const outside = join(sandbox, "outside-secret.txt");
    mkdirSync(root);
    writeFileSync(outside, "must not be captured");
    symlinkSync(outside, join(root, "linked.txt"));
    const watcher = new FilesystemWatcher({
      roots: [root],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });

    await watcher.flush(root, "linked.txt");

    expect(captured).toHaveLength(0);
  });

  it("fails deterministically when a configured root is absent", () => {
    const watcher = new FilesystemWatcher({
      roots: [join(sandbox, "missing")],
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
    expect(() => watcher.start()).toThrow(/could not watch any/);
  });
});
