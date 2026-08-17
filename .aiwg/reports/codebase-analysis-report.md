# Codebase Analysis Report

Status: Evidence report; not an approval
Date: 2026-07-25
Revision: `ae4f5e144d1c340f7c949580df94392b77979ad1`
Comparison base: `6761a99ba1e609a9e2e4d5fda54e4b126def0a42`

## Repository authority

- `origin`: `https://github.com/ChronodeAi/agentmemory.git`
- `upstream`: `https://github.com/rohitg00/agentmemory.git`
- Branch: `codex/universal-coding-memory`
- Implemented change: commit `078001a` (coding-memory lifecycle) plus `b17d5d2` (viewer health/scoped dashboard) and `ae4f5e1` (AIWG adoption).
- Base-to-HEAD change: 161 files, 11,188 insertions, 811 deletions.
- Pre-full-run worktree state: no tracked changes and only the session-manager
  runtime file `.aiwg/sessions.json`.
- No accepted project ADRs or architecture baseline were found.

The Codebase Memory graph for this exact worktree was ready at the analyzed revision with 5,635 nodes and 15,375 edges. Three files were partially parsed; this report therefore uses live source/tests as higher authority and does not treat graph coverage as completeness.

## Implemented evidence

| Area | Current evidence | Assessment |
|---|---|---|
| Project identity | Remote normalization without credentials; hashed path fallback; path-scoped overrides | Implemented with focused tests |
| Configuration | Process env precedes user/repository values; secret-file fallback | Implemented with focused tests |
| Scope | Fail-closed project reads; explicit `scope: global`; project-aware dedupe and consolidation | Implemented with focused tests |
| Sessions | Keyed idempotent start/resume; child-link set dedupe; stale sessions become abandoned | Implemented with focused tests |
| Capture/privacy | Profiles, output bounds, exclusions, regex/private-tag redaction, strict local processing | Implemented, fixture breadth insufficient |
| Slots | Namespaced scopes, list/pin/shadow behaviors | Implemented with focused tests |
| Context | Project/session check; search and lesson assembly; 2,000-token cap; per-session source suppression | Partial |
| Commit/project health | Idempotent commit links and scope/duplicate/commit metrics | Partial; runtime eligibility evidence absent |
| Promotions | Source-count/regex checks; architecture promotion requires ADR plus commit; simple recalled-context exclusion | Partial; evidence eligibility is not authoritative |
| Provider connectors | Direct binary and `npx` recognition; idempotent Claude repair; unrelated-hook merge; Codex lifecycle hooks | Substantially implemented |
| Standalone MCP | Proxy probe/fallback and force-proxy paths | Partial; server-backed fail-closed contract needs explicit release proof |
| Viewer | Scoped aggregate queries and non-`Unknown` failure label | Partial; backend/viewer build identity absent |

## Material gaps found

1. Context sources are marked injected when a packet is built, not when delivery is acknowledged.
2. Packet selection is not eligibility-first and labels broad project lessons as verified without authoritative evidence checks.
3. No complete temporal-validity contract prevents stale committed or uncommitted facts from entering gate-critical packets.
4. Uncommitted-work provenance and project-scoped file/commit history do not provide the required end-to-end authority chain.
5. The schema exposes an exact-facts ledger, but operational compaction/ledger behavior is not demonstrated.
6. Promotion evidence relies partly on content regex/source count rather than recorded test, runtime, commit, or accepted-ADR evidence.
7. A typed `FEATURE_DISABLED` behavior was not found for disabled integration features.
8. Sustained health/backpressure semantics and declared-concurrency latency are not release-tested.
9. Viewer/backend compatible build identities are not surfaced; avoiding the literal word `Unknown` is insufficient.
10. No repository-local `.agentmemory/project.yaml` or `.codebase-memory/config.toml` exists at this revision.
11. The canonical `npm test` command exits 137 under unconstrained parallelism even though the same suite passes with one worker.

## Operator-reported adversarial evidence

The following Memetics incidents were supplied as required design evidence and were not independently inspected during this run:

- repetitive recall centered on an obsolete 120-line adapter while live code was 746 lines;
- stale Polygres-managed PostgreSQL posture conflicting with ordinary PostgreSQL authority;
- a packet that mislabeled the repository as TypeScript and mixed unrelated AIWG/web-scraping activity;
- about 60–65% bounded-recall precision;
- 38.46% commit coverage, no useful project-scoped history for predominantly uncommitted work, and only synthetic-canary commit links;
- critical memory pressure misclassified by CLI health;
- slot listing returning HTTP 500;
- empty promotions, lessons, and insights;
- duplicate canonical/path Codebase Memory indexes.

These incidents make explicit-only recall and a prohibition on automatic gate-critical injection mandatory until release acceptance.

## Verification performed

- Nested default `npm test` attempts exited 137 before useful Vitest output.
- The nested bounded suite initially reported 130/137 files and 1,430/1,463 tests passing; its failures were sandbox- and environment-sensitive.
- Parent validation removed ambient provider variables, isolated `HOME`, allowed loopback binding, and passed 137/137 files and 1,463/1,463 tests in bounded serial mode.
- The clean branch-focused suite independently passed 18 files and 130 tests.
- Parent validation reran the canonical unconstrained `npm test`; it still exited 137 immediately, establishing a test-runner resource-profile defect rather than a test assertion failure.
- No live service, sustained soak, concurrent multi-agent, human-labelled retrieval, downstream answer-quality, external Codebase Memory reindex, rollback rehearsal, or Memetics canary was performed.

## Analysis conclusion

The branch is a substantial implementation candidate, not a construction-ready or rollout-ready baseline. Planning can proceed conditionally. Construction authorization remains blocked pending accepted architecture/security/test decisions and objective release evidence.
