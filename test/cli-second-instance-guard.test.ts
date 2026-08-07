import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CLI second-instance guards", () => {
  const source = readFileSync("src/cli.ts", "utf8");

  it("rejects unknown command words instead of booting the server", () => {
    expect(source).toContain("async function unknownCommand()");
    expect(source).toContain("commands[first] ??");
    expect(source).toContain(
      '(first && !first.startsWith("-") ? unknownCommand : main)',
    );
  });

  it("checks livez before the boot path performs setup", () => {
    const mainStart = source.indexOf("async function main()");
    const probe = source.indexOf("await probeLiveDaemon()", mainStart);
    const reset = source.indexOf("if (IS_RESET)", mainStart);
    expect(probe).toBeGreaterThan(mainStart);
    expect(probe).toBeLessThan(reset);
  });
});
