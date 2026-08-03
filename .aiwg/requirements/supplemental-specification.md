# Supplemental Specification

Status: **REVIEW CANDIDATE - BLOCKED - HUMAN ACCEPTANCE REQUIRED**
Iteration: 4

## Decision boundary

This refinement decomposes existing FR/NFR parents into proposed atomic child
contracts. It does not accept or baseline requirements, accept an ADR or the
SAD/MTP, change a risk disposition, pass ABM, authorize Construction, or
authorize deployment or rollout. The current ABM FAIL / NO-GO remains in
force.

Parent IDs and intent are preserved. Lettered child IDs are subordinate
contracts, not replacement parent IDs. `Owner` names the proposed accountable
human role for accepting the contract and disposing its evidence; an agent
cannot act as that authority. Evidence descriptions below define acceptance
inputs only. Cross-artifact trace links remain exclusively authoritative in
`.aiwg/requirements/traceability-matrix.md`.

This Iteration 4 refinement preserves every pre-existing parent requirement and
adds proposed parent `FR-21`, for 33 parents total (21 FR and 12 NFR). It
preserves all 93 pre-existing child IDs and adds 37 proposed atomic children,
for 130 child contracts total. These counts are inventory facts, not human
acceptance or baseline evidence.

## Recorded DEC-15 and DEC-16 dispositions

The human disposition in the
[Iteration 4 local macOS disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md)
selected only the following requirements-governance options:

| Decision | Recorded selection | Scoped consequence |
|---|---|---|
| DEC-15 / CRD-01 | **Option A selected** | During Elaboration, canonical paths in the [Requirements Traceability Matrix](traceability-matrix.md), together with independently verified graph links, may satisfy bidirectional traceability. Live source and test annotations remain Construction work. The selection does not itself verify or accept a link. |
| DEC-16 / CRD-02 | **Option A selected** | `DES-UCR-001`, `DES-UCR-002`, and `DES-UCR-003` are the complete significant-use-case denominator. MIC and PSC layers are tailored out. Each realization must independently reach at least 80% of its frozen binary behavioral-unit denominator. |

The frozen realization denominators and thresholds are maintained in the
canonical RTM and the three realization files. This propagation adds no
requirement parent or child ID: the inventory remains exactly 33 parents and
130 children. It does not accept any requirement, behavioral unit, or
realization and does not infer Stage A, ABM passage, or Construction authority.

## Functional requirements

### FR-01: Resolve credential-free canonical project identity with hashed-path fallback.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-01.a | A remote-backed repository resolves to one canonical project ID without credential material. | Output matches the accepted host/port/path normalization profile; no user information, credential, query, fragment, trailing slash, or terminal `.git` remains. | Frozen canonical-remote equivalence corpus and redacted resolver receipt. | Software Architect |
| FR-01.b | Equivalent HTTPS, SSH, and SCP transport forms resolve to the same project ID. | Every accepted equivalence class produces exactly one project ID. | Frozen transport-equivalence corpus and result digest. | Configuration Manager |
| FR-01.c | Non-equivalent remote identities remain distinct. | Distinct hosts, non-default ports, and case-sensitive paths produce distinct project IDs in every negative fixture. | Frozen identity-separation and collision corpus. | Security Owner |
| FR-01.d | A repository with conflicting remote identities is denied until an identity remote is designated. | Resolution returns a typed conflict and creates no project-scoped record when designation is absent. | Multi-remote conflict fixture and no-write receipt. | Product Owner |
| FR-01.e | A repository without a remote receives a persistent local identity. | The persisted `local/<repository_uuid>` survives path moves; a path hash is used only as a bootstrap locator and never as continuing identity authority. | Remote-less move/worktree fixture and identity-registry snapshot. | Configuration Manager |

### FR-02: Migrate aliases/worktrees idempotently and fail on collisions.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-02.a | A worktree resolves to its repository project ID and a separate stable worktree UUID. | Two worktrees share exactly one project ID while retaining distinct stable worktree UUIDs. | Frozen main/worktree identity fixture and resolver receipt. | Software Architect |
| FR-02.b | An accepted alias routes to the canonical project without creating a second persisted identity. | Alias and canonical requests address the same generation and record denominator. | Owner-verified alias-registry fixture and state manifest. | Configuration Manager |
| FR-02.c | Repeating the same alias or worktree migration has no additional effect. | A second run changes zero governed records, aliases, indexes, or active-generation pointers. | Repeat-run migration receipt and before/after manifests. | Test Architect |
| FR-02.d | Ambiguous alias ownership or identity collision fails closed. | Alias chains, cycles, multiple owners, or one alias mapping to multiple canonical IDs activate no target generation. | Adversarial alias/collision corpus and activation-denial receipt. | Security Owner |

### FR-03: Enforce project scope on every record and interface; global is explicit.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-03.a | Every newly persisted project record contains one canonical project ID. | Project-ID coverage is 100% across the frozen new-record denominator. | Governed record manifest and project-field audit receipt. | Data Governance Owner |
| FR-03.b | Every project-scoped interface enforces exact project equality. | Header, body, query, capability, and tool-argument bindings agree; any mismatch returns denial and produces no governed side effect. | Frozen protected-interface project-binding matrix. | Security Owner |
| FR-03.c | Unresolved project access fails closed. | A missing or unresolved project returns a typed denial and discloses zero project records. | Missing-project negative suite and response corpus. | Security Owner |
| FR-03.d | Global access is separately authorized. | Access occurs only when `scope=global` is explicit and a distinct administrator credential is valid. | Global-scope positive/negative authentication matrix. | Security Owner |

