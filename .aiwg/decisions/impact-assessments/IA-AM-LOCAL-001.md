# IA-AM-LOCAL-001: Local macOS Agentmemory Release Target

Status: Review candidate; no baseline or gate decision claimed
Date: 2026-07-28
Change request: `CR-AM-LOCAL-001`
Project: `github.com/chronodeai/agentmemory`
Deployment target: `local-macos`
Processing modes: `zero-egress` or `provider-enabled`

## Executive assessment

Overall impact: Medium
Recommendation: Proceed with local macOS Elaboration reconciliation

The change materially reduces deployment and qualification breadth while
preserving the hard correctness, privacy, data-integrity, integration, and
rollback requirements of the product. It removes Railway operations from the
release critical path but does not erase historical Railway uncertainty.

## Scope impact

Rating: Medium

- The supported release target becomes the current macOS host.
- Deployment and external-processing policy become independent configuration
  axes.
- Railway, public endpoint, Linux, Windows, container, and multi-host
  qualification are deferred.
- Codex, Claude, API, MCP, viewer, LaunchAgent, project scoping, backup,
  migration, upgrade, rollback, and uninstall remain in scope.
- Memetics remains a later separately authorized local canary.

Affected artifact families:

- development case and iteration plan;
- supplemental requirements and realizations;
- SAD, ADRs, interface matrix, and architecture option analysis;
- Master Test Plan, deterministic profiles, R-13, and traceability;
- risk list, PoC cards, retirement criteria, and security assessment;
- packaging, release manifest, installation, rollback, and support runbooks.

## Architecture impact

Rating: Medium

The target architecture becomes a single-host local control plane:

- immutable package installation;
- user LaunchAgent;
- loopback authenticated API/MCP/viewer;
- local project-scoped storage;
- local secret-file or OS-protected credentials;
- exact Codex/Claude integration ownership;
- side-by-side current-candidate and official-upstream rollback prefixes.

The three current architecture configurations still require veto evidence and
human selection. The deployment choice does not choose C1, C2, or C3, accept an
ADR, or baseline the SAD.

## Requirements impact

Rating: Medium

Requirements must distinguish:

- local deployment from zero external processing;
- loopback network binding from absent authentication;
- local service health from provider-feature availability;
- local package readiness from cloud portability;
- local admission from Memetics canary and release admission.

Cloud-only requirements should be marked deferred or not applicable to this
release target, never silently deleted. Shared correctness and security
requirements remain mandatory.

## Test impact

Rating: High

The qualification matrix narrows to admitted local macOS profiles but still
requires:

- clean isolated `HOME`, state, ports, project IDs, service labels, and
  provider roots;
- LaunchAgent install, restart, singleton, recovery, and uninstall;
- authenticated CLI, REST, MCP, viewer, Codex, and Claude journeys;
- two-project isolation and colliding project identities;
- secret, log, support-bundle, backup, and no-credential failure cases;
- provider-disabled and separately governed provider-enabled profiles;
- snapshot, migration, exact restore, upgrade, rollback, and concurrent-reader
  failpoints;
- UI/backend compatibility without false healthy or unexplained `Unknown`;
- official-upstream rollback preparation and independent qualification; and
- deterministic receipt, denominator, custody, and reviewer contracts.

The existing four-profile Stage-A proposal cannot be narrowed by this document
alone. The Test Architect and required concurrences must accept the tailored
profile denominator.

## Security and privacy impact

Rating: Medium

Reduced risks:

- no public listener;
- no Railway variable, log, volume, backup, or browser credential path;
- no cloud deployment-source ambiguity for this target.

Remaining or heightened risks:

- local credential leakage through logs, hooks, backups, support output, or UI;
- cross-project leakage on one host;
- duplicate Codex/Claude hooks;
- malicious or stale local clients;
- provider egress inconsistent with project privacy;
- mixed-generation migration or non-exact restore;
- false health when local dependencies fail;
- reuse of a credential whose historical cloud exposure is unknown.

Historical Railway exposure remains an organizational security question. The
local release must use fresh credentials and cannot depend on its resolution.

Applicability is split as follows:

| Concern | Treatment |
|---|---|
| Local secret flow | Mandatory local `R-02` evidence; no status change |
| Historical Railway exposure | `UNVERIFIED / NOT EVALUATED` under a named external security owner |
| Prospective Railway deployment | Deferred and excluded from the local package/runtime path |

The protected API, MCP, viewer-data, and control paths remain authenticated.
The static viewer shell requires an explicit contract: either authenticate it,
or prove that its loopback-only unauthenticated bytes contain no protected data.
Only `/livez` is an unconditional unauthenticated candidate.

## Risk impact

Rating: Medium

The change should:

- tailor prospective Railway deployment risks out of the local release
  denominator;
- preserve R-02 coverage for all local sinks and secret handling;
- retain every P1 risk involving identity, acknowledgement, health, sessions,
  events, compaction, migration, connectors, or rollback;
- add explicit local packaging and LaunchAgent qualification evidence; and
- prohibit risk retirement from scope reduction alone unless the risk is
  demonstrably cloud-only and a human owner records the tailored disposition.

No risk changes status through this assessment.

## Schedule and cost impact

Rating: Low to Medium

The local macOS target avoids cloud deployment and multi-platform qualification,
but local service lifecycle, package ownership, rollback, integrations,
security, and deterministic evidence remain substantial work.

No schedule or cost baseline exists that permits a numerical estimate. Any
numerical claim would be speculative.

## Rollback impact

Rating: High

The previously stopped rollback-preparation run remains unusable. Before any
normal-runtime switch:

1. use a fresh run ID and exact fresh authorization;
2. consume immutable verified design/review bytes;
3. complete a conforming preparation run;
4. install the registry-verified official upstream artifact under an isolated
   immutable prefix;
5. independently verify authentication and recovery; and
6. prove rollback before admitting the current candidate.

## Change-control disposition

The operator selected the local deployment target. The recommended next action
is documentation-only Elaboration reconciliation followed by a successor
evidence freeze and exact human dispositions.

No CCB simulation or agent vote is treated as human approval. No baseline,
ABM, Construction, canary, or release decision is recorded here.
