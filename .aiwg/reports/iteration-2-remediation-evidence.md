# Elaboration Iteration 2 Remediation Evidence

Status: **CANDIDATE EVIDENCE - NO RISK RETIREMENT**

Starting revision: `2359478defcea073bff428c3bd5e2dac4e2d0bca`

This report records reproduced failures and candidate fixes. It does not accept
an ADR, baseline architecture, change a risk status, authorize Construction, or
authorize distribution.

## G-ICM-01

The generated inventory now covers REST, MCP transport, tools, resources,
prompts, standalone fallback tools, packaged hooks, host hook manifests,
viewer calls/proxy behavior, providers, and connector adapters. Every generated
surface has a stable `surface_id`. `npm run evidence:interfaces -- --check`
fails for drift or a non-allowlisted REST route without authentication.

Remaining gate work: independent Configuration Manager review of denominator
completeness and exact requirement/risk/test backlinks.

## R-14 Authentication

Pre-fix proof:

- missing server secret allowed REST middleware to continue;
- 115 protected REST registrations lacked effective authentication; and
- MCP returned success when no secret was configured.

Candidate fix:

- one shared authorization decision is used by direct REST handlers, REST
  middleware, and MCP handlers;
- only liveness and health are public;
- missing secret returns typed `503 authentication_unavailable`;
- missing or wrong credentials return `401 unauthorized`; and
- the governed integration profile cannot omit its synthetic secret.

Focused post-fix tests passed. R-14 remains identified until independent review
of the complete generated interface matrix and authenticated runtime receipt.

## R-13 Deterministic Qualification

The harness governs the exact 140-file manifest (the 138-file baseline plus
context-delivery route and file-index outcome suites), rejects skipped
tests, requires the three authentication cases, records process-tree RSS and
worker lineage, imposes a 30-minute and 4-GiB/50%-RAM bound, and emits
machine-readable receipts.

Three harness defects were found through proof-first runs and fixed:

1. unavailable process telemetry could crash outside the receipt path;
2. unique sequential fork PIDs were incorrectly treated as concurrent workers;
3. a referenced deadline timer kept a passing runner alive.

The four CI profiles install iii-engine `0.11.2` from official release assets
and verify the published archive SHA-256 before execution. Local unverified
engines require an explicit provisional-run override.

The security-reviewed dirty-tree canary passed all 140 expected files and 1,519
assertions with a complete source-tree digest. A subsequent clean post-commit
run also passed all 140 files with zero missing, extra, or skipped tests, and
peak measured worker concurrency one. The validator requires `result: pass`.
The clean run resolves local source attribution, but remains provisional
qualification because it used Node 26 and the pre-existing iii-engine binary
lacked release provenance. It is not cross-platform qualification evidence.

The harness now terminates complete process trees with bounded TERM/KILL
escalation, verifies exact test contents as well as filenames, runs its own
self-tests and the interface generator in CI, and schema-validates every
uploaded receipt. Reviewer-owned black-box probes and external digest anchors
remain required because candidate-controlled CI cannot independently attest
itself.

R-13 remains identified until five fresh runs pass on macOS and Ubuntu with
Node 20.19+ and Node 22 and their receipts are independently reviewed.

## R-01 Identity

Candidate normalization preserves non-default ports and path case on
case-sensitive Git hosts, while retaining lower-case GitHub/GitLab identities.
A present but unnormalizable remote now fails closed instead of silently
falling back to a path identity. Focused collision and hook tests pass.

R-01 remains identified pending migration/alias proof against existing data.

## R-02 Privacy

Candidate changes redact structured secret keys, recognized token formats, PEM
blocks, and unterminated private blocks before memory persistence and embedding.
Environment-style keys such as `OPENAI_API_KEY`, `client_secret`, and
`access_token` are included. Logger messages and fields use the same recursive
sanitizer. Coolify, Fly, Railway, and Render never print generated or injected
credentials; injected environment values take precedence over file fallback.

Remaining proof includes encoded-secret fixtures, image metadata removal, all
export/snapshot sinks, and a zero-raw-occurrence scan. R-02 remains identified.

## R-07 And R-08 Operations

All deployment entrypoints now match the safe 10% sampling and no-console-log
profile. Capture admission is bounded at 256 concurrent operations with typed
retryable rejection and health counters.

Health no longer defaults a missing snapshot to healthy. KV and worker-probe
failure are critical, and recovery requires three consecutive healthy
collections. A final diagnostic pass also exposed that `agentmemory doctor`
could report health `unknown` while returning success; critical passive server
and health failures now contribute to the command's failing exit status.
Detailed health telemetry now requires authentication; only the constant
liveness surface remains public.
Load, recovery-window, deployed-runtime, and fresh-binary doctor receipts
remain required; R-07 and R-08 remain identified.

## R-15 Provider Egress

Provider attempts now carry project, session, purpose, data class, provenance,
provider identity, processing location, and allow/deny policy. Vision query and
image embedding enforce policy before provider invocation. Hybrid retrieval
falls back to BM25 without invoking a denied embedding provider, and fallback
chains re-evaluate each provider independently.

Smart-search now propagates project/session processing context into hybrid
retrieval. Missing context, including global searches, defaults to BM25-only
rather than permitting an external query embedding.

Recorder regressions pass for strict-project vision, hybrid, and fallback
paths. Provider descriptor hardening and complete production call-site
propagation remain review items; R-15 remains identified.

## R-17 Context Degradation And R-04 Delivery

Context packets now report each source as `ok`, `unavailable`, or `failed`.
Advisory mode returns typed degradation; gate-critical mode fails closed when a
required source is incomplete. Generation creates an expiring packet record but
does not suppress any source.

Authenticated REST and MCP acknowledgement surfaces bind packet, project,
session, source IDs, expiry, context digest, nonce, provider identity, and
globally unique receipt ID. Acknowledgement is idempotent, replay-resistant,
and fails closed unless a configured trusted verifier accepts the evidence;
only an accepted acknowledgement creates suppression markers.
Focused context and route suites pass. Provider-specific receipt
cryptographic verification and live dispatch fault receipts remain; R-17 and
R-04 remain identified.

## R-06 Dirty-To-Commit Provenance

Mutation capture now records a credential-free worktree ID, base HEAD SHA,
dirty state, project-relative file operation, and Git-blob digest while
retaining the balanced profile's required full capture. Post-commit capture
records parent/commit SHA and add/edit/delete/rename/copy transitions with blob
digests without storing file content.

Focused capture and connector tests pass. End-to-end dirty-record matching,
supersession, and the 95% eligible commit-linkage target still require live
receipts; R-06 remains identified.

## Independent Security Review Follow-Up

The final adversarial pass also caused observation writes to reject an existing
session whose project or working directory does not match before compaction,
image, KV, index, or stream side effects. Explicit global REST/MCP scope now
requires a separate `AGENTMEMORY_ADMIN_SECRET`; a normal service bearer cannot
request global scope.

Named-project capabilities are not yet cryptographically bound to a project,
so a service bearer can still request another known project by name. Connector
migration to project-bound capabilities, reviewer-owned qualification, and
provider verifier wiring remain identified gates. This iteration does not
claim those risks retired.
