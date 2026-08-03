# DES-UCR-003 Traceability Worksheet — Iteration 5

Status: **NOT ELIGIBLE / BLOCKED — HUMAN ACCEPTANCE AND QUALIFIED INDEPENDENT EVIDENCE ABSENT**

Date: 2026-07-29
Realization: `DES-UCR-003`
Parent use case: `UC-003 — Context Delivery, Promotion, and Provider Integration`

## Purpose and authority

This worksheet materializes the exact 27-unit DEC-16 scoring denominator for
`DES-UCR-003`. It is a subordinate governance worksheet, not a competing
traceability authority. The canonical Requirements Traceability Matrix at
`.aiwg/requirements/traceability-matrix.md` remains the sole traceability
authority. Atomic requirement identities remain controlled by
`.aiwg/requirements/supplemental-specification.md`; risk identities and
statuses remain controlled by `.aiwg/risks/risk-list.md`.

The row identifiers and behavioral oracles are transcribed from the frozen
scenario catalog in `DES-UCR-003`. The canonical RTM supplies the normalized
atomic-child-to-trace joins, planned suites, accountable roles, evidence
locators, and authority states. Documentary presence does not establish
conformance, acceptance, qualification, or a score.

## Scoring rule

The frozen denominator is `27`, the independent 80% threshold is
`ceil(0.80 * 27) = 22`, and the current numerator is `0`.

A unit may have numerator value `1` only after qualified independent review
accepts its explicit behavioral contract, exact atomic requirement links,
expected result, forbidden result or side effect, and admitted evidence
target. No accepted independent evidence exists, so every current numerator
value below is `0`.

`AUTH-A OPEN` and `AUTH-D NOT ELIGIBLE` use the meanings fixed in the
canonical RTM. Named roles are accountable roles, not evidence that a human
has been assigned or has concurred. `DQ` means design-qualified only; every
row remains `NOT RUN / BLOCKED`.

Any `gpt-5.6-sol` label associated with this work is configured wrapper
evidence only. It is not provider telemetry and does not establish a
provider-observed model, deployment, route, execution subject, or independent
review identity.

## Exact behavioral-unit worksheet

