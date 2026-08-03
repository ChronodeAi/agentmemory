# Master Test Plan

Status: Draft Stage-A specification candidate; requires human Test Architect
acceptance
Date: 2026-07-28

Recorded human inputs: DEC-12 accepts the exact local profile and its
740-file-execution/42-lifecycle-journey denominators for Stage-A specification
only; DEC-17 accepts the Stage-A authority matrix; DEC-18 confirms the 23-risk
denominator and 17-risk threshold. None of these inputs accepts this MTP or
Stage A; B1 and B2 remain blocked.

## 1. Purpose

Prove the Universal Coding Memory Optimization at unit, integration, system,
adversarial, performance, recovery, and canary levels. Existing tests are
implementation evidence, not acceptance evidence.

This plan follows the staged decision contract in
`.aiwg/risks/poc-cards/R-13-portable-evidence-harness-v3.md`:

1. Stage A accepts or rejects this MTP, the profile/card specification, and
   thresholds. It authorizes no implementation or execution.
2. Stage B1 separately authorizes one bounded disposable PoC mechanics scope
   under `.aiwg/working/pocs/**`; product, CI, and release-harness files remain
   out of scope.
3. Stage B2 separately admits one immutable R-13
   card/source/disposable-bundle/fixture/policy set and its actors for bounded
   execution.
4. Stage C produces candidate execution evidence.
5. Stage D independently dispositions that evidence.
6. Stage E separately decides risk and ABM effects.

Stage-A acceptance does not authorize B1 or B2, admit a PoC, qualify a profile,
retire a risk, pass ABM, authorize Construction, deploy a canary, or authorize
rollout.

### Decision authority and independence

DEC-17 accepts the role allocation below. Named assignments and the
concurrences for an actual Stage-A decision remain **OPEN** until recorded by
the applicable humans. Agents and premium workers are advisory or execution
actors only; they cannot fill a human authority cell.

| Stage | Accountable human authority | Required written concurrences | Advisory or deferred roles | Independence constraint | Canonical decision record |
|---|---|---|---|---|---|
| A | Human Test Architect role; identity unassigned | Configuration Manager, Security Architect, Release Owner; identities and concurrences unrecorded | Local Test Infrastructure Owner and Dependency Owner are advisory; CI Owner is `DEFERRED-LOCAL-TARGET` | No agent acceptance; concurrence cannot be inferred from artifact authorship or advisory review | Deterministic-profile packet Decision A and human packet Decision C |
| B1 | PoC Preparation Owner | Configuration Manager, Security Architect, Local Test Infrastructure Owner | Dependency Owner advisory; CI Owner deferred | Exact disposable write roots; no product/CI/release-harness writes | Deterministic-profile packet Decision B1 and versioned case card |
| B2 | PoC Admission Owner | Test Architect, Configuration Manager, Security Architect, Independent Verifier Owner | Local Test Infrastructure and Dependency Owners provide frozen-input evidence; CI Owner deferred | Executor and verifier must differ; every admitted identity is immutable | Deterministic-profile packet Decision B2 and versioned case card |
| C | Human PoC Operator | B2 admission already recorded | Local Test Infrastructure Owner may operate the admitted local harness | Operator cannot alter admitted inputs or disposition results | Immutable raw run/cohort/journey receipts |
| D | Test Architect | Independent Verifier Owner, Configuration Manager | Security and Release review the accepted policy boundary; CI Owner deferred | No executor may verify or accept its own evidence | Deterministic-profile packet Decision D |
| E | Accountable Risk Owner; independent ABM reviewer for gate effect | Named architecture/gate owners required by the active gate | None inferred from Stage A-D participation | Risk disposition, ABM readiness, and Construction authority are separate decisions | Risk register, ABM gate report, and separate Construction record |

## 2. Test environments

