# ABM Architecture Review

Date: 2026-07-25
Revision: `af13b0b139bf02211853808484d5d43026534b97`
Result: **BLOCKED**
Construction authorization: **NOT GRANTED**
Reviewer: independent AIWG Architecture Designer
Waivers: none

## Baseline assessment

- The SAD is explicitly `DRAFT - NOT BASELINED`.
- ADR-001 through ADR-004 remain Proposed and do not yet contain accepted
  alternatives, decision criteria, failure contracts, acceptance evidence, or
  backtracking triggers.
- Physical/deployment views, trust boundaries, provider egress, process state,
  concurrency, retention, health windows, and recovery behavior are not defined
  to an accepted ABM level.
- No critical architecture risk is retired.

## Live contract defects

1. `src/functions/coding-memory.ts:303-312` marks selected sources injected
   while building a packet, before provider acknowledgement. A failed dispatch
   can suppress those sources on retry.
2. `src/functions/coding-memory.ts:135-170` converts slot, profile, lesson,
   search, and file-context failures into empty values. The function then
   returns `success: true` at lines 337-343 without degradation metadata.
3. `src/functions/coding-memory.ts:218-236` labels lessons verified using stored
   confidence, without the proposed validity, provenance, authority, and
   independent-evidence eligibility gate.
4. `src/health/monitor.ts:21-94` records KV and worker probe results, but
   `src/health/thresholds.ts:23-81` does not evaluate KV connectivity or worker
   availability. Readiness can therefore remain healthy with failed state
   authority.
5. `deploy/railway/entrypoint.sh:80-92` prints `AGENTMEMORY_SECRET`; the runbook
   instructs operators to retrieve it from deployment logs at
   `deploy/railway/README.md:44-54`.
6. Railway sets `sampling_ratio: 1.0` and console logging on at
   `deploy/railway/entrypoint.sh:68-76`, contradicting the guarded 0.1,
   console-off configuration and its documented 137 GB feedback-loop incident
   at `iii-config.yaml:38-55`.
7. Project migration performs sequential in-place writes without an atomic
   swap, checkpoint, or undo. Snapshot restore is additive and covers only a
   subset of state (`src/functions/migrate.ts:144-229`;
   `src/functions/snapshot.ts:39-232`).
8. `src/project-config.ts:147-171` drops remote ports and lowercases repository
   path segments, which can collapse distinct remotes on case-sensitive or
   non-default-port hosts.

## Required architecture closure

- Define an acknowledged packet lifecycle:
  `created -> dispatched -> acknowledged -> consumed/expired`.
- Make dependency failures explicit and define fail-closed versus degraded
  behavior for every context source and interface.
- Add KV, required-worker, slot, and build-identity checks to readiness, with
  sustained-success and pressure/recovery semantics.
- Remove secrets from all output and align every deployment template with the
  safe observability baseline.
- Define collision-safe project identity, atomic migration, complete-state
  backup/restore, and rollback thresholds.
- Produce an authoritative REST/MCP/hook/viewer/provider interface-control
  matrix.
- Revise and formally accept the SAD and ADRs only after bounded evidence
  retires the applicable critical risks.

**Architecture disposition: BLOCKED. No architecture baseline is established.**
