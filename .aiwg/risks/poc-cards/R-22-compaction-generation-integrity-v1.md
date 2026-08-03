# R-22 Compaction Generation Integrity Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-22`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-22-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  integrity authority, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and live-state access: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can compaction publish one integrity-bound generation atomically so that
readers and recovery observe either the complete pre-image or complete target
image, while every exact-facts ledger alteration is detectable?

## One bounded hypothesis

Compaction exposes only a complete pre-generation or a complete
integrity-bound target generation across write, delete, index, crash, restart,
and concurrent-read boundaries, and any exact-facts ledger mutation,
substitution, omission, or replay is detected before the generation can be
used.

## Current-source finding and test gap

At the source candidate:

- `src/functions/observe.ts:192-283` writes exact-facts ledger entries, deletes
  compacted observations, and removes index entries through sequential side
  effects rather than one visible generation switch;
- `src/types.ts:57-66` defines exact-facts records without a project,
  generation, source-manifest digest, chain digest, or signature; and
- `src/state/schema.ts:5-74` provides the session-scoped storage namespaces but
  no atomic generation pointer or integrity journal for this flow.

`test/auto-compress.test.ts:211-264` proves only that observations remain and
the fact ledger stays empty when summary creation fails before compaction
begins. It does not inject failures after ledger writes, observation deletes,
index deletes, or target publication; run concurrent readers; restart through
partial state; or tamper with the ledger. Current tests therefore do not
retire R-22.

## Required frozen prerequisites

1. Human-accepted compaction generation, activation, reader-visibility,
   journal, rollback, and deterministic recovery contracts.
2. Human-accepted exact-facts integrity contract binding project, session,
   source observations, generation, ordering, content, and integrity root.
3. Complete persisted-state and index denominator, including every reader,
   exporter, snapshot, backup, and recovery consumer.
4. Immutable pre-generation and expected target-generation manifests with
   per-record and aggregate hashes.
5. Accepted R-13 profile, `G-ICM-01`, R-16 recovery assumptions, source
   bundle, fixture SHA, signer authority, and independent verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | State Compaction Owner | Unassigned |
| Governance reviewer | Data Governance Owner | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration reviewer | Configuration Manager | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- `PRE-GENERATION`: observations, stream entries, counters, indexes, summaries,
  and exact facts with one frozen manifest.
- `TARGET-GENERATION`: expected compacted summary, retained exact facts,
  removed-source tombstones, indexes, counters, and integrity root.
- `CONCURRENT-READERS`: observation, recall, search/index, summary, ledger,
  export, snapshot, and backup readers.
- `LEDGER-TAMPER`: content mutation, deletion, insertion, reorder, source-ID
  substitution, project/session substitution, replay, and stale-generation
  replacement.
- `RETRY-SAME-INPUT` and `RESTART-PARTIAL-GENERATION`.
- Synthetic secrets/canaries to detect unintended disclosure in diagnostics,
  journals, exports, and backups.

## Fault and reader matrix

- Fail immediately before and after summary persistence, each ledger write,
  each source delete, each index delete/add, counter update, journal write,
  integrity-root seal, generation activation, and old-generation cleanup.
- Terminate the process at each boundary, restart, and retry the same
  compaction.
- Hold each declared reader before activation and release it during every
  write/delete/index boundary.
- Apply each ledger-tamper fixture before activation, after activation, before
  read, before export, and during recovery.

## Governed sinks and side effects

The denominator includes observations, summaries, exact-facts ledgers,
tombstones, journals, generation pointers, counters, streams, BM25/vector
indexes, caches, queues, audits, metrics, logs/errors, API/viewer outputs,
provider calls, exports, snapshots, backups, and cleanup artifacts. A reader
or sink without generation semantics blocks admission.

## Pass criteria

1. Every concurrent reader sees a self-consistent manifest equal to either the
   complete pre-generation or complete target generation, never a mixture.
2. Every fault and process restart deterministically restores the pre-image or
   completes the exact target; retry is idempotent and leaves no orphan,
   duplicate, or missing record/index.
3. The active target binds project, session, ordered source manifest, summary,
   exact facts, indexes, tombstones, and generation identity to one verifiable
   integrity root.
4. Every tamper fixture is detected before recall, search, export, snapshot,
   backup, promotion, or gate-critical use and produces typed non-success.
5. Source observations are not made unavailable until the target generation
   and its integrity proof are durably sealed and recoverable.
6. Rollback reproduces the exact pre-generation manifest and integrity root,
   including counters and indexes.

## Fail criteria

- Any mixed-generation read or target visibility before durable activation.
- Deleted source without a valid target, unindexed target, orphan index,
  missing exact fact, duplicate record, or divergent retry.
- Any undetected ledger mutation, substitution, omission, reorder, or replay.
- Recovery chooses a corrupt generation, cleanup removes the recoverable
  pre-image early, or rollback cannot reproduce its hash.
- Any governed reader/sink missing from the frozen denominator.

## Stop and backtrack

Stop on the first mixed-generation observation, integrity-check bypass,
unrecoverable pre-image, cross-project record, or synthetic secret outside the
expected oracle. Freeze fixture compaction and readers, preserve immutable
pre-images/journals and redacted traces, quarantine the target generation, and
return to the generation/integrity contract. Do not continue cleanup after an
integrity failure.

## Immutable receipt

The sealed receipt must bind the risk/card version, source and source-bundle
SHAs, generation/integrity/recovery contract SHAs, complete state/index/reader
denominators, pre/target manifests and roots, ordered fault/reader schedule,
all journal and activation transitions, tamper inputs and detections,
pre/post/rollback hashes, process/environment identity, raw output hashes,
executor, signer, and independent verification disposition.

## Rollback and cleanup

Use only disposable state and indexes. Restore the verified pre-generation
pointer and manifest or discard the complete fixture store; terminate readers
and workers; remove only manifested unactivated fixture generations; and
verify no queue, cache, export, snapshot, backup, or provider residue remains.
Preserve every receipt-manifested artifact.

## Admission blockers and execution prohibition

- Named humans for the owner, all four reviewers, executor, signer, and
  independent verifier.
- Human acceptance of generation, activation, reader, integrity, journal,
  recovery, rollback, and cleanup contracts.
- Frozen complete fixtures, state/index/reader/sink denominator, fault matrix,
  expected manifests, R-13 profile, `G-ICM-01`, and source bundle.

Do not invoke or build a PoC for R-22 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-22; accept an ADR, architecture, or MTP; pass ABM; or authorize
Construction. It also cannot authorize deployment, rollout, or production
compaction changes.
