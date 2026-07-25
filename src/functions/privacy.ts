import type { ISdk } from "iii-sdk";

const PRIVATE_TAG_RE = /<private>[\s\S]*?<\/private>/gi;
const UNTERMINATED_PRIVATE_TAG_RE = /<private>[\s\S]*$/gi;
const PEM_BLOCK_RE =
  /-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----[\s\S]*?-----END [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----/gi;
function isSensitiveKey(key: string): boolean {
  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .toLowerCase()
    .replace(/^_+|_+$/g, "");
  return (
    /(?:^|_)(?:api_key|client_secret|access_token|refresh_token|id_token|auth_token|bearer_token|private_key|password|passwd|credentials?|authorization|secret)(?:_|$)/.test(
      normalized,
    ) ||
    /_token$/.test(normalized) ||
    normalized === "token" ||
    normalized === "auth"
  );
}

const SECRET_PATTERN_SOURCES = [
  /(?:api[_-]?key|secret|token|password|credential|auth)[\s]*[=:]\s*["']?[A-Za-z0-9_\-/.+]{20,}/gi,
  /Bearer\s+[A-Za-z0-9._\-+/=]{20,}/gi,
  /sk-proj-[A-Za-z0-9\-_]{20,}/g,
  /(?:sk|pk|rk|ak)-[A-Za-z0-9][A-Za-z0-9\-_]{19,}/g,
  /sk-ant-[A-Za-z0-9\-_]{20,}/g,
  /gh[pus]_[A-Za-z0-9]{36,}/g,
  /github_pat_[A-Za-z0-9_]{22,}/g,
  /xoxb-[A-Za-z0-9\-]+/g,
  /AKIA[0-9A-Z]{16}/g,
  /AIza[A-Za-z0-9\-_]{35}/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /npm_[A-Za-z0-9]{36}/g,
  /glpat-[A-Za-z0-9\-_]{20,}/g,
  /dop_v1_[A-Za-z0-9]{64}/g,
];

function redactString(input: string): string {
  let result = input
    .replace(PRIVATE_TAG_RE, "[REDACTED]")
    .replace(UNTERMINATED_PRIVATE_TAG_RE, "[REDACTED]")
    .replace(PEM_BLOCK_RE, "[REDACTED_SECRET]");
  for (const source of SECRET_PATTERN_SOURCES) {
    const pattern = new RegExp(source.source, source.flags);
    result = result.replace(pattern, "[REDACTED_SECRET]");
  }
  return result;
}

export function sanitizePrivateData<T>(input: T): T {
  if (typeof input === "string") {
    return redactString(input) as T;
  }
  if (Array.isArray(input)) {
    return input.map((value) => sanitizePrivateData(value)) as T;
  }
  if (input && typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = isSensitiveKey(key)
        ? "[REDACTED_SECRET]"
        : sanitizePrivateData(value);
    }
    return sanitized as T;
  }
  return input;
}

export function stripPrivateData(input: string): string {
  try {
    const parsed = JSON.parse(input) as unknown;
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(sanitizePrivateData(parsed));
    }
  } catch {
    // Plain text is redacted below.
  }
  return redactString(input);
}

export function registerPrivacyFunction(sdk: ISdk): void {
  sdk.registerFunction("mem::privacy", 
    async (data: { input?: unknown } | undefined) => {
      if (!data || typeof data.input !== "string") {
        return { output: "", error: "invalid input: expected string field 'input'" };
      }
      return { output: stripPrivateData(data.input) };
    },
  );
}
