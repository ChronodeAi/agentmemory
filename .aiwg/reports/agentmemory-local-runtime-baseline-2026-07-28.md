# Agentmemory Local Runtime Baseline

Status: Observational receipt; not release admission
Observed: 2026-07-28
Project scope: `github.com/chronodeai/agentmemory`
Release target: Current macOS host, local-only
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Installed package reported version: `0.9.28`
Installed iii version: `0.11.2`

## Purpose

This receipt refreshes the historical local-runtime evidence without changing
the installed runtime, configuration, credentials, service state, package,
hooks, memories, or repository product code.

It records operational facts for Elaboration. It does not qualify the installed
runtime as the current candidate, admit a canary, retire a risk, accept an ADR,
change the ABM result, authorize Construction, or authorize release.

## Observation boundary

The observation used:

- exact installed CLI commands;
- loopback liveness and health requests;
- unauthenticated negative requests to protected API paths;
- process and listener inspection;
- LaunchAgent registration inspection; and
- repository and installed-package identity inspection.

No credential value, provider response, memory content, prompt content, or
secret-bearing configuration was read or copied into this receipt.

## Results

| Surface | Observed result | Interpretation |
|---|---|---|
| CLI identity | `agentmemory --version` reports `0.9.28` | Installed package identity only; not proof that candidate source is deployed |
| CLI status | Connected to `http://localhost:3111` | Supported CLI can reach the local authenticated service |
| Service health | `healthy`, circuit closed, zero active alerts | Current sampled backend health is good |
| REST liveness | `status: ok` on loopback | REST process is live |
| Viewer liveness | `status: ok` on port 3113 | Viewer server is live |
| Protected endpoints | Unauthenticated flags and graph requests return `401` | Authentication is enforced on sampled protected paths |
| Doctor | 9 of 10 operational checks pass | Context injection is disabled; all other reported server checks pass |
| Context injection | `AGENTMEMORY_INJECT_CONTEXT` is disabled | Explicit recall remains the active safe posture |
| Provider features | LLM and embeddings reported enabled | Local deployment does not imply zero external processing |
| Knowledge graph | Populated | Current runtime reports graph data, not graph correctness |
| Current scope | `github.com/chronodeai/agentmemory` | Sampled status is project-scoped |
| Browser viewer | Rendered `healthy`, `connected`, version `0.9.28` | The previously reported `Unknown` state is not currently stuck |
| Viewer scope | Rendered 595 sessions and semantic memory material without a visible project/global label or selector | Scope and authority are ambiguous; project-scoped CLI status reported one session |
| Viewer diagnostics | Browser console retained repeated `API GET health returned 503` warnings at one timestamp before the current healthy render | Recovery is visible, but the degraded/503 rendering contract remains unqualified |
| Project health MCP | Success for `github.com/chronodeai/agentmemory` | Scope coverage reported `1`, project-unscoped records `0`, and one project session |
| Retrieval utility | Retrieval use `0`, commit coverage `0`, two context packets | Capture exists, but the recall-to-provenance loop is not currently exercised |
| Durable intelligence | Zero project memories, lessons, insights, promotions, or pending promotions | No durable project intelligence is available from the sampled health surface |
| Global unscoped inventory | 1,887 records | Large legacy/global scope requires explicit governance and must never enter project recall implicitly |
| Slot listing MCP | `500 Internal Server Error` | Known functional defect remains reproducible |
| Deep diagnostics | 14 pass, one warning, zero fail | Two of two latest durable memories lack project scope; no migration was run |
| Diagnostic coverage | Overall health remains `healthy` while slots fail and unscoped durable records remain | Current top-level health omits gate-relevant capability and scope failures |
| Current-session context probe | Rejected as `session does not belong to project` | Fail-closed ownership is positive, but the active AIWG session is not integrated |
| Existing-session context probe | Success in 33 ms with zero tokens and zero source IDs | No cross-project result leaked; no useful project context was retrieved |
| LaunchAgent file | `com.agentmemory.server.plist` exists | Installation material is present |
| LaunchAgent registration | Service is not loaded in `gui/501` | Runtime is not currently governed by the intended persistent supervisor |
| Worker process | Foreground `node .../agentmemory` process is active | Closing the owning terminal may stop the worker |
| iii engine | Local iii process is listening on 3111 and 3112 | Engine is alive, but service ownership and lifecycle remain unqualified |

The sampled project status reported one session, one observation, zero durable
memories, and a populated graph. These counts are volatile runtime facts and
must not be used as a release denominator.

## Sandbox diagnostic caveat

An in-sandbox doctor invocation reported the server unreachable even while
listeners existed. A loopback request made through the same restricted command
environment also failed unless direct no-proxy loopback was forced.

