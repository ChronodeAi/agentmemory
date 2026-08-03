# Iteration 7 Emergency Local Runtime Containment Execution

Status: **CONTAINMENT VERIFIED**

Execution time: `2026-07-30T10:37:41-0500 (EST)`

Project: `github.com/chronodeai/agentmemory`

Scope: local macOS runtime only

Authority:

- disposition: `EMERGENCY LOCAL CONTAINMENT: AUTHORIZE`
- operator: Alexander Roberts
- disposition date: `2026-07-30`
- managed service bootout: authorized
- one graceful `TERM` to manual worker PID 8749: authorized
- one conditional graceful `TERM` to `iii` PID 7324: authorized
- restart or bootstrap: not authorized
- `KILL`, `agentmemory stop`, and `--force`: not authorized

Authority source:
`.aiwg/security/iteration-7-emergency-containment-decision-request.md`

## Pre-action identity revalidation

Immediately before containment, all three subjects matched the frozen
inventory:

| Subject | Revalidated identity | Revalidated listener |
|---|---|---|
| Managed worker/viewer | PID 2725, PPID 1, `node .../bin/agentmemory` | `127.0.0.1:3113` |
| Manual worker/viewer | PID 8749, PPID 4083, `node .../bin/agentmemory` | `127.0.0.1:3114` |
| Shared engine | PID 7324, PPID 2725, `.../.agentmemory/bin/iii --config .../iii-config.yaml` | `127.0.0.1:3111`, `127.0.0.1:3112`, `*:49134` |

The loaded service still mapped PID 2725 to
`gui/501/com.agentmemory.server`. The plist remained present at
`/Users/base/Library/LaunchAgents/com.agentmemory.server.plist`; its contents
and environment were not inspected.

## Authorized execution

1. Executed exactly:
   `launchctl bootout gui/501/com.agentmemory.server`.
2. After a bounded wait, `launchctl print` reported that the service did not
   exist in the `gui/501` domain, PID 2725 was absent, and no managed viewer
   replacement appeared.
3. Revalidated PID 8749 and its `127.0.0.1:3114` listener, then sent exactly
   one graceful `TERM`.
4. After a bounded wait, PID 8749 was absent and port 3114 was closed.
5. Revalidated that PID 7324 was the same `iii` executable. It remained
   orphaned under PPID 1 and continued to listen on 3111, 3112, and wildcard
   port 49134.
6. Because the exact conditional trigger remained true, sent exactly one
   graceful `TERM` to PID 7324.
7. After a bounded wait, PID 7324 was absent.

No `KILL`, `agentmemory stop`, `--force`, restart, bootstrap, install,
upgrade, deployment, plist change, configuration change, or data change was
performed.

## Final verification

| Check | Result |
|---|---|
| `gui/501/com.agentmemory.server` loaded | No |
| PID 2725 present | No |
| PID 8749 present | No |
| PID 7324 present | No |
| TCP listener on 3111 | No |
| TCP listener on 3112 | No |
| TCP listener on 3113 | No |
| TCP listener on 3114 | No |
| TCP listener on 49134 | No |
| Connection to 3111 | Refused |
| Connection to 3112 | Refused |
| Connection to 3113 | Refused |
| Connection to 3114 | Refused |
| Connection to 49134 | Refused |
| Automatic server or `iii` restart observed during immediate and five-second delayed checks | No |

Independent `agentmemory mcp` client processes were observed and intentionally
left untouched because they were outside the authorized server/engine
subjects and held none of the named listeners.

No response body, credential, prompt, memory, summary, session content,
process environment, or secret value was read or retained.

## Evidence classification

This is detached post-freeze containment execution evidence. It is not
admitted to the R27 manifest and must be admitted by a successor freeze before
use as gate evidence.

This result proves only that the named local runtime exposure was contained at
the verification time. It does not prove permanent remediation, qualify a
runtime, retire a risk, accept Stage A, admit B1/B2 evidence, pass ABM,
authorize Construction, or authorize restart, package, deployment, release,
or rollout work.