- Hermetic unit environment with external embedding/config variables unset.
- iii-engine integration environment with isolated state and authenticated REST/MCP.
- Codex and Claude disposable configuration homes.
- Two or more synthetic repositories with identical basenames, worktrees, remote aliases, committed and uncommitted changes.
- Codebase Memory 0.9.1 canonical test index plus temporary alias.
- Four-agent concurrent harness with maximum capture queue depth 256, zero
  dropped events, p95 below two seconds, and p99 below five seconds.
- Compatible and incompatible backend/viewer build pairs.
- Future five-session Memetics canary, subject to separate exact canary
  admission; currently **NOT AUTHORIZED**. Any later admitted canary remains
  explicit-only with automatic gate-critical injection disabled.
- One mandatory release-profile candidate:
  `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`.
  It runs all 148 governed `*.test.ts` files five consecutive times: exactly
  `5 x 148 = 740` governed file-executions, with one observed Vitest worker,
  a 30-minute per-run limit, and peak process-tree RSS at or below the lower
  of 4 GiB or 50% of host RAM.
- Three independent clean-home lifecycle repetitions on that same profile.
  Each executes `T-LOCAL-DEPLOY` journeys `LQ-001..014`: exactly
  `3 x 14 = 42` journey executions.
- Node 22, Ubuntu, GitHub-hosted CI, Windows, containers, public endpoints,
  Railway deployment, and multi-host profiles remain visible as deferred
  portability or compatibility work. They are not mandatory release-profile
  PASS rows, substitutes, deletions, or `N/A` dispositions.

No secret values from fixtures may appear in reports.

The exact local profile accepted by DEC-12 for Stage-A specification is
specified in
`.aiwg/testing/local-macos-qualification-profile-candidate.md` and reconciled
into `.aiwg/testing/deterministic-profile-acceptance-candidate.md`. The local
profile and `.aiwg/deployment/local-macos-operations-and-support-candidate.md`
are inputs to this MTP, not authority to accept this MTP or Stage A. The exact
profile tuple and 740/42 denominators are accepted only as specification; no
execution or qualification is claimed.

### Temporary pre-session containment profile

Before any gate-relevant coding session uses the exact installed fork-derived
containment runtime, the operator must run this separately accepted,
reversible profile. No test may label that runtime official upstream or a
current-HEAD canary:

1. Freeze an inventory of every effective Agentmemory hook source and the
   loaded command for `SessionStart`, `PreToolUse`, and `PreCompact`.
2. In an exclusive session, set `AGENTMEMORY_INJECT_CONTEXT=false` and replace
   every remaining `PreCompact` context-output entry with a reversible no-op.
   Record whether capture, registration, lifecycle, or compaction behavior is
   lost. A user-global mutation prohibits concurrent Codex and Claude sessions.
3. Point the three hook events at a disposable sentinel service that would
   return `AUTO_INJECTION_SENTINEL`. Require `stdout_bytes=0`, no sentinel in
   output, and zero `/agentmemory/context` or `/agentmemory/enrich` requests.
   A session-registration request is allowed only when capture is retained and
   its exact consequence is recorded.
4. Under the same profile, issue explicit MCP recall with the exact canonical
   project and `scope=project`. Require a non-error response, then run a
   two-project A/B fixture and require zero project-B result and no global
   fallback.
5. Start a fresh host task from the target checkout and trigger start, one file
   read, and compaction. Require the effective-hook transcript to contain zero
   Agentmemory stdout payload.
6. Run one ten-minute, single-agent, no-fanout health smoke sampled every 30
   seconds. Stop on worker disconnect, circuit state other than closed, a new
   alert, heap at or above 90% for three consecutive samples, or RSS growth
   above 64 MiB.

These are temporary operator stop conditions, not accepted architecture,
capacity, or release thresholds. Failure blocks the coding session. Passing
does not qualify recall quality, accept architecture, authorize Construction,
or deploy the ChronodeAi fork.

## 3. Suite governance

