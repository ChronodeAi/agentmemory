# Architecture Evolution: Iteration 4 Review Candidate

Status: **REVIEW CANDIDATE - NO ARCHITECTURE ACCEPTANCE**
Date: 2026-07-28
Candidate:
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Evidence freeze:
`.aiwg/reports/iteration-4-evidence-freeze.md`

## 1. Decision boundary

This artifact records architecture analysis, measurable proposed contracts,
configuration alternatives, hard vetoes, and evidence needs. It does not
accept an option, change any ADR from Proposed, baseline the SAD, change a risk
status, pass ABM, authorize Construction, or authorize deployment.

The existing ABM FAIL / NO-GO remains authoritative. Product implementation is
limited to separately approved, disposable, bounded P0/P1 PoCs until a human
architecture decision, an independent ABM PASS, and separate Construction
authorization exist.

DEC-11 accepts the
[local development case](../planning/development-case-local-macos.md) as the
local macOS development and evidence route only. DEC-13 selects
processing-policy Option A, and DEC-14 selects bearer-authenticated viewer
Option A, as recorded in the
[human disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md).
The qualification profile and operations/support candidate dated 2026-07-28
remain candidate inputs here. None of these dispositions accepts requirements,
architecture, test authority, deployment authority, evidence, Stage A, ABM,
or Construction.

## 2. Review method

Four separately scoped reasoning sessions were configured through the
project's premium wrapper and reviewed disjoint contract families against the
candidate. Codebase Memory graph discovery preceded direct source verification.
Provider-observed model identity and raw-output digest evidence were not
available, so these sessions are advisory inputs rather than independently
qualified reviewers. The configured scopes were:

| Worker | Scope |
|---|---|
| `019f9e7d-9d12-74a2-af35-6af9ca01ab6f` | Authentication, secret flow, privacy, egress, observability, Railway |
| `019f9e7d-c8ca-7a71-99ef-b498c86c9643` | Context delivery, degradation, readiness, eligibility, promotion, viewer |
| `019f9e7d-ea1a-7cd3-9fc7-5feba313433d` | Identity, capabilities, provenance, migration, restore, graph, mesh |
| `019f9e7e-118e-7433-beab-7b4e8c6d9228` | Independent governance, option coherence, testability, self-approval traps |

Worker findings are advisory. Human decision owners remain Software,
Security, Test, Product, Configuration, Operations, and Release owners as
assigned by the SAD, ADRs, risk register, and MTP.

## 3. Corrected decision model

The original three options mixed different architectural axes:

- strict single-mode described target semantics;
- a compatibility gateway described a transition mechanism; and
- a receipt sidecar described evidence placement.

They are not mutually exclusive peers. A strict core can use a temporary
gateway and an embedded transactional outbox that relays receipts to a
sidecar. Treating these as direct substitutes would create a false choice.

The architecture decision must separately resolve:

1. **Semantic authority:** strict, project-scoped, fail-closed core invariants.
2. **Compatibility strategy:** direct cutover or bounded temporary gateway.
3. **Evidence placement:** embedded atomic outbox, optionally relayed to an
   external read model or witness.
4. **State transition strategy:** generation-fenced migration, exact restore,
   and separately reversible client/runtime/data transitions.
5. **Deployment profile:** local package/process/network/lifecycle constraints
   applied orthogonally to every semantic/transition/evidence configuration.

For this iteration, `deployment_target=local-macos` is the only prospective
release profile. It is not C4, does not select C1/C2/C3, and does not equate
local placement with zero egress. ADR-007 records its Proposed product
envelope; ADR-006 retains data-generation and transactional-evidence authority.

## 4. Configurations for evidence-based comparison

Every configuration below is evaluated under the same local macOS profile:
immutable release packaging, one user-owned LaunchAgent/supervisor, managed iii
and worker generations, bearer-authenticated loopback surfaces except
`GET /agentmemory/livez`, project-scoped state, zero-egress-default processing
with an exact accepted provider manifest required for `provider-enabled`,
coordinated runtime/data activation, and isolated normal/canary/rollback
instances.

### C1 - Direct strict cutover with embedded evidence

- Exact-project capabilities and one project-scoped policy authority.
- Required failures fail closed; optional failures are typed.
- Provider-native acknowledgement controls source suppression.
- Generation-fenced state migration and exact restore.
- Receipts commit with governed state through an embedded transactional
  outbox.
- No legacy shared-secret path.

This is the simplest proposed steady state and the hardest immediate client
cutover.

### C2 - Strict core with a temporary compatibility gateway

- The C1 core remains unchanged and rejects legacy credentials.
- A separately bounded gateway accepts only inventoried legacy client classes,
  maps them to one project, and mints short-lived operation-bound
  capabilities.
- No operation allowlist is accepted. The candidate minimum is project-scoped
  advisory recall, observational capture, and session lifecycle. Every allowed
  operation must be frozen by client class and accepted by strict-core
  capability policy before testing.
- The gateway has no administrator credential, cannot request global scope,
  cannot serve gate-critical context, fabricate acknowledgement, suppress
  sources, promote evidence, access mesh/provider authority, or run
  migration/restore.
- Each compatibility use records client class, project, operation, outcome,
  gateway revision, owner, and expiry without credential material.
- The gateway has an accepted zero-use retirement threshold and deadline.
- Under the local macOS profile the gateway is same-host, loopback-only,
  separately owned, and unable to enable off-host operation by configuration.

This configuration is unscored and has no advisory preference until its exact
operation allowlist, evidence, and MCDA result are frozen.

### C3 - Strict core, temporary gateway, and external receipt relay

- C2 remains the enforcement architecture.
- An embedded transactional outbox remains the atomic receipt authority.
- A sidecar relays and indexes receipts as an advisory read model for audit and
  replay.
- Sidecar lag, retention, reconciliation, bypass prevention, restart, and
  availability become governed operational surfaces.
