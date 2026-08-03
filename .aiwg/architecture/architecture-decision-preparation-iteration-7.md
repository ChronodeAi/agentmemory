# Agentmemory R27 Successor Architecture Decision Preparation

Status: DETACHED PREPARATION - NO DECISION OR EXECUTION AUTHORITY

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Authority boundary

This successor working paper prepares architecture options and bounded PoC
hypotheses. It is outside the accepted R26 evidence freeze and remains
non-qualifying until a separate R27 freeze and review. It does not:

- accept R-13 Stage A, Stage B1, or Stage B2;
- accept or baseline an ADR, SAD, ICM, requirement, test profile, or
  architecture;
- authorize a product-code, package, runtime, service, credential, or listener
  change;
- mitigate, retire, accept, or rescore a risk;
- pass ABM or authorize Construction, canary, release, deployment, or rollout.

The R26 manifest, receipt, adversarial review, runtime refresh, and
reconstruction record remain unchanged as predecessor anchors. The live
runtime remains untouched.

## Fixed local-product constraints

The options below preserve these current proposed constraints unless a human
authority explicitly changes them:

1. Local macOS is the only target in scope.
2. `GET /agentmemory/livez` is the sole anonymous route.
3. Viewer shell, assets, data, API, stream, and MCP surfaces are protected.
4. Project authority is the default; global authority is separate, explicit,
   short-lived, and visibly distinct.
5. Request parameters never create, widen, or select caller authority.
6. One ownership-marked LaunchAgent controls one accepted runtime generation.
7. The runtime owns and reconciles its engine, worker, viewer, and iii
   processes.
8. Normal, canary, and rollback instances share no mutable ports, roots,
   locks, queues, state, or active-generation pointers.
9. `zero-egress` is the default. External processing requires an exact
   accepted provider manifest.
10. A healthy label never hides a required failure, unknown denominator,
    incompatible build, missing worker, pending reconciliation, or operator
    action.

## Source-grounded nonconformances

### Viewer authority

The current loopback viewer skips inbound bearer validation, accepts a caller
selected `scope`, and can synthesize an upstream administrator credential.
The live direct API rejected an unauthenticated global request while both
viewer origins returned success. The current tests encode this loopback trust
as expected behavior.

This is a protection-boundary failure. Merely adding another UI prompt does not
fix it. The viewer must validate or narrow caller authority and must never
manufacture authority from a URL, query, body, project, or scope value.

### Runtime ownership

Two viewer/worker processes with different parents were live. Every worker
writes the same PID file, and the official stop path reads one worker PID.
There is no proved process-level singleton lock, generation fence, or complete
owned-process reconciliation.

### Health truthfulness

The detailed health implementation primarily observes one worker process.
Current health can miss duplicate processes, wildcard control listeners,
incomplete ownership, and process-tree pressure. The viewer also discards a
valid typed HTTP 503 health body through the shared non-2xx helper, producing
an `Unknown` display rather than the backend's exact state.

### iii control boundary

The canonical iii configuration omits an explicit `iii-worker-manager` entry.
The pinned iii behavior therefore uses its trusted listener default, observed
as `*:49134`. Alternate-port materialization adds an explicit loopback host,
but canonical-port startup returns the source configuration unchanged.

The local profile must never inherit an unspecified trusted-listener host.
Every accepted profile must declare and verify the listener boundary.

## Decision family A: browser authority

Scores are preparatory only. Five is strongest. For delivery risk, five means
lowest risk.

| ID | Option | Security | Least privilege | UX | Delivery risk | Compatibility | Operability | Testability |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | One authenticated viewer origin with one-time launch code and short-lived bearer | 4 | 4 | 4 | 4 | 4 | 4 | 5 |
| A2 | One viewer origin with an HttpOnly server session | 4 | 4 | 5 | 3 | 4 | 4 | 4 |
| A3 | Native macOS viewer over XPC or Unix-domain socket | 5 | 5 | 5 | 2 | 2 | 3 | 3 |
| A4 | Separate project-viewer and global-admin planes, each using A1 bootstrap | 5 | 5 | 4 | 3 | 3 | 3 | 5 |

### A1 - single authenticated origin and scoped bearer

`agentmemory viewer --project <canonical-id>` opens a single-use local launch
URL. The launch code is consumed once and exchanged for a short-lived,
project-, audience-, operation-, and generation-bound bearer held only in
browser memory. An administrator launch is separate and expires quickly.

The viewer forwards or narrows the caller capability. It never has a root
or reusable backend/global administrator credential in its process. A global
launch supplies a short-lived, audience-, operation-, resource-, and
generation-bound caller capability that the viewer forwards unchanged or
narrows. Exact Host, Origin, Fetch Metadata, method, content type, and CORS
checks remain mandatory.

Benefits:

- smallest change that preserves bearer semantics;
- no root secret pasted into or retained by the browser;
- strong route-matrix and replay testability;
- REST and MCP clients remain compatible.

Principal risks:

- one-time launch-code leakage or replay;
- XSS theft of an in-memory bearer;
- accidental reuse of an administrative browser capability;
- unresolved bootstrap mechanics; no anonymous shell or asset exception is
  permitted.

Bootstrap evidence is a hard prerequisite. It must freeze and prove accepted
code entropy, TTL, atomic single use, concurrent consumption, project,
audience, operation, resource, and generation binding, replay denial, restart
behavior, browser history, log and Referer redaction, CSP/XSS resistance,
authenticated shell/assets, and zero persistent browser token storage. Any
uncertainty or occurrence outside the admitted oracle stops the bootstrap
cohort before authorization parity testing.

### A2 - HttpOnly project session

A native launcher authenticates a one-time bootstrap, and the viewer creates a
server-side project session represented by a host-only, HttpOnly,
SameSite=Strict cookie. Global use requires a separate step-up session.

This has the smoothest browser UX, but ambient cookies add CSRF obligations and
the currently selected bearer-only policy would require explicit human
redisposition. It cannot be adopted silently as an implementation detail.

### A3 - native macOS viewer

A signed macOS application talks to the local daemon over XPC or a Unix-domain
socket, validates process identity, stores install credentials in Keychain,
and obtains short-lived project capabilities. Global administration is a
separate Touch ID or explicit elevation journey.

This best removes browser-origin risks and can provide the most polished UX,
but it creates the largest packaging, signing, accessibility, compatibility,
headless-testing, and uninstall surface. It is a future product option, not
the smallest path to a qualified release candidate.

### A4 - split project and administration planes

The normal project viewer has no administrator credential, no global routes,
and no code path capable of minting or forwarding global authority. A separate,
normally disabled administration plane owns the global boundary. Each plane
uses the A1 one-time bootstrap and short-lived bearer model.

This option reduces blast radius structurally: a project-viewer defect cannot
be promoted into global authority because the process lacks that authority.
It also maps cleanly to the default user journey: open the current project;
enter global administration only through a separate, labelled action.

Principal costs are route-table partitioning, separate lifecycle identities,
port discovery, and stale-process reconciliation.

### Browser-authority recommendation

Evaluate A4 first and retain A1 as the bounded fallback.

A4 is preferred because it removes administrative capability from the
browser-facing project process. A1 is the fallback if independent plane
ownership proves operationally disproportionate. A2 requires a bearer-policy
change. A3 is a later packaging evolution.

No option is selected by this recommendation.

## Decision family S: local supervision

| ID | Option | Ownership clarity | Recovery | UX | Delivery risk | Security | Testability |
|---|---|---:|---:|---:|---:|---:|---:|
| S1 | One LaunchAgent and minimal native Swift/Rust supervisor | 5 | 5 | 5 | 2 | 5 | 5 |
| S2 | One LaunchAgent and dedicated Node supervisor | 5 | 4 | 4 | 4 | 4 | 5 |
| S3 | Separate LaunchAgents for engine, worker, and viewer | 3 | 3 | 4 | 3 | 4 | 3 |
| S4 | iii owns all lifecycle and Agentmemory remains only a worker | 3 | 3 | 4 | 2 | 3 | 3 |
| S5 | Third-party supervisor such as PM2 | 3 | 4 | 3 | 2 | 3 | 3 |

### Supervision recommendation

Evaluate S1 as the packaged-product target and retain S2 as the compatibility
fallback.

Both variants use one ownership-marked LaunchAgent to start one versioned
Agentmemory supervisor. The supervisor:

- acquires an atomic instance lock before opening any listener;
- records one immutable runtime/data/config generation;
- starts iii, waits for its accepted dependency state, then starts the worker
  and viewer;
- gives every child an owner token and generation fence;
- rejects a second normal instance before it can bind or mutate state;
- reconciles stale PID files against process identity, start time, executable,
  owner token, and generation instead of trusting a PID alone;
- drains intake, stops dependents in reverse order, and verifies zero owned
  process/listener residue;
- never kills an unowned process solely because its PID or port matches.

S1 places this narrow lifecycle authority in a minimal signed Swift or Rust
binary. It can own process-group identities, a private control socket,
whole-tree CPU/RSS/restart telemetry, immutable activation, and Keychain
bootstrap without sharing the Node product runtime or dependency supply chain.
This is the strongest packaged target but introduces a new language, build,
signing, notarization, and platform-test surface.

S2 implements the same contracts in Node first. It has the best near-term
compatibility and is easier to qualify against the current TypeScript/iii
system, but whole-tree observation and isolation from product failure require
explicit implementation. An S2 PoC can test the contracts without deciding
that production supervision must remain in Node.

