export type BackgroundPipelineStage =
  | "dispatch"
  | "session_validation"
  | "summary"
  | "promotion";

export interface BackgroundPipelineHealth {
  status: "idle" | "active" | "succeeded" | "failed";
  accepted: number;
  started: number;
  succeeded: number;
  failed: number;
  activeAccepted: number;
  activeRunning: number;
  candidates: number;
  promoted: number;
  unresolvedFailed: number;
  failedProjects: string[];
  lastRunId?: string;
  lastSessionId?: string;
  lastProject?: string;
  lastStage?: BackgroundPipelineStage;
  lastOutcome?: "succeeded" | "failed";
  lastErrorCode?: string;
  lastFailureRunId?: string;
  lastFailureProject?: string;
  lastFailureStage?: BackgroundPipelineStage;
  lastAcceptedAt?: string;
  lastStartedAt?: string;
  lastSucceededAt?: string;
  lastFailureAt?: string;
  oldestAcceptedAt?: string;
  oldestRunningAt?: string;
}

type ActiveRun = {
  sessionId: string;
  project: string;
  acceptedAt: string;
  startedAt?: string;
};

type FailedRun = {
  sessionId: string;
  project: string;
  stage: BackgroundPipelineStage;
  errorCode: string;
  failedAt: string;
};

const activeRuns = new Map<string, ActiveRun>();
const failedRuns = new Map<string, FailedRun>();
let health: BackgroundPipelineHealth = createInitialHealth();

function createInitialHealth(): BackgroundPipelineHealth {
  return {
    status: "idle",
    accepted: 0,
    started: 0,
    succeeded: 0,
    failed: 0,
    activeAccepted: 0,
    activeRunning: 0,
    candidates: 0,
    promoted: 0,
    unresolvedFailed: 0,
    failedProjects: [],
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function updateActiveCounts(): void {
  const runs = [...activeRuns.values()];
  const accepted = runs.filter((run) => !run.startedAt);
  const running = runs.filter((run) => Boolean(run.startedAt));
  health.activeAccepted = accepted.length;
  health.activeRunning = running.length;
  health.oldestAcceptedAt = accepted
    .map((run) => run.acceptedAt)
    .sort()[0];
  health.oldestRunningAt = running
    .map((run) => run.startedAt!)
    .sort()[0];
  health.unresolvedFailed = failedRuns.size;
  health.failedProjects = [
    ...new Set([...failedRuns.values()].map((run) => run.project)),
  ].sort();
  if (runs.length > 0) {
    health.status = "active";
  } else if (failedRuns.size > 0) {
    health.status = "failed";
  } else if (health.lastOutcome === "succeeded") {
    health.status = "succeeded";
  } else {
    health.status = "idle";
  }
}

export function pipelineFailureCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      error?: unknown;
      message?: unknown;
    };
    if (typeof candidate.code === "string" && candidate.code.trim()) {
      return candidate.code.trim().slice(0, 96);
    }
    if (candidate.error && typeof candidate.error === "object") {
      const nested = candidate.error as { code?: unknown };
      if (typeof nested.code === "string" && nested.code.trim()) {
        return nested.code.trim().slice(0, 96);
      }
    }
    const message =
      typeof candidate.message === "string"
        ? candidate.message
        : typeof candidate.error === "string"
          ? candidate.error
          : "";
    if (/timeout|timed out|invocation stopped/i.test(message)) return "TIMEOUT";
  }
  return "BACKGROUND_PIPELINE_FAILED";
}

export function recordBackgroundPipelineAccepted(input: {
  runId: string;
  sessionId: string;
  project: string;
  acceptedAt?: string;
}): void {
  if (activeRuns.has(input.runId)) return;
  const acceptedAt = input.acceptedAt ?? nowIso();
  activeRuns.set(input.runId, {
    sessionId: input.sessionId,
    project: input.project,
    acceptedAt,
  });
  health.accepted += 1;
  health.lastRunId = input.runId;
  health.lastSessionId = input.sessionId;
  health.lastProject = input.project;
  health.lastStage = "dispatch";
  health.lastAcceptedAt = acceptedAt;
  updateActiveCounts();
}

