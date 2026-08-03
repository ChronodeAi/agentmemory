# Iteration 5 Open Requirements Authority Matrix

Status: **OPEN - NO OPTIONS SELECTED**

Date: 2026-07-29
Source questions: `.aiwg/requirements/supplemental-specification.md`

## Decision boundary

This matrix makes the 13 unresolved authority questions human-decidable. It
does not accept a requirement, assign a person, select an option, accept an
ADR, or authorize implementation. A role label is not a human identity.

| Q | Affected atomic children | Candidate options requiring human disposition | Required human authority | Disposition |
|---:|---|---|---|---|
| 1 | `FR-01.a..e`, `FR-02.a..d`, `FR-03.a..d`, `NFR-01.a`, `NFR-04.a` | One designated remote with frozen host/port/path/case rules; explicit multi-remote registry; deny unresolved/conflicting identity | Software Architect; Configuration Manager; Security Architect | `ACCEPT | RETURN` |
| 2 | `FR-05.a..d`, `FR-07.a..f`, `FR-08.a..c`, `NFR-02.a`, `NFR-06.a` | Balanced profile candidate; stricter metadata-only profile; project-specific profile with exact event classes, exclusions, 1,000/8,000-byte bounds, retention, and ledger fields | Product Owner; Privacy Owner; Data Governance Owner; Security Architect | `ACCEPT | RETURN` |
| 3 | `FR-09.c..d`, `FR-11.a..e`, `FR-12.d`, `FR-14.a..e` | Signed provider receipt; provider-native callback/event; no qualifying acknowledgement for a provider, leaving suppression disabled | Provider Integration Owner; Native Memory Integration Owner; Security Architect | `ACCEPT | RETURN` |
| 4 | `FR-19.b..e`, `FR-20.a..c`, `FR-20.g..h`, `FR-20.l` | Proposed required/optional matrix with 30-second probes, 45-second TTL, three-success recovery; stricter dependency-specific timings; return for measured bounds | Service Owner; Operations Owner; Runtime Supervision Owner; Test Architect | `ACCEPT | RETURN` |
| 5 | `FR-09.b`, `FR-09.f`, `NFR-08.a` | Freeze one tokenizer/version and wire-image encoding; use provider-specific profiles; deny packets when tokenizer identity is unavailable | Product Owner; Configuration Manager | `ACCEPT | RETURN` |
| 6 | `FR-05.b`, `FR-09.g`, `NFR-05.a`, `NFR-06.a` | Accept the five-stratum/two-blind-reviewer protocol; require a stricter corpus or qualifications; return exact adjudication changes | Product Owner; Requirements Owner; Human Test Architect | `ACCEPT | RETURN` |
| 7 | `FR-18.f..h`, `NFR-09.a`, `NFR-12.a..b` | Accept the exact local macOS profile and defer CI; add separately frozen profiles; return host/concurrency/load/timeout/worker/memory/source denominators | Human Test Architect; Configuration Manager; Release Owner; CI Owner for deferred CI | `ACCEPT | RETURN` |
| 8 | `FR-12.e`, `FR-13.a..e`, `FR-14.a..e` | Typed evidence allowlist and independence graph; human approval for architecture/security/business/preference classes; no automatic promotion | Requirements Owner; Product Owner; Data Governance Owner; Security Architect | `ACCEPT | RETURN` |
| 9 | `FR-17.e..f`, `FR-19.a..d`, `FR-21.e` | No gateway/direct cutover; exact temporary client/operation allowlist with owner/expiry/zero-use retirement; return compatibility strategy | Software Architect; Compatibility Transition Owner; Connector Owner; Release Owner | `ACCEPT | RETURN` |
| 10 | `FR-02.b..d`, `FR-08.c`, `FR-21.b`, `FR-21.f..g`, `NFR-10.a..b` | Immutable generation/CAS model with exact state denominator and rollback tiers; alternate transaction boundary; return RPO/RTO and recovery definitions | State Migration and Recovery Owner; Configuration Manager; Release Owner | `ACCEPT | RETURN` |
| 11 | `FR-09.a`, `FR-09.g`, `FR-10.b`, `FR-12.e`, `FR-13.a..b`, `FR-13.e`, `NFR-03.a` | Assign one named Requirements Owner; split named authority by requirement family with one final accountable owner; return role model | Product Owner or sponsor acting as assignment authority | `ACCEPT | RETURN` |
| 12 | `FR-15.b..f`, `FR-16.a..b`, `FR-20.d..f`, `FR-20.i..l`, `FR-21.a..g`, `NFR-11.a..b` | Accept exact isolated prefix/LaunchAgent/ports/state/secret/log/static-shell contract; select changed exact values; return until operations evidence exists | Security Architect; Release Owner; Operations Owner; Configuration Manager | `ACCEPT | RETURN` |
| 13 | `FR-07.f`, `FR-14.a..e`, `FR-15.a`, `FR-15.g..h`, `FR-20.l`, `FR-21.g` | `zero-egress` default plus exact provider manifests; local-only mode; qualified side-by-side official rollback subject with separate switch authority | Privacy Owner; Security Architect; Provider Integration Owner; Release Owner | `ACCEPT | RETURN` |

## Current result

All 13 rows are unresolved. The affected requirements remain proposed and
unaccepted. The matrix must be reviewed together with the canonical RTM and
realization worksheets; resolving a question does not by itself accept every
affected child.
