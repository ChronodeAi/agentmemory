# R-09 Viewer Health Truthfulness Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-09`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Default-branch design input:
`a8e7d19a814a24a21818afc715f3301b3eaeee80`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`; the default-branch input above
  remains advisory and unported.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-09-v1.json`.
- Qualification source, disposable mechanics bundle, selected backend/viewer
  pair and profile, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can the viewer report the backend's exact health, fetch, compatibility, build,
scope, slot, and snapshot states without collapsing a valid non-2xx health
response or any distinct failure class into `Unknown`, false health, or a
misleading compatible state?

## One bounded hypothesis

For every frozen backend/viewer pair and project/global scope, the viewer
separately renders:

1. the backend health state;
2. the fetch state;
3. backend/viewer/API-contract build compatibility;
4. component readiness, including slots and required workers; and
5. counter/action scope, denominator, snapshot, and observation time.

A valid typed health body is retained even when HTTP status is non-2xx. A
timeout, transport error, unauthorized response, malformed body, stale
snapshot, disabled component, or build mismatch remains a distinct typed
state and can never become `Unknown`, healthy, compatible, or current.

## Confirmed current-source and runtime finding

At the source candidate:

- `src/triggers/api.ts:415-471` intentionally returns HTTP 503 with a valid
  structured health body when the computed status is `critical`;
- `src/viewer/index.html:1257-1279` returns `null` for every non-2xx response;
  and
- `src/viewer/index.html:1361-1366` loads health through the shared
  `apiGet('health')` path.

The installed fork-derived, upstream-labelled `0.9.28` viewer has the same
shared-helper behavior and health call. It can render a healthy HTTP 200 body,
but a valid critical HTTP 503 body is discarded before dashboard rendering.
This deterministically explains the previously observed `Unknown` health state
during critical memory pressure. The installed subject is regression evidence
only, not official-upstream or current-HEAD candidate evidence.

ChronodeAi `origin/main` commit
`a8e7d19a814a24a21818afc715f3301b3eaeee80` special-cases health-body reading
on non-2xx responses while preserving the shared helper's `null` contract for
other callers. That patch is design evidence only. It is not automatically
trusted, cherry-picked, accepted, or authorized as a product change, and it
contains no accompanying test change.

Existing focused viewer tests do not prove the complete HTTP/body, status,
build, scope, slot, stale-snapshot, and browser-rendering matrix. Current
source and unit tests therefore do not retire R-09.

## Required frozen prerequisites

1. Human-accepted FR-20 health/fetch/compatibility enum and sustained-state
   contract, including `HEALTHY`, `DEGRADED`, `RECOVERING`, and `UNAVAILABLE`.
2. Versioned backend health schema and explicit HTTP-status/body contract.
3. Accepted backend, viewer, and API-contract build-identity and compatibility
   rules, including stale-build behavior.
4. Accepted project/global viewer scope, snapshot, denominator, time, and
   destructive-authorization contract.
5. Complete health, viewer, slots, worker, auth, counter, action, error, log,
   and browser-rendering denominator in `G-ICM-01`.
6. Accepted R-01 identity, R-08 readiness, R-13 deterministic profile, source
   bundle, fixture SHA, signer authority, and independent verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | UI/API Owner | Unassigned |
| Service reviewer | Service Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration reviewer | Configuration Manager | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required build and scope fixtures

- Exact candidate backend/viewer pair and exact upstream-patch-derived pair.
- Matching pair, backend-newer, viewer-newer, API-contract mismatch, unknown
  build, missing build, and stale artifact/snapshot pairs.
- Canonical project A, canonical project B, explicitly authorized global
  scope, ambiguous scope, missing scope, and cross-project canaries.
- Enabled and healthy slots, project-empty slots, disabled slots, backend
  error, timeout, malformed response, wrong-project response, and stale slot
  snapshot.
- Required worker connected, disconnected, missing, restarting, and
  reconciliation-incomplete states.

## HTTP, body, and browser matrix

- HTTP 200 with valid `healthy` and `degraded` bodies.
- HTTP 503 with valid `critical`, `recovering`, and `unavailable` contract
  bodies.
- HTTP 401/403, timeout, connection refusal, aborted request, malformed JSON,
  valid JSON with an invalid schema, empty body, cached/stale body, and a
  response whose body status conflicts with its HTTP status.
- Browser render, refresh, tab switch, delayed response ordering, stale
  response arrival, and backend/viewer restart during fetch.
- Shared-helper callers for graph, memories, sessions, audit, slots, and
  destructive actions, proving that a health-specific body rule does not
  convert unrelated non-2xx responses into apparent success.

## Required oracle