Every suite requires an accountable role, an automation status, an accepted
environment, and a blocking gate. Role names are assignments to be confirmed
by humans, not proof that an owner accepted the plan.

| Suites | Accountable role | Current automation/evidence state | Required environment | Blocking gate |
|---|---|---|---|---|
| T-IDENTITY, T-SCOPE, T-SLOTS | Software Architect / Test Infrastructure Owner | Candidate tests exist; accepted traceability and complete fault matrix open | Two colliding synthetic repositories and isolated KV | Stage A mapping; Stage D evidence |
| T-CONFIG, T-PRIVACY, T-PROVIDER, T-NATIVE | Security Architect / Provider Integration Owner | Candidate tests exist; environment allowlist, ownership, exact rollback, and explicit-action proof open | Disposable provider homes, recording sinks, no real credentials | Stage A contracts; Stage D security evidence |
| T-DEDUPE, T-SESSION, T-CAPTURE, T-COMPACTION | Capture Integrity / Session / Compaction Owners | Candidate tests exist; concurrency, restart, durable terminal-state, and generation proof open | Isolated KV, deterministic barriers, restart/fault harness | Stage D evidence |
| T-CONTEXT, T-DELIVERY, T-TEMPORAL, T-PROMOTION | Product / Context / Provider Owners | Candidate tests exist; source eligibility, acknowledgement, temporal authority, and acyclic lineage corpora open | Frozen labelled corpus and provider receipt fixture | Stage A benchmark; Stage D evidence |
| T-PROVENANCE, T-COMMIT | Git/Runtime Owner | Candidate tests exist; dirty-to-commit denominator and eligible-link coverage open | Committed/uncommitted/rename/delete fixtures | Stage D evidence |
| T-SERVICE, T-UI, T-ROLLBACK | Service / UI/API / Operations Owners | Current R-09 defect confirmed; singleton, replay, health, slot, compatibility, and rollback matrices open | Isolated service, exact build pairs, pressure/fault profiles | Stage D evidence and canary |
| T-CBM | Codebase Memory Maintainer | Canonical and duplicate indexes observed; alias-equivalence evidence open | Codebase Memory 0.9.1 synthetic and Memetics canary indexes | Stage D external evidence |
| T-RUNNER | Local Test Infrastructure Owner | 148-file mechanics exist; exact local-profile, complete assertion/authentication manifests, custody, and independent-verifier blockers remain | Exact accepted local profile, five clean run homes, synthetic auth, and independent verifier | Stage A specification, Stage B1 mechanics, Stage B2 admission, Stage D evidence |
| T-LOCAL-DEPLOY (`LQ-001..014`) | Operations Owner / Local Test Infrastructure Owner | Candidate journey denominator exists; no admitted or executed 42-journey cohort | Three independent clean homes; isolated labels, ports, state, provider homes, credentials, backups, and recording sinks | Stage A specification; later B2 admission and Stage D evidence |

## 4. Verification suites

