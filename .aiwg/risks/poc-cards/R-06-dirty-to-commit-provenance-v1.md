# R-06 Dirty-to-Commit Provenance Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-06`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-06-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  Git witness, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can every qualifying dirty event be bound to one canonical project, stable
worktree, base commit, relative path or rename chain, pre/post content digests,
session, invocation, and observed time, then be linked only to a
server-verified descendant commit with a matching path/blob transition under a
predeclared linkage denominator?

## One bounded hypothesis

For the frozen two-project, multi-worktree corpus, an append-only dirty-event
ledger and server-side Git lineage verifier produce 100% correct fixture
lineage, zero false clean attributions, and valid commit linkage for at least
95% of the predeclared eligible denominator while leaving every unmatched,
deleted, superseded, or unverifiable event explicitly dirty or uncertain.

## Current-source finding and test gap

At the source candidate, Codebase Memory graph discovery identified
`captureWorktreeProvenance`, `captureToolEvent`, `collectCommitLinkage`, and the
commit-link functions as the relevant structural path; direct source
verification then found:

- `src/hooks/_capture.ts:31-37,186-242` binds a mutation to project,
  credential-free worktree ID, current `HEAD`, path, operation, and one Git
  blob digest. The provenance object has no dirty-event ID, observed time,
  session/invocation binding, or explicit pre/post digest pair, and collection
  depends on recognized tool input rather than lifecycle-boundary
  reconciliation.
- `src/hooks/post-commit.ts:36-93,126-159` derives commit metadata and
  path/blob transitions from Git, but accepts an environment-supplied SHA and
  sends a caller-populated body to `/agentmemory/session/commit`; it does not
  name the dirty event IDs superseded by the commit.
- `src/functions/coding-memory.ts:1232-1280` accepts `sha`, `project`, and
  optional `sessionId`, writes `KV.commits`, and then updates the session in a
  separate write. `src/triggers/api.ts:1315-1384` likewise accepts caller
  commit fields, creates commit state before the separately locked session
  update, and does not verify the commit object, ancestry, worktree, path,
  rename chain, or blob against a server-controlled Git witness.
- `test/capture-profile.test.ts:49-277` separately checks deterministic dirty
  capture and commit transition extraction. `test/coding-memory.test.ts:470-512`
  and `test/integration.test.ts:486-535` use synthetic SHA strings to check
  idempotent linking and health counts. They do not execute a dirty-event to
  server-verified commit lineage denominator, shell-write reconciliation,
  adversarial ancestry/blob cases, or every boundary between commit and
  session persistence.

`G-ICM-01` maps eight REST, MCP, and hook surfaces to `ICM-07`, but those
mechanism backlinks are not the missing cross-surface lineage proof.

## Frozen prerequisites

1. Immutable source bundle for the source candidate and a verified source-lock
   digest.
2. Configuration Manager-approved canonical project/worktree identity
   registry, including stable worktree UUIDs and expected equivalence classes.
3. Versioned dirty-event and commit-receipt schemas covering event ID,
   canonical project, worktree UUID, base commit, relative path/rename chain,
   pre/post Git-blob digests, operation, observed time, session, invocation,
   commit object, parents, and terminal disposition.
4. A linkage-denominator manifest frozen before execution. It must list every
   dirty event ID, eligibility outcome, inclusion/exclusion reason, expected
   commit or terminal unlinked disposition, and the exact numerator formula:
   `server_verified_linked_events / eligible_dirty_events`.
5. Synthetic Git object bundles, repositories, worktrees, clocks, event
   corpus, fault schedule, and expected lineage oracle; no user repository.
6. Accepted R-13 execution profile, complete applicable `G-ICM-01` surface
   denominator, signer authority, and independent verification environment.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Git/Runtime Owner | Unassigned |
| Identity and denominator custodian | Configuration Manager | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Architecture reviewer | Software Architect | Unassigned |
| Executor | Isolated premium coding worker, separate from reviewers | Unassigned |
| Git witness operator | Custodian of the immutable fixture object bundle | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Fixtures

- `PROJECT-A` and `PROJECT-B` with distinct canonical remotes and identical
  basenames.
- `PROJECT-A-WT-1`, `PROJECT-A-WT-2`, and `PROJECT-B-WT-1`, each with a frozen
  stable worktree UUID and independent base ancestry.
- Dirty events for write, edit, multi-edit, create, delete, rename, rename plus
  edit, revert-to-base, repeated observation, excluded path, and unmatched
  expiry.
- Shell/script writes absent from tool-input capture but discoverable at
  lifecycle reconciliation.
- Commits containing exact matches, partial hunks, squash, rename, deletion,
  wrong blob, wrong path, wrong worktree, sibling ancestry, unrelated history,
  forged SHA, missing object, and supplied metadata inconsistent with Git.
- Concurrent commit/session linkage, delivery retry, process restart, and
  journal-resume cases with deterministic barriers.

## Fault matrix

