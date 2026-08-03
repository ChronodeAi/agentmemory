# R-13 Portable Evidence Harness Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION EVIDENCE NOT ADMITTED**
Card version: 2
Supersedes: version 1 for future admission only; version 1 remains historical
Risk: R-13
Priority: P1
Method: `build-poc`
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Source tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Version-2 reason

Version 1 required Node 20 and 22 cohorts. Node 20 is End-of-Life, and the
current resolved dependency graph contains packages declaring
`^22.18.0 || >=24.11.0`. This card replaces the unaccepted Node 20 profiles
with exact Node 24 profiles. It does not accept the replacement, admit an
execution, qualify historical evidence, or change R-13 status.

Official release anchors checked on 2026-07-26:

- `https://nodejs.org/en/about/previous-releases`
- `https://nodejs.org/download/release/latest-v22.x/`
- `https://nodejs.org/en/download`

## Decision question

Can an independently operated verifier validate complete R-13 execution
evidence against an immutable source bundle, one of four human-accepted exact
execution profiles, Configuration Manager-controlled iii identity, and an
independently governed signer, while rejecting waivers, source mismatch,
incomplete denominators, replay, and unqualified profiles?

## Bounded hypothesis

For each accepted profile, five consecutive runs execute all 148 governed test
files and the accepted assertion/authentication denominator with exactly one
Vitest worker, no missing, extra, skipped, pending, or failed item, no signal,
and bounded time and process-tree memory. An independently operated verifier
accepts only a signed, source-bound, profile-bound, iii-bound complete cohort
and rejects every waiver or authority mismatch.

## Frozen source and denominator

| Field | Value |
|---|---|
| Candidate commit | `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` |
| Candidate tree | `8c479b95bb9753911df212089d7faf3d6f35a28d` |
| Immutable source archive SHA-256 | `0db9b6c2fade3690a335c306792c063e2ba4c29318b8997478aa83ba7cfed9ed` |
| Canonical source-lock SHA-256 | `ccdde85e564f74051cf38cf7b356bb3314c30eef183d9b9b91713579d8155a59` |
| Governed test files | 148 |
| Test filename manifest SHA-256 | `5f3f5736310cc634872622669452535fea6c6ce93b5abcfd88b5af981ec69550` |
| Test content manifest SHA-256 | `fe839458881bea1f8d937b1ee8cec1039e08d7431d794440278301730f435d33` |
| Historical assertion observation | 1,629 passing; provisional only |
| Required consecutive runs | 5 per accepted profile |
| Required Vitest workers | Exactly 1 |
| Wall-time ceiling | 30 minutes per run |
| RSS ceiling | Lower of 4 GiB or 50% of host RAM |

The 148-file manifests remain frozen. The accepted assertion and mandatory
authentication denominators must be frozen again against the final admitted
source. Any source, profile, threshold, or denominator change requires a new
card version or formally linked superseding card.

## Required exact profile candidates

These are unaccepted candidates. Every tuple field is identity-bearing.

1. macOS 26.5.1 build `25F80`, arm64, Node `22.23.1`, npm `10.9.8`.
2. macOS 26.5.1 build `25F80`, arm64, Node `24.18.0`, npm `11.16.0`.
3. Ubuntu 24.04.4 runner image `20260720.247.2`, x64,
   Node `22.23.1`, npm `10.9.8`.
4. Ubuntu 24.04.4 runner image `20260720.247.2`, x64,
   Node `24.18.0`, npm `11.16.0`.

The complete profile IDs and host/image requirements are defined in
`.aiwg/testing/deterministic-profile-acceptance-candidate.md`. A different OS
build, image, architecture, Node patch, npm patch, binary digest, host asset,
or boot identity is a different profile. No profile substitutes for another.

Before admission, the Dependency Owner must prove every installed package
supports both exact Node lines. The current runner must implement exact
profile IDs and Node 24 rather than broad major/minor acceptance.

## Actor assignments

| Role | Required authority | Current assignment |
|---|---|---|
| Accountable owner | Test Infrastructure Owner | Unassigned human |
| Case author | Requirements/Test author distinct from final signer | AIWG draft; human confirmation open |
| Executor | Isolated runner identity | Unassigned |
| Independent verifier | Separate operator and verification environment | Unassigned |
| Receipt signer | Configuration Manager-governed signing identity | Unassigned |
| Test acceptance | Test Architect | Unaccepted |
| CI profile owner | CI Owner | Unaccepted |
| Service review | Service Owner | Unaccepted |
| Dependency support | Software Architect / Dependency Owner | Unaccepted |

Configured AIWG model routes are advisory metadata only. They cannot fill a
human authority slot or prove provider-observed route identity.

## Required fixtures

- Immutable source archive and canonical source lock above.
- Human-accepted exact profile registry with binary/image digests and expiry.
- Complete dependency-engine support report for Node 22.23.1 and 24.18.0.
- Configuration Manager-controlled iii-engine artifact and provenance anchor.
- Qualification receipt schema and versioned verification policy.
- Signer trust, rotation, revocation, freshness, replay, and custody policy.
- Frozen assertion and mandatory authentication denominators.
- Negative corpus for source, profile, Node, image, iii, signer, receipt,
  denominator, waiver, timestamp, worker count, resources, and replay.
- Independent verification environment with no ambient-worktree or generator
  dependency.

## Pass evidence

All of the following are mandatory:

1. Five consecutive exit-zero runs for each of four accepted profiles.
2. Exactly 148 expected and observed files with both manifests matching.
3. Exact accepted assertion and mandatory authentication denominators.
4. Exactly one worker, no missing/extra/skipped/pending/failed item, no signal.
5. Every run remains within time, RSS, and accepted dispersion thresholds.
6. Each raw receipt binds immutable source, exact profile and Node binary,
   iii anchor, operator, environment, argv, times, denominators, results, and
   resource measurements.
7. One cohort statement binds each five-run set without retry substitution.
8. A Configuration Manager-governed signature binds every required statement.
9. A separately operated verifier validates source, signer, authority,
   profile, dependency support, iii provenance, schema, freshness, replay,
   custody, and all positive/negative policy cases.
10. Independent reviewers record dispositions against immutable receipt IDs.

## Fail evidence

Any source mismatch, waiver, unaccepted or broad profile, unsupported
dependency, wrong Node/image/binary digest, unverified iii identity, unknown
schema/policy, incomplete denominator, hidden skip, zero or multiple workers,
signal, resource/dispersion breach, invalid/revoked signer, stale/replayed
receipt, retry substitution, ambient-worktree-only linkage, or verifier
dependence on generator-local authority fails the card.

## Stop and containment

Stop immediately on a real secret, user content, production state, unexpected
network egress, source/receipt mismatch, resource breach, or write outside the
disposable evidence roots. Terminate the process tree, preserve only redacted
immutable receipts, quarantine fixture state, and leave risk/gate states
unchanged.

## Admission blockers

- Human acceptance of all four exact version-2 profiles.
- Complete Node 22/24 dependency-engine support report.
- Exact-profile and Node-24 runner/schema/validator support.
- Configuration Manager-controlled iii and signer authorities.
- Independent verifier identity and retained verification environment.
- Freshness, replay, rotation, revocation, and custody policy.
- Regenerated signed Iteration 4 input manifest with zero drift.
- Frozen assertion/authentication denominators.
- Human admission of this exact card version for bounded execution.

Current execution decision: **BLOCKED**.
