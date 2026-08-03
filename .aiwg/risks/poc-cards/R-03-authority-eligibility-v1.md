# R-03 Authority Eligibility Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-03`
Priority: P1
Method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-03-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can the context pipeline prove that authority eligibility is resolved before
relevance ranking and that zero stale, ineligible, or gate-critical
`INDETERMINATE` sources enter any gate-critical ranked set, packet, or
downstream authority-bearing effect?

## One bounded hypothesis

For one frozen, human-labelled candidate corpus and accepted eligibility
policy, every candidate receives a typed eligibility decision before any
relevance score is consulted, and every expired, contradicted, superseded,
deleted, unaccepted gate authority, recalled-only, provenance-unverified, or
gate-critical indeterminate candidate contributes zero items and zero bytes to
the ranked set and final gate-critical packet.

## Current-source finding and test gap

At the source candidate:

- `src/functions/coding-memory.ts:219-286` rejects several ineligible shapes,
  and `src/functions/coding-memory.ts:288-316,694-753` applies that function
  before lesson-confidence or episodic relevance sorting;
- `src/functions/coding-memory.ts:251-264` requires acceptance only when the
  candidate is already labelled as gate authority, so the accepted
  authority-classification contract remains material;
- `src/functions/coding-memory.ts:273-285` treats the presence of locator-like
  strings such as a candidate ID, observation ID, commit SHA, or receipt ID as
  sufficient provenance. It does not validate the referenced artifact,
  authority, project, lineage, or receipt status; and
- `src/functions/coding-memory.ts:947-1013` deduplicates selected source IDs and
  emits a packet, but it does not emit an immutable ordered-stage receipt
  proving the complete pre-rank denominator and its decisions.

`test/context-eligibility.test.ts:9-36` unit-checks seven exclusion reasons and
the current hard-coded source policy. `test/coding-memory.test.ts:151-245`
checks packet size, source count, project filtering, and acknowledgement-based
suppression. These tests do not provide the frozen human-labelled temporal,
contradiction, authority, provenance, and indeterminate corpus; do not prove
ordered eligibility-before-ranking across every G-ICM-01 context surface; and
do not prove zero stale/ineligible gate-critical leakage or locator-only
provenance rejection. The current tests therefore do not retire R-03.

## Required frozen prerequisites

1. Immutable source bundle for commit
   `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` and tree
   `8c479b95bb9753911df212089d7faf3d6f35a28d`.
2. G-ICM-01 artifact SHA-256
   `ca1831d84bce92f386b8c52ec0f7b1de280123198e9123fffcd5628e6052b5e0`
   and distinct 195-input source digest
   `ffd39ae1f46c48ea72274df73fb9125fd3d8bfd6bf30517cea870c86441ff0c3`,
   with Configuration Manager, Software Architect, Security Architect, and
   Test Architect review of the applicable ICM-02, ICM-05, and ICM-08
   denominator.
3. Human-accepted, versioned eligibility policy defining project identity,
   authority class, temporal validity, contradiction, supersession, deletion,
   provenance verification, recalled lineage, acceptance authority,
   indeterminate handling, and machine-readable reason codes.
4. Human-labelled corpus manifest, expected eligibility/rank/omission oracle,
   accepted clock and tokenizer profiles, and adjudication procedure.
5. Accepted R-04 acknowledgement, R-06 provenance, and R-17 dependency-outcome
   contracts, plus an accepted typed evidence schema.
6. Accepted R-13 execution profile, immutable fixture-manifest digest,
   independent verifier, and receipt signer authority.

Any source, policy, corpus, oracle, tokenizer, clock, interface denominator, or
actor change requires a new card version or formally linked superseding card.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Product Owner | Unassigned |
| Eligibility-policy owner | Requirements Owner accepted by Product Owner | Unassigned |
| Software reviewer | Software Architect | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration review | Configuration Manager | Unassigned |
| Executor | Isolated coding/test worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

Configured model routes are advisory metadata only. They cannot fill a human
authority slot or prove provider-observed identity.

## Required fixtures

- `ELIGIBLE-CURRENT-LOW-RANK` and `ELIGIBLE-CURRENT-HIGH-RANK` controls with
  independently verifiable project, authority, temporal, provenance, and
  acceptance evidence.
- `EXPIRED-HIGH-RANK`, `CONTRADICTED-HIGH-RANK`,
  `SUPERSEDED-HIGH-RANK`, `DELETED-HIGH-RANK`,
  `UNACCEPTED-GATE-HIGH-RANK`, `RECALLED-ONLY-HIGH-RANK`,
  `PROVENANCE-MISSING-HIGH-RANK`, `LOCATOR-ONLY-HIGH-RANK`, and
  `INDETERMINATE-HIGH-RANK`.
- Boundary fixtures immediately before, at, and after expiry, supersession,
  contradiction, receipt revocation, and human-acceptance transitions.
- Two-project, two-session, duplicate-source-ID, acknowledged-source, and
  six-or-more-candidate fixtures with deliberately adversarial relevance
  scores.
- Recording ranker, context packer, REST/MCP/hook adapters, packet ledger,
  delivery/suppression projection, promotion sink, audit/outbox, and
  log/metric sinks.

All content is synthetic. No production memory, credentials, provider home, or
Memetics canary is in scope.

