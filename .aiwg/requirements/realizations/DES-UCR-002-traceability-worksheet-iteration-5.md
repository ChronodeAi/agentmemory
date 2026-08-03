# DES-UCR-002 Traceability Worksheet — Iteration 5

Status: **NOT ELIGIBLE / BLOCKED — HUMAN ACCEPTANCE AND INDEPENDENT EVIDENCE ABSENT**

Date: 2026-07-29
Realization: `DES-UCR-002`
Parent use case: `UC-002 — Capture, Session, and Commit Lifecycle`

## Purpose and authority

This worksheet materializes the exact 54-unit DEC-16 scoring denominator for
`DES-UCR-002`. It is a subordinate governance worksheet, not a competing
traceability authority. Atomic requirement identities and planned test
contracts remain controlled by
`.aiwg/requirements/supplemental-specification.md`,
`.aiwg/requirements/traceability-matrix.md`, and the Draft Master Test Plan.
Risk identities and statuses remain controlled by
`.aiwg/risks/risk-list.md`.

Revision 24 is the authority for the inherited decision state. It preserves
the `54 / 44` realization denominator while recording requirements accepted
`0`, realizations accepted `0`, signatures empty, independent custody false,
qualifying evidence false, all 23 risks `IDENTIFIED`, ABM `FAIL / NO-GO`, and
Construction unauthorized. Its passed deterministic receipt and
post-generation adversarial review are local advisory evidence only; they do
not independently accept or score any behavioral unit.

## Scoring rule

A unit may have numerator value `1` only after qualified independent review
accepts its explicit behavioral contract, exact atomic requirement links,
expected result, forbidden result or side effect, and admitted evidence
target. A proposed link, candidate mechanism, passing bounded helper test,
documentary count reconciliation, filename manifest, or local advisory review
does not qualify. Because no such accepted independent evidence exists, every
current numerator value below is `0`.

`AUTH-A OPEN` and `AUTH-D NOT ELIGIBLE` use the meanings fixed in the
canonical RTM. The named roles are accountable or reviewing roles, not
evidence that a human has been assigned or has concurred.

## Exact behavioral-unit worksheet

