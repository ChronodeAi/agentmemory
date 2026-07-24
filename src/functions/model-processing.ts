import { getEnvVar } from "../config.js";
import { resolveProjectConfig } from "../project-config.js";
import type { StateKV } from "../state/kv.js";
import { KV } from "../state/schema.js";
import type { Session } from "../types.js";

export const EXTERNAL_PROCESSING_DISABLED_ERROR =
  "external_processing_disabled_for_strict_project; configure a local provider and AGENTMEMORY_LOCAL_PROCESSING=true";

export interface ModelProcessingPolicy {
  allowed: boolean;
  error?: string;
  mode?: "local" | "external";
  session?: Session;
}

export function localModelProcessingEnabled(): boolean {
  return getEnvVar("AGENTMEMORY_LOCAL_PROCESSING") === "true";
}

function sessionRestrictsExternalProcessing(session: Session): boolean {
  return session.privacy === "strict" || session.externalProcessing === false;
}

export async function modelProcessingForSession(
  kv: StateKV,
  sessionId: string,
): Promise<ModelProcessingPolicy> {
  const session = await kv.get<Session>(KV.sessions, sessionId).catch(() => null);
  if (!session) {
    return { allowed: false, error: "session_not_found" };
  }
  if (localModelProcessingEnabled()) {
    return { allowed: true, mode: "local", session };
  }
  if (sessionRestrictsExternalProcessing(session)) {
    return {
      allowed: false,
      error: EXTERNAL_PROCESSING_DISABLED_ERROR,
      session,
    };
  }
  return { allowed: true, mode: "external", session };
}

export async function modelProcessingForProject(
  kv: StateKV,
  project: string,
  cwd = process.cwd(),
): Promise<ModelProcessingPolicy> {
  if (!project.trim()) {
    return { allowed: false, error: "project scope is required" };
  }
  if (localModelProcessingEnabled()) {
    return { allowed: true, mode: "local" };
  }

  const sessions = await kv.list<Session>(KV.sessions).catch(() => []);
  const projectSessions = sessions.filter((session) => session.project === project);
  if (projectSessions.some(sessionRestrictsExternalProcessing)) {
    return { allowed: false, error: EXTERNAL_PROCESSING_DISABLED_ERROR };
  }

  try {
    const config = resolveProjectConfig(cwd);
    if (config.project_id === project) {
      if (config.privacy === "strict" || config.external_processing === false) {
        return { allowed: false, error: EXTERNAL_PROCESSING_DISABLED_ERROR };
      }
      return { allowed: true, mode: "external" };
    }
  } catch {
    // Stored session policy remains the fallback for projects other than cwd.
  }

  if (projectSessions.length > 0) {
    return { allowed: true, mode: "external" };
  }
  return {
    allowed: false,
    error: "project_processing_policy_unavailable",
  };
}

export function modelProcessingForPath(
  cwd: string,
  project?: string,
): ModelProcessingPolicy & { project?: string } {
  const config = resolveProjectConfig(cwd);
  if (project && project !== config.project_id) {
    return {
      allowed: false,
      error: `project scope mismatch: expected ${config.project_id}`,
      project: config.project_id,
    };
  }
  if (localModelProcessingEnabled()) {
    return { allowed: true, mode: "local", project: config.project_id };
  }
  if (config.privacy === "strict" || config.external_processing === false) {
    return {
      allowed: false,
      error: EXTERNAL_PROCESSING_DISABLED_ERROR,
      project: config.project_id,
    };
  }
  return { allowed: true, mode: "external", project: config.project_id };
}
