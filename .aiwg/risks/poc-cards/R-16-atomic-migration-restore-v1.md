# R-16 Atomic Migration and Complete Restore Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-16`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-16-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  namespace manifest, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and live-state access: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can a complete, frozen inventory of every persisted data and control-plane
namespace be migrated and exactly restored through one generation-fenced
activation so that every reader, writer, crash, retry, and rollback boundary
exposes either the exact pre-generation or exact validated target generation,
never mixed or additive state?

## One bounded hypothesis

For the frozen all-namespace synthetic corpus, immutable staging plus one
compare-and-swap active-generation pointer, fenced writers, generation-pinned
readers, and append-only audit/outbox lineage preserve exact namespace,
record, index, and referential hashes across every write/crash boundary,
converging after restart to either the complete pre-generation or complete
target generation and reproducing the snapshot with zero residue.

## Current-source finding and test gap

Codebase Memory graph discovery identified `runStagedMigrationLocked`,
`captureState`, `applyExactState`, `registerSnapshotFunction`, and
`IndexPersistence` as the relevant structural path. Direct source verification
materially narrows older assessment text but leaves the atomicity proof open:

- `src/state/schema.ts:3-86` declares fixed and function-derived KV scopes.
  `src/functions/snapshot.ts:69-168,398-453` now declares fixed/dynamic
  namespace templates, checks dynamic `KV` manifest drift, tracks namespace
  keys, and resolves scopes from persisted anchors and selected environment
  values. A tracking failure is warned and tolerated at
  `src/functions/snapshot.ts:258-305`, so runtime completeness still requires
  an independent observed-scope oracle.
- `src/functions/snapshot.ts:507-565` captures per-namespace and whole-state
  hashes, and `src/functions/snapshot.ts:567-612,719-830` now attempts exact
  delete/set restore, equality verification, compensation, and rollback
  evidence. However, capture lists namespaces sequentially and restore mutates
  live scopes record by record before verification; there is no reader-pinned
  `active_generation` CAS around the complete state.
- `src/functions/migrate.ts:408-426,575-756` derives a source-bound migration
  ID, stages before-images, journals progress, and promotes targets
  sequentially. A journal generation is not a storage-generation activation,
  and readers can observe individually promoted targets before completion.
- `src/state/index-persistence.ts:90-103,151-267` publishes sharded BM25 and
  vector manifests in separate sequential operations and cleans previous
  shards afterward; those index generations are not atomically coupled to the
  complete data generation.
- Contrary to the older risk-assessment anchor, the candidate now includes
  `src/functions/migrate.ts` as a build entry at `tsdown.config.ts:71-78`, and
  `package.json:23` targets that emitted path. This fixes the source-level
  command-target mismatch only; it is not execution or recovery evidence.
- `test/snapshot.test.ts:212-480,496-923` checks manifest capture, exact residue
  deletion, selected failures, staged migration serialization, resume, and
  rollback. `test/index-persistence.test.ts` checks focused shard/manifest
  failures. The current suites do not kill a process before and after every
  persisted write, prove complete static-versus-runtime namespace equality,
  pin concurrent readers to one complete generation, or atomically couple all
  data, graph, BM25, vector, ledger, count, audit/outbox, and activation effects.

The inherited tests are mechanism evidence only and were not executed for this
card.

## Frozen prerequisites

1. Immutable source bundle for the source candidate and verified source-lock
   digest.
2. Configuration Manager-signed persisted-state inventory generated from
   static constructors and an independent runtime recording store. It must
   enumerate every fixed and dynamic KV scope, namespace key rule, index
   manifest/shard, graph state, ledger, count, migration stage/report/quarantine,
   snapshot repository artifact, configuration/state file, activation pointer,
   audit/outbox record, journal, temporary file, and rollback artifact.
3. Versioned generation contract binding canonical project/global boundary,
   schema version, source-manifest SHA, namespace-manifest SHA,
   identity/alias-registry generation, build SHA, prior generation, target
   generation, writer lease, and one activation CAS.