### FR-04: Namespace project slots and return a working scoped slot list.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-04.a | Each slot is stored under exactly one canonical project namespace. | Identical slot names in two projects remain independently addressable with zero cross-project disclosure. | Two-project slot CRUD/isolation fixture. | Software Architect |
| FR-04.b | Slot listing returns the complete authorized project result. | The frozen slot denominator, including the reported 500-record case, is returned without records from another project. | Scoped slot-list pagination/500-case receipt. | Test Architect |

### FR-05: Deduplicate events and semantically duplicate observations below the accepted duplicate-rate threshold.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-05.a | Replayed exact events create no additional observation. | Each repeated event fingerprint produces exactly one persisted observation under declared concurrency. | Exact-event replay and concurrent-capture fixture. | Test Architect |
| FR-05.b | Semantically duplicate observations remain below the release threshold. | Human-labelled duplicate-observation rate is strictly less than 2% on the accepted corpus. | Frozen labelled duplicate corpus, judge record, and metric receipt. | Product Owner |
| FR-05.c | Distinct admitted events with equal bounded prefixes remain distinct. | The fingerprint covers complete canonical admitted content plus immutable event identity and fingerprint/schema version; the `UC2-DED-02` same-prefix/different-suffix fixture produces two distinct admitted identities and zero false dedupe outcomes. | Executable `UC2-DED-02` collision fixture, canonical-encoding manifest, and fingerprint receipt. | Capture Integrity Owner |
| FR-05.d | Exact-event dedupe commits one durable idempotency outcome. | Reservation, duplicate check, governed persistence effects, and terminal result commit atomically or remain retryable as incomplete; `UC2-DED-03/04` concurrency and restart faults never return dedupe success for an event missing any required persistence/index/count/audit effect. | Executable `UC2-DED-03` barrier and `UC2-DED-04` restart/failpoint receipts. | Capture Integrity Owner |

### FR-06: Make resumed, child, and stale-session lifecycle idempotent and attributable.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-06.a | Repeating session start or resume preserves one project-bound session. | Repetition creates zero duplicate sessions and does not change project ownership. | Start/resume replay fixture and session-state manifest. | Software Architect |
| FR-06.b | Repeating a child-session link preserves one attributable parent edge. | Exactly one parent edge remains and records the initiating session/invocation identity. | Child-link replay and attribution receipt. | Test Architect |
| FR-06.c | A stale-session transition is repeatable. | Repeated stale/abandoned marking produces one terminal state and one attributable transition outcome. | Stale-session timer/replay fixture. | Operations Owner |
| FR-06.d | Crash/restart preserves truthful session state. | Recovery creates no duplicate lifecycle transition and never reports an unclosed session as cleanly closed. | Process-death lifecycle fault-injection receipt. | Operations Owner |
| FR-06.e | Resume and implicit observation preserve immutable lifecycle scope and policy bindings. | An unauthorized request changes zero existing project, session, worktree, cwd, privacy, capture-profile, or external-processing bindings; `UC2-LIF-02/03` emits a typed denial and byte-identical before/after session state for every attempted change. | Executable `UC2-LIF-02/03` scope-and-policy takeover matrix and state manifest. | Session Lifecycle Owner |
| FR-06.f | Stale closure cannot overwrite a concurrent active resume. | Stale closure executes under the session lock or an equivalent version/CAS guard; the deterministic `UC2-LIF-08` interleaving leaves the resumed version active and records the stale attempt as denied or superseded. | Executable `UC2-LIF-08` two-worker CAS/interleaving receipt. | Session Lifecycle Owner |
| FR-06.g | Invalid parent requests cause no lifecycle mutation. | A missing, self, stale, or wrong-project parent returns the accepted typed outcome and changes zero child row, parent row, edge, or cross-project state. | Executable `UC2-LIF-07` invalid-parent matrix and before/after namespace manifest. | Session Lifecycle Owner |

### FR-07: Apply capture profile, exclusions, redaction, and bounds before persistence.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-07.a | Capture admission uses the accepted capture profile. | Only event classes allowed by the versioned profile reach the persistence boundary. | Frozen capture-profile matrix and admission receipt. | Product Owner |
| FR-07.b | Excluded content does not cross the persistence boundary. | Excluded-content occurrence count is zero in persisted records and failure remnants. | Synthetic exclusion corpus and storage scan receipt. | Privacy Owner |
| FR-07.c | Sensitive content is sanitized before the persistence boundary. | Raw synthetic-secret occurrence count is zero in persisted records and failure remnants. | Versioned synthetic-secret corpus and taint-scan receipt. | Security Owner |
| FR-07.d | Oversized capture input is bounded before the persistence boundary. | Persisted payload size does not exceed the human-accepted per-event and per-output limits; absent limits deny admission. | Boundary-size fixture and persisted-size receipt. | Product Owner |
| FR-07.e | Exclusion and redaction precede every governed sink. | Raw excluded or sensitive occurrence count is zero before serialization, transport, fingerprint/dedupe material, logging, queue/retry state, provider/native attempt, persistence, index, viewer/API output, export, snapshot, backup, temporary file, receipt, and failure remnant across `UC2-PRIV-01/04`. | Executable `UC2-PRIV-01/04` all-sink recording/taint harness and zero-occurrence receipt. | Privacy Owner |
| FR-07.f | Implicit session creation cannot supply or weaken processing policy. | The service resolves an existing authoritative project/session privacy and external-processing policy before admission; caller-supplied weakening or missing/unavailable policy returns a typed denial with zero observation, session, provider, index, or queue side effect. | Executable `UC2-PRIV-02/03` implicit-session and policy-unavailable matrix. | Privacy Owner |

