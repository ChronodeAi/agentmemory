# Requirements Traceability Matrix

Status: **REVIEW CANDIDATE - BLOCKED - HUMAN ACCEPTANCE REQUIRED**

## Decision boundary

This is the sole canonical cross-artifact traceability authority for Iteration
4. It records proposed documentary links and bounded inherited implementation
evidence. It does not accept requirements or realizations, accept or baseline
architecture, prove implementation conformance, admit test or PoC evidence,
change a risk status, pass ABM, authorize Construction, or authorize
deployment.

Every trace below inherits the current Review Candidate architecture evolution,
Draft SAD and ICM, Proposed ADR status, Draft MTP, and ABM FAIL / NO-GO. A
source or test path proves only that an inherited mechanism exists at the
candidate revision. It does not prove that a proposed contract is implemented
or accepted.

## DEC-15 and DEC-16 Elaboration rules

The
[Iteration 4 local macOS disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md)
records **CRD-01 Option A selected** as DEC-15 and **CRD-02 Option A selected**
as DEC-16.

Under DEC-15, an Elaboration bidirectional link may be satisfied by:

1. exact canonical repository-relative paths recorded in this RTM;
2. an independent graph verification of the linked subjects at the reviewed
   revision; and
3. both parent-to-realization and realization-to-parent/atomic-contract
   directions represented in the canonical documentary chain.

Live source and test annotations remain Construction work. DEC-15 does not
make any current documentary edge accepted, independently verified, or
implementation-conformant merely because it appears in this matrix.

Under DEC-16, the complete significant-use-case denominator and independent
binary thresholds are:

| Significant use case | Canonical realization | Frozen behavioral-unit set | Denominator | Minimum at 80% |
|---|---|---|---:|---:|
| `UC-001` | [DES-UCR-001](realizations/DES-UCR-001.md) | `TS-UCR-001..023` | 23 | 19 |
| `UC-002` | [DES-UCR-002](realizations/DES-UCR-002.md) | Exact `UC2-*` set frozen in the realization | 54 | 44 |
| `UC-003` | [DES-UCR-003](realizations/DES-UCR-003.md) | `UC3-S01..S27` | 27 | 22 |

MIC and PSC layers are tailored out. Each realization is scored independently
using `ceil(0.80 * denominator)`; results may not be pooled across use cases.
Presence of an ID or path is not a binary pass, acceptance, qualification, or
gate decision. This rule changes no requirement ID or mapping: the canonical
inventory remains 33 parents, 130 children, and 130/130 explicitly mapped
children.

## Local macOS Decision and Qualification Links

These links reconcile the operator-selected deployment target without treating
change control, impact analysis, or a Stage-A test candidate as requirement,
realization, architecture, test, risk, ABM, Construction, or release
acceptance.

| Source decision or candidate | Exact requirement links | Applicable realizations | Exact effect / evidence state |
|---|---|---|---|
| `.aiwg/decisions/change-requests/CR-AM-LOCAL-001.md` | FR-15.a, FR-15.g, FR-15.h, FR-20.l, FR-21.a, FR-21.b, FR-21.c, FR-21.d, FR-21.e, FR-21.f, FR-21.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | Selects `deployment_target=local-macos`; processing mode and every acceptance/gate decision remain separate |
| `.aiwg/decisions/impact-assessments/IA-AM-LOCAL-001.md` | FR-15.a, FR-15.g, FR-15.h, FR-20.l, FR-21.a, FR-21.b, FR-21.c, FR-21.d, FR-21.e, FR-21.f, FR-21.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | Advisory impact candidate; no baseline or status change |
| `.aiwg/testing/local-macos-qualification-profile-candidate.md` | FR-15.a, FR-15.g, FR-15.h, FR-20.l, FR-21.a, FR-21.b, FR-21.c, FR-21.d, FR-21.e, FR-21.f, FR-21.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | `T-LOCAL-DEPLOY`, `LQ-001..014`; Stage-A candidate only, no admitted or executed lifecycle cohort |

### Non-qualifying live diagnostic observations

Operator-supplied point-in-time Agentmemory MCP diagnostics are regression
seeds only. They are not `T-LOCAL-DEPLOY` execution, qualification, live
source/test backlinks, risk disposition, or acceptance evidence:

- `memory_project_health` for `github.com/chronodeai/agentmemory` succeeded with
  `scopeCoverage=1`, `projectUnscopedRecords=0`, `sessions=1`,
  `contextPackets=2`, `retrievalUse=0`, `commitCoverage=0`, zero
  memories/lessons/insights/promotions, and `globalUnscopedRecords=1887`.
- A context request for the current AIWG session failed closed because the
  session did not belong to the project; the existing project session returned
  an empty context packet in 33 ms with zero tokens and zero source IDs.
- `memory_diagnose` succeeded with 14 pass, 1 warning, and 0 fail; its separate
  diagnostic denominator reported 595 sessions, 550 summaries, 2,060 semantic
  memories, 1,885 insights, zero lessons/procedural, and warned that 2 of 2
  latest durable memories have no project scope.
- Top-level health/Doctor remained healthy while project slot list/get returned
  HTTP 500. The healthy surface, slot failure, global/project counters, and
  latest-memory warning are not collapsed into one state.
- No session content is reproduced here. No heal or migration was authorized or
  run.

