# ADR-002: Evidence Eligibility, Delivery Acknowledgement, and Promotion

Status: **Proposed**
Decision owners: Software Architect, Test Architect, and Product Owner/Founder

## Context

Remembered content is not proof. Packet generation currently risks being counted as delivery, stale content can rank highly, and content patterns are weaker than typed verification evidence.

## Proposed decision

Represent authority, provenance, temporal validity, and independent verification explicitly. Filter context eligibility before relevance and enforce the 2,000-token limit after packing. Mark a source delivered only after provider acknowledgement. Require typed test/runtime/commit/accepted-ADR evidence for promotion and prohibit recalled content from validating itself.

## Consequences

Existing packet, injection, promotion, and metric models must migrate. Automatic gate-critical injection remains disabled until adversarial benchmarks and the Memetics canary pass.

This ADR is not accepted or baselined.
