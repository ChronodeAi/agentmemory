#!/usr/bin/env node

import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  credentialFreeWorktreeId,
  parseCommitTransitions,
} from "./_capture.js";
import {
  deliverProjectRequest,
  reportHookDeliveryFailure,
} from "./_delivery.js";
import { resolveProject } from "./_project.js";

const exec = promisify(execFile);

function isSdkChildContext(payload: unknown): boolean {
  if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
  if (!payload || typeof payload !== "object") return false;
  return (payload as { entrypoint?: unknown }).entrypoint === "sdk-ts";
}

const TIMEOUT_MS = 1500;

async function git(args: string[], cwd: string): Promise<string | null> {
  try {
    const { stdout } = await exec("git", args, { cwd, timeout: 1500 });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function collectCommitLinkage(
  cwd: string,
  sha: string,
  sessionId?: string,
  project = resolveProject(cwd),
) {
  const branch = await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const message = await git(["log", "-1", "--pretty=%B", sha], cwd);
  const author = await git(["log", "-1", "--pretty=%an <%ae>", sha], cwd);
  const authoredAt = await git(["log", "-1", "--pretty=%aI", sha], cwd);
  const worktreeRoot = await git(["rev-parse", "--show-toplevel"], cwd);
  const baseHeadSha = await git(["rev-parse", `${sha}^`], cwd);
  const transitionStatus = await git(
    ["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", "-M", sha],
    cwd,
  );
  const parsedTransitions = parseCommitTransitions(transitionStatus || "");
  const fileTransitions = await Promise.all(
    parsedTransitions.map(async (transition) => {
      const blobPath =
        transition.operation === "delete"
          ? transition.previousPath || transition.path
          : transition.path;
      const blobRef =
        transition.operation === "delete"
          ? `${sha}^:${blobPath}`
          : `${sha}:${blobPath}`;
      const digest = await git(["rev-parse", blobRef], cwd);
      return {
        ...transition,
        ...(digest ? { digest, digestKind: "git-blob" as const } : {}),
      };
    }),
  );
  const files =
    fileTransitions.length > 0
      ? fileTransitions.map((transition) => transition.path)
      : undefined;

  return {
    sessionId,
    project,
    sha,
    commitSha: sha,
    baseHeadSha: baseHeadSha || undefined,
    worktreeId: worktreeRoot
      ? credentialFreeWorktreeId(project, worktreeRoot)
      : undefined,
    branch: branch || undefined,
    repo: project,
    message: message || undefined,
    author: author || undefined,
    authoredAt: authoredAt || undefined,
    files,
    fileTransitions:
      fileTransitions.length > 0 ? fileTransitions : undefined,
  };
}

function commandText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.every((entry) => typeof entry === "string")
      ? value.join(" ")
      : "";
  }
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of ["cmd", "command", "script", "shell_command"]) {
    const candidate = commandText(record[key]);
    if (candidate) return candidate;
  }
  return "";
}

export function isSuccessfulCommitToolEvent(
  data: Record<string, unknown>,
): boolean {
  const toolName =
    typeof data.tool_name === "string"
      ? data.tool_name
      : typeof data.toolName === "string"
        ? data.toolName
        : "";
  const command = commandText(data.tool_input ?? data.toolArgs);
  const hasError = [data.error, data.errorMessage].some(
    (value) => value !== undefined && value !== null && value !== false && value !== "",
  );
  return (
    /(?:bash|shell|exec|command)/i.test(toolName) &&
    /(?:^|[;&|]\s*|\s)git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+commit(?:\s|$)/i.test(
      command,
    ) &&
    !hasError
  );
}

async function main() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let data: Record<string, unknown> = {};
  if (input.trim()) {
    try {
      data = JSON.parse(input);
    } catch {
      // Direct invocation from .git/hooks/post-commit may pass no stdin.
    }
  }

  if (!data || typeof data !== "object") data = {};
  if (isSdkChildContext(data)) return;

  const directGitHook =
    !input.trim() ||
    process.env["AGENTMEMORY_GIT_HOOK"] === "1" ||
    Boolean(process.env["AGENTMEMORY_COMMIT_SHA"]);
  const successfulCommitTool = isSuccessfulCommitToolEvent(data);
  if (!directGitHook && !successfulCommitTool) return;

  const cwd =
    (data.cwd as string) ||
    process.env["AGENTMEMORY_CWD"] ||
    process.cwd();
  const sessionId =
    ((data.session_id || data.sessionId) as string) ||
    process.env["AGENTMEMORY_SESSION_ID"] ||
    undefined;
  const project = resolveProject(cwd);

  const sha =
    process.env["AGENTMEMORY_COMMIT_SHA"] ||
    (await git(["rev-parse", "HEAD"], cwd));
  if (!sha) return;

  const body = await collectCommitLinkage(cwd, sha, sessionId, project);

  await deliverProjectRequest(
    "/agentmemory/session/commit",
    project,
    body,
    { attempts: 2, timeoutMs: TIMEOUT_MS },
  );
}

const invokedPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    reportHookDeliveryFailure("commit linkage", error);
    process.exitCode = 1;
  });
}