| Suite | Required coverage |
|---|---|
| T-IDENTITY | Credential-free remote canonicalization, hashed fallback, nested worktree, alias migration, colliding basenames, rollback |
| T-CONFIG | Process-env precedence, user/repo precedence, secret-file auth, missing/unreadable secret, no output disclosure |
| T-SCOPE | Every retrieval, search, session, file-history, commit-history, expanded result, promotion, slot, health, and viewer route |
| T-SLOTS | Namespaces, listing, pin/shadow, cross-project isolation, backend failure, reported HTTP 500 regression |
| T-DEDUPE | Complete canonical event identity, same-prefix/different-suffix collision, durable reservation/result, every governed side effect, restart, concurrency, semantic near duplicates, project isolation, <2% observed duplicate rate |
| T-SESSION | Immutable project/worktree/privacy/policy binding, authorized start/resume/parent/close, invalid/cross-project parent no-write, stale-close CAS, crash/restart, concurrent calls |
| T-CAPTURE | Balanced/minimal/full profiles, exclusions, redaction, output caps, failures, commit/subagent/session-end hooks |
| T-COMPACTION | One tamper-evident immutable ledger/history/index/count generation, exact-facts preservation, every-boundary crash, concurrent readers, restart convergence |
| T-CONTEXT | Policy before source access, eligibility before relevance, final-wire <=2,000 actual tokens, fixed 300/400/700/400/200 maxima, <=5 distinct sources, threshold/acknowledged-source omission, zero stale-authority leakage |
| T-DELIVERY | Packet/attempt/provider receipt, atomic acknowledgement-suppression projection, sibling/late/duplicate/revoked/replayed/wrong-issuer receipt races, retry closure, separate consumption |
| T-TEMPORAL | Commit supersession, dirty source changes, clock/time ordering, validity expiry, contradictory source |
| T-PROVENANCE | Committed and uncommitted work, source digest, base commit, path, transition to commit, deletion/rename |
| T-PROMOTION | Exact eligibility tri-state separate from lifecycle disposition, accepted ADR, commit/runtime/test proof, independent sources, no self-reinforcement |
| T-COMMIT | Idempotent links, project scope, eligibility denominator, >=95% eligible linkage |
| T-PRIVACY | Tokens, keys, passwords, connection strings, private tags, encoded/structured secrets, error and telemetry paths |
| T-PROVIDER | Codex/Claude config, direct binary/`npx`, ownership/adoption markers, concurrent edit, complete file-metadata rollback, policy-safe backup, env precedence, feature-disabled typed errors |
| T-NATIVE | Zero automatic writes, explicit actor/project/source/destination authority, two-project/global canaries, every destination/audit failpoint, restart convergence to exact target or byte-identical pre-image |
| T-SERVICE | Operation/resource-bound capabilities, required-backend and protected-proxy fail-closed, bounded denial receipt, durable hook intake/replay, singleton worker, startup reconciliation, pressure, sustained health, soak |
| T-UI | Exact fetch/compatibility enums, backend/viewer builds, no `Unknown`, project/global isolation, scope/denominator/snapshot/time, stale-safe exact-scope destructive authorization, slot/project health |
| T-CBM | Canonical config, source/decision roots, excludes, path-filter consistency, AIWG ADR recognition, alias and duplicate retirement |
| T-ROLLBACK | Connector/config restore, migration rollback, service rollback, reindex alias rollback, retained audit truth |
| T-RUNNER | Exact local-profile identity, five consecutive runs, `740` governed file-executions, bounded workers, memory ceiling, complete assertion/authentication manifests, independent verification, and custody |
| T-LOCAL-DEPLOY | `LQ-001..014` across three clean homes: immutable install, transactional setup, LaunchAgent, restart/reconciliation, loopback/viewer, auth, identity, Codex/Claude ownership, isolation, both processing policies, backup/migration/restore/upgrade, rollback/uninstall/support/health |

The canonical file denominator includes `test/integration.test.ts`;
integration is not a
separate optional denominator. It starts an isolated authenticated service,
uses synthetic state and credentials, and fails when mandatory authentication
setup is absent. Skipping an integration or authentication assertion fails the
receipt.

The reconciled 148-file path and content manifests are candidate positive
evidence. Qualification requires five consecutive runs with all 148 files on
every run (`740` governed file-executions total), a complete accepted
assertion identity/count/status manifest, and a complete accepted bearer and
project-capability authentication identity/count/status manifest. The
historical 1,629 passing-test observation and substring auth checks are
provisional. Every missing, extra, changed, failed, skipped, pending, todo,
disabled, or unclassified file/assertion/authentication item fails the cohort.

`npm test` is a developer execution command, not by itself a qualification
decision. A run that exits zero with `provisional-pass` remains non-qualifying.
Every accepted profile must pass an independent receipt validator in
qualification-required mode; that validator fails on any waiver, unknown
profile, unverified iii-engine provenance, missing signer/operator identity,
ambient-worktree dependency, or source/test/fixture mismatch.

