import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";

const BASE_URL = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
const SECRET = process.env["AGENTMEMORY_SECRET"] || "";

const SESSION_ID = `test_${Date.now()}`;
const PROJECT = "github.com/agentmemory/integration-test";
const PROJECT_ROOT = "/tmp/test-project";

function url(path: string): string {
  return `${BASE_URL}${path}`;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SECRET) {
    headers["Authorization"] = `Bearer ${SECRET}`;
  }
  return headers;
}

async function json(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

describe("agentmemory integration", () => {
  beforeAll(async () => {
    const res = await fetch(url("/agentmemory/health")).catch(() => null);
    if (!res || !res.ok) {
      throw new Error(
        `agentmemory is not running at ${BASE_URL}. Start it with: docker compose up -d && npm start`,
      );
    }
  });

  describe("health", () => {
    it("returns ok", async () => {
      const res = await fetch(url("/agentmemory/health"));
      expect(res.status).toBe(200);
      const body = (await json(res)) as { status: string; service: string };
      expect(["ok", "healthy"]).toContain(body.status);
      expect(body.service).toBe("agentmemory");
    });
  });

  describe("session lifecycle", () => {
    it("starts a session", async () => {
      const res = await fetch(url("/agentmemory/session/start"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: SESSION_ID,
          project: PROJECT,
          cwd: PROJECT_ROOT,
        }),
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as {
        session: { id: string; status: string };
        context: string;
      };
      expect(body.session.id).toBe(SESSION_ID);
      expect(body.session.status).toBe("active");
      expect(typeof body.context).toBe("string");
    });

    it("lists sessions including the new one", async () => {
      const res = await fetch(
        url(`/agentmemory/sessions?project=${encodeURIComponent(PROJECT)}`),
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = (await json(res)) as {
        sessions: Array<{ id: string }>;
      };
      expect(Array.isArray(body.sessions)).toBe(true);
      const found = body.sessions.find((s) => s.id === SESSION_ID);
      expect(found).toBeDefined();
    });

    it("ends the session", async () => {
      const res = await fetch(url("/agentmemory/session/end"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ sessionId: SESSION_ID, project: PROJECT }),
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as { success: boolean };
      expect(body.success).toBe(true);
    });

    it("session is marked completed", async () => {
      const res = await fetch(
        url(`/agentmemory/sessions?project=${encodeURIComponent(PROJECT)}`),
        { headers: authHeaders() },
      );
      const body = (await json(res)) as {
        sessions: Array<{ id: string; status: string; endedAt?: string }>;
      };
      const session = body.sessions.find((s) => s.id === SESSION_ID);
      expect(session).toBeDefined();
      expect(session!.status).toBe("completed");
      expect(session!.endedAt).toBeDefined();
    });
  });

  describe("observations", () => {
    const OBS_SESSION = `test_obs_${Date.now()}`;

    beforeAll(async () => {
      await fetch(url("/agentmemory/session/start"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: OBS_SESSION,
          project: PROJECT,
          cwd: PROJECT_ROOT,
        }),
      });
    });

    afterAll(async () => {
      await fetch(url("/agentmemory/session/end"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ sessionId: OBS_SESSION, project: PROJECT }),
      });
    });

    it("captures an observation", async () => {
      const res = await fetch(url("/agentmemory/observe"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          hookType: "post_tool_use",
          sessionId: OBS_SESSION,
          project: PROJECT,
          cwd: PROJECT,
          timestamp: new Date().toISOString(),
          data: {
            tool: "Edit",
            file: "src/auth.ts",
            content: "Added JWT token validation middleware",
          },
        }),
      });
      expect(res.status).toBe(201);
    });

    it("captures a second observation", async () => {
      const res = await fetch(url("/agentmemory/observe"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          hookType: "post_tool_use",
          sessionId: OBS_SESSION,
          project: PROJECT,
          cwd: PROJECT,
          timestamp: new Date().toISOString(),
          data: {
            tool: "Bash",
            command: "npm test",
            output: "Tests: 12 passed, 0 failed",
          },
        }),
      });
      expect(res.status).toBe(201);
    });

    it("lists observations for the session", async () => {
      const res = await fetch(
        url(`/agentmemory/observations?sessionId=${OBS_SESSION}`),
        { headers: authHeaders() },
      );
      expect(res.status).toBe(200);
      const body = (await json(res)) as {
        observations: Array<{ id: string; sessionId: string }>;
      };
      expect(Array.isArray(body.observations)).toBe(true);
    });

    it("returns 400 without sessionId", async () => {
      const res = await fetch(url("/agentmemory/observations"), {
        headers: authHeaders(),
      });
      expect(res.status).toBe(400);
      const body = (await json(res)) as { error: string };
      expect(body.error).toBe("sessionId required");
    });
  });

  describe("search", () => {
    it("searches observations", async () => {
      const res = await fetch(url("/agentmemory/search"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query: "auth", limit: 5, project: PROJECT }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toBeDefined();
    });

    it("returns results for empty limit", async () => {
      const res = await fetch(url("/agentmemory/search"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query: "test", project: PROJECT }),
      });
      expect(res.status).toBe(200);
    });
  });

  describe("context", () => {
    it("generates context for a project", async () => {
      const res = await fetch(url("/agentmemory/context"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: "ctx-test",
          project: PROJECT,
        }),
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as { context: string };
      expect(typeof body.context).toBe("string");
    });
  });

  describe("viewer", () => {
    it("serves the viewer HTML", async () => {
      const res = await fetch(url("/agentmemory/viewer"), {
        headers: SECRET ? authHeaders() : undefined,
      });
      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("html");
    });
  });

  describe("dashboard list endpoints", () => {
    it("GET /semantic returns { semantic: [...] }", async () => {
      const res = await fetch(url("/agentmemory/semantic"), {
        headers: SECRET ? authHeaders() : undefined,
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as { semantic: unknown[] };
      expect(Array.isArray(body.semantic)).toBe(true);
    });

    it("GET /procedural returns { procedural: [...] }", async () => {
      const res = await fetch(url("/agentmemory/procedural"), {
        headers: SECRET ? authHeaders() : undefined,
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as { procedural: unknown[] };
      expect(Array.isArray(body.procedural)).toBe(true);
    });

    it("GET /relations returns { relations: [...] }", async () => {
      const res = await fetch(url("/agentmemory/relations"), {
        headers: SECRET ? authHeaders() : undefined,
      });
      expect(res.status).toBe(200);
      const body = (await json(res)) as { relations: unknown[] };
      expect(Array.isArray(body.relations)).toBe(true);
    });
  });

  describe("auth", () => {
    it("health endpoint is always public", async () => {
      const res = await fetch(url("/agentmemory/health"));
      expect(res.status).toBe(200);
    });

    if (SECRET) {
      it("rejects unauthenticated requests", async () => {
        const res = await fetch(url("/agentmemory/search"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "test" }),
        });
        expect(res.status).toBe(401);
      });

      it("rejects wrong bearer token", async () => {
        const res = await fetch(url("/agentmemory/search"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer wrong-token",
          },
          body: JSON.stringify({ query: "test" }),
        });
        expect(res.status).toBe(401);
      });

      it("rejects unauthenticated viewer requests on the API port", async () => {
        const res = await fetch(url("/agentmemory/viewer"));
        expect(res.status).toBe(401);
      });
    }
  });
});

