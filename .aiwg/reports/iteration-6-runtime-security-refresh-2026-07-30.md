# Iteration 6 Local Runtime and Security Refresh

Status: **P0 CANDIDATE SECURITY NONCONFORMANCE - CONTAINMENT DECISION REQUIRED**

Observed at: 2026-07-30T13:10:57Z
Project: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Installed CLI: `/Users/base/.nvm/versions/node/v24.16.0/bin/agentmemory`
Installed labelled version: `0.9.28`

## Classification

This is fresh local specification and risk evidence. It is not candidate-build
qualification, product-fix evidence, risk retirement, Stage-A acceptance, B1
or B2 admission, ABM evidence, Construction authority, or release evidence.
No response body, credential, prompt, memory, summary, or session content is
included in this report.

## Observed configuration

| Control | Observation |
|---|---|
| Context injection | `AGENTMEMORY_INJECT_CONTEXT=false` |
| Inline REST secret | Absent from `.agentmemory/.env` |
| Secret-file setting | Present |
| Secret file | Present, mode `0600`, 65 bytes; value not read or emitted |
| Direct CLI status | Connected to `127.0.0.1:3111`; service `healthy`; one project session and one observation; context injection disabled |
| Doctor dry-run | 9/10 checks; only context injection disabled; contradictory summary says all checks passing and no fixes |
| Liveness | `GET /agentmemory/livez` returned HTTP 200 and 79 bytes |

The CLI status is truthful when executed outside the restricted command
sandbox. The prior R25 `Not running` result was caused by local-process network
denial in that sandbox and is superseded for current runtime status only.

## Process and viewer topology

| PID | Parent | Role | Started |
|---:|---:|---|---|
| 2725 | 1 | Node Agentmemory worker/viewer | 2026-07-30 07:33:07 local |
| 7324 | 2725 | `iii` engine bound to `127.0.0.1:3111` | 2026-07-30 07:33:21 local |
| 8749 | 4083 | Second Node Agentmemory worker/viewer | 2026-07-30 07:56:01 local |

Viewer `3113` and viewer `3114` each returned HTTP 200 with the same
200,275-byte shell. The runtime therefore has one engine and two viewer/worker
processes under different parentage. Singleton ownership, authoritative
viewer selection, lifecycle stop behavior, and stale-viewer cleanup are not
proved.

The same `iii` PID also listens on wildcard IPv4 `*:49134`. Reachability,
protocol authentication, and authorization on that listener were not tested.
Wildcard binding is an additional open network boundary; loopback-only
containment cannot be claimed while it remains unexplained.

## Authentication probes

Every probe below discarded the response body and recorded only HTTP status
and byte count.

| Route | Credential | Result |
|---|---|---|
| Direct `3111/agentmemory/sessions?scope=global` | None | HTTP 401, 24 bytes |
| Viewer `3113/agentmemory/sessions?scope=global` | None | HTTP 200, 827,079 bytes |
| Viewer `3114/agentmemory/sessions?scope=global` | None | HTTP 200, 827,079 bytes |
| Direct `3111/agentmemory/health` | None | HTTP 200, 13,425 bytes |
| Viewer `3114/agentmemory/health` | None | HTTP 200, 13,425 bytes |

The direct protected session route fails closed, but both unauthenticated
viewer origins proxy the protected global-session response successfully. A
caller that can reach either local viewer can therefore cross the engine's
credential boundary without supplying a credential. The returned payload size
shows that this is not a static-shell-only issue. Its contents were not
retained or reproduced.

The detailed health route also remains unauthenticated, contrary to the
selected DEC-14 Option A protected-surface policy, which permits
unauthenticated access only to `/agentmemory/livez`.

## Candidate-source mechanism

Best-effort Codebase Memory discovery and exact source reads found no recorded
coverage gap for the cited files:

- `src/viewer/server.ts:201-402` leaves `inboundSecret` unset for loopback
  binds, so the inbound bearer check is skipped for non-shell routes;
- `src/viewer/server.ts:404-489` derives request scope and creates its own
  upstream authorization headers before proxying GET and state-changing
  methods;
- `src/client-auth.ts:57-107` selects the configured admin secret for global
  scope; and
- `test/viewer-security.test.ts:293-340` expects an unauthenticated loopback
  global request to return HTTP 200 and verifies that the viewer supplied the
  admin credential upstream.

This is an alternate-path authentication bypass and confused-deputy design,
not merely a missing viewer status indicator. The proxy converts possession of
a loopback socket plus a caller-selected global scope into administrative
authority. Integrity impact is plausible because the proxy supports POST,
PUT, PATCH, and DELETE, but no state-changing request was attempted.

