import {
  createProjectCapabilityToken,
  DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  isStrictCapabilityMode,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "./auth.js";

export interface ClientAuthConfig {
  adminSecret?: string;
  audience?: string;
  legacySecret?: string;
  projectCapabilitySecret?: string;
  projectCapabilityToken?: string;
  strictCapabilityMode?: boolean;
}

export type ClientRequestScope =
  | { kind: "project"; project: string }
  | { kind: "global" }
  | { kind: "unscoped" };

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : undefined;
}

export function resolveClientRequestScope(
  url: string,
  body?: unknown,
): ClientRequestScope {
  const parsed = new URL(url);
  const record =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  const queryProject = nonEmpty(parsed.searchParams.get("project"));
  const bodyProject = nonEmpty(record["project"]);
  if (queryProject && bodyProject && queryProject !== bodyProject) {
    throw new Error("request project bindings disagree");
  }
  const project = queryProject ?? bodyProject;
  const queryScope = nonEmpty(parsed.searchParams.get("scope"));
  const bodyScope = nonEmpty(record["scope"]);
  if (queryScope && bodyScope && queryScope !== bodyScope) {
    throw new Error("request scope bindings disagree");
  }
  const scope = queryScope ?? bodyScope;
  if (project && scope === "global") {
    throw new Error("request cannot combine project and global scope");
  }
  if (project) return { kind: "project", project };
  if (scope === "global") return { kind: "global" };
  return { kind: "unscoped" };
}

export function clientAuthorizationHeaders(
  scope: ClientRequestScope,
  config: ClientAuthConfig,
  now = Math.floor(Date.now() / 1000),
): Record<string, string> {
  if (scope.kind === "global") {
    return config.adminSecret
      ? { Authorization: `Bearer ${config.adminSecret}` }
      : {};
  }
  if (scope.kind === "unscoped") {
    return config.legacySecret
      ? { Authorization: `Bearer ${config.legacySecret}` }
      : {};
  }

  const token =
    config.projectCapabilityToken ||
    (config.projectCapabilitySecret
      ? createProjectCapabilityToken(
          {
            version: 1,
            audience:
              config.audience?.trim() ||
              DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
            project: scope.project,
            issuedAt: now,
            expiresAt: now + 300,
          },
          config.projectCapabilitySecret,
        )
      : undefined);
  if (token) {
    return {
      Authorization: `Bearer ${token}`,
      [PROJECT_CAPABILITY_PROJECT_HEADER]: scope.project,
    };
  }
  const strict =
    config.strictCapabilityMode ??
    isStrictCapabilityMode();
  if (!strict && config.legacySecret) {
    return {
      Authorization: `Bearer ${config.legacySecret}`,
      [PROJECT_CAPABILITY_PROJECT_HEADER]: scope.project,
    };
  }
  return {
    [PROJECT_CAPABILITY_PROJECT_HEADER]: scope.project,
  };
}