S3 creates cross-job ordering and split-brain problems. S4 depends on iii
capabilities and version behavior not yet proved for the complete product.
S5 expands the package and trust surface without removing core Agentmemory
ownership responsibilities.

No option is selected by this recommendation.

## Decision family H: health contract

### HLTH-1 - port/process health

Report health from route reachability, the current worker process, and basic
dependency pings. This is simple but cannot truthfully represent duplicate
workers, ownership, reconciliation, process-tree pressure, build identity, or
queue integrity.

### HLTH-2 - supervisor-owned capability health

Use one versioned health state machine consumed by API, CLI, Doctor, and UI:

- anonymous `/livez`: the supervisor event loop can answer;
- protected `/readyz`: the accepted runtime generation can safely serve the
  declared capability set;
- protected `/health`: exact per-component and per-capability diagnostics,
  build/profile/instance identities, denominators, observation time, and
  bounded transition history;
- protected project health: exact project scope and project/global/unscoped
  denominators.

Readiness aggregates supervisor ownership, iii boundary, worker connection,
viewer/auth contract, durable intake/replay, slots, state reconciliation,
runtime/data compatibility, queue pressure, and required provider state.
Resource pressure is calculated for the owned process tree, not one worker
heap. Recovery requires a bounded consecutive-success window and preserves the
last failure transition.

### Health recommendation

Carry forward HLTH-2. The earlier operator-selected Health Option B was a bounded
point-in-time containment gate for one installed subject; it is not the same
decision as this permanent health architecture and does not qualify HLTH-2.

No permanent health architecture is accepted by this recommendation.

## Decision family D: iii listener boundary

| ID | Option | Security | Version certainty | Delivery risk | Operability |
|---|---|---:|---:|---:|---:|
| D1 | Always materialize iii config with explicit loopback worker-manager host and fixed profile port | 5 | 5 | 5 | 5 |
| D2 | Accept wildcard listener but isolate it with host firewall/process policy | 2 | 4 | 3 | 2 |
| D3 | Upgrade iii and use a separately authenticated/RBAC worker listener | 5 | 2 | 2 | 4 |
| D4 | Replace iii in the local profile | 4 | 2 | 1 | 2 |

### iii recommendation

Evaluate D1 first.

Always materialize a profile-specific iii configuration, including canonical
ports. Declare the worker-manager host as `127.0.0.1`, use the instance's
fixed accepted port, reject wildcard post-bind inventory, and fail readiness
if the observed listener differs from the manifest.

D3 is a future hardening candidate. Official iii documentation describes a
separate RBAC listener, but compatibility with the currently pinned iii
version is not yet proved. D2 is defense in depth only and cannot make an
unexplained trusted wildcard listener acceptable. D4 has the largest
compatibility and schedule impact.

No option is selected by this recommendation.

## Local security-envelope evidence priority

The leading local security-envelope combination for later evidence is:

`A4 + S1 + HLTH-2 + D1`

Fallback local security-envelope combination:

`A1 + S2 + HLTH-2 + D1`

These combinations are evidence priorities only. They neither select nor
replace semantic architecture configurations C1, C2, C3, or C4. Each envelope
must be evaluated against every surviving semantic configuration. They must
not be scored in the architecture MCDA until every hard veto has qualifying
evidence.

## Required human decisions before implementation

1. Authorize and verify the exact emergency local containment sequence in
   `.aiwg/security/iteration-7-emergency-containment-decision-request.md`.
   Until then, Stage-A submission, PoC admission or execution, and
   architecture advancement remain blocked.
2. Accept or return the R-13 Stage-A specification with all named
   concurrences.
3. Separately authorize R-13 Stage-B1 mechanics preparation.
4. Separately admit exact R-13 Stage-B2 inputs and actors.
5. After R-13 evidence fitness is accepted, decide which browser-authority,
   supervision, health, and iii options may enter bounded PoCs.
6. Name the Authentication Service Owner, Runtime Supervision Owner, Service
   Owner, UI/API Owner, Test Architect, Configuration Manager, Security
   Architect, executor, receipt signer, and independent verifier.
7. Accept exact capability, startup, process ownership, readiness, listener,
   rollback, and evidence contracts before any product implementation.

## Current disposition

- R26 evidence freeze: unchanged.
- Live runtime: unchanged.
- Product code and tests: unchanged.
- ADR/SAD/ICM status: Proposed/Draft, unchanged.
- Risks: all remain `IDENTIFIED`; R-14 P0 refresh remains proposed.
- R-13 Stage A, Stage B1, and Stage B2: not accepted or authorized.
- Emergency local containment: unanswered; Stage-A submission, PoC admission
  or execution, and architecture advancement remain blocked.
- ABM: NO-GO.
- Construction, package work, canary, release, and rollout: unauthorized.
