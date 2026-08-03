# R-13 Stage-A Specification Decision Packet: Iteration 6

Status: **CANDIDATE - STANDALONE SUCCESSOR FREEZE AND HUMAN IDENTITIES REQUIRED**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## One decision

Accept or return the exact R-13 Master Test Plan, local profile, case-card,
threshold, authority, receipt, replay, custody, and evidence-policy
specification.

This is Stage A only. It authorizes no B1 mechanics, B2 admission, execution,
product/CI/schema/package change, architecture selection, ADR acceptance, risk
retirement, ABM passage, Construction, runtime mutation, canary, deployment,
release, or rollout.

## Specification being decided

| Field | Exact value |
|---|---|
| Profile ID | `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` |
| Target OS/build | macOS `26.5.1`, build `25F80` |
| Architecture | `arm64` |
| Node / npm | `24.16.0` / `11.13.0` |
| Governed test files | 148 |
| Deterministic cohort | 5 consecutive complete runs |
| Governed file-executions | exactly 740 |
| Local lifecycle suite | `T-LOCAL-DEPLOY`, `LQ-001..014` |
| Lifecycle cohort | 14 journeys in each of 3 clean homes |
| Journey executions | exactly 42 |
| Worker condition | exactly one observed accepted worker |
| Processing profiles | PP-01 `zero-egress`; PP-02 exact-manifest `provider-enabled`, synthetic recording sinks only until separately authorized |
| Context budget | at most 2,000 actual tokens under an accepted tokenizer/profile |
| Hook latency | p95 strictly under 2 seconds under the accepted profile |
| Duplicate observations | strictly under 2 percent on the accepted labelled corpus |
| Recall precision | precision@5 at least 80 percent on the accepted labelled corpus |
| Eligible commit linkage | at least 95 percent with zero false links |
| Project/secret leakage | zero across accepted denominators |

Node 22, Ubuntu, GitHub CI, Windows, containers, public endpoints, Railway, and
multi-host profiles remain deferred. They are not passed, deleted, or marked
not applicable.

Stage-A acceptance binds the requirement to prepare immutable qualification
source and bundle identities, exact assertion/authentication/fixture manifests,
Configuration Manager-controlled dependencies and trust anchors,
environment/egress preflight, signed replay-safe evidence schemas, independent
verification without generator keys, exact lifecycle and rollback subjects,
and fail-closed negative cases before any B2 admission. It does not assert
that these controls exist or pass.

## Standalone reconstruction boundary

The exact R25 quartet was recovered and independently rehashed in the durable
R26 worktree:

| Historical anchor | SHA-256 |
|---|---|
| R25 manifest | `2c3039c0767866e7e21ba11eded16bc3d88a58bb56068b8e9e80c43dd9c01ac9` |
| R25 deterministic receipt | `87969f3657704bb5d6452f4e130c8c0d55b0f012a6465983abeb7651e13819e6` |
| R25 adversarial review | `a6ac699e5c073ce8f0a7769071d07bc44b03d1e58a7881b1bab7c1f6b14fbf0b` |
| R25 runtime baseline | `2e07b9101219bb4e2ada5dddb7bbdd820b2cf7982b4d66b13cdbd0c4b93e8380` |

All 24 R25 delta entries match. The exact R24 manifest, R24 deterministic
receipt, and historical binary working-evidence trees are unavailable. R26
therefore makes no current R24/R25 continuity claim and must be decided from a
standalone manifest and receipt.

## Fresh open evidence

- The absolute CLI reports a healthy local `0.9.28` service when run outside
  the restricted command sandbox; the prior CLI `Not running` result was a
  sandbox network-denial artifact.
- Direct unauthenticated global-session access on the engine returns HTTP 401.
- Both unauthenticated viewer origins return HTTP 200 for the same protected
  global-session request and relay an approximately 827 KB response.
- Candidate source leaves loopback viewers without inbound bearer enforcement,
  then manufactures upstream admin authorization for caller-selected global
  scope; a current test expects that anonymous global request to return 200.
- Direct and viewer-proxied detailed health return HTTP 200 without a
  credential, contrary to the selected DEC-14 Option A protected-surface
  policy.
- One engine and two viewer/worker processes have different parentage.
- The shared `iii` process listens on wildcard IPv4 `*:49134`; reachability and
  authentication on that boundary are untested.
