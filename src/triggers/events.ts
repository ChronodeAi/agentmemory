import { TriggerAction, type ISdk } from "iii-sdk";
import type { CompressedObservation, HookPayload, Session } from "../types.js";
import { KV, STREAM } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { isReflectEnabled } from "../functions/slots.js";
import {
  getAgentId,
  getEnvVar,
  isGraphExtractionEnabled,
} from "../config.js";
import { logger } from "../logger.js";
import {
  closeStaleSessions,
  startOrResumeSession,
} from "../functions/session-lifecycle.js";

export function registerEventTriggers(sdk: ISdk, kv: StateKV): void {
  sdk.registerFunction(
    "event::session::started",
    async (data: {
      sessionId: string;
      project: string;
      cwd: string;
      agentId?: string;
      parentSessionId?: string;
      privacy?: "standard" | "private" | "strict";
      captureProfile?: "minimal" | "balanced" | "full";
      externalProcessing?: boolean;
    }) => {
      const requestAgentId =
        typeof data.agentId === "string" && data.agentId.trim().length > 0
          ? data.agentId.trim().slice(0, 128)
          : undefined;
      const agentId = requestAgentId ?? getAgentId();
      await closeStaleSessions(kv);
      const { session, resumed } = await startOrResumeSession(kv, {
        sessionId: data.sessionId,
        project: data.project,
        cwd: data.cwd,
        ...(agentId ? { agentId } : {}),
        ...(data.parentSessionId
          ? { parentSessionId: data.parentSessionId }
          : {}),
        ...(data.privacy ? { privacy: data.privacy } : {}),
        ...(data.captureProfile
          ? { captureProfile: data.captureProfile }
          : {}),
        ...(data.externalProcessing !== undefined
          ? { externalProcessing: data.externalProcessing }
          : {}),
      });
      const contextResult = await sdk.trigger<
        { sessionId: string; project: string },
        { context: string }
      >({
        function_id: "mem::context-packet",
        payload: {
          sessionId: data.sessionId,
          project: data.project,
        },
      });
      return { session, resumed, context: contextResult.context };
    },
  );
  sdk.registerTrigger({
    type: "durable:subscriber",
    function_id: "event::session::started",
    config: { topic: "agentmemory.session.started" },
  });

  sdk.registerFunction("event::observation", async (data: HookPayload) =>
    sdk.trigger({ function_id: "mem::observe", payload: data }),
  );
  sdk.registerTrigger({
    type: "durable:subscriber",
    function_id: "event::observation",
    config: { topic: "agentmemory.observation" },
  });

  sdk.registerFunction("event::session::stopped", async (data: { sessionId: string; project?: string }) => {
    const summary = await sdk.trigger({ function_id: "mem::summarize", payload: data });
    const session = await kv.get<Session>(KV.sessions, data.sessionId);
    if (session && (!data.project || session.project === data.project)) {
      try {
        await sdk.trigger({
          function_id: "mem::promotion-generate",
          payload: {
            sessionId: data.sessionId,
            project: session.project,
          },
        });
      } catch (err) {
        logger.warn("promotion generation failed", {
          sessionId: data.sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    if (isReflectEnabled()) {
      try {
        sdk.trigger({
          function_id: "mem::slot-reflect",
          payload: { sessionId: data.sessionId },
          action: TriggerAction.Void(),
        });
      } catch (err) {
        logger.warn("slot-reflect trigger failed", {
          sessionId: data.sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    const localProcessing = getEnvVar("AGENTMEMORY_LOCAL_PROCESSING") === "true";
    const graphProcessingAllowed =
      session !== null &&
      (localProcessing ||
        (session.privacy !== "strict" &&
          session.externalProcessing !== false));
    if (isGraphExtractionEnabled() && graphProcessingAllowed) {
      try {
        const observations = await kv.list<CompressedObservation>(
          KV.observations(data.sessionId),
        );
        const compressed = observations.filter((o) => o.title);
        if (compressed.length > 0) {
          sdk.trigger({
            function_id: "mem::graph-extract",
            payload: { observations: compressed },
            action: TriggerAction.Void(),
          });
        }
      } catch (err) {
        logger.warn("graph-extract trigger failed", {
          sessionId: data.sessionId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return summary;
  });
  sdk.registerTrigger({
    type: "durable:subscriber",
    function_id: "event::session::stopped",
    config: { topic: "agentmemory.session.stopped" },
  });

  sdk.registerFunction(
    "event::session::ended",
    async (data: { sessionId: string }) => {
      await kv.update(KV.sessions, data.sessionId, [
        { type: "set", path: "endedAt", value: new Date().toISOString() },
        { type: "set", path: "status", value: "completed" },
      ]);
      return { success: true };
    },
  );
  sdk.registerTrigger({
    type: "durable:subscriber",
    function_id: "event::session::ended",
    config: { topic: "agentmemory.session.ended" },
  });

  // React to observation count changes and emit a lightweight live event for dashboards/viewer.
  sdk.registerFunction(
    "event::session::observation-count-changed",
    async (payload: {
      key: string;
      event_type: string;
      old_value?: Session;
      new_value?: Session;
    }) => {
      if (payload.event_type === "delete") return { skipped: true };
      const oldCount = payload.old_value?.observationCount ?? 0;
      const newCount = payload.new_value?.observationCount ?? 0;
      if (newCount <= oldCount) return { skipped: true };

      await sdk.trigger({
        function_id: "stream::send",
        payload: {
          stream_name: STREAM.name,
          group_id: STREAM.viewerGroup,
          id: `session-activity-${payload.key}-${Date.now()}`,
          type: "session.activity",
          data: {
            sessionId: payload.key,
            observationCount: newCount,
            delta: newCount - oldCount,
            updatedAt: payload.new_value?.updatedAt ?? new Date().toISOString(),
          },
        },
        action: TriggerAction.Void(),
      });

      return { emitted: true };
    },
  );
  sdk.registerTrigger({
    type: "state",
    function_id: "event::session::observation-count-changed",
    config: { scope: KV.sessions },
  });
}
