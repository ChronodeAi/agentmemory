import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  captureToolEvent,
  parseCommitTransitions,
} from "../src/hooks/_capture.js";
import { collectCommitLinkage } from "../src/hooks/post-commit.js";
import type { AgentmemoryProjectConfig } from "../src/project-config.js";
import { stripPrivateData } from "../src/functions/privacy.js";

const config: AgentmemoryProjectConfig = {
  schema_version: 1,
  project_id: "github.com/example/project",
  privacy: "strict",
  capture_profile: "balanced",
  source_roots: ["src", "test"],
  decision_roots: ["docs/adr"],
  exclude_globs: ["**/.env", "**/.env.*", "**/dist/**"],
  external_processing: false,
  root: "/tmp/project",
};

describe("balanced coding capture", () => {
  it("captures reads as metadata with a hash instead of raw output", () => {
    const result = captureToolEvent(
      "file_read",
      { file_path: "src/app.ts" },
      "sensitive source body",
      config,
    );
    expect(result?.capture).toBe("metadata-only");
    expect(result?.toolOutput).toMatchObject({
      capture: "metadata-only",
      output_chars: 21,
    });
    expect(JSON.stringify(result?.toolOutput)).not.toContain(
      "sensitive source body",
    );
  });

  it("keeps full mutation capture with deterministic credential-free provenance", () => {
    const root = mkdtempSync(join(tmpdir(), "amem-capture-"));
    const file = join(root, "app.ts");
    try {
      execFileSync("git", ["init", "-q", root]);
      execFileSync("git", ["-C", root, "config", "user.name", "Capture Test"]);
      execFileSync("git", [
        "-C",
        root,
        "config",
        "user.email",
        "capture@example.test",
      ]);
      execFileSync("git", [
        "-C",
        root,
        "remote",
        "add",
        "origin",
        "https://user:token@github.com/example/project.git",
      ]);
      writeFileSync(file, "before\n");
      execFileSync("git", ["-C", root, "add", "app.ts"]);
      execFileSync("git", ["-C", root, "commit", "-qm", "base"]);
      const baseHeadSha = execFileSync(
        "git",
        ["-C", root, "rev-parse", "HEAD"],
        { encoding: "utf8" },
      ).trim();

      writeFileSync(file, "super-secret-updated-content\n");
      const fixtureConfig = { ...config, root };
      const first = captureToolEvent(
        "file_write",
        {
          file_path: file,
          content: "super-secret-updated-content",
          authorization: "Bearer should-never-be-captured",
        },
        "x".repeat(9000),
        fixtureConfig,
      );
      const second = captureToolEvent(
        "file_write",
        {
          file_path: file,
          content: "super-secret-updated-content",
          authorization: "Bearer should-never-be-captured",
        },
        "x".repeat(9000),
        fixtureConfig,
      );

      expect(first?.capture).toBe("full");
      expect(first?.toolInput).toMatchObject({
        content: "super-secret-updated-content",
      });
      expect(String(first?.toolOutput).length).toBeLessThanOrEqual(8020);
      expect(first?.provenance).toEqual(second?.provenance);
      expect(first?.provenance).toMatchObject({
        project: "github.com/example/project",
        baseHeadSha,
        dirty: true,
        transitions: [
          {
            path: "app.ts",
            operation: "write",
            digestKind: "git-blob",
          },
        ],
      });
      expect(first?.provenance?.worktreeId).toMatch(/^wt_[a-f0-9]{32}$/);
      expect(
        captureToolEvent(
          "file_edit",
          { file_path: file, new_string: "super-secret-updated-content" },
          "edited",
          fixtureConfig,
        )?.provenance?.transitions[0],
      ).toMatchObject({
        path: "app.ts",
        operation: "edit",
        digestKind: "git-blob",
      });
      const serializedProvenance = JSON.stringify(first?.provenance);
      expect(serializedProvenance).not.toContain("super-secret");
      expect(serializedProvenance).not.toContain("Bearer");
      expect(serializedProvenance).not.toContain("user:token");
      expect(serializedProvenance).not.toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("captures delete provenance against the base revision", () => {
    const root = mkdtempSync(join(tmpdir(), "amem-delete-"));
    const file = join(root, "obsolete.ts");
    try {
      execFileSync("git", ["init", "-q", root]);
      execFileSync("git", ["-C", root, "config", "user.name", "Capture Test"]);
      execFileSync("git", [
        "-C",
        root,
        "config",
        "user.email",
        "capture@example.test",
      ]);
      writeFileSync(file, "obsolete\n");
      execFileSync("git", ["-C", root, "add", "obsolete.ts"]);
      execFileSync("git", ["-C", root, "commit", "-qm", "base"]);
      const blob = execFileSync(
        "git",
        ["-C", root, "rev-parse", "HEAD:obsolete.ts"],
        { encoding: "utf8" },
      ).trim();
      unlinkSync(file);

      const result = captureToolEvent(
        "delete_file",
        { file_path: file },
        "deleted",
        { ...config, root },
      );

      expect(result?.provenance?.transitions).toEqual([
        {
          path: "obsolete.ts",
          operation: "delete",
          digest: blob,
          digestKind: "git-blob",
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("never attaches mutation provenance to failed tool events", () => {
    expect(
      captureToolEvent(
        "file_edit",
        { file_path: "src/app.ts" },
        "failed",
        config,
        true,
      )?.provenance,
    ).toBeUndefined();
  });

  it("parses commit rename and delete transitions idempotently", () => {
    const status = [
      "M\tsrc/changed.ts",
      "R100\tsrc/old.ts\tsrc/new.ts",
      "D\tsrc/removed.ts",
    ].join("\n");
    expect(parseCommitTransitions(status)).toEqual([
      { operation: "edit", path: "src/changed.ts" },
      {
        operation: "rename",
        previousPath: "src/old.ts",
        path: "src/new.ts",
      },
      { operation: "delete", path: "src/removed.ts" },
    ]);
  });

  it("posts credential-free commit linkage with rename and delete transitions", async () => {
    const root = mkdtempSync(join(tmpdir(), "amem-commit-"));
    try {
      execFileSync("git", ["init", "-q", root]);
      execFileSync("git", ["-C", root, "config", "user.name", "Commit Test"]);
      execFileSync("git", [
        "-C",
        root,
        "config",
        "user.email",
        "commit@example.test",
      ]);
      execFileSync("git", [
        "-C",
        root,
        "remote",
        "add",
        "origin",
        "https://user:token@github.com/example/project.git",
      ]);
      writeFileSync(join(root, "old.ts"), "renamed\n");
      writeFileSync(join(root, "removed.ts"), "removed\n");
      execFileSync("git", ["-C", root, "add", "."]);
      execFileSync("git", ["-C", root, "commit", "-qm", "base"]);
      const baseHeadSha = execFileSync(
        "git",
        ["-C", root, "rev-parse", "HEAD"],
        { encoding: "utf8" },
      ).trim();
      execFileSync("git", ["-C", root, "mv", "old.ts", "new.ts"]);
      unlinkSync(join(root, "removed.ts"));
      execFileSync("git", ["-C", root, "add", "-A"]);
      execFileSync("git", ["-C", root, "commit", "-qm", "transition"]);
      const commitSha = execFileSync(
        "git",
        ["-C", root, "rev-parse", "HEAD"],
        { encoding: "utf8" },
      ).trim();

      const received = await collectCommitLinkage(
        root,
        commitSha,
        "session-1",
        "github.com/example/project",
      );

      expect(received).toMatchObject({
        sessionId: "session-1",
        project: "github.com/example/project",
        repo: "github.com/example/project",
        sha: commitSha,
        commitSha,
        baseHeadSha,
        fileTransitions: expect.arrayContaining([
          expect.objectContaining({
            operation: "rename",
            previousPath: "old.ts",
            path: "new.ts",
            digestKind: "git-blob",
          }),
          expect.objectContaining({
            operation: "delete",
            path: "removed.ts",
            digestKind: "git-blob",
          }),
        ]),
      });
      expect(received.worktreeId).toMatch(/^wt_[a-f0-9]{32}$/);
      const serialized = JSON.stringify(received);
      expect(serialized).not.toContain("user:token");
      expect(serialized).not.toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("drops events whose referenced files are all excluded", () => {
    expect(
      captureToolEvent(
        "file_read",
        { file_path: ".env" },
        "SECRET=value",
        config,
      ),
    ).toBeNull();
  });

  it("drops mixed-path events when any referenced file is excluded", () => {
    expect(
      captureToolEvent(
        "file_read",
        { file_paths: ["src/app.ts", ".env"] },
        "combined output",
        config,
      ),
    ).toBeNull();
  });

  it("drops command events that reference excluded AIWG working files", () => {
    expect(
      captureToolEvent(
        "Bash",
        {
          command:
            "jq . .aiwg/working/construction/private-control.json",
        },
        "sensitive working evidence",
        {
          ...config,
          exclude_globs: [...config.exclude_globs, "**/.aiwg/working/**"],
        },
      ),
    ).toBeNull();
  });

  it("redacts representative credentials before storage or providers", () => {
    const secret = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
    const cleaned = stripPrivateData(`token=${secret} Bearer ${secret}`);
    expect(cleaned).not.toContain(secret);
    expect(cleaned).toContain("[REDACTED_SECRET]");
  });
});