### FR-08: Compact rolling history while preserving an exact-facts ledger.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-08.a | Rolling history remains within the accepted retention bound after compaction. | Post-compaction history satisfies the accepted count/time/size profile for the project. | Versioned retention profile and compaction receipt. | Data Governance Owner |
| FR-08.b | Exact facts survive compaction without semantic mutation. | Pre/post exact-fact digests and record counts are identical for the frozen ledger denominator. | Ledger round-trip manifest and digest receipt. | Test Architect |
| FR-08.c | Compaction activates one immutable, tamper-evident generation atomically. | Ledger/history/index/count/new-admission state stages under one content-addressed generation and one activation CAS; every `UC2-CMP-03/05` failpoint or concurrent read exposes either the complete prior generation or the complete validated target generation, never mixed state. | Executable `UC2-CMP-03/05` failpoint, tamper, concurrent-reader, and generation-manifest receipts. | State Compaction Owner |

### FR-09: Filter packet eligibility before relevance, cap at 2,000 tokens, and dedupe acknowledged sources per session.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-09.a | Eligibility is resolved before relevance ranking. | No `INELIGIBLE` or gate-critical `INDETERMINATE` source enters the ranked candidate set. | Frozen eligibility/ranking corpus and ordered-stage receipt. | Requirements Owner |
| FR-09.b | A generated provider packet remains within the token budget. | The exact final serialized packet after sanitization, labels, truncation, and provenance contains at most 2,000 tokens using the accepted tokenizer/profile; character estimates cannot establish acceptance. | Boundary-token corpus, final wire-image digest, and packet-size receipt. | Product Owner |
| FR-09.c | An acknowledged source is suppressed only for its bound session. | A valid acknowledgement suppresses the source in exactly the bound project/session and nowhere else. | Two-session acknowledgement/suppression fixture. | Provider Integration Owner |
| FR-09.d | An unacknowledged source remains retry-eligible. | Dispatch failure, timeout, expiry, rejection, or invalid receipt suppresses zero additional sources. | Provider fault-injection and retry receipt. | Provider Integration Owner |
| FR-09.e | A packet contains at most five distinct qualified retrieved sources. | Across project collision, duplicate-source, and six-or-more-candidate fixtures, the final packet contains zero duplicate source IDs, zero other-project sources, and at most five qualified retrieved source records; fixed identity/profile fields are not counted as retrieved records. | Executable packet-wide source-cap and two-project/global-canary receipt. | Product Owner |
| FR-09.f | The 2,000-token profile uses fixed source-class maxima. | The accepted profile allocates at most 300 tokens to slots/profile, 400 to lessons, 700 to episodic results, 400 to file history, and 200 to provenance; unused capacity is not silently reassigned across classes. | Exact-token boundary corpus and per-class allocation receipt. | Product Owner |
| FR-09.g | Low-relevance and previously acknowledged sources are omitted before packing. | A source below the accepted relevance threshold or already acknowledged for the exact project/session contributes zero packet bytes and receives a machine-readable omission reason. | Labelled threshold-boundary and acknowledged-source corpus. | Requirements Owner |

### FR-10: Preserve temporal validity and committed/uncommitted provenance.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-10.a | Each recalled source exposes a machine-readable temporal-validity outcome. | Every returned source is marked current, stale, superseded, expired, or indeterminate under the accepted policy version. | Temporal-transition corpus and recall response manifest. | Data Governance Owner |
| FR-10.b | Stale or conflicting evidence cannot act as gate-critical authority. | Stale, superseded, conflicting, or indeterminate sources contribute zero gate-critical eligible items. | Stale-authority negative corpus and eligibility receipt. | Requirements Owner |
| FR-10.c | Uncommitted work has an attributable dirty receipt. | Each observed dirty event binds project, worktree, base commit, relative path, pre/post digest, operation, time, session, and invocation. | Dirty-worktree event manifest and receipt validator. | Configuration Manager |
| FR-10.d | Committed work references the dirty events it supersedes. | Every linked commit receipt names exact dirty event IDs that match project, worktree, path/rename chain, ancestry, and blob digest. | Dirty-to-commit transition corpus and lineage validator. | Configuration Manager |

