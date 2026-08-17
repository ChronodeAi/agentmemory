import { describe, expect, it } from "vitest";
import {
  clientAuthorizationHeaders,
  resolveClientRequestScope,
} from "../src/client-auth.js";
import { authorizeProjectRequest } from "../src/auth.js";

const CAPABILITY_SECRET = "client-auth-capability-secret";
const ADMIN_SECRET = "client-auth-admin-secret";
const LEGACY_SECRET = "client-auth-legacy-secret";
const PROJECT = "github.com/example/project";

describe("client request authorization", () => {
  it("signs an exact, short-lived project capability", () => {
    const headers = clientAuthorizationHeaders(
      { kind: "project", project: PROJECT },
      {
        projectCapabilitySecret: CAPABILITY_SECRET,
        strictCapabilityMode: true,
      },
      1_800_000_000,
    );

    expect(headers["x-agentmemory-project"]).toBe(PROJECT);
    expect(
      authorizeProjectRequest(headers, {
        project: PROJECT,
        signingSecret: CAPABILITY_SECRET,
        strictCapabilityMode: true,
        audience: "agentmemory",
        now: 1_800_000_001,
      }).authorized,
    ).toBe(true);
    expect(
      authorizeProjectRequest(headers, {
        project: "github.com/example/other",
        signingSecret: CAPABILITY_SECRET,
        strictCapabilityMode: true,
        audience: "agentmemory",
        now: 1_800_000_001,
      }).authorized,
    ).toBe(false);
  });

  it("uses the administrative secret only for explicit global scope", () => {
    expect(
      clientAuthorizationHeaders(
        { kind: "global" },
        {
          adminSecret: ADMIN_SECRET,
          legacySecret: LEGACY_SECRET,
          projectCapabilitySecret: CAPABILITY_SECRET,
        },
      ),
    ).toEqual({ Authorization: `Bearer ${ADMIN_SECRET}` });
  });

  it("does not silently fall back to legacy authorization in strict mode", () => {
    expect(
      clientAuthorizationHeaders(
        { kind: "project", project: PROJECT },
        {
          legacySecret: LEGACY_SECRET,
          strictCapabilityMode: true,
        },
      ),
    ).toEqual({ "x-agentmemory-project": PROJECT });
  });

  it("allows an explicit compatibility fallback only outside strict mode", () => {
    expect(
      clientAuthorizationHeaders(
        { kind: "project", project: PROJECT },
        {
          legacySecret: LEGACY_SECRET,
          strictCapabilityMode: false,
        },
      ),
    ).toEqual({
      Authorization: `Bearer ${LEGACY_SECRET}`,
      "x-agentmemory-project": PROJECT,
    });
  });

  it("rejects conflicting project or scope bindings", () => {
    expect(() =>
      resolveClientRequestScope(
        `http://localhost/agentmemory/search?project=${encodeURIComponent(PROJECT)}`,
        { project: "github.com/example/other" },
      ),
    ).toThrow("project bindings disagree");
    expect(() =>
      resolveClientRequestScope(
        `http://localhost/agentmemory/search?scope=global`,
        { project: PROJECT },
      ),
    ).toThrow("combine project and global");
  });
});
