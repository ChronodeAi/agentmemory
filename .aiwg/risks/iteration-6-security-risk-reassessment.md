# Iteration 6 Security Risk Reassessment

Status: **PROPOSED SCORE REFRESH - ALL RISKS REMAIN IDENTIFIED**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Evidence: `.aiwg/reports/iteration-6-runtime-security-refresh-2026-07-30.md`

## Boundary

This addendum proposes a score refresh from fresh reproducible local evidence.
It creates no accepted risk, mitigation, retirement, owner concurrence, ADR,
architecture baseline, Stage-A authority, ABM passage, Construction authority,
or release authority.

## Finding-to-risk mapping

No duplicate canonical risk is created. The viewer proxy bypass is primarily a
realization of R-14 and also strengthens R-02, R-09, and R-23.

| Risk | Existing score | Proposed score | Status | Rationale |
|---|---:|---:|---|---|
| R-14 | 4 x 5 = 20, P1 | 5 x 5 = 25, P0 | IDENTIFIED | The condition is reproducible on both live viewer origins despite configured secret-file authentication. The direct engine rejects the same request, proving a protection-boundary bypass. |
| R-02 | 4 x 5 = 20, P1 | unchanged | IDENTIFIED | Protected session material is exposed through the viewer path; no content was retained in this evidence set. |
| R-09 | 4 x 4 = 16, P1 | unchanged | IDENTIFIED | Healthy service/viewer labels conceal the authorization failure and duplicate-viewer state. |
| R-23 | 4 x 4 = 16, P1 | unchanged | IDENTIFIED | Two viewer/worker processes with different parents leave ownership and stop/restart reconciliation unproved; the official stop path reads one worker pidfile. |

R-14's existing accountable owner remains Authentication Service Owner.
Required independent reviewers remain Security Architect, Test Architect, and
Operations Owner. The proposed probability increase and P0 priority require
their calibration; absence of concurrence does not erase the observed
nonconformance.

## Candidate portfolio arithmetic

If the R-14 score refresh is accepted into the canonical register:

| Metric | Current | Candidate |
|---|---:|---:|
| Active risks | 23 | 23 |
| P0 | 0 | 1 |
| P1 | 17 | 16 |
| P2 | 5 | 5 |
| P3 | 1 | 1 |
| Aggregate score | 392 | 397 |
| Mitigated or retired | 0 | 0 |

R-14 remains an unresolved mandatory security veto. The ABM arithmetic remains
`0 / 23`; Construction remains unauthorized.

## Bounded hypotheses for later authorized work

| Hypothesis | Bounded acceptance evidence |
|---|---|
| H-R14-01: every viewer-origin protected route enforces the same credential decision as the direct engine | Route matrix across direct and viewer origins; unauthenticated 401/403; authenticated project success; explicit global authority; no response-body capture |
| H-R14-02: viewer startup does not convert possession of a loopback port into administrative authority | Fresh-home launch with no browser credential, negative project/global requests, explicit browser authentication, and wrong-audience/project/revocation cases |
| H-R23-01: one accepted runtime generation owns engine and viewer ports | Launch, second-start, stale-PID, crash, stop, restart, rollback, and uninstall transcript with one worker/viewer identity |
| H-R09-01: Doctor and UI fail visibly on auth/viewer contract violations | Deterministic health fixture matrix proving failed/degraded/incompatible states and no "all passing" summary below 10/10 |
| H-R14-03: all engine/control listeners are loopback-only or independently protected | Listener inventory across clean starts plus authenticated negative probes for 3111, stream, viewer/fallback, and `iii` control ports; zero unexplained wildcard listeners |

These are PoC specifications only. No B1 mechanics, B2 admission, execution,
or product change is authorized.
