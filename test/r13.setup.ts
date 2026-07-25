import { appendFileSync } from "node:fs";

const pidFile = process.env.R13_WORKER_PID_FILE;
if (!pidFile) {
  throw new Error("R13_WORKER_PID_FILE is required by the canonical profile");
}
appendFileSync(pidFile, `${process.pid}\n`, "utf8");
