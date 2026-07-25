# Risk Assessment

Status: Working assessment - owner calibration pending
Date: 2026-07-25
Iteration: Elaboration iteration 1
Baseline: `9b74ab7eb729961a42844accf6575906200e6275`
Decision boundary: ABM remediation planning only

## Method

Probability and impact use a 1-5 scale. Score is probability x impact.
Priorities are P0 21-25, P1 16-20, P2 11-15, and P3 1-10. Evidence in live
source can raise probability, but an implementation defect is not by itself
retirement evidence. Scores remain proposals until confirmed by the
accountable owners.

## Complete Assessment

| ID | P | I | Score | Priority | Assessment rationale |
|---|---:|---:|---:|---|---|
| R-01 | 3 | 5 | 15 | P2 | Remote normalization drops ports and lowercases path segments; collision is plausible, while a real all-interface leak is not yet reproduced. |
| R-02 | 4 | 5 | 20 | P1 | Railway first boot prints the HMAC secret and its runbook directs operators to deployment logs; broader storage/redaction coverage remains unproved. |
| R-03 | 4 | 5 | 20 | P1 | Stale-recall incidents exist and context eligibility lacks complete temporal, contradiction, authority, and provenance rules. |
| R-04 | 4 | 5 | 20 | P1 | Sources are marked injected while the packet is constructed, before provider delivery or acknowledgement. |
| R-05 | 3 | 5 | 15 | P2 | Promotion guards exist, but freshness and verification can still rely on text patterns and source counts rather than independent typed evidence. |
| R-06 | 4 | 4 | 16 | P1 | Commit-link primitives exist, but uncommitted edits lack attributable base, path, digest, rename/delete, and supersession lineage. |
| R-07 | 4 | 4 | 16 | P1 | No accepted concurrency receipt exists, and Railway reinstates full sampling plus console logging despite the documented feedback loop. |
| R-08 | 3 | 4 | 12 | P2 | Health collection records KV and worker failures, but evaluation ignores them; occurrence depends on dependency failure or sustained pressure. |
| R-09 | 3 | 4 | 12 | P2 | Focused UI tests exist, but live slots, compatible build identity, and split backend/viewer failure behavior remain unproved. |
| R-10 | 4 | 4 | 16 | P1 | Project planning identifies canonical reindex, temporary aliasing, and duplicate-index retirement as outstanding external work; this evidence package does not establish key inventory, alias equivalence, consumer cutover, or rollback. |
| R-11 | 2 | 4 | 8 | P3 | Merge/idempotency tests lower probability, but disposable-home interruption and exact rollback evidence are absent. |
| R-12 | 3 | 5 | 15 | P2 | Governance text blocks distribution, but no independently tested release-admission receipt or named release decision exists. |
| R-13 | 4 | 4 | 16 | P1 | Canonical `npm test` has exited 137, excludes integration, is used by CI, and auth rejection can skip when no secret is set. |
| R-14 | 4 | 5 | 20 | P1 | REST and MCP `checkAuth` return success when no secret is configured; an externally reachable misconfiguration can expose all protected surfaces. |
| R-15 | 3 | 5 | 15 | P2 | Some processing paths enforce project policy, but hybrid/vision query embedding and provider fallback lack one accepted per-attempt egress contract. |
| R-16 | 4 | 5 | 20 | P1 | Project migration writes sequentially, restore is additive and partial, and `npm run migrate` targets an output not emitted by the current build. |
| R-17 | 4 | 5 | 20 | P1 | Context source failures collapse to empty values and the packet later reports unqualified success without completeness/degradation metadata. |

## Source Anchors

- R-01: `src/project-config.ts:147-171`.
- R-02: `deploy/railway/entrypoint.sh:80-92` and
  `deploy/railway/README.md:44-54`.
