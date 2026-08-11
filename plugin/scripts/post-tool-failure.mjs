#!/usr/bin/env node
import { createHash, createHmac, randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { isAbsolute, join, relative, resolve } from "node:path";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
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
function globToRegExp(glob) {
	let pattern = "";
	for (let i = 0; i < glob.length; i++) {
		const char = glob[i];
		const next = glob[i + 1];
		if (char === "*" && next === "*") if (glob[i + 2] === "/") {
			pattern += "(?:.*/)?";
			i += 2;
		} else {
			pattern += ".*";
			i++;
		}
		else if (char === "*") pattern += "[^/]*";
		else if (char === "?") pattern += "[^/]";
		else pattern += char.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
	}
	return new RegExp(`^${pattern}$`, "i");
}
function normalizedProjectPath(path, root) {
	return relative(root, isAbsolute(path) ? path : resolve(root, path)).replace(/\\/g, "/").replace(/^\.\//, "");
}
function isProjectPathExcluded(path, config) {
	const normalized = normalizedProjectPath(path, config.root);
	return config.exclude_globs.some((glob) => globToRegExp(glob).test(normalized));
}
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
function git$1(cwd, args) {
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
	return canonicalPath(git$1(requested, ["rev-parse", "--show-toplevel"]) ?? requested);
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
	const remote = git$1(root, [
		"remote",
		"get-url",
		"origin"
	]) ?? git$1(root, [
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
//#region src/hooks/_capture.ts
const METADATA_ONLY_TOOLS = /(?:^|[_-])(read|view|open|search|grep|glob|find|list|status|inspect|query)(?:$|[_-])/i;
const HIGH_VALUE_TOOLS = /(?:edit|write|create|patch|apply|test|spec|migrat|commit|task|decision|deploy|build)/i;
const MUTATION_TOOLS = /(?:edit|write|create|patch|apply|delete|remove|unlink)/i;
function serialize(value) {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value ?? "");
	} catch {
		return String(value);
	}
}
function truncate(value, max) {
	const serialized = serialize(value);
	if (serialized.length <= max) return value;
	return `${serialized.slice(0, max)}\n[...truncated]`;
}
function collectPaths(value, depth = 0) {
	if (depth > 4 || value === null || value === void 0) return [];
	if (Array.isArray(value)) return value.flatMap((item) => collectPaths(item, depth + 1));
	if (typeof value !== "object") return [];
	const result = [];
	for (const [key, item] of Object.entries(value)) if (typeof item === "string" && /(?:^|_)(?:file|path|cwd|directory|dir)(?:$|_)/i.test(key)) result.push(item);
	else if (typeof item === "object") result.push(...collectPaths(item, depth + 1));
	return result;
}
function collectPotentialPathReferences(value, depth = 0) {
	if (depth > 4 || value === null || value === void 0) return [];
	if (Array.isArray(value)) return value.flatMap((item) => collectPotentialPathReferences(item, depth + 1));
	if (typeof value === "string") return value.split(/[\s"'`=()[\]{}:,;|<>]+/).map((token) => token.trim()).filter((token) => token.length > 0 && (token.includes("/") || token.startsWith(".env") || /secret|credential/i.test(token)));
	if (typeof value !== "object") return [];
	return Object.values(value).flatMap((item) => collectPotentialPathReferences(item, depth + 1));
}
function git(cwd, args) {
	try {
		return execFileSync("git", args, {
			cwd,
			encoding: "utf8",
			timeout: 1e3,
			maxBuffer: 1024 * 1024,
			stdio: [
				"ignore",
				"pipe",
				"ignore"
			]
		}).trim();
	} catch {
		return null;
	}
}
function credentialFreeWorktreeId(project, worktreeRoot) {
	return `wt_${createHash("sha256").update(project).update("\0").update(resolve(worktreeRoot)).digest("hex").slice(0, 32)}`;
}
function mutationOperation(toolName) {
	if (/(?:delete|remove|unlink)/i.test(toolName)) return "delete";
	if (/(?:write|create)/i.test(toolName)) return "write";
	if (/(?:edit|patch|apply)/i.test(toolName)) return "edit";
	return null;
}
function patchTransitions(input) {
	const transitions = [];
	for (const match of input.matchAll(/^\*\*\* (Add|Update|Delete) File: (.+)$/gm)) {
		const action = match[1];
		const path = match[2]?.trim();
		if (!path) continue;
		transitions.push({
			path,
			operation: action === "Add" ? "write" : action === "Delete" ? "delete" : "edit"
		});
	}
	return transitions;
}
function collectMutationPaths(value, operation, depth = 0) {
	if (depth > 4 || value === null || value === void 0) return [];
	if (typeof value === "string") return patchTransitions(value);
	if (Array.isArray(value)) return value.flatMap((item) => collectMutationPaths(item, operation, depth + 1));
	if (typeof value !== "object") return [];
	const transitions = [];
	for (const [key, item] of Object.entries(value)) if (typeof item === "string" && /(?:^|_)(?:file|path)(?:$|_)/i.test(key)) transitions.push({
		path: item,
		operation
	});
	else if (typeof item === "object") transitions.push(...collectMutationPaths(item, operation, depth + 1));
	return transitions;
}
function captureWorktreeProvenance(toolName, toolInput, config) {
	const operation = mutationOperation(toolName);
	if (!operation) return void 0;
	const worktreeRoot = git(config.root, ["rev-parse", "--show-toplevel"]);
	const baseHeadSha = git(config.root, ["rev-parse", "HEAD"]);
	if (!worktreeRoot || !baseHeadSha) return void 0;
	const worktreePrefix = git(config.root, ["rev-parse", "--show-prefix"]) || "";
	const seen = /* @__PURE__ */ new Set();
	const transitions = [];
	for (const candidate of collectMutationPaths(toolInput, operation)) {
		const path = `${worktreePrefix}${normalizedProjectPath(candidate.path, config.root)}`;
		if (!path || path === ".." || path.startsWith("../") || isProjectPathExcluded(candidate.path, config)) continue;
		const key = `${candidate.operation}\0${path}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const digest = candidate.operation === "delete" ? git(worktreeRoot, ["rev-parse", `HEAD:${path}`]) : git(worktreeRoot, [
			"hash-object",
			"--",
			path
		]);
		if (!digest) continue;
		transitions.push({
			path,
			operation: candidate.operation,
			digest,
			digestKind: "git-blob"
		});
	}
	if (transitions.length === 0) return void 0;
	const status = git(worktreeRoot, [
		"status",
		"--porcelain",
		"--untracked-files=normal"
	]);
	return {
		project: config.project_id,
		worktreeId: credentialFreeWorktreeId(config.project_id, worktreeRoot),
		baseHeadSha,
		dirty: Boolean(status),
		transitions
	};
}
function metadataInput(input) {
	const raw = input && typeof input === "object" && !Array.isArray(input) ? input : {};
	const kept = {};
	for (const key of [
		"file_path",
		"path",
		"file",
		"pattern",
		"query",
		"cmd",
		"command",
		"workdir",
		"cwd"
	]) if (raw[key] !== void 0) kept[key] = truncate(raw[key], 500);
	return kept;
}
function outputMetadata(output) {
	const serialized = serialize(output);
	return {
		capture: "metadata-only",
		output_chars: serialized.length,
		output_sha256: createHash("sha256").update(serialized).digest("hex")
	};
}
function captureToolEvent(toolName, toolInput, toolOutput, config, failed = false) {
	const name = typeof toolName === "string" ? toolName : "unknown";
	if ([...collectPaths(toolInput), ...collectPotentialPathReferences(toolInput)].some((path) => isProjectPathExcluded(path, config))) return null;
	const profile = config.capture_profile;
	const highValue = failed || HIGH_VALUE_TOOLS.test(name);
	if (profile === "minimal" && !highValue) return null;
	const provenance = !failed && MUTATION_TOOLS.test(name) ? captureWorktreeProvenance(name, toolInput, config) : void 0;
	if (profile === "balanced" && !highValue && METADATA_ONLY_TOOLS.test(name)) return {
		toolInput: metadataInput(toolInput),
		toolOutput: outputMetadata(toolOutput),
		capture: "metadata-only"
	};
	return {
		toolInput: truncate(toolInput, highValue ? 8e3 : 1e3),
		toolOutput: truncate(toolOutput, highValue ? 8e3 : 1e3),
		capture: "full",
		...provenance ? { provenance } : {}
	};
}
randomBytes(32);
const PROJECT_CAPABILITY_TOKEN_VERSION = "amcap1";
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
//#region src/hooks/_auth.ts
const CAPABILITY_TTL_SECONDS = 300;
function secretFromEnvironmentOrFile(environmentName, fileEnvironmentName, defaultFileName) {
	const direct = process.env[environmentName]?.trim();
	if (direct) return direct;
	const configuredPath = process.env[fileEnvironmentName]?.trim() || join(homedir(), ".agentmemory", defaultFileName);
	const path = configuredPath.startsWith("~/") ? join(homedir(), configuredPath.slice(2)) : configuredPath;
	if (!existsSync(path)) return "";
	try {
		return readFileSync(path, "utf8").trim();
	} catch {
		return "";
	}
}
function projectCapabilitySigningSecret() {
	return secretFromEnvironmentOrFile("AGENTMEMORY_PROJECT_CAPABILITY_SECRET", "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE", "project-capability-secret");
}
function projectCapability(project) {
	const normalizedProject = project.trim();
	if (!normalizedProject) throw new Error("project scope is required");
	const configuredToken = process.env["AGENTMEMORY_PROJECT_CAPABILITY_TOKEN"]?.trim();
	if (configuredToken) return configuredToken;
	const signingSecret = projectCapabilitySigningSecret();
	if (signingSecret) {
		const issuedAt = Math.floor(Date.now() / 1e3);
		return createProjectCapabilityToken({
			version: 1,
			audience: process.env["AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE"]?.trim() || "agentmemory",
			project: normalizedProject,
			issuedAt,
			expiresAt: issuedAt + CAPABILITY_TTL_SECONDS
		}, signingSecret);
	}
	if (!isStrictCapabilityMode()) return process.env["AGENTMEMORY_SECRET"]?.trim() || "";
	throw new Error("project capability credentials are unavailable");
}
function projectAuthHeaders(project) {
	const normalizedProject = project.trim();
	const projectToken = projectCapability(normalizedProject);
	return {
		"Content-Type": "application/json",
		[PROJECT_CAPABILITY_PROJECT_HEADER]: normalizedProject,
		...projectToken ? { Authorization: `Bearer ${projectToken}` } : {}
	};
}
//#endregion
//#region src/hooks/_observe-delivery.ts
const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 250;
const RETRY_DELAY_MS = 50;
function authHeaders(payload) {
	return projectAuthHeaders(typeof payload["project"] === "string" ? payload["project"] : "");
}
function responseError(status, body) {
	const reason = typeof body?.["error"] === "string" ? body["error"] : `observe request failed with HTTP ${status}`;
	const error = new Error(reason);
	error.retryable = status === 429 || status === 503 || body?.["retryable"] === true;
	return error;
}
function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function isResponseBody(value) {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
async function deliverObservation(payload) {
	const restUrl = process.env["AGENTMEMORY_URL"] || "http://localhost:3111";
	let lastError;
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) try {
		const response = await fetch(`${restUrl}/agentmemory/observe`, {
			method: "POST",
			headers: authHeaders(payload),
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
		});
		const parsedBody = await response.json().catch(() => null);
		if (!isResponseBody(parsedBody)) {
			const error = /* @__PURE__ */ new Error(`observe endpoint returned invalid JSON object with HTTP ${response.status}`);
			error.retryable = response.ok || response.status === 429 || response.status === 503;
			throw error;
		}
		const body = parsedBody;
		if (response.ok && body?.["success"] !== false) return;
		throw responseError(response.status, body);
	} catch (error) {
		lastError = error;
		if (!(!(error instanceof Error) || error.retryable !== false) || attempt === MAX_ATTEMPTS) break;
		await delay(RETRY_DELAY_MS * attempt);
	}
	throw lastError instanceof Error ? lastError : /* @__PURE__ */ new Error("observation delivery failed");
}
function reportObservationDeliveryFailure(error) {
	const message = error instanceof Error ? error.message : "observation delivery failed";
	process.stderr.write(`[agentmemory] ${message}\n`);
}
//#endregion
//#region src/hooks/post-tool-failure.ts
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
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
	if (data.is_interrupt || data.isInterrupt) return;
	const sessionId = data.session_id || data.sessionId || "unknown";
	const toolName = data.tool_name ?? data.toolName;
	const toolInput = data.tool_input ?? data.toolArgs;
	const error = data.error ?? data.errorMessage;
	const config = resolveProjectConfig(data.cwd);
	const captured = captureToolEvent(toolName, toolInput, error, config, true);
	if (!captured) return;
	await deliverObservation({
		hookType: "post_tool_failure",
		sessionId,
		project: config.project_id,
		cwd: data.cwd || process.cwd(),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		privacy: config.privacy,
		captureProfile: config.capture_profile,
		externalProcessing: config.external_processing,
		data: {
			tool_name: toolName,
			tool_input: captured.toolInput,
			error: captured.toolOutput,
			capture: captured.capture
		}
	});
}
main().catch(reportObservationDeliveryFailure);
//#endregion
export {};
