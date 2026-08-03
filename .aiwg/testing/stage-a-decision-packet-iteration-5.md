# R-13 Stage-A Specification Decision Packet: Iteration 5

Status: **CANDIDATE - SUCCESSOR FREEZE AND HUMAN IDENTITIES REQUIRED**

Date: 2026-07-29
Project: `github.com/chronodeai/agentmemory`
Candidate design commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Revision 24 manifest SHA-256:
`6ca664d7a2b3f5b842960470cf7eb71a0cf878824c2908b5dd0e1aa6099f91e5`

## One decision

Accept or return the exact R-13 Master Test Plan, local profile, case-card,
threshold, authority, receipt, replay, custody, and evidence-policy
specification.

This is Stage A only. It authorizes no B1 mechanics, B2 admission, execution,
product/CI/schema/package change, architecture selection, ADR acceptance, risk
retirement, ABM passage, Construction, runtime mutation, canary, deployment,
release, or rollout.

The complete input classification is
`.aiwg/testing/iteration-5-stage-a-input-classification.md`. Future B1/B2
instance identities are explicitly deferred rather than represented as blank
Stage-A hashes.

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

The host-default Node `26.0.0` observation is outside this denominator. Node 22,
Ubuntu, GitHub CI, Windows, containers, public endpoints, Railway, and
multi-host profiles remain deferred; they are not passed, deleted, or marked
not applicable.

## Required specification controls

Stage-A acceptance binds the requirement to prepare, before any B2 admission:

- immutable qualification source and disposable PoC bundle identities;
- exact file, assertion, authentication, fixture, runner, validator, schema,
  policy, journey, and operations manifests;
- separate Git tree, source archive, source lock, and optional worktree-state
  identities;
- a Configuration Manager-controlled Node/iii/signer/trust anchor;
- an explicit child-environment allowlist and name-only forbidden-variable
  preflight;
- unique synthetic bearer and project-capability fixtures for every run;
- signed raw-run and cohort schemas with actor, issuer, nonce, freshness,
  revocation, replay, and custody;
- independent verification without the generator checkout or key material;
- exact LaunchAgent, log, support, viewer/health, auth, backup/restore/upgrade,
  rollback/uninstall, clean-home, and rollback-subject identities and oracles;
  and
- fail-closed negative cases for every identity, authority, denominator,
  resource, environment, signature, replay, and custody mismatch.

Stage-A acceptance does not assert that these controls are implemented or
qualified.

## Current evidence limitations

- The R24 manifest and receipt passed local deterministic checks but are
  unsigned and not independently held.
- The historical 1,629-test observation lacks an accepted assertion-identity
  manifest.
- No accepted exact authentication/assertion denominator exists.
- Current Codebase Memory metadata is moderate and excludes most test files.
- The exact RTM graph check covers only 11 of 49 concrete subjects; 37 tests
  and the R-13 harness test are excluded.
- Agentmemory 0.9.28 responds to liveness and detailed-health requests, but its
  CLI reports `Not running`, Doctor reports `server: 0/1`, and the viewer is
  intermittent. This is open truthfulness and lifecycle evidence, not a
  qualified baseline.
- The detailed `/agentmemory/health` payload and, intermittently, the viewer
  shell were readable without a credential even though DEC-14 permits
  unauthenticated access only to `/agentmemory/livez`.
- The engine and worker are not controlled by the expected LaunchAgent and
  have different parentage, so singleton ownership, stop/start, replay, and
  recovery behavior remain unproved.
- A separately connected MCP surface has empty project context, no commit
  linkage, and a slot-list HTTP 500.
- AIWG's `2026.7.24` launcher and `2026.7.16` active checkout are intentional
  customize-mode composition; ambiguous labels are informational.
- No Stage-A human role or required concurrence identity is currently recorded.

These limitations prevent qualification and later execution admission. They do
not make the specification question circular because Stage A authorizes no
mechanics or execution.

Every `DPA-001..027` proposed classification is recorded in
`.aiwg/testing/iteration-5-dpa-finding-dispositions.md`. Retrieval and load
methods are defined in
`.aiwg/testing/iteration-5-retrieval-and-load-profile-specification.md`.
Neither record closes a finding or admits an execution instance.

The refreshed runtime evidence is classified against R-08, R-09, R-14, R-23,
and DPA-025..027. A Stage-A decision may acknowledge these as open
specification inputs; it cannot close them or reinterpret them as qualifying
execution evidence.

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

The exact successor manifest, deterministic receipt, and adversarial review
hashes must accompany the eventual external decision request after generation.
They are intentionally not embedded in this manifest-covered packet because
that would make the manifest self-referential. Until those companion hashes
exist and pass, this packet is not ready to present for disposition.

## Decision record

Use exactly one disposition:

```text
STAGE A SPECIFICATION: ACCEPT | RETURN

Human Test Architect:
Disposition date:
Rationale or required changes:

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

`ACCEPT` makes the exact specification eligible for a later, separately
requested B1 decision. It does not authorize B1.

`RETURN` leaves Stage A pending and must identify the exact artifact or
contract change required. Any material change requires a successor freeze and
fresh deterministic/adversarial review.

The preserved order is:

`Stage A -> B1 -> B2 -> Stage C -> Stage D -> Stage E -> ABM rerun -> separate
Construction authorization`.
