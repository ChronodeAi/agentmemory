# R-04 Delivery Acknowledgement Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-04`
Priority: P1
Method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-04-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  provider receipt identities, signer, verifier, and human assignments:
  **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and external provider calls: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can context delivery preserve distinct `GENERATED`,
`DISPATCHED_UNVERIFIED`, `ACKNOWLEDGED`, and `SUPPRESSED` states and prove,
using provider-native receipts, that race, replay, revocation, failure, and
retry affect only the exact bound attempt and never fabricate delivery or
prematurely suppress a source?

## One bounded hypothesis

For each frozen provider/attempt fixture, packet construction creates only
`GENERATED`, transport acceptance advances only the matching attempt to
`DISPATCHED_UNVERIFIED`, and exactly one valid provider-native receipt bound to
the packet and attempt atomically records `ACKNOWLEDGED` with its exact
project/session/source `SUPPRESSED` projection; every invalid, late, sibling,
expired, revoked, replayed, duplicate, wrong-issuer, or wrong-attempt receipt
changes zero additional acknowledgement, suppression, retry, or consumption
state.

## Current-source finding and test gap

At the source candidate:

- `src/functions/coding-memory.ts:100-122` defines packet and acknowledgement
  records but no explicit dispatch-attempt record or four-state delivery
  projection;
- `src/functions/coding-memory.ts:143-154` binds a signed receipt to packet,
  project, session, context hash, nonce, expiry, provider ID, and receipt ID,
  but has no dispatch-attempt ID, issuer/key identity, issued-at time, or
  revocation generation;
- `src/functions/coding-memory.ts:968-1013` persists the packet and reports
  success without recording `DISPATCHED_UNVERIFIED`;
- `src/functions/coding-memory.ts:1142-1206` claims a receipt, writes an
  acknowledgement, and writes audit state in separate operations rather than
  one atomic acknowledgement/suppression transaction; and
- `src/hooks/pre-compact.ts:23-51,146-168` writes context to local stdout and
  then signs its own acknowledgement as `claude-code:pre-compact`. That proves
  local callback ordering, not a provider-native receipt or consumption.

`test/coding-memory.test.ts:151-389` covers retry before acknowledgement,
same-receipt duplication, receipt reuse, expiry, missing verification, ledger
failure, and one repair path. `test/pre-compact-context-delivery.test.ts:54-164`
proves the current local self-signed hook sequence. These tests do not provide
provider-native Codex, Claude, and MCP-only receipts; explicit
`GENERATED`/`DISPATCHED_UNVERIFIED`/`ACKNOWLEDGED`/`SUPPRESSED` observation;
deterministic multi-attempt late/sibling/wrong-attempt races; issuer/key
revocation; or atomic crash-window proof. The current tests therefore do not
retire R-04.

## Required frozen prerequisites

1. Immutable source bundle for commit
   `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` and tree
   `8c479b95bb9753911df212089d7faf3d6f35a28d`.
2. G-ICM-01 artifact SHA-256
   `ca1831d84bce92f386b8c52ec0f7b1de280123198e9123fffcd5628e6052b5e0`
   and distinct 195-input source digest
   `ffd39ae1f46c48ea72274df73fb9125fd3d8bfd6bf30517cea870c86441ff0c3`,
   with the complete ICM-05/ICM-06 context, provider, REST, MCP, hook, retry,
   and consumption denominator reviewed.
3. Human-accepted provider-native acknowledgement mechanisms for Codex,
   Claude, and MCP-only agents, including issuer/key custody, rotation,
   revocation, freshness, replay, and provider-observed telemetry policy.
4. Versioned packet/attempt/receipt schema and state machine defining
   `GENERATED`, `DISPATCHED_UNVERIFIED`, `ACKNOWLEDGED`, `SUPPRESSED`,
   dispatch failure, expiry, rejection, retry, and separate consumption.
5. Accepted atomicity model binding receipt acceptance and exact
   project/session/source suppression, with deterministic failpoints and
   reader-visibility oracle.
6. Accepted R-17 source-outcome contract, R-13 execution profile, immutable
   fixture/fault manifests, independent verifier, and receipt signer.

Any source, provider mechanism, receipt claim, key/revocation policy, state
machine, atomicity oracle, denominator, or actor change requires a new card
version or formally linked superseding card.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Software Architect | Unassigned |
| Provider authority | Provider Integration Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Product reviewer | Product Owner | Unassigned |
| Security/revocation review | Security Architect | Unassigned |
| Configuration review | Configuration Manager | Unassigned |
| Executor | Isolated provider-integration worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

Configured route labels or model names are not provider-observed delivery
evidence and cannot fill any authority slot.

## Required fixtures

- One synthetic packet with at least three source IDs in project A/session A,
  plus same-source project B/session B isolation controls.
- `ATTEMPT-A1` and concurrent retry `ATTEMPT-A2`, each with distinct attempt
  ID, recipient, nonce, context hash, expiry, and provider transport trace.
- Recording Codex, Claude, and MCP-only provider adapters that can emit
  independently verifiable native receipts without using the Agentmemory
  acknowledgement secret.
- Valid, duplicate, late, sibling-attempt, expired, rejected, revoked,
  replayed, wrong-issuer, wrong-key, wrong-attempt, wrong-project,
  wrong-session, wrong-context-hash, and wrong-nonce receipt fixtures.
- Dispatch refusal, timeout, local stdout acceptance, stream-buffer
  acceptance, socket acceptance, process-death, and response-loss fixtures.
- Recording packet, attempt, receipt, suppression, retry, consumption,
  audit/outbox, metric, log, REST/MCP/hook, and provider sinks.

All provider and content fixtures are synthetic. No live provider account,
production credential, production memory, or Memetics canary is in scope.

## Fault matrix

