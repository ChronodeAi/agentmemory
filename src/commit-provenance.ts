import type { CommitProvenanceTransition } from "./types.js";

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseCommitProvenanceTransitions(
  value: unknown,
): CommitProvenanceTransition[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const operations = new Set(["write", "edit", "delete", "rename", "copy"]);
  const parsed: CommitProvenanceTransition[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }
    const record = entry as Record<string, unknown>;
    const path = nonEmptyString(record.path);
    const operation = nonEmptyString(record.operation);
    const previousPath = nonEmptyString(record.previousPath);
    const digest = nonEmptyString(record.digest);
    const digestKind = nonEmptyString(record.digestKind);
    if (
      !path ||
      !operation ||
      !operations.has(operation) ||
      Boolean(digest) !== Boolean(digestKind) ||
      (digestKind !== undefined && digestKind !== "git-blob") ||
      ((operation === "rename" || operation === "copy") && !previousPath)
    ) {
      return null;
    }
    parsed.push({
      path,
      operation: operation as CommitProvenanceTransition["operation"],
      ...(previousPath ? { previousPath } : {}),
      ...(digest ? { digest, digestKind: "git-blob" } : {}),
    });
  }
  return parsed;
}
