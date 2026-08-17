import { projectAuthHeaders } from "./_auth.js";

const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 250;
const RETRY_DELAY_MS = 50;

function authHeaders(
  payload: Record<string, unknown>,
): Record<string, string> {
  const project =
    typeof payload["project"] === "string" ? payload["project"] : "";
  return projectAuthHeaders(project);
}

function responseError(
  status: number,
  body: Record<string, unknown> | null,
): Error & { retryable?: boolean } {
  const reason =
    typeof body?.["error"] === "string"
      ? body["error"]
      : `observe request failed with HTTP ${status}`;
  const error = new Error(reason) as Error & { retryable?: boolean };
  error.retryable =
    status === 429 ||
    status === 503 ||
    body?.["retryable"] === true;
  return error;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isResponseBody(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function deliverObservation(
  payload: Record<string, unknown>,
): Promise<void> {
  const restUrl =
    process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${restUrl}/agentmemory/observe`, {
        method: "POST",
        headers: authHeaders(payload),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const parsedBody = await response.json().catch(() => null);
      if (!isResponseBody(parsedBody)) {
        const error = new Error(
          `observe endpoint returned invalid JSON object with HTTP ${response.status}`,
        ) as Error & { retryable?: boolean };
        error.retryable =
          response.ok ||
          response.status === 429 ||
          response.status === 503;
        throw error;
      }
      const body = parsedBody;
      if (response.ok && body?.["success"] !== false) {
        return;
      }
      throw responseError(response.status, body);
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof Error) ||
        (error as Error & { retryable?: boolean }).retryable !== false;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await delay(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("observation delivery failed");
}

export function reportObservationDeliveryFailure(error: unknown): void {
  const message =
    error instanceof Error ? error.message : "observation delivery failed";
  process.stderr.write(`[agentmemory] ${message}\n`);
}
