import { TriggerAction, type ISdk } from "iii-sdk";
import type {
  CompressedObservation,
  FactLedgerEntry,
  RawObservation,
  HookPayload,
  Session,
} from "../types.js";

// Hook events that carry tool traffic cross the tool trust boundary;
// prompt_submit is the user; everything else (lifecycle, subagent) is
// agent-channel activity.
const TOOL_HOOKS = new Set([
  "pre_tool_use",
  "post_tool_use",
  "post_tool_failure",
]);
import { KV, STREAM, generateId } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { stripPrivateData } from "./privacy.js";
import { DedupMap } from "./dedup.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import { isAutoCompressEnabled } from "../config.js";
import {
  buildSyntheticCompression,
  parseWorktreeProvenance,
} from "./compress-synthetic.js";
import { isRetrievalGeneratedObservation } from "./retrieval-evidence.js";
import {
  getSearchIndex,
  scheduleIndexSave,
  vectorIndexAddGuarded,
  vectorIndexRemove,
} from "./search.js";
import { getAgentId } from "../config.js";
import { logger } from "../logger.js";
import { saveImageToDisk } from "../utils/image-store.js";
import { withProcessLock } from "../state/process-lock.js";

const CAPTURE_CONCURRENCY_LIMIT = 256;
const captureAdmission = {
  active: 0,
  accepted: 0,
  completed: 0,
  failed: 0,
  rejected: 0,
  scopeDenied: 0,
  failureReasons: {} as Record<string, number>,
  rejectionReasons: {} as Record<string, number>,
  scopeDenialReasons: {} as Record<string, number>,
  lastCompletionAt: undefined as string | undefined,
  lastFailureAt: undefined as string | undefined,
  lastRejectionAt: undefined as string | undefined,
  lastScopeDenialAt: undefined as string | undefined,
};

function incrementCaptureReason(
  reasons: Record<string, number>,
  reason: string,
): void {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

function resultFailureReason(result: unknown): string {
  const error =
    result && typeof result === "object" && "error" in result
      ? String((result as { error?: unknown }).error ?? "")
      : "";
  if (error === "compaction_summary_failed") return "compaction_summary_failed";
  if (error.includes("observation limit reached")) return "session_observation_limit";
  return "operation_failed";
}

function resultScopeDenialReason(result: unknown): string | undefined {
  const error =
    result && typeof result === "object" && "error" in result
      ? String((result as { error?: unknown }).error ?? "")
      : "";
  if (error === "project_scope_required") return "project_scope_missing";
  if (error === "session_context_requires_cwd") return "session_context_missing";
  return error.includes("session project") ? "project_scope_mismatch" : undefined;
}

function exceptionFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|invocation stopped/i.test(message)) {
    return "state_or_worker_timeout";
  }
  if (/connection|socket|websocket|transport|epipe/i.test(message)) {
    return "worker_transport_error";
  }
  return "exception";
}

export function getCaptureAdmissionMetrics(): {
  active: number;
  limit: number;
  accepted: number;
  completed: number;
  failed: number;
  rejected: number;
  scopeDenied: number;
  failureReasons: Record<string, number>;
  rejectionReasons: Record<string, number>;
  scopeDenialReasons: Record<string, number>;
  lastCompletionAt?: string;
  lastFailureAt?: string;
  lastRejectionAt?: string;
  lastScopeDenialAt?: string;
} {
  return {
    active: captureAdmission.active,
    limit: CAPTURE_CONCURRENCY_LIMIT,
    accepted: captureAdmission.accepted,
    completed: captureAdmission.completed,
    failed: captureAdmission.failed,
    rejected: captureAdmission.rejected,
    scopeDenied: captureAdmission.scopeDenied,
    failureReasons: { ...captureAdmission.failureReasons },
    rejectionReasons: { ...captureAdmission.rejectionReasons },
    scopeDenialReasons: { ...captureAdmission.scopeDenialReasons },
    ...(captureAdmission.lastCompletionAt
      ? { lastCompletionAt: captureAdmission.lastCompletionAt }
      : {}),
    ...(captureAdmission.lastFailureAt
      ? { lastFailureAt: captureAdmission.lastFailureAt }
      : {}),
    ...(captureAdmission.lastRejectionAt
      ? { lastRejectionAt: captureAdmission.lastRejectionAt }
      : {}),
    ...(captureAdmission.lastScopeDenialAt
      ? { lastScopeDenialAt: captureAdmission.lastScopeDenialAt }
      : {}),
  };
}