The later 2026-08-03 local release-candidate QA addendum supersedes only the
point-in-time slot and runtime observations above: disabled slot listing now
returns typed HTTP 503, Doctor separates two required checks from seven
optional capabilities, the viewer renders `healthy`, and package-level MCP
discovery returns all 59 tools using administrative secret-file authentication.
See
`.aiwg/reports/release-candidate-local-qa-addendum-2026-08-03.md`. These are
non-admitted engineering observations and change no acceptance, risk, ABM, or
lifecycle status.

## Exact P2 Risk-to-Trace Candidate Links

The following mappings are exact documentary candidates. They change no risk
status and create no live source or test backlink:

| Risk | Canonical trace IDs |
|---|---|
| R-01 | TR-UCM-001, TR-UCM-002, TR-UCM-012 |
| R-05 | TR-UCM-005, TR-UCM-007, TR-UCM-008 |
| R-08 | TR-UCM-011 |
| R-15 | TR-UCM-003, TR-UCM-009, TR-UCM-010, TR-UCM-014 |

## Use-Case Realization Backlinks

The generic AIWG scanner does not discover the current nested
`use-case-briefs/` layout. These exact path-to-path edges are therefore
canonical and must be supplied explicitly to every traceability review.

| Parent use case | Canonical realization | Realization status | Acceptance state |
|---|---|---|---|
| `.aiwg/requirements/use-case-briefs/UC-001-scoped-recall.md` | `.aiwg/requirements/realizations/DES-UCR-001.md` | REVIEW CANDIDATE - BLOCKED - HUMAN ACCEPTANCE REQUIRED | Proposed documentary edge only |
| `.aiwg/requirements/use-case-briefs/UC-002-capture-session-commit.md` | `.aiwg/requirements/realizations/DES-UCR-002.md` | REVIEW CANDIDATE - BLOCKED - HUMAN ACCEPTANCE REQUIRED | Proposed documentary edge only |
| `.aiwg/requirements/use-case-briefs/UC-003-context-promotion-provider.md` | `.aiwg/requirements/realizations/DES-UCR-003.md` | REVIEW CANDIDATE - BLOCKED - HUMAN ACCEPTANCE REQUIRED | Proposed documentary edge only |

## Realization-to-Atomic-Contract Bridge

The canonical join is materialized in the `Applicable realizations` column of
the explicit 130-child table below. This is an inclusive relation covering a
direct realization mapping, an explicitly named upstream/external
prerequisite, or a qualification dependency; the detailed realization remains
authoritative for the edge class. Every child identity is written out; a range
never substitutes for an atomic ID. An atomic child may legitimately appear in
more than one realization. Inclusion is a proposed documentary edge only, not
requirement acceptance, implementation conformance, test execution, or
realization acceptance. Any difference between a realization's detailed map
and this canonical join is a blocking traceability defect.

