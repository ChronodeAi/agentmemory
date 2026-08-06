import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getUserProjectConfigPath,
  inferProjectId,
  isProjectPathExcluded,
  normalizeGitRemote,
  normalizedProjectPath,
  resolveProjectConfig,
} from "../src/project-config.js";

const roots: string[] = [];
const priorEnv = { ...process.env };

afterEach(() => {
  process.env = { ...priorEnv };
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function gitProject(remote?: string): string {
  const root = mkdtempSync(join(tmpdir(), "agentmemory-project-"));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  if (remote) {
    execFileSync("git", ["remote", "add", "origin", remote], { cwd: root });
  }
  return root;
}

describe("canonical project configuration", () => {
  it("normalizes credential-free HTTPS and SCP-style Git remotes", () => {
    expect(
      normalizeGitRemote(
        "https://user:token@GitHub.com/ChronodeAi/Memetics.git",
      ),
    ).toBe("github.com/chronodeai/memetics");
    expect(
      normalizeGitRemote("git@github.com:ChronodeAi/Memetics.git"),
    ).toBe("github.com/chronodeai/memetics");
    expect(
      normalizeGitRemote("ssh://git@Code.Example:2222/Team/CaseSensitive.git"),
    ).toBe("code.example:2222/Team/CaseSensitive");
  });

  it("uses the normalized remote and a stable hashed path fallback", () => {
    const remote = gitProject("git@github.com:ChronodeAi/Memetics.git");
    expect(inferProjectId(remote)).toBe(
      "github.com/chronodeai/memetics",
    );
    const local = gitProject();
    expect(inferProjectId(local)).toMatch(/^local\/[a-f0-9]{24}$/);
    expect(inferProjectId(local)).toBe(inferProjectId(local));
  });

  it("fails closed when a configured remote cannot be normalized", () => {
    const root = gitProject("not-a-valid-remote");
    expect(() => inferProjectId(root)).toThrow(
      "configured Git remote cannot be normalized safely",
    );
  });

  it("normalizes project paths and applies recursive exclusion globs", () => {
    const root = gitProject();
    const config = resolveProjectConfig(root);

    expect(normalizedProjectPath(join(root, "src", "app.ts"), root)).toBe(
      "src/app.ts",
    );
    expect(
      isProjectPathExcluded(join(root, ".aiwg", "working", "draft.md"), config),
    ).toBe(true);
    expect(isProjectPathExcluded("src/app.ts", config)).toBe(false);
  });

  it("preserves process-environment precedence over the manifest", () => {
    const root = gitProject("git@github.com:ChronodeAi/Memetics.git");
    mkdirSync(join(root, ".agentmemory"));
    writeFileSync(
      join(root, ".agentmemory", "project.yaml"),
      [
        "schema_version: 1",
        "project_id: manifest/project",
        "capture_profile: minimal",
        "privacy: standard",
        "external_processing: true",
      ].join("\n"),
    );
    process.env["AGENTMEMORY_PROJECT_ID"] = "env/project";
    process.env["AGENTMEMORY_CAPTURE_PROFILE"] = "full";
    process.env["AGENTMEMORY_PRIVACY"] = "strict";
    process.env["AGENTMEMORY_EXTERNAL_PROCESSING"] = "true";

    const config = resolveProjectConfig(root);
    expect(config.project_id).toBe("env/project");
    expect(config.capture_profile).toBe("full");
    expect(config.privacy).toBe("strict");
    expect(config.external_processing).toBe(false);
  });

  it("uses explicit privacy layers before the strict inferred fallback", () => {
    const root = gitProject("git@github.com:ChronodeAi/Memetics.git");
    const home = mkdtempSync(join(tmpdir(), "agentmemory-home-"));
    roots.push(home);
    process.env["HOME"] = home;
    const overridePath = getUserProjectConfigPath(root);
    mkdirSync(dirname(overridePath), { recursive: true });
    writeFileSync(
      overridePath,
      [
        "schema_version: 1",
        "project_id: github.com/chronodeai/memetics",
        "privacy: private",
        "capture_profile: balanced",
        "external_processing: true",
      ].join("\n"),
    );

    const privateConfig = resolveProjectConfig(root);
    expect(privateConfig.privacy).toBe("private");
    expect(privateConfig.external_processing).toBe(true);

    mkdirSync(join(root, ".agentmemory"));
    writeFileSync(
      join(root, ".agentmemory", "project.yaml"),
      [
        "schema_version: 1",
        "privacy: strict",
        "external_processing: false",
      ].join("\n"),
    );
    const strictConfig = resolveProjectConfig(root);
    expect(strictConfig.privacy).toBe("strict");
    expect(strictConfig.external_processing).toBe(false);
  });

  it("keeps user overrides isolated for repositories with colliding basenames", () => {
    const parent = mkdtempSync(join(tmpdir(), "agentmemory-collision-"));
    roots.push(parent);
    const first = join(parent, "one", "shared-name");
    const second = join(parent, "two", "shared-name");
    mkdirSync(first, { recursive: true });
    mkdirSync(second, { recursive: true });
    execFileSync("git", ["init", "-q"], { cwd: first });
    execFileSync("git", ["init", "-q"], { cwd: second });
    process.env["HOME"] = join(parent, "home");

    const firstConfig = getUserProjectConfigPath(first);
    const secondConfig = getUserProjectConfigPath(second);
    expect(firstConfig).not.toBe(secondConfig);
    mkdirSync(dirname(firstConfig), { recursive: true });
    writeFileSync(
      firstConfig,
      [
        "schema_version: 1",
        "project_id: github.com/example/first",
        "privacy: strict",
        "capture_profile: balanced",
        "external_processing: false",
      ].join("\n"),
    );
    writeFileSync(
      secondConfig,
      [
        "schema_version: 1",
        "project_id: github.com/example/second",
        "privacy: strict",
        "capture_profile: balanced",
        "external_processing: false",
      ].join("\n"),
    );

    expect(resolveProjectConfig(first).project_id).toBe(
      "github.com/example/first",
    );
    expect(resolveProjectConfig(second).project_id).toBe(
      "github.com/example/second",
    );
  });
});
