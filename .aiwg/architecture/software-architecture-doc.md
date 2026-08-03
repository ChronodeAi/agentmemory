# Software Architecture Document

Status: **DRAFT — NOT BASELINED**
Date: 2026-07-28
Decision owner: Software Architect, with Founder/Product, Security, Test, and Release concurrence
Disposition inputs: DEC-11, DEC-13, and DEC-14 from the
[Iteration 4 Local macOS Human Disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md)

## 1. Architectural objective

Complete the existing Universal Coding Memory branch as a local-first evidence
assistant with `deployment_target=local-macos` as an orthogonal package and
operations profile. Agentmemory owns episodic/procedural records; Codebase
Memory owns structural navigation. Git, live source, tests, accepted ADRs, and
direct runtime evidence remain authoritative. Local placement does not choose
C1/C2/C3 and does not imply zero egress. DEC-11 accepts the local development
and evidence route without accepting or baselining this SAD.
DEC-11, DEC-13, and DEC-14 close no veto, do not accept Stage A or pass ABM,
and authorize neither implementation nor Construction.

## 2. Lifecycle contract

| Stage | Required system behavior |
|---|---|
| Recall | Resolve canonical project and return scoped, attributable candidates |
| Verify | Compare candidates to the ordered authority hierarchy |
| Explore | Navigate the canonical Codebase Memory graph and live repository |
| Act | Capture bounded intent and tool events without secrets |
| Test | Attach typed test/runtime evidence, not content-pattern assertions |
| Record | Persist project, source, time, validity, and committed/uncommitted provenance |
| Promote | Require eligible independent evidence; recalled content cannot validate itself |
| Commit | Link eligible records idempotently and report the true denominator |
| Close | Close explicitly or mark stale sessions abandoned without deleting evidence |

## 3. Logical components

1. **Project identity registry** — credential-free normalized Git remote;
   owner-designated identity remote, persisted local repository UUID fallback,
   stable worktree UUIDs, and versioned alias routing with ownership and
   collision checks. A canonical-path hash is a bootstrap locator only.
2. **Scope guard** — project default, explicit audited global access, consistent filtering on retrieval, session, expanded-result, file-history, and commit-history interfaces.
3. **Capture gateway** — profile/exclusion evaluation, secret redaction,
   output bounds, complete canonical event identity, durable idempotency
   reservation/result, and bounded hook dispatch.
4. **Session service** — immutable project/worktree/privacy/policy bindings,
   authorized idempotent parent/child start/resume/close, lifecycle versions,
   and CAS-guarded stale-session handling.
5. **Evidence/provenance service** — authority class, source digest, observed
   time, validity interval/state, verification references, stable worktree
   UUID, append-only dirty event IDs, and exact dirty-to-commit transitions.
6. **Compactor** — rolling summaries plus a tamper-evident exact-facts ledger
   published with observations, indexes, and counts through one immutable
   generation.
7. **Retrieval/context service** — fail-closed scope, eligibility-first
   filtering, relevance ranking, provider-native delivery state, per-session
   acknowledged-source dedupe, typed source outcomes, a packet-wide maximum of
   five distinct qualified retrieved sources, and a hard 2,000-token final
   wire-image cap allocated at most 300/400/700/400/200 tokens to
   slots-profile/lessons/episodic/file-history/provenance.
8. **Promotion service** — typed evidence gates, independent-source rules, accepted-ADR requirement for architecture, and anti-self-reinforcement.
9. **Provider integration** — strict core capabilities, env-first
   configuration, secret-file auth, idempotent ownership/adoption-controlled
   MCP/hook merge with complete file-metadata rollback, bounded backpressure,
   and typed disabled-feature errors. C2 and C3 additionally propose a
   separately bounded, expiry-bound compatibility gateway with no global
   authority; C1 contains no compatibility gateway. Native-memory
   synchronization is a separate explicit user action with an exact
   project/source/destination binding and atomic destination activation.