| Requirement group | Current branch evidence | Gap or release evidence | Planned verification |
|---|---|---|---|
| FR-01/02 identity and migration | Resolver, config precedence, alias/migration tests | Repository manifests and adversarial collision migration | Identity, colliding-basename, worktree, rollback tests |
| FR-03/04 scope and slots | Fail-closed guards, namespaced slot tests, typed disabled-slot 503 in local RC QA | Exhaustive accepted interface contract and enabled-slot lifecycle evidence | API/MCP/REST/UI path-filter matrix |
| FR-05 dedupe | Process-local prefix hash and separate Jaccard-based memory/lesson checks | Full-content identity, durable atomic idempotency, semantic quality, restart, and concurrency evidence | `UC2-DED-01..05` labelled collision/barrier/restart corpus |
| FR-06 sessions | Sequential resume/child/stale tests and keyed start/resume source | Immutable scope/policy bindings, typed invalid-parent denial, stale-close CAS, crash/restart, and concurrent lifecycle | `UC2-LIF-01..08` integration and fault-injection matrix |
| FR-07 privacy/capture | Hook profiles/exclusions/bounds and post-transport service sanitization | Admission, policy, exclusion, and redaction before transport, fingerprinting, logging, persistence, and every external/governed sink | `UC2-PRIV-01..04` all-sink secret/policy fixture |
| FR-08 compaction | Sequential ledger-write/delete/index-removal source | Tamper-evident immutable generation, exact-fact equivalence, reader atomicity, and rollback | `UC2-CMP-01..05` generation round-trip/failpoint matrix |
| FR-09 context | Scope, character-estimated cap, and per-session generated-source marking | Authoritative policy before source access; eligibility-first; final-wire actual-token count; fixed 300/400/700/400/200 class maxima; packet-wide five-source cap; threshold and acknowledged-source omission | Source-fault, exact-token/allocation/source-cap, stale-authority, and acknowledgement fixtures |
| FR-10 provenance | Commit link and basic source metadata | Uncommitted authority chain and invalidation | Dirty worktree/commit transition suite |
| FR-11 delivery | Packet-generation tracking | Provider-native issuer/attempt/revocation contract, atomic acknowledgement/suppression transaction, and bounded multi-attempt race semantics absent | Crash-boundary, retry, timeout, sibling/late/replayed/duplicate-ack integration |
| FR-12 health/linkage | Project health and commit metrics | True eligibility denominator; sustained health | Runtime health, pressure, linkage benchmark |
| FR-13 promotion | ADR+commit architecture guard and simple recall exclusion | Exact eligibility tri-state separate from lifecycle disposition, typed independent evidence, and complete anti-reinforcement | Eligibility/disposition cross-product plus promotion evidence/provenance DAG tests |
| FR-14 native memory | Config-triggered bridge and project-blind latest-memory selection source | Explicit user authority, exact project/source/destination/transaction binding, zero cross-project/global inclusion, and recoverable atomic destination/audit outcome | `UC2-NAT-01/02` two-project/global-canary, every-boundary process-death, and destination/audit reconciliation matrix |
| FR-15/16/19 privacy/config/auth downgrade | Strict-local and env/secret-file tests; administrative secret-file MCP discovery; reachable proxy errors surface instead of degrading; initial-unreachable local fallback remains explicit | Independent deployment-target/processing-mode selection, explicit zero-egress, governed provider-enabled attempts, complete operation/resource-bound authority, failure, secret-output, proxy-error, global-scope, no-domain-write, and bounded denial-ledger evidence | Target/mode cross-product, PP-01/PP-02 recording sinks, capability/revocation/replay, and integration fixture matrices plus R-18 bounded PoC |
| FR-17/18 connectors/hooks | Merge-helper tests, generated hooks, bounded synchronous delivery attempts | Ownership/adoption, complete provider-file metadata and policy-safe backup rollback, durable delivery dispositions, recursion-safe telemetry, attributable queued replay, and declared concurrency | `UC2-CONN-01..03`, `UC2-PERF-01..03`, ownership/metadata/secret-backup, and worker-restart matrices |
| FR-19 typed/fail-closed | Reachable proxy failures surface; disabled slots return typed 503 | Accepted cross-interface failure taxonomy and full feature-state matrix remain open | Server failure/feature-disabled tests |
| FR-20 viewer/health | Health thresholds, viewer routes, and one bounded runtime/viewer observation | Required-worker readiness, startup state reconciliation, exact availability/compatibility enums, visible project/global scope, snapshot denominators, exact-scope stale-safe destructive authorization, build identity, sustained compatibility, and separate local-core/provider-feature/mode/external-processing state | `UC2-WRK-01..03`, `UC2-REG-01..03`, local core/provider fault cross-product, viewer/backend identity, authorization, and soak tests |
| FR-21 local macOS lifecycle | No accepted or qualified end-to-end local lifecycle implementation is claimed | Immutable package, transactional/idempotent setup, owned LaunchAgent singleton/recovery, loopback/protected-auth/static-shell disposition, owned Codex/Claude integration, exact backup/migration/restore/upgrade/rollback/uninstall, and isolated official-upstream rollback subject plus separately authorized switch | `T-LOCAL-DEPLOY` journeys `LQ-001..014` across three clean homes; 0 admitted or executed journey cohorts |
| NFR-01..11 | Existing focused suites and source are bounded implementation evidence only | No accepted release or qualification receipt | Master Test Plan and five-session canary |
| NFR-12 test-runner reliability | Canonical current denominator is 150 test files; filename manifest `4bcec80340bf59e048eff765ae48760a5a6ac71dca218672bfbd216cd5808d25`; ordered-content manifest `9ea2bed20540bad4e6744bc75891922722da1f28991d582e5b0ab500f5463ccf`; current local suite is 149 files and 1,622 passing tests | The 2026-08-03 exact-profile R-13 run is provisional under the `dirty-source` waiver and is not B1/B2 admission or qualification; accepted profile authority, signer/verifier independence, replay, and custody remain open | R-13 v3 Stage-A specification, later B1 mechanics and B2 admission, five exact local-profile runs plus the separate 42-journey lifecycle cohort, and independent Stage-D validator |

## Explicit Atomic Child Backlinks

These rows make every one of the 130 unique child contracts explicit. A range
is not used as a substitute for child identity. Multiple trace IDs indicate
that the child crosses more than one governed interface.

