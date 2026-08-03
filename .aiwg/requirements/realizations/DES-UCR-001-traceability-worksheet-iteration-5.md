# DES-UCR-001 Traceability Worksheet — Iteration 5

Status: **NOT ELIGIBLE / BLOCKED — HUMAN ACCEPTANCE AND QUALIFIED INDEPENDENT EVIDENCE ABSENT**

Date: 2026-07-29

## Purpose and authority

This worksheet makes the frozen `DES-UCR-001` behavioral-unit denominator
individually auditable. It is derived from:

- [DES-UCR-001](DES-UCR-001.md);
- the [Supplemental Specification](../supplemental-specification.md);
- the canonical [Requirements Traceability Matrix](../traceability-matrix.md);
- the active [Risk List](../../risks/risk-list.md);
- the Draft [Master Test Plan](../../testing/master-test-plan.md); and
- Revision 24's
  [refreeze contract](../../reports/iteration-4-evidence-refreeze-r24-2026-07-28.md),
  [deterministic receipt](../../reports/iteration-4-manifest-verification-r24.json),
  and
  [post-generation adversarial review](../../reports/iteration-4-adversarial-review-r24-2026-07-28.md).

The canonical RTM remains the sole cross-artifact traceability authority.
This worksheet neither replaces nor edits it. Atomic-child mappings below are
the minimum direct contracts exercised by each behavioral unit. Risk mappings
are the direct risks tested or bounded by that unit; they do not import every
transitive risk attached to a shared `TR-UCM` row.

`Q0` means there is no qualified, independently accepted evidence locator for
the unit. Any locator following `Q0` is only a planned suite, proposed external
contract, risk-card input, or inherited mechanism-test candidate.

`AUTH-OPEN` means the listed accountable/reviewer role remains an assignment,
not a recorded acceptance: requirement and realization acceptance are open,
MTP `AUTH-A` is `OPEN`, MTP `AUTH-D` is `NOT ELIGIBLE`, and no executor may
verify or accept its own evidence.

## Frozen score

| Metric | Value |
|---|---:|
| Denominator | 23 |
| Required threshold | 19 |
| Observed numerator | 0 |
| Observed ratio | 0 / 23 (0%) |
| Result | **NOT ELIGIBLE / BLOCKED** |

Revision 24 confirms the denominator and threshold but records requirements
accepted `0`, realizations accepted `0`, independent custody `false`, and
qualifying evidence admitted `false`. Its deterministic and adversarial PASS
results are local advisory evidence about the freeze, not behavioral-unit
acceptance. Consequently, documentary presence, inherited tests, historical
passing observations, and planned evidence targets award no numerator credit.

## Unit worksheet

