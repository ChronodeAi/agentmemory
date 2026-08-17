import { describe, it, expect } from "vitest";
import {
  sanitizePrivateData,
  stripPrivateData,
} from "../src/functions/privacy.js";
import { logger } from "../src/logger.js";

describe("stripPrivateData", () => {
  it("strips private tags", () => {
    expect(stripPrivateData("hello <private>secret</private> world")).toBe(
      "hello [REDACTED] world",
    );
  });

  it("strips private tags case-insensitive", () => {
    expect(stripPrivateData("<Private>data</Private>")).toBe("[REDACTED]");
  });

  it("strips API keys", () => {
    expect(stripPrivateData("api_key=sk-ant-1234567890abcdefghij")).toBe(
      "[REDACTED_SECRET]",
    );
  });

  it("strips GitHub PATs", () => {
    expect(
      stripPrivateData("token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh"),
    ).toBe("[REDACTED_SECRET]");
  });

  it("strips standalone GitHub PATs", () => {
    expect(
      stripPrivateData("found ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij here"),
    ).toBe("found [REDACTED_SECRET] here");
  });

  it("strips Slack tokens", () => {
    expect(stripPrivateData("xoxb-123456-789012-abcdef")).toBe(
      "[REDACTED_SECRET]",
    );
  });

  it("strips AWS access keys", () => {
    expect(stripPrivateData("key=AKIAIOSFODNN7EXAMPLE")).toBe(
      "key=[REDACTED_SECRET]",
    );
  });

  it("strips JWT tokens", () => {
    expect(
      stripPrivateData(
        "eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpM",
      ),
    ).toBe("[REDACTED_SECRET]");
  });

  it("strips sk- prefixed keys", () => {
    expect(stripPrivateData("sk-1234567890abcdefghijklmnopqr")).toBe(
      "[REDACTED_SECRET]",
    );
  });

  it("strips OpenAI project keys", () => {
    expect(
      stripPrivateData("sk-proj-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJ"),
    ).toBe("[REDACTED_SECRET]");
  });

  it("strips GitHub fine-grained service tokens", () => {
    expect(
      stripPrivateData("ghs_1234567890abcdefghijklmnopqrstuvwxyzAB"),
    ).toBe("[REDACTED_SECRET]");
  });

  it("strips bearer tokens", () => {
    expect(
      stripPrivateData(
        "Authorization: Bearer sk-proj-1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJ",
      ),
    ).toBe("Authorization: [REDACTED_SECRET]");
  });

  it("handles multiple secrets in one string", () => {
    const input =
      "sk-abcdefghijklmnopqrstuv and ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    const result = stripPrivateData(input);
    expect(result).not.toContain("sk-");
    expect(result).not.toContain("ghp_");
  });

  it("does not strip short strings", () => {
    expect(stripPrivateData("api_key=short")).toBe("api_key=short");
  });

  it("returns empty string unchanged", () => {
    expect(stripPrivateData("")).toBe("");
  });

  it("handles no secrets gracefully", () => {
    expect(stripPrivateData("normal text without secrets")).toBe(
      "normal text without secrets",
    );
  });

  it("preserves valid JSON while redacting a credential value", () => {
    const input = JSON.stringify({
      tool_name: "Edit",
      tool_output:
        "Verified result; token=sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
    });
    const output = stripPrivateData(input);

    expect(() => JSON.parse(output)).not.toThrow();
    expect(JSON.parse(output)).toEqual({
      tool_name: "Edit",
      tool_output: "Verified result; [REDACTED_SECRET]",
    });
  });

  it("works correctly on consecutive calls (no regex statefulness)", () => {
    const input = "sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabc";
    expect(stripPrivateData(input)).toBe("[REDACTED_SECRET]");
    expect(stripPrivateData(input)).toBe("[REDACTED_SECRET]");
    expect(stripPrivateData(input)).toBe("[REDACTED_SECRET]");
  });

  it("redacts structured sensitive keys regardless of value length", () => {
    expect(
      sanitizePrivateData({
        nested: { password: "short", safe: "visible" },
        authorization: "anything",
      }),
    ).toEqual({
      nested: { password: "[REDACTED_SECRET]", safe: "visible" },
      authorization: "[REDACTED_SECRET]",
    });
  });

  it("redacts environment-style secret keys recursively", () => {
    expect(
      sanitizePrivateData({
        env: {
          OPENAI_API_KEY: "arbitrary-short-value",
          client_secret: "another-value",
          access_token: "opaque-value",
        },
        safe: "keep-me",
      }),
    ).toEqual({
      env: {
        OPENAI_API_KEY: "[REDACTED_SECRET]",
        client_secret: "[REDACTED_SECRET]",
        access_token: "[REDACTED_SECRET]",
      },
      safe: "keep-me",
    });
  });

  it("uses the same redaction for structured log fields and messages", () => {
    const writes: string[] = [];
    const originalWrite = process.stderr.write;
    process.stderr.write = ((chunk: string) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    try {
      logger.info("Authorization: Bearer abcdefghijklmnopqrstuvwxyz", {
        env: { OPENAI_API_KEY: "short-value" },
      });
    } finally {
      process.stderr.write = originalWrite;
    }
    expect(writes.join("")).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(writes.join("")).not.toContain("short-value");
    expect(writes.join("")).toContain("[REDACTED_SECRET]");
  });

  it("redacts PEM blocks and unterminated private tags", () => {
    expect(
      stripPrivateData(
        "-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----",
      ),
    ).toBe("[REDACTED_SECRET]");
    expect(stripPrivateData("prefix <private>synthetic")).toBe(
      "prefix [REDACTED]",
    );
  });
});
