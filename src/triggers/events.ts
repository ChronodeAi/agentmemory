import { TriggerAction, type ISdk } from "iii-sdk";
import type { CompressedObservation, HookPayload, Session } from "../types.js";
import { KV, STREAM, generateId } from "../state/schema.js";
import { StateKV } from "../state/kv.js";
import { isReflectEnabled } from "../functions/slots.js";
import {
  getAgentId,
  getEnvVar,
  isGraphExtractionEnabled,
} from "../config.js";
import { logger } from "../logger.js";
import { withKeyedLock } from "../state/keyed-mutex.js";
import {
  closeStaleSessions,
  startOrResumeSession,
} from "../functions/session-lifecycle.js";
import {
  pipelineFailureCode,
  recordBackgroundPipelineAccepted,
  recordBackgroundPipelineFailed,
  recordBackgroundPipelineStarted,
  recordBackgroundPipelineSucceeded,
  recordBackgroundPipelineSuperseded,
  restoreBackgroundPipelineFailure,
  type BackgroundPipelineStage,
} from "../health/background-pipeline.js";

const MAX_BACKGROUND_PIPELINE_ATTEMPTS = 3;

function successful(result: unknown): result is Record<string, unknown> & {
  success: true;
} {
  return Boolean(
    result &&
      typeof result === "object" &&
      (result as { success?: unknown }).success === true,
  );
}

function expectedSummarySkip(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const error = (result as { error?: unknown }).error;
  return error === "no_observations" || error === "no_provider"
    ? error
    : null;
}

async function persistPipelineFailure(
  kv: StateKV,
  input: {
    runId: string;
    sessionId: string;
    project: string;
    stage: BackgroundPipelineStage;
    error: unknown;
  },
): Promise<boolean> {
  const errorCode = pipelineFailureCode(input.error);
  const finishedAt = new Date().toISOString();
  let persisted = false;
  try {
    persisted = await withKeyedLock(
      `background-pipeline-terminal:${input.sessionId}`,
      async () => {
        const session = await kv.get<Session>(KV.sessions, input.sessionId);
        if (
          session?.project !== input.project ||
          (session.backgroundPipelineRunId &&
            session.backgroundPipelineRunId !== input.runId) ||
          (session.backgroundPipelineRunId === input.runId &&
            session.backgroundPipelineStatus === "succeeded")
        ) {
          return false;
        }
        await kv.update(KV.sessions, input.sessionId, [
          {
            type: "set",
            path: "backgroundPipelineRunId",
            value: input.runId,
          },
          {
            type: "set",
            path: "backgroundPipelineStatus",
            value: "failed",
          },
          {
            type: "set",
            path: "backgroundPipelineStage",
            value: input.stage,
          },
          {
            type: "set",
            path: "backgroundPipelineErrorCode",
            value: errorCode,
          },
          {
            type: "set",
            path: "backgroundPipelineFinishedAt",
            value: finishedAt,
          },
        ]);
        return true;
      },
    );
  } catch (persistenceError) {
    logger.warn("background pipeline failure state persistence failed", {
      sessionId: input.sessionId,
      project: input.project,
      pipelineRunId: input.runId,
      error:
        persistenceError instanceof Error
          ? persistenceError.message
          : String(persistenceError),
    });
  }
  if (persisted) recordBackgroundPipelineFailed(input);
  return persisted;
}

async function persistPipelineSuccess(
  kv: StateKV,
  input: {
    runId: string;
    sessionId: string;
    project: string;
    finishedAt: string;
  },
): Promise<
  "persisted" | "already_succeeded" | "terminal_failed" | "superseded"
> {
  return withKeyedLock(
    `background-pipeline-terminal:${input.sessionId}`,
    async () => {
      const session = await kv.get<Session>(KV.sessions, input.sessionId);
      if (
        session?.project !== input.project ||
        session.backgroundPipelineRunId !== input.runId
      ) {
        return "superseded";
      }
      if (session.backgroundPipelineStatus === "succeeded") {
        return "already_succeeded";
      }
      if (
        session.backgroundPipelineStatus === "failed" &&
        (session.backgroundPipelineAttempts ?? 0) >=
          MAX_BACKGROUND_PIPELINE_ATTEMPTS
      ) {
        return "terminal_failed";
      }
      await kv.update(KV.sessions, input.sessionId, [
        {
          type: "set",
          path: "backgroundPipelineStatus",
          value: "succeeded",
        },
        {
          type: "set",
          path: "backgroundPipelineStage",
          value: "promotion",
        },
        {
          type: "set",
          path: "backgroundPipelinePromotionStatus",
          value: "succeeded",
        },
        {
          type: "set",
          path: "backgroundPipelineFinishedAt",
          value: input.finishedAt,
        },
        {
          type: "set",
          path: "backgroundPipelineErrorCode",
          value: null,
        },
      ]);
      return "persisted";
    },
  );
}