| Unit ID | Exact atomic requirement child IDs | Exact risk IDs | Planned verification / evidence target | Current numerator | Evidence locator | Reviewer / authority state |
|---|---|---|---|---:|---|---|
| TS-UCR-001 | `FR-01.a`, `FR-01.b`, `FR-01.c` | `R-01`, `R-02` | `T-IDENTITY`: frozen credential-bearing remote equivalence and separation corpus; redacted resolver receipt; zero collision or credential-material oracle. | 0 | Q0; canonical RTM `TR-UCM-001`; candidate `test/project-config.test.ts`. | AUTH-OPEN — Software Architect / Test Infrastructure Owner; Security Architect and Configuration Manager review required. |
| TS-UCR-002 | `FR-01.d`, `FR-02.d`, `FR-03.b`, `FR-19.e` | `R-01` | `T-IDENTITY`, `T-SCOPE`: multi-remote and configured-ID conflict fixture with typed denial and complete before/after governed-side-effect manifest. | 0 | Q0; canonical RTM `TR-UCM-001`, `TR-UCM-002`; R-01 card index; candidate `test/project-config.test.ts`, `test/api-project-scope-regressions.test.ts`. | AUTH-OPEN — Software Architect / Test Infrastructure Owner; Security Architect review required. |
| TS-UCR-003 | `FR-01.e` | `R-01` | `T-IDENTITY`: remote-less repository move/worktree fixture proving persistent local UUID continuity and non-authoritative path-hash bootstrap. | 0 | Q0; canonical RTM `TR-UCM-001`; R-01 card index; candidate `test/project-config.test.ts`. | AUTH-OPEN — Software Architect / Test Infrastructure Owner; Configuration Manager review required. |
| TS-UCR-004 | `FR-02.a`, `FR-02.b`, `FR-02.c`, `FR-02.d` | `R-01`, `R-16` | `T-IDENTITY`, `T-ROLLBACK`: owner-proven two-worktree alias migration under one immutable generation, repeat-run zero-diff receipt, collision denial, and before/after manifests. | 0 | Q0; canonical RTM `TR-UCM-001`, `TR-UCM-013`; R-01/R-16 card indexes; candidates `test/project-config.test.ts`, `test/snapshot.test.ts`, `test/index-persistence.test.ts`. | AUTH-OPEN — Software Architect / Migration-Restore Owner / Test Infrastructure Owner; Configuration Manager and Security Architect review required. |
| TS-UCR-005 | `FR-03.c`, `FR-15.f`, `FR-19.e`, `NFR-01.a` | `R-01`, `R-14`, `R-18` | `T-SCOPE`, `T-SERVICE`: missing-project REST and server-MCP recall matrix with typed denial, zero disclosure, zero downstream trigger, and complete governed read/write receipt. | 0 | Q0; canonical RTM `TR-UCM-002`, `TR-UCM-009`, `TR-UCM-016`; candidates `test/cross-project-isolation.test.ts`, `test/auth-capability.test.ts`, `test/mcp-standalone-proxy.test.ts`. | AUTH-OPEN — Software Architect / Security Architect / Test Infrastructure Owner; Authentication Service Owner review required. |
| TS-UCR-006 | `FR-03.b`, `FR-15.f`, `FR-19.e`, `NFR-01.a` | `R-01`, `R-14`, `R-18` | `T-SCOPE`, `T-SERVICE`: direct wrong-project `memory_recall` tests over REST and server MCP, proving non-invocation and zero access-log, metric, packet, audit, fallback, or disclosure effects. | 0 | Q0; canonical RTM `TR-UCM-002`, `TR-UCM-009`, `TR-UCM-016`; temporary explicit-recall profile in the MTP. `DES-UCR-001` explicitly records the prior citation as invalid. | AUTH-OPEN — Software Architect / Security Architect / Test Infrastructure Owner; independent direct-recall review required. |
| TS-UCR-007 | `FR-03.d`, `FR-15.f`, `FR-19.d`, `FR-19.e` | `R-01`, `R-14`, `R-18` | `T-SCOPE`, `T-SERVICE`: explicit-global positive/negative authorization matrix proving project authority denial, separate administrator authority, attributable advisory output, and zero implicit standalone-global success. | 0 | Q0; canonical RTM `TR-UCM-002`, `TR-UCM-009`; R-01/R-14/R-18 card or governed-method inputs; candidates `test/api-project-scope-regressions.test.ts`, `test/auth-capability.test.ts`, `test/mcp-standalone-proxy.test.ts`. | AUTH-OPEN — Security Architect / Authentication Service Owner / MCP Compatibility Owner; separate human global-authority decision required. |
| TS-UCR-008 | `FR-03.b`, `FR-09.e`, `NFR-01.a` | `R-01` | `T-SCOPE`, `T-CONTEXT`: two-project all-surface leakage corpus proving every project-A result and emitted sink resolves only to A, with zero B content in response, logs, packet, export, or viewer. | 0 | Q0; canonical RTM `TR-UCM-002`, `TR-UCM-005`, `TR-UCM-016`; candidates `test/cross-project-isolation.test.ts`, `test/coding-memory.test.ts`, `test/context-injection.test.ts`. | AUTH-OPEN — Software Architect / Product-Context Owner / Test Infrastructure Owner; Security Architect review required. |
| TS-UCR-009 | `FR-09.a`, `FR-09.g`, `FR-10.a`, `FR-10.b`, `FR-13.a`, `FR-13.b`, `FR-13.c`, `FR-13.e`, `NFR-03.a` | `R-03`, `R-05` | `T-CONTEXT`, `T-TEMPORAL`, `T-PROMOTION`: packet-level integration and evidence-ledger inspection over stale, superseded, contradicted, unaccepted-authority, recalled-only, and missing-provenance candidates; every exclusion persists a reason and contributes zero packed bytes or promotion. | 0 | Q0; canonical RTM `TR-UCM-005`, `TR-UCM-007`, `TR-UCM-008`, `TR-UCM-016`; candidates `test/context-eligibility.test.ts`, `test/context-injection.test.ts`, `test/promotions.test.ts`. `DES-UCR-001` states current evaluator-only evidence is insufficient. | AUTH-OPEN — Product / Context Owner / Requirements Owner; independent packet-ledger review required. |
| TS-UCR-010 | `FR-13.a`, `FR-13.b`, `FR-13.c`, `FR-13.e`, `NFR-03.a` | `R-03`, `R-05` | `T-PROMOTION`, `T-CONTEXT`: labelled lineage-DAG unit/integration corpus proving a recalled locator alone yields `INDETERMINATE` or `INELIGIBLE` and can never establish verification or promotion. | 0 | Q0; canonical RTM `TR-UCM-008`, `TR-UCM-016`; R-03/R-05 governed methods; candidates `test/promotions.test.ts`, `test/context-lessons.test.ts`. | AUTH-OPEN — Product / Context Owner / Requirements Owner; Test Architect and Security Architect review required. |
| TS-UCR-011 | `FR-09.a`, `FR-13.a`, `FR-13.b`, `FR-13.d` | `R-03`, `R-10` | `T-CBM`, `T-PROMOTION`: external portable trust receipt bound to endpoint, build, project, root, revision, configuration, generation, writer, query, result, coverage, and time, followed by direct-source confirmation; graph response alone fails the authority oracle. | 0 | Q0; canonical RTM `TR-UCM-008`, `TR-UCM-015`; proposed external contract `.aiwg/requirements/contracts/ER-CBM-001-codebase-memory-interoperability.md`; R-10 card. | AUTH-OPEN — Codebase Memory Maintainer / Test Architect / Requirements Owner; external contract is NOT ACCEPTED / NOT QUALIFIED. |
| TS-UCR-012 | None in the 130-child Agentmemory denominator; exact external prerequisite: `ER-CBM-001` | `R-10` | `T-CBM`: frozen 20-query canonical/alias equivalence fixture proving the same physical index, generation, writer, roots, filters, and normalized results, with mismatch leaving both indexes unchanged. | 0 | Q0; canonical RTM `TR-UCM-015`; `.aiwg/requirements/contracts/ER-CBM-001-codebase-memory-interoperability.md`; `.aiwg/risks/poc-cards/R-10-codebase-memory-canonical-alias-v1.md`. | AUTH-OPEN — Codebase Memory Maintainer / Test Architect; external contract and fixture remain NOT ACCEPTED / NOT QUALIFIED. |
| TS-UCR-013 | `FR-09.a`, `FR-13.b`, `FR-19.b`, `FR-19.c`, `FR-19.e` | `R-03`, `R-10`, `R-17` | `T-CBM`, `T-CONTEXT`, `T-SERVICE`: required-structural-source end-to-end fault matrix proving absent or mismatched trust/alias evidence yields typed failure and no packet ID/content, suppression, promotion, or local substitute. | 0 | Q0; canonical RTM `TR-UCM-005`, `TR-UCM-009`, `TR-UCM-015`; external contract and R-10/R-17 governed inputs; candidate `test/context-injection.test.ts`. | AUTH-OPEN — Product / Context Owner / Codebase Memory Maintainer / Security Architect; required-source policy decision remains open. |
| TS-UCR-014 | `FR-09.b`, `FR-09.f`, `NFR-08.a` | `R-03`, `R-13` | `T-CONTEXT`, `T-RUNNER`: accepted tokenizer/version/profile boundary corpus over the exact final serialized wire image, proving total and fixed class maxima, at most 2,000 tokens, and zero re-entry of excluded content. | 0 | Q0; canonical RTM `TR-UCM-005`, `TR-UCM-016`; R-13 v3/profile candidates; candidates `test/context-injection.test.ts`, `scripts/r13/run.test.mjs`. | AUTH-OPEN — Product / Context Owner / Local Test Infrastructure Owner; tokenizer decision open, Stage A pending, B1/B2 blocked, AUTH-D not eligible. |
| TS-UCR-015 | `FR-19.b`, `FR-19.c`, `FR-19.e` | `R-17` | `T-CONTEXT`, `T-SERVICE`: required source/backend matrix for `DISABLED`, `NOT_REQUESTED`, `TIMEOUT`, and `ERROR`, proving typed gate-critical failure and no fabricated success, packet, suppression, promotion, or undeclared effect. | 0 | Q0; canonical RTM `TR-UCM-005`, `TR-UCM-009`; R-17 governed method; candidates `test/coding-memory.test.ts`, `test/context-injection.test.ts`. | AUTH-OPEN — Product / Context Owner / Security Architect; required/optional source policy acceptance remains open. |
| TS-UCR-016 | `FR-13.a`, `FR-13.e`, `FR-19.c` | `R-03`, `R-17` | `T-CONTEXT`, `T-PROMOTION`: optional-source advisory degradation fixture proving visible degraded state, complete source outcome, and a non-promotable/non-gate-critical disposition. | 0 | Q0; canonical RTM `TR-UCM-005`, `TR-UCM-008`; R-03/R-17 governed inputs; candidates `test/context-eligibility.test.ts`, `test/promotions.test.ts`. | AUTH-OPEN — Product / Context Owner / Requirements Owner; optional-source policy acceptance remains open. |
| TS-UCR-017 | `FR-09.d`, `FR-11.a`, `FR-11.b`, `FR-11.c` | `R-04` | `T-DELIVERY`: provider fault/receipt matrix proving `GENERATED` and `DISPATCHED_UNVERIFIED` are not acknowledgement and timeout, rejection, invalidity, or expiry leaves every source retry-eligible. | 0 | Q0; canonical RTM `TR-UCM-006`; R-04 card; candidates `test/context-delivery-routes.test.ts`, `test/pre-compact-context-delivery.test.ts`. | AUTH-OPEN — Provider Integration Owner / Test Architect; provider-native acknowledgement mechanism and independent review remain open. |
| TS-UCR-018 | `FR-09.c`, `FR-11.c`, `FR-11.d`, `FR-11.e` | `R-04` | `T-DELIVERY`: provider-specific signed-receipt concurrency and race matrix proving one atomic session-bound suppression projection and zero additional effect from wrong, late, duplicate, expired, revoked, replayed, or sibling receipts. | 0 | Q0; canonical RTM `TR-UCM-006`; R-04 card; candidates `test/context-delivery-routes.test.ts`, `test/pre-compact-context-delivery.test.ts`. | AUTH-OPEN — Provider Integration Owner / Test Architect; provider fixtures, issuer policy, and AUTH-D disposition remain open/not eligible. |
| TS-UCR-019 | `FR-15.f`, `FR-19.d`, `FR-19.e` | `R-14`, `R-18` | `T-SERVICE`, `T-SCOPE`: complete R-18 proxy status/error by tool by global-scope by side-effect matrix covering all seven local tools and server-only tools, proving typed protected failure and zero `handleLocal`, local/global read/write, persistence, export, delete, audit, packet, suppression, or promotion. | 0 | Q0; canonical RTM `TR-UCM-009`; R-18 case-card/method input; candidate `test/mcp-standalone-proxy.test.ts`. Current source demonstrates the prohibited downgrade branch. | AUTH-OPEN — MCP Compatibility Owner / Security Architect / Authentication Service Owner; independent receipt and no-fallback policy acceptance absent. |
| TS-UCR-020 | `FR-03.b`, `FR-03.d`, `FR-13.e`, `FR-19.d`, `FR-19.e` | `R-01`, `R-03`, `R-18` | `T-SERVICE`, `T-SCOPE`, `T-PROMOTION`: explicit pre-invocation offline advisory fixture proving exact project, mode, state identity, degradation, and provenance while denying global, delete, export, audit, migration, promotion, gate-critical, and server-state authority. | 0 | Q0; canonical RTM `TR-UCM-002`, `TR-UCM-008`, `TR-UCM-009`; no accepted offline allowlist or positive-mode contract exists. | AUTH-OPEN — MCP Compatibility Owner / Security Architect / Requirements Owner; human-authorized allowlist and offline contract remain Proposed/open. |
| TS-UCR-021 | `FR-15.a`, `FR-15.e`, `FR-15.g`, `FR-15.h`, `NFR-02.a` | `R-02`, `R-15` | `T-PRIVACY`, `T-PROVIDER`: `PP-01` recording-sink matrix for strict/local or unavailable policy proving zero DNS, socket, HTTP, SDK, telemetry, model, embedding, graph, provider, or fallback attempts and zero raw query/content/secret occurrence. | 0 | Q0; canonical RTM `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-016`; R-02 card/overlay and R-15 governed method; candidates `test/privacy.test.ts`, `test/model-processing.test.ts`, `test/embedding-provider.test.ts`. | AUTH-OPEN — Privacy Owner / Security Architect / Provider Integration Owner; processing-policy and sink-denominator acceptance open. |
| TS-UCR-022 | `FR-15.e`, `NFR-02.a` | `R-02`, `R-15` | `T-PRIVACY`: versioned synthetic-secret corpus across main, alternate, and failure flows with complete all-sink taint scan and zero raw occurrence in output, stderr, audit, export, snapshot, backup, provider, or Codebase Memory surfaces. | 0 | Q0; canonical RTM `TR-UCM-010`, `TR-UCM-016`; R-02 card/local overlay and R-15 governed method; candidate `test/privacy.test.ts`. | AUTH-OPEN — Security Architect / Privacy Owner / Test Architect / Operations Owner; corpus, sanitizer, sink manifest, and independent receipt absent. |
| TS-UCR-023 | `FR-10.c`, `FR-10.d`, `NFR-10.a`, `NFR-10.b` | `R-06` | `T-PROVENANCE`, `T-COMMIT`: dirty-event and dirty-to-commit transition corpus proving exact project, worktree, path/rename chain, ancestry, event identity, and blob-digest lineage; unmatched or stale dirty evidence remains uncertain/ineligible. | 0 | Q0; canonical RTM `TR-UCM-007`, `TR-UCM-016`; R-06 card/method inputs; candidates `test/coding-memory.test.ts`, `test/integration.test.ts`. | AUTH-OPEN — Git/Runtime Owner / Configuration Manager / Test Architect; exact dirty-event denominator and independent lineage receipt absent. |

