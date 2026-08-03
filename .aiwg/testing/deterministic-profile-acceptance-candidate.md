# Deterministic Profile and MTP Acceptance Packet

Status: **STAGE-A SPECIFICATION REVIEW CANDIDATE - EXECUTION HOLD**
Date: 2026-07-28
Accountable role: Human Test Architect (identity unassigned)
Required concurrence roles: Configuration Manager, Security Architect, Release
Owner (identities and concurrence records open)
Advisory owners: Local Test Infrastructure Owner, Dependency Owner, Service
Owner
Deferred role: CI Owner (`DEFERRED-LOCAL-TARGET`)
Applies to: Agentmemory Elaboration Iteration 4 and R-13
Recorded human inputs: DEC-12, DEC-17, and DEC-18 from
`.aiwg/reports/iteration-4-local-macos-human-disposition-2026-07-28.md`

## 1. Decision boundary

This packet gives a human Test Architect an exact Stage-A acceptance surface
for the single mandatory local macOS release-profile candidate, R-13 v3
specification, local lifecycle denominator, and Master Test Plan (MTP).
Stage-A acceptance accepts the specification only. A separate B1 decision is
required before any disposable PoC mechanics preparation, and a separate B2
decision is required before execution. Stage A does not admit or pass an R-13
execution, accept later execution evidence, retire R-13 or any other risk,
pass ABM, authorize Construction, deploy a canary, or authorize rollout.

DEC-12 has accepted the exact local profile tuple and its 740/42 denominators
for Stage-A specification only. DEC-17 has accepted the MTP authority matrix,
and DEC-18 has confirmed the 23/17 risk-threshold semantics. The current
reviewer recommendation remains **PREPARED FOR HUMAN SPECIFICATION REVIEW;
HOLD B1, B2, AND EXECUTION**. Section 12 separates specification blockers from
later implementation/evidence blockers. Only the named human Test Architect
may record `ACCEPT SPECIFICATION` or `REJECT SPECIFICATION` in section 14, and
acceptance becomes effective only after the Configuration Manager, Security
Architect, and Release Owner record the concurrences required by the accepted
MTP authority matrix.

