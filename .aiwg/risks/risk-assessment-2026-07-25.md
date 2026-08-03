# Risk Assessment

Status: Working assessment - owner calibration pending
Date: 2026-07-25
Assessment updated through: 2026-07-28 (no score or status change)
Iteration: Elaboration iteration 1
Baseline: `9b74ab7eb729961a42844accf6575906200e6275`
UC-002 source refresh: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
R-09 source refresh: candidate `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`;
default-branch input `a8e7d19a814a24a21818afc715f3301b3eaeee80`
Decision boundary: ABM remediation planning only

## Method

Probability and impact use a 1-5 scale. Score is probability x impact.
Priorities are P0 21-25, P1 16-20, P2 11-15, and P3 1-10. Evidence in live
source can raise probability, but an implementation defect is not by itself
retirement evidence. Scores remain proposals until confirmed by the
accountable owners.

DEC-12 accepts the exact local profile and its 740-file-execution/
42-lifecycle-journey denominators for Stage-A specification only. DEC-17
accepts the Stage-A authority matrix. Neither changes risk scores or statuses.
DEC-18 confirms the ABM risk-threshold arithmetic and veto semantics below.

## Complete Assessment

| ID | P | I | Score | Priority | Assessment rationale |
|---|---:|---:|---:|---|---|
| R-01 | 3 | 5 | 15 | P2 | Remote normalization drops ports and lowercases path segments; collision is plausible, while a real all-interface leak is not yet reproduced. |
| R-02 | 4 | 5 | 20 | P1 | Mandatory local sink containment remains unproved across LaunchAgent configuration, process environment, logs, errors, UI/health, support output, receipts, snapshots, backups, restore/upgrade/rollback remnants, and both processing-policy recording sinks. Historical Railway deployment/exposure remains a separate `UNVERIFIED / NOT EVALUATED` external issue without a named metadata-only owner attestation; prospective Railway deployment is deferred. Raw capture still reaches delivery before authoritative sanitization, and connector backups can retain sensitive configuration. |
| R-03 | 4 | 5 | 20 | P1 | Stale-recall incidents exist and context eligibility lacks complete temporal, contradiction, authority, and provenance rules. |
| R-04 | 4 | 5 | 20 | P1 | Sources are marked injected while the packet is constructed, before provider delivery or acknowledgement. |
| R-05 | 3 | 5 | 15 | P2 | Promotion guards exist, but source-count dedupe can erase independent corroboration and recalled or derived lessons can contribute to later confidence without an accepted acyclic evidence contract. |
| R-06 | 4 | 4 | 16 | P1 | Commit-link primitives trust caller-supplied commit identity and can create global commit state before session linkage; ancestry, path/blob consistency, and atomic dirty-to-commit attribution remain unproved. |
| R-07 | 4 | 4 | 16 | P1 | Hook delivery has neither a durable queue nor a terminal persistence receipt, while failures may still return host success; accepted backpressure and loss accounting are absent. |
| R-08 | 3 | 4 | 12 | P2 | Health collection records KV and worker failures, but evaluation ignores them. User-supplied 2026-07-28 non-qualifying diagnostics showed top-level healthy/Doctor success coexisting with a durable-scope warning and project slot failures, strengthening the need for required-dependency and warning-to-degraded semantics. |
| R-09 | 4 | 4 | 16 | P1 | The candidate and installed viewer discard a valid HTTP 503 critical-health body and can render misleading state. User-supplied 2026-07-28 non-qualifying browser/MCP evidence showed healthy rendering after repeated 503 warnings, global-looking aggregates without visible project/global scope controls, and same-project slot list/get HTTP 500 while named-project health succeeded. Complete browser auth/scope/denominator/build/degraded-recovery and split-failure evidence remains unproved. |
| R-10 | 4 | 4 | 16 | P1 | Project planning identifies canonical reindex, temporary aliasing, and duplicate-index retirement as outstanding external work; this evidence package does not establish key inventory, alias equivalence, consumer cutover, or rollback. |
| R-11 | 2 | 4 | 8 | P3 | Merge/idempotency tests lower probability, but ownership is inferred by command/path resemblance and backup/rewrite behavior lacks symlink, ownership, interruption, and exact rollback proof. |
| R-12 | 3 | 5 | 15 | P2 | Governance text blocks distribution, but no independently tested release-admission receipt or named release decision exists. |
| R-13 | 4 | 4 | 16 | P1 | DEC-12 accepts the exact local profile and 740/42 denominators for Stage-A specification only, but the profile is not implemented or bound for execution; no five-run/740-file-execution cohort, complete assertion/authentication manifests, three-clean-home/42-journey lifecycle cohort, synthetic processing-policy sink cohort, independent verification, or custody exists. The runner also copies ambient variables, accepts broad Node ranges, mislabels worktree state, permits zero observed workers, and lacks portable trust contracts. Node 22, Ubuntu, and GitHub CI remain deferred portability work. |
| R-14 | 4 | 5 | 20 | P1 | Current source fails closed when required credentials are unavailable and binds project capabilities to project/audience/expiry, but complete protected-surface evidence and operation/resource capability bounds remain unproved. User-supplied live browser evidence showed no interactive auth step or visible authority state, which is non-qualifying but strengthens the viewer-data/static-shell authentication matrix requirement; R-18 separately owns proxy downgrade. |
| R-15 | 3 | 5 | 15 | P2 | Some processing paths enforce project policy, but implicit sessions can reach observation/provider paths without an established project policy and provider fallback lacks one accepted per-attempt egress contract. |
| R-16 | 4 | 5 | 20 | P1 | The earlier migration command-target mismatch is corrected in the current candidate, but project migration still writes sequentially and restore remains additive and partial. A user-supplied diagnostic suggested migration for unscoped durable records but no migration/heal was authorized or run. Complete namespace inventory, generation atomicity, exact restore, reader fencing, authorization, and rollback truth remain unproved. |
| R-17 | 4 | 5 | 20 | P1 | Context and hook delivery failures can collapse to empty values or be swallowed while the caller receives success; no accepted terminal-outcome and degradation receipt prevents fabricated completion. |
| R-18 | 4 | 5 | 20 | P1 | The authenticated MCP compatibility path falls back to local execution across broad proxy errors; current tests do not prove that authorization, project, or protected-operation failures cannot downgrade authority. |
| R-19 | 4 | 5 | 20 | P1 | Session-end, pre-compaction, and API paths can trigger native-memory synchronization without a per-write user action, while the bridge lists the global memory namespace and writes one configured provider file without an exact project filter. |
| R-20 | 4 | 5 | 20 | P1 | Lifecycle APIs accept caller-controlled session, project, worktree, and parent fields; stale-session detection and closure are not compare-and-swap protected, permitting takeover, partial lineage, or attribution races. |
| R-21 | 4 | 4 | 16 | P1 | Capture dedupe hashes only a prefix, stores state in a process-local map, and separates check from record; restart, concurrency, suffix collision, and post-record partial failure can lose evidence or fabricate retry success. |
| R-22 | 4 | 5 | 20 | P1 | Compaction writes ledger, deletes observations, and removes indexes sequentially, while exact facts have no generation binding or integrity digest; faults can expose mixed state or undetectable ledger tampering. |
| R-23 | 4 | 4 | 16 | P1 | Worker startup and shutdown expose PID mechanics but no durable capture journal, automatic restart contract, singleton reconciliation, or startup replay; crashes can silently lose or duplicate accepted hook events. |

