import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { createHmac, randomBytes } from "node:crypto";
import { homedir } from "node:os";
//#region src/data-dir.ts
const DATA_DIR_FLAG = "--data-dir";
const DATA_DIR_ENV = "AGENTMEMORY_DATA_DIR";
function readDataDirFlag(argv) {
	const equalsPrefix = `${DATA_DIR_FLAG}=`;
	for (const arg of argv) if (arg.startsWith(equalsPrefix)) return arg.slice(equalsPrefix.length);
	const idx = argv.indexOf(DATA_DIR_FLAG);
	if (idx !== -1) return argv[idx + 1];
}
function expandHomePath(pathValue, home) {
	if (pathValue === "~") return home;
	if (pathValue.startsWith("~/") || pathValue.startsWith("~\\")) return join(home, pathValue.slice(2));
	return pathValue;
}
function defaultDataDir(home = homedir()) {
	return join(home, ".agentmemory");
}
function toAbsoluteDataDir(raw, cwd, home) {
	const expanded = expandHomePath(raw.trim(), home);
	return isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
}
function resolveDataDirDetailed(options = {}) {
	const argv = options.argv ?? process.argv.slice(2);
	const env = options.env ?? process.env;
	const cwd = options.cwd ?? process.cwd();
	const home = options.home ?? homedir();
	const flagValue = readDataDirFlag(argv);
	if (flagValue !== void 0 && flagValue.trim().length > 0) return {
		dir: toAbsoluteDataDir(flagValue, cwd, home),
		source: "flag"
	};
	const envValue = env[DATA_DIR_ENV];
	if (envValue !== void 0 && envValue.trim().length > 0) return {
		dir: toAbsoluteDataDir(envValue, cwd, home),
		source: "env"
	};
	return {
		dir: defaultDataDir(home),
		source: "default"
	};
}
function resolveDataDir(options = {}) {
	return resolveDataDirDetailed(options).dir;
}
//#endregion
//#region src/config.ts
let envFileCache;
function envFilePath() {
	return join(resolveDataDir(), ".env");
}
function loadEnvFile() {
	if (envFileCache) return envFileCache;
	const envFile = envFilePath();
	if (!existsSync(envFile)) {
		envFileCache = {};
		return envFileCache;
	}
	const content = readFileSync(envFile, "utf-8");
	const vars = {};
	for (const line of content.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eqIdx = trimmed.indexOf("=");
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let val = trimmed.slice(eqIdx + 1).trim();
		const quoteChar = val[0] === "\"" || val[0] === "'" ? val[0] : "";
		if (quoteChar) {
			const closeIdx = val.indexOf(quoteChar, 1);
			if (closeIdx !== -1) val = val.slice(1, closeIdx);
		} else {
			const hashIdx = val.indexOf(" #");
			if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
		}
		vars[key] = val;
	}
	envFileCache = vars;
	return envFileCache;
}
function hydrateProcessEnvFromFile() {
	for (const [k, v] of Object.entries(loadEnvFile())) if (process.env[k] === void 0) process.env[k] = v;
}
function getMergedEnv(overrides) {
	return {
		...loadEnvFile(),
		...process.env,
		...overrides
	};
}
function getStandalonePersistPath() {
	const configured = getMergedEnv()["STANDALONE_PERSIST_PATH"]?.trim();
	return configured ? configured : join(resolveDataDir(), "standalone.json");
}
randomBytes(32);
const PROJECT_CAPABILITY_TOKEN_VERSION = "amcap1";
const DEFAULT_PROJECT_CAPABILITY_AUDIENCE = "agentmemory";
const PROJECT_CAPABILITY_PROJECT_HEADER = "x-agentmemory-project";
function hmac(value, secret) {
	return createHmac("sha256", secret).update(value).digest("base64url");
}
function createProjectCapabilityToken(claims, signingSecret) {
	if (!signingSecret) throw new Error("project capability signing secret is required");
	const normalized = {
		version: 1,
		audience: claims.audience.trim(),
		project: claims.project.trim(),
		expiresAt: claims.expiresAt,
		...claims.issuedAt !== void 0 ? { issuedAt: claims.issuedAt } : {},
		...claims.capabilityId ? { capabilityId: claims.capabilityId.trim() } : {}
	};
	if (!normalized.audience || !normalized.project || !Number.isSafeInteger(normalized.expiresAt)) throw new Error("invalid project capability claims");
	const signed = `${PROJECT_CAPABILITY_TOKEN_VERSION}.${Buffer.from(JSON.stringify(normalized)).toString("base64url")}`;
	return `${signed}.${hmac(signed, signingSecret)}`;
}
function isStrictCapabilityMode(value = process.env["AGENTMEMORY_STRICT_CAPABILITY_MODE"]) {
	return ![
		"false",
		"0",
		"off"
	].includes((value ?? "").trim().toLowerCase());
}
//#endregion
export { getStandalonePersistPath as a, isStrictCapabilityMode as i, PROJECT_CAPABILITY_PROJECT_HEADER as n, hydrateProcessEnvFromFile as o, createProjectCapabilityToken as r, resolveDataDir as s, DEFAULT_PROJECT_CAPABILITY_AUDIENCE as t };
