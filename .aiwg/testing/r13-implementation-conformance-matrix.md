# R-13 Implementation Conformance Matrix

Status: **DECISION-PREPARATION EVIDENCE - NO IMPLEMENTATION AUTHORITY**
Date: 2026-07-28
Risk: R-13
Governing card:
`.aiwg/risks/poc-cards/R-13-portable-evidence-harness-v3.md`

Recorded human inputs: DEC-12 accepts the exact profile and 740/42
denominators for Stage-A specification only; DEC-17 accepts the Stage-A
authority matrix; DEC-18 confirms the 23/17 risk threshold. Stage A remains
pending and B1/B2 remain blocked.

## Decision boundary

This matrix compares the current candidate implementation with the R-13 v3
specification. Before Construction, B1 may authorize only disposable wrapper,
fixture, policy, and verifier mechanics under `.aiwg/working/pocs/**`; B2 may
then admit their bounded execution. Product, CI, schema, and release-harness
changes remain blocked until an independent ABM PASS and separate Construction
authorization. This matrix does not authorize either class of change, admit
execution, qualify evidence, change risk status, pass ABM, or authorize
Construction.

## Current-to-required mapping

| Contract | Current evidence | Current state | Required pre-execution evidence or later product delta | Gate |
|---|---|---|---|---|
| Mandatory local profile registry | DEC-12 accepts exact tuple `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` for Stage-A specification; `scripts/r13/lib.mjs:8-14` still accepts broad Node 20/22 ranges | Specification accepted; implementation contradicted and execution binding absent | Exact profile ID and equality checks for OS/build, arch, Node/npm/Git, binary/archive digests, host/boot/run identity, and expiry | Blocking |
| Deferred portability rows | `.github/workflows/ci.yml:55-63` uses floating OS labels and Node 20/22 | Node 22, Ubuntu, and GitHub CI retained but outside the local denominator | Later exact profile and immutable workflow/action/image identities; never substitute, delete, pass, or mark `N/A` | Deferred portability; CI Owner `DEFERRED-LOCAL-TARGET` |
| Required synthetic authentication | `scripts/r13/run.mjs:336-380` requires two inputs; CI lines 71-74 supplies only `AGENTMEMORY_SECRET` | Current CI necessarily fails preflight | Governed unique synthetic bearer and project-capability fixtures, with no value disclosure | Blocking |
| Child environment isolation | `scripts/r13/run.mjs:128-149` copies ambient environment and removes a narrow provider credential pattern | Contradicted; not an allowlist | Explicit minimal allowlist plus name-only forbidden-variable preflight and no raw-value inspection | Blocking |
| Source identity | `scripts/r13/run.mjs:85-126,288-303` hashes HEAD, diff, and untracked bytes as `source_tree_sha256` | Mislabelled and generator-local | Separate Git tree OID, immutable source-archive digest, source-lock digest, optional worktree-state digest, and extracted-bundle verification | Blocking |
| File denominator | `ci/r13-test-manifest.json`, `vitest.r13.config.ts:7-29`, and current reconciliation | 148 paths/content hashes implemented and reconciled for one candidate denominator | Five consecutive 148/148 runs; exactly 740 governed file-executions; reject missing, extra, changed, untracked, failed, skipped, todo, pending, disabled, or unclassified items | Candidate positive; cohort blocking |
| Assertion denominator | Historical Vitest result reports 1,629; receipt schema lines 85-103 omits assertion count/IDs | Absent; 1,629 is provisional | Accepted assertion identity/count/status manifest derived from admitted source and raw Vitest output | Blocking |
| Authentication denominator | `scripts/r13/run.mjs:519-529` uses three substring matches | Incomplete and weakly identified | Exact bearer and project-capability assertion IDs plus status manifest and source locations | Blocking |
| Worker contract | Vitest requests one worker; runner lines 542-544 and validator lines 353-357 reject only values greater than one | Contradicted; zero may pass | Exactly one observed worker, accepted telemetry source, lifecycle evidence, and telemetry-failure rejection | Blocking |
| Time/RSS ceiling | Runner enforces 30 minutes and lower of 4 GiB or 50% host RAM | Partially implemented | Container/host capacity identity, accepted sampling, every-attempt preservation, and cohort dispersion calculations | Open |
| Five-run local cohort | CLI supports repeat count but no qualifying local cohort statement exists | Absent | Ordered five-attempt controller, no retry substitution, signed statement covering 740 file-executions, dispersion/completeness validation, independent verification, and custody | Blocking |
| iii provenance | Repo checksum and installer sidecar can mark verification | Generator-local, no independent authority | Configuration Manager acquisition anchor, publisher/signature disposition, archive and extracted-binary digests, independent verification | Blocking |
| Receipt schema | `schemas/r13-receipt.schema.json` records a limited run/environment/process/test model | Incomplete | Profile, operator, signer, issuer, workflow, source bundle, toolchain, fixture, cohort, replay, revocation, custody, and policy fields | Blocking |
| Independent validation | `scripts/r13/validate-receipts.mjs:268-294` reconstructs authority from the ambient checkout | Contradicted | Verify extracted immutable bundle and trust material without generator checkout/key/state | Blocking |
| Signature and trust | Same-run `receipt.sha256` only | Integrity metadata, not authentication | Accepted DSSE/in-toto or equivalent signature, trust root, issuer policy, key lifecycle, revocation, and negative tests | Blocking |
| Replay and freshness | No nonce, ledger, freshness, or revocation policy | Absent | Policy-bound nonce/run/cohort IDs, freshness window, replay ledger, revocation and expiry enforcement | Blocking |
| Custody and retention | No accepted independent local custody deposit/read-back; GitHub artifact retention is a deferred portability observation | Insufficient | Accepted local retention, custody events, immutable handoff, independent read-back, and destruction/expiry policy | Blocking |
| CI action identity | `actions/checkout@v6`, `setup-node@v6`, `upload-artifact@v4` | Mutable tags | Commit-pinned actions or accepted equivalent for a later CI profile | Deferred portability |
| `T-LOCAL-DEPLOY` denominator | Local profile candidate specifies `LQ-001..014`; no admitted journey manifest or receipts | Absent | Three independent clean homes, 14/14 journeys each, exactly 42 journey executions, no skip/retry substitution, signed cohort, independent verification, and custody | Blocking |
| LaunchAgent and supervision | Local operations candidate defines exact label/plist/release roots, singleton, restart, engine-worker ordering, and reconciliation | Specification candidate only | Exact plist/label/hash, owned roots/ports, crash/restart transcript, capture-readiness oracle, and no unowned-process effects | Blocking |
| Logging and support | Local operations candidate defines private, bounded, content-minimized logs and review-before-transfer support output | Specification candidate only | Mode/rotation/retention evidence, synthetic-corpus zero-occurrence scan, project-scope manifest, no automatic upload, and cleanup receipt | Blocking |
| Authentication and authority | Current runner requires bearer/project capability; live observation showed no interactive browser auth step | Incomplete; UI authority state unproved | Complete CLI/REST/MCP/viewer-data assertion/authentication manifests, fresh synthetic credentials, typed denial effects, visible auth/scope state, and no fallback | Blocking |
| Viewer scope and recovery | User-supplied 2026-07-28 live browser observation: healthy render after repeated health-503 warnings, global-looking aggregates, no visible scope selector/label | Non-qualifying candidate evidence | Browser matrix for project/global scope, aggregate denominator, authority state, `DEGRADED`/`RECOVERING`/`HEALTHY`, console/backend history, exact builds, screenshots, rendered/accessibility captures, and no false healthy/ambiguous `Unknown` | Blocking |
| MCP scope and slot split failure | User-supplied 2026-07-28 live MCP observation: named-project health succeeded with project scope coverage and a distinct global-unscoped denominator; same-project slot list returned HTTP 500 | Non-qualifying candidate evidence | Cross-surface project/global denominator reconciliation and truthful project-health/slot/viewer/session/counter split-failure rendering | Blocking |
| Doctor/diagnostic truthfulness | User-supplied 2026-07-28 live diagnostic: overall success with one warning, both sampled latest durable records unscoped, migration suggested but not run, and top-level health healthy while project slot list/get returned HTTP 500 | Non-qualifying candidate evidence | Exact sample/total denominators, warning-to-health degradation rules, slot dependency inclusion, no automatic heal/migration, separately authorized migration receipt, and degraded/recovering/healthy transition evidence | Blocking |
| Backup, restore, and upgrade | Local operations candidate defines content inventory, independent read-back, generation fencing, atomic activation, and recovery | Specification candidate only | Protected/encrypted destination disposition, exact inventory, interruption matrix, reader fencing, restore equality, and failed-attempt receipts | Blocking |
| Rollback and uninstall | Local operations candidate requires an independently qualified official-upstream subject and exact owned-resource removal | Specification candidate only | Side-by-side isolation, candidate-to-upstream recovery, unauthorized reverse-switch denial, exact rollback transaction, retained audit truth/data report, and unrelated-config byte equality | Blocking |
| Processing policies | Local profile specifies `PP-01` zero-egress and `PP-02` provider-enabled | No complete synthetic sink cohort | Complete DNS/socket/HTTP/SDK/fallback/provider recording sinks; zero attempts for PP-01; exact allowed/denied attribution for PP-02; real calls separately authorized | Blocking |
| Retrieval benchmark | MTP states precision target only | Under-specified | Frozen stratified corpus, independent labels, agreement/adjudication, statistical report, zero leakage/stale-authority failures | Test-plan blocker |
| Load/soak protocol | MTP states thresholds but limited sampling/repetition rules | Under-specified | Frozen load profile, sample counts/cadence, repetitions, fault phases, recovery oracle, independent disposition | Test-plan blocker |
| Model route telemetry | Configured premium wrappers; no provider-signed route evidence | Advisory only | Record when available; not an R-13 or MTP blocker unless a human policy explicitly makes model identity normative | Advisory |

## Present conclusion

The current harness is useful as provisional mechanics and one-file-denominator
observation. DEC-12 resolves the exact profile and 740/42 specification
denominators only. The harness cannot produce a qualifying local receipt
because exact-profile implementation and execution binding, the 740
file-execution cohort, complete assertion/authentication manifests, the
42-journey lifecycle cohort, both synthetic processing-policy cohorts, local
operations evidence, portable source/trust identities, independent
verification, and custody remain absent or incomplete.

The next permitted decision is Stage A acceptance or rejection of the
specification. B1 disposable mechanics preparation, B2 execution admission,
product remediation, and R-13 execution remain blocked.