| Parent | Exact child IDs | Applicable realizations | Canonical trace IDs |
|---|---|---|---|
| FR-01 | FR-01.a, FR-01.b, FR-01.c, FR-01.d, FR-01.e | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-001 |
| FR-02 | FR-02.a, FR-02.b | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-001 |
| FR-02 | FR-02.c, FR-02.d | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-001, TR-UCM-013 |
| FR-03 | FR-03.a | DES-UCR-002 | TR-UCM-002, TR-UCM-012 |
| FR-03 | FR-03.b, FR-03.c | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-002, TR-UCM-012 |
| FR-03 | FR-03.d | DES-UCR-001, DES-UCR-002 | TR-UCM-002, TR-UCM-012 |
| FR-04 | FR-04.a, FR-04.b | DES-UCR-003 | TR-UCM-002, TR-UCM-012 |
| FR-05 | FR-05.a, FR-05.b | DES-UCR-002 | TR-UCM-003 |
| FR-05 | FR-05.c, FR-05.d | DES-UCR-002, DES-UCR-003 | TR-UCM-003, TR-UCM-017 |
| FR-06 | FR-06.a, FR-06.b, FR-06.c, FR-06.d | DES-UCR-002 | TR-UCM-004 |
| FR-06 | FR-06.e | DES-UCR-002, DES-UCR-003 | TR-UCM-004 |
| FR-06 | FR-06.f, FR-06.g | DES-UCR-002, DES-UCR-003 | TR-UCM-004 |
| FR-07 | FR-07.a, FR-07.b, FR-07.c, FR-07.d | DES-UCR-002 | TR-UCM-003, TR-UCM-010 |
| FR-07 | FR-07.e, FR-07.f | DES-UCR-002, DES-UCR-003 | TR-UCM-003, TR-UCM-010 |
| FR-08 | FR-08.a, FR-08.b | DES-UCR-002 | TR-UCM-017 |
| FR-08 | FR-08.c | DES-UCR-002, DES-UCR-003 | TR-UCM-017 |
| FR-09 | FR-09.a, FR-09.b, FR-09.c, FR-09.d, FR-09.e, FR-09.f, FR-09.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-005 |
| FR-10 | FR-10.a, FR-10.b, FR-10.c, FR-10.d | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-007 |
| FR-11 | FR-11.a, FR-11.b, FR-11.c, FR-11.d, FR-11.e | DES-UCR-001, DES-UCR-003 | TR-UCM-006 |
| FR-12 | FR-12.a | DES-UCR-002 | TR-UCM-007 |
| FR-12 | FR-12.f | DES-UCR-002, DES-UCR-003 | TR-UCM-007 |
| FR-12 | FR-12.b, FR-12.c, FR-12.d, FR-12.e | DES-UCR-002, DES-UCR-003 | TR-UCM-011 |
| FR-13 | FR-13.a, FR-13.b, FR-13.c, FR-13.d, FR-13.e | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-008 |
| FR-14 | FR-14.a, FR-14.b, FR-14.c, FR-14.d, FR-14.e | DES-UCR-002, DES-UCR-003 | TR-UCM-018 |
| FR-15 | FR-15.a, FR-15.e | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-009, TR-UCM-010 |
| FR-15 | FR-15.b, FR-15.d | DES-UCR-001, DES-UCR-002 | TR-UCM-009 |
| FR-15 | FR-15.c | DES-UCR-002 | TR-UCM-009 |
| FR-15 | FR-15.f | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-009 |
| FR-15 | FR-15.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-003, TR-UCM-009, TR-UCM-010, TR-UCM-014 |
| FR-15 | FR-15.h | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-003, TR-UCM-009, TR-UCM-010, TR-UCM-014 |
| FR-16 | FR-16.a | DES-UCR-002 | TR-UCM-009 |
| FR-16 | FR-16.b | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-009 |
| FR-17 | FR-17.a, FR-17.b, FR-17.c, FR-17.d, FR-17.e, FR-17.f | DES-UCR-002, DES-UCR-003 | TR-UCM-014 |
| FR-18 | FR-18.a, FR-18.b, FR-18.c, FR-18.d, FR-18.e, FR-18.f, FR-18.g, FR-18.h | DES-UCR-002, DES-UCR-003 | TR-UCM-014 |
| FR-19 | FR-19.a | DES-UCR-002 | TR-UCM-009 |
| FR-19 | FR-19.d, FR-19.e | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-009 |
| FR-19 | FR-19.b, FR-19.c | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-005, TR-UCM-009, TR-UCM-013 |
| FR-20 | FR-20.a, FR-20.b, FR-20.c, FR-20.d, FR-20.e, FR-20.f, FR-20.g, FR-20.h, FR-20.i, FR-20.j, FR-20.k | DES-UCR-002, DES-UCR-003 | TR-UCM-011, TR-UCM-012 |
| FR-20 | FR-20.l | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-011, TR-UCM-012 |
| FR-21 | FR-21.a, FR-21.b, FR-21.c, FR-21.d, FR-21.e, FR-21.f, FR-21.g | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-019 |
| NFR-01 | NFR-01.a | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-02 | NFR-02.a | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-03 | NFR-03.a | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-04 | NFR-04.a | DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-05 | NFR-05.a | DES-UCR-003 | TR-UCM-016 |
| NFR-06 | NFR-06.a | DES-UCR-002 | TR-UCM-016 |
| NFR-07 | NFR-07.a | DES-UCR-002 | TR-UCM-016 |
| NFR-08 | NFR-08.a | DES-UCR-001, DES-UCR-003 | TR-UCM-016 |
| NFR-09 | NFR-09.a | DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-10 | NFR-10.a, NFR-10.b | DES-UCR-001, DES-UCR-002 | TR-UCM-016 |
| NFR-11 | NFR-11.a, NFR-11.b | DES-UCR-002, DES-UCR-003 | TR-UCM-016 |
| NFR-12 | NFR-12.a, NFR-12.b | DES-UCR-001, DES-UCR-002, DES-UCR-003 | TR-UCM-016 |

## Atomic Interface Backlinks

`G-ICM-01` in `.aiwg/architecture/interface-control-matrix.md` is the
interface denominator. These links remain Draft until the named artifact owners
review them.