### FR-11: Acknowledge context delivery; configuration or generation alone is not delivery.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-11.a | Packet generation records `GENERATED` rather than delivery. | Configuration, generation, or local buffering produces zero `ACKNOWLEDGED` or `SUPPRESSED` transitions. | Delivery-state transition suite and event ledger. | Provider Integration Owner |
| FR-11.b | A transport attempt records `DISPATCHED_UNVERIFIED` until provider acknowledgement. | Local stdout, stream-buffer, or socket acceptance cannot advance the packet beyond `DISPATCHED_UNVERIFIED`. | Transport-boundary fault fixture and state receipt. | Provider Integration Owner |
| FR-11.c | A provider-native receipt advances one packet to `ACKNOWLEDGED`. | The receipt validates packet, attempt, project, session, context hash, nonce, issuer, and expiry. | Provider-specific signed acknowledgement fixture. | Provider Integration Owner |
| FR-11.d | Source suppression derives from one accepted acknowledgement. | Acknowledgement acceptance and the exact project/session/source suppression projection commit in one atomic control-plane transaction; no reader can observe accepted acknowledgement without its matching projection, and duplicates suppress zero additional sources. | Crash-boundary and duplicate-acknowledgement concurrency fixture. | Test Architect |
| FR-11.e | Receipt races close only the matching delivery attempt. | Late, duplicate, expired, revoked, replayed, wrong-issuer, wrong-attempt, and sibling-attempt receipts either idempotently return the existing terminal result or fail with zero additional acknowledgement, suppression, retry, or consumption effect. | Deterministic multi-attempt receipt race and revocation matrix. | Provider Integration Owner |

### FR-12: Link eligible evidence to commits and report scope, duplicate, delivery, promotion, and linkage health.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-12.a | Eligible evidence links to its resulting commit. | At least 95% of the frozen eligible denominator has a valid commit lineage; denominator and exclusions are emitted before calculation. | Eligible-linkage benchmark receipt and denominator manifest. | Configuration Manager |
| FR-12.b | Health output reports project-scope coverage. | Output includes numerator, denominator, exclusions, threshold, and observation window for project-scoped records. | Governed health response fixture. | Data Governance Owner |
| FR-12.c | Health output reports duplicate-observation rate. | Output includes labelled numerator, denominator, threshold, corpus version, and observation window. | Governed health response fixture. | Product Owner |
| FR-12.d | Health output reports delivery-state counts. | Generated, dispatched-unverified, failed, acknowledged, and suppressed counts are separately observable for the window. | Delivery ledger and health response fixture. | Provider Integration Owner |
| FR-12.e | Health output reports promotion outcomes. | Eligible, indeterminate, rejected, quarantined, pending, and promoted counts are separately observable for the window. | Promotion ledger and health response fixture. | Requirements Owner |
| FR-12.f | Health output reports commit-linkage rate. | Output includes eligible denominator, linked numerator, exclusions, threshold, and observation window. | Governed health response fixture. | Configuration Manager |

### FR-13: Promote only with independent typed evidence; prohibit recalled-content self-reinforcement.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-13.a | Each promotion candidate has a typed eligibility outcome. | Outcome is exactly `ELIGIBLE`, `INELIGIBLE`, or `INDETERMINATE` with policy digest and machine-readable reason codes. | Frozen promotion eligibility corpus. | Requirements Owner |
| FR-13.b | Promotion requires independent typed verification evidence. | Every promoted claim references an accepted evidence type whose independence set excludes the claim's recalled lineage. | Labelled lineage-DAG corpus and validator receipt. | Requirements Owner |
| FR-13.c | Recalled content cannot verify itself. | Recalled-only and cyclic-lineage fixtures produce zero promoted claims. | Recalled-only/cyclic negative corpus. | Test Architect |
| FR-13.d | Promotion preserves immutable lineage. | Each promoted claim binds claim digest, evidence digests, issuer, project, evidence status/time, parent edges, policy version, independence set, and required human-authority receipt. | Promotion restart/replay receipt and lineage manifest. | Data Governance Owner |
| FR-13.e | Eligibility and promotion lifecycle disposition remain separate. | Eligibility is exactly `ELIGIBLE`, `INELIGIBLE`, or `INDETERMINATE`; lifecycle disposition is separately one of the accepted pending, auto-ready, approved, rejected, quarantined, persisting, or promoted states, and neither field substitutes for the other. | Cross-product eligibility/disposition schema validator and transition corpus. | Requirements Owner |

### FR-14: Synchronize native provider memory only by explicit action.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-14.a | Native provider memory is unchanged without an explicit sync action. | Automatic capture, recall, compaction, promotion, hooks, and restart produce zero provider-native writes. | Negative provider-memory recording-sink suite. | Privacy Owner |
| FR-14.b | An explicit sync action is attributable. | Each provider-native write binds actor, project, source set, destination, policy version, time, and outcome. | Positive explicit-action receipt and provider write manifest. | Product Owner |
| FR-14.c | Explicit native synchronization selects an exact project-bound source set. | The request names immutable source IDs that all resolve to the authorized project; `UC2-NAT-02` writes zero other-project, global, legacy-unscoped, or unlisted memory into the destination. | Executable `UC2-NAT-02` two-project/global-canary source-selection receipt. | Native Memory Integration Owner |
| FR-14.d | Native synchronization preserves the destination atomically. | A successful explicit sync activates exactly the authorized destination image; every write, fsync, rename, restart, or verification fault leaves the byte-identical pre-image and one attributable failed outcome. | Executable `UC2-NAT-02` destination failpoint/rollback manifest and readback receipt. | Native Memory Integration Owner |
| FR-14.e | Native synchronization has one recoverable transaction outcome. | Intent, staged image, destination activation, audit/outbox, verification, and terminal result use one idempotent transaction identity; restart converges to committed exact target or byte-identical pre-image, and success is impossible before all governed effects are durable. | Every-boundary process-death/restart reconciliation and destination/audit digest receipt. | Native Memory Integration Owner |

