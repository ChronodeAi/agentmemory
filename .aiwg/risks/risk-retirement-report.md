# Risk Retirement Report

Status: Draft current evidence assessment
Date: 2026-07-27
Evidence assessment updated through: 2026-07-28
Iteration: Elaboration iteration 4
Product source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Governance evidence: Revision 10 is historical after the executed containment;
current review eligibility requires the exact canonical manifest and matching
passed receipt recorded at decision time
ABM risk criterion: FAIL

## Decision Boundary

No PoC was executed in this cycle. No risk is accepted, mitigated, or retired.
All 23 risks remain `IDENTIFIED`. This report does not accept an ADR, establish
an architecture baseline, authorize Construction, or authorize distribution,
rollout, or production admission.

DEC-12 accepts the exact local profile and 740/42 denominators for Stage-A
specification only, and DEC-17 accepts the Stage-A authority matrix. Neither
accepts Stage A or changes a risk disposition. DEC-18 confirms the 23-risk
denominator, 17-risk threshold, counted statuses, and mandatory-veto rule.

The 2026-07-27 temporary-containment probes are diagnostic evidence only. They
strengthen existing risk rationales but do not change a score, priority, owner,
status, or retirement disposition. Accountable-owner calibration remains
required before any score is treated as accepted.

## Current Metrics

| Metric | Value |
|---|---:|
| Total risks | 23 |
| Retired | 0 |
| Mitigated | 0 |
| Accepted | 0 |
| Identified | 23 |
| Retirement rate | 0% |
| P0 active | 0 |
| P1 active | 17 |
| P2 active | 5 |
| P3 active | 1 |

The selected exact local release profile and its 740/42 denominators are
accepted for Stage-A specification only. The operations candidate, R-02
overlay, and user-supplied live observations remain decision-preparation
inputs. Node 22, Ubuntu, and GitHub CI are retained as deferred portability
work. Historical Railway exposure remains
`UNVERIFIED / NOT EVALUATED`; prospective Railway deployment is deferred.
None of this input changes the metrics above, authorizes migration/heal,
accepts Stage A, admits B1/B2, or claims execution.

## Evidence Review

Source anchors and assessment rationale are recorded in
`risk-assessment-2026-07-25.md`.

