#!/usr/bin/env node
import { resolveProject } from "./_project.js";
import {
  deliverProjectRequest,
  reportHookDeliveryFailure,
} from "./_delivery.js";

function isSdkChildContext(payload: unknown): boolean {
  if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
  if (!payload || typeof payload !== "object") return false;
  return (payload as { entrypoint?: unknown }).entrypoint === "sdk-ts";
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(input);
  } catch {
    return;
  }

  if (!data || typeof data !== "object") return;
  if (isSdkChildContext(data)) return;

  const sessionId = ((data.session_id || data.sessionId) as string) || "unknown";
  const project = resolveProject(data.cwd as string | undefined);

  try {
    await deliverProjectRequest(
      "/agentmemory/session/end",
      project,
      { sessionId, project },
      { attempts: 2, timeoutMs: 1500 },
    );
  } catch (error) {
    reportHookDeliveryFailure("session closure", error);
    return;
  }

  if (process.env["CLAUDE_MEMORY_BRIDGE"] === "true") {
    try {
      await deliverProjectRequest(
        "/agentmemory/claude-bridge/sync",
        project,
        { project },
        { timeoutMs: 2500 },
      );
    } catch (error) {
      reportHookDeliveryFailure("Claude memory bridge sync", error);
    }
  }
}

main().catch((error) => {
  reportHookDeliveryFailure("session end", error);
});