The candidate source remains commit
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`, tree
`8c479b95bb9753911df212089d7faf3d6f35a28d`, and immutable source archive
SHA-256
`0db9b6c2fade3690a335c306792c063e2ba4c29318b8997478aa83ba7cfed9ed`.
Those identities are historical design inputs carried into the current
[R-13 case card v3](../risks/poc-cards/R-13-portable-evidence-harness-v3.md)
and [Iteration 4 evidence freeze](../reports/iteration-4-evidence-freeze.md).
The
[Iteration 4 revision-6 refreeze](../reports/iteration-4-evidence-refreeze-r6-2026-07-26.md)
supersedes Revision 5 after its independent advisory check found one remaining
unsplit admission-stage reference. The
[Iteration 4 revision-7 refreeze](../reports/iteration-4-evidence-refreeze-r7-2026-07-26.md)
and
[Iteration 4 revision-8 refreeze](../reports/iteration-4-evidence-refreeze-r8-2026-07-26.md)
are preserved historical inputs whose advisory reviews returned them for
revision. The canonical manifest path identifies a current local input only
when the decision record names its exact `manifest_revision` and SHA-256 and
that exact manifest has a matching passed post-generation verification
receipt. No revision changes the candidate source or admits evidence by itself.

## 2. Evidence classification and source authority

| Classification | Artifact or observation | Permitted use |
|---|---|---|
| Current governing input | [Master Test Plan](master-test-plan.md), status Draft | MTP acceptance surface; Stage A not accepted |
| Current governing input | [Iteration Plan 004](../planning/iteration-plan-004.md), status Prepared with ABM NO-GO | Scope, sequencing, authority, and stop conditions |
| Current governing input | [R-13 case card v3](../risks/poc-cards/R-13-portable-evidence-harness-v3.md), status SPECIFICATION-CANDIDATE | Staged specification/admission/execution/review contract and selected exact local-profile evidence; not admitted for execution |
| Current tailoring input | [Local macOS qualification profile](local-macos-qualification-profile-candidate.md), exact profile accepted for Stage-A specification only | DEC-12-selected mandatory local release profile and accepted 740-file-execution/42-lifecycle-journey specification denominators; no execution qualification or Stage-A authority |
| Current operations input | [Local macOS operations and support candidate](../deployment/local-macos-operations-and-support-candidate.md), status review candidate | LaunchAgent, auth, viewer, logging, support, backup, upgrade, rollback, and uninstall evidence contract; input only, not authority |
| Current local evidence | `ci/r13-test-manifest.json`, filesystem, and Git index | Current 148-file denominator reconciliation only |
| Current product/tool input | `package.json` and `package-lock.json` | Package identity, engine range, resolved toolchain, and dependency-engine compatibility |
| Current harness input | `vitest.r13.config.ts`, `scripts/r13/run.mjs`, `scripts/r13/lib.mjs`, `scripts/r13/install-iii.mjs`, `scripts/r13/validate-receipts.mjs`, `schemas/r13-receipt.schema.json` | What the present runner and validator actually enforce |
| Current local input set | [Canonical Iteration 4 input manifest](../reports/iteration-4-input-manifest.json), exact revision and SHA recorded at decision time, status candidate-unsigned | Valid only when the exact reviewed revision and SHA have a matching passed post-generation receipt with zero missing, duplicate, drifted, invalid, stage-inconsistent, or semantic-consistency findings |
| Current implementation comparison | [R-13 implementation conformance matrix](r13-implementation-conformance-matrix.md) | Decision-preparation mapping only; no product-change authority |
| Current primary-source observation | [R-13 profile source verification](r13-profile-source-verification-2026-07-26.md) and JSON | Node/runner/local-host identity observations only; signatures, custody, schedulability, and profile acceptance open |
| Historical dependency metadata observation | [R-13 dependency engine report](r13-dependency-engine-report-2026-07-26.md) and JSON | Earlier Node 22/24 range observation only; exact local-profile disposition and 147 undeclared records remain unresolved |
| Historical/provisional evidence | `.aiwg/working/evidence/r13/provisional/1785033224635-0-c0f3f7b1/` | Mechanics and historical comparison only |
| Pre-admission/provisional evidence | `.aiwg/working/pocs/r13-independent-evidence/` | Portable-envelope and negative-test mechanics only; synthetic authority, synthetic profile, and no risk effect |
| Advisory research | [R-13 portable attestation research](../research/r13-portable-attestation-2026-07-26.md) | Candidate envelope and verification-policy design only |

The predecessor
[Iteration 4 evidence freeze](../reports/iteration-4-evidence-freeze.md)
labels its input manifest unsigned, its R-13 result `provisional-pass`, and its
Node/iii waivers unresolved. Revisions 4 and 5 updated local content-addressing
and review consistency only; Revision 6 corrected admission-stage wording;
Revisions 7 and 8 passed byte-integrity checks but failed later semantic
consistency review. Numbered predecessors are historical context only. The
canonical path is current only under the exact-manifest rule above, and no
historical or provisional result is acceptance evidence.

## 3. Exact profile registry candidate

The complete mandatory release-profile matrix contains one candidate. A
profile is an exact tuple, not a major-version range. Any changed field creates
a new profile ID and requires a new Test Architect and Configuration Manager
disposition.

| Profile ID | Execution class | Exact OS and architecture | Exact Node/npm | Exact host identity | Current disposition |
|---|---|---|---|---|---|
| `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` | Local release qualification | macOS `26.5.1` build `25F80`; `arm64` | Node `24.16.0`; npm `11.13.0` | Configuration Manager-assigned host asset, OS/update evidence, host RAM, boot identity, Node binary/package digests, and expiry captured in the cohort | **ACCEPTED FOR STAGE-A SPECIFICATION ONLY; EXECUTION BLOCKED** |

The host default Node `26.0.0`/npm `11.12.1` is a compatibility observation,
not part of this denominator. Node 22, Ubuntu, GitHub-hosted CI, Windows,
containers, public endpoints, Railway deployment, and multi-host profiles are
retained as deferred portability or compatibility rows. They are not deleted,
passed, marked `N/A`, or permitted to substitute for the mandatory local
profile.

| Deferred row | Disposition | Re-entry requirement |
|---|---|---|
| Node 22 on macOS | `DEFERRED-PORTABILITY` | New exact profile, dependency disposition, trust anchors, admission, and complete cohort |
| Ubuntu/Linux | `DEFERRED-PORTABILITY` | New exact image/host profile and complete cohort |
| GitHub-hosted CI | `DEFERRED-LOCAL-TARGET` | CI Owner, immutable workflow/action/image identities, synthetic auth, custody handoff, and accepted CI profile |
| Railway deployment | `DEFERRED-DEPLOYMENT` | Separate security/deployment authority; never inferred from local qualification |

The local host facts are point-in-time observations, not a portable macOS
image. Admission requires a Configuration Manager-owned host asset record,
OS installer/update evidence, exact Node binary/package digests, and expiry.
A patched build, different architecture, runtime, host, or unrecorded
replacement is a new profile.

Every execution uses unique synthetic `AGENTMEMORY_SECRET` and
`AGENTMEMORY_PROJECT_CAPABILITY_SECRET` fixtures delivered through an accepted
secret-handling mechanism. Neither value may appear in commands, logs,
receipts, UI, support output, backups, provider payloads, or review artifacts.

## 4. Common locked toolchain

Every profile must install from the exact current `package-lock.json` with
lockfile version 3 and SHA-256
`3d9c2a3072f99cae648d76584355cacdff079c164f4ab5f863d0252a7cebb197`.
The following resolved versions and package integrities are part of the
profile:

| Tool or package | Required identity |
|---|---|
| Agentmemory package | `@agentmemory/agentmemory@0.9.28` |
| Vitest | `4.1.10`; package-lock integrity `sha512-R9jUTe5S4Qb0HCd4TNqpC7oGcrMssMRGXLW80ubjWsW9VH5GF8y1Y0SFLY9AbqSk6nt0PnOx4H4WNJYZ13GUPw==` |
| Vite | `8.1.5`; package-lock integrity `sha512-7ULLwsCdYx/nRyrpiEwvqb5TFHrMVZyBt+rg/OAXT7rgj/z+DtTDyKFeLAdDkubDVDKD8jOsndmy7m55XcfUsw==` |
| TypeScript | `6.0.3`; package-lock integrity `sha512-y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==` |
| tsx | `4.23.1`; package-lock integrity `sha512-GQHnkIfxyx1wYCOS/wonik5MVRZU9hi1TEZmzGZSCJB1y9YgoZ8H6itNE/u4suE+yLmOzuE4E5S4TZ/ZX2wcWQ==` |
| tsdown | `0.21.10`; package-lock integrity `sha512-3wk73yBhZe/wX7REqSdivNQ84TDs1mJ+IlnzrrEREP70xlJ/AEIzqaI04l/TzMKVIdkTdC3CPaADn2Lk/0SkdA==` |
| iii SDK | `iii-sdk@0.11.2`; package-lock integrity `sha512-S8/o53j1z+IOU6Mp1f3GbivJ59hEgWhtT6hNutVpfwhJK5Q9zS2rV2LUX1Ko6+xF/Zr3Y6xodNRmBRng0qiZZA==` |
| iii engine | Release `iii/v0.11.2`; release commit `2b445957701f94dc5f56f900af314e9d59f3b0f7`; platform archive and extracted-binary digests governed as section 5 requires |
| R-13 runner | `scripts/r13/run.mjs` SHA-256 `a1580ac5b3ea111d66937b8df2809ec88b46a14a5bfa3fea1bc564c6314ca6b5` |
| R-13 validator | `scripts/r13/validate-receipts.mjs` SHA-256 `2a5d03d848ff41ce006cb4bc637c3fc38710c226fb5ac668a8f4ea843b70e281` |
| Receipt schema | `schemas/r13-receipt.schema.json` SHA-256 `a191554733cefa5630cf98be4357d65cdefaa82e252a15316ae5b775d298e664` |

The selected Node `24.16.0` identity satisfies the currently observed package
floor `^22.18.0 || >=24.11.0` for
`@babel/helper-string-parser@8.0.0`, `ast-kit@3.0.0`, and related Babel 8
packages. This is metadata compatibility only, not install/build/runtime
qualification.

The current unsigned dependency report inventories 333 lockfile package
records. The earlier report established historical Node 22/24 range metadata,
but it does not bind this exact local profile or the 147 records without Node
declarations, including 33 production non-optional records. The advisory
Dependency Owner must disposition those records and bind exact-profile
install, native-asset, build, and runtime evidence before B2 eligibility.

## 5. iii-engine provenance acceptance

`ci/iii-engine-sha256.json` currently names release `0.11.2` and the following
archive SHA-256 values:

| Platform asset | Required archive SHA-256 |
|---|---|
| `iii-aarch64-apple-darwin.tar.gz` | `e7834c44fefb2b5343d327102a941419245f7fff447f95373857a04b033fb1bd` |
| `iii-x86_64-unknown-linux-gnu.tar.gz` | `9c83c47788b4ef4beeb65dd9bf37e94f993770cd3db874464c3ce1cdc92352cd` |

Archive checksum matching is necessary but insufficient. Before any profile
receipt may contain `iii_sha_verified: true`, the Configuration Manager must:

1. Independently acquire the upstream `iii/v0.11.2` release and bind it to
   release commit
   `2b445957701f94dc5f56f900af314e9d59f3b0f7`.
2. Verify upstream publisher/release identity. If upstream supplies no
   qualifying signature or transparency evidence, record that gap and
   countersign the accepted archive and extracted-binary digests under a
   Configuration Manager-controlled authority.
3. Record for each admitted platform the repository, tag, full commit, release
   URL, asset name, asset size, archive SHA-256, extracted binary SHA-256,
   acquisition time, acquiring operator, verification method, and policy
   version.
4. Sign the immutable iii anchor and distribute its public verification
   material independently of the runner and downloaded asset.
5. Require `scripts/r13/install-iii.mjs` to match both the archive digest and
   the CM-accepted extracted-binary digest. A provenance sidecar generated by
   the same installer is not independent provenance.
6. Bind the iii anchor ID, anchor digest, platform asset digest, and extracted
   binary digest into every raw receipt, cohort attestation, and independent
   verification report.

The historical provisional receipt's binary SHA-256
`341d45266f39ed78e30d4b3d74730662fe97e7706e1a23a5c877646462215ca8`
has `iii_sha_verified: false`. It is historical/provisional and must not be
promoted into the accepted anchor without independent reacquisition and
Configuration Manager verification.

## 6. Governed 148-file denominator reconciliation

The current non-mutating reconciliation on 2026-07-26 produced:

| Check | Current result |
|---|---|
| Filesystem `test/**/*.test.ts` count | 148 |
| Git-indexed `test/**/*.test.ts` count | 148 |
| Filesystem-only test files | 0 |
| Git-indexed test files missing from filesystem | 0 |
| Filename manifest SHA-256 | `5f3f5736310cc634872622669452535fea6c6ce93b5abcfd88b5af981ec69550` |
| Ordered path-and-content SHA-256 | `fe839458881bea1f8d937b1ee8cec1039e08d7431d794440278301730f435d33` |
| Match to `ci/r13-test-manifest.json` | Yes |

The historical/provisional Vitest JSON reports 148 observed files, 479 passing
suites, and 1,629 passing tests, with zero failed or pending suites/tests. It
is evidence of one provisional mechanics run only. No accepted
assertion-identity manifest currently proves that 1,629 is the complete or
stable assertion denominator.

Every qualifying run must independently recompute and bind:

- exactly 148 expected and 148 observed test files;
- the exact filename and content hashes above;
- the exact accepted assertion IDs, count, and statuses from a separately
  frozen assertion manifest;
- zero failed, pending, todo, disabled, or skipped files/assertions;
- exact mandatory bearer and project-capability authentication assertion IDs
  from a separately frozen authentication manifest;
- no untracked test file and no tracked test file missing from the immutable
  source bundle.

The mandatory local cohort is five consecutive runs. Therefore the accepted
file manifest must account for exactly `5 x 148 = 740` governed
file-executions. A 148-file result from only one run, or a 740 total assembled
by replacing a failed attempt, is non-qualifying.

Until those manifests are accepted, `1,629` and the current three
substring-matched authentication checks remain provisional observations and
cannot be mandatory pass criteria.

Any changed test byte, path, assertion denominator, mandatory-auth
denominator, runner, validator, or schema requires a superseding source lock,
manifest, case-card version, profile packet, and evidence freeze before
qualification.

Historical denominators of 138, 140, or 147 remain historical. They must not
be rewritten or treated as review of the 148-file candidate.

## 7. Deterministic commands and execution isolation

All commands run from a fresh, isolated, detached checkout reconstructed from
the B2-admitted qualification commit and independently checked against the
B2-admitted Git tree, source archive, and source-lock identities. The historical
design commit in section 1 must never be hard-coded as the qualification
subject. The ambient shared worktree is not an evidence root. Network access is
disabled after exact Node/npm dependencies and the CM-anchored iii asset have
been acquired into a controlled cache.

The profile executor must perform this fixed sequence:

```sh
: "${QUALIFICATION_COMMIT:?set to B2-admitted commit SHA}"
: "${QUALIFICATION_TREE:?set to B2-admitted Git tree OID}"
git init qualification-source
git -C qualification-source remote add origin https://github.com/ChronodeAi/agentmemory.git
git -C qualification-source fetch --depth=1 origin "$QUALIFICATION_COMMIT"
git -C qualification-source checkout --detach "$QUALIFICATION_COMMIT"
test "$(git -C qualification-source rev-parse HEAD)" = "$QUALIFICATION_COMMIT"
test "$(git -C qualification-source rev-parse HEAD^{tree})" = "$QUALIFICATION_TREE"
git -C qualification-source status --porcelain=v1
```

The executor must verify the expected commit, tree, empty status, source
archive digest, source-lock digest, package-lock digest, profile ID, OS build
or runner image, Node binary digest, Node version, npm version, and iii anchor
before continuing.

Receipts must record `git_tree_oid`, `source_archive_sha256`,
`source_lock_sha256`, and, when relevant, `worktree_state_sha256` as separate
identities. The current custom HEAD/diff/untracked hash must not be labelled a
Git tree or substitute for immutable-bundle verification.

Within `qualification-source`, with the exact accepted Node/npm active:

```sh
npm ci --legacy-peer-deps --no-audit --no-fund
npm run test:r13:install-engine
npm run build
npm run skills:check
npm run test:r13:harness
npm run evidence:interfaces:test
npm run evidence:interfaces -- --check
node scripts/r13/run.mjs --repeat=5
node scripts/r13/validate-receipts.mjs --require-pass "$R13_RECEIPT_DIR"
```

Execution environment requirements:

- `AGENTMEMORY_SECRET` and
  `AGENTMEMORY_PROJECT_CAPABILITY_SECRET` are unique synthetic values injected
  by the executor and never emitted.
- `R13_RECEIPT_DIR` is a new empty path for one profile cohort.
- `R13_III_BINARY`, `R13_III_SHA256`, and the CM iii-anchor input identify the
  accepted local cached binary; no unverified-iii override is set.
- `R13_ALLOW_UNQUALIFIED_NODE`, `R13_ALLOW_UNVERIFIED_III`,
  `R13_ALLOW_DIRTY_TREE`, and every qualification waiver are absent.
- `R13_KEEP_HOME` is absent; each run receives a new disposable home.
- The child environment is constructed only from an accepted explicit
  allowlist. It is not copied from ambient process state.
- A name-only preflight compares child variable names to the accepted policy
  and proves every forbidden name absent without reading or recording values.
- No external embedding/provider/config credential, generic token/password,
  database URL, package-manager credential, or undeclared variable survives.
- Ports are isolated and recorded; no port is shared with the normal upstream
  Agentmemory service.
- Exactly one Vitest worker is observed, not merely “at most one.”
- The process tree is sampled at 250 ms or faster; telemetry failure fails the
  run.
- Both `PP-01 zero-egress` and `PP-02 provider-enabled` execute against
  synthetic recording sinks. A real provider call requires separate explicit
  authorization and is not part of this cohort.

The current runner cannot produce qualifying evidence from this sequence
without implementation changes. It copies the ambient environment and removes
only a narrow provider credential-name pattern, so no allowlist currently
exists. It also has no exact `profile_id`, OS image/build,
Node binary digest, Git/toolchain inventory, operator/signer identity, source
bundle subject, fixture manifest, cohort identity, or independent signature in
its receipt schema. Its validator depends on the ambient checkout. After
Stage-A acceptance, B1 may close only the corresponding disposable PoC
wrapper, policy, fixture, and verifier-mechanics gaps under
`.aiwg/working/pocs/**`. Those mechanics and their non-qualifying negative
contract checks must be frozen and reviewed before B2 execution admission.
Product runner, schema, release-validator, package, LaunchAgent, or governed
test changes remain Construction work; CI remains deferred for this local
target.

## 8. Repeatability and resource thresholds

The mandatory local profile produces one five-run cohort on the same accepted
host and boot, using the same immutable source, toolchain, iii anchor, runner,
validator, fixture policy, and receipt policy.

| Metric | Mandatory threshold |
|---|---|
| Functional repeatability | 5/5 consecutive runs pass; no retry, rerun substitution, deletion, or cherry-picking |
| Mandatory profile repeatability | 1/1 local profile passes; 5/5 raw runs pass |
| Test denominator | Every run is exactly 148/148 accepted files; the cohort is exactly 740 governed file-executions and matches complete accepted assertion and authentication identity/count/status manifests; 1,629 remains provisional until that freeze |
| Worker concurrency | Every run observes exactly 1 peak concurrent Vitest worker |
| Wall time | Every run completes in at most 1,800,000 ms |
| Peak process-tree RSS | Every run stays at or below `min(4 GiB, 50% of recorded host RAM)` |
| Duration dispersion | Within a profile, population coefficient of variation is at most 20% and `max / min` is at most 1.50 |
| RSS dispersion | Within a profile, population coefficient of variation is at most 15% and `max / min` is at most 1.25 |
| Source/tool dispersion | Zero: all source, test, lockfile, runner, validator, schema, profile, Node binary, and iii digests are identical within the cohort |
| Test-result dispersion | Zero: no changed file/assertion/auth denominator and no failed, skipped, pending, todo, or disabled item |
| Receipt completeness | 5/5 raw receipts, one cohort statement, one independent verification report, and required signatures/custody receipts |

### Local lifecycle denominator

Suite `T-LOCAL-DEPLOY` executes `LQ-001..014` in three independent clean
homes, for exactly `3 x 14 = 42` journey executions. Every repetition uses
isolated release, state, provider-home, secret, label, port, log, backup, and
rollback roots. A journey has a frozen assertion manifest, pre-state,
stimulus, expected durable state, forbidden effects, teardown, and receipt.
No missing, skipped, disabled, silently retried, or substituted journey is
permitted, and unrelated provider configuration must remain byte-identical.

The journey set binds:

- immutable install and transactional/idempotent setup (`LQ-001..002`);
- exact LaunchAgent identity, singleton restart, engine/worker ordering, and
  reconciliation (`LQ-003..004`);
- loopback, browser viewer/health truthfulness, complete protected-surface
  authentication, project identity, provider ownership, and scope isolation
  (`LQ-005..010`);
- `PP-01` and `PP-02` synthetic recording-sink policy evidence
  (`LQ-011..012`); and
- backup, migration, exact restore, upgrade, official-upstream rollback
  subject, rollback recovery, uninstall, support output, and health
  truthfulness (`LQ-013..014`).

The 42-journey cohort requires its own signed statement, complete
failed-attempt index, independent verification report, custody receipt, and
independent read-back. It does not substitute for the 740 file-executions, and
the 740 file-executions do not substitute for it.

### Railway split

- Local R-02 recording sinks are mandatory and governed by
  `.aiwg/risks/poc-cards/R-02-local-macos-secret-flow-overlay.md`.
- Historical Railway exposure is a separate external issue that remains
  `UNVERIFIED / NOT EVALUATED` without a named, separately authorized,
  metadata-only owner attestation.
- Prospective Railway deployment is deferred and excluded from this profile,
  qualification, ABM, canary, and release denominator.

No local PASS may be interpreted as historical Railway containment or
prospective Railway readiness.

A resource value within the absolute ceiling but outside the dispersion
threshold is a repeatability failure, not an automatic waiver. The Test
Infrastructure Owner may investigate and propose a new profile or threshold;
the executor may not discard the outlier.

## 9. Receipt, signature, replay, and custody contract

### Raw run receipt

Each raw run must bind at least:

- receipt schema and policy versions;
- run ID, cohort ID, profile ID, operator identity, executor identity, and
  invocation identity;
- source repository, commit, Git tree, source archive, source lock, dirty
  state, runner, validator, schema, fixture, package-lock, and test manifests;
- OS product/version/build/kernel/image, architecture, controlled host asset or
  runner identity, CPU count, total RAM, and boot identity;
- Node version and binary SHA-256, npm version, Git version, Vitest/Vite/
  TypeScript/tsx/tsdown versions and package-lock integrity;
- iii release/tag/full commit, anchor ID, archive digest, extracted-binary
  digest, and provenance-verification result;
- exact argv, sanitized environment-policy ID, ports, timestamps, duration,
  exit/signal, peak process-tree RSS, worker observations, and telemetry
  cadence;
- expected and observed file/assertion/auth denominators, missing/extra/
  skipped/failed/pending items, result, failures, and a complete waiver list;
- SHA-256 subjects for every raw log, telemetry stream, Vitest JSON, test list,
  worker observation, and receipt.

A qualifying raw result is exactly `pass` with an empty waiver list. A same-run
`receipt.sha256` is integrity metadata only.

### Cohort statement and signature

After five consecutive raw receipts, a separate aggregator creates one in-toto
Statement v1 with a versioned R-13 predicate and the five raw receipt digests
as subjects/byproducts. It records the repeatability calculations in section
8. It must not rewrite raw receipts.

For CI, the DSSE/Sigstore verification policy must pin:

- issuer `https://token.actions.githubusercontent.com`;
- repository `ChronodeAi/agentmemory`;
- the exact accepted workflow path and immutable workflow revision;
- accepted event/ref/environment constraints;
- the expected builder identity and profile ID;
- transparency-log inclusion and integrated time.

For developer evidence, a hardware-backed or otherwise separately governed
Configuration Manager signing key must sign the DSSE envelope. An ephemeral
key created by the test runner is prohibited.

The Configuration Manager owns trust distribution, key scope, rotation,
revocation, expiry, and emergency invalidation. The executor, aggregator,
signer, and independent verifier identities must be externally attributable.
The same human or automation identity may not both execute and independently
verify/accept its cohort.

### Replay and freshness

- Every invocation and cohort ID is globally unique.
- A signed ledger records consumed cohort IDs and rejects duplicates.
- Receipts older than 14 days at MTP review are stale unless the Test Architect
  explicitly requests a fresh rerun; staleness is not waivable by the
  executor.
- Revoked/expired signer, profile, workflow, iii anchor, or policy identity
  fails verification.
- Trusted signing/transparency time, not an executor-controlled timestamp
  alone, establishes freshness.

### Custody and retention

The Configuration Manager deposits the immutable source bundle, source lock,
raw receipts/byproducts, cohort statement, signature bundle, verification
policy, trust material, independent verification report, and human decision in
write-once or object-lock storage. A custody receipt must record object URI,
digest, uploader, upload time, storage account, retention mode, retention-until
date, and independent read-back verification.

Minimum retention is 365 days from MTP decision or 180 days after the final
release disposition that cites the evidence, whichever is later. The current
30-day GitHub artifact retention in `.github/workflows/ci.yml` is insufficient
as sole custody.

## 10. Pass/fail rules

### Raw run PASS

All of the following are true:

1. Exact accepted profile and complete toolchain identities match.
2. Source, test, fixture, runner, validator, schema, package-lock, and iii
   identities match accepted anchors.
3. Exactly 148 accepted files and every accepted assertion/authentication ID
   execute and pass.
4. No missing, extra, failed, skipped, pending, todo, or disabled item exists.
5. All mandatory authentication rejection assertions execute and pass.
6. Test exit is zero, signal is null, exactly one worker is observed, and time
   and RSS limits pass.
7. The receipt is complete, has no waiver, and all byproduct hashes verify.

Any other raw result is FAIL for qualification. `provisional-pass` is not
PASS.

### Profile cohort PASS

All five consecutive raw runs PASS; repeatability thresholds pass; the cohort
statement and signature validate; independent verification from the immutable
bundle passes; replay/freshness/custody checks pass.

Any one raw failure, missing receipt, retry substitution, dispersion breach,
signature/custody failure, or verifier dependence on ambient state fails the
profile cohort.

### Mandatory local qualification PASS

The one exact local profile cohort passes all five raw runs and all 740
governed file-executions. The separate `T-LOCAL-DEPLOY` cohort passes all 42
journey executions across three independent clean homes. Both processing
policies pass against synthetic recording sinks. Independent verification,
signatures, custody, and read-back pass for both cohorts.

Deferred Node 22, Ubuntu, GitHub CI, Railway, Windows, container, and multi-host
rows are not part of this PASS and are not deleted or marked `N/A`.

### Stage-A specification acceptance eligibility

The human Test Architect may accept the MTP/profile/R-13 specification, subject
to the required Configuration Manager, Security Architect, and Release Owner
concurrences, when:

- the MTP normatively references R-13 v3 decision stages, exact profile
  candidates, denominator rules, receipt/repeatability semantics, test
  protocols, and pass/fail rules;
- every specification-level finding in section 12 is either corrected or
  explicitly returned for revision;
- proposed profile, source, environment, assertion/authentication, signer,
  replay, custody, benchmark, load, and defect contracts are decision-ready;
- required human roles and later separation-of-duty assignments are identified
  as open rather than silently filled by agents; and
- the canonical traceability matrix's normalized child-to-`TR-UCM` and
  `TR-UCM`-to-test-contract join supplies every atomic requirement with a suite
  or PoC ID, accountable role, environment, oracle, evidence locator, and
  explicit open acceptance authority; and
- the current implementation conformance matrix clearly distinguishes what
  exists from what B1 mechanics and B2 admission would require.

Stage-A acceptance permits no implementation. A separate B1 record may
authorize bounded disposable harness/policy/fixture mechanics only. It does not
admit an R-13 execution.

### Stage-D evidence acceptance eligibility

After separate B2 admission and Stage-C execution, the Test Architect may
accept or reject the resulting evidence only when:

- the Configuration Manager has accepted source, Node, iii, signer, replay,
  custody, and retention anchors;
- the Local Test Infrastructure Owner has implemented the exact accepted local
  profile, environment policy, and lifecycle-journey denominator;
- an independently operated verifier demonstrates every positive and negative
  policy case;
- the fresh five-run/740-file-execution cohort, the three-clean-home/
  42-journey cohort, and their custody receipts are available; and
- every implementation/evidence blocker in section 12 has immutable closure
  evidence.

Neither Stage-A nor Stage-D acceptance is ABM passage, risk retirement,
Construction authorization, canary admission, or rollout authorization.

## 11. Evidence packages for human Test Architect review

### Stage-A specification package

1. R-13 v3 and this packet with the A/B1/B2/C/D/E decision sequence.
2. Draft MTP with traceability, benchmark, load/soak, defect, and canary
   protocols.
3. R-13 implementation conformance matrix.
4. Primary-source profile observation JSON/summary and exact open trust items.
5. Dependency-engine JSON/summary, including the 147 undeclared records.
6. Canonical unsigned local input manifest with its exact revision and SHA-256,
   a matching passed post-generation receipt, zero
   file/hash/path/stage/semantic-consistency findings, and an explicit
   statement that it is change detection rather than a signature.
7. Stage-A adversarial review with every documentary finding disposition.
8. Human role/owner assignment register and the exact Stage-A decision record.

### Later Stage-D evidence package

1. B1 preparation record naming exact disposable write roots, actors, limits,
   stop conditions, cleanup contract, and non-qualifying check boundary.
2. B2 admission record naming exact
   card/source/disposable-bundle/profile/fixture/policy digests, actors, limits,
   and stop conditions.
3. The accepted local profile registry entry, including expiry and exact Node
   binary/package digests; deferred portability rows remain recorded.
4. Dependency Owner disposition plus exact-profile install/build/runtime
   support evidence.
5. CM-signed iii-engine and signer/trust/custody anchors.
6. Frozen disposable runner, validator, receipt/cohort schema wrappers, and
   negative checks; any product equivalents require Construction authority.
7. Clean immutable source bundle and independent source-lock verification.
8. Five raw run receipts/byproduct sets covering exactly 740 governed
   file-executions, one signed R-13 cohort statement, and one independent
   verification report.
9. Replay, revoked-key, expired-profile, wrong-workflow, wrong-iii, wrong-
   source, environment-policy, denominator-drift, skipped-test,
   zero/multiple-worker, resource-breach, stale-receipt, retry-substitution,
   custody, and ambient-worktree-dependence rejection evidence.
10. Three clean-home `T-LOCAL-DEPLOY` sets covering all `LQ-001..014`
    journeys, exactly 42 journey receipts, one signed lifecycle statement, and
    one independent verification report.
11. Custody receipts and independent read-back for both cohorts.
12. Local execution IDs mapped to profile/cohort/home/journey IDs without
    exposing secrets or sensitive hostnames.
13. Written dispositions from the Configuration Manager, Local Test
    Infrastructure Owner, Dependency Owner, Security Architect, Service Owner,
    Release Owner, and Independent Verifier Owner. CI Owner remains
    `DEFERRED-LOCAL-TARGET`.

## 12. Current findings and blockers

| ID | Finding | Effect on acceptance | Required closure owner |
|---|---|---|---|
| `DPA-001` | The current filesystem, Git index, and frozen test manifest reconcile to 148 files with matching filename/content hashes. | Positive current denominator finding only; not profile qualification. | Test Infrastructure Owner to retain in superseding freeze |
| `DPA-002` | Revision 4 contained 104 unique entries with zero missing or drift at generation time. Revision 5 contained 112 zero-drift entries but failed one documentary consistency check. Revision 6 contained 115 entries and passed local advisory checks. Revision 7 contained 119 matching entries but failed scoped-decision review. Revision 8 contained 122 matching entries but failed current-authority binding review. | A current candidate must be the canonical manifest whose exact revision and SHA are recorded in the decision, with a matching passed post-generation receipt and zero integrity, path, stage, or semantic-consistency findings. A passing unsigned manifest remains change detection, not an independent signature. | Configuration Manager and Requirements Owner |
| `DPA-003` | `.github/workflows/ci.yml` floats OS labels and Node majors. | GitHub CI is `DEFERRED-LOCAL-TARGET`; this blocks later CI portability, not the local-profile specification. The row is retained and not passed or marked `N/A`. | CI Owner |
| `DPA-004` | `isAcceptedNode()` accepts broad Node 22 and Node 20 ranges and receipts contain no exact local profile ID. | The mandatory `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` tuple cannot qualify. | Local Test Infrastructure Owner |
| `DPA-005` | The unsigned lockfile report covers 333 records; 147 have no Node declaration, including 33 production non-optional records, and the report does not bind the selected exact local profile. | Stage-A metadata input exists, but exact-profile dependency, install, native-asset, build, and runtime support remain B2 blockers. | Dependency Owner, Software Architect, Test Architect |
| `DPA-006` | Current iii verification trusts a repo JSON checksum plus a provenance sidecar produced by the installer; no CM anchor or independent publisher verification is bound. | `iii_sha_verified` is not sufficient for qualification. | Configuration Manager |
| `DPA-007` | Receipt schema lacks operator, signer, profile/build, Node binary, full toolchain, source bundle, fixture, cohort, signature, replay, custody, clean-home, journey, LaunchAgent, viewer/auth, backup, and rollback fields. | Current receipts cannot meet the local MTP/R-13/lifecycle evidence contract. | Local Test Infrastructure Owner and Configuration Manager |
| `DPA-008` | `receipt.sha256` is generated beside the receipt by the same runner. | Integrity metadata only; no independent authentication. | Configuration Manager |
| `DPA-009` | Current validator compares against the ambient checkout and validates receipts individually; it does not validate an immutable source bundle, a five-run cohort, signature identity, replay/freshness, or custody. | Current validator cannot independently qualify evidence. | Independent Verifier Owner |
| `DPA-010` | Runner/validator enforce worker count `<= 1`, not exactly `1`; receipt omits assertion counts and repeatability dispersion. | False qualification remains possible for zero observed workers or incomplete cohort semantics. | Test Infrastructure Owner |
| `DPA-011` | The only frozen product run is one historical/provisional Node `v26.0.0` run with `unqualified-node-profile` and `unverified-iii-provenance` waivers. | It cannot qualify the mandatory local profile or accept the MTP. | Local Test Infrastructure Owner |
| `DPA-012` | No accepted independent local custody deposit/read-back contract exists; GitHub upload retention is only a deferred portability observation. | Local evidence retention/custody is insufficient. | Configuration Manager |
| `DPA-013` | The pre-admission portable verifier uses a synthetic, generator-created Ed25519 authority and does not independently execute the admitted assertion denominator. | Useful negative-test mechanics only; not independent trust or execution evidence. | Independent Verifier Owner |
| `DPA-014` | Provider-observed model identity and route telemetry are absent for prior workers and this review session. | Configured premium-wrapper labels remain advisory. This is not an R-13/MTP blocker unless a human policy explicitly makes exact model identity normative. | Provider/Orchestration Owner |
| `DPA-015` | Node 22, Ubuntu, and GitHub CI profiles from the predecessor packet are outside the selected local release denominator. | They remain `DEFERRED-PORTABILITY` or `DEFERRED-LOCAL-TARGET`, not passed, deleted, or `N/A`; each needs a later exact profile and admission. | Product/Release Owner, CI Owner, Test Architect |
| `DPA-016` | The runner requires bearer and project-capability synthetic inputs, but their complete local assertion/authentication manifests and fixture identities are not frozen. | Local preflight and protected-surface qualification remain blocked. B1 may prepare only governed disposable synthetic fixtures; B2 requires frozen identities. | Security Architect, Local Test Infrastructure Owner |
| `DPA-017` | `sanitizedEnvironment()` copies ambient process variables and deletes only a narrow provider credential-name pattern. | The claimed allowlist does not exist; generic tokens, passwords, database URLs, and package-manager credentials may reach children. B1 requires an explicit disposable allowlist and name-only preflight; B2 requires their frozen policy identity. | Security Architect, Test Infrastructure Owner |
| `DPA-018` | The runner labels a HEAD/diff/untracked worktree hash as `source_tree_sha256`; the validator compares it to the ambient checkout. | Git tree, immutable archive, source lock, and optional worktree state are conflated, so portable source authority is unproved. | Configuration Manager, Independent Verifier Owner |
| `DPA-019` | Version 2 required execution evidence before the specification could be accepted, and the first v3 draft still combined mechanics authorization with execution admission. R-13 v3 now separates Stage A specification acceptance, B1 disposable mechanics authorization, B2 execution admission, Stage C execution, Stage D evidence review, and Stage E risk/gate decisions. | The documentary circularity is corrected; human Stage-A acceptance remains pending and no later stage is authorized. | Test Architect, Configuration Manager |
| `DPA-020` | The historical 1,629 passing-test observation has no accepted assertion-identity manifest; current auth checks are three substring matches and omit an exact project-capability assertion denominator. | 1,629 and the current auth list remain provisional. B2 requires complete accepted assertion and authentication identity/count/status manifests for all five runs and all 740 file-executions. | Local Test Infrastructure Owner, Test Architect |
| `DPA-021` | CI uses mutable action version tags, one run per cell, floating hosted labels, and 30-day artifact retention. | This is a retained deferred-CI portability blocker, not a substitute for local execution or custody. | CI Owner, Configuration Manager |
| `DPA-022` | `T-LOCAL-DEPLOY` defines `LQ-001..014`, but no admitted three-clean-home manifest or 42-journey evidence set exists. | Local lifecycle qualification cannot pass. | Operations Owner, Local Test Infrastructure Owner |
| `DPA-023` | LaunchAgent, private logs, minimized support output, fresh auth, browser viewer, backup/read-back, official-upstream rollback subject, and exact uninstall evidence mappings exist only as candidates. | Operations evidence is decision-ready in shape but unimplemented, unexecuted, and unverified. | Operations Owner, Security Architect, Release Owner |
| `DPA-024` | `PP-01` and `PP-02` require complete synthetic recording sinks; no real provider call is authorized. | Both policy mechanics remain B2 evidence blockers; a real call cannot fill the synthetic denominator without separate authorization. | Security Architect, Privacy Owner, Provider Integration Owner |
| `DPA-025` | A user-supplied 2026-07-28 live browser observation reported a healthy/connected render after repeated identical health-503 console warnings, with global-looking aggregates and no visible project/global scope label or selector; no interactive auth step was observed. No memory content is reproduced here. | Non-qualifying candidate evidence only. Browser qualification must bind scope, aggregate denominator, auth state/authority, backend/viewer identities, and the degraded/recovering/healthy transition without false healthy or unexplained `Unknown`. | UI/API Owner, Security Architect, Test Architect |
| `DPA-026` | A user-supplied 2026-07-28 live MCP observation reported successful named-project health with project scope coverage and zero project-unscoped records, a materially separate global-unscoped denominator, and same-project slot listing failure with HTTP 500. No session content is reproduced here. | Non-qualifying candidate evidence only. Qualification must reconcile scope and denominator labels across project health, slots, viewer, sessions, and counters, and render split failures truthfully. | UI/API Owner, Service Owner, Test Architect |
| `DPA-027` | A user-supplied 2026-07-28 live diagnostic reported an overall successful result with one warning and no failed diagnostic checks: both sampled latest durable memories lacked project scope, migration was suggested but not run, and top-level health/Doctor remained healthy while project slot list/get still returned HTTP 500. Only aggregate diagnostic facts are retained here. | Non-qualifying candidate evidence only. Qualification must reconcile diagnostic sample/total denominators, surface durable-scope and slot failures as truthful degradation, preserve migration as a separately authorized operation, and prove recovery transitions without auto-heal. | Service Owner, UI/API Owner, State Migration and Recovery Owner, Test Architect |

## 13. Open human assignments

DEC-17 accepts the role matrix represented here. It does not assign named
people or record the concurrences required to accept Stage A.

| Human role | Required decision or artifact | Assignment status |
|---|---|---|
| Human Test Architect | Stage-A accept/reject MTP/profile/card/threshold specification; later Stage-D evidence disposition | **Unassigned / open** |
| Configuration Manager | Superseding signed input manifest; source, iii, signer, replay, custody, retention, and trust anchors | **Unassigned / open** |
| Security Architect | Required Stage-A concurrence; signature, issuer, key, revocation, auth, egress, secret-redaction, and retention policy review | **Unassigned / open** |
| Release Owner | Required Stage-A concurrence; package, rollback-subject, admission-boundary, and later release review | **Unassigned / open** |
| Local Test Infrastructure Owner | Advisory Stage-A input; after separate authorization, local runner/schema/validator/cohort and 740-file/42-journey mechanics | **Unassigned / open** |
| Dependency Owner | Advisory exact Node/iii/package support disposition | **Unassigned / open** |
| Independent Verifier Owner | B2 readiness/separation acknowledgement and Stage-D retained-environment immutable-bundle verification with negative corpus | **Unassigned / open** |
| CI Owner | Deferred Node 22/Ubuntu/GitHub workflow portability | **DEFERRED-LOCAL-TARGET** |
| Service Owner | Isolated iii-engine/service/auth/port behavior and failure-mode review | **Unassigned / open** |
| Operations Owner | LaunchAgent, logs, support, backup, restore, upgrade, rollback, uninstall, and handoff evidence | **Unassigned / open** |
| PoC Preparation Owner | B1 disposable mechanics scope, write roots, timebox, stops, and cleanup | **Unassigned / open** |
| PoC Admission Owner | B2 immutable input admission and executor/verifier separation | **Unassigned / open** |

## 14. Human Test Architect decision records

### Recorded upstream dispositions

| Decision | Recorded effect |
|---|---|
| `DEC-12` | Exact profile `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` and denominators `740` file-executions and `42` lifecycle journeys accepted for Stage-A specification only |
| `DEC-17` | Stage-A authority matrix accepted: Human Test Architect is the accountable role; Configuration Manager, Security Architect, and Release Owner are required concurrence roles; Local Test Infrastructure and Dependency Owners are advisory; CI Owner is deferred for the local target; all named identities and concurrence records remain open |
| `DEC-18` | Risk denominator `23`, threshold `17`; only mitigated/retired count; accepted-but-open does not count; any unresolved mandatory veto prevents ABM PASS |

These dispositions do not fill or decide Decision A below.

### Decision A - Stage-A specification

Decision: **PENDING HUMAN SPECIFICATION REVIEW**

- [ ] `ACCEPT SPECIFICATION` for the MTP/profile/card/threshold and
  evidence-policy specification only.
- [ ] `REJECT SPECIFICATION` and return the exact contract changes below.

Decision-maker name:

Role/authority:

Decision time (UTC):

Configuration Manager concurrence:

Security Architect concurrence:

Release Owner concurrence:

Reviewed canonical local manifest revision and SHA-256:

Matching post-generation verification receipt SHA-256 and status:

Reviewed profile registry version and SHA-256:

Reviewed R-13 card version and SHA-256:

Reviewed MTP version and SHA-256:

Reviewed local operations candidate SHA-256:

Reviewed `T-LOCAL-DEPLOY` journey-manifest SHA-256:

Reviewed assertion/authentication manifest SHA-256 values:

Reviewed processing-policy and custody-policy SHA-256 values:

Reviewed conformance matrix and evidence-summary SHA-256 values:

Finding dispositions:

Rationale:

Signature or separately governed decision-record reference:

If `ACCEPT SPECIFICATION` and all required concurrences are recorded, the
decision is limited to the MTP, profile/card, threshold, and evidence-policy
specification. It does not authorize B1, admit R-13 execution, or accept
evidence.

### Decision B1 - Disposable mechanics preparation

Decision: **BLOCKED / NOT YET ELIGIBLE**

- [ ] `AUTHORIZE B1 PREPARATION` for one exact disposable scope under
  `.aiwg/working/pocs/**`.
- [ ] `REJECT B1 PREPARATION`.

PoC Preparation Owner:

Configuration Manager concurrence:

Security Architect concurrence:

Test Infrastructure Owner concurrence:

Exact write roots, actors, timebox, limits, stop conditions, and cleanup:

Prohibited product/CI/release-harness paths:

Decision-record ID/signature:

### Decision B2 - Execution admission

Decision: **BLOCKED / NOT YET ELIGIBLE**

- [ ] `ADMIT B2 EXECUTION` for one immutable card/source/disposable-
  bundle/profile/fixture/policy set.
- [ ] `REJECT B2 EXECUTION`.

PoC Admission Owner:

Test Architect concurrence:

Configuration Manager concurrence:

Security Architect concurrence:

Independent Verifier Owner readiness and separation check:

Admitted identities, actors, limits, stops, and cleanup:

Decision-record ID/signature:

### Decision D - Later execution evidence

Decision: **NOT YET ELIGIBLE**

This later record is opened only after separate B2 admission, Stage-C
execution, and an independently verified Stage-D package exist.

- [ ] `ACCEPT EVIDENCE` for later risk-owner consideration.
- [ ] `REJECT EVIDENCE`.

Decision-maker name:

Reviewed B1 preparation and B2 admission IDs:

Reviewed source/profile/policy/iii/signer identities:

Reviewed raw/cohort/verification/custody receipt IDs:

Finding dispositions and rationale:

Signature or separately governed decision-record reference:

Neither decision passes ABM, retires a risk, authorizes Construction, or
authorizes canary/rollout activity.

## 15. Review-session route telemetry

Visible session metadata identifies this review as Codex with configured AIWG
premium reasoning/coding wrappers. Wrapper/model declarations are
configuration facts, not provider-observed execution telemetry and not human
Test Architect authority.

No provider-observed exact model ID, deployment ID, route ID, or signed
raw-output digest is exposed to this reviewer. The actual exact execution model
and route therefore remain **UNRESOLVED**. This is advisory provenance, not a
Stage-A or R-13 qualification blocker unless a later human policy explicitly
makes exact model identity normative.
