# Iteration 4 Human Decision Packet

Status: **SUPERSEDED FOR CURRENT DECISION USE - HISTORICAL PARTIAL DECISIONS**
Date: 2026-07-27
Project: `github.com/chronodeai/agentmemory`
Candidate source:
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Phase: Elaboration remediation

Current-use notice: this historical packet contains a stale 32-parent/
120-child requirements denominator and must not be used for a new requirements
or Stage-A disposition. Its recorded historical operator decisions remain
preserved. The current successor decision surfaces are
`.aiwg/reports/iteration-5-requirements-decision-packet-2026-07-29.md` and
`.aiwg/testing/stage-a-decision-packet-iteration-5.md`.

## 1. Decision boundary

This packet presents the human decisions needed to continue the Agentmemory
fork toward a release candidate. It records only the operator's four exact
decisions below: temporary-containment acceptance, supervisor-handoff deferral,
Health Option B selection, and authorization of minimal external-model
fresh-host probes. It does not accept an ADR, baseline architecture, admit or
pass a PoC, change a risk status, pass ABM, authorize Construction, deploy the
fork, switch the local runtime, or authorize distribution.

The current local runtime is a ChronodeAi fork-derived build that retains
upstream package name, version `0.9.28`, and repository metadata. It is not the
official npm artifact. Its embedded sources, installed viewer, and package
manifest are source-consistent with commit `b17d5d2`, but exact build
provenance and byte-for-byte reproducibility remain unverified. It is also not
the current HEAD candidate. Product source and tests remain unchanged during
this Elaboration cycle.

## 2. Current gate state

| Surface | Current state | Consequence |
|---|---|---|
| Railway history | Unverified | Conditional secret-containment branch remains open |
| Architecture evolution | Review Candidate | C1-C3 are unscored; ADRs remain Proposed |
| Requirements | 120 unique child contracts | Inventory complete; human acceptance absent |
| Use-case realizations | DES-UCR-001..003 Review Candidates | Behavioral design exists and the canonical realization-to-child/TR bridge is repaired; acceptance requires the exact canonical manifest and matching passed receipt recorded at decision time |
| Traceability | Documentary mapping candidate | One canonical matrix contains the premium-rechecked realization-to-child/TR edges; the pseudo-code layer is explicitly not adopted/skipped, while live source/test backlinks, the external CBM fixture, and human Test Architect acceptance remain open |
| Risks | R-01..R-23 IDENTIFIED | No risk is mitigated, accepted, or retired |
| PoC cards | 17 P1 specification candidates | No `build-poc` execution is admitted |
| Deterministic profile | Stage-A specification packet prepared; B1/B2/execution HOLD | R-13 v3 now has a normalized atomic test contract and explicit authority matrix; all human decisions and concurrences remain open |
| Runtime containment | Accepted and reversibly applied to the exact fork-derived installed runtime; effective-hook sentinel, two-project isolation, negative injection, Health Option B, and Codex/Claude provider-native compaction passed | Existing supervisor handoff is invalidated; official rollback-artifact preparation and fresh-process authentication qualification require a new decision |
| ABM | FAIL / NO-GO | Construction remains blocked |
| Construction | Not authorized | No product implementation or deployment may begin |

## 3. Decision A - Railway history and containment

The operator must enumerate each relevant Railway account and current or
deleted project as a separate named scope. Each scope receives exactly one
answer:

- `YES`: affected first-boot generation occurred in the named scope;
- `NO`: the accountable operator or authenticated inventory establishes that
  affected first-boot generation did not occur in the named scope; or
- `UNKNOWN`: the named scope cannot yet be dispositioned.

An answer never applies to an unnamed account or project. Every omitted,
unavailable, deleted-but-unreconciled, or otherwise unenumerated scope remains
`UNKNOWN`.

Disposition:

- `YES` requires rotation of the printed HMAC secret, invalidation/removal of
  `/data/.hmac` from live and retained volumes, snapshots, archives, backups,
  and restore media, a commit-bound redeploy, proof that the old secret fails
  and the new secret succeeds, restore-rehearsal proof, and policy-governed
  restriction or purge of affected logs. Secret values must never enter this
  repository or evidence packet.