- Under the local macOS profile the relay is same-host and loopback-only.
  Off-host relay or witness operation is deferred to a different profile.

Here, external means outside the strict-core process boundary; it does not mean
off-host under `deployment_target=local-macos`.

An external sidecar without an embedded atomic outbox is vetoed because runtime
state and evidence can commit in different crash windows.
External placement alone does not establish independent custody, signing
authority, compromise isolation, or enforcement authority. A kill switch or
other enforcement role requires a separate architecture decision.

## 5. Hard vetoes

A configuration is not scoreable while any of these conditions is present:

All 16 vetoes remain open. DEC-11, DEC-13, and DEC-14 choose a development
route and two candidate-policy options; they supply no proof and close no veto.

1. Cross-project disclosure or ambiguous project identity.
2. Raw secret disclosure or prohibited external processing.
3. Unauthenticated protected operation, including a proxy failure that
   silently downgrades to unauthenticated local authority or storage.
4. Required failure reported as success or false healthy/readiness.
5. Fabricated acknowledgement or source suppression without a provider-native
   acknowledgement.
6. Recalled-only or unresolved metadata promoted as fresh authority.
7. Mixed migration generation, non-exact restore, or rollback that loses audit
   truth.
8. Incomplete or stale interface, state, fixture, or test denominator.
9. Silent compatibility downgrade, missing owner/expiry, or gateway possession
   of global authority.
10. Bypassable evidence, non-atomic state/receipt coupling, or unreconciled
    sidecar lag.
11. A contract without observable outputs, deterministic fault injection, and
    bounded acceptance criteria.
12. Missing independent evidence verification or required human authority.
13. Automatic native-memory synchronization, project-blind source selection,
    or destination mutation without one explicit attributable user action.
14. Caller-controlled session, worktree, parent, privacy, or processing-policy
    mutation; cross-project lineage; or stale closure without a version/CAS
    guard.
15. Prefix-only or process-local dedupe represented as durable success, or
    compaction that can expose mixed generations or an integrity-unbound exact
    facts ledger.
16. A hook event accepted without a durable terminal disposition, bounded
    replay, singleton worker ownership, and startup reconciliation before
    readiness.

### 5.1 Local macOS applicability matrix

The local profile retains all 16 vetoes. `NOT_APPLICABLE` does not remove a
veto or denominator: C1 uses an absence/alternative-control proof for
gateway/relay-specific behavior, while C2/C3 prove the component itself.

| Veto | Local applicability | Required local-profile proof |
|---:|---|---|
| 1 | C1/C2/C3 | Two canonical projects, collision fixtures, project-scoped package state, and viewer/API/MCP/slot isolation |
| 2 | C1/C2/C3 | Synthetic-secret all-sink scan plus complete zero-egress and provider-enabled attempt recordings |
| 3 | C1/C2/C3 | `GET /agentmemory/livez` as sole unauthenticated route; bearer-authenticated static shell/assets/data, API, MCP, proxy, gateway, and relay |
| 4 | C1/C2/C3 | LaunchAgent/iii/worker loss, slot HTTP 500, diagnostic warning, prior 503, recovery, and no-false-healthy matrix |
| 5 | C1/C2/C3 | Provider-native acknowledgement and exact suppression transaction; local stdout/browser render proves neither |
| 6 | C1/C2/C3 | Gate-critical eligibility/lineage corpus independent of recalled local memory |
| 7 | C1/C2/C3 | Immutable data generation plus coordinated runtime/data pair activation, exact restore, rollback, and retained audit truth |
| 8 | C1/C2/C3 | Complete package, process, route, shell/asset/data, state, fixture, diagnostic, lifecycle, and test denominators |
| 9 | C2/C3 component proof; C1 absence proof | Loopback gateway isolation, exact client/operation inventory, owner/expiry/sunset; C1 proves no gateway/legacy path exists |
| 10 | C3 relay proof; C1/C2 embedded-path proof | Atomic embedded outbox for all; C3 local relay lag/reconciliation/bypass proof; C1/C2 prove no relay dependency |
| 11 | C1/C2/C3 | Deterministic failpoints and bounded outputs for setup, auth, policy, lifecycle, health, generation, upgrade, rollback, and uninstall |
| 12 | C1/C2/C3 | Independent accepted-profile evidence and attributable human decisions; local execution cannot self-accept |
| 13 | C1/C2/C3 | Automatic paths produce zero native writes; explicit sync is exact-project, attributable, and destination-atomic |
| 14 | C1/C2/C3 | Immutable session/worktree/policy bindings and deterministic lifecycle CAS/interleaving proof |
| 15 | C1/C2/C3 | Full-event durable dedupe and atomic compaction-generation failpoint/concurrent-reader proof |
| 16 | C1/C2/C3 | One supervisor/worker generation, accepted-event durability, singleton exclusion, bounded replay, and startup reconciliation |

## 6. Proposed measurable contracts

These clauses are proposed and remain non-authoritative until accepted.

### 6.1 Canonical project and worktree identity

Canonical remote form is `host[:non-default-port]/repository-path`. Strip
scheme, user information, credentials, query, fragment, trailing slash, and
terminal `.git`. Lowercase the host, preserve path case, and Unicode-normalize
the path. An owner-verified alias may map a case-insensitive hosting input to
canonical spelling; raw input is not simply lowercased.

Equivalent SCP, SSH, and HTTPS transport forms map to the same repository.
Distinct hosts, non-default ports, and case-sensitive paths remain distinct.
Multiple remotes require an explicitly designated identity remote; conflicting
remote identities without designation fail closed.

An explicit configured `project_id` must already be canonical or resolve
through a collision-checked, ownership-proven alias registry. Configuration
precedence does not imply identity authority. Worktrees share the project ID
and use a separate stable `worktree_uuid`. For a repository without a remote,
persist `local/<repository_uuid>`; a canonical-path hash is only a bootstrap
locator because moves and separate worktrees split it.

