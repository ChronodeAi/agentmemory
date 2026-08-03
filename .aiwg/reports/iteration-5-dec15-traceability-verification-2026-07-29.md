# Iteration 5 DEC-15 Traceability Verification

Status: **DEC-15 INDEPENDENT GRAPH CONDITION NOT MET**

Date: 2026-07-29
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Graph project: `private-tmp-chronode-agentmemory-elab-iter2`
Graph generation: `2026-07-28T20:08:52Z`, mode `moderate`

## Decision boundary

This report verifies documentary joins and qualifies graph coverage. It does
not accept requirements, realizations, source/test conformance, Codebase
Memory, DEC-15 completion, Stage A, or Construction.

## Documentary verification

| Check | Result |
|---|---:|
| Parent requirement groups | 33 |
| Atomic child contracts | 130 unique |
| Explicit RTM child coverage | 130 / 130 |
| Missing / extra / duplicate child IDs | 0 / 0 / 0 |
| Child-to-realization memberships | 288 |
| `DES-UCR-001` memberships | 61 |
| `DES-UCR-002` memberships | 121 |
| `DES-UCR-003` memberships | 106 |
| Canonical use-case-to-realization edges | 3 / 3 |
| Normalized `TR-UCM` rows | 19 |
| Normalized planned-test rows | 19 |
| Concrete candidate code/test/harness subjects | 49 |

Direct-file parsing supports these counts and found no documentary set
difference. The generic scanner does not discover the nested
`requirements/use-case-briefs/` layout; the canonical RTM supplies those exact
three path edges.

## Independent graph coverage

The coverage API was queried for all 49 concrete paths named by the canonical
RTM:

| Coverage class | Count |
|---|---:|
| No recorded issue in current generation | 11 |
| Excluded tests (`fast-pattern`) | 37 |
| Excluded harness test (`scripts/r13/run.test.mjs`) | 1 |
| Total | 49 |

The 11 graph-usable subjects are:

`src/functions/claude-bridge.ts`, `src/functions/dedup.ts`,
`src/functions/observe.ts`, `src/functions/privacy.ts`,
`src/functions/session-lifecycle.ts`, `src/hooks/_capture.ts`,
`src/hooks/_observe-delivery.ts`, `src/project-config.ts`,
`src/project-scope.ts`, `src/state/schema.ts`, and `src/types.ts`.

All 37 named test subjects are deliberately excluded in the persisted
moderate generation. The R-13 harness test is excluded because the complete
`scripts` subtree is not indexed. Historical graph nodes do not override
coverage metadata.

## DEC-15 disposition

DEC-15 requires exact paths, independent graph verification, and both
documentary directions. Exact paths and documentary directions are present.
Independent graph verification is incomplete for 38 of 49 concrete subjects.

Direct-file fallback is appropriate for the current governance review, but it
is not the independent full-graph verification specified by DEC-15. Therefore
the DEC-15 condition is **NOT MET** unless a human Configuration Manager and
Test Architect explicitly return DEC-15 for revision or accept a narrowly
defined direct-file fallback in a successor decision. No such disposition is
recorded here.

No live source/test annotation is required or authorized in Elaboration.