| Trace ID | Requirement | Interface control | Source evidence | Test/evidence target | Risk |
|---|---|---|---|---|---|
| TR-UCM-001 | FR-01/02 | ICM-01 | `src/project-config.ts`, `src/project-scope.ts` | canonical remote/path/worktree collision suite | R-01 |
| TR-UCM-002 | FR-03/04 | ICM-02 | REST inventory, MCP tools registry, scoped functions | all-interface project/global matrix | R-01, R-10 |
| TR-UCM-003 | FR-05/07/15.g-h | ICM-03 | `src/hooks/_capture.ts`, `src/hooks/_observe-delivery.ts`, `src/functions/privacy.ts`, `src/functions/dedup.ts`, `src/functions/observe.ts` | capture profile, pre-transport/all-sink privacy, target/mode admission, prefix-collision, and admission-order suites | R-02, R-07, R-15, R-21 |
| TR-UCM-004 | FR-06 | ICM-04 | `src/functions/session-lifecycle.ts`, session/observe routes, lifecycle hooks | immutable-binding, invalid-parent, stale-CAS, resume/crash/restart/concurrency suite | R-06, R-20 |
| TR-UCM-005 | FR-09/19 | ICM-05 | coding-memory/context functions and routes | required/optional source fault matrix | R-03, R-05, R-17 |
| TR-UCM-006 | FR-11 | ICM-06 | packet generation and provider boundary | acknowledgement/retry/idempotency suite | R-04 |
| TR-UCM-007 | FR-10/12 | ICM-07 | commit functions and post-commit hook | dirty-to-commit transition benchmark | R-05, R-06 |
| TR-UCM-008 | FR-13 | ICM-08 | promotion functions and interfaces | typed evidence DAG and recalled-only rejection | R-03, R-05 |
| TR-UCM-009 | FR-15/16/19 | ICM-09 | REST middleware, MCP auth, REST proxy, standalone fallback, secret-file config | missing/unreadable/wrong-secret plus target/mode, proxy-error/tool/global-scope/side-effect matrix | R-02, R-14, R-15, R-18 |
| TR-UCM-010 | FR-07/15 | ICM-10 | hook serialization/delivery, policy resolution, sanitization, search/vision, provider/native fallback | pre-transport all-sink taint and missing/weak-policy zero-egress matrix | R-02, R-15 |
| TR-UCM-011 | FR-12/20 | ICM-11 | monitor, thresholds, worker identity/heartbeat, durable queue, startup reconciliation, health routes | worker death/disconnect, replay, session/ledger/index/count reconciliation, pressure, and three-success recovery | R-07, R-08, R-23 |
| TR-UCM-012 | FR-03/20 | ICM-12 | slots, viewer/API counters/actions, scope/auth, build identity | project/global CRUD/isolation, snapshot-denominator, authorization, 500-case, and compatibility tests | R-01, R-09 |
| TR-UCM-013 | FR-02/19 | ICM-13 | migrate, snapshot, index persistence, package CLI | interruption/atomicity/exact-restore suite | R-16 |
| TR-UCM-014 | FR-15.g-h/17/18 | ICM-14 | connectors, generated hooks, delivery attempts/telemetry, durable queue/replay, deployment merge | disposable-home target/mode lifecycle/load/restart/replay/recursion/rollback suite | R-07, R-11, R-15, R-23 |
| TR-UCM-015 | ER-CBM-001 external contract | ICM-15 | Codebase Memory config and canonical graph | frozen 20-query alias equivalence | R-10 |
| TR-UCM-016 | NFR-01..12 | ICM-16 | package, CI, evidence receipts, R-13 v3 and conformance matrix | deterministic runner, exact profiles, portable verification, and offline admission | R-12, R-13 |
| TR-UCM-017 | FR-05/08 | ICM-17 | `src/functions/dedup.ts`, `src/functions/observe.ts`, `src/types.ts`, `src/state/schema.ts` | `UC2-DED-02..04` durable exact-idempotency plus `UC2-CMP-02..05` immutable-generation/tamper/atomicity matrix | R-21, R-22 |
| TR-UCM-018 | FR-14 | ICM-18 | native-sync route, `src/functions/claude-bridge.ts`, automatic native-sync hooks, destination writer | `UC2-NAT-01/02` explicit-authority, exact-source, two-project/global-canary, and atomic-destination matrix | R-19; adjacent R-02 |
| TR-UCM-019 | FR-21 | ICM-19 | No live source backlink; local package/setup/LaunchAgent/auth/integration/lifecycle implementation mapping is post-ABM Construction work | `T-LOCAL-DEPLOY` / `LQ-001..014`; Stage-A candidate, not admitted or executed | R-02, R-07, R-09, R-11, R-13, R-14, R-16, R-23 |

ICM-19 also names local identity and health concerns. Their P2 risk edges are
not duplicated on TR-UCM-019: R-01 remains on TR-UCM-001/002/012 and R-08
remains on TR-UCM-011, exactly as recorded above.

## Normalized Atomic Test Contract

This section and `Explicit Atomic Child Backlinks` form one normalized
contract. Joining each exact child ID to every referenced `TR-UCM` row below
supplies that child with its planned suite/PoC identifier, accountable role,
environment, oracle, evidence locator, and acceptance authority/status. A child
with multiple trace IDs inherits every referenced row; no field is silently
selected or discarded.

`AUTH-A` means the human Test Architect is accountable with required written
concurrence from the Configuration Manager, Security Architect, and Release
Owner. `AUTH-D` means later Test Architect disposition requires an Independent
Verifier Owner and Configuration Manager concurrence. All `AUTH-A` assignments
are **OPEN**, and all `AUTH-D` decisions are **NOT ELIGIBLE**. The Master Test
Plan is the authority for B1/B2/C/E roles and independence constraints.

