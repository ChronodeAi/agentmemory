#!/usr/bin/env node
import { n as generateId, t as KV } from "./schema-Dttua2Zo.mjs";
import { i as isStrictCapabilityMode, n as PROJECT_CAPABILITY_PROJECT_HEADER, r as createProjectCapabilityToken } from "./auth-Evr8deOq.mjs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
//#region src/mcp/in-memory-kv.ts
var InMemoryKV = class {
	store = /* @__PURE__ */ new Map();
	constructor(persistPath) {
		this.persistPath = persistPath;
		if (persistPath && existsSync(persistPath)) try {
			const data = JSON.parse(readFileSync(persistPath, "utf-8"));
			for (const [scope, entries] of Object.entries(data)) {
				const map = /* @__PURE__ */ new Map();
				for (const [key, value] of Object.entries(entries)) map.set(key, value);
				this.store.set(scope, map);
			}
		} catch {}
	}
	async get(scope, key) {
		return this.store.get(scope)?.get(key) ?? null;
	}
	async set(scope, key, data) {
		if (!this.store.has(scope)) this.store.set(scope, /* @__PURE__ */ new Map());
		this.store.get(scope).set(key, data);
		return data;
	}
	async delete(scope, key) {
		this.store.get(scope)?.delete(key);
	}
	async list(scope) {
		const entries = this.store.get(scope);
		return entries ? Array.from(entries.values()) : [];
	}
	persist() {
		if (!this.persistPath) return;
		try {
			const dir = dirname(this.persistPath);
			if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
			const data = {};
			for (const [scope, entries] of this.store) data[scope] = Object.fromEntries(entries);
			writeFileSync(this.persistPath, JSON.stringify(data), "utf-8");
		} catch (err) {
			process.stderr.write(`[@agentmemory/mcp] Persist failed: ${err instanceof Error ? err.message : String(err)}\n`);
		}
	}
};
//#endregion
//#region src/mcp/transport.ts
function isNotification(req) {
	return req.id === void 0 || req.id === null;
}
function isValidId(id) {
	return id === void 0 || id === null || typeof id === "string" || typeof id === "number";
}
async function processLine(line, handler, writeOut, writeErr = (msg) => process.stderr.write(msg)) {
	const trimmed = line.trim();
	if (!trimmed) return;
	let parsed;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		writeOut({
			jsonrpc: "2.0",
			id: null,
			error: {
				code: -32700,
				message: "Parse error"
			}
		});
		return;
	}
	const request = parsed;
	const rawId = request?.id;
	if (!request || typeof request !== "object" || request.jsonrpc !== "2.0" || typeof request.method !== "string") {
		if (typeof rawId === "string" || typeof rawId === "number") writeOut({
			jsonrpc: "2.0",
			id: rawId,
			error: {
				code: -32600,
				message: "Invalid Request"
			}
		});
		return;
	}
	if (!isValidId(rawId)) {
		writeOut({
			jsonrpc: "2.0",
			id: null,
			error: {
				code: -32600,
				message: "Invalid Request: id must be string, number, or null"
			}
		});
		return;
	}
	const notification = isNotification(request);
	try {
		const result = await handler(request.method, request.params || {});
		if (notification) return;
		writeOut({
			jsonrpc: "2.0",
			id: request.id,
			result
		});
	} catch (err) {
		if (notification) {
			writeErr(`[mcp-transport] notification handler error for ${request.method}: ${err instanceof Error ? err.message : String(err)}\n`);
			return;
		}
		writeOut({
			jsonrpc: "2.0",
			id: request.id,
			error: {
				code: -32603,
				message: err instanceof Error ? err.message : String(err)
			}
		});
	}
}
function findHeaderEnd(buffer) {
	const crlf = buffer.indexOf("\r\n\r\n");
	const lf = buffer.indexOf("\n\n");
	if (crlf === -1 && lf === -1) return null;
	if (crlf !== -1 && (lf === -1 || crlf <= lf)) return {
		headerEnd: crlf,
		bodyStart: crlf + 4
	};
	return {
		headerEnd: lf,
		bodyStart: lf + 2
	};
}
function parseContentLength(header) {
	for (const line of header.split(/\r?\n/)) {
		const match = line.match(/^content-length:\s*(\d+)\s*$/i);
		if (match) return Number(match[1]);
	}
	return null;
}
function formatResponse(response, framed) {
	const body = JSON.stringify(response);
	if (!framed) return `${body}\n`;
	const bytes = Buffer.from(body, "utf8");
	return [Buffer.from(`Content-Length: ${bytes.length}\r\n\r\n`, "ascii"), bytes];
}
function createMessageParser(onMessage, writeErr = (msg) => process.stderr.write(msg)) {
	let buffer = Buffer.alloc(0);
	let framed = false;
	function processBuffer() {
		while (buffer.length > 0) {
			if (buffer[0] === 10 || buffer[0] === 13) {
				buffer = buffer.subarray(1);
				continue;
			}
			const preview = buffer.toString("ascii", 0, Math.min(buffer.length, 32));
			if (/^content-length:/i.test(preview)) {
				const header = findHeaderEnd(buffer);
				if (!header) return;
				const contentLength = parseContentLength(buffer.subarray(0, header.headerEnd).toString("ascii"));
				if (contentLength === null) {
					writeErr("[mcp-transport] missing Content-Length header\n");
					buffer = buffer.subarray(header.bodyStart);
					continue;
				}
				const messageEnd = header.bodyStart + contentLength;
				if (buffer.length < messageEnd) return;
				framed = true;
				const message = buffer.subarray(header.bodyStart, messageEnd).toString("utf8");
				buffer = buffer.subarray(messageEnd);
				onMessage(message);
				continue;
			}
			const newline = buffer.indexOf(10);
			if (newline === -1) return;
			const line = buffer.subarray(0, newline).toString("utf8").replace(/\r$/, "");
			buffer = buffer.subarray(newline + 1);
			onMessage(line);
		}
	}
	return {
		push(chunk) {
			const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, "utf8");
			buffer = Buffer.concat([buffer, bytes]);
			processBuffer();
		},
		isFramed() {
			return framed;
		}
	};
}
function createStdioTransport(handler, options = {}) {
	const input = options.input ?? process.stdin;
	const output = options.output ?? process.stdout;
	let parser = null;
	let queue = Promise.resolve();
	let started = false;
	let stopPromise = null;
	let closeHandled = false;
	const writeResponse = (response) => {
		const formatted = formatResponse(response, parser?.isFramed() ?? false);
		if (typeof formatted === "string") {
			output.write(formatted);
			return;
		}
		for (const chunk of formatted) output.write(chunk);
	};
	const onData = (chunk) => parser?.push(chunk);
	const stop = async () => {
		if (stopPromise) return stopPromise;
		stopPromise = (async () => {
			input.off("data", onData);
			input.off("end", onInputClose);
			input.off("close", onInputClose);
			started = false;
			await queue.catch(() => void 0);
			if (output.writableNeedDrain) await new Promise((resolve) => output.once("drain", resolve));
			parser = null;
		})();
		return stopPromise;
	};
	const onInputClose = () => {
		if (closeHandled) return;
		closeHandled = true;
		stop().then(() => options.onInputClose?.()).catch((err) => {
			process.stderr.write(`[mcp-transport] input-close shutdown failed: ${err instanceof Error ? err.message : String(err)}\n`);
		});
	};
	return {
		start() {
			if (started) return;
			started = true;
			stopPromise = null;
			closeHandled = false;
			parser = createMessageParser((message) => {
				queue = queue.then(() => processLine(message, handler, writeResponse));
				queue.catch((err) => {
					process.stderr.write(`[mcp-transport] request processing failed: ${err instanceof Error ? err.message : String(err)}\n`);
				});
			});
			input.on("data", onData);
			input.once("end", onInputClose);
			input.once("close", onInputClose);
		},
		stop
	};
}
//#endregion
//#region src/mcp/tools-registry.ts
const CORE_TOOLS = [
	{
		name: "memory_recall",
		description: "Search past session observations for relevant context. Use when you need to recall what happened in previous sessions, find past decisions, or look up how a file was modified before.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query (keywords, file names, concepts)"
				},
				limit: {
					type: "number",
					description: "Max results to return (default 10)"
				},
				format: {
					type: "string",
					description: "Result format: full, compact, or narrative (default full)"
				},
				token_budget: {
					type: "number",
					description: "Optional token budget to trim returned results"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				}
			},
			required: ["query"]
		}
	},
	{
		name: "memory_compress_file",
		description: "Compress a markdown file to reduce token usage while preserving headings, URLs, and code blocks. Creates a .original.md backup before writing.",
		inputSchema: {
			type: "object",
			properties: {
				filePath: {
					type: "string",
					description: "Path to the markdown file to compress"
				},
				project: {
					type: "string",
					description: "Canonical project ID owning the file"
				}
			},
			required: ["filePath", "project"]
		}
	},
	{
		name: "memory_save",
		description: "Explicitly save an important insight, decision, or pattern to long-term memory.",
		inputSchema: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: "The insight or decision to remember"
				},
				type: {
					type: "string",
					description: "Memory type: pattern, preference, architecture, bug, workflow, or fact"
				},
				concepts: {
					type: "string",
					description: "Comma-separated key concepts"
				},
				files: {
					type: "string",
					description: "Comma-separated relevant file paths"
				},
				project: {
					type: "string",
					description: "Required unless scope is explicitly global. Stable canonical project identifier this memory belongs to (e.g. a slug, UUID, or registry key). Must match the value used when the session was started. Do not use filesystem paths or ad-hoc display names — those change across machines and will silently break project scoping."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Use 'global' only for an explicitly global memory."
				}
			},
			required: ["content"]
		}
	},
	{
		name: "memory_file_history",
		description: "Get past observations about specific files.",
		inputSchema: {
			type: "object",
			properties: {
				files: {
					type: "string",
					description: "Comma-separated file paths"
				},
				sessionId: {
					type: "string",
					description: "Current session ID to exclude"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				}
			},
			required: ["files"]
		}
	},
	{
		name: "memory_patterns",
		description: "Detect recurring patterns across sessions.",
		inputSchema: {
			type: "object",
			properties: { project: {
				type: "string",
				description: "Project path to analyze"
			} }
		}
	},
	{
		name: "memory_sessions",
		description: "List recent sessions with their status and observation counts. Returns a compact response by default.",
		inputSchema: {
			type: "object",
			properties: {
				limit: {
					type: "number",
					description: "Max sessions to return (default 20, max 100)."
				},
				format: {
					type: "string",
					description: "Response detail: compact (default) or full for forensic inspection."
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				}
			}
		}
	},
	{
		name: "memory_smart_search",
		description: "Hybrid semantic+keyword search with progressive disclosure.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query"
				},
				expandIds: {
					type: "string",
					description: "Comma-separated observation IDs to expand"
				},
				limit: {
					type: "number",
					description: "Max results (default 10)"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				}
			},
			required: ["query"]
		}
	},
	{
		name: "memory_vision_search",
		description: "Cross-modal image search via CLIP embeddings. Pass queryText to find screenshots matching a description, or queryImageBase64/queryImageRef to find similar images. Requires AGENTMEMORY_IMAGE_EMBEDDINGS=true.",
		inputSchema: {
			type: "object",
			properties: {
				queryText: {
					type: "string",
					description: "Text query (e.g. 'login form with error banner')"
				},
				queryImageRef: {
					type: "string",
					description: "Absolute path to a stored image to match against"
				},
				queryImageBase64: {
					type: "string",
					description: "Raw base64 image bytes or data URL"
				},
				topK: {
					type: "number",
					description: "Max results (default 10, max 50)"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				sessionId: {
					type: "string",
					description: "Filter to a single session"
				}
			},
			required: ["project"]
		}
	},
	{
		name: "memory_timeline",
		description: "Chronological observations around an anchor point.",
		inputSchema: {
			type: "object",
			properties: {
				anchor: {
					type: "string",
					description: "Anchor point: ISO date or keyword"
				},
				project: {
					type: "string",
					description: "Filter by project path"
				},
				before: {
					type: "number",
					description: "Observations before anchor (default 5)"
				},
				after: {
					type: "number",
					description: "Observations after anchor (default 5)"
				}
			},
			required: ["anchor"]
		}
	},
	{
		name: "memory_profile",
		description: "User/project profile with top concepts and file patterns.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Project path"
				},
				refresh: {
					type: "string",
					description: "Set to 'true' to force rebuild"
				}
			},
			required: ["project"]
		}
	},
	{
		name: "memory_export",
		description: "Export memory data as JSON for one project (or all with admin global scope).",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit administrative cross-project export; otherwise provide project."
				}
			}
		}
	},
	{
		name: "memory_relations",
		description: "Query the memory relationship graph.",
		inputSchema: {
			type: "object",
			properties: {
				memoryId: {
					type: "string",
					description: "Memory ID to find relations for"
				},
				maxHops: {
					type: "number",
					description: "Max traversal depth (default 2)"
				},
				minConfidence: {
					type: "number",
					description: "Min confidence (0-1, default 0)"
				}
			},
			required: ["memoryId"]
		}
	},
	{
		name: "memory_commit_lookup",
		description: "Look up the agent session(s) that produced a specific git commit, given its SHA. Returns the commit metadata and linked sessions.",
		inputSchema: {
			type: "object",
			properties: {
				sha: {
					type: "string",
					description: "Full git commit SHA"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				}
			},
			required: ["sha"]
		}
	},
	{
		name: "memory_commits",
		description: "List recent commits linked to agent sessions, optionally filtered by branch or repo.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit cross-project query; otherwise provide project."
				},
				branch: {
					type: "string",
					description: "Filter by branch name"
				},
				repo: {
					type: "string",
					description: "Filter by remote URL"
				},
				limit: {
					type: "number",
					description: "Max results (default 100, max 500)"
				}
			}
		}
	}
];
const V040_TOOLS = [
	{
		name: "memory_claude_bridge_sync",
		description: "Sync memory state to/from Claude Code's native MEMORY.md file.",
		inputSchema: {
			type: "object",
			properties: { direction: {
				type: "string",
				description: "'read' to import from MEMORY.md, 'write' to export to MEMORY.md"
			} },
			required: ["direction"]
		}
	},
	{
		name: "memory_graph_query",
		description: "Query the knowledge graph for entities and relationships.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Explicit administrative cross-project scope; requires admin authorization"
				},
				startNodeId: {
					type: "string",
					description: "Starting node ID for traversal"
				},
				nodeType: {
					type: "string",
					description: "Filter by node type"
				},
				maxDepth: {
					type: "number",
					description: "Max BFS depth (default 3, max 5)"
				},
				query: {
					type: "string",
					description: "Search nodes by name"
				},
				limit: {
					type: "number",
					description: "Maximum nodes to return"
				},
				offset: {
					type: "number",
					description: "Pagination offset"
				}
			}
		}
	},
	{
		name: "memory_consolidate",
		description: "Run the 4-tier memory consolidation pipeline (working -> episodic -> semantic -> procedural).",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Use global only for an explicit cross-project consolidation"
				},
				tier: {
					type: "string",
					description: "Target tier: episodic, semantic, or procedural"
				}
			}
		}
	},
	{
		name: "memory_team_share",
		description: "Share a memory or observation with team members.",
		inputSchema: {
			type: "object",
			properties: {
				itemId: {
					type: "string",
					description: "ID of memory or observation to share"
				},
				itemType: {
					type: "string",
					description: "Type: observation, memory, or pattern"
				}
			},
			required: ["itemId", "itemType"]
		}
	},
	{
		name: "memory_team_feed",
		description: "Get recent shared items from all team members.",
		inputSchema: {
			type: "object",
			properties: { limit: {
				type: "number",
				description: "Max items (default 20)"
			} }
		}
	},
	{
		name: "memory_audit",
		description: "View the audit trail of memory operations for one project (or all with admin global scope).",
		inputSchema: {
			type: "object",
			properties: {
				operation: {
					type: "string",
					description: "Filter by operation type"
				},
				limit: {
					type: "number",
					description: "Max entries (default 50)"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Set to 'global' only for an explicit administrative cross-project query; otherwise provide project."
				}
			}
		}
	},
	{
		name: "memory_governance_delete",
		description: "Delete specific memories with audit trail.",
		inputSchema: {
			type: "object",
			properties: {
				memoryIds: {
					type: "string",
					description: "Comma-separated memory IDs to delete"
				},
				reason: {
					type: "string",
					description: "Reason for deletion"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Explicit administrative cross-project scope"
				}
			},
			required: ["memoryIds"]
		}
	},
	{
		name: "memory_snapshot_create",
		description: "Create a git-versioned snapshot of current memory state.",
		inputSchema: {
			type: "object",
			properties: { message: {
				type: "string",
				description: "Snapshot description"
			} }
		}
	}
];
const V050_TOOLS = [
	{
		name: "memory_action_create",
		description: "Create an actionable work item with typed dependencies. Actions track what agents need to do and how work items relate to each other.",
		inputSchema: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "Action title"
				},
				description: {
					type: "string",
					description: "Detailed description of the work"
				},
				priority: {
					type: "number",
					description: "Priority 1-10 (10 highest)"
				},
				project: {
					type: "string",
					description: "Project path"
				},
				tags: {
					type: "string",
					description: "Comma-separated tags"
				},
				parentId: {
					type: "string",
					description: "Parent action ID for hierarchical actions"
				},
				requires: {
					type: "string",
					description: "Comma-separated action IDs that must complete before this"
				}
			},
			required: ["title"]
		}
	},
	{
		name: "memory_action_update",
		description: "Update an action's status, priority, or details. Set status to 'done' to complete it and unblock dependent actions.",
		inputSchema: {
			type: "object",
			properties: {
				actionId: {
					type: "string",
					description: "Action ID to update"
				},
				status: {
					type: "string",
					description: "New status: pending, active, done, blocked, cancelled"
				},
				result: {
					type: "string",
					description: "Outcome description (when completing)"
				},
				priority: {
					type: "number",
					description: "New priority 1-10"
				}
			},
			required: ["actionId"]
		}
	},
	{
		name: "memory_frontier",
		description: "Get all unblocked actions ranked by priority and urgency. Returns the frontier of actionable work with no unsatisfied dependencies.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Filter by project"
				},
				scope: {
					type: "string",
					description: "Use 'global' only for explicit cross-project reflection"
				},
				agentId: {
					type: "string",
					description: "Agent ID to check lease conflicts"
				},
				limit: {
					type: "number",
					description: "Max results (default 20)"
				}
			}
		}
	},
	{
		name: "memory_next",
		description: "Get the single most important next action to work on. Combines dependency resolution, priority, and recency into a score.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Filter by project"
				},
				scope: {
					type: "string",
					description: "Use 'global' only for explicit cross-project listing"
				},
				agentId: {
					type: "string",
					description: "Current agent ID"
				}
			}
		}
	},
	{
		name: "memory_lease",
		description: "Acquire, release, or renew an exclusive lease on an action. Prevents multiple agents from working on the same thing.",
		inputSchema: {
			type: "object",
			properties: {
				actionId: {
					type: "string",
					description: "Action ID"
				},
				agentId: {
					type: "string",
					description: "Agent claiming the action"
				},
				operation: {
					type: "string",
					description: "acquire, release, or renew"
				},
				result: {
					type: "string",
					description: "Result when releasing (marks action done)"
				},
				ttlMs: {
					type: "number",
					description: "Lease duration in ms (default 10min, max 1hr)"
				}
			},
			required: [
				"actionId",
				"agentId",
				"operation"
			]
		}
	},
	{
		name: "memory_routine_run",
		description: "Instantiate a frozen workflow routine, creating actions for each step with proper dependencies.",
		inputSchema: {
			type: "object",
			properties: {
				routineId: {
					type: "string",
					description: "Routine template ID"
				},
				project: {
					type: "string",
					description: "Project context"
				},
				initiatedBy: {
					type: "string",
					description: "Agent starting the run"
				}
			},
			required: ["routineId"]
		}
	},
	{
		name: "memory_signal_send",
		description: "Send a message to another agent or broadcast. Supports threading, typed messages, and TTL expiration.",
		inputSchema: {
			type: "object",
			properties: {
				from: {
					type: "string",
					description: "Sender agent ID"
				},
				to: {
					type: "string",
					description: "Recipient agent ID (omit for broadcast)"
				},
				content: {
					type: "string",
					description: "Message content"
				},
				type: {
					type: "string",
					description: "Message type: info, request, response, alert, handoff"
				},
				replyTo: {
					type: "string",
					description: "Signal ID to reply to (auto-threads)"
				}
			},
			required: ["from", "content"]
		}
	},
	{
		name: "memory_signal_read",
		description: "Read messages for an agent. Marks delivered messages as read.",
		inputSchema: {
			type: "object",
			properties: {
				agentId: {
					type: "string",
					description: "Agent to read messages for"
				},
				unreadOnly: {
					type: "string",
					description: "Set to 'true' for unread only"
				},
				threadId: {
					type: "string",
					description: "Filter by conversation thread"
				},
				limit: {
					type: "number",
					description: "Max messages (default 50)"
				}
			},
			required: ["agentId"]
		}
	},
	{
		name: "memory_checkpoint",
		description: "Create or resolve an external checkpoint (CI result, approval, deploy status) that gates action progress.",
		inputSchema: {
			type: "object",
			properties: {
				operation: {
					type: "string",
					description: "create, resolve, or list"
				},
				name: {
					type: "string",
					description: "Checkpoint name (for create)"
				},
				checkpointId: {
					type: "string",
					description: "Checkpoint ID (for resolve)"
				},
				status: {
					type: "string",
					description: "passed or failed (for resolve)"
				},
				type: {
					type: "string",
					description: "Checkpoint type: ci, approval, deploy, external, timer"
				},
				linkedActionIds: {
					type: "string",
					description: "Comma-separated action IDs this checkpoint gates (for create)"
				}
			},
			required: ["operation"]
		}
	},
	{
		name: "memory_mesh_sync",
		description: "Sync memories and actions with peer agentmemory instances for multi-agent collaboration.",
		inputSchema: {
			type: "object",
			properties: {
				peerId: {
					type: "string",
					description: "Specific peer ID (omit for all)"
				},
				direction: {
					type: "string",
					description: "push, pull, or both (default both)"
				}
			}
		}
	}
];
const V051_TOOLS = [
	{
		name: "memory_sentinel_create",
		description: "Create an event-driven sentinel that watches for conditions (webhook, timer, threshold, pattern, approval) and auto-unblocks gated actions when triggered.",
		inputSchema: {
			type: "object",
			properties: {
				name: {
					type: "string",
					description: "Sentinel name"
				},
				type: {
					type: "string",
					description: "Type: webhook, timer, threshold, pattern, approval, custom"
				},
				config: {
					type: "string",
					description: "JSON config (timer: {durationMs}, threshold: {metric,operator,value}, pattern: {pattern}, webhook: {path})"
				},
				linkedActionIds: {
					type: "string",
					description: "Comma-separated action IDs to gate"
				},
				expiresInMs: {
					type: "number",
					description: "Auto-expire after ms"
				}
			},
			required: ["name", "type"]
		}
	},
	{
		name: "memory_sentinel_trigger",
		description: "Externally fire a sentinel, providing an optional result payload. Unblocks any gated actions.",
		inputSchema: {
			type: "object",
			properties: {
				sentinelId: {
					type: "string",
					description: "Sentinel ID to trigger"
				},
				result: {
					type: "string",
					description: "JSON result payload"
				}
			},
			required: ["sentinelId"]
		}
	},
	{
		name: "memory_sketch_create",
		description: "Create an ephemeral action graph for exploratory work. Auto-expires after TTL. Can be promoted to permanent actions or discarded.",
		inputSchema: {
			type: "object",
			properties: {
				title: {
					type: "string",
					description: "Sketch title"
				},
				description: {
					type: "string",
					description: "What this sketch explores"
				},
				expiresInMs: {
					type: "number",
					description: "TTL in ms (default 1 hour)"
				},
				project: {
					type: "string",
					description: "Project context"
				}
			},
			required: ["title"]
		}
	},
	{
		name: "memory_sketch_promote",
		description: "Promote a sketch's ephemeral actions to permanent actions. Makes the exploratory work official.",
		inputSchema: {
			type: "object",
			properties: {
				sketchId: {
					type: "string",
					description: "Sketch ID to promote"
				},
				project: {
					type: "string",
					description: "Override project for promoted actions"
				}
			},
			required: ["sketchId"]
		}
	},
	{
		name: "memory_crystallize",
		description: "Compress completed action chains into compact crystal digests using LLM summarization. Extracts narrative, key outcomes, files affected, and lessons.",
		inputSchema: {
			type: "object",
			properties: {
				actionIds: {
					type: "string",
					description: "Comma-separated completed action IDs to crystallize"
				},
				project: {
					type: "string",
					description: "Project context"
				},
				sessionId: {
					type: "string",
					description: "Session context"
				}
			},
			required: ["actionIds", "project"]
		}
	},
	{
		name: "memory_diagnose",
		description: "Run health checks across all subsystems (actions, leases, sentinels, sketches, signals, sessions, memories, mesh). Identifies stuck, orphaned, and inconsistent state.",
		inputSchema: {
			type: "object",
			properties: { categories: {
				type: "string",
				description: "Comma-separated categories to check (default all)"
			} }
		}
	},
	{
		name: "memory_heal",
		description: "Auto-fix all fixable issues found by diagnostics. Unblocks stuck actions, expires stale leases, cleans up orphaned data.",
		inputSchema: {
			type: "object",
			properties: {
				categories: {
					type: "string",
					description: "Comma-separated categories to heal (default all)"
				},
				dryRun: {
					type: "string",
					description: "Set to 'true' for dry run (report but don't fix)"
				}
			}
		}
	},
	{
		name: "memory_facet_tag",
		description: "Attach a structured tag (dimension:value) to an action, memory, or observation for multi-dimensional categorization.",
		inputSchema: {
			type: "object",
			properties: {
				targetId: {
					type: "string",
					description: "ID of the target to tag"
				},
				targetType: {
					type: "string",
					description: "Type: action, memory, or observation"
				},
				dimension: {
					type: "string",
					description: "Tag dimension (e.g., priority, team, status)"
				},
				value: {
					type: "string",
					description: "Tag value (e.g., urgent, backend, reviewed)"
				}
			},
			required: [
				"targetId",
				"targetType",
				"dimension",
				"value"
			]
		}
	},
	{
		name: "memory_facet_query",
		description: "Query targets by facet tags with AND/OR logic. Find all actions tagged priority:urgent AND team:backend.",
		inputSchema: {
			type: "object",
			properties: {
				matchAll: {
					type: "string",
					description: "Comma-separated dimension:value pairs (AND logic)"
				},
				matchAny: {
					type: "string",
					description: "Comma-separated dimension:value pairs (OR logic)"
				},
				targetType: {
					type: "string",
					description: "Filter by type: action, memory, or observation"
				}
			}
		}
	}
];
const V061_TOOLS = [{
	name: "memory_verify",
	description: "Verify a memory or observation by tracing its citation chain back to source observations and session context. Returns provenance information including confidence scores.",
	inputSchema: {
		type: "object",
		properties: { id: {
			type: "string",
			description: "Memory ID or observation ID to verify"
		} },
		required: ["id"]
	}
}];
const V070_TOOLS = [
	{
		name: "memory_lesson_save",
		description: "Save a lesson learned from this session. Lessons have confidence scores that strengthen when reinforced and decay when not used. Duplicate content auto-strengthens the existing lesson.",
		inputSchema: {
			type: "object",
			properties: {
				content: {
					type: "string",
					description: "The lesson learned (what worked, what to avoid, when to use X approach)"
				},
				context: {
					type: "string",
					description: "When/where this lesson applies"
				},
				confidence: {
					type: "number",
					description: "Initial confidence 0.0-1.0 (default 0.5)"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Explicit administrative cross-project scope"
				},
				tags: {
					type: "string",
					description: "Comma-separated tags"
				}
			},
			required: ["content"]
		}
	},
	{
		name: "memory_lesson_recall",
		description: "Search lessons by query. Returns lessons sorted by confidence and recency. Use to check what the agent has learned before making decisions.",
		inputSchema: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Search query"
				},
				project: {
					type: "string",
					description: "Canonical project ID. Required unless scope is explicitly global."
				},
				scope: {
					type: "string",
					enum: ["global"],
					description: "Explicit administrative cross-project scope"
				},
				minConfidence: {
					type: "number",
					description: "Minimum confidence threshold (default 0.1)"
				},
				limit: {
					type: "number",
					description: "Max results (default 10)"
				}
			},
			required: ["query"]
		}
	},
	{
		name: "memory_lesson_delete",
		description: "Soft-delete a lesson by id. Deleted lessons are excluded from recall and list; re-saving the same content creates a fresh lesson.",
		inputSchema: {
			type: "object",
			properties: { lessonId: {
				type: "string",
				description: "The lesson id (lsn_...)"
			} },
			required: ["lessonId"]
		}
	},
	{
		name: "memory_obsidian_export",
		description: "Export memories, lessons, and crystals as Obsidian-compatible Markdown files with YAML frontmatter and wikilinks for graph view.",
		inputSchema: {
			type: "object",
			properties: {
				vaultDir: {
					type: "string",
					description: "Output directory (default ~/.agentmemory/vault/)"
				},
				types: {
					type: "string",
					description: "Comma-separated types to export: memories,lessons,crystals,sessions (default all)"
				}
			}
		}
	}
];
const V073_TOOLS = [{
	name: "memory_reflect",
	description: "Traverse the knowledge graph, group related memories by concept clusters, and synthesize higher-order insights via LLM. Returns new and reinforced insights.",
	inputSchema: {
		type: "object",
		properties: {
			project: {
				type: "string",
				description: "Canonical project ID. Required unless scope is explicitly global."
			},
			scope: {
				type: "string",
				enum: ["global"],
				description: "Explicit administrative cross-project scope"
			},
			maxClusters: {
				type: "number",
				description: "Max concept clusters to process (default 10, max 20)"
			}
		}
	}
}, {
	name: "memory_insight_list",
	description: "List synthesized insights — higher-order observations derived from patterns across memories, lessons, and crystals.",
	inputSchema: {
		type: "object",
		properties: {
			project: {
				type: "string",
				description: "Canonical project ID. Required unless scope is explicitly global."
			},
			scope: {
				type: "string",
				enum: ["global"],
				description: "Explicit administrative cross-project scope"
			},
			minConfidence: {
				type: "number",
				description: "Minimum confidence threshold (default 0)"
			},
			limit: {
				type: "number",
				description: "Max results (default 50)"
			}
		}
	}
}];
const V010_SLOTS_TOOLS = [
	{
		name: "memory_slot_list",
		description: "List all memory slots (pinned + project + global). Slots are editable, size-limited memory units the agent can read and modify across sessions.",
		inputSchema: {
			type: "object",
			properties: { project: {
				type: "string",
				description: "Canonical project ID"
			} },
			required: ["project"]
		}
	},
	{
		name: "memory_slot_get",
		description: "Read a single slot by label.",
		inputSchema: {
			type: "object",
			properties: {
				label: {
					type: "string",
					description: "Slot label (e.g. 'persona', 'pending_items')"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				}
			},
			required: ["label", "project"]
		}
	},
	{
		name: "memory_slot_create",
		description: "Create a new slot. Reject if a slot with the same label already exists.",
		inputSchema: {
			type: "object",
			properties: {
				label: {
					type: "string",
					description: "Slot label — lowercase, starts with letter, [a-z0-9_]"
				},
				content: {
					type: "string",
					description: "Initial content (default empty)"
				},
				sizeLimit: {
					type: "number",
					description: "Max chars (default 2000, hard cap 20000)"
				},
				description: {
					type: "string",
					description: "What this slot is for"
				},
				pinned: {
					type: "string",
					description: "'false' to exclude from context injection; default true"
				},
				scope: {
					type: "string",
					description: "'project' (default) or 'global' (shared across projects)"
				},
				project: {
					type: "string",
					description: "Canonical project ID; required for project scope"
				}
			},
			required: ["label"]
		}
	},
	{
		name: "memory_slot_append",
		description: "Append text to an existing slot. Fails with 413 if the append would exceed the slot's sizeLimit — agent must compact via memory_slot_replace first.",
		inputSchema: {
			type: "object",
			properties: {
				label: {
					type: "string",
					description: "Slot label"
				},
				text: {
					type: "string",
					description: "Text to append"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				}
			},
			required: [
				"label",
				"text",
				"project"
			]
		}
	},
	{
		name: "memory_slot_replace",
		description: "Replace slot content in place. Fails if content exceeds sizeLimit.",
		inputSchema: {
			type: "object",
			properties: {
				label: {
					type: "string",
					description: "Slot label"
				},
				content: {
					type: "string",
					description: "New full content"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				}
			},
			required: [
				"label",
				"content",
				"project"
			]
		}
	},
	{
		name: "memory_slot_delete",
		description: "Delete a slot. Seeded default slots can be deleted unless marked readOnly.",
		inputSchema: {
			type: "object",
			properties: {
				label: {
					type: "string",
					description: "Slot label"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				}
			},
			required: ["label", "project"]
		}
	}
];
const CODING_MEMORY_TOOLS = [
	{
		name: "memory_context_packet",
		description: "Build the project-scoped Recall packet for a coding task with fixed budgets for identity, lessons, episodic history, file history, and provenance.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				sessionId: {
					type: "string",
					description: "Current session ID"
				},
				query: {
					type: "string",
					description: "Optional task-aware recall query"
				},
				files: {
					type: "string",
					description: "Comma-separated relevant files"
				},
				token_budget: {
					type: "number",
					description: "Maximum packet tokens (default and hard maximum 2000)"
				},
				context_class: {
					type: "string",
					enum: ["advisory", "gate-critical"],
					description: "Advisory returns typed degradation; gate-critical fails closed when a required source is unavailable or failed"
				}
			},
			required: ["project", "sessionId"]
		}
	},
	{
		name: "memory_context_acknowledge",
		description: "Submit provider delivery evidence for a generated context packet. Sources are suppressed only after a configured trusted verifier accepts the receipt; otherwise this fails closed.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				sessionId: {
					type: "string",
					description: "Current session ID"
				},
				packetId: {
					type: "string",
					description: "Packet identifier returned by memory_context_packet"
				},
				providerReceipt: {
					type: "string",
					description: "Provider delivery receipt evaluated by the configured trusted verifier"
				}
			},
			required: [
				"project",
				"sessionId",
				"packetId",
				"providerReceipt"
			]
		}
	},
	{
		name: "memory_commit_link",
		description: "Link a verified Git commit SHA to its canonical project and optional coding session.",
		inputSchema: {
			type: "object",
			properties: {
				sha: {
					type: "string",
					pattern: "^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$",
					description: "Full Git commit SHA"
				},
				sessionId: {
					type: "string",
					description: "Optional coding session ID"
				},
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				baseHeadSha: {
					type: "string",
					pattern: "^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$",
					description: "Optional parent commit SHA for provenance"
				},
				worktreeId: {
					type: "string",
					pattern: "^wt_[0-9a-f]{32}$",
					description: "Optional credential-free worktree identifier"
				},
				fileTransitions: {
					type: "array",
					description: "Optional verified Git file transitions",
					items: {
						type: "object",
						properties: {
							path: { type: "string" },
							operation: {
								type: "string",
								enum: [
									"write",
									"edit",
									"delete",
									"rename",
									"copy"
								]
							},
							previousPath: { type: "string" },
							digest: {
								type: "string",
								pattern: "^(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$"
							},
							digestKind: {
								type: "string",
								enum: ["git-blob"]
							}
						},
						required: [
							"path",
							"operation",
							"digest",
							"digestKind"
						]
					}
				}
			},
			required: ["sha", "project"]
		}
	},
	{
		name: "memory_project_health",
		description: "Report project memory scope coverage, retrieval use, duplicates, abandoned sessions, promotions, injection latency, and commit coverage.",
		inputSchema: {
			type: "object",
			properties: { project: {
				type: "string",
				description: "Canonical project ID"
			} },
			required: ["project"]
		}
	},
	{
		name: "memory_promotion_candidates",
		description: "List up to three evidence-gated durable-memory promotion candidates generated for substantive project sessions.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				sessionId: {
					type: "string",
					description: "Optional session ID filter"
				},
				status: {
					type: "string",
					description: "Optional status filter: pending, auto_promoted, accepted, or rejected"
				}
			},
			required: ["project"]
		}
	},
	{
		name: "memory_promotion_decide",
		description: "Explicitly accept or reject a durable-memory promotion candidate. Architecture acceptance requires canonical ADR and commit provenance.",
		inputSchema: {
			type: "object",
			properties: {
				project: {
					type: "string",
					description: "Canonical project ID"
				},
				candidateId: {
					type: "string",
					description: "Promotion candidate ID"
				},
				action: {
					type: "string",
					description: "Decision: accept or reject"
				},
				canonicalAdr: {
					type: "string",
					description: "Canonical ADR path required for architecture"
				},
				commitSha: {
					type: "string",
					description: "Verified commit SHA"
				}
			},
			required: [
				"project",
				"candidateId",
				"action"
			]
		}
	}
];
function getAllTools() {
	return [
		...CORE_TOOLS,
		...V040_TOOLS,
		...V050_TOOLS,
		...V051_TOOLS,
		...V061_TOOLS,
		...V070_TOOLS,
		...V073_TOOLS,
		...V010_SLOTS_TOOLS,
		...CODING_MEMORY_TOOLS
	];
}
//#endregion
//#region src/version.ts
const VERSION = "0.9.28-chronode.12";
process.env["AGENTMEMORY_BUILD_ID"];
process.env["AGENTMEMORY_VIEWER_BUILD_ID"];
//#endregion
//#region src/context-eligibility.ts
function stringValue(candidate, key) {
	const value = candidate[key];
	return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function stringList(candidate, key) {
	const value = candidate[key];
	return Array.isArray(value) ? value.filter((entry) => typeof entry === "string" && Boolean(entry.trim())) : [];
}
function evaluateContextCandidate(candidate, options) {
	const status = stringValue(candidate, "status")?.toLowerCase();
	const now = options.now ?? Date.now();
	const expiry = stringValue(candidate, "expiresAt") ?? stringValue(candidate, "forgetAfter");
	if (expiry) {
		const expiresAt = new Date(expiry).getTime();
		if (!Number.isFinite(expiresAt) || expiresAt <= now) return {
			eligible: false,
			reason: "expired"
		};
	}
	if (candidate["deleted"] === true || status === "deleted") return {
		eligible: false,
		reason: "deleted"
	};
	if (candidate["isLatest"] === false || status === "superseded" || stringValue(candidate, "supersededBy")) return {
		eligible: false,
		reason: "superseded"
	};
	if (candidate["contradicted"] === true || status === "contradicted") return {
		eligible: false,
		reason: "contradicted"
	};
	const gateAuthority = candidate["gateAuthority"] === true || stringValue(candidate, "authority")?.toLowerCase() === "gate";
	const accepted = candidate["accepted"] === true || status === "accepted" || stringValue(candidate, "authorityStatus")?.toLowerCase() === "accepted";
	if (options.contextClass === "gate-critical" && gateAuthority && !accepted) return {
		eligible: false,
		reason: "unaccepted_gate_authority"
	};
	const tags = stringList(candidate, "tags").map((tag) => tag.toLowerCase());
	if (candidate["recalledOnly"] === true || stringValue(candidate, "source")?.toLowerCase() === "recall" || tags.includes("recalled-only")) return {
		eligible: false,
		reason: "recalled_only"
	};
	if ([
		options.candidateId,
		stringValue(candidate, "id"),
		stringValue(candidate, "obsId"),
		...stringList(candidate, "sourceIds"),
		...stringList(candidate, "sourceObservationIds"),
		stringValue(candidate, "commitSha"),
		stringValue(candidate, "receiptId")
	].filter((value) => Boolean(value)).length === 0) return {
		eligible: false,
		reason: "provenance_missing"
	};
	return { eligible: true };
}
function retrievalQuarantineKey(scope, key) {
	return `${scope}\u0000${key}`;
}
async function loadRetrievalQuarantine(kv, scope) {
	const records = await kv.list(scope);
	return new Set(records.filter((record) => typeof record.sourceScope === "string" && typeof record.sourceKey === "string").map((record) => retrievalQuarantineKey(record.sourceScope, record.sourceKey)));
}
//#endregion
//#region src/mcp/rest-proxy.ts
const DEFAULT_URL = "http://localhost:3111";
const DEFAULT_HEALTH_PROBE_TIMEOUT_MS = 2e3;
const CALL_TIMEOUT_MS = 15e3;
const LOCAL_MODE_TTL_MS = 3e4;
const CAPABILITY_TTL_SECONDS = 300;
function probeTimeoutMs() {
	const raw = process.env["AGENTMEMORY_PROBE_TIMEOUT_MS"];
	if (!raw) return DEFAULT_HEALTH_PROBE_TIMEOUT_MS;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_HEALTH_PROBE_TIMEOUT_MS;
}
function forceProxy() {
	const raw = process.env["AGENTMEMORY_FORCE_PROXY"];
	return raw === "1" || raw === "true";
}
let cached = null;
let cachedAt = 0;
let probeInFlight = null;
function resolveEnvOrEmpty(name) {
	const raw = process.env[name];
	if (!raw) return "";
	if (raw.startsWith("${") && raw.endsWith("}")) return "";
	return raw;
}
function resolveEnvValue(value) {
	if (!value) return "";
	const trimmed = value.trim();
	const placeholder = trimmed.match(/^\$\{[A-Za-z_][A-Za-z0-9_]*(?::-(.*))?\}$/);
	return placeholder ? placeholder[1]?.trim() ?? "" : trimmed;
}
function userEnv() {
	const path = join(homedir(), ".agentmemory", ".env");
	if (!existsSync(path)) return {};
	const vars = {};
	try {
		for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			const eq = trimmed.indexOf("=");
			if (eq < 1) continue;
			const key = trimmed.slice(0, eq).trim();
			let value = trimmed.slice(eq + 1).trim();
			const quote = value[0] === "'" || value[0] === "\"" ? value[0] : "";
			if (quote) {
				const close = value.indexOf(quote, 1);
				value = close >= 0 ? value.slice(1, close) : value.slice(1);
			} else {
				const comment = value.indexOf(" #");
				if (comment >= 0) value = value.slice(0, comment).trim();
			}
			vars[key] = value;
		}
	} catch {
		return {};
	}
	return vars;
}
function configuredEnvValue(name, fileEnv) {
	return resolveEnvValue(Object.prototype.hasOwnProperty.call(process.env, name) ? process.env[name] : fileEnv[name]);
}
function agentmemorySecret() {
	const fileEnv = userEnv();
	const direct = configuredEnvValue("AGENTMEMORY_SECRET", fileEnv);
	if (direct) return direct;
	const secretFile = configuredEnvValue("AGENTMEMORY_SECRET_FILE", fileEnv);
	if (!secretFile) return "";
	const path = secretFile.startsWith("~/") ? join(homedir(), secretFile.slice(2)) : secretFile;
	try {
		return readFileSync(path, "utf8").trim();
	} catch {
		return "";
	}
}
function secretFromEnvironmentOrFile(directName, fileName, defaultFileName) {
	const fileEnv = userEnv();
	const direct = configuredEnvValue(directName, fileEnv);
	if (direct) return direct;
	const configuredFile = configuredEnvValue(fileName, fileEnv) || (defaultFileName ? join(homedir(), ".agentmemory", defaultFileName) : "");
	if (!configuredFile) return "";
	const path = configuredFile.startsWith("~/") ? join(homedir(), configuredFile.slice(2)) : configuredFile;
	try {
		return readFileSync(path, "utf8").trim();
	} catch {
		return "";
	}
}
function projectCapability(project) {
	const fileEnv = userEnv();
	const configuredToken = configuredEnvValue("AGENTMEMORY_PROJECT_CAPABILITY_TOKEN", fileEnv);
	if (configuredToken) return configuredToken;
	const signingSecret = secretFromEnvironmentOrFile("AGENTMEMORY_PROJECT_CAPABILITY_SECRET", "AGENTMEMORY_PROJECT_CAPABILITY_SECRET_FILE", "project-capability-secret");
	if (signingSecret) {
		const issuedAt = Math.floor(Date.now() / 1e3);
		return createProjectCapabilityToken({
			version: 1,
			audience: configuredEnvValue("AGENTMEMORY_PROJECT_CAPABILITY_AUDIENCE", fileEnv) || "agentmemory",
			project,
			issuedAt,
			expiresAt: issuedAt + CAPABILITY_TTL_SECONDS
		}, signingSecret);
	}
	if (!isStrictCapabilityMode(configuredEnvValue("AGENTMEMORY_STRICT_CAPABILITY_MODE", fileEnv))) return agentmemorySecret();
	throw new Error("project capability credentials are unavailable; configure AGENTMEMORY_PROJECT_CAPABILITY_SECRET or its secret file");
}
function baseUrl() {
	return (resolveEnvOrEmpty("AGENTMEMORY_URL") || DEFAULT_URL).replace(/\/+$/, "");
}
function authHeader() {
	const secret = agentmemorySecret();
	return secret ? { authorization: `Bearer ${secret}` } : {};
}
function administrativeAuthHeader() {
	const secret = secretFromEnvironmentOrFile("AGENTMEMORY_ADMIN_SECRET", "AGENTMEMORY_ADMIN_SECRET_FILE") || agentmemorySecret();
	return secret ? { authorization: `Bearer ${secret}` } : {};
}
function requestBody(init) {
	if (typeof init?.body !== "string") return {};
	try {
		const parsed = JSON.parse(init.body);
		return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
function requestAuthHeaders(path, init) {
	const body = requestBody(init);
	const argumentsBody = body["arguments"] && typeof body["arguments"] === "object" && !Array.isArray(body["arguments"]) ? body["arguments"] : {};
	const parsedUrl = new URL(path, DEFAULT_URL);
	const scope = body["scope"] ?? argumentsBody["scope"] ?? parsedUrl.searchParams.get("scope");
	const projectValue = body["project"] ?? argumentsBody["project"] ?? parsedUrl.searchParams.get("project");
	const project = typeof projectValue === "string" ? projectValue.trim() : "";
	const method = (init?.method ?? "GET").toUpperCase();
	const listsMcpTools = parsedUrl.pathname === "/agentmemory/mcp/tools" && method === "GET";
	if (scope === "global" || parsedUrl.pathname === "/agentmemory/migrate" || listsMcpTools) return administrativeAuthHeader();
	if (!project) return authHeader();
	return {
		authorization: `Bearer ${projectCapability(project)}`,
		[PROJECT_CAPABILITY_PROJECT_HEADER]: project
	};
}
const defaultLivezProbe = async (url, timeoutMs, headers) => {
	const res = await fetch(`${url}/agentmemory/livez`, {
		method: "GET",
		headers,
		signal: AbortSignal.timeout(timeoutMs)
	});
	return {
		ok: res.ok,
		status: res.status,
		statusText: res.statusText
	};
};
let livezProbe = defaultLivezProbe;
async function probe(url) {
	const timeout = probeTimeoutMs();
	try {
		const res = await livezProbe(url, timeout, authHeader());
		if (!res.ok) process.stderr.write(`[@agentmemory/mcp] livez probe ${url}/agentmemory/livez -> ${res.status ?? "?"} ${res.statusText ?? ""}; falling back to local InMemoryKV (set AGENTMEMORY_FORCE_PROXY=1 to skip the probe)\n`);
		return res.ok;
	} catch (err) {
		process.stderr.write(`[@agentmemory/mcp] livez probe ${url}/agentmemory/livez failed in ${timeout}ms: ${err instanceof Error ? err.message : String(err)}; falling back to local InMemoryKV (set AGENTMEMORY_FORCE_PROXY=1 to skip the probe, or raise AGENTMEMORY_PROBE_TIMEOUT_MS)\n`);
		return false;
	}
}
function invalidateHandle() {
	cached = null;
	cachedAt = 0;
}
async function resolveHandle() {
	const now = Date.now();
	if (cached) if (cached.mode === "local" && now - cachedAt >= LOCAL_MODE_TTL_MS) {
		cached = null;
		cachedAt = 0;
	} else return cached;
	if (probeInFlight) return probeInFlight;
	const url = baseUrl();
	const skipProbe = forceProxy();
	probeInFlight = (async () => {
		const up = skipProbe ? true : await probe(url);
		if (skipProbe) process.stderr.write(`[@agentmemory/mcp] AGENTMEMORY_FORCE_PROXY set; skipping livez probe and trusting ${url}\n`);
		if (up) {
			const handle = {
				mode: "proxy",
				baseUrl: url,
				call: async (path, init) => {
					const res = await fetch(`${url}${path}`, {
						...init,
						headers: {
							"content-type": "application/json",
							...requestAuthHeaders(path, init),
							...init?.headers
						},
						signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
					});
					if (!res.ok) throw new Error(`${init?.method || "GET"} ${path} -> ${res.status} ${res.statusText}`);
					const text = await res.text();
					return text ? JSON.parse(text) : null;
				}
			};
			cached = handle;
			cachedAt = Date.now();
			return handle;
		}
		const local = { mode: "local" };
		cached = local;
		cachedAt = Date.now();
		return local;
	})();
	try {
		return await probeInFlight;
	} finally {
		probeInFlight = null;
	}
}
//#endregion
//#region src/mcp/standalone.ts
const IMPLEMENTED_TOOLS = new Set([
	"memory_save",
	"memory_recall",
	"memory_smart_search",
	"memory_sessions",
	"memory_export",
	"memory_audit",
	"memory_governance_delete"
]);
const READ_ONLY_LOCAL_FALLBACK_TOOLS = new Set([
	"memory_recall",
	"memory_smart_search",
	"memory_sessions",
	"memory_export",
	"memory_audit"
]);
const SUPPORTED_PROTOCOL_VERSIONS = [
	"2025-11-25",
	"2025-06-18",
	"2025-03-26",
	"2024-11-05"
];
const SERVER_INFO = {
	name: "agentmemory",
	version: VERSION,
	protocolVersion: SUPPORTED_PROTOCOL_VERSIONS[0]
};
function getStandalonePersistPath() {
	return process.env["STANDALONE_PERSIST_PATH"]?.trim() || join(homedir(), ".agentmemory", "standalone.json");
}
const kv = new InMemoryKV(getStandalonePersistPath());
let modeAnnounced = false;
function displayAgentmemoryUrl() {
	const raw = process.env["AGENTMEMORY_URL"];
	if (!raw || raw.startsWith("${") && raw.endsWith("}")) return "http://localhost:3111";
	return raw;
}
function announceMode(handle) {
	if (modeAnnounced) return;
	modeAnnounced = true;
	if (handle.mode === "proxy") process.stderr.write(`[@agentmemory/mcp] proxying to agentmemory server at ${handle.baseUrl}\n`);
	else {
		const fullToolCount = getAllTools().length;
		process.stderr.write(`[@agentmemory/mcp] no server reachable at ${displayAgentmemoryUrl()}; running reduced LOCAL FALLBACK with ${IMPLEMENTED_TOOLS.size} of ${fullToolCount} tools. Start 'npx @agentmemory/agentmemory' (and point AGENTMEMORY_URL at it) to unlock all ${fullToolCount} tools.\n`);
	}
}
function normalizeList(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value.map((v) => typeof v === "string" ? v.trim() : "").filter((v) => v.length > 0);
	if (typeof value === "string") return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
	return [];
}
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
function parseLimit(raw, fallback = DEFAULT_LIMIT) {
	if (typeof raw !== "number" && typeof raw !== "string") return fallback;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.min(Math.floor(n), MAX_LIMIT);
}
function textResponse(payload, pretty = false) {
	return { content: [{
		type: "text",
		text: JSON.stringify(payload, null, pretty ? 2 : 0)
	}] };
}
function compactSessionPayload(payload) {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
	const record = payload;
	if (!Array.isArray(record["sessions"])) return payload;
	const sessions = record["sessions"].map((value) => {
		if (!value || typeof value !== "object" || Array.isArray(value)) return value;
		const session = value;
		const summary = session["summary"] && typeof session["summary"] === "object" && !Array.isArray(session["summary"]) ? session["summary"] : void 0;
		return {
			id: session["id"],
			agentId: session["agentId"],
			project: session["project"],
			cwd: session["cwd"],
			status: session["status"],
			startedAt: session["startedAt"],
			updatedAt: session["updatedAt"],
			endedAt: session["endedAt"],
			observationCount: session["observationCount"],
			retainedObservationCount: session["retainedObservationCount"],
			commitShas: session["commitShas"],
			firstPrompt: session["firstPrompt"],
			...summary ? { summary: {
				title: summary["title"],
				narrative: summary["narrative"],
				createdAt: summary["createdAt"]
			} } : {}
		};
	});
	return {
		...record,
		sessions
	};
}
function applyProjectScope(validated, args) {
	const project = typeof args["project"] === "string" && args["project"].trim() ? args["project"].trim() : void 0;
	if (args["scope"] === "global") {
		if (project) throw new Error("project and global scope are mutually exclusive");
		validated.scope = "global";
		return;
	}
	if (!project) throw new Error("project is required unless scope is explicitly global");
	validated.project = project;
}
function validate(toolName, args) {
	if (!IMPLEMENTED_TOOLS.has(toolName)) throw new Error(`Unknown tool: ${toolName}`);
	const v = { tool: toolName };
	switch (toolName) {
		case "memory_save": {
			const content = args["content"];
			if (typeof content !== "string" || !content.trim()) throw new Error("content is required");
			v.content = content;
			v.type = args["type"] || "fact";
			v.concepts = normalizeList(args["concepts"]);
			v.files = normalizeList(args["files"]);
			applyProjectScope(v, args);
			return v;
		}
		case "memory_recall":
		case "memory_smart_search": {
			const query = args["query"];
			if (typeof query !== "string" || !query.trim()) throw new Error("query is required");
			v.query = query.trim();
			v.limit = parseLimit(args["limit"]);
			const fmt = args["format"];
			if (typeof fmt === "string" && fmt.trim()) v.format = fmt.trim().toLowerCase();
			const budget = args["token_budget"];
			if (typeof budget === "number" && Number.isFinite(budget) && budget > 0) v.tokenBudget = Math.floor(budget);
			else if (typeof budget === "string" && budget.trim()) {
				const n = Number(budget);
				if (Number.isFinite(n) && n > 0) v.tokenBudget = Math.floor(n);
			}
			applyProjectScope(v, args);
			return v;
		}
		case "memory_sessions":
			v.limit = parseLimit(args["limit"], 20);
			v.format = args["format"] === "full" ? "full" : "compact";
			applyProjectScope(v, args);
			return v;
		case "memory_governance_delete": {
			const ids = normalizeList(args["memoryIds"]);
			if (ids.length === 0) throw new Error("memoryIds is required");
			v.memoryIds = ids;
			v.reason = args["reason"] || "plugin skill request";
			applyProjectScope(v, args);
			return v;
		}
		case "memory_export":
			applyProjectScope(v, args);
			return v;
		case "memory_audit":
			v.limit = parseLimit(args["limit"], 50);
			applyProjectScope(v, args);
			return v;
		default: throw new Error(`Unknown tool: ${toolName}`);
	}
}
async function handleProxy(v, handle) {
	switch (v.tool) {
		case "memory_save": return textResponse(await handle.call("/agentmemory/remember", {
			method: "POST",
			body: JSON.stringify({
				content: v.content,
				type: v.type,
				concepts: v.concepts,
				files: v.files,
				project: v.project,
				scope: v.scope
			})
		}));
		case "memory_recall": {
			const body = {
				query: v.query,
				limit: v.limit,
				format: v.format ?? "full"
			};
			if (v.tokenBudget != null) body["token_budget"] = v.tokenBudget;
			if (v.project) body["project"] = v.project;
			if (v.scope) body["scope"] = v.scope;
			return textResponse(await handle.call("/agentmemory/search", {
				method: "POST",
				body: JSON.stringify(body)
			}), true);
		}
		case "memory_smart_search": {
			const body = {
				query: v.query,
				limit: v.limit
			};
			if (v.project) body["project"] = v.project;
			if (v.scope) body["scope"] = v.scope;
			if (v.format != null) body["format"] = v.format;
			if (v.tokenBudget != null) body["token_budget"] = v.tokenBudget;
			return textResponse(await handle.call("/agentmemory/smart-search", {
				method: "POST",
				body: JSON.stringify(body)
			}), true);
		}
		case "memory_sessions": {
			const result = await handle.call(`/agentmemory/sessions?limit=${v.limit}&${v.scope === "global" ? "scope=global" : `project=${encodeURIComponent(v.project ?? "")}`}`, { method: "GET" });
			return textResponse(v.format === "full" ? result : compactSessionPayload(result), true);
		}
		case "memory_governance_delete": return textResponse(await handle.call("/agentmemory/governance/memories", {
			method: "DELETE",
			body: JSON.stringify({
				memoryIds: v.memoryIds,
				reason: v.reason,
				...v.scope === "global" ? { scope: "global" } : { project: v.project }
			})
		}));
		case "memory_export": {
			const qs = v.scope === "global" ? "?scope=global" : `?project=${encodeURIComponent(v.project ?? "")}`;
			return textResponse(await handle.call(`/agentmemory/export${qs}`, { method: "GET" }), true);
		}
		case "memory_audit": {
			const scopeQs = v.scope === "global" ? "&scope=global" : `&project=${encodeURIComponent(v.project ?? "")}`;
			return textResponse(await handle.call(`/agentmemory/audit?limit=${v.limit}${scopeQs}`, { method: "GET" }), true);
		}
		default: throw new Error(`Unknown tool: ${v.tool}`);
	}
}
async function handleLocal(v, kvInstance) {
	switch (v.tool) {
		case "memory_save": {
			const id = generateId("mem");
			const isoNow = (/* @__PURE__ */ new Date()).toISOString();
			await kvInstance.set("mem:memories", id, {
				id,
				type: v.type,
				title: (v.content || "").slice(0, 80),
				content: v.content,
				concepts: v.concepts,
				files: v.files,
				createdAt: isoNow,
				updatedAt: isoNow,
				strength: 7,
				version: 1,
				isLatest: true,
				sessionIds: [],
				project: v.project
			});
			kvInstance.persist();
			return textResponse({ saved: id });
		}
		case "memory_recall":
		case "memory_smart_search": {
			const query = (v.query || "").toLowerCase();
			const limit = v.limit ?? DEFAULT_LIMIT;
			const all = await kvInstance.list("mem:memories");
			const retrievalQuarantine = await loadRetrievalQuarantine(kvInstance, KV.migrationQuarantine);
			return textResponse({
				mode: "compact",
				results: all.filter((memory) => v.scope === "global" || memory["project"] === v.project).filter((memory) => {
					const id = typeof memory["id"] === "string" ? memory["id"] : void 0;
					if (!id) return false;
					return !retrievalQuarantine.has(retrievalQuarantineKey(KV.memories, id)) && evaluateContextCandidate(memory, {
						contextClass: "advisory",
						candidateId: id
					}).eligible;
				}).filter((m) => {
					const text = [
						typeof m["title"] === "string" ? m["title"] : "",
						typeof m["content"] === "string" ? m["content"] : "",
						Array.isArray(m["files"]) ? m["files"].join(" ") : "",
						Array.isArray(m["concepts"]) ? m["concepts"].join(" ") : "",
						Array.isArray(m["sessionIds"]) ? m["sessionIds"].join(" ") : "",
						typeof m["id"] === "string" ? m["id"] : ""
					].join(" ").toLowerCase();
					return query.split(/\s+/).every((word) => text.includes(word));
				}).slice(0, limit)
			}, true);
		}
		case "memory_sessions": {
			const sessions = await kvInstance.list("mem:sessions");
			const limit = v.limit ?? 20;
			const scoped = sessions.filter((session) => v.scope === "global" || session["project"] === v.project);
			const payload = {
				sessions: scoped.slice(0, limit),
				total: scoped.length
			};
			return textResponse(v.format === "full" ? payload : compactSessionPayload(payload), true);
		}
		case "memory_governance_delete": {
			let deleted = 0;
			for (const id of v.memoryIds || []) {
				const existing = await kvInstance.get("mem:memories", id);
				if (existing && (v.scope === "global" || existing["project"] === v.project)) {
					await kvInstance.delete("mem:memories", id);
					deleted++;
				}
			}
			kvInstance.persist();
			return textResponse({
				deleted,
				requested: (v.memoryIds || []).length,
				reason: v.reason
			});
		}
		case "memory_export": {
			const allMemories = await kvInstance.list("mem:memories");
			const allSessions = await kvInstance.list("mem:sessions");
			return textResponse({
				version: VERSION,
				memories: v.scope === "global" ? allMemories : allMemories.filter((m) => m["project"] === v.project),
				sessions: v.scope === "global" ? allSessions : allSessions.filter((s) => s["project"] === v.project)
			}, true);
		}
		case "memory_audit": {
			const allEntries = await kvInstance.list("mem:audit");
			const entries = v.scope === "global" ? allEntries : allEntries.filter((e) => typeof e["details"] === "object" && e["details"] !== null && e["details"]["project"] === v.project);
			const limit = v.limit ?? 50;
			return textResponse({ entries: entries.slice(0, limit) }, true);
		}
		default: throw new Error(`Unknown tool: ${v.tool}`);
	}
}
async function handleProxyGeneric(toolName, args, handle) {
	const result = await handle.call("/agentmemory/mcp/call", {
		method: "POST",
		body: JSON.stringify({
			name: toolName,
			arguments: args
		})
	});
	if (result && Array.isArray(result.content)) return { content: result.content };
	return textResponse(result, true);
}
async function handleToolCall(toolName, args, kvInstance = kv) {
	const handle = await resolveHandle();
	announceMode(handle);
	if (!IMPLEMENTED_TOOLS.has(toolName)) {
		if (handle.mode === "proxy") try {
			return await handleProxyGeneric(toolName, args, handle);
		} catch (err) {
			process.stderr.write(`[@agentmemory/mcp] proxy call failed for ${toolName}: ${err instanceof Error ? err.message : String(err)}\n`);
			invalidateHandle();
			throw err;
		}
		throw new Error(`Unknown tool: ${toolName} (local fallback supports only ${[...IMPLEMENTED_TOOLS].join(", ")}; start an agentmemory server and set AGENTMEMORY_URL to use the full tool set)`);
	}
	const validated = validate(toolName, args);
	if (handle.mode === "proxy") try {
		return await handleProxy(validated, handle);
	} catch (err) {
		const mayFallback = READ_ONLY_LOCAL_FALLBACK_TOOLS.has(toolName);
		process.stderr.write(`[@agentmemory/mcp] proxy call failed for ${toolName}: ${err instanceof Error ? err.message : String(err)}; invalidating handle${mayFallback ? " and falling back to local read-only data" : " without replaying the mutation locally"}\n`);
		invalidateHandle();
		if (!mayFallback) throw new Error(`proxy mutation outcome is ambiguous for ${toolName}; local fallback was not attempted`, { cause: err });
	}
	return handleLocal(validated, kvInstance);
}
async function handleToolsList() {
	const debug = process.env["AGENTMEMORY_DEBUG"] === "1" || process.env["AGENTMEMORY_DEBUG"] === "true";
	const handle = await resolveHandle();
	announceMode(handle);
	if (debug) process.stderr.write(`[@agentmemory/mcp] tools/list: handle.mode=${handle.mode}${handle.mode === "proxy" ? ` baseUrl=${handle.baseUrl}` : ""}\n`);
	if (handle.mode === "proxy") try {
		const remote = await handle.call("/agentmemory/mcp/tools", { method: "GET" });
		if (debug) {
			const shape = remote === null ? "null" : typeof remote !== "object" ? typeof remote : `keys=${Object.keys(remote).join(",")} toolsType=${Array.isArray(remote.tools) ? `array(len=${remote.tools.length})` : typeof remote.tools}`;
			process.stderr.write(`[@agentmemory/mcp] tools/list: remote response shape: ${shape}\n`);
		}
		if (remote && Array.isArray(remote.tools)) {
			if (debug) process.stderr.write(`[@agentmemory/mcp] tools/list: returning ${remote.tools.length} tools from server\n`);
			return { tools: remote.tools };
		}
		throw new Error("agentmemory server returned an invalid MCP tool catalog");
	} catch (err) {
		process.stderr.write(`[@agentmemory/mcp] tools/list proxy failed: ${err instanceof Error ? err.message : String(err)}; refusing local fallback because the server is reachable\n`);
		invalidateHandle();
		throw err;
	}
	const fallback = getAllTools().filter((t) => IMPLEMENTED_TOOLS.has(t.name));
	if (debug) process.stderr.write(`[@agentmemory/mcp] tools/list: returning ${fallback.length} local fallback tools (${fallback.map((t) => t.name).join(",")})\n`);
	return { tools: fallback };
}
let shutdownPromise = null;
async function finishShutdown() {
	if (!shutdownPromise) shutdownPromise = Promise.resolve().then(() => {
		kv.persist();
		process.exit(0);
	});
	return shutdownPromise;
}
const transport = createStdioTransport(async (method, params) => {
	switch (method) {
		case "initialize": {
			const requested = params?.protocolVersion;
			return {
				protocolVersion: typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SERVER_INFO.protocolVersion,
				capabilities: { tools: { listChanged: false } },
				serverInfo: {
					name: SERVER_INFO.name,
					version: SERVER_INFO.version
				}
			};
		}
		case "notifications/initialized": return {};
		case "tools/list": return handleToolsList();
		case "tools/call": {
			const toolName = params.name;
			const toolArgs = params.arguments || {};
			try {
				return await handleToolCall(toolName, toolArgs);
			} catch (err) {
				return {
					content: [{
						type: "text",
						text: `Error: ${err instanceof Error ? err.message : String(err)}`
					}],
					isError: true
				};
			}
		}
		default: throw new Error(`Unknown method: ${method}`);
	}
}, { onInputClose: finishShutdown });
process.stderr.write(`[@agentmemory/mcp] Standalone MCP server v${SERVER_INFO.version} starting...\n`);
transport.start();
async function shutdown() {
	await transport.stop();
	return finishShutdown();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
//#endregion
export { handleToolCall, handleToolsList };
