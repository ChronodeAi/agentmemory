# Agentmemory R27 Successor Read-Only Runtime Refresh

Status: DETACHED REGRESSION OBSERVATION - NON-QUALIFYING

Date: 2026-07-30
Project context: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Boundary

This refresh used process/listener inventory, CLI status and dry-run Doctor,
and non-mutating HTTP requests. No response body, bearer, secret, memory,
session content, environment, or process environment was retained. No POST,
PUT, PATCH, DELETE, repair, stop, restart, install, upgrade, credential,
listener, LaunchAgent, state, or product change was attempted.

These observations are regression seeds only. They are not exact
installed-artifact provenance, qualification evidence, risk disposition,
architecture acceptance, ABM evidence, or runtime-mutation authority.

## Sandbox control

The first CLI status invocation ran inside a network sandbox and reported
`Not running`. A direct Node fetch in that same sandbox failed with `EPERM`.
This result is invalid as service-health evidence.

The identical CLI status command was then run outside the localhost network
sandbox as an explicitly read-only check and connected normally. The invalid
sandbox result must not be attributed to Agentmemory availability.

## CLI status

Outside-sandbox `agentmemory status`:

- connected to `http://localhost:3111`;
- reported installed runtime `v0.9.28`;
- reported service status `healthy`;
- reported project `github.com/chronodeai/agentmemory`;
- reported one session, one observation, zero project memories;
- reported graph counts 5,588 nodes and 4,848 edges;
- reported context injection disabled;
- reported LLM, embeddings, graph extraction, consolidation, and automatic
  compression enabled.

The status is service self-report, not a complete ownership, security,
listener, replay, or package-readiness conclusion.

## Dry-run Doctor

Outside-sandbox `agentmemory doctor --dry-run`:

- displayed `server: 9/10 passing`;
- marked in-conversation context injection as the one failed check;
- recommended setting `AGENTMEMORY_INJECT_CONTEXT=true` and restarting;
- then stated `All checks passing ... no fixes to run`;
- applied no repair.

This is internally contradictory and conflicts with the accepted temporary
containment that intentionally keeps automatic context injection disabled.
It is a truthfulness and policy-awareness regression seed, not a request to
enable injection.

## Process and listener inventory

Observed owned-or-related processes included:

- two long-running Node Agentmemory worker/viewer processes, PIDs 2725 and
  8749;
- one iii process, PID 7324;
- multiple short-lived or client-style `agentmemory mcp` processes.

Observed listeners:

| PID | Process | Listener |
|---:|---|---|
| 7324 | iii | `127.0.0.1:3111` |
| 7324 | iii | `127.0.0.1:3112` |
| 7324 | iii | `*:49134` |
| 2725 | Node Agentmemory | `127.0.0.1:3113` |
| 8749 | Node Agentmemory | `127.0.0.1:3114` |

A later read-only `launchctl list` inventory bound PID 2725 to
`gui/501/com.agentmemory.server`. A filename-only search located its plist at
`/Users/base/Library/LaunchAgents/com.agentmemory.server.plist`. PIDs 8749
and 7324 had no matching launchd label. No process environment, plist
contents, credential, or secret value was inspected.

Process ownership, generation, and safe stop completeness remain unproved.
The wildcard iii control listener remains unexplained by an accepted local
profile and is a hard regression seed.

## Body-free HTTP observations

| Observation | HTTP | Bytes | Interpretation boundary |
|---|---:|---:|---|
| Direct `/agentmemory/livez` | 200 | 79 | liveness only |
| Direct global sessions without credential | 401 | 24 | direct boundary denied |
| Viewer 3113 global sessions without credential | 200 | 829,829 | protected viewer path succeeded |
| Viewer 3114 global sessions without credential | 200 | 829,829 | protected viewer path succeeded |
| Direct detailed health without credential | 200 | 13,400 | detailed health remained anonymous |

No response body was retained or examined. The direct/viewer status mismatch
reproduces the existing confused-deputy regression on both viewer origins.
The byte count demonstrates response presence only and must not be interpreted
as a content classification.

## Disposition

- Service process: live.
- Service self-report: healthy.
- Containment flag: context injection disabled.
- Viewer authorization regression: reproduced on two origins.
- Detailed-health anonymity: reproduced.
- Duplicate worker/viewer topology: still present.
- Wildcard iii listener: still present.
- Doctor truthfulness/policy contradiction: reproduced.
- Installed-runtime mutation authority: absent.
- Stage A, Stage B1, Stage B2, risk, ADR, ABM, Construction, package, canary,
  release, and rollout authority: absent.
