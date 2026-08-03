# Upstream Agentmemory Runtime Supervisor Handoff

Status: **INVALIDATED - PROVENANCE AND AUTHENTICATION PREFLIGHT BLOCK**
Date: 2026-07-26
Runtime role: fork-derived, upstream-labelled `0.9.28` currently in place
Fork activation: already occurred outside the governed canary sequence

## Purpose

This runbook originally defined a bounded handoff from the currently healthy,
terminal-associated Agentmemory process to the existing
`com.agentmemory.server` LaunchAgent. It exists to qualify persistent local
supervision before any ChronodeAi fork canary.

Preparing this document does not authorize a process stop, service bootstrap,
configuration change, restart rehearsal, fork installation, or runtime switch.

## Invalidation

Byte-level comparison performed on 2026-07-27 proves that the global package
targeted by both the live worker and the LaunchAgent is not the official npm
`0.9.28` artifact. It is a ChronodeAi-derived build whose 178 embedded
repository sources, installed viewer, and package manifest match commit
`b17d5d2`. Exact build provenance and byte-for-byte reproducibility remain
unverified because no build receipt or registry integrity binding identifies
the installed artifact.

Bootstrapping the current plist would persist that fork-derived build. It
would not restore an upstream rollback control. The worker also predates the
current `.env`, so a fresh process can enforce authentication differently from
the live process.

All execution steps below are retained as design input only. They are
non-executable until:

1. an official npm `0.9.28` artifact is installed under an isolated,
   immutable prefix and its registry integrity is independently verified;
2. fresh-process Codex, Claude, MCP, CLI, viewer, and REST authentication is
   qualified without exposing the secret;
3. rollback from the proposed supervisor subject is proven; and
4. a new human decision authorizes that exact artifact and handoff bundle.

See
`.aiwg/reports/installed-runtime-provenance-correction-2026-07-27.md`.

## Current state

| Surface | Direct observation |
|---|---|
| Installed binary | `/Users/base/.nvm/versions/node/v24.16.0/bin/agentmemory` |
| Installed identity | ChronodeAi-derived, upstream-labelled `0.9.28`; source-consistent with `b17d5d2`, not official npm bytes, and not exact-build-reproducibility qualified |
| API | Healthy on loopback port 3111 |
| Viewer | `GET /` returned HTTP 200 and 200275 bytes on loopback port 3113; route response only, not current browser correctness or compatibility |
| Worker | Connected but attached to terminal shell PID 49585 |
| Engine | Managed iii `0.11.2`, parent PID 1 |
| LaunchAgent plist | `/Users/base/Library/LaunchAgents/com.agentmemory.server.plist` exists with `KeepAlive` and `RunAtLoad`; it targets the same fork-derived global package |
| LaunchAgent domain | `com.agentmemory.server` is not currently loaded; it is absent from the explicit disabled map |
| Historical control | LaunchAgent health verified on 2026-07-22 |

PIDs, ports, heap values, and process ancestry must be rediscovered at
execution time. The values above are observations, not command inputs.

## Required authorization

The prior `AUTHORIZE UPSTREAM SUPERVISOR HANDOFF` option is withdrawn because
its named execution subject does not exist. No current response authorizes this
runbook. A successor decision must identify the official artifact, isolated
prefix, authentication-preflight receipt, plist hash, and rollback bundle.

After those prerequisites exist, a successor decision may authorize only:

1. A controlled stop of the current fork-derived terminal process.
2. Bootstrap and enablement of a separately prepared official-runtime
   LaunchAgent.
3. Health, UI, process-ownership, and one restart-recovery rehearsal.
4. Rollback to the exact successor-authorized recovery subject if an
   acceptance check fails.

It does not authorize installing the ChronodeAi fork, changing memory data,
enabling optional slots, changing automatic injection, editing credentials,
or deleting logs.

## Preconditions

- Capture a sanitized pre-handoff health snapshot and current process tree.
- Verify the current binary and plist paths, file owners, modes, and SHA-256
  values without printing environment secrets.
- Confirm the loaded worker is the recorded fork-derived runtime and that the
  isolated official artifact is a different, independently identified subject.
