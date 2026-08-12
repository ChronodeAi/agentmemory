import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import type {
  AgentmemoryProjectConfig,
  CaptureProfile,
} from "../project-config.js";
import type {
  CommitTransition,
  FileOperation,
  FileTransition,
  WorktreeProvenance,
} from "../types.js";
import {
  isProjectPathExcluded,
  normalizedProjectPath,
} from "../project-config.js";

const METADATA_ONLY_TOOLS =
  /(?:^|[_-])(read|view|open|search|grep|glob|find|list|status|inspect|query)(?:$|[_-])/i;
const HIGH_VALUE_TOOLS =
  /(?:edit|write|create|patch|apply|test|spec|migrat|commit|task|decision|deploy|build)/i;
const MUTATION_TOOLS =
  /(?:edit|write|create|patch|apply|delete|remove|unlink)/i;

function serialize(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value ?? "");
  } catch {
    return String(value);
  }
}

function truncate(value: unknown, max: number): unknown {
  const serialized = serialize(value);
  if (serialized.length <= max) return value;
  return `${serialized.slice(0, max)}\n[...truncated]`;
}

function collectPaths(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPaths(item, depth + 1));
  }
  if (typeof value !== "object") return [];
  const result: string[] = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof item === "string" &&
      /(?:^|_)(?:file|path|cwd|directory|dir)(?:$|_)/i.test(key)
    ) {
      result.push(item);
    } else if (typeof item === "object") {
      result.push(...collectPaths(item, depth + 1));
    }
  }
  return result;
}

function collectPotentialPathReferences(value: unknown, depth = 0): string[] {
  if (depth > 4 || value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPotentialPathReferences(item, depth + 1));
  }
  if (typeof value === "string") {
    return value
      .split(/[\s"'`=()[\]{}:,;|<>]+/)
      .map((token) => token.trim())
      .filter(
        (token) =>
          token.length > 0 &&
          (token.includes("/") ||
            token.startsWith(".env") ||
            /secret|credential/i.test(token)),
      );
  }
  if (typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap((item) =>
    collectPotentialPathReferences(item, depth + 1),
  );
}

function git(cwd: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      timeout: 1000,
      maxBuffer: 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

export function credentialFreeWorktreeId(
  project: string,
  worktreeRoot: string,
): string {
  const digest = createHash("sha256")
    .update(project)
    .update("\0")
    .update(resolve(worktreeRoot))
    .digest("hex");
  return `wt_${digest.slice(0, 32)}`;
}

function mutationOperation(toolName: string): FileOperation | null {
  if (/(?:delete|remove|unlink)/i.test(toolName)) return "delete";
  if (/(?:write|create)/i.test(toolName)) return "write";
  if (/(?:edit|patch|apply)/i.test(toolName)) return "edit";
  return null;
}

function patchTransitions(input: string): Array<{
  path: string;
  operation: FileOperation;
}> {
  const transitions: Array<{ path: string; operation: FileOperation }> = [];
  const marker =
    /^\*\*\* (Add|Update|Delete) File: (.+)$/gm;
  for (const match of input.matchAll(marker)) {
    const action = match[1];
    const path = match[2]?.trim();
    if (!path) continue;
    transitions.push({
      path,
      operation:
        action === "Add" ? "write" : action === "Delete" ? "delete" : "edit",
    });
  }
  return transitions;
}

function collectMutationPaths(
  value: unknown,
  operation: FileOperation,
  depth = 0,
): Array<{ path: string; operation: FileOperation }> {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === "string") return patchTransitions(value);
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      collectMutationPaths(item, operation, depth + 1),
    );
  }
  if (typeof value !== "object") return [];

  const transitions: Array<{ path: string; operation: FileOperation }> = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof item === "string" &&
      /(?:^|_)(?:file|path)(?:$|_)/i.test(key)
    ) {
      transitions.push({ path: item, operation });
    } else if (typeof item === "object") {
      transitions.push(
        ...collectMutationPaths(item, operation, depth + 1),
      );
    }
  }
  return transitions;
}

