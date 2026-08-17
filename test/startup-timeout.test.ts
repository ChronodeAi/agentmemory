import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStartupTimeBudget,
  startupReconcileTimeoutMs,
} from "../src/state/startup-timeout.js";

describe("startup maintenance time budget", () => {
  afterEach(() => vi.useRealTimers());

  it("bounds operator overrides", () => {
    expect(startupReconcileTimeoutMs()).toBe(120_000);
    expect(startupReconcileTimeoutMs("1")).toBe(10_000);
    expect(startupReconcileTimeoutMs("9999999")).toBe(600_000);
    expect(startupReconcileTimeoutMs("invalid")).toBe(120_000);
  });

  it("shares one deadline across sequential startup operations", async () => {
    vi.useFakeTimers();
    const budget = createStartupTimeBudget(25);
    const first = budget.run("first operation", async () => {
      await new Promise((resolve) => setTimeout(resolve, 15));
    });
    await vi.advanceTimersByTimeAsync(15);
    await first;
    const second = budget.run("second operation", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const rejection = expect(second).rejects.toThrow(
      "startup maintenance timed out during second operation",
    );
    await vi.advanceTimersByTimeAsync(11);
    await rejection;
  });
});
