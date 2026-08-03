# Iteration 4 Local macOS Human Decision Request

Status: **REVIEW REQUEST - NO DECISION INFERRED**
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Deployment target: `local-macos`

## Decision boundary

The operator selected local macOS as the deployment target and deferred
prospective Railway deployment. That selection does not accept the development
case, qualification profile, processing policy, requirements, realizations,
architecture, Master Test Plan, risk threshold, or successor freeze.

No response to this request authorizes B1 disposable mechanics, B2 execution,
product code, CI changes, migration, healing, a provider call, official
rollback artifact preparation, a normal-service switch, Memetics canary,
release, or rollout unless that authority is stated separately and exactly.

The controlling posture remains:

```text
ABM = FAIL / NO-GO
Construction authorized = false
Requirements accepted = 0
Realizations accepted = 0
Risks mitigated or retired = 0
Architecture configuration selected = none
```

## Current local observations

The installed fork-derived `0.9.28` runtime is currently reachable and reports
healthy, but it is foreground-terminal-owned rather than LaunchAgent-owned.
Top-level health and Doctor can report healthy while project slot list/get
returns HTTP 500 and deep diagnostics reports an unscoped-memory warning.

A bounded project context probe failed closed for the wrong session and
returned an empty packet for the existing project session in 33 ms. This
showed no cross-project leakage in that probe, but also no useful project
memory. Retrieval use, commit coverage, project memories, lessons, insights,
and promotions remain zero for the current Agentmemory project scope.

These are non-qualifying observations. No memory content is included here, and
no migration or healing was run.

## Recommended dispositions

The orchestration recommends the following bounded choices:

1. Accept the local development case as the planning route.
2. Accept the exact local profile as the Stage-A specification denominator,
   while leaving B1, B2, and execution blocked.
3. Select project-specific processing policy with `zero-egress` as the default
   and provider-enabled operation available only through an exact accepted
   provider manifest.
4. Require bearer authentication for the static viewer shell, assets, data,
   API, and MCP; keep `/agentmemory/livez` as the sole unauthenticated route.
5. Select CRD-01 Option A: canonical RTM paths plus independently verified
   graph links satisfy Elaboration bidirectionality; live source/test
   annotations are Construction work.
6. Select CRD-02 Option A: DES-UCR-001..003 are the complete significant-use-
   case realization denominator; each use case uses a frozen binary behavioral
   unit denominator and independently reaches at least 80 percent.
7. Accept the proposed Stage-A authority matrix.
8. Confirm the 23-risk denominator and 17-risk numeric threshold while
   retaining the rule that any unresolved mandatory veto prevents ABM PASS.

These recommendations accept specifications and planning boundaries only.

## Decision 1 - Local development case

Artifact:
`.aiwg/planning/development-case-local-macos.md`

```text
SELECT ONE:
ACCEPT LOCAL DEVELOPMENT CASE
RETURN LOCAL DEVELOPMENT CASE: <exact changes>
```

Acceptance establishes the local lifecycle route only. It does not accept an
architecture configuration or authorize implementation.

## Decision 2 - Exact local qualification profile

Profile:
`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

Mandatory proposed denominators:

- five runs of 148 governed files: 740 file-executions;
- `LQ-001..014` in three clean isolated homes: 42 journey executions;
- complete assertion and authentication manifests;
- both synthetic processing-policy recording sinks;
- independent verification and custody.

```text
SELECT ONE:
ACCEPT LOCAL PROFILE FOR STAGE-A SPECIFICATION
RETURN LOCAL PROFILE: <exact changes>
```

Acceptance does not authorize B1 preparation, B2 admission, or execution.
Node 22, Ubuntu, GitHub CI, and other hosts remain deferred portability.

## Decision 3 - Processing policy

Deployment location and processing policy are independent.

```text
SELECT ONE:
A. PROJECT-SPECIFIC POLICY:
   zero-egress by default; provider-enabled only through an exact accepted
   provider manifest for provider, destination, purpose, data class, project,
   session, redaction policy, fallback policy, and revocation.
B. ZERO-EGRESS ONLY:
   no external model, embedding, fallback, telemetry, mesh, or off-host relay
   attempt.
C. PROVIDER-ENABLED:
   attach the exact accepted provider manifest.
