# Iteration 6 Emergency Local Runtime Containment Decision

Status: **HUMAN AUTHORITY REQUIRED**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Scope: local macOS runtime only

## Observed reason

- Direct unauthenticated global-session access on `127.0.0.1:3111` returns
  HTTP 401.
- Both unauthenticated viewer proxies on 3113 and 3114 return HTTP 200 for the
  same global-session request and relay a protected response.
- Detailed health is also available without a credential.
- Two viewer/worker processes have different parentage.
- The shared `iii` process listens on wildcard IPv4 `*:49134`; reachability
  and protection on that boundary are untested.
- Context injection and Agentmemory plugins remain disabled.

No response body, credential, prompt, memory, summary, or session content is
included in the evidence.

## Requested bounded authority

Authorize only this reversible sequence:

1. inventory the exact two Node workers/viewers, shared `iii` engine, pidfile
   mapping, launchd state, and listeners without reading process environments
   or secret values;
2. gracefully stop both verified Node workers while leaving `iii` available
   long enough for orderly state flush;
3. verify all viewer and fallback ports are closed;
4. if protected exposure or wildcard listeners remain, stop only the verified
   shared `iii` process;
5. verify 3111, all viewer/fallback ports, and 49134 no longer answer;
6. leave memory data, secret files, hooks, provider configuration, repository
   source, tests, and package state untouched; and
7. do not restart, install, upgrade, deploy, or use `--force`.

The current official `agentmemory stop` command is not pre-authorized and must
not be assumed complete because it reads one worker pidfile while two workers
are live.

## Decision

Use exactly one disposition:

```text
EMERGENCY LOCAL CONTAINMENT: AUTHORIZE | RETURN

Authorize graceful shutdown of both verified Agentmemory Node workers:
YES | NO

Authorize shared iii shutdown only if exposure/listeners persist:
YES | NO

Authorize LaunchAgent unload:
YES | NO

Authorize restart after containment:
NO

Authorize --force:
NO

Security authority or operator name:
Disposition date:
Rationale or exact returned changes:
```

## Authority effect

`AUTHORIZE` permits only the exact local containment sequence above. It does
not accept Stage A, authorize product changes, qualify a runtime, admit B1/B2
evidence, retire a risk, pass ABM, authorize Construction, or authorize
package, deployment, release, or rollout work.

