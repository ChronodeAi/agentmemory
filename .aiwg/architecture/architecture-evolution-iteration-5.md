# Architecture Evolution: Iteration 5 Decision Readiness

Status: **REVIEW CANDIDATE - NO CONFIGURATION SELECTED**

Date: 2026-07-29
Predecessor:
`.aiwg/architecture/architecture-evolution-iteration-4.md`
Authority boundary: Revision 24 successor freeze only

## Purpose

Reconcile the current architecture decision surface with iteration-5 runtime,
MCP, graph, and tooling observations. This document adds no architecture
authority, changes no ADR status, and makes no recommendation.

## Current architecture state

| Surface | State |
|---|---|
| Software Architecture Document | Draft; not baselined |
| Interface Control Matrix | Draft; not baselined |
| ADR-001 through ADR-007 | Proposed |
| Configurations | C1, C2, C3, and newly exposed C4 prepared for comparison |
| Configuration selected | No |
| Hard vetoes open | 16 of 16 |
| Score rows | 0 |
| Recommendation | None |
| Architecture accepted | No |
| ABM | FAIL / NO-GO |
| Construction | Not authorized |

DEC-11 selects local macOS as the development and prospective evidence route.
DEC-13 selects project-specific processing with `zero-egress` default and an
exact manifest for `provider-enabled`. DEC-14 selects bearer authentication
for every viewer/protected surface except `GET /agentmemory/livez`. These are
bounded policy inputs, not architecture selection or evidence that a veto is
closed.

## Configuration set

### C1 - Direct strict cutover with embedded evidence

Strict project-scoped core, no legacy credential path, typed required/optional
failure semantics, provider-native acknowledgement, generation-fenced state,
exact restore, and an embedded transactional outbox. It minimizes steady-state
ambiguity and maximizes immediate client transition risk.

### C2 - Strict core with temporary compatibility gateway

C1 strict core plus a same-host, loopback-only, owner-bound, expiry-bound
gateway for an exact accepted legacy client/operation allowlist. The gateway
has no global, promotion, migration, restore, provider, or gate-critical
authority. No allowlist, owner set, expiry, or retirement threshold is accepted
yet.

### C3 - Strict core, temporary gateway, and receipt relay

C2 plus an advisory same-host receipt relay. The embedded transactional outbox
remains the atomic evidence source. The relay adds lag, reconciliation,
retention, restart, custody, and bypass-prevention burdens and gains no
independent authority merely by being a separate process.

An external sidecar without an embedded atomic outbox remains incoherent
because runtime state and evidence can commit in different crash windows.

### C4 - Direct strict cutover with receipt relay

C1 strict core and direct client cutover, with no compatibility gateway, plus
the same advisory receipt relay and embedded transactional outbox required by
C3. C4 exposes the combination omitted by the iteration-4 option list even
though compatibility strategy and evidence placement are independent axes.

C4 requires direct-cutover migration and client-retirement evidence plus relay
lag, retention, restart, reconciliation, bypass-prevention, and operations
ownership. It is unselected, unscored, and no more authoritative than C1-C3.
Human architects may return it only by recording a reason that the combination
is prohibited; it cannot be silently omitted from a future comparison.

## Hard-veto register

All conditions below remain open and prevent scoring:

