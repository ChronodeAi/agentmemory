#!/usr/bin/env node
import { t as resolveProject } from "./_project-BNYA1N7W.mjs";
import { n as reportHookDeliveryFailure, t as deliverProjectRequest } from "./_delivery--9SDKTY7.mjs";
import { n as credentialFreeWorktreeId, r as parseCommitTransitions } from "./_capture-CalTsfGN.mjs";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
//#region src/hooks/post-commit.ts
const exec = promisify(execFile);
function isSdkChildContext(payload) {
	if (process.env["AGENTMEMORY_SDK_CHILD"] === "1") return true;
	if (!payload || typeof payload !== "object") return false;
	return payload.entrypoint === "sdk-ts";
}
const TIMEOUT_MS = 1500;
async function git(args, cwd) {
	try {
		const { stdout } = await exec("git", args, {
			cwd,
			timeout: 1500
		});
		return stdout.trim();
	} catch {
		return null;
	}
}
async function collectCommitLinkage(cwd, sha, sessionId, project = resolveProject(cwd)) {
	const branch = await git([
		"rev-parse",
		"--abbrev-ref",
		"HEAD"
	], cwd);
	const message = await git([
		"log",
		"-1",
		"--pretty=%B",
		sha
	], cwd);
	const author = await git([
		"log",
		"-1",
		"--pretty=%an <%ae>",
		sha
	], cwd);
	const authoredAt = await git([
		"log",
		"-1",
		"--pretty=%aI",
		sha
	], cwd);
	const worktreeRoot = await git(["rev-parse", "--show-toplevel"], cwd);
	const baseHeadSha = await git(["rev-parse", `${sha}^`], cwd);
	const parsedTransitions = parseCommitTransitions(await git([
		"diff-tree",
		"--root",
		"--no-commit-id",
		"--name-status",
		"-r",
		"-M",
		sha
	], cwd) || "");
	const fileTransitions = await Promise.all(parsedTransitions.map(async (transition) => {
		const blobPath = transition.operation === "delete" ? transition.previousPath || transition.path : transition.path;
		const digest = await git(["rev-parse", transition.operation === "delete" ? `${sha}^:${blobPath}` : `${sha}:${blobPath}`], cwd);
		return {
			...transition,
			...digest ? {
				digest,
				digestKind: "git-blob"
			} : {}
		};
	}));
	const files = fileTransitions.length > 0 ? fileTransitions.map((transition) => transition.path) : void 0;
	const completeFileTransitions = fileTransitions.length > 0 && fileTransitions.every((transition) => Boolean(transition.digest) && transition.digestKind === "git-blob") ? fileTransitions : void 0;
	return {
		sessionId,
		project,
		sha,
		commitSha: sha,
		baseHeadSha: baseHeadSha || void 0,
		worktreeId: worktreeRoot ? credentialFreeWorktreeId(project, worktreeRoot) : void 0,
		branch: branch || void 0,
		repo: project,
		message: message || void 0,
		author: author || void 0,
		authoredAt: authoredAt || void 0,
		files,
		fileTransitions: completeFileTransitions
	};
}
function commandText(value) {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.every((entry) => typeof entry === "string") ? value.join(" ") : "";
	if (!value || typeof value !== "object") return "";
	const record = value;
	for (const key of [
		"cmd",
		"command",
		"script",
		"shell_command"
	]) {
		const candidate = commandText(record[key]);
		if (candidate) return candidate;
	}
	return "";
}
function isSuccessfulCommitToolEvent(data) {
	const toolName = typeof data.tool_name === "string" ? data.tool_name : typeof data.toolName === "string" ? data.toolName : "";
	const command = commandText(data.tool_input ?? data.toolArgs);
	const hasError = [data.error, data.errorMessage].some((value) => value !== void 0 && value !== null && value !== false && value !== "");
	return /(?:bash|shell|exec|command)/i.test(toolName) && /(?:^|[;&|]\s*|\s)git(?:\s+-C\s+(?:"[^"]+"|'[^']+'|\S+))?\s+commit(?:\s|$)/i.test(command) && !hasError;
}
async function main() {
	let input = "";
	for await (const chunk of process.stdin) input += chunk;
	let data = {};
	if (input.trim()) try {
		data = JSON.parse(input);
	} catch {}
	if (!data || typeof data !== "object") data = {};
	if (isSdkChildContext(data)) return;
	const directGitHook = !input.trim() || process.env["AGENTMEMORY_GIT_HOOK"] === "1" || Boolean(process.env["AGENTMEMORY_COMMIT_SHA"]);
	const successfulCommitTool = isSuccessfulCommitToolEvent(data);
	if (!directGitHook && !successfulCommitTool) return;
	const cwd = data.cwd || process.env["AGENTMEMORY_CWD"] || process.cwd();
	const sessionId = data.session_id || data.sessionId || process.env["AGENTMEMORY_SESSION_ID"] || void 0;
	const project = resolveProject(cwd);
	const sha = process.env["AGENTMEMORY_COMMIT_SHA"] || await git(["rev-parse", "HEAD"], cwd);
	if (!sha) return;
	await deliverProjectRequest("/agentmemory/session/commit", project, await collectCommitLinkage(cwd, sha, sessionId, project), {
		attempts: 2,
		timeoutMs: TIMEOUT_MS
	});
}
const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main().catch((error) => {
	reportHookDeliveryFailure("commit linkage", error);
	process.exitCode = 1;
});
//#endregion
export { collectCommitLinkage, isSuccessfulCommitToolEvent };
