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
