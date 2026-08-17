import { a as normalizedProjectPath, r as isProjectPathExcluded } from "./_auth-r09nwS46.mjs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
function parseCommitTransitions(status) {
	const transitions = [];
	for (const line of status.split("\n")) {
		if (!line) continue;
		const [rawStatus, firstPath, secondPath] = line.split("	");
		if (!rawStatus || !firstPath) continue;
		const code = rawStatus[0];
		if ((code === "R" || code === "C") && secondPath) {
			transitions.push({
				operation: code === "R" ? "rename" : "copy",
				previousPath: firstPath,
				path: secondPath
			});
			continue;
		}
		const operation = code === "A" ? "write" : code === "D" ? "delete" : "edit";
		transitions.push({
			operation,
			path: firstPath
		});
	}
	return transitions;
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
//#endregion
export { credentialFreeWorktreeId as n, parseCommitTransitions as r, captureToolEvent as t };