Qualification receipts must be portable to a clean verifier. They identify an
immutable source bundle or reconstructible commit/tree, profile image, fixture
manifest, package and Vitest versions, host resources, ports, operator,
independent signer, and Configuration Manager-controlled iii digest anchor.
An adjacent checksum generated by the runner is integrity metadata, not an
independent signature.

The proposed portable envelope is an in-toto Statement v1 inside DSSE with a
versioned R-13 predicate and a separately governed local verification key or
equivalent accepted trust root. GitHub OIDC/Sigstore remains a deferred
portability option, not a local qualification dependency. The envelope remains
advisory until the Test Architect, Configuration Manager, Security Architect,
and Release Owner accept the policy; see
`.aiwg/research/r13-portable-attestation-2026-07-26.md`.

The present implementation gaps and required B1/B2 evidence are mapped in
`.aiwg/testing/r13-implementation-conformance-matrix.md`.

### Local processing-policy evidence

Both processing policies are mandatory under the same local deployment target:

- `PP-01 zero-egress`: DNS, socket, HTTP, SDK, telemetry, model, embedding,
  fallback, and provider recording sinks observe zero attempts. Missing policy
  fails closed.
- `PP-02 provider-enabled`: synthetic recording sinks prove exact
  provider/destination/purpose/data-class/project/session authorization,
  pre-boundary minimization/redaction, one attributable allowed attempt, and
  denial of every unlisted case with zero governed effect.

No real provider call is part of Stage A, B1 mechanics, B2 admission, or the
synthetic local qualification denominator. Each real external call requires
separate explicit authorization.

### Local operations evidence mapping

| Evidence surface | Mandatory journey and evidence |
|---|---|
| Immutable package and transactional setup | `LQ-001..002`; release/source/package-lock/SBOM/provenance identities, setup pre/post state, idempotency, and unrelated-byte diff |
| LaunchAgent and supervision | `LQ-003..004`; exact plist/label/hash, executable/root/ports, singleton lock, engine-worker order, crash restart, reconciliation, and capture-readiness receipt |
| Viewer and health truthfulness | `LQ-005`; browser screenshot, rendered state/accessibility capture, backend receipt, exact viewer/backend identities, loopback/non-loopback oracle, and no false healthy/ambiguous `Unknown` |
| Authentication and authorization | `LQ-006`; complete CLI/REST/MCP/viewer-data bearer and project-capability manifest, protected-surface matrix, fresh synthetic credential, and typed denial side effects |
| Canonical identity and provider ownership | `LQ-007..010`; collision fixtures, two-project/global isolation, Codex/Claude connect/repeat/repair/remove pre-images, ownership markers, and unrelated-config byte equality |
| Processing policies | `LQ-011..012`; `PP-01` and `PP-02` recording-sink manifests and receipts |
| Logs and support | `LQ-003..006`, `LQ-011..014`; private modes, rotation/retention, synthetic-corpus zero-occurrence scan, minimized project-scoped support manifest, and no automatic upload |
| Backup, migration, restore, upgrade | `LQ-013`; scope/generation/content inventory, protection/encryption disposition, independent read-back, interruption matrix, reader fencing, and exact restore/activation |
| Rollback and uninstall | `LQ-014`; independently qualified official-upstream subject, side-by-side isolation, candidate-to-upstream recovery, unauthorized reverse-switch denial, exact owned-resource removal, retained-data report, and unrelated-config byte equality |

### Non-qualifying live scope/authority observations

User-supplied live observations on 2026-07-28 are candidate evidence only:

- the browser rendered healthy/connected after repeated identical health-503
  console warnings, showed global-looking aggregates without a visible
  project/global scope label or selector, and showed no interactive auth step;
- named-project MCP health succeeded with project scope coverage and zero
  project-unscoped records while reporting a materially separate global
  unscoped denominator, but same-project slot list/get returned HTTP 500; and
