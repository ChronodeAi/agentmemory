# Risk List

Status: Active - ABM remediation planning only
Date: 2026-07-25
Document updated: 2026-07-28
Latest score refresh: 2026-07-26 (no score changed by the 2026-07-28 update)
Iteration: Elaboration iteration 4
Product source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Governance evidence: Revision 16 is historical after the installed-runtime
provenance correction; current review eligibility requires a successor
canonical manifest and matching passed receipt recorded at decision time
Register custodian: Project Manager; per-risk accountable roles are controlling
and remain subject to the calibration state recorded below
Gate posture: ABM NO-GO; Construction not authorized

This register is a working risk assessment. Every risk remains `IDENTIFIED`.
No qualifying PoC execution has been admitted, no risk was accepted,
mitigated, or retired, and no ADR or architecture baseline was approved by
this cycle. Disposable R-13 harness self-tests are preparatory mechanics only
under the case-card authority in `.aiwg/risks/poc-cards/README.md`.

DEC-12 accepts the exact local profile and 740/42 denominators for Stage-A
specification only. DEC-17 accepts the Stage-A authority matrix. Neither
decision changes a risk status or accepts Stage A. DEC-18 confirms the risk
threshold semantics recorded below.

## Scoring

- Probability: 1 Rare, 2 Unlikely, 3 Possible, 4 Likely, 5 Almost Certain.
- Impact: 1 Negligible, 2 Minor, 3 Moderate, 4 Major, 5 Catastrophic.
- Score: probability x impact.
- Priority: P0 21-25, P1 16-20, P2 11-15, P3 1-10.

## Portfolio

| Metric | Value |
|---|---:|
| Active risks | 23 |
| P0 | 0 |
| P1 | 17 |
| P2 | 5 |
| P3 | 1 |
| Aggregate score | 392 |
| Mean score | 17.0 |
| Median score | 16 |
| Retired | 0 |
| Retirement rate | 0% |

## Confirmed ABM Risk-Threshold Semantics

- Governing denominator: `23` risks.
- Numerical threshold: at least `17` risks, because
  `17 / 23 = 73.91%` while `16 / 23 = 69.57%`.
- Counted statuses: only `MITIGATED` or `RETIRED`.
- Excluded status: accepted-but-open does not count.
- Mandatory-veto rule: one unresolved mandatory veto prevents ABM PASS even
  when the numerical threshold is met.
- Current arithmetic: `0 / 23`; all 23 risks remain `IDENTIFIED`, with zero
  mitigated and zero retired.

## Evidence Prerequisite

`G-ICM-01` is a mandatory cross-cutting evidence prerequisite, not a retired
risk or an accepted architecture artifact. Before any PoC result can be used
for a later risk disposition, Configuration Manager must produce a
revision-pinned interface-control inventory covering REST, MCP, hooks, viewer,
provider adapters, project scope, authentication, failure states, and the
requirement/risk/test backlinks for each surface. An incomplete matrix blocks
interpretation of the PoC, but this record does not baseline the matrix.

## Active Risks

