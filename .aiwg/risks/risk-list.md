# Risk List

Status: Active - ABM remediation planning only
Date: 2026-07-25
Iteration: Elaboration iteration 1
Evidence baseline: `9b74ab7eb729961a42844accf6575906200e6275`
Risk owner: Project Manager
Gate posture: ABM NO-GO; Construction not authorized

This register is a working risk assessment. Every risk remains `IDENTIFIED`.
No PoC was executed, no risk was accepted, mitigated, or retired, and no ADR
or architecture baseline was approved by this cycle.

## Scoring

- Probability: 1 Rare, 2 Unlikely, 3 Possible, 4 Likely, 5 Almost Certain.
- Impact: 1 Negligible, 2 Minor, 3 Moderate, 4 Major, 5 Catastrophic.
- Score: probability x impact.
- Priority: P0 21-25, P1 16-20, P2 11-15, P3 1-10.

## Portfolio

| Metric | Value |
|---|---:|
| Active risks | 17 |
| P0 | 0 |
| P1 | 10 |
| P2 | 6 |
| P3 | 1 |
| Aggregate score | 276 |
| Mean score | 16.2 |
| Median score | 16 |
| Retired | 0 |
| Retirement rate | 0% |

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
| R-09 | Slot or viewer failure is hidden by backend liveness | Operational / integration | 3 | 4 | 12 | P2 | IDENTIFIED | UI/API Owner | Service Owner, Test Architect, Configuration Manager | S5 |
| R-10 | Duplicate Codebase Memory indexes split structural authority | External / architecture | 4 | 4 | 16 | P1 | IDENTIFIED | Codebase Memory Maintainer | Software Architect, Configuration Manager, Test Architect | S6 |
| R-11 | Connector repair overwrites unrelated provider configuration | Operational / connector | 2 | 4 | 8 | P3 | IDENTIFIED | Connector Owner | Provider Integration Owners, Configuration Manager, Test Architect | S6 |
| R-12 | External addon distribution precedes release proof and authorization | External / governance | 3 | 5 | 15 | P2 | IDENTIFIED | AIWG Maintainer | Release Owner, Security Architect, Configuration Manager | S7 |
| R-13 | Canonical test evidence is resource-unsafe or silently incomplete | Operational / test infrastructure | 4 | 4 | 16 | P1 | IDENTIFIED | Test Infrastructure Owner | Test Architect, CI Owner, Service Owner | S1 |
| R-14 | Missing authentication configuration permits unauthenticated access | Security / authentication | 4 | 5 | 20 | P1 | IDENTIFIED | Authentication Service Owner | Security Architect, Test Architect, Operations Owner | S2 |
| R-15 | Strict/local project content reaches undeclared external processors | Privacy / provider egress | 3 | 5 | 15 | P2 | IDENTIFIED | Privacy Owner | Security Architect, Provider Integration Owner, Test Architect | S2 |
| R-16 | Non-atomic migration or partial restore corrupts or incompletely recovers state | Technical / recovery | 4 | 5 | 20 | P1 | IDENTIFIED | State Migration and Recovery Owner | Software Architect, Test Architect, Configuration Manager | S3 |
| R-17 | Context dependency failure is silently reported as successful | Technical / authority | 4 | 5 | 20 | P1 | IDENTIFIED | Context Pipeline Owner | Product Owner, Software Architect, Security Architect, Test Architect | S4 |

## Planned Evidence Sequence

| Sequence | Planned evidence activity | Risks |
|---|---|---|
| S0 | Freeze revision, criteria, receipt schema, synthetic corpora, and `G-ICM-01` | All |
| S1 | Establish the deterministic, complete, authenticated evidence harness | R-13 |
| S2 | Prove secret handling, required authentication, and processor-boundary enforcement | R-02, R-14, R-15 |
| S3 | Prove canonical identity, complete recoverability, and dirty-state provenance | R-01, R-16, R-06 |
| S4 | Prove truthful dependency failure, acknowledgement, eligibility, and promotion lineage | R-17, R-04, R-03, R-05 |
| S5 | Prove bounded capture, truthful readiness, and viewer/slot compatibility | R-07, R-08, R-09 |
| S6 | Rehearse provider repair rollback and sandbox-only Codebase Memory alias equivalence | R-11, R-10 |
| S7 | Rehearse an offline release gate with zero publication side effects | R-12 |

Detailed score rationales are in
`risk-assessment-2026-07-25.md`. Bounded hypotheses, pass/fail criteria,
dependencies, and backtrack conditions are in `poc-plan-2026-07-25.md`.

## Retired Risks

None.

All 17 risks were reviewed or registered on 2026-07-25. No risk is stale by
age, but every risk is stale by evidence status until its planned receipt is
produced and independently reviewed.
