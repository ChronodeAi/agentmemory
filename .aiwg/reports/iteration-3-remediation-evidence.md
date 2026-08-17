# Elaboration Iteration 3 Remediation Evidence

Status: **CANDIDATE EVIDENCE - NO RISK RETIREMENT**

Starting revision: `3b6794e409dcc4bbd644904ffbb6edc93761adee`

This iteration implemented the adversarial-review recommendations in the
isolated Agentmemory worktree. It did not deploy Agentmemory, modify Memetics,
accept an ADR, baseline architecture, change any risk status, authorize ABM
transition, or authorize Construction.

## Implemented Candidate Controls

### Project authorization and isolation

- Exact-project capabilities are signed, expiry-bound, audience-bound, and
  transported with an explicit project binding.
- REST rejects disagreement between header, body, and query project bindings.
- Standalone MCP derives project scope from direct and generic tool arguments,
  mints an exact-project capability, and uses a separate admin credential for
  explicit global or migration operations.
- Hooks and connectors support direct secrets or secret files while preserving
  process-environment precedence over user configuration.
- Summarization now requires the requested project to match the stored session
  before observations or providers are accessed.

### Context, capture, and provenance

- Context packets enforce source eligibility, bounded budgets, typed
  degradation, signed delivery acknowledgement, replay protection, and
  per-session suppression only after accepted delivery evidence.
- The balanced profile bounds low-value and high-value output, redacts
  sensitive content, hash-deduplicates repeated events, and records capture
  admission metrics.
- Rolling compaction creates a summary before archiving detailed observations.
  A failed summary now returns a retryable error and leaves all source
  observations intact.
- Commit linkage records the project, session, parent and commit SHAs,
  credential-free worktree identity, file transitions, and Git blob digests.
  Failed linkage is now visible and exits nonzero.
- REST and MCP commit listing and commit-to-session lookup require an exact
  project or an explicit administrator-authorized global scope. Corrupt
  cross-project session links are excluded from project responses.
- Session registration and closure use bounded, project-authenticated delivery.
  Failures are written to stderr rather than silently discarded. Session
  closure is the single owner of summary and promotion generation.
- Observational telemetry retries are bounded to two 250 ms attempts and report
  failures without failing the host command. Context delivery, commit linkage,
  and lifecycle boundaries retain their stricter failure semantics.
- Stale sessions are marked `abandoned` with closure timestamps. Session and
  observation history are retained, and recovered consolidation is invoked
  separately for each project.

### Promotion and durable intelligence

- Promotion candidates are capped at three per substantive session.
- Bug and workflow auto-promotion requires fresh reproduced-failure,
  passing-verification, and source or commit evidence.
- Architecture, preference, security, and business candidates remain
  explicitly approval-gated and point to canonical ADR/commit provenance.
- Recalled content cannot become fresh evidence without new verification.
- Semantic duplicates reinforce existing lessons and insights.
- Reflection provider failures now increment `clustersSkipped` and emit a
  diagnostic instead of being reported as processed. Lesson, insight, and
  promotion audit failures are no longer silent.

### Health, recovery, and compatibility

- Health reports capture capacity, KV and worker failures, memory pressure,
  project metrics, build identity, and recovery hysteresis. Critical health
  states affect CLI exit status.
- The viewer distinguishes liveness, compatibility, and authenticated health
  rather than displaying an unexplained `Unknown`.
- Snapshot manifests cover exact artifacts and hashes. Restore verifies
  integrity before replacement.
- Snapshot graph-name reconstruction preserves both canonical
  `project|type|name` keys and predecessor `type|name` keys. A secondary
  namespace-ledger failure no longer makes a successfully committed primary
  state write appear to have failed; later snapshot capture still fails closed
  if the key cannot be reconstructed.
- Migration uses a global lock, staged journal, in-flight target tracking,
  conflict detection, resumable steps, and bounded rollback. REST and CLI
  responses expose `operationSucceeded` separately from migration
  `success`, so a confirmed rollback cannot be mistaken for an incomplete
  operation. The CLI performs real authenticated loopback requests.
- Graph reads and writes require project or explicit global scope. Persisted
  graph nodes and edges carry project identity, edge endpoints are remapped to
  canonical persisted node IDs, and partial graph builds return retryable
  service failures rather than HTTP success.