## Deterministic self-check

| Check | Expected | Observed | Result |
|---|---:|---:|---|
| Worksheet data rows | 23 | 23 | PASS |
| Unique frozen unit identifiers | 23 | 23 | PASS |
| Missing frozen unit identifiers | 0 | 0 | PASS |
| Extra frozen unit identifiers | 0 | 0 | PASS |
| Duplicate frozen unit identifiers | 0 | 0 | PASS |
| Rows with explicit atomic-child mapping or explicit external-only disposition | 23 | 23 | PASS |
| Rows with one or more exact risk IDs | 23 | 23 | PASS |
| Rows with planned verification/evidence target | 23 | 23 | PASS |
| Rows with current numerator equal to zero | 23 | 23 | PASS |
| Rows with an evidence locator and reviewer/authority state | 23 | 23 | PASS |
| Numerator sum | 0 | 0 | PASS |
| Threshold comparison | numerator must be at least 19 | 0 is below 19 | **BLOCKED** |

The identifier check is a literal set comparison against the 23 individually
enumerated frozen unit IDs in `DES-UCR-001`; no range expression is used as a
substitute. The requirement check resolves every listed child against the
Supplemental Specification. The risk check resolves every listed risk against
the active Risk List.

## Decision boundary

This worksheet is governance documentation only. It:

- does not accept any requirement, behavioral unit, realization, architecture,
  MTP/profile, Stage-A surface, evidence receipt, or risk disposition;
- does not mitigate, accept, or retire any risk;
- does not alter the canonical RTM or create a competing traceability
  authority;
- does not authorize B1, B2, PoC execution, product/test/CI/runtime work, ABM,
  Construction, canary admission, deployment, release, distribution, or
  rollout; and
- cannot convert planned targets, inherited tests, historical observations,
  Revision 24 local advisory PASS results, or agent review into numerator
  credit.

Only a later qualified independent review, bound to the accepted exact
requirement/risk/profile/source identities and the applicable human authority,
may change a unit from `0` to `1`. Until at least 19 units independently score
`1` and every separate acceptance and gate condition is satisfied, the
realization remains **NOT ELIGIBLE / BLOCKED**.