async function claimPipelineDispatchAttempt(
  kv: StateKV,
  input: { runId: string; sessionId: string; project: string },
): Promise<"claimed" | "exhausted" | "terminal" | "superseded"> {
  return withKeyedLock(
    `background-pipeline-attempt:${input.sessionId}`,
    async () => {
      const session = await kv.get<Session>(KV.sessions, input.sessionId);
      if (
        !session ||
        session.project !== input.project ||
        session.backgroundPipelineRunId !== input.runId
      ) {
        return "superseded";
      }
      if (session.backgroundPipelineStatus === "succeeded") return "terminal";
      const attempts = Math.max(0, session.backgroundPipelineAttempts ?? 0);
      if (attempts >= MAX_BACKGROUND_PIPELINE_ATTEMPTS) return "exhausted";
      await kv.update(KV.sessions, input.sessionId, [
        {
          type: "set",
          path: "backgroundPipelineAttempts",
          value: attempts + 1,
        },
      ]);
      return "claimed";
    },
  );
}

export async function dispatchSessionStopped(
  sdk: ISdk,
  kv: StateKV,
  input: { sessionId: string; project: string; pipelineRunId: string },
): Promise<boolean> {
  const claim = await claimPipelineDispatchAttempt(kv, {
    runId: input.pipelineRunId,
    sessionId: input.sessionId,
    project: input.project,
  });
  if (claim !== "claimed") {
    if (claim === "exhausted") {
      await persistPipelineFailure(kv, {
        runId: input.pipelineRunId,
        sessionId: input.sessionId,
        project: input.project,
        stage: "dispatch",
        error: "BACKGROUND_PIPELINE_RETRY_EXHAUSTED",
      });
    }
    return false;
  }
  try {
    const dispatch = sdk.trigger({
      function_id: "event::session::stopped",
      payload: input,
      action: TriggerAction.Void(),
    });
    void Promise.resolve(dispatch).catch((error) => {
      void persistPipelineFailure(kv, {
        runId: input.pipelineRunId,
        sessionId: input.sessionId,
        project: input.project,
        stage: "dispatch",
        error,
      });
      logger.warn("event::session::stopped dispatch rejected", {
        sessionId: input.sessionId,
        project: input.project,
        pipelineRunId: input.pipelineRunId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
    return true;
  } catch (error) {
    await persistPipelineFailure(kv, {
      runId: input.pipelineRunId,
      sessionId: input.sessionId,
      project: input.project,
      stage: "dispatch",
      error,
    });
    logger.warn("event::session::stopped trigger failed", {
      sessionId: input.sessionId,
      project: input.project,
      pipelineRunId: input.pipelineRunId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function reconcileBackgroundPipelines(
  sdk: ISdk,
  kv: StateKV,
): Promise<{ replayed: number; exhausted: number }> {
  const sessions = await kv.list<Session>(KV.sessions);
  let replayed = 0;
  let exhausted = 0;
  for (const session of sessions) {
    const runId = session.backgroundPipelineRunId;
    const status = session.backgroundPipelineStatus;
    if (!runId || session.status !== "completed" || !status) continue;

    const attempts = Math.max(0, session.backgroundPipelineAttempts ?? 0);
    if (status === "succeeded") continue;
    if (attempts >= MAX_BACKGROUND_PIPELINE_ATTEMPTS) {
      const failedAt =
        session.backgroundPipelineFinishedAt ?? new Date().toISOString();
      const errorCode =
        session.backgroundPipelineErrorCode ??
        "BACKGROUND_PIPELINE_RETRY_EXHAUSTED";
      await kv.update(KV.sessions, session.id, [
        {
          type: "set",
          path: "backgroundPipelineStatus",
          value: "failed",
        },
        {
          type: "set",
          path: "backgroundPipelineErrorCode",
          value: errorCode,
        },
        {
          type: "set",
          path: "backgroundPipelineFinishedAt",
          value: failedAt,
        },
      ]);
      restoreBackgroundPipelineFailure({
        runId,
        sessionId: session.id,
        project: session.project,
        stage: session.backgroundPipelineStage ?? "dispatch",
        errorCode,
        failedAt,
      });
      exhausted += 1;
      continue;
    }

    const acceptedAt = new Date().toISOString();
    await kv.update(KV.sessions, session.id, [
      {
        type: "set",
        path: "backgroundPipelineStatus",
        value: "accepted",
      },
      {
        type: "set",
        path: "backgroundPipelineStage",
        value: "dispatch",
      },
      {
        type: "set",
        path: "backgroundPipelineAcceptedAt",
        value: acceptedAt,
      },
      {
        type: "set",
        path: "backgroundPipelineErrorCode",
        value: null,
      },
    ]);
    recordBackgroundPipelineAccepted({
      runId,
      sessionId: session.id,
      project: session.project,
      acceptedAt,
    });
    await dispatchSessionStopped(sdk, kv, {
      sessionId: session.id,
      project: session.project,
      pipelineRunId: runId,
    });
    replayed += 1;
  }
  return { replayed, exhausted };
}

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

  sdk.registerFunction("event::session::stopped", async (data: {
    sessionId: string;
    project: string;
    pipelineRunId?: string;
  }) => withKeyedLock(`background-pipeline:${data.sessionId}`, async () => {
    const pipelineRunId =
      typeof data.pipelineRunId === "string" && data.pipelineRunId.trim()
        ? data.pipelineRunId.trim()
        : generateId("pipeline");
    const session = await kv.get<Session>(KV.sessions, data.sessionId);
    if (!session || !data.project || session.project !== data.project) {
      await persistPipelineFailure(kv, {
        runId: pipelineRunId,
        sessionId: data.sessionId,
        project: data.project,
        stage: "session_validation",
        error: "session_not_found_or_project_mismatch",
      });
      return {
        success: false,
        error: "session_not_found_or_project_mismatch",
        pipelineRunId,
      };
    }
    if (
      session.backgroundPipelineRunId &&
      session.backgroundPipelineRunId !== pipelineRunId
    ) {
      recordBackgroundPipelineSuperseded(pipelineRunId);
      return {
        success: true,
        superseded: true,
        pipelineRunId,
        activePipelineRunId: session.backgroundPipelineRunId,
      };
    }
    if (
      session.backgroundPipelineRunId === pipelineRunId &&
      session.backgroundPipelineStatus === "succeeded"
    ) {
      return { success: true, alreadyProcessed: true, pipelineRunId };
    }
    const priorAttempts = Math.max(
      0,
      session.backgroundPipelineAttempts ?? 0,
    );
    if (
      session.backgroundPipelineRunId === pipelineRunId &&
      session.backgroundPipelineStatus === "failed" &&
      priorAttempts >= MAX_BACKGROUND_PIPELINE_ATTEMPTS
    ) {
      return {
        success: false,
        terminal: true,
        error: "background_pipeline_retry_exhausted",
        pipelineRunId,
      };
    }
    const processingAttempts =
      session.backgroundPipelineStatus === "failed"
        ? priorAttempts + 1
        : Math.max(1, priorAttempts);
    if (processingAttempts > MAX_BACKGROUND_PIPELINE_ATTEMPTS) {
      return {
        success: false,
        terminal: true,
        error: "background_pipeline_retry_exhausted",
        pipelineRunId,
      };
    }

    const startedAt = new Date().toISOString();
    await kv.update(KV.sessions, data.sessionId, [
      {
        type: "set",
        path: "backgroundPipelineRunId",
        value: pipelineRunId,
      },
      {
        type: "set",
        path: "backgroundPipelineStatus",
        value: "running",
      },
      {
        type: "set",
        path: "backgroundPipelineStage",
        value: "summary",
      },
      {
        type: "set",
        path: "backgroundPipelineAttempts",
        value: processingAttempts,
      },
      {
        type: "set",
        path: "backgroundPipelineStartedAt",
        value: startedAt,
      },
      {
        type: "set",
        path: "backgroundPipelineErrorCode",
        value: null,
      },
    ]);
    recordBackgroundPipelineStarted({
      runId: pipelineRunId,
      sessionId: data.sessionId,
      project: data.project,
      startedAt,
    });

    let summary: unknown;
    let summaryError: unknown;
    let summarySkipped: string | null = null;
    try {
      summary = await sdk.trigger({
        function_id: "mem::summarize",
        payload: { sessionId: data.sessionId, project: data.project },
      });
    } catch (error) {
      summaryError = error;
      logger.warn("session summary generation failed", {
        sessionId: data.sessionId,
        project: data.project,
        pipelineRunId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (!summaryError && !successful(summary)) {
      summarySkipped = expectedSummarySkip(summary);
      if (!summarySkipped) {
        summaryError = (summary as { error?: unknown })?.error ?? summary;
        logger.warn("session summary returned failure", {
          sessionId: data.sessionId,
          project: data.project,
          pipelineRunId,
          errorCode: pipelineFailureCode(summaryError),
        });
      }
    }
    await kv.update(KV.sessions, data.sessionId, [
      {
        type: "set",
        path: "backgroundPipelineSummaryStatus",
        value: summaryError
          ? "failed"
          : summarySkipped
            ? "skipped"
            : "succeeded",
      },
      {
        type: "set",
        path: "backgroundPipelineStage",
        value: "promotion",
      },
    ]);

    let promotion: unknown;
    try {
      promotion = await sdk.trigger({
        function_id: "mem::promotion-generate",
        payload: {
          sessionId: data.sessionId,
          project: session.project,
        },
      });
    } catch (error) {
      await persistPipelineFailure(kv, {
        runId: pipelineRunId,
        sessionId: data.sessionId,
        project: data.project,
        stage: "promotion",
        error,
      });
      logger.warn("promotion generation failed", {
        sessionId: data.sessionId,
        pipelineRunId,
        error: error instanceof Error ? error.message : String(error),
      });
      return { success: false, error: "promotion_failed", pipelineRunId, summary };
    }
    if (!successful(promotion)) {
      const promotionError =
        (promotion as { error?: unknown })?.error ?? promotion;
      await persistPipelineFailure(kv, {
        runId: pipelineRunId,
        sessionId: data.sessionId,
        project: data.project,
        stage: "promotion",
        error: promotionError,
      });
      logger.warn("promotion generation returned failure", {
        sessionId: data.sessionId,
        project: data.project,
        pipelineRunId,
        errorCode: pipelineFailureCode(promotionError),
      });
      return {
        success: false,
        error: "promotion_failed",
        pipelineRunId,
        summary,
        promotion,
      };
    }
    const candidates = Array.isArray(promotion.candidates)
      ? promotion.candidates.length
      : 0;
    const promoted =
      typeof promotion.promoted === "number" ? promotion.promoted : 0;
    if (summaryError) {
      await kv.update(KV.sessions, data.sessionId, [
        {
          type: "set",
          path: "backgroundPipelinePromotionStatus",
          value: "succeeded",
        },
      ]);
      await persistPipelineFailure(kv, {
        runId: pipelineRunId,
        sessionId: data.sessionId,
        project: data.project,
        stage: "summary",
        error: summaryError,
      });
      return {
        success: false,
        error: "summary_failed",
        pipelineRunId,
        summary,
        promotion,
      };
    }

    const finishedAt = new Date().toISOString();
    const successState = await persistPipelineSuccess(kv, {
      runId: pipelineRunId,
      sessionId: data.sessionId,
      project: data.project,
      finishedAt,
    });
    if (successState === "superseded") {
      recordBackgroundPipelineSuperseded(pipelineRunId);
      return { success: true, superseded: true, pipelineRunId };
    }
    if (successState === "already_succeeded") {
      return { success: true, alreadyProcessed: true, pipelineRunId };
    }
    if (successState === "terminal_failed") {
      return {
        success: false,
        terminal: true,
        error: "background_pipeline_retry_exhausted",
        pipelineRunId,
      };
    }
    recordBackgroundPipelineSucceeded({
      runId: pipelineRunId,
      sessionId: data.sessionId,
      project: data.project,
      candidates,
      promoted,
    });
    if (isReflectEnabled()) {
      try {
        sdk.trigger({
          function_id: "mem::slot-reflect",
          payload: { sessionId: data.sessionId, project: data.project },
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
            payload: { observations: compressed, project: data.project },
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
    return successful(summary)
      ? { ...summary, pipelineRunId, promotion }
      : {
          success: true,
          pipelineRunId,
          promotion,
          summarySkipped,
        };
  }));
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
