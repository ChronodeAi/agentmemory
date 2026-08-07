# Agentmemory Stabilization and Upstream Assessment

Date: 2026-08-07
Working tree: branch `codex/agentmemory-stability-r14`, pre-commit `HEAD=c0529fe`
Scope: local macOS runtime, Codex/Claude coding-memory lifecycle, source qualification, and fork/upstream comparison

## Executive verdict

The fork is a meaningful improvement for Chronode's coding workflow. Its strongest additions are strict project identity, scoped retrieval and deletion, evidence-aware context, commit provenance, bounded capture, health observability, and a dashboard that remains usable against a large memory corpus. These directly address the stale, cross-project, low-provenance recall failures observed in Memetics.

The fork is not a simple drop-in patch. It has accumulated real maintenance cost: a large API module, extensive AIWG evidence in the product repository, a custom qualification harness, fork-specific authentication and project configuration, and selective rather than wholesale upstream integration. That complexity is justified only if project isolation and auditable coding memory remain product requirements. It should be reduced over time, not expanded casually.

Current disposition:

- Live local runtime: **HEALTHY**, exact package installed and launchd-managed.
- Current working-tree delta: **focused tests and build pass; not qualified until a later clean-tree R-13 receipt binds the final commit SHA**.
- Broad multi-agent rollout: **not part of this change**. Codex and Claude remain the canary surfaces.
- Upstream replacement: **not recommended**. Continue a maintained fork, but regularly rebase the delta conceptually and upstream generally useful fixes.

## Version and provenance

| Surface | Version or revision | Meaning |
|---|---|---|
| Installed local package | `0.9.28-chronode.1` | Live runtime under launchd |
| Installed tarball SHA-256 | `fb72010a68191e7ce6d74df7579a6f6794450e2148e3bfe39916e097fd2e1c2a` | Exact live-package identity |
| Pre-commit working-tree HEAD | `c0529fe` | Committed predecessor, not the uncommitted stabilization delta |
| Upstream `main` | `d60652a`, package `0.9.28` | Current fetched upstream main |
| Upstream release branch | `811da6f`, package `0.9.29` | Newer release candidate/branch |
| Merge base with upstream | `6761a99` | Fork divergence point |
| Pre-commit HEAD divergence | upstream 10 commits, fork 12 commits | Computed for `HEAD=c0529fe`, not the working-tree delta |

The live tarball was produced from an intermediate stabilization worktree and is identified by its package hash, not solely by a clean Git commit. The follow-on working-tree delta described here is not byte-identical to, or live in, the installed package. At report preparation it was uncommitted and not clean-qualified. Only a later R-13 receipt bound to the final commit can change that source status; it does not change the identity of the installed tarball.

## Live runtime assessment

Launchd service:

- Label: `com.chronode.agentmemory`
- Program: `/Users/base/Library/Application Support/Agentmemory/current/bin/agentmemory`
- Release link: `fork-stability-r14-fb72010a6819`
- Policy: `RunAtLoad=true`, `KeepAlive=true`, exact Node 24 path
- Runtime persistence: launchd restarts the service after login/restart; memory state is held outside a repository checkout.

Fresh authenticated health evidence after about one hour of uptime:

- Overall status: `healthy`
- Backend, viewer, slots, and worker: healthy/connected
- Circuit breaker: closed, zero current failures
- Health alerts: none
- Search index: 8,996 keyword and 8,996 vector entries, ready
- CPU: 1.34% at collection
- Event-loop lag: 0.036 ms
- KV latency: 1.33 ms
- RSS: 917,913,600 bytes
- Capture admission: 3,102 accepted, zero rejected or failed

The service is healthy on this 128 GB host, but roughly 0.9 GB RSS is still high in absolute terms. This change establishes truthful relative-pressure health and removes repeated dashboard work; it does not claim that memory consumption is fully optimized.

The earlier apparent listener failure was a validation mistake: a sandboxed probe could not access loopback. Host-level authenticated validation succeeded without a process restart. The launchd PID and run count remained stable.

## Dashboard diagnosis and remediation

### Why health showed unknown or degraded

The old viewer conflated transport failure, non-2xx health responses, and absent fields. It could render `unknown` even when the backend had useful degraded-state details. Health thresholds also treated expected memory characteristics too bluntly, making a large but functioning corpus look unhealthy.

The fork now exposes explicit build compatibility, readiness, component status, worker state, index state, capture admission, circuit-breaker state, resource metrics, and actionable alerts. The viewer preserves non-2xx health details instead of discarding them.

### Why CPU looked high