- Fail immediately before and after packet commit, attempt creation, transport
  handoff, local-buffer acceptance, provider acceptance, receipt issue,
  receipt verification, revocation lookup, receipt claim,
  acknowledgement/suppression commit, audit/outbox commit, and response.
- Interleave `ATTEMPT-A1` and `ATTEMPT-A2` so every valid, late, sibling,
  duplicate, replayed, and revoked receipt arrives at each state barrier.
- Revoke the issuer key before dispatch, after dispatch, before receipt issue,
  after receipt issue but before verification, and after terminal acceptance.
- Replay one accepted receipt against the same attempt, sibling attempt,
  different packet, different project/session, and reconstructed process.
- Drop acknowledgement responses and restart the service before retrying the
  exact request; inject ledger and audit/outbox failures at every write.
- Observe state concurrently at each crash barrier to detect any
  acknowledgement without suppression or suppression without its accepted
  acknowledgement.

## Governed sinks and side effects

The denominator includes packet, attempt, receipt-claim, acknowledgement,
suppression, retry, expiry/rejection, consumption, audit/outbox, and denial
ledgers; source eligibility/omission state; provider calls and native receipts;
stdout, stream, socket, and hook output; queues; metrics; logs; errors;
REST/MCP/hook responses; and rollback artifacts. A failed or invalid receipt
may create one bounded redacted control-plane denial/terminal receipt, but it
must change zero packet-source suppression, retry authority, consumption, or
other domain state. A missing sink blocks the card.

## Measurable pass/fail criteria

Pass requires all of the following:

1. Generation creates exactly one `GENERATED` packet and zero
   `ACKNOWLEDGED` or `SUPPRESSED` transitions.
2. Local stdout, stream-buffer, socket, or transport acceptance creates at
   most one `DISPATCHED_UNVERIFIED` transition for the exact attempt and zero
   `ACKNOWLEDGED`, `SUPPRESSED`, or consumption transitions.
3. Exactly one valid provider-native receipt validates packet, attempt,
   project, session, context hash, nonce, issuer/key, receipt ID, issue/expiry
   time, and non-revoked status, then records one `ACKNOWLEDGED` transition.
4. Receipt acceptance and the exact project/session/source `SUPPRESSED`
   projection are atomic and idempotent: every concurrent reader observes
   either neither or both, and duplicate suppression count equals zero.
5. Invalid, failed, late, sibling, expired, revoked, replayed, duplicate,
   wrong-issuer, wrong-attempt, and mismatched receipts change zero additional
   acknowledgement, suppression, retry, or consumption state and return the
   frozen terminal result.
6. Dispatch failure, timeout, rejection, expiry, crash, and response loss leave
   every unacknowledged source retry-eligible; the successful retry closes only
   its exact attempt.
7. Consumption has its own explicit transition and is never inferred from
   dispatch, acknowledgement, or suppression.
8. Provider-observed telemetry and independently verified native-receipt hashes
   exist for every accepted acknowledgement; configured route metadata and
   local self-signatures qualify zero acknowledgements.

Fail is any generated packet counted as delivered, local buffering advancing
beyond `DISPATCHED_UNVERIFIED`, acknowledgement without provider-native proof,
observable acknowledgement/suppression split, invalid receipt causing a domain
effect, sibling attempt closure, source suppression before acknowledgement,
duplicate consumption, retry loss, fabricated success, missing provider
telemetry, or unmanifested governed side effect.

## Stop and backtrack

Stop on the first premature acknowledgement or suppression, cross-attempt or
cross-project effect, revoked/replayed receipt acceptance, real content or
secret, unexpected provider egress, state/receipt mismatch, write outside
disposable roots, or unattributed side effect. Disable fixture injection,
close recording transports, revoke fixture issuers, preserve redacted
immutable evidence, restore the attempt ledger pre-image, and return to
state-machine/provider-contract review. Do not continue after containment
fails.

## Immutable receipt

The sealed receipt must bind risk/card version, source commit/tree and bundle
hash, G-ICM-01 digest, state-machine and atomicity-policy digests,
provider-native mechanism/issuer/key/revocation manifests, packet/source and
attempt manifests, fixture and expected-state oracle hashes, deterministic
fault/interleaving schedule, ordered state transitions, provider-observed
telemetry hashes, every raw native receipt and verification result, concurrent
reader observations, every governed sink manifest/hash, retry and consumption
outcomes, process/environment identity, executor, signer, and independent
verification disposition.

## Rollback and cleanup

Use only disposable projects, sessions, provider adapters, keys, ledgers, and
queues. Restore exact packet/attempt/suppression pre-images, remove only
manifested fixture queue and transport residue, revoke fixture issuers and
receipts, terminate fixture workers, and verify zero provider, retry, or
consumption residue. Preserve the immutable receipt and every raw artifact
named by it; do not delete manifested evidence.

## Admission blockers and execution prohibition

- Named humans for the accountable owner, provider authority, reviewers,
  executor, signer, and independent verifier.
- Human acceptance of provider-native mechanisms for Codex, Claude, and
  MCP-only agents and of the issuer/key/revocation/replay policy.
- Human acceptance of the four-state attempt model, separate consumption, and
  atomic acknowledgement/suppression transaction.
- Frozen complete provider/receipt fixtures, fault/interleaving oracle, sink
  denominator, source bundle, G-ICM-01, R-17, R-13, and receipt schema.
- Explicit human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Do not invoke, build, or run a PoC for R-04 while this card remains
`SPECIFICATION-CANDIDATE`. Current execution decision: **BLOCKED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-04; select a provider mechanism; accept or baseline a requirement,
ADR, SAD, architecture, MTP, or traceability edge; pass ABM; authorize
Construction; or authorize deployment, distribution, rollout, automatic
context injection, or production delivery.
