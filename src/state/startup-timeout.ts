const DEFAULT_STARTUP_RECONCILE_TIMEOUT_MS = 120_000;
const MIN_STARTUP_RECONCILE_TIMEOUT_MS = 10_000;
const MAX_STARTUP_RECONCILE_TIMEOUT_MS = 600_000;

export function startupReconcileTimeoutMs(
  raw = process.env.AGENTMEMORY_STARTUP_RECONCILE_TIMEOUT_MS,
): number {
  if (!raw) return DEFAULT_STARTUP_RECONCILE_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_STARTUP_RECONCILE_TIMEOUT_MS;
  }
  return Math.min(
    MAX_STARTUP_RECONCILE_TIMEOUT_MS,
    Math.max(MIN_STARTUP_RECONCILE_TIMEOUT_MS, parsed),
  );
}

export interface StartupTimeBudget {
  run<T>(label: string, operation: () => Promise<T>): Promise<T>;
}

export function createStartupTimeBudget(
  timeoutMs = startupReconcileTimeoutMs(),
): StartupTimeBudget {
  const deadline = Date.now() + Math.max(1, timeoutMs);
  return {
    async run<T>(label: string, operation: () => Promise<T>): Promise<T> {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        throw new Error(`startup maintenance timed out before ${label}`);
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error(`startup maintenance timed out during ${label}`)),
              remainingMs,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}
