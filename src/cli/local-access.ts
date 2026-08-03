import { randomBytes } from "node:crypto";
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type AccessFile = {
  directKey: string;
  fileKey: string;
  fileName: string;
};

const ACCESS_FILES: AccessFile[] = [
  {
    directKey: "AGENTMEMORY_SECRET",
    fileKey: "AGENTMEMORY_SECRET_FILE",
    fileName: "secret",
  },
  {
    directKey: "AGENTMEMORY_ADMIN_SECRET",
    fileKey: "AGENTMEMORY_ADMIN_SECRET_FILE",
    fileName: "admin-secret",
  },
  {
    directKey: "AGENTMEMORY_PROJECT_CAPABILITY_SECRET",
    fileKey: "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE",
    fileName: "project-capability-secret",
  },
];

export interface LocalAccessSetupResult {
  envPath: string;
  createdFiles: string[];
  appendedKeys: string[];
}

function activeEnvValue(contents: string, key: string): string | undefined {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 0 || trimmed.slice(0, equals).trim() !== key) continue;
    const value = trimmed.slice(equals + 1).trim();
    if (value) return value;
  }
  return undefined;
}

function ensureValueFile(path: string): boolean {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  if (existsSync(path)) {
    if (readFileSync(path, "utf8").trim()) {
      chmodSync(path, 0o600);
      return false;
    }
    writeFileSync(path, `${randomBytes(32).toString("base64url")}\n`, {
      mode: 0o600,
    });
    return true;
  }
  writeFileSync(path, `${randomBytes(32).toString("base64url")}\n`, {
    flag: "wx",
    mode: 0o600,
  });
  return true;
}

/**
 * Provision the private local files expected by the CLI, viewer proxy, hooks,
 * and MCP connectors. Existing configured values and non-empty files win.
 */
export function ensureLocalAccessConfiguration(
  envPath = join(homedir(), ".agentmemory", ".env"),
): LocalAccessSetupResult {
  const dataDir = dirname(envPath);
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  if (!existsSync(envPath)) {
    writeFileSync(envPath, "# agentmemory local configuration\n", {
      flag: "wx",
      mode: 0o600,
    });
  }
  chmodSync(envPath, 0o600);

  let contents = readFileSync(envPath, "utf8");
  const createdFiles: string[] = [];
  const settings: string[] = [];

  for (const access of ACCESS_FILES) {
    const direct =
      process.env[access.directKey]?.trim() ||
      activeEnvValue(contents, access.directKey);
    const configuredFile =
      process.env[access.fileKey]?.trim() ||
      activeEnvValue(contents, access.fileKey);
    if (direct || configuredFile) continue;

    const path = join(dataDir, access.fileName);
    if (ensureValueFile(path)) createdFiles.push(path);
    settings.push(`${access.fileKey}=~/.agentmemory/${access.fileName}`);
  }

  const defaults: Array<[string, string]> = [
    ["AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE", "agentmemory"],
    ["AGENTMEMORY_STRICT_CAPABILITY_MODE", "true"],
  ];
  for (const [key, value] of defaults) {
    if (process.env[key]?.trim() || activeEnvValue(contents, key)) continue;
    settings.push(`${key}=${value}`);
  }

  if (settings.length > 0) {
    const prefix = contents.endsWith("\n") ? "\n" : "\n\n";
    appendFileSync(
      envPath,
      `${prefix}# Local access files (generated once; values are stored separately)\n${settings.join("\n")}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    contents += `${prefix}${settings.join("\n")}\n`;
  }

  return {
    envPath,
    createdFiles,
    appendedKeys: settings.map((line) => line.slice(0, line.indexOf("="))),
  };
}