Alias records are versioned routing metadata, never new persisted record
identities. Alias chains, cycles, multiple owners, and one alias mapping to
multiple canonical identities fail closed.

The candidate currently prefers `origin`, lowercases some hosting paths, uses
a physical worktree-path fallback, and permits configured IDs without an
ownership registry (`src/project-config.ts:147-176,289`).

### 6.2 Policy authority, capabilities, and authentication

Every protected ingress, durable write, export, provider request, mesh
request, and external hook delivery passes through one project-scoped policy
decision point. Missing or unavailable policy state denies the operation.

`GET /agentmemory/livez` is the complete unauthenticated allowlist. Detailed
health and every other REST/MCP operation require authentication. Core project
operations accept only capabilities bound to exact project, audience, expiry,
and operation class. Header, body, query, and tool-argument project bindings
must agree.

Global access requires explicit `scope=global`, a separate administrator
credential, and a metadata-only audit event. Compatibility infrastructure
never receives that credential.

Once authenticated proxy mode is selected, authentication, authorization,
project-binding, required-backend, and protected-operation failures return a
typed failure and cannot execute through local fallback. An optional offline
mode, if accepted, is selected explicitly before invocation, has a frozen
project-scoped advisory allowlist, uses a distinct state/provenance identity,
reports degraded mode, and has no global, delete, export, audit, migration,
promotion, or gate-critical authority.

Capabilities contain only canonical project IDs. Required claims are issuer,
audience, subject or peer, canonical project, allowed operations, `iat`, `nbf`,
`exp`, `jti`, key ID, and identity-registry generation. Verification enforces
maximum lifetime, clock skew, key status, revocation, operation scope, and
exact canonical-project equality. Administrative-global, mesh-peer, and
project capabilities use separate issuers and keys.

### 6.3 Secret sources and pre-boundary redaction

Secrets originate only from injected environment values, approved secret
files, or platform secret references. Missing or unreadable required secrets
refuse protected admission; they never disable authentication.

Exclusion and redaction occur before network transmission, persistence,
indexing, provider invocation, audit storage, viewer/API response, export,
snapshot, or backup. The same sanitizer governs logger, stderr, exception, and
hook-delivery paths. Secret values never appear in logs, receipts, health,
telemetry, deployment instructions, or failure remnants.

### 6.4 Privacy and egress

Every external attempt carries project, session, provider, purpose, data
class, provenance, processing location, and policy decision. Provider fallback
and substitution obtain a fresh decision for every attempt. Strict/local
policy results in zero external attempts.

Mesh destinations deny credentials in URLs, local/private addresses, DNS
failure, and private-address resolution. Mesh uses a dedicated least-privilege
peer credential rather than the administrator credential.

### 6.5 Context delivery

Ordinary context construction is exact-project only. Global administration is
a separate authorized operation and never a packet scope or fallback.
Authoritative project/session/privacy/external-processing policy resolves
before any candidate source is opened. Qualification order is scope,
authority, temporal validity, provenance, exclusion/privacy, completeness,
acknowledged history, then relevance.

The final serialized wire image after sanitization, labels, truncation, and
provenance is at most 2,000 actual tokens under the accepted tokenizer/profile.
The profile maxima are 300 tokens for slots/profile, 400 for lessons, 700 for
episodic results, 400 for file history, and 200 for provenance. Unused capacity
is not silently shifted. The packet contains at most five distinct qualified
retrieved source records; fixed identity/profile fields are not retrieved
records. Duplicate, low-relevance, and exact-session acknowledged sources
contribute zero bytes and receive typed omission reasons.

```text
GENERATED -> DISPATCHED_UNVERIFIED -> ACKNOWLEDGED_SUPPRESSED
          \-> DISPATCH_FAILED -> retry
GENERATED or DISPATCHED_UNVERIFIED -> EXPIRED or REJECTED
```

- `GENERATED` binds packet, project, session, source digest, context hash,
  policy version, expiry, and dispatch attempt.
- `DISPATCHED_UNVERIFIED` binds a transport attempt and recipient. Local
  stdout or stream-buffer acceptance cannot advance beyond this state.
- `ACKNOWLEDGED` requires a provider-native receipt bound to packet, attempt,
  project, session, context hash, nonce, issuer, and expiry.
- Receipt acceptance and `SUPPRESSED` commit in one atomic, idempotent
  control-plane transaction. The state labels remain analytically distinct,
  but no reader can observe accepted acknowledgement without its exact
  source/session projection.
- Invalid, expired, rejected, timed-out, duplicate, or failed receipts
  suppress zero additional sources.
- Late, sibling-attempt, revoked, replayed, wrong-issuer, and wrong-attempt
  receipts close only their matching attempt or return its existing terminal
  result; they never change another attempt's retry, suppression, or
  consumption state.
- Consumption is separate and is never inferred from acknowledgement.

The current pre-compact hook writes context to stdout and then signs its own
acknowledgement. That proves local ordering only, not provider-native receipt
or consumption (`src/hooks/pre-compact.ts:46-51,100-184`).

### 6.6 Context source outcomes and readiness

Every dependency outcome is one of:

`READY`, `EMPTY_VALID`, `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, or `ERROR`.

Each outcome records requirement class, time, latency, item count, error code,
and digest. Valid-empty data is not dependency unavailability.

```text
UNKNOWN, UNAVAILABLE, or DEGRADED -> RECOVERING first complete success
RECOVERING -> RECOVERING                 second consecutive complete success
RECOVERING -> HEALTHY                    third consecutive complete success
HEALTHY -> DEGRADED                      optional failure or pressure
HEALTHY, DEGRADED, or RECOVERING -> UNAVAILABLE required failure/stale/timeout
RECOVERING -> DEGRADED                   optional failure
```

- Detection window: one 30-second probe interval.
- Snapshot TTL: 45 seconds from the latest complete probe.
- Any failed sample resets the recovery streak.
- Healthy/degraded maps to HTTP 200; unavailable maps to 503.
- Gate-critical context requires healthy readiness.
- Advisory context may be degraded with complete typed metadata.
- Unavailable context produces no packet, suppression, or promotion evidence.

Aggregate dependency rules:

| Requirement | Outcome | Readiness contribution |
|---|---|---|
| Required | `READY`, `EMPTY_VALID` | Pass |
| Required | `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, `ERROR` | `UNAVAILABLE` |
| Optional | `READY`, `EMPTY_VALID` | Pass and complete |
| Optional | `DISABLED`, `NOT_REQUESTED` | Pass with explicit policy omission; completeness is false |
| Optional | `TIMEOUT`, `ERROR` | `DEGRADED`; completeness is false and packet is non-promotable |

