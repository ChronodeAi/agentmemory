# R-02 Secret Flow Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-02`
Priority: P1
Method: bounded build-poc after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-02-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  assertion/authentication identities, signer, verifier, and human
  assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can every admitted capture and configuration path remove a synthetic secret
before serialization, transport, persistence, logging, backup, export, or
failure-remnant boundaries, with zero raw occurrence in the complete frozen
sink denominator and without examining any real secret?

## One bounded hypothesis

For one frozen synthetic corpus and complete governed-sink manifest, every
literal, encoded, structured, multiline, malformed-tag, error-path,
image-metadata, and synthetic-PII canary is dropped or redacted before its
first governed boundary, producing zero unexpected raw occurrence and one
traceable disposition per input without accessing, recording, or printing any
real credential or user content.

## Current-source finding and test gap

At the source candidate:

- `src/hooks/post-tool-use.ts:36-63` passes captured tool input, output, and
  image data to `deliverObservation`;
- `src/hooks/_capture.ts:312-350` applies exclusions, metadata selection, and
  truncation but does not call the authoritative sanitizer;
- `src/functions/observe.ts:120-135` sanitizes `payload.data` only after the
  hook transport has reached the server;
- `src/functions/privacy.ts:3-69` implements private-tag, structured-key, PEM,
  and pattern redaction;
- `src/cli/connect/util.ts:87-96` copies a connector source file verbatim into
  the backup directory; and
- current Railway source generates a fallback value, writes it to a
  permission-restricted file, and emits metadata-only messages
  (`deploy/railway/entrypoint.sh:80-92`), while operator guidance requires an
  injected service variable and says secrets are not logged
  (`deploy/railway/README.md:44-49`).

`test/privacy.test.ts:8-188` exercises sanitizer and logger examples,
`test/capture-profile.test.ts:279-295` checks one excluded path and one
representative credential, and `test/integration.test.ts:432-450` checks
server-side persisted redaction. They do not prove pre-transport redaction,
the complete encoded/malformed corpus, every sink and failure remnant, or
sanitized backup custody.

Any claim that a historical Railway deployment printed a secret value is
conditional and unverified. This card does not authorize Railway access,
deployment-history access, log retrieval, credential retrieval, or inspection
of any secret-bearing artifact. Historical containment may be represented
only by a human Railway owner's separately authorized, metadata-only,
no-secret attestation. Absence of that attestation is `NOT EVALUATED`, not
evidence that exposure did or did not occur.

## Required frozen prerequisites

1. Immutable source bundle for the candidate SHA and a content-addressed
   `G-ICM-01` snapshot covering all capture, transport, persistence, output,
   backup, export, provider, and failure surfaces.
2. Human-accepted R-13 execution profile and independent verifier.
3. Versioned synthetic corpus manifest with no production-format value copied
   from a real account, plus expected redaction/drop oracle for every item.
4. Complete governed-sink and side-effect denominator with recording adapters,
   source-to-sink path IDs, and explicit empty-sink evidence rules.
5. Accepted pre-boundary sanitizer contract, per-event/output bounds,
   exclusion policy, backup custody policy, and failure-disposition schema.
6. Disposable homes, repositories, state stores, provider endpoints, network
   namespace, Railway-container emulator, and file-system roots.
7. If historical Railway containment is included, a named human owner,
   metadata-only scope, and signed attestation schema that forbids source log
   or secret access by the executor.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Security Architect | Unassigned |
| Privacy reviewer | Privacy Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Operations reviewer | Operations Owner | Unassigned |
| Railway metadata attestor | Railway service owner, only if the conditional case is admitted | Unassigned / optional |
| Executor | Isolated synthetic-fixture operator, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- Labelled literal, encoded, structured, multiline, unterminated-private-tag,
  PEM-like, malformed, short-key, error-message, URL, header, environment,
  image-metadata, and synthetic-PII canaries.
- `POST-TOOL-USE`, `POST-TOOL-FAILURE`, prompt, session, subagent, commit, and
  direct REST/MCP capture envelopes at minimum, with oversized and excluded
  variants.
- Synthetic connector configurations containing canaries in owned, unrelated,
  malformed, symlinked, and concurrently changed entries.
- Synthetic injected-secret, fallback-secret-file, missing-secret, and
  unreadable-secret Railway-container fixtures; values remain inside recording
  fixture stores and are never emitted by the harness.
- Recording transport, KV/SQLite, BM25/vector, filesystem, logger, stderr,
  exception, audit, viewer/API, export, snapshot, backup, provider, queue,
  retry, receipt, and rollback sinks.

