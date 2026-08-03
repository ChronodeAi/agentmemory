# Iteration Plan 004: Final Agentmemory Optimization and Local Canary

Status: Prepared; ABM NO-GO remains in force
Phase: Elaboration remediation
Planning baseline: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Branch: `codex/agentmemory-elab-iter2`
Master session:
`aiwg-iteration-dual-track-elaboration-iter4-2026-07-26-1235`
Current local reconciliation session:
`aiwg-iteration-dual-track-elaboration-iter4-2026-07-28-1805`
Current disposition/freeze session:
`aiwg-iteration-dual-track-elaboration-iter4-2026-07-28-1910`

## Goal

Produce a human-reviewable, evidence-backed ChronodeAi Agentmemory release
candidate, obtain the required architecture, test, ABM, and separate
Construction decisions, then install a rollback-safe side-by-side local canary
whose CLI, persistent service, plugins, API, viewer, and health checks are
ready for the next coding session.

## Governing boundaries

- The ABM FAIL / NO-GO in
  `.aiwg/reports/gate-validation-abm-2026-07-25.md` remains authoritative until
  an independent gate rerun says otherwise.
- Agent reviews cannot accept ADRs, baseline the SAD, accept the Master Test
  Plan, retire risks, authorize Construction, or authorize rollout.
- Before Construction authorization, product-code changes are limited to
  named, disposable, bounded PoCs for P0/P1 hypotheses. Documentation,
  evidence, and test-harness work must not be represented as product
  implementation authorization.
- The live runtime is an earlier fork-derived, upstream-labelled `0.9.28`
  build installed in place. No official-upstream rollback runtime is currently
  installed. A registry-verified official artifact must be prepared under an
  isolated prefix before any service switch.
- Production memory, Memetics data, Railway services, provider homes, and
  broad agent deployments remain untouched until their named authorization
  gates pass.
- Memory and agent summaries are advisory. Live source, tests, immutable
  receipts, commits, and human-accepted decisions are authoritative.

## Current state

- Candidate controls are implemented and pushed at `0e9af82`.
- The clean committed R-13 candidate ran all 148 governed test files and 1,629
  tests with one worker, but remains a provisional mechanics result. The 1,629
  count has no accepted assertion-identity manifest, accepted Node/OS profiles
  and iii provenance remain open, and current CI omits the mandatory synthetic
  project-capability input, so it fails R-13 preflight before Vitest.
- The SAD is Draft, ADR-001 through ADR-004 are Proposed, the requirements
  traceability matrix is Draft, and the Master Test Plan lacks Test Architect
  acceptance.
- All 23 risks remain IDENTIFIED: 17 P1, 5 P2, and 1 P3. Candidate controls are
  not risk retirement.
- R-09 is now P1 after confirming that the candidate and installed viewer
  discard the valid HTTP 503 body used for critical health and can render
  `Unknown`. ChronodeAi `origin/main` commit `a8e7d19` contains a focused
  unported repair; it is design evidence only until Construction is separately
  authorized.
- The installed live runtime is a ChronodeAi-derived `0.9.28` build whose 178
  embedded repository sources, installed viewer, and package manifest match
  commit `b17d5d2`. It is source-consistent with that tree, but exact build
  provenance and byte-for-byte reproducibility remain unverified. It is not
  the official npm artifact or the current HEAD candidate.
- The viewer currently depends on a manually started foreground process
  because `com.agentmemory.server` is not loaded. The existing plist targets
  the same fork-derived package and cannot serve as an upstream handoff.
- No local Railway CLI, Railway environment variables, or local Railway
  configuration were found. Remote deployment history remains unverified.
- The operator selected `deployment_target=local-macos`, accepted the local
  development route and exact Stage-A profile denominator, selected
  project-specific processing with `zero-egress` default and exact-manifest
  provider enablement, selected bearer authentication for viewer surfaces,
  selected CRD-01/02 Option A, accepted the Stage-A authority matrix, and
  confirmed the 23/17 risk-threshold semantics. Stage A, architecture,
  requirements, realizations, risks, ABM, Construction, and runtime mutation
  remain open or unauthorized. Prospective Railway deployment is deferred.
  Historical Railway exposure remains a parallel unverified security fact.

## Ordered orchestration