Each probe has a monotonic sequence and observation time. `RECOVERING` is
non-healthy and maps to HTTP 503. Recovery transitions only on the third
complete success; no alternate one-probe transition exists.

The candidate currently collapses some valid-empty reads into unavailable and
checks worker readiness largely through a nonempty worker list
(`src/functions/coding-memory.ts:395-426,765-821`;
`src/health/monitor.ts:82-135`).

### 6.7 Eligibility and promotion lineage

Eligibility is `ELIGIBLE`, `INELIGIBLE`, or `INDETERMINATE` with policy
version/digest and machine-readable reason codes.

A candidate is eligible only when project identity, authority class, temporal
validity, secrecy policy, supersession state, committed or attributable
snapshot provenance, verification receipt, lineage independence, and required
human acceptance resolve positively. An identifier is a locator, not
provenance. Gate-critical `INDETERMINATE` fails closed.

Promotion uses an immutable lineage DAG containing claim digest, evidence
artifact digests, issuer, project, evidence type/status/time, parent edges,
policy version, independence set, and any human-authority receipt.

```text
DETECTED -> LINEAGE_VALIDATED -> PENDING_APPROVAL or AUTO_READY
         -> PERSISTING -> PROMOTED
         -> REJECTED or QUARANTINED
```

Persistence requires an idempotency key and transactional outbox. Candidate
tests cannot mint human acceptance. The current implementation permits several
unresolved identifier strings to stand in for provenance and uses free-form
concept metadata in promotion lineage
(`src/functions/coding-memory.ts:219-316`;
`src/functions/promotions.ts:156-348,699-805`).

### 6.8 Dirty-to-commit provenance

Each append-only dirty receipt binds event ID, canonical project, stable
worktree UUID, base commit, relative path, pre/post blob digests, operation,
observed time, session, and invocation. Lifecycle-boundary Git status/diff
reconciliation detects shell and script writes that tool-input capture misses.

Commit receipts reference the exact dirty event IDs they supersede. Matching
requires project, worktree, path or rename chain, base ancestry, and blob
digest. Unmatched evidence remains dirty or uncertain; it is never represented
as clean.

```text
observed_dirty -> superseded_dirty | committed | deleted | expired_unlinked
```

The eligible denominator and exclusions are emitted before calculating the
required 95% linkage rate. Current dirty capture and post-commit capture have
separate tests but no complete event-to-commit lineage proof
(`src/hooks/_capture.ts:117-186`; `src/hooks/post-commit.ts:36`).

### 6.9 Migration, snapshot, and restore generations

The operation boundary is one complete project generation or an explicitly
global generation that covers every project and control-plane namespace.
`generation_id` binds canonical boundary, schema version, source-manifest
hash, alias-registry generation, and build SHA.

All reversible project records, dynamic namespaces, graph/search/vector
indexes, and project ledgers stage under an immutable generation. Counts, hashes,
referential integrity, canonical identity, quarantine count, and rebuilt
indexes validate before one compare-and-swap activates `active_generation`.

Readers pin `active_generation` once per request. Writers are fenced or
explicitly dual-written under a lease. Rollback is a pointer swap to the
immutable previous generation; per-record compensation is cleanup evidence,
not the primary rollback mechanism. Snapshot creation pins one generation.
Restore stages and verifies a new generation before pointer activation.

An append-only control-plane audit lineage and transactional evidence outbox
remain outside the reversible generation pointer. They bind every staged,
activated, failed, rolled-back, retained, and garbage-collected generation.
Rollback changes active data visibility but cannot hide the attempt, failure,
previous/target generation identities, or rollback event.

The candidate migration journal promotes targets individually and can end
rollback-incomplete; snapshot capture can discover namespaces while state
changes, and restore mutates live records before compensation
(`src/functions/migrate.ts:141-249,432,709`;
`src/functions/snapshot.ts:398,507,567,719`). A journal ID is not yet a
reader-atomic storage generation.

### 6.10 Graph, mesh, and Codebase Memory aliasing

Every graph and mesh record uses a canonical project. Mesh peers require
allowed scopes, direction, peer ID, expiry, dedicated peer capability, and
identity-registry generation. Inbound records, relations, and edges validate
project and endpoints before staging. Each sync batch activates atomically or
is quarantined. Global federation requires a separately accepted contract and
is never the default.

The current mesh surface can permit broad scopes, reuse administrative
authority, and receive records without the complete canonical-project,
peer-filter, relationship, and generation contract
(`src/functions/mesh.ts:57,196,338`).

A temporary Codebase Memory alias routes to the same physical index and
generation; it never creates a copied index. Require one writer lease,
identical roots/filters/source revision, canonical/alias result equality over
the frozen 20-query manifest, complete consumer cutover inventory, and
rollback that removes routing only. Duplicate-index retirement remains a
later, separately authorized operation.

### 6.11 Observability truthfulness

Telemetry distinguishes active concurrency, queued, rejected, dropped, failed,
retried, dispatched, acknowledged, and delivered events. An active-operation
counter is not queue depth. Every abandoned observational delivery receives a
bounded, redacted disposition; failure is not converted into success.