For every case, the frozen oracle must separately declare:

- HTTP status and body-schema validity;
- fetch state: `OK`, `UNAUTHORIZED`, `TIMEOUT`, `TRANSPORT_ERROR`,
  `MALFORMED`, or `STALE`;
- service state: `HEALTHY`, `DEGRADED`, `RECOVERING`, or `UNAVAILABLE`;
- compatibility: `COMPATIBLE`, `INCOMPATIBLE`, or `NOT_EVALUATED`;
- backend, viewer, and API-contract build identity;
- component state for worker, slots, backend, viewer, and reconciliation;
- canonical project/global scope, denominator, snapshot ID, and observation
  time; and
- whether each counter or action is displayable, advisory, blocked, or
  exact-scope authorized.

The implementation is not allowed to infer one column from another. In
particular, HTTP 503 is not equivalent to transport failure, route response is
not readiness, availability is not compatibility, and a missing identity is
not a compatible identity.

## Pass criteria

1. Every valid structured health body, including a valid HTTP 503 body,
   renders the exact oracle service state; none renders `Unknown`.
2. Every malformed, timeout, transport, unauthorized, or stale case renders
   its exact fetch state and never renders healthy, compatible, or current.
3. Matching builds render `COMPATIBLE`; mismatches render `INCOMPATIBLE`;
   missing or unverified identities render `NOT_EVALUATED`.
4. Required-worker, startup-reconciliation, and required-component failures
   keep readiness unavailable or recovering even when API and viewer ports
   respond.
5. Disabled slots render a typed disabled/unavailable component state, while
   enabled project-scoped slots preserve exact project isolation and produce
   zero opaque HTTP 500 results.
6. Every counter and destructive action carries canonical scope, denominator,
   snapshot ID, observation time, and exact authorization. Project A displays
   zero project B or unapproved global durable-memory content.
7. Health-specific non-2xx body handling preserves the failure contract of
   every unrelated shared-helper caller.
8. Browser and machine-readable results agree for every frozen case, with no
   stale-response overwrite or build/scope ambiguity.

## Fail criteria

- A valid non-2xx health body is discarded or rendered as `Unknown`.
- Any transport, malformed, unauthorized, stale, disabled, or mismatch case is
  rendered healthy, compatible, current, or successful.
- Port or viewer liveness substitutes for required-worker or backend
  readiness.
- A scope, denominator, snapshot, time, build, or compatibility identity is
  omitted or inferred ambiguously.
- Cross-project/global content appears in a project-scoped view.
- A health-specific change alters unrelated helper callers' non-2xx failure
  behavior.
- Browser output diverges from the sealed machine-readable oracle.

## Stop and backtrack

Stop on the first cross-project disclosure, unauthorized action, false healthy
or compatible state, stale-state overwrite, raw secret occurrence, or
regression in an unrelated shared-helper caller. Disable the fixture viewer,
preserve redacted request/response/browser receipts, terminate isolated
services, restore the exact backend/viewer pre-images, and return to the
health/fetch/compatibility contract. Do not switch the installed runtime or
patch the product branch from this run.

## Immutable receipt

The sealed receipt must bind the risk/card version, source and source-bundle
SHAs, default-branch design-input SHA, backend/viewer/API-contract artifact hashes,
health/fetch/compatibility contract SHAs, complete route/component/scope/action
denominator, fixture and oracle hashes, ordered request/response and browser
events, HTTP/body/schema classifications, build/scope/snapshot identities,
rendered labels, console/error logs, raw artifact hashes, executor/environment
identity, signer, and independent verification disposition.

## Rollback and cleanup

Use only disposable services, state, browsers, projects, slots, builds, and
credentials. Restore the exact backend and viewer artifact pre-images, remove
only manifested fixture state, verify no listener, browser session, slot,
credential, cache, project, or provider residue remains, and preserve the
immutable redacted receipt and every manifested raw artifact.

## Admission blockers and execution prohibition

- Named humans for the owner, all reviewers, executor, signer, and independent
  verifier.
- Human acceptance of the health/fetch/compatibility, build, component,
  project/global scope, snapshot, action-authorization, rollback, and receipt
  contracts.
- Frozen complete build, HTTP/body, browser, scope, slots, worker, shared
  helper, auth, stale-state, failure, and cleanup matrices.
- Accepted R-01, R-08, R-13, `G-ICM-01`, source bundle, fixture manifest, and
  independent verification environment.

Do not invoke or build a PoC for R-09 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-09; accept an ADR, architecture, MTP, or requirement; pass ABM; or
authorize Construction. It also cannot authorize a product patch, upstream
merge, installed-runtime replacement, local canary, deployment, rollout, or
release.