- Mesh export filters memories, actions, semantic and procedural records,
  relations, graph nodes, and graph edges to the exact project. Legacy
  unscoped records and cross-project relations or edges are excluded. Global
  peer sync is explicit and uses the administrative peer credential.
- Project-capability MCP callers discover only project resource templates;
  global status, latest-memory, and team resource names remain
  administrator-only.

### Qualification harness

- R-13 owns the exact test filename and content manifests, requires the
  authentication cases, rejects skipped tests, limits execution to one worker,
  measures process-tree RSS, captures source and artifact hashes, and
  schema-validates receipts.
- Successful runs with any environment waiver are labeled
  `provisional-pass`. The validator accepts their integrity but rejects them
  when qualification is required.

## Verification Evidence

- `npm run build`: pass.
- Focused scope, mesh, hook, snapshot, resource, and migration regression
  checks: 83 tests passed.
- Interface inventory generator and self-test: pass; generated inventory
  reports 135 HTTP routes, 59 MCP tools, five MCP resources, and zero
  missing-auth REST routes.
- R-13 harness self-tests: 12 passed.
- Full R-13 run: 148 expected and observed test files and 1,629 passing tests;
  zero missing, extra, skipped, or failed files; exit code zero.
- Test manifest SHA-256:
  `5f3f5736310cc634872622669452535fea6c6ce93b5abcfd88b5af981ec69550`.
- Test content SHA-256:
  `fe839458881bea1f8d937b1ee8cec1039e08d7431d794440278301730f435d33`.
- Full-run process duration: 34,545 ms.
- Peak measured RSS: 488,112,128 bytes.
- Peak concurrent workers: one.
- Candidate receipts are emitted under
  `.aiwg/working/evidence/r13/provisional/`; run-specific identifiers stay out
  of this tracked report so receipt source linkage is not self-invalidating.
- Receipt result: `provisional-pass` with only the declared
  `unqualified-node-profile`, `dirty-source`, and
  `unverified-iii-provenance` waivers.
- Run-specific receipts are retained under
  `.aiwg/working/evidence/r13/provisional/` and remain excluded from release
  artifacts.
- Receipt integrity validation: pass.
- Qualification-required validation: expected fail because the receipt is not
  a passing qualification receipt.
- `git diff --check`: pass.
- Codebase Memory full reindex: 6,873 nodes, 18,902 edges, zero skipped files,
  and zero partial parses.

The standalone TypeScript checker still reports the same 11 pre-existing
baseline findings in diagnostics, export/import, image quota, leases,
retention, skill extraction, working memory, OpenAI provider, index
persistence, and reranking. No finding points to an Iteration 3 file or
interface. These findings are not reclassified or remediated by this report.

## Remaining Gates

1. Produce clean qualification receipts on the declared Node 20.19+ and Node 22
   macOS/Ubuntu profiles with verified iii-engine release provenance.
2. Obtain reviewer-owned digest anchors, black-box probes, and independent
   Configuration Manager, Security, Test, and Operations review.
3. Run the authorized Memetics data migration, rebuild indexes, and perform the
   five-session Codex/Claude canary. No production memory was migrated here.
4. Demonstrate live precision at or above 80%, duplicates below 2%, eligible
   commit linkage at or above 95%, context injection at or below 2,000 tokens,
   and p95 hook latency below two seconds.
5. Complete synthetic secret absence scans across observations, embeddings,
   summaries, exports, snapshots, and provider request captures.
6. Validate Codebase Memory canonical-index alias equivalence and separately
   govern any Codebase Memory fork changes.
7. Resolve or formally baseline the pre-existing TypeScript findings.
8. Prove connector migration for legacy-secret-only clients before enabling
   strict capability mode broadly. The strict default is intentional and was
   not weakened for compatibility.
9. Introduce or approve a dedicated, least-privilege mesh peer credential
   before federated mesh sync is treated as production-ready; the current
   administrative credential is acceptable only for the isolated candidate.
10. Preserve dispatch-before-acknowledgement for context as at-least-once
    delivery: a rejected acknowledgement must not suppress its source IDs.
    Provider-native delivery evidence remains a canary gate.

All risks remain `IDENTIFIED`. The existing ABM **FAIL / NO-GO** remains in
force, and Construction remains **NOT AUTHORIZED**.
