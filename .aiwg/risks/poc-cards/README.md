# PoC Case-Card Register

Status: **SPECIFICATION CONTROL - NO EXECUTION AUTHORITY**
Iteration: 4
Phase: Elaboration remediation
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Purpose

This register separates a risk hypothesis from an executable evidence case.
An entry is executable only when its versioned card, fixture manifest,
denominator, source identity, actor assignments, stop conditions, and
acceptance evidence have been frozen and accepted by the named owners.

Every invocation also requires
`.aiwg/risks/poc-cards/BUILD-POC-GOVERNANCE.md`. Direct use of the generic AIWG
`build-poc` skill is prohibited because its generic GO/NO-GO and risk-retirement
outputs exceed this project's delegated authority.

Code, scripts, or self-tests produced before that point demonstrate mechanics
only. They are not qualifying evidence, do not change risk status, and cannot
support ABM passage or Construction authorization.

## Admission states

- `BLOCKED-NO-CARD`: no versioned case card exists.
- `SPECIFICATION-CANDIDATE`: a card exists but one or more authority, fixture,
  profile, signer, reviewer, or acceptance fields remain open.
- `TARGETED-METHOD-SPECIFICATION-CANDIDATE`: a non-PoC evidence specification
  exists, but its source, profile, fixtures, actors, receipt, and independent
  review remain open. This state grants no execution authority.
- `READY-FOR-BOUNDED-EXECUTION`: all card inputs are frozen and the named
  human authority has admitted the bounded run.
- `EXECUTED-NOT-REVIEWED`: a receipt exists but independent review is open.
- `REVIEWED-EVIDENCE`: independent dispositions exist. Risk and gate status
  still remain separate decisions.

## Register

| Risk | Priority | Evidence method | Card version | Current state | Next admission dependency |
|---|---|---|---:|---|---|
| R-01 | P2 | Targeted contract tests and review | - | TARGETED-METHOD-SPECIFICATION-CANDIDATE | Freeze `P2-R01-EVIDENCE-SPEC-V1`, identity fixture classes, and alias ownership registry |
| R-02 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Railway containment, secret corpus, sink inventory |
| R-03 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | R-04, R-06, R-17 and labelled eligibility corpus |
| R-04 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Provider-native acknowledgement mechanism |
| R-05 | P2 | Targeted lineage tests and review | - | TARGETED-METHOD-SPECIFICATION-CANDIDATE | Freeze `P2-R05-EVIDENCE-SPEC-V1` after R-03, R-04, R-06 and R-17 evidence |
| R-06 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | R-01 identity contract and dirty-event denominator |
| R-07 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Accepted host/load profile and capacity semantics |
| R-08 | P2 | Targeted fault tests and review | - | TARGETED-METHOD-SPECIFICATION-CANDIDATE | Freeze `P2-R08-EVIDENCE-SPEC-V1` after R-07 profile and accepted readiness state machine |
| R-09 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Accepted health/fetch/compatibility contract, complete build/scope/slot/browser matrix, owners, signers and independent validator |
| R-10 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | R-01, R-16 and frozen 20-query alias manifest |
| R-11 | P3 | Disposable-home operational rehearsal | - | BLOCKED-NO-CARD | Connector pre-images and exact rollback fixtures |
| R-12 | P2 | Offline admission rehearsal | - | BLOCKED-NO-CARD | Complete required evidence and decision index |
| R-13 | P1 | `build-poc` | 3 | SPECIFICATION-CANDIDATE | Stage-A MTP/profile/card specification acceptance, then B1 disposable mechanics authorization and B2 admission of the frozen qualification source/bundle, exact profiles, environment/denominator policies, iii/signer/custody authorities and independent verifier |
| R-14 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Protected interface and externally reachable fixture manifests |
| R-15 | P2 | Targeted egress veto tests and review | - | TARGETED-METHOD-SPECIFICATION-CANDIDATE | Freeze `P2-R15-EVIDENCE-SPEC-V1` with complete processor and provider-attempt inventory |
| R-16 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Complete state inventory and generation contract |
| R-17 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Required/optional source classification and fault truth table |
| R-18 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Accepted compatibility/offline-mode contract, error matrix, side-effect denominator, owners and independent validator |
| R-19 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Explicit-user-action contract, exact project/destination fixtures, owners, signers and independent validator |
| R-20 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Session authority/state-machine contract, concurrency oracle, owners, signers and independent validator |
| R-21 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Exact-event identity/durability contract, fault oracle, owners, signers and independent validator |
| R-22 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Generation/ledger-integrity contract, fault oracle, owners, signers and independent validator |
| R-23 | P1 | `build-poc` | 1 | SPECIFICATION-CANDIDATE | Durable intake/supervision/replay contract, process oracle, owners, signers and independent validator |

## Execution rule

All 17 P1 risks use `build-poc` under the current scores. P2 and P3 risks use
targeted tests, contract review, or bounded operational rehearsal unless a
later owner-approved score changes their priority. No row in this register is
currently ready for qualifying execution.

R-13 versions 1 and 2 remain historical review inputs. Version 3 is the only
current future-admission candidate; its Stage-A specification review is
separate from B1 mechanics authorization and B2 execution admission.

## Prepared inputs

The shared P1 control is
`.aiwg/risks/poc-cards/inputs/p1-input-control-v1.json`. Each current P1 card
has one companion JSON input in `inputs/`. The 17 companions, common fixture
catalog, and three configuration catalogs are preparation candidates only:
none is frozen, admitted, or executable.

The four P2 hard-veto-related methods are specified in
`.aiwg/architecture/iteration-4-p2-hard-veto-evidence-specifications.md` and
its JSON companion. They remain targeted test/review methods and must not be
routed through generic `build-poc`.
