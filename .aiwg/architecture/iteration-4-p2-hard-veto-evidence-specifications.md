# Iteration 4 P2 Hard-Veto Evidence Specifications

Status: **PREPARATION ONLY - NOT FROZEN OR AUTHORIZED**
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Boundary

These versioned specifications make the four P2 hard-veto-related methods
measurable without converting them into P1 PoCs. They define proposed inputs,
oracles, owners, and stop conditions only. They do not authorize
`build-poc`, test execution, runtime access, external calls, risk retirement,
veto closure, architecture acceptance, ABM passage, or Construction.

The machine-readable companion is
`.aiwg/architecture/iteration-4-p2-hard-veto-evidence-specifications.json`.
Qualification source, exact profiles, fixtures, actors, signer, verifier,
receipts, and independent dispositions remain open.

## P2-R01-EVIDENCE-SPEC-V1

- Risk and vetoes: R-01; HV-01 and HV-11.
- Method: targeted identity/scope contract tests plus independent review.
- Owner: Software Architect.
- Reviewers: Security Architect, Test Architect, Configuration Manager.
- Inputs: owner-declared remote equivalence classes; distinct host, port, and
  path-case fixtures; colliding basenames; worktrees; no-remote persisted UUID;
  complete two-project, explicit-global, slot, viewer, REST, and MCP surfaces.
- Pass oracle: every fixture resolves to its frozen expected class or typed
  fail-closed denial, with zero out-of-project identity or content.
- Stop: any collision, cross-project result, implicit unscoped read, mutation,
  or unresolved alias.

## P2-R05-EVIDENCE-SPEC-V1

- Risk and vetoes: R-05; HV-06 and HV-11.
- Method: targeted promotion-lineage tests plus independent review.
- Owner: Software Architect.
- Reviewers: Product Owner, Test Architect, Security Architect.
- Inputs: recalled-only, paraphrase, cycle, contradiction, stale,
  supersession, deletion, independent-corroboration, test, runtime, commit,
  and accepted-ADR fixtures.
- Pass oracle: recall-only and cyclic graphs reject, independently sourced
  corroboration remains distinct, and a valid acyclic chain yields one
  traceable candidate without duplicating an ADR.
- Stop: any self-certifying cycle, unresolved source, regex-only verification,
  or recalled content reaches promotable state.

## P2-R08-EVIDENCE-SPEC-V1

- Risk and vetoes: R-08; HV-04, HV-11, and HV-16.
- Method: targeted readiness fault tests plus independent review.
- Owner: Service Owner.
- Reviewers: Operations Owner, Test Architect, Software Architect.
- Inputs: required KV and worker faults, sustained pressure, startup
  reconciliation, timestamped transitions, and three-success recovery window.
- Pass oracle: each required failure becomes non-ready within one 30-second
  collection, startup remains unavailable through reconciliation, and recovery
  requires three complete successes.
- Stop: any healthy or ready result while required authority is unavailable,
  diagnostics are incomplete, or the recovery window is unmet.

## P2-R15-EVIDENCE-SPEC-V1

- Risk and vetoes: R-15; HV-02 and HV-11.
- Method: targeted zero-egress veto tests plus independent review.
- Owner: Privacy Owner.
- Reviewers: Security Architect, Provider Integration Owner, Test Architect.
- Inputs: the complete processor/attempt inventory, recording sinks,
  strict/local policy, implicit missing-policy sessions, fallback composition,
  hook and mesh transport, DNS/private resolution, and unavailable-policy
  fixtures.
- Pass oracle: strict/local fixtures produce zero raw-content outbound
  attempts; each permitted attempt records project, provider, purpose, policy,
  data class, and provenance without raw content.
- Stop: any prohibited egress, unrecorded fallback, policy bypass, undeclared
  processor, or raw content in a receipt.

## Admission rule

Each method remains blocked until its complete source, profile, fixture,
denominator, actors, receipt schema, signer, verifier, and independent review
authority are frozen in a successor manifest. Preparation and later execution
are separate decisions.
