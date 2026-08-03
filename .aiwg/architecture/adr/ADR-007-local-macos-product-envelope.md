# ADR-007: Local macOS Product Envelope

Status: **Proposed**
Decision owners: Software Architect, Operations Owner, Security Architect,
Configuration Manager, and Release Owner
Decision inputs: DEC-11, DEC-13, and DEC-14 from the
[Iteration 4 Local macOS Human Disposition](../../reports/iteration-4-local-macos-human-disposition-2026-07-28.md)

## Context

`deployment_target=local-macos` is a packaging and operations profile, not a
fourth semantic architecture configuration. It must apply independently to
C1, C2, and C3 without weakening strict-core policy, project isolation,
evidence, or rollback contracts. A local deployment can still make external
provider requests, so deployment location cannot stand in for processing
policy.

ADR-006 governs immutable data generations and transactional evidence. Loading
package layout, process ownership, LaunchAgent behavior, loopback exposure, and
instance isolation into that ADR would mix release lifecycle with data
atomicity. This ADR therefore proposes the local product envelope while
ADR-006 retains data-generation authority.

DEC-11 accepts the local development case as a development and evidence route
only. DEC-13 selects processing-policy Option A, and DEC-14 selects
bearer-authenticated viewer Option A. The qualification profile and
operations/support candidate remain inputs to this proposal, not architecture,
test, deployment, or implementation authority. Package paths, labels,
versions, ports, and lifecycle journeys still require their named independent
dispositions before they can become normative.

## Proposed decision

### Package and process topology

Install each verified runtime release immutably at:

```text
~/Library/Application Support/Agentmemory/releases/<runtime-release-id>/
```

Activate it through the atomic
`~/Library/Application Support/Agentmemory/current` pointer. Keep
project-scoped data, configuration, credentials, logs, backups, locks, and
generation pointers outside release directories.

Each admitted instance has exactly one user-owned LaunchAgent; the normal label
is `com.chronode.agentmemory`. It starts the supervisor from the exact active
release without shell interpolation or mutable `PATH` resolution. The
supervisor is the sole owner of one managed iii engine generation, one
worker/server generation, and, when selected, one C2/C3 compatibility-gateway
and C3 relay generation. The worker/server exposes the loopback API, streams,
MCP, and viewer surfaces and reports iii, worker, optional gateway/relay,
release, schema, configuration, and data-generation identities separately.
Neither a PID file nor a responsive port establishes ownership or readiness.

Startup order is:

1. acquire the instance lock;
2. verify runtime release, configuration, credential, and project-policy
   identities;
3. start or adopt only the ownership-marked iii engine;
4. start the ownership-marked worker/server;
5. start only the local gateway/relay roles required by the selected
   configuration;
6. reconcile sessions, event/attempt ledgers, queues, indexes, counts, and
   active data generations;
7. expose service readiness after required reconciliation; and
8. expose capture readiness only after the required worker is connected.

Shutdown reverses dependency order: stop gateway/API/MCP admission, drain
gateway and worker queues, reconcile and stop the relay, stop the gateway, stop
the worker/server, stop the owned iii engine, then release the instance lock.
Unowned or ambiguously owned processes are never signalled. LaunchAgent
bootout occurs only after every drain/stop attempt has a durable outcome.

### Local network and authorization boundary

API, streams, MCP, gateway, relay, viewer shell, viewer assets, and viewer-data
routes bind only to loopback. `GET /agentmemory/livez` is the sole
unauthenticated route. The static viewer shell and all viewer assets and data
routes, API, and MCP require bearer authentication under DEC-14 Option A; no
unauthenticated data-free-shell exception is part of this profile. Protected
operations require exact actor/capability, project-or-explicit-global scope,
operation/resource, identity generation, issuer/audience, key/nonce, validity,
and revocation binding.

Every viewer value and action displays its project or explicit-global scope,
named denominator, snapshot identity and observation time, and authorizing
actor/capability class. A later healthy render does not erase prior degraded,
recovering, unavailable, unauthorized, or 503 observations; the current state
and bounded transition history remain separately visible.

For C2 and C3, the compatibility gateway and receipt relay remain on the same
host, bind loopback only, use separate least-privilege identities, and cannot
be made off-host by configuration. Off-host gateway, relay, mesh, or public
viewer operation is deferred to a different deployment profile and decision.

### Project scope, processing policy, and external boundary

Persistent state is project-scoped by default. Explicit global state and
administration use a separate credential, visibly labelled scope, generation,
and audit event. Provider and mesh integrations are external boundaries even
when invoked from a local process.

Under DEC-13 Option A, processing policy is project-specific:

- `zero-egress` is the default: no external model, embedding, fallback,
  telemetry, content-processing, mesh, or relay-to-off-host attempt;
- `provider-enabled` requires an exact accepted provider manifest authorizing
  each provider, destination, purpose, data class, project, and session after
  minimization and redaction and before the attempt.

This decision input accepts no provider manifest and authorizes no provider
call. Malformed, conflicting, or ambiguous policy denies. Failure cannot switch
policy, provider, destination, or scope silently.

### Runtime and data activation

Runtime-release generation and data generation are separate immutable
identities and pointers. An upgrade transaction stages and verifies both,
records a compatibility pair, drains admission, activates the runtime pointer
and data pointer under one coordinated transaction, restarts, reconciles, and
commits only after authenticated health and project-scoped readback.

Failure converges to either the complete previous compatible pair or the
complete target compatible pair. Rolling back only one side is prohibited
unless the retained compatibility matrix explicitly proves that mixed pair and
the operator authorizes that bounded recovery action. Audit and failed-attempt
truth remain outside both reversible pointers.

A rollback subject derived from official upstream is prepared under a separate
explicit authorization, verified under an isolated immutable prefix, and never
inferred from the currently installed fork-derived package. Preparing or
qualifying that subject does not authorize changing the normal service. Any
switch of the normal LaunchAgent, active runtime pointer, credentials, ports,
or data generation requires a separate attributable service-switch decision.

### Normal, canary, and rollback isolation

The profile reserves:

| Instance | LaunchAgent label | API/MCP/viewer ports | Mutable state |
|---|---|---|---|
| Normal | `com.chronode.agentmemory` | `3111/3112/3113` | normal project registry and generations |
| Canary | `com.chronode.agentmemory.canary` | `3211/3212/3213` | isolated synthetic or authorized canary registry and generations |
| Rollback | `com.chronode.agentmemory.rollback` | `3311/3312/3313` | isolated rollback-qualification registry and generations |

Each instance has a distinct release activation pointer, engine port, secret,
policy, project registry, data-generation pointer, pidfile, lock, log root,
backup root, and ownership marker. No mutable runtime, credential, queue,
index, registry, or data path is shared.

## Railway tailoring

Prospective Railway deployment is outside the local package, qualification,
ABM, canary, and release denominators. Historical Railway deployment or secret
exposure remains a parallel `UNVERIFIED / NOT EVALUATED` security lane with a
named human owner required and currently unassigned; local architecture work
neither proves containment nor makes Railway investigation a predecessor to
local evaluation.

## Consequences

The local profile gains one auditable lifecycle and a finite loopback attack
surface, but must qualify package custody, LaunchAgent ownership, singleton
supervision, authenticated viewer bootstrap, runtime/data pair activation,
three-instance isolation, both processing policies, and exact uninstall.
Existing paths, labels, credentials, or processes are not adopted merely
because they resemble this proposal.

This ADR does not select C1, C2, or C3. It is not accepted or baselined and
does not close a veto, accept Stage A, pass ABM, or authorize implementation,
Construction, qualification, installation, service mutation, canary, release,
or deployment.
