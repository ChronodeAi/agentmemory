import { describe, expect, it } from "vitest";
import {
  authorizeProjectRequest,
  createProjectCapabilityToken,
  extractProjectBinding,
  PROJECT_CAPABILITY_PROJECT_HEADER,
  verifyProjectCapabilityToken,
} from "../src/auth.js";
import { authorizeProjectScopeRequest } from "../src/project-scope.js";

const signingSecret = "project-capability-signing-secret";
const audience = "agentmemory";
const projectA = "github.com/chronodeai/project-a";
const projectB = "github.com/chronodeai/project-b";

function token(overrides: Partial<{
  audience: string;
  project: string;
  expiresAt: number;
}> = {}): string {
  return createProjectCapabilityToken(
    {
      version: 1,
      audience: overrides.audience ?? audience,
      project: overrides.project ?? projectA,
      expiresAt: overrides.expiresAt ?? Math.floor(Date.now() / 1000) + 60,
      issuedAt: Math.floor(Date.now() / 1000),
      capabilityId: "test-capability",
    },
    signingSecret,
  );
}

function headers(bearer: string) {
  return { authorization: `Bearer ${bearer}` };
}

describe("project capability authorization", () => {
  it("extracts the case-insensitive transport project binding", () => {
    expect(
      extractProjectBinding({
        [PROJECT_CAPABILITY_PROJECT_HEADER]: ` ${projectA} `,
      }),
    ).toBe(projectA);
    expect(
      extractProjectBinding({
        "X-Agentmemory-Project": projectB,
      }),
    ).toBe(projectB);
    expect(
      extractProjectBinding({
        [PROJECT_CAPABILITY_PROJECT_HEADER]: [projectA],
      }),
    ).toBeUndefined();
  });

  it("binds signed capabilities to audience, expiry, and exact project", () => {
    expect(
      verifyProjectCapabilityToken(token(), {
        signingSecret,
        audience,
        project: projectA,
      }),
    ).toMatchObject({ authorized: true, mode: "capability" });
    expect(
      verifyProjectCapabilityToken(token(), {
        signingSecret,
        audience,
        project: projectB,
      }),
    ).toEqual({
      authorized: false,
      statusCode: 401,
      error: "capability_wrong_project",
    });
    expect(
      verifyProjectCapabilityToken(token({ audience: "other-service" }), {
        signingSecret,
        audience,
        project: projectA,
      }),
    ).toMatchObject({ authorized: false, error: "capability_wrong_audience" });
    expect(
      verifyProjectCapabilityToken(
        token({ expiresAt: Math.floor(Date.now() / 1000) - 1 }),
        { signingSecret, audience, project: projectA },
      ),
    ).toMatchObject({ authorized: false, error: "capability_expired" });
  });

  it("rejects tampering and only permits legacy bearer migration when strict mode is disabled", () => {
    const valid = token();
    expect(
      verifyProjectCapabilityToken(`${valid.slice(0, -1)}x`, {
        signingSecret,
        audience,
        project: projectA,
      }),
    ).toMatchObject({ authorized: false, error: "capability_invalid" });

    expect(
      authorizeProjectRequest(headers("legacy-secret"), {
        signingSecret,
        legacySecret: "legacy-secret",
        audience,
        project: projectA,
        strictCapabilityMode: true,
      }),
    ).toEqual({
      authorized: false,
      statusCode: 401,
      error: "legacy_authentication_disabled",
    });
    expect(
      authorizeProjectRequest(headers("legacy-secret"), {
        signingSecret,
        legacySecret: "legacy-secret",
        audience,
        project: projectA,
        strictCapabilityMode: false,
      }),
    ).toEqual({ authorized: true, mode: "legacy" });
  });

  it("keeps global scope administrative-only", () => {
    expect(
      authorizeProjectScopeRequest(
        headers(token()),
        { kind: "global" },
        {
          signingSecret,
          audience,
          adminSecret: "admin-secret",
          strictCapabilityMode: true,
        },
      ),
    ).toMatchObject({ authorized: false });
    expect(
      authorizeProjectScopeRequest(
        headers("admin-secret"),
        { kind: "global" },
        {
          signingSecret,
          audience,
          adminSecret: "admin-secret",
          strictCapabilityMode: true,
        },
      ),
    ).toEqual({ authorized: true, mode: "administrative" });
  });
});
