# Iteration 9 Containment Evidence Correction

Status: **R28 RETURN FINDINGS CORRECTED; R29 FREEZE PENDING**

Date: 2026-07-30

Project: `github.com/chronodeai/agentmemory`

Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

Rejected predecessor review:
`.aiwg/reports/iteration-8-adversarial-review-r28-2026-07-30.md`

## Purpose

This report supplies monotonic corrections for R28-F01 through R28-F05. It
does not alter the rejected R28 manifest, receipt, review, or any R28 entry.
It changes no product source, product test, package file, installed runtime,
plist, configuration, secret, memory data, provider configuration, ADR,
architecture decision, requirement disposition, risk status, or gate.

## R28-F01 - entry ordering

R29 uses one explicit bytewise ASCII path comparator for manifest generation
and an independently implemented bytewise comparator in verification. No
locale-sensitive comparator is permitted.

The R28 path/hash/size/role map is imported unchanged. Its array is reordered
only in the R29 successor manifest.

## R28-F02 - pre-execution authority provenance

The minimal admitted local event excerpt is:

`.aiwg/reports/evidence/containment/iteration-7-authority-execution-events-2026-07-30.json`

SHA-256:
`dc22bb0ce5c0fe978aabcf6018a5840ebb00cbf62aba6acead78f67480047e96`

It records:

| Event | Timestamp |
|---|---|
| Exact user authorization | `2026-07-30T15:32:21.001Z` |
| First containment mutation | `2026-07-30T15:34:28.350Z` |
| Authorization lead time | `127349` milliseconds |

The excerpt contains the exact response, message ID, selected tool call/result
IDs, source line numbers, per-record SHA-256 values, and ordered timestamps.
It contains no credential, process environment, response body, prompt, memory,
summary, or session content beyond the exact authorization and selected
containment events.

The source Codex rollout is mutable local state. The admitted excerpt is
hash-bound, but it does not independently authenticate the human or establish
external custody.

The effective authority sources are now:

1. the exact Iteration 7 request;
2. the pre-execution user event in the admitted excerpt; and
3. the normalized effective Markdown/JSON disposition.

The historical execution report's request-only authority-source statement is
superseded by this chain.

## R28-F03 - complete stop conditions

The effective fail-closed policy is the most restrictive union of the
authorized request and exact response:

1. identity drift;
2. automatic restart;
3. failed graceful exit;
4. unexpected listener; and
5. ambiguous verification.

The exact user text remains unchanged. Retaining the request's
`unexpected listener` condition narrows authority and adds no action.

## R28-F04 - evidence-bounded execution result

The initial exact-PID `lsof` inventory found these and only these listeners
for target PIDs 2725, 8749, and 7324:

`3111`, `3112`, `3113`, `3114`, and `49134`.

The corrected execution interpretation is:

- the managed service was absent after exact bootout and a two-second
  observation;
- manual worker PID 8749 was absent after one authorized `TERM` and a
  two-second observation;
- `iii` PID 7324 was absent after one conditionally authorized `TERM` and a
  two-second observation;
- no application-level clean-shutdown or exit-code claim is made;
- no listener remained on the five discovered target ports;
- connections to all five ports were refused;
- a five-second delayed observation found no listener, bare server/engine
  replacement, or launchd service reload; and
- the result is limited to the three targeted identities, their five
  discovered listeners, and the recorded observation window.

This supersedes `clean exit` or unqualified `graceful exit` wording in the
historical execution report.

## R28-F05 - conditional terminology

The corrected wording is:

`the authorized manual-worker TERM and the conditionally authorized iii TERM`.

Only the `iii` action was conditional.

## Residual state

- Agentmemory remains intentionally offline.
- Restart and bootstrap remain unauthorized.
- The viewer authorization defect, health contract, wildcard-listener
  configuration, supervision ownership, and truthful degradation work remain
  open.
- B-STGA-06 is satisfied only at the recorded observation time.
- B-STGA-01 through B-STGA-04 remain open.
- B-STGA-05 requires a deterministic R29 freeze and independent PASS.
- All 23 risks remain `IDENTIFIED`; none is mitigated or retired.
- Stage A remains not submission-ready.
- B1 and B2 remain blocked.
- ABM remains `FAIL / NO-GO`.
- Construction, package work, canary, deployment, release, and rollout remain
  unauthorized.

## Authority effect

This is an evidence correction only. It creates no human identity,
concurrence, signature, independent custody, package authority, runtime
qualification, risk disposition, architecture acceptance, gate passage, or
downstream execution authority.
