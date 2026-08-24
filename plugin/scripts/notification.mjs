#!/usr/bin/env node
import { t as resolveProject } from "./_project-CXCTta9T.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-Bt5vTi-C.mjs";
//#region src/hooks/notification.ts
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
	const notificationType = data.notification_type ?? data.notificationType;
	if (notificationType !== "permission_prompt") return;
	const rawSessionId = data.session_id ?? data.sessionId;
	await deliverObservation({
		hookType: "notification",
		sessionId: typeof rawSessionId === "string" && rawSessionId.length > 0 ? rawSessionId : "unknown",
		project: resolveProject(data.cwd),
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data: {
			notification_type: notificationType,
			title: data.title,
			message: data.message
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
