# Iteration 4 Local macOS Elaboration Reconciliation

Status: Prepared review packet; Elaboration NO-GO remains controlling
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Branch: `codex/agentmemory-elab-iter2`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
AIWG session: `aiwg-iteration-dual-track-elaboration-iter4-2026-07-28-1805`
Deployment target: `local-macos`

## Purpose

Reconcile the operator-selected local macOS target with current architecture,
requirements, test, security, risk, operations, runtime, and evidence-control
facts.

This packet is additive. It accepts no candidate artifact, changes no risk
status, selects no architecture configuration, creates no successor freeze,
authorizes no PoC, changes no product code, and authorizes no Construction,
service switch, canary, release, Railway operation, or rollout.

## Governing result

The inherited Elaboration result remains:

```text
ABM = FAIL / NO-GO
Construction authorized = false
Requirements accepted = 0
Realizations accepted = 0
Risks mitigated or retired = 0
Architecture configurations scoreable = 0
```

All 16 hard architecture vetoes remain open. All 17 P1 risks remain identified
and no P1 card is execution-admitted. The local target reduces the deployment
denominator; it does not reduce the correctness, privacy, identity, health,
acknowledgement, migration, restore, session, event, connector, evidence, or
rollback obligations.

## Scope normalization

The reviews found that "local-only" conflated two independent axes. The
reconciled candidate vocabulary is:

```text
deployment_target = local-macos
processing_mode = zero-egress | provider-enabled
```

The deployment target is operator-selected. Processing mode remains an exact
project/deployment decision. Missing or ambiguous mode fails closed.

Railway is split into three facts:

| Concern | Reconciled treatment |
|---|---|
| Local secret flow | Mandatory local evidence under `R-02`; all local sinks and remnants remain in scope |
| Historical Railway exposure | `UNVERIFIED / NOT EVALUATED`; parallel external-security issue; never treated as no deployment, contained, mitigated, or retired |
| Prospective Railway deployment | Deferred and excluded from this package, ABM, qualification, canary, and release denominator |

No Railway inventory, credential, project, log, volume, backup, deployment, or
other cloud operation is required or authorized for the local development path.

## Live local baseline

The installed subject is an earlier fork-derived, upstream-labelled `0.9.28`
package. It is not the undeployed current candidate and is not the official npm
artifact.

Current non-mutating observations:

- supported CLI status connects to `http://localhost:3111`;
- backend reports `healthy`, circuit closed, and no active alert;
- REST and viewer liveness report `ok`;
- unauthenticated sampled protected paths return `401`;
- Doctor reports 9 of 10 operational checks passing;
- LLM, embeddings, graph extraction, consolidation, compression, and graph
  population report enabled;
- automatic context injection remains disabled;
- the current scope is `github.com/chronodeai/agentmemory`;
- the browser viewer currently renders `healthy`, `connected`, and version
  `0.9.28`, so the earlier `Unknown` state is not currently stuck;
- the viewer rendered global-looking aggregate counts and memory material
  without a visible project/global scope label while project-scoped CLI status
  reported one session;
- the browser console retained repeated transient health-503 warnings before
  the current healthy render;
- project health reports scope coverage `1`, project-unscoped records `0`, one
  project session, and two context packets;
- the same health report shows retrieval use `0`, commit coverage `0`, and zero
  project memories, lessons, insights, or promotions;
- a context-packet request using the current AIWG session identifier failed
  closed because that session did not belong to the project;
- a context-packet request using the existing project session succeeded in
  33 ms but returned zero tokens and zero source IDs;
- that bounded context-packet probe showed no cross-project leakage, but it
  also showed no useful project memory; project-health p95 injection latency
  was 33 ms after the probe;
- project-scoped slot listing still returns HTTP 500;
- the runtime reports 1,887 global unscoped records, which must remain excluded
  from implicit project retrieval;
- deep diagnostics reports 14 passes, one scope warning, zero failures, and two
  of two latest durable memories without project scope;
- top-level health remains `healthy` despite the slot failure and diagnostic
  scope warning, exposing a truthful-degradation coverage gap;
- a LaunchAgent plist exists but `com.agentmemory.server` is not loaded;
- the worker is attached to a foreground terminal process;
- the iii engine is alive, but service ownership and recovery are unqualified.