| ID | Risk | Category | P | I | Score | Priority | Status | Accountable owner | Independent reviewers | Evidence sequence |
|---|---|---|---:|---:|---:|---|---|---|---|---|
| R-01 | Cross-project canonical identity collision or leakage | Security / isolation | 3 | 5 | 15 | P2 | IDENTIFIED | Software Architect | Security Architect, Test Architect, Configuration Manager | S3 |
| R-02 | Secret or sensitive-data persistence or disclosure | Security / privacy | 4 | 5 | 20 | P1 | IDENTIFIED | Security Architect | Privacy Owner, Test Architect, Operations Owner | S2 |
| R-03 | Stale or ineligible authority enters gate-critical context | Technical / authority | 4 | 5 | 20 | P1 | IDENTIFIED | Product Owner | Test Architect, Software Architect, Security Architect | S4 |
| R-04 | Generated context packet is counted as delivered before acknowledgement | Technical / provider | 4 | 5 | 20 | P1 | IDENTIFIED | Software Architect | Provider Integration Owner, Test Architect, Product Owner | S4 |
| R-05 | Recalled content self-reinforces into durable promotion | Technical / integrity | 3 | 5 | 15 | P2 | IDENTIFIED | Software Architect | Product Owner, Test Architect, Security Architect | S4 |
| R-06 | Dirty-worktree provenance is missing or falsely attributed | Technical / provenance | 4 | 4 | 16 | P1 | IDENTIFIED | Git/Runtime Owner | Configuration Manager, Test Architect, Software Architect | S3 |
| R-07 | Capture backpressure or observability amplification exhausts resources | Operational / reliability | 4 | 4 | 16 | P1 | IDENTIFIED | Performance Test Owner | Service Owner, Test Architect, Operations Owner | S5 |
| R-08 | Required dependency or memory pressure is misreported as healthy | Operational / health | 3 | 4 | 12 | P2 | IDENTIFIED | Service Owner | Operations Owner, Test Architect, Software Architect | S5 |
| R-09 | Slot or viewer failure is hidden by backend liveness | Operational / integration | 4 | 4 | 16 | P1 | IDENTIFIED | UI/API Owner | Service Owner, Test Architect, Configuration Manager | S5 |
| R-10 | Duplicate Codebase Memory indexes split structural authority | External / architecture | 4 | 4 | 16 | P1 | IDENTIFIED | Codebase Memory Maintainer | Software Architect, Configuration Manager, Test Architect | S6 |
| R-11 | Connector repair overwrites unrelated provider configuration | Operational / connector | 2 | 4 | 8 | P3 | IDENTIFIED | Connector Owner | Provider Integration Owners, Configuration Manager, Test Architect | S6 |
| R-12 | External addon distribution precedes release proof and authorization | External / governance | 3 | 5 | 15 | P2 | IDENTIFIED | AIWG Maintainer | Release Owner, Security Architect, Configuration Manager | S7 |
| R-13 | Canonical test evidence is resource-unsafe or silently incomplete | Operational / test infrastructure | 4 | 4 | 16 | P1 | IDENTIFIED | Test Infrastructure Owner | Test Architect, CI Owner, Service Owner | S1 |
| R-14 | Missing authentication configuration permits unauthenticated access | Security / authentication | 4 | 5 | 20 | P1 | IDENTIFIED | Authentication Service Owner | Security Architect, Test Architect, Operations Owner | S2 |
| R-15 | Strict/local project content reaches undeclared external processors | Privacy / provider egress | 3 | 5 | 15 | P2 | IDENTIFIED | Privacy Owner | Security Architect, Provider Integration Owner, Test Architect | S2 |
| R-16 | Non-atomic migration or partial restore corrupts or incompletely recovers state | Technical / recovery | 4 | 5 | 20 | P1 | IDENTIFIED | State Migration and Recovery Owner | Software Architect, Test Architect, Configuration Manager | S3 |
| R-17 | Context dependency failure is silently reported as successful | Technical / authority | 4 | 5 | 20 | P1 | IDENTIFIED | Context Pipeline Owner | Product Owner, Software Architect, Security Architect, Test Architect | S4 |
| R-18 | Authenticated MCP proxy failure silently downgrades to unauthenticated local authority or storage | Security / authorization | 4 | 5 | 20 | P1 | IDENTIFIED | MCP Compatibility Owner | Security Architect, Authentication Service Owner, Test Architect, Configuration Manager | S2 |
| R-19 | Automatic provider-native memory synchronization can export cross-project content without explicit user authority | Security / privacy | 4 | 5 | 20 | P1 | IDENTIFIED | Native Memory Integration Owner | Security Architect, Privacy Owner, Test Architect, Product Owner | S2 |
| R-20 | Caller-controlled session/worktree/parent identity and unlocked stale closure permit lifecycle takeover or attribution corruption | Security / identity | 4 | 5 | 20 | P1 | IDENTIFIED | Session Lifecycle Owner | Security Architect, Configuration Manager, Test Architect, Software Architect | S3 |
| R-21 | Non-durable prefix dedupe can lose distinct evidence, admit concurrent duplicates, or fabricate retry success | Technical / integrity | 4 | 4 | 16 | P1 | IDENTIFIED | Capture Integrity Owner | Test Architect, Security Architect, Data Governance Owner | S4 |
| R-22 | Non-atomic compaction can expose mixed generations or a tamper-undetectable exact-facts ledger | Technical / recovery | 4 | 5 | 20 | P1 | IDENTIFIED | State Compaction Owner | Data Governance Owner, Security Architect, Test Architect, Configuration Manager | S3 |
| R-23 | Worker failure/restart lacks durable capture replay and startup reconciliation, causing silent loss or duplication | Operational / reliability | 4 | 4 | 16 | P1 | IDENTIFIED | Runtime Supervision Owner | Operations Owner, Test Architect, Configuration Manager, Security Architect | S5 |

