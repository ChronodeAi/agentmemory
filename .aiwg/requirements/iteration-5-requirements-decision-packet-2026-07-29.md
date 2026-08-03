# Iteration 5 Requirements and Realizations Decision Packet

Status: **PREPARED FOR SUCCESSOR FREEZE - NOT THE NEXT REQUESTED DECISION**

Date: 2026-07-29
Canonical traceability authority:
`.aiwg/requirements/traceability-matrix.md`

## Decision boundary

This packet prepares a later requirements decision. The current external
decision request remains Stage A only. This packet does not accept
requirements, realizations, DEC-15 completion, architecture, the MTP, Stage A,
any evidence, a risk, ABM, or Construction.

## Frozen candidate denominator

| Surface | Exact candidate count | Current acceptance |
|---|---:|---:|
| Parent requirement groups | 33 | 0 |
| Atomic child contracts | 130 | 0 |
| Explicit RTM child mappings | 130 / 130 | 0 accepted |
| Child-to-realization memberships | 288 | proposed only |
| Normalized `TR-UCM` rows | 19 | `AUTH-A OPEN`; `AUTH-D NOT ELIGIBLE` |
| Parent use cases / realizations | 3 / 3 | 0 / 0 accepted |

Membership counts are `61` for DES-UCR-001, `121` for DES-UCR-002, and
`106` for DES-UCR-003.

## Behavioral-unit scorecards

| Realization | Worksheet | Denominator | Threshold | Current numerator | Result |
|---|---|---:|---:|---:|---|
| DES-UCR-001 | `realizations/DES-UCR-001-traceability-worksheet-iteration-5.md` | 23 | 19 | 0 | NOT ELIGIBLE / BLOCKED |
| DES-UCR-002 | `realizations/DES-UCR-002-traceability-worksheet-iteration-5.md` | 54 | 44 | 0 | NOT ELIGIBLE / BLOCKED |
| DES-UCR-003 | `realizations/DES-UCR-003-traceability-worksheet-iteration-5.md` | 27 | 22 | 0 | NOT ELIGIBLE / BLOCKED |

Each unit is scored independently. Documentary presence, inherited tests,
historical runs, local advisory review, or a planned locator awards no credit.

## Open decision inputs

- The 13 exact unresolved questions, affected child IDs, options, and human
  roles are in `.aiwg/requirements/iteration-5-open-authority-matrix.md`.
- `TR-UCM-015` now points to the proposed external contract
  `.aiwg/requirements/contracts/ER-CBM-001-codebase-memory-interoperability.md`.
  It remains outside the 130-child Agentmemory denominator and is not accepted.
- `.aiwg/reports/iteration-5-dec15-traceability-verification-2026-07-29.md`
  confirms the documentary joins but finds only 11 of 49 concrete RTM
  code/test/harness subjects graph-usable. DEC-15 independent graph
  verification is not met.
- Live source/test backlinks remain post-ABM Construction work and are neither
  required nor authorized for this documentary decision.

## Required human authority

| Role | Required action | Current identity |
|---|---|---|
| Requirements Owner | Accountable accept/return of exact requirements and RTM | Unassigned |
| Product Owner | Concur on scope, capture, context, promotion, and use-case intent | Unassigned |
| Software Architect | Concur on identity, service, interface, and realization feasibility | Unassigned |
| Security Architect | Concur on scope, auth, privacy, processing, and threat-sensitive contracts | Unassigned |
| Human Test Architect | Concur on testability, scorecards, and DEC-15 disposition | Unassigned |
| Configuration Manager | Concur on exact freeze, provenance, and DEC-15 disposition | Unassigned |
| Realization reviewers | Independently accept/return each DES-UCR worksheet | Unassigned |

## Later decision record

```text
REQUIREMENTS AND REALIZATIONS: ACCEPT | RETURN

Requirements Owner:
Disposition date:
Rationale or exact returned rows:

Product Owner: CONCUR | DO NOT CONCUR
Software Architect: CONCUR | DO NOT CONCUR
Security Architect: CONCUR | DO NOT CONCUR
Human Test Architect: CONCUR | DO NOT CONCUR
Configuration Manager: CONCUR | DO NOT CONCUR

DEC-15 graph condition:
  FULL GRAPH VERIFIED | ACCEPT EXPLICIT DIRECT-FILE FALLBACK | RETURN DEC-15

DES-UCR-001 reviewer/disposition:
DES-UCR-002 reviewer/disposition:
DES-UCR-003 reviewer/disposition:
```

An `ACCEPT` without real names, required concurrences, exact successor hashes,
and one explicit DEC-15 disposition has no effect.