10. **Health/viewer service** — required-dependency readiness, independent
    fetch and compatibility states, build identities, slot/project health,
    worker identity/backlog/replay/reconciliation, pressure/degradation
    semantics, scoped denominators, and truthful failure.
11. **Transactional evidence outbox** — atomically records state transitions
    and receipts; an optional sidecar may relay or witness them but is not the
    policy, isolation, or atomicity authority.
12. **Generation manager** — stages complete immutable state and derived-index
    data generations, validates them, activates one data pointer atomically,
    and restores or rolls back through pointer swaps.
13. **Local release supervisor** — activates one immutable runtime release
    through a separate pointer, owns the user LaunchAgent plus managed iii and
    worker generations, coordinates runtime/data pair activation, and isolates
    normal, canary, and rollback instances.

All persistence and operations remain iii-engine Function/Trigger/StateModule
based. The local profile manages iii as an owned child of the release
supervisor; an external, unowned iii process is never adopted or stopped
without an explicit ownership decision.

## 4. Evidence and eligibility

An item is gate-critical eligible only when:

- its project matches;
- it is not excluded, secret-bearing, expired, superseded, or contradicted;
- its authority class is known;
- provenance resolves to live committed state or an attributable uncommitted snapshot;
- required verification evidence exists;
- it was not derived solely from recalled Agentmemory content.

Selection filters eligibility before scoring relevance. Unverified memories may be shown in an explicit recall view with a warning but cannot be injected automatically into gate-critical packets.

## 5. Delivery protocol

Packet creation returns a packet ID, source IDs, eligibility decisions, and
expiry. Generation, local dispatch, provider-native acknowledgement,
suppression, and consumption are distinct states. Local stdout or stream-buffer
acceptance proves only `DISPATCHED_UNVERIFIED`. Only a matching provider-native
acknowledgement can atomically commit its exact source-suppression projection;
no reader observes one without the other. Late, duplicate, revoked, replayed,
wrong-issuer, wrong-attempt, and sibling-attempt receipts affect no unrelated
attempt. Failure, rejection, or timeout preserves truthful retry eligibility.
Consumption is never inferred.

## 6. Temporal and uncommitted provenance

Committed evidence records repository identity, commit SHA, path,
content/source digest, and observed time. Uncommitted evidence records
repository identity, stable worktree UUID, base commit, relative path, pre/post
digests, operation, event ID, invocation, dirty-state observation, and
expiry/supersession. Lifecycle-boundary Git reconciliation finds writes not
visible from tool inputs. A later commit references matching dirty event IDs
idempotently. Changed or missing source invalidates or supersedes the old
record.

## 7. Privacy and security

- Deployment target and processing policy are independent. Under DEC-13
  Option A, project-specific `zero-egress` is the default.
- `provider-enabled` requires an exact accepted provider manifest covering the
  provider, destination, purpose, data class, project, and session. No manifest
  or provider call is accepted by this Draft.
- Malformed, conflicting, or ambiguous policy fails closed and cannot silently
  enable provider processing.
- Zero-egress produces no external model, embedding, fallback, telemetry,
  content-processing, mesh, or off-host relay attempt.
- Provider-enabled mode authorizes exact provider, destination, purpose, data
  class, project, and session before each attempt and cannot silently fall
  back or change destination.
- Redaction/exclusion precedes every network transmission, durable write,
  index, provider attempt, audit write, viewer response, export, snapshot, and
  backup.
- Process environment precedes user and repository configuration.
- Secrets are read from environment or a secret file and never returned.
- Protected authority binds issuer, audience, subject, exact project or
  separately authorized global scope, operation/resource, identity generation,
  key/nonce, validity, and revocation state.
- Explicit global access and native-memory synchronization are audited.
- Required-backend operations fail closed; local fallback is limited to explicitly supported, typed modes.

