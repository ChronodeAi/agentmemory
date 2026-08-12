import type { Session } from "../types.js";
import { KV } from "../state/schema.js";
import type { StateKV } from "../state/kv.js";
import { withKeyedLock } from "../state/keyed-mutex.js";

const DEFAULT_STALE_MS = 24 * 60 * 60 * 1000;

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
