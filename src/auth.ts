import { timingSafeEqual, createHmac, randomBytes } from "node:crypto";

const hmacKey = randomBytes(32);
export const VIEWER_NONCE_PLACEHOLDER = "__AGENTMEMORY_VIEWER_NONCE__";
export const PROJECT_CAPABILITY_TOKEN_VERSION = "amcap1";
export const DEFAULT_PROJECT_CAPABILITY_AUDIENCE = "agentmemory";
export const PROJECT_CAPABILITY_PROJECT_HEADER = "x-agentmemory-project";

export interface ProjectCapabilityClaims {
  version: 1;
  audience: string;
  project: string;
  expiresAt: number;
  issuedAt?: number;
  capabilityId?: string;
}

export interface ProjectCapabilityVerificationOptions {
  signingSecret: string | undefined;
  audience: string;
  project?: string;
  now?: number;
}

export interface ProjectAuthorizationOptions
  extends ProjectCapabilityVerificationOptions {
  legacySecret?: string;
  strictCapabilityMode?: boolean;
}

export function timingSafeCompare(a: string, b: string): boolean {
  const hmacA = createHmac("sha256", hmacKey).update(a).digest();
  const hmacB = createHmac("sha256", hmacKey).update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

export type AuthorizationDecision =
  | {
      authorized: true;
      mode?: "capability" | "legacy" | "administrative";
      capability?: ProjectCapabilityClaims;
    }
  | {
      authorized: false;
      statusCode: 401 | 503;
      error:
        | "unauthorized"
        | "authentication_unavailable"
        | "capability_invalid"
        | "capability_expired"
        | "capability_wrong_audience"
        | "capability_wrong_project"
        | "legacy_authentication_disabled";
    };

function hmac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCapabilityClaims(encoded: string): ProjectCapabilityClaims | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (
      parsed["version"] !== 1 ||
      typeof parsed["audience"] !== "string" ||
      !parsed["audience"].trim() ||
      typeof parsed["project"] !== "string" ||
      !parsed["project"].trim() ||
      typeof parsed["expiresAt"] !== "number" ||
      !Number.isSafeInteger(parsed["expiresAt"])
    ) {
      return null;
    }
    if (
      parsed["issuedAt"] !== undefined &&
      (typeof parsed["issuedAt"] !== "number" ||
        !Number.isSafeInteger(parsed["issuedAt"]))
    ) {
      return null;
    }
    if (
      parsed["capabilityId"] !== undefined &&
      (typeof parsed["capabilityId"] !== "string" ||
        !parsed["capabilityId"].trim())
    ) {
      return null;
    }
    return {
      version: 1,
      audience: parsed["audience"].trim(),
      project: parsed["project"].trim(),
      expiresAt: parsed["expiresAt"],
      ...(typeof parsed["issuedAt"] === "number"
        ? { issuedAt: parsed["issuedAt"] }
        : {}),
      ...(typeof parsed["capabilityId"] === "string"
        ? { capabilityId: parsed["capabilityId"].trim() }
        : {}),
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(
  headers: Record<string, string | string[] | undefined> | undefined,
): string | undefined {
  const authorization = headers?.["authorization"] ?? headers?.["Authorization"];
  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return undefined;
  }
  const token = authorization.slice("Bearer ".length).trim();
  return token || undefined;
}

export function extractProjectBinding(
  headers: Record<string, string | string[] | undefined> | undefined,
): string | undefined {
  if (!headers) return undefined;
  for (const [name, value] of Object.entries(headers)) {
    if (
      name.toLowerCase() !== PROJECT_CAPABILITY_PROJECT_HEADER ||
      typeof value !== "string"
    ) {
      continue;
    }
    const project = value.trim();
    return project || undefined;
  }
  return undefined;
}

export function createProjectCapabilityToken(
  claims: ProjectCapabilityClaims,
  signingSecret: string,
): string {
  if (!signingSecret) {
    throw new Error("project capability signing secret is required");
  }
  const normalized: ProjectCapabilityClaims = {
    version: 1,
    audience: claims.audience.trim(),
    project: claims.project.trim(),
    expiresAt: claims.expiresAt,
    ...(claims.issuedAt !== undefined ? { issuedAt: claims.issuedAt } : {}),
    ...(claims.capabilityId
      ? { capabilityId: claims.capabilityId.trim() }
      : {}),
  };
  if (
    !normalized.audience ||
    !normalized.project ||
    !Number.isSafeInteger(normalized.expiresAt)
  ) {
    throw new Error("invalid project capability claims");
  }
  const payload = Buffer.from(JSON.stringify(normalized)).toString("base64url");
  const signed = `${PROJECT_CAPABILITY_TOKEN_VERSION}.${payload}`;
  return `${signed}.${hmac(signed, signingSecret)}`;
}

export function verifyProjectCapabilityToken(
  token: string | undefined,
  options: ProjectCapabilityVerificationOptions,
): AuthorizationDecision {
  if (!options.signingSecret) {
    return {
      authorized: false,
      statusCode: 503,
      error: "authentication_unavailable",
    };
  }
  if (!token) {
    return { authorized: false, statusCode: 401, error: "unauthorized" };
  }
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    parts[0] !== PROJECT_CAPABILITY_TOKEN_VERSION
  ) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_invalid",
    };
  }
  const signed = `${parts[0]}.${parts[1]}`;
  const expected = hmac(signed, options.signingSecret);
  if (!timingSafeCompare(parts[2], expected)) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_invalid",
    };
  }
  const capability = parseCapabilityClaims(parts[1]);
  if (!capability) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_invalid",
    };
  }
  if (capability.audience !== options.audience) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_wrong_audience",
    };
  }
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (capability.expiresAt <= now) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_expired",
    };
  }
  if (options.project && capability.project !== options.project) {
    return {
      authorized: false,
      statusCode: 401,
      error: "capability_wrong_project",
    };
  }
  return { authorized: true, mode: "capability", capability };
}

export function isStrictCapabilityMode(
  value = process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"],
): boolean {
  return !["false", "0", "off"].includes((value ?? "").trim().toLowerCase());
}

export function authorizeProjectRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  options: ProjectAuthorizationOptions,
): AuthorizationDecision {
  const token = extractBearerToken(headers);
  const capabilityDecision = verifyProjectCapabilityToken(token, options);
  if (capabilityDecision.authorized) return capabilityDecision;
  const strict =
    options.strictCapabilityMode ?? isStrictCapabilityMode();
  if (strict) {
    if (
      token &&
      options.legacySecret &&
      timingSafeCompare(token, options.legacySecret)
    ) {
      return {
        authorized: false,
        statusCode: 401,
        error: "legacy_authentication_disabled",
      };
    }
    return capabilityDecision;
  }
  if (!options.legacySecret) {
    return {
      authorized: false,
      statusCode: 503,
      error: "authentication_unavailable",
    };
  }
  if (!token || !timingSafeCompare(token, options.legacySecret)) {
    return { authorized: false, statusCode: 401, error: "unauthorized" };
  }
  return { authorized: true, mode: "legacy" };
}

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
  const decision = authorizeProtectedRequest(headers, adminSecret);
  return decision.authorized
    ? { authorized: true, mode: "administrative" }
    : decision;
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
