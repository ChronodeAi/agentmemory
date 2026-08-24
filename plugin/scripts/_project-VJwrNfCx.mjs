import { i as loadAgentmemoryEnvironment, o as resolveProjectConfig } from "./_auth-C5rlVU3b.mjs";
//#region src/hooks/_project.ts
loadAgentmemoryEnvironment();
function resolveProject(cwd) {
	return resolveProjectConfig(typeof cwd === "string" && cwd.trim() ? cwd : process.cwd()).project_id;
}
//#endregion
export { resolveProject as t };
