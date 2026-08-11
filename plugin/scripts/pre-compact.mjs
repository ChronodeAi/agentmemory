#!/usr/bin/env node
import { i as loadAgentmemoryEnvironment, n as projectAuthHeaders, t as contextAcknowledgementSecret } from "./_auth-CsB97Q7t.mjs";
import { t as resolveProject } from "./_project-DJgbzeoL.mjs";
import { createHash, createHmac, randomUUID } from "node:crypto";
//#region src/hooks/pre-compact.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
const REST_URL = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
function reportFailure(message) {
	process.stderr.write(`[agentmemory] ${message}\n`);
	process.exitCode = 1;
}
function signedAcknowledgement(input, acknowledgementSecret) {
	const claims = {
		version: 1,
		audience: "agentmemory:context-delivery",
		...input,
		providerId: "claude-code:pre-compact",
		receiptId: randomUUID()
	};
	const signed = `amack1.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
	return `${signed}.${createHmac("sha256", acknowledgementSecret).update(signed).digest("base64url")}`;
}
function writeContext(context) {
	return new Promise((resolve, reject) => {
		process.stdout.write(context, (error) => error ? reject(error) : resolve());
	});
}
async function main() {
	loadAgentmemoryEnvironment();
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
	if (process.env["AGENTMEMORY_INJECT_CONTEXT"] !== "true") return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	const project = resolveProject(data.cwd);
	const acknowledgementSecret = contextAcknowledgementSecret();
	if (!acknowledgementSecret) {
		reportFailure("context delivery credentials are unavailable");
		return;
	}
	let headers;
	try {
		headers = projectAuthHeaders(project);
	} catch {
		reportFailure("context delivery credentials are unavailable");
		return;
	}
	if (process.env["CLAUDE_MEMORY_BRIDGE"] === "true") try {
		await fetch(`${REST_URL}/agentmemory/claude-bridge/sync`, {
			method: "POST",
			headers,
			body: JSON.stringify({ project }),
			signal: AbortSignal.timeout(5e3)
		});
	} catch {}
	try {
		const res = await fetch(`${REST_URL}/agentmemory/context-packet`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				sessionId,
				project,
				token_budget: 1500,
				context_class: "advisory"
			}),
			signal: AbortSignal.timeout(5e3)
		});
		if (!res.ok) {
			reportFailure(`context packet request failed with HTTP ${res.status}`);
			return;
		}
		const result = await res.json();
		if (result.success === true && result.context === "" && (!result.sourceIds || result.sourceIds.length === 0)) return;
		if (result.success !== true || !result.context || !result.packetId || !result.expiresAt || !result.nonce || !result.contextSha256 || createHash("sha256").update(result.context).digest("hex") !== result.contextSha256) {
			reportFailure("context packet response failed validation");
			return;
		}
		await writeContext(result.context);
		const providerReceipt = signedAcknowledgement({
			packetId: result.packetId,
			project,
			sessionId,
			contextSha256: result.contextSha256,
			nonce: result.nonce,
			expiresAt: result.expiresAt
		}, acknowledgementSecret);
		const acknowledgement = await fetch(`${REST_URL}/agentmemory/context-acknowledge`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				project,
				sessionId,
				packetId: result.packetId,
				providerReceipt
			}),
			signal: AbortSignal.timeout(5e3)
		});
		if (!acknowledgement.ok) {
			reportFailure(`context acknowledgement failed with HTTP ${acknowledgement.status}`);
			return;
		}
		const acknowledgementResult = await acknowledgement.json();
		if (acknowledgementResult.success !== true || acknowledgementResult.acknowledged !== true) reportFailure("context acknowledgement was not confirmed");
	} catch {
		reportFailure("context delivery failed");
	}
}
main().catch(() => {
	reportFailure("context delivery failed");
});
//#endregion
export {};
