#!/usr/bin/env node
import "./_project.js";
import { resolveProjectConfig } from "../project-config.js";
import {
  deliverProjectRequest,
  reportHookDeliveryFailure,
} from "./_delivery.js";

// Inlined from ./sdk-guard so each hook bundles to a single self-contained
// .mjs (matches the pattern used by every other hook entry in tsdown.config).
function isSdkChildContext(payload: unknown): boolean {
  if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
  if (!payload || typeof payload !== "object") return false;
  return (payload as { entrypoint?: unknown }).entrypoint === "sdk-ts";
}

// Session-start hook.
//
// Always registers the session for observation tracking (so memories
// captured on PostToolUse get attached to the right session). Only writes
// project context to stdout — which Claude Code prepends to the very first
// turn — when AGENTMEMORY_INJECT_CONTEXT=true. Default off as of 0.8.10
// (#143); see pre-tool-use.ts for the full explanation.
// When the server is unreachable a 5s timeout multiplies hard under
// concurrent fan-out (Slack bots, multi-agent harnesses) and becomes a
// positive feedback loop that OOM-kills iii-engine (#221). Cap both paths
// tightly, but await registration so failures are observable.
const INJECT_TIMEOUT_MS = 1500;
const REGISTER_TIMEOUT_MS = 800;

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

  const sessionId =
    ((data.session_id || data.sessionId) as string) ||
    `ses_${Date.now().toString(36)}`;
  const cwd = (data.cwd as string) || process.cwd();
  const projectConfig = resolveProjectConfig(data.cwd as string | undefined);
  const project = projectConfig.project_id;
  const injectContext =
    process.env["AGENTMEMORY_INJECT_CONTEXT"] === "true";
  const parentSessionId =
    ((data.parent_session_id || data.parentSessionId) as string) || undefined;

  try {
    const result = await deliverProjectRequest<{ context?: string }>(
      "/agentmemory/session/start",
      project,
      {
        sessionId,
        project,
        cwd,
        parentSessionId,
        privacy: projectConfig.privacy,
        captureProfile: projectConfig.capture_profile,
        externalProcessing: projectConfig.external_processing,
      },
      {
        attempts: 2,
        timeoutMs: injectContext ? INJECT_TIMEOUT_MS : REGISTER_TIMEOUT_MS,
      },
    );
    if (injectContext && result?.context) {
      process.stdout.write(result.context);
    }
  } catch (error) {
    reportHookDeliveryFailure("session registration", error);
  }
}

main().catch((error) => {
  reportHookDeliveryFailure("session start", error);
});