describe("coding memory integration", () => {
  const runId = Date.now().toString(36);
  const projectA = `github.com/agentmemory/canary-a-${runId}`;
  const projectB = `github.com/agentmemory/canary-b-${runId}`;
  const sessionA = `codex-canary-${runId}`;
  const sessionB = `claude-canary-${runId}`;
  const markerA = `project-a-only-${runId}`;
  const markerB = `project-b-only-${runId}`;
  const secret = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";

  async function post(path: string, body: Record<string, unknown>) {
    const res = await fetch(url(path), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    return { res, body: await json(res) };
  }

  async function startSession(
    sessionId: string,
    project: string,
    agentId: string,
  ) {
    const result = await post("/agentmemory/session/start", {
      sessionId,
      project,
      cwd: `/tmp/${project.split("/").at(-1)}`,
      agentId,
      privacy: "strict",
      captureProfile: "balanced",
      externalProcessing: false,
    });
    expect(result.res.status).toBe(200);
  }

  async function observe(
    sessionId: string,
    project: string,
    marker: string,
  ) {
    return post("/agentmemory/observe", {
      hookType: "post_tool_use",
      sessionId,
      project,
      cwd: `/tmp/${project.split("/").at(-1)}`,
      timestamp: new Date().toISOString(),
      privacy: "strict",
      captureProfile: "balanced",
      externalProcessing: false,
      data: {
        tool_name: "Edit",
        tool_input: { file_path: "src/canary.ts" },
        tool_output: `Verified ${marker}; token=${secret}`,
      },
    });
  }

  beforeAll(async () => {
    await startSession(sessionA, projectA, "codex");
    await startSession(sessionB, projectB, "claude-code");
  });

  afterAll(async () => {
    await Promise.all([
      post("/agentmemory/session/end", {
        sessionId: sessionA,
        project: projectA,
      }),
      post("/agentmemory/session/end", {
        sessionId: sessionB,
        project: projectB,
      }),
    ]);
  });

  it("redacts secrets and hash-deduplicates repeated tool events", async () => {
    const first = await observe(sessionA, projectA, markerA);
    const duplicate = await observe(sessionA, projectA, markerA);
    expect(first.res.status).toBe(201);
    expect(duplicate.res.status).toBe(201);
    expect(duplicate.body).toMatchObject({ deduplicated: true });

    const observationsRes = await fetch(
      url(`/agentmemory/observations?sessionId=${sessionA}`),
      { headers: authHeaders() },
    );
    expect(observationsRes.status).toBe(200);
    const observations = await json(observationsRes);
    const serialized = JSON.stringify(observations);
    expect(serialized).toContain(markerA);
    expect(serialized).toContain("[REDACTED_SECRET]");
    expect(serialized).not.toContain(secret);
  }, 15_000);

  it("fails closed across projects while preserving each scoped result", async () => {
    const observed = await observe(sessionB, projectB, markerB);
    expect(observed.res.status).toBe(201);

    const ownA = await post("/agentmemory/search", {
      query: markerA,
      project: projectA,
      limit: 5,
    });
    const ownB = await post("/agentmemory/search", {
      query: markerB,
      project: projectB,
      limit: 5,
    });
    const crossA = await post("/agentmemory/search", {
      query: markerB,
      project: projectA,
      limit: 5,
    });
    const crossB = await post("/agentmemory/search", {
      query: markerA,
      project: projectB,
      limit: 5,
    });

    expect(ownA.res.status).toBe(200);
    expect(ownB.res.status).toBe(200);
    expect(JSON.stringify(ownA.body)).toContain(markerA);
    expect(JSON.stringify(ownB.body)).toContain(markerB);
    expect(JSON.stringify(crossA.body)).not.toContain(markerB);
    expect(JSON.stringify(crossB.body)).not.toContain(markerA);
  });

  it("caps context, links commits idempotently, and reports scoped health", async () => {
    const context = await post("/agentmemory/context-packet", {
      project: projectA,
      sessionId: sessionA,
      query: markerA,
      token_budget: 2000,
    });
    expect(context.res.status).toBe(200);
    expect(context.body).toMatchObject({ success: true });
    expect((context.body as { tokens: number }).tokens).toBeLessThanOrEqual(
      2000,
    );
    expect(
      new Set((context.body as { sourceIds: string[] }).sourceIds).size,
    ).toBe((context.body as { sourceIds: string[] }).sourceIds.length);

    const sha = createHash("sha1").update(projectA).digest("hex");
    const firstLink = await post("/agentmemory/commit-link", {
      project: projectA,
      sessionId: sessionA,
      sha,
    });
    const secondLink = await post("/agentmemory/commit-link", {
      project: projectA,
      sessionId: sessionA,
      sha,
    });
    expect(firstLink.body).toMatchObject({ success: true });
    expect(secondLink.body).toMatchObject({ success: true });

    const healthRes = await fetch(
      url(
        `/agentmemory/project-health?project=${encodeURIComponent(projectA)}`,
      ),
      { headers: authHeaders() },
    );
    expect(healthRes.status).toBe(200);
    const health = (await json(healthRes)) as {
      success: boolean;
      scopeCoverage: number;
      commitCoverage: number;
      duplicateRate: number;
      injectionLatencyP95Ms: number;
    };
    expect(health.success).toBe(true);
    expect(health.scopeCoverage).toBe(1);
    expect(health.commitCoverage).toBe(1);
    expect(health.duplicateRate).toBeLessThan(0.02);
    expect(health.injectionLatencyP95Ms).toBeLessThan(2000);
  });

  it("maps omitted project scope to a client error", async () => {
    const sessions = await fetch(url("/agentmemory/sessions"), {
      headers: authHeaders(),
    });
    expect(sessions.status).toBe(400);
  });
});
