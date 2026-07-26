import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerMcpEndpoints } from "../src/mcp/server.js";
import { createProjectCapabilityToken } from "../src/auth.js";
import type { Session, SessionSummary, Memory } from "../src/types.js";

const SECRET = "mcp-resources-test-secret";
const ADMIN_SECRET = "mcp-resources-admin-secret";
const CAPABILITY_SECRET = "mcp-resources-capability-secret";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> => {
      return (store.get(scope)?.get(key) as T) ?? null;
    },
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      const entries = store.get(scope);
      return entries ? (Array.from(entries.values()) as T[]) : [];
    },
  };
}

function mockSdk() {
  const functions = new Map<string, Function>();
  const triggerOverrides = new Map<string, Function>();
  return {
    registerFunction: (idOrOpts: string | { id: string }, handler: Function) => {
      const id = typeof idOrOpts === "string" ? idOrOpts : idOrOpts.id;
      functions.set(id, handler);
    },
    registerTrigger: () => {},
    trigger: async (
      idOrInput: string | { function_id: string; payload: unknown },
      data?: unknown,
    ) => {
      const id = typeof idOrInput === "string" ? idOrInput : idOrInput.function_id;
      const payload = typeof idOrInput === "string" ? data : idOrInput.payload;
      if (triggerOverrides.has(id)) {
        return triggerOverrides.get(id)!(payload);
      }
      const fn = functions.get(id);
      if (!fn) throw new Error(`No function: ${id}`);
      return fn(payload);
    },
    overrideTrigger: (id: string, handler: Function) => {
      triggerOverrides.set(id, handler);
    },
    getFunction: (id: string) => functions.get(id),
  };
}

function makeReq(body?: unknown, headers?: Record<string, string>) {
  return {
    body,
    headers: headers || capabilityHeaders("test/project"),
    query_params: {},
  };
}

function capabilityHeaders(project: string): Record<string, string> {
  const capability = createProjectCapabilityToken(
    {
      version: 1,
      audience: "agentmemory",
      project,
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    },
    CAPABILITY_SECRET,
  );
  return { authorization: `Bearer ${capability}` };
}

function adminHeaders(): Record<string, string> {
  return { authorization: `Bearer ${ADMIN_SECRET}` };
}

