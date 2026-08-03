# Agentmemory 0.9.28 Local Release-Candidate QA Addendum

Status: **ENGINEERING RELEASE CANDIDATE READY - LIFECYCLE AUTHORITY UNCHANGED**

Date: 2026-08-03
Project: `github.com/chronodeai/agentmemory`
Branch: `codex/agentmemory-elab-r29`
HEAD: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Version: `0.9.28`

## Authority boundary

This addendum records ordinary local application-development and QA evidence.
It does not accept requirements, realizations, ADRs, architecture, risks, or a
test profile. It does not execute B1 or B2, pass ABM, authorize Construction,
install globally, replace a supervisor, deploy, publish, release, or roll out
Agentmemory.

The current authority remains exactly as recorded in
`current-lifecycle-authority.json`: Stage A is accepted for the R-13 local
macOS specification only; B1 is eligible for a separate decision but was not
executed; B2 is blocked; architecture is unaccepted; ABM remains FAIL / NO-GO;
and Construction is unauthorized.

## Candidate package

Two independent `npm pack --ignore-scripts` runs produced byte-identical
archives:

| Item | Evidence |
|---|---|
| Archive A | `/private/tmp/agentmemory-pack-final-r54-a/agentmemory-agentmemory-0.9.28.tgz` |
| Archive B | `/private/tmp/agentmemory-pack-final-r54-b/agentmemory-agentmemory-0.9.28.tgz` |
| SHA-256 | `f69b33cecde5dbe3811b9c3fc2d0381ea16fe4cf965e921163bc173826f9ea2c` |
| Package files | 175 |
| Version smoke | `0.9.28` |
| Content audit | No `.git`, `.aiwg`, `node_modules`, tests, receipts, runtime secret files, private user paths, disposable paths, or synthetic test values |

The unpacked package passed top-level CLI help and public migration-help smoke tests.
Migration help exposes secret-file authentication, resume/rollback, and
project-alias controls.

## Deterministic verification

| Check | Result |
|---|---|
| Build | PASS under Node `v24.16.0` and npm `11.13.0` |
| Unit suite | 149 files and 1,622 tests passed |
| R-13 tracked denominator | 150/150 files observed; none missing, extra, or skipped |
| R-13 filename manifest | `4bcec80340bf59e048eff765ae48760a5a6ac71dca218672bfbd216cd5808d25` |
| R-13 content manifest | `9ea2bed20540bad4e6744bc75891922722da1f28991d582e5b0ab500f5463ccf` |
| Mandatory auth tests | Present |
| iii binary | `0.11.2`, SHA-256 `341d45266f39ed78e30d4b3d74730662fe97e7706e1a23a5c877646462215ca8`, verified |
| Interface inventory | 136 routes, 135 protected, 1 public, 0 missing-auth; 59 tools, 5 resources, 3 prompts, 13 hook entrypoints; SHA-256 `5f7925f7982b56579fcd1f2b41c6ae53af8d34cdf2b4e33e508b78fd18a70cb7` |
| Skill lint | 15 skills passed |

The last pre-addendum R-13 control run passed provisionally with only the
`dirty-source` waiver. Adding this report and its UI screenshot necessarily
changes the checkout fingerprint, so that earlier receipt is not presented as
the final source-linked receipt. The final post-addendum R-13 receipt is emitted
outside the checkout and named in the delivery handoff. This avoids modifying
the source after the receipt is created.

## AIWG readiness

`aiwg status --probe --json` reported this workspace engaged, ready, and
healthy with one framework and two detected provider deployments. After
rebuilding the stale project artifact index, `aiwg doctor --verbose` exited
successfully with 25 passing checks and three warnings. The remaining warnings
are outside this Agentmemory package candidate: the external AIWG fork cannot
currently resolve the known `aiwg-doctor` kernel skill through `aiwg show`, the
delivery policy's `main` branch is not present locally, and one legacy
permission source remains for a later steward audit.

The live deployment inventory also needs a later AIWG steward reconciliation:
`.aiwg/aiwg.config` and generated context name `codex` and `claude`, while the
probe detects `universal` and `copilot`, and Doctor reports no Claude agents
deployed. This does not affect the independently packaged Agentmemory plugins,
but it is not represented as successful Codex/Claude AIWG deployment.

## End-to-end local behavior

