# Iteration 5 Worktree Ownership and Live Baseline

Status: **OBSERVED - LOCAL ADVISORY EVIDENCE ONLY**

Date: 2026-07-29
Project: `github.com/chronodeai/agentmemory`
Worktree: `/private/tmp/chronode-agentmemory-elab-iter2`
Session: `aiwg-iteration-dual-track-elaboration-iter5-2026-07-29-1548`

## Decision boundary

This report records read-only observations and worktree ownership. It does not
prove candidate causation, accept any artifact, change a session owner, heal or
migrate data, mutate a runtime or index, retire a risk, pass ABM, or authorize
Stage A, B1, B2, Construction, deployment, release, or rollout.

## Revision 24 revalidation

| Check | Observed result |
|---|---|
| Branch | `codex/agentmemory-elab-iter2` |
| Candidate commit | `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` |
| R23 predecessor SHA-256 | `50c0e2669c46b34843d3cd2c4576879a8f47d410abcb1298fc52836806d33619` |
| R24 manifest SHA-256 | `6ca664d7a2b3f5b842960470cf7eb71a0cf878824c2908b5dd0e1aa6099f91e5` |
| R24 deterministic receipt SHA-256 | `f9d79039047c29ae84b94aef979321ba0ecb926a44e16682b6bb3e9ac9914f85` |
| R24 premium review SHA-256 | `b359da0cfcc3cc14e85d0503bd8954a92c000980ee01bf04cd1777e724878ab8` |
| Manifest entries | 236 |
| Initial pre-edit deterministic manifest audit | zero recorded missing, drift, duplicate-path, unsafe-path, JSON, link, protected-product, RTM-child, or realization-threshold findings |
| Review disposition | `PASS - LOCAL ADVISORY ONLY` |

The operator's acceptance is limited to this freeze and DEC-01 through DEC-18
within their recorded bounds.

## Dirty-tree ownership

The initial iteration-5 inventory classified 195 changed or untracked paths:

| Ownership class | Count | Disposition |
|---|---:|---|
| Governance/evidence artifacts | 190 | Preserve; iteration-5 edits may add bounded `.aiwg/` successors |
| Generated provider/workspace artifacts | 3 | Preserve; no regeneration or deployment authorized |
| Candidate product-evidence tooling | 2 | Protected; do not edit |
| Unknown | 0 | None |

Protected product-evidence tooling:

- `scripts/evidence/generate-interface-inventory.mjs`
- `scripts/evidence/generate-interface-inventory.test.mjs`

The generated/provider paths are `AGENTS.md`, `WORKSPACE.md`, and
`models.json`. Existing unrelated dirty content is preserved.

The final layered successor deliberately refreshes four R24-covered governance
paths. That is distinct from the zero-drift pre-edit observation: all 236
predecessor entries remain accounted for, with four declared refreshes and
zero missing or undeclared drift.

## Session ownership

The new iteration-5 session is active. Three pre-existing July 26 sessions are
also marked active:

- `aiwg-iteration-dual-track-elaboration-iter4-2026-07-26-1235`;
- `aiwg-test-strategy-execution-elaboration-iter4-2026-07-26-1438`; and
- `aiwg-security-review-cycle-elaboration-iter4-2026-07-26-2131`.

Their registry records contain no owner, process identifier, lease, heartbeat,
or takeover token. Ownership therefore cannot be inferred safely. All three
remain untouched until live owners or an accepted stale-session policy are
identified.

## Local Agentmemory process surface

The initial read-only probe found no shell-path executable, loaded LaunchAgent,
or reachable port. A later refresh, after the operator started the UI, exposed
a live but internally contradictory runtime:

| Surface | Refreshed result |
|---|---|
| `agentmemory` executable on current shell path | Not found |
| Absolute CLI | `/Users/base/.nvm/versions/node/v24.16.0/bin/agentmemory`, version `0.9.28` |
| `agentmemory status` | Exit 1: `Not running - no response at http://localhost:3111` |
| `agentmemory doctor --dry-run` | Exit 0 but `server: 0/1 passing`; reports server and viewer unreachable |
| `127.0.0.1:3111/agentmemory/livez` | HTTP 200; service `ok`, viewer port `3113`, viewer not skipped |
| `127.0.0.1:3111/health` | HTTP 404 |
| `127.0.0.1:3111/agentmemory/health` without a credential | HTTP 200; service `healthy`, version `0.9.28`, KV `ok`, one connected `0.11.2` worker |
| Viewer `127.0.0.1:3113` | Intermittent: at least one HTTP 200 shell response, followed by ten consecutive failed half-second probes while the socket still appeared as listening |
| `gui/501/com.agentmemory.server` LaunchAgent | Not loaded |
| Process topology | `iii` engine parented by PID 1 plus a Node worker retained under an older terminal process; not one qualified supervisor |
| Codex Agentmemory plugin registry | Installed as `0.9.28`, disabled |

The refresh corrects the initial inference that port 3111 was simply absent.
It does not qualify the runtime. The CLI produces a false `not running`
diagnosis while liveness and health respond. The selected DEC-14 contract
allows unauthenticated access only to `/agentmemory/livez`, but both the
detailed protected health payload and, intermittently, the viewer shell were
readable without a credential. Mixed supervision and an unreliable viewer
also leave lifecycle and operability behavior unqualified.

