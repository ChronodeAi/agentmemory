# Iteration 5 Bounded PoC Candidate Reconciliation

Status: **PREPARED - ZERO POCS ADMITTED OR EXECUTED**

Date: 2026-07-29
Risk authority: `.aiwg/risks/risk-list.md`
PoC authority: `.aiwg/risks/poc-plan-2026-07-25.md`
Mandatory wrapper: `.aiwg/risks/poc-cards/BUILD-POC-GOVERNANCE.md`

## Decision boundary

This record reconciles hypotheses, dependencies, owners, and sequencing. It
does not authorize `build-poc`, implement a harness, execute a test, admit
evidence, accept an ADR, change a risk score/status, retire a risk, pass ABM,
or authorize Construction.

## Portfolio

| Metric | Current value |
|---|---:|
| Total risks | 23 |
| P0 | 0 |
| P1 | 17 |
| P2 | 5 |
| P3 | 1 |
| `IDENTIFIED` | 23 |
| Mitigated or retired | 0 |
| ABM numerical threshold | 17 of 23 |
| Unresolved mandatory veto rule | One prevents PASS |
| P1 specification-candidate cards | 17 |
| P1 cards admitted | 0 |
| P1 actor slots assigned | 0 of 140 |
| P1 B1 authorized / B2 admitted / executed | 0 / 0 / 0 |

Only `MITIGATED` or `RETIRED` counts toward the later 17-of-23 threshold.
Accepted-but-open does not count.

## P1 card denominator

The exact P1 set is:

`R-02, R-03, R-04, R-06, R-07, R-09, R-10, R-13, R-14, R-16, R-17,
R-18, R-19, R-20, R-21, R-22, R-23`.

Each has a specification-candidate card and companion input. Presence is not
admission. Every card still requires exact actors, frozen inputs, limits,
stops, cleanup, source/profile/fixture identities, and a separate decision
record.

P2 `R-01`, `R-05`, `R-08`, `R-12`, and `R-15`, plus P3 `R-11`, use targeted
contract, operational, or rehearsal evidence unless later human rescoring
authorizes a different route. A hard architecture veto remains mandatory even
when its linked risk is not P1.

## Admission order

1. **R-13 Stage A**: human acceptance or return of the specification only.
2. **R-13 B1**: separately authorize exact disposable mechanics roots under
   `.aiwg/working/pocs/**`.
3. **R-13 B2**: separately admit immutable card/source/bundle/profile/fixture/
   policy/actor/limit/stop identities.
4. **R-13 C/D/E**: execute candidate cohorts, independently verify, then obtain
   risk-owner disposition. No result self-retires R-13.
5. **Later P1 cards**: only after R-13 evidence is accepted as fit to support
   them, invoke the generic `build-poc` skill through the mandatory project
   wrapper and one exact case card.

Direct generic `build-poc` invocation is prohibited.

## Dependency-aware sequence

| Wave | Risks | Bounded evidence objective |
|---:|---|---|
| 0 | R-13 | Qualify the evidence mechanism itself; preserve Stage A -> B1 -> B2 -> C -> D -> E |
| 1A | R-01 targeted | Freeze identity equivalence, ownership, aliases, worktrees, and capability rules |
| 1B | R-02, R-14, R-18, R-19; R-15 targeted | Secret corpus, complete protected-interface/proxy matrix, provider-attempt and native-destination denominators |
| 2A | R-20 plus R-01 dependency | Session/project/worktree/parent authority and lifecycle CAS/interleavings |
| 2B | R-21, R-07 | Durable exact-event identity, terminal outcomes, concurrency, backpressure, and restart |
| 2C | R-22, R-16, R-06 | Immutable generations, every-boundary faults, exact restore, and dirty-to-commit lineage |
| 3A | R-17 | Required/optional source policy and complete source-fault truth table |
| 3B | R-23, R-09; R-08 targeted | Worker replay, supervisor fencing, readiness, viewer/slot/health truth, and recovery |
| 4 | R-04 | Provider-native delivery acknowledgement and atomic suppression |
| 5 | R-03; R-05 targeted | Eligibility corpus, promotion lineage, and anti-self-reinforcement |
| 6 | R-10; R-11 targeted | Canonical/alias graph equivalence and connector rollback |
| 7 | R-12 targeted | Offline release-gate rehearsal with zero publication |

Dependencies run sequentially; independent fixtures within an admitted wave may
run in parallel only within the accepted resource and actor-separation limits.

## Stage-A-relevant R-13 hypotheses

| Hypothesis | Acceptance evidence required later |
|---|---|
| H1 exact deterministic execution | Five consecutive 148/148 runs, exactly 740 file-executions, exact assertion/auth manifests, one worker, no substitution |
| H2 portable independent verification | Immutable bundle, independent validator, accepted signer/trust/replay/custody policy, complete negative corpus |
| H3 secret/environment isolation | Explicit child-variable allowlist, name-only forbidden-variable preflight, unique synthetic bearer/project fixtures, zero raw-secret occurrence |
| H4 local lifecycle and policy evidence | `LQ-001..014` in three clean homes, exactly 42 journeys, LaunchAgent/auth/viewer/backup/rollback/uninstall and synthetic PP-01/PP-02 sinks |

These hypotheses are decision-ready as specifications only. Their mechanics and
execution remain unauthorized.

## Owner gaps

No human actor may be inferred from a role label. At minimum, R-13 requires a
Human Test Architect, Configuration Manager, Security Architect, Release Owner,
Local Test Infrastructure Owner, Dependency Owner, PoC Preparation Owner, PoC
Admission Owner, executor, receipt signer, and independent verifier. Every
later card requires its accountable risk owner plus distinct executor and
reviewer identities.

## Stop conditions

Any admitted future PoC must stop on real secrets or user content, unexpected
external egress, writes outside exact disposable roots, authority confusion,
input/source/policy/receipt mismatch, or resource limits. Preserve only
redacted immutable evidence and leave risk/gate/ADR status unchanged.

## Disposition

All 23 risks remain `IDENTIFIED`. No PoC is ready for execution. The next risk
action is the separate human R-13 Stage-A specification decision; B1 remains
blocked until that decision is validly accepted with all required human
concurrences.
