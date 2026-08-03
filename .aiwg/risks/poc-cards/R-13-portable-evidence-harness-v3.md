# R-13 Portable Evidence Harness Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Card version: 3
Supersedes: version 2 for future admission only; versions 1 and 2 remain
historical review inputs
Risk: R-13
Priority: P1
Method: project-governed `build-poc`
Current design source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Current design tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Input identity and stage state

- Common identities and predecessor profile inputs:
  `inputs/p1-input-control-v1.json`.
- DEC-12 accepted mandatory release-profile specification:
  `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`.
- Card companion input: `inputs/R-13-v3.json`.
- Revision 21 is a passed local deterministic advisory freeze only; it is
  unsigned, non-custodied, and non-qualifying.
- Stage-A specification decision: **INCOMPLETE** because named concurrences
  and exact Decision-A fields remain open; DEC-17 accepts the authority matrix
  but does not fill its assignments or concurrences.
- Qualification source, disposable mechanics bundle, execution binding for
  the DEC-12-accepted profile, assertion/authentication identity manifests,
  signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Stage C execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Version-3 reason

Version 2 replaced unaccepted Node 20 profiles with exact Node 22 and 24
candidates, but it made accepted execution evidence a prerequisite for
accepting the specification that would authorize that execution. The selected
local target now supersedes those rows for the mandatory release denominator;
Node 22, Ubuntu, and GitHub CI remain deferred portability work rather than
being deleted, passed, or marked `N/A`. Version 2 also did not make the
following implementation contradictions explicit:

- The existing deferred CI path supplies `AGENTMEMORY_SECRET` but omits the
  separately required `AGENTMEMORY_PROJECT_CAPABILITY_SECRET`, so it fails
  preflight before Vitest and cannot substitute for local evidence.
- The runner copies the ambient environment and deletes only a narrow set of
  provider credential names. This is not an allowlist.
- The runner accepts broad Node 20/22 ranges, rejects Node 24, records no exact
  profile ID, and does not enforce OS, image, npm, architecture, or binary
  identity.
- `source_tree_sha256` is a custom HEAD/diff/untracked worktree fingerprint,
  not a Git tree OID or immutable source-archive digest.
- Zero observed workers can pass an "at most one" check.
- The historical 1,629-test observation has no accepted assertion-identity
  manifest and therefore cannot yet be a mandatory denominator.
- Receipts and the validator lack independent signer, immutable-bundle,
  cohort, replay, revocation, and custody semantics.

This card corrects the decision sequence and contract. DEC-12 separately
accepts the exact profile and 740/42 denominators for Stage-A specification
only. Neither that decision nor this card accepts Stage A, admits remediation
implementation or execution, qualifies historical evidence, changes R-13
status, passes ABM, or authorizes Construction.

## Decision question

Can a separately operated verifier accept the exact local five-run/740-file-
execution R-13 cohort and three-clean-home/42-journey lifecycle cohort only
when they are bound to an immutable admitted source bundle, the single exact
human-accepted local profile, accepted file/assertion/authentication/journey
denominators, Configuration Manager-controlled iii and signer authorities,
explicit environment and processing policies, local operations identities,
and complete replay/custody evidence, while rejecting every waiver or
mismatch?

## Bounded hypotheses

### H1 - Exact deterministic execution

For the accepted local profile, five consecutive runs use one immutable source
and toolchain, execute all 148 governed files on every run (exactly 740 file-
executions) and every accepted assertion/authentication identity with exactly
one observed worker, remain within accepted time/RSS/dispersion limits, and
preserve every attempt without retry substitution.

### H2 - Portable independent verification

A verifier operating without the generator checkout, generator key material,
or mutable CI state validates the source bundle, profile, Node/npm/iii
identities, denominators, statements, signatures, freshness, revocation,
replay, and custody, and rejects every negative-corpus mutation.

### H3 - Secret and environment isolation

The service and test children receive only variables named by an accepted
allowlist plus unique synthetic authentication fixtures. A name-only preflight
proves forbidden variable names are absent without reading or recording their
values. No raw secret reaches receipts, logs, summaries, or provider requests.

### H4 - Local lifecycle and processing-policy evidence

