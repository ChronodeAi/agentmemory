# R-17 Context Dependency Truthfulness Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-17`
Priority: P1
Method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-17-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  source-policy acceptance, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can every context source report one exact required/optional outcome while any
required failure returns non-success with zero packet or domain side effects,
and only an allowed optional failure returns a truthful, non-promotable
degraded advisory result?

## One bounded hypothesis

For the frozen required/optional policy and five-source fault corpus, each
source reports exactly one of `READY`, `EMPTY_VALID`, `DISABLED`,
`NOT_REQUESTED`, `TIMEOUT`, or `ERROR`; any required `DISABLED`,
`NOT_REQUESTED`, `TIMEOUT`, or `ERROR` outcome dominates the aggregate,
returns non-success, and produces zero context-domain side effects, while an
allowed optional non-ready outcome is explicit, degraded, incomplete, and
non-promotable rather than silently substituted with an empty success.

## Current-source finding and test gap

At the source candidate:

- `src/functions/coding-memory.ts:66-90` declares a partial required/optional
  policy, but the human decision identifying accepted required and optional
  dependencies remains open;
- `src/functions/coding-memory.ts:38,92-98` exposes only `ok`,
  `unavailable`, and `failed`, rather than the six required outcomes and their
  time, latency, error-code, and digest metadata;
- `src/functions/coding-memory.ts:395-426` maps every valid empty result to
  `unavailable` and every exception to `failed`, conflating `EMPTY_VALID`,
  `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, and `ERROR`;
- `src/functions/coding-memory.ts:784-821` partially fails closed when a
  hard-coded required source is non-`ok`, returning `success:false` before
  packet creation, while optional non-`ok` sources produce `degraded`; and
- `src/functions/coding-memory.ts:968-1013` creates packet and metric state for
  the surviving path, so complete before/after domain-state proof remains
  necessary.

`test/coding-memory.test.ts:391-468` checks one combined episodic exception and
file-history failure, showing advisory degradation and gate-critical
non-success with no packet ID. It does not exercise all six outcomes for each
source, every accepted required/optional assignment, single and combined fault
dominance, valid-empty semantics, timeout classification, gate-critical
optional degradation, restart/replay, or all governed side effects. The
current tests therefore do not retire R-17.

## Required frozen prerequisites

1. Immutable source bundle for commit
   `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` and tree
   `8c479b95bb9753911df212089d7faf3d6f35a28d`.
2. G-ICM-01 artifact SHA-256
   `ca1831d84bce92f386b8c52ec0f7b1de280123198e9123fffcd5628e6052b5e0`
   and distinct 195-input source digest
   `ffd39ae1f46c48ea72274df73fb9125fd3d8bfd6bf30517cea870c86441ff0c3`,
   with the complete ICM-05/ICM-06 source, context, delivery, promotion, REST,
   MCP, and hook denominator reviewed.
3. Human-accepted, versioned required/optional classification for slots,
   profile, lessons, episodic search, and file history, including when a source
   is legitimately disabled or not requested.
4. Human-accepted six-outcome schema with requirement class, monotonic
   observation sequence/time, latency, item count, error code, content digest,
   completeness, aggregate dominance, and retry semantics.
5. Accepted advisory-versus-gate-critical contract: degraded advisory context
   is non-promotable, while gate-critical context requires complete healthy
   readiness and cannot emit a degraded gate-critical packet.
6. Accepted R-13 execution profile, deterministic clock/timeout scheduler,
   immutable fixture and governed-namespace manifests, independent verifier,
   and receipt signer.

Any source, requirement class, outcome mapping, timeout, clock, completeness
rule, side-effect denominator, or actor change requires a new card version or
formally linked superseding card.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Context Pipeline Owner | Unassigned |
| Product reviewer | Product Owner | Unassigned |
| Software reviewer | Software Architect | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration review | Configuration Manager | Unassigned |
| Executor | Isolated context-pipeline worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

Configured model routes are advisory metadata only. They cannot accept a
required/optional policy or fill a human authority slot.

## Required fixtures

- For each of slots, profile, lessons, episodic search, and file history:
  `READY`, `EMPTY_VALID`, `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, and `ERROR`
  responses with frozen payload, metadata, latency, digest, and error oracle.
- Required and optional policy versions for each source, used only after the
  accountable humans accept the exact admitted policy.
- Advisory and gate-critical requests with project/session isolation controls,
  zero-file and requested-file variants, and deterministic token budgets.
- Single-source, pairwise, all-optional, mixed required/optional, and
  all-required fault combinations with one healthy control source.
- Recording source adapters, packet/delivery ledgers, provider and hook
  transports, suppression and promotion stores, indexes, audit/outbox,
  metrics, logs, errors, REST/MCP/hook outputs, and denial-receipt sinks.

All data and dependencies are synthetic. No production state, live user
content, real credentials, provider home, or Memetics canary is in scope.

## Fault matrix

- Apply every one of the six outcomes to every source under both required and
  optional policy, then run the frozen pairwise and combined-fault schedule.
