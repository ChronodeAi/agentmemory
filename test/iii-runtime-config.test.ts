import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { materializeIiiRuntimeConfig } from "../src/cli/iii-runtime-config.js";

const roots: string[] = [];

function fixture(): {
  root: string;
  source: string;
  runtime: string;
  data: string;
} {
  const root = mkdtempSync(join(tmpdir(), "agentmemory-iii-config-"));
  roots.push(root);
  const source = join(root, "iii-config.yaml");
  const runtime = join(root, "runtime");
  const data = join(root, "managed-data");
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
      "  - name: iii-state",
      "    config:",
      "      adapter:",
      "        name: kv",
      "        config:",
      "          store_method: file_based",
      "          file_path: ./data/state_store.db",
      "  - name: iii-stream",
      "    config:",
      "      port: 3112",
      "      host: 127.0.0.1",
      "      adapter:",
      "        name: kv",
      "        config:",
      "          store_method: file_based",
      "          file_path: ./data/stream_store",
      "  - name: custom-worker",
      "    config:",
      "      enabled: true",
      "",
    ].join("\n"),
  );
  return { root, source, runtime, data };
}

function storagePath(
  worker: { config: Record<string, unknown> } | undefined,
): unknown {
  const adapter = worker?.config.adapter as
    | { config?: Record<string, unknown> }
    | undefined;
  return adapter?.config?.file_path;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("iii runtime config", () => {
  it("deployment entrypoints prefer injected secrets and never print them", () => {
    const repositoryRoot = join(import.meta.dirname, "..");
    for (const provider of ["coolify", "fly", "railway", "render"]) {
      const entrypoint = readFileSync(
        join(repositoryRoot, "deploy", provider, "entrypoint.sh"),
        "utf8",
      );
      expect(entrypoint).toContain('if [ -n "${AGENTMEMORY_SECRET:-}" ]');
      expect(entrypoint).toContain('SECRET="$AGENTMEMORY_SECRET"');
      expect(entrypoint).not.toMatch(/echo\s+["']?AGENTMEMORY_SECRET=/);
      expect(entrypoint).not.toContain("echo \"$SECRET\"");
    }
  });

  it("materializes canonical ports with current-user persistence paths", () => {
    const { source, runtime, data } = fixture();
    const target = materializeIiiRuntimeConfig(
      source,
      { restPort: 3111, streamPort: 3112, enginePort: 49134 },
      runtime,
      data,
    );
    const config = parseYaml(readFileSync(target, "utf8")) as {
      workers: Array<{ name: string; config: Record<string, unknown> }>;
    };
    const worker = (name: string) =>
      config.workers.find((candidate) => candidate.name === name);

    expect(target).not.toBe(source);
    expect(storagePath(worker("iii-state"))).toBe(join(data, "state_store.db"));
    expect(storagePath(worker("iii-stream"))).toBe(join(data, "stream_store"));
  });

  it("materializes all alternate instance ports without modifying the source", () => {
    const { source, runtime, data } = fixture();
    const original = readFileSync(source, "utf8");
    const target = materializeIiiRuntimeConfig(
      source,
      { restPort: 7311, streamPort: 7312, enginePort: 53334 },
      runtime,
      data,
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
    expect(storagePath(worker("iii-state"))).toBe(
      join(data, "instance-7311", "state_store.db"),
    );
    expect(storagePath(worker("iii-stream"))).toBe(
      join(data, "instance-7311", "stream_store"),
    );
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

  it("preserves absolute custom persistence paths", () => {
    const { source, runtime, data } = fixture();
    const customState = join(data, "operator", "state.db");
    const original = readFileSync(source, "utf8").replace(
      "./data/state_store.db",
      customState,
    );
    writeFileSync(source, original);
    const target = materializeIiiRuntimeConfig(
      source,
      { restPort: 3111, streamPort: 3112, enginePort: 49134 },
      runtime,
      data,
    );
    const config = parseYaml(readFileSync(target, "utf8")) as {
      workers: Array<{ name: string; config: Record<string, unknown> }>;
    };
    expect(
      storagePath(
        config.workers.find((candidate) => candidate.name === "iii-state"),
      ),
    ).toBe(customState);
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
