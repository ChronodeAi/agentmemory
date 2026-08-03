# R-10 Codebase Memory Canonical Alias Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-10`
Priority: P1
Evidence method: bounded `build-poc` after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Agentmemory design source: commit
  `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`, tree
  `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-10-v1.json`.
- Accepted Codebase Memory source/binary, approved sandbox index copies,
  qualification source, disposable mechanics bundle, selected profile,
  signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and live-index mutation: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can one owner-verified canonical Codebase Memory project and one physical index
serve canonical and temporary-alias consumers with identical results for a
frozen 20-query manifest, exactly one writer lease, no duplicate store, and
rollback that removes only sandbox routing and restores the exact sandbox
pre-image?

## One bounded hypothesis

Within read-only source and index copies, a versioned temporary alias routes to
the same canonical physical store, active generation, roots, filters, revision,
and writer lease, yielding identical counts and normalized result hashes for
all 20 frozen queries and exact rollback with zero live-index mutation,
deletion, or duplicate creation.

## Current-source finding and test gap

Codebase Memory graph discovery was performed first against the Agentmemory
candidate and a read-only Codebase Memory 0.9.1 checkout. Direct source
verification found:

- The Agentmemory candidate has no repository-local
  `.codebase-memory/config.toml`, runtime alias implementation, or executable
  R-10 fixture. Proposed
  `.aiwg/architecture/adr/ADR-004-codebase-memory-interoperability.md` assigns
  reindex, alias, and duplicate retirement to later external work.
  `.aiwg/architecture/interface-control-matrix.md` contains the documentary
  proposed `ICM-15` control and the traceability matrix contains
  `TR-UCM-015`; the generated interface inventory has no executable local
  Codebase Memory surface/backlink, and no frozen 20-query fixture exists.
- In the read-only Codebase Memory 0.9.1 candidate
  `9dfd9ec66e8f7796d7287cc34e5e3f8831c5f95b`,
  `src/mcp/mcp.c:1314-1406` normalizes path-like requests, accepts alternate
  argument field names, and may resolve a unique filename-tail match;
  `src/mcp/mcp.c:1773-1782,1983-2077` derives and opens a database path from
  the resolved project string. This is not an owner-verified,
  generation-bound canonical-to-alias routing registry.
- In that external candidate, `src/daemon/application.c:1631-1635` derives an
  index job key from a root or caller override, and
  `src/daemon/project_lock.c:23-40` derives the writer lock from the supplied
  project key. No inspected path proves canonical and alias keys resolve to one
  physical store and one lease before a write.
- Existing external tests at `tests/test_mcp.c:3196-3283` prove that
  `project_name` is accepted as an argument-name alias, while
  `tests/test_project_config.c:87-126` proves canonical config parsing and
  path filters. They do not freeze five symbol searches, five caller/callee
  traces, five exact snippets, and five ADR/decision lookups across canonical
  and alias identities; nor do they prove one writer, consumer cutover, or
  exact routing-only rollback.

The external checkout observation is advisory and is not silently incorporated
into the Agentmemory source identity. Its exact source must be separately
accepted and frozen before execution.

## Frozen prerequisites

1. Immutable Agentmemory source bundle for the source candidate and a
   separately accepted immutable Codebase Memory 0.9.1 source/binary tuple.
2. Configuration Manager-signed canonical project registry containing the
   canonical ID, temporary alias, owner, expiry, physical-store identifier,
   active generation, source revision, roots, decision roots, excludes, path
   filters, and collision policy.
3. A 20-entry ordered query manifest frozen before execution: exactly five
   symbol searches, five caller/callee traces with declared direction/depth,
   five exact source snippets, and five ADR/decision lookups. Each entry binds
   exact tool, structured input, normalization policy, expected result schema,
   and input SHA-256.
4. Read-only acquisition manifest and immutable hashes for sandbox copies of
   the canonical store, any duplicate-key store retained for comparison, source
   tree, configuration, and consumer routing files.
5. One-writer lease protocol, complete consumer inventory, normalized result
   oracle, sandbox routing transaction, and exact rollback manifest.
6. Accepted R-13 execution profile, applicable `G-ICM-01` controls, signer
   authority, and independent verification environment.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Codebase Memory Maintainer | Unassigned |
| Architecture reviewer | Software Architect | Unassigned |
| Configuration and identity custodian | Configuration Manager | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Agentmemory consumer owner | Agentmemory Maintainer | Unassigned |
| Executor | Isolated premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Fixtures

- Immutable sandbox source copy at the accepted Agentmemory revision and two
  hashed sandbox index copies acquired without opening a live store for write.
- `CANONICAL-PROJECT`, `TEMPORARY-ALIAS`, `UNKNOWN-ALIAS`,
  `EXPIRED-ALIAS`, `WRONG-OWNER-ALIAS`, `CHAINED-ALIAS`,
  `CYCLIC-ALIAS`, and `AMBIGUOUS-TAIL-ALIAS`.
- Canonical and duplicate-key store pre-images with frozen file, node, edge,
  project, package, route, and decision counts.
- The exact 20-query manifest with stable expected ordering and normalization
  for volatile timing/path fields.
- At least two read consumers and two concurrent write contenders using
  canonical and alias names against deterministic lease barriers.
- Recording filesystem, SQLite/store, daemon, lock, watcher, log, metric,
  queue, config, and receipt sinks, with live paths mounted or permissioned
  read-only.

## Fault matrix

- Inject failure immediately before and after sandbox copy verification,
  canonical registry read, alias validation, routing stage, routing activation,
  physical-store open, active-generation read, and consumer cutover.