- `NO` closes only that exact named historical scope after the accountable
  denial or authenticated negative inventory is dated and attributed.
- `UNKNOWN` requires an authenticated Railway project/deployment/log inventory
  by an authorized operator. It does not authorize credential access or
  rotation by this workflow.

The prospective Railway release-readiness gate remains open for every answer
until the template, source identity, fail-closed secret handling, viewer
contract, backup/restore behavior, and R-02 evidence are separately accepted
and verified.

Decision record:

| Scope ID | Railway account locator | Current/deleted project locator | Answer | Accountable operator | Date/time | Evidence locator or redacted receipt |
|---|---|---|---|---|---|---|
| RAIL-SCOPE-001 |  |  | YES / NO / UNKNOWN |  |  |  |

- Known-account inventory source:
- Scope enumeration complete: YES / NO / UNKNOWN
- Residual unnamed or unreconciled scope: `UNKNOWN`

Account and project locators must be stable enough for an authorized reviewer
to reproduce the scope without recording credentials or secret values.

## 4. Decision B - Architecture evidence scope

The architecture review corrected the option model into four independent
axes: strict-core semantic authority, compatibility transition, evidence
placement, and generation-fenced state transition. The three configurations
remain:

| ID | Configuration | Main tradeoff |
|---|---|---|
| C1 | Direct strict cutover with embedded transactional evidence | Simplest steady state; hardest immediate client cutover |
| C2 | C1 strict core plus a bounded temporary compatibility gateway | Lower transition disruption; adds expiry, ownership, downgrade, and retirement risk |
| C3 | C2 plus an external receipt relay backed by the embedded outbox | Better audit read model; adds lag, reconciliation, retention, and operating burden |

No configuration is scoreable while a hard veto remains open. The next human
decision is therefore evidence scope, not final configuration selection.

- [ ] `AUTHORIZE EVIDENCE PREPARATION ONLY` for C1, C2, and C3, including
  versioned fixtures and case-card completion. This does not admit execution.
- [ ] `RETURN FOR REVISION` with the exact contract or option changes below.

Required comments:

- Strict-core invariants accepted for evidence design:
- Legacy client classes that may be inventoried:
- Legacy operations that may be proposed:
- Gateway owner and maximum expiry:
- Receipt-relay value hypothesis:
- Required/optional dependency classes:
- Provider acknowledgement mechanisms to investigate:
- Evidence signer and independent verifier candidates:
- Native-memory destinations, if any:
- Session, generation, and worker-supervision owner candidates:

## 4A. Decision R - Requirements and realization review

The requirements inventory contains 32 parent groups and 120 unique atomic
children. DES-UCR-001..003 exist, but none is human-accepted. The canonical
realization-to-child/TR bridge and stale realization metadata have been
documentarily repaired. This decision is eligible only when it names the exact
canonical manifest and matching passed receipt that bind those repairs at
decision time.

- [ ] `ACCEPT REQUIREMENTS BASELINE`: accept the exact frozen 120-child
  requirement set only after every named requirement owner and the Product
  Owner/Founder disposition the applicable contracts.
- [ ] `ACCEPT DES-UCR-001..003`: accept each realization separately after its
  named realization owner and independent Domain/Requirements, Security, and
  Test reviewers record their dispositions.
- [ ] `RETURN REQUIREMENTS OR REALIZATIONS FOR REVISION`: identify the exact
  child, realization section, contract, or trace edge requiring change.

An acceptance against a range, parent label, or unfrozen artifact set is
invalid. Requirements acceptance does not accept architecture, admit a test or
PoC, pass ABM, or authorize Construction.

Decision record:

- Product Owner/Founder:
- Requirements Owner:
- Named atomic-contract owners:
- DES-UCR-001 owner and reviewer dispositions:
- DES-UCR-002 owner and reviewer dispositions:
- DES-UCR-003 owner and reviewer dispositions:
- Exact manifest revision/SHA:
- Matching passed verification-receipt SHA/status:
- Decision and comments:

## 5. Decision C - R-13 Stage-A specification

The current recommendation is `PREPARED FOR HUMAN SPECIFICATION REVIEW; HOLD
B1, B2, AND EXECUTION`. R-13 v3 separates specification acceptance, disposable
mechanics preparation, execution admission, execution, evidence disposition,
and risk/gate decisions. The four proposed Node 22.23.1 and Node 24.18.0
macOS/Ubuntu profiles remain unaccepted. The implementation conformance matrix
records that current CI fails preflight before Vitest and that exact profile,
environment, source, denominator, iii, signer, cohort, replay, custody, and
independent-verifier support remains incomplete.

- [ ] `ACCEPT STAGE-A SPECIFICATION`: accept the MTP/profile/card/threshold and
  evidence-policy specification only, subject to every required concurrence.
- [ ] `REJECT STAGE-A SPECIFICATION`: return the exact contract changes below.

The named human Test Architect must also complete the corresponding decision
record in
`.aiwg/testing/deterministic-profile-acceptance-candidate.md`.

Stage-A acceptance does not authorize disposable mechanics or admit an R-13
execution. A later B1 decision must authorize exact disposable write roots,
actors, timebox, limits, stops, and cleanup. After those mechanics are frozen, a
separate B2 decision must name the exact
card/source/disposable-bundle/profile/fixture/policy digests and execution
actors.

Decision record:

- Human Test Architect:
- Configuration Manager:
- Security Architect:
- Release Owner:
- CI Owner:
- Canonical manifest revision:
- Canonical manifest SHA-256:
- Matching passed verification-receipt SHA-256:
- Matching verification status:
- Profile-registry SHA-256:
- R-13 card SHA-256:
- MTP SHA-256:
- Conformance/evidence packet SHA-256 values:
- Finding dispositions and governed references:
- Stage-A decision:
- Profile comments:
- Signer/custody comments:

The complete deterministic-profile decision record controls if this cover
record conflicts with it. A short-form response lacking the exact manifest,
matching passed receipt, required artifact hashes, finding dispositions, and
concurrences does not constitute Stage-A acceptance.

## 6. Decision D - Bounded PoC preparation and execution admission

No card is currently `READY-FOR-BOUNDED-EXECUTION`. R-13 card v3 is the current
future-admission candidate, but its Stage-A specification decision is still
open and its B1/B2 inputs are incomplete. The immediate decision for other P1
risks is whether to complete their specification and evidence inputs.
R-09 is now P1 because the candidate and installed viewer discard the
valid HTTP 503 critical-health body and can render `Unknown`; ChronodeAi
`origin/main` contains a focused, unported design input. This finding does not
authorize a cherry-pick or product change.

- [ ] `AUTHORIZE CARD INPUT COMPLETION ONLY` for all 17 P1 cards. Every P1
  risk now has a versioned specification candidate, but owner assignments,
  contracts, fixtures, profiles, signers, and independent verifiers remain
  open.
- [ ] `RETURN CARD SET FOR REVISION`.

After specification completion, each executable PoC requires:

1. a separate B1 human decision naming the exact risk ID, disposable write
   roots, preparation actors, timebox, resource ceilings, stop conditions,
   prohibited product paths, and cleanup contract; then
2. a separate B2 human decision naming the exact card version/SHA-256,
   qualification-source identity, disposable-bundle identity,
   fixture/profile/policy identities, executor, independent verifier, timebox,
   resource ceilings, stops, and cleanup contract.

A general approval does not authorize B1 or change a card to
`READY-FOR-BOUNDED-EXECUTION`.

No PoC result can accept architecture, retire a risk, pass ABM, authorize
Construction, or authorize deployment.

## 7. Decision E - Runtime containment before the next coding session

Until project scoping, freshness, service supervision, slot behavior, and
commit linkage pass a local canary:

- every executable automatic Agentmemory context-output path remains disabled
  for one named coding session and canonical project;
