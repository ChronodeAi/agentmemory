#!/usr/bin/env node
import { resolveProject } from "./_project.js";
import {
  deliverProjectRequest,
  reportHookDeliveryFailure,
} from "./_delivery.js";

// Inlined — see src/hooks/sdk-guard.ts for canonical version. Kept local
// per-hook so tsdown does not emit a shared hashed chunk that would churn
// the diff on every rebuild.
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
  if (isSdkChildContext(data)) {
    // Do not summarize from inside a Claude Agent SDK child session;
    // would re-enter agent-sdk provider and loop (see sdk-guard.ts).
    return;
  }

  const sessionId = ((data.session_id || data.sessionId) as string) || "unknown";
  const project = resolveProject(data.cwd as string | undefined);

  try {
    // Session closure emits the project-scoped stopped event, which owns
    // summary and promotion generation. A second direct summarize request
    // races that lifecycle and can create duplicate provider work.
    await deliverProjectRequest(
      "/agentmemory/session/end",
      project,
      { sessionId, project },
      { attempts: 2, timeoutMs: 1500 },
    );
  } catch (error) {
    reportHookDeliveryFailure("stop-time session closure", error);
  }
}

main().catch((error) => {
  reportHookDeliveryFailure("stop hook", error);
});