- Inject failure immediately before and after dirty-event ID allocation,
  pre-image read, mutation observation, post-image read, ledger append,
  lifecycle reconciliation, and terminal dirty disposition.
- Inject failure immediately before and after commit-object lookup, parent and
  ancestry verification, path/rename matching, blob comparison, commit receipt
  append, session linkage, audit/outbox append, and success response.
- Kill and restart the fixture process at every persisted write boundary,
  including the interval after commit state exists but before session linkage.
- Interleave two worktrees and two projects at every matching and persistence
  barrier; retry each request with the same and conflicting invocation IDs.
- Supply forged, abbreviated, missing, sibling, and non-descendant commit IDs,
  altered path/blob metadata, clock skew, and denominator/exclusion drift.

## Governed sinks and side effects

The denominator includes fixture Git refs and objects, dirty-event ledger,
commit receipts, commit index, session links, path/rename indexes, eligibility
and supersession state, reconciliation cursor, journal, audit/outbox, retry
queue, logs, metrics, stdout/stderr, temporary files, snapshots, rollback
artifacts, raw evidence, and immutable receipts. An unenumerated sink blocks
the card; it is not treated as empty.

## Measurable pass/fail criteria

| ID | Pass | Fail |
|---|---|---|
| R06-PF-01 | 100% of the frozen qualifying dirty-event denominator has exactly one append-only receipt with the expected canonical project, worktree UUID, base, path/rename chain, pre/post digests, operation, time, session, and invocation. | Any missing, duplicate, mutable, or misattributed receipt. |
| R06-PF-02 | Lifecycle reconciliation detects 100% of frozen shell/script mutations and creates no receipt for excluded or unchanged paths. | Any eligible shell/script write is missed or any excluded/unchanged path is admitted. |
| R06-PF-03 | The server verifies full commit object identity, parents/ancestry, canonical project/worktree, path/rename chain, and blob digest from the immutable Git witness before linking. Every adversarial commit fixture is rejected with zero clean attribution. | Trust in supplied SHA/metadata, acceptance of any mismatched fixture, or a commit link without witness verification. |
| R06-PF-04 | Every commit receipt names the exact dirty event IDs it supersedes; unmatched events remain `dirty`, `uncertain`, `deleted`, `superseded`, or `expired_unlinked` according to the frozen oracle. | Any unmatched event is represented as committed or clean, or a stale event remains eligible after supersession. |
| R06-PF-05 | The emitted pre-run denominator hash matches the sealed denominator, fixture lineage is 100% correct, and `server_verified_linked_events / eligible_dirty_events >= 0.95` with no post-run exclusion or denominator change. | Ratio below 0.95, denominator inflation, undeclared exclusion, or a changed denominator hash. |
| R06-PF-06 | Every injected failure and retry exposes either no new linkage or one recoverable journal that converges to one commit receipt plus reciprocal session link; no orphan or duplicate remains. | Partial commit/session state is accepted as terminal, recovery is ambiguous, or retry duplicates lineage. |

## Stop and backtrack

Stop on the first real repository path, user content, credential, cross-project
attribution, forged lineage acceptance, denominator drift, write outside the
disposable roots, or failure that cannot identify the last durable boundary.
Revoke fixture capabilities, stop fixture workers, preserve redacted evidence,
mark all affected events ineligible, disable fixture commit-derived promotion,
and return to identity/schema design. Do not continue later fault cases after
a containment breach.

## Immutable receipt

The sealed receipt must bind risk/card version, source and source-bundle SHAs,
identity-registry generation, dirty/commit schema versions, denominator and
fixture-manifest SHAs, expected lineage oracle, complete ordered event and
fault schedule, Git object-bundle/ref hashes, pre/post namespace manifests,
every raw sink hash, linkage numerator/denominator and exclusions, executor,
Git witness operator, environment/process identity, signer, and independent
verification disposition.

## Rollback and cleanup

Use only disposable repositories, worktrees, homes, Git object stores, and
state namespaces. Restore each immutable fixture pre-image, remove only
manifested temporary refs/files and unsealed scratch state, revoke fixture
capabilities, terminate fixture workers, and verify zero queued or orphaned
fixture linkage. Retain the sealed receipt and every raw artifact it names;
perform no cleanup against a user or live repository.

## Admission blockers

- Named humans for every actor slot and accountable-owner calibration of R-06.
- Human acceptance of the canonical identity, dirty-event, commit-lineage,
  denominator, terminal-disposition, journal, rollback, and receipt contracts.
- Frozen exact fixture IDs, Git object bundle, lineage oracle, fault matrix,
  governed-sink denominator, R-13 profile, `G-ICM-01`, and source bundle.
- Independent verifier and signer trust, custody, freshness, revocation, and
  replay policy.
- Human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Current execution decision: **BLOCKED-NOT-ADMITTED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-06; accept or baseline an ADR, SAD, architecture, MTP, or ABM result;
authorize Construction; or authorize deployment, distribution, rollout, or
production commit-derived promotion.
