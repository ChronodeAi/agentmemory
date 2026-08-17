#!/usr/bin/env node
import { t as resolveProject } from "./_project-BNYA1N7W.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-Dp1TkllS.mjs";
//#region src/hooks/subagent-start.ts
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
	await deliverObservation({
		hookType: "subagent_start",
		sessionId,
		project: resolveProject(data.cwd),
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data: {
			agent_id: agentId,
			agent_type: agentType,
			parent_session_id: data.parent_session_id ?? data.parentSessionId ?? sessionId
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
