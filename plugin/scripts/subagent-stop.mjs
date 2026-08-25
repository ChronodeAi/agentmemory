#!/usr/bin/env node
import { t as resolveProject } from "./_project-BQWFXz1a.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-BsKR4_co.mjs";
//#region src/hooks/subagent-stop.ts
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
	const agentId = data.agent_id || data.agentName;
	const agentType = data.agent_type || data.agentDisplayName || data.agentName;
	const lastMsg = typeof data.last_assistant_message === "string" ? data.last_assistant_message.slice(0, 4e3) : "";
	await deliverObservation({
		hookType: "subagent_stop",
		sessionId,
		project: resolveProject(data.cwd),
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data: {
			agent_id: agentId,
			agent_type: agentType,
			last_message: lastMsg
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
