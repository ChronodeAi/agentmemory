# ADR-003: Privacy, Provider Integration, and Sustained Health

Status: **Proposed**
Decision owners: Security Architect, Software Architect, and Release Owner

## Context

Provider hooks can block, config repair can overwrite unrelated settings, secrets can leak through telemetry, and process liveness can be mistaken for service health.

## Proposed decision

Enforce process-environment precedence, strict local processing, pre-write redaction/exclusion, and secret-file authentication. Merge only owned MCP/hook entries idempotently. Bound hook backpressure, return typed disabled-feature errors, and make required server-backed operations fail closed. Health reports sustained backend state, pressure, compatibility, backend build, viewer build, slots, and project metrics.

## Consequences

Release evidence must include secret fixtures, connector rollback, concurrency/load, sustained soak, service failure, and compatible viewer/backend identity tests.

This ADR is not accepted or baselined.
