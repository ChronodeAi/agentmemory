import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const home = mkdtempSync(join(tmpdir(), "agentmemory-unit-"));
const workerPids = join(home, "worker-pids.txt");
const vitestJson = join(home, "vitest.json");
writeFileSync(workerPids, "");

const env = {
  HOME: home,
  USERPROFILE: home,
  TMPDIR: tmpdir(),
  TMP: tmpdir(),
  TEMP: tmpdir(),
  PATH: process.env.PATH ?? "",
  CI: "1",
  NO_COLOR: "1",
  TZ: "UTC",
  R13_WORKER_PID_FILE: workerPids,
  R13_VITEST_JSON: vitestJson,
};

for (const name of ["SystemRoot", "ComSpec", "PATHEXT", "WINDIR"]) {
  if (process.env[name]) env[name] = process.env[name];
}

let result;
try {
  result = spawnSync(
    process.execPath,
    [
      join(root, "node_modules", "vitest", "vitest.mjs"),
      "run",
      "--config",
      "vitest.r13.config.ts",
      "--exclude",
      "test/integration.test.ts",
      "--no-color",
      ...process.argv.slice(2),
    ],
    {
      cwd: root,
      env,
      stdio: "inherit",
    },
  );
} finally {
  rmSync(home, { recursive: true, force: true });
}

if (result.error) throw result.error;
if (result.signal) {
  process.stderr.write(`Unit test process ended by ${result.signal}\n`);
}
process.exitCode = result.status ?? 1;