| Seq | Cycle | Output and gate |
|---:|---|---|
| 0 | Evidence freeze and provider readiness | Freeze source SHA, criterion register, tool versions, reviewer routes, receipt schema, and current runtime snapshot. Reconcile the current interface and test denominator before interpreting any PoC. Deploy AIWG SDLC only into the isolated worktree and verify Codex routing. |
| 1 | Local security and cloud-path isolation | Define fresh local credential identity, prohibit historical-credential reuse, exclude Railway/cloud assets from the admitted package/runtime path, bind protected services to loopback, reconcile viewer-shell authentication, and qualify local logs, hooks, backups, support output, provider attempts, API/MCP/viewer data, and failure remnants. |
| 1R | Parallel historical Railway security lane | Preserve deployment/exposure as `UNVERIFIED / NOT EVALUATED` under a named external-security owner. It is not a local ABM predecessor unless evidence shows local reuse of affected credentials or cloud state. Any inventory, rotation, redeploy, log restriction, or purge requires separate security authorization. |
| 1A | Runtime provenance recovery | Preserve the live fork-derived worker, prepare the registry-verified official npm `0.9.28` artifact under an isolated immutable prefix only after explicit authorization, qualify fresh-process authentication for Codex, Claude, MCP, CLI, REST, and viewer, then obtain a successor supervisor decision. |
| 2 | Architecture evolution | Resolve acknowledgement, truthful degradation, KV readiness, identity, migration/restore, secret handling, and observability contracts. Evaluate at least three system options and record trade-offs. Keep the SAD Draft and every ADR Proposed until human acceptance. |
| 3 | Requirements and realizations | Completed candidate reconciliation: 33 parents, 130 unique atomic child contracts, 130/130 documentary RTM mappings, and DES-UCR-001..003 exist as blocked Review Candidates in the one canonical traceability authority. Human acceptance and executed evidence remain open. |
| 4 | Traceability, MTP, and R-13 Stage A | Run full-chain `check-traceability`, close every critical orphan, retain the 148-file denominator, keep 1,629 provisional until an assertion manifest is accepted, and obtain human Test Architect acceptance or rejection of the MTP/profile/card/threshold specification with required concurrences. Stage A authorizes no implementation or execution. |
| 5 | R-13 Stages B1-D | After Stage-A acceptance, obtain B1 authorization for one disposable mechanics scope under `.aiwg/working/pocs/**`; freeze its bundle and all qualification-source/profile/environment/denominator/signer/custody inputs; obtain separate B2 execution admission; execute the accepted five-run local cohort and local lifecycle denominator; and obtain independent Stage-D evidence disposition. Product, CI, schema, and release-harness changes remain blocked. |
| 6 | Remaining P0/P1 PoCs | Only after R-13 evidence qualifies, run named individually admitted cards through the project-governed `build-poc` wrapper. Premium reasoning/coding wrappers are configured, but model identity remains advisory unless provider telemetry is available. A passing PoC is candidate evidence, not a decision or risk retirement. |
| 7 | Independent ABM rerun | Refreeze one settled revision and run `flow-gate-check elaboration` with independent Project, Architecture, Requirements, Security, Test, and Configuration reviews. ABM PASS permits a Construction authorization request only. |
| 8 | Construction decision and delta | Obtain explicit human Construction authorization. Implement only accepted-contract gaps, including a tested R-09 health-specific non-2xx response path that preserves unrelated shared-helper failure semantics; incorporate successful PoC learning as production-quality code, resolve or formally baseline TypeScript findings, and rerun all accepted evidence profiles. |
| 9 | Side-by-side local canary | Build a commit-identified artifact, install it under an isolated prefix, use separate ports/state and a dedicated LaunchAgent, verify rollback, then test CLI, API, viewer, MCP, hooks, plugins, Doctor, health, snapshot, migration dry-run, and restart persistence. |
| 10 | Admission decision | Switch the normal local service only after named acceptance. Memetics migration and the five-session Codex/Claude canary remain separately authorized; broad rollout remains blocked until canary thresholds pass. |

## Architecture configurations to evaluate

Strict semantics, compatibility, and receipt placement are different decision
axes, not mutually exclusive peer options. The architecture panel must first
define each axis, then compare at least these three complete configurations:

1. **Direct strict cutover with embedded evidence**
   - Exact project capabilities, explicit required/optional failures, provider
     acknowledgement, dependency readiness, generation-fenced migration, and
     fail-closed protected operations.
   - Receipts are committed with governed state through an embedded
     transactional outbox.
   - Lowest steady-state ambiguity, highest client-cutover risk.

2. **Strict core with a temporary compatibility gateway**
   - The same strict core and embedded transactional outbox.
   - No gateway operation allowlist is accepted yet. The candidate minimum
     contains only project-scoped advisory recall, observational capture, and
     session lifecycle for inventoried, owner-bound, expiry-bound legacy
     clients. Every operation still requires an operation-bound capability
     accepted by the strict core.
   - It cannot serve gate-critical context, fabricate acknowledgement, suppress
     sources, obtain global/mesh/provider authority, promote evidence, or run
     migration/restore.
   - A proxy error cannot silently enter this gateway or a local store.
     Any retained offline advisory mode must be explicit before invocation,
     project-scoped, visibly degraded, separately attributable, and accepted
     by human owners.
   - Lower migration shock, larger temporary test and sunset burden.

3. **Strict core with gateway and external receipt relay**
   - The same bounded compatibility rules.
   - An embedded transactional outbox is the atomic source of evidence; an
     advisory sidecar relays and indexes receipts for audit and replay.
   - External placement does not establish independent custody or authority.
     The relay has no kill-switch or enforcement role under this proposal.
   - Highest operational, consistency, retention, and bypass-prevention cost.

The panel must also record why an external sidecar without an embedded atomic
outbox is incoherent: it can commit runtime state and evidence in different
crash windows.

Before scoring, apply the complete veto set in
`.aiwg/architecture/architecture-evolution-iteration-4.md` without omission.
It includes cross-project, secret or sensitive-data disclosure; prohibited
egress; unauthenticated access; capability issuer/key confusion or revocation
bypass; fabricated acknowledgement; false success/readiness; recalled-only
promotion; mixed generation or non-exact restore; incomplete denominators;
silent compatibility downgrade; missing owner/expiry; PoC containment breach;
bypassable/non-atomic evidence; loss of append-only audit truth; objectively
untestable contracts; missing independent verification; and missing human
authority.

For configurations that survive vetoes, use evidence-adjusted MCDA:
security 18, truthfulness 16, rollback/recovery 14, testability 12,
operability 11, compatibility 9, maintainability 9, performance 6, and
migration cost 5. Score 0-5 from evidence. Unknown contributes zero while its
weight remains in the fixed 100-point denominator; weights are never
renormalized. Apply
confidence 1.0 for independent qualified evidence, 0.7 for repeatable
candidate evidence, 0.4 for unit/design evidence, and 0 for unsupported
claims. Do not rank while any veto is open. Do not recommend while security,
truthfulness, rollback/recovery, or testability is unknown, or while evidence
coverage is below 80 weighted points. Require independent scorers, adjudicate
differences of two or more, run +/-20% weight sensitivity, and require a
stable lead of at least five points out of 100 before recommending a
configuration.

No configuration is selected merely because candidate code resembles it.
Human decision owners select or reject; scoring never changes ADR status.

## Evidence execution waves

There are currently no P0 risks. Each risk needs a versioned case card and
frozen fixture/denominator manifest before execution. Use `build-poc` only for
P1 cards. P2/P3 risks use targeted tests, contract review, and operational
rehearsal unless rescored.