| Unit ID | Exact atomic requirement child IDs | Exact risk IDs | Planned verification / evidence target | Current numerator | Evidence locator | Reviewer / authority state |
|---|---|---|---|---:|---|---|
| `UC2-LIF-01` | `FR-06.a` | `R-06`, `R-20` | `T-SESSION`: fresh valid start produces one project/worktree/session projection and one durable transition receipt. | 0 | RTM `TR-UCM-004`; planned R-06/R-20 card evidence; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-02` | `FR-06.a`, `FR-06.e` | `R-06`, `R-20` | `T-SESSION`: sequential and barrier-released active replay preserves immutable bindings and records one outcome per attempt. | 0 | RTM `TR-UCM-004`; immutable-binding replay fixture planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-03` | `FR-06.a`, `FR-06.c`, `FR-06.d`, `FR-06.e` | `R-06`, `R-20` | `T-SESSION`: stale-abandonment resume and restart fixture proves terminal-field reconciliation and same-session attribution. | 0 | RTM `TR-UCM-004`; stale/resume/restart receipt planned; installed-runtime seed is non-qualifying. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-04` | `FR-06.c`, `FR-06.d` | `R-06`, `R-20` | `T-SESSION`: explicit close and stale abandonment remain disjoint, durable, and replay-idempotent. | 0 | RTM `TR-UCM-004`; lifecycle terminal-state fixture planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-05` | `FR-06.d` | `R-06`, `R-20` | `T-SESSION`: process death at session, parent, close, and receipt boundaries exposes only complete prior or next state. | 0 | RTM `TR-UCM-004`; crash/restart fault receipt planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-06` | `FR-06.b` | `R-06`, `R-20` | `T-SESSION`: concurrent/restart parent-child replay leaves one reciprocal attributable edge. | 0 | RTM `TR-UCM-004`; parent-child replay receipt planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-07` | `FR-06.g` | `R-06`, `R-20` | `T-SESSION`: missing, self, stale, and wrong-project parent matrix returns typed denial and a zero-delta namespace manifest. | 0 | RTM `TR-UCM-004`; R-20 invalid-parent matrix planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-08` | `FR-06.f` | `R-06`, `R-20` | `T-SESSION`: deterministic two-worker CAS interleaving preserves the resumed version and denies or supersedes the stale attempt. | 0 | RTM `TR-UCM-004`; stale-CAS interleaving receipt planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-09` | `FR-06.e` | `R-06`, `R-20` | `T-SESSION`: project, worktree, cwd, privacy, capture, and processing-binding takeover matrix proves byte-identical denial. | 0 | RTM `TR-UCM-004`; immutable scope/policy state manifest planned; no accepted receipt. | Session Owner / Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-LIF-10` | `FR-07.f`, `FR-19.e` | `R-02`, `R-14`, `R-15`, `R-18` | `T-PRIVACY`, `T-CONFIG`, `T-SCOPE`: missing authoritative session/project/policy denies before observation or any governed side effect. | 0 | RTM `TR-UCM-003`, `TR-UCM-009`, `TR-UCM-010`; missing-policy/no-write receipts planned; none accepted. | Security Architect / Provider Integration Owner / Capture Integrity Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CAP-01` | `FR-07.a` | `R-02`, `R-07`, `R-15`, `R-21` | `T-CAPTURE`: frozen versioned profile maps every host/tool class to one declared terminal or admission outcome. | 0 | RTM `TR-UCM-003`, `TR-UCM-010`; capture-profile matrix planned; no accepted profile or receipt. | Security Architect / Capture Integrity Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CAP-02` | `FR-07.d` | `R-02`, `R-07`, `R-15`, `R-21` | `T-CAPTURE`: boundary readback characterizes the 1,000-prefix behavior and enforces the accepted final-field bound including marker. | 0 | RTM `TR-UCM-003`, `TR-UCM-010`; persisted-size receipt planned; no accepted bound or receipt. | Security Architect / Capture Integrity Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CAP-03` | `FR-07.d`, `FR-10.c` | `R-02`, `R-06`, `R-07`, `R-15`, `R-21` | `T-CAPTURE`, `T-PROVENANCE`: boundary readback characterizes the 8,000-prefix behavior while failed mutations remain attributable. | 0 | RTM `TR-UCM-003`, `TR-UCM-007`, `TR-UCM-010`; size/provenance receipts planned; none accepted. | Security Architect / Capture Integrity Owner / Git/Runtime Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CAP-04` | `FR-07.d` | `R-02`, `R-07`, `R-15`, `R-21` | `T-CAPTURE`: ASCII, combining, newline, and astral Unicode boundary corpus follows one accepted byte/character model. | 0 | RTM `TR-UCM-003`, `TR-UCM-010`; Unicode boundary receipt planned; model and receipt unaccepted. | Security Architect / Capture Integrity Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PRIV-01` | `FR-07.c`, `FR-07.e`, `FR-15.e`, `NFR-02.a` | `R-02`, `R-15` | `T-PRIVACY`: unique synthetic sentinels crossed with every field, path, error, image, metadata position, and sink yield zero raw occurrence. | 0 | RTM `TR-UCM-003`, `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-016`; all-sink taint receipt planned; none accepted. | Security Architect / Provider Integration Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PRIV-02` | `FR-07.f`, `FR-15.a`, `FR-15.g`, `FR-16.a`, `FR-16.b` | `R-02`, `R-14`, `R-15`, `R-18` | `T-PRIVACY`, `T-CONFIG`, `T-PROVIDER`: strict zero-egress plus lower-precedence permissive configuration produces zero external attempt or fallback. | 0 | RTM `TR-UCM-003`, `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-014`; recording-sink precedence receipt planned; none accepted. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PRIV-03` | `FR-07.f`, `FR-15.g`, `FR-16.b`, `FR-19.e` | `R-02`, `R-14`, `R-15`, `R-18` | `T-PRIVACY`, `T-CONFIG`, `T-PROVIDER`: missing, stale, malformed, timed-out, or unavailable policy denies before serialization and side effects. | 0 | RTM `TR-UCM-003`, `TR-UCM-009`, `TR-UCM-010`; policy-unavailable/no-write receipt planned; none accepted. | Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PRIV-04` | `FR-07.b`, `FR-07.e` | `R-02`, `R-15` | `T-PRIVACY`: mixed/nested/pathless/failure fixtures are structurally removed or wholly denied, with zero raw remnant in any sink. | 0 | RTM `TR-UCM-003`, `TR-UCM-010`; all-sink exclusion/taint receipt planned; none accepted. | Security Architect / Capture Integrity Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PRIV-05` | `FR-07.e`, `FR-15.e`, `NFR-02.a` | `R-02`, `R-15` | `T-PRIVACY`, `T-ROLLBACK`: every transport, log, queue, persistence, index, backup, and rollback fault preserves zero raw sentinel occurrence. | 0 | RTM `TR-UCM-003`, `TR-UCM-009`, `TR-UCM-010`, `TR-UCM-016`; fault-sink scan receipt planned; none accepted. | Security Architect / Provider Integration Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-DED-01` | `FR-05.a`, `FR-05.d` | `R-21` | `T-DEDUPE`: exact replay within/beyond TTL and after restart resolves to one durable event identity and terminal result. | 0 | RTM `TR-UCM-003`, `TR-UCM-017`; R-21 durable idempotency receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-DED-02` | `FR-05.c` | `R-21` | `T-DEDUPE`: same 500-character prefix with distinct suffixes yields two admitted identities and zero false dedupe. | 0 | RTM `TR-UCM-003`, `TR-UCM-017`; collision fixture and fingerprint receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-DED-03` | `FR-05.a`, `FR-05.d` | `R-21` | `T-DEDUPE`: barrier-released identical arrivals create one complete governed result while every attempt reconciles. | 0 | RTM `TR-UCM-003`, `TR-UCM-017`; concurrency-barrier receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-DED-04` | `FR-05.d` | `R-21` | `T-DEDUPE`: reservation and every governed-effect failpoint remain pending/retryable until complete or rolled back, never fabricated success. | 0 | RTM `TR-UCM-003`, `TR-UCM-017`; restart/failpoint receipts planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-DED-05` | `FR-05.b`, `FR-13.b`, `NFR-06.a` | `R-05`, `R-21` | `T-DEDUPE`, `T-PROMOTION`: frozen human-labelled corpus proves duplicate rate below 2% without collapsing independent corroboration. | 0 | RTM `TR-UCM-003`, `TR-UCM-008`, `TR-UCM-016`; judge record/metric/DAG receipt planned; none accepted. | Capture Integrity Owner / Product and Context Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-SEM-01` | `FR-13.a`, `FR-13.b`, `FR-13.c`, `FR-13.d`, `FR-13.e` | `R-03`, `R-05` | `T-PROMOTION`: immutable evidence-DAG corpus proves recall, summary, compaction, paraphrase, copy, and cycles add no independent evidence or authority. | 0 | RTM `TR-UCM-008`; R-03/R-05 typed evidence-DAG and recalled-only rejection planned; none accepted. | Product / Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CMP-01` | `FR-08.a`, `FR-08.c` | `R-22` | `T-COMPACTION`: accepted retention boundary triggers one staged immutable generation; the 499-to-500 seed is diagnostic only. | 0 | RTM `TR-UCM-017`; R-22 retention/generation receipt planned; no accepted boundary or receipt. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CMP-02` | `FR-08.b`, `FR-08.c`, `FR-13.d` | `R-05`, `R-22` | `T-COMPACTION`, `T-PROMOTION`: clean verifier reproduces exact counts, digests, order, scope, lineage, and policy/schema versions. | 0 | RTM `TR-UCM-008`, `TR-UCM-017`; exact-fact round-trip and lineage receipts planned; none accepted. | Compaction Owner / Product and Context Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CMP-03` | `FR-08.c` | `R-22` | `T-COMPACTION`: process death at summary, ledger, delete, index, count, admission, receipt, and pointer boundaries exposes one complete generation. | 0 | RTM `TR-UCM-017`; every-boundary generation-fault receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CMP-04` | `FR-08.b`, `FR-08.c` | `R-22` | `T-COMPACTION`: mutation, insertion, deletion, reorder, source substitution, and replay are detected before governed use. | 0 | RTM `TR-UCM-017`; tamper corpus and independent digest receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CMP-05` | `FR-08.c` | `R-22` | `T-COMPACTION`: concurrent readers pin one generation and never observe mixed narrative, ledger, index, or count state. | 0 | RTM `TR-UCM-017`; concurrent-reader generation receipt planned; none accepted. | Capture Integrity Owner / Compaction Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PROV-01` | `FR-10.c`, `NFR-10.b` | `R-06` | `T-PROVENANCE`: write, edit, patch, rename, delete, untracked, shell, and script mutations emit immutable pre/post dirty-event lineage. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; two-repo/multi-worktree dirty manifest planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PROV-02` | `FR-10.c`, `NFR-10.b` | `R-06` | `T-PROVENANCE`: failed and partial mutation fixtures distinguish attempted from observed filesystem change and never report clean success. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; failure/provenance receipt and coverage manifest planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PROV-03` | `FR-10.c`, `FR-10.d`, `NFR-10.b` | `R-06` | `T-PROVENANCE`: restart reconciliation is idempotent and preserves unmatched dirty or uncertain work. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; reconciliation replay receipt planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-01` | `FR-10.d`, `FR-19.e` | `R-06`, `R-18` | `T-COMMIT`: Git failure with no commit produces zero commit, link, or session-SHA success state except a bounded denial receipt. | 0 | RTM `TR-UCM-007`, `TR-UCM-009`; no-write Git-failure receipt planned; none accepted. | Git/Runtime Owner / Security Architect / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-02` | `FR-10.d` | `R-06` | `T-COMMIT`: malformed, nonexistent, historical, cross-repository, and wrong-worktree SHA matrix denies with zero partial link. | 0 | RTM `TR-UCM-007`; server-owned Git validation receipt planned; none accepted. | Git/Runtime Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-03` | `FR-10.d`, `NFR-10.b` | `R-06` | `T-COMMIT`, `T-PROVENANCE`: ancestry, path/rename/copy/delete, pre-image, and blob mismatch keeps the event dirty or uncertain. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; lineage-negative and dirty-coverage receipts planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-04` | `FR-10.d`, `FR-12.a`, `NFR-10.a` | `R-06` | `T-COMMIT`: exact server-validated lineage atomically supersedes only named matching dirty IDs and is replay-idempotent. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; atomic link and committed-coverage receipts planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-05` | `FR-10.d`, `FR-12.a`, `NFR-10.a` | `R-06` | `T-COMMIT`: every commit/link/session/index/metric/audit/outbox crash boundary exposes complete prior state or one complete link. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; atomic-link failpoint receipt planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-COM-06` | `FR-12.a`, `FR-12.f`, `NFR-07.a`, `NFR-10.a` | `R-06` | `T-COMMIT`: frozen eligible manifest reports valid-lineage numerator at or above 95% and zero false links. | 0 | RTM `TR-UCM-007`, `TR-UCM-016`; eligible-denominator/linkage receipts planned; none accepted. | Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PERF-01` | `FR-18.f`, `NFR-09.a` | `R-07`, `R-13` | `T-CAPTURE`, `T-SERVICE`, `T-RUNNER`: accepted host/load profile proves p95 below two seconds and every MTP resource/leakage bound. | 0 | RTM `TR-UCM-014`, `TR-UCM-016`; load/telemetry and independent profile receipts planned; none accepted. | Provider Integration Owner / Service Owner / Local Test Infrastructure Owner; AUTH-A OPEN; B1/B2 BLOCKED; AUTH-D NOT ELIGIBLE. |
| `UC2-PERF-02` | `FR-18.g` | `R-07`, `R-17`, `R-23` | `T-CAPTURE`, `T-SERVICE`: event/attempt ledger balances queued/retried transitions to exactly one terminal outcome with zero telemetry recursion. | 0 | RTM `TR-UCM-014`; outcome-equation and stderr-recursion receipt planned; none accepted. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-PERF-03` | `FR-18.h` | `R-07`, `R-23` | `T-SERVICE`: worker restart replays only durable queued events with exact event, attempt, project, session, policy, and payload binding. | 0 | RTM `TR-UCM-014`; restart/replay reconciliation receipt planned; none accepted. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CONN-01` | `FR-17.a`, `FR-17.b` | `R-11` | `T-PROVIDER`: disposable homes recognize direct-binary and accepted `npx` declarations while the real home remains untouched. | 0 | RTM `TR-UCM-014`; disposable-home declaration receipt planned; none accepted. | Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CONN-02` | `FR-17.c`, `FR-17.d`, `FR-17.e` | `R-10`, `R-11` | `T-PROVIDER`, `T-ROLLBACK`: dry-run/apply/reapply changes only owned bytes, is zero-diff on reapply, and preserves unowned Codebase Memory entries. | 0 | RTM `TR-UCM-014`, external `TR-UCM-015`; ownership/byte manifest and alias fixture planned; none accepted. | Provider Integration Owner / Service Owner / Codebase Memory Maintainer / Test Architect; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-CONN-03` | `FR-17.e`, `FR-17.f`, `FR-15.e` | `R-02`, `R-11` | `T-PROVIDER`, `T-ROLLBACK`: malformed/mixed-owner/link/metadata/concurrent-write/secret-backup/interruption matrix fails closed or restores exact pre-image. | 0 | RTM `TR-UCM-009`, `TR-UCM-014`; metadata, secret-canary, and rollback readback planned; none accepted. | Security Architect / Provider Integration Owner / Service Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-NAT-01` | `FR-14.a` | `R-19` | `T-NATIVE`: automatic hook, capture, compaction, recall, restart, and repair paths produce zero provider-native attempt or write. | 0 | RTM `TR-UCM-018`; R-19 negative recording-sink receipt planned; none accepted. | Provider Integration Owner / Security Architect; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-NAT-02` | `FR-14.b`, `FR-14.c`, `FR-14.d`, `FR-14.e` | `R-01`, `R-02`, `R-19` | `T-NATIVE`, `T-ROLLBACK`: explicit action binds exact project/source/destination and every fault converges to exact target or byte-identical pre-image. | 0 | RTM `TR-UCM-018`; R-19 two-project/global-canary and destination/audit failpoint receipts planned; none accepted. | Provider Integration Owner / Security Architect; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-WRK-01` | `FR-18.h`, `FR-20.g`, `FR-20.h` | `R-07`, `R-08`, `R-23` | `T-SERVICE`, `T-CAPTURE`: forced worker death restarts under singleton fencing and withholds readiness until exact reconciliation. | 0 | RTM `TR-UCM-011`, `TR-UCM-014`; worker-death/startup reconciliation receipt planned; none accepted. | Service Owner / Operations Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-WRK-02` | `FR-20.g`, `FR-20.h`, `FR-21.c` | `R-08`, `R-23` | `T-SERVICE`, `T-LOCAL-DEPLOY`: shell exit, logout, host restart, stale/reused PID, and dual-start follow accepted supervision without duplicate authority. | 0 | RTM `TR-UCM-011`, `TR-UCM-019`; supervision journey and singleton receipts planned; no executed journey cohort. | Service Owner / Operations Owner / Local Test Infrastructure Owner; AUTH-A OPEN; B1/B2 BLOCKED; AUTH-D NOT ELIGIBLE. |
| `UC2-WRK-03` | `FR-18.g`, `FR-18.h`, `FR-20.g`, `FR-20.h` | `R-07`, `R-08`, `R-23` | `T-SERVICE`, `T-CAPTURE`: pending, partial, and completed-unacknowledged events reconcile exactly once; poison events quarantine without false success. | 0 | RTM `TR-UCM-011`, `TR-UCM-014`; poison/replay/reconciliation receipt planned; none accepted. | Service Owner / Operations Owner / Provider Integration Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-REG-01` | `FR-06.c`, `FR-06.d`, `FR-20.a`, `FR-20.b`, `FR-20.c`, `FR-20.g`, `FR-20.h` | `R-08`, `R-20`, `R-23` | `T-SESSION`, `T-SERVICE`: isolated stale-task reproduction yields one active/resumed projection and terminal marker outcome or typed non-healthy discontinuity. | 0 | RTM `TR-UCM-004`, `TR-UCM-011`; correlated lifecycle/health receipt planned; installed-runtime seed is non-qualifying. | Session Owner / Test Infrastructure Owner / Service Owner / Operations Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-REG-02` | `FR-12.b`, `FR-12.c`, `FR-12.d`, `FR-12.e`, `FR-12.f`, `FR-20.i` | `R-06`, `R-07`, `R-08`, `R-09`, `R-23` | `T-SERVICE`, `T-UI`: all count projections expose exact scope, numerator, denominator, exclusions, snapshot/time, and reconciliation status. | 0 | RTM `TR-UCM-007`, `TR-UCM-011`, `TR-UCM-012`; snapshot-denominator/count-reconciliation receipt planned; none accepted. | Git/Runtime Owner / Service Owner / Operations Owner / UI/API Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-REG-03` | `FR-03.b`, `FR-03.d`, `FR-20.j`, `NFR-01.a` | `R-01`, `R-09`, `R-14` | `T-SCOPE`, `T-UI`, `T-RUNNER`: two-project/global canaries prove a project viewer renders zero global/other-project durable memory and labels separately authorized global view. | 0 | RTM `TR-UCM-002`, `TR-UCM-012`, `TR-UCM-016`; viewer isolation/auth receipt planned; none accepted. | Software Architect / UI/API Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |
| `UC2-REG-04` | `FR-09.a`, `FR-10.a`, `FR-10.b`, `NFR-03.a` | `R-03`, `R-05`, `R-17` | `T-CONTEXT`, `T-TEMPORAL`: frozen exact-query benchmark labels eligibility and freshness and admits zero stale gate-critical authority. | 0 | RTM `TR-UCM-005`, `TR-UCM-007`, `TR-UCM-016`; labelled freshness/eligibility receipt planned; installed-runtime 0-of-5 seed is non-qualifying. | Product / Context Owner / Git/Runtime Owner / Local Test Infrastructure Owner; AUTH-A OPEN; AUTH-D NOT ELIGIBLE. |

