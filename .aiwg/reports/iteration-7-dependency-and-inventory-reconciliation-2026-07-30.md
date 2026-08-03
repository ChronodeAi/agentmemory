# Iteration 7 Dependency and G-ICM Reconciliation

Status: **DOCUMENTARY CORRECTION CANDIDATE - STAGE A STILL OPEN**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Workspace: `/private/tmp/chronode-agentmemory-r27`
Branch: `codex/agentmemory-elab-r27`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Boundary

This report records a disposable-workspace dependency check and deterministic
interface-inventory regeneration. It changes no product source, product test,
package manifest, lockfile, installed runtime, credential, service, listener,
gate, risk, ADR, or authority state.

No Stage A, Stage B1, Stage B2, execution, ABM, Construction, package, canary,
release, deployment, or rollout authority is created.

## R26 import

The 142 files named by the R26 standalone manifest were mechanically copied
from `/Users/base/projects/chronode-agentmemory-r26` into the R27 workspace.
All 142 copied files matched the R26 path, byte count, and SHA-256 entries
before any successor correction.

The R26 manifest, deterministic receipt, and adversarial review were copied as
immutable predecessor anchors. Their hashes remain:

| Artifact | SHA-256 |
|---|---|
| `.aiwg/reports/iteration-6-input-manifest-r26.json` | `7adc635a58faacd1dd04b5712df75bc5aeb0e33df10cc614ad1961126321c5dc` |
| `.aiwg/reports/iteration-6-manifest-verification-r26.json` | `b4043e4c963bae015f8220d943ce271d9ff9b487dc4bd32efeaeaf4a19e57ad2` |
| `.aiwg/reports/iteration-6-adversarial-review-r26-2026-07-30.md` | `4681a1ede80be25c4451397efa3b4b270935fa1a19f12c97ed7a2f42b6ba8131` |

## Human disposition provenance repair

The first R27 adversarial review found that the selected profile cited a
human-disposition record that was present in the R26 workspace but omitted
from both predecessor manifests. R27 mechanically imports the complete direct
decision chain at its existing bytes:

| Artifact | SHA-256 |
|---|---|
| `.aiwg/reports/iteration-4-local-macos-human-decision-request-2026-07-28.md` | `969c49a14dfa254d8887df43069343d729e6e5ae157559b7e51e8d67d0b407f8` |
| `.aiwg/reports/iteration-4-local-macos-elaboration-reconciliation-2026-07-28.md` | `6fc384a62e40b78a2d6784bb21fe6d58525167bdbbd133dacacce64e9902b1f0` |
| `.aiwg/reports/iteration-4-local-macos-validation-receipt-2026-07-28.md` | `6d1338474310082d725abe9664faf56f800c187ff6e76c1c971f44ff63d9fffa` |
| `.aiwg/reports/iteration-4-local-macos-human-disposition-2026-07-28.md` | `d4391291fbd04b49721c0ba6e2110192e56724c2dbc20d94c474cdbe2166dcf5` |
| `.aiwg/reports/iteration-4-local-macos-human-disposition-2026-07-28.json` | `58ca761f4ebed1842c23372b5b3a7c52a559be4bae6efb7adf10541757d5272b` |

The disposition records DEC-12 as accepted for Stage-A specification only.
It does not accept Stage A, B1, B2, execution, architecture, risk, ABM,
Construction, package work, release, or rollout.

The common PoC control also named an R21 manifest that is not available in any
recovered workspace. Its matching historical receipt is retained at SHA-256
`7f59853ceaf5734cbd64f357fd4e7148af14b57765c3093d2f52f4c85c4401b4`,
but R27 now explicitly classifies that pair as an incomplete historical
receipt only. It claims no R21 continuity and admits no qualifying evidence
from it.

## Deterministic dependency failure

`npm ci` failed before installation because `package.json` and
`package-lock.json` are not synchronized. The failure reported dependencies
required by the current manifest but absent from the lock, including the
current MCP SDK, Hono, Express, Jose, and their transitive dependencies.

This is a deterministic-build blocker. The R27 documentary scope does not
authorize changing either package file, so no lockfile repair was attempted.

To run the existing inventory generator only, the disposable workspace used:

```text
npm install --ignore-scripts --no-package-lock --no-audit --no-fund
```

This wrote only ignored disposable dependencies. It ran no lifecycle scripts
and changed neither `package.json` nor `package-lock.json`.

## Imported G-ICM defect

The R26 common input recorded:

- artifact hash:
  `ca1831d84bce92f386b8c52ec0f7b1de280123198e9123fffcd5628e6052b5e0`;
- input count: 195;
- input digest:
  `ffd39ae1f46c48ea72274df73fb9125fd3d8bfd6bf30517cea870c86441ff0c3`;
- source commit/tree: the current candidate.

The imported artifact bytes actually hashed to:

`cdc649bf019e5475da523801d56e71769e068fa7e01475847894f7b687d586b4`.

More importantly, the artifact declared source commit
`3b6794e409dcc4bbd644904ffbb6edc93761adee` and tree
`869592ae5f4226d01e75e1a71492099ea581ee32`. Updating only its stored hash
would therefore have falsely bound an old denominator to the current
candidate.

## Candidate-bound regeneration

The repository's existing command was run twice with separate temporary
outputs:

```text
npm run evidence:interfaces -- --output=<temporary-output>
```

Both outputs were byte-identical and reported zero generator-detected
missing-auth REST routes.

Candidate result:

| Field | Value |
|---|---|
| G-ICM artifact SHA-256 | `6821edf7525d5e8f844e2c68922b882df8e531f550220244e9d45721bfba1f42` |
| Source commit | `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` |
| Source tree | `8c479b95bb9753911df212089d7faf3d6f35a28d` |
| Input paths | 194 |
| Input digest | `6b3b918167885d87ea23f40c9f66da304a5910aa3801957aca2c8d1910916fb8` |
| REST routes | 135 |
| Public REST routes | 1 |
| Protected REST routes | 134 |
| MCP transports/tools/resources/prompts/fallbacks | 6 / 59 / 5 / 3 / 7 |
| Hooks / host manifests / host events | 13 / 5 / 44 |
| Provider adapters / attempt sites | 15 / 49 |

The public allowlist is exact `GET /agentmemory/livez`.

The generated inventory proves what the generator enumerated from candidate
source. It does not qualify viewer-proxy equivalence or disprove the separately
reproduced live viewer authorization bypass.

## Successor input correction

R27 updates
`.aiwg/risks/poc-cards/inputs/p1-input-control-v1.json` to:

- reference the regenerated candidate-bound artifact;
- record 194 inputs and the exact input digest;
- select the DEC-12 local profile for Stage-A specification only;
- retain null qualification mechanics, human assignments, signer, verifier,
  and Stage-B1/Stage-B2 authority;
- keep execution, external calls, ABM, Construction, and risk changes false.

R-09, R-14, and R-23 companion inputs are corrected to the canonical trace
subjects in the Iteration 7 RTM section and to the exact accountable role
identifiers in their source cards.

## Disposition

- Candidate G-ICM identity mismatch: corrected in R27.
- Candidate profile selection mismatch: corrected in R27.
- DEC-12 human-disposition source chain: imported and hash-bound in R27.
- Incomplete R21 historical anchor: explicitly non-admitted; no continuity
  claimed.
- Canonical PoC trace joins: corrected in R27.
- Deterministic dependency lock: open blocker.
- Human assignments and concurrences: open.
- Stage A: not submission-ready or accepted.
- Stage B1/B2 and execution: blocked.
- Product and runtime state: unchanged.
