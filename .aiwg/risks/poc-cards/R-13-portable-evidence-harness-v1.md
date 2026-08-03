# R-13 Portable Evidence Harness Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION EVIDENCE NOT ADMITTED**
Card version: 1
Risk: R-13
Priority: P1
Method: `build-poc`
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Source tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Decision question

Can an independently operated verifier validate complete R-13 execution
evidence against an immutable source bundle, accepted execution profile,
Configuration Manager-controlled iii identity, and independently governed
signer authority, while rejecting waivers, source mismatch, incomplete
denominators, replay, and unqualified profiles?

## Bounded hypothesis

For each accepted developer or CI profile, five consecutive runs execute all
148 governed test files with exactly one Vitest worker, no missing, extra,
skipped, or failed files, no signal, and bounded time and process-tree memory.
An independently operated verifier accepts only a signed, source-bound,
profile-bound, iii-bound, complete receipt and rejects every waiver or
authority mismatch.

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
| Required consecutive runs | 5 per accepted profile |
| Required Vitest workers | Exactly 1 |
| Wall-time ceiling | 30 minutes per run |
| RSS ceiling | Lower of 4 GiB or 50% of host RAM |

Any change to these values requires card version 2 or a formally linked
superseding card.

## Required accepted profiles

The following are requirements, not accepted profile definitions:

1. Developer macOS profile using an accepted Node 20.19+ release.
2. Developer macOS profile using an accepted Node 22 release.
3. CI Ubuntu profile using an accepted Node 20.19+ release.
4. CI Ubuntu profile using an accepted Node 22 release.

For every profile, the exact OS image/build, CPU architecture, Node, npm,
Vitest, iii-engine artifact digest, environment policy, worker policy, and
resource-measurement method remain to be accepted. Node 24 or Node 26
mechanics runs do not substitute for these profiles.

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

Configured AIWG model routes are advisory implementation/review metadata only.
They cannot fill a human authority slot or prove provider-observed model
identity.

## Required fixtures

- Immutable source archive and canonical source lock above.
- Accepted iii-engine artifact plus publisher/provenance evidence.
- Accepted profile registry with exact profile IDs and expiration policy.
- Qualification receipt schema and versioned verification policy.
- Signer authority, trust distribution, rotation, revocation, and replay
  policy.
- Synthetic negative corpus covering source, profile, iii, signer, receipt,
  denominator, waiver, timestamp, and replay failures.
- Independent verification environment with no dependency on the ambient
  worktree or generator process.

## Pass evidence

All of the following are mandatory:

1. Five consecutive exit-zero runs per accepted profile.
2. Exactly 148 expected and observed test files, with matching filename and
   content manifests.
3. Exactly one worker, zero missing/extra/skipped/failed tests, and no signal.
4. Every run remains within both time and memory ceilings.
5. Mandatory integration and authentication rejection cases execute rather
   than skip.
6. Each raw receipt binds source, profile, iii artifact, operator, environment,
   command argv, timestamps, denominator, results, and resource measurements.
7. A Configuration Manager-governed signature binds the immutable receipt.
8. A separately operated verifier validates the source bundle, signer,
   authority, profile, iii provenance, receipt schema, freshness, and replay
   policy.
9. Qualification-required verification rejects every waiver and every negative
   fixture.
10. Independent reviewers record dispositions against immutable receipt IDs.

## Fail evidence

Any source mismatch, waiver, unaccepted profile, unverified iii identity,
unknown schema/policy version, incomplete denominator, hidden skip, multiple
workers, signal, resource breach, invalid signer, stale/replayed receipt,
ambient-worktree-only linkage, or verifier dependence on generator-local
authority fails the card.

## Stop and containment

Stop immediately on a real secret, user content, production state, unexpected
network egress, source/receipt mismatch, resource-limit breach, or write
outside the disposable evidence roots. Terminate the process tree, preserve
only redacted immutable receipts, quarantine the fixture namespace, and leave
all risk and gate states unchanged.

## Preparatory mechanics record

The disposable harness at
`.aiwg/working/pocs/r13-independent-evidence/` demonstrates local synthetic
in-toto Statement v1, DSSE-style Ed25519, Git source reconstruction, and
fail-closed policy mechanics. Its runs occurred before this case card was
frozen and use an ephemeral synthetic authority, synthetic iii digest, and an
unaccepted Node profile.

Those runs are **mechanics development only**. Their test count is not a card
execution count, their receipts are not admitted qualification evidence, and
they do not mitigate or retire R-13.

## Admission blockers

- Human acceptance of exact developer and CI profiles.
- Configuration Manager-controlled iii digest and signer authority.
- Independent verifier identity and retained verification environment.
- Freshness, replay, rotation, and revocation policy.
- Complete content-addressed Iteration 4 input manifest.
- Human admission of this card for bounded execution.

Current execution decision: **BLOCKED**.