| Wave | Risks | Dependency and activity |
|---:|---|---|
| 0 | All, R-13 | Content-address the complete decision surface. Specify and qualify the portable independent harness before its receipts support any later result. |
| 1A | R-01 | Freeze identity equivalence classes, ownership registry, remote/worktree/local-ID fixtures, and canonical capability rules. |
| 1B | R-02, R-14, R-15, R-18, R-19 | In parallel after R-13, freeze the secret corpus, protected interface denominator, proxy-error/tool/side-effect matrix, provider-attempt denominator, recording sinks, and explicit native-sync two-project/destination matrix. R-15 is a P2 targeted veto test. |
| 2A | R-20, R-01 | Freeze session/project/worktree/parent authority, lifecycle versions, identity equivalence classes, owner registry, and deterministic resume/close interleavings. |
| 2B | R-21, R-07 | Freeze complete canonical event identity, durable idempotency result, all governed side effects, concurrency barriers, restart points, and terminal outcome equation. |
| 2C | R-22, R-16, R-06 | After R-01, freeze complete state/compaction manifests, every-boundary fault inventory, reader-atomic activation, exact restore, and dirty-event linkage denominator. |
| 3A | R-17 | Freeze required/optional source classifications and the complete source-fault truth table. |
| 3B | R-23, R-08, R-09 | After R-21, freeze accepted-hook journal, singleton supervisor, replay/reconciliation matrix, host/load profile, required workers, viewer health/fetch/compatibility HTTP-body matrix, viewer/slot scope and denominators, and soak windows. R-09 is a P1 case-card PoC; R-08 remains P2 targeted evidence. |
| 4 | R-04 | After R-17 and an identified provider-native receipt mechanism, execute delivery-state evidence. |
| 5 | R-03, R-05 | After R-04, R-06, R-17, and R-21, freeze the labelled eligibility corpus and promotion-lineage DAG cases. R-05 is P2 targeted evidence. |
| 6 | R-11, R-10 | Rehearse connector rollback; after R-01 and R-16, run the actual frozen 20-query one-writer alias manifest. R-11 is P3 targeted evidence. |
| 7 | R-12 | Rehearse an offline release gate only after every required prior disposition and artifact is available. |

Historical pre-admission mechanics and self-tests remain non-qualifying
evidence. No new PoC implementation is authorized until B1. Never invoke the
generic `build-poc` skill directly; load and include
`.aiwg/risks/poc-cards/BUILD-POC-GOVERNANCE.md` after the generic skill and
before the case-specific assignment.

R-13 v3 Stage-A specification acceptance must precede a separate B1
authorization for disposable mechanics under `.aiwg/working/pocs/**`. B1
completion and a Configuration Manager freeze must precede B2 execution
admission. B2 must precede Stage C, and Stage-D independent disposition plus a
separate Stage-E risk-owner decision must establish whether R-13 evidence can
support later PoCs. No stage authorizes product, CI, or release-harness changes.
The candidate evidence contract requires an independent validator, a
Configuration Manager-controlled iii digest anchor, an immutable source
bundle, an accepted exact local macOS/Node profile identifier, a complete
dependency-support disposition, accepted assertion/authentication manifests,
an explicit environment allowlist, and externally attributable
signer/operator identities. Node 22, Ubuntu, CI, and other portability profiles
remain deferred unless a later decision adds them to the release denominator.
An adjacent `receipt.sha256` written by the same runner is integrity metadata,
not an independent signature.

R-15 remains P2, but prohibited external processing is a hard architecture
veto. Run its bounded recording-sink contract test alongside R-02, R-14, and
R-18 without calling it a P1 `build-poc`.

## Worker routing and independence

- Architecture hypotheses, security decisions, requirement contracts, test
  acceptance analysis, evidence synthesis, and gate review are configured to
  use `aiwg-model-reasoning-worker`.
- PoC implementation and difficult debugging are configured for the
  project coding wrapper, which declares `gpt-5.6-sol`. The packaged
  `build-poc` skill declares an economy route. Configuration does not prove
  that either route executed; a result is not model-qualified until
  provider-observed telemetry proves the actual route.
- Specialized role definitions with lower-tier defaults are loaded as
  advisory capabilities inside the configured reasoning session rather than
  treated as qualified architecture, security, requirements, Test Architect,
  or gate authorities.
- Every PoC has separate author, executor, and reviewer identities. The same
  worker cannot both produce and independently accept a receipt.
- Maximum parallel subagents remains four, but dependency-linked PoCs run
  sequentially. DES-UCR-001 through DES-UCR-003 also run sequentially.
- Provider metadata and runtime evidence must prove the actual route; wrapper
  labels alone are not accepted as model evidence.

## Canonical artifacts

- Architecture: `.aiwg/architecture/software-architecture-doc.md`
- Architecture evolution:
  `.aiwg/architecture/architecture-evolution-iteration-4.md`