| Surface | Observed result |
|---|---|
| CLI | Version, help, status, doctor, connect dry-run, and migration help completed |
| Doctor | `2/2 required passing`; seven disabled optional capabilities reported as optional rather than failures |
| Liveness | Public `/agentmemory/livez` returned `200` and `status=ok` |
| Detailed health | Unauthenticated request returned `401`; authenticated request returned `200`, `healthy`, circuit closed |
| Viewer | Reached `LIVE`; health rendered `healthy`, not `unknown`; screenshot: `evidence/agentmemory-rc-ui-health-2026-08-03.png`, SHA-256 `22fc0937ffab0e8085db64c99304e1afe4b8bef9381527d95e0634343e37dc52` |
| Local access | `.env` and three credential files were `0600`; configuration contained file keys rather than raw values |
| Persistence | Three `/tmp/agentmemory-demo` sessions and one `github.com/example/legacy` session survived restart |
| Slots | Disabled slot listing returned typed `503 Memory slots not enabled`, replacing the earlier internal-server response |
| Snapshot/restore | Create and restore succeeded; exported persisted state matched exactly after excluding only the expected changing `exportedAt` field |
| Migration | Public CLI secret-file dry-run succeeded with zero ambiguous records |
| MCP discovery | Packaged stdio handshake returned all 59 server tools with no local fallback |
| MCP project scope | Packaged `memory_sessions` call succeeded for an exact canonical project using secret-file capability authentication |
| Process lifecycle | Packaged `stop` terminated the worker and iii-engine, removed PID/state control files, and left no listeners on the isolated port quartet |
| Codex MCP | Current-user `agentmemory` MCP entry is enabled and uses redacted secret-file configuration |
| Codex plugin | `agentmemory@agentmemory` 0.9.28 is installed but disabled; no global state was changed in this QA cycle |

## Defects found during package QA

### MCP discovery degradation

The first package-level MCP handshake reached the server but received `401` on
`/agentmemory/mcp/tools`, then silently exposed the seven-tool local fallback.
The proxy was using the legacy project credential for server-wide discovery
instead of the administrative secret file.

The candidate now:

1. uses administrative authentication for server-wide MCP tool discovery;
2. loads that credential through the existing direct-or-secret-file resolver;
3. surfaces errors from a reachable server instead of silently writing to or
   listing ephemeral local fallback state; and
4. retains the seven-tool fallback only when the initial liveness probe shows
   that no server is reachable.

Regression tests cover administrative secret-file discovery, authorization
failure disclosure, and reachable-server failure behavior. The corrected
unpacked package returned 59 tools and completed a project-scoped call without
fallback.

### Retrieval-mode startup message

The source-freeze audit found that zero-LLM startup always claimed
`BM25 + on-device embeddings`, even though an unconfigured embedding provider
correctly produces BM25-only behavior everywhere else. Startup now derives its
retrieval description from the actual embedding configuration. A regression
test covers both BM25-only and explicitly configured local-embedding modes. The
rebuilt package's startup, status, Doctor, and viewer now agree on BM25-only
operation for the default local profile.

### Provider plugin metadata drift

The package audit found that the Claude and Codex plugin manifests still
advertised eight skills, and the Codex manifest plus OpenCode/install guidance
still advertised 58 tools. The archive actually contains 15 usable skills and
the server exposes 59 tools.

All provider-facing package metadata now reports 59 tools and 15 skills while
retaining the provider-specific hook counts. The consistency suite now checks
the root, Claude, Codex, OpenCode, and installation surfaces against the live
registry and skill directory, preventing another silent count drift.

## Nonqualifying observations

- The worktree is intentionally dirty, so R-13 can produce only a provisional
  result until the exact candidate is committed.
- A disposable first-run package launch entered the pinned iii acquisition
  path. The resulting binary matched the independently verified iii SHA-256,
  but that acquisition is excluded from qualifying evidence because external
  acquisition was outside this local-only QA scope. Final package tests reused
  the already verified local binary.
- The current-user Codex plugin remains disabled. MCP access is enabled, but
  plugin skills and hooks require a later explicit global activation decision.
- Optional LLM, embeddings, graph extraction, consolidation, compression, and
  automatic context injection were intentionally off. The zero-LLM local core
  is healthy; provider-enabled behavior is not claimed by this run.
- No global installation, supervisor replacement, production data access,
  deployment, publication, release, or rollout occurred.

## Operator checklist

1. Verify the selected archive against SHA-256
   `f69b33cecde5dbe3811b9c3fc2d0381ea16fe4cf965e921163bc173826f9ea2c`.
2. Commit the exact candidate before any governed qualification so the
   `dirty-source` waiver can be removed.
3. Stage the archive side by side; do not overwrite an active installation.
4. Supply legacy, administrative, and project-capability credentials through
   `0600` files and keep strict capability mode enabled.
5. Run `agentmemory doctor --dry-run`, `agentmemory status`, public liveness,
   authenticated health, viewer, MCP 59-tool discovery, and one project-scoped
   read against the staged instance.
6. Decide whether to enable the installed Codex plugin. If enabled, keep one
   Agentmemory skill surface and verify registry, hooks, and invocation before
   removing any duplicate manual copies.
7. Re-run the migration dry-run, create and read back a snapshot, rehearse
   restore, and retain the exact pre-switch rollback subject.
8. Rotate any credential previously exposed in terminal output if it remains
   active. Do not reproduce the value in logs or evidence.
9. Resolve or explicitly disposition the three external AIWG Doctor warnings,
   then reconcile the configured `codex`/`claude` deployments with the live
   `universal`/`copilot` inventory before using AIWG as governed admission
   evidence.
10. Obtain separate lifecycle authority before global installation, supervisor
   handoff, canary admission, deployment, release, or rollout.
