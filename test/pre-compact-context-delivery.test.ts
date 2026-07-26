import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { createSignedContextDeliveryVerifier } from "../src/functions/coding-memory.js";
import { verifyProjectCapabilityToken } from "../src/auth.js";

const script = join(
  import.meta.dirname,
  "..",
  "plugin",
  "scripts",
  "pre-compact.mjs",
);
const children = new Set<ReturnType<typeof spawn>>();

function runHook(
  input: Record<string, unknown>,
  env: Record<string, string>,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      env: {
        PATH: process.env["PATH"] ?? "",
        HOME: "/private/tmp/agentmemory-precompact-test-home-missing",
        ...env,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    children.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      children.delete(child);
      resolve({ stdout, stderr, exitCode });
    });
    child.stdin.end(JSON.stringify(input));
  });
}

afterEach(() => {
  for (const child of children) child.kill();
  children.clear();
});

describe("pre-compact context packet delivery", () => {
  it("writes context before sending a signed acknowledgement", async () => {
    const context = "<agentmemory-context>verified</agentmemory-context>";
    const contextSha256 = createHash("sha256").update(context).digest("hex");
    const ackSecret = "context-ack-secret";
    const capabilitySecret = "project-capability-secret";
    const calls: string[] = [];
    const receiptChecks: Array<Promise<unknown>> = [];
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<
        string,
        unknown
      >;
      calls.push(request.url ?? "");
      const authorization = request.headers.authorization;
      expect(typeof authorization).toBe("string");
      expect(
        verifyProjectCapabilityToken(
          authorization?.replace(/^Bearer /, ""),
          {
            signingSecret: capabilitySecret,
            audience: "agentmemory",
            project: String(body["project"]),
          },
        ),
      ).toMatchObject({ authorized: true });
      if (request.url === "/agentmemory/context-packet") {
        expect(body).toMatchObject({
          sessionId: "session-1",
          token_budget: 1500,
          context_class: "advisory",
        });
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            context,
            packetId: "ctxpkt-1",
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            nonce: "nonce-1",
            contextSha256,
          }),
        );
        return;
      }
      if (request.url === "/agentmemory/context-acknowledge") {
        receiptChecks.push(
          createSignedContextDeliveryVerifier(ackSecret)({
            providerReceipt: String(body["providerReceipt"]),
            packetId: "ctxpkt-1",
            project: String(body["project"]),
            sessionId: "session-1",
            sourceIds: [],
            contextSha256,
            nonce: "nonce-1",
            generatedAt: new Date().toISOString(),
            expiresAt: String(
              JSON.parse(
                Buffer.from(
                  String(body["providerReceipt"]).split(".")[1],
                  "base64url",
                ).toString("utf8"),
              ).expiresAt,
            ),
          }),
        );
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ success: true, acknowledged: true }));
        return;
      }
      response.writeHead(404).end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("test server did not bind");
    }
    try {
      const result = await runHook(
        {
          session_id: "session-1",
          cwd: join(import.meta.dirname, ".."),
        },
        {
          AGENTMEMORY_URL: `http://127.0.0.1:${address.port}`,
          AGENTMEMORY_PROJECT_CAPABILITY_SECRET: capabilitySecret,
          AGENTMEMORY_CONTEXT_ACK_SECRET: ackSecret,
          AGENTMEMORY_INJECT_CONTEXT: "true",
        },
      );
      expect(result).toMatchObject({ stdout: context, stderr: "", exitCode: 0 });
      expect(calls).toEqual([
        "/agentmemory/context-packet",
        "/agentmemory/context-acknowledge",
      ]);
      await expect(Promise.all(receiptChecks)).resolves.toEqual([
        expect.objectContaining({
          verified: true,
          providerId: "claude-code:pre-compact",
        }),
      ]);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("is a clean no-op when context injection is disabled", async () => {
    const result = await runHook(
      { session_id: "session-disabled", cwd: join(import.meta.dirname, "..") },
      { AGENTMEMORY_URL: "http://127.0.0.1:1" },
    );
    expect(result).toEqual({ stdout: "", stderr: "", exitCode: 0 });
  });

  it("does not fall back to the legacy bearer unless strict mode is disabled", async () => {
    const result = await runHook(
      { session_id: "session-1", cwd: join(import.meta.dirname, "..") },
      {
        AGENTMEMORY_SECRET: "legacy-secret",
        AGENTMEMORY_CONTEXT_ACK_SECRET: "ack-secret",
        AGENTMEMORY_URL: "http://127.0.0.1:1",
        AGENTMEMORY_INJECT_CONTEXT: "true",
      },
    );
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      "context delivery credentials are unavailable",
    );
    expect(result.exitCode).toBe(1);
  });

  it("fails closed when the acknowledgement endpoint rejects delivery", async () => {
    const context = "<agentmemory-context>delivered</agentmemory-context>";
    const server = createServer(async (request, response) => {
      for await (const _chunk of request) {
        // Drain the request before responding.
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify(
          request.url === "/agentmemory/context-packet"
            ? {
                success: true,
                context,
                packetId: "ctxpkt-rejected",
                expiresAt: new Date(Date.now() + 60_000).toISOString(),
                nonce: "nonce-rejected",
                contextSha256: createHash("sha256")
                  .update(context)
                  .digest("hex"),
              }
            : { success: false, acknowledged: false },
        ),
      );
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("test server did not bind");
    }
    try {
      const result = await runHook(
        {
          session_id: "session-rejected",
          cwd: join(import.meta.dirname, ".."),
        },
        {
          AGENTMEMORY_URL: `http://127.0.0.1:${address.port}`,
          AGENTMEMORY_PROJECT_CAPABILITY_TOKEN: "project-capability-token",
          AGENTMEMORY_CONTEXT_ACK_SECRET: "context-ack-secret",
          AGENTMEMORY_INJECT_CONTEXT: "true",
        },
      );
      expect(result).toMatchObject({
        stdout: context,
        exitCode: 1,
      });
      expect(result.stderr).toContain(
        "context acknowledgement was not confirmed",
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
});