| Veto | Required proof class | Primary linked risks | Accountable disposition role |
|---:|---|---|---|
| 1 | Canonical identity and zero cross-project disclosure | R-01, R-10 | Software Architect |
| 2 | Zero raw-secret disclosure and prohibited processing | R-02, R-15 | Security Architect |
| 3 | Authenticated protected operations and no proxy downgrade | R-14, R-18 | Security Architect |
| 4 | Required failures cannot appear healthy or successful | R-08, R-09, R-17, R-23 | Service Owner |
| 5 | Provider-native acknowledgement before suppression | R-04 | Provider Integration Owner |
| 6 | No recalled-only or unresolved promotion authority | R-03, R-05 | Product Owner |
| 7 | One exact migration/restore/runtime-data generation | R-16, R-22 | State Migration and Recovery Owner |
| 8 | Complete current interface/state/fixture/test denominators | R-10, R-13 | Configuration Manager |
| 9 | No silent gateway downgrade; exact owner/expiry/sunset | R-18; R-11 adjacent | Compatibility Transition Owner, unassigned |
| 10 | Atomic, non-bypassable evidence and reconciled relay | R-06, R-22, R-23 | Evidence Integrity Owner, unassigned |
| 11 | Observable, fault-injectable, bounded contracts | R-07, R-13 | Test Architect |
| 12 | Independent evidence and required human authority | R-12, R-13 | Configuration Manager |
| 13 | Explicit project/source/destination native-memory authority | R-19 | Native Memory Integration Owner |
| 14 | Immutable lifecycle scope and CAS/version control | R-20 | Session Lifecycle Owner |
| 15 | Durable full-event dedupe and atomic compaction generation | R-21, R-22 | Capture Integrity and State Compaction Owners |
| 16 | Durable hook disposition, singleton worker, bounded replay | R-07, R-23 | Runtime Supervision Owner |

## Iteration-5 evidence impact

The new observations close no veto:

- Agentmemory 0.9.28 responds on port 3111, but its own CLI reports
  `Not running`, Doctor reports `server: 0/1`, and the viewer is intermittent;
- detailed protected health and, intermittently, the viewer shell are readable
  without a credential even though DEC-14 exempts only liveness;
- the engine and worker have split ad hoc supervision while the expected
  LaunchAgent is absent;
- the MCP project has no useful memories, promotions, context, or commit links,
  and slot listing returns HTTP 500;
- Codebase Memory remains a moderate index with 148 excluded test files, 151
  test-scope gap records, three parse-partial files, and malformed normalized
  scope values; and
- AIWG uses a `2026.7.24` bootstrap launcher over a `2026.7.16` active
  customize-mode checkout; its labeling is ambiguous, while provider inventory
  differences are explainable and the workspace is generally healthy.

These observations strengthen the need for veto 3, 4, 8, 11, 12, and 16
evidence. They are regression seeds and tooling disclosures, not candidate
causation or configuration discrimination.

## MCDA boundary

If and only if every veto has qualifying evidence, surviving configurations
may be scored on the fixed 100-point denominator:

| Criterion | Weight |
|---|---:|
| Security | 18 |
| Truthfulness | 16 |
| Rollback/recovery | 14 |
| Testability | 12 |
| Operability | 11 |
| Compatibility | 9 |
| Maintainability | 9 |
| Performance | 6 |
| Migration cost | 5 |

Unknown evidence scores zero without renormalizing weights. Independent
scorers, adjudication of differences of two or more, plus/minus 20 percent
weight sensitivity, at least 80 weighted points of evidence coverage, and a
stable lead of at least five points are required before a recommendation.
No scoring is currently permitted.

## Human-decision backlog

Human owners still must decide:

1. strict-core transition configuration;
2. compatibility clients, operations, owners, expiry, and retirement;
3. provider-native acknowledgement mechanisms;
4. required/optional dependencies and readiness timing;
5. evidence authority, signers, and accepted profile registry;
6. state manifest, generations, RPO/RTO, and rollback tiers;
7. local secret/bootstrap, provider manifest, mesh posture, and bearer issuance;
8. receipt-relay value versus burden;
9. explicit native-memory destinations and authority;
10. session/worktree lifecycle authority and CAS/version semantics;
11. exact event identity, compaction integrity, and supervision/replay;
12. package roots, LaunchAgent labels, process split, ownership, and timeouts;
13. runtime/data compatibility, activation, recovery, retention, and
    reconciliation;
14. viewer/project-health/slot/Doctor denominators, scope, authority, history,
    and actions; and
15. separate ownership for historical Railway investigation.

## Disposition

C1, C2, C3, and C4 remain unselected and unscoreable. ADR-001 through ADR-007
remain Proposed, the SAD and ICM remain Draft, all 16 vetoes remain open, ABM
remains NO-GO, and Construction remains unauthorized. Stage-A specification
review may proceed as a separate test-governance decision and changes none of
these states.
