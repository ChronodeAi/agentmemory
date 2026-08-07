import {
  authorizeAdministrativeRequest,
  authorizeProjectRequest,
  type AuthorizationDecision,
  type ProjectAuthorizationOptions,
} from "./auth.js";

export type ProjectReadScope =
  | { kind: "project"; project: string }
  | { kind: "global" };

export interface ProjectScopeInput {
  project?: unknown;
  scope?: unknown;
}

export interface ProjectScopeAuthorizationOptions
  extends Omit<ProjectAuthorizationOptions, "project"> {
  adminSecret?: string;
}

export function requireProjectReadScope(
  data: ProjectScopeInput | undefined,
  operation: string,
): ProjectReadScope {
  const project =
    typeof data?.project === "string" ? data.project.trim() : "";
  if (data?.scope === "global") {
    if (project) {
      throw new Error(
        `${operation}: project cannot be combined with global scope`,
      );
    }
    return { kind: "global" };
  }
  if (data?.scope !== undefined && data.scope !== "project") {
    throw new Error(
      `${operation}: scope must be "project" or explicitly "global"`,
    );
  }
  if (!project) {
    throw new Error(
      `${operation}: project is required; pass scope: "global" for an explicit cross-project query`,
    );
  }
  return { kind: "project", project };
}

export function recordMatchesProject(
  recordProject: string | undefined | null,
  scope: ProjectReadScope,
): boolean {
  return scope.kind === "global" || recordProject === scope.project;
}

export function filterRecordsByProject<T extends { project?: string | null }>(
  records: T[],
  scope: ProjectReadScope,
): T[] {
  return scope.kind === "global"
    ? records
    : records.filter((record) => recordMatchesProject(record.project, scope));
}

export function authorizeProjectScopeRequest(
  headers: Record<string, string | string[] | undefined> | undefined,
  scope: ProjectReadScope,
  options: ProjectScopeAuthorizationOptions,
): AuthorizationDecision {
  const administrative = authorizeAdministrativeRequest(
    headers,
    options.adminSecret,
  );
  if (administrative.authorized) return administrative;
  if (scope.kind === "global") {
    return administrative.error === "authentication_unavailable"
      ? {
          authorized: false,
          statusCode: 503,
          error: "authentication_unavailable",
        }
      : { authorized: false, statusCode: 401, error: "unauthorized" };
  }
  return authorizeProjectRequest(headers, {
    ...options,
    project: scope.project,
  });
}
