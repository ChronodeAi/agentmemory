# ABM Behavioral Specification Review

Date: 2026-07-25
Revision: `af13b0b139bf02211853808484d5d43026534b97`
Result: **GAPS**
Construction authorization: **NOT GRANTED**
Reviewer: independent AIWG Requirements Analyst
Waivers: none

## Meaningful coverage

All three use cases are architecturally significant. Coverage was scored from
test-derivable guards, state transitions, failure flows, and observable
postconditions rather than simple mention counts.

| Use case | Full | Partial | Missing | Effective coverage |
|---|---:|---:|---:|---:|
| UC-001 Scoped Recall | 6 | 5 | 2 | 65% |
| UC-002 Capture, Session, Commit | 3 | 4 | 5 | 42% |
| UC-003 Context, Promotion, Provider | 6 | 5 | 1 | 71% |
| **Total** | **15** | **14** | **8** | **59%** |

No use case reaches the ABM threshold of at least 80%. The broad scenarios in
`.aiwg/architecture/behavioral-specifications.md` and mechanism sketches in
`.aiwg/architecture/pseudocode-specifications.md` are useful fragments, but
they are not end-to-end `DES-UCR-*` realizations, state machines, decision
tables, or method contracts.

## Findings

- The traceability matrix groups requirements in prose. It does not link atomic
  requirement, UC scenario, behavioral rule, ADR/SAD component, source symbol,
  test case, result receipt, and risk bidirectionally.
- No `FR-*`, `NFR-*`, `UC-*`, or `B-*` backlinks exist in source or tests.
- UC-003 requires acknowledgement before delivery, while
  `src/functions/coding-memory.ts:303-312` marks sources injected during packet
  construction.
- Eligibility-before-relevance and typed promotion evidence are specified but
  not represented as complete behavioral contracts.
- Definitions remain untestable for stale session, valid now, authentic
  receipt, independent evidence, exact facts, duplicate denominator, token
  accounting, and sustained health.
- The traceability matrix calls compaction schema-only, but
  `src/functions/observe.ts:133-184` contains an operational compaction and
  fact-ledger path. The baseline is stale as well as incomplete.

## Required closure

1. Create `DES-UCR-001` through `DES-UCR-003`.
2. Add explicit state machines and contracts for identity migration,
   session/commit lifecycle, packet delivery, promotion, and sustained health.
3. Split compound requirements into atomic, measurable contracts with typed
   errors and accepted denominators.
4. Replace the RTM with bidirectional artifact, source, test, result, and risk
   links.
5. Recalculate coverage and demonstrate at least 80% for every architecturally
   significant use case.

**Behavioral disposition: GAPS. Requirements are not baselined.**
