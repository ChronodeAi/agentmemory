# Requirements Traceability Matrix

Status: Draft

| Requirement group | Current branch evidence | Gap or release evidence | Planned verification |
|---|---|---|---|
| FR-01/02 identity and migration | Resolver, config precedence, alias/migration tests | Repository manifests and adversarial collision migration | Identity, colliding-basename, worktree, rollback tests |
| FR-03/04 scope and slots | Fail-closed guards, namespaced slot tests | Exhaustive interface contract; reported slot 500 | API/MCP/REST/UI path-filter matrix |
| FR-05 dedupe | Event hash and Jaccard-based observation checks | Semantic quality and concurrency rate | Labelled duplicate corpus; multi-agent load |
| FR-06 sessions | Resume/child/stale tests | Crash/restart and concurrent lifecycle | Integration and fault-injection |
| FR-07 privacy/capture | Profiles, exclusions, output/redaction tests | Zero-leakage corpus | Secret fixture and failure-path suite |
| FR-08 compaction | Schema support | Operational exact-facts ledger unproven | Rolling compaction/ledger round-trip |
| FR-09 context | Scope, cap, per-session generated-source marking | Eligibility-first and acknowledged delivery | Stale-authority and acknowledgement fixtures |
| FR-10 provenance | Commit link and basic source metadata | Uncommitted authority chain and invalidation | Dirty worktree/commit transition suite |
| FR-11 delivery | Packet-generation tracking | Acknowledgement protocol absent | Retry, timeout, duplicate-ack integration |
| FR-12 health/linkage | Project health and commit metrics | True eligibility denominator; sustained health | Runtime health, pressure, linkage benchmark |
| FR-13 promotion | ADR+commit architecture guard and simple recall exclusion | Typed evidence and complete anti-reinforcement | Promotion evidence/provenance DAG tests |
| FR-14 native memory | Explicit policy requirement | End-to-end control evidence | Explicit-action negative/positive tests |
| FR-15/16 privacy/config | Strict-local and env/secret-file tests | Failure and secret-output audit | Integration fixture matrix |
| FR-17/18 connectors/hooks | Idempotent Claude/Codex tests, hook lifecycle | Declared concurrency and rollback evidence | Provider integration/load/rollback |
| FR-19 typed/fail-closed | Proxy failure paths exist | Typed feature-disabled contract missing | Server failure/feature-disabled tests |
| FR-20 viewer/health | Scoped dashboard; `unavailable` fallback | Build identity and sustained compatibility | Viewer/backend identity and soak tests |
| NFR-01..11 | Full bounded serial unit suite is green | None accepted at release level | Master test plan and five-session canary |
| NFR-12 test-runner reliability | 1,463 tests pass serially; default `npm test` exits 137 | Bounded canonical worker/memory profile absent | Default-command developer/CI matrix |

## Atomic Interface Backlinks

`G-ICM-01` in `.aiwg/architecture/interface-control-matrix.md` is the
interface denominator. These links remain Draft until the named artifact owners
review them.

| Trace ID | Requirement | Interface control | Source evidence | Test/evidence target | Risk |
|---|---|---|---|---|---|
| TR-UCM-001 | FR-01/02 | ICM-01 | `src/project-config.ts`, `src/project-scope.ts` | canonical remote/path/worktree collision suite | R-01 |
| TR-UCM-002 | FR-03/04 | ICM-02 | REST inventory, MCP tools registry, scoped functions | all-interface project/global matrix | R-01, R-10 |
| TR-UCM-003 | FR-05/07 | ICM-03 | hooks, capture profile, exclusion/redaction code | capture profile and synthetic-secret suites | R-02, R-07 |
| TR-UCM-004 | FR-06 | ICM-04 | session functions and lifecycle hooks | resume/child/crash/stale/concurrency suite | R-06 |
| TR-UCM-005 | FR-09/19 | ICM-05 | coding-memory/context functions and routes | required/optional source fault matrix | R-03, R-17 |
| TR-UCM-006 | FR-11 | ICM-06 | packet generation and provider boundary | acknowledgement/retry/idempotency suite | R-04 |
| TR-UCM-007 | FR-10/12 | ICM-07 | commit functions and post-commit hook | dirty-to-commit transition benchmark | R-06 |
| TR-UCM-008 | FR-13/14 | ICM-08 | promotion functions and interfaces | typed evidence DAG and recalled-only rejection | R-03, R-05 |
| TR-UCM-009 | FR-15/16/19 | ICM-09 | REST middleware, MCP auth, secret-file config | missing/unreadable/wrong-secret matrix | R-02, R-14 |
| TR-UCM-010 | FR-07/15 | ICM-10 | processing policy, search/vision, provider fallback | recording-provider zero-egress matrix | R-02, R-15 |
| TR-UCM-011 | FR-12/20 | ICM-11 | monitor, thresholds, health routes | dependency/pressure/recovery state tests | R-07, R-08 |
| TR-UCM-012 | FR-03/20 | ICM-12 | slots, viewer, build identity | CRUD/isolation/500/compatibility tests | R-09 |
| TR-UCM-013 | FR-02/19 | ICM-13 | migrate, snapshot, index persistence, package CLI | interruption/atomicity/exact-restore suite | R-16 |
| TR-UCM-014 | FR-17/18 | ICM-14 | connectors, generated hooks, deployment merge | disposable-home lifecycle/load/rollback suite | R-07, R-11 |
| TR-UCM-015 | External CBM contract | ICM-15 | Codebase Memory config and canonical graph | frozen 20-query alias equivalence | R-10 |
| TR-UCM-016 | NFR-01..12 | ICM-16 | package, CI, evidence receipts | deterministic runner and offline admission | R-12, R-13 |
