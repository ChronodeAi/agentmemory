import { TriggerAction, type ISdk } from "iii-sdk";
import type {
  CompressedObservation,
  FactLedgerEntry,
  RawObservation,
  HookPayload,
  Session,
} from "../types.js";
import { KV, STREAM, generateId } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { stripPrivateData } from "./privacy.js";
import { DedupMap } from "./dedup.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import { isAutoCompressEnabled } from "../config.js";
import { buildSyntheticCompression } from "./compress-synthetic.js";
import { getSearchIndex, vectorIndexAddGuarded } from "./search.js";
import { getAgentId } from "../config.js";
import { logger } from "../logger.js";
import { saveImageToDisk } from "../utils/image-store.js";

const CAPTURE_CONCURRENCY_LIMIT = 256;
const captureAdmission = {
  active: 0,
  accepted: 0,
  completed: 0,
  failed: 0,
  rejected: 0,
};

export function getCaptureAdmissionMetrics(): {
  active: number;
  limit: number;
  accepted: number;
  completed: number;
  failed: number;
  rejected: number;
} {
  return {
    active: captureAdmission.active,
    limit: CAPTURE_CONCURRENCY_LIMIT,
    accepted: captureAdmission.accepted,
    completed: captureAdmission.completed,
    failed: captureAdmission.failed,
    rejected: captureAdmission.rejected,
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
        return {
          success: false,
          error:
            "Invalid payload: sessionId, hookType, and timestamp are required",
        };
      }

      const obsId = generateId("obs");

      let dedupHash: string | undefined;
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
        const existingSession = await kv.get<Session>(
          KV.sessions,
          payload.sessionId,
        );
        if (
          existingSession &&
          (existingSession.project !== payload.project ||
            existingSession.cwd !== payload.cwd)
        ) {
          return {
            success: false,
            error: "session project or cwd does not match observation",
          };
        }
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
            }
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
        }

        // Existing session is the source of truth for agentId (even
        // undefined). Env AGENT_ID only fires when no session row
        // exists yet — otherwise an unscoped session would get
        // retroactively scoped by a later AGENT_ID export.
        const inheritedAgentId = existingSession
          ? existingSession.agentId
          : getAgentId();
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
        if (session) {
          const updates: Array<{ type: "set"; path: string; value: unknown }> = [
            { type: "set", path: "updatedAt", value: new Date().toISOString() },
            {
              type: "set",
              path: "observationCount",
              value: (session.observationCount || 0) + 1,
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
        } else if (
          typeof payload.project === "string" &&
          payload.project.trim().length > 0 &&
          typeof payload.cwd === "string" &&
          payload.cwd.trim().length > 0
        ) {
          // OpenCode (and any plugin that skips POST /session/start)
          // can fire observations before the session record exists. Without
          // an implicit create, those observations stack up but
          // `memory_sessions` never lists them, and summarize bails with
          // "Session not found for summarize". Create the session now from
          // the observation payload — but only when project + cwd are
          // present (HookPayload contract). Older test payloads without
          // those fields keep their original no-op behaviour.
          const trimmedPrompt =
            typeof raw.userPrompt === "string"
              ? raw.userPrompt.replace(/\s+/g, " ").trim().slice(0, 200)
              : undefined;
          const ts = new Date().toISOString();
          await kv.set(KV.sessions, payload.sessionId, {
            id: payload.sessionId,
            project: payload.project,
            cwd: payload.cwd,
            startedAt: payload.timestamp ?? ts,
            updatedAt: ts,
            status: "active",
            observationCount: 1,
            ...(inheritedAgentId ? { agentId: inheritedAgentId } : {}),
            ...(payload.privacy ? { privacy: payload.privacy } : {}),
            ...(payload.captureProfile
              ? { captureProfile: payload.captureProfile }
              : {}),
            ...(payload.externalProcessing !== undefined
              ? { externalProcessing: payload.externalProcessing }
              : {}),
            ...(trimmedPrompt && trimmedPrompt.length > 0
              ? { firstPrompt: trimmedPrompt }
              : {}),
          });
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
          await kv.set(
            KV.observations(payload.sessionId),
            obsId,
            synthetic,
          );
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
          captureAdmission.failed += 1;
        } else {
          captureAdmission.completed += 1;
        }
        return result;
      } catch (error) {
        captureAdmission.failed += 1;
        throw error;
      } finally {
        captureAdmission.active -= 1;
      }
    },
  );
}
