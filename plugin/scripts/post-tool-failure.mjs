#!/usr/bin/env node
import { o as resolveProjectConfig } from "./_auth-1Z57rc-e.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-BSYpE5r3.mjs";
import { t as captureToolEvent } from "./_capture-Ba1NCNW7.mjs";
//#region src/hooks/post-tool-failure.ts
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
	if (data.is_interrupt || data.isInterrupt) return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	const toolName = data.tool_name ?? data.toolName;
	const toolInput = data.tool_input ?? data.toolArgs;
	const error = data.error ?? data.errorMessage;
	const config = resolveProjectConfig(data.cwd);
	const captured = captureToolEvent(toolName, toolInput, error, config, true);
	if (!captured) return;
	await deliverObservation({
		hookType: "post_tool_failure",
		sessionId,
		project: config.project_id,
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		privacy: config.privacy,
		captureProfile: config.capture_profile,
		externalProcessing: config.external_processing,
		data: {
			tool_name: toolName,
			tool_input: captured.toolInput,
			error: captured.toolOutput,
			capture: captured.capture
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
