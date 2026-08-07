import { describe, expect, it, vi } from "vitest";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { registerPatternsFunction } from "../src/functions/patterns.js";
import { KV } from "../src/state/schema.js";
import type { CompressedObservation, Session } from "../src/types.js";
import { mockSdk } from "./helpers/mocks.js";

const PROJECT_A = "github.com/example/project-a";
const PROJECT_B = "github.com/example/project-b";

function makeSession(id: string, project: string): Session {
  return {
    id,
    project,
    cwd: `/work/${project}`,
    startedAt: "2026-07-25T00:00:00.000Z",
    status: "completed",
    observationCount: 1,
  };
}

function makeObservation(
  id: string,
  sessionId: string,
  files: string[],
): CompressedObservation {
  return {
    id,
    sessionId,
    timestamp: "2026-07-25T00:00:00.000Z",
    type: "file_edit",
    title: `edit ${id}`,
    facts: [],
    narrative: "",
    concepts: [],
    files,
    importance: 1,
  };
}

describe("mem::patterns bounded fanout", () => {
  it("loads project sessions in bounded parallel batches and preserves pattern results", async () => {
    const sdk = mockSdk();
    const sessions = [
      ...Array.from({ length: 12 }, (_, index) =>
        makeSession(`session-a${String(index + 1).padStart(2, "0")}`, PROJECT_A),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeSession(`session-b${index + 1}`, PROJECT_B),
      ),
    ];
    const observations = new Map<string, CompressedObservation[]>();
    for (const session of sessions) {
      const files =
        session.project === PROJECT_A
          ? ["src/a.ts", "src/b.ts"]
          : ["src/other.ts", "src/out-of-scope.ts"];
      observations.set(session.id, [
        makeObservation(`obs-${session.id}`, session.id, files),
      ]);
    }

    let inFlight = 0;
    let maxInFlight = 0;
    const loadedSessions: string[] = [];
    const kv = {
      get: async () => null,
      set: async <T>(_scope: string, _key: string, value: T): Promise<T> => value,
      update: async () => undefined,
      delete: async () => undefined,
      list: async <T>(scope: string): Promise<T[]> => {
        if (scope === KV.sessions) return sessions as T[];
        const sessionId = scope.slice("mem:obs:".length);
        loadedSessions.push(sessionId);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 0));
        inFlight -= 1;
        return (observations.get(sessionId) ?? []) as T[];
      },
    };

    registerPatternsFunction(sdk as never, kv as never);

    const result = (await sdk.trigger("mem::patterns", {
      project: PROJECT_A,
    })) as {
      patterns: Array<{
        type: string;
        files: string[];
        frequency: number;
        sessions: string[];
      }>;
    };

    expect(loadedSessions).toHaveLength(12);
    expect(loadedSessions.every((id) => id.startsWith("session-a"))).toBe(true);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
    expect(result.patterns).toEqual([
      {
        type: "co_change",
        description:
          "src/a.ts and src/b.ts are frequently modified together",
        files: ["src/a.ts", "src/b.ts"],
        frequency: 12,
        sessions: loadedSessions,
      },
    ]);
  });
});