The observed high CPU was dominated by startup/rebuild, compaction, and expensive dashboard aggregation against a large corpus. It was not sustained steady-state CPU. Bounded fan-out, persisted indexes, scoped queries, and reduced dashboard payloads remove the repeated full-corpus pressure. Fresh steady-state health measured 1.34% CPU.

### Why the dashboard flickered or went black

The previous refresh path coupled a large monolithic response with whole-view loading transitions. On this corpus, the response was about 3.37 MB and took about 11.46 seconds, causing visible blank/loading periods. The stabilized viewer keeps the shell mounted, preserves selected state, coalesces refreshes, uses scoped/paginated endpoints, and renders sections progressively.

Aside Browser validation measured about 106.5 KB and 5.02 seconds for the comparable dashboard path: approximately 96.8% less payload and 56% less wall time. Auto-refresh and manual refresh completed without a black screen or layout reset.

Evidence:

- Aside session: `/Users/base/.aside/u/0/sessions/2026-08-07_hGOtq8XY3sEwhp7K`
- Screenshot: `/Users/base/.aside/u/0/sessions/2026-08-07_hGOtq8XY3sEwhp7K/artifacts/agentmemory-dashboard-stable.png`

## Changes and strategic value

### 1. Canonical project identity and fail-closed scope

Git remotes are normalized without credentials; repositories without remotes receive a stable path hash. Recall, search, file history, sessions, slots, lessons, insights, context packets, deletion, and commit links require a project or explicit global scope.

Strategic value: the same memory service can serve many agents without silently mixing Memetics, AIWG, and unrelated repository history.

### 2. Balanced capture and bounded context

High-value actions retain useful content; low-value reads/searches retain bounded metadata. Repeated events are deduplicated, oversized outputs are clipped, generated/provider directories are excluded, and context packets have project, relevance, provenance, and token limits.

Strategic value: memory becomes a retrieval system rather than an unbounded transcript archive.

### 3. Evidence-aware memory lifecycle

The lifecycle is Recall -> Verify -> Explore -> Act -> Test -> Record -> Promote -> Commit -> Close. Recalled content remains advisory. Promotions require evidence and architecture decisions point to canonical ADRs rather than replacing them.

Strategic value: stale memory can suggest where to look but cannot overrule source, tests, commits, or accepted decisions.

### 4. Commit and session provenance

Sessions resume idempotently, parent/child agents are linked, stale sessions close without deletion, and successful commits can be linked back to the coding session.

Strategic value: future recall can explain not just what happened, but which verified change established it.

### 5. Honest health and dashboard behavior

Health now separates readiness, degradation, resource pressure, worker connectivity, slot status, search-index state, and API/viewer compatibility. Dashboard refreshes are bounded and preserve the visible shell.

Strategic value: operators can distinguish a working but busy service from a dead service, and the UI remains usable at production-like corpus size.

### 6. Runtime and data-directory safety

The CLI detects a live daemon before starting a competing worker, rejects unknown commands, supports `--data-dir` and `AGENTMEMORY_DATA_DIR`, keeps Docker's named-volume default, and preserves known legacy/Chronode stores.

Strategic value: typing `agentmemory` no longer risks creating a second worker or making an existing corpus appear missing.

### 7. Import, replay, watcher, and index correctness

Imports update lexical/vector indexes immediately; replace imports rebuild to remove stale entries. Replay and filesystem watcher records use canonical project IDs. Metadata is bounded and timestamp-normalized. Watch paths reject traversal, unknown roots, and symlink escape. External embeddings fail closed for strict and unscoped records.

Strategic value: secondary ingestion paths obey the same privacy and provenance rules as native hooks.

### 8. Consolidation and snapshot lifecycle

Consolidation is project-keyed, cooldown-gated, server-owned, and recovery-aware. Duplicate client-side consolidation was removed. Snapshot scheduling starts and stops with the worker, prevents overlap, validates timer bounds, and reports scheduler failure.

Strategic value: durable memory synthesis happens once in the correct project instead of being duplicated by every provider hook.

### 9. Provider and transport hardening

Embedding dimensions are model/config aware. Provider retries share one bounded budget and retry only 429/503 with bounded `Retry-After`. Local transformer support aligns with upstream Hugging Face v4. Large export/mesh responses fail clearly before iii's 16 MiB frame ceiling. UTF-8 request bodies are decoded only after complete buffering.

Strategic value: fewer retry storms, dimension-corrupted indexes, dropped workers, and split multibyte input.

### 10. Dependency posture

