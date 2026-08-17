import type {
  RawObservation,
  CompressedObservation,
  ObservationType,
  WorktreeProvenance,
} from "../types.js";

// Zero-LLM compression path. Converts a RawObservation into a
// CompressedObservation using only heuristics — no Claude call, no token
// spend. This is the default as of 0.8.8 (#138); users who want richer
// LLM-generated summaries set AGENTMEMORY_AUTO_COMPRESS=true.

function inferType(
  toolName: string | undefined,
  hookType: string,
): ObservationType {
  if (hookType === "post_tool_failure") return "error";
  if (hookType === "prompt_submit") return "conversation";
  if (hookType === "subagent_stop" || hookType === "task_completed")
    return "subagent";
  if (hookType === "notification") return "notification";

  if (!toolName) return "other";
  // Normalize camelCase and kebab-case into word chunks so we can match
  // substrings like "WebFetch" -> "web" / "fetch".
  const n = toolName
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toLowerCase();
  const hasWord = (word: string) =>
    new RegExp(`(^|_)${word}(_|$)`).test(n) ||
    n === word ||
    n.endsWith(word) ||
    n.startsWith(word);
  if (["fetch", "http", "web"].some(hasWord)) return "web_fetch";
  if (["grep", "search", "glob", "find"].some(hasWord)) return "search";
  if (["bash", "shell", "exec", "run"].some(hasWord)) return "command_run";
  if (
    ["edit", "update", "patch", "replace", "delete", "remove", "unlink"].some(
      hasWord,
    )
  ) {
    return "file_edit";
  }
  if (["write", "create"].some(hasWord)) return "file_write";
  if (["read", "view"].some(hasWord)) return "file_read";
  if (["task", "agent"].some(hasWord)) return "subagent";
  return "other";
}

function extractFiles(input: unknown): string[] {
  if (!input || typeof input !== "object") return [];
  const o = input as Record<string, unknown>;
  const out = new Set<string>();
  for (const key of [
    "file_path",
    "filepath",
    "path",
    "filePath",
    "file",
  ]) {
    const v = o[key];
    if (typeof v === "string" && v.length > 0 && v.length < 512) out.add(v);
  }
  return [...out];
}

export function parseWorktreeProvenance(
  value: unknown,
): WorktreeProvenance | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate["project"] !== "string" ||
    !candidate["project"].trim() ||
    typeof candidate["worktreeId"] !== "string" ||
    !/^wt_[a-f0-9]{32}$/.test(candidate["worktreeId"]) ||
    typeof candidate["baseHeadSha"] !== "string" ||
    !/^[a-f0-9]{40,64}$/i.test(candidate["baseHeadSha"]) ||
    typeof candidate["dirty"] !== "boolean" ||
    !Array.isArray(candidate["transitions"])
  ) {
    return undefined;
  }
  const transitions = candidate["transitions"].flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const transition = value as Record<string, unknown>;
    const path =
      typeof transition["path"] === "string"
        ? transition["path"].trim()
        : "";
    const operation = transition["operation"];
    const digest = transition["digest"];
    if (
      !path ||
      path.length >= 512 ||
      path.startsWith("/") ||
      path === ".." ||
      path.startsWith("../") ||
      !["write", "edit", "delete"].includes(String(operation)) ||
      typeof digest !== "string" ||
      !/^[a-f0-9]{40,64}$/i.test(digest) ||
      transition["digestKind"] !== "git-blob"
    ) {
      return [];
    }
    return [
      {
        path,
        operation: operation as "write" | "edit" | "delete",
        digest,
        digestKind: "git-blob" as const,
      },
    ];
  });
  if (transitions.length === 0) return undefined;
  return {
    project: candidate["project"].trim(),
    worktreeId: candidate["worktreeId"],
    baseHeadSha: candidate["baseHeadSha"],
    dirty: candidate["dirty"],
    transitions,
  };
}

export function observationWorktreeProvenance(
  raw: RawObservation,
): WorktreeProvenance | undefined {
  if (raw.hookType !== "post_tool_use") return undefined;
  if (raw.provenance) return raw.provenance;
  if (!raw.raw || typeof raw.raw !== "object" || Array.isArray(raw.raw)) {
    return undefined;
  }
  return parseWorktreeProvenance(
    (raw.raw as Record<string, unknown>)["provenance"],
  );
}

function stringifyForNarrative(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "\u2026" : s;
}

export function buildSyntheticCompression(
  raw: RawObservation,
): CompressedObservation {
  const toolName = raw.toolName ?? raw.hookType;
  const inputStr = stringifyForNarrative(raw.toolInput);
  const outputStr = stringifyForNarrative(raw.toolOutput);
  const promptStr = raw.userPrompt ?? "";
  const provenance = observationWorktreeProvenance(raw);

  const narrativeParts = [promptStr, inputStr, outputStr].filter(
    (s) => s.length > 0,
  );

  const result: CompressedObservation = {
    id: raw.id,
    sessionId: raw.sessionId,
    timestamp: raw.timestamp,
    type: inferType(toolName, raw.hookType),
    title: truncate(toolName || "observation", 80),
    subtitle: inputStr ? truncate(inputStr, 120) : undefined,
    facts: [],
    narrative: truncate(narrativeParts.join(" | "), 400),
    concepts: [],
    files: Array.from(
      new Set([
        ...(provenance?.transitions.map((transition) => transition.path) ?? []),
        ...extractFiles(raw.toolInput),
      ]),
    ),
    importance: 5,
    confidence: 0.3,
    ...(provenance ? { provenance } : {}),
  };
  if (raw.modality) result.modality = raw.modality;
  if (raw.imageData) result.imageData = raw.imageData;
  if (raw.agentId) result.agentId = raw.agentId;
  return result;
}
