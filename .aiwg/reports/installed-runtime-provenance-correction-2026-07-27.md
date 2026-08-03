# Installed Agentmemory Runtime Provenance Correction

Status: **BLOCKING CORRECTION - LIVE RUNTIME IS NOT OFFICIAL UPSTREAM**

Observed: 2026-07-27
Project: `github.com/chronodeai/agentmemory`
Decision effect: supervisor handoff is not executable

## Boundary

This report corrects the provenance of the currently installed and running
Agentmemory package. It changes no process, service, package, connector,
credential, memory data, or product source. No secret value was read or
printed.

The package name, version, and repository fields are labels, not build
provenance. Prior evidence that called the live runtime the official upstream
`0.9.28` rollback control relied on those labels and is superseded by the
byte-level comparison below.

## Official npm subject

The npm registry identifies the official
`@agentmemory/agentmemory@0.9.28` artifact as:

| Property | Value |
|---|---|
| npm git head | `08f742c13b1813f04ef9ddf38a55b881c5e35792` |
| npm SHA-1 | `31d0435983e7dcaa163c7c983843804bd2685f7c` |
| npm integrity | `sha512-DOiqZR7GKBedUCLAV2xW0rzaU2GUztvxLxesLNcjdzF1sFPxhMk8nrnKd79X9J9cOt2qvQIhGSJ/BcegnVo0Hw==` |
| downloaded archive SHA-256 | `b24425f277cb5a8fc098745b26743c7eb34c4ec07621eb651fbd3b5e7439fe27` |
| downloaded archive bytes | `1233685` |

The downloaded archive reproduced the npm SHA-1 exactly. It was unpacked only
under `/private/tmp/agentmemory-npm-0.9.28-audit-r16`; it was not installed or
executed.

## Installed subject

The active executable resolves to:

`/Users/base/.nvm/versions/node/v24.16.0/lib/node_modules/@agentmemory/agentmemory/dist/cli.mjs`

The installed package still reports name `@agentmemory/agentmemory`, version
`0.9.28`, and upstream repository metadata. Its bytes do not match the
official npm artifact:

| File | Installed SHA-256 | Official npm SHA-256 |
|---|---|---|
| `package.json` | `34bfbda9d47dcc7a0497c25db659c0dcc129cc5de1fd139e402227ad15076029` | `a2431d4b67bea5db07f90acbb7c3ee26cda3b060fc64713ae9ba4f231d4fcd80` |
| `dist/cli.mjs` | `8b054e65c387b168e5365ae35c9268f4d5bf220286a81235b47991073d33865e` | `b24475f12470e1ca7e4716a07c0b84f50a425b7fe8fcd7b9b9bb25f2f2a759b6` |
| `dist/index.mjs` | `251140bd94af02c417301c4cd3703a3e98f4ff29bc7da59d2e2d72a18184213b` | `131d34089f5f610c35e13e89254e73d22482a3eb12191cd6a8cf2ef484206216` |
| `dist/viewer/index.html` | `dfc9fc63fb2214dacfa02af3e2644e210718793b8c751f31e37666f7235dc48b` | `49e5634e659503f7b4091a6c7b98f252078a890809cc8db6fd093555281fc090` |

A recursive package comparison reported 112 differing or one-sided paths,
including CLI, hooks, runtime bundles, viewer, configuration, plugin metadata,
and package dependencies. The installed package adds the `yaml` dependency
introduced by ChronodeAi work.

## Source-map attestation

The installed bundle source maps contain 178 repository-owned source files.
All 178 embedded source blobs exactly match ChronodeAi commit
`b17d5d21c12e389f060c5848053df20f5ee69a82`
(`fix viewer health and scoped dashboard queries`). The installed
`src/viewer/index.html` and `package.json` also match that commit.

Commit `b17d5d2` descends from
`078001a954e530e22d11153267af900b599f9c3e`; 177 of the 178 embedded files
therefore also match that ancestor, while `src/triggers/api.ts` reflects the
later committed state. The earlier 177-plus-one comparison did not justify a
no-single-tree conclusion.

The installed artifact is source-consistent with commit `b17d5d2`. Exact
build provenance remains unverified because the installed package has no
build receipt, registry integrity binding, resolved tarball identity, or
proven byte-for-byte rebuild from that commit. Its package timestamp predates
the commit by minutes, which is consistent with a pre-commit working tree
later recorded by `b17d5d2`; it is not evidence of a different source tree.
The artifact is not the current candidate at
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`.

The deterministic comparison receipt is
`.aiwg/reports/installed-runtime-source-attestation-r18-2026-07-27.json`.

## Runtime and supervisor consequence

The live worker PID `38396` executes this installed fork-derived package. The
existing `com.agentmemory.server` LaunchAgent points to the same global
executable. Bootstrapping that LaunchAgent would persist the fork-derived
artifact; it would not hand control to official upstream.

The worker also started before the current `~/.agentmemory/.env` modification.
A fresh supervised process can therefore load configuration, including
secret-file authentication, that the current worker did not load. Connector
authentication and viewer behavior must be qualified before any stop.

The live slot endpoint currently returns the expected typed HTTP 503 disabled
response without returning memory content. This proves the current disabled
feature behavior only; it does not prove the post-restart authenticated path.

The Agentmemory log directory was observed as mode `0755` and its current
stdout/stderr files as mode `0644`. No log content was inspected, and this
observation does not establish that a secret or memory record is present.
Before a fresh secret-authenticated process is admitted, the successor
preflight must disposition log ownership, mode, retention, and redaction so a
new process cannot broaden access to sensitive output.

## Corrected disposition

1. Leave the terminal-owned worker and existing LaunchAgent untouched.
2. Invalidate the prepared upstream-supervisor handoff until a true official
   upstream rollback artifact is installed under an isolated, immutable
   prefix and independently identified.
3. Verify Codex, Claude, MCP, CLI, viewer, and REST authentication against a
   fresh process before stopping the current worker.
4. Resolve private log ownership, permissions, retention, and redaction before
   a fresh authenticated process writes to those sinks.
5. Treat temporary-containment results as evidence for this exact
   fork-derived installed artifact only.
6. Do not treat the current runtime as a canary for the current HEAD candidate.
7. Require a new explicit human decision before preparing or activating any
   replacement runtime.

Prior Revision 16 remains useful for its manifested bytes and containment
results, but its runtime-provenance conclusion is false and is superseded.