| Trace ID | Planned suite or PoC ID | Accountable role | Required environment | Pass/fail oracle | Evidence locator | Acceptance authority/status |
|---|---|---|---|---|---|---|
| TR-UCM-001 | T-IDENTITY, T-SCOPE; R-01 card | Software Architect / Test Infrastructure Owner | Two colliding repositories, remote/path/worktree aliases, isolated KV | One credential-free canonical ID per equivalence class; zero collisions, leakage, or unauthorized alias migration | Candidate-test backlinks below; R-01 card index | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-002 | T-SCOPE, T-SLOTS; R-01/R-10 cards | Software Architect / Test Infrastructure Owner / CBM Maintainer | All REST/MCP/UI interfaces, two projects, isolated KV and canonical CBM alias | Every operation is correctly project-scoped or explicitly global; zero cross-project results or writes | Candidate-test backlinks below; R-01 and R-10 card index | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-003 | T-CAPTURE, T-PRIVACY, T-DEDUPE; R-02/R-07/R-15/R-21 methods | Security Architect / Capture Integrity Owner | Isolated KV, disposable hooks, target/mode matrix, recording sinks, synthetic secrets only | Policy and redaction precede every sink; exact durable event identity; zero secret disclosure, undeclared processing, or duplicate side effects | Candidate-test backlinks below; R-02, R-07, R-21 cards and R-15 targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-004 | T-SESSION; R-06/R-20 cards | Session Owner / Test Infrastructure Owner | Isolated KV, deterministic barriers, crash/restart and parent-child fixtures | Immutable binding, valid parent authority, stale-close CAS, idempotent resume, and terminal convergence | Candidate-test backlinks below; R-06 and R-20 cards | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-005 | T-CONTEXT, T-TEMPORAL; R-03/R-05/R-17 methods | Product / Context Owner | Frozen labelled source corpus, required/optional source-fault matrix, and temporary two-project explicit-recall fixture | Eligibility precedes relevance; required-source failures fail closed; explicit recall uses exact project scope with no global fallback; zero stale-authority, self-reinforcement, or unrelated-project inclusion | Candidate-test backlinks below; MTP temporary pre-session profile; R-03/R-17 cards and R-05 targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-006 | T-DELIVERY; R-04 card | Provider Integration Owner | Provider-native receipt fixture with retry, timeout, sibling, replay, and revocation races | One durable attempt/receipt/suppression outcome; no false acknowledgement or duplicate delivery | Candidate-test backlinks below; R-04 card | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-007 | T-PROVENANCE, T-COMMIT; R-05/R-06 methods | Git/Runtime Owner | Committed, uncommitted, rename, delete, and transition fixtures with evidence-lineage checks | Exact base/source/commit lineage; idempotent linkage; no derived/recalled lineage becomes independent corroboration; at least 95% of the accepted eligible denominator linked | Candidate-test backlinks below; R-06 card and R-05 targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-008 | T-PROMOTION; R-03/R-05 targeted method | Product / Context Owner | Frozen typed evidence-DAG corpus with recalled-only and contradictory cases | Promotion requires accepted evidence and provenance; no self-reinforcement or recalled-only promotion | Candidate-test backlinks below; R-03 card and R-05 governed targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-009 | T-CONFIG, T-SCOPE, T-PROVIDER; R-02/R-14/R-15/R-18 methods | Security Architect / Provider Integration Owner | Disposable provider homes, synthetic credentials, target/mode, proxy-fault, and global-scope matrix | Operation/resource capability and authoritative processing mode enforced; missing/wrong/revoked auth, mode ambiguity, and protected failures produce no unauthorized attempt, fallback, or write | Candidate-test backlinks below; R-02, R-14, R-18 cards and R-15 targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-010 | T-PRIVACY, T-PROVIDER, T-NATIVE; R-02/R-15 methods | Security Architect / Provider Integration Owner | Recording sinks, strict-local policy, disposable provider/native destinations | Zero raw-content external processing under denial; explicit policy before transport; no implicit native write | Candidate-test backlinks below; R-02 card and R-15 governed veto method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-011 | T-SERVICE, T-CAPTURE; R-07/R-08/R-23 methods | Service Owner / Operations Owner | Isolated service, durable queue, process sampling, pressure/fault/restart profiles, and exclusive ten-minute temporary smoke | Exactly one required worker, durable replay/reconciliation, truthful pressure state, accepted recovery window, and no temporary-profile stop condition | Candidate-test backlinks below; MTP temporary pre-session profile; R-07/R-23 cards and R-08 targeted method | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-012 | T-SLOTS, T-UI; R-01/R-09 cards | UI/API Owner / Test Infrastructure Owner | Two projects, project/global slots, compatible/incompatible backend-viewer pairs | Exact scope and snapshot denominator; no `Unknown` on typed critical health; stale-safe authorized actions | Candidate-test backlinks below; R-01 and R-09 cards | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-013 | T-ROLLBACK; R-16 card | Migration/Restore Owner / Operations Owner | Snapshot/export/import/index fixtures with every-boundary interruption | Atomic activation or byte/exact-fact restoration; no partial generation or lost accepted history | Candidate-test backlinks below; R-16 card | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-014 | T-PROVIDER, T-CAPTURE, T-SERVICE, T-ROLLBACK; R-07/R-11/R-15/R-23 methods | Provider Integration Owner / Service Owner | Disposable Codex/Claude homes, effective-hook inventory, target/mode recording sinks, sentinel service, fresh-host transcript, and restart/replay/load/rollback matrix | Idempotent ownership-aware merge, mode-bound attempts, zero automatic context stdout or context/enrich requests under temporary containment, attributable durable delivery, recursion-safe telemetry, and exact rollback | Candidate-test backlinks below; MTP temporary pre-session profile; R-07/R-23 cards and R-11/R-15 targeted methods | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-015 | T-CBM; R-10 card | Codebase Memory Maintainer / Test Architect | CBM 0.9.1 synthetic and Memetics canonical plus temporary-alias indexes | Frozen 20-query canonical/alias equivalence with path-filter correctness and zero duplicate-authority leakage | `requirements/contracts/ER-CBM-001-codebase-memory-interoperability.md`; R-10 card; external fixture OPEN | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-016 | T-RUNNER; R-12/R-13 methods | Local Test Infrastructure Owner / CI Owner | One exact accepted local macOS profile, five clean run homes, immutable source, disposable verifier, and independent custody | 5/5 raw runs and 740/740 governed file-executions pass; exact denominator/profile/source/worker/signature/custody checks; zero waiver | R-13 v3, local qualification profile, conformance matrix, dependency/profile reports, candidate-test backlinks below | AUTH-A OPEN; B1/B2 BLOCKED; AUTH-D NOT ELIGIBLE |
| TR-UCM-017 | T-DEDUPE, T-COMPACTION; R-21/R-22 cards | Capture Integrity Owner / Compaction Owner | Isolated KV, deterministic concurrency barriers, generation fault/restart harness | Durable exact idempotency and immutable generation activation; no partial reader state, count drift, or tamper acceptance | Candidate-test backlinks below; R-21 and R-22 cards | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-018 | T-NATIVE, T-ROLLBACK; R-19 card | Provider Integration Owner / Security Architect | Two-project/global canaries and disposable atomic destination/audit failpoints | Explicit actor/project/source/destination authority; zero automatic writes; exact target or byte-identical pre-image after recovery | Candidate-test backlinks below; R-19 card | AUTH-A OPEN; AUTH-D NOT ELIGIBLE |
| TR-UCM-019 | T-LOCAL-DEPLOY (`LQ-001..014`) | Operations Owner / Local Test Infrastructure Owner | Three independent clean local macOS homes with isolated prefixes, labels, ports, state, provider homes, credentials, backups, and recording sinks | 42 of 42 exact journey executions pass with immutable identities, no unrelated-byte change, truthful state, exact recovery, and all failures retained | `.aiwg/testing/local-macos-qualification-profile-candidate.md`; Stage-A candidate only; no execution evidence | AUTH-A OPEN; B1/B2 BLOCKED; AUTH-D NOT ELIGIBLE |