`T-LOCAL-DEPLOY` executes `LQ-001..014` across three independent clean homes
(exactly 42 journey executions), covers LaunchAgent, logs, support, auth,
viewer/health, backup/restore/upgrade, rollback/uninstall, and proves both
`PP-01 zero-egress` and `PP-02 provider-enabled` with synthetic recording
sinks. Any real provider call remains separately authorized.

## Decision and execution stages

The stages are sequential and cannot be combined:

| Stage | Human or evidence gate | Permitted result |
|---|---|---|
| A | Human Test Architect role, once assigned, accepts or rejects the MTP, profile-registry, card, thresholds, and evidence-policy specification with the required recorded concurrences in the MTP authority matrix | Accepts the specification only; no implementation or execution authority |
| B1 | Human PoC Preparation Owner authorizes one disposable harness/policy/fixture implementation scope, exact write roots, actors, timebox, resource limits, stop conditions, and cleanup contract | Authorizes non-qualifying mechanics only under `.aiwg/working/pocs/**`; no product, CI, release-harness, or qualifying execution changes |
| B2 | Human PoC Admission Owner admits this exact card digest and the frozen disposable implementation, qualification source, fixture, profile, policy, actor, environment, limit, and stop-condition digests | Authorizes the named Stage-C execution only |
| C | One local five-run/740-file-execution cohort and one three-clean-home/42-journey lifecycle cohort complete under the B2-admitted immutable inputs | Produces candidate evidence only |
| D | Separately operated verifier and independent reviewers disposition immutable receipts and negative cases | Produces reviewed evidence only |
| E | Accountable risk owner and later ABM reviewers decide risk disposition and gate readiness | May support a later risk or ABM decision; never automatic |

Stage A does not authorize B1 or B2. B1 does not admit Stage C. B2 admits only
the exact Stage-C execution. Stage C does not imply Stage D or E. No stage
accepts architecture, baselines the SAD, authorizes Construction, deploys the
fork, or authorizes rollout. The accountable roles, required concurrences,
independence constraints, and decision-record locations are defined in the
Master Test Plan. DEC-17 accepts that authority matrix; all human assignments
and actual concurrences remain open until explicitly recorded.

DEC-18 confirms the later Stage-E risk threshold: the denominator is 23, at
least 17 must be mitigated or retired, accepted-but-open risks do not count,
and any unresolved mandatory veto prevents ABM PASS. Current risk evidence is
0 of 23, with all 23 risks `IDENTIFIED`.

## Source and denominator control

The current design source is not the future qualification source. After B1
mechanics preparation and before B2 execution admission, Configuration Manager
must freeze a clean qualification source and a separately identified disposable
PoC bundle containing this card, the accepted policies/manifests, and the
authorized mechanics.

| Identity | Current observation | Admission requirement |
|---|---|---|
| Design commit | `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` | Historical design input only |
| Design Git tree | `8c479b95bb9753911df212089d7faf3d6f35a28d` | Historical design input only |
| Design archive SHA-256 | `0db9b6c2fade3690a335c306792c063e2ba4c29318b8997478aa83ba7cfed9ed` | Historical design input only |
| Design source-lock SHA-256 | `ccdde85e564f74051cf38cf7b356bb3314c30eef183d9b9b91713579d8155a59` | Historical design input only |
| Qualification commit/tree/archive/source lock | Not frozen | Must identify the B2-admitted candidate source; historical design identities cannot substitute |
| Disposable PoC bundle/lock | Not frozen | Must contain only the B1-authorized mechanics and accepted card/policies/manifests |
| Governed test files | 148 reconciled | Five consecutive 148/148 runs; accepted filename/content manifests match exactly 740 file-executions |
| File manifest SHA-256 | `5f3f5736310cc634872622669452535fea6c6ce93b5abcfd88b5af981ec69550` | Candidate input, refreeze at Stage B2 |
| File-content SHA-256 | `fe839458881bea1f8d937b1ee8cec1039e08d7431d794440278301730f435d33` | Candidate input, refreeze at Stage B2 |
| Historical assertion observation | 1,629 passing | Provisional only; not a required denominator |
| Assertion denominator | Not frozen | Exact assertion IDs/count/status manifest required |
| Authentication denominator | Three substring checks observed | Exact bearer and project-capability assertion IDs required |
| Local lifecycle denominator | `T-LOCAL-DEPLOY` candidate lists `LQ-001..014` | Three independent clean homes; 14/14 per home; exactly 42 journey executions |
| Processing-policy denominator | `PP-01` and `PP-02` candidate definitions | Complete synthetic recording-sink manifests; real provider calls separately authorized |

