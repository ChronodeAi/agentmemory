# ADR-005: Strict Core and Bounded Compatibility Transition

Status: **Proposed**
Decision owners: Software Architect, Security Architect, Provider Integration
Owner, and Release Owner

## Context

Immediate strict-only cutover has the simplest steady-state semantics but
legacy connector migration and rollback are not proven. Keeping compatibility
branches inside every core handler would expand downgrade and
confused-deputy risk. An external receipt sidecar cannot enforce in-process
privacy, project isolation, or atomic state transitions by observation alone.

## Candidate decision for evaluation

If this configuration survives hard vetoes, evidence-adjusted scoring, and
human selection, use a strict project-capability core as the only persistence, policy,
promotion, migration, and global-authority boundary. During a bounded
transition, terminate explicitly inventoried legacy identities and credentials
at a separately isolated compatibility gateway. The gateway resolves
owner-proven aliases, maps one canonical project, and mints short-lived
operation-bound capabilities.

Under `deployment_target=local-macos`, that gateway is a separately owned
local process or process role bound only to loopback. It uses an
instance-specific least-privilege identity and shares no mutable state,
credential, lock, queue, or generation pointer with normal, canary, or rollback
instances. Off-host gateway operation is deferred and cannot be enabled by
configuration in this profile.

No gateway operation allowlist is accepted. The candidate minimum is
project-scoped advisory recall, observational capture, and session lifecycle,
with every client/operation pair frozen before testing. The gateway receives no
administrator credential and cannot request global scope, serve gate-critical
context, fabricate delivery acknowledgement, suppress sources, promote
evidence, access mesh/provider authority, or run migration/restore. Every
compatibility use emits a redacted receipt with
client class, project, operation, outcome, revision, owner, and expiry. An
accepted zero-use threshold and deadline retire the gateway. The target state
is strict single mode.

An optional receipt sidecar may relay and index the core's transactional
outbox, but external placement does not establish independent custody and it is
not the security, isolation, atomicity, or enforcement authority.

For C3 under the local macOS profile, the relay also remains local and
loopback-only. Off-host relay or witness operation requires a separate
deployment profile and architecture decision.

Direct strict cutover and strict core with advisory receipt relay remain
unscored alternatives. This ADR records one candidate configuration and does
not recommend it before the accepted evaluation method runs.

## Consequences

The transition adds a temporary component, health surface, client inventory,
downgrade matrix, rollback path, telemetry, owner, and sunset obligation.
Strict core invariants remain finite and testable. Gateway isolation,
operation denial, receipt accuracy, expiry, and retirement require bounded
PoCs before this proposal can be accepted. Local placement reduces the exposed
network surface but does not relax authentication, project scope, egress
policy, evidence, or retirement obligations.

This ADR is not accepted or baselined.