## 8. Availability and performance

Telemetry distinguishes active, queued, rejected, dropped, failed, retried,
dispatched, acknowledged, and delivered events. Hook intake returns accepted
only after a durable event/attempt ledger exists. Bounded replay processes only
non-terminal matching events; startup reconciles sessions, observations,
ledgers, indexes, counts, and queue state before readiness. Bounded synchronous
retries are not described as fire-and-forget. Context-injecting hooks await
only within a declared timeout. Under the declared concurrent multi-agent
load, p95 hook latency must be below two seconds. Readiness becomes healthy
only after all required dependencies pass and three consecutive complete
recovery probes. Liveness, readiness, pressure, availability, compatibility,
and reconciliation remain separate. A later healthy state does not overwrite
the bounded transition history: unauthorized, timeout, transport, malformed,
stale, 503, unavailable, degraded, and recovering observations retain their
time and outcome. Top-level health and Doctor summaries retain every
subordinate warning/failure, affected scope and denominator, observation time,
and operator action; diagnostics do not authorize repair or migration.

## 9. External interoperability

Codebase Memory 0.9.1 uses a canonical `.codebase-memory/config.toml` with project identity, source roots, decision roots, excludes, and consistent path filters. Existing AIWG ADR roots remain included. Reindex, temporary aliasing, and duplicate-index retirement are external work owned by its maintainer. AIWG addon distribution and other-repository deployment are also external.

## 10. Local macOS deployment profile

This profile applies to every C1/C2/C3 configuration that survives the same 16
hard vetoes. DEC-11 accepts local macOS as the development and evidence route;
it does not accept the profile details in this Draft. The profile adds no
semantic option, closes no veto, and grants no architecture or implementation
acceptance.

### 10.1 Package and process topology

Verified releases are immutable below
`~/Library/Application Support/Agentmemory/releases/<runtime-release-id>/`.
The separate `current` pointer selects one release. Project data,
configuration, credentials, logs, backups, locks, and data-generation pointers
remain outside release directories.

Each admitted instance has exactly one user LaunchAgent; the normal label is
`com.chronode.agentmemory`. It starts one release supervisor. That supervisor
exclusively owns one managed iii engine, one worker/server generation, and the
local C2/C3 gateway/relay generations required by the selected configuration.
The worker/server exposes loopback API, streams, MCP, and viewer surfaces.
Startup acquires the instance lock; verifies release, configuration,
credential, and policy identities; starts owned iii; starts the worker; starts
the selected local gateway/relay roles; reconciles sessions, ledgers, queues,
indexes, counts, and data generations; then exposes service and capture
readiness separately.

Shutdown stops gateway/API/MCP admission, drains gateway and worker queues,
reconciles and stops the relay, stops the gateway, stops the worker/server,
stops only the owned iii engine, releases the lock, and only then completes
LaunchAgent bootout. Ambiguous or unowned processes are not signalled.

### 10.2 Local network, viewer, and authority

API, streams, MCP, viewer shell/assets/data, and any C2/C3 gateway or relay bind
only to loopback. `GET /agentmemory/livez` is the sole unauthenticated route.
The static viewer shell, its assets, all viewer-data paths, API, and MCP require
bearer authentication under DEC-14 Option A. There is no unauthenticated
data-free-shell exception.