- Context injection remains disabled, both plugins remain disabled, and no
  runtime or provider configuration was changed by iteration 6.
- The installed package's exact artifact-to-commit and byte-for-byte candidate
  binding remains unproved.
- R-14 has a proposed score refresh from 20/P1 to 25/P0; its status remains
  `IDENTIFIED`, accountable-owner calibration is pending, and no risk is
  mitigated or retired.
- Codebase Memory is ready on the durable worktree at the exact candidate
  commit with 6,858 nodes, 18,989 edges, zero skipped files, and three
  parse-partial files. This is best-effort structural evidence, not
  completeness proof.
- DEC-15 remains `NOT MET - 11/49`.
- DPA-001..027 remain open. No DPA or risk disposition is requested here.
- No named Stage-A human authority or required concurrence is recorded.

The viewer authorization failure is fresh specification and risk input only.
It is not qualifying execution evidence. It blocks runtime qualification,
gate-critical viewer use, B2 admission, canary, package, deployment, release,
and rollout. It does not supersede the accepted containment profile, prohibit
its already-authorized explicit project-scoped advisory recall, authorize a
stop or restart, or convert a Stage-A specification decision into execution
authority.

## Required authority

| Role | Stage-A responsibility | Current identity |
|---|---|---|
| Human Test Architect | Accountable accept/return decision | Unassigned |
| Configuration Manager | Required concurrence on source, profile, signer, replay, custody, retention, and trust | Unassigned |
| Security Architect | Required concurrence on auth, issuer/key/revocation, secret, egress, processing, and retention | Unassigned |
| Release Owner | Required concurrence on package, rollback subject, admission boundary, and release implications | Unassigned |
| Local Test Infrastructure Owner | Advisory feasibility input | Unassigned |
| Dependency Owner | Advisory exact-profile support input | Unassigned |
| CI Owner | Deferred for local target | `DEFERRED-LOCAL-TARGET` |

An `ACCEPT` without the named Human Test Architect and all three named required
concurrences is incomplete and has no Stage-A effect. Agent or model roles
cannot fill these human authorities.

The exact standalone successor manifest, deterministic receipt, and
post-generation adversarial-review hashes must accompany the external decision
request. They are not embedded in this manifest-covered packet because that
would make the freeze self-referential.

## Decision record

Use exactly one disposition:

```text
STAGE A SPECIFICATION: ACCEPT | RETURN
Scope: R-13 local macOS specification only

Candidate commit:
0e9af82dcfdf07dd1f521c4621823f31a9b2eaba

Standalone successor manifest path:
.aiwg/reports/iteration-6-input-manifest-r26.json
Standalone successor manifest SHA-256:

Deterministic receipt path:
.aiwg/reports/iteration-6-manifest-verification-r26.json
Deterministic receipt SHA-256:

Post-generation adversarial review path:
.aiwg/reports/iteration-6-adversarial-review-r26-2026-07-30.md
Post-generation adversarial review SHA-256:

Fresh runtime/security evidence:
.aiwg/reports/iteration-6-runtime-security-refresh-2026-07-30.md
SHA-256:

Runtime evidence classification:
SPECIFICATION INPUT ONLY - NOT QUALIFYING EXECUTION EVIDENCE

R24/R25 continuity:
NOT CLAIMED - R26 IS STANDALONE

Open nonconformance acknowledged:
R-02, R-08, R-09, R-14, R-23; viewer confused-deputy bypass;
unverified `*:49134` boundary; DPA-001..027

DEC-15 preserved state:
NOT MET - 11/49; no DEC-15 disposition requested here

Human Test Architect:
Disposition date:
Rationale or exact returned changes:

Configuration Manager: CONCUR | DO NOT CONCUR
Name:
Rationale:

Security Architect: CONCUR | DO NOT CONCUR
Name:
Rationale:

Release Owner: CONCUR | DO NOT CONCUR
Name:
Rationale:

Local Test Infrastructure Owner advisory input:
Dependency Owner advisory input:
```

## Effect of a valid decision

`ACCEPT` makes only the exact specification eligible for a later, separately
requested B1 decision. It does not authorize B1.

`RETURN` leaves Stage A pending and must identify the exact artifact or
contract change required. Any material change requires a successor freeze and
fresh deterministic and adversarial review.

The preserved order is:

`Stage A -> B1 -> B2 -> Stage C -> Stage D -> Stage E -> ABM rerun -> separate
Construction authorization`.
