import {
  loadAgentmemoryEnvironment,
  resolveProjectConfig,
} from "../project-config.js";

// Hooks are standalone processes. Load the user configuration before any hook
// reads process.env, while preserving variables explicitly set by the caller.
loadAgentmemoryEnvironment();

/**
 * Resolve the canonical project id for a hook payload.
 *
 * @param cwd Working directory the hook observed, when the host provides one.
 * @returns The project id in strict precedence order: AGENTMEMORY_PROJECT_NAME
 *   (or AGENTMEMORY_PROJECT_ID) environment override first, then configured
 *   manifest/user layers, then the canonical remote-derived identity for the
 *   directory — never a path basename.
 */
export function resolveProject(cwd?: string): string {
  const target =
    typeof cwd === "string" && cwd.trim() ? cwd : process.cwd();
  return resolveProjectConfig(target).project_id;
}