## Security and lifecycle impact

1. **Confidentiality:** the viewer proxy exposes cross-project global session
   data to any local caller able to reach its loopback port.
2. **Authorization:** viewer possession is being treated as authority; the
   direct engine's successful `401` proves the proxy crosses a real protection
   boundary.
3. **Scope:** a global query is relayed rather than constrained to the active
   canonical project.
4. **Multiplicity:** two viewer origins expose the same protected data and
   have different process ownership.
5. **Truthfulness:** service health and Doctor success do not surface the
   protection failure; Doctor additionally calls 9/10 "all checks passing."
6. **Provenance:** the installed package is labelled `0.9.28`, but its exact
   artifact-to-commit and byte-for-byte candidate binding remain unproved.
7. **Network boundary:** `iii` listens on wildcard IPv4 `*:49134`; its
   reachability and protection contract remain unverified.

This directly strengthens R-02, R-09, R-14, and R-23. It is not the MCP
downgrade mechanism owned by R-18, although future verification must prove
that no equivalent downgrade exists on any proxy surface.

## Authority analysis

The accepted temporary-containment decision disabled automatic context
injection and plugins while preserving explicit project-scoped recall. Its
execution record explicitly left the service, supervisor, and runtime
unchanged and did not authorize product code, product tests, process restart,
runtime rollback, or supervisor mutation.

Consequently:

- continuing automatic injection remains prohibited;
- gate-critical use of the viewer is prohibited;
- the viewer must not be treated as a safe local administrative boundary;
- deployment, canary, release, and broad rollout remain blocked; and
- stopping or restarting the engine/viewers requires a new explicit emergency
  containment authorization unless an accepted incident-response authority
  independently permits it.

## Least-authority containment request

Request explicit authority for this reversible sequence:

1. identify the exact two Node workers/viewers, shared `iii` engine, pidfile
   mapping, launchd state, and listeners without inspecting process
   environments or secret values;
2. authorize owner-scoped graceful shutdown of both verified Node workers
   while the shared engine remains available long enough for orderly state
   flush;
3. authorize shared-engine shutdown only if protected exposure or wildcard
   listeners persist after both workers stop;
4. verify every viewer/fallback port, 3111, and 49134 is closed or otherwise
   protected according to an accepted contract, using status and byte counts
   only;
5. leave memory data, secrets, hooks, provider configurations, and candidate
   source untouched;
6. keep context injection and both plugins disabled;
7. permit explicit project-scoped recall only after a fresh disposable runtime
   proves viewer authentication, global-scope denial, single-worker ownership,
   loopback-only or explicitly protected engine boundaries, and truthful
   health behavior; and
8. preserve restart only as a separately authorized, documented operational
   action.

The official CLI stop is not covered by existing authority and is not yet
proved complete for this topology. Candidate source shows it unloads the
LaunchAgent, reads one worker pidfile, signals worker and engine candidates,
and clears lifecycle state files. With two live workers, it could leave a
sibling viewer unaccounted for.

Until that authority is granted, the least-mutating posture is to leave the
runtime unchanged, avoid both viewer origins, avoid global queries, and treat
all recall as non-authoritative advisory input.

## Acceptance evidence for a future fix

- Unauthenticated `/agentmemory/livez` returns 200 with no protected detail.
- Unauthenticated detailed health returns 401/403 through direct and viewer
  origins.
- Unauthenticated project/global sessions, observations, memories, slots,
  profiles, lessons, insights, expanded results, and context routes return
  401/403 through every origin.
- Authenticated project-scoped viewer requests work only for the authorized
  project; global scope requires separately explicit global authority.
- Missing, malformed, expired, wrong-audience, wrong-project, and revoked
  credentials fail closed without proxy fallback.
- Exactly one accepted worker/viewer generation owns the configured ports.
- Stop, crash, restart, stale process, and rollback tests leave no older viewer
  capable of proxying data.
- The `iii` control/engine listener is loopback-only or independently
  authenticated and authorized; no wildcard listener is left unexplained.
- Doctor reports the auth/viewer failure as failing and never labels 9/10 "all
  checks passing."
- The viewer displays explicit authenticated authority, project scope, build
  ID, API-contract ID, and degraded/incompatible states.
- Raw test logs contain no secret or protected response body and are verified
  independently against an exact artifact identity.

## Current disposition

**NO-GO** for Stage-A execution evidence, B1/B2 execution, ABM passage,
Construction, package work, canary, deployment, release, or rollout. The
Stage-A specification question may be prepared only if this finding remains
explicitly open and the required human authority fields and concurrences are
complete.