- explicit project-scoped recall is advisory only;
- automatic native-memory synchronization remains disabled;
- Codebase Memory, live source, tests, commits, and accepted ADRs remain above
  Agentmemory recall in the evidence hierarchy; and
- the exact installed fork-derived runtime remains the temporary containment
  subject, but no verified official-upstream rollback control currently exists.

The installed `SessionStart` and `PreToolUse` scripts honor
`AGENTMEMORY_INJECT_CONTEXT=false`, but the installed `PreCompact` script
unconditionally requests `/agentmemory/context` and writes returned context to
stdout. The current HEAD candidate adds a flag guard, but that HEAD is not
deployed. The installed subject is an earlier fork-derived build. Setting the
environment flag alone therefore did not establish containment on that
runtime.

The proposed temporary contract is:

> For one named coding session and canonical project, temporary containment
> requires zero executable automatic Agentmemory context-output paths across
> every effective host hook source. Explicit recall is permitted only through
> MCP with exact `project` and `scope=project`; global scope is prohibited and
> all recalled content remains advisory. The containment profile may disable
> automatic capture and must record that consequence. Any failed probe blocks
> the session. This is reversible operator configuration only and does not
> establish project-aware product enforcement, persistent supervision,
> architecture acceptance, or Construction authority.

Acceptance authorizes only the following bounded preparation and proof:

1. Inventory the effective plugin, generated, user-global, and project-local
   hook sources and identify which source the host actually loads.
2. Set `AGENTMEMORY_INJECT_CONTEXT=false` for the exclusive session and replace
   every still-effective Agentmemory `PreCompact` context-output entry with a
   reversible no-op. If the effective configuration is user-global, no
   concurrent Codex or Claude coding session may run under it.
3. Against a disposable sentinel service, trigger `SessionStart`,
   `PreToolUse`, and `PreCompact`; require zero stdout bytes and zero
   `/agentmemory/enrich` or `/agentmemory/context` requests. A bounded session
   registration request is allowed only if the accepted profile retains
   capture.
4. Under the same profile, require a non-error explicit MCP recall using the
   exact canonical project and `scope=project`, followed by a two-project A/B
   canary with zero project-B results and no global fallback.
5. Start a fresh host task from the target checkout, trigger session start, one
   file read, and compaction, and require an effective-hook transcript with
   zero Agentmemory stdout payload.
6. Run one exclusive ten-minute health smoke sampled every 30 seconds. Stop on
   worker disconnect, circuit state other than closed, a new alert, heap at or
   above 90% for three consecutive samples, or RSS growth above 64 MiB. These
   are temporary operator ceilings, not accepted architecture thresholds.

The operator record must identify any capture or lifecycle events disabled by
the temporary profile. Permanent project/task-aware selection, deployment of
the candidate `PreCompact` guard, and governed host-level negative-injection
tests remain Construction work.

- [x] `ACCEPT TEMPORARY CONTAINMENT`.
- [ ] `RETURN FOR REVISION`.

Recorded operator decision:

> ACCEPT temporary containment.
> DEFER upstream supervisor handoff until containment probes pass.
>
> SELECT HEALTH OPTION B.
> AUTHORIZE MINIMAL EXTERNAL-MODEL FRESH-HOST PROBES.

The reversible profile was applied beginning `2026-07-27T02:36:10Z`. The
effective-hook sentinel and two-project MCP isolation probe passed. The
original ten-minute health smoke failed after 17 of 21 samples on its
three-consecutive-ratio stop condition. A later whole-runtime diagnostic
stopped safely after service degradation and a new alert; it has no
qualification effect. The subsequently authorized Option B gate passed all 21
samples over ten minutes.

The earlier fresh Codex and Claude attempts completed scoped capture and
negative-injection checks but failed provider-native compaction for unrelated
MCP startup, workspace trust, and provider-budget reasons. Those attempts
remain non-qualifying.

