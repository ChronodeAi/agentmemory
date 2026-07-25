# Master Test Plan

Status: Draft; requires Test Architect acceptance
Date: 2026-07-25

## 1. Purpose

Prove the Universal Coding Memory Optimization at unit, integration, system, adversarial, performance, recovery, and canary levels. Existing tests are implementation evidence, not acceptance evidence.

## 2. Test environments

- Hermetic unit environment with external embedding/config variables unset.
- iii-engine integration environment with isolated state and authenticated REST/MCP.
- Codex and Claude disposable configuration homes.
- Two or more synthetic repositories with identical basenames, worktrees, remote aliases, committed and uncommitted changes.
- Codebase Memory 0.9.1 canonical test index plus temporary alias.
- Concurrent multi-agent harness at a declared concurrency selected and accepted before execution.
- Compatible and incompatible backend/viewer build pairs.
- Five-session Memetics canary operated explicit-only; automatic gate-critical injection disabled.
- Declared developer and CI resource profiles for the canonical `npm test` command.

No secret values from fixtures may appear in reports.

## 3. Verification suites

| Suite | Required coverage |
|---|---|
| T-IDENTITY | Credential-free remote canonicalization, hashed fallback, nested worktree, alias migration, colliding basenames, rollback |
| T-CONFIG | Process-env precedence, user/repo precedence, secret-file auth, missing/unreadable secret, no output disclosure |
| T-SCOPE | Every retrieval, search, session, file-history, commit-history, expanded result, promotion, slot, health, and viewer route |
| T-SLOTS | Namespaces, listing, pin/shadow, cross-project isolation, backend failure, reported HTTP 500 regression |
| T-DEDUPE | Event hash retries, semantic near duplicates, project isolation, concurrency, <2% observed duplicate rate |
| T-SESSION | Idempotent start/resume/child/close, stale abandonment, crash/restart, concurrent calls |
| T-CAPTURE | Balanced/minimal/full profiles, exclusions, redaction, output caps, failures, commit/subagent/session-end hooks |
| T-COMPACTION | Rolling compaction, exact-facts ledger preservation, replay, crash consistency |
| T-CONTEXT | Eligibility-first selection, <=2,000 tokens, session-source dedupe, acknowledgement/retry/expiry, zero stale-authority leakage |
| T-TEMPORAL | Commit supersession, dirty source changes, clock/time ordering, validity expiry, contradictory source |
| T-PROVENANCE | Committed and uncommitted work, source digest, base commit, path, transition to commit, deletion/rename |
| T-PROMOTION | Typed evidence, accepted ADR, commit/runtime/test proof, independent sources, no self-reinforcement |
| T-COMMIT | Idempotent links, project scope, eligibility denominator, >=95% eligible linkage |
| T-PRIVACY | Tokens, keys, passwords, connection strings, private tags, encoded/structured secrets, error and telemetry paths |
| T-PROVIDER | Codex/Claude config, direct binary/`npx`, hook-only repair, unrelated-hook merge, env precedence, feature-disabled typed errors |
| T-SERVICE | Required-backend fail-closed, local-mode boundary, pressure, restart, sustained health, soak |
| T-UI | Backend and viewer build identities, compatibility, no `Unknown`, scoped aggregate queries, slot/project health |
| T-CBM | Canonical config, source/decision roots, excludes, path-filter consistency, AIWG ADR recognition, alias and duplicate retirement |
| T-ROLLBACK | Connector/config restore, migration rollback, service rollback, reindex alias rollback, retained audit truth |
| T-RUNNER | Canonical `npm test`, bounded workers, memory ceiling, deterministic completion on declared developer/CI profiles |

## 4. Human-labelled retrieval and answer-quality evaluation

Build a frozen benchmark from representative project questions and adversarial fixtures. For each query, independent reviewers label eligible current sources, stale/conflicting sources, project ownership, and expected answer facts.

- Primary metric: precision among the top five results; pass >=80%.
- Safety metrics: zero cross-project, secret, and stale-authority items in gate-critical packets.
- Downstream metric: blinded reviewers compare answers produced with no recall, current bounded recall, and adversarial stale recall. The recalled condition must improve correct supported facts without increasing unsupported authority claims.
- Include the operator-reported Memetics failure shapes: obsolete adapter, conflicting PostgreSQL posture, wrong language, unrelated activity, synthetic commit links, and missing uncommitted provenance.

## 5. Load, backpressure, and soak

- Declare concurrency, agent mix, event rate, hook types, host profile, and dataset size before the run.
- Measure context-injecting and telemetry hook latency separately.
- Pass when p95 is below two seconds, no unbounded queue exists, no secret/cross-project leakage occurs, and loss/drop behavior matches the accepted capture policy.
- Run sustained service health through normal, pressure, backend failure, recovery, viewer mismatch, and slot-list conditions.
- The soak duration and consecutive-success health window require Test Architect/Release Owner acceptance; no value is invented here.

## 6. Canary

Run five real sessions spanning both Codex and Claude against Memetics:

- recall is explicit-only;
- no automatic gate-critical injection;
- record packet candidates, eligibility decisions, acknowledgements, provenance, latency, dedupe, commit linkage, and operator labels;
- compare live authority before acting;
- stop immediately on any project, secret, or stale-authority leakage.

Broad rollout is blocked until all numerical acceptance thresholds pass and the Product Owner/Founder, Security Architect, Test Architect, and Release Owner accept the canary.

## 7. Exit criteria

All NFR thresholds pass, no severity-1/2 defects remain, rollback is rehearsed, external Codebase Memory dependencies are complete, proposed ADRs and the architecture baseline are accepted, and named owners approve release. Until then the correct result is NOT CONSTRUCTION READY or NOT ROLLOUT READY as applicable.
