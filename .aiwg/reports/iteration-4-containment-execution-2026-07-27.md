# Iteration 4 Temporary Containment Execution

Status: **CONTAINMENT APPLIED - QUALIFICATION PASSED FOR FORK-DERIVED INSTALLED SUBJECT**

Date: 2026-07-27
Project: `github.com/chronodeai/agentmemory`
Product source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Installed runtime: ChronodeAi fork-derived and source-consistent with commit
`b17d5d21c12e389f060c5848053df20f5ee69a82`, upstream-labelled
`@agentmemory/agentmemory@0.9.28`, and not official npm; exact build receipt,
artifact-to-commit binding, registry binding, and byte-for-byte
reproducibility remain unverified
Current HEAD ChronodeAi candidate deployed: **NO**
Earlier ChronodeAi fork build deployed in place: **YES, BEFORE THIS OPERATION**

Runtime attribution in the original execution record was corrected on
2026-07-27 by
`.aiwg/reports/installed-runtime-provenance-correction-2026-07-27.md`.
Containment results remain valid for the exact installed bytes, but they are
not official-upstream or current-HEAD candidate evidence.

## Human authority

The operator recorded exactly:

> ACCEPT temporary containment.
> DEFER upstream supervisor handoff until containment probes pass.
>
> SELECT HEALTH OPTION B.
> AUTHORIZE MINIMAL EXTERNAL-MODEL FRESH-HOST PROBES.

This authorized reversible user-configuration containment, the Option B
temporary health rule, and minimal synthetic external-model fresh-host probes.
It did not authorize supervisor mutation, product code, product tests, a PoC,
architecture acceptance, risk disposition, ABM passage, Construction, canary,
deployment, release, or rollout.

## Applied containment

Beginning `2026-07-27T02:36:10Z`, the operator profile:

- set `AGENTMEMORY_INJECT_CONTEXT=false`;
- disabled the Codex and Claude Agentmemory plugins;
- retained direct Codex and Claude capture hooks;
- replaced each direct Agentmemory `PreCompact` entry with `/usr/bin/true`;
- retained explicit MCP recall, restricted by procedure to exact
  `project` plus `scope=project`; and
- left the running service and unloaded LaunchAgent untouched.

The reversible backup is
`/Users/base/.agentmemory/containment-backups/20260727T023610Z`.
The directory mode is `0700`; each backup file mode is `0600`. The working
evidence records before/after hashes and confirms that unrelated configuration
was preserved.

The profile intentionally removes plugin duplicate capture and disables
automatic SessionStart, PreToolUse, and PreCompact context output. It also
disables any pre-compaction capture or native-memory bridge work performed only
by the neutralized `PreCompact` script. Other direct capture hooks remain
configured. Fresh-host capture and negative-injection behavior is now
qualified, including provider-native compaction dispatch.

## Probe disposition

| Probe | Result | Evidence meaning |
|---|---|---|
| Effective-hook sentinel | PASS | SessionStart, PreToolUse, and contained PreCompact emitted zero stdout/stderr; zero `/context` and `/enrich` requests |
| Raw installed PreCompact positive control | PASS | The detector observed the exact flag-bypass request and 39-byte marker from the fork-derived installed artifact against a disposable sentinel |
| Two-project MCP isolation | PASS | Zero cross-project results; omitted project failed closed; both synthetic records were deleted and cleanup verified |
| Health Option B | PASS | 21 of 21 samples completed over ten minutes with fixed worker and engine PIDs, zero gate failures, healthy service/dependencies, no alerts, and negative combined RSS growth |
| Fresh Codex host | PASS | App-disabled session requested/configured for `gpt-5.6-sol` used zero MCP servers/tools, dispatched one manual contained PreCompact, persisted native compaction, and issued zero sentinel requests; provider-observed model identity remains unavailable |
| Fresh Claude host | PASS | No-settings/no-MCP session dispatched one manual contained PreCompact, persisted a successful native compact boundary, and issued zero sentinel requests |
| Original ten-minute health smoke | FAIL | Stopped after 17 of 21 samples on three consecutive heap-ratio readings at or above 90% |
| Supplemental whole-runtime diagnostic | STOPPED SAFELY; NO QUALIFICATION EFFECT | Reproduced ratio ambiguity, then observed service degradation and a new compound alert; stopped after 8 of 21 samples |
| Post-probe Doctor/runtime/viewer snapshot | HEALTHY SERVICE WITH INTENTIONAL EXCEPTION | CLI and REST report healthy, viewer `GET /` returns HTTP 200 and 200275 bytes, and Doctor reports 9 of 10 with automatic context injection intentionally disabled; route response does not prove browser-rendering correctness |

