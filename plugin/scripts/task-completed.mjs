#!/usr/bin/env node
import { t as resolveProject } from "./_project-VJwrNfCx.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-DZP2ns6D.mjs";
//#region src/hooks/task-completed.ts
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
	await deliverObservation({
		hookType: "task_completed",
		sessionId: data.session_id || "unknown",
		project: resolveProject(data.cwd),
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data: {
			task_id: data.task_id,
			task_subject: data.task_subject,
			task_description: typeof data.task_description === "string" ? data.task_description.slice(0, 2e3) : "",
			teammate_name: data.teammate_name,
			team_name: data.team_name
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