## Fault matrix

- Fail immediately before and after exclusion, redaction, serialization,
  fingerprinting, transport, server admission, persistence, indexing, audit,
  provider dispatch, export, snapshot, backup copy, rename, and rollback.
- Inject invalid JSON, encoding changes, partial writes, permission denial,
  symlink substitution, timeout, retry, process termination, logger failure,
  sanitizer failure, provider rejection, and receipt-write failure.
- Interleave two projects and two connector edits at every transport, backup,
  and persistence barrier.
- Exercise synthetic Railway first boot, restart, missing file, unreadable
  file, and injected-value precedence without contacting Railway or opening
  any historical or real secret-bearing artifact.

## Governed sinks and side effects

The denominator includes stdin buffers, capture objects, serialized request
bodies and headers, local/remote transport recordings, retry state,
fingerprints, dedupe material, KV/SQLite, streams, BM25/vector state, image
files and metadata, logs, stderr, exceptions, audits, metrics, health,
viewer/API/MCP responses, provider payloads, native-memory attempts, queues,
indexes, exact-facts ledgers, exports, snapshots, temporary files, connector
files, backups, Railway-container stdout/stderr, receipts, rollback artifacts,
and failure remnants. A missing or unobservable sink blocks the card and
cannot be counted as empty.

## Measurable pass/fail criteria

Pass requires all of the following:

1. Raw unexpected-canary occurrence count is exactly zero in every governed
   sink, and expected redaction markers match the frozen oracle.
2. The first serialized hook transport image contains zero raw canaries;
   server-side sanitization alone cannot satisfy this criterion.
3. Every input has exactly one attributable `dropped`, `redacted`, or
   `admitted-safe` disposition bound to its path and policy version.
4. Failure injection produces zero raw canary in errors, stderr, logs,
   retries, temporary files, backups, receipts, and rollback remnants.
5. Connector backup pre-images and post-images satisfy the accepted custody,
   permission, sanitization, and restoration oracle.
6. Synthetic Railway boot/restart cases emit zero synthetic-secret occurrence
   and preserve the accepted injected/file precedence and file-mode oracle.
   Historical Railway exposure remains `NOT EVALUATED` unless the conditional
   metadata-only attestation prerequisite is independently satisfied.
7. Source, corpus, fixture, sink, fault-schedule, and output manifests are
   complete and independently verified.

Fail is any unexpected raw canary, untraceable disposition, post-boundary-only
redaction, missing sink, unsanitized or ungoverned backup, secret-bearing
receipt, attempt to access a real secret or Railway history, source/profile
mismatch, or incomplete fault case.

## Stop and backtrack

Stop on the first unexpected raw canary, real credential or user-content
encounter, unmanifested network attempt, real-path escape, sink-denominator
gap, or rollback mismatch. Terminate fixture processes, block recording
egress, quarantine only manifested synthetic artifacts, preserve redacted
evidence, and return to source, corpus, or contract review. Do not continue to
later cases after a containment breach.

## Immutable receipt

The sealed receipt binds the risk/card version, source and source-bundle
digests, `G-ICM-01` digest, profile ID, corpus/fixture/sink manifests, sanitizer
and backup-policy versions, fault schedule, path IDs, expected and observed
occurrence counts, disposition counts, pre/post/rollback hashes, process and
environment identity, raw recording-sink hashes, executor, signer, and
independent verification disposition. It records corpus digests and redacted
markers only—never raw canary values, credentials, or user content.

## Rollback and cleanup

Use only disposable homes and recording sinks. Restore connector and
Railway-container pre-images, remove only manifested fixture files and
temporary/backup artifacts, revoke synthetic fixture authority, terminate
fixture processes, and verify zero queued/provider/network residue. Preserve
the immutable receipt and every manifested redacted raw-evidence object; do
not delete anything named by the receipt.

## Admission blockers and execution prohibition

- Named humans for the owner, three reviewers, executor, signer, and
  independent verifier.
- Human acceptance of the corpus, redaction/drop oracle, complete sink
  denominator, sanitizer boundary, backup custody, rollback, receipt, R-13
  profile, `G-ICM-01`, and immutable source bundle.
- A complete synthetic-only environment proving no route to production state,
  live provider homes, Railway, or real credentials.
- Separate human authorization and a no-secret metadata attestation contract
  if the conditional Railway-history case is included.

Do not invoke or build a PoC for R-02 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-02; accept an ADR, architecture, SAD, MTP, or ABM decision; authorize
Construction; or authorize deployment, distribution, rollout, credential
rotation, incident response, Railway access, or production use.
