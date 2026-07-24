import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProject } from "../src/hooks/_project.js";

describe("resolveProject — canonical hook project resolver", () => {
  const originalEnv = process.env.AGENTMEMORY_PROJECT_NAME;
  const createGitFixture = () => {
    const root = mkdtempSync(join(tmpdir(), "amem-project-"));
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", [
      "-C",
      root,
      "remote",
      "add",
      "origin",
      "https://user:token@github.com/Example/Project.git",
    ]);
    return root;
  };

  beforeEach(() => {
    delete process.env.AGENTMEMORY_PROJECT_NAME;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.AGENTMEMORY_PROJECT_NAME;
    } else {
      process.env.AGENTMEMORY_PROJECT_NAME = originalEnv;
    }
  });

  it("AGENTMEMORY_PROJECT_NAME env wins over everything", () => {
    process.env.AGENTMEMORY_PROJECT_NAME = "my-override";
    expect(resolveProject("/var/log")).toBe("my-override");
    expect(resolveProject(process.cwd())).toBe("my-override");
  });

  it("trims whitespace on env override", () => {
    process.env.AGENTMEMORY_PROJECT_NAME = "  spaced  ";
    expect(resolveProject("/var/log")).toBe("spaced");
  });

  it("ignores empty env override", () => {
    process.env.AGENTMEMORY_PROJECT_NAME = "   ";
    const root = createGitFixture();
    try {
      expect(resolveProject(root)).toBe("github.com/example/project");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns the credential-free canonical remote inside a repo", () => {
    const root = createGitFixture();
    try {
      expect(resolveProject(root)).toBe("github.com/example/project");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns git toplevel basename from a nested subdir", () => {
    const root = createGitFixture();
    const nested = join(root, "src", "hooks");
    mkdirSync(nested, { recursive: true });
    try {
      expect(resolveProject(nested)).toBe("github.com/example/project");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("falls back to a stable hashed path when not in a git repo", () => {
    const dir = mkdtempSync(join(tmpdir(), "amem-noproj-"));
    try {
      expect(resolveProject(dir)).toMatch(/^local\/[a-f0-9]{24}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("defaults to process.cwd() when no cwd argument given", () => {
    expect(resolveProject()).toBe(resolveProject(process.cwd()));
  });

  it("defaults to process.cwd() when cwd argument is empty", () => {
    expect(resolveProject("")).toBe(resolveProject(process.cwd()));
    expect(resolveProject("   ")).toBe(resolveProject(process.cwd()));
  });
});
