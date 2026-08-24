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
import { DATA_DIR_ENV } from "../src/data-dir.js";
import {
  getUserProjectConfigPath,
  inferProjectId,
  isProjectPathExcluded,
  normalizeGitRemote,
  normalizedProjectPath,
  projectPathHash,
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

  it("falls back to a local id (warned, not thrown) for a file:// remote", () => {
    const root = gitProject();
    execFileSync(
      "git",
      [
        "-C",
        root,
        "remote",
        "add",
        "origin",
        `file://${root}`,
      ],
    );
    expect(inferProjectId(root)).toMatch(/^local\/[a-f0-9]{24}$/);
    expect(inferProjectId(root)).toBe(inferProjectId(root));
  });

  it("falls back to a local id for a bare-path remote", () => {
    const target = gitProject();
    const root = gitProject(target);
    expect(inferProjectId(root)).toMatch(/^local\/[a-f0-9]{24}$/);
  });

  it("keeps ssh and https remotes on the canonical identity", () => {
    const ssh = gitProject("git@github.com:ChronodeAi/Memetics.git");
    expect(inferProjectId(ssh)).toBe("github.com/chronodeai/memetics");
    const https = gitProject("https://github.com/ChronodeAi/Memetics.git");
    expect(inferProjectId(https)).toBe("github.com/chronodeai/memetics");
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

  it("reads user overrides from the data-dir projects dir when present", () => {
    const root = gitProject();
    const home = mkdtempSync(join(tmpdir(), "agentmemory-home-"));
    roots.push(home);
    const dataDir = join(home, "relocated-data");
    const dataDirCopy = join(
      dataDir,
      "projects",
      `${projectPathHash(root)}.yaml`,
    );
    process.env["HOME"] = home;
    process.env[DATA_DIR_ENV] = dataDir;

    // Nothing exists yet: the resolver still points at the legacy layout.
    expect(getUserProjectConfigPath(root)).toBe(
      join(home, ".agentmemory", "projects", `${projectPathHash(root)}.yaml`),
    );

    mkdirSync(dirname(dataDirCopy), { recursive: true });
    writeFileSync(
      dataDirCopy,
      ["schema_version: 1", "project_id: datadir/project"].join("\n"),
    );
    expect(getUserProjectConfigPath(root)).toBe(dataDirCopy);

    const config = resolveProjectConfig(root);
    expect(config.override_path).toBe(dataDirCopy);
    expect(config.project_id).toBe("datadir/project");
  });

  it("falls back to the legacy ~/.agentmemory override when the data-dir copy is absent", () => {
    const root = gitProject();
    const home = mkdtempSync(join(tmpdir(), "agentmemory-home-"));
    roots.push(home);
    process.env["HOME"] = home;
    delete process.env[DATA_DIR_ENV];

    const legacyPath = getUserProjectConfigPath(root);
    expect(legacyPath).toBe(
      join(home, ".agentmemory", "projects", `${projectPathHash(root)}.yaml`),
    );
    mkdirSync(dirname(legacyPath), { recursive: true });
    writeFileSync(
      legacyPath,
      ["schema_version: 1", "project_id: legacy/project"].join("\n"),
    );

    const config = resolveProjectConfig(root);
    expect(config.override_path).toBe(legacyPath);
    expect(config.project_id).toBe("legacy/project");
  });

  it("prefers the data-dir override over a colliding legacy copy", () => {
    const root = gitProject();
    const home = mkdtempSync(join(tmpdir(), "agentmemory-home-"));
    roots.push(home);
    const dataDir = join(home, "relocated-data");
    process.env["HOME"] = home;
    process.env[DATA_DIR_ENV] = dataDir;
    delete process.env["AGENTMEMORY_PROJECT_CONFIG"];

    const dataDirCopy = join(
      dataDir,
      "projects",
      `${projectPathHash(root)}.yaml`,
    );
    mkdirSync(dirname(dataDirCopy), { recursive: true });
    writeFileSync(
      dataDirCopy,
      ["schema_version: 1", "project_id: datadir/wins"].join("\n"),
    );
    const legacyCopy = join(
      home,
      ".agentmemory",
      "projects",
      `${projectPathHash(root)}.yaml`,
    );
    mkdirSync(dirname(legacyCopy), { recursive: true });
    writeFileSync(
      legacyCopy,
      ["schema_version: 1", "project_id: legacy/loses"].join("\n"),
    );

    expect(resolveProjectConfig(root).project_id).toBe("datadir/wins");
  });
});
