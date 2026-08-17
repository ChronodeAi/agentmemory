import { describe, it, expect, vi } from "vitest";
import { FallbackChainProvider } from "../src/providers/fallback-chain.js";
import type { MemoryProvider } from "../src/types.js";
import { KV } from "../src/state/schema.js";

function makeProvider(
  name: string,
  impl?: Partial<MemoryProvider>,
): MemoryProvider {
  return {
    name,
    compress: impl?.compress ?? (async () => `compressed by ${name}`),
    summarize: impl?.summarize ?? (async () => `summarized by ${name}`),
  };
}

function mockKV() {
  const sessions = new Map<string, unknown>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      scope === KV.sessions ? ((sessions.get(key) as T) ?? null) : null,
    list: async <T>(scope: string): Promise<T[]> =>
      scope === KV.sessions ? (Array.from(sessions.values()) as T[]) : [],
    set: async <T>(_scope: string, key: string, value: T): Promise<T> => {
      sessions.set(key, value);
      return value;
    },
  };
}

describe("FallbackChainProvider", () => {
  it("returns result from first provider when it succeeds", async () => {
    const chain = new FallbackChainProvider([
      makeProvider("primary"),
      makeProvider("secondary"),
    ]);
    const result = await chain.compress("sys", "user");
    expect(result).toBe("compressed by primary");
  });

  it("falls back to second provider when first fails", async () => {
    const failing: MemoryProvider = {
      name: "failing",
      compress: async () => {
        throw new Error("primary down");
      },
      summarize: async () => {
        throw new Error("primary down");
      },
    };
    const chain = new FallbackChainProvider([
      failing,
      makeProvider("backup"),
    ]);
    const result = await chain.compress("sys", "user");
    expect(result).toBe("compressed by backup");
  });

  it("throws the last error when all providers fail", async () => {
    const failing1: MemoryProvider = {
      name: "fail1",
      compress: async () => {
        throw new Error("fail1 error");
      },
      summarize: async () => {
        throw new Error("fail1 error");
      },
    };
    const failing2: MemoryProvider = {
      name: "fail2",
      compress: async () => {
        throw new Error("fail2 error");
      },
      summarize: async () => {
        throw new Error("fail2 error");
      },
    };
    const chain = new FallbackChainProvider([failing1, failing2]);
    await expect(chain.compress("sys", "user")).rejects.toThrow("fail2 error");
  });

  it("formats the name correctly", () => {
    const chain = new FallbackChainProvider([
      makeProvider("anthropic"),
      makeProvider("gemini"),
      makeProvider("openrouter"),
    ]);
    expect(chain.name).toBe("fallback(anthropic -> gemini -> openrouter)");
  });

  it("summarize also uses fallback chain", async () => {
    const failing: MemoryProvider = {
      name: "failing",
      compress: async () => {
        throw new Error("down");
      },
      summarize: async () => {
        throw new Error("down");
      },
    };
    const chain = new FallbackChainProvider([
      failing,
      makeProvider("backup"),
    ]);
    const result = await chain.summarize("sys", "user");
    expect(result).toBe("summarized by backup");
  });

  it("makes zero external fallback calls for a strict project", async () => {
    const kv = mockKV();
    await kv.set(KV.sessions, "strict-session", {
      id: "strict-session",
      project: "strict/project",
      cwd: "/tmp/strict-project",
      startedAt: new Date().toISOString(),
      status: "active",
      observationCount: 0,
      privacy: "strict",
      externalProcessing: false,
    });
    const primaryRecorder = vi.fn(async () => "primary");
    const fallbackRecorder = vi.fn(async () => "fallback");
    const chain = new FallbackChainProvider(
      [
        makeProvider("primary-recorder", { compress: primaryRecorder }),
        makeProvider("fallback-recorder", { compress: fallbackRecorder }),
      ],
      {
        kv: kv as never,
        project: "strict/project",
        sessionId: "strict-session",
        dataClass: "prompt_text",
        sourceProvenance: "compression_request",
        providerLocations: {
          "primary-recorder": "external",
          "fallback-recorder": "external",
        },
      },
    );

    await expect(chain.compress("sys", "raw content")).rejects.toThrow(
      /external_processing_disabled/,
    );
    expect(primaryRecorder).not.toHaveBeenCalled();
    expect(fallbackRecorder).not.toHaveBeenCalled();
  });
});
