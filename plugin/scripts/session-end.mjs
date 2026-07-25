#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { parse } from "dotenv";
import { parse as parse$1 } from "yaml";
//#region src/project-config.ts
const PRIVACY_ORDER = {
	standard: 0,
	private: 1,
	strict: 2
};
const DEFAULT_EXCLUDE_GLOBS = [
	"**/.env",
	"**/.env.*",
	"**/*secret*",
	"**/*credential*",
	"**/.git/**",
	"**/node_modules/**",
	"**/.cache/**",
	"**/dist/**",
	"**/build/**",
	"**/target/**",
	"**/.codex/**",
	"**/.claude/**",
	"**/.agents/**",
	"**/.aiwg/working/**"
];
function asString(value) {
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function asBoolean(value) {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return void 0;
	if (value.trim().toLowerCase() === "true") return true;
	if (value.trim().toLowerCase() === "false") return false;
}
function asList(value) {
	const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : void 0;
	if (!raw) return void 0;
	const result = raw.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean);
	return result.length > 0 ? result : void 0;
}
function asPrivacy(value) {
	return value === "standard" || value === "private" || value === "strict" ? value : void 0;
}
function asCaptureProfile(value) {
	return value === "minimal" || value === "balanced" || value === "full" ? value : void 0;
}
function userHome() {
	return process.env["HOME"] || process.env["USERPROFILE"] || homedir();
}
function expandHome(path) {
	if (path === "~") return userHome();
	if (path.startsWith("~/")) return join(userHome(), path.slice(2));
	return path;
}
function canonicalPath(path) {
	const absolute = resolve(path);
	try {
		return realpathSync.native(absolute);
	} catch {
		return absolute;
	}
}
function projectPathHash(path) {
	return createHash("sha256").update(canonicalPath(path)).digest("hex").slice(0, 24);
}
function git(cwd, args) {
	try {
		return execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			],
			timeout: 750
		}).trim() || void 0;
	} catch {
		return;
	}
}
function findProjectRoot(cwd = process.cwd()) {
	const requested = canonicalPath(cwd);
	return canonicalPath(git(requested, ["rev-parse", "--show-toplevel"]) ?? requested);
}
function normalizeGitRemote(remote) {
	let value = remote.trim();
	if (!value) return void 0;
	const scpMatch = value.match(/^(?:[^@/\s]+@)?([^:/\s]+):(.+)$/);
	if (scpMatch && !value.includes("://")) value = `ssh://${scpMatch[1]}/${scpMatch[2]}`;
	try {
		const parsed = new URL(value);
		if (!parsed.hostname || parsed.protocol === "file:") return void 0;
		const segments = decodeURIComponent(parsed.pathname).replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/i, "").split("/").filter(Boolean);
		if (segments.length < 2) return void 0;
		const hostname = parsed.hostname.toLowerCase();
		return `${parsed.port ? `${hostname}:${parsed.port}` : hostname}/${(["github.com", "gitlab.com"].includes(hostname) ? segments.map((segment) => segment.toLowerCase()) : segments).join("/")}`;
	} catch {
		return;
	}
}
function inferProjectId(root) {
	const remote = git(root, [
		"remote",
		"get-url",
		"origin"
	]) ?? git(root, [
		"remote",
		"get-url",
		"--all",
		"upstream"
	]);
	const normalizedRemote = remote ? normalizeGitRemote(remote) : void 0;
	if (remote && !normalizedRemote) throw new Error("configured Git remote cannot be normalized safely");
	return normalizedRemote ?? `local/${projectPathHash(root)}`;
}
function readConfigFile(path) {
	if (!existsSync(path)) return void 0;
	try {
		const parsed = parse$1(readFileSync(path, "utf8"));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
		const raw = parsed;
		return {
			schema_version: typeof raw["schema_version"] === "number" ? raw["schema_version"] : void 0,
			project_id: asString(raw["project_id"]),
			privacy: asPrivacy(raw["privacy"]),
			capture_profile: asCaptureProfile(raw["capture_profile"]),
			source_roots: asList(raw["source_roots"]),
			decision_roots: asList(raw["decision_roots"]),
			exclude_globs: asList(raw["exclude_globs"]),
			external_processing: asBoolean(raw["external_processing"])
		};
	} catch {
		return;
	}
}
function getUserProjectConfigPath(root) {
	return join(userHome(), ".agentmemory", "projects", `${projectPathHash(root)}.yaml`);
}
function loadAgentmemoryEnvironment() {
	const envPath = join(userHome(), ".agentmemory", ".env");
	let fileEnv = {};
	if (existsSync(envPath)) try {
		fileEnv = parse(readFileSync(envPath));
	} catch {
		fileEnv = {};
	}
	for (const [key, value] of Object.entries(fileEnv)) if (process.env[key] === void 0) process.env[key] = value;
	if (!asString(process.env["AGENTMEMORY_SECRET"])) {
		const secretFile = asString(process.env["AGENTMEMORY_SECRET_FILE"]);
		if (secretFile) try {
			const secret = readFileSync(expandHome(secretFile), "utf8").trim();
			if (secret) process.env["AGENTMEMORY_SECRET"] = secret;
		} catch {}
	}
	return {
		...fileEnv,
		...process.env
	};
}
function envLayer(env) {
	return {
		project_id: asString(env["AGENTMEMORY_PROJECT_ID"]) ?? asString(env["AGENTMEMORY_PROJECT_NAME"]),
		privacy: asPrivacy(env["AGENTMEMORY_PRIVACY"]),
		capture_profile: asCaptureProfile(env["AGENTMEMORY_CAPTURE_PROFILE"]),
		source_roots: asList(env["AGENTMEMORY_SOURCE_ROOTS"]),
		decision_roots: asList(env["AGENTMEMORY_DECISION_ROOTS"]),
		exclude_globs: asList(env["AGENTMEMORY_EXCLUDE_GLOBS"]),
		external_processing: asBoolean(env["AGENTMEMORY_EXTERNAL_PROCESSING"])
	};
}
function mostRestrictivePrivacy(layers) {
	let selected = "strict";
	let found = false;
	for (const layer of layers) {
		if (!layer.privacy) continue;
		if (!found || PRIVACY_ORDER[layer.privacy] > PRIVACY_ORDER[selected]) selected = layer.privacy;
		found = true;
	}
	return found ? selected : "strict";
}
function firstDefined(layersHighToLow, select, fallback) {
	for (const layer of layersHighToLow) {
		const value = select(layer);
		if (value !== void 0) return value;
	}
	return fallback;
}
function resolveProjectConfig(cwd = process.cwd()) {
	const env = loadAgentmemoryEnvironment();
	const root = findProjectRoot(cwd);
	const manifestPath = join(root, ".agentmemory", "project.yaml");
	const explicitOverride = asString(env["AGENTMEMORY_PROJECT_CONFIG"]);
	const overridePath = explicitOverride ? canonicalPath(isAbsolute(explicitOverride) ? expandHome(explicitOverride) : join(root, explicitOverride)) : getUserProjectConfigPath(root);
	const inferred = {
		schema_version: 1,
		project_id: inferProjectId(root),
		privacy: "strict",
		capture_profile: "balanced",
		source_roots: [
			"src",
			"test",
			"tests"
		],
		decision_roots: [
			".aiwg/architecture/adr",
			".aiwg/architecture/adrs",
			".aiwg/decisions/adr",
			"docs/adr",
			"docs/adrs"
		],
		exclude_globs: [...DEFAULT_EXCLUDE_GLOBS],
		external_processing: false
	};
	const repository = readConfigFile(manifestPath) ?? {};
	const user = readConfigFile(overridePath) ?? {};
	const processLayer = envLayer(env);
	const highToLow = [
		processLayer,
		user,
		repository,
		inferred
	];
	const privacy = mostRestrictivePrivacy([
		inferred,
		repository,
		user,
		processLayer
	]);
	const requestedExternal = firstDefined(highToLow, (layer) => layer.external_processing, false);
	return {
		schema_version: 1,
		project_id: firstDefined(highToLow, (layer) => asString(layer.project_id), `local/${projectPathHash(root)}`),
		privacy,
		capture_profile: firstDefined(highToLow, (layer) => layer.capture_profile, "balanced"),
		source_roots: firstDefined(highToLow, (layer) => layer.source_roots, [
			"src",
			"test",
			"tests"
		]),
		decision_roots: firstDefined(highToLow, (layer) => layer.decision_roots, []),
		exclude_globs: firstDefined(highToLow, (layer) => layer.exclude_globs, [...DEFAULT_EXCLUDE_GLOBS]),
		external_processing: privacy === "strict" ? false : requestedExternal,
		root,
		...existsSync(manifestPath) ? { manifest_path: manifestPath } : {},
		...existsSync(overridePath) ? { override_path: overridePath } : {}
	};
}
//#endregion
//#region src/hooks/_project.ts
loadAgentmemoryEnvironment();
function resolveProject(cwd) {
	return resolveProjectConfig(typeof cwd === "string" && cwd.trim() ? cwd : process.cwd()).project_id;
}
//#endregion
//#region src/hooks/session-end.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
const REST_URL = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
const SECRET = process.env["AGENTMEMORY_SECRET"] || "";
function authHeaders() {
	const h = { "Content-Type": "application/json" };
	if (SECRET) h["Authorization"] = `Bearer ${SECRET}`;
	return h;
}
async function main() {
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	let data;
	try {
		data = JSON.parse(input);
	} catch {
		return;
	}
	if (!data || typeof data !== "object") return;
	if (isSdkChildContext(data)) return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	const project = resolveProject(data.cwd);
	fetch(`${REST_URL}/agentmemory/session/end`, {
		method: "POST",
		headers: authHeaders(),
		body: JSON.stringify({
			sessionId,
			project
		}),
		signal: AbortSignal.timeout(3e4)
	}).catch(() => {});
	if (process.env["CONSOLIDATION_ENABLED"] === "true") {
		fetch(`${REST_URL}/agentmemory/crystals/auto`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				olderThanDays: 0,
				project
			}),
			signal: AbortSignal.timeout(6e4)
		}).catch(() => {});
		fetch(`${REST_URL}/agentmemory/consolidate-pipeline`, {
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({
				tier: "all",
				force: true,
				project
			}),
			signal: AbortSignal.timeout(12e4)
		}).catch(() => {});
	}
	if (process.env["CLAUDE_MEMORY_BRIDGE"] === "true") fetch(`${REST_URL}/agentmemory/claude-bridge/sync`, {
		method: "POST",
		headers: authHeaders(),
		signal: AbortSignal.timeout(3e4)
	}).catch(() => {});
	setTimeout(() => process.exit(0), 1500).unref();
}
main().catch(() => process.exit(0));
//#endregion
export {};

//# sourceMappingURL=session-end.mjs.map