# ADR-003: Privacy, Provider Integration, and Sustained Health

Status: **Proposed**
Decision owners: Security Architect, Software Architect, and Release Owner
Decision inputs: DEC-13 and DEC-14 from the
[Iteration 4 Local macOS Human Disposition](../../reports/iteration-4-local-macos-human-disposition-2026-07-28.md)

## Context

Provider hooks can block, config repair can overwrite unrelated settings, secrets can leak through telemetry, and process liveness can be mistaken for service health.

## Proposed decision

Enforce process-environment precedence, pre-boundary redaction/exclusion, and
secret-file authentication. `deployment_target=local-macos` does not imply
zero egress. Under DEC-13 Option A, processing policy is project-specific and
`zero-egress` is the default. `provider-enabled` requires an exact accepted
provider manifest, and every provider, fallback, hook, relay, and mesh attempt
requires a project-scoped policy decision. Zero-egress emits zero external
attempts. The accepted manifest must authorize the exact provider,
destination, purpose, data class, project, and session before each attempt.
This decision input accepts no manifest and authorizes no provider call.
Malformed, conflicting, or ambiguous policy, silent fallback, and DNS
uncertainty fail closed.

Protected capabilities bind issuer, audience, subject, exact canonical project
or separately authorized global scope, operation/resource, identity
generation, key/nonce, validity window, and revocation state. Any mismatch or
uncertainty denies without domain mutation.

Merge only ownership-marked or explicitly adopted MCP/hook entries
idempotently and preserve complete provider-file bytes/metadata on rollback;
policy-safe backups cannot disclose secrets. Bound hook backpressure and
report active, queued, rejected, dropped, failed, retried, dispatched, and
acknowledged states truthfully. Required server-backed operations fail closed.
Health separates liveness, required-dependency readiness, pressure, viewer
availability, compatibility, backend/viewer build, slots, and project metrics.
For the local macOS profile, `GET /agentmemory/livez` is the sole
unauthenticated route; the static viewer shell, assets, viewer-data, API, and
MCP routes require bearer authentication under DEC-14 Option A and are
loopback-bound. Viewer values and actions expose exact project or
explicit-global scope, denominator, snapshot/time, and authority. A healthy
render cannot erase the bounded degraded/recovery history that led to it.

Any future public deployment profile requires an injected secret before
binding and publishes only the authenticated API by default. It is not part of
the local macOS profile.

Automatic provider-native memory writes are disabled. An explicit sync binds
actor, project, immutable source set, destination, policy, and action nonce,
then stages and atomically activates a verified destination while preserving
the prior image on failure.

Hook acceptance requires a durable attributable event/attempt state. One
supervisor owns one worker generation; restart replays only non-terminal
matching events and reconciles sessions, observations, ledgers, indexes,
counts, and queue state before readiness can recover.

## Consequences

Release evidence must include pre-transport secret fixtures, complete provider
recording sinks, connector rollback, mesh/DNS denial, concurrency/load,
sustained soak, required-worker failure, service recovery and transition
history, native-memory two-project and destination-failpoint tests,
accepted-hook crash/replay and dual-start tests, authenticated static-shell and
viewer-data tests, and viewer/slot scope/authority/availability/compatibility
tests. Prospective Railway
deployment is tailored out of the local profile; historical Railway exposure
remains `UNVERIFIED / NOT EVALUATED` in a parallel security lane and is not
resolved by this ADR.

This ADR is not accepted or baselined. DEC-13 and DEC-14 do not select C1,
C2, or C3; close a veto; accept Stage A; pass ABM; or authorize implementation
or Construction.
