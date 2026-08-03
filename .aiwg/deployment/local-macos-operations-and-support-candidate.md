# Agentmemory Local macOS Operations and Support

Status: Review candidate with DEC-13/DEC-14 choices applied; no service or installation change authorized
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Deployment target: `local-macos`

## Purpose

Define the candidate local package, service, credential, logging, support,
upgrade, rollback, and uninstall contract. This document does not mutate the
installed runtime or authorize Construction, qualification, canary, or release.

DEC-13 selects project-specific processing-policy Option A: `zero-egress` is
the default, while `provider-enabled` requires an exact accepted provider
manifest. DEC-14 selects bearer-authenticated viewer Option A: the static
shell, assets, viewer data, API, and MCP require bearer authentication, and
only `GET /agentmemory/livez` is unauthenticated. These choices are recorded in the
[Iteration 4 Local macOS Human Disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md);
they do not accept this operations candidate or authorize implementation or
runtime mutation. They do not accept Stage A, pass ABM, or authorize
Construction.

## Ownership model

Agentmemory owns only resources carrying its exact accepted ownership marker
and release identity. Ambiguous, malformed, legacy-unowned, or concurrently
changed resources return `REVIEW_REQUIRED` and remain unchanged.

Candidate roots:

```text
~/Library/Application Support/Agentmemory/releases/<release-id>/
~/Library/Application Support/Agentmemory/current
~/.agentmemory/
~/Library/Logs/Agentmemory/
~/Library/LaunchAgents/com.chronode.agentmemory.plist
```

The release prefix is immutable after verification. `current` is an atomic
activation pointer. Persistent project data remains separate from release
bytes. A final architecture decision must disposition migration from existing
paths before these roots become normative.

## Instance isolation

| Instance | Candidate label | Ports | State |
|---|---|---|---|
| Normal | `com.chronode.agentmemory` | 3111/3112/3113 | normal project state |
| Canary | `com.chronode.agentmemory.canary` | 3211/3212/3213 | isolated synthetic/canary state |
| Rollback | `com.chronode.agentmemory.rollback` | 3311/3312/3313 | isolated rollback qualification state |

Each instance also receives a unique engine port, pidfile, lock, log root,
secret, project registry, and service ownership marker. No shared mutable
runtime or state path is permitted across instances.

## Transactional setup

`agentmemory setup` must:

1. preflight OS, architecture, Node, disk, ports, existing ownership, and
   provider installations;
2. bind one project-specific processing policy, resolving to `zero-egress`
   unless an exact accepted provider manifest authorizes `provider-enabled`;
3. stage an immutable package and verify source, lockfile, checksums, SBOM,
   provenance, package, iii, schema, viewer, plugin, and hook identities;
4. generate a fresh local credential without printing it;
5. enroll one canonical project and reject collisions;
6. prepare exact Codex and Claude ownership plans;
7. create and verify a backup before adopting existing state;
8. write and validate a LaunchAgent candidate;
9. atomically install connector and service resources;
10. start, reconcile, and verify liveness, readiness, capture readiness, viewer
    compatibility, authenticated save, and project-scoped recall;
11. rollback every owned change on any failure;
12. emit one redacted state card and retained receipt.

Repeating setup on the same accepted state produces zero resource duplication
and no unrelated configuration diff.

## LaunchAgent contract

The accepted plist must bind:

- exact label and release-root executable;
- exact instance, ports, state, pidfile, lock, and log roots;
- explicit `AGENTMEMORY_SECRET_FILE`, never a raw secret;
- processing mode and project policy location;
- `RunAtLoad`, restart, throttling, and shutdown behavior;
- private stdout/stderr paths;
- no shell interpolation or mutable `PATH` dependency;
- exact plist hash and ownership marker.

Startup order is:

1. acquire instance lock;
2. validate release and configuration identities;
3. validate credential and project policy;
4. start or adopt the owned iii engine;
5. start the worker;
6. reconcile sessions, event ledger, queues, indexes, and generations;
7. expose readiness only after required reconciliation;
8. expose capture readiness only after the worker is connected.

Shutdown drains the worker and durable queue before stopping the owned engine.
An unowned engine or process is never signalled automatically.

## Credential contract

- Generate a fresh random local credential for every admitted instance.
- Never import or reuse any unknown, historical, or Railway-derived credential.
- Secret parent directories are mode `0700`; secret/config files are `0600`.
- Reject symlinks, hard-link ambiguity, ownership mismatch, world/group access,
  unreadable files, and invalid higher-precedence security values.
- Process environment may override lower-precedence configuration only when
  valid; invalid higher-precedence security data fails closed.