describe("MCP Resources", () => {
  let sdk: ReturnType<typeof mockSdk>;
  let kv: ReturnType<typeof mockKV>;

  beforeEach(() => {
    sdk = mockSdk();
    kv = mockKV();
    registerMcpEndpoints(
      sdk as never,
      kv as never,
      SECRET,
      ADMIN_SECRET,
      CAPABILITY_SECRET,
      true,
    );
  });

  it("lists only project resource templates for a project capability", async () => {
    const fn = sdk.getFunction("mcp::resources::list")!;
    const result = (await fn(makeReq())) as {
      status_code: number;
      body: { resources: Array<{ uri: string }> };
    };

    expect(result.status_code).toBe(200);
    expect(result.body.resources.map(({ uri }) => uri)).toEqual([
      "agentmemory://project/{name}/profile",
      "agentmemory://project/{name}/recent",
    ]);
  });

  it("lists all resource templates for an administrator", async () => {
    const fn = sdk.getFunction("mcp::resources::list")!;
    const result = (await fn(makeReq(undefined, adminHeaders()))) as {
      status_code: number;
      body: { resources: Array<{ uri: string }> };
    };

    expect(result.status_code).toBe(200);
    expect(result.body.resources).toHaveLength(5);
    expect(result.body.resources.map(({ uri }) => uri)).toContain(
      "agentmemory://status",
    );
  });

  it("reads agentmemory://status", async () => {
    const session: Session = {
      id: "ses_1",
      project: "/test",
      cwd: "/test",
      startedAt: new Date().toISOString(),
      status: "active",
      observationCount: 5,
    };
    await kv.set("mem:sessions", "ses_1", session);

    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq({ uri: "agentmemory://status" }, adminHeaders()),
    )) as {
      status_code: number;
      body: { contents: Array<{ text: string }> };
    };

    expect(result.status_code).toBe(200);
    const data = JSON.parse(result.body.contents[0].text);
    expect(data.sessionCount).toBe(1);
  });

  it("reads agentmemory://project/{name}/profile", async () => {
    sdk.overrideTrigger("mem::profile", async () => ({
      project: "/myapp",
      topConcepts: [{ concept: "auth", frequency: 5 }],
    }));

    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq(
        { uri: "agentmemory://project/myapp/profile" },
        capabilityHeaders("myapp"),
      ),
    )) as {
      status_code: number;
      body: { contents: Array<{ text: string }> };
    };

    expect(result.status_code).toBe(200);
    const data = JSON.parse(result.body.contents[0].text);
    expect(data.project).toBe("/myapp");
  });

  it("reads agentmemory://project/{name}/recent with sorted summaries", async () => {
    const summaries: SessionSummary[] = [
      {
        sessionId: "ses_1",
        project: "myapp",
        createdAt: "2026-01-01T00:00:00Z",
        title: "Old session",
        narrative: "old",
        keyDecisions: [],
        filesModified: [],
        concepts: [],
        observationCount: 1,
      },
      {
        sessionId: "ses_2",
        project: "myapp",
        createdAt: "2026-02-01T00:00:00Z",
        title: "New session",
        narrative: "new",
        keyDecisions: [],
        filesModified: [],
        concepts: [],
        observationCount: 2,
      },
      {
        sessionId: "ses_3",
        project: "other",
        createdAt: "2026-02-15T00:00:00Z",
        title: "Other project",
        narrative: "other",
        keyDecisions: [],
        filesModified: [],
        concepts: [],
        observationCount: 3,
      },
    ];
    for (const s of summaries) {
      await kv.set("mem:summaries", s.sessionId, s);
    }

    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq(
        { uri: "agentmemory://project/myapp/recent" },
        capabilityHeaders("myapp"),
      ),
    )) as {
      status_code: number;
      body: { contents: Array<{ text: string }> };
    };

    expect(result.status_code).toBe(200);
    const data = JSON.parse(result.body.contents[0].text);
    expect(data).toHaveLength(2);
    expect(data[0].sessionId).toBe("ses_2");
  });

  it("reads agentmemory://memories/latest", async () => {
    const memories: Memory[] = [
      {
        id: "mem_1",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
        type: "pattern",
        title: "Latest pattern",
        content: "content",
        concepts: [],
        files: [],
        sessionIds: [],
        strength: 5,
        version: 1,
        isLatest: true,
      },
      {
        id: "mem_2",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-15T00:00:00Z",
        type: "bug",
        title: "Old bug",
        content: "content",
        concepts: [],
        files: [],
        sessionIds: [],
        strength: 3,
        version: 2,
        isLatest: false,
      },
    ];
    for (const m of memories) {
      await kv.set("mem:memories", m.id, m);
    }

    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq({ uri: "agentmemory://memories/latest" }, adminHeaders()),
    )) as {
      status_code: number;
      body: { contents: Array<{ text: string }> };
    };

    expect(result.status_code).toBe(200);
    const data = JSON.parse(result.body.contents[0].text);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("mem_1");
    expect(data[0].title).toBe("Latest pattern");
  });

  it("returns 404 for unknown URI", async () => {
    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq({ uri: "agentmemory://nonexistent" }, adminHeaders()),
    )) as { status_code: number };

    expect(result.status_code).toBe(404);
  });

  it("returns 401 when auth fails", async () => {
    const authedSdk = mockSdk();
    const authedKv = mockKV();
    registerMcpEndpoints(
      authedSdk as never,
      authedKv as never,
      "test-secret",
      "test-admin",
      "test-capability",
      true,
    );

    const fn = authedSdk.getFunction("mcp::resources::list")!;
    const result = (await fn(makeReq())) as { status_code: number };
    expect(result.status_code).toBe(401);

    const authedResult = (await fn(
      makeReq(undefined, {
        authorization: `Bearer ${createProjectCapabilityToken(
          {
            version: 1,
            audience: "agentmemory",
            project: "test/project",
            expiresAt: Math.floor(Date.now() / 1000) + 60,
          },
          "test-capability",
        )}`,
      }),
    )) as { status_code: number };
    expect(authedResult.status_code).toBe(200);
  });

  it("scopes commit tools to the capability project", async () => {
    await kv.set("mem:sessions", "session-a", {
      id: "session-a",
      project: "project-a",
    });
    await kv.set("mem:sessions", "session-b", {
      id: "session-b",
      project: "project-b",
    });
    await kv.set("mem:commits", "aaa1111", {
      sha: "aaa1111",
      shortSha: "aaa1111",
      project: "project-a",
      sessionIds: ["session-a", "session-b"],
      linkedAt: "2026-07-25T00:00:00.000Z",
    });
    await kv.set("mem:commits", "bbb2222", {
      sha: "bbb2222",
      shortSha: "bbb2222",
      project: "project-b",
      sessionIds: ["session-b"],
      linkedAt: "2026-07-25T01:00:00.000Z",
    });
    const fn = sdk.getFunction("mcp::tools::call")!;

    const lookup = (await fn({
      headers: capabilityHeaders("project-a"),
      body: {
        name: "memory_commit_lookup",
        arguments: { project: "project-a", sha: "aaa1111" },
      },
    })) as {
      status_code: number;
      body: { content: Array<{ text: string }> };
    };
    const lookupBody = JSON.parse(lookup.body.content[0].text);
    expect(lookup.status_code).toBe(200);
    expect(lookupBody.commit.sha).toBe("aaa1111");
    expect(
      lookupBody.sessions.map((session: { id: string }) => session.id),
    ).toEqual(["session-a"]);

    const crossProject = (await fn({
      headers: capabilityHeaders("project-a"),
      body: {
        name: "memory_commit_lookup",
        arguments: { project: "project-a", sha: "bbb2222" },
      },
    })) as {
      status_code: number;
      body: { content: Array<{ text: string }> };
    };
    expect(JSON.parse(crossProject.body.content[0].text)).toEqual({
      commit: null,
      sessions: [],
    });

    const commits = (await fn({
      headers: capabilityHeaders("project-a"),
      body: {
        name: "memory_commits",
        arguments: { project: "project-a" },
      },
    })) as {
      status_code: number;
      body: { content: Array<{ text: string }> };
    };
    expect(
      JSON.parse(commits.body.content[0].text).commits.map(
        (commit: { sha: string }) => commit.sha,
      ),
    ).toEqual(["aaa1111"]);

    await expect(
      fn({
        headers: adminHeaders(),
        body: {
          name: "memory_commits",
          arguments: {},
        },
      }),
    ).resolves.toMatchObject({ status_code: 400 });

    const global = (await fn({
      headers: adminHeaders(),
      body: {
        name: "memory_commits",
        arguments: { scope: "global" },
      },
    })) as {
      status_code: number;
      body: { content: Array<{ text: string }> };
    };
    expect(
      JSON.parse(global.body.content[0].text).commits.map(
        (commit: { sha: string }) => commit.sha,
      ),
    ).toEqual(["bbb2222", "aaa1111"]);
  });

  it("handles URI with special characters via decodeURIComponent", async () => {
    sdk.overrideTrigger("mem::profile", async (data: any) => ({
      project: data.project,
      topConcepts: [],
    }));

    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq(
        {
          uri: "agentmemory://project/my%20app%2Fsubdir/profile",
        },
        capabilityHeaders("my app/subdir"),
      ),
    )) as {
      status_code: number;
      body: { contents: Array<{ text: string }> };
    };

    expect(result.status_code).toBe(200);
    const data = JSON.parse(result.body.contents[0].text);
    expect(data.project).toBe("my app/subdir");
  });

  it("returns 400 for malformed percent-encoding in URI", async () => {
    const fn = sdk.getFunction("mcp::resources::read")!;
    const result = (await fn(
      makeReq({
        uri: "agentmemory://project/bad%E0encoding/profile",
      }),
    )) as { status_code: number; body: { error: string } };

    expect(result.status_code).toBe(400);
    expect(result.body.error).toContain("percent-encoding");
  });
});
