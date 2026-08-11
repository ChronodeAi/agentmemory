import { createHash, randomUUID } from "node:crypto";
//#region src/state/schema.ts
const KV = {
	sessions: "mem:sessions",
	observations: (sessionId) => `mem:obs:${sessionId}`,
	memories: "mem:memories",
	summaries: "mem:summaries",
	config: "mem:config",
	metrics: "mem:metrics",
	health: "mem:health",
	embeddings: (obsId) => `mem:emb:${obsId}`,
	bm25Index: "mem:index:bm25",
	relations: "mem:relations",
	profiles: "mem:profiles",
	claudeBridge: "mem:claude-bridge",
	graphNodes: "mem:graph:nodes",
	graphEdges: "mem:graph:edges",
	graphSnapshot: "mem:graph:snapshot",
	graphNameIndex: "mem:graph:name-index",
	graphEdgeKey: "mem:graph:edge-key",
	graphNodeDegree: "mem:graph:node-degree",
	semantic: "mem:semantic",
	procedural: "mem:procedural",
	teamShared: (teamId) => `mem:team:${teamId}:shared`,
	teamUsers: (teamId, userId) => `mem:team:${teamId}:users:${userId}`,
	teamProfile: (teamId) => `mem:team:${teamId}:profile`,
	audit: "mem:audit",
	auditGaps: "mem:audit:gaps",
	actions: "mem:actions",
	actionEdges: "mem:action-edges",
	leases: "mem:leases",
	routines: "mem:routines",
	routineRuns: "mem:routine-runs",
	signals: "mem:signals",
	checkpoints: "mem:checkpoints",
	mesh: "mem:mesh",
	sketches: "mem:sketches",
	facets: "mem:facets",
	sentinels: "mem:sentinels",
	crystals: "mem:crystals",
	lessons: "mem:lessons",
	insights: "mem:insights",
	graphEdgeHistory: "mem:graph:edge-history",
	enrichedChunks: (sessionId) => `mem:enriched:${sessionId}`,
	latentEmbeddings: (obsId) => `mem:latent:${obsId}`,
	retentionScores: "mem:retention",
	accessLog: "mem:access",
	imageRefs: "mem:image-refs",
	imageEmbeddings: "mem:image-embeddings",
	slots: "mem:slots",
	projectSlots: (project) => `mem:slots:project:${createHash("sha256").update(project).digest("hex").slice(0, 24)}`,
	globalSlots: "mem:slots:global",
	injectedSources: (sessionId) => `mem:injected-sources:${sessionId}`,
	contextDeliveryReceipts: "mem:context-delivery-receipts",
	factLedger: (sessionId) => `mem:fact-ledger:${sessionId}`,
	projectMetrics: (project) => `mem:project-metrics:${createHash("sha256").update(project).digest("hex").slice(0, 24)}`,
	promotionCandidates: (project) => `mem:promotion-candidates:${createHash("sha256").update(project).digest("hex").slice(0, 24)}`,
	migrationQuarantine: "mem:migration:quarantine",
	migrationReports: "mem:migration:reports",
	state: "mem:state",
	commits: "mem:commits",
	recentSearches: "mem:recent-searches"
};
function generateId(prefix) {
	return `${prefix}_${Date.now().toString(36)}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
//#endregion
//#region src/state/keyed-mutex.ts
const locks = /* @__PURE__ */ new Map();
function withKeyedLock(key, fn) {
	const next = (locks.get(key) ?? Promise.resolve()).then(fn, fn);
	const cleanup = next.then(() => {}, () => {});
	locks.set(key, cleanup);
	cleanup.then(() => {
		if (locks.get(key) === cleanup) locks.delete(key);
	});
	return next;
}
Object.freeze({
	id: randomUUID(),
	startedAt: (/* @__PURE__ */ new Date()).toISOString(),
	pid: process.pid
});
process.env["AGENTMEMORY_VERBOSE"] === "1" || process.env["AGENTMEMORY_VERBOSE"];
//#endregion
//#region src/functions/audit.ts
let auditPersistence = createAuditPersistenceHealth();
function createAuditPersistenceHealth() {
	return {
		status: "idle",
		attempts: 0,
		succeeded: 0,
		failed: 0,
		pending: 0,
		recovered: 0,
		unresolvedFailures: 0
	};
}
function auditErrorCode(error) {
	const code = error?.code;
	if (typeof code === "string" && code.trim()) return code.trim().slice(0, 96);
	const message = error instanceof Error ? error.message : String(error);
	return /timeout|timed out|invocation stopped/i.test(message) ? "TIMEOUT" : "AUDIT_PERSISTENCE_FAILED";
}
function createAuditEntry(operation, functionId, targetIds, details = {}, qualityScore, userId) {
	return {
		id: generateId("aud"),
		timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		operation,
		userId,
		functionId,
		targetIds,
		details,
		qualityScore
	};
}
async function writeAuditEntry(kv, entry) {
	auditPersistence.attempts += 1;
	auditPersistence.lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
	try {
		await kv.set(KV.audit, entry.id, entry);
		auditPersistence.succeeded += 1;
		auditPersistence.status = auditPersistence.pending > 0 ? "recovering" : "ready";
		auditPersistence.lastSuccessAt = (/* @__PURE__ */ new Date()).toISOString();
		if (auditPersistence.pending === 0) auditPersistence.lastErrorCode = void 0;
		return entry;
	} catch (error) {
		auditPersistence.failed += 1;
		auditPersistence.status = "failed";
		auditPersistence.lastFailureAt = (/* @__PURE__ */ new Date()).toISOString();
		auditPersistence.lastErrorCode = auditErrorCode(error);
		throw error;
	}
}
async function recordAudit(kv, operation, functionId, targetIds, details = {}, qualityScore, userId) {
	return writeAuditEntry(kv, createAuditEntry(operation, functionId, targetIds, details, qualityScore, userId));
}
//#endregion
//#region src/functions/diagnostics.ts
const ALL_CATEGORIES = [
	"actions",
	"leases",
	"sentinels",
	"sketches",
	"signals",
	"sessions",
	"memories",
	"lessons",
	"summaries",
	"semantic",
	"procedural",
	"crystals",
	"insights",
	"mesh"
];
const TWENTY_FOUR_HOURS_MS = 1440 * 60 * 1e3;
const ONE_HOUR_MS = 3600 * 1e3;
function registerDiagnosticsFunction(sdk, kv) {
	sdk.registerFunction("mem::diagnose", async (data) => {
		const categories = data.categories && data.categories.length > 0 ? data.categories.filter((c) => ALL_CATEGORIES.includes(c)) : ALL_CATEGORIES;
		const checks = [];
		const now = Date.now();
		if (categories.includes("actions")) {
			const actions = await kv.list(KV.actions);
			const allEdges = await kv.list(KV.actionEdges);
			const leases = await kv.list(KV.leases);
			const actionMap = new Map(actions.map((a) => [a.id, a]));
			for (const action of actions) {
				if (action.status === "active") {
					if (!leases.some((l) => l.actionId === action.id && l.status === "active" && new Date(l.expiresAt).getTime() > now)) checks.push({
						name: `active-no-lease:${action.id}`,
						category: "actions",
						status: "warn",
						message: `Action "${action.title}" is active but has no active lease`,
						fixable: false
					});
				}
				if (action.status === "blocked") {
					const deps = allEdges.filter((e) => e.sourceActionId === action.id && e.type === "requires");
					if (deps.length > 0) {
						if (deps.every((d) => {
							const target = actionMap.get(d.targetActionId);
							return target && target.status === "done";
						})) checks.push({
							name: `blocked-deps-done:${action.id}`,
							category: "actions",
							status: "fail",
							message: `Action "${action.title}" is blocked but all dependencies are done`,
							fixable: true
						});
					}
				}
				if (action.status === "pending") {
					const deps = allEdges.filter((e) => e.sourceActionId === action.id && e.type === "requires");
					if (deps.length > 0) {
						if (deps.some((d) => {
							const target = actionMap.get(d.targetActionId);
							return !target || target.status !== "done";
						})) checks.push({
							name: `pending-unsatisfied-deps:${action.id}`,
							category: "actions",
							status: "fail",
							message: `Action "${action.title}" is pending but has unsatisfied dependencies`,
							fixable: true
						});
					}
				}
			}
			if (!checks.some((c) => c.category === "actions" && c.status !== "pass")) checks.push({
				name: "actions-ok",
				category: "actions",
				status: "pass",
				message: `All ${actions.length} actions are consistent`,
				fixable: false
			});
		}
		if (categories.includes("leases")) {
			const leases = await kv.list(KV.leases);
			const actions = await kv.list(KV.actions);
			const actionIds = new Set(actions.map((a) => a.id));
			let leaseIssues = 0;
			for (const lease of leases) {
				if (lease.status === "active" && new Date(lease.expiresAt).getTime() <= now) {
					checks.push({
						name: `expired-lease:${lease.id}`,
						category: "leases",
						status: "fail",
						message: `Lease ${lease.id} for action ${lease.actionId} expired at ${lease.expiresAt}`,
						fixable: true
					});
					leaseIssues++;
				}
				if (!actionIds.has(lease.actionId)) {
					checks.push({
						name: `orphaned-lease:${lease.id}`,
						category: "leases",
						status: "fail",
						message: `Lease ${lease.id} references non-existent action ${lease.actionId}`,
						fixable: true
					});
					leaseIssues++;
				}
			}
			if (leaseIssues === 0) checks.push({
				name: "leases-ok",
				category: "leases",
				status: "pass",
				message: `All ${leases.length} leases are healthy`,
				fixable: false
			});
		}
		if (categories.includes("sentinels")) {
			const sentinels = await kv.list(KV.sentinels);
			const actions = await kv.list(KV.actions);
			const actionIds = new Set(actions.map((a) => a.id));
			let sentinelIssues = 0;
			for (const sentinel of sentinels) {
				if (sentinel.status === "watching" && sentinel.expiresAt && new Date(sentinel.expiresAt).getTime() <= now) {
					checks.push({
						name: `expired-sentinel:${sentinel.id}`,
						category: "sentinels",
						status: "fail",
						message: `Sentinel "${sentinel.name}" expired at ${sentinel.expiresAt}`,
						fixable: true
					});
					sentinelIssues++;
				}
				for (const actionId of sentinel.linkedActionIds) if (!actionIds.has(actionId)) {
					checks.push({
						name: `sentinel-missing-action:${sentinel.id}:${actionId}`,
						category: "sentinels",
						status: "warn",
						message: `Sentinel "${sentinel.name}" references non-existent action ${actionId}`,
						fixable: false
					});
					sentinelIssues++;
				}
			}
			if (sentinelIssues === 0) checks.push({
				name: "sentinels-ok",
				category: "sentinels",
				status: "pass",
				message: `All ${sentinels.length} sentinels are healthy`,
				fixable: false
			});
		}
		if (categories.includes("sketches")) {
			const sketches = await kv.list(KV.sketches);
			let sketchIssues = 0;
			for (const sketch of sketches) if (sketch.status === "active" && new Date(sketch.expiresAt).getTime() <= now) {
				checks.push({
					name: `expired-sketch:${sketch.id}`,
					category: "sketches",
					status: "fail",
					message: `Sketch "${sketch.title}" expired at ${sketch.expiresAt}`,
					fixable: true
				});
				sketchIssues++;
			}
			if (sketchIssues === 0) checks.push({
				name: "sketches-ok",
				category: "sketches",
				status: "pass",
				message: `All ${sketches.length} sketches are healthy`,
				fixable: false
			});
		}
		if (categories.includes("signals")) {
			const signals = await kv.list(KV.signals);
			let signalIssues = 0;
			for (const signal of signals) if (signal.expiresAt && new Date(signal.expiresAt).getTime() <= now) {
				checks.push({
					name: `expired-signal:${signal.id}`,
					category: "signals",
					status: "fail",
					message: `Signal from "${signal.from}" expired at ${signal.expiresAt}`,
					fixable: true
				});
				signalIssues++;
			}
			if (signalIssues === 0) checks.push({
				name: "signals-ok",
				category: "signals",
				status: "pass",
				message: `All ${signals.length} signals are healthy`,
				fixable: false
			});
		}
		if (categories.includes("sessions")) {
			const sessions = await kv.list(KV.sessions);
			let sessionIssues = 0;
			for (const session of sessions) {
				const touchedAt = new Date(session.updatedAt ?? session.resumedAt ?? session.startedAt).getTime();
				if (session.status === "active" && Number.isFinite(touchedAt) && now - touchedAt > TWENTY_FOUR_HOURS_MS) {
					checks.push({
						name: `abandoned-session:${session.id}`,
						category: "sessions",
						status: "warn",
						message: `Session ${session.id} has had no activity for over 24 hours`,
						fixable: false
					});
					sessionIssues++;
				}
			}
			if (sessionIssues === 0) checks.push({
				name: "sessions-ok",
				category: "sessions",
				status: "pass",
				message: `All ${sessions.length} sessions are healthy`,
				fixable: false
			});
		}
		if (categories.includes("memories")) {
			const memories = await kv.list(KV.memories);
			const memoryIds = new Set(memories.map((m) => m.id));
			const supersededBy = /* @__PURE__ */ new Map();
			let memoryIssues = 0;
			for (const memory of memories) if (memory.supersedes && memory.supersedes.length > 0) for (const sid of memory.supersedes) {
				if (!memoryIds.has(sid)) {
					checks.push({
						name: `memory-missing-supersedes:${memory.id}:${sid}`,
						category: "memories",
						status: "warn",
						message: `Memory "${memory.title}" supersedes non-existent memory ${sid}`,
						fixable: false
					});
					memoryIssues++;
				}
				supersededBy.set(sid, memory.id);
			}
			for (const memory of memories) if (memory.isLatest && supersededBy.has(memory.id)) {
				checks.push({
					name: `memory-stale-latest:${memory.id}`,
					category: "memories",
					status: "fail",
					message: `Memory "${memory.title}" has isLatest=true but is superseded by ${supersededBy.get(memory.id)}`,
					fixable: true
				});
				memoryIssues++;
			}
			const latestMemories = memories.filter((m) => m.isLatest);
			const unscopedCount = latestMemories.filter((m) => !m.project).length;
			if (unscopedCount === 0) checks.push({
				name: "memory-project-coverage",
				category: "memories",
				status: "pass",
				message: `All ${latestMemories.length} latest memories have a project scope`,
				fixable: false
			});
			else if (unscopedCount <= 10) checks.push({
				name: "memory-project-coverage",
				category: "memories",
				status: "warn",
				message: `${unscopedCount} of ${latestMemories.length} latest memories have no project scope — run POST /agentmemory/migrate {"step":"infer-memory-projects"} to backfill`,
				fixable: true
			});
			else checks.push({
				name: "memory-project-coverage",
				category: "memories",
				status: "fail",
				message: `${unscopedCount} of ${latestMemories.length} latest memories have no project scope — run POST /agentmemory/migrate {"step":"infer-memory-projects"} to backfill`,
				fixable: true
			});
			if (memoryIssues === 0) checks.push({
				name: "memories-ok",
				category: "memories",
				status: "pass",
				message: `All ${memories.length} memories are structurally consistent`,
				fixable: false
			});
		}
		if (categories.includes("lessons")) {
			const lessons = await kv.list(KV.lessons);
			const live = lessons.filter((l) => !l.deleted);
			let lessonIssues = 0;
			for (const l of live) if (!Number.isFinite(l.confidence) || l.confidence < 0 || l.confidence > 1) {
				checks.push({
					name: `lesson-bad-confidence:${l.id}`,
					category: "lessons",
					status: "warn",
					message: `Lesson ${l.id} has confidence ${l.confidence} (expected finite number in 0..1)`,
					fixable: false
				});
				lessonIssues++;
			}
			if (lessonIssues === 0) checks.push({
				name: "lessons-ok",
				category: "lessons",
				status: "pass",
				message: `All ${live.length} lessons are healthy (${lessons.length - live.length} tombstoned)`,
				fixable: false
			});
		}
		if (categories.includes("summaries")) {
			const summaries = await kv.list(KV.summaries);
			let summaryIssues = 0;
			for (const s of summaries) if (typeof s.title !== "string" || s.title.trim().length === 0) {
				checks.push({
					name: `summary-missing-title:${s.sessionId}`,
					category: "summaries",
					status: "warn",
					message: `Summary for session ${s.sessionId} has no title`,
					fixable: false
				});
				summaryIssues++;
			}
			if (summaryIssues === 0) checks.push({
				name: "summaries-ok",
				category: "summaries",
				status: "pass",
				message: `All ${summaries.length} session summaries are consistent`,
				fixable: false
			});
		}
		if (categories.includes("semantic")) {
			const semantic = await kv.list(KV.semantic);
			let semanticIssues = 0;
			for (const s of semantic) if (!Number.isFinite(s.confidence) || s.confidence < 0 || s.confidence > 1) {
				checks.push({
					name: `semantic-bad-confidence:${s.id}`,
					category: "semantic",
					status: "warn",
					message: `Semantic fact ${s.id} has confidence ${s.confidence} (expected finite number in 0..1)`,
					fixable: false
				});
				semanticIssues++;
			}
			if (semanticIssues === 0) checks.push({
				name: "semantic-ok",
				category: "semantic",
				status: "pass",
				message: `All ${semantic.length} semantic memories are consistent`,
				fixable: false
			});
		}
		if (categories.includes("procedural")) {
			const procedural = await kv.list(KV.procedural);
			let proceduralIssues = 0;
			for (const p of procedural) if (!Array.isArray(p.steps) || p.steps.length === 0) {
				checks.push({
					name: `procedural-empty-steps:${p.id}`,
					category: "procedural",
					status: "warn",
					message: `Procedural memory "${p.name}" (${p.id}) has no steps`,
					fixable: false
				});
				proceduralIssues++;
			}
			if (proceduralIssues === 0) checks.push({
				name: "procedural-ok",
				category: "procedural",
				status: "pass",
				message: `All ${procedural.length} procedural memories are consistent`,
				fixable: false
			});
		}
		if (categories.includes("crystals")) {
			const crystals = await kv.list(KV.crystals);
			let crystalIssues = 0;
			for (const c of crystals) if (typeof c.narrative !== "string" || c.narrative.trim().length === 0) {
				checks.push({
					name: `crystal-empty-narrative:${c.id}`,
					category: "crystals",
					status: "warn",
					message: `Crystal ${c.id} has empty narrative`,
					fixable: false
				});
				crystalIssues++;
			}
			if (crystalIssues === 0) checks.push({
				name: "crystals-ok",
				category: "crystals",
				status: "pass",
				message: `All ${crystals.length} crystals are consistent`,
				fixable: false
			});
		}
		if (categories.includes("insights")) {
			const insights = await kv.list(KV.insights);
			let insightIssues = 0;
			for (const i of insights) if (!Number.isFinite(i.confidence) || i.confidence < 0 || i.confidence > 1) {
				checks.push({
					name: `insight-bad-confidence:${i.id}`,
					category: "insights",
					status: "warn",
					message: `Insight ${i.id} has confidence ${i.confidence} (expected finite number in 0..1)`,
					fixable: false
				});
				insightIssues++;
			}
			if (insightIssues === 0) checks.push({
				name: "insights-ok",
				category: "insights",
				status: "pass",
				message: `All ${insights.length} insights are consistent`,
				fixable: false
			});
		}
		if (categories.includes("mesh")) {
			const peers = await kv.list(KV.mesh);
			let meshIssues = 0;
			for (const peer of peers) {
				if (peer.lastSyncAt && now - new Date(peer.lastSyncAt).getTime() > ONE_HOUR_MS) {
					checks.push({
						name: `stale-peer:${peer.id}`,
						category: "mesh",
						status: "warn",
						message: `Peer "${peer.name}" last synced over 1 hour ago`,
						fixable: false
					});
					meshIssues++;
				}
				if (peer.status === "error") {
					checks.push({
						name: `error-peer:${peer.id}`,
						category: "mesh",
						status: "warn",
						message: `Peer "${peer.name}" is in error state`,
						fixable: false
					});
					meshIssues++;
				}
			}
			if (meshIssues === 0) checks.push({
				name: "mesh-ok",
				category: "mesh",
				status: "pass",
				message: `All ${peers.length} mesh peers are healthy`,
				fixable: false
			});
		}
		return {
			success: true,
			checks,
			summary: {
				pass: checks.filter((c) => c.status === "pass").length,
				warn: checks.filter((c) => c.status === "warn").length,
				fail: checks.filter((c) => c.status === "fail").length,
				fixable: checks.filter((c) => c.fixable).length
			}
		};
	});
	sdk.registerFunction("mem::heal", async (data) => {
		const dryRun = data.dryRun ?? false;
		const categories = data.categories && data.categories.length > 0 ? data.categories.filter((c) => ALL_CATEGORIES.includes(c)) : ALL_CATEGORIES;
		let fixed = 0;
		let skipped = 0;
		const details = [];
		const now = Date.now();
		if (categories.includes("actions")) {
			const actions = await kv.list(KV.actions);
			const allEdges = await kv.list(KV.actionEdges);
			const actionMap = new Map(actions.map((a) => [a.id, a]));
			for (const action of actions) {
				if (action.status === "blocked") {
					const deps = allEdges.filter((e) => e.sourceActionId === action.id && e.type === "requires");
					if (deps.length > 0) {
						if (deps.every((d) => {
							const target = actionMap.get(d.targetActionId);
							return target && target.status === "done";
						})) {
							if (dryRun) {
								details.push(`[dry-run] Would unblock action "${action.title}" (${action.id})`);
								fixed++;
								continue;
							}
							if (await withKeyedLock(`mem:action:${action.id}`, async () => {
								const fresh = await kv.get(KV.actions, action.id);
								if (!fresh || fresh.status !== "blocked") return false;
								const freshDeps = (await kv.list(KV.actionEdges)).filter((e) => e.sourceActionId === fresh.id && e.type === "requires");
								const freshActions = await kv.list(KV.actions);
								const freshMap = new Map(freshActions.map((a) => [a.id, a]));
								if (!freshDeps.every((d) => {
									const target = freshMap.get(d.targetActionId);
									return target && target.status === "done";
								})) return false;
								fresh.status = "pending";
								fresh.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
								await kv.set(KV.actions, fresh.id, fresh);
								await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
									reason: "blocked-deps-done",
									previousStatus: "blocked",
									newStatus: "pending"
								});
								return true;
							})) {
								details.push(`Unblocked action "${action.title}" (${action.id})`);
								fixed++;
							} else skipped++;
						}
					}
				}
				if (action.status === "pending") {
					const deps = allEdges.filter((e) => e.sourceActionId === action.id && e.type === "requires");
					if (deps.length > 0) {
						if (deps.some((d) => {
							const target = actionMap.get(d.targetActionId);
							return !target || target.status !== "done";
						})) {
							if (dryRun) {
								details.push(`[dry-run] Would block action "${action.title}" (${action.id})`);
								fixed++;
								continue;
							}
							if (await withKeyedLock(`mem:action:${action.id}`, async () => {
								const fresh = await kv.get(KV.actions, action.id);
								if (!fresh || fresh.status !== "pending") return false;
								const freshDeps = (await kv.list(KV.actionEdges)).filter((e) => e.sourceActionId === fresh.id && e.type === "requires");
								const freshActions = await kv.list(KV.actions);
								const freshMap = new Map(freshActions.map((a) => [a.id, a]));
								if (!freshDeps.some((d) => {
									const target = freshMap.get(d.targetActionId);
									return !target || target.status !== "done";
								})) return false;
								fresh.status = "blocked";
								fresh.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
								await kv.set(KV.actions, fresh.id, fresh);
								await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
									reason: "pending-unsatisfied-deps",
									previousStatus: "pending",
									newStatus: "blocked"
								});
								return true;
							})) {
								details.push(`Blocked action "${action.title}" (${action.id})`);
								fixed++;
							} else skipped++;
						}
					}
				}
			}
		}
		if (categories.includes("leases")) {
			const leases = await kv.list(KV.leases);
			const actions = await kv.list(KV.actions);
			const actionIds = new Set(actions.map((a) => a.id));
			for (const lease of leases) {
				if (lease.status === "active" && new Date(lease.expiresAt).getTime() <= now) {
					if (dryRun) {
						details.push(`[dry-run] Would expire lease ${lease.id} for action ${lease.actionId}`);
						fixed++;
						continue;
					}
					if (await withKeyedLock(`mem:action:${lease.actionId}`, async () => {
						const fresh = await kv.get(KV.leases, lease.id);
						if (!fresh || fresh.status !== "active" || new Date(fresh.expiresAt).getTime() > Date.now()) return false;
						fresh.status = "expired";
						await kv.set(KV.leases, fresh.id, fresh);
						await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
							entityType: "lease",
							reason: "expired-lease",
							newStatus: "expired"
						});
						const action = await kv.get(KV.actions, fresh.actionId);
						if (action && action.status === "active" && action.assignedTo === fresh.agentId) {
							action.status = "pending";
							action.assignedTo = void 0;
							action.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
							await kv.set(KV.actions, action.id, action);
							await recordAudit(kv, "heal", "mem::heal", [action.id], {
								entityType: "action",
								reason: "release-expired-lease",
								newStatus: "pending"
							});
						}
						return true;
					})) {
						details.push(`Expired lease ${lease.id} for action ${lease.actionId}`);
						fixed++;
					} else skipped++;
					continue;
				}
				if (!actionIds.has(lease.actionId)) {
					if (dryRun) {
						details.push(`[dry-run] Would delete orphaned lease ${lease.id}`);
						fixed++;
						continue;
					}
					await kv.delete(KV.leases, lease.id);
					await recordAudit(kv, "heal", "mem::heal", [lease.id], {
						entityType: "lease",
						reason: "orphaned-lease",
						action: "delete"
					});
					details.push(`Deleted orphaned lease ${lease.id}`);
					fixed++;
				}
			}
		}
		if (categories.includes("sentinels")) {
			const sentinels = await kv.list(KV.sentinels);
			for (const sentinel of sentinels) if (sentinel.status === "watching" && sentinel.expiresAt && new Date(sentinel.expiresAt).getTime() <= now) {
				if (dryRun) {
					details.push(`[dry-run] Would expire sentinel "${sentinel.name}" (${sentinel.id})`);
					fixed++;
					continue;
				}
				if (await withKeyedLock(`mem:sentinel:${sentinel.id}`, async () => {
					const fresh = await kv.get(KV.sentinels, sentinel.id);
					if (!fresh || fresh.status !== "watching") return false;
					if (!fresh.expiresAt || new Date(fresh.expiresAt).getTime() > Date.now()) return false;
					fresh.status = "expired";
					await kv.set(KV.sentinels, fresh.id, fresh);
					await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
						entityType: "sentinel",
						reason: "expired-sentinel",
						newStatus: "expired"
					});
					return true;
				})) {
					details.push(`Expired sentinel "${sentinel.name}" (${sentinel.id})`);
					fixed++;
				} else skipped++;
			}
		}
		if (categories.includes("sketches")) {
			const sketches = await kv.list(KV.sketches);
			for (const sketch of sketches) if (sketch.status === "active" && new Date(sketch.expiresAt).getTime() <= now) {
				if (dryRun) {
					details.push(`[dry-run] Would discard expired sketch "${sketch.title}" (${sketch.id})`);
					fixed++;
					continue;
				}
				if (await withKeyedLock(`mem:sketch:${sketch.id}`, async () => {
					const fresh = await kv.get(KV.sketches, sketch.id);
					if (!fresh || fresh.status !== "active" || new Date(fresh.expiresAt).getTime() > Date.now()) return false;
					const allEdges = await kv.list(KV.actionEdges);
					const actionIdSet = new Set(fresh.actionIds);
					for (const edge of allEdges) if (actionIdSet.has(edge.sourceActionId) || actionIdSet.has(edge.targetActionId)) {
						await kv.delete(KV.actionEdges, edge.id);
						await recordAudit(kv, "heal", "mem::heal", [edge.id], {
							entityType: "actionEdge",
							reason: "sketch-gc-discard",
							action: "delete"
						});
					}
					for (const actionId of fresh.actionIds) {
						await kv.delete(KV.actions, actionId);
						await recordAudit(kv, "heal", "mem::heal", [actionId], {
							entityType: "action",
							reason: "sketch-gc-discard",
							action: "delete"
						});
					}
					fresh.status = "discarded";
					fresh.discardedAt = (/* @__PURE__ */ new Date()).toISOString();
					await kv.set(KV.sketches, fresh.id, fresh);
					await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
						entityType: "sketch",
						reason: "expired-sketch",
						newStatus: "discarded"
					});
					return true;
				})) {
					details.push(`Discarded expired sketch "${sketch.title}" (${sketch.id})`);
					fixed++;
				} else skipped++;
			}
		}
		if (categories.includes("signals")) {
			const signals = await kv.list(KV.signals);
			for (const signal of signals) if (signal.expiresAt && new Date(signal.expiresAt).getTime() <= now) {
				if (dryRun) {
					details.push(`[dry-run] Would delete expired signal ${signal.id}`);
					fixed++;
					continue;
				}
				await kv.delete(KV.signals, signal.id);
				await recordAudit(kv, "heal", "mem::heal", [signal.id], {
					entityType: "signal",
					reason: "expired-signal",
					action: "delete"
				});
				details.push(`Deleted expired signal ${signal.id}`);
				fixed++;
			}
		}
		if (categories.includes("memories")) {
			const memories = await kv.list(KV.memories);
			const supersededBy = /* @__PURE__ */ new Map();
			for (const memory of memories) if (memory.supersedes && memory.supersedes.length > 0) for (const sid of memory.supersedes) supersededBy.set(sid, memory.id);
			for (const memory of memories) if (memory.isLatest && supersededBy.has(memory.id)) {
				if (dryRun) {
					details.push(`[dry-run] Would set isLatest=false on memory "${memory.title}" (${memory.id})`);
					fixed++;
					continue;
				}
				if (await withKeyedLock(`mem:memory:${memory.id}`, async () => {
					const fresh = await kv.get(KV.memories, memory.id);
					if (!fresh || !fresh.isLatest) return false;
					fresh.isLatest = false;
					fresh.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
					await kv.set(KV.memories, fresh.id, fresh);
					await recordAudit(kv, "heal", "mem::heal", [fresh.id], {
						entityType: "memory",
						reason: "superseded-memory-mark-non-latest",
						action: "update"
					});
					return true;
				})) {
					details.push(`Set isLatest=false on memory "${memory.title}" (${memory.id})`);
					fixed++;
				} else skipped++;
			}
		}
		return {
			success: true,
			fixed,
			skipped,
			details
		};
	});
}
//#endregion
export { registerDiagnosticsFunction };