- Do not place raw secrets in plist files, commands, logs, support output,
  receipts, UI, health, metrics, backups, hooks, or provider payloads.

## Network and authentication

- Bind API, streams, MCP, static viewer shell/assets/data, and any selected
  local gateway or relay paths to loopback.
- Permit unauthenticated `GET /agentmemory/livez` only.
- Require bearer authentication for the static viewer shell, assets, viewer
  data, API, and MCP; there is no unauthenticated data-free-shell exception.
- Require operation-, resource-, project-, generation-, issuer-, audience-,
  key-, replay-, validity-, and revocation-bound authority for protected paths.
- Return typed `401`, `403`, or `503` without governed domain effects.
- Never downgrade a protected failure to local fallback or broader scope.

Bearer issuance, browser bootstrap, storage, refresh, revocation, and
presentation for the initial shell and dependent assets remain an open
architecture/security contract. This candidate accepts no query-token,
cookie, fragment, launcher, proxy, or service-worker mechanism by implication.
- Treat `zero-egress` as the project default. Permit `provider-enabled` only
  when the exact provider, destination, purpose, data class, project, and
  session are covered by an accepted provider manifest after minimization and
  redaction.

## Health and status

The shared state card reports:

- release, source, package, iii, worker, API, MCP, plugin, hook, schema, viewer,
  configuration, and data-generation identities;
- instance, project, privacy, processing mode, and external-processing state;
- liveness, readiness, capture readiness, and viewer compatibility separately;
- current supervisor and ownership;
- last verified backup;
- rollback-subject availability;
- one actionable next step.

`Unknown` is permitted only as a typed observed state with the missing evidence
and next action. It is never a healthy fallback. A live port or viewer route
cannot establish worker or capture readiness.

## Logs

- Directory mode `0700`; file mode `0600`.
- No raw query, prompt, memory, session title, procedural-memory name, secret,
  token, capability, or provider payload by default.
- Use bounded identifiers, hashes, typed outcomes, counts, and redacted error
  classes.
- Define maximum file size, rotation count, retention, and explicit deletion.
- Rotation or logging failure cannot disable authentication, policy, or
  evidence requirements.
- Startup scans active logs and failure remnants for the synthetic secret
  corpus during qualification.

## Backup and restore

Backup requires:

- exact project/global scope and generation manifest;
- release/config/schema identity;
- protected local destination or encryption;
- no raw secret material;
- content-addressed inventory and independent read-back;
- retained failure receipt.

Restore is exact and generation-fenced. It cannot merge silently, expose mixed
generations, discard append-only audit truth, or report success before all
readers observe the activated generation.

## Upgrade

1. verify current health and ownership;
2. create and independently read back a backup;
3. stage a new immutable release;
4. verify package and compatibility identities;
5. run isolated migration and restore rehearsal;
6. stop admission of new work and drain the owned worker;
7. atomically activate runtime release, configuration, plugins/hooks, and data
   generation;
8. restart and complete reconciliation;
9. verify all health surfaces and lifecycle journeys;
10. automatically reactivate the prior runtime and data generation on failure.

Dependency mutation inside the active working directory is not an accepted
upgrade mechanism.

## Rollback

Runtime-release rollback and data-generation rollback are distinct atomic
operations coordinated by one transaction. Audit truth and failed-attempt
receipts are retained.

Before the first candidate switch, a registry-verified official-upstream
subject must be installed and independently qualified under the rollback
instance. The stopped prior preparation run cannot be reused.

## Uninstall

Default uninstall:

- boots out only the exact owned LaunchAgent;
- stops only owned processes;
- removes only owned connector, plugin, hook, plist, release, pid, lock, and
  generated support resources;
- leaves persistent memory and backups intact;
- verifies unrelated provider configuration is byte-identical;
- reports retained data and one explicit purge command.

Data purge is a separate destructive decision with exact scope, preview,
confirmation, and post-deletion verification.

## Support output

Support output is:

- project-scoped and explicit about any global scope;
- data-minimized and secret-scanned;
- free of raw query, prompt, memory, title, and provider payload by default;
- generated locally into a private directory;
- accompanied by a human-readable manifest;
- reviewable before any transfer;
- governed by explicit retention and deletion.

No automatic upload is permitted.

## Qualification and handoff

This contract is qualified only by the accepted local macOS profile and all
`LQ-001..014` journeys. A passed qualification does not authorize a normal
runtime switch.

Any handoff must name exact release, plist, configuration, secret-file
identity, ports, state, backup, rollback, qualification bundle, operator, and
interruption window. The current foreground worker and unloaded legacy plist
remain untouched until that later decision.
