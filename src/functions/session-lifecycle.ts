import type { Session } from "../types.js";
import { KV } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { withKeyedLock } from "../state/keyed-mutex.js";

const DEFAULT_STALE_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SWEEP_INTERVAL_MS = 60_000;

// closeStaleSessions() full-scans KV.sessions, so running it on every
// session start turns O(sessions) work into per-event cost. The sweep is
// throttled to at most one run per interval (default 60s) per process;
// AGENTMEMORY_STALE_SESSION_SWEEP_MS tunes the interval, and "0" restores a
// sweep on every call. Session-end paths do not depend on this throttle:
// they read and close their own session record directly.
let lastStaleSweepAt = 0;

export function staleSessionSweepIntervalMs(): number {
  const raw = Number(process.env["AGENTMEMORY_STALE_SESSION_SWEEP_MS"]);
  return Number.isFinite(raw) && raw >= 0
    ? Math.floor(raw)
    : DEFAULT_SWEEP_INTERVAL_MS;
}

export function resetStaleSessionSweepForTests(): void {
  lastStaleSweepAt = 0;
}

/**
 * Run closeStaleSessions() at most once per sweep interval. Returns true
 * when the scan actually ran.
 */
export async function maybeCloseStaleSessions(
  kv: StateKV,
  now = new Date(),
  maxAgeMs = DEFAULT_STALE_MS,
): Promise<boolean> {
  const elapsed = now.getTime() - lastStaleSweepAt;
  if (elapsed < staleSessionSweepIntervalMs()) return false;
  lastStaleSweepAt = now.getTime();
  await closeStaleSessions(kv, now, maxAgeMs);
  return true;
}

export interface StartSessionInput {
  sessionId: string;
  project: string;
  cwd: string;
  agentId?: string;
  parentSessionId?: string;
  title?: string;
  privacy?: "standard" | "private" | "strict";
  captureProfile?: "minimal" | "balanced" | "full";
  externalProcessing?: boolean;
}

export async function closeStaleSessions(
  kv: StateKV,
  now = new Date(),
  maxAgeMs = DEFAULT_STALE_MS,
): Promise<number> {
  const sessions = await kv.list<Session>(KV.sessions).catch(() => []);
  const cutoff = now.getTime() - maxAgeMs;
  let closed = 0;
  for (const session of sessions) {
    if (session.status !== "active") continue;
    const touchedAt = new Date(
      session.updatedAt ?? session.resumedAt ?? session.startedAt,
    ).getTime();
    if (!Number.isFinite(touchedAt) || touchedAt >= cutoff) continue;
    const timestamp = now.toISOString();
    await kv.set(KV.sessions, session.id, {
      ...session,
      status: "abandoned",
      endedAt: session.endedAt ?? timestamp,
      staleClosedAt: timestamp,
      updatedAt: timestamp,
    });
    closed++;
  }
  return closed;
}

export async function startOrResumeSession(
  kv: StateKV,
  input: StartSessionInput,
): Promise<{ session: Session; resumed: boolean }> {
  return withKeyedLock(`session:${input.sessionId}`, async () => {
    const existing = await kv.get<Session>(KV.sessions, input.sessionId);
    if (existing && existing.project !== input.project) {
      throw new Error(
        `session ${input.sessionId} already belongs to ${existing.project}`,
      );
    }

    const now = new Date().toISOString();
    const resumed = Boolean(existing && existing.status !== "active");
    const session: Session = existing
      ? {
          ...existing,
          cwd: input.cwd,
          status: "active",
          updatedAt: now,
          ...(resumed
            ? {
                resumedAt: now,
                resumeCount: (existing.resumeCount ?? 0) + 1,
                endedAt: undefined,
              }
            : {}),
          ...(input.agentId ? { agentId: input.agentId } : {}),
          ...(input.parentSessionId
            ? { parentSessionId: input.parentSessionId }
            : {}),
          ...(input.privacy ? { privacy: input.privacy } : {}),
          ...(input.captureProfile
            ? { captureProfile: input.captureProfile }
            : {}),
          ...(input.externalProcessing !== undefined
            ? { externalProcessing: input.externalProcessing }
            : {}),
          ...(input.title
            ? {
                summary: input.title.slice(0, 200),
                firstPrompt:
                  existing.firstPrompt ?? input.title.slice(0, 200),
              }
            : {}),
        }
      : {
          id: input.sessionId,
          project: input.project,
          cwd: input.cwd,
          startedAt: now,
          updatedAt: now,
          status: "active",
          observationCount: 0,
          retainedObservationCount: 0,
          ...(input.agentId ? { agentId: input.agentId } : {}),
          ...(input.parentSessionId
            ? { parentSessionId: input.parentSessionId }
            : {}),
          ...(input.privacy ? { privacy: input.privacy } : {}),
          ...(input.captureProfile
            ? { captureProfile: input.captureProfile }
            : {}),
          ...(input.externalProcessing !== undefined
            ? { externalProcessing: input.externalProcessing }
            : {}),
          ...(input.title
            ? {
                summary: input.title.slice(0, 200),
                firstPrompt: input.title.slice(0, 200),
              }
            : {}),
        };
    await kv.set(KV.sessions, input.sessionId, session);

    if (input.parentSessionId && input.parentSessionId !== input.sessionId) {
      await withKeyedLock(`session:${input.parentSessionId}`, async () => {
        const parent = await kv.get<Session>(KV.sessions, input.parentSessionId!);
        if (!parent || parent.project !== input.project) return;
        parent.childSessionIds = Array.from(
          new Set([...(parent.childSessionIds ?? []), input.sessionId]),
        );
        parent.updatedAt = now;
        await kv.set(KV.sessions, parent.id, parent);
      });
    }

    return { session, resumed };
  });
}