- R-03, R-04, R-17: `src/functions/coding-memory.ts:135-170`,
  `src/functions/coding-memory.ts:218-236`,
  `src/functions/coding-memory.ts:303-312`, and
  `src/functions/coding-memory.ts:337-343`.
- R-05: `src/functions/promotions.ts:51-58` and
  `src/functions/promotions.ts:85-428`.
- R-06: `src/functions/coding-memory.ts:347-545` and
  `src/hooks/post-commit.ts`.
- R-07: `iii-config.yaml:38-55` and
  `deploy/railway/entrypoint.sh:68-76`.
- R-08: `src/health/monitor.ts:21-94` and
  `src/health/thresholds.ts:23-81`.
- R-09: `src/functions/slots.ts:115-237`,
  `src/triggers/api.ts:245-290`, `src/triggers/api.ts:2517-2673`,
  `src/viewer/index.html:1347-1426`, `test/slots.test.ts`, and
  `test/viewer-session-id.test.ts:250-276`.
- R-10: `.aiwg/architecture/adr/ADR-004-codebase-memory-interoperability.md`,
  `.aiwg/planning/scope-boundaries.md:32-43`, and
  `.aiwg/requirements/use-case-briefs/UC-001-scoped-recall.md:17-19`.
- R-11: `src/cli/connect/codex-hooks.ts:54-101`,
  `src/cli/connect/codex.ts:147-183`,
  `src/cli/connect/claude-code.ts:136-184`, and
  `test/codex-connect-hooks.test.ts:55-132`.
- R-12: `.aiwg/planning/scope-boundaries.md:30-43`,
  `.aiwg/planning/iteration-plan-002.md:20-22`, and
  `.aiwg/reports/gate-validation-abm-2026-07-25.md:101-106`.
- R-13: `package.json:19-24`, `.github/workflows/ci.yml:57-68`, and
  `test/integration.test.ts:278`.
- R-14: `src/triggers/api.ts:51-64` and `src/mcp/server.ts:57-68`.
- R-15: `src/functions/model-processing.ts:25-108`,
  `src/functions/search.ts:95-218`,
  `src/functions/vision-search.ts:20-165`, and
  `src/providers/index.ts:61-93`.
- R-16: `src/functions/migrate.ts:144-229`,
  `src/functions/snapshot.ts:39-232`, `package.json:23`, and
  `tsdown.config.ts:47`.

## Priority Summary

| Priority | Count | Risks |
|---|---:|---|
| P0 | 0 | None |
| P1 | 10 | R-02, R-03, R-04, R-06, R-07, R-10, R-13, R-14, R-16, R-17 |
| P2 | 6 | R-01, R-05, R-08, R-09, R-12, R-15 |
| P3 | 1 | R-11 |

Aggregate score is 276. Mean is `276 / 17 = 16.24`, reported as 16.2.
Median is 16.

## ABM Arithmetic

- Current retirement rate: `0 / 17 = 0%`.
- At least 70% requires 12 of 17 risks:
  `12 / 17 = 70.59%`.
- Eleven of 17 is only 64.71% and does not satisfy the numerical criterion.
- The AIWG risk gate also requires every P0 and P1 risk to be retired or
  mitigated with accepted evidence. An accepted risk does not satisfy this
  P0/P1 criterion. Therefore any future 12-risk threshold set must include all
  10 P1 risks plus at least two lower-priority risks.
- This arithmetic is a planning constraint, not a retirement claim.

## Escalation

No risk currently scores P0. If owner calibration raises any score to 21-25,
the Project Manager must create an immediate executive decision brief before
the next evidence activity for that risk. R-02, R-03, R-04, R-14, R-16, and
R-17 are on the P0 watchlist because they have impact 5 and score 20.

## Overall Assessment

Overall posture is **CRITICAL / ABM BLOCKED** because 10 P1 risks remain
identified, no risk has retirement evidence, and the non-risk ABM blockers
recorded by the existing gate report remain open. This assessment does not
change that gate report or authorize Construction.
