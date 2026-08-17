import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

interface Config {
  workers: Array<{ name: string }>;
}

describe.each(["iii-config.yaml", "iii-config.docker.yaml"])(
  "%s",
  (filename) => {
    it("lets the CLI own the single Agentmemory worker process", () => {
      const config = parseYaml(
        readFileSync(join(process.cwd(), filename), "utf8"),
      ) as Config;
      const names = config.workers.map((worker) => worker.name);

      expect(names).toContain("iii-http");
      expect(names).toContain("iii-stream");
      expect(names).not.toContain("iii-exec");
    });
  },
);