export function extractImage(d: unknown): string | undefined {
  if (!d) return undefined;
  if (typeof d === "string") {
    if (d.startsWith("data:image/") || d.startsWith("iVBORw0KGgo") || d.startsWith("/9j/")) {
      return d;
    }
    return undefined;
  }
  if (typeof d === "object" && d !== null) {
    const obj = d as Record<string, unknown>;
    if (typeof obj["image_data"] === "string") return obj["image_data"];
    if (typeof obj["image_path"] === "string") return obj["image_path"];
    if (typeof obj["imageBase64"] === "string") return obj["imageBase64"];
    if (typeof obj["imagePath"] === "string") return obj["imagePath"];

    for (const key of Object.keys(obj)) {
      const match = extractImage(obj[key]);
      if (match) return match;
    }
  }
  return undefined;
}

export async function ensureObservationSession(
  kv: StateKV,
  input: {
    sessionId: string;
    project: string;
    cwd: string;
    timestamp: string;
    agentId?: string;
    privacy?: "standard" | "private" | "strict";
    captureProfile?: "minimal" | "balanced" | "full";
    externalProcessing?: boolean;
    firstPrompt?: string;
  },
): Promise<
  | { success: true; session: Session; created: boolean }
  | { success: false; error: string }
> {
  return withProcessLock(`observation-session:${input.sessionId}`, async () => {
    const existing = await kv.get<Session>(KV.sessions, input.sessionId);
    if (existing) {
      return existing.project === input.project
        ? { success: true, session: existing, created: false }
        : {
            success: false,
            error: "session project does not match observation",
          };
    }
    const now = new Date().toISOString();
    const session: Session = {
      id: input.sessionId,
      project: input.project,
      cwd: input.cwd,
      startedAt: input.timestamp || now,
      updatedAt: now,
      status: "active",
      observationCount: 0,
      retainedObservationCount: 0,
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(input.privacy ? { privacy: input.privacy } : {}),
      ...(input.captureProfile
        ? { captureProfile: input.captureProfile }
        : {}),
      ...(input.externalProcessing !== undefined
        ? { externalProcessing: input.externalProcessing }
        : {}),
      ...(input.firstPrompt ? { firstPrompt: input.firstPrompt } : {}),
    };
    await kv.set(KV.sessions, input.sessionId, session);
    const persisted = await kv.get<Session>(KV.sessions, input.sessionId);
    if (!persisted || persisted.project !== input.project) {
      return {
        success: false,
        error: "session project ownership could not be established",
      };
    }
    return { success: true, session: persisted, created: true };
  });
}