| Unit ID | Exact atomic requirement child IDs | Exact risk IDs | Planned verification / evidence target | Current numerator | Evidence locator | Reviewer / authority state |
|---|---|---|---|---:|---|---|
| `UC3-S01` | `FR-03.b`, `FR-03.c`, `FR-09.a`, `FR-09.b`, `FR-09.e`, `FR-09.f`, `FR-09.g` | `R-03`, `R-13` | `EV-CTX-01`: packet bytes, accepted-tokenizer trace, ordered omission record, and source-access log prove one project-scoped packet, fixed slot maxima, at most five source records, and a final serialized wire image of at most 2,000 actual tokens. | 0 | `DES-UCR-003` §16 `EV-CTX-01`; canonical RTM `TR-UCM-002`, `TR-UCM-005`, `TR-UCM-012`; no accepted receipt. | Software Architect / Test Infrastructure Owner / CBM Maintainer / Product / Context Owner / UI/API Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S02` | `FR-03.b`, `FR-03.c`, `FR-15.a`, `FR-15.f` | `R-01`, `R-20` | `EV-ID-01`: colliding same-name repository fixtures record the authority-resolved canonical project decision and prove denial before any source read when identity or scope is unresolved. | 0 | `DES-UCR-003` §16 `EV-ID-01`; canonical RTM `TR-UCM-002`, `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-012`; no accepted receipt. | Software Architect / Test Infrastructure Owner / CBM Maintainer / Security Architect / Provider Integration Owner / UI/API Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S03` | `FR-15.a`, `FR-15.f`, `FR-16.b` | `R-01`, `R-14`, `R-18` | `EV-AUTH-01`: capability and global-scope matrix proves a project capability cannot authorize a separate global administration operation and that denial produces no global fallback or project packet containing global data. | 0 | `DES-UCR-003` §16 `EV-AUTH-01`; canonical RTM `TR-UCM-009`, `TR-UCM-010`; no accepted receipt. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S04` | `FR-06.e`, `FR-07.e`, `FR-07.f`, `FR-19.e` | `R-02`, `R-15`, `R-17` | `EV-PRIV-01`: syscall/source-access trace and complete sink ledger prove unresolved privacy policy fails admission before source open/read and leaves zero source bytes in cache, log, packet, metric, or model sinks. | 0 | `DES-UCR-003` §16 `EV-PRIV-01`; canonical RTM `TR-UCM-003`, `TR-UCM-004`, `TR-UCM-009`, `TR-UCM-010`; no accepted receipt. | Security Architect / Capture Integrity Owner / Session Owner / Test Infrastructure Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S05` | `FR-09.c`, `FR-09.e`, `FR-10.a`, `FR-10.b` | `R-03`, `R-06` | `EV-CTX-02`: qualification trace proves excluded and exact-session-acknowledged sources receive typed omission reasons before relevance selection and contribute zero selected content. | 0 | `DES-UCR-003` §16 `EV-CTX-02`; canonical RTM `TR-UCM-005`, `TR-UCM-007`; no accepted receipt. | Product / Context Owner / Git/Runtime Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S06` | `FR-09.a`, `FR-09.b`, `FR-09.f`, `FR-09.g` | `R-13` | `EV-TOK-01`: accepted-tokenizer count and exact final byte artifact prove fixed 300/400/700/400/200 class maxima, a packet total of at most 2,000 tokens, and no silent capacity shifting or pre-sanitization counting. | 0 | `DES-UCR-003` §16 `EV-TOK-01`; canonical RTM `TR-UCM-005`; accepted tokenizer/profile and receipt absent. | Product / Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED; profile gate open. |
| `UC3-S07` | `FR-09.e`, `FR-09.f` | `R-03`, `R-13` | `EV-SRC-01`: deterministic tie-break and source-unit selection trace over six equally qualified records proves at most five distinct source records are selected and fragments cannot admit a sixth source. | 0 | `DES-UCR-003` §16 `EV-SRC-01`; canonical RTM `TR-UCM-005`; no accepted corpus or receipt. | Product / Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S08` | `FR-09.d`, `FR-11.a`, `FR-11.b` | `R-04`, `R-17` | `EV-DSP-01`: transaction/outbox crash trace proves a committed packet remains `GENERATED` with no receipt or suppression when failure occurs before the provider call. | 0 | `DES-UCR-003` §16 `EV-DSP-01`; canonical RTM `TR-UCM-005`, `TR-UCM-006`; no accepted provider-native receipt evidence. | Product / Context Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S09` | `FR-09.c`, `FR-09.d`, `FR-11.c`, `FR-11.d`, `FR-11.e` | `R-04`, `R-20` | `EV-RCP-01`: serializable receipt-boundary history proves the acknowledgement projection and exact-source suppression commit together or neither commits. | 0 | `DES-UCR-003` §16 `EV-RCP-01`; canonical RTM `TR-UCM-005`, `TR-UCM-006`; no accepted receipt. | Product / Context Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S10` | `FR-11.c`, `FR-11.d`, `FR-11.e` | `R-04`, `R-17` | `EV-RCP-02`: duplicate/replay transcript proves an already accepted receipt produces the same terminal projection while adding no suppression, reopening no retry, and altering no source unit. | 0 | `DES-UCR-003` §16 `EV-RCP-02`; canonical RTM `TR-UCM-006`; no accepted provider-native replay receipt. | Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S11` | `FR-11.c`, `FR-11.d`, `FR-11.e`, `FR-15.a`, `FR-15.f` | `R-04`, `R-14`, `R-20` | `EV-RCP-03`: superseded, expired, revoked, wrong-issuer, and sibling-attempt race matrix proves typed rejection and no acknowledgement or suppression from an invalid receipt. | 0 | `DES-UCR-003` §16 `EV-RCP-03`; canonical RTM `TR-UCM-006`, `TR-UCM-009`, `TR-UCM-010`; no accepted receipt. | Provider Integration Owner / Security Architect; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S12` | `FR-09.c`, `FR-09.d`, `FR-11.d`, `FR-11.e` | `R-03`, `R-04` | `EV-RCP-04`: source-unit projection proves a valid receipt suppresses only the exact represented source revision/unit and cannot suppress the whole lineage or claim unsent-tail consumption. | 0 | `DES-UCR-003` §16 `EV-RCP-04`; canonical RTM `TR-UCM-005`, `TR-UCM-006`; no accepted receipt. | Product / Context Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S13` | `FR-11.c`, `FR-11.e` | `R-04` | `EV-RCP-05`: receipt-versus-consumption ledger proves separately matched provider consumption evidence can add a consumption projection without changing receipt truth and that a receipt alone never proves consumption. | 0 | `DES-UCR-003` §16 `EV-RCP-05`; canonical RTM `TR-UCM-006`; no accepted provider-native receipt or consumption evidence. | Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S14` | `FR-15.a`, `FR-15.f`, `FR-19.e` | `R-02`, `R-14`, `R-17` | `EV-NW-01`: governed-domain before/after diff and denial-ledger fault injection prove disabled, unauthorized, malformed, or policy-denied writes change no domain state and cannot relax denial when the bounded redacted receipt fails. | 0 | `DES-UCR-003` §16 `EV-NW-01`; canonical RTM `TR-UCM-009`, `TR-UCM-010`; no accepted no-write receipt. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S15` | `FR-10.a`, `FR-10.b`, `FR-10.c`, `FR-10.d`, `FR-13.a`, `FR-13.b`, `FR-13.c`, `FR-13.d`, `FR-13.e` | `R-05`, `R-06`, `R-21`, `R-22` | `EV-PRO-01`: typed evidence graph and state record prove eligibility is exactly `ELIGIBLE`, `INELIGIBLE`, or `INDETERMINATE`, remains separate from lifecycle state, and excludes self-corroboration. | 0 | `DES-UCR-003` §16 `EV-PRO-01`; canonical RTM `TR-UCM-007`, `TR-UCM-008`; no accepted evidence-DAG or promotion receipt. | Git/Runtime Owner / Product / Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S16` | `FR-13.b`, `FR-13.c`, `FR-13.d`, `FR-13.e` | `R-05`, `R-21` | `EV-PRO-02`: approval record and storage diff prove an eligible candidate remains staged or pending when the human gate is absent and cannot activate automatically. | 0 | `DES-UCR-003` §16 `EV-PRO-02`; canonical RTM `TR-UCM-008`; no accepted human disposition or storage receipt. | Product / Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S17` | `FR-17.a`, `FR-17.b`, `FR-17.c`, `FR-17.d`, `FR-17.e`, `FR-17.f` | `R-02`, `R-11`, `R-23` | `EV-CON-01`: exact pre/post manifest and every-boundary interruption matrix prove rollback restores connector bytes, mode, owner, extended attributes, and ordering without heuristic overwrite, unsafe backup, or mixed image. | 0 | `DES-UCR-003` §16 `EV-CON-01`; canonical RTM `TR-UCM-014`; no accepted connector custody or rollback receipt. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S18` | `FR-17.b`, `FR-17.c`, `FR-17.e`, `FR-17.f` | `R-11`, `R-23` | `EV-CON-02`: compare-and-swap trace proves a concurrently changed connector returns conflict, preserves external bytes and metadata, and performs no silent adoption or clobber. | 0 | `DES-UCR-003` §16 `EV-CON-02`; canonical RTM `TR-UCM-014`; no accepted concurrent-edit receipt. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S19` | `FR-14.a`, `FR-14.b`, `FR-14.c`, `FR-14.d`, `FR-14.e`, `FR-15.e`, `FR-15.f` | `R-01`, `R-02`, `R-19` | `EV-NAT-01`: staged-write, activation, audit, outbox, verification, and crash matrix binds exact actor/project/source/destination/policy/nonce/preimage and proves one authorized sync reaches the exact target or byte-identical preimage. | 0 | `DES-UCR-003` §16 `EV-NAT-01`; canonical RTM `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-018`; no accepted native-sync receipt. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S20` | `FR-14.c`, `FR-14.d`, `FR-14.e`, `FR-19.e` | `R-19` | `EV-NAT-02`: commit-fence and restart trace proves a durable native target cannot return success before audit, outbox, and verification are durable, and restart reconciles every governed effect. | 0 | `DES-UCR-003` §16 `EV-NAT-02`; canonical RTM `TR-UCM-009`, `TR-UCM-018`; no accepted commit-fence receipt. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S21` | `FR-18.a`, `FR-18.b`, `FR-18.c`, `FR-18.d`, `FR-18.e`, `FR-18.f`, `FR-18.g`, `FR-18.h`, `NFR-09.a` | `R-07`, `R-08`, `R-23` | `EV-WRK-01`: durable intake, worker-death, fenced-generation restart, latency, and reconciliation ledger proves one bounded replay to the terminal outcome equation with no loss, concurrent generation, or unbounded replay. | 0 | `DES-UCR-003` §16 `EV-WRK-01`; canonical RTM `TR-UCM-014`, `TR-UCM-016`; no accepted load profile or recovery receipt. | Provider Integration Owner / Service Owner / Local Test Infrastructure Owner / CI Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S22` | `FR-18.b`, `FR-18.c`, `FR-18.d`, `FR-18.e`, `FR-18.g`, `FR-18.h` | `R-07`, `R-23` | `EV-WRK-02`: duplicate/replay history proves an item with a durable terminal disposition remains idempotently terminal and cannot repeat a governed side effect or reopen the item. | 0 | `DES-UCR-003` §16 `EV-WRK-02`; canonical RTM `TR-UCM-014`; no accepted replay receipt. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S23` | `FR-20.a`, `FR-20.b`, `FR-20.c`, `FR-20.d`, `FR-20.e`, `FR-20.f`, `FR-20.g`, `FR-20.h`, `FR-20.i`, `FR-20.j`, `FR-20.k`, `NFR-11.a`, `NFR-11.b` | `R-01`, `R-09`, `R-14` | `EV-VWR-01`: project/global response corpus and destructive-action authorization trace prove enumerated fetch status, exact scope/denominator/time/build identity, no typed critical `Unknown`, and exact-scope stale-safe authorization. | 0 | `DES-UCR-003` §16 `EV-VWR-01`; canonical RTM `TR-UCM-011`, `TR-UCM-012`, `TR-UCM-016`; no accepted viewer/API receipt. | Service Owner / Operations Owner / UI/API Owner / Test Infrastructure Owner / Local Test Infrastructure Owner / CI Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S24` | `FR-12.b`, `FR-12.c`, `FR-12.d`, `FR-12.e`, `FR-12.f`, `FR-20.a`, `FR-20.b`, `FR-20.c`, `FR-20.d`, `FR-20.e`, `FR-20.f` | `R-08`, `R-09`, `R-18` | `EV-DEG-01`: human-classified optional-source policy and health-transition trace prove timeout is visibly `DEGRADED`, preserves required gates, and cannot be silently omitted, used for promotion, or elevated to fallback authority. | 0 | `DES-UCR-003` §16 `EV-DEG-01`; canonical RTM `TR-UCM-007`, `TR-UCM-011`, `TR-UCM-012`; no accepted optional-source policy or receipt. | Git/Runtime Owner / Service Owner / Operations Owner / UI/API Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S25` | `FR-12.d`, `FR-12.e`, `FR-12.f`, `FR-19.b`, `FR-19.c`, `FR-19.d`, `FR-19.e` | `R-14`, `R-17`, `R-18` | `EV-DEG-02`: required/privacy/scope/protected-proxy fault transcript proves uncertainty fails closed as `UNAVAILABLE` or a failed operation, with no degraded success, fabricated payload, local fallback, suppression, promotion, or governed mutation. | 0 | `DES-UCR-003` §16 `EV-DEG-02`; canonical RTM `TR-UCM-005`, `TR-UCM-007`, `TR-UCM-009`, `TR-UCM-011`, `TR-UCM-013`; no accepted no-fallback receipt. | Product / Context Owner / Git/Runtime Owner / Security Architect / Provider Integration Owner / Service Owner / Operations Owner / Migration/Restore Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S26` | `NFR-12.a`, `NFR-12.b` | `R-12`, `R-13` | `EV-REG-01`: immutable subject/build/hash envelope compares the frozen candidate and separately installed runtime while preserving evidence-subject labels and leaving candidate causation `NOT_EVALUATED`. | 0 | `DES-UCR-003` §16 `EV-REG-01`; canonical RTM `TR-UCM-016`; R-13 v3/profile candidates only; no qualifying five-run evidence. | Local Test Infrastructure Owner / CI Owner; AUTH-A OPEN; B1/B2 BLOCKED; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |
| `UC3-S27` | `FR-14.c`, `FR-14.d`, `FR-14.e` | `R-16`, `R-19` | `EV-REC-01`: generation recovery and every-boundary crash proof over an exact preimage yields one exact activated generation or a byte-identical preimage and cannot imply migration/restore acceptance. | 0 | `DES-UCR-003` §16 `EV-REC-01`; canonical RTM `TR-UCM-018`; `R-16` remains an adjacent recovery risk; no accepted receipt. | Provider Integration Owner / Security Architect; AUTH-A OPEN; AUTH-D NOT ELIGIBLE; DQ; NOT RUN / BLOCKED. |

