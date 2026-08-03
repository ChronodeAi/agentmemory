# Agentmemory Local macOS Qualification Profile

Status: Exact profile accepted for Stage-A specification only; Stage A pending
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Development case: `.aiwg/planning/development-case-local-macos.md`
Human disposition:
`.aiwg/reports/iteration-4-local-macos-human-disposition-2026-07-28.md`

## Decision boundary

DEC-12 accepts the exact profile tuple below and its 740-file-execution and
42-lifecycle-journey denominators for Stage-A specification only. It does not
accept Stage A, the Master Test Plan, R-13, requirements, realizations,
architecture, risks, ABM, Construction, canary, or release.

Stage A remains pending. B1 and B2 remain blocked and are separate later
decisions; no mechanics or execution is authorized.

## Mandatory host profile

Profile ID:

`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

| Dimension | Exact value |
|---|---|
| OS | macOS 26.5.1 |
| Build | 25F80 |
| Architecture | arm64 |
| Node | 24.16.0 |
| npm | 11.13.0 |
| Package engine floor | Node >=20.19.0 |
| Service class | user LaunchAgent |
| Network | isolated loopback ports |
| Home/state | clean disposable roots |
| Project scope | two synthetic canonical projects plus collision fixtures |

The host default Node 26.0.0/npm 11.12.1 is not in this mandatory denominator.
Node 22, Ubuntu, Windows, container, public, Railway, and multi-host profiles
are deferred portability or compatibility work.

## R-13 deterministic cohort

The mandatory cohort is:

- one exact profile;
- five consecutive raw runs;
- 148 of 148 governed test files per run;
- 740 governed file-executions in total;
- every accepted assertion identity executed and passed;
- every accepted bearer and project-capability authentication identity
  executed and passed;
- zero failed, skipped, pending, todo, disabled, extra, missing, or changed
  item; and
- every failed attempt retained in the evidence bundle.

Required outputs:

1. five raw runner receipts;
2. exact source, package-lock, iii, profile, assertion-manifest,
   authentication-manifest, environment-allowlist, and fixture identities;
3. one signed cohort statement;
4. one independently verified immutable bundle;
5. one custody receipt and independent read-back;
6. one complete failure-attempt index.

The historical 1,629-test result is provisional mechanics evidence until the
assertion-identity denominator is accepted and reproduced.

## Processing-policy cohort

Deployment target is fixed to `local-macos`; processing mode is varied:

### PP-01 zero-egress

- exact policy selected;
- missing policy fails closed;
- no external model, embedding, fallback, telemetry, or content-processing
  attempt;
- DNS, socket, HTTP, SDK, and fallback recording sinks observe zero attempts;
- local unavailability is reported without mode change.

### PP-02 provider-enabled

- exact synthetic provider/destination/purpose/data-class manifest selected;
- project/session attribution recorded before the boundary;
- minimization and redaction occur before the recording sink;
- one allowed attempt and result are attributable;
- every unlisted provider, destination, purpose, class, project, or session is
  denied with zero governed effect;
- no real external request occurs without separate authorization.

Both policies must pass in every qualifying local cohort. A provider-enabled
deployment cannot be labelled zero egress.

## Local lifecycle denominator

Suite ID: `T-LOCAL-DEPLOY`

Each journey has a frozen assertion manifest, pre-state, stimulus, expected
durable state, forbidden effects, teardown, and receipt schema.

| Journey | Required behavior |
|---|---|
| LQ-001 | Install an immutable commit-identified package into an isolated owned prefix |
| LQ-002 | Run transactional setup twice; second run is idempotent and changes no unrelated bytes |
| LQ-003 | Install and bootstrap the owned user LaunchAgent with exact label and plist identity |
| LQ-004 | Prove singleton, crash restart, worker/engine ordering, and startup reconciliation |
| LQ-005 | Prove loopback binding, non-loopback denial, `/agentmemory/livez` exception, and selected viewer-shell contract |
| LQ-006 | Exercise the complete protected CLI/REST/MCP/viewer-data authentication and capability matrix |
| LQ-007 | Enroll canonical projects; reject remote/path/worktree collisions and ambiguous identity |
| LQ-008 | Connect, repeat, repair, and remove Codex ownership without duplicate hooks or unrelated changes |
| LQ-009 | Connect, repeat, repair, and remove Claude ownership without duplicate hooks or unrelated changes |
| LQ-010 | Prove two-project and explicit-global isolation across storage, recall, slots, viewer, sessions, and counters |
| LQ-011 | Execute PP-01 zero-egress with complete attempt recording |
| LQ-012 | Execute PP-02 provider-enabled policy with synthetic recording sinks |
| LQ-013 | Create backup, migrate, restore exactly, upgrade atomically, and preserve concurrent-reader semantics |
| LQ-014 | Qualify side-by-side rollback, switch denial, rollback recovery, uninstall, support output, and health truthfulness |

Required lifecycle cohort:

- three independent clean-home repetitions;
- 14 of 14 journeys per repetition;
- 42 of 42 journey executions in total;
- zero missing, skipped, disabled, or silently retried journey;
- all failures and interruption attempts retained;
- unrelated provider configuration byte-identical before and after.

## UI and health truthfulness

Browser-level evidence is mandatory; route liveness alone does not qualify the
viewer.

The frozen matrix must cover:

- backend `HEALTHY`, `DEGRADED`, `RECOVERING`, and `UNAVAILABLE`;
- fetch `OK`, `UNAUTHORIZED`, `TIMEOUT`, `TRANSPORT_ERROR`, `MALFORMED`, and
  `STALE`;
- compatibility `COMPATIBLE`, `INCOMPATIBLE`, and `NOT_EVALUATED`;
- worker disconnected while ports remain live;
- viewer/backend identity mismatch;
- project/global scope and denominator labelling;
- no unexplained `Unknown`;
- no false healthy;
- bearer-authenticated initial shell, dependent assets, viewer data, API, and
  MCP, with no unauthenticated shell exception.

Each browser case requires a screenshot, backend receipt, rendered state
capture, accessibility result, and exact viewer/backend build identities.

## Local service and privacy evidence

Mandatory negative evidence includes:

- fresh credential generation with no historical-credential import;
- secret parent mode `0700` and secret/config file mode `0600`;
- symlink, ownership, permission, unreadable-file, stale-key, replay, and
  issuer/key-confusion denial;
- zero synthetic-secret occurrence in logs, stderr, exceptions, hooks, UI,
  health, metrics, support output, receipts, snapshots, backups, and provider
  payloads;
- no raw query or memory text in default logs;
- bounded private logs with rotation and retention;
- project-scoped, minimized, reviewable support output;
- exact backup encryption or local protection and restore read-back.

## Official-upstream rollback subject

Before any normal-runtime switch:

1. use a fresh authorized run ID and preparation root;
2. verify official registry metadata and all resolved integrity identities;
3. install under an isolated immutable prefix and isolated ports/state;
4. use synthetic fresh credentials;
5. qualify CLI, REST, MCP, viewer, Codex, Claude, authentication, service
   restart, and recovery;
6. prove candidate-to-upstream rollback and upstream-to-candidate denial unless
   separately authorized;
7. leave the rollback subject inactive after qualification.

The stopped prior preparation run is nonconforming evidence and cannot be
repaired or reused.

## Accepted Stage-A authority matrix

DEC-17 accepts the responsibility matrix below. It does not fill any named
human assignment or record the concurrences required for a later Stage-A
acceptance.

| Role | Stage-A responsibility |
|---|---|
| Human Test Architect | Accountable accept/reject decision |
| Configuration Manager | Required concurrence; exact freeze and custody |
| Security Architect | Required concurrence; auth, secret, egress, privacy |
| Release Owner | Required concurrence; package, rollback, admission boundary |
| Local Test Infrastructure Owner | Advisory evidence provider |
| Dependency Owner | Advisory iii/Node/package support disposition |
| Independent Verifier Owner | Readiness and separation acknowledgement for B2/Stage D; not Stage-A acceptance |
| CI Owner | `DEFERRED-LOCAL-TARGET` |
| Gate Authority | Later ABM authority; no Stage-A substitution |

Blank identities or artifact hashes mean Stage A remains open.

## Recorded profile disposition

| Field | Recorded value |
|---|---|
| Decision | `DEC-12` |
| Disposition | `ACCEPTED FOR STAGE-A SPECIFICATION` |
| Profile ID | `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` |
| File-execution denominator | `5 x 148 = 740` |
| Lifecycle-journey denominator | `3 x 14 = 42` |
| Authority matrix | `DEC-17` accepted; assignments and concurrences remain open |
| Execution effect | None; Stage A pending and B1/B2 blocked |

## Pending Stage-A decision record

```text
Human Test Architect:
Configuration Manager:
Security Architect:
Release Owner:
Local Test Infrastructure Owner:
Dependency Owner:
Independent Verifier Owner:

Profile ID:
Source SHA-256:
MTP SHA-256:
R-13 card SHA-256:
Assertion-manifest SHA-256:
Authentication-manifest SHA-256:
Processing-policy SHA-256:
Lifecycle-journey manifest SHA-256:
Custody-policy SHA-256:
Successor manifest revision/SHA-256:
Matching verification receipt SHA-256/status:

Decision: ACCEPT | REJECT
Finding dispositions:
```

Until this record is complete and attributable, Stage A remains pending. The
DEC-12 profile-specification acceptance does not admit R-13 mechanics or
execution.
