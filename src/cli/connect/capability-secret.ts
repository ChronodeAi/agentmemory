import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Zero-touch provisioning for the project capability signing credential.
 *
 * Strict project authorization needs a signing secret, and historically the
 * only way to get one was editing ~/.agentmemory/.env by hand. Every `connect`
 * flow now provisions it automatically so a fresh install works without any
 * manual step. Only THIS credential is auto-generated — AGENTMEMORY_SECRET and
 * AGENTMEMORY_ADMIN_SECRET have their own explicit flows.
 */

export function projectCapabilitySecretFile(): string {
  const configured = process.env["AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE"]?.trim();
  const expanded = configured
    ? configured.startsWith("~/")
      ? join(homedir(), configured.slice(2))
      : configured
    : join(homedir(), ".agentmemory", "project-capability-secret");
  return expanded;
}

export interface CapabilityProvisionResult {
  path: string;
  /** True when this call wrote a new secret to disk. */
  provisioned: boolean;
  /** True when a usable value was already on disk and nothing was touched. */
  reused: boolean;
}

export function generateCapabilitySecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Return the existing credential, or generate one (64 hex chars from 32
 * random bytes) written with mode 0600. A file that exists but holds no
 * value is provisioned too — there is no user data to clobber — while a
 * populated file is left byte-for-byte untouched (permissions are tightened
 * best-effort). A symlink at the credential path is refused outright.
 */
export function ensureProjectCapabilitySecret(): CapabilityProvisionResult {
  const path = projectCapabilitySecretFile();
  if (existsSync(path)) {
    // lstat, not stat: a symlink parked at the credential path must be
    // refused before any read or write can follow it to another target.
    let symlinked: boolean;
    try {
      symlinked = lstatSync(path).isSymbolicLink();
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // The file vanished between existsSync and lstat. Match the
        // surrounding unreadable-file outcome instead of throwing raw;
        // doctor surfaces the missing credential.
        return { path, provisioned: false, reused: false };
      }
      throw err;
    }
    if (symlinked) {
      throw new Error(
        "project capability secret path is a symlink; refusing",
      );
    }
    try {
      if (readFileSync(path, "utf8").trim()) {
        // The file pre-existed under the operator's home; tighten it when
        // the filesystem allows, but never fail connect over a chmod.
        try {
          chmodSync(path, 0o600);
        } catch (err) {
          process.stderr.write(
            `[agentmemory] could not tighten permissions on ${path}: ${err instanceof Error ? err.message : String(err)}\n`,
          );
        }
        return { path, provisioned: false, reused: true };
      }
    } catch {
      // Unreadable file contents are not ours to overwrite; doctor surfaces it.
      return { path, provisioned: false, reused: false };
    }
  }

  const secret = generateCapabilitySecret();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  // The mode flag applies only at file creation; chmod covers the
  // pre-existing-but-empty case so the credential is never world-readable.
  writeFileSync(path, `${secret}\n`, { encoding: "utf8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // A partial credential that could not be secured must not stay on
    // disk for another process to read; remove it and fail loud.
    try {
      unlinkSync(path);
    } catch {
      // Nothing further to clean up; the chmod failure below is reported.
    }
    throw new Error(
      "could not secure project capability secret (chmod failed); removed partial file",
    );
  }
  return { path, provisioned: true, reused: false };
}