The authorized rerun passed both provider compaction gates. Final Codex
requested/configured `gpt-5.6-sol`, used apps disabled and zero MCP
servers/tools, dispatched one contained manual PreCompact, and persisted one
native compaction. Provider-observed model identity remains unavailable. Final
Claude loaded no setting sources, plugins, tools, or MCP servers, dispatched
one contained manual PreCompact, and persisted a successful compact boundary.
A live sentinel observed zero provider requests, including zero
`/agentmemory/context` and zero `/agentmemory/enrich` requests. Containment
remains applied. The next coding session remains blocked on corrected runtime
provenance, rollback preparation, authentication qualification, and a new
supervisor decision. The canonical record is
`.aiwg/reports/iteration-4-containment-execution-2026-07-27.md`.

The health evidence showed that worker `heapUsed / heapTotal` alone is not a
specific whole-runtime pressure signal because V8 resized `heapTotal`, while
the endpoint excluded the separate `iii` process. This finding does not waive
the failed rule. Select exactly one next path:

- [ ] `SELECT HEALTH OPTION A`: retain the original ratio-only temporary
  ceiling and require a complete passing rerun.
- [x] `SELECT HEALTH OPTION B`: use the proposed 21-sample compound
  whole-runtime temporary gate with fixed worker and `iii` PIDs, exact
  service/dependency/alert checks, and bounded RSS/CPU/heap-used growth. This
  option was selected and passed 21 of 21 samples from
  `2026-07-27T15:04:39.689Z` through `2026-07-27T15:14:39.707Z`.
- [ ] `SELECT HEALTH OPTION C`: keep the next session blocked until governed
  fork instrumentation is admitted, implemented, and accepted.

Fresh-host data-transfer decision:

- [x] `AUTHORIZE MINIMAL EXTERNAL-MODEL FRESH-HOST PROBES`: authorize separate
  synthetic Codex and Claude probes under exclusive contained configuration.
- [ ] `REQUIRE FULLY LOCAL FRESH-HOST PROBES`: first freeze a local route,
  disable automatic compression/provider fallback, and prove zero external
  attempts.

Health Option B and the minimal external-model route were selected. Option B
and provider-native compaction passed for the exact installed artifact. The
containment operation did not deploy a runtime, but a fork-derived build had
already been installed in place before this cycle.

The existing LaunchAgent was healthy on 2026-07-22, but its plist is currently
unloaded and the live `0.9.28` worker is terminal-attached. The plist targets
the same fork-derived global package. Bootstrapping it would not restore
official upstream. Any future supervision change is governed by the
invalidated design input in
`.aiwg/deployment/upstream-runtime-supervisor-handoff.md`.

The post-probe direct host-network refresh returned healthy CLI and REST
status, viewer `GET /` HTTP 200 with 200275 bytes, and 9 of 10 Doctor
capabilities. The viewer result proves route response only, not browser
rendering correctness. The sole disabled Doctor capability was automatic
in-conversation context injection, as intended. Option B establishes one
point-in-time ten-minute whole-runtime gate; it does not establish restart
recovery, sustained-load safety, authenticated slot behavior, scoped counter
consistency, official rollback readiness, or current-HEAD candidate behavior.

- [x] `DEFER UPSTREAM SUPERVISOR HANDOFF`: leave the working terminal process
  untouched. This remains the controlling operator decision.

The prior `AUTHORIZE UPSTREAM SUPERVISOR HANDOFF` option is withdrawn because
the named upstream subject does not exist. Containment probes passing does not
remove this provenance block.

- [ ] `AUTHORIZE OFFICIAL ROLLBACK ARTIFACT PREPARATION ONLY`: permit
  installation of the registry-verified official npm `0.9.28` artifact under
  an isolated immutable prefix, preparation of a separate plist, and
  non-disruptive authentication/connector qualification. This does not stop
  the live worker, bootstrap a service, run a restart rehearsal, or activate
  the current HEAD candidate.
- [ ] `RETURN RUNTIME RECOVERY DESIGN FOR REVISION`.

After that preparation passes, a successor decision must name exact artifact,
plist, configuration, authentication-preflight, and rollback hashes before a
controlled interruption can be authorized. See
`.aiwg/reports/installed-runtime-provenance-correction-2026-07-27.md`.

