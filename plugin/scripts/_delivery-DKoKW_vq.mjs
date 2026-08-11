import { n as projectAuthHeaders } from "./_auth-CsB97Q7t.mjs";
//#region src/hooks/_delivery.ts
var HookDeliveryError = class extends Error {
	retryable;
	constructor(message, retryable) {
		super(message);
		this.name = "HookDeliveryError";
		this.retryable = retryable;
	}
};
function responseError(status, body) {
	return new HookDeliveryError(typeof body?.["error"] === "string" ? body["error"] : `request failed with HTTP ${status}`, status === 429 || status === 503 || body?.["retryable"] === true);
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function isResponseBody(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
async function deliverProjectRequest(path, project, body, options) {
	const restUrl = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
	const attempts = Math.max(1, options.attempts ?? 1);
	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt += 1) try {
		const response = await fetch(`${restUrl}${path}`, {
			method: "POST",
			headers: projectAuthHeaders(project),
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(options.timeoutMs)
		});
		const parsedBody = await response.json().catch(() => null);
		if (!isResponseBody(parsedBody)) throw new HookDeliveryError(`hook endpoint returned invalid JSON object with HTTP ${response.status}`, response.ok || response.status === 429 || response.status === 503);
		const responseBody = parsedBody;
		if (response.ok && responseBody?.["success"] !== false) return responseBody;
		throw responseError(response.status, responseBody);
	} catch (error) {
		lastError = error;
		if (!(!(error instanceof HookDeliveryError) || error.retryable) || attempt === attempts) break;
		await delay(75 * attempt);
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error("hook delivery failed");
}
function reportHookDeliveryFailure(action, error) {
	const message = error instanceof Error ? error.message : "hook delivery failed";
	process.stderr.write(`[agentmemory] ${action} failed: ${message}\n`);
}
//#endregion
export { reportHookDeliveryFailure as n, deliverProjectRequest as t };
