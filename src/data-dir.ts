import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export const DATA_DIR_FLAG = "--data-dir";
export const DATA_DIR_ENV = "AGENTMEMORY_DATA_DIR";

export type DataDirSource = "flag" | "env" | "default";

export interface ResolvedDataDir {
  dir: string;
  source: DataDirSource;
}

export interface ResolveDataDirOptions {
  argv?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  home?: string;
}

// Read a value from argv in both "--data-dir <value>" and
// "--data-dir=<value>" forms. Returns undefined when the flag is absent or
// has no following token.
export function readDataDirFlag(argv: string[]): string | undefined {
  const equalsPrefix = `${DATA_DIR_FLAG}=`;
  for (const arg of argv) {
    if (arg.startsWith(equalsPrefix)) return arg.slice(equalsPrefix.length);
  }
  const idx = argv.indexOf(DATA_DIR_FLAG);
  if (idx !== -1) return argv[idx + 1];
  return undefined;
}

// Expand a leading ~ / ~/ to the given home directory; other values pass
// through unchanged.
export function expandHomePath(pathValue: string, home: string): string {
  if (pathValue === "~") return home;
  if (pathValue.startsWith("~/") || pathValue.startsWith("~\\")) {
    return join(home, pathValue.slice(2));
  }
  return pathValue;
}

// Fork-compat default data directory. Unlike upstream, platform-specific
// directories are intentionally NOT adopted.
export function defaultDataDir(home: string = homedir()): string {
  return join(home, ".agentmemory");
}

function toAbsoluteDataDir(raw: string, cwd: string, home: string): string {
  const expanded = expandHomePath(raw.trim(), home);
  return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}

// Single precedence chain for the agentmemory data dir:
//   --data-dir CLI flag > AGENTMEMORY_DATA_DIR > ~/.agentmemory
// Resolution reads only the real environment and CLI args — never the
// hydrated .env file — so boot stays deterministic (the .env file itself is
// loaded from the resolved data dir afterwards).
export function resolveDataDirDetailed(
  options: ResolveDataDirOptions = {},
): ResolvedDataDir {
  const argv = options.argv ?? process.argv.slice(2);
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? homedir();

  const flagValue = readDataDirFlag(argv);
  if (flagValue !== undefined && flagValue.trim().length > 0) {
    return { dir: toAbsoluteDataDir(flagValue, cwd, home), source: "flag" };
  }

  const envValue = env[DATA_DIR_ENV];
  if (envValue !== undefined && envValue.trim().length > 0) {
    return { dir: toAbsoluteDataDir(envValue, cwd, home), source: "env" };
  }

  return { dir: defaultDataDir(home), source: "default" };
}

export function resolveDataDir(options: ResolveDataDirOptions = {}): string {
  return resolveDataDirDetailed(options).dir;
}

// A legacy cwd-local ./data counts only when it actually holds an
// agentmemory store marker, so unrelated projects that happen to have a
// data/ folder don't trigger the relocation warning.
export function legacyDataDirInCwd(cwd: string = process.cwd()): boolean {
  const legacyDir = resolve(cwd, "data");
  return (
    existsSync(join(legacyDir, "state_store.db")) ||
    existsSync(join(legacyDir, "iii-config.yaml"))
  );
}

// Upstream's d8b5267 adopted a legacy cwd ./data store automatically; this
// fork deliberately does NOT. When state would silently land somewhere
// different from a pre-existing local store, tell the operator to opt in
// with an explicit --data-dir instead of copying anything.
export function warnOnLegacyDataDir(
  options: ResolveDataDirOptions & { write?: (message: string) => void } = {},
): boolean {
  const resolved = resolveDataDirDetailed(options);
  if (resolved.source !== "default") return false;
  const cwd = options.cwd ?? process.cwd();
  if (!legacyDataDirInCwd(cwd)) return false;
  const write =
    options.write ?? ((message: string) => process.stderr.write(message));
  write(
    `[agentmemory] Found a legacy ./data store directory in ${cwd}, but this install keeps its state in ${resolved.dir}. ` +
      `Nothing was copied or moved — pass --data-dir ${join(cwd, "data")} (or set ${DATA_DIR_ENV}) to use the legacy location explicitly.\n`,
  );
  return true;
}
