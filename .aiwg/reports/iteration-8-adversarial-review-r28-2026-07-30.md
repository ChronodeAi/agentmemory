# Iteration 8 Post-Generation Adversarial Review

Status: **RETURN - SUCCESSOR CORRECTION REQUIRED**

Date: 2026-07-30

Project: `github.com/chronodeai/agentmemory`

Candidate commit:
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

Candidate tree:
`8c479b95bb9753911df212089d7faf3d6f35a28d`

## Reviewed freeze

| Artifact | SHA-256 |
|---|---|
| `.aiwg/reports/iteration-8-input-manifest-r28.json` | `92186d7a5468db45af792a641b762eab5fa83cfa89feb51f37f06000907193a3` |
| `.aiwg/reports/iteration-8-manifest-verification-r28.json` | `b966b12ce502063fbff4193cd0cc9c6718fb4ed55a6ca45d3f631ef3181202b0` |

The manifest contains 169 unique, regular, hash-bound entries. The
deterministic receipt reports 41 of 41 checks passed. This adversarial review
found semantic and verifier defects that the deterministic checks did not
detect.

## Review method

Three independent premium reasoning workers reviewed the exact frozen bytes
in read-only mode:

1. governance, configuration, manifest integrity, and predecessor continuity;
2. security, authority, and containment-evidence boundaries; and
3. build, test-governance, and lifecycle truthfulness.

The reviewers did not edit files, mutate the runtime, inspect secrets or
response bodies, install dependencies, run product tests, supply human
authority, or advance a lifecycle gate.

## Independent verdicts

| Review | Verdict |
|---|---|
| Governance and freeze integrity | **RETURN** |
| Security and authority | **RETURN** |
| Build, test, and lifecycle | **PASS** |

The aggregate verdict is **RETURN**.

## Material findings

### R28-F01 - nondeterministic entry-order oracle

The manifest and receipt both used locale-sensitive ordering. That comparator
placed lowercase and uppercase path segments differently from the bytewise
lexicographic order preserved by R27. The receipt therefore passed its own
incorrect oracle.

Observed inversions included:

- `inputs/p1-input-control-v1.json` before `inputs/R-02-v1.json`; and
- `inputs/R-23-v1.json` before
  `R-02-local-macos-secret-flow-overlay.md`.

Required correction:

- generate and verify successor entries with one explicit bytewise ASCII
  comparator;
- preserve all path/hash/size/role values while reordering the successor
  array; and
- rerun deterministic and independent review.

### R28-F02 - pre-execution authority provenance incomplete

The execution report named the unanswered request as its authority source.
The post-execution Markdown/JSON disposition did not bind the original
Codex user-event timestamp or message identity. The frozen packet therefore
did not independently establish from its admitted bytes that authorization
preceded the first containment mutation.

Required correction:

- admit a minimal, redacted local session-event excerpt containing the exact
  user authorization event and exact containment tool events;
- bind event timestamps, message/call IDs, and per-record hashes;
- demonstrate ordering without claiming external authentication or
  independent custody; and
- supersede the execution report's authority-source statement with the
  admitted event provenance plus the human-disposition records.

### R28-F03 - mandatory stop-condition set incomplete

The request makes `unexpected listener` a stop condition. The
machine-readable disposition listed only identity drift, automatic restart,
failed graceful exit, and ambiguous verification. Its rationale copied the
same shorter set, and the receipt did not compare the complete request set.

Required correction:

- preserve the exact user text unchanged;
- normalize the effective fail-closed policy as the union of the authorized
  request and response, including `unexpected-listener`; and
- make the successor verifier compare the complete set.

Adding a stop condition narrows authority; it does not authorize another
action.

### R28-F04 - execution claims broader than retained evidence

The report used `clean exit` and `graceful exit` language even though the
retained evidence directly proves only that each process was absent after one
`TERM` and a two-second observation. It also did not state whether the five
named ports were the complete listener set discovered for the three targeted
processes.

Required correction:

- record the exact two-second post-action observations and five-second delayed
  no-restart observation from the local event log;
- describe process absence after `TERM`, not a proved application-level clean
  shutdown;
- bind the initial exact-PID listener inventory showing only 3111, 3112,
  3113, 3114, and 49134; and
- limit the closure claim to those five discovered listeners and the three
  targeted process identities.

### R28-F05 - conditional wording inaccurate

The disposition said that two graceful terminations were conditionally
authorized. Only the `iii` termination was conditional; the manual worker
termination was authorized after revalidation.

Required correction:

Use: `the authorized manual-worker TERM and the conditionally authorized iii
TERM`.

## Verified non-findings

- All 169 R28 entry hashes and sizes matched.
- All 161 R27 entries remained byte-exact and exactly eight successor
  additions were present.
- Candidate commit, tree, branch, and R27 anchors matched.
- No product source, product test, or package delta was present.
- The dependency lock mismatch remained open and package repair unauthorized.
- G-ICM and Codebase Memory claims remained bounded and non-qualifying.
- All Stage-A human roles and concurrences remained unassigned.
- Only B-STGA-06 was reconciled at observation time.
- All 23 risks remained `IDENTIFIED`; none was mitigated or retired.
- Stage A remained not submission-ready, B1/B2 blocked, ABM `FAIL / NO-GO`,
  and Construction unauthorized.
- Restart, bootstrap, `KILL`, `agentmemory stop`, and `--force` remained
  denied.
- Temporary containment was not presented as permanent remediation.

## Authority effect

R28 is a rejected unsigned local documentary candidate. Its deterministic
receipt remains a record that its own 41 checks passed; this review does not
rewrite that receipt as failed.

No R28 artifact may be used to infer Stage-A readiness, permanent
remediation, independent custody, risk disposition, architecture acceptance,
ABM passage, Construction authority, package authority, restart authority,
canary authority, deployment, release, or rollout.

The findings must be corrected in a monotonic successor freeze.
