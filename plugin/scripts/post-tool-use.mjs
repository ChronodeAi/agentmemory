#!/usr/bin/env node
import { o as resolveProjectConfig } from "./_auth-r09nwS46.mjs";
import { n as reportObservationDeliveryFailure, t as deliverObservation } from "./_observe-delivery-Dp1TkllS.mjs";
import { t as captureToolEvent } from "./_capture-CalTsfGN.mjs";
//#region src/hooks/post-tool-use.ts
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
	const toolName = data.tool_name ?? data.toolName;
	const toolInput = data.tool_input ?? data.toolArgs;
	const { imageData, cleanOutput } = extractImageData(toolOutput(data));
	const config = resolveProjectConfig(data.cwd);
	const captured = captureToolEvent(toolName, toolInput, cleanOutput, config);
	if (!captured) return;
	await deliverObservation({
		hookType: "post_tool_use",
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
			tool_output: captured.toolOutput,
			capture: captured.capture,
			...captured.provenance ? { provenance: captured.provenance } : {},
			...imageData ? { image_data: imageData } : {}
		}
	});
}
function toolOutput(data) {
	if (data.tool_response !== void 0) return data.tool_response;
	if (data.tool_output !== void 0) return data.tool_output;
	const result = data.tool_result ?? data.toolResult;
	if (typeof result === "object" && result !== null) {
		const obj = result;
		return obj.text_result_for_llm ?? obj.textResultForLlm ?? result;
	}
	return result;
}
function isBase64Image(val) {
	return typeof val === "string" && (val.startsWith("data:image/") || val.startsWith("iVBORw0KGgo") || val.startsWith("/9j/"));
}
function extractImageData(output) {
	if (isBase64Image(output)) return {
		imageData: output,
		cleanOutput: "[image data extracted]"
	};
	if (typeof output === "object" && output !== null && !Array.isArray(output)) {
		const obj = output;
		let imageData;
		const clean = {};
		for (const [key, val] of Object.entries(obj)) if (!imageData && isBase64Image(val)) {
			imageData = val;
			clean[key] = "[image data extracted]";
		} else clean[key] = val;
		return {
			imageData,
			cleanOutput: clean
		};
	}
	return {
		imageData: void 0,
		cleanOutput: output
	};
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
