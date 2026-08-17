import { projectAuthHeaders } from "./_auth.js";

interface DeliveryOptions {
  attempts?: number;
  timeoutMs: number;
}

type ResponseBody = Record<string, unknown> | null;

class HookDeliveryError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "HookDeliveryError";
    this.retryable = retryable;
  }
}

function responseError(status: number, body: ResponseBody): HookDeliveryError {
  const reason =
    typeof body?.["error"] === "string"
      ? body["error"]
      : `request failed with HTTP ${status}`;
  return new HookDeliveryError(
    reason,
    status === 429 || status === 503 || body?.["retryable"] === true,
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isResponseBody(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function deliverProjectRequest<T extends ResponseBody = ResponseBody>(
  path: string,
  project: string,
  body: Record<string, unknown>,
  options: DeliveryOptions,
): Promise<T> {
  const restUrl =
    process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
  const attempts = Math.max(1, options.attempts ?? 1);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${restUrl}${path}`, {
        method: "POST",
        headers: projectAuthHeaders(project),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      const parsedBody = await response.json().catch(() => null);
      if (!isResponseBody(parsedBody)) {
        throw new HookDeliveryError(
          `hook endpoint returned invalid JSON object with HTTP ${response.status}`,
          response.ok || response.status === 429 || response.status === 503,
        );
      }
      const responseBody = parsedBody as T;
      if (responseBody?.["pipelineAccepted"] === false) {
        throw new HookDeliveryError(
          typeof responseBody["error"] === "string"
            ? responseBody["error"]
            : "background pipeline dispatch was not accepted",
          responseBody["retryable"] !== false,
        );
      }
      if (response.ok && responseBody?.["success"] !== false) {
        return responseBody;
      }
      throw responseError(response.status, responseBody);
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof HookDeliveryError) || error.retryable;
      if (!retryable || attempt === attempts) break;
      await delay(75 * attempt);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("hook delivery failed");
}

export function reportHookDeliveryFailure(
  action: string,
  error: unknown,
): void {
  const message =
    error instanceof Error ? error.message : "hook delivery failed";
  process.stderr.write(`[agentmemory] ${action} failed: ${message}\n`);
}