4. Immutable complete pre-generation, target-generation, and restore-snapshot
   manifests with per-scope key/value/count/hash and cross-scope referential
   integrity oracles.
5. Deterministic every-write fault schedule, concurrent reader/writer schedule,
   restart controller, exact RPO/RTO thresholds, and cleanup/retention policy.
6. Accepted R-13 execution profile, complete applicable `G-ICM-01` denominator,
   canonical identity fixtures under R-01, signer authority, and independent
   verification environment.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | State Migration and Recovery Owner | Unassigned |
| Architecture reviewer | Software Architect | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| State inventory custodian | Configuration Manager | Unassigned |
| Index/recovery operator | Owner of the disposable state backend | Unassigned |
| Executor | Isolated premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Fixtures

- Disposable recording StateKV/backend containing at least one record in every
  fixed scope and every resolvable dynamic scope from `KV`, plus index shards,
  graph records, ledgers, counts, migration control scopes, and namespace-key
  tracking records.
- Two canonical projects, multiple sessions/observations, project slots and
  metrics, promotion candidates, team/user scopes, migration generations, and
  cross-scope references with unique canaries.
- `UNDECLARED-NAMESPACE` and `LATE-DYNAMIC-NAMESPACE` sentinels that must block
  activation until incorporated into a newly frozen manifest.
- Source migration database and exact expected target with creates, updates,
  deletes, aliases, quarantines, duplicates, graph/index rebuilds, and
  post-snapshot residue.
- Pre-generation and target-generation BM25/vector indexes with query oracles,
  graph snapshots/indexes, exact-facts ledger, audit/outbox lineage, and active
  pointer.
- Deterministically barred readers and writers, process-kill controller,
  restart/reconcile worker, clock, and recording filesystem/log/queue sinks.

## Fault matrix

- Inject failure or process death immediately before and after every namespace
  discovery/list/get, static/runtime inventory comparison, stage write,
  per-record write/delete, referential check, graph/index build, count/ledger
  write, manifest write, audit/outbox append, and activation-pointer CAS.
- Repeat the same before/after boundary matrix for snapshot capture, restore
  staging, validation, activation, rollback pointer swap, retained-generation
  cleanup, and garbage collection.
- Interrupt every migration journal transition, including after a target write
  but before its journal update, and every snapshot compensation write.
- Interleave readers before, during, and after every stage/activation boundary;
  interleave authorized writers under the lease and rejected stale writers
  outside it.
- Inject missing, extra, corrupt, reordered, stale, and late-created
  namespaces; missing index shards; changed alias/identity generation; CAS
  conflict; disk-full/permission errors; duplicate restart; and repeated
  rollback or resume.

## Governed sinks and side effects

The denominator includes every fixed/dynamic persisted namespace and key,
namespace-key ledger, migration staging/reports/quarantine, data and
relationship records, graph/name/edge/degree/snapshot indexes, BM25/vector
manifests and shards, project/session ledgers and counts, active-generation
pointer, writer lease/fence, snapshots and Git objects, journals, audit/outbox,
and every persisted health/reconciliation, queue, stream, configuration, and
state namespace identified by static or runtime inventory; logs, metrics,
stdout/stderr, temporary files, retained generations,
rollback evidence, garbage-collection records, raw evidence, and immutable
receipts. An observed sink absent from the frozen inventory blocks the card.

## Measurable pass/fail criteria

