#!/usr/bin/env node
import { t as resolveProject } from "./_project-CXCTta9T.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-Bt5vTi-C.mjs";
//#region src/hooks/prompt-submit.ts
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
		hookType: "prompt_submit",
		sessionId: data.session_id || data.sessionId || "unknown",
		project: resolveProject(data.cwd),
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		data: { prompt: data.prompt ?? data.userPrompt }
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
