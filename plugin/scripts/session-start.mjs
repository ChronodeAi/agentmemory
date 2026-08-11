#!/usr/bin/env node
import { o as resolveProjectConfig } from "./_auth-CsB97Q7t.mjs";
import "./_project-DJgbzeoL.mjs";
import { n as reportHookDeliveryFailure, t as deliverProjectRequest } from "./_delivery-DKoKW_vq.mjs";
//#region src/hooks/session-start.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
const INJECT_TIMEOUT_MS = 1500;
const REGISTER_TIMEOUT_MS = 800;
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
	const sessionId = data.session_id || data.sessionId || `ses_${Date.now().toString(36)}`;
	const cwd = data.cwd || process.cwd();
	const projectConfig = resolveProjectConfig(data.cwd);
	const project = projectConfig.project_id;
	const injectContext = process.env["AGENTMEMORY_INJECT_CONTEXT"] === "true";
	const parentSessionId = data.parent_session_id || data.parentSessionId || void 0;
	try {
		const result = await deliverProjectRequest("/agentmemory/session/start", project, {
			sessionId,
			project,
			cwd,
			parentSessionId,
			privacy: projectConfig.privacy,
			captureProfile: projectConfig.capture_profile,
			externalProcessing: projectConfig.external_processing
		}, {
			attempts: 2,
			timeoutMs: injectContext ? INJECT_TIMEOUT_MS : REGISTER_TIMEOUT_MS
		});
		if (injectContext && result?.context) process.stdout.write(result.context);
	} catch (error) {
		reportHookDeliveryFailure("session registration", error);
	}
}
main().catch((error) => {
	reportHookDeliveryFailure("session start", error);
});
//#endregion
export {};