## Architecture and Concrete Candidate-Test Backlinks

Every row below also links
`.aiwg/architecture/architecture-evolution-iteration-4.md`, the Draft SAD, and
the correspondingly numbered ICM control. ADRs remain Proposed. Test paths are
current inherited mechanism tests or harness tests; they are not accepted
contract evidence and were not executed in this reconciliation.

| Trace ID | Relevant Proposed ADRs | Concrete candidate test or evidence path | Current evidence classification |
|---|---|---|---|
| TR-UCM-001 | ADR-001 | `test/project-config.test.ts` | Inherited mechanism test; collision/worktree proof missing |
| TR-UCM-002 | ADR-001, ADR-003 | `test/cross-project-isolation.test.ts`, `test/slots.test.ts`, `test/api-project-scope-regressions.test.ts` | Inherited mechanism tests; all-interface proof missing |
| TR-UCM-003 | ADR-003, ADR-006 | `test/capture-profile.test.ts`, `test/privacy.test.ts`, `test/schema-fingerprint.test.ts` | Inherited mechanism tests; all-sink/durable proof missing |
| TR-UCM-004 | ADR-001, ADR-006 | `test/session-lifecycle.test.ts`, `test/hook-project.test.ts` | Inherited mechanism tests; CAS/restart proof missing |
| TR-UCM-005 | ADR-002, ADR-003 | `test/coding-memory.test.ts`, `test/context-eligibility.test.ts`, `test/context-injection.test.ts` | Inherited mechanism tests; source-fault and actual-token proof missing |
| TR-UCM-006 | ADR-002, ADR-006 | `test/context-delivery-routes.test.ts`, `test/pre-compact-context-delivery.test.ts` | Inherited mechanism tests; provider-native acknowledgement proof missing |
| TR-UCM-007 | ADR-002, ADR-006 | `test/coding-memory.test.ts`, `test/integration.test.ts` | Inherited mechanism tests; dirty-to-commit lineage proof missing |
| TR-UCM-008 | ADR-002, ADR-006 | `test/promotions.test.ts`, `test/context-lessons.test.ts` | Inherited mechanism tests; typed evidence-DAG proof missing |
| TR-UCM-009 | ADR-003, ADR-005 | `test/auth-capability.test.ts`, `test/client-auth.test.ts`, `test/mcp-standalone-proxy.test.ts` | Inherited mechanism tests; complete authority/downgrade proof missing |
| TR-UCM-010 | ADR-003 | `test/privacy.test.ts`, `test/model-processing.test.ts`, `test/embedding-provider.test.ts` | Inherited mechanism tests; production all-sink zero-egress proof missing |
| TR-UCM-011 | ADR-003, ADR-006 | `test/health-thresholds.test.ts`, `test/hook-delivery.test.ts`, `test/stop-worker-pidfile.test.ts` | Inherited mechanism tests; durable replay/reconciliation proof missing |
| TR-UCM-012 | ADR-003 | `test/slots.test.ts`, `test/viewer-security.test.ts`, `test/viewer-host.test.ts` | Inherited mechanism tests; project/global viewer snapshot proof missing |
| TR-UCM-013 | ADR-005, ADR-006 | `test/snapshot.test.ts`, `test/export-import.test.ts`, `test/index-persistence.test.ts` | Inherited mechanism tests; every-boundary exact-restore proof missing |
| TR-UCM-014 | ADR-003, ADR-005, ADR-006 | `test/codex-connect-hooks.test.ts`, `test/claude-code-with-hooks.test.ts`, `test/hook-delivery.test.ts` | Inherited mechanism tests; custody/replay/rollback proof missing |
| TR-UCM-015 | ADR-004 | `.aiwg/requirements/contracts/ER-CBM-001-codebase-memory-interoperability.md`, `.aiwg/risks/poc-cards/R-10-codebase-memory-canonical-alias-v1.md` | Proposed external contract and card; frozen executable 20-query fixture missing |
| TR-UCM-016 | ADR-005, ADR-006, ADR-007 | `.aiwg/risks/poc-cards/R-13-portable-evidence-harness-v3.md`, `.aiwg/testing/r13-implementation-conformance-matrix.md`, `.aiwg/testing/local-macos-qualification-profile-candidate.md`, `scripts/r13/run.test.mjs`, `test/integration.test.ts`, `test/auth-capability.test.ts` | Stage-A specification candidates plus harness/mechanism tests; B1/B2 decisions and qualifying five-run local-profile evidence missing |
| TR-UCM-017 | ADR-006 | `test/schema-fingerprint.test.ts`, `test/index-persistence.test.ts`, `test/replay.test.ts`, `test/auto-compress.test.ts` | Inherited mechanism tests; atomic generation/idempotency proof missing |
| TR-UCM-018 | ADR-002, ADR-006 | `test/claude-bridge.test.ts`, `test/claude-bridge-path.test.ts`, `test/openai-shared.test.ts` | Inherited mechanism tests; explicit scoped atomic-sync proof missing |
| TR-UCM-019 | ADR-003, ADR-005, ADR-006, ADR-007 | `.aiwg/testing/local-macos-qualification-profile-candidate.md` (`T-LOCAL-DEPLOY`, `LQ-001..014`) | Stage-A documentary candidate only; live source/test backlinks are post-ABM Construction work and the 42-journey cohort was not executed |

