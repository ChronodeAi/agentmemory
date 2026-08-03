# ADR-002: Evidence Eligibility, Delivery Acknowledgement, and Promotion

Status: **Proposed**
Decision owners: Software Architect, Test Architect, and Product Owner/Founder

## Context

Remembered content is not proof. Packet generation currently risks being counted as delivery, stale content can rank highly, and content patterns are weaker than typed verification evidence.

## Proposed decision

Represent authority, provenance, temporal validity, independent verification,
and human acceptance explicitly. Treat identifiers as locators, not evidence.
Filter `ELIGIBLE`, `INELIGIBLE`, and `INDETERMINATE` context before relevance
and enforce the 2,000-token limit on the final serialized wire image after
packing. Use fixed maxima of 300/400/700/400/200 tokens for
slots-profile/lessons/episodic/file-history/provenance and at most five
distinct qualified retrieved source records. Unused capacity is not silently
reassigned.

Distinguish generated, dispatched-unverified, provider-acknowledged,
suppressed, and consumed states. Local output acceptance is not provider
acknowledgement. Matching provider-native acknowledgement acceptance and its
exact source/session suppression projection commit atomically; late,
duplicate, revoked, replayed, wrong-issuer, wrong-attempt, and sibling receipts
cannot affect unrelated attempts. Require an immutable evidence-lineage DAG and
transactional outbox for promotion. Typed test/runtime/commit/accepted-ADR
evidence is required; recalled content cannot validate itself.

Use complete canonical event identity and a durable idempotency result before
dedupe success. A prefix hash or process-local cache is an optimization only.
Publish rolling compaction through one immutable, integrity-bound generation;
the exact-facts ledger cannot be updated, deleted, or indexed independently of
the source/target generation.

## Consequences

Existing packet, injection, promotion, lineage, and metric models must migrate.
Provider-native acknowledgement availability differs by host and requires
explicit compatibility behavior. Automatic gate-critical injection remains
disabled until adversarial benchmarks and the Memetics canary pass. Dedupe and
compaction require collision, concurrency, restart, every-boundary fault, and
tamper-detection evidence.

This ADR is not accepted or baselined.
