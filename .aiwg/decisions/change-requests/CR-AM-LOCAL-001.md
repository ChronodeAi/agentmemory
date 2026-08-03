# CR-AM-LOCAL-001: Local macOS Agentmemory Release Target

Status: Operator-selected scope; baseline reconciliation pending
Date: 2026-07-28
Change type: Scope, technical, deployment
Priority: P1
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Deployment target: `local-macos`
Processing modes: `zero-egress` or `provider-enabled`

## Exact operator direction

```text
orchestrate the next sequence, we will run this locally not in railway cloud
```

## Requested change

Tailor the current release-candidate and qualification target to a local macOS
installation on the current host. Railway cloud deployment, public
endpoints, Railway migration, Railway canary, and Railway release admission are
outside this target.

This change selects the deployment target. It does not accept requirements,
ADRs, the SAD, test profiles, risk dispositions, ABM, Construction, Transition,
release, or broad rollout.

## Current state

- The candidate remains in Elaboration with ABM `FAIL / NO-GO`.
- The installed runtime is an earlier fork-derived, upstream-labelled `0.9.28`
  build.
- The current candidate source is undeployed.
- Railway deployment history is unverified.
- The repository contains Railway-oriented templates and documentation, but no
  Railway operation is authorized by this change.
- The current rollback-preparation run is stopped and nonconforming.

## Desired state

The release candidate is packaged and qualified as a local macOS product:

- one transactional `agentmemory setup` journey;
- a user-owned persistent LaunchAgent;
- loopback-only API, MCP, and viewer defaults;
- canonical project enrollment;
- exact Codex and Claude integration ownership;
- local backup, restore, migration, upgrade, rollback, and uninstall;
- truthful liveness, readiness, capture readiness, and viewer compatibility;
- explicit privacy and external-processing state;
- an isolated official-upstream rollback subject; and
- a side-by-side local canary before any normal-runtime switch.

Deployment target and processing mode are independent:

- `local-macos + zero-egress` permits no external model, embedding, fallback,
  telemetry, or other content-processing attempt.
- `local-macos + provider-enabled` permits only explicitly allowed providers,
  destinations, purposes, and data classes after project-policy evaluation,
  minimization, and redaction.

Missing, ambiguous, or conflicting processing mode must fail closed. A local
deployment must not be misrepresented as automatic zero egress.

## Scope

### In scope

- Current macOS host and supported Node profile.
- Local immutable package or tarball installation.
- LaunchAgent lifecycle.
- Loopback API, MCP, and viewer.
- Codex and Claude on the same host.
- Local project identity and project-scoped data.
- Local secret-file or OS-protected credential handling.
- Local backups, restore rehearsal, upgrades, rollback, diagnostics, and
  support bundle.
- A separately authorized five-session Memetics canary after local admission.

### Out of scope

- Railway deployment or migration.
- Public API or viewer exposure.
- Railway variables, logs, volumes, backups, domains, or redeployment.
- Cloud canary, cloud production admission, or cloud support commitments.
- Linux, Windows, container, or multi-host qualification for this release
  target.
- Broad agent or repository rollout.

## Security boundary

The prospective Railway release-readiness gate is tailored out of this local
release target. Historical Railway exposure uncertainty remains a separate
security fact and is not converted to `NO DEPLOYMENT`.

| Concern | Local release applicability | Required disposition |
|---|---|---|
| Local secret flow | Mandatory | Remains within `R-02`; qualify every local sink and failure remnant |
| Historical Railway exposure | Outside local deployment applicability | `UNVERIFIED / NOT EVALUATED`; named external security owner; never treated as disproven or retired |
| Prospective Railway deployment | Deferred | No Railway asset or operation enters the admitted local package or runtime path |

Local qualification must:

- generate fresh local credentials;
- prohibit reuse of any unknown or historical Railway credential;
- keep services loopback-only by default;
- allow unauthenticated `/livez` only;
- authenticate every protected API, MCP, viewer-data, and control path;
- explicitly disposition whether the loopback-only static viewer shell is
  authenticated or contains no protected data;
- verify no secret appears in logs, support bundles, backups, hooks, or UI;
- fail closed when local credentials or project capabilities are missing; and
- keep cloud deployment assets disabled and outside the admitted local package
  path.

## Success criteria

1. The local deployment profile is reflected consistently in requirements,
   architecture options, test profiles, risk mappings, release packaging, and
   runbooks.
2. No artifact claims that Railway history is known or contained without
   attributable evidence.
3. No Railway operation is required for local ABM, Construction, canary, or
   release decisions.
4. Every protected local interface is authenticated and project-scoped; any
   unauthenticated liveness or static-shell exception is exact, content-bounded,
   and accepted.
5. The local package can be installed, verified, upgraded, rolled back, and
   removed without modifying unrelated provider configuration.
6. A healthy local installation shows no unexplained `Unknown` state.
7. The normal runtime cannot switch without a separately installed and
   independently qualified official-upstream rollback subject.

## Open authority

This operator direction authorizes change-control and Elaboration preparation
for the local macOS target. It does not authorize product implementation.

Required later decisions remain:

- acceptance of the tailored development case;
- acceptance of the exact local macOS and Node qualification profile;
- acceptance of the static viewer-shell authentication contract;
- acceptance of the processing-mode policy and provider manifests;
- requirement and realization acceptance;
- Stage-A test/profile acceptance;
- architecture selection and ADR/SAD acceptance;
- risk dispositions;
- independent ABM;
- separate Construction authorization;
- local canary admission; and
- release and distribution.
