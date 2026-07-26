#!/usr/bin/env node
import { resolveProject } from "./_project.js";
import {
  deliverObservation,
  reportObservationDeliveryFailure,
} from "./_observe-delivery.js";

// Inlined from ./sdk-guard so each hook bundles to a single self-contained
// .mjs (matches the pattern used by every other hook entry in tsdown.config).
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
  const agentId = data.agent_id || data.agentName;
  const agentType = data.agent_type || data.agentDisplayName || data.agentName;

  await deliverObservation({
      hookType: "subagent_start",
      sessionId,
      project: resolveProject(data.cwd as string | undefined),
      cwd: (data.cwd as string | undefined) || process.cwd(),
      timestamp: new Date().toISOString(),
      data: {
        agent_id: agentId,
        agent_type: agentType,
        parent_session_id:
          data.parent_session_id ?? data.parentSessionId ?? sessionId,
      },
  });
}

main().catch(reportObservationDeliveryFailure);
