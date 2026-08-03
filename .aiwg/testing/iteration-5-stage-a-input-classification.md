# Iteration 5 Stage-A Input Classification

Status: **CANDIDATE - R25 FREEZE AND HUMAN AUTHORITY REQUIRED**

Date: 2026-07-29
Decision scope: R-13 local macOS specification only

## Scope

Stage A may decide the specification for one local macOS profile. It cannot
authorize mechanics, admit an execution instance, qualify evidence, accept a
risk, or cover CI/portable profiles.

| Input class | Artifact or identity | Stage-A treatment |
|---|---|---|
| Accepted predecessor | Revision 24 manifest and its accepted freeze-only disposition | Historical authority boundary; exact R24 hash required |
| Successor freeze | Iteration-5/R25 manifest and deterministic/adversarial receipts | Must exist and pass before human decision |
| Test authority candidate | `.aiwg/testing/master-test-plan.md` | Exact R25-bound hash required; acceptance still open |
| Profile candidate | `.aiwg/testing/local-macos-qualification-profile-candidate.md` | Exact R25-bound hash required; local target only |
| R-13 case card | `.aiwg/risks/poc-cards/R-13-deterministic-test-reliability.md` | Exact R25-bound hash required |
| Profile acceptance candidate | `.aiwg/testing/deterministic-profile-acceptance-candidate.md` | Exact R25-bound hash required |
| Conformance candidate | `.aiwg/testing/r13-implementation-conformance-matrix.md` | Specification gap register, not implementation proof |
| Local operations candidate | `.aiwg/deployment/local-macos-operations-candidate.md` | Exact R25-bound hash required; implementation absent |
| Journey specification | `T-LOCAL-DEPLOY`, `LQ-001..014` and journey manifest | Exact R25-bound specification hash required |
| Retrieval/load method | `.aiwg/testing/iteration-5-retrieval-and-load-profile-specification.md` | Stage-A method input; corpus/host instance identities deferred |
| Finding dispositions | `.aiwg/testing/iteration-5-dpa-finding-dispositions.md` | Every `DPA-001..027` must be acknowledged |
| Human authority | Human Test Architect plus Configuration Manager, Security Architect, and Release Owner | Real named people and explicit decision/concurrence required |

## Explicitly deferred instance identities

These values are not Stage-A inputs and must never appear as unexplained blank
fields:

| Future identity | Current marker | Earliest decision |
|---|---|---|
| Disposable mechanics source/root manifest | `DEFERRED-B1` | B1 |
| Runner, validator, schema, and synthetic fixture instance hashes | `DEFERRED-B1/B2` | Prepared in B1; admitted in B2 |
| Exact assertion and authentication denominator manifests | `DEFERRED-B2` | B2 |
| Node/iii/signer/trust-anchor instance identities | `DEFERRED-B2` | B2 |
| Exact retrieval corpus, labels, judges, and tokenizer instance | `DEFERRED-B2` | B2 |
| Exact load host, event mix, fault schedule, and expected counts | `DEFERRED-B2` | B2 |
| Raw-run/cohort receipts and signatures | `DEFERRED-STAGE-C` | Stage C |
| Independent retained-environment verification | `DEFERRED-STAGE-D` | Stage D |
| Risk-owner disposition | `DEFERRED-STAGE-E` | Stage E |
| CI/Ubuntu/Node-22 profile | `DEFERRED-LOCAL-TARGET` | Separate portability cycle |

## Acceptance semantics

A valid Stage-A acceptance means only that the frozen specification and
methods are fit to guide later preparation. It does not claim any deferred
identity exists. Any decision form that fills a deferred instance field with a
placeholder hash, an agent identity, or generated telemetry is invalid.