The same read-only doctor command outside that network sandbox reported the
service connected and healthy. Therefore:

- the live local service is not classified as down from the sandbox result;
- sandbox-localhost behavior must not be used as product health evidence;
- release tests must declare whether they run inside a network sandbox; and
- the diagnostic contract should distinguish service failure from an execution
  environment that cannot reach host loopback.

## Truthfulness findings

1. The supported `status` surface currently reports `healthy`; the earlier UI
   `Unknown` observation was not reproduced by the CLI, health endpoint, or
   current browser render in this receipt.
2. Doctor displays `9/10 passing` while its dry-run plan says there are no fixes
   to run. That may be intentional for an operator-selected feature, but the
   wording can be misread as all health requirements passing.
3. The browser viewer displays global-looking aggregate counts and memory
   material without a visible project/global scope label while project-scoped
   CLI status reports a materially smaller denominator. This is an
   authority/privacy ambiguity and potential cross-project disclosure until the
   viewer scope contract and capability are proved.
4. Project health reports zero project-unscoped records, but also reports 1,887
   global unscoped records. Clean new-project scoping does not dispose the
   legacy/global inventory or prove that implicit retrieval cannot surface it.
5. Retrieval use and commit coverage are both zero, and no durable project
   lesson, insight, promotion, or memory exists. This runtime is capturing a
   minimal session, not yet delivering a qualified coding-memory lifecycle.
6. A bounded context packet against the one known project session returned
   zero tokens and zero sources without global leakage. The current AIWG
   session was rejected by the session/project ownership guard rather than
   auto-registered. Scoping failed closed; session integration and usefulness
   did not pass.
7. Project-scoped slot listing still fails with an internal-server error.
8. Deep diagnostics reports two of two latest durable memories without project
   scope and offers an inference migration. No migration or heal was run.
9. The top-level service and Doctor can report healthy while slot operations
   fail and deep diagnostics retains a scope warning. This is a silent
   diagnostic-coverage and truthful-degradation gap.
10. The viewer rendered data without an interactive authentication step. This
   does not prove that its proxy data path is unauthenticated, but it confirms
   that the end-user authority model is not visible and requires explicit
   qualification.
11. Repeated transient health-503 browser warnings and a later healthy card show
   recovery, but do not prove correct degraded-state body handling or rule out
   an intermediate unexplained `Unknown`.
12. A live foreground runtime is not equivalent to a persistent packaged local
   service.
13. A healthy installed `0.9.28` runtime is not evidence that the undeployed
   current candidate is healthy.
14. One current healthy browser render is not the required compatibility and
   degraded-state matrix.

## Current disposition

| Decision surface | Disposition |
|---|---|
| Installed local runtime liveness | OBSERVED PASS |
| Installed local backend sampled health | OBSERVED PASS |
| Protected-route authentication sample | OBSERVED PASS |
| Persistent service supervision | NOT SATISFIED |
| Automatic context injection | DISABLED |
| Current browser healthy render | OBSERVED PASS |
| UI scope/authority labelling | OBSERVED FAIL / AMBIGUOUS |
| UI degraded-state compatibility matrix | NOT QUALIFIED |
| Project health MCP | OBSERVED PASS |
| Project slot listing | OBSERVED FAIL / HTTP 500 |
| Retrieval and commit utilization | OBSERVED ZERO |
| Durable project intelligence | OBSERVED ZERO |
| Deep diagnostic structural checks | OBSERVED PASS WITH ONE SCOPE WARNING |
| Top-level health completeness | OBSERVED FAIL / FALSE-COMPLETE |
| Context-packet project isolation | OBSERVED PASS / EMPTY RESULT |
| Current-session integration | OBSERVED FAIL / NOT REGISTERED |
| Candidate package deployment | NOT PERFORMED |
| Backup, restore, upgrade, rollback, uninstall | NOT QUALIFIED |
| Local release admission | NOT AUTHORIZED |

## Required successor evidence

Before local release admission, the accepted local qualification profile must
produce independently reviewable receipts for:

1. clean isolated installation under an owned immutable prefix;
2. LaunchAgent load, singleton behavior, restart, crash recovery, and uninstall;
3. authenticated CLI, REST, MCP, viewer, Codex, and Claude compatibility;
4. explicit context-injection policy and truthful disabled-state reporting;
5. two-project isolation and canonical identity collision handling;
6. local secret-file handling and secret-corpus negative tests;
7. exact backup, migration, restore, upgrade, and rollback;
8. browser-level health and degraded-state rendering;
9. a separately installed official-upstream rollback subject; and
10. one frozen receipt set tied to exact package, engine, schema, plugin, hook,
    and UI identities.
