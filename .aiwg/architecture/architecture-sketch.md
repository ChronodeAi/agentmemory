# Architecture Sketch

Status: Proposed; not baselined

## Boundaries

```text
Codex / Claude
  -> connector + bounded lifecycle hooks
  -> authenticated MCP / REST boundary
  -> project identity + read/write scope guard
  -> eligibility and context-delivery service
  -> iii-engine Functions / Triggers
  -> StateModule SQLite

Git + live source + tests + accepted ADRs + runtime
  -> verification/provenance authority

Canonical Codebase Memory graph
  -> structural navigation only
```

## Core policy

- Agentmemory recall is unverified until checked against higher-ranked authority.
- Every observation has canonical project identity, source identity, capture time, validity state, and committed/uncommitted provenance.
- Packet ranking filters eligibility before relevance and token packing.
- Delivery state changes only after provider acknowledgement.
- Promotion requires typed evidence references and cannot cite recalled output as verification.
- Provider configuration is merged idempotently, with process environment taking precedence.
- Health is sustained and layered: process, backend, compatibility/build identity, viewer, slots, and project metrics.