## Source Anchors

- R-01: `src/project-config.ts:147-171`.
- R-02:
  `a9c3a59da8509cc347b40d5c4c176987af5410e8:deploy/railway/entrypoint.sh:80-92`
  (historical disclosure), `deploy/railway/entrypoint.sh:80-92`,
  `deploy/railway/README.md:1-49`,
  `.aiwg/security/railway-secret-exposure-assessment-2026-07-26.md`,
  `.aiwg/security/secret-scan-disposition-2026-07-26.json`,
  `.aiwg/risks/poc-cards/R-02-local-macos-secret-flow-overlay.md`,
  `.aiwg/deployment/local-macos-operations-and-support-candidate.md`,
  `src/hooks/_capture.ts:312-349`,
  `src/hooks/_observe-delivery.ts:3-87`,
  `src/cli/connect/codex-hooks.ts:64-113`, and
  `src/cli/connect/codex.ts:149-193`.
- R-03, R-04, R-17: `src/functions/coding-memory.ts:135-170`,
  `src/functions/coding-memory.ts:218-236`,
  `src/functions/coding-memory.ts:303-312`, and
  `src/functions/coding-memory.ts:337-343`.
- R-05: `src/functions/promotions.ts:51-58`,
  `src/functions/promotions.ts:85-428`, `src/functions/remember.ts:65-129`,
  `src/functions/lessons.ts:12-30`, `src/functions/lessons.ts:52-83`, and
  `src/functions/lessons.ts:217-249`.
