# Iteration 6 Reconstruction Provenance

Status: **RECONSTRUCTED GOVERNANCE INPUT - LOCAL ADVISORY ONLY**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Durable worktree: `/Users/base/projects/chronode-agentmemory-r26`
Branch: `codex/agentmemory-elab-r26`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`
AIWG session: `aiwg-iteration-dual-track-elaboration-iter6-2026-07-30-1258`

## Decision boundary

This report records recovery provenance after the temporary iteration-4 and
iteration-5 worktrees disappeared. It does not recreate missing custody,
signatures, executable artifacts, or independent verification. It does not
assert R24-to-R25 chain continuity, accept a requirement or ADR, change a risk
status, admit PoC evidence, accept Stage A, authorize B1/B2, pass ABM, authorize
Construction, or authorize package, runtime, canary, release, or rollout work.

## Recovery sources and method

The reconstruction used retained Codex session JSONL records and successful
file-edit/readback events as recovery sources. Edits were replayed into
disposable worktrees rooted at the exact candidate commit. A path normalizer
mapped the vanished temporary worktree paths to the disposable recovery root.
Committed hunks were skipped when their expected result already existed.

The final disposable reconstruction applied 461 eligible edit calls and 750
hunks. Three generated-state edits were not replayed:

- one `.aiwg/aiwg.config` timestamp update; and
- two updates to the generated
  `.aiwg/reports/iteration-4-input-manifest.json`.

Mutable `.aiwg/working/**`, `.aiwg/daemon/**`, `.aiwg/cache/**`,
`.aiwg/sessions.json`, and `.aiwg/aiwg.config` state was not imported into the
durable governance baseline. The durable worktree contains no non-`.aiwg`
changes.

## Exact recovered anchors

| Artifact | Recovered SHA-256 | Verification |
|---|---|---|
| `.aiwg/reports/iteration-5-input-manifest-r25.json` | `2c3039c0767866e7e21ba11eded16bc3d88a58bb56068b8e9e80c43dd9c01ac9` | Exact match |
| `.aiwg/reports/iteration-5-manifest-verification-r25.json` | `87969f3657704bb5d6452f4e130c8c0d55b0f012a6465983abeb7651e13819e6` | Exact match |
| `.aiwg/reports/iteration-5-adversarial-review-r25-2026-07-29.md` | `a6ac699e5c073ce8f0a7769071d07bc44b03d1e58a7881b1bab7c1f6b14fbf0b` | Exact match |
| `.aiwg/reports/iteration-5-worktree-ownership-and-live-baseline-2026-07-29.md` | `2e07b9101219bb4e2ada5dddb7bbdd820b2cf7982b4d66b13cdbd0c4b93e8380` | Exact match |

All 24 R25 `delta_entries` are present and match the SHA-256 values recorded
in the exact recovered R25 manifest.

## Unrecoverable predecessor material

The exact R24 manifest
`.aiwg/reports/iteration-4-input-manifest.json` and exact R24 deterministic
receipt `.aiwg/reports/iteration-4-manifest-verification-r24.json` are absent.
The historical binary working-evidence trees used by earlier local probes also
did not survive. Recreating those bytes would require rerunning superseded PoC
mechanics and fabricating a predecessor state; neither is authorized.

R25 embeds hashes and assertions about R24. Those statements are preserved as
historical recovered bytes, not independently revalidated predecessor
evidence. R26 must therefore be a standalone manifest with no claim that the
R24/R25 layered chain is currently complete.

## Durable reconstruction result

- The durable branch points to the exact candidate commit and tree.
- The exact R25 quartet is preserved.
- Every R25 delta hash is reproducible from the durable worktree.
- Product source, tests, package files, and provider deployments are unchanged.
- The current governance tree remains unsigned, locally held, dirty, and
  advisory.
- Fresh runtime observations must be recorded as new R26 specification input,
  never backfilled into the exact R25 artifacts.

## Required successor controls

1. Generate a standalone R26 manifest from an explicit allowlist.
2. Exclude mutable session, working, daemon, cache, provider, and generated
   deployment state.
3. Bind the candidate commit and tree independently of historical runtime
   claims.
4. Include the exact R25 quartet only as recovered historical anchors.
5. Verify every R26 path is regular, repository-relative, non-symlinked,
   present, unique, and hash-matching.
6. State the R24 continuity break in the manifest, receipt, review, and every
   external decision request.
7. Require a separate adversarial review after manifest generation.

