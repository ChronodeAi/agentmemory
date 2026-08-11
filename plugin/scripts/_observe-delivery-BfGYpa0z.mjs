import { n as projectAuthHeaders } from "./_auth-CsB97Q7t.mjs";
//#region src/hooks/_observe-delivery.ts
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 250;
const RETRY_DELAY_MS = 50;
function authHeaders(payload) {
	return projectAuthHeaders(typeof payload["project"] === "string" ? payload["project"] : "");
}
function responseError(status, body) {
	const reason = typeof body?.["error"] === "string" ? body["error"] : `observe request failed with HTTP ${status}`;
	const error = new Error(reason);
	error.retryable = status === 429 || status === 503 || body?.["retryable"] === true;
	return error;
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function isResponseBody(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
async function deliverObservation(payload) {
	const restUrl = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) try {
		const response = await fetch(`${restUrl}/agentmemory/observe`, {
			method: "POST",
			headers: authHeaders(payload),
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
		const parsedBody = await response.json().catch(() => null);
		if (!isResponseBody(parsedBody)) {
			const error = /* @__PURE__ */ new Error(`observe endpoint returned invalid JSON object with HTTP ${response.status}`);
			error.retryable = response.ok || response.status === 429 || response.status === 503;
			throw error;
		}
		const body = parsedBody;
		if (response.ok && body?.["success"] !== false) return;
		throw responseError(response.status, body);
	} catch (error) {
		lastError = error;
		if (!(!(error instanceof Error) || error.retryable !== false) || attempt === MAX_ATTEMPTS) break;
		await delay(RETRY_DELAY_MS * attempt);
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error("observation delivery failed");
}
function reportObservationDeliveryFailure(error) {
	const message = error instanceof Error ? error.message : "observation delivery failed";
	process.stderr.write(`[agentmemory] ${message}\n`);
}
//#endregion
export { reportObservationDeliveryFailure as n, deliverObservation as t };