Receipts include revision, configuration digest, profile, fixture manifest,
policy metadata, counts, operator, signer, and disposition without raw content
or credentials. Receipt failure never relaxes a deny decision.

No-write means zero packet, source, suppression, promotion, native, connector,
provider, or project-domain mutation. A denied, disabled, or failed operation
may append exactly one bounded redacted control-plane denial receipt. That
receipt is not a domain effect; failure to persist it cannot convert denial to
success or trigger fallback.

### 6.12 Viewer availability and compatibility

Viewer fetch state is `OK`, `UNAUTHORIZED`, `TIMEOUT`, `TRANSPORT_ERROR`,
`MALFORMED`, or `STALE`. Compatibility is separately `COMPATIBLE`,
`INCOMPATIBLE`, or `NOT_EVALUATED`.

Authenticated health that cannot be obtained or is stale/malformed makes
viewer readiness unavailable. A build mismatch is incompatible, not
unavailable. Last-known-good data remains visibly stale with observation time
and cannot render as healthy.

The candidate browser currently collapses non-2xx and transport failures into
one null path, allowing availability and incompatibility to be confused
(`src/viewer/index.html:1257-1277,1410-1451`).

### 6.13 Railway profile

Prospective Railway deployment is not part of
`deployment_target=local-macos`; its package, public binding, secret bootstrap,
viewer publication, qualification, ABM, canary, and release rows are deferred
and contribute neither pass nor failure to the local denominator.

Historical deployment status and prior secret exposure remain
`UNVERIFIED / NOT EVALUATED` in a parallel security lane. Only a separately
authorized human Railway owner may provide metadata-only disposition evidence.
Local review cannot claim historical non-deployment or containment and does not
run Railway access, rotation, log retrieval, or purge.

### 6.14 Explicit native-memory synchronization

Automatic native-memory writes are disabled. One explicit user action binds
actor, canonical project, immutable source IDs, destination, policy version,
action nonce, and expected destination pre-image. Project-blind, global,
legacy-unscoped, derived-only, and unlisted sources are ineligible.

The destination is staged, sanitized, verified, fsynced where supported,
atomically activated, and read back before success. Every failure leaves the
byte-identical pre-image and records one redacted attributable outcome.
Session end, compaction, restart, promotion, connector repair, and API
configuration alone authorize zero native-memory writes.

The candidate bridge lists every latest memory without an exact project filter
and overwrites one configured file (`src/functions/claude-bridge.ts:114-145`);
an API route can invoke the same write path
(`src/triggers/api.ts:2234-2255`). R-19 therefore remains an open P1 veto.

### 6.15 Session lifecycle identity integrity

A session receives immutable canonical project, stable worktree UUID, privacy,
capture profile, and external-processing bindings at creation. Resume,
parenting, mutation, and closure require authority for the existing binding
and an expected lifecycle version. Parent and child must share project and
valid worktree policy; missing, self, stale, or cross-project parents mutate
neither endpoint.

Create/resume/parent/close commits one linearizable lifecycle transaction.
Stale closure uses the same lock or compare-and-swap guard as resume. A
rejected or superseded operation preserves byte-identical lifecycle state and
emits one typed receipt.

The candidate resume path can replace caller-supplied cwd, parent, privacy,
capture, and external-processing fields, while stale closure performs an
unversioned set (`src/functions/session-lifecycle.ts:20-45,47-135`). R-20
remains an open P1 veto.

### 6.16 Durable exact-event capture identity

Capture identity hashes the complete canonical admitted event plus schema and
fingerprint versions. Reservation, duplicate decision, observation, indexes,
counts, stream/audit/outbox effects, and terminal result commit atomically or
remain durably incomplete and retryable. Concurrency and restart cannot turn
an incomplete event into duplicate success.

The candidate hashes only the first 500 input and output characters and keeps
dedupe state in a process-local map (`src/functions/dedup.ts:11-66`).
Observation persistence, dedupe recording, stream delivery, count updates,
and indexes then occur in separate steps
(`src/functions/observe.ts:71-555`). R-21 remains an open P1 veto.

### 6.17 Atomic compaction generation and ledger integrity

Compaction stages one immutable project/session generation containing source
observations, exact facts, summaries, search/vector indexes, counts, and
integrity metadata. A manifest binds generation, source IDs/digests, target
IDs/digests, schema, policy, and build. Readers observe the complete pre-image
or complete target after one compare-and-swap activation.

The exact-facts ledger is append-only and tamper-evident. Restart either
finishes activation or retains the prior generation; it never accepts deleted
source data without a verified target. The candidate writes each ledger row,
deletes the observation, and removes its search entry sequentially inside
rolling capture (`src/functions/observe.ts:167-227`). R-22 remains an open P1
veto and specializes the broader R-16 generation contract.

### 6.18 Worker replay and startup reconciliation

Hook intake returns accepted only after an immutable event/attempt ledger is
durable. One supervisor owns one worker generation. Every event has
attributable queued/retried transitions and exactly one terminal delivered,
rejected, dropped, or failed outcome. Replay is bounded to durable,
non-terminal events with matching project, session, policy, and payload
digest.

Startup validates worker identity, singleton ownership, heartbeat, backlog,
oldest age, replay cursor, session/observation/ledger/index/count generations,
and terminal-outcome reconciliation. Readiness remains unavailable or
recovering until convergence. The candidate writes a PID file and loads
indexes, but its startup path exposes no durable accepted-hook replay or
complete state reconciliation contract (`src/index.ts:167-666`). R-23 remains
an open P1 veto.

### 6.19 Connector custody and rollback

Only entries carrying the accepted Agentmemory ownership marker or an explicit
adoption receipt may be changed or removed. Ambiguous, malformed,
legacy-unowned, or concurrently modified entries remain byte-identical and
return a typed review-needed outcome.

Apply, reapply, interruption, verification failure, and rollback preserve or
restore complete bytes, permissions, ownership, extended attributes where
supported, and unrelated ordering. Backups are permission-restricted,
content-addressed, sanitized under project policy, and lifecycle-audited. A
connector declaration proves configuration only, never hook launch, durable
capture, provider dispatch, acknowledgement, or consumption.

