import { getEnvVar } from "../config.js";

const MAX_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 5000;
const HARD_BUDGET_CAP_MS = 170000;
const MIN_ATTEMPT_FLOOR_MS = 100;
const RETRY_STATUS = new Set([429, 503]);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (trimmed === "") return undefined;

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(trimmed);
  if (Number.isFinite(date)) {
    return Math.max(0, date - Date.now());
  }

  return undefined;
}

async function fetchOnce(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctl = new AbortController();
  const signal = init.signal
    ? AbortSignal.any([init.signal, ctl.signal])
    : ctl.signal;
  const t = setTimeout(() => ctl.abort(), ms);
  return fetch(url, { ...init, signal }).finally(() => clearTimeout(t));
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  const parsed =
    timeoutMs ??
    Number.parseInt(getEnvVar("AGENTMEMORY_LLM_TIMEOUT_MS") ?? "60000", 10);
  const ms = Number.isFinite(parsed) && parsed > 0 ? parsed : 60000;
  const budgetMs = Math.min(ms, HARD_BUDGET_CAP_MS);
  const start = Date.now();

  let response = await fetchOnce(url, init, budgetMs);
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt++) {
    if (!RETRY_STATUS.has(response.status)) return response;

    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    const backoff = 500 * 2 ** (attempt - 1);
    const delay = Math.min(retryAfter ?? backoff, MAX_RETRY_DELAY_MS);
    const remaining = budgetMs - (Date.now() - start);
    if (delay + MIN_ATTEMPT_FLOOR_MS > remaining) return response;

    await response.body?.cancel().catch(() => {});
    await sleep(delay);

    const attemptMs = Math.max(
      MIN_ATTEMPT_FLOOR_MS,
      Math.min(ms, budgetMs - (Date.now() - start)),
    );
    response = await fetchOnce(url, init, attemptMs);
  }

  return response;
}