D. RETURN FOR REVISION: <exact changes>
```

No option authorizes a real external call. Synthetic recording-sink evidence
precedes any separately authorized real-provider probe.

## Decision 4 - Viewer static shell

```text
SELECT ONE:
A. BEARER AUTHENTICATED:
   authenticate the static shell, assets, viewer data, API, and MCP; expose
   only /agentmemory/livez without authentication.
B. LOOPBACK PUBLIC SHELL:
   require proof that shell/assets contain zero protected data and that every
   data/control request authenticates exact scope.
C. RETURN FOR REVISION: <exact changes>
```

The architecture review recommends Option A. Loopback binding alone is not
authentication.

## Decision 5 - CRD-01 traceability timing

```text
SELECT ONE:
A. Accepted canonical RTM paths and independently verified graph links satisfy
   Elaboration bidirectionality; live source/test annotations are Construction
   work.
B. Live source/test backlinks are mandatory before ABM; authorize one exact
   non-behavioral annotation scope and verification method.
C. Return the criterion for a different measurable contract.
```

No source or governed test file is edited by this decision request.

## Decision 6 - CRD-02 realization denominator

```text
SELECT ONE:
A. DES-UCR-001..003 are the complete significant-use-case denominator; MIC and
   PSC layers are tailored out for this gate.
B. Name each additional mandatory realization type and exact acceptance
   criterion before generation.
C. Return the realization model for revision.
```

For Option A, confirm that each realization freezes its own binary behavioral
unit denominator, admissible evidence, independently reproducible numerator,
and minimum 80 percent coverage. Aggregate coverage cannot compensate for one
use case below 80 percent.

## Decision 7 - Stage-A authority matrix

Proposed matrix:

| Authority | Proposed role |
|---|---|
| Accountable Stage-A decision | Human Test Architect |
| Required concurrences | Configuration Manager, Security Architect, Release Owner |
| Advisory evidence providers | Local Test Infrastructure Owner, Dependency Owner |
| Independent verifier | B2 readiness/separation and Stage-D evidence; not Stage-A acceptance |
| CI Owner | `DEFERRED-LOCAL-TARGET` |
| Gate Authority | Later ABM authority; not a Stage-A substitute |

```text
SELECT ONE:
ACCEPT STAGE-A AUTHORITY MATRIX
RETURN STAGE-A AUTHORITY MATRIX: <exact changes>
```

Blank assignments or agent output do not constitute a concurrence.

## Decision 8 - CRD-05 risk threshold

Current inventory:

- total risks: 23;
- P1 risks: 17;
- mitigated or retired: 0;
- numeric 70 percent floor: 17 of 23;
- unresolved mandatory vetoes: 16.

```text
SELECT ONE:
CONFIRM:
- denominator = 23
- threshold count = 17
- qualifying dispositions = mitigated or retired
- accepted-but-open risk does not count
- every hard veto maps to governed risks/evidence
- one unresolved mandatory veto prevents ABM PASS

RETURN RISK THRESHOLD: <exact changes>
```

## One-response disposition template

```text
LOCAL DEVELOPMENT CASE: ACCEPT | RETURN
LOCAL PROFILE: ACCEPT | RETURN
PROCESSING POLICY: A | B | C | D
VIEWER STATIC SHELL: A | B | C
CRD-01 TRACEABILITY: A | B | C
CRD-02 REALIZATIONS: A | B | C
STAGE-A AUTHORITY MATRIX: ACCEPT | RETURN
CRD-05 RISK THRESHOLD: CONFIRM | RETURN

Required comments or attached manifest IDs:
```

## Sequence after disposition

1. Incorporate only the selected documentary dispositions.
2. Recompute the 33-parent/130-child inventory and 130/130 RTM set.
3. Run independent requirements, architecture, security, test, risk, and
   configuration reviews.
4. Create and locally verify one monotonic successor evidence freeze.
5. Present exact artifact hashes for human acceptance or return.
6. If Stage A is later accepted, request a separate B1 disposable-mechanics
   authorization.
7. Continue through B2, Stage C, Stage D, risk-owner disposition, independent
   ABM, and a separate Construction request in that order.

Historical Railway exposure remains `UNVERIFIED / NOT EVALUATED` in a parallel
external-security lane. Prospective Railway deployment remains deferred and is
not part of this local sequence.