### 6.20 Local package and service lifecycle

The local package stages immutable verified runtime releases under
`~/Library/Application Support/Agentmemory/releases/<runtime-release-id>/` and
activates one through the separate `current` pointer. Release bytes contain no
project data, secret, log, queue, lock, backup, or mutable generation state.

Each admitted instance has one ownership-marked user LaunchAgent; the normal
label is `com.chronode.agentmemory`. It starts the supervisor from the exact
active release. The supervisor owns one managed iii engine generation, one
worker/server generation, and any selected local C2/C3 gateway/relay
generation. Startup acquires the instance lock, verifies
release/configuration/credential/policy identities, starts or adopts only owned
iii, starts the worker, starts selected gateway/relay roles, reconciles all
required state, then exposes service and capture readiness separately.

Shutdown stops gateway/API/MCP admission, drains gateway and worker queues,
reconciles and stops the relay, stops the gateway, stops the worker/server,
stops the owned iii engine, releases the lock, and only then completes
LaunchAgent bootout. Every stage has a durable outcome; an unowned or ambiguous
process remains untouched and returns `REVIEW_REQUIRED`.

Normal, canary, and rollback labels are
`com.chronode.agentmemory`, `com.chronode.agentmemory.canary`, and
`com.chronode.agentmemory.rollback`, with port sets `3111/3112/3113`,
`3211/3212/3213`, and `3311/3312/3313`. Each has a distinct release pointer,
engine port, secret, policy, project registry, data pointer, pidfile, lock,
queue, log, backup, and ownership marker. Sharing any mutable resource is a
veto-8 denominator failure and may also trigger the affected safety veto.

### 6.21 Local loopback, viewer, diagnostics, and authority

API, streams, MCP, static viewer shell/assets/data, and any C2/C3
gateway/relay bind to loopback. `GET /agentmemory/livez` is the sole
unauthenticated route. The shell, assets, data, API, MCP, gateway, and relay are
bearer-authenticated under DEC-14 Option A; no unauthenticated data-free
static-shell exception is proposed.

Every viewer value and action displays project or explicit-global scope, named
denominator, snapshot ID/time, and authority. Viewer, project health, slots,
Doctor, and diagnose use the same authenticated project/snapshot/generation
contract. Top-level healthy is allowed only as a separately named aggregate
state that retains every subordinate warning/failure, affected denominator,
scope, time, and action. A later healthy render cannot erase prior 401/403/503,
degraded, recovering, unavailable, or failed-capability observations.

Operator-supplied live evidence on 2026-07-28 is non-qualifying:

- a healthy/connected `v0.9.28` viewer displayed an unlabeled 595-session
  aggregate with no visible scope selector or shown interactive auth step,
  after repeated identical health HTTP 503 console warnings;
- authenticated project health reported one project session,
  `scopeCoverage=1`, `projectUnscopedRecords=0`, two context packets, zero
  retrieval use, zero project memories/lessons/insights/promotions, and
  `globalUnscopedRecords=1887`;
- the current AIWG session context request failed closed on project/session
  ownership, while the existing project session returned an empty context
  packet in 33 ms with zero tokens and zero source IDs;
- project slot list/get returned HTTP 500; and
- diagnose returned 14 pass, one warning, and zero fail while reporting 595
  sessions, 550 summaries, 2,060 semantic memories, 1,885 insights, zero
  lessons/procedural, and two of two latest durable memories without project
  scope.

This records a viewer scope/authority, static-shell/data-route auth,
truthful-degradation, recovery-history, slot, and diagnostic-denominator gap
for reproduction. It does not establish the source of any aggregate, prove
disclosure or unauthenticated access, authorize the suggested migration, close
a veto, or change a risk.

### 6.22 Runtime-release and data-generation coordination

Runtime-release generation and data generation have separate immutable
identities and activation pointers. One coordination transaction binds the
previous and target runtime release, data generation, schema, configuration,
identity-registry generation, compatibility result, expected pointers, and
transaction ID. Upgrade stages and verifies both, drains admission, activates
the pair, restarts, reconciles, and commits only after authenticated
project-scoped readback.

Every fault or restart converges to the complete prior compatible pair or the
complete target compatible pair. One-sided rollback is denied unless an
immutable compatibility matrix already qualifies that exact mixed pair and an
operator separately authorizes the bounded recovery. Audit/outbox truth and
failed-attempt receipts remain outside both reversible pointers.

### 6.23 Processing policy and Railway tailoring

Deployment location and external-processing policy are independent. DEC-13
Option A makes processing policy project-specific:

- `zero-egress` is the default and permits zero external model, embedding, fallback,
  telemetry, content-processing, mesh, or off-host relay attempt; or
- `provider-enabled` is available only under an exact accepted provider
  manifest authorizing each provider, destination, purpose, data class,
  project, and session after minimization/redaction and before the boundary.

Missing or ambiguous policy denies. Failure cannot change policy, provider,
destination, scope, or processing location silently. Synthetic recording sinks
may test the policy; this selection accepts no provider manifest and real
provider probes remain separately authorized.

Prospective Railway deployment is deferred and excluded from this local
package, qualification, ABM, canary, and release denominator. Historical
Railway deployment or secret exposure remains a parallel
`UNVERIFIED / NOT EVALUATED` security lane for which named human ownership is
required and currently unassigned. Local evaluation neither proves
containment nor waits on that parallel lane, and no local artifact may claim
historical non-deployment, containment, rotation, or purge.

## 7. Candidate mismatches requiring evidence