Any changed source byte, policy, profile, fixture, threshold, test file,
assertion ID, or authentication ID requires a linked superseding identity
before execution. Recalled or historical counts cannot fill an open manifest.

## Accepted Stage-A profile specification

The one mandatory release-profile candidate is:

`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

It binds macOS `26.5.1` build `25F80`, `arm64`, Node `24.16.0`, npm `11.13.0`,
a Configuration Manager-controlled host asset/boot identity, exact binary and
package digests, and expiry. DEC-12 accepts this tuple and its 740/42
denominators for Stage-A specification only. Host/runtime binding,
qualification, and execution acceptance remain blocked.

The host-default Node `26.0.0`/npm `11.12.1` observation is outside the
denominator. Node 22, Ubuntu, GitHub-hosted CI, Windows, containers, public
endpoints, Railway deployment, and multi-host profiles are retained as
deferred portability/compatibility/deployment work. They do not contribute
PASS evidence and are not deleted or marked `N/A`.

The earlier profile-source and dependency reports remain historical metadata
inputs. They do not accept the selected local tuple or dispose the 147
lockfile records without Node declarations.

## Actor assignments

| Role | Required authority | Current assignment |
|---|---|---|
| Stage-A accountable acceptor | Human Test Architect | Unassigned |
| Required Stage-A concurrence | Configuration Manager | Unassigned |
| Required Stage-A concurrence | Security Architect | Unassigned |
| Required Stage-A concurrence | Release Owner | Unassigned |
| Advisory local evidence | Local Test Infrastructure Owner | Unassigned |
| Advisory dependency disposition | Dependency Owner | Unassigned |
| Deferred portability | CI Owner | `DEFERRED-LOCAL-TARGET` |
| Executor | Isolated runner identity | Unassigned |
| Receipt signer | Configuration Manager-governed identity | Unassigned |
| Independent verifier | Separate B2-ready/Stage-D operator, environment, and trust material | Unassigned |
| Service review | Service Owner | Unassigned |
| Local operations review | Operations Owner | Unassigned |

Configured AIWG model routes are advisory orchestration metadata. Premium
reasoning and coding workers may prepare and execute authorized work, but they
cannot fill human authority or independent-verifier roles.

## Required specification inputs

- Accepted versioned profile registry with exact OS/host, architecture,
  Node/npm/Git, binary/archive digests, boot/run identity, and expiry.
- Configuration Manager-verified Node signature identities and selected
  archive formats.
- Complete dependency support disposition plus exact-profile install/build
  evidence.
- Explicit child-environment allowlist and a name-only forbidden-variable
  preflight that never reads values.
- Unique synthetic `AGENTMEMORY_SECRET` and
  `AGENTMEMORY_PROJECT_CAPABILITY_SECRET` fixture contract for every run.
- Separate `git_tree_oid`, `source_archive_sha256`,
  `source_lock_sha256`, and optional `worktree_state_sha256` fields.
- Accepted file, assertion, authentication, fixture, runner, validator,
  schema, processing-policy, lifecycle-journey, and local-operations manifests.
- Configuration Manager-controlled iii acquisition/provenance anchor.
- Raw-receipt and cohort-statement schemas with signer, issuer, workflow,
  profile, operator, verifier, nonce, freshness, revocation, replay, and
  custody fields.
- Local custody/retention/read-back policy. Immutable CI action/workflow
  identities remain deferred portability work.
- Exact LaunchAgent, log, support, viewer/health, auth, backup/restore/upgrade,
  rollback/uninstall, clean-home, and official-upstream rollback-subject
  identities and oracles.
- Negative corpus for every identity, denominator, authority, resource,
  environment, signature, replay, and custody failure.

## Current implementation blockers

The authoritative detailed mapping is
`.aiwg/testing/r13-implementation-conformance-matrix.md`. At minimum:

1. Complete local bearer and project-capability fixtures and authentication
   manifests are absent; current CI mismatch remains deferred portability
   evidence.
2. Current child environment isolation is deny-pattern filtering, not an
   allowlist.
3. The exact local profile is not implemented.
4. Source, assertion, authentication, signer, 740-file cohort, 42-journey
   lifecycle, processing-policy, replay, and custody identities are incomplete
   or absent.
5. Zero workers may qualify, and worker sampling is not Vitest-native.
6. Current validation depends on the ambient checkout and generator-local
   integrity data.
7. LaunchAgent, logs/support, auth, browser scope/authority/degraded recovery,
   backup/restore/upgrade, rollback/uninstall, and official-upstream rollback
   evidence remain specification candidates only.

These are objective blockers. They cannot be waived into a qualifying PASS.

## Pass evidence

All of the following are mandatory:

1. Stage A, B1, and B2 decisions identify immutable card/source/policy/fixture
   digests, actors, limits, and authority.
2. The accepted local profile produces one preserved five-run cohort; all five
   raw runs and exactly 740 governed file-executions pass without rerun
   substitution.
3. Every run matches the accepted file, assertion, authentication, fixture,
   source, profile, toolchain, Node, iii, and environment-policy manifests.
4. Exactly one worker is observed from accepted telemetry, with no missing,
   extra, failed, skipped, pending, todo, disabled, or unclassified item.
5. Every run satisfies time, RSS, and accepted dispersion limits.
6. `T-LOCAL-DEPLOY` passes `LQ-001..014` in each of three independent clean
   homes: exactly 42 journey executions with no missing, skipped, disabled, or
   silently retried journey and byte-identical unrelated provider
   configuration.
7. `PP-01` proves zero attempts and `PP-02` proves exact allowed/denied
   attribution through complete synthetic recording sinks; no real provider
   call is used without separate authorization.
8. Every raw receipt and both cohort statements are signed by accepted
   identities and pass freshness, revocation, replay, and custody policy.
9. A separately operated verifier validates extracted immutable bundles,
   local operations identities, and every negative-corpus rejection without
   generator-local authority.
10. Independent reviewers record dispositions against immutable receipt IDs.

An exit-zero `npm test`, `provisional-pass`, adjacent checksum, wrapper label,
or same-operator review is insufficient.

## Fail evidence

Any missing Stage A/B1/B2 decision, real credential, ambient forbidden variable,
profile mismatch or missing execution binding to the accepted specification,
missing project-capability fixture, unsupported dependency,
mutable or mismatched source, missing denominator, hidden skip/todo/pending/
disabled item, missing or substituted lifecycle journey, zero or multiple
workers, signal, resource/dispersion breach, unverified iii, invalid or revoked
signer, stale/replayed receipt, retry substitution, custody gap, false viewer/
health scope or authority, unauthorized provider call, or ambient-worktree
verifier dependency fails the card.

## Stop and containment

Stop immediately on a real secret or user content, unexpected external egress,
write outside disposable roots, source/policy/receipt mismatch, resource
breach, or authority confusion. Terminate the process tree, preserve only
redacted immutable evidence, quarantine disposable state, and leave all
risk/gate/ADR statuses unchanged.

## Admission blockers

- Stage A human specification acceptance.
- Human B1 authorization for one disposable mechanics scope and exact write
  roots under `.aiwg/working/pocs/**`.
- B1-authorized disposable harness/policy/fixture mechanics with passing
  non-qualifying negative contract checks.
- Frozen qualification source and disposable PoC bundle containing the
  accepted specification and B1-authorized mechanics.
- All actor assignments and separation of duties.
- B2 binding of the DEC-12-accepted exact local profile to exact host/runtime
  identities and accepted dependency-support dispositions; Node 22, Ubuntu,
  and GitHub CI remain deferred.
- Accepted environment, source, complete assertion/authentication/740-file/
  42-journey denominators, processing-policy, local-operations, signer, replay,
  and custody policies and manifests.
- Exact-profile disposable runner/schema/validator wrapper mechanics with
  passing negative contract checks. Production runner/schema/validator changes
  remain blocked until an independent ABM PASS and separate Construction
  authorization.
- Human Stage B2 admission of this exact card, qualification source,
  disposable-bundle, local profile, fixture, policy, journey, operations, and
  custody identities, including independent-verifier separation.

Current Stage A decision: **PENDING HUMAN SPECIFICATION REVIEW**.
Current Stage B1 preparation decision: **BLOCKED**.
Current Stage B2 execution decision: **BLOCKED**.
