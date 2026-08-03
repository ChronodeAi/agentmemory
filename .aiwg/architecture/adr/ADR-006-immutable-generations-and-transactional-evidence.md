# ADR-006: Immutable Generations and Transactional Evidence

Status: **Proposed**
Decision owners: Software Architect, State Migration and Recovery Owner,
Configuration Manager, and Test Architect

## Context

Journaling and per-record compensation improve recoverability but do not
guarantee that concurrent readers see only the pre-operation or target state.
Snapshots can observe changing namespaces, restores can mutate live records
incrementally, and a receipt written separately from state can disagree after
a crash. A local package upgrade adds a second atomicity boundary: immutable
runtime release bytes and immutable data generations have different identities,
compatibility rules, and rollback pointers.

## Proposed decision

Stage one complete immutable project or explicitly global data generation,
including primary records, dynamic namespaces, graph/search/vector indexes,
and reversible project ledgers. Derive generation identity from boundary, schema,
source manifest, alias-registry generation, and build SHA. Validate counts,
hashes, referential integrity, identity, quarantine, and rebuilt indexes before
one compare-and-swap activates `active_generation`.

Readers pin one generation per request; writers are fenced or explicitly
dual-written under a lease. Snapshot creation pins a generation. Restore
stages a new verified generation. Rollback swaps to the immutable previous
generation. Failed and old generations remain until retention and owner
disposition permit cleanup.

State transitions and evidence receipts commit through an append-only
control-plane audit lineage and embedded transactional outbox outside the
reversible data pointer. They preserve every stage, activation, failure,
rollback, retention, and cleanup event even when `active_generation` returns to
a prior data generation. An external relay may copy receipts but cannot replace
atomic state/outbox coupling or claim independent custody without separate
evidence.

Rolling compaction uses the same model at project/session scope. Its immutable
target binds source observations, exact facts, summaries, search/vector
indexes, counts, schema, policy, and build. The exact-facts ledger is
tamper-evident. Readers see the complete pre-image or complete target; restart
finishes activation or retains the pre-image.

Capture idempotency is a control-plane transaction: complete canonical event
identity, reservation, governed side effects, and terminal result commit
together or remain durably incomplete. Worker replay is limited to matching
non-terminal events and cannot report readiness before generation and
terminal-outcome reconciliation.

Runtime-release generation is separate from data generation. ADR-007 owns the
local package/process envelope; this ADR requires a coordinated activation
record binding previous and target runtime-release IDs, data-generation IDs,
schema/configuration/identity generations, compatibility result, transaction
ID, and expected pointers. Upgrade stages and validates both sides before
draining admission. Activation and rollback converge to a complete compatible
pair, never an unqualified mixed runtime/data pair. A one-sided emergency
switch is allowed only when the immutable compatibility matrix explicitly
qualifies that pair and a human operator authorizes the bounded recovery.

The runtime pointer, data pointer, and transaction outcome reconcile on
restart before readiness. Audit lineage and failed-attempt receipts remain
outside both reversible pointers, so coordinated rollback cannot erase the
attempt or its reason.

## Consequences

Storage, migration, retention, and indexing complexity increase. The model
enables reader-atomic activation, exact rollback, portable receipts, crash
recovery, and sidecar reconciliation. A complete namespace manifest,
process-death fault matrix, concurrent-reader proof, RPO/RTO values, and
garbage-collection policy are required before acceptance. Compaction and
capture also require prefix-collision, concurrency, restart, tamper, partial
side-effect, and worker-replay fixtures. Local qualification additionally
requires every-boundary runtime/data pair activation, process-death,
incompatible-pair denial, and coordinated rollback/readback fixtures.

This ADR is not accepted or baselined.
