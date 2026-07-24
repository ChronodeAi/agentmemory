import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";
import type {
  AgentmemoryProjectConfig,
  CaptureProfile,
} from "../project-config.js";

const METADATA_ONLY_TOOLS =
  /(?:^|[_-])(read|view|open|search|grep|glob|find|list|status|inspect|query)(?:$|[_-])/i;
const HIGH_VALUE_TOOLS =
  /(?:edit|write|create|patch|apply|test|spec|migrat|commit|task|decision|deploy|build)/i;

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

function globToRegExp(glob: string): RegExp {
  let pattern = "";
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    const next = glob[i + 1];
    if (char === "*" && next === "*") {
      if (glob[i + 2] === "/") {
        pattern += "(?:.*/)?";
        i += 2;
      } else {
        pattern += ".*";
        i++;
      }
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`, "i");
}

function normalizedProjectPath(path: string, root: string): string {
  const absolute = path.startsWith("/") ? path : resolve(root, path);
  return relative(root, absolute).replace(/\\/g, "/").replace(/^\.\//, "");
}

function isExcludedPath(
  path: string,
  config: AgentmemoryProjectConfig,
): boolean {
  const normalized = normalizedProjectPath(path, config.root);
  return config.exclude_globs.some((glob) => globToRegExp(glob).test(normalized));
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
}

export function captureToolEvent(
  toolName: unknown,
  toolInput: unknown,
  toolOutput: unknown,
  config: AgentmemoryProjectConfig,
  failed = false,
): CapturedToolEvent | null {
  const name = typeof toolName === "string" ? toolName : "unknown";
  const paths = collectPaths(toolInput);
  if (paths.length > 0 && paths.every((path) => isExcludedPath(path, config))) {
    return null;
  }

  const profile: CaptureProfile = config.capture_profile;
  const highValue = failed || HIGH_VALUE_TOOLS.test(name);
  if (profile === "minimal" && !highValue) return null;

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
  };
}
