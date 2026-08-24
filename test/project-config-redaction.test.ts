import { describe, expect, it, vi, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  inferProjectId,
  redactRemoteForLog,
} from "../src/project-config.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function gitProject(remote?: string): string {
  const root = mkdtempSync(join(tmpdir(), "agentmemory-redaction-"));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  if (remote) {
    execFileSync(
      "git",
      ["-C", root, "remote", "add", "origin", remote],
    );
  }
  return root;
}

describe("redactRemoteForLog", () => {
  it("masks credentials on https remotes", () => {
    expect(redactRemoteForLog("https://alice:s3cret@example.org/org/repo.git")).toBe(
      "https://***@example.org/org/repo.git",
    );
  });

  it("masks credentials on scp-style remotes", () => {
    expect(redactRemoteForLog("deploy:s3cret@git.internal:org/repo.git")).toBe(
      "***@git.internal:org/repo.git",
    );
  });

  it("preserves the scheme and masks everything through the last @", () => {
    expect(redactRemoteForLog("ssh://git@host.example:2222/org/repo.git")).toBe(
      "ssh://***@host.example:2222/org/repo.git",
    );
    expect(redactRemoteForLog("https://a@b:c@d.example/x/y")).toBe(
      "https://***@d.example/x/y",
    );
  });

  it("leaves credential-free remotes untouched", () => {
    expect(redactRemoteForLog("https://github.com/org/repo.git")).toBe(
      "https://github.com/org/repo.git",
    );
    expect(redactRemoteForLog("/srv/git/repo")).toBe("/srv/git/repo");
    // A username alone is still material after the marker position rule.
    expect(redactRemoteForLog("git@github.com:org/repo.git")).toBe(
      "***@github.com:org/repo.git",
    );
  });
});

describe("inferProjectId identity-fallback warning", () => {
  it("never writes raw remote credentials to stderr", () => {
    const root = gitProject("https://alice:s3cret@example.org/solo.git");
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(((chunk: unknown) => {
        writes.push(String(chunk));
        return true;
      }) as never);
    try {
      expect(inferProjectId(root)).toMatch(/^local\/[a-f0-9]{24}$/);
    } finally {
      spy.mockRestore();
    }
    const output = writes.join("");
    expect(output).toContain("***@example.org/solo.git");
    expect(output).not.toContain("s3cret");
    expect(output).not.toContain("alice:");
  });
});