## Deterministic self-check

The self-check scope is the first column of the worksheet table above.

| Check | Deterministic method | Observed |
|---|---|---:|
| Row count | Count literal behavioral-unit rows. | 54 |
| Unique unit count | Parse each literal unit ID and de-duplicate. | 54 |
| Frozen-set comparison | Compare parsed IDs to the exact frozen set in `DES-UCR-002`; ranges are not accepted as identifiers. | Missing 0; extra 0 |
| Duplicate-unit check | Count parsed IDs occurring more than once. | 0 |
| Required field check | Require non-empty child IDs, risk IDs, verification target, numerator, locator, and authority state on every row. | 54 of 54 |
| Numerator-domain check | Require each current numerator to be binary and supported by qualified independent accepted evidence. | 54 values of 0; 0 values of 1 |
| Numerator sum | Sum the 54 current numerator values. | 0 |
| Threshold arithmetic | Evaluate `0 >= 44`. | false |

## Score and decision

| Measure | Value |
|---|---:|
| Denominator | 54 |
| Threshold | 44 |
| Observed numerator | 0 |
| Shortfall | 44 |
| Result | **NOT ELIGIBLE / BLOCKED** |

## Decision boundary

This worksheet does not accept any requirement, realization, architecture
artifact, MTP, profile, evidence receipt, or review disposition. It does not
change or retire any risk, pass Stage A or ABM, authorize B1/B2, authorize
Construction, or authorize product, test, CI, runtime, connector, native
memory, canary, deployment, release, distribution, or rollout work. A future
score change requires admitted immutable evidence, qualified independent
review, and the exact human authority required by the canonical RTM and MTP;
documentary presence alone remains a zero.