### FR-15: Enforce strict local processing and secret-file authentication.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-15.a | Explicit zero-egress processing produces no external attempt. | When the authoritative processing mode is exactly `zero-egress`, external model, embedding, fallback, telemetry, mesh, network, or other content-processing attempt count is zero across the frozen production-factory corpus. | Recording-sink zero-egress matrix. | Privacy Owner |
| FR-15.b | Protected REST/MCP operations require authentication. | `GET /agentmemory/livez` is the complete unauthenticated allowlist; every other protected operation denies missing or invalid credentials. | Frozen REST/MCP authentication matrix. | Security Owner |
| FR-15.c | Runtime secrets originate from an approved source. | The active secret source is an injected environment value, approved secret file, or accepted platform reference. | Redacted configuration-source receipt. | Security Owner |
| FR-15.d | Missing required secret material prevents protected admission. | Missing, unreadable, or invalid secret material exits before public binding or returns a typed unavailable state; authentication is never disabled. | Missing/unreadable/invalid secret startup matrix. | Operations Owner |
| FR-15.e | Secret material is absent from observable outputs. | Raw synthetic-secret occurrence count is zero in logs, stderr, exceptions, receipts, health, telemetry, viewer/API responses, exports, snapshots, and backups. | Versioned synthetic-secret corpus and all-sink scan receipt. | Security Owner |
| FR-15.f | Protected authority is operation- and resource-bound. | Every protected capability binds exact issuer, audience, subject, canonical project or separately authorized global scope, operation, resource/action class, identity generation, key ID, `jti`, validity window, and revocation state; mismatch or uncertainty denies with zero governed domain effect. | Capability claim, issuer/key-confusion, revocation, replay, and cross-operation matrix. | Security Owner |
| FR-15.g | Deployment target and processing mode are selected independently and unambiguously. | `deployment_target=local-macos` never implies a processing mode; a missing, ambiguous, conflicting, stale, or unavailable authoritative mode denies content processing with zero external or fallback attempt and zero governed domain effect. | Target/mode cross-product, precedence, ambiguity, and no-attempt matrix. | Privacy Owner |
| FR-15.h | Provider-enabled processing permits only governed attempts. | When the authoritative mode is exactly `provider-enabled`, each attempt binds an allowed provider, destination, purpose, data class, project, session, and policy generation after minimization and redaction; an unlisted or mismatched value, policy failure, or attempted silent mode/destination change is denied with zero governed effect. | Synthetic provider recording-sink allow/deny matrix and attributable attempt/result receipt. | Provider Integration Owner |

### FR-16: Load provider config with process-environment precedence.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-16.a | A valid process-environment value overrides lower-precedence provider configuration. | The effective redacted value source is `process_environment` for every conflicting fixture. | Frozen precedence matrix and effective-config receipt. | Configuration Manager |
| FR-16.b | An invalid higher-precedence security value does not silently fall back. | The protected capability returns a typed configuration error and performs no governed side effect. | Invalid-environment negative fixture. | Security Owner |

### FR-17: Recognize direct-binary and `npx` MCP; repair hooks idempotently without force and merge unrelated hooks.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-17.a | A direct-binary Agentmemory MCP declaration is recognized. | Detection identifies the accepted executable form in every direct-binary fixture. | Disposable-home direct-binary fixture. | Provider Integration Owner |
| FR-17.b | An `npx` Agentmemory MCP declaration is recognized. | Detection identifies the accepted package/argument form in every `npx` fixture. | Disposable-home `npx` fixture. | Provider Integration Owner |
| FR-17.c | Repeating hook repair creates no additional Agentmemory-owned entry. | A second repair produces a zero diff in the Agentmemory-owned configuration region. | Repeat-repair disposable-home receipt. | Configuration Manager |
| FR-17.d | Hook repair preserves unrelated provider configuration. | Unowned hooks and settings are byte-identical before and after repair; no force path is used. | Mixed-provider disposable-home merge/rollback fixture. | Configuration Manager |
| FR-17.e | Connector ownership and adoption are explicit. | Only entries carrying the accepted Agentmemory ownership marker or separately recorded adoption receipt may be changed or removed; ambiguous, malformed, legacy-unowned, or concurrently changed entries remain byte-identical and return a typed review-needed outcome. | Ownership-marker/adoption/concurrent-edit disposable-home matrix. | Configuration Manager |
| FR-17.f | Connector repair and rollback preserve the complete provider-file pre-image. | Apply, interruption, verification failure, and rollback preserve or restore bytes, permissions, ownership, extended attributes where supported, and unrelated ordering; any backup is permission-restricted, sanitized under policy, content-addressed, and lifecycle-audited. | Every-boundary connector failpoint, metadata manifest, secret-canary scan, and rollback readback. | Connector Owner |

