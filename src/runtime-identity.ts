import { randomUUID } from "node:crypto";

export interface ProcessBootIdentity {
  id: string;
  startedAt: string;
  pid: number;
}

const processBootIdentity: Readonly<ProcessBootIdentity> = Object.freeze({
  id: randomUUID(),
  startedAt: new Date().toISOString(),
  pid: process.pid,
});

export function getProcessBootIdentity(): ProcessBootIdentity {
  return { ...processBootIdentity };
}