- Doctor/diagnostics reported overall success with one warning and no failed
  checks while both sampled latest durable records lacked project scope,
  migration was suggested but not run, and top-level health remained healthy
  despite the slot failures.

No session or memory content is reproduced here. These observations do not
prove a complete denominator, authorize migration/heal, qualify a profile, or
change a risk. `T-UI`, `T-SLOTS`, `T-SERVICE`, `T-CONFIG`, `T-SCOPE`, and
`T-LOCAL-DEPLOY` must therefore cover:

- visible project/global scope, aggregate denominator, and authority/auth state
  on every browser and MCP surface;
- cross-surface consistency among project health, slots, viewer, sessions,
  counters, and diagnostic sample/total denominators;
- exact `DEGRADED`, `RECOVERING`, `HEALTHY`, and `UNAVAILABLE` transitions,
  including preserved warning/503 history and split failures;
- no false healthy or unexplained `Unknown`; and
- no automatic migration/heal. Any migration is a separately authorized,
  generation-fenced `LQ-013` operation with exact restore/rollback evidence.

### Railway applicability

Railway is split into three non-interchangeable concerns:

1. Local R-02 recording sinks and secret-flow evidence are mandatory.
2. Historical Railway exposure remains a separate
   `UNVERIFIED / NOT EVALUATED` external issue requiring a named owner and
   separately authorized metadata-only evidence. It cannot be inferred from
   local qualification.
3. Prospective Railway deployment is deferred and excluded from the local
   package, profile, qualification, ABM, canary, and release denominators.

## 5. Traceability contract

`.aiwg/requirements/traceability-matrix.md` is the single canonical
traceability authority. No competing test index may be created.

Before Stage-A acceptance:

- every architecturally significant atomic requirement has an exact child-to-
  `TR-UCM` edge, and every referenced trace row has a planned suite/test/PoC
  identifier, accountable role, environment, pass/fail oracle, evidence
  locator, and explicit acceptance authority/status; this normalized join is
  the atomic test contract;
- every P0/P1 risk has a case-card or explicitly governed targeted method;
- every DES-UCR-001..003 scenario and failure branch maps to requirements,
  risks, and planned verification;
- every critical orphan is resolved or explicitly returned for revision; and
- the traceability report distinguishes a planned link from live executed
  evidence.

Before Stage-D evidence acceptance, every executed assertion and receipt must
link back to the accepted requirement/risk/profile/source identity. A filename
manifest proves deterministic inclusion, not requirement coverage.

## 6. Human-labelled retrieval and answer-quality evaluation

The following protocol is proposed for Test Architect acceptance:

1. Freeze at least 50 queries across five equal strata: current implementation,
   stale/conflicting authority, project isolation, uncommitted provenance, and
   negative secret/irrelevant-source cases.
2. For each query, two independent reviewers label eligible source IDs,
   current/stale/conflicting status, project ownership, expected supported
   facts, and prohibited authority claims without seeing system ranking.
3. Require Cohen's kappa of at least 0.80 on categorical eligibility/currentness.
   A third reviewer adjudicates every disagreement before the benchmark is
   frozen.
4. Score macro precision@5 across all queries and by stratum. Pass requires
   macro precision@5 at least 0.80, no stratum below 0.70, and zero
   cross-project, secret, or stale-authority result in a gate-critical packet.
5. Compare three blinded answer conditions: no recall, bounded current recall,
   and adversarial stale recall. Two reviewers score supported facts and
   unsupported authority claims; disagreements use the same adjudication rule.
6. The bounded-current condition must improve supported correct facts without
   increasing unsupported-authority claims. Any stale/adversarial condition
   that changes a gate-critical answer without live corroboration fails.

The corpus must include the operator-reported Memetics failure shapes: obsolete
adapter, conflicting PostgreSQL posture, wrong language, unrelated activity,
synthetic commit links, and missing uncommitted provenance.

