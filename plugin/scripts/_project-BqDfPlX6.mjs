import { i as loadAgentmemoryEnvironment, o as resolveProjectConfig } from "./_auth-1Z57rc-e.mjs";
//#region src/hooks/_project.ts
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
function resolveProject(cwd) {
	return resolveProjectConfig(typeof cwd === "string" && cwd.trim() ? cwd : process.cwd()).project_id;
}
//#endregion
export { resolveProject as t };