- R-06: `src/functions/coding-memory.ts:347-545`,
  `src/hooks/post-commit.ts:126-159`, and `src/triggers/api.ts:1315-1384`.
- R-07: `iii-config.yaml:38-55`,
  `deploy/railway/entrypoint.sh:68-76`,
  `src/hooks/_observe-delivery.ts:3-87`, and
  `src/hooks/post-tool-use.ts`.
- R-08: `src/health/monitor.ts:21-94` and
  `src/health/thresholds.ts:23-81`.
- R-09: `src/functions/slots.ts:115-237`,
  `src/triggers/api.ts:245-290`, `src/triggers/api.ts:2517-2673`,
  `src/viewer/index.html:1347-1426`, `test/slots.test.ts`, and
  `test/viewer-session-id.test.ts:250-276`; installed viewer
  `dist/viewer/index.html:1238-1260,1342-1347`; and default-branch design input
  `a8e7d19a814a24a21818afc715f3301b3eaeee80`.
- R-10: `.aiwg/architecture/adr/ADR-004-codebase-memory-interoperability.md`,
  `.aiwg/planning/scope-boundaries.md:32-43`, and
  `.aiwg/requirements/use-case-briefs/UC-001-scoped-recall.md:17-19`.
- R-11: `src/cli/connect/codex-hooks.ts:64-113`,
  `src/cli/connect/util.ts:73-113`, `src/cli/connect/codex.ts:106-139`,
  `src/cli/connect/codex.ts:149-193`,
  `src/cli/connect/claude-code.ts:136-184`, and
  `test/codex-connect-hooks.test.ts:55-132`.
- R-12: `.aiwg/planning/scope-boundaries.md:30-43`,
  `.aiwg/planning/iteration-plan-002.md:20-22`, and
  `.aiwg/reports/gate-validation-abm-2026-07-25.md:101-106`.
- R-13: `package.json:19-24`, `.github/workflows/ci.yml:55-83`,
  `.aiwg/testing/local-macos-qualification-profile-candidate.md`,
  `.aiwg/deployment/local-macos-operations-and-support-candidate.md`,
  `scripts/r13/lib.mjs:8-14`, `scripts/r13/run.mjs:85-149`,
  `scripts/r13/run.mjs:330-391`, `scripts/r13/run.mjs:507-578`,
  `scripts/r13/validate-receipts.mjs:252-390`,
  `schemas/r13-receipt.schema.json:1-167`, and
  `.aiwg/testing/r13-implementation-conformance-matrix.md`.
- R-14: `src/triggers/api.ts:260-305`, `src/mcp/server.ts:57-89`,
  `src/auth.ts:138-305`, and `src/hooks/_auth.ts:34-80`.
- R-15: `src/functions/model-processing.ts:25-108`,
  `src/functions/search.ts:95-218`,
  `src/functions/vision-search.ts:20-165`, and
  `src/providers/index.ts:61-93`, `src/functions/observe.ts:421-460`, and
  `src/hooks/_observe-delivery.ts:3-87`.
- R-16: `src/functions/migrate.ts:144-229`,
  `src/functions/snapshot.ts:39-232`, `package.json:23`, and
  `tsdown.config.ts:47`.
