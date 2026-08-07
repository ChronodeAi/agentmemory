import { existsSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { homedir, platform } from "node:os";

export type DataDirSource =
  | "flag"
  | "env"
  | "chronode"
  | "legacy"
  | "default";

export type ResolvedDataDir = {
  dataDir: string;
  source: DataDirSource;
  relocatedFrom?: string;
};

type ResolveDataDirOptions = {
  args?: string[];
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  home?: string;
  platform?: NodeJS.Platform;
};

function argValue(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function absolutePath(pathValue: string, cwd: string, home: string): string {
  const expanded =
    pathValue === "~"
      ? home
      : pathValue.startsWith("~/") || pathValue.startsWith("~\\")
        ? join(home, pathValue.slice(2))
        : pathValue;
  return isAbsolute(expanded) ? resolve(expanded) : resolve(cwd, expanded);
}

function hasAgentmemoryStore(pathValue: string): boolean {
  return (
    existsSync(join(pathValue, "state_store.db")) ||
    existsSync(join(pathValue, "stream_store")) ||
    existsSync(join(pathValue, "iii-config.yaml"))
  );
}

function platformDefaultDataDir(
  env: NodeJS.ProcessEnv,
  home: string,
  nodePlatform: NodeJS.Platform,
  useXdg = true,
): string {
  if (nodePlatform === "darwin") {
    return join(home, "Library", "Application Support", "agentmemory");
  }
  if (nodePlatform === "win32") {
    return env["APPDATA"]
      ? join(env["APPDATA"], "agentmemory")
      : join(home, ".agentmemory");
  }
  const xdg = env["XDG_DATA_HOME"];
  if (useXdg && xdg && isAbsolute(xdg)) return join(xdg, "agentmemory");
  return join(home, ".local", "share", "agentmemory");
}

function nearestGitParent(pathValue: string): string | undefined {
  let current = resolve(pathValue);
  while (true) {
    if (existsSync(join(current, ".git"))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function isWithin(parent: string, child: string): boolean {
  const fromParent = relative(parent, child);
  return (
    fromParent === "" ||
    (fromParent !== ".." &&
      !fromParent.startsWith(`..${sep}`) &&
      !isAbsolute(fromParent))
  );
}

export function resolveDataDir(
  options: ResolveDataDirOptions = {},
): ResolvedDataDir {
  const args = options.args ?? process.argv.slice(2);
  const env = options.env ?? process.env;
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? homedir();
  const nodePlatform = options.platform ?? platform();
  const parsedInstance = Number.parseInt(argValue(args, "--instance") ?? "0", 10);
  const instance =
    Number.isInteger(parsedInstance) && parsedInstance > 0 && parsedInstance <= 50
      ? parsedInstance
      : 0;
  const forInstance = (base: string) =>
    instance ? join(base, `instance-${instance}`) : base;

  const flag = argValue(args, "--data-dir")?.trim();
  if (flag) {
    return {
      dataDir: forInstance(absolutePath(flag, cwd, home)),
      source: "flag",
    };
  }

  const configured = env["AGENTMEMORY_DATA_DIR"]?.trim();
  if (configured) {
    return {
      dataDir: forInstance(absolutePath(configured, cwd, home)),
      source: "env",
    };
  }

  // Chronode releases have always stored native iii state here. Preserve it
  // before considering a platform-default migration so upgrades cannot appear
  // to lose an existing memory corpus.
  const chronodeDir = join(home, ".agentmemory", "data");
  if (hasAgentmemoryStore(chronodeDir)) {
    return { dataDir: forInstance(chronodeDir), source: "chronode" };
  }

  const legacyDir = resolve(cwd, "data");
  if (instance === 0 && hasAgentmemoryStore(legacyDir)) {
    return { dataDir: legacyDir, source: "legacy" };
  }

  const defaultDir = platformDefaultDataDir(env, home, nodePlatform);
  const gitParent = nearestGitParent(cwd);
  if (gitParent && isWithin(gitParent, defaultDir)) {
    const relocated = platformDefaultDataDir(env, home, nodePlatform, false);
    if (relocated !== defaultDir) {
      return {
        dataDir: forInstance(relocated),
        source: "default",
        relocatedFrom: defaultDir,
      };
    }
  }

  return { dataDir: forInstance(defaultDir), source: "default" };
}