## 7. Load, backpressure, and soak

The following protocol is proposed for Test Architect and Release Owner
acceptance:

1. Freeze agent mix, event types/rates, dataset and secret fingerprints, host
   profile, queue policy, fault schedule, and expected terminal event count.
2. Run three independent 30-minute repetitions of baseline and pressure
   profiles. Each repetition emits at least 10,000 governed capture events and
   500 context-packet requests unless the accepted host profile proves a lower
   bounded capacity target.
3. Sample process-tree RSS, queue depth, worker count, and dropped-event
   counters at 250 ms or faster. Measure every hook latency and report
   context-injecting and telemetry-only distributions separately.
4. Run required-worker loss, KV latency/failure/recovery, viewer/backend
   mismatch, slot-list failure, restart/replay, and log/disk pressure phases.
   Probe service health every 30 seconds and require three consecutive
   successful probes before declaring recovery.
5. Preserve every attempt. A failed repetition cannot be replaced or omitted.

Every repetition must satisfy p95 below two seconds, p99 below five seconds,
maximum capture queue depth 256, zero dropped or duplicated terminal events,
disk/log growth at most 512 MiB per 30 minutes, process-tree RSS at or below
the lower of 4 GiB or 50% of accepted host capacity, truthful degraded/critical
health, exact replay reconciliation, and zero secret/cross-project leakage.

## 8. Defect and evidence disposition

| Severity | Examples | Exit rule |
|---|---|---|
| S1 | Secret disclosure, cross-project access, unauthenticated protected access, destructive restore/migration corruption | Immediate stop; zero open or waived |
| S2 | Lost/duplicated accepted event, false acknowledgement/readiness, non-exact restore, unbounded resource breach, gate-critical stale authority | Zero open before ABM rerun |
| S3 | Bounded functional defect with truthful failure and rollback | Named owner, accepted plan, and no effect on a mandatory gate; otherwise blocking |
| S4 | Documentation, usability, or advisory telemetry gap | Recorded disposition; cannot hide a higher-severity contract failure |

Only immutable evidence from the admitted source/profile/policy may close a
finding. A test that does not cover the contract, a same-operator receipt, an
agent recommendation, or absence of an observed failure cannot close it.

DEC-18 confirms the risk-gate arithmetic used by this plan: the denominator is
23 risks; at least 17 must be `MITIGATED` or `RETIRED`; accepted-but-open risks
do not count; and any unresolved mandatory veto prevents ABM PASS. The current
state remains 23 `IDENTIFIED`, zero mitigated, and zero retired.

## 9. Canary

Status: **NOT AUTHORIZED**.

This MTP does not admit a Memetics canary. No real session may be run under
this section until a separate exact human authorization binds the candidate
runtime, project, five-session protocol, operators, stop conditions, evidence
roots, rollback subject, and acceptance owners.

Only after that separate admission, run five real sessions spanning both Codex
and Claude against Memetics:

- each session first passes the temporary pre-session containment profile;
- recall is explicit-only through exact canonical `project` and
  `scope=project`, with global fallback prohibited;
- all effective automatic Agentmemory context-output paths are disabled;
- record packet candidates, eligibility decisions, acknowledgements, provenance, latency, dedupe, commit linkage, and operator labels;
- compare live authority before acting;
- stop immediately on any project, secret, or stale-authority leakage.

Canary admission, canary acceptance, and broad rollout are separate decisions.
Broad rollout remains blocked until all numerical acceptance thresholds pass
and the Product Owner/Founder, Security Architect, Human Test Architect, and
Release Owner accept the separately authorized canary.

## 10. Exit criteria

All NFR thresholds pass, no S1/S2 defects remain, rollback is rehearsed,
external Codebase Memory dependencies are complete, proposed ADRs and the
architecture baseline are separately accepted, and named owners approve
release. Until then the correct result is NOT CONSTRUCTION READY or NOT ROLLOUT
READY as applicable.
