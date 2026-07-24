import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { materializeIiiRuntimeConfig } from "../src/cli/iii-runtime-config.js";

const roots: string[] = [];

function fixture(): { root: string; source: string; runtime: string } {
  const root = mkdtempSync(join(tmpdir(), "agentmemory-iii-config-"));
  roots.push(root);
  const source = join(root, "iii-config.yaml");
  const runtime = join(root, "runtime");
  writeFileSync(
    source,
    [
      "workers:",
      "  - name: iii-http",
      "    config:",
      "      port: 3111",
      "      host: 127.0.0.1",
      "      cors:",
      "        allowed_origins: [http://localhost:3111]",
      "        allowed_methods: [GET, POST]",
      "  - name: iii-stream",
      "    config:",
      "      port: 3112",
      "      host: 127.0.0.1",
      "  - name: custom-worker",
      "    config:",
      "      enabled: true",
      "",
    ].join("\n"),
  );
  return { root, source, runtime };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("iii runtime config", () => {
  it("returns the source config for canonical ports", () => {
    const { source, runtime } = fixture();
    expect(
      materializeIiiRuntimeConfig(
        source,
        { restPort: 3111, streamPort: 3112, enginePort: 49134 },
        runtime,
      ),
    ).toBe(source);
  });

  it("materializes all alternate instance ports without modifying the source", () => {
    const { source, runtime } = fixture();
    const original = readFileSync(source, "utf8");
    const target = materializeIiiRuntimeConfig(
      source,
      { restPort: 7311, streamPort: 7312, enginePort: 53334 },
      runtime,
    );
    const config = parseYaml(readFileSync(target, "utf8")) as {
      workers: Array<{
        name: string;
        config: Record<string, unknown>;
      }>;
    };
    const worker = (name: string) =>
      config.workers.find((candidate) => candidate.name === name);

    expect(target).not.toBe(source);
    expect(readFileSync(source, "utf8")).toBe(original);
    expect(worker("iii-http")?.config.port).toBe(7311);
    expect(worker("iii-stream")?.config.port).toBe(7312);
    expect(worker("iii-worker-manager")?.config.port).toBe(53334);
    expect(worker("custom-worker")?.config.enabled).toBe(true);
    expect(
      (worker("iii-http")?.config.cors as { allowed_origins: string[] })
        .allowed_origins,
    ).toEqual([
      "http://localhost:7311",
      "http://localhost:7313",
      "http://127.0.0.1:7311",
      "http://127.0.0.1:7313",
    ]);
  });

  it("fails closed when required port-bearing workers are absent", () => {
    const { source, runtime } = fixture();
    writeFileSync(source, "workers:\n  - name: custom-worker\n");
    expect(() =>
      materializeIiiRuntimeConfig(
        source,
        { restPort: 7311, streamPort: 7312, enginePort: 53334 },
        runtime,
      ),
    ).toThrow('missing required worker "iii-http"');
  });
});
