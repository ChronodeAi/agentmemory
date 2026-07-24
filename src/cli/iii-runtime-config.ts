import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

interface IiiWorker {
  name?: unknown;
  config?: unknown;
  [key: string]: unknown;
}

interface IiiConfig {
  workers?: unknown;
  [key: string]: unknown;
}

export interface IiiRuntimePorts {
  restPort: number;
  streamPort: number;
  enginePort: number;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function requireWorker(workers: IiiWorker[], name: string): IiiWorker {
  const worker = workers.find((candidate) => candidate.name === name);
  if (!worker) {
    throw new Error(`iii config is missing required worker "${name}"`);
  }
  return worker;
}

function setWorkerPort(worker: IiiWorker, port: number): void {
  const config = asRecord(worker.config);
  config.port = port;
  worker.config = config;
}

function localOrigins(restPort: number, viewerPort: number): string[] {
  return [
    `http://localhost:${restPort}`,
    `http://localhost:${viewerPort}`,
    `http://127.0.0.1:${restPort}`,
    `http://127.0.0.1:${viewerPort}`,
  ];
}

export function materializeIiiRuntimeConfig(
  sourcePath: string,
  ports: IiiRuntimePorts,
  runtimeDir = join(homedir(), ".agentmemory", "runtime"),
): string {
  if (
    ports.restPort === 3111 &&
    ports.streamPort === 3112 &&
    ports.enginePort === 49134
  ) {
    return sourcePath;
  }

  const parsed = parseYaml(readFileSync(sourcePath, "utf8")) as IiiConfig;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("iii config must be a YAML object");
  }
  if (!Array.isArray(parsed.workers)) {
    throw new Error("iii config must define a workers array");
  }

  const workers = parsed.workers as IiiWorker[];
  const http = requireWorker(workers, "iii-http");
  const stream = requireWorker(workers, "iii-stream");
  setWorkerPort(http, ports.restPort);
  setWorkerPort(stream, ports.streamPort);

  const httpConfig = asRecord(http.config);
  const cors = asRecord(httpConfig.cors);
  cors.allowed_origins = localOrigins(ports.restPort, ports.restPort + 2);
  httpConfig.cors = cors;
  http.config = httpConfig;

  let manager = workers.find(
    (candidate) => candidate.name === "iii-worker-manager",
  );
  if (!manager) {
    manager = {
      name: "iii-worker-manager",
      config: { host: "127.0.0.1" },
    };
    const streamIndex = workers.indexOf(stream);
    workers.splice(streamIndex + 1, 0, manager);
  }
  setWorkerPort(manager, ports.enginePort);

  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 });
  const target = join(
    runtimeDir,
    `iii-config-${ports.restPort}-${ports.streamPort}-${ports.enginePort}.yaml`,
  );
  const temporary = `${target}.tmp`;
  writeFileSync(temporary, stringifyYaml(parsed), { mode: 0o600 });
  renameSync(temporary, target);
  return target;
}