- Inject failure immediately before and after writer-lease request, acquisition,
  guarded sandbox write, manifest publication, lease release, and retry.
- Kill and restart the sandbox daemon at every routing, lease, query, write,
  activation, receipt, and rollback boundary.
- Interleave canonical and alias readers and writers; expire, revoke, replace,
  chain, cycle, ambiguously match, or change ownership of the alias at each
  deterministic barrier.
- Inject query timeout, partial result, reordered result, stale source revision,
  changed root/filter, corrupt copied store, symlink substitution, rollback
  interruption, and attempted access to every live-index write/delete path.

## Governed sinks and side effects

The denominator includes sandbox source/config copies, canonical and retained
duplicate store copies, SQLite files and journals, graph generations, project
registry and alias routing, writer locks/leases, daemon/watch jobs, consumer
configuration, roots/filters, normalized query inputs/results, logs, errors,
metrics, queues, temporary files, rollback artifacts, raw evidence, and
receipts. Live Codebase Memory databases, configurations, aliases, watchers,
locks, and registry entries are governed zero-write sinks: any mutation,
deletion, retirement, or duplicate creation there fails and stops the card.

## Measurable pass/fail criteria

| ID | Pass | Fail |
|---|---|---|
| R10-PF-01 | Canonical and alias resolution return the same frozen physical-store identifier and active generation; exactly one sandbox database/index and no alias-named copy exists. | Different store/generation, a second store, copied index, or ambiguous resolution. |
| R10-PF-02 | Canonical and alias file, node, edge, project, package, route, and decision counts are identical and match the frozen pre-run manifest. | Any count divergence, stale revision, root/filter mismatch, or undeclared generated artifact. |
| R10-PF-03 | All 20 ordered query pairs execute once per identity and have identical normalized result counts, item identities, ordering, and SHA-256s; exactly 5/5 searches, 5/5 traces, 5/5 snippets, and 5/5 decision lookups match. | Any missing, extra, divergent, lossy, reordered-after-normalization, or non-deterministic result. |
| R10-PF-04 | Canonical and alias write contenders resolve to the same lease key; maximum concurrent sandbox writers is exactly one, every accepted write is attributable once, and retries create no duplicate generation. | Distinct leases, concurrent writers greater than one, duplicate publication, or unattributed write. |
| R10-PF-05 | Unknown, expired, revoked, chained, cyclic, wrong-owner, and ambiguous aliases fail closed with zero sandbox-store mutation. | Any negative alias routes, writes, creates a store, or falls back to a guessed project. |
| R10-PF-06 | Rollback removes only sandbox alias routing and restores byte-identical config/store/registry/lock pre-images with zero temporary or queued residue; canonical access still returns all 20 expected results. | Rollback alters canonical data, leaves routing/residue, changes a hash, or requires duplicate-index deletion. |
| R10-PF-07 | Recording sinks show zero write/delete/rename/lock/watcher/registry attempts against live index paths, and live pre/post content hashes remain identical. | Any live mutation or deletion attempt, alias activation, reindex, or duplicate retirement. |

## Stop and backtrack

Stop at the first canonical/alias result divergence, second writer, duplicate
store, live-path write attempt, ambiguous ownership, source/filter drift,
rollback mismatch, or unmanifested side effect. Disable sandbox alias routing,
revoke fixture leases, stop sandbox daemons/watchers, preserve redacted
evidence, and return to registry or routing design. Do not delete or mutate
either live index and do not continue after a containment breach.

## Immutable receipt

The sealed receipt must bind risk/card version, Agentmemory and Codebase Memory
source/binary SHAs, source-bundle and sandbox-copy hashes, canonical registry
generation, owner/expiry, physical-store and active-generation identifiers,
root/filter/source-revision manifests, exact 20 query inputs and normalization
policy, per-query raw and normalized result hashes/counts, node/edge/file and
decision counts, ordered lease/write/fault events, live zero-write observations,
rollback pre/post hashes, executor, environment/process identity, signer, and
independent verification disposition.

## Rollback and cleanup

Operate only in disposable homes with copied configuration and index files.
Remove sandbox alias routing, restore the exact sandbox pre-images, release
fixture leases, terminate sandbox daemons/watchers, and remove only manifested
unsealed temporary artifacts after zero-residue verification. Preserve the
sealed receipt and all named raw evidence. Never delete, retire, reindex,
rewrite, or activate an alias against a live Codebase Memory store.

## Admission blockers

- Named humans for every actor slot and accountable-owner calibration of R-10.
- Human acceptance of the exact external Codebase Memory source/binary,
  canonical identity registry, alias ownership/expiry, one-writer, consumer
  cutover, query normalization, rollback, and receipt contracts.
- Frozen 20-query manifest, sandbox-copy hashes, consumer inventory, expected
  counts/results, negative aliases, fault matrix, governed-sink denominator,
  R-13 profile, `G-ICM-01`, and immutable source bundles.
- Demonstrated sandbox isolation and enforceable prohibition on live index
  mutation, deletion, alias activation, reindex, or duplicate retirement.
- Independent verifier and signer trust, custody, freshness, revocation, and
  replay policy.
- Human admission changing this exact card version to
  `READY-FOR-BOUNDED-EXECUTION`.

Current execution decision: **BLOCKED-NOT-ADMITTED**.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-10; accept ADR-004 or any architecture; baseline an SAD or MTP; pass
ABM; authorize Construction; or authorize a live canonical reindex, alias
activation, consumer cutover, duplicate-index retirement, deployment,
distribution, or rollout.