Safe transitive overrides reduced the audit from 17 to 14 findings without a forced major upgrade. The remaining 14 are 6 high and 8 moderate, with zero critical. They are concentrated in optional Hugging Face native dependencies and the `iii-sdk` 0.11.2 OpenTelemetry chain.

Strategic value: known safe patch upgrades land now while the incompatible `iii-sdk` 0.22.1 jump remains an explicit migration rather than a hidden audit-force change.

## Upstream versus fork

### Selectively aligned with newer upstream work

- `52d229d`: Claude bridge `memory/` path fix, cherry-picked as `c0529fe`.
- `6cc9b9f`: alignment basis for env hydration, import indexing, consolidation ownership, fan-out, frame/UTF-8 hardening, and provider retry behavior.
- `8c90741`: alignment basis for the Hugging Face Transformers v4 migration.
- `d8b5267`: alignment basis for data-directory support.
- `5023cf3`: alignment basis for honest deletion behavior and lesson deletion.

Except for the exact `52d229d` cherry-pick, these are alignment claims, not assertions of patch identity. The fork's contribution is adapting the concepts to stricter project/privacy contracts and qualifying them together.

Alignment map:

| Upstream basis | Fork files compared or adapted |
|---|---|
| `6cc9b9f` | `src/config.ts`, `src/functions/export-import.ts`, `src/functions/patterns.ts`, `src/functions/search.ts`, `src/functions/snapshot.ts`, `src/providers/_fetch.ts`, `src/triggers/events.ts`, `src/viewer/server.ts`, filesystem watcher |
| `8c90741` | `package.json`, `package-lock.json`, embedding providers, reranker, `tsdown.config.ts` |
| `d8b5267` | `src/cli-data-dir.ts`, `src/cli.ts`, `docker-compose.yml` |
| `5023cf3` | `src/functions/remember.ts`, lesson/forget API surfaces and tests |

### Fork-specific value

- Canonical project identity and strict cross-project isolation.
- Project capability authentication and scoped API/MCP behavior.
- Balanced capture, context packets, promotion gates, commit linkage, and project health.
- Evidence hierarchy and explicit `memory is not proof` governance.
- R-13 clean-host/local-loopback qualification receipts.
- Scoped dashboard APIs, compatibility health, and large-corpus UI stabilization.
- AIWG coding-memory lifecycle and audit surfaces.

### Upstream work not absorbed here

- Current Antigravity and Droid native connector commits.
- Wholesale upstream `main` or `release/v0.9.29` merge.
- `iii-sdk` 0.22.1 and its runtime/telemetry contract changes.

Those omissions are deliberate. Connector expansion is outside the Codex/Claude canary, and the SDK/release changes require their own compatibility qualification.

## Complexity and debt assessment

### Necessary complexity

- Project identity and scope enforcement.
- Privacy-aware provider gates.
- Commit/session provenance.
- Explicit health semantics and bounded dashboard endpoints.
- Deterministic clean-tree qualification.

### Complexity to reduce

- `src/triggers/api.ts` is too large and should be split by domain without changing routes.
- AIWG reports and generated evidence materially enlarge the repository; immutable evidence should be packaged or archived separately where governance permits.
- Project configuration, user overrides, process environment, and provider connectors need one documented precedence implementation, not parallel interpretations.
- The R-13 harness is valuable but large; helper duplication and platform assumptions should be reduced after stable qualification.
- The live tarball is hash-bound but not clean-commit-bound. The next release package should be built only from the final qualified commit and carry source SHA metadata.
- The fork version still advertises a 0.9.28 base while upstream has a 0.9.29 release branch. Adopt a clear fork release scheme after compatibility review.

### Residual high-value debt

1. Qualify or replace `iii-sdk` 0.11.2; do not apply `npm audit fix --force`.
2. Add a clean-commit package/reinstall canary after the final branch passes R-13.
3. Raise commit linkage from the previously observed 38.46% to at least 95% for agent-created commits.
4. Rebuild recall benchmarks after stale Polygres records are superseded; keep automatic gate-critical injection disabled until top-five precision reaches 80%.
5. Retain one canonical Codebase Memory index and retire the path-derived alias only after coverage validation.
6. Split the API registration module and consolidate configuration precedence without changing external contracts.
7. Evaluate upstream 0.9.29 and native connectors as separate, bounded upgrades.
8. Profile the roughly 0.9 GB steady-state RSS by heap, vector-index, and native allocation before setting lower-memory host requirements.

## Silent failures found during stabilization