## Deterministic self-check

| Check | Expected | Observed | Result |
|---|---:|---:|---|
| Worksheet data rows | 27 | 27 | PASS |
| Unique frozen unit identifiers | 27 | 27 | PASS |
| Missing frozen unit identifiers | 0 | 0 | PASS |
| Extra frozen unit identifiers | 0 | 0 | PASS |
| Duplicate frozen unit identifiers | 0 | 0 | PASS |
| Rows whose every atomic child ID resolves in the Supplemental Specification | 27 | 27 | PASS |
| Missing atomic child IDs | 0 | 0 | PASS |
| Rows whose every risk ID resolves in the active Risk List | 27 | 27 | PASS |
| Missing risk IDs | 0 | 0 | PASS |
| Rows with a planned verification/evidence target | 27 | 27 | PASS |
| Rows with current numerator equal to zero | 27 | 27 | PASS |
| Rows with an evidence locator and reviewer/authority state | 27 | 27 | PASS |
| Numerator sum | 0 | 0 | PASS |
| Threshold comparison | numerator must be at least 22 | 0 is below 22 | **BLOCKED** |

The unit-ID check is a literal set comparison against the 27 individually
enumerated frozen IDs in `DES-UCR-003`; no range expression substitutes for
an ID. The child-ID check resolves every listed child literally against the
Supplemental Specification. The risk-ID check resolves every listed risk
literally against the active Risk List.

## Decision boundary

This worksheet is governance documentation only. It:

- does not accept any requirement, behavioral unit, realization, architecture,
  MTP/profile, Stage-A surface, evidence receipt, model/provider identity, or
  risk disposition;
- does not mitigate, accept, close, waive, rescore, reprioritize, or retire any
  risk;
- does not alter the canonical RTM or create a competing traceability
  authority;
- does not authorize Stage A, B1, B2, PoC execution, product/test/CI/runtime
  work, ABM, Construction, canary admission, deployment, release,
  distribution, or rollout; and
- cannot convert planned targets, candidate mechanisms, inherited tests,
  historical observations, configured wrapper labels, local advisory review,
  or deterministic documentary validation into numerator credit.

Until at least 22 units independently score `1` and every separate acceptance
and gate condition is satisfied, `DES-UCR-003` remains
**NOT ELIGIBLE / BLOCKED**.