| Risk | Existing evidence | Evidence still required before later disposition | Status |
|---|---|---|---|
| R-01 | Focused scope tests and canonical-ID code exist | Complete interface inventory and real-service collision/isolation receipt | IDENTIFIED |
| R-02 | Basic redaction/exclusion tests and a local macOS overlay candidate exist; Railway history remains `UNVERIFIED / NOT EVALUATED` | Full synthetic corpus with zero raw occurrence across LaunchAgent/config/environment/log/error/UI/health/support/receipt/snapshot/backup/restore/upgrade/rollback/provider sinks and both processing-policy recording sinks; separately authorized metadata-only Railway history evidence if pursued | IDENTIFIED |
| R-03 | Simple recalled-context exclusions exist | Eligibility-first adversarial corpus, exclusion reasons, and zero stale leakage | IDENTIFIED |
| R-04 | Per-session source tracking exists | Provider acknowledgement, timeout, retry, invalid-receipt, and idempotency receipt | IDENTIFIED |
| R-05 | Some promotion guards exist | Typed independent-evidence graph, cycle rejection, and negative promotion receipt | IDENTIFIED |
| R-06 | Commit-link primitives and post-commit hook exist | Dirty-state provenance model and at least 95% eligible linkage receipt | IDENTIFIED |
| R-07 | Hook timeouts and bounded patterns exist; containment probes exposed worker-only health accounting and unqualified terminal delivery semantics | Accepted concurrency profile, durable terminal-outcome ledger, worker-plus-engine resource receipt, and non-amplifying telemetry proof | IDENTIFIED |
| R-08 | Health monitor collects resource/dependency data; user-supplied non-qualifying diagnostics showed top-level healthy/Doctor success with a durable-scope warning and slot failures | Accepted required-dependency/readiness state machine, diagnostic sample/total denominators, warning-to-degraded rules, whole-runtime pressure semantics, failure injection, and sustained recovery receipt | IDENTIFIED |
| R-09 | Focused slot/viewer tests exist; user-supplied non-qualifying live evidence showed repeated 503 warnings, global-looking unlabeled aggregates, and same-project slot HTTP 500 while project health succeeded | Browser and MCP matrix with explicit project/global scope and denominator labels, visible auth/authority state, exact backend/viewer identities, authenticated live slots, split-failure truthfulness, and degraded/recovering/healthy history | IDENTIFIED |
| R-10 | Canonical Codebase Memory contract is proposed | External sandbox reindex, alias equivalence, consumer cutover, and rollback receipt | IDENTIFIED |
| R-11 | Merge and idempotency unit tests exist | Disposable-home interruption and exact provider-config rollback receipt | IDENTIFIED |
| R-12 | Governance documents prohibit premature rollout | Offline negative admission proof and named Release Owner disposition | IDENTIFIED |
| R-13 | DEC-12 accepts the exact local profile and 740/42 denominators for Stage-A specification only; a bounded serial suite reportedly passed and the 148-file candidate manifest reconciles | Exact host/runtime execution binding; five 148-file runs totaling 740 file-executions; complete assertion/authentication manifests; `LQ-001..014` across three clean homes totaling 42 journeys; both synthetic processing policies; LaunchAgent/log/support/auth/viewer/backup/rollback evidence; signatures, replay, custody, and independent verification | IDENTIFIED |
| R-14 | Timing-safe comparison is used when a secret exists; live browser authority state remains unproved | Missing/unreadable/wrong-secret and visible authority/auth-state matrix proving every protected CLI/REST/MCP/viewer-data surface fails closed | IDENTIFIED |
| R-15 | Several processing functions check project/session policy | Recording-sink matrix proving zero strict/local egress and attributable permitted provider attempts | IDENTIFIED |
| R-16 | Snapshot and migration functions exist; a live diagnostic suggested migration but no heal/migration was authorized or run | Complete state inventory, separately authorized packaged command, interruption atomicity, generation fencing, exact restore, reader convergence, and rollback receipt | IDENTIFIED |
| R-17 | Context packet has bounded source categories; the installed `PreCompact` path bypassed the injection flag until reversibly neutralized | Required/optional fault matrix with typed degraded/non-success states, provider-native acknowledgement, and no false injection marking | IDENTIFIED |
| R-18 | Protected proxy and standalone compatibility paths exist | Complete authenticated proxy-error/tool/global-scope/side-effect matrix proving no unauthorized local downgrade | IDENTIFIED |
| R-19 | Native-memory bridge and destination-writing mechanisms exist | Explicit actor/project/source/destination authority, two-project zero-leakage proof, and atomic destination/audit recovery receipt | IDENTIFIED |
| R-20 | Session lifecycle and stale-session mechanisms exist | Immutable scope/policy binding, valid-parent authority, stale-close CAS, crash/restart, and concurrent lifecycle receipt | IDENTIFIED |
| R-21 | Prefix/process-local dedupe mechanisms and counters exist | Durable full-event identity, collision policy, atomic idempotency state machine, restart/concurrency proof, and complete side-effect denominator | IDENTIFIED |
| R-22 | Compaction and exact-facts mechanisms exist | Immutable generation, integrity root, reader atomicity, every-boundary interruption, tamper detection, and exact rollback receipt | IDENTIFIED |
| R-23 | Worker PID/start/stop mechanisms exist; the live worker remains terminal-owned and no persistent restart/reconciliation proof exists | Durable intake, singleton lease/fencing, bounded replay, poison-event handling, startup reconciliation, and truthful readiness receipt | IDENTIFIED |

## Retirement Validation Rule

A later request to change a risk status must include all of the following:

- a completed revision-pinned PoC receipt matching the card;
- raw evidence hashes and a complete declared denominator;
- accountable owner disposition;
- independent reviewer disposition from every role named in the register;
- residual-risk and contingency statement;
- traceability to the applicable requirement, test, source, and accepted
  external decision record, when one exists;
- confirmation that recalled content was not reused as fresh evidence.

A passing test or PoC alone does not retire a risk. Missing evidence leaves the
risk `IDENTIFIED`.

## ABM Arithmetic

At least 17 of 23 risks must later be retired or mitigated with accepted
evidence to reach 70% (`17 / 23 = 73.91%`; `16 / 23 = 69.57%`). All 17 P1 risks
must also be retired
or mitigated under the AIWG priority rule; risk acceptance, including
accepted-but-open, does not satisfy that P0/P1 rule or count toward the 17.
Current evidence supports `0 / 23`. Any unresolved mandatory veto prevents ABM
PASS even if the numerical threshold is later met.

Therefore the ABM risk criterion remains **FAIL**. The independent ABM report's
other architecture, requirements, test-strategy, traceability, and signoff
blockers also remain open and are not changed by this risk cycle.