The original health stop was honored and is not waived. Its final three
worker-heap ratios were `95.76%`, `94.66%`, and `94.83%`; maximum ratio was
`97.18%`. Worker RSS ended `46,497,792` bytes below baseline and never grew
more than `12,025,856` bytes above baseline. Worker connection, circuit, KV,
and service state remained healthy during that run.

The supplemental diagnostic fixed worker PID `38396` and `iii` PID `32483`.
Combined RSS increased from `1,217,445,888` to `1,229,930,496` bytes over eight
samples. The worker-only heap ratio reached `96.73%`; the run later stopped on
service/health degradation and a new alert when the worker crossed the
installed compound threshold. The service recovered without intervention.

These observations support two bounded conclusions:

1. `heapUsed / heapTotal` alone is not a specific whole-runtime pressure
   signal because V8 dynamically resized `heapTotal`.
2. The installed health endpoint excludes the separate `iii` process, so a
   worker-only ratio cannot qualify total Agentmemory runtime pressure.

They do not prove the runtime is safe under sustained load or select a
permanent architecture.

The selected compound Option B gate then completed from
`2026-07-27T15:04:39.689Z` through `2026-07-27T15:14:39.707Z`. All 21
30-second samples passed. Combined RSS fell by `36,421,632` bytes, worker RSS
fell by `38,862,848` bytes, engine RSS increased by `2,441,216` bytes, and
endpoint heap used fell by `25,872,280` bytes. Maximum worker and engine CPU
were `0.2%` and `0.1%`. Heap occupancy reached `97.46%`, but occupancy alone
was explicitly non-failing under Option B.

The earlier shared request sentinel recorded 27 requests, all scoped to
`github.com/chronodeai/agentmemory`, with zero `/agentmemory/context` and zero
`/agentmemory/enrich` calls. Codex persisted one read and no compaction event.
Claude persisted one Read but exceeded its nominal USD 1 probe cap after
loading 239,711 cache-creation input tokens; the provider reported USD
1.439607 and stopped before the final marker.

The Codex harness also triggered an unrequested standalone CLI update from
`0.144.4` to `0.145.0`. Later probes disabled startup update checks. This did
not modify Agentmemory or the supervisor. The Claude interactive compaction
probe encountered workspace trust before PreCompact dispatch. Neither earlier
harness failure is counted as passing compaction evidence.

The Revision 15 rerun isolated the provider compaction paths from those
failures. The final Codex run disabled apps and exposed zero MCP servers and
zero MCP tools. It recorded one manual `PreCompact`, two successful hook
completions, one persisted `compacted` record, and one
`context_compacted` event. The final Claude run loaded no setting sources,
plugins, tools, or MCP servers. It recorded one manual `PreCompact` and a
successful compact boundary from 6,752 to 447 tokens.

The Revision 15 sentinel was live for both qualifying provider windows and
recorded zero provider requests, including zero `/agentmemory/context` and
zero `/agentmemory/enrich` requests. One operator liveness request is recorded
separately. The disposable sentinels were stopped after evidence capture.

## Risk reconciliation

No new canonical risk is required while this remains a one-session reversible
operator control. The evidence strengthens R-07, R-08, and R-23 directly, and
also informs R-17, R-02, and R-11. No score, priority, owner, status, or
retirement disposition changed. Accountable-owner calibration remains open.

## Remaining human decision

The provider-native compaction prerequisites are passed for the exact installed
artifact. The prior supervisor choice is invalidated because the existing
plist targets that same fork-derived package rather than official upstream.
The next human decision is:

1. Authorize or return isolated official-upstream rollback-artifact
   preparation and fresh-process authentication qualification.

The supervisor deferral remains controlling. No process restart, LaunchAgent
operation, or runtime rollback was performed. A successor supervisor decision
cannot be requested until rollback and authentication preparation passes.

## Evidence binding

Initial containment and diagnostic evidence remains under
`.aiwg/working/containment/20260727T023610Z/`. The later qualification evidence
remains under `.aiwg/working/containment/20260727T150359Z/`. The passing
provider-native qualification is under
`.aiwg/working/containment/20260727T172316Z/`. These locations contain working
evidence and provide neither independent custody nor qualifying PoC evidence.

