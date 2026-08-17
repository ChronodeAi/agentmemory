import type { CommitLink, CommitProvenanceTransition } from "./types.js";

const GIT_OBJECT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i;
const CREDENTIAL_FREE_WORKTREE_ID = /^wt_[0-9a-f]{32}$/;

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function parseGitObjectId(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  const parsed = nonEmptyString(value);
  return parsed && GIT_OBJECT_ID.test(parsed) ? parsed.toLowerCase() : null;
}

export function parseCredentialFreeWorktreeId(
  value: unknown,
): string | undefined | null {
  if (value === undefined) return undefined;
  const parsed = nonEmptyString(value);
  return parsed && CREDENTIAL_FREE_WORKTREE_ID.test(parsed) ? parsed : null;
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
    const digest = parseGitObjectId(record.digest);
    const digestKind = nonEmptyString(record.digestKind);
    if (
      !path ||
      !operation ||
      !operations.has(operation) ||
      digest === null ||
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

export function hasRichCommitProvenance(
  commit: Pick<
    CommitLink,
    "sha" | "baseHeadSha" | "worktreeId" | "fileTransitions"
  >,
): boolean {
  const sha = parseGitObjectId(commit.sha);
  const baseHeadSha = parseGitObjectId(commit.baseHeadSha);
  const worktreeId = parseCredentialFreeWorktreeId(commit.worktreeId);
  const transitions = parseCommitProvenanceTransitions(commit.fileTransitions);
  return Boolean(
    sha &&
      baseHeadSha &&
      worktreeId &&
      transitions &&
      transitions.length > 0 &&
      transitions.every(
        (transition) =>
          Boolean(transition.digest) && transition.digestKind === "git-blob",
      ),
  );
}