- ADRs: `.aiwg/architecture/adr/ADR-*.md`
- Interface denominator: `.aiwg/architecture/interface-control-matrix.md`
- Atomic requirements: `.aiwg/requirements/supplemental-specification.md`
- Use cases: `.aiwg/requirements/use-case-briefs/UC-*.md`
- Realizations: `.aiwg/requirements/realizations/DES-UCR-*.md`
- Traceability authority: `.aiwg/requirements/traceability-matrix.md`
- Test strategy: `.aiwg/testing/master-test-plan.md`
- Risk authority: `.aiwg/risks/risk-list.md`
- PoC hypotheses: `.aiwg/risks/poc-plan-2026-07-25.md`
- PoC case cards and fixtures: `.aiwg/risks/poc-cards/`
- Evidence input manifest:
  `.aiwg/reports/iteration-4-input-manifest.json`
- Gate authority: `.aiwg/reports/gate-validation-abm-*.md`
- Codex model routing: `models.json`
- Railway containment:
  `.aiwg/security/railway-secret-exposure-assessment-2026-07-26.md`

## Security containment protocol

1. Verify Railway deployment history using an authenticated dashboard or
   read-only CLI connection. Local absence of Railway configuration is not
   proof that no deployment existed.
2. If any affected revision ran, classify its HMAC value as exposed even when
   log access was limited.
3. Generate and set a replacement as a Railway secret variable without
   displaying it in terminal output, chat, receipts, or Git.
4. Remove, replace, or permanently disable any prior `/data/.hmac` fallback so
   deleting the environment variable cannot resurrect the exposed credential.
   Preserve only redacted file identity and disposition evidence.
5. Redeploy from a non-disclosing, commit-bound ChronodeAi artifact; verify old
   authentication fails and new authentication succeeds, and update every
   authorized client.
6. Restrict affected log access immediately. Purge only when permitted by
   retention and incident-evidence policy; otherwise seal access and document
   expiry.
7. Scan Git history, deployment logs, support exports, and local captures for
   the synthetic fingerprint or secret occurrence without reproducing the
   value.
8. Record incident scope, rotation time, verifier, fallback-file disposition,
   candidate artifact identity, and redacted evidence.

## Human decision points

Explicit human action is required for:

1. Confirming or denying historical Railway deployment and authorizing any
   credential rotation or log purge.
2. Accepting an architecture option and changing ADR/SAD status.
3. Stage-A acceptance or rejection of the MTP/profile/R-13 specification with
   required concurrences.
4. B1 authorization or denial of one exact disposable mechanics scope.
5. B2 admission or denial of the exact
   R-13 card/source/disposable-bundle/fixture/policy set.
6. Stage-D acceptance or rejection of immutable R-13 evidence.
7. Changing any risk disposition based on immutable PoC evidence.
8. Granting ABM passage.
9. Granting Construction authorization after ABM.
10. Admitting the side-by-side canary as the normal local runtime.
11. Migrating Memetics data or beginning the five-session real canary.
12. Broad rollout or production admission.
13. Accepting or waiving the TypeScript baseline, by the Software Architect,
    Test Architect, and Configuration Manager.

## Stop conditions

Stop the active cycle immediately on any real-secret or sensitive-data
disclosure, cross-project leakage, unauthorized external processing,
capability issuer/key confusion, revocation bypass, PoC containment breach,
mixed migration generation, non-exact restore, loss of append-only audit
truth, false success/degradation/readiness, unbounded resource growth,
incomplete governed denominator, receipt/source mismatch, or attempt to
convert an agent review into human approval.

## Ready-for-next-session criteria

The next normal coding session may begin on the fork only when:

- a registry-verified official upstream rollback artifact is installed under
  an isolated immutable prefix and independently qualified;
- the accepted current-HEAD candidate commit is installed side by side without
  overwriting either the live containment subject or official rollback;
- a persistent LaunchAgent survives restart and serves matching build identity
  on CLI, API, worker, and viewer;
- Doctor, authenticated REST/MCP, hooks, plugins, context, slots, snapshot,
  migration dry-run, and restart checks pass;
- no unresolved P0/P1 security or correctness defect remains;
- the accepted deterministic profile and immutable receipt validate;
- the operator explicitly approves switching the local coding clients.

Until then, the fork-derived, source-consistent-but-build-unverified `0.9.28`
runtime remains the contained normal service. It is neither an admitted
canary nor a verified rollback control, and the current HEAD fork remains a
candidate.
