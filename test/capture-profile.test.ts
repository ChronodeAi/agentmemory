import { describe, expect, it } from "vitest";
import { captureToolEvent } from "../src/hooks/_capture.js";
import type { AgentmemoryProjectConfig } from "../src/project-config.js";
import { stripPrivateData } from "../src/functions/privacy.js";

const config: AgentmemoryProjectConfig = {
  schema_version: 1,
  project_id: "github.com/example/project",
  privacy: "strict",
  capture_profile: "balanced",
  source_roots: ["src", "test"],
  decision_roots: ["docs/adr"],
  exclude_globs: ["**/.env", "**/.env.*", "**/dist/**"],
  external_processing: false,
  root: "/tmp/project",
};

describe("balanced coding capture", () => {
  it("captures reads as metadata with a hash instead of raw output", () => {
    const result = captureToolEvent(
      "file_read",
      { file_path: "src/app.ts" },
      "sensitive source body",
      config,
    );
    expect(result?.capture).toBe("metadata-only");
    expect(result?.toolOutput).toMatchObject({
      capture: "metadata-only",
      output_chars: 21,
    });
    expect(JSON.stringify(result?.toolOutput)).not.toContain(
      "sensitive source body",
    );
  });

  it("captures writes fully but limits high-value output to 8000 chars", () => {
    const result = captureToolEvent(
      "file_write",
      { file_path: "src/app.ts", content: "updated" },
      "x".repeat(9000),
      config,
    );
    expect(result?.capture).toBe("full");
    expect(String(result?.toolOutput).length).toBeLessThanOrEqual(8020);
  });

  it("drops events whose referenced files are all excluded", () => {
    expect(
      captureToolEvent(
        "file_read",
        { file_path: ".env" },
        "SECRET=value",
        config,
      ),
    ).toBeNull();
  });

  it("redacts representative credentials before storage or providers", () => {
    const secret = "sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
    const cleaned = stripPrivateData(`token=${secret} Bearer ${secret}`);
    expect(cleaned).not.toContain(secret);
    expect(cleaned).toContain("[REDACTED_SECRET]");
  });
});
