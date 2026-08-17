import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveProject } from "../src/hooks/_project.js";
import { deliverObservation } from "../src/hooks/_observe-delivery.js";
import { verifyProjectCapabilityToken } from "../src/auth.js";

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

  it("does not inspect an unsafe remote when an explicit project is configured", () => {
    const root = mkdtempSync(join(tmpdir(), "amem-local-remote-"));
    execFileSync("git", ["init", "-q", root]);
    execFileSync("git", ["-C", root, "remote", "add", "origin", root]);
    process.env.AGENTMEMORY_PROJECT_NAME = "configured-project";
    try {
      expect(resolveProject(root)).toBe("configured-project");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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

describe("deliverObservation", () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.AGENTMEMORY_URL;
  const originalSecret = process.env.AGENTMEMORY_SECRET;
  const originalCapability =
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN;
  const originalCapabilitySecret =
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET;
  const originalStrictMode =
    process.env.AGENTMEMORY_STRICT_CAPABILITY_MODE;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    if (originalUrl === undefined) delete process.env.AGENTMEMORY_URL;
    else process.env.AGENTMEMORY_URL = originalUrl;
    if (originalSecret === undefined) delete process.env.AGENTMEMORY_SECRET;
    else process.env.AGENTMEMORY_SECRET = originalSecret;
    if (originalCapability === undefined) {
      delete process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN;
    } else {
      process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN = originalCapability;
    }
    if (originalCapabilitySecret === undefined) {
      delete process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET;
    } else {
      process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET =
        originalCapabilitySecret;
    }
    if (originalStrictMode === undefined) {
      delete process.env.AGENTMEMORY_STRICT_CAPABILITY_MODE;
    } else {
      process.env.AGENTMEMORY_STRICT_CAPABILITY_MODE = originalStrictMode;
    }
  });

  it("retries a typed transient rejection and uses the project capability", async () => {
    process.env.AGENTMEMORY_URL = "http://127.0.0.1:3999";
    process.env.AGENTMEMORY_SECRET = "service-secret";
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN = "project-capability";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            retryable: true,
            error: "capture_capacity_exceeded",
          }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 201 }),
      );
    globalThis.fetch = fetchMock;

    await expect(
      deliverObservation({ project: "github.com/example/project" }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://127.0.0.1:3999/agentmemory/observe",
    );
    expect(
      (fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>)
        .Authorization,
    ).toBe("Bearer project-capability");
  });

  it("mints a short-lived capability bound to the observation project", async () => {
    delete process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN;
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_SECRET = "capability-secret";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 201 }),
      );
    globalThis.fetch = fetchMock;

    await deliverObservation({ project: "github.com/example/project" });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    const token = headers.Authorization?.replace(/^Bearer /, "");
    expect(
      verifyProjectCapabilityToken(token, {
        signingSecret: "capability-secret",
        audience: "agentmemory",
        project: "github.com/example/project",
      }),
    ).toMatchObject({
      authorized: true,
      capability: { project: "github.com/example/project" },
    });
  });

  it("does not retry a non-retryable capture rejection", async () => {
    process.env.AGENTMEMORY_PROJECT_CAPABILITY_TOKEN = "project-capability";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: "session_project_mismatch",
          }),
          { status: 409 },
        ),
      );
    globalThis.fetch = fetchMock;

    await expect(
      deliverObservation({ project: "github.com/example/project" }),
    ).rejects.toThrow("session_project_mismatch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
