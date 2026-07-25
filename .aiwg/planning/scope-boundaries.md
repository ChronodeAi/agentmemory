# Scope Boundaries

Status: Draft
Date: 2026-07-25

## In scope for the planned construction effort

- Canonical credential-free Git-remote identity with hashed-path fallback.
- Worktree and alias migration, project namespaces, strict project scope, and explicit global scope.
- Project filters on every retrieval, expanded-result, session, file-history, and commit-history surface.
- Semantic and event-hash deduplication.
- Idempotent resumed/child sessions and stale-session closure.
- Balanced bounded capture, exclusion policy, redaction, and strict local-processing privacy.
- Rolling compaction with an exact-facts ledger.
- Eligibility-first 2,000-token context packets, per-session source deduplication, temporal validity, provenance, and delivery acknowledgement.
- Evidence-gated promotion, self-reinforcement prevention, explicit-only native-memory synchronization, commit linkage, and project health.
- Codex and Claude configuration, connector repair, hook coverage, backpressure, typed disabled-feature errors, fail-closed server-backed MCP, sustained health, slots, and viewer/backend build identity.
- Verification and rollback evidence defined in the master test plan.

## In scope for this accelerate run

- Read-only codebase and graph analysis.
- Planning, architecture, security, test, risk, gate, iteration, provenance, and final brief artifacts.
- Test execution that does not change product source or tests.

## Explicitly out of scope

- Production code or test edits.
- Acceptance of ADRs or architecture baselines.
- Waivers, funding approval, or Construction authorization.
- Access to or changes in `/Users/base/Desktop/Memetics`.
- Changes to `my-aiwg`, Codebase Memory, or any other repository.
- AIWG addon publication or deployment to other repositories.
- Canonical Codebase Memory reindex, alias activation, or duplicate-index retirement.
- Broad rollout or automatic gate-critical memory injection.

## External work items

| ID | Work item | Owner | Entry condition |
|---|---|---|---|
| EXT-CBM-01 | Add canonical project config, source/decision roots, excludes, and path-filter contract | Agentmemory maintainer + Codebase Memory maintainer | Proposed ADR-004 accepted |
| EXT-CBM-02 | Canonical reindex, temporary alias, verification, and duplicate-index retirement | Codebase Memory maintainer | No consumers on duplicate keys |
| EXT-AIWG-01 | Package and distribute the coding-memory addon | AIWG maintainer | Agentmemory release gates pass |
| EXT-DEPLOY-01 | Deploy to other repositories | Each repository owner | Five-session Memetics canary accepted |
