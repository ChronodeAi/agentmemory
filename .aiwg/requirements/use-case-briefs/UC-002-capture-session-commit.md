# UC-002: Capture, Session, and Commit Lifecycle

Status: Draft

## Primary flow

1. Session start or resume is idempotent and project-bound; child links are idempotent.
2. Balanced capture records high-value lifecycle events with output bounds.
3. Exclusions and sensitive-data redaction run before persistence.
4. Event hashes and semantic dedupe suppress duplicate observations.
5. Rolling compaction preserves an exact-facts ledger.
6. Work is recorded with committed or uncommitted provenance.
7. Eligible records link to the resulting commit; the session closes explicitly or is later marked stale/abandoned.

## Failure flows

- A project collision fails closed.
- Excluded or secret-bearing material is dropped or redacted.
- Hook pressure is bounded; telemetry cannot block the agent indefinitely.
- Service or commit failure leaves recoverable, truthful state and does not fabricate linkage.
- Native provider-memory synchronization occurs only after an explicit user action.
