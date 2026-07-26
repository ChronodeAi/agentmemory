import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createProjectCapabilityToken,
  DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
  isStrictCapabilityMode,
  PROJECT_CAPABILITY_PROJECT_HEADER,
} from "../auth.js";

const CAPABILITY_TTL_SECONDS = 300;

function secretFromEnvironmentOrFile(
  environmentName: string,
  fileEnvironmentName: string,
  defaultFileName: string,
): string {
  const direct = process.env[environmentName]?.trim();
  if (direct) return direct;
  const configuredPath =
    process.env[fileEnvironmentName]?.trim() ||
    join(homedir(), ".agentmemory", defaultFileName);
  const path = configuredPath.startsWith("~/")
    ? join(homedir(), configuredPath.slice(2))
    : configuredPath;
  if (!existsSync(path)) return "";
  try {
    return readFileSync(path, "utf8").trim();
  } catch {
    return "";
  }
}

export function projectCapabilitySigningSecret(): string {
  return secretFromEnvironmentOrFile(
    "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
    "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE",
    "project-capability-secret",
  );
}

export function contextAcknowledgementSecret(): string {
  return secretFromEnvironmentOrFile(
    "AGENTMEMORY_CONTEXT_ACK_SECRET",
    "AGENTMEMORY_CONTEXT_ACK_SECRET_FILE",
    "context-ack-secret",
  );
}

export function projectCapability(project: string): string {
  const normalizedProject = project.trim();
  if (!normalizedProject) {
    throw new Error("project scope is required");
  }

  const configuredToken =
    process.env["AGENTMEMORY_PROJECT_CAPABILITY_TOKEN"]?.trim();
  if (configuredToken) return configuredToken;

  const signingSecret = projectCapabilitySigningSecret();
  if (signingSecret) {
    const issuedAt = Math.floor(Date.now() / 1000);
    return createProjectCapabilityToken(
      {
        version: 1,
        audience:
          process.env["AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE"]?.trim() ||
          DEFAULT_PROJECT_CAPABILITY_AUDIENCE,
        project: normalizedProject,
        issuedAt,
        expiresAt: issuedAt + CAPABILITY_TTL_SECONDS,
      },
      signingSecret,
    );
  }

  if (!isStrictCapabilityMode()) {
    return process.env["AGENTMEMORY_SECRET"]?.trim() || "";
  }
  throw new Error("project capability credentials are unavailable");
}

export function projectAuthHeaders(project: string): Record<string, string> {
  const normalizedProject = project.trim();
  const projectToken = projectCapability(normalizedProject);
  return {
    "Content-Type": "application/json",
    [PROJECT_CAPABILITY_PROJECT_HEADER]: normalizedProject,
    ...(projectToken ? { Authorization: `Bearer ${projectToken}` } : {}),
  };
}