| Finding | Risk | Required proof |
|---|---|---|
| Local output callback is treated as acknowledgement evidence | R-04 | Provider-native delivery state-machine PoC |
| Valid-empty and unavailable source outcomes are conflated | R-17 | Context source fault matrix |
| Locator strings can satisfy provenance checks | R-03, R-05 | Human-labelled eligibility corpus and lineage DAG restart proof |
| Required worker identity/heartbeat is not established | R-08 | KV/worker readiness fault window |
| Viewer transport and compatibility states can be confused | R-09 | Browser/backend/slot fault matrix |
| Hook payload can cross transport before server-side redaction | R-02 | Pre-transport taint corpus |
| Production fallback can omit the policy context used in tests | R-15 | Production-factory recording-sink proof |
| Mesh DNS failure can continue rather than deny | R-15 | DNS/private-resolution SSRF proof |
| Configured IDs, path fallbacks, aliases, and remote selection lack one owner-verified identity registry | R-01 | Canonical identity equivalence/collision PoC |
| Capability claims do not yet bind canonical identity generation and operation/revocation policy | R-01, R-14 | Canonical capability matrix |
| Standalone MCP converts protected proxy failures into unauthenticated local reads or mutations | R-18 | Complete proxy-error/tool/side-effect matrix and explicit offline-mode proof |
| Dirty capture and commit capture lack a complete event-to-commit chain | R-06 | Dirty linkage denominator PoC |
| Journaled per-target promotion is not reader-atomic generation activation | R-16 | Process-death and concurrent-reader generation PoC |
| Snapshot capture/restore can observe or mutate live state incrementally | R-16 | Complete namespace and exact restore proof |
| Mesh admission lacks the complete peer/project/generation contract | R-01, R-15, R-16 | Mesh authorization and atomic batch proof |
| Codebase Memory alias equality and one-writer routing remain external and unproven | R-10 | Frozen 20-query canonical/alias equivalence proof |
| Active concurrency is not a durable queue/drop ledger | R-07 | Four-agent capacity semantics and soak proof |
| Prospective Railway source/guidance remains outside the local profile; historical exposure is unverified | R-02, R-07, R-14 | Parallel metadata-only human-owner disposition; no local gate credit or containment claim |
| `npm test` can exit zero for provisional evidence | R-13 | Independent qualification-required validator |
| Receipt checksum is generated by the same authority | R-13 | External signer/digest anchor and portable source verification |
| Native bridge selects global latest memory and overwrites one destination without explicit per-write project authority | R-19 | Two-project/global-canary explicit-sync and destination-failpoint proof |
| Resume can replace lifecycle bindings and stale closure is not version-guarded | R-20 | Spoofed-parent, takeover, and deterministic close/resume interleaving proof |
| Prefix/process-local dedupe separates duplicate decision from governed side effects | R-21 | Full-event collision, concurrency, restart, and partial-write proof |
| Rolling compaction publishes ledger/delete/index effects sequentially | R-22, R-16 | Every-boundary crash and concurrent-reader generation proof |
| Worker PID/startup mechanics do not prove durable hook replay or reconciliation | R-23, R-07, R-08 | Accepted-event crash, dual-start, restart, replay, and readiness proof |
| Runtime package, LaunchAgent, managed iii/worker ownership, shutdown order, and normal/canary/rollback isolation are not one qualified product lifecycle | R-07, R-08, R-11, R-13, R-23 | `ICM-19` and accepted `LQ-001..014` clean-home lifecycle cohort |
| Runtime-release activation and data-generation activation can be described separately without one crash-reconcilable compatibility-pair transaction | R-16 | Every-boundary pair activation, incompatible-pair denial, restart, rollback, and exact readback proof |
| Live viewer/Doctor metadata showed unlabeled aggregate scope, retained prior 503s, unscoped-data warning, and project slot HTTP 500 while top-level state rendered healthy | R-01, R-09, R-14 | Authenticated shell/data, viewer/project-health/slot denominator equality, diagnostic aggregation, and degraded/recovery-history browser/MCP matrix |

These are candidate findings, not accepted defects or risk dispositions. Their
named evidence must reproduce or reject them.

## 8. Evidence-adjusted comparison

Apply hard vetoes before scoring. Surviving configurations use:

| Criterion | Weight |
|---|---:|
| Security | 18 |
| Truthfulness | 16 |
| Rollback/recovery | 14 |
| Testability | 12 |
| Operability | 11 |
| Compatibility | 9 |
| Maintainability | 9 |
| Performance | 6 |
| Migration cost | 5 |
| **Total** | **100** |

Score 0-5 only from frozen evidence. Higher is always better. For migration
cost, `5` means the lowest bounded transition cost and `0` means
prohibitive, unbounded, or unknown cost. For every other criterion, `5` means
the strongest accepted outcome and `0` means contradicted, unsafe, or wholly
unsupported behavior.

Each criterion is decomposed in the score-input manifest into atomic evidence
rows whose row weights sum to the criterion weight. A row binds one
configuration, one evaluation horizon, one rubric anchor, one evidence set,
and one confidence. The adjusted row contribution is:

```text
row_weight * (score / 5) * evidence_confidence
```

The adjusted configuration score is the sum of all row contributions and has
a maximum of 100. Evidence coverage is measured separately as:

```text
sum(row_weight * evidence_confidence)
```

It also has a maximum of 100. This definition prevents a high unsupported
score from being treated as evidence coverage. Unknown contributes zero to
both values while its row weight remains in the denominator. Criterion and
row weights are never silently dropped or renormalized in the base
scorecard.

Use these confidence values:

- 1.0: independent qualified receipt;
- 0.7: repeatable candidate evidence;
- 0.4: unit or design evidence;
- 0: unsupported claim.

Mixed-confidence evidence must remain separate atomic rows; an assessor may
not average confidence labels informally. A row is `NOT_APPLICABLE` only when
the frozen configuration definition proves the capability is absent by
design. That row retains its weight and is replaced by a
configuration-specific absence/alternative-control rubric; it is not removed
from the denominator. For example, C1 evaluates compatibility and relay
effects through strict-cutover and embedded-evidence behavior rather than
dropping those surfaces.

