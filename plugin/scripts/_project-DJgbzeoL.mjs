import { i as loadAgentmemoryEnvironment, o as resolveProjectConfig } from "./_auth-CsB97Q7t.mjs";
//#region src/hooks/_project.ts
loadAgentmemoryEnvironment();
function resolveProject(cwd) {
	return resolveProjectConfig(typeof cwd === "string" && cwd.trim() ? cwd : process.cwd()).project_id;
}
//#endregion
export { resolveProject as t };
