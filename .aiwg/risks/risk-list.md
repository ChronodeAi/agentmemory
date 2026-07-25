# Risk List

Status: Active draft
Date: 2026-07-25

| ID | Risk | Likelihood | Impact | Mitigation/evidence needed | Owner |
|---|---|---:|---:|---|---|
| R-01 | Cross-project or colliding-basename leakage | Medium | Critical | Synthetic repo matrix; every interface scope audit | Software Architect |
| R-02 | Secret or sensitive-data persistence | Medium | Critical | Secret corpus, pre-persistence assertions, rollback/delete rehearsal | Security Architect |
| R-03 | Stale authority enters gate-critical context | High | Critical | Eligibility-first packet, adversarial fixtures, explicit-only canary | Product Owner + Test Architect |
| R-04 | Generated packet is counted as delivered | High | High | Delivery acknowledgement protocol and retry tests | Software Architect |
| R-05 | Recall self-reinforces into promotion | Medium | Critical | Evidence object model; provenance DAG; negative fixtures | Software Architect |
| R-06 | Missing uncommitted provenance lowers commit coverage | High | High | Worktree snapshot/file-event authority and eligibility denominator | Git/Runtime Owner |
| R-07 | Capture/backpressure harms agent responsiveness | Medium | High | Declared concurrency load; p95 hook latency <2s | Performance Test Owner |
| R-08 | Memory pressure is misreported as healthy | Medium | High | Sustained health state machine and soak | Service Owner |
| R-09 | Slot listing or viewer fails despite backend health | Medium | High | Integration contract and build-identity tests | UI/API Owner |
| R-10 | Duplicate graph indexes split authority | High | High | Canonical reindex, alias verification, retirement | Codebase Memory maintainer |
| R-11 | Configuration repair overwrites provider settings | Low | High | Merge/idempotency/rollback tests | Connector Owner |
| R-12 | External addon distribution precedes release proof | Medium | Critical | Release-owner gate and separate repository work item | AIWG maintainer |
| R-13 | Canonical `npm test` exhausts resources under unconstrained parallelism | High | High | Bounded worker profile; green default command on declared developer and CI hosts | Test Infrastructure Owner |

No risk is retired by this accelerate run.