| ID | Pass | Fail |
|---|---|---|
| R16-PF-01 | The signed static inventory and independent runtime observed-scope inventory are exactly equal; every declared fixed/dynamic namespace is instantiated by the fixture and every observed namespace has an owner, generation class, key rule, count, and hash. | Any omitted, undeclared, uninstantiated, ambiguously owned, or unhashable persisted namespace. |
| R16-PF-02 | At every injected write/crash boundary, 100% of concurrent reader receipts pin exactly one generation and equal either the complete pre-generation manifest or complete validated target manifest. | Any mixed generation, incremental live view, partial namespace, orphan record, or reader without a pinned generation. |
| R16-PF-03 | Writers without the target lease/fence perform zero governed writes; authorized writes are attributable exactly once, and activation is one successful CAS from the recorded prior pointer to the validated target. | Unfenced write, dual active writer, duplicate activation, non-CAS pointer change, or stale-writer success. |
| R16-PF-04 | After every crash and restart, reconciliation reaches the pre-generation or target generation within the frozen RTO and loses zero acknowledged writes under the frozen RPO; repeat resume changes zero target hashes or counts. | Unbounded recovery, RPO/RTO breach, replay duplication, unrecoverable journal, or a third state. |
| R16-PF-05 | Exact restore reproduces every namespace key/value/count/hash and referential-integrity oracle from the frozen snapshot, rebuilds graph/BM25/vector indexes to the accepted query hashes, and leaves zero post-snapshot or additive residue. | Missing scope/key, unequal value/hash/count, stale index, referential break, extra residue, or additive-only restore. |
| R16-PF-06 | Rollback is an activation-pointer swap to the immutable prior generation; all data/index reads match its pre-image while append-only audit/outbox retains the attempted, failed, activated, and rolled-back lineage. | Per-record compensation is the only recovery, prior generation is altered, audit truth disappears, or rollback is incomplete. |
| R16-PF-07 | All before/after failpoints, CAS conflicts, negative inventory cases, concurrent schedules, and cleanup cases are present in the sealed denominator with zero skipped or substituted case. | Missing boundary, hidden skip, retry substitution, denominator drift, or unrecorded cleanup. |

## Stop and backtrack

Stop on the first real state path, user content, credential, undeclared
namespace, mixed generation, unfenced write, unpinned reader, audit loss,
source/manifest drift, rollback mismatch, or write outside disposable roots.
Fence all fixture writers, prevent further activation, preserve the immutable
prior generation and redacted evidence, quarantine the target generation, and
return to inventory or generation-contract design. Do not continue later
fault cases after a containment breach.

## Immutable receipt

The sealed receipt must bind risk/card version, source and source-bundle SHAs,
schema/build/identity/alias generations, static and observed namespace-manifest
SHAs, pre/target/restore per-scope and whole-state hashes, cross-scope integrity
oracle, snapshot and index manifests, prior/target/active pointer values,
writer lease/fence identity, complete ordered write/crash/read schedule,
reconciliation and RPO/RTO measurements, all raw sink hashes, audit/outbox
lineage, rollback/cleanup results, executor, environment/process identity,
signer, and independent verification disposition.

## Rollback and cleanup

Use immutable pre-images and disposable state, snapshot, config, and index
roots only. Fence writers, swap the fixture pointer to the verified prior
generation, verify exact pre-image reads, remove only manifested unsealed
target/temp artifacts after retention checks, stop fixture workers, and verify
zero queued, locked, or orphaned residue. Preserve all retained generations,
sealed receipts, append-only audit/outbox, and every raw artifact named by a
receipt. Touch no live state or Codebase Memory alias/index.

## Admission blockers

- Named humans for every actor slot and accountable-owner calibration of R-16.
- Human acceptance of the complete persisted-state inventory, generation
  boundary, reader pin, writer fence/lease, activation CAS, snapshot, exact
  restore, RPO/RTO, audit/outbox, retention, rollback, and receipt contracts.
- Frozen static/runtime namespace inventories, all-namespace fixture, exact
  pre/target/restore manifests, fault matrix, concurrency schedule, sink
  denominator, R-13 profile, `G-ICM-01`, R-01 identity fixture, and source
  bundle.
- Independent verifier and signer trust, custody, freshness, revocation, and
  replay policy.
- Human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Current execution decision: **BLOCKED-NOT-ADMITTED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-16; accept or baseline ADR-005, ADR-006, an SAD, architecture, MTP, or
ABM result; authorize Construction; retire a Codebase Memory alias/index; or
authorize migration, restore, deployment, distribution, rollout, or production
state change.