The in-sandbox Doctor false negative was an execution-environment loopback
artifact. The same read-only Doctor outside that network sandbox reached the
service and reported healthy. Release receipts must declare network-sandbox
conditions.

The full receipt is:

`.aiwg/reports/agentmemory-local-runtime-baseline-2026-07-28.md`

## Review convergence

Three independent premium reasoning reviews covered architecture and product,
requirements and test, and security and operations. They converged on:

1. Local macOS is a deployment profile applied to C1, C2, or C3, not a new
   semantic configuration.
2. The package lacks an accepted transactional local lifecycle despite useful
   existing CLI, viewer, migration, and removal primitives.
3. Runtime release and data generation require two coordinated atomic
   activation and rollback contracts.
4. Loopback is not authentication. Protected API, MCP, viewer-data, and control
   paths require exact authentication; the static viewer shell needs one
   explicit accepted policy.
5. Provider-disabled and provider-enabled processing need separate complete
   evidence.
6. The current four-profile macOS/Ubuntu matrix is not the operator-selected
   release denominator.
7. The old 59 percent behavioral figure is historical and cannot be reused as
   the current per-use-case denominator.
8. No qualified official-upstream rollback subject exists.
9. LaunchAgent ownership, private logging, support output, backup, restore,
   upgrade, rollback, uninstall, and browser-level health remain unqualified.
10. The stopped rollback-preparation run is preserved nonconforming evidence
    and cannot be repaired or reused.

## Prepared candidate artifacts

| Artifact | SHA-256 | State |
|---|---|---|
| `.aiwg/decisions/change-requests/CR-AM-LOCAL-001.md` | `e31e4c444f31ab97e8ac2407470195955773bc4c69559de2ced40aa695dfe055` | Operator-selected deployment target; baseline reconciliation pending |
| `.aiwg/decisions/impact-assessments/IA-AM-LOCAL-001.md` | `b1a055edf0de64faabd0fc012325fb75a1b152fd8023f5ab682fb549c472b43b` | Advisory review candidate |
| `.aiwg/planning/development-case-local-macos.md` | `c76a1e6aa35c05bd01275b80b909f896cb2ad0aef2e53c25453e6f0d9a429814` | Development-case review candidate |
| `.aiwg/testing/local-macos-qualification-profile-candidate.md` | `1406c06b6a9fda2918494d58221d820118a45ef87207b7e552bfd58d6d519423` | Stage-A review candidate |
| `.aiwg/deployment/local-macos-operations-and-support-candidate.md` | `219b05ebc0a6185661bad7cb7d64476f10b97b422185e93af1b154b4abe506b2` | Operations contract review candidate |
| `.aiwg/reports/agentmemory-local-runtime-baseline-2026-07-28.md` | `8ba581751a7b08ef015429ecdb5e23d021e3a161129b8f01018c2c0210c3715d` | Non-mutating runtime, browser, MCP, and diagnostic receipt |
| `.aiwg/reports/iteration-4-successor-decision-index-2026-07-28.md` | `658766c00743c3d7557e086ba4ed10a1a6223b8c9072b090e7617f5705cfec7a` | Decision reconciliation candidate |

These are pre-freeze hashes. A later byte change invalidates the row.

### Documentary reconciliation hashes