export function registerObserveFunction(
  sdk: ISdk,
  kv: StateKV,
  dedupMap?: DedupMap,
  maxObservationsPerSession?: number,
): void {
  sdk.registerFunction("mem::observe", 
    async (payload: HookPayload) => {

      if (
        !payload?.sessionId ||
        typeof payload.sessionId !== "string" ||
        !payload.hookType ||
        typeof payload.hookType !== "string" ||
        !payload.timestamp ||
        typeof payload.timestamp !== "string"
      ) {
        captureAdmission.failed += 1;
        captureAdmission.lastFailureAt = new Date().toISOString();
        incrementCaptureReason(captureAdmission.failureReasons, "invalid_payload");
        return {
          success: false,
          error:
            "Invalid payload: sessionId, hookType, and timestamp are required",
        };
      }

      const project =
        typeof payload.project === "string" ? payload.project.trim() : "";
      if (!project) {
        captureAdmission.scopeDenied += 1;
        captureAdmission.lastScopeDenialAt = new Date().toISOString();
        incrementCaptureReason(
          captureAdmission.scopeDenialReasons,
          "project_scope_missing",
        );
        return { success: false, error: "project_scope_required" };
      }
      payload = { ...payload, project };

      const obsId = generateId("obs");

      let dedupHash: string | undefined;

      let sanitizedRaw: unknown = payload.data;
      try {
        const jsonStr = JSON.stringify(payload.data);
        const sanitized = stripPrivateData(jsonStr);
        sanitizedRaw = JSON.parse(sanitized);
      } catch {
        sanitizedRaw = stripPrivateData(String(payload.data));
      }

      const raw: RawObservation = {
        id: obsId,
        sessionId: payload.sessionId,
        timestamp: payload.timestamp,
        hookType: payload.hookType,
        raw: sanitizedRaw,
        origin: {
          channel: TOOL_HOOKS.has(payload.hookType)
            ? "tool"
            : payload.hookType === "prompt_submit"
              ? "user"
              : "agent",
          capturedAt: payload.timestamp,
        },
      };

      let extractedImage: string | undefined;

      if (typeof sanitizedRaw === "object" && sanitizedRaw !== null) {
        const d = sanitizedRaw as Record<string, unknown>;
        if (
          payload.hookType === "post_tool_use" ||
          payload.hookType === "post_tool_failure"
        ) {
          raw.toolName = d["tool_name"] as string | undefined;
          raw.toolInput = d["tool_input"];
          raw.toolOutput = d["tool_output"] || d["error"];
          if (raw.origin && raw.toolName) raw.origin.detail = raw.toolName;
        }
        if (payload.hookType === "post_tool_use") {
          const provenance = parseWorktreeProvenance(d["provenance"]);
          if (provenance?.project === project) raw.provenance = provenance;
        }
        if (payload.hookType === "prompt_submit") {
          raw.userPrompt = d["prompt"] as string | undefined;
        }

        extractedImage = extractImage(sanitizedRaw);
        if (extractedImage) {
          raw.modality = (raw.toolInput || raw.toolOutput || raw.userPrompt) ? "mixed" : "image";
        }
      } else if (typeof sanitizedRaw === "string") {
        extractedImage = extractImage(sanitizedRaw);
        if (extractedImage) {
          raw.modality = "image";
        }
      }

      const pendingImageData = extractedImage;

      if (captureAdmission.active >= CAPTURE_CONCURRENCY_LIMIT) {
        captureAdmission.rejected += 1;
        captureAdmission.lastRejectionAt = new Date().toISOString();
        incrementCaptureReason(
          captureAdmission.rejectionReasons,
          "capture_capacity_exceeded",
        );
        return {
          success: false,
          retryable: true,
          error: "capture_capacity_exceeded",
        };
      }
      captureAdmission.active += 1;
      captureAdmission.accepted += 1;
      try {
        const result = await withKeyedLock(`obs:${payload.sessionId}`, async () => {
        const currentSession = await kv.get<Session>(KV.sessions, payload.sessionId);
        if (
          !currentSession &&
          (typeof payload.cwd !== "string" || payload.cwd.trim().length === 0)
        ) {
          return { success: false, error: "session_context_requires_cwd" };
        }
        const inheritedAgentId = currentSession
          ? currentSession.agentId
          : getAgentId();
        const firstPrompt =
          typeof raw.userPrompt === "string"
            ? raw.userPrompt.replace(/\s+/g, " ").trim().slice(0, 200)
            : undefined;
        const sessionClaim = await ensureObservationSession(kv, {
          sessionId: payload.sessionId,
          project: payload.project!,
          cwd: currentSession?.cwd ?? payload.cwd!.trim(),
          timestamp: payload.timestamp,
          ...(inheritedAgentId ? { agentId: inheritedAgentId } : {}),
          ...(payload.privacy ? { privacy: payload.privacy } : {}),
          ...(payload.captureProfile
            ? { captureProfile: payload.captureProfile }
            : {}),
          ...(payload.externalProcessing !== undefined
            ? { externalProcessing: payload.externalProcessing }
            : {}),
          ...(firstPrompt ? { firstPrompt } : {}),
        });
        if (!sessionClaim.success) return sessionClaim;
        const existingSession = sessionClaim.session;
        if (dedupMap) {
          const d =
            typeof payload.data === "object" && payload.data !== null
              ? (payload.data as Record<string, unknown>)
              : {};
          const toolName = (d["tool_name"] as string) || payload.hookType;
          dedupHash = dedupMap.computeHash(
            payload.sessionId,
            toolName,
            d["tool_input"],
            d["tool_output"] ?? d["error"],
          );
          if (dedupMap.isDuplicate(dedupHash)) {
            return {
              success: true,
              deduplicated: true,
              sessionId: payload.sessionId,
            };
          }
        }
        let retainedObservationCount =
          (existingSession.retainedObservationCount ??
            existingSession.observationCount ??
            0) + 1;
        if (maxObservationsPerSession && maxObservationsPerSession > 0) {
          let existing = await kv.list<CompressedObservation>(
            KV.observations(payload.sessionId),
          );
          if (
            maxObservationsPerSession >= 100 &&
            existing.length >= maxObservationsPerSession - 1
          ) {
            let summaryResult: unknown;
            try {
              summaryResult = await sdk.trigger({
                function_id: "mem::summarize",
                payload: {
                  sessionId: payload.sessionId,
                  project: payload.project,
                },
              });
            } catch (error) {
              logger.warn("Rolling compaction summary failed", {
                sessionId: payload.sessionId,
                project: payload.project,
                error: error instanceof Error ? error.message : String(error),
              });
              return {
                success: false,
                retryable: true,
                error: "compaction_summary_failed",
              };
            }
            if (
              !summaryResult ||
              typeof summaryResult !== "object" ||
              (summaryResult as { success?: unknown }).success !== true
            ) {
              logger.warn("Rolling compaction summary was not accepted", {
                sessionId: payload.sessionId,
                project: payload.project,
                result: summaryResult,
              });
              return {
                success: false,
                retryable: true,
                error: "compaction_summary_failed",
              };
            }
            const compactCount = Math.max(
              1,
              Math.floor(maxObservationsPerSession / 5),
            );
            const oldest = existing
              .slice()
              .sort((a, b) =>
                (a.timestamp ?? "").localeCompare(b.timestamp ?? ""),
              )
              .slice(0, compactCount);
            const compactedAt = new Date().toISOString();
            for (const observation of oldest) {
              const ledger: FactLedgerEntry = {
                observationId: observation.id,
                sessionId: payload.sessionId,
                timestamp: observation.timestamp,
                type: observation.type,
                title: observation.title,
                facts: Array.isArray(observation.facts)
                  ? observation.facts
                  : [],
                files: Array.isArray(observation.files)
                  ? observation.files
                  : [],
                ...(observation.provenance
                  ? { provenance: observation.provenance }
                  : {}),
                compactedAt,
              };
              await kv.set(
                KV.factLedger(payload.sessionId),
                observation.id,
                ledger,
              );
              await kv.delete(
                KV.observations(payload.sessionId),
                observation.id,
              );
              getSearchIndex().remove(observation.id);
              vectorIndexRemove(observation.id);
            }
            scheduleIndexSave();
            existing = existing.filter(
              (observation) =>
                !oldest.some((archived) => archived.id === observation.id),
            );
            logger.info("Session observations compacted", {
              sessionId: payload.sessionId,
              archived: oldest.length,
              remaining: existing.length,
            });
          }
          if (existing.length >= maxObservationsPerSession) {
            return {
              success: false,
              error: `Session observation limit reached (${maxObservationsPerSession})`,
            };
          }
          retainedObservationCount = existing.length + 1;
        }

        // Existing session is the source of truth for agentId (even
        // undefined). Env AGENT_ID only fires when no session row
        // exists yet — otherwise an unscoped session would get
        // retroactively scoped by a later AGENT_ID export.
        // The cross-process session claim above is the source of truth for
        // agent and project ownership before any observation is persisted.
        if (inheritedAgentId) {
          raw.agentId = inheritedAgentId;
        }

        if (pendingImageData && (pendingImageData.startsWith("data:image/") || pendingImageData.startsWith("iVBORw0KGgo") || pendingImageData.startsWith("/9j/"))) {
          const { filePath, bytesWritten } = await saveImageToDisk(pendingImageData);
          raw.imageData = filePath;
          const { incrementImageRef } = await import("./image-refs.js");
          await incrementImageRef(kv, filePath);
          sdk.trigger({
            function_id: "mem::disk-size-delta",
            payload: { deltaBytes: bytesWritten },
            action: TriggerAction.Void(),
          });
          if (process.env["AGENTMEMORY_IMAGE_EMBEDDINGS"] === "true") {
            sdk.trigger({
              function_id: "mem::vision-embed",
              payload: {
                imageRef: filePath,
                project: payload.project,
                sessionId: payload.sessionId,
                observationId: obsId,
              },
              action: TriggerAction.Void(),
            });
          }
        }

        try {

          await kv.set(KV.observations(payload.sessionId), obsId, raw);

        } catch (error) {
          if (raw.imageData) {
            // Roll back the ref taken above. decrementImageRef deletes the file
            // only when no other observation still references it (deduped images
            // survive) and emits the disk-size delta itself — deleting the file
            // directly here would orphan shared images and leave a stale ref.
            // If the rollback itself fails, log it but still surface the
            // original write error (the more useful failure to diagnose).
            try {
              const { decrementImageRef } = await import("./image-refs.js");
              await decrementImageRef(kv, sdk, raw.imageData);
            } catch (rollbackError) {
              logger.error("Failed to roll back image ref after observation write failure", {
                imageRef: raw.imageData,
                error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
              });
            }
          }
          throw error;
        }

        if (dedupMap && dedupHash) {
          dedupMap.record(dedupHash);
        }

        await sdk.trigger({
          function_id: "stream::set",
          payload: {
          stream_name: STREAM.name,
          group_id: STREAM.group(payload.sessionId),
          item_id: obsId,
          data: { type: "raw", observation: raw },
          },
        });

        await sdk.trigger({
          function_id: "stream::send",
          payload: {
            stream_name: STREAM.name,
            group_id: STREAM.viewerGroup,
            id: `raw-${obsId}`,
            type: "raw_observation",
            data: { type: "raw", observation: raw, sessionId: payload.sessionId },
          },
          action: TriggerAction.Void(),
        });

        const session = existingSession;
        {
          const updates: Array<{ type: "set"; path: string; value: unknown }> = [
            { type: "set", path: "updatedAt", value: new Date().toISOString() },
            {
              type: "set",
              path: "observationCount",
              value: (session.observationCount || 0) + 1,
            },
            {
              type: "set",
              path: "retainedObservationCount",
              value: retainedObservationCount,
            },
          ];
          if (!session.firstPrompt && typeof raw.userPrompt === "string") {
            const trimmed = raw.userPrompt.replace(/\s+/g, " ").trim();
            if (trimmed.length > 0) {
              updates.push({
                type: "set",
                path: "firstPrompt",
                value: trimmed.slice(0, 200),
              });
            }
          }
          if (
            payload.hookType === "subagent_start" &&
            sanitizedRaw &&
            typeof sanitizedRaw === "object"
          ) {
            const agentId = (
              sanitizedRaw as Record<string, unknown>
            )["agent_id"];
            if (typeof agentId === "string" && agentId.trim()) {
              updates.push({
                type: "set",
                path: "childAgentIds",
                value: Array.from(
                  new Set([
                    ...((session as { childAgentIds?: string[] })
                      .childAgentIds ?? []),
                    agentId.trim(),
                  ]),
                ),
              });
            }
          }
          await kv.update(KV.sessions, payload.sessionId, updates);
        }

        // Per-observation LLM compression is opt-in as of 0.8.8.
        // Default path: build a zero-LLM synthetic compression so recall
        // and BM25 search still work without burning the user's Claude
        // token allocation on every tool invocation.
        const shouldAutoCompress =
          isAutoCompressEnabled() &&
          existingSession?.externalProcessing !== false &&
          existingSession?.privacy !== "strict" &&
          payload.externalProcessing !== false &&
          payload.privacy !== "strict";

        if (shouldAutoCompress) {
          await sdk.trigger({
            function_id: "mem::compress",
            payload: {
              observationId: obsId,
              sessionId: payload.sessionId,
              raw,
            },
            action: TriggerAction.Void(),
          });
        } else {
          const synthetic = buildSyntheticCompression(raw);
          synthetic.recalledOnly = isRetrievalGeneratedObservation(synthetic);
          await kv.set(
            KV.observations(payload.sessionId),
            obsId,
            synthetic,
          );
          if (!synthetic.recalledOnly) {
            getSearchIndex().add(synthetic);
            await vectorIndexAddGuarded(
              synthetic.id,
              synthetic.sessionId,
              synthetic.title + " " + (synthetic.narrative || ""),
              { kind: "synthetic", logId: synthetic.id },
              {
                externalProcessing:
                  existingSession?.externalProcessing !== false &&
                  existingSession?.privacy !== "strict" &&
                  payload.externalProcessing !== false &&
                  payload.privacy !== "strict",
              },
            );
            scheduleIndexSave();
          }
          await sdk.trigger({
            function_id: "stream::set",
            payload: {
              stream_name: STREAM.name,
              group_id: STREAM.group(payload.sessionId),
              item_id: obsId,
              data: { type: "compressed", observation: synthetic },
            },
          });
          await sdk.trigger({
            function_id: "stream::set",
            payload: {
              stream_name: STREAM.name,
              group_id: STREAM.viewerGroup,
              item_id: obsId,
              data: {
                type: "compressed",
                observation: synthetic,
                sessionId: payload.sessionId,
              },
            },
          });
        }

        logger.info("Observation captured", {
          obsId,
          sessionId: payload.sessionId,
          hook: payload.hookType,
          compress: shouldAutoCompress ? "llm" : "synthetic",
        });
        return { success: true, observationId: obsId };
        });
        if (
          result &&
          typeof result === "object" &&
          "success" in result &&
          result.success === false
        ) {
          const scopeDenialReason = resultScopeDenialReason(result);
          if (scopeDenialReason) {
            captureAdmission.scopeDenied += 1;
            captureAdmission.lastScopeDenialAt = new Date().toISOString();
            incrementCaptureReason(
              captureAdmission.scopeDenialReasons,
              scopeDenialReason,
            );
          } else {
            captureAdmission.failed += 1;
            captureAdmission.lastFailureAt = new Date().toISOString();
            incrementCaptureReason(
              captureAdmission.failureReasons,
              resultFailureReason(result),
            );
          }
        } else {
          captureAdmission.completed += 1;
          captureAdmission.lastCompletionAt = new Date().toISOString();
        }
        return result;
      } catch (error) {
        captureAdmission.failed += 1;
        captureAdmission.lastFailureAt = new Date().toISOString();
        incrementCaptureReason(
          captureAdmission.failureReasons,
          exceptionFailureReason(error),
        );
        throw error;
      } finally {
        captureAdmission.active -= 1;
      }
    },
  );
}