## Fault matrix

- Inject each exclusion and indeterminate condition singly, pairwise, and in a
  combined all-high-relevance set while an eligible low-relevance control is
  present.
- Move the accepted clock across expiry and supersession boundaries before
  eligibility, between eligibility and ranking, and before final packet
  serialization.
- Revoke or invalidate provenance and human-authority receipts before
  eligibility, during ranking, and before packet commit.
- Return duplicate IDs, conflicting project IDs, missing policy, malformed
  temporal data, cyclic recalled lineage, and unresolvable artifact locators.
- Fail immediately before and after source read, eligibility decision,
  exclusion receipt, ranker entry, packet packing, packet ledger write,
  dispatch enqueue, and promotion admission.
- Interleave two eligibility evaluations with contradiction, supersession, and
  acknowledgement transitions under a deterministic barrier schedule.

## Governed sinks and side effects

The denominator includes source and policy reads, eligibility and omission
records, ranker inputs/outputs, token-packer inputs/outputs, final wire images,
packet and attempt ledgers, retry queues, provider dispatches,
acknowledgement/suppression state, consumption state, promotion candidates,
memory/lesson strengthening, indexes, audits/outboxes, metrics, logs, errors,
REST/MCP/hook responses, and rollback artifacts. An ineligible or
gate-critical indeterminate candidate must produce no authority-bearing domain
effect. A bounded redacted control-plane exclusion receipt is evidence, not a
domain effect. A missing or unobservable sink blocks the card.

## Measurable pass/fail criteria

Pass requires all of the following:

1. The receipt's pre-rank denominator equals the frozen corpus denominator,
   with exactly one typed `ELIGIBLE`, `INELIGIBLE`, or `INDETERMINATE`
   decision and one policy digest for every candidate.
2. The ranker-entry denominator contains only `ELIGIBLE` candidates; every
   high-relevance ineligible or gate-critical indeterminate fixture has zero
   ranker entries.
3. Gate-critical ranked sets, final wire images, packet source IDs, and every
   governed downstream sink contain exactly zero stale, expired,
   contradicted, superseded, deleted, unaccepted, recalled-only,
   provenance-unverified, other-project, or indeterminate candidates.
4. Ordered stage evidence proves eligibility completion before the first
   relevance-score read for every candidate and interface invocation.
5. Locator-only provenance fixtures are rejected until the referenced
   artifact, project, authority, status, and lineage independently verify.
6. Every omitted candidate has one machine-readable reason; duplicate source
   IDs in the final packet equal zero; qualified retrieved sources are at most
   five; and the accepted final wire image is at most 2,000 actual tokens.
7. Repeating every fixture and replaying its receipt changes zero eligibility,
   ranking, packet, suppression, or promotion outcomes.

Fail is any denominator mismatch, eligibility decision after ranking begins,
ineligible or gate-critical indeterminate ranker entry, stale/ineligible
gate-critical occurrence above zero, locator-only provenance acceptance,
missing exclusion reason, duplicate final source ID, untraceable policy or
clock transition, fabricated success, or unmanifested governed side effect.

## Stop and backtrack

Stop on the first stale/ineligible gate-critical occurrence, cross-project
occurrence, real content or secret, policy/fixture/source mismatch, unexpected
egress, write outside disposable roots, or unattributed side effect. Disable
fixture gate-critical injection and promotion, close recording dispatch sinks,
quarantine affected packets, preserve redacted immutable evidence, and return
to policy/source review. Do not continue later fault cases after containment
fails.

## Immutable receipt

The sealed receipt must bind risk/card version, source commit/tree and bundle
hash, G-ICM-01 digest, eligibility-policy digest, corpus and oracle manifests,
clock/tokenizer profiles, actor assignments, deterministic fault schedule,
ordered source-read/eligibility/ranker/packer events, pre-rank and post-rank
denominators, final wire-image hashes, every governed sink manifest/hash,
exclusion and occurrence counts, process/environment identity, raw result
hashes, executor, signer, and independent verification disposition.

## Rollback and cleanup

Use only disposable state, synthetic projects/sessions, and recording
providers. Restore the exact fixture state pre-image, invalidate fixture
packets, clear only manifested fixture attempts and promotion candidates,
terminate fixture workers, revoke fixture authorities, and verify zero queued
provider or promotion residue. Preserve the immutable receipt and every raw
artifact named by it; do not delete manifested evidence.

## Admission blockers and execution prohibition

- Named humans for the accountable owner, policy owner, reviewers, executor,
  signer, and independent verifier.
- Human acceptance of the eligibility, authority, temporal, provenance,
  contradiction, indeterminate, tokenizer, clock, and omission contracts.
- Accepted and frozen R-04, R-06, R-17, typed-evidence, R-13, and G-ICM-01
  prerequisites.
- Frozen complete corpus, expected oracle, sink denominator, fault schedule,
  source bundle, fixture digest, and receipt schema.
- Explicit human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Do not invoke, build, or run a PoC for R-03 while this card remains
`SPECIFICATION-CANDIDATE`. Current execution decision: **BLOCKED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-03; accept or baseline a requirement, ADR, SAD, architecture, MTP, or
traceability edge; pass ABM; authorize Construction; or authorize deployment,
distribution, rollout, automatic gate-critical injection, promotion, or
production use.
