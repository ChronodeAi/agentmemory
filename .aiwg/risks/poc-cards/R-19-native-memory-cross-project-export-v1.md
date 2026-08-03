# R-19 Native-Memory Cross-Project Export Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-19`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-19-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  destination authority, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and real provider-home mutation: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can provider-native memory synchronization require an explicit user action,
bind that action to one verified canonical project and one destination, and
exclude every other project's content and side effect?

## One bounded hypothesis

A provider-native memory write occurs only after an explicit user action bound
to one verified canonical project, and every source, destination, diagnostic,
retry, backup, and rollback side effect contains no content or identity from
another project.

## Current-source finding and test gap

At the source candidate:

- `src/hooks/session-end.ts:67-77` can invoke the bridge automatically at
  session end when the feature flag is enabled;
- `src/hooks/pre-compact.ts:87-98` can invoke the same bridge during
  pre-compaction;
- `src/triggers/api.ts:2234-2255` invokes `mem::claude-bridge-sync` with an
  empty payload, so the request's project is not passed to the bridge;
- `src/functions/claude-bridge.ts:114-154` lists `KV.memories`, filters only
  `isLatest`, and writes the resulting set to one provider-native file; and
- `src/config.ts:287-310` derives one configured destination path.

`test/claude-bridge.test.ts:122-165` proves that a configured bridge can write
memory content and can reject missing configuration. It does not prove exact
project filtering, destination ownership, explicit per-write user authority,
cross-project isolation, or containment across retries, diagnostics, and
backups. Existing hook trigger tests likewise do not provide those guarantees.
The current tests therefore do not retire R-19.

## Required frozen prerequisites

1. Human-accepted explicit-action contract defining who may authorize a write,
   how long that authority lasts, and whether it is single-use.
2. Canonical identity fixtures for two projects and two worktrees, with
   Configuration Manager-approved expected equivalence classes.
3. Complete source-selection and destination-write denominator for every
   session-end, pre-compaction, API, bridge, provider-file, error, retry, and
   backup path.
4. Synthetic memory corpus, synthetic secrets, provider-file pre-images, and
   recording filesystem/provider sinks; no real memory or provider home.
5. Accepted R-13 execution profile, `G-ICM-01`, immutable source bundle,
   fixture-manifest digest, signer authority, and independent verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Native Memory Integration Owner | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Privacy reviewer | Privacy Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Product reviewer | Product Owner | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- `PROJECT-A-MEMORIES` and `PROJECT-B-MEMORIES`, each with unique content and
  canary values.
- `PROJECT-A-WORKTREE-1` and `PROJECT-A-WORKTREE-2`, with frozen identity
  expectations.
- `EXPLICIT-ACTION-A`, `ABSENT-ACTION`, `EXPIRED-ACTION`,
  `REPLAYED-ACTION`, and `WRONG-PROJECT-ACTION`.
- `SESSION-END`, `PRE-COMPACT`, and `DIRECT-API` invocation fixtures.
- `DESTINATION-A`, `DESTINATION-B`, `AMBIGUOUS-DESTINATION`, and
  `NON-OWNED-DESTINATION` pre-images.
- Recording sinks for filesystem writes, provider calls, stdout/stderr, logs,
  queues, indexes, ledgers, exports, snapshots, and backups.

## Fault matrix

- Fail immediately before and after source listing, project filtering,
  destination resolution, temporary write, replacement, backup, and success
  reporting.
- Inject timeout, permission denial, symlink substitution, destination-owner
  change, process termination, and retry after each boundary.
- Interleave project A and project B synchronization requests at every
  source-selection and destination-write barrier.
- Replay an expired or already-consumed explicit-action receipt.

## Governed sinks and side effects

The denominator must include memory reads, provider-file reads/writes/renames,
temporary files, backups, logs, errors, metrics, queues, indexes, exact-facts
ledgers, summaries, exports, snapshots, provider calls, audit records, action
consumption, and rollback artifacts. A missing sink blocks the card; it cannot
be treated as an empty sink.

## Pass criteria

1. No bridge invocation mutates a destination without a valid, unexpired,
   single-use explicit-action receipt for that exact canonical project and
   destination.
2. Project A writes contain zero project B identity, content, canary, source
   reference, summary, error fragment, or backup fragment, and vice versa.
3. Automatic session-end and pre-compaction paths either perform no write or
   present a human-accepted explicit action that satisfies criterion 1.
4. Concurrent, failed, and retried requests consume authority exactly once and
   preserve one attributable terminal result without crossing destinations.
5. Every governed sink is scanned against the frozen canary corpus, and the
   immutable receipt records a zero unexpected-occurrence result.
6. Rollback restores the exact destination pre-image and leaves no temporary,
   backup, queued, or provider-side fixture residue.

## Fail criteria

- Any provider-native write without matching explicit user authority.
- Any global or project-blind memory list used for a project-scoped write.
- Any cross-project canary or identity in any governed sink.
- Any ambiguous, symlink-substituted, or non-owned destination mutation.
- Any authority replay, duplicate write, fabricated success, unrecorded
  backup, or missing sink in the denominator.

## Stop and backtrack

Stop on the first unauthorized write, cross-project occurrence, real-path
escape, synthetic-secret occurrence outside the expected redaction oracle, or
unattributed side effect. Disable all fixture bridge triggers, revoke fixture
actions, block the recording provider, preserve redacted evidence, and return
to source/contract review. Do not continue to later fault cases after a
containment breach.

## Immutable receipt

The sealed receipt must bind the risk/card version, source SHA, source-bundle
SHA, explicit-action-contract SHA, fixture and sink manifests, expected
identity classes, provider-file pre-image/post-image hashes, fault schedule,
ordered invocation and action IDs, process/environment identity, all raw
recording-sink hashes, canary-scan results, executor, signer, and independent
verification disposition.

## Rollback and cleanup

Use only disposable homes and recording destinations. Restore each
provider-file pre-image, remove only manifested fixture temporary/backup
artifacts, revoke fixture actions, terminate fixture workers, and verify empty
provider-call and queue residue. Preserve the immutable receipt and manifested
raw evidence; do not delete anything named by that receipt.

## Admission blockers and execution prohibition

- Named humans for the owner, all four reviewers, executor, signer, and
  independent verifier.
- Human acceptance of the explicit-action, project-selection, destination
  ownership, rollback, and receipt contracts.
- Frozen complete fixtures, sink denominator, fault matrix, expected oracle,
  R-13 profile, `G-ICM-01`, and immutable source bundle.

Do not invoke or build a PoC for R-19 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-19; accept an ADR, architecture, or MTP; pass ABM; or authorize
Construction. It also cannot authorize deployment, distribution, rollout, or
production native-memory synchronization.
