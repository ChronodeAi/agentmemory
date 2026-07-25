import { timingSafeEqual, createHmac, randomBytes } from "node:crypto";

const hmacKey = randomBytes(32);
export const VIEWER_NONCE_PLACEHOLDER = "__AGENTMEMORY_VIEWER_NONCE__";

export function timingSafeCompare(a: string, b: string): boolean {
  const hmacA = createHmac("sha256", hmacKey).update(a).digest();
  const hmacB = createHmac("sha256", hmacKey).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

export type AuthorizationDecision =
  | { authorized: true }
  | {
      authorized: false;
      statusCode: 401 | 503;
      error: "unauthorized" | "authentication_unavailable";
    };

export function authorizeProtectedRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  secret: string | undefined,
): AuthorizationDecision {
  if (!secret) {
    return {
      authorized: false,
      statusCode: 503,
      error: "authentication_unavailable",
    };
  }
  const authorization = headers?.["authorization"] ?? headers?.["Authorization"];
  if (
    typeof authorization !== "string" ||
    !timingSafeCompare(authorization, `Bearer ${secret}`)
  ) {
    return { authorized: false, statusCode: 401, error: "unauthorized" };
  }
  return { authorized: true };
}

export function authorizeAdministrativeRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  adminSecret: string | undefined,
): AuthorizationDecision {
  return authorizeProtectedRequest(headers, adminSecret);
}

export function createViewerNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function buildViewerCsp(nonce: string): string {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'none'",
    `script-src 'nonce-${nonce}'`,
    "script-src-attr 'none'",
    "style-src 'unsafe-inline'",
    "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* wss://localhost:* wss://127.0.0.1:*",
    "img-src 'self'",
    "font-src 'self'",
  ].join("; ");
}