R-19 through R-23 are newly registered at the Security Architect-proposed
scores above. Status remains `IDENTIFIED`, and accountable-owner calibration is
pending for every new score, priority, evidence sequence, and case-card input.
R-09 was raised from 12/P2 to 16/P1 after direct source and installed-artifact
inspection confirmed that the viewer discards the valid HTTP 503 health body
used for a critical backend and can therefore render `Unknown`. Upstream
`origin/main` commit `a8e7d19a814a24a21818afc715f3301b3eaeee80` is design
evidence for a narrow repair, not risk retirement or Construction authority.
UI/API Owner calibration of the revised score remains pending.

R-13 remains 16/P1 and `IDENTIFIED`. Card version 3 now uses
`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` as the single
mandatory release-profile specification accepted by DEC-12. Its required
denominator is five
consecutive 148-file runs (`740` governed file-executions), complete
assertion/authentication manifests, and `T-LOCAL-DEPLOY` `LQ-001..014` across
three clean homes (`42` journey executions), with independent verification and
custody. Node 22, Ubuntu, and GitHub CI remain deferred portability work.
The acceptance is specification-only; no Stage-A decision, harness
implementation, execution, mitigation, or retirement is claimed.

## 2026-07-28 Local macOS Test/Risk Tailoring

The exact local profile and its 740/42 denominators are accepted by DEC-12 for
Stage-A specification only. The operations/support candidate remains an input,
not authority. Neither accepts Stage A, authorizes B1/B2, claims execution,
passes ABM, or authorizes Construction.

R-02 local release evidence is mandatory under the additive
`.aiwg/risks/poc-cards/R-02-local-macos-secret-flow-overlay.md`. It covers
fresh synthetic credentials and zero raw synthetic-canary occurrence across
LaunchAgent configuration, process environment, logs, errors, UI/health,
support output, receipts, snapshots, backups, restore/upgrade/rollback
remnants, provider payloads, and both processing-policy recording sinks. The
base R-02 card remains unchanged and controlling for its broader scope.

Railway is split into three distinct concerns:

- mandatory local R-02 sinks and secret-flow evidence;
- a parallel historical Railway external issue that remains
  `UNVERIFIED / NOT EVALUATED` until a named owner supplies separately
  authorized metadata-only evidence; and
- prospective Railway deployment, which is deferred and excluded from the
  local package, qualification, ABM, canary, and release denominators.

User-supplied live observations on 2026-07-28 are retained only as
non-qualifying candidate evidence. They indicate that a healthy viewer/Doctor
surface can coexist with missing visible project/global scope labelling,
global-looking aggregates, repeated health-503 warnings, durable-scope
warnings, and project slot list/get HTTP 500 failures. Named-project health
reported project scope coverage while exposing a materially distinct global
unscoped denominator. No session or memory content is reproduced here, and no
heal or migration is authorized.

These observations strengthen evidence needs without changing any score or
status:

- R-09: browser and MCP scope/denominator labelling, slot split-failure,
  viewer/backend identity, and `DEGRADED`/`RECOVERING`/`HEALTHY` truthfulness;
- R-14: visible browser authority/authentication state and complete protected
  viewer-data/CLI/REST/MCP denial evidence;
- R-08 and R-23: top-level health must include required slot/worker/runtime
  dependencies and preserve warning/recovery history; and
- R-16: diagnostics may recommend migration, but migration/heal remains a
  separately authorized, generation-fenced operation with exact rollback.