- Confirm one current Agentmemory worker and one managed iii engine.
- Confirm the API and viewer currently respond by supported `GET` methods.
- Notify the operator that the UI will have a bounded interruption.
- Do not proceed while a migration, consolidation, backup, export, or other
  governed mutation is active.
- Require private ownership and restrictive modes for every fresh-process log
  sink, with explicit retention and redaction disposition.
- Preserve current logs; do not inspect or reproduce credential-like values.

## Controlled handoff

1. Record the dynamic terminal-worker PID and verify its executable path.
2. Request graceful termination of that worker.
3. Wait for its Agentmemory API, MCP, and viewer listeners to release. Do not
   start a second worker against occupied ports.
4. Bootstrap the existing plist into the current user GUI domain and verify
   that the service is loaded.
5. Enable and kick-start the exact `com.agentmemory.server` label.
6. Verify exactly one Agentmemory worker, no controlling TTY, and launchd
   ownership.
7. Verify API liveness, authenticated health, viewer `GET`, absolute-path
   Doctor, and the expected typed disabled-slot response.
8. Capture sanitized before/after process, listener, build, and health
   identities.

No command in this sequence may print an authentication value, environment
secret, memory content, or raw query text.

## Restart-recovery rehearsal

After the initial handoff passes:

1. Record a sanitized healthy snapshot and active-worker identity.
2. Ask launchd to restart the same label once.
3. Verify the old worker exits and exactly one replacement worker appears.
4. Verify the service does not report healthy before its required worker is
   connected.
5. Verify API liveness, authenticated health, viewer `GET`, and Doctor again.
6. Confirm no duplicate worker, duplicate listener, duplicate session
   transition, or unexpected memory mutation.

This would be one local rollback-control rehearsal. It is not fork-canary
evidence and cannot retire a product risk.

## Acceptance criteria

All conditions must hold:

- `com.agentmemory.server` is loaded, enabled, and uses the expected plist.
- Exactly one official npm `0.9.28` rollback worker runs without a controlling
  TTY, from the separately verified immutable prefix.
- The managed iii engine remains at the accepted `0.11.2` identity.
- Liveness and authenticated health succeed after initial start and restart.
- Health reports one connected worker, closed circuit, and no critical alert.
- Viewer `GET` returns HTTP 200 after initial start and restart.
- Absolute-path Agentmemory Doctor reports all server checks passing.
- Slots return the expected typed disabled-feature response unless separately
  authorized; optional-feature absence is not silently reported as success.
- No duplicate listener, worker, session transition, or governed memory
  mutation is observed.
- Logs and evidence contain no credential value or raw memory content.
- The exact successor-authorized recovery subject remains recoverable.

Heap pressure is reported, not hidden. This handoff does not qualify capacity;
the accepted load profile and R-07 evidence remain separate.

## Stop conditions

Stop and roll back on:

- executable, plist, package, or build-identity mismatch;
- more than one Agentmemory worker or listener owner;
- failure to release a port;
- service health without a connected worker;
- API, viewer, or Doctor failure after the bounded recovery interval;
- unexpected session, observation, index, credential, or configuration
  mutation;
- credential-like content in command or evidence output; or
- inability to restore the exact successor-authorized recovery subject.

## Rollback

1. Stop and boot out only the newly loaded `com.agentmemory.server` service.
2. Verify its worker and listeners are gone.
3. Restore the recorded pre-handoff fork-derived process mode only if the
   successor authorization names it as the bounded emergency rollback target;
   otherwise start the separately verified official artifact.
4. Reverify liveness, authenticated health, viewer `GET`, and Doctor.
5. Record the failed criterion and sanitized state transition.

Rollback does not delete logs, memory data, configuration, or the plist.

## Evidence disposition

The handoff receipt must contain metadata and hashes only:

- operator authorization reference;
- binary, package, plist, and configuration-source identities;
- pre/start/restart/rollback timestamps and process/listener identities;
- health and viewer status classes;
- Doctor result;
- slot feature-state result;
- duplicate and unexpected-mutation counts; and
- executor and independent verifier dispositions.

It must not contain secrets, raw memory records, query text, provider payloads,
or unredacted environment values.
