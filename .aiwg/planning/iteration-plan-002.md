# Iteration Plan 002: Provider Reliability and Release Evidence

Status: Draft; not authorized
Objective: prove provider, service, UI, migration, and rollback behavior

## Planned work packages

| ID | Work package | Acceptance evidence | Owner |
|---|---|---|---|
| I2-01 | Codex/Claude connector and lifecycle completion | direct-binary/`npx`, merge, repair, failure/end/subagent/commit tests | Connector owner |
| I2-02 | Bounded hook backpressure | p95 <2s at accepted concurrency | Performance owner |
| I2-03 | Typed disabled-feature and required-backend fail-closed behavior | unit/integration/fault tests | MCP owner |
| I2-04 | Sustained health, slots, pressure semantics | soak including reported pressure and HTTP 500 shapes | Service owner |
| I2-05 | Backend/viewer compatibility and build identity | no `Unknown` on healthy compatible pair | UI owner |
| I2-06 | Human-labelled retrieval and answer-quality benchmark | precision@5 >=80%; zero gate-critical stale leakage | Test Architect |
| I2-07 | Dedupe and eligible commit-link benchmark | duplicates <2%; linkage >=95% | Evidence owner |
| I2-08 | Rollback rehearsal | connector, state, service, migration rollback evidence | Release Owner |
| I2-09 | External Codebase Memory migration | canonical config/reindex/alias/retirement evidence | CBM maintainer |
| I2-10 | Five-session Codex/Claude Memetics canary | all thresholds plus named acceptance | Product/Release owners |
| I2-11 | Bound the canonical Vitest execution profile | `npm test` exits zero on declared developer/CI hosts without resource exhaustion | Test Infrastructure Owner |

AIWG distribution and all other-repository deployments remain separate external work after exit.