- Inject timeout immediately before response, during response, after partial
  payload, and at the accepted timeout boundary; distinguish malformed/error
  responses from valid empty data.
- Disable or mark a source not requested before policy resolution, after
  policy resolution, and before aggregate evaluation.
- Fail immediately before and after source read, outcome recording, aggregate
  decision, packet construction, packet ledger write, dispatch enqueue,
  metric/audit/outbox write, and promotion admission.
- Interleave required failure with optional recovery and vice versa under a
  deterministic barrier; restart before terminal response and replay the same
  request.
- Inject failure into the bounded control-plane denial receipt and verify that
  receipt failure cannot convert a denied operation into success.

## Governed sinks and side effects

The domain denominator includes source/cache mutations, context packet and
delivery-attempt ledgers, source-injection and suppression projections, retry
queues, provider/hook dispatch, consumption, promotion candidates,
memory/lesson strengthening, search/vector indexes, project counts/metrics,
domain audits/outboxes, REST/MCP/hook success payloads, exports/snapshots, and
rollback artifacts. A required failure must change none of them. Observational
source calls and one bounded redacted control-plane failure receipt are not
domain effects, but both remain attributable evidence. A missing sink or
unknown before-state blocks the card.

## Measurable pass/fail criteria

Pass requires all of the following:

1. Every requested source emits exactly one of `READY`, `EMPTY_VALID`,
   `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, or `ERROR`, with requirement class,
   observation sequence/time, latency, item count, error code where applicable,
   and content/outcome digest.
2. `READY` and `EMPTY_VALID` remain distinct and both satisfy a required source;
   an empty valid result is never reported as unavailable or failed.
3. Any required `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, or `ERROR` result makes
   the aggregate `success:false`, emits no context packet or packet ID, and
   changes exactly zero governed domain sinks from their frozen pre-images.
4. Multiple outcomes are dominated by any required failure regardless of
   optional recovery, source order, concurrency, restart, or replay; no required
   failure reports success.
5. An allowed optional `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, or `ERROR`
   produces a typed `degraded`, `complete:false` advisory response with exact
   source diagnostics. Failed sources are not marked injected, acknowledged,
   suppressed, consumed, or promotable.
6. Gate-critical context emits a packet only when all accepted readiness
   requirements are complete; an optional degradation never becomes a
   gate-critical success packet.
7. Retrying after recovery produces a fresh attributable outcome without
   reusing a failed packet, suppression marker, promotion candidate, or
   fabricated prior success.

Fail is any unqualified `success:true` after a required failure, silent empty
substitution, outcome conflation, missing requirement class or diagnostics,
required-failure domain-side-effect count above zero, degraded
gate-critical packet, failed source marked injected or suppressed, promotion
from incomplete context, replayed failed packet, fabricated success, or
unmanifested governed side effect.

## Stop and backtrack

Stop on the first required failure reported as success, required-failure domain
write, degraded gate-critical packet, promotion from incomplete context,
cross-project occurrence, real content or secret, source/fixture mismatch,
unexpected egress, write outside disposable roots, or unattributed side
effect. Disable fixture context injection and promotion, close recording
transports, quarantine affected packets, preserve redacted immutable evidence,
restore governed namespace pre-images, and return to source-policy review. Do
not continue later fault cases after containment fails.

## Immutable receipt

The sealed receipt must bind risk/card version, source commit/tree and bundle
hash, G-ICM-01 digest, required/optional policy and six-outcome schema digests,
fixture and expected aggregate oracle manifests, deterministic clock/timeout
and interleaving schedule, ordered source and aggregate outcomes, before/after
hashes for every governed namespace and sink, packet/dispatch/promotion
occurrence counts, retry/restart outcomes, raw response and control-plane
receipt hashes, process/environment identity, executor, signer, and independent
verification disposition.

## Rollback and cleanup

Use only disposable state, synthetic dependencies, projects/sessions, and
recording providers. Restore every governed namespace pre-image, invalidate
fixture packets, remove only manifested fixture attempts/queues/promotion
candidates, terminate fixture workers, clear deterministic fault controls, and
verify zero provider, suppression, promotion, or retry residue. Preserve the
immutable receipt and every raw artifact named by it; do not delete manifested
evidence.

## Admission blockers and execution prohibition

- Named humans for the accountable owner, all reviewers, executor, signer, and
  independent verifier.
- Human acceptance of the required/optional source policy, six-outcome schema,
  timeout/clock values, aggregate dominance, advisory degradation, and
  gate-critical readiness contracts.
- Frozen complete source/outcome corpus, expected oracle, side-effect
  denominator, fault/interleaving schedule, source bundle, G-ICM-01, R-13, and
  receipt schema.
- Explicit human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Do not invoke, build, or run a PoC for R-17 while this card remains
`SPECIFICATION-CANDIDATE`. Current execution decision: **BLOCKED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-17; accept the required/optional policy; accept or baseline a
requirement, ADR, SAD, architecture, MTP, or traceability edge; pass ABM;
authorize Construction; or authorize deployment, distribution, rollout,
automatic context injection, promotion, or production use.