Every viewer value and action must show exact project or explicit-global scope,
named denominator, snapshot identity/time, and authority. Viewer, project
health, and slot paths must resolve the same authenticated
project/snapshot/generation contract. A project view contains no global or
other-project durable material. The candidate live observations of 2026-07-28
showed a healthy/connected `v0.9.28` viewer with an unlabeled 595-session
aggregate while project-scoped health reported one session and
`globalUnscopedRecords=1887`; the same protected project slot list returned
HTTP 500, and repeated prior health 503 warnings remained in the browser
console before the healthy render. The current AIWG session context request
failed closed on project/session ownership; the existing project session
returned an empty context packet in 33 ms with zero tokens and zero source
IDs, bringing the project-health context-packet count to two. A later
diagnostic returned 14 pass, one
warning, and zero fail while reporting 595 sessions, 550 summaries, 2,060
semantic memories, 1,885 insights, zero lessons/procedural, and two of two
latest durable memories without project scope; top-level health/Doctor
remained healthy while project slot list/get returned HTTP 500. These
metadata-only observations are non-qualifying candidate evidence: they do not
establish the source of an aggregate, prove disclosure, change risk status,
authorize the suggested migration, or satisfy any contract.

### 10.3 Runtime/data coordination and instance isolation

Runtime-release generation and data generation have separate immutable IDs and
activation pointers. Upgrade and rollback use one coordination transaction
binding the old and target compatible pairs. Admission drains before pointer
changes; restart reconciliation and authenticated project readback complete
before commit. Any failure converges to the complete prior pair or complete
target pair. An unqualified one-sided runtime or data rollback is prohibited.
Audit truth remains outside both reversible pointers.

Normal, canary, and rollback instances use labels
`com.chronode.agentmemory`, `com.chronode.agentmemory.canary`, and
`com.chronode.agentmemory.rollback`; port sets `3111/3112/3113`,
`3211/3212/3213`, and `3311/3312/3313`; and separate release pointers, engine
ports, secrets, policy, project registries, data pointers, queues, locks, logs,
and backups. No mutable path or credential is shared.

C2/C3 gateways and the C3 relay remain same-host and loopback-only in this
profile. Off-host gateway, relay, mesh, viewer, API, or MCP operation is
deferred to a different profile.

### 10.4 Railway tailoring

Prospective Railway deployment is excluded from the local package,
qualification, ABM, canary, and release denominators. Historical Railway
deployment or exposure remains `UNVERIFIED / NOT EVALUATED` in a parallel
security lane; local progress neither proves containment nor depends on
closing that separate lane.

ADR-007 contains the proposed local product envelope. ADR-006 retains data
generation and transactional-evidence authority.

## 11. Iteration 4 configuration proposal

The current review candidate compares three complete configurations rather
than treating target semantics, migration compatibility, and receipt placement
as substitutes:

1. direct strict cutover with embedded transactional evidence;
2. strict core with a temporary compatibility gateway and embedded evidence;
3. the same strict core/gateway plus an out-of-process receipt relay, which
   remains same-host and loopback-only in the local profile.

No configuration is preferred or scoreable yet. Configuration 2 must first
freeze its exact legacy client and operation allowlist; configuration 3 must
justify the relay without assuming independent custody or authority from
external placement alone.

Detailed contracts, vetoes, evidence-adjusted scoring, and PoC sequencing are
in `.aiwg/architecture/architecture-evolution-iteration-4.md`.

## 12. Unresolved decisions

All ADRs in `.aiwg/architecture/adr/` are Proposed. Project identity ownership,
local repository UUID custody, capability issuers/revocation, compatibility
inventory/sunset, provider-native acknowledgement, exact evidence schema,
required dependency classes, generation manifest, RPO/RTO, health window,
declared concurrency, retention, local package/path adoption and ownership,
runtime/data compatibility matrix and coordination recovery, credential
bootstrap, exact provider-manifest contents/owners, native-memory destinations,
session lifecycle authority/versioning, exact-event identity, compaction
integrity authority, worker supervisor/replay ownership, and Codebase Memory
alias runbook require named-owner evidence and human acceptance before
baseline. DEC-13 selects the zero-egress-default policy model and DEC-14 selects
bearer-authenticated viewer Option A, but neither accepts an ADR or baselines
this SAD. C1/C2/C3, gateway inventory/sunset, exact provider manifests,
bearer-token issuance/bootstrap, off-host profiles, and historical Railway
containment remain unresolved human decisions.