## Iteration 7 Candidate PoC Joins

This is the sole canonical join table for the detached Iteration 7 PoC
preparation. The assertion decomposition provides test-oracle identifiers but
is not a competing trace matrix. All rows remain candidate, not admitted, not
executed, and not accepted.

| Cohort | Canonical trace IDs | Candidate assertion groups | Companion input | Current authority |
|---|---|---|---|---|
| H-BIND | TR-UCM-009, TR-UCM-011, TR-UCM-019 | A-FR21D-01..04 | `R-14-v1.json`, `R-23-v1.json` | Stage A open; B1/B2 blocked |
| H-BOOT | TR-UCM-002, TR-UCM-009, TR-UCM-012, TR-UCM-019 | A-FR15F-01..12, A-FR21D-05..10 | `R-14-v1.json` | Stage A open; B1/B2 blocked |
| H-AUTH | TR-UCM-002, TR-UCM-009, TR-UCM-012, TR-UCM-019 | A-FR15F-01..12, A-FR21D-05..10 | `R-14-v1.json` | Stage A open; B1/B2 blocked |
| H-HEALTH | TR-UCM-011, TR-UCM-012, TR-UCM-016, TR-UCM-019 | A-FR20AC-01..07, A-FR20GH-01..09, A-FR20L-01..04 | `R-09-v1.json` | Stage A open; B1/B2 blocked |
| H-LIFE | TR-UCM-011, TR-UCM-014, TR-UCM-019 | A-FR20GH-01..09, A-FR21C-01..05 | `R-23-v1.json` | Stage A open; B1/B2 blocked |

Inputs resolve relative to `.aiwg/risks/poc-cards/inputs/`. Assertion groups
resolve in
`.aiwg/requirements/iteration-7-poc-assertion-decomposition.md`.
The exact generated G-ICM inventory, route/claim/state/listener denominators,
fixtures, actors, side-effect vectors, signer, and independent verifier remain
required before Stage B2.

## Live Backlink Boundary

No product source or governed test file was modified in Elaboration. The
candidate source and test files do not yet carry canonical UC, DES-UCR,
TR-UCM, child requirement, ICM, or risk backlinks. Those live backlinks and
the missing executable evidence remain Construction work after an independent
ABM PASS and separate Construction authorization. Their absence must remain a
reported blocker; documentary reconciliation cannot be represented as product
conformance.
