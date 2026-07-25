# Software Architecture Document

Status: **DRAFT — NOT BASELINED**
Date: 2026-07-25
Decision owner: Software Architect, with Founder/Product, Security, Test, and Release concurrence

## 1. Architectural objective

Complete the existing Universal Coding Memory branch as a local-first evidence assistant. Agentmemory owns episodic/procedural records; Codebase Memory owns structural navigation. Git, live source, tests, accepted ADRs, and direct runtime evidence remain authoritative.

## 2. Lifecycle contract

| Stage | Required system behavior |
|---|---|
| Recall | Resolve canonical project and return scoped, attributable candidates |
| Verify | Compare candidates to the ordered authority hierarchy |
| Explore | Navigate the canonical Codebase Memory graph and live repository |
| Act | Capture bounded intent and tool events without secrets |
| Test | Attach typed test/runtime evidence, not content-pattern assertions |
| Record | Persist project, source, time, validity, and committed/uncommitted provenance |
| Promote | Require eligible independent evidence; recalled content cannot validate itself |
| Commit | Link eligible records idempotently and report the true denominator |
| Close | Close explicitly or mark stale sessions abandoned without deleting evidence |

## 3. Logical components

1. **Project identity resolver** — credential-free normalized Git remote; hashed canonical path fallback; alias/worktree migration with collision checks.
2. **Scope guard** — project default, explicit audited global access, consistent filtering on retrieval, session, expanded-result, file-history, and commit-history interfaces.
3. **Capture gateway** — profile/exclusion evaluation, secret redaction, output bounds, event-hash dedupe, and bounded hook dispatch.
4. **Session service** — idempotent parent/child start/resume/close and stale-session handling.
5. **Evidence/provenance service** — authority class, source digest, observed time, validity interval/state, verification references, and committed/uncommitted worktree identity.
6. **Compactor** — rolling summaries plus an immutable exact-facts ledger for identifiers, decisions, constraints, test results, and commit/worktree relationships.
7. **Retrieval/context service** — fail-closed scope, eligibility-first filtering, relevance ranking, per-session acknowledged-source dedupe, and a hard 2,000-token output cap.
8. **Promotion service** — typed evidence gates, independent-source rules, accepted-ADR requirement for architecture, and anti-self-reinforcement.
9. **Provider integration** — env-first configuration, secret-file auth, idempotent MCP/hook merge, bounded backpressure, typed disabled-feature errors, and acknowledgement.
10. **Health/viewer service** — sustained backend state, compatibility and build identities, slot/project health, pressure/degradation semantics, and truthful failure.

All persistence and operations remain iii-engine Function/Trigger/StateModule based.

## 4. Evidence and eligibility

An item is gate-critical eligible only when:

- its project matches;
- it is not excluded, secret-bearing, expired, superseded, or contradicted;
- its authority class is known;
- provenance resolves to live committed state or an attributable uncommitted snapshot;
- required verification evidence exists;
- it was not derived solely from recalled Agentmemory content.

Selection filters eligibility before scoring relevance. Unverified memories may be shown in an explicit recall view with a warning but cannot be injected automatically into gate-critical packets.

## 5. Delivery protocol

Packet creation returns a packet ID, source IDs, eligibility decisions, and expiry. The provider acknowledges receipt with the same session, project, and packet ID. Only acknowledgement marks sources delivered. Failure or timeout preserves retry eligibility. Delivery metrics distinguish configured, generated, dispatched, acknowledged, and consumed where observable.

## 6. Temporal and uncommitted provenance

Committed evidence records repository identity, commit SHA, path, content/source digest, and observed time. Uncommitted evidence records repository identity, worktree identity, base commit, relative path, content/source digest, dirty-state observation, and expiry/supersession. A later commit may link matching digests idempotently. Changed or missing source invalidates or supersedes the old record.

## 7. Privacy and security

- Strict privacy forces local processing and cannot be overridden by lower-precedence config.
- Redaction/exclusion precedes any durable write or outbound request.
- Process environment precedes user and repository configuration.
- Secrets are read from environment or a secret file and never returned.
- Explicit global access and native-memory synchronization are audited.
- Required-backend operations fail closed; local fallback is limited to explicitly supported, typed modes.

## 8. Availability and performance

Telemetry hooks use bounded fire-and-forget behavior; context-injecting hooks await only within a declared timeout. Under the declared concurrent multi-agent load, p95 hook latency must be below two seconds. Health becomes healthy only after sustained successful probes and reports degraded/pressure/failure separately from liveness.

## 9. External interoperability

Codebase Memory 0.9.1 uses a canonical `.codebase-memory/config.toml` with project identity, source roots, decision roots, excludes, and consistent path filters. Existing AIWG ADR roots remain included. Reindex, temporary aliasing, and duplicate-index retirement are external work owned by its maintainer. AIWG addon distribution and other-repository deployment are also external.

## 10. Unresolved decisions

All ADRs in `.aiwg/architecture/adr/` are proposed. The exact evidence schema, acknowledgement transport, temporal invalidation policy, health window, declared concurrency, retention, and Codebase Memory migration runbook require named-owner acceptance before baseline.
