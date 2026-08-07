import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import type { HookType, RawObservation } from "../types.js";
import { generateId } from "../state/schema.js";
import { inferProjectId } from "../project-config.js";

interface JsonlEntry {
  type?: string;
  uuid?: string;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  toolUseResult?: unknown;
  [k: string]: unknown;
}

export interface ParsedTranscript {
  sessionId: string;
  project: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  observations: RawObservation[];
}

const projectByCwd = new Map<string, string>();
const MAX_PROJECT_CACHE_ENTRIES = 1024;
const MAX_SESSION_ID_LENGTH = 512;
const MAX_CWD_LENGTH = 4096;

function boundedString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return undefined;
  return trimmed;
}

function normalizeTimestamp(value: unknown): string | undefined {
  const raw = boundedString(value, 128);
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : undefined;
}

function deriveProject(cwd: string): string {
  const normalized = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const cached = projectByCwd.get(normalized);
  if (cached) return cached;
  const cwdExists = existsSync(cwd);
  let project: string;
  if (cwdExists) {
    try {
      project = inferProjectId(cwd);
    } catch {
      project = `local/${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
    }
  } else {
    project = `local/${createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
  }
  if (cwdExists) {
    if (
      !projectByCwd.has(normalized) &&
      projectByCwd.size >= MAX_PROJECT_CACHE_ENTRIES
    ) {
      const oldest = projectByCwd.keys().next().value;
      if (oldest !== undefined) projectByCwd.delete(oldest);
    }
    projectByCwd.set(normalized, project);
  }
  return project;
}

export function __resetReplayProjectCacheForTests(): void {
  projectByCwd.clear();
}

export function __replayProjectCacheSizeForTests(): number {
  return projectByCwd.size;
}

function toText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.type === "text" && typeof entry.text === "string") {
      parts.push(entry.text);
    }
  }
  return parts.join("\n");
}

function extractToolUses(content: unknown): Array<{ id: string; name: string; input: unknown }> {
  if (!Array.isArray(content)) return [];
  const out: Array<{ id: string; name: string; input: unknown }> = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.type === "tool_use") {
      out.push({
        id: typeof entry.id === "string" ? entry.id : "",
        name: typeof entry.name === "string" ? entry.name : "unknown",
        input: entry.input,
      });
    }
  }
  return out;
}

function extractToolResults(content: unknown): Array<{ toolUseId: string; output: unknown; isError: boolean }> {
  if (!Array.isArray(content)) return [];
  const out: Array<{ toolUseId: string; output: unknown; isError: boolean }> = [];
  for (const item of content) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.type === "tool_result") {
      out.push({
        toolUseId: typeof entry.tool_use_id === "string" ? entry.tool_use_id : "",
        output: entry.content,
        isError: entry.is_error === true,
      });
    }
  }
  return out;
}

export function parseJsonlText(text: string, fallbackSessionId?: string): ParsedTranscript {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const entries: JsonlEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") entries.push(parsed as JsonlEntry);
    } catch {
      // skip malformed lines
    }
  }

  let sessionId = "";
  let cwd = "";
  let firstTs = "";
  let lastTs = "";
  const fallbackTimestamp = new Date().toISOString();

  const observations: RawObservation[] = [];

  for (const entry of entries) {
    const entrySessionId = boundedString(
      entry.sessionId,
      MAX_SESSION_ID_LENGTH,
    );
    if (entrySessionId && !sessionId) sessionId = entrySessionId;
    const entryCwd = boundedString(entry.cwd, MAX_CWD_LENGTH);
    if (entryCwd && !cwd) cwd = entryCwd;
    const ts = normalizeTimestamp(entry.timestamp) ?? fallbackTimestamp;
    if (!firstTs) firstTs = ts;
    lastTs = ts;

    const role = entry.message?.role;
    const content = entry.message?.content;

    if (entry.type === "user" && role === "user") {
      const toolResults = extractToolResults(content);
      if (toolResults.length > 0) {
        for (const result of toolResults) {
          observations.push({
            id: generateId("obs"),
            sessionId: sessionId || "imported",
            timestamp: ts,
            hookType: (result.isError ? "post_tool_failure" : "post_tool_use") as HookType,
            toolName: undefined,
            toolInput: { toolUseId: result.toolUseId },
            toolOutput: result.output,
            raw: entry,
          });
        }
      } else {
        const text = toText(content);
        if (text.trim().length > 0) {
          observations.push({
            id: generateId("obs"),
            sessionId: sessionId || "imported",
            timestamp: ts,
            hookType: "prompt_submit" as HookType,
            userPrompt: text,
            raw: entry,
          });
        }
      }
    } else if (entry.type === "assistant" && role === "assistant") {
      const text = toText(content);
      const tools = extractToolUses(content);
      if (text.trim().length > 0) {
        observations.push({
          id: generateId("obs"),
          sessionId: sessionId || "imported",
          timestamp: ts,
          hookType: "stop" as HookType,
          assistantResponse: text,
          raw: entry,
        });
      }
      for (const tool of tools) {
        observations.push({
          id: generateId("obs"),
          sessionId: sessionId || "imported",
          timestamp: ts,
          hookType: "pre_tool_use" as HookType,
          toolName: tool.name,
          toolInput: tool.input,
          raw: { toolUseId: tool.id, entry },
        });
      }
    } else if (entry.type === "summary" || entry.type === "system") {
      // ignore meta entries
    }
  }

  const effectiveSessionId =
    sessionId ||
    boundedString(fallbackSessionId, MAX_SESSION_ID_LENGTH) ||
    generateId("sess");
  for (const obs of observations) {
    if (obs.sessionId === "imported") obs.sessionId = effectiveSessionId;
  }

  const nowIso = new Date().toISOString();
  const effectiveCwd = cwd || process.cwd();
  return {
    sessionId: effectiveSessionId,
    project: deriveProject(effectiveCwd),
    cwd: effectiveCwd,
    startedAt: firstTs || nowIso,
    endedAt: lastTs || nowIso,
    observations,
  };
}
