import { existsSync, renameSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { resolveDataDir } from "../data-dir.js";
import { logger } from "../logger.js";
import { STREAM } from "./schema.js";

// The viewer live stream (`stream::send`/`stream::set` with group
// STREAM.viewerGroup) persists through iii-stream's file-backed adapter as one
// append-only .bin per stream group and grows without bound. This module caps
// that one file; per-session streams stay small and are not rotated.
export const DEFAULT_LIVE_STREAM_MAX_BYTES = 33_554_432;

export function resolveLiveStreamMaxBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = Number(env.AGENTMEMORY_LIVE_STREAM_MAX_BYTES);
  if (!Number.isFinite(raw)) return DEFAULT_LIVE_STREAM_MAX_BYTES;
  if (raw === 0) return 0;
  if (raw < 0) return DEFAULT_LIVE_STREAM_MAX_BYTES;
  return Math.floor(raw);
}

export function viewerLiveStreamPath(dataDir: string = resolveDataDir()): string {
  // The stream store lives under <data-dir>/data/stream_store — the same
  // layout iii-runtime-config materializes and health resources inventory.
  return join(
    dataDir,
    "data",
    "stream_store",
    `stream%3A${STREAM.name}%3A${STREAM.viewerGroup}.bin`,
  );
}

export interface LiveStreamRotationOptions {
  dataDir?: string;
  filePath?: string;
  maxBytes?: number;
  env?: NodeJS.ProcessEnv;
  nowMs?: number;
}

// Minimum interval between two rotations. Without it a rotation can thrash:
// the engine keeps the full stream in memory, so its first save after a
// rotation re-materializes the entire history into the fresh file — if that
// still exceeds the cap (it does until the engine restarts or trims), every
// subsequent publish would rename and rewrite ~cap bytes forever. One
// rotation per cooldown window bounds disk without the storm.
export const ROTATION_COOLDOWN_MS = 10 * 60_000;

let lastRotationAtMs = 0;

// How long a retired `.prev` generation is kept before the next rotation may
// discard it up front. Reclaiming an expired generation before the rename
// frees its bytes while the oversized current file is still in place; a fresh
// generation is left for the rename to replace atomically.
export const DEFAULT_LIVE_STREAM_PREV_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveLiveStreamPrevTtlDays(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const parsed = Number.parseInt(
    env.AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS ?? "",
    10,
  );
  // Mirrors resolveLiveStreamMaxBytes: unset, unparsable, or negative values
  // fall back to the default; zero is an explicit opt-out that keeps every
  // .prev generation until the next rename replaces it.
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_LIVE_STREAM_PREV_TTL_DAYS;
  }
  return parsed;
}

function isExpiredPreviousStream(
  previousPath: string,
  nowMs: number,
  ttlDays: number,
): boolean {
  if (ttlDays <= 0) return false;
  try {
    return statSync(previousPath).mtimeMs <= nowMs - ttlDays * DAY_MS;
  } catch {
    // An unstatable .prev (stat race) defers to the rename below, whose own
    // catch reports any replacement failure.
    return false;
  }
}

// Rotates the viewer live stream when its persisted file has outgrown
// AGENTMEMORY_LIVE_STREAM_MAX_BYTES: the current file is renamed to
// `<path>.prev` (replacing any previous generation) so the engine's next
// append starts a fresh file. An existing .prev older than
// AGENTMEMORY_LIVE_STREAM_PREV_TTL_DAYS days (default 30, 0 opts out) is
// unlinked before the rename so its bytes are reclaimed while the oversized
// current file still exists; the engine opens the store by path per append
// (no long-lived fd), so no engine restart or cooperation is needed.
//
// Best-effort by contract: every failure — missing file, stat error, stuck
// .prev removal, rename race — degrades to "keep appending to the oversized
// file" and at most one warn line per failed step, because blocking or
// failing an observation publish to save disk would be the wrong trade.
//
// Under vitest the default path would point at the operator's real store
// (tests share HOME and no engine owns the file there), so default-path
// rotation is disabled in test workers; callers that inject filePath or
// maxBytes bypass the guard so the rotation logic itself stays testable.
export function rotateLiveStreamIfOversized(
  options: LiveStreamRotationOptions = {},
): boolean {
  const injected =
    options.filePath !== undefined ||
    options.maxBytes !== undefined ||
    options.dataDir !== undefined;
  if (!injected && process.env.VITEST) return false;

  const maxBytes = options.maxBytes ?? resolveLiveStreamMaxBytes(options.env);
  if (maxBytes <= 0) return false;

  const filePath = options.filePath ?? viewerLiveStreamPath(options.dataDir);

  let size: number;
  try {
    size = statSync(filePath).size;
  } catch {
    // No persisted stream yet (first boot, fresh data dir) — nothing to
    // rotate and nothing to warn about; the engine creates the file on the
    // next append.
    return false;
  }
  if (size <= maxBytes) return false;

  const nowMs = options.nowMs ?? Date.now();
  if (nowMs - lastRotationAtMs < ROTATION_COOLDOWN_MS) return false;

  try {
    const previousPath = `${filePath}.prev`;
    if (
      existsSync(previousPath) &&
      isExpiredPreviousStream(
        previousPath,
        nowMs,
        resolveLiveStreamPrevTtlDays(options.env),
      )
    ) {
      try {
        rmSync(previousPath);
      } catch (error) {
        // Best-effort: an unremovable stale generation (permissions, occupied
        // directory) must not block the rotation; the rename below replaces
        // the target on its own where the platform allows it.
        logger.warn("expired live stream .prev could not be removed", {
          previousPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    renameSync(filePath, previousPath);
    lastRotationAtMs = nowMs;
    return true;
  } catch (error) {
    logger.warn("live stream rotation failed; keeping oversized stream", {
      filePath,
      sizeBytes: size,
      maxBytes,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
