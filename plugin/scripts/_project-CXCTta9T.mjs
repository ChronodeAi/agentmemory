import { i as loadAgentmemoryEnvironment, o as resolveProjectConfig } from "./_auth-dmt9vymH.mjs";
//#region src/hooks/_project.ts
loadAgentmemoryEnvironment();
function resolveProject(cwd) {
	return resolveProjectConfig(typeof cwd === "string" && cwd.trim() ? cwd : process.cwd()).project_id;
}
//#endregion
export { resolveProject as t };