### FR-18: Cover failures, session end, subagent lifecycle, and commit hooks with bounded backpressure.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-18.a | A tool failure emits one attributable lifecycle observation. | The frozen failure event produces exactly one bounded observation with project/session attribution. | Tool-failure hook fixture. | Provider Integration Owner |
| FR-18.b | Session end emits one attributable terminal observation. | The frozen end event produces exactly one terminal observation without blocking the next prompt boundary. | Session-end hook fixture. | Provider Integration Owner |
| FR-18.c | Subagent start emits one attributable lifecycle observation. | The frozen start event produces exactly one parent/child-attributed observation. | Subagent-start hook fixture. | Provider Integration Owner |
| FR-18.d | Subagent stop emits one attributable lifecycle observation. | The frozen stop event produces exactly one parent/child-attributed observation. | Subagent-stop hook fixture. | Provider Integration Owner |
| FR-18.e | Commit completion emits one attributable commit observation. | The frozen commit event produces exactly one observation bound to the resulting commit identity. | Post-commit hook fixture. | Configuration Manager |
| FR-18.f | Hook pressure remains bounded and truthful. | p95 hook latency is under 2 seconds at the accepted concurrency profile; queued, rejected, dropped, failed, and retried outcomes are separately counted. | Versioned hook-load profile and pressure receipt. | Operations Owner |
| FR-18.g | Every hook delivery has one durable, recursion-safe disposition. | Each event/attempt ledger records attributable `queued` and `retried` transitions and exactly one terminal `delivered`, `rejected`, `dropped`, or `failed` outcome; delivery-failure telemetry creates zero recursive hook events. | Executable `UC2-PERF-02` outcome-equation and stderr-recursion receipt. | Operations Owner |
| FR-18.h | Worker recovery replays only attributable queued events. | After worker death/restart, `UC2-PERF-03` replays only durable queued events bound to the same event, attempt, project, session, policy, and payload digest; terminal or unattributable events produce zero replay side effects. | Executable `UC2-PERF-03` restart/replay reconciliation receipt. | Runtime Supervision Owner |

### FR-19: Return typed disabled-feature errors and fail closed for required server-backed MCP behavior.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-19.a | A disabled feature returns a stable typed error. | Response contains the accepted error code and performs no governed side effect. | Disabled-feature contract suite. | Software Architect |
| FR-19.b | A missing required backend returns a typed unavailable result. | Server-backed MCP reports required-backend unavailability and returns no fabricated success payload. | Required-backend fault matrix. | Software Architect |
| FR-19.c | Required-backend failure fails closed. | Backend timeout, error, stale state, or disabled state produces zero governed mutation, packet suppression, or promotion evidence. | Required-source fault-injection receipt. | Security Owner |
| FR-19.d | A protected MCP proxy failure cannot downgrade authority or storage. | Authentication, authorization, project mismatch, required-backend, and protected-operation failures execute zero local fallback; any accepted offline mode is explicit, project-scoped, visibly degraded, separately attributable, and limited to its frozen advisory allowlist. | Complete proxy-error/tool/global-scope/side-effect matrix and independent receipt. | MCP Compatibility Owner |
| FR-19.e | No-write semantics distinguish domain effects from the denial ledger. | A denied/disabled/failed operation changes zero packet, source, suppression, promotion, native, connector, provider, or project-domain state; it may append exactly one bounded redacted control-plane denial receipt whose failure cannot relax the denial. | Before/after governed-namespace manifest and denial-ledger fault matrix. | Security Owner |

### FR-20: Report sustained service health plus backend/viewer compatible build identities.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-20.a | Service health follows the accepted sustained-state machine. | Each complete probe records a monotonic sequence and transitions only through the specified healthy, degraded, recovering, or unavailable path. | Deterministic probe-sequence fixture. | Operations Owner |
| FR-20.b | Required dependency failure makes readiness unavailable. | A required timeout, error, stale result, disabled result, or not-requested result maps to HTTP 503 within one 30-second probe interval. | Required-dependency fault matrix. | Operations Owner |
| FR-20.c | Recovery requires three consecutive complete successes. | The first two complete successes remain `RECOVERING`; only the third transitions to `HEALTHY`; any failed sample resets the streak. | Recovery-sequence fault fixture. | Test Architect |
| FR-20.d | Health reports backend build identity. | Authenticated non-stale health contains the running backend revision/build identifier. | Backend health/build receipt. | Configuration Manager |
| FR-20.e | Health reports viewer build identity. | The rendered viewer exposes its revision/build identifier independently of backend availability. | Viewer artifact/build receipt. | Configuration Manager |
| FR-20.f | Viewer compatibility is reported separately from availability. | Fetch state is exactly `OK`, `UNAUTHORIZED`, `TIMEOUT`, `TRANSPORT_ERROR`, `MALFORMED`, or `STALE`; compatibility is separately `COMPATIBLE`, `INCOMPATIBLE`, or `NOT_EVALUATED`; mismatch is never rendered as transport unavailability. | Browser/backend compatibility matrix. | Software Architect |
| FR-20.g | Capture readiness is unavailable when the required worker is missing or disconnected. | `UC2-WRK-01/03` reports capture readiness as unavailable even when engine, API, or viewer ports respond; port liveness and viewer HTTP success cannot satisfy worker readiness. | Executable `UC2-WRK-01/03` worker-death/disconnect and live-port matrix. | Runtime Supervision Owner |
| FR-20.h | Restart cannot become healthy before capture-state reconciliation. | After worker/service restart, health remains unavailable or recovering until session, observation, ledger, search/vector index, count, and durable delivery-queue generations reconcile successfully. | Executable `UC2-WRK-01/03` startup reconciliation and recovery-sequence receipt. | Runtime Supervision Owner |
| FR-20.i | Viewer counters and destructive actions expose their authority context. | Every rendered counter and destructive action displays project/global scope, named denominator, snapshot ID, observation time, and authorizing actor/capability before the value or action is used. | Executable `UC2-REG-02` viewer/API snapshot-contract and authorization receipt. | UI/API Owner |
| FR-20.j | A project-scoped viewer renders no global durable memory. | Across the two-project/global-canary fixture, raw or derived global/other-project durable-memory occurrence count in a project view is zero; any explicit global view is separately authorized and visibly labelled. | Executable `UC2-REG-03` project/global viewer isolation receipt. | UI/API Owner |
| FR-20.k | Viewer destructive actions are exact-scope authorized and stale-safe. | Every mutation binds actor/capability, canonical project or separately authorized global scope, operation/resource, expected snapshot/version, and nonce; project view cannot default to global mutation, and stale or mismatched authority changes zero state. | Project/global destructive-action, stale-snapshot, replay, and cross-operation matrix. | UI/API Owner |
| FR-20.l | Local core readiness, provider-feature readiness, processing mode, and external-processing state are reported independently. | Authenticated health/status exposes four separate typed fields with observation time and policy/build identity; an unavailable provider feature cannot make a ready local core unavailable, a ready local core cannot imply provider readiness, configured mode cannot imply an attempted transfer, and attempted/completed/failed/denied external processing cannot be collapsed into one state. | Local core/provider fault cross-product and processing-mode/attempt-state receipt. | Operations Owner |

