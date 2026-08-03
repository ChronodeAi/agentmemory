# R-21 Capture Dedupe Integrity Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-21`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-21-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  exact-event authority, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can capture identity preserve distinct full events and independent evidence
while making exact concurrent and post-restart retries idempotent, without
reporting success before every governed side effect reaches a durable terminal
state?

## One bounded hypothesis

Distinct full capture events always remain distinct, while exact retries across
concurrency and process restart produce one durable terminal result whose
receipt cannot claim deduplication or success until all declared governed side
effects are complete and reconcilable.

## Current-source finding and test gap

At the source candidate:

- `src/functions/dedup.ts:20-50` hashes only the first 500 serialized
  characters, stores recent hashes in a process-local `Map`, and separates the
  duplicate check from recording;
- `src/functions/observe.ts:96-177` checks dedupe before authoritative
  sanitization and before later persistence/side-effect boundaries;
- `src/functions/observe.ts:327-525` records dedupe around a sequence of KV,
  stream, counter, compaction, and indexing work that can fail partially; and
- `src/index.ts:237` wires this process-local dedupe into the live runtime.

`test/integration.test.ts:432-437` proves only that one repeated tool event is
reported as deduplicated in one process. It does not cover same-prefix
different-suffix events, collision handling, simultaneous check/record,
process restart, partial governed-side-effect failure, independent
corroboration, or retry truthfulness. Current tests therefore do not retire
R-21.

## Required frozen prerequisites

1. Human-accepted canonical full-event identity and collision-handling
   contract, including project, session, source, event type, payload, and
   policy/redaction version.
2. Durable idempotency state-machine contract with terminal states, retry
   rules, expiry, reconciliation, and response semantics.
3. Immutable input/event oracle and complete governed side-effect denominator.
4. Deterministic concurrency barriers, restart harness, and fault injector for
   each observation boundary.
5. Accepted R-13 profile, `G-ICM-01`, source bundle, fixture SHA, signer
   authority, and independent verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Capture Integrity Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Governance reviewer | Data Governance Owner | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- `COMMON-PREFIX-DISTINCT-SUFFIX`: two events identical through byte 500 with
  distinct governed suffixes and expected distinct identities.
- `EXACT-RETRY`: byte-identical requests with one expected terminal outcome.
- `CANONICAL-EQUIVALENT`: accepted serialization variants with a frozen
  identity expectation.
- `SAME-CONTENT-INDEPENDENT-SOURCES`: two independently sourced corroborating
  events that must both remain attributable.
- `PROJECT-A` and `PROJECT-B` events with otherwise identical payloads.
- `SANITIZATION-VERSION-A/B` and malformed/oversized payload cases.
- Recording stores for every observation, stream, counter, summary, ledger,
  index, audit, metric, queue, and API/hook response.

## Fault and concurrency matrix

- Pause two exact requests after duplicate check and release both together.
- Restart before and after durable observation write, dedupe-state write,
  stream publication, session-counter update, compaction trigger, ledger
  update, and index update.
- Inject timeout, rejection, and process termination at each boundary, then
  retry the same event before and after restart.
- Force a digest-collision fixture if the accepted identity contract specifies
  a test collision mechanism; otherwise omission of collision behavior blocks
  admission.

## Governed sinks and side effects

The denominator includes raw intake buffers, sanitized payloads, observations,
dedupe/idempotency records, session counters, streams, queues, indexes,
summaries, exact-facts ledgers, audits, metrics, logs/errors, provider attempts,
hook/API responses, exports, snapshots, and backups. The oracle distinguishes
accepted, pending, completed, rejected, retried, duplicate-completed, and
reconciliation-required states.

## Pass criteria

1. Every distinct event fixture produces a distinct durable identity and
   attributable terminal outcome, including the common-prefix and independent
   corroboration cases.
2. Every exact retry schedule produces one terminal governed outcome, with all
   duplicate callers referring to the same durable identity and final state.
3. Process restart preserves idempotency state and deterministically
   reconciles any pending event before returning a duplicate-success result.
4. A partial side effect never causes a retry to return fabricated
   `deduplicated` or success; the response is pending/retryable until all
   declared sinks are complete or rolled back.
5. Counters, streams, indexes, ledger entries, summaries, audits, and responses
   match the immutable input/event oracle after every admitted fault.
6. Project/session scope and sanitization-policy version are bound to identity,
   and no collision silently merges unrelated events.

## Fail criteria

- Loss of a distinct suffix or independently sourced corroborating event.
- Concurrent exact events produce duplicate governed outcomes.
- Restart forgets a completed event or mistakes a partial event for completed.
- Digest collision is silently accepted as identity.
- A retry reports deduplicated/success while any governed sink is missing,
  divergent, or unreconciled.
- Any project/session crossing, counter drift, orphan index/ledger record, or
  denominator omission.

## Stop and backtrack

Stop on the first distinct-event loss, cross-project identity, fabricated
success, unrecoverable partial event, or duplicate external side effect. Close
fixture intake, preserve the append-only input oracle and redacted traces,
quarantine derived fixture state, and return to the identity/transaction
contract. Do not replay from an unverified checkpoint.

## Immutable receipt

The sealed receipt must bind the risk/card version, source and source-bundle
SHAs, identity/state-machine contract SHAs, full fixture hashes and expected
identities, serialization/redaction versions, barrier/fault schedule, ordered
side-effect traces, restart boundaries, pre/post manifests and counters, raw
output hashes, executor/environment identity, signer, and independent
verification disposition.

## Rollback and cleanup

Use only disposable fixture stores and recording sinks. Halt intake, terminate
fixture workers, restore or discard the complete derived fixture generation,
verify empty queue/provider residue, and retain the immutable input oracle,
receipt, and manifested raw evidence. Remove no receipt-manifested artifact.

## Admission blockers and execution prohibition

- Named humans for the owner, three reviewers, executor, signer, and
  independent verifier.
- Human acceptance of the full-event identity, collision, durability,
  terminal-state, reconciliation, and response contracts.
- Frozen complete fixtures, side-effect denominator, fault/concurrency matrix,
  event oracle, R-13 profile, `G-ICM-01`, and source bundle.

Do not invoke or build a PoC for R-21 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-21; accept an ADR, architecture, or MTP; pass ABM; or authorize
Construction. It also cannot authorize deployment, rollout, or production
capture changes.