All 23 risks remain `IDENTIFIED`; 17 remain P1; zero are mitigated or retired.

## 2026-07-27 Temporary-Containment Evidence

The operator accepted reversible temporary containment and deferred upstream
supervisor handoff until the containment probes passed. The effective-hook
sentinel, two-project isolation probe, and subsequently authorized minimal
Codex and Claude fresh-host probes passed. Both providers dispatched the
effective contained `PreCompact` hook and persisted native compaction while a
live sentinel observed zero Agentmemory provider requests, including zero
`/agentmemory/context` and zero `/agentmemory/enrich` requests.

The original ratio-only health smoke failed, and a supplemental diagnostic
stopped safely after a real compound warning. The separately selected Option B
whole-runtime gate then passed all 21 samples. Those earlier failed attempts
remain historical and non-qualifying; they are not silently converted to
passes. Overall temporary-containment qualification now passes. Containment
remains applied, and the existing supervisor remains untouched. The next
coding session is now also blocked on corrected runtime provenance, an
official rollback artifact, and fresh-process authentication qualification.

This evidence does not require a new canonical risk while the control remains
temporary and reversible. It strengthens the rationale for:

- R-07: automatic hook traffic, missing durable terminal accounting, and
  worker-only resource visibility;
- R-08: ratio-only pressure ambiguity, an excluded `iii` process, and absent
  sustained restart/readiness qualification;
- R-23: terminal-owned worker supervision and absent durable
  replay/reconciliation proof;
- R-17: the installed `PreCompact` success/output path bypassed the injection
  flag;
- R-02: query text may enter local logs before complete sink qualification; and
- R-11: user-global hook mutation, ownership, and exact rollback remain
  operationally significant.

No score, priority, owner, evidence sequence, or status changes here.
Accountable owners must review this evidence and explicitly calibrate any later
score change. The canonical execution record is
`.aiwg/reports/iteration-4-containment-execution-2026-07-27.md`.

## 2026-07-27 Installed-Runtime Provenance Correction

Byte-level comparison against the registry-verified official npm
`@agentmemory/agentmemory@0.9.28` artifact disproved the prior upstream
rollback-control attribution. The global installed package differs across CLI,
hooks, runtime bundles, viewer, configuration, plugins, and dependencies.
Source-map attestation binds all 178 repository-owned bundled source files to
ChronodeAi commit `b17d5d2`; the installed viewer and package manifest also
match that tree. Exact build provenance and byte-for-byte reproducibility
remain unverified because the installed artifact has no build receipt or
registry integrity binding.

The live worker and existing LaunchAgent both target that fork-derived global
package. The current HEAD candidate remains undeployed, but an earlier
fork-derived build is already deployed in place outside the governed canary
sequence. No verified official-upstream rollback runtime currently exists.
The live worker also predates the current `.env`, so a fresh process can change
authentication behavior.

This is not a separate risk. It is direct evidence strengthening:

- R-06: package labels were incorrectly treated as provenance; the live
  artifact is source-consistent with commit
  `b17d5d21c12e389f060c5848053df20f5ee69a82`, while its exact build receipt,
  artifact-to-commit binding, registry binding, and byte-for-byte
  reproducibility remain unverified;
- R-14: post-restart authentication behavior is not qualified against the
  current secret-file configuration;
- R-23: the prepared supervisor points to the wrong recovery subject; and
- R-12: release and distribution controls must reject a version-labelled
  artifact that lacks commit and registry identity.

No score, priority, owner, evidence sequence, or status changes are inferred.
The prior supervisor runbook is invalidated, not failed or retired. The
canonical evidence is
`.aiwg/reports/installed-runtime-provenance-correction-2026-07-27.md`.

## UC-002 Candidate Disposition

This table reconciles every finding in
`.aiwg/working/realizations/DES-UCR-002-review-security.md`. A strengthened
existing risk keeps its prior ID and status; no finding is silently dropped or
double-counted.