export function recordBackgroundPipelineStarted(input: {
  runId: string;
  sessionId: string;
  project: string;
  stage?: BackgroundPipelineStage;
  startedAt?: string;
}): void {
  if (!activeRuns.has(input.runId)) recordBackgroundPipelineAccepted(input);
  const run = activeRuns.get(input.runId)!;
  if (!run.startedAt) {
    run.startedAt = input.startedAt ?? nowIso();
    health.started += 1;
  }
  health.lastRunId = input.runId;
  health.lastSessionId = input.sessionId;
  health.lastProject = input.project;
  health.lastStage = input.stage ?? "summary";
  health.lastStartedAt = run.startedAt;
  updateActiveCounts();
}

export function recordBackgroundPipelineSucceeded(input: {
  runId: string;
  sessionId: string;
  project: string;
  candidates: number;
  promoted: number;
}): void {
  activeRuns.delete(input.runId);
  failedRuns.delete(input.runId);
  const succeededAt = nowIso();
  health.succeeded += 1;
  health.candidates += Math.max(0, input.candidates);
  health.promoted += Math.max(0, input.promoted);
  health.lastRunId = input.runId;
  health.lastSessionId = input.sessionId;
  health.lastProject = input.project;
  health.lastStage = "promotion";
  health.lastOutcome = "succeeded";
  health.lastSucceededAt = succeededAt;
  updateActiveCounts();
}

export function recordBackgroundPipelineSuperseded(runId: string): void {
  activeRuns.delete(runId);
  updateActiveCounts();
}

export function recordBackgroundPipelineFailed(input: {
  runId: string;
  sessionId: string;
  project: string;
  stage: BackgroundPipelineStage;
  error: unknown;
}): void {
  activeRuns.delete(input.runId);
  const failedAt = nowIso();
  const errorCode = pipelineFailureCode(input.error);
  failedRuns.set(input.runId, {
    sessionId: input.sessionId,
    project: input.project,
    stage: input.stage,
    errorCode,
    failedAt,
  });
  health.failed += 1;
  health.lastRunId = input.runId;
  health.lastSessionId = input.sessionId;
  health.lastProject = input.project;
  health.lastStage = input.stage;
  health.lastOutcome = "failed";
  health.lastErrorCode = errorCode;
  health.lastFailureRunId = input.runId;
  health.lastFailureProject = input.project;
  health.lastFailureStage = input.stage;
  health.lastFailureAt = failedAt;
  updateActiveCounts();
}

export function restoreBackgroundPipelineFailure(input: {
  runId: string;
  sessionId: string;
  project: string;
  stage: BackgroundPipelineStage;
  errorCode: string;
  failedAt?: string;
}): void {
  const failedAt = input.failedAt ?? nowIso();
  failedRuns.set(input.runId, {
    sessionId: input.sessionId,
    project: input.project,
    stage: input.stage,
    errorCode: input.errorCode,
    failedAt,
  });
  health.lastRunId = input.runId;
  health.lastSessionId = input.sessionId;
  health.lastProject = input.project;
  health.lastStage = input.stage;
  health.lastOutcome = "failed";
  health.lastErrorCode = input.errorCode;
  health.lastFailureRunId = input.runId;
  health.lastFailureProject = input.project;
  health.lastFailureStage = input.stage;
  health.lastFailureAt = failedAt;
  updateActiveCounts();
}

export function getBackgroundPipelineHealth(): BackgroundPipelineHealth {
  return { ...health };
}

export function resetBackgroundPipelineHealthForTests(): void {
  activeRuns.clear();
  failedRuns.clear();
  health = createInitialHealth();
}