function captureWorktreeProvenance(
  toolName: string,
  toolInput: unknown,
  config: AgentmemoryProjectConfig,
): WorktreeProvenance | undefined {
  const operation = mutationOperation(toolName);
  if (!operation) return undefined;

  const worktreeRoot = git(config.root, ["rev-parse", "--show-toplevel"]);
  const baseHeadSha = git(config.root, ["rev-parse", "HEAD"]);
  if (!worktreeRoot || !baseHeadSha) return undefined;
  const worktreePrefix = git(config.root, ["rev-parse", "--show-prefix"]) || "";

  const seen = new Set<string>();
  const transitions: FileTransition[] = [];
  for (const candidate of collectMutationPaths(toolInput, operation)) {
    const configRelativePath = normalizedProjectPath(candidate.path, config.root);
    const path = `${worktreePrefix}${configRelativePath}`;
    if (
      !path ||
      path === ".." ||
      path.startsWith("../") ||
      isProjectPathExcluded(candidate.path, config)
    ) {
      continue;
    }
    const key = `${candidate.operation}\0${path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const digest =
      candidate.operation === "delete"
        ? git(worktreeRoot, ["rev-parse", `HEAD:${path}`])
        : git(worktreeRoot, ["hash-object", "--", path]);
    if (!digest) continue;
    transitions.push({
      path,
      operation: candidate.operation,
      digest,
      digestKind: "git-blob",
    });
  }
  if (transitions.length === 0) return undefined;

  const status = git(worktreeRoot, [
    "status",
    "--porcelain",
    "--untracked-files=normal",
  ]);
  return {
    project: config.project_id,
    worktreeId: credentialFreeWorktreeId(config.project_id, worktreeRoot),
    baseHeadSha,
    dirty: Boolean(status),
    transitions,
  };
}

export function parseCommitTransitions(status: string): CommitTransition[] {
  const transitions: CommitTransition[] = [];
  for (const line of status.split("\n")) {
    if (!line) continue;
    const [rawStatus, firstPath, secondPath] = line.split("\t");
    if (!rawStatus || !firstPath) continue;
    const code = rawStatus[0];
    if ((code === "R" || code === "C") && secondPath) {
      transitions.push({
        operation: code === "R" ? "rename" : "copy",
        previousPath: firstPath,
        path: secondPath,
      });
      continue;
    }
    const operation: FileOperation =
      code === "A" ? "write" : code === "D" ? "delete" : "edit";
    transitions.push({ operation, path: firstPath });
  }
  return transitions;
}

function metadataInput(input: unknown): Record<string, unknown> {
  const raw =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const kept: Record<string, unknown> = {};
  for (const key of [
    "file_path",
    "path",
    "file",
    "pattern",
    "query",
    "cmd",
    "command",
    "workdir",
    "cwd",
  ]) {
    if (raw[key] !== undefined) kept[key] = truncate(raw[key], 500);
  }
  return kept;
}

function outputMetadata(output: unknown): Record<string, unknown> {
  const serialized = serialize(output);
  return {
    capture: "metadata-only",
    output_chars: serialized.length,
    output_sha256: createHash("sha256").update(serialized).digest("hex"),
  };
}

export interface CapturedToolEvent {
  toolInput: unknown;
  toolOutput: unknown;
  capture: "full" | "metadata-only";
  provenance?: WorktreeProvenance;
}

export function captureToolEvent(
  toolName: unknown,
  toolInput: unknown,
  toolOutput: unknown,
  config: AgentmemoryProjectConfig,
  failed = false,
): CapturedToolEvent | null {
  const name = typeof toolName === "string" ? toolName : "unknown";
  const paths = [
    ...collectPaths(toolInput),
    ...collectPotentialPathReferences(toolInput),
  ];
  if (paths.some((path) => isProjectPathExcluded(path, config))) {
    return null;
  }

  const profile: CaptureProfile = config.capture_profile;
  const highValue = failed || HIGH_VALUE_TOOLS.test(name);
  if (profile === "minimal" && !highValue) return null;

  const provenance =
    !failed && MUTATION_TOOLS.test(name)
      ? captureWorktreeProvenance(name, toolInput, config)
      : undefined;

  const metadataOnly =
    profile === "balanced" && !highValue && METADATA_ONLY_TOOLS.test(name);
  if (metadataOnly) {
    return {
      toolInput: metadataInput(toolInput),
      toolOutput: outputMetadata(toolOutput),
      capture: "metadata-only",
    };
  }

  return {
    toolInput: truncate(toolInput, highValue ? 8000 : 1000),
    toolOutput: truncate(toolOutput, highValue ? 8000 : 1000),
    capture: "full",
    ...(provenance ? { provenance } : {}),
  };
}
