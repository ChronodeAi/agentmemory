import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("startup maintenance wiring", () => {
  it("shares one fail-closed budget across audit, governance, and search", () => {
    const source = readFileSync("src/index.ts", "utf8");
    expect(source.match(/createStartupTimeBudget\(\)/g)).toHaveLength(1);
    for (const label of [
      "audit-gap recovery",
      "governance-delete reconciliation",
      "canonical search-index reconciliation",
      "canonical search-index rebuild",
      "vector-index repair",
    ]) {
      expect(source).toMatch(
        new RegExp(`startupMaintenanceBudget\\.run\\(\\s+"${label}"`),
      );
    }
    expect(source).toMatch(
      /Pending audit recovery failed[\s\S]*?throw error;/,
    );
  });

  it("persists a successful canonical rebuild even when it is empty", () => {
    const source = readFileSync("src/index.ts", "utf8");
    expect(source).toMatch(
      /if \(indexCount > 0\) bootLog\([\s\S]*?scheduleIndexSave\(\);/,
    );
  });
});