| Evidence | SHA-256 |
|---|---|
| `containment-result.json` | `341656cb62ae67d5beaa54d3bb54afcb2a3a38858330dee4e5cb67f3b426269a` |
| `containment-report.md` | `8d43c4706288c20b56b5eef95508d32e99a43837029a724cf3618553e33ddc65` |
| `agentmemory-containment-effective-20260727T023610Z.jsonl` | `2bce2e66de4da976a91f5be12b3797ba0296bcd86121ef80a33158fbfd3245db` |
| `agentmemory-containment-control-20260727T023610Z.jsonl` | `3c3c7ca544e837a784df497456485d36710d0cdba903bfaea00c774a4d1baaa9` |
| `health-samples.jsonl` | `54f3d08a09feaaecf6bb788b29700f64443b12a5902c019ce0d1c937313ed570` |
| `health-summary.json` | `d58307756c0e5dbf4f51cc6135d3612ae9d2f935b0ca2c35a8cdfcd16519c469` |
| `whole-runtime-samples.jsonl` | `d28e0773603cbf6fae997aaf2b0a0193053337615f93dc7956506f2a892da330` |
| `whole-runtime-summary.json` | `626a8dc306c804a21a0c50d6ac0fe88aecec34f4668ec60b0917582ca85f1955` |
| `post-alert-recovery.json` | `ab55680d17b14ccbf792888f33b6b28f228ea62c1da771743aa70432fe747729` |
| `heap-pressure-diagnostic-20260727.md` | `ad128f518fc4ffc8d2beee36991a31e321423c89614dec687e8e72c55ed55837` |
| `health-qualification-options-20260727.json` | `e928aea0dcdeab9aea94415fa8008b8c6130cda5e041446d95e8417f050d379f` |
| `20260727T150359Z/containment-qualification-result.json` | `9158802d4e5fb748b571d44b5c23c49d0afcf95b6958cdb6a0db8801a9aa9289` |
| `20260727T150359Z/containment-qualification-report.md` | `ad2c3774df345c1bca6cfc23149e9546575d74badc30aefd27d1849018520316` |
| `20260727T150359Z/sentinel-requests.jsonl` | `94956fa7dc450b229eb3160b61135d27e5fb1d554e8a8b73d0612d1b24c5eb13` |
| `20260727T150359Z/option-b-health/option-b-health-samples.jsonl` | `94595c113d348a8390a39a47f6285def77120aef5aa6d3e129021cee48eb63cc` |
| `20260727T150359Z/option-b-health/option-b-health-summary.json` | `b35d72e1d047b7fa4daef48fbd36a5b0dbabb2dc7aff7dee62ee8b449eb70254` |
| Codex fresh-host rollout | `bb7a536f6e612a8474b1977b336a2b757aa7aeb3f16afbf1cfc38b17e6d01ac3` |
| Claude fresh-host session | `c61a8c68867f31dd2f612bcc022e2795a0e7111d6cd4231255df1e783f12cae8` |
| `20260727T172316Z/codex-final-precompact-events.jsonl` | `31ca4f03ccb68c21d8a3bf8adaaaa4a49c86c1257efb3e9ec0538213b3753056` |
| `20260727T172316Z/claude-qualified-precompact-events.jsonl` | `e2be003de46b98a10f24d8eaa3ab6418ae90efd049a51b9589f0f60d6013deba` |
| `20260727T172316Z/claude-qualified-compact.stream.jsonl` | `5142c83d828b57889e19c9ef4d930c088c7728823e8ffb8a0eac2b50dcd7cfb1` |
| `20260727T172316Z/sentinel-requests.jsonl` | `114fb3e01c88c62e99e4e4061c078896a92022401394e0a25ee35a7a61a62653` |
| `20260727T172316Z/codex-final-compaction-proof.json` | `e11bffdd02e6c269fd329af90e74f2cb1981176824e3808f3ffb76ecc42c701a` |
| `20260727T172316Z/post-probe-health.json` | `fa3afd6d13a91b7fa48132ad8479064e2d43cc1c2cf2ef478a62f0abd8953273` |
| `20260727T172316Z/containment-qualification-result.json` | `058f775da6f4ef7cfb4b28aa50f1878b9c9e4969b0300216559b70ae11b4e039` |
| `20260727T172316Z/containment-qualification-report.md` | `a22b422dea841e81d6c355d0b6969444aa85115128e2587ebadd8c3fb5a1b182` |

## Decision boundary

This record supersedes its prior Revision 14 bytes only for the
runtime-containment status it documents. Earlier manifests remain historical
byte-integrity snapshots. This record does not accept evidence, retire or
mitigate a risk, accept an ADR, baseline architecture or requirements, pass
ABM, authorize Construction, deploy the fork, or admit any canary, release, or
rollout.