- The first global npm install used a Node 26 npm shebang and wrote to the Homebrew prefix. It was removed and reinstalled under the exact Node 24 prefix.
- An operator probe assumed the obsolete label `com.agentmemory.server`; the active label is `com.chronode.agentmemory`.
- Sandboxed loopback probes produced false connection failures while the host service remained healthy.
- A raw unit-test invocation inherited user config and sandbox restrictions; it was not treated as qualifying evidence.
- Viewer health details were lost on non-2xx responses, producing `unknown`.
- Large dashboard refreshes blanked the shell and exaggerated steady-state resource concerns.
- Watcher lexical traversal checks did not cover symlink escape until this review.
- Oversized snapshot intervals could overflow Node's timer range and become rapid callbacks.
- Viewer origins were captured before user `.env` hydration.
- Full index rebuilds allowed unscoped legacy memories to use an external embedder.
- Codebase Memory currently has canonical and path-derived indexes for the same checkout; refresh/alias cleanup remains operational work.

## Verification evidence

### Historical clean-qualified artifact

- R-13 clean loopback qualification at `8725949`: 148/148 tests, clean source, 34.765 seconds, peak RSS about 604 MB, independent receipt validation passed.
- Receipt: `/private/tmp/agentmemory-r13-r14-8725949/1786108392863-0-0bfd84ab/receipt.json`

This receipt qualifies only `8725949`. It does not qualify `c0529fe`, the working-tree delta, the installed tarball, or a future commit.

### Current pre-commit working-tree checks

- R-13 harness tests: 13/13 passed under Node 24.16.0 and npm 11.13.0.
- Current focused regression: 16 files, 169 tests passed.
- Additional provider/schema regression: 8 files and 48 tests passed. A redundant network-dependent smoke file was removed after R-13 correctly rejected its conditional skip; deterministic provider behavior remains covered by mocked tests.
- Reviewer-remediation regression: 19/19 passed.
- Current production build: passed.
- Current package dry-run: passed from an isolated npm cache.
- Aside Browser: stable initial load, auto-refresh, and manual refresh; no black screen or state reset.
- Installed runtime: authenticated health returned `healthy` with no alerts.
- Final clean-tree R-13 and Codebase Memory refresh were pending at report preparation. Any later result is authoritative only through its external receipt and exact commit SHA.

## Adversarial review criteria

The final independent review must challenge:

- whether any ingestion or retrieval path can cross project boundaries;
- whether strict/unscoped content can reach external providers;
- whether health can report healthy while capture, slots, indexes, or workers are unavailable;
- whether launchd can create duplicate workers or hide restart loops;
- whether large data, retries, snapshots, or fan-out can cause resource collapse;
- whether the report overstates installed-versus-branch behavior or fork originality;
- whether remaining audit findings or upstream divergence make the release claim unsafe.

### Review outcome

Two premium reasoning-worker attempts did not return after bounded stop requests and were closed. They are recorded as orchestration failures and are not counted as review evidence.

An independent Code Reviewer returned `RETURN` with two medium findings:

1. User `.env` values were cached without file-change invalidation.
2. Replay's project-ID cache could grow on attacker-controlled nonexistent `cwd` values.

Remediation:

- `.env` caching now fingerprints device, inode, size, mtime, and ctime and reloads changed files while preserving process-environment precedence.
- Replay caches only existing paths, caps the cache at 1,024 entries with deterministic eviction, and does not cache nonexistent paths.
- Focused remediation tests passed: 19/19.

The same reviewer returned `PASS` on those two remediated findings only. This is not a branch-wide, release, or report-final PASS.

A separate governance-skeptic report review returned `RETURN` because the first draft could blur the installed tarball, pre-commit working tree, historical `8725949` receipt, and scope of the code-review PASS. It also requested auditable upstream attribution. The present revision:

- labels `c0529fe` and divergence counts as pre-commit facts;
- separates historical qualification from current working-tree checks;
- states that the exact installed tarball is not the follow-on source delta;
- narrows the code-review PASS to its two remediated findings; and
- adds the upstream alignment map above.

The governance skeptic re-read those five corrected areas and returned `PASS`. That disposition is limited to report accuracy for the returned findings; it is not Construction, package, release, or rollout authorization.

## Recommendation

Keep the exact installed package running as the local canary. Commit and clean-qualify this branch, refresh the canonical code graph, and push it for review. Do not replace the installed package with the final branch until a new clean-commit package is built, hash-bound, installed, and observed through another bounded canary. Continue explicit recall as advisory context; do not enable automatic gate-critical injection until precision and commit coverage meet their thresholds.
