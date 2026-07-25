# Supplemental Specification

Status: Draft

## Functional requirements

- FR-01: Resolve credential-free canonical project identity with hashed-path fallback.
- FR-02: Migrate aliases/worktrees idempotently and fail on collisions.
- FR-03: Enforce project scope on every record and interface; global is explicit.
- FR-04: Namespace project slots and return a working scoped slot list.
- FR-05: Deduplicate events and semantically duplicate observations below the accepted duplicate-rate threshold.
- FR-06: Make resumed, child, and stale-session lifecycle idempotent and attributable.
- FR-07: Apply capture profile, exclusions, redaction, and bounds before persistence.
- FR-08: Compact rolling history while preserving an exact-facts ledger.
- FR-09: Filter packet eligibility before relevance, cap at 2,000 tokens, and dedupe acknowledged sources per session.
- FR-10: Preserve temporal validity and committed/uncommitted provenance.
- FR-11: Acknowledge context delivery; configuration or generation alone is not delivery.
- FR-12: Link eligible evidence to commits and report scope, duplicate, delivery, promotion, and linkage health.
- FR-13: Promote only with independent typed evidence; prohibit recalled-content self-reinforcement.
- FR-14: Synchronize native provider memory only by explicit action.
- FR-15: Enforce strict local processing and secret-file authentication.
- FR-16: Load provider config with process-environment precedence.
- FR-17: Recognize direct-binary and `npx` MCP; repair hooks idempotently without force and merge unrelated hooks.
- FR-18: Cover failures, session end, subagent lifecycle, and commit hooks with bounded backpressure.
- FR-19: Return typed disabled-feature errors and fail closed for required server-backed MCP behavior.
- FR-20: Report sustained service health plus backend/viewer compatible build identities.

## Quality and acceptance requirements

| ID | Threshold |
|---|---|
| NFR-01 | Zero cross-project leakage |
| NFR-02 | Zero secret leakage |
| NFR-03 | Zero stale-authority leakage in gate-critical contexts |
| NFR-04 | 100% project scope for new records |
| NFR-05 | Human-labelled precision@5 >=80% |
| NFR-06 | Duplicate observations <2% |
| NFR-07 | Eligible commit linkage >=95% |
| NFR-08 | Packet size <=2,000 tokens |
| NFR-09 | p95 hook latency <2 seconds at declared concurrency |
| NFR-10 | Provenance exists for committed and uncommitted work |
| NFR-11 | Healthy compatible backend never yields `Unknown` viewer health/build identity |
| NFR-12 | Canonical `npm test` exits zero within the declared developer and CI resource profiles |

All thresholds are release gates, not aspirational telemetry.
