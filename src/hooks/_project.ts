import {
  loadAgentmemoryEnvironment,
  resolveProjectConfig,
} from "../project-config.js";

// Hooks are standalone processes. Load the user configuration before any hook
// reads process.env, while preserving variables explicitly set by the caller.
loadAgentmemoryEnvironment();

export function resolveProject(cwd?: string): string {
  const target =
    typeof cwd === "string" && cwd.trim() ? cwd : process.cwd();
  return resolveProjectConfig(target).project_id;
}
