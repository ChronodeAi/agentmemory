# Iteration 7 Emergency Local Runtime Containment Decision

Status: **HUMAN AUTHORITY REQUIRED**

Date: 2026-07-30

Project: `github.com/chronodeai/agentmemory`

Scope: local macOS runtime only

Supersedes:
`.aiwg/security/iteration-6-emergency-containment-decision-request.md`

## Observed reason

- Direct unauthenticated global-session access on `127.0.0.1:3111` returns
  HTTP 401.
- Both unauthenticated viewer proxies on 3113 and 3114 return HTTP 200 for the
  same global-session request and relay a protected response.
- Detailed health is available without a credential.
- Context injection and Agentmemory plugins remain disabled.
- The shared `iii` process listens on wildcard IPv4 `*:49134`; reachability
  and protection on that boundary are unproved.

No response body, credential, prompt, memory, summary, session content,
process environment, or secret value was read or retained.

## Exact service inventory

A fresh read-only `launchctl list` inventory established:

| Subject | Current identity | launchd identity |
|---|---|---|
| Managed Agentmemory worker/viewer | PID 2725 | `gui/501/com.agentmemory.server` |
| Manual Agentmemory worker/viewer | PID 8749 | no matching launchd label |
| Shared `iii` engine | PID 7324 | no matching launchd label |

The managed service plist exists at:

`/Users/base/Library/LaunchAgents/com.agentmemory.server.plist`

Only its filename and service label were used. Its environment and secret
values were not inspected.

## Requested bounded authority

Authorize only this reversible fail-closed sequence:

1. revalidate that PIDs 2725, 8749, and 7324 still identify the same three
   subjects and listeners; if any identity changed, stop and return for new
   authority;
2. run exactly
   `launchctl bootout gui/501/com.agentmemory.server` to terminate and unload
   only the managed worker/viewer; do not disable, edit, move, or delete its
   plist;
3. verify `gui/501/com.agentmemory.server` is no longer loaded and PID 2725
   has exited; if either check fails, stop;
4. send one graceful `TERM` to revalidated PID 8749, wait for bounded clean
   exit, and do not escalate to `KILL`;
5. verify 3113, 3114, and any discovered viewer/fallback ports are closed;
6. only if protected exposure, 3111/3112, or wildcard 49134 remains, send one
   graceful `TERM` to revalidated PID 7324, wait for bounded clean exit, and
   do not escalate to `KILL`;
7. verify 3111, 3112, all viewer/fallback ports, and 49134 no longer answer;
8. leave memory data, secret files, hooks, provider configuration, repository
   source, tests, package state, and the LaunchAgent plist untouched; and
9. do not restart, bootstrap, install, upgrade, deploy, use
   `agentmemory stop`, or use `--force`.

Any identity mismatch, automatic restart, failed graceful exit, unexpected
listener, or verification ambiguity stops the sequence and requires a new
decision.

## Separate rollback identity

The reversible service restoration command would be:

`launchctl bootstrap gui/501 /Users/base/Library/LaunchAgents/com.agentmemory.server.plist`

This command is recorded only to make reversibility explicit. It is not
authorized by this request and requires separate restart authority after
containment evidence is reviewed.

## Decision

Use exactly one disposition:

```text
EMERGENCY LOCAL CONTAINMENT: AUTHORIZE | RETURN

Authorize exact bootout of gui/501/com.agentmemory.server:
YES | NO

Authorize one graceful TERM to revalidated manual worker PID 8749:
YES | NO

Authorize one graceful TERM to revalidated iii PID 7324 only if protected
exposure or listeners persist:
YES | NO

Authorize restart or bootstrap after containment:
NO

Authorize KILL, agentmemory stop, or --force:
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

Until the sequence is explicitly authorized and verified, Stage-A
submission, PoC admission or execution, and architecture advancement remain
blocked.
