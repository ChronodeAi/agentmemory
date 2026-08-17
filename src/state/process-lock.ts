import { createHash, randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type ProcessLockOptions = {
  root?: string;
  timeoutMs?: number;
  staleAfterMs?: number;
};

type LockOwner = {
  pid: number;
  token: string;
  acquiredAt: string;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readOwner(path: string): LockOwner | null {
  try {
    const parsed = JSON.parse(readFileSync(join(path, "owner.json"), "utf8")) as
      Partial<LockOwner>;
    if (
      Number.isInteger(parsed.pid) &&
      (parsed.pid ?? 0) > 0 &&
      typeof parsed.token === "string" &&
      parsed.token.length > 0 &&
      typeof parsed.acquiredAt === "string"
    ) {
      return parsed as LockOwner;
    }
  } catch {}
  return null;
}

function reapAbandonedLock(path: string, staleAfterMs: number): boolean {
  let oldEnough = false;
  try {
    oldEnough = Date.now() - statSync(path).mtimeMs >= staleAfterMs;
  } catch {
    return true;
  }
  const owner = readOwner(path);
  // A complete owner record proves lock publication finished, so a dead owner
  // can be reaped immediately after a crash. An absent/malformed owner may be
  // the narrow mkdir -> owner.json creation window and still requires age.
  const abandoned = owner ? !processExists(owner.pid) : oldEnough;
  if (abandoned) {
    const quarantine = `${path}.stale-${process.pid}-${randomBytes(6).toString("hex")}`;
    try {
      renameSync(path, quarantine);
      rmSync(quarantine, { recursive: true, force: true });
      return true;
    } catch {}
  }
  return false;
}

export async function withProcessLock<T>(
  key: string,
  operation: () => Promise<T> | T,
  options: ProcessLockOptions = {},
): Promise<T> {
  const configuredRoot =
    process.env["AGENTMEMORY_PROCESS_LOCK_DIR"]?.trim() || undefined;
  const root =
    options.root ??
    configuredRoot ??
    join(homedir(), ".agentmemory", "locks");
  const timeoutMs = options.timeoutMs ?? 5_000;
  const staleAfterMs = options.staleAfterMs ?? 60_000;
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const digest = createHash("sha256").update(key).digest("hex");
  const path = join(root, `${digest}.lock`);
  const owner: LockOwner = {
    pid: process.pid,
    token: randomBytes(16).toString("hex"),
    acquiredAt: new Date().toISOString(),
  };
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      mkdirSync(path, { mode: 0o700 });
      writeFileSync(join(path, "owner.json"), `${JSON.stringify(owner)}\n`, {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (reapAbandonedLock(path, staleAfterMs)) continue;
      if (Date.now() >= deadline) {
        throw new Error(`process lock timeout for ${key}`);
      }
      await delay(10);
    }
  }

  try {
    return await operation();
  } finally {
    if (readOwner(path)?.token === owner.token) {
      rmSync(path, { recursive: true, force: true });
    }
  }
}
