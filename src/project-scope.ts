export type ProjectReadScope =
  | { kind: "project"; project: string }
  | { kind: "global" };

export interface ProjectScopeInput {
  project?: unknown;
  scope?: unknown;
}

export function requireProjectReadScope(
  data: ProjectScopeInput | undefined,
  operation: string,
): ProjectReadScope {
  if (data?.scope === "global") return { kind: "global" };
  if (data?.scope !== undefined && data.scope !== "project") {
    throw new Error(
      `${operation}: scope must be "project" or explicitly "global"`,
    );
  }
  if (typeof data?.project !== "string" || !data.project.trim()) {
    throw new Error(
      `${operation}: project is required; pass scope: "global" for an explicit cross-project query`,
    );
  }
  return { kind: "project", project: data.project.trim() };
}

export function recordMatchesProject(
  recordProject: string | undefined | null,
  scope: ProjectReadScope,
): boolean {
  return scope.kind === "global" || recordProject === scope.project;
}
