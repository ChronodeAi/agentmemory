# R-20 Session Lifecycle Takeover Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-20`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-20-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  lifecycle authority, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can session creation, resume, parent linkage, mutation, stale closure, and
completion preserve authenticated project/worktree identity and one
linearizable lifecycle state under spoofing, concurrency, restart, and partial
failure?

## One bounded hypothesis

Only an authorized caller bound to the canonical project and worktree can
create, resume, parent, mutate, or close a session, and every stale or
concurrent operation produces one linearizable state with consistent
attribution, lineage, counters, and governed side effects.

## Current-source finding and test gap

At the source candidate:

- `src/project-config.ts:289-365` can accept a configured project identity
  without proving it against a canonical ownership registry;
- `src/triggers/api.ts:1131-1197` accepts caller-supplied session, project,
  working-directory, parent, privacy, and external-processing fields;
- `src/functions/session-lifecycle.ts:20-44` lists stale sessions and later
  overwrites them without a compare-and-swap guard;
- `src/functions/session-lifecycle.ts:47-130` updates lifecycle identity and
  can persist child state before completing parent validation/linkage;
- `src/functions/observe.ts:421-460` supports caller-driven implicit session
  creation; and
- `src/state/schema.ts:3-15` places session identity at the root of multiple
  namespaces.

`test/session-lifecycle.test.ts:10-68` proves sequential idempotency, one
project-collision rejection, child linking, and stale closure. It does not
exercise authenticated caller authority, project/worktree spoofing,
cross-project parents, simultaneous resume/close/update, stale-scan races,
process death between child and parent writes, or counter reconciliation.
`test/observe-implicit-session.test.ts` proves implicit creation behavior, not
the missing authority contract. Current tests therefore do not retire R-20.

## Required frozen prerequisites

1. Human-accepted session authority and capability contract bound to canonical
   project, worktree, actor, operation, and expiry.
2. Versioned lifecycle state machine with allowed transitions, compare-and-swap
   token, stale-clock rules, parent/child invariants, and counter invariants.
3. Two-project, multi-worktree identity manifest and an immutable expected
   event/state oracle.
4. Complete lifecycle/API/hook/observation/index/audit side-effect denominator.
5. Accepted R-13 profile, `G-ICM-01`, source bundle, fixture SHA, signer
   authority, and independent verifier.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Session Lifecycle Owner | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Configuration reviewer | Configuration Manager | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Architecture reviewer | Software Architect | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- `PROJECT-A/WORKTREE-A1`, `PROJECT-A/WORKTREE-A2`, and
  `PROJECT-B/WORKTREE-B1` with frozen canonical identities.
- `SESSION-ACTIVE`, `SESSION-COMPLETED`, `SESSION-ABANDONED`,
  `SESSION-RESUMED`, `PARENT-A`, and `CHILD-A`.
- Valid, wrong-project, wrong-worktree, wrong-operation, expired, replayed, and
  absent caller capabilities.
- Cross-project parent, missing parent, stale parent, duplicate child, and
  caller-supplied identity-collision cases.
- Frozen clocks around the stale threshold and a deterministic barrier
  scheduler for concurrent operations.

## Fault and race matrix

- Interleave create/create, resume/resume, resume/stale-close,
  update/stale-close, complete/observe, parent/child, and child/child calls at
  every read/write boundary.
- Terminate the process before and after child persistence, parent validation,
  parent update, counter update, status update, and audit emission.
- Restart with stale caller tokens, stale snapshots, duplicate requests, and
  skewed but bounded fixture clocks.
- Inject KV get/set/update/delete failures and delayed responses at each
  lifecycle boundary.

## Governed sinks and side effects

The denominator includes session records, parent/child links, observation
namespaces, counters, status/resume/stale timestamps, working-directory and
project attribution, indexes, summaries, fact ledgers, audit records, metrics,
logs, queues, hook/API responses, and downstream provider attempts. Every sink
must be attributable to the same accepted lifecycle generation.

## Pass criteria

1. Missing, expired, replayed, wrong-project, wrong-worktree, and
   wrong-operation authority produces typed denial and zero governed side
   effects.
2. A child cannot become visible unless its parent exists in the same
   canonical project and the reciprocal link is committed in the same
   recoverable lifecycle transaction.
3. Every scheduled race matches the frozen state-machine oracle; stale closure
   cannot overwrite a newer resume/update and duplicate requests are
   idempotent.
4. Project, worktree, parent, actor, privacy, and processing-policy attribution
   remain immutable except through an explicitly allowed transition.
5. Observation, child, resume, close, and stale counters equal the immutable
   event oracle after fault recovery and restart.
6. No partial link, cross-project namespace, orphan side effect, fabricated
   success, or unclassified lifecycle state remains.

## Fail criteria

- Unauthorized session creation, resume, mutation, parenting, or closure.
- Stale closure wins over a current authorized update.
- Cross-project/worktree attribution, parent linkage, or namespace access.
- Partial child/parent state, impossible transition, duplicate terminal event,
  lost observation, counter drift, or response/state mismatch.
- Any untested lifecycle transition or governed sink omitted from the frozen
  denominator.

## Stop and backtrack

Stop on the first unauthorized lifecycle mutation, cross-project linkage,
unrecoverable partial state, or mismatch with the state-machine oracle. Close
fixture intake, revoke fixture capabilities, quarantine the affected namespace,
preserve redacted raw evidence, and return to the authority/transaction
contract. Do not repair fixture state in place and continue the same run.

## Immutable receipt

The sealed receipt must bind the risk/card version, source and source-bundle
SHAs, authority/state-machine/identity-manifest SHAs, fixture clock and race
schedule, all request/capability hashes, ordered KV and side-effect traces,
pre-state/post-state manifests, expected and actual counters, fault points,
process/environment identity, raw output hashes, executor, signer, and
independent verification disposition.

## Rollback and cleanup

Use only isolated fixture namespaces and synthetic identities. Restore the
verified namespace pre-image or discard the complete disposable store; revoke
fixture capabilities, terminate fixture workers, and verify no child, index,
queue, audit, or provider residue remains. Preserve immutable receipts and
their manifested raw evidence.

## Admission blockers and execution prohibition

- Named humans for the owner, all four reviewers, executor, signer, and
  independent verifier.
- Human acceptance of the session authority, canonical identity, lifecycle
  state machine, stale-clock, atomic linkage, counter, and recovery contracts.
- Frozen complete fixtures, fault/race schedule, side-effect denominator,
  expected oracle, R-13 profile, `G-ICM-01`, and source bundle.

Do not invoke or build a PoC for R-20 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-20; accept an ADR, architecture, or MTP; pass ABM; or authorize
Construction. It also cannot authorize deployment, rollout, or production
lifecycle changes.