| Review finding | Review candidate | Canonical disposition | Rationale |
|---|---|---|---|
| SEC-UC2-01 | RC-UC2-01 | Register R-19 | Automatic native-memory write plus project-blind source selection is a distinct cross-project export and explicit-user-authority risk. |
| SEC-UC2-02 | RC-UC2-02 | Strengthen R-02 and R-15 | R-02 owns raw pre-redaction transport/sink disclosure; R-15 owns implicit-session missing-policy external egress. |
| SEC-UC2-03 | RC-UC2-03 | Register R-20 | Caller-controlled lifecycle identity, parent partial state, and stale-close/resume races form a distinct takeover and attribution-corruption risk. |
| SEC-UC2-04 | No separate candidate | Strengthen R-14 and R-18 | R-14 owns capability/credential authority; R-18 owns protected proxy failure downgrade. No duplicate risk is created. |
| SEC-UC2-05 | RC-UC2-04 | Register R-21 | Prefix truncation, process-local state, concurrency, restart, and pre-terminal recording form one distinct capture-idempotency risk. |
| SEC-UC2-06 | RC-UC2-05 | Strengthen R-07 and R-17 | R-07 owns hook loss/backpressure accounting; R-17 owns fabricated success and typed failure semantics. |
| SEC-UC2-07 | RC-UC2-06 | Strengthen R-05 | Corroboration loss and recalled/cyclic lesson strengthening are additional self-reinforcement mechanisms. |
| SEC-UC2-08 | RC-UC2-07 | Register R-22 | Observation-to-ledger compaction has its own generation, atomicity, and tamper-detection boundary distinct from migration/restore R-16. |
| SEC-UC2-09 | No separate candidate | Strengthen R-06 | Supplied-SHA trust, ancestry/path/blob mismatch, and partial commit/session linkage remain dirty-to-commit provenance failures. |
| SEC-UC2-10 | RC-UC2-08 | Strengthen R-02 and R-11 | R-11 owns connector ownership/rewrite behavior; R-02 owns sensitive configuration copied into backups. |
| SEC-UC2-11 | RC-UC2-09 | Register R-23 | Worker supervision, durable capture replay, and startup reconciliation form a distinct operational recovery risk. |

## Planned Evidence Sequence

| Sequence | Planned evidence activity | Risks |
|---|---|---|
| S0 | Freeze revision, criteria, receipt schema, synthetic corpora, and `G-ICM-01` | All |
| S1 | Establish the exact local deterministic evidence harness: 740 governed file-executions, complete assertion/authentication manifests, 42 clean-home lifecycle journeys, synthetic processing-policy sinks, independent verification, and custody | R-13 |
| S2 | Prove local secret handling across LaunchAgent/log/support/backup/rollback/provider sinks, required authentication, downgrade resistance, processor-boundary enforcement, and explicit project-scoped native-memory writes; keep Railway history separate and unverified | R-02, R-14, R-15, R-18, R-19 |
| S3 | Prove canonical identity, lifecycle integrity, complete recoverability, compaction generation integrity, and dirty-state provenance | R-01, R-20, R-16, R-22, R-06 |
| S4 | Prove truthful dependency failure, acknowledgement, eligibility, promotion lineage, and durable exact-event capture identity | R-17, R-04, R-03, R-05, R-21 |
| S5 | Prove bounded capture, worker replay/reconciliation, truthful readiness, and viewer/slot compatibility | R-07, R-23, R-08, R-09 |
| S6 | Rehearse provider repair rollback and sandbox-only Codebase Memory alias equivalence | R-11, R-10 |
| S7 | Rehearse an offline release gate with zero publication side effects | R-12 |

Detailed score rationales are in
`risk-assessment-2026-07-25.md`. Bounded hypotheses, pass/fail criteria,
dependencies, and backtrack conditions are in `poc-plan-2026-07-25.md`.

## Retired Risks

None.

Risks R-01 through R-17 were reviewed or registered on 2026-07-25. R-18 was
registered on 2026-07-26 after independent DES-UCR-001 security review and
direct source verification. R-19 through R-23 were registered on 2026-07-26
from the independent DES-UCR-002 security review; owner calibration remains
pending. No risk is stale by age, but every risk is stale by evidence status
until its planned receipt is produced and independently reviewed.