Every configuration receives two independent scorecards:

1. **transition horizon** — migration, coexistence, rollback, and retirement
   behavior through completion of the proposed transition; and
2. **steady-state horizon** — the retained architecture after every temporary
   compatibility component has expired and been removed.

The horizons are never averaged without a separate human-approved weighting
decision. A recommendation must be stable in both horizons or be reported as
`NO STABLE RECOMMENDATION`.

Each score-input row must select one criterion-specific 0-5 rubric anchor.
The companion rubric must define observable anchors for all six values and
preserve the following generic meaning:

| Score | Minimum meaning |
|---:|---|
| 0 | Contradicted, unsafe, unbounded, or no supporting evidence |
| 1 | Major contract/evidence gaps; the outcome is not operationally usable |
| 2 | Partial design or unit evidence with material unresolved behavior |
| 3 | Repeatable candidate evidence satisfies the bounded contract |
| 4 | Independent evidence satisfies the contract; minor owner decisions remain |
| 5 | Independent qualified evidence plus all required human acceptance |

Independent scorers work from the same frozen input manifest and adjudicate
criterion-score differences of two or more before comparison. Do not rank
while any applicable hard veto is open. Do not recommend while security,
truthfulness, rollback/recovery, or testability has zero evidence coverage or
total evidence coverage is below 80.

Weight sensitivity is one-at-a-time and deterministic. For each criterion,
create one scenario at `0.8 * base_weight` and one at
`1.2 * base_weight`, then multiply every scenario weight by
`100 / sum(scenario_weights)` so the scenario totals 100. Recompute both
horizons for all 18 scenarios. A recommended configuration must remain the
leader in the base scorecard and every sensitivity scenario and lead by at
least five points out of 100. Otherwise report `NO STABLE RECOMMENDATION`.
Scoring never changes ADR status.

No configuration is currently decision-ready because the hard-veto evidence,
R-13 qualification authority, accepted contracts, and human decisions are
incomplete.

## 9. Evidence sequence

1. Retain the attributable DEC-11 local development-route, DEC-13
   processing-policy Option A, and DEC-14 bearer-authenticated viewer Option A
   dispositions. Obtain the still-required independent dispositions for the
   qualification, operations, package/process, and instance-isolation profile.
   These dispositions are not architecture selection and close no veto.
2. Qualify R-13 itself with accepted profiles, portable verification, an
   independent validator, and external signer/digest authority.
3. Run hard-veto evidence for R-02, R-14, R-18, and R-19 plus the bounded
   R-15 recording-sink contract test.
4. Establish lifecycle, durable capture, compaction-generation, and worker
   replay foundations for R-20, R-21, R-22, and R-23.
5. Run configuration-discriminating proofs for strict cutover, local-loopback
   gateway downgrade/isolation/sunset, and embedded-outbox/local-relay crash
   windows.
6. Run identity and recovery evidence for R-01, R-16, and R-06.
7. Run truthfulness evidence for R-17, R-04, R-03, and R-05.
8. Run load, readiness, authenticated shell/data, viewer/project-health/slot
   denominator, diagnostic aggregation, and recovery-history evidence for
   R-07, R-08, R-09, and R-14.
9. Rehearse connector rollback and Codebase Memory alias equivalence for R-11
   and R-10.
10. Qualify ICM-19 through the accepted clean-home local lifecycle cohort,
    including both processing policies, LaunchAgent/iii/worker ordering,
    normal/canary/rollback isolation, and coordinated runtime/data rollback.
11. Rehearse the local offline release gate for R-12 with zero publication.
12. Blind-score the complete configurations and run sensitivity analysis.
13. Obtain explicit human architecture selection. Keep rejected alternatives
    and evidence.
14. Update Proposed ADR/SAD wording; only human owners may accept/baseline it.
15. Reconcile atomic requirements, DES-UCRs, canonical traceability, MTP, and
    risk dispositions.
16. Run a new independent ABM review against one frozen revision.
17. If ABM passes, request separate Construction authorization.

Historical Railway exposure proceeds only in the parallel
`UNVERIFIED / NOT EVALUATED` security lane with separate human authorization.
It is not a predecessor to local scoring or ABM, contributes no local evidence
credit, and remains unresolved if the local sequence completes first.

## 10. Open decisions

Human owners must decide:

1. Transition configuration and strict-core target.
2. Compatibility client inventory, operations, owners, expiry, and retirement
   threshold.
3. Provider-native acknowledgement mechanisms available for Codex, Claude,
   and MCP-only agents.
4. Required/optional dependency classes and readiness timing values.
5. Evidence authority, receipt signer, and accepted profile registry.
6. Exact persisted-state manifest, generation model, RPO/RTO, and rollback
   tiers.
7. Local secret bootstrap, exact accepted provider-manifest contents and
   ownership, mesh posture, and bearer-token issuance/bootstrap. DEC-13 and
   DEC-14 settle the policy model and viewer option, not these operating
   details.
8. Whether a receipt relay provides enough independent value to justify its
   operational burden.
9. Native-memory destinations and the exact explicit-action authority.
10. Session/worktree lifecycle authority and CAS/version semantics.
11. Exact-event identity, compaction manifest/integrity authority, and worker
    supervisor/replay ownership.
12. Human acceptance or revision of ADR-007 package roots, LaunchAgent labels,
    supervisor/iii/worker process split, ownership/adoption, and shutdown
    timeouts.
13. Runtime-release/data-generation compatibility matrix, activation record,
    emergency one-sided recovery authority, retention, RPO/RTO, and
    reconciliation behavior.
14. Viewer/project-health/slot/Doctor diagnostic denominator, scope selector,
    authority display, bounded transition-history retention, and action
    semantics.
15. Separate human ownership and authorized scope for the parallel historical
    Railway `UNVERIFIED / NOT EVALUATED` lane.

Until those decisions and their evidence exist, the correct posture remains
ABM NO-GO and Construction not authorized.
