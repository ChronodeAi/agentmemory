#!/usr/bin/env node
import { t as resolveProject } from "./_project-BNYA1N7W.mjs";
import { n as reportHookDeliveryFailure, t as deliverProjectRequest } from "./_delivery-BkHp79UX.mjs";
//#region src/hooks/session-end.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
async function main() {
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	let data;
	try {
		data = JSON.parse(input);
	} catch {
		return;
	}
	if (!data || typeof data !== "object") return;
	if (isSdkChildContext(data)) return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	const project = resolveProject(data.cwd);
	try {
		await deliverProjectRequest("/agentmemory/session/end", project, {
			sessionId,
			project
		}, {
			attempts: 2,
			timeoutMs: 1500
		});
	} catch (error) {
		reportHookDeliveryFailure("session closure", error);
		return;
	}
	if (process.env["CLAUDE_MEMORY_BRIDGE"] === "true") try {
		await deliverProjectRequest("/agentmemory/claude-bridge/sync", project, { project }, { timeoutMs: 2500 });
	} catch (error) {
		reportHookDeliveryFailure("Claude memory bridge sync", error);
	}
}
main().catch((error) => {
	reportHookDeliveryFailure("session end", error);
});
//#endregion
export {};
