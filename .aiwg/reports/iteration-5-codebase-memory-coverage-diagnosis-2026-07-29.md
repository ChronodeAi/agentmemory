# Iteration 5 Codebase Memory Coverage Diagnosis

Status: **QUALIFIED STRUCTURAL AID - FULL COVERAGE NOT ESTABLISHED**

Date: 2026-07-29
Project key: `private-tmp-chronode-agentmemory-elab-iter2`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Approved Chronode fork target: `0.9.1`

## Decision boundary

This report diagnoses index evidence. It does not mutate or accept a Codebase
Memory configuration, reindex a repository, repair a parser, qualify a graph,
accept ADR-004, close R-10, amend Revision 24, or authorize product work.

## Current persisted generation

| Field | Observed value |
|---|---|
| State | `ready` |
| Persisted mode | `moderate` |
| Generated | `2026-07-28T20:08:52Z` |
| Nodes / edges | `13,427 / 25,342` |
| Recording / hashes / generation | complete / complete / matched |
| Hard-skipped files | 0 |
| Excluded directories | 22 |
| Excluded files | 158 |
| Parse-partial files | 3 |

This generation postdates the Revision 24 verification timestamp and is not
part of the accepted R24 freeze.

The official upstream
[release page](https://github.com/DeusData/codebase-memory-mcp/releases)
identified `v0.9.0` as its latest published release on 2026-07-29. No published
upstream version supersedes the accepted Chronode `0.9.1` fork target. The
local `/private/tmp/chronode-codebase-memory-0.9.1` source payload is currently
absent except for directory and partial Git-index remnants, so the graph's
0.9.1 implementation symbols are supporting historical graph evidence rather
than current direct-source authority.

## Reconciled test denominator

The candidate contains exactly 148 tracked `test/*.test.ts` files. Persisted
coverage metadata excludes those same 148 paths under `fast-pattern`.

The coverage API's test-scope total of 151 is a count of gap records, not test
files:

- 148 excluded test-file records;
- one excluded directory record for `test/fixtures`; and
- two parse-partial records that repeat two of the 148 test paths.

The correct statement is therefore **148 test files excluded; 151 test-scope
coverage-gap records**. Graph `File` nodes for excluded tests are retained
historical graph content and do not prove inclusion in the current moderate
generation.

## Parse and serialization limitations

| Path | Recorded range | Qualification |
|---|---:|---|
| `scripts/backfill-imported-sessions.sh` | 212 and 253 | Bash `if jq ... <<<"$resp"` constructs; `scripts` is otherwise excluded |
| `test/multimodal.test.ts` | 5 | generic dynamic-import type construct |
| `test/remember-project-scope.test.ts` | 12 | generic dynamic-import type construct |

The coverage API also returned NUL-filled normalized `scope` values while
preserving valid requested scope, totals, and entries. This is a receipt
serialization defect. It does not establish invalid product source or a
failing test.

## Why the earlier full claim does not bind

Earlier receipts retain labels such as `full-ready` and command-level partial
count zero, but do not preserve the raw `index_repository` request, explicit
mode, raw response, project key, or generation identity. Their node counts
differ from the current generation. A clean run response can describe only
newly observed parse failures while persisted status reports generation
coverage. The two surfaces are not evidence for the same generation.

No repository-local `.codebase-memory/config.toml` or `.cbmignore` currently
governs the effective exclusions. Moderate-mode and built-in policies account
for most filtering.

## Supportable claims

- The index is structurally useful and ready at the candidate branch/commit.
- Its persisted generation is internally matched and explicitly `moderate`.
- It records 158 excluded files, 22 excluded directories, and three
  parse-partial files.
- Included `src` paths have no recorded parse-partial entry; two non-code
  `src` paths are excluded.

The evidence does not support full source coverage, any test-suite coverage
claim, exhaustive graph traceability, zero parser gaps, or use of graph
presence as current-generation inclusion.

## Bounded remediation

1. Preserve Revision 24 unchanged.
2. Have the Codebase Memory owner select full mode or explicit exclusions in a
   repository-local contract.
3. In a later authorized controlled run, preserve the raw request, mode,
   response, project/root/HEAD, logfile, generation, immediate status, and
   immediate coverage response.
4. Ensure watcher refreshes retain the selected mode rather than silently
   replacing a full generation with moderate metadata.
5. Reconcile the same generation against the 148-file filesystem manifest and
   identical run/status parse lists.
6. Reproduce the three parser cases and the NUL-scope defect in bounded
   Codebase Memory fixtures.
7. Produce a narrowly worded successor receipt only after independent
   readback.

Until then, direct-file verification is required for excluded or
parse-partial paths used by a claim.