## 8. Decision F - AIWG authorization normalization

AIWG Doctor reports one legacy permission source in this isolated worktree.
The read-only steward migration preview would normalize it to four
permissions, one role, and one assignment under default deny. No authorization
policy was changed.

- [ ] `AUTHORIZE AIWG AUTHORIZATION NORMALIZATION`: permit the project-local
  steward migration, retain its backup, verify the exact before/after policy,
  prove no permission broadening, rerun Doctor and the project index, and
  rollback on any mismatch.
- [ ] `DEFER AIWG AUTHORIZATION NORMALIZATION`: leave the legacy source and
  Doctor warning unchanged.

This is an AIWG project-governance mutation. It does not accept Agentmemory
architecture, admit a PoC, authorize Construction, or deploy a runtime.

## 9. Later decisions that cannot be combined

After the admitted evidence cycle:

1. Human requirement owners disposition the exact frozen atomic contracts, and
   named realization owners separately accept or reject DES-UCR-001..003.
2. Human architecture owners select a configuration and explicitly accept or
   reject each Proposed ADR.
3. The Software Architecture Document is separately baselined.
4. The Test Architect records the Stage-A MTP/profile/R-13 specification
   decision with Configuration Manager, Security Architect, and Release Owner
   concurrences.
5. A separate human B1 decision authorizes or rejects one exact disposable PoC
   mechanics scope; no product, CI, or release-harness change is included.
6. After B1 mechanics are frozen, a separate human B2 decision admits or
   rejects the exact R-13 card/source/disposable-bundle/fixture/policy set.
7. After execution, the Test Architect and independent verifier record Stage-D
   evidence dispositions.
8. The accountable risk owner records any Stage-E risk disposition.
9. An independent reviewer reruns the Elaboration ABM gate against one frozen
   revision.
10. An ABM PASS establishes gate readiness only.
11. A separate human decision explicitly authorizes or denies Construction.
12. Construction changes are implemented and verified in an isolated branch.
13. A separate decision prepares and qualifies an official upstream rollback
    artifact without interrupting the live fork-derived runtime.
14. A successor decision authorizes any supervisor handoff.
15. A separate local-canary decision authorizes side-by-side installation of
    the current HEAD candidate.
16. A separate release and distribution decision authorizes publication.
17. Memetics and broad rollout each require their own canary and admission
    decisions.

## 10. Consolidated response template

The decision owner may respond with:

```text
Railway scoped history:
- Scope ID:
  Account locator:
  Current/deleted project locator:
  Answer: YES | NO | UNKNOWN
  Evidence locator:
Known-account inventory source:
Scope enumeration complete: YES | NO | UNKNOWN
Residual unnamed or unreconciled scope: UNKNOWN

Architecture evidence preparation: AUTHORIZE | RETURN
Requirements baseline: ACCEPT | RETURN
DES-UCR-001: ACCEPT | RETURN
DES-UCR-002: ACCEPT | RETURN
DES-UCR-003: ACCEPT | RETURN
R-13 Stage-A specification: ACCEPT | REJECT
PoC card input completion: AUTHORIZE | RETURN
Temporary runtime containment: ACCEPTED
Health qualification option: A | B | C
Fresh-host route: AUTHORIZE EXTERNAL-MODEL | REQUIRE FULLY LOCAL
Containment qualification: PASSED - PROVIDER COMPACTION PROVEN
Installed runtime provenance: FORK-DERIVED - NOT OFFICIAL NPM
Official rollback artifact preparation: AUTHORIZE | RETURN
Supervisor handoff: BLOCKED - SUCCESSOR DECISION REQUIRED
AIWG authorization normalization: AUTHORIZE | DEFER

Named owners:
Requirements and realization comments:
Architecture comments:
Profile comments:
PoC comments:
Runtime handoff comments:
AIWG authorization comments:
```

Any omitted field remains undecided. No decision in this packet implies
Construction or deployment authority.