## Active Agentmemory MCP surface

The Agentmemory MCP tools available to this task answered requests for
`github.com/chronodeai/agentmemory`. This is a distinct surface from the failed
local CLI/port probes and its implementation provenance is not established by
tool availability.

| Probe | Observed result |
|---|---|
| Project health | success; one scoped session; zero memories, lessons, or insights |
| Scope coverage | `1.0` for recorded project data |
| Project-unscoped records | `0` |
| Separately reported global-unscoped records | `1887` |
| Retrieval use | `0` |
| Duplicate rate | `0` |
| Promotion count / pending | `0 / 0` |
| Commit coverage | `0` |
| Context packet p95 latency | `33 ms` at observation time |
| Project sessions | one completed session rooted at `/private/tmp/chronode-agentmemory-0.9.28`, one observation |
| Project recall | one old prompt result for the R24/Stage-A query |
| Context packet with AIWG session ID | rejected because the session did not belong to the project |
| Context packet with the one valid Agentmemory session | success but empty: zero tokens and zero source IDs |
| Slot listing | `500 Internal Server Error` |
| Commit lookup for candidate HEAD | no linked session |
| Project commit history | empty |

The MCP is responsive but not useful as authoritative Elaboration evidence:
there is no current project memory, durable lesson, insight, promotion,
context, or commit linkage, and slot listing fails. Recall remains advisory
only.

## Codebase Memory baseline

The indexed project is
`private-tmp-chronode-agentmemory-elab-iter2`, rooted at this worktree and bound
to the candidate branch and commit.

| Field | Observed result |
|---|---|
| Index status | ready |
| Persisted mode | `moderate` |
| Recorded generation | `2026-07-28T20:08:52Z` |
| Nodes / edges | `13,427 / 25,342` |
| Parse-partial files | 3 |
| Skipped files | 0 |
| By-design non-indexed files | 158 |
| Excluded test files | 148 |
| Test-scope coverage-gap records | 151: 148 files, one fixture-directory record, and two duplicate parse-partial records |

Parse-partial ranges:

- `scripts/backfill-imported-sessions.sh`: lines 212 and 253
- `test/multimodal.test.ts`: line 5
- `test/remember-project-scope.test.ts`: line 12

The coverage API also returned NUL-filled normalized scope values for requests
to `src`, `test`, and `scripts`. A prior full-index request did not persist a
full-mode generation; current status remains moderate. Therefore the graph is
useful for indexed structural discovery but cannot support a complete
source-and-test coverage claim. Flagged and excluded paths require direct-file
verification.

## AIWG baseline

After the iteration artifact index was rebuilt, `aiwg doctor` reported 35
passes and three warnings. `aiwg status --probe --json` reported the workspace
engaged, ready, and healthy.

| Observation | Classification and current disposition |
|---|---|
| Doctor reports AIWG `2026.7.16 [edge]`; `aiwg --version` reports `2026.7.24 [dev]` at `/opt/homebrew/lib/node_modules/aiwg` | Intentional customize-mode composition: `2026.7.24` is the bootstrap launcher and `2026.7.16` is the active checkout. Label semantics remain ambiguous but are informational. |
| `ai-ml-engineer.toml` is 16,452 bytes, above the 16 KB dispatch ceiling | Framework-owned generated artifact attributed by `.codex/agents/.aiwg-manifest.json`; Doctor's unmanaged/project-local attribution is a false negative; avoid this agent until separate AIWG maintenance |
| Default branch `main` is absent locally | Informational for this branch/worktree unless a later delivery action assumes local `main` |
| One legacy permission source | Project-local governance warning; DEC-07 defers authorization normalization, so no migration is authorized here |
| AIWG artifact index | Rebuilt; the prior stale-by-one warning cleared |
| Doctor and status provider counts differ by one for Codex and Claude | Status includes each directory's `.aiwg-manifest.json`; Doctor reports deployable definitions. Four Claude `.soul.md` companions and four Codex-specific regeneration commands explain the provider-specific cross-count difference; no missing deployment is inferred |
| `aiwg index status` reports five graphs, four built, and no missing, orphan, or graph warning | Registry health only; unrelated to Codebase Memory source coverage |

The Codebase Memory graph and AIWG artifact index are separate systems and
their health labels are not interchangeable.

## Current disposition

1. Preserve the local runtime and all installed provider state unchanged.
2. Treat Agentmemory MCP recall as an advisory hint only.
3. Treat the CLI status, detailed-health authentication, viewer availability,
   and mixed-supervision contradictions as open Stage-A and architecture-veto
   evidence.
4. Treat Codebase Memory as structurally useful but coverage-qualified.
5. Record the full AIWG launcher/source/channel/commit tuple in the final
   receipt; no refresh or channel switch is indicated.
6. Leave all three unidentified pre-existing active sessions untouched.
7. Continue requirements, traceability, architecture, test, and risk
   preparation without changing their authority or status.