- R-17: `src/functions/coding-memory.ts:135-170`,
  `src/functions/coding-memory.ts:218-236`,
  `src/hooks/_observe-delivery.ts:3-87`, and
  `src/hooks/session-end.ts`.
- R-18: `src/mcp/rest-proxy.ts:206-243`,
  `src/mcp/standalone.ts:411-438`, `src/hooks/_auth.ts:34-80`, and
  `src/auth.ts:138-231`.
- R-19: `src/hooks/session-end.ts:67-77`,
  `src/hooks/pre-compact.ts:87-98`, `src/triggers/api.ts:2234-2255`,
  `src/functions/claude-bridge.ts:114-154`, and `src/config.ts:287-310`.
- R-20: `src/project-config.ts:289-365`,
  `src/triggers/api.ts:1131-1197`,
  `src/functions/session-lifecycle.ts:20-130`,
  `src/functions/observe.ts:421-460`, and `src/state/schema.ts:3-15`.
- R-21: `src/functions/dedup.ts:20-50`,
  `src/functions/observe.ts:96-177`,
  `src/functions/observe.ts:327-525`, and `src/index.ts:237`.
- R-22: `src/functions/observe.ts:192-283`, `src/types.ts:57-66`, and
  `src/state/schema.ts:5-74`.
- R-23: `src/cli.ts:856-908`, `src/cli.ts:1219-1283`,
  `src/cli.ts:2700-2829`, `src/index.ts:115-135`,
  `src/index.ts:637-672`, and `src/hooks/_observe-delivery.ts:3-87`.

The 2026-07-28 browser, MCP, and diagnostic observations were supplied live by
the operator for this review and are classified as non-qualifying candidate
evidence. They contain no session or memory content in this assessment. They
do not prove a denominator, authorize migration/heal, change a score/status,
accept Stage A, admit B1/B2, or claim execution.

## Priority Summary

| Priority | Count | Risks |
|---|---:|---|
| P0 | 0 | None |
| P1 | 17 | R-02, R-03, R-04, R-06, R-07, R-09, R-10, R-13, R-14, R-16, R-17, R-18, R-19, R-20, R-21, R-22, R-23 |
| P2 | 5 | R-01, R-05, R-08, R-12, R-15 |
| P3 | 1 | R-11 |

Aggregate score is 392. Mean is `392 / 23 = 17.04`, reported as 17.0.
Median is 16.

## Confirmed ABM Arithmetic

- Current retirement rate: `0 / 23 = 0%`.
- At least 70% requires 17 of 23 risks:
  `17 / 23 = 73.91%`.
- Sixteen of 23 is only `16 / 23 = 69.57%` and does not satisfy the
  numerical criterion.
- The AIWG risk gate also requires every P0 and P1 risk to be retired or
  mitigated with accepted evidence. An accepted risk does not satisfy this
  P0/P1 criterion, and accepted-but-open risks do not count toward the 17.
  Under the current scores, the future numerical threshold set is exactly all
  17 P1 risks. No lower-priority risk is numerically required, but every other
  gate criterion still applies, one unresolved mandatory veto prevents ABM
  PASS, and any later owner-approved rescore requires this arithmetic to be
  recomputed.
- This arithmetic is a planning constraint, not a retirement claim.

## Escalation

No risk currently scores P0. If owner calibration raises any score to 21-25,
the Project Manager must create an immediate executive decision brief before
the next evidence activity for that risk. R-02, R-03, R-04, R-14, R-16,
R-17, R-18, R-19, R-20, and R-22 are on the P0 watchlist because they have
impact 5 and score 20.

## Overall Assessment

Overall posture is **CRITICAL / ABM BLOCKED** because 17 P1 risks remain
identified, no risk has retirement evidence, and the non-risk ABM blockers
recorded by the existing gate report remain open. R-19 through R-23 are
Security Architect proposals with accountable-owner calibration pending.
R-09's revised score also awaits UI/API Owner calibration. This assessment
does not change that gate report or authorize Construction.
