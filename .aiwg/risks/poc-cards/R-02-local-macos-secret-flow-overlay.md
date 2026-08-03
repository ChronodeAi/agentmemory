# R-02 Local macOS Secret-Flow Overlay

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Date: 2026-07-28
Risk: `R-02`
Priority/status: P1 / `IDENTIFIED` (unchanged)
Base card: `.aiwg/risks/poc-cards/R-02-secret-flow-v1.md`
Profile input:
`.aiwg/testing/local-macos-qualification-profile-candidate.md`
Operations input:
`.aiwg/deployment/local-macos-operations-and-support-candidate.md`

## Decision boundary

This additive overlay tailors the base R-02 card to the selected local macOS
release candidate. The base card remains unchanged and controlling wherever
this overlay is silent.

This overlay is documentation/evidence preparation only. It does not accept
Stage A, authorize B1, admit B2, claim execution, inspect a real secret, access
Railway, run a provider call, authorize migration/heal, change R-02, pass ABM,
or authorize Construction, deployment, canary, release, or rollout.

DEC-12 accepts the exact local profile and its 740-file-execution/
42-lifecycle-journey denominators for Stage-A specification only. DEC-17
accepts the Stage-A authority matrix. DEC-18 confirms the 23-risk denominator
and 17-risk threshold. None of those decisions expands this overlay's
authority.

## Railway split

Railway concerns are not interchangeable:

| Concern | Local disposition |
|---|---|
| Local secret flow | Mandatory R-02 evidence under this overlay |
| Historical Railway exposure | Separate external issue: `UNVERIFIED / NOT EVALUATED`; requires a named human owner and separately authorized metadata-only attestation that forbids secret/log-content access by this evidence executor |
| Prospective Railway deployment | `DEFERRED-DEPLOYMENT`; excluded from local package, qualification, ABM, canary, and release denominators |

Local evidence cannot prove that a historical Railway deployment did or did
not occur, expose a value, retain logs, or complete containment. Prospective
Railway work cannot be made a predecessor to local qualification.

## Selected local boundary

The exact profile accepted for Stage-A specification only is:

`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

All evidence uses isolated clean homes, labels, ports, state roots, provider
homes, logs, backups, credentials, and synthetic canonical projects. Unknown
or historical credentials are never imported. Every fixture value is
synthetic, unique, non-production-shaped, and excluded from retained evidence.

## Mandatory local sinks

The complete local denominator includes:

- setup input, process environment names, secret-file paths/metadata, plist
  content, LaunchAgent stdout/stderr, engine/worker/API/MCP/viewer-data
  boundaries, and shutdown/restart remnants;
- capture objects, serialized request bodies/headers, queues, retries,
  fingerprints, dedupe state, KV/SQLite, streams, indexes, ledgers, snapshots,
  exports, temporary files, exceptions, audits, metrics, and health;
- Codex and Claude configuration pre-images/post-images/backups, ownership
  markers, hook/plugin files, repair/removal artifacts, and unrelated
  configuration comparisons;
- private logs, rotated logs, crash reports, support output and manifest,
  receipts, signatures, verification reports, custody objects, and deletion
  records;
- backup destinations, migration/restore staging, upgrade generations,
  rollback instances, uninstall retained-data reports, and every failure
  remnant; and
- DNS, socket, HTTP, SDK, model, embedding, telemetry, fallback, provider, and
  native-memory recording sinks for `PP-01` and `PP-02`.

A missing, unobservable, or unmanifested sink blocks the case. It cannot be
counted as empty.

## Local evidence mappings

| Journey | Secret-flow evidence |
|---|---|
| `LQ-001..002` | Immutable package and transactional setup; fresh credential generation; no value in argv/output/receipt; rollback of failed setup; unrelated-byte equality |
| `LQ-003..004` | Exact private LaunchAgent/plist/log roots; secret-file reference only; restart/reconciliation failure remnants; no unowned-process access |
| `LQ-005..006` | Loopback/static-shell disposition; complete CLI/REST/MCP/viewer-data auth matrix; no credential or protected payload in UI/health/errors |
| `LQ-007..010` | Two-project/global isolation; Codex/Claude connect/repair/remove backup custody; no cross-project or unrelated-config disclosure |
| `LQ-011` | `PP-01 zero-egress`: every external-attempt sink records zero attempts and local unavailability cannot change mode |
| `LQ-012` | `PP-02 provider-enabled`: synthetic sink records exact authorized attribution after minimization/redaction and zero governed effect for every denied tuple |
| `LQ-013` | Backup/migration/restore/upgrade inventory, protection/encryption disposition, no secret material, independent read-back, interruption remnants, exact rollback |
| `LQ-014` | Isolated official-upstream rollback subject, candidate rollback, uninstall/support output, retained-data report, and byte-identical unrelated provider configuration |

No real provider request is required or authorized by `PP-02`. A real call
requires a separate explicit authorization naming provider, destination,
purpose, data class, project/session, payload minimization, retention, stop
conditions, and responsible operator.

## Mandatory assertions

Pass evidence would require all of the following after separate B2 admission:

1. Secret parent directories are `0700`; secret/config files are `0600`.
2. Symlink, hard-link ambiguity, ownership mismatch, group/world access,
   unreadable file, stale/replayed credential, issuer/key confusion, and
   invalid higher-precedence security values fail closed.
3. Raw synthetic-canary occurrence is exactly zero across every mandatory
   local sink and failure remnant.
4. Every input has one attributable `dropped`, `redacted`, or `admitted-safe`
   disposition before its first governed boundary.
5. Default logs and support output contain no raw query, prompt, memory,
   session title, procedural-memory name, credential, capability, or provider
   payload; no automatic support upload occurs.
6. Backups contain no raw secret material, have exact scope/generation
   inventories and accepted protection, and pass independent read-back.
7. `PP-01` records zero attempts; `PP-02` records only the exact synthetic
   allowed attempt/result and complete zero-effect denials.
8. All failures, interruptions, and attempted retries remain indexed; no
   failed attempt is replaced or repaired in place.
9. An independent verifier checks the immutable bundle and custody deposit
   without generator-local state or key material.

Any real secret/user content, unmanifested network attempt, missing sink,
post-boundary-only redaction, raw occurrence, automatic provider fallback,
secret-bearing receipt/backup/log/UI/support output, unauthorized migration/
heal, or Railway access fails and stops the case.

## Stage and authority normalization

DEC-17 accepts the Stage-A role matrix below; named assignments and actual
concurrences remain open.

| Stage/role | Required posture |
|---|---|
| Stage A | Human Test Architect accountable; Configuration Manager, Security Architect, and Release Owner required; Local Test Infrastructure and Dependency Owners advisory; CI Owner `DEFERRED-LOCAL-TARGET` |
| B1 | Separately authorized disposable mechanics only under exact write roots; no product/CI/runtime mutation |
| B2 | Separately admitted immutable inputs and an Independent Verifier Owner readiness/separation record |
| Stage D | Test Architect disposition with independent verifier and Configuration Manager concurrence; executor cannot verify its own evidence |

All identities, manifests, hashes, assignments, B1/B2 decisions, execution
receipts, and custody records remain open. R-02 remains `IDENTIFIED`.

DEC-18 permits no status inference: only mitigated or retired risks count
toward the confirmed 17-of-23 threshold, accepted-but-open risks do not count,
and any unresolved mandatory veto prevents ABM PASS. All 23 risks remain
`IDENTIFIED`; zero are mitigated or retired.
