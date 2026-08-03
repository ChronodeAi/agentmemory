# R-23 Worker Replay Reconciliation Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-23`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-23-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  supervision authority, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and supervisor changes: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can the supervised capture worker preserve every durably accepted event across
failure and restart, reconcile partial side effects exactly once, prevent
multiple active workers, and remain non-ready until recovery converges?

## One bounded hypothesis

After hook intake returns durable acceptance, worker crash, forced
termination, concurrent supervisor start, or host restart preserves one
terminal governed outcome per event through bounded durable replay and startup
reconciliation, with singleton identity and readiness remaining truthful until
convergence.

## Current-source finding and test gap

At the source candidate:

- `src/cli.ts:856-908` starts a detached engine process;
- `src/cli.ts:1219-1283` and `src/cli.ts:2700-2829` contain worker PID and stop
  handling but do not establish automatic supervision, durable capture replay,
  or startup reconciliation;
- `src/index.ts:115-135` writes worker PID state on a best-effort basis;
- `src/index.ts:637-672` performs bounded shutdown handling; and
- `src/hooks/_observe-delivery.ts:3-87` delivers/retries observations without a
  durable local intake journal that the worker can reconcile after restart.

`test/stop-worker-pidfile.test.ts:8-33` is a source-wiring assertion for PID
file creation and stop behavior. `test/hook-delivery.test.ts` checks bounded
request retries and explicitly permits telemetry-delivery failure without
failing the host command. These tests do not crash/restart a worker, prove
durable acceptance, prevent dual workers, replay partial events, reconcile
governed side effects, or gate readiness on recovery. Current tests therefore
do not retire R-23.

## Required frozen prerequisites

1. Human-accepted durable intake/acceptance contract defining the exact point
   at which the host may receive success.
2. Versioned singleton supervisor, worker lease/fencing, retry/backoff,
   checkpoint, replay, poison-event, and startup reconciliation contracts.
3. Accepted R-21 exact-event identity and terminal-state contract.
4. Complete process, PID/lease, intake journal, governed side-effect,
   telemetry, and readiness denominator.
5. Accepted R-13 profile, R-07 bounds, R-08 readiness state machine,
   `G-ICM-01`, source bundle, fixture SHA, signer authority, and independent
   verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Runtime Supervision Owner | Unassigned |
| Operations reviewer | Operations Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration reviewer | Configuration Manager | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- Immutable append-only intake oracle with exact event IDs for project A and
  project B.
- `ACCEPTED-NOT-STARTED`, `IN-PROGRESS`, `SIDE-EFFECT-PARTIAL`,
  `COMPLETED-NOT-ACKED`, `RETRYABLE`, and `POISON-EVENT` states.
- Valid PID/lease, stale PID, reused PID, corrupt PID file, missing PID file,
  expired lease, and wrong-worker fencing token.
- Single start, simultaneous dual start, rapid restart loop, graceful stop,
  forced termination, and simulated host restart.
- Recording sinks for observation state, counters, streams, queues, indexes,
  ledgers, summaries, audits, metrics, logs/errors, provider calls, hook/API
  responses, checkpoints, leases, and readiness.

## Fault and process matrix

- Terminate the worker before and after durable intake, dequeue/claim,
  observation write, stream publication, counter update, compaction/ledger
  work, index update, audit, checkpoint, terminal receipt, and host response.
- Launch two supervisors and two workers at barriers around lease acquisition,
  renewal, expiry, fencing, PID write, and startup reconciliation.
- Inject stale/reused PID, corrupt journal/checkpoint, transient and permanent
  sink failures, poison events, disk-full simulation, and bounded restart
  exhaustion.
- Restart with pending, partially applied, completed-but-unacknowledged, and
  duplicated intake records.

## Governed sinks and side effects

The denominator includes intake journal, event claims, leases/fencing tokens,
PID files, checkpoints, observations, counters, streams, queues, indexes,
summaries, exact-facts ledgers, audits, metrics, logs/errors, provider calls,
host responses, dead-letter/quarantine state, and liveness/readiness outputs.
The receipt must distinguish accepted, queued, claimed, pending,
reconciliation-required, completed, rejected, quarantined, and exhausted.

## Pass criteria

1. Host-visible success occurs only after a durable intake identity exists and
   is recoverable by a newly started worker.
2. Every crash/restart schedule reconciles the immutable intake oracle to one
   terminal governed outcome per accepted event, with no loss or duplicate
   side effect.
3. At most one unfenced worker can mutate governed state; stale/reused PID,
   lease expiry, dual start, and delayed old-worker writes cannot regain
   authority.
4. Startup inventory and replay finish or enter a typed bounded failure state
   before readiness becomes healthy.
5. Partial and completed-but-unacknowledged events reconcile deterministically;
   poison events are quarantined without blocking or fabricating success for
   unrelated events.
6. Restart/backoff, queue growth, retry count, and recovery time remain within
   the human-accepted R-07/R-08 limits and are represented truthfully in
   telemetry.

## Fail criteria

- Any durably accepted event is lost or any governed side effect is duplicated.
- Host success precedes durable acceptance or a failure is reported as
  persisted/delivered.
- More than one unfenced worker mutates state, or a stale/reused PID or lease
  can take over.
- Startup skips pending/partial state, readiness becomes healthy before
  convergence, or replay is unbounded.
- Counter/index/ledger divergence, cross-project replay, poison-event cascade,
  telemetry recursion, or any missing governed sink.

## Stop and backtrack

Stop on the first accepted-event loss, duplicate external side effect,
cross-project replay, concurrent unfenced mutation, unbounded restart, or false
readiness. Close fixture intake, fence and terminate all fixture workers,
preserve the intake oracle/process/redacted sink receipts, quarantine partial
state, and return to the supervision/replay contract. Do not replay from an
unverified checkpoint.

## Immutable receipt

The sealed receipt must bind the risk/card version, source and source-bundle
SHAs, intake/supervision/replay/readiness contract SHAs, full process and sink
denominators, fixture event hashes, PID/lease/fencing identities, ordered
fault/start/stop/restart schedule, process trees and signals, checkpoint and
side-effect traces, readiness transitions, pre/post reconciliation manifests,
resource telemetry, raw output hashes, executor/environment identity, signer,
and independent verification disposition.

## Rollback and cleanup

Use only disposable fixture homes, process state, journals, and recording
sinks. Close intake, fence and terminate fixture workers, restore the
supervisor pre-image, discard only manifested derived fixture state, and
verify no process, lease, PID, queue, provider, or readiness residue remains.
Preserve the immutable intake oracle, receipt, and every manifested raw
artifact.

## Admission blockers and execution prohibition

- Named humans for the owner, all four reviewers, executor, signer, and
  independent verifier.
- Human acceptance of durable intake, singleton supervision, fencing,
  replay/reconciliation, poison-event, resource-bound, readiness, rollback,
  and receipt contracts.
- Frozen complete fixtures, process/fault matrix, sink denominator, expected
  oracle, R-13 profile, R-07/R-08 limits, R-21 contract, `G-ICM-01`, and source
  bundle.

Do not invoke or build a PoC for R-23 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-23; accept an ADR, architecture, or MTP; pass ABM; or authorize
Construction. It also cannot authorize deployment, rollout, or production
supervision changes.