### FR-21: Provide a transactional local macOS package and lifecycle with isolated rollback.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| FR-21.a | A local release installs from one immutable commit-identified package. | Package, source, lockfile, dependency, SBOM/provenance, executable, schema, viewer, plugin, hook, engine, and build identities resolve to one verified immutable release installed under an owned isolated prefix. | `LQ-001` immutable-package manifest, registry/integrity receipt, and clean-prefix readback. | Release Owner |
| FR-21.b | Local setup is transactional and replay-idempotent. | Setup stages, validates, and activates one complete owned target or restores the exact pre-image; interruption is recoverable, a second identical run changes zero owned or unrelated bytes, and partial success is never reported. | `LQ-002` every-boundary setup, pre/post manifest, and repeat-run receipt. | Configuration Manager |
| FR-21.c | The user LaunchAgent owns one recoverable local service generation. | The exact user-owned label/plist starts at most one fenced engine/worker/service generation, restarts after crash or login according to policy, preserves shutdown/startup order, and withholds readiness until durable intake and state reconciliation complete. | `LQ-003/004` plist identity, singleton, crash/restart, fencing, and reconciliation receipts. | Runtime Supervision Owner |
| FR-21.d | Local network and authentication boundaries are exact. | API, MCP, streams, viewer-data, and control paths bind loopback and deny non-loopback access; `GET /agentmemory/livez` is the only unconditional unauthenticated endpoint, and the static viewer shell, assets, viewer data, API, MCP, and every other protected path require bearer authentication and exact-scope authorization. Bearer issuance/bootstrap must be separately specified and accepted before implementation. | `LQ-005/006` bind/deny, protected-surface, bearer-bootstrap, static-shell, and browser readback matrix. | Security Owner |
| FR-21.e | Codex and Claude integration changes only Agentmemory-owned configuration. | Connect, repeat, repair, and remove identify exact owned entries, are idempotent, preserve unrelated bytes/order/metadata, deny ambiguous ownership, and restore the complete pre-image after interruption or failed verification. | `LQ-008/009` disposable-provider-home ownership, repeat, fault, and removal receipts. | Connector Owner |
| FR-21.f | The owned local lifecycle preserves exact state across backup, migration, restore, upgrade, rollback, and uninstall. | Each operation binds an immutable runtime and data generation, protects the complete declared state/secret denominator, fences concurrent readers, activates atomically or restores the exact pre-image, retains attributable failure truth, removes only owned resources, and reports retained data explicitly. | `LQ-013/014` backup/readback, every-boundary migration/restore/upgrade/rollback, concurrent-reader, uninstall, and retained-data receipts. | State Migration and Recovery Owner |
| FR-21.g | A qualified official-upstream rollback subject exists side by side before any normal-runtime switch. | A registry-verified official-upstream artifact is independently installed and qualified under isolated prefix, ports, state, credentials, and provider homes; it remains inactive after qualification, and switching the normal runtime requires a separate exact authorization while reverse or cross-subject switching without authority is denied. | `LQ-014` side-by-side subject identity, independent qualification, switch-denial, rollback-recovery, and readback receipt. | Release Owner |

## Quality and acceptance requirements

All thresholds remain proposed release gates rather than aspirational
telemetry. Each metric is evaluated only against a frozen, human-accepted
denominator or profile.

### NFR-01: Zero cross-project leakage.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-01.a | Cross-project content disclosure count is observable. | Count equals zero across the frozen interface, slot, recall, export, snapshot, mesh, and viewer corpus. | Two-project all-interface leakage receipt. | Security Owner |

### NFR-02: Zero secret leakage.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-02.a | Raw synthetic-secret occurrence count is observable. | Count equals zero across every governed input, output, persistence, network, log, evidence, export, snapshot, and backup sink. | Versioned secret corpus and all-sink taint receipt. | Security Owner |

