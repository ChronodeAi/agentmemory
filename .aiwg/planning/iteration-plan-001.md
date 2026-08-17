# Iteration Plan 001: Correctness and Authority Controls

Status: Draft; not authorized
Objective: close product correctness gaps without rollout

## Planned work packages

| ID | Work package | Acceptance evidence | Owner |
|---|---|---|---|
| I1-01 | Exhaustive project filtering and typed explicit-global contract | Interface scope matrix; zero collision leakage | Scope owner |
| I1-02 | Canonical identity/alias/worktree manifest and migration hardening | Collision, idempotency, rollback tests | Identity owner |
| I1-03 | Temporal validity and committed/uncommitted provenance model | Dirty-to-commit, rename/delete/supersession tests | Evidence owner |
| I1-04 | Eligibility-first packet and 2,000-token hard cap | Stale-authority fixtures; token boundary tests | Retrieval owner |
| I1-05 | Packet delivery acknowledgement and per-session source state | retry/timeout/duplicate-ack tests | Provider owner |
| I1-06 | Typed promotion evidence and no self-reinforcement | test/runtime/ADR evidence graph tests | Promotion owner |
| I1-07 | Rolling compaction plus exact-facts ledger | replay/crash/fact-preservation tests | State owner |
| I1-08 | Privacy/exclusion and explicit native-memory control | secret corpus; negative sync tests | Security owner |

## Exit

All focused unit/integration suites pass, proposed ADRs are updated with implementation evidence, and no new record lacks project/provenance fields. Exit does not authorize rollout.