| Artifact | SHA-256 | State |
|---|---|---|
| `.aiwg/reports/iteration-4-local-macos-human-decision-request-2026-07-28.md` | `969c49a14dfa254d8887df43069343d729e6e5ae157559b7e51e8d67d0b407f8` | Human review request; no decision inferred |
| `.aiwg/requirements/supplemental-specification.md` | `7a0569211116c7ff30c21837906e1cf7cbb0fabc56ee8a269beafb6fc6c4fd01` | 33-parent/130-child review candidate |
| `.aiwg/requirements/traceability-matrix.md` | `961d85ada1c9fd88b4386f3bb9a1cf426b26e9bea0eb22450b73ecc47d6a81fd` | 130/130 documentary mapping candidate |
| `.aiwg/requirements/realizations/DES-UCR-001.md` | `c1e179e5711ccd537e7fe62cac0b1a4ee4d76537fd71e896b8995bdcfb09fe78` | Blocked review candidate |
| `.aiwg/requirements/realizations/DES-UCR-002.md` | `bdee1c9e92864f9694299504f3a19b1ebff03f37abcf6c1418c6e830d4625fde` | Blocked review candidate |
| `.aiwg/requirements/realizations/DES-UCR-003.md` | `f5ad7e0475c3c4302cc2cd2df630ce8979d02799309b242dca5c70c9343fe34d` | Blocked review candidate |
| `.aiwg/architecture/software-architecture-doc.md` | `ff387b5fff4346f86fce4fab082428a1ce34c41679879c7af7b0ce374ead0d93` | Draft; not baselined |
| `.aiwg/architecture/interface-control-matrix.md` | `e60eb21496bed56b6bc28d9394cf0476f49503fcdd361d2a1728d9e50588a988` | Draft evidence control |
| `.aiwg/architecture/architecture-evolution-iteration-4.md` | `037d5a609efa517f2d505f79440ffc6431de685b18b9a54838cf457a3e09440c` | Review candidate |
| `.aiwg/architecture/adr/ADR-003-privacy-provider-and-health.md` | `a4fb4ab2a7398b8a912c9632b40f0f60fca8bca66469dc16d4130628ed8d9798` | Proposed |
| `.aiwg/architecture/adr/ADR-005-strict-core-compatibility-transition.md` | `0bb1b9fdbe7c6fa988f11b1203a90746a4eb6e6cecb085d060979d4ba0234001` | Proposed |
| `.aiwg/architecture/adr/ADR-006-immutable-generations-and-transactional-evidence.md` | `2b4372de959351c0b3f410e9fd4d17a04fbe3094def4b7f03ab66877fc79cbb6` | Proposed |
| `.aiwg/architecture/adr/ADR-007-local-macos-product-envelope.md` | `6c78c09ce540d92967b8941a24354936ca7d58f73d5ba8ad397a36901d9d5f8b` | Proposed |
| `.aiwg/testing/master-test-plan.md` | `32f9bfbe969e6b5f6e47fc31e22ad1914a98c0070a165f1ce1394111a77f0971` | Draft Stage-A candidate |
| `.aiwg/testing/deterministic-profile-acceptance-candidate.md` | `0ff2019fa82fa1452f39d19d2586ad872d8be46a5cd0f6251c914dfd58d4b2e7` | Human review candidate |
| `.aiwg/testing/r13-implementation-conformance-matrix.md` | `23cab7ae3e285c74b5a5a5f1ac7ee9a72f97a23c7fe9e575038b4ed299cef3ab` | Open conformance matrix |
| `.aiwg/risks/poc-cards/R-13-portable-evidence-harness-v3.md` | `4e1611703e85813aba632312be739fecbfe79ad2966516f89fd72ec5e05ba2f8` | Stage-A pending; B1/B2 blocked |
| `.aiwg/risks/poc-cards/R-02-local-macos-secret-flow-overlay.md` | `d083fa9a2fb1cabe6f243d3b2ed9f9d7a4926149f5ae189fee49252e7cc5b07f` | Additive local evidence overlay |
| `.aiwg/risks/risk-list.md` | `97096688e0efc20645b31799c6fa3869c62767935850c186f65d7b96ffbb12a1` | 23 risks; all identified |
| `.aiwg/risks/risk-assessment-2026-07-25.md` | `685df16096fd4d8f65fb03019bffb6218270a1482a988736230aff7a856f7b94` | Working assessment |
| `.aiwg/risks/risk-retirement-report.md` | `fac39eaab82ea467e7fb9c222de9774fd10c69d037ddf161ba2306994717c96e` | Zero retired |

These hashes are inventory facts only. They do not accept the artifacts or
create a successor freeze.

## Candidate qualification denominator

Mandatory host profile candidate:

`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

R-13 source/test cohort:

- five consecutive runs;
- 148 of 148 governed files per run;
- 740 governed file-executions;
- complete accepted assertion and authentication identity denominators;
- zero failed, skipped, pending, todo, disabled, extra, missing, or changed item;
- independent immutable-bundle verification and custody.

Local lifecycle cohort:

- `LQ-001..014`;
- three clean isolated-home repetitions;
- 42 of 42 journey executions;
- every failed attempt retained;
- unrelated provider configuration byte-identical.

Both `zero-egress` and `provider-enabled` policies are exercised with synthetic
recording sinks. Real external transfer remains separately authorized.

## Required canonical deltas

The review candidates do not silently rewrite current authorities. Before the
successor freeze, prepare and independently review these documentary deltas:

1. **Supplemental requirements**
   - revise FR-15.a to apply to explicit zero-egress mode;
   - add FR-15.g/h for independent target/mode selection and governed
     provider-enabled processing;
   - add FR-20.l for separate local-core, provider-feature, processing-mode,
     and external-processing state;
   - add FR-21.a-g for immutable package, transactional setup, LaunchAgent,
     loopback/auth, connector ownership, lifecycle recovery, and rollback
     subject.
2. **Realizations**
   - reconcile DES-UCR-001..003 with local lifecycle and processing-mode
     behaviors;
   - freeze binary per-use-case units and prohibit partial-credit substitution.
3. **Traceability**
   - link CR/IA to requirements;
   - add local lifecycle TR/ICM controls and `T-LOCAL-DEPLOY`;
   - apply the exact P2 risk mappings;
   - produce a successor traceability report.
4. **Architecture**
   - add local topology, LaunchAgent ownership, protected viewer-data
     authentication, two atomic generations, processing modes, and isolated
     normal/canary/rollback instances;
   - reissue the C1/C2/C3 veto applicability matrix;
   - retain every ADR as Proposed and the SAD as Draft pending human decision.
5. **Test and R-13**
   - replace the four-profile release denominator with the exact local profile;
   - mark Ubuntu/CI rows deferred portability, not passed;
   - retain assertion, authentication, environment, provenance, signature,
     replay, custody, and independent-verification blockers.
6. **Risk and security**
   - add the three-way Railway applicability split without status changes;
   - add local packaging, LaunchAgent, logging, support-output, and rollback
     evidence mappings;
   - create a local R-02 profile overlay without claiming historical closure.
7. **Operations**
   - bind exact paths, labels, ports, state, credentials, logs, backup,
     upgrade, rollback, uninstall, and support-output contracts after
     architecture disposition.

Prepared requirement-count deltas are proposed, not current facts. If the
FR-15, FR-20, and FR-21 candidates are adopted as reviewed, the inventory must
be recomputed and every count surface, realization, RTM row, and manifest
updated from exact bytes. No count is accepted by this packet.

## Ordered next sequence

### Sequence A: Candidate decision review

Obtain exact human dispositions for:

1. local macOS development case;
2. exact mandatory host/Node profile;
3. Stage-A authority matrix;
4. viewer static-shell policy;
5. processing-mode policy;
6. traceability timing and per-use-case denominator;
7. risk-threshold semantics.

No combined approval implies any later gate.

### Sequence B: Documentary reconciliation

Prepare the canonical requirement, realization, RTM, architecture, MTP/R-13,
risk, and operations deltas as review candidates. Run independent
requirements, architecture, security, test, and configuration reviews.

### Sequence C: Successor evidence freeze

After candidate bytes settle:

1. create a monotonic successor manifest;
2. include exact dirty-tree bytes, the local decision surface, runtime receipt,
   stopped rollback nonconformance, and every omitted artifact reason;
3. run zero-drift local verification;
4. run independent adversarial review;
5. present exact hashes for human disposition.

### Sequence D: Stage A and R-13

After the complete Stage-A human decision:

1. obtain exact B1 mechanics authorization;
2. freeze mechanics and all evidence inputs;
3. obtain exact B2 execution admission;
4. run the accepted local five-run cohort;
5. obtain independent Stage-D evidence review;
6. obtain separate Stage-E R-13 risk disposition.

### Sequence E: Veto and risk evidence

Use qualified R-13 evidence and individually admitted cards in this order:

1. identity;
2. secret/auth/provider/native-sync;
3. session/event/compaction/generation recovery;
4. truthful dependency and worker health;
5. acknowledgement and promotion lineage;
6. connector rollback and alias retirement;
7. release-gate rehearsal.

Tests alone do not change risk status.

### Sequence F: Architecture and ABM

After veto evidence:

1. score surviving C1/C2/C3 configurations;
2. obtain human architecture selection and ADR/SAD dispositions;
3. obtain requirement, realization, test, risk, and signoff dispositions;
4. refreeze the accepted set;
5. run an independent ABM.

An ABM PASS permits only a separate Construction authorization request.

## Current decision request

The package is not ready for Stage A, successor freeze, Construction, or local
qualification. The immediate human decision surface is the candidate local
development case and profile, followed by authorization to prepare the
canonical documentary reconciliation. No runtime interruption is needed.