### NFR-03: Zero stale-authority leakage in gate-critical contexts.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-03.a | Stale-authority items in gate-critical packets are observable. | Count equals zero across the frozen stale, superseded, conflicting, expired, and indeterminate corpus. | Gate-critical stale-authority receipt. | Requirements Owner |

### NFR-04: 100% project scope for new records.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-04.a | Project-scoped new-record coverage is observable. | Canonical-project numerator equals the complete frozen new-record denominator. | Governed new-record manifest and coverage receipt. | Data Governance Owner |

### NFR-05: Human-labelled precision@5 >=80%.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-05.a | Recall precision at rank five is observable. | Human-labelled precision@5 is at least 80% on the accepted query/corpus/judge profile. | Frozen labelled recall corpus and adjudicated metric receipt. | Product Owner |

### NFR-06: Duplicate observations <2%.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-06.a | Duplicate-observation rate is observable. | Human-labelled duplicate count divided by the accepted observation denominator is strictly less than 2%. | Frozen labelled duplicate corpus and metric receipt. | Product Owner |

### NFR-07: Eligible commit linkage >=95%.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-07.a | Eligible commit-linkage rate is observable. | Validly linked eligible records divided by the predeclared eligible denominator is at least 95%. | Eligible-denominator manifest and linkage receipt. | Configuration Manager |

### NFR-08: Packet size <=2,000 tokens.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-08.a | Provider packet token count is observable. | Every accepted final serialized packet contains at most 2,000 tokens under the accepted tokenizer/profile and reports exact total plus per-class token counts whose sum equals the total. | Boundary-token corpus, final wire image, and packet receipt. | Product Owner |

### NFR-09: p95 hook latency <2 seconds at declared concurrency.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-09.a | Hook latency distribution is observable. | p95 end-to-end hook latency is strictly less than 2 seconds at the human-accepted concurrency, host, and load profile. | Versioned load profile and latency receipt. | Operations Owner |

### NFR-10: Provenance exists for committed and uncommitted work.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-10.a | Committed-work provenance coverage is observable. | Coverage is 100% for the frozen eligible committed-work denominator. | Commit-lineage manifest and validator receipt. | Configuration Manager |
| NFR-10.b | Uncommitted-work provenance coverage is observable. | Coverage is 100% for the frozen eligible dirty-event denominator. | Dirty-event manifest and validator receipt. | Configuration Manager |

### NFR-11: Healthy compatible backend never yields `Unknown` viewer health/build identity.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-11.a | Viewer health identity is observable for a healthy compatible backend. | `Unknown` health occurrence count equals zero across the accepted browser/backend matrix. | Viewer/backend health matrix receipt. | Operations Owner |
| NFR-11.b | Viewer build identity is observable for a healthy compatible backend. | `Unknown` build occurrence count equals zero across the accepted browser/backend matrix. | Viewer/backend build matrix receipt. | Configuration Manager |

### NFR-12: Canonical `npm test` exits zero within the declared developer and CI resource profiles.

| Child | Observable outcome | Acceptance condition | Evidence source | Owner |
|---|---|---|---|---|
| NFR-12.a | Canonical `npm test` result is observable under the developer profile. | Exit code is zero while the run stays within the human-accepted developer host, Node/OS, worker, memory, timeout, source, and test-denominator profile. | Immutable developer-profile test receipt. | Test Architect |
| NFR-12.b | Canonical `npm test` result is observable under the CI profile. | Exit code is zero while the run stays within the human-accepted CI host, Node/OS, worker, memory, timeout, source, and test-denominator profile. | Immutable CI-profile test receipt. | Test Architect |

## Unresolved human authority questions

The following values or policy choices are intentionally not inferred by this
refinement and block acceptance of the affected children:

1. Who owns and signs the canonical identity/alias registry, which remote is
   authoritative when more than one exists, and which hosting paths are
   case-insensitive?
2. What are the accepted capture-profile event classes, exclusion rules,
   per-event/output bounds, retention window, and exact-facts definition?
3. Which provider-native mechanisms qualify as acknowledgement for Codex,
   Claude, and MCP-only clients?
4. Which context dependencies are required or optional, and are the proposed
   30-second probe interval, 45-second snapshot TTL, and three-success recovery
   threshold accepted?
5. Which tokenizer/version defines the 2,000-token packet threshold?
6. What frozen corpora, judge qualifications, and adjudication rules govern
   precision@5 and semantic-duplicate measurements?
7. What host, concurrency, load, timeout, Node/OS, worker, memory, source, and
   test-denominator profiles govern hook latency and canonical test runs?
8. Which evidence types and independence rules qualify promotion, and which
   promotion classes require a human-authority receipt?
9. What compatibility client inventory and operation allowlist, if any, will
   be accepted, and who owns its expiry and zero-use retirement threshold?
10. What exact persisted-state denominator, generation boundary, RPO/RTO, and
    rollback tiers will be accepted for identity migration and exact restore?
11. Which human role is the final Requirements Owner where this candidate uses
    that placeholder title?
12. Which exact local package prefix, LaunchAgent label, ports, state roots,
    credential mechanism, logging/support policy, and static viewer-shell
    disposition will the human owners accept?
13. Which project processing-mode policies and provider manifests are accepted,
    and which exact authority may qualify the official-upstream rollback
    subject and separately authorize a normal-runtime switch?

No child contract is accepted until the named owner and required human
authorities review these questions and record an explicit decision in the
canonical governance artifacts.
