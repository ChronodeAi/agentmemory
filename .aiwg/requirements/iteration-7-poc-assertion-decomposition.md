# Iteration 7 PoC Assertion Decomposition

Status: **CANDIDATE ASSERTION LAYER - REQUIREMENTS UNCHANGED**

Date: 2026-07-30
Project: `github.com/chronodeai/agentmemory`
Source commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Source tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`

## Boundary

This artifact decomposes compound acceptance clauses into independently
observable PoC assertions. It does not add, remove, renumber, accept, or
baseline a requirement. The established 33-parent and 130-child requirement
denominators remain unchanged.

These assertion IDs are candidate test-oracle identifiers only. Canonical
requirement-to-design-to-test joins remain solely in
`.aiwg/requirements/traceability-matrix.md`.

No assertion is admitted or executed. No result may self-accept a requirement,
change a risk, accept an ADR, pass ABM, or authorize Construction.

## FR-15.f capability assertions

| Assertion | One independently observable claim |
|---|---|
| A-FR15F-01 | Issuer exactly matches the accepted authority; mismatch or uncertainty denies before dispatch. |
| A-FR15F-02 | Audience exactly matches the requested protected surface; mismatch denies before dispatch. |
| A-FR15F-03 | Subject exactly matches the accepted actor class; mismatch denies before dispatch. |
| A-FR15F-04 | Canonical project or separately authorized global scope exactly matches the request; project authority never becomes global authority. |
| A-FR15F-05 | Operation exactly matches the requested command or method; cross-operation reuse denies. |
| A-FR15F-06 | Resource and action class exactly match the target; cross-resource or cross-action reuse denies. |
| A-FR15F-07 | Identity-registry generation exactly matches the active accepted generation; stale or unknown generation denies. |
| A-FR15F-08 | Key ID, key generation, and key status exactly match the accepted active key; unknown, stale, or disabled key denies. |
| A-FR15F-09 | Capability nonce and `jti` are present, unique, and transaction-bound; reuse denies atomically. |
| A-FR15F-10 | `iat`, `nbf`, `exp`, maximum lifetime, and accepted clock skew each satisfy the frozen time policy. |
| A-FR15F-11 | Revoked capability or key denies before dispatch and changes zero governed domain state. |
| A-FR15F-12 | Replayed capability denies under concurrent and sequential replay schedules and changes zero governed domain state. |

Every denied or unavailable row requires a byte-identical governed-domain
pre/post state. Every authorized mutation requires an exact independently
defined post-state and side-effect vector.

## FR-20.a and FR-20.c health-state assertions

| Assertion | One independently observable claim |
|---|---|
| A-FR20AC-01 | The accepted service-state vocabulary is exact and versioned. |
| A-FR20AC-02 | Every allowed state transition is enumerated; every other transition rejects or becomes typed unavailable. |
| A-FR20AC-03 | Each complete sample has a monotonic sequence and observation time. |
| A-FR20AC-04 | The sampling interval and stale threshold are exact profile values. |
| A-FR20AC-05 | Recovery requires the exact accepted consecutive-success count. |
| A-FR20AC-06 | Any failed or incomplete sample resets the recovery streak according to the accepted transition table. |
| A-FR20AC-07 | An older or stale response cannot overwrite a newer rendered or machine-readable state. |

## FR-20.g and FR-20.h capture-readiness assertions

| Assertion | One independently observable claim |
|---|---|
| A-FR20GH-01 | The required worker is present. |
| A-FR20GH-02 | The required worker is connected and responsive within the accepted bound. |
| A-FR20GH-03 | The worker has the exact accepted owner token, instance identity, lease, and fencing generation. |
| A-FR20GH-04 | Session generation reconciles before readiness. |
| A-FR20GH-05 | Observation and exact-facts ledger generations reconcile before readiness. |
| A-FR20GH-06 | Search and vector index generations reconcile before readiness. |
| A-FR20GH-07 | Counts and snapshot denominator reconcile before readiness. |
| A-FR20GH-08 | Durable intake, retry, replay, and terminal queue state reconcile before readiness. |
| A-FR20GH-09 | Readiness remains unavailable or recovering until every required reconciliation assertion succeeds. |

## FR-20.l independent readiness fields

| Assertion | One independently observable claim |
|---|---|
| A-FR20L-01 | Local-core readiness is reported independently. |
| A-FR20L-02 | Provider-feature readiness is reported independently. |
| A-FR20L-03 | Configured processing mode is reported independently. |
| A-FR20L-04 | External-processing attempt/result state is reported independently. |

No one field may be inferred from another.

## FR-21.c supervision assertions

| Assertion | One independently observable claim |
|---|---|
| A-FR21C-01 | One exact ownership-marked LaunchAgent and supervisor own one accepted runtime generation. |
| A-FR21C-02 | Startup ordering and dependency readiness follow one frozen transition contract. |
| A-FR21C-03 | Stop drains intake, records flush disposition, stops all and only owned children in reverse order, and proves zero residue. |
| A-FR21C-04 | Crash and login restart obey exact restart, backoff, exhaustion, and stale-generation fencing rules. |
| A-FR21C-05 | Startup withholds readiness until all required durable-state reconciliation assertions succeed. |

## FR-21.d network and browser assertions

| Assertion | One independently observable claim |
|---|---|
| A-FR21D-01 | REST binds only the accepted loopback address and port. |
| A-FR21D-02 | Streams bind only the accepted loopback address and port. |
| A-FR21D-03 | Viewer ingress binds only the accepted loopback address and port. |
| A-FR21D-04 | iii control ingress binds only the accepted loopback address and port or satisfies a separately accepted authenticated control protocol. |
| A-FR21D-05 | `GET /agentmemory/livez` is the sole anonymous route and contains only the accepted minimal liveness body. |
| A-FR21D-06 | Initial viewer shell access requires the accepted browser bootstrap authority. |
| A-FR21D-07 | Every viewer asset requires the accepted browser bootstrap authority. |
| A-FR21D-08 | Viewer-data, REST, MCP, and stream requests each enforce their exact caller capability without viewer-side authority synthesis. |
| A-FR21D-09 | Launch capability entropy, TTL, atomic single use, concurrent consumption, binding, replay, restart, history, Referer, log, CSP/XSS, and storage behavior satisfy one accepted bootstrap contract. |
| A-FR21D-10 | Project and global browser journeys use separate, visibly labelled, short-lived authority; a project viewer holds no reusable administrator credential. |

## Risk and PoC grouping

| PoC cohort | Assertion groups | Primary risk |
|---|---|---|
| H-BIND | A-FR21D-01..04 | R-14; adjacent R-02, R-09, R-23 |
| H-BOOT | A-FR15F-01..12; A-FR21D-05..10 | R-14; adjacent R-02, R-09 |
| H-AUTH | A-FR15F-01..12; A-FR21D-05..10 | R-14; adjacent R-02, R-09 |
| H-HEALTH | A-FR20AC-01..07; A-FR20GH-01..09; A-FR20L-01..04 | R-09; adjacent R-08, R-14, R-23 |
| H-LIFE | A-FR20GH-01..09; A-FR21C-01..05 | R-23; adjacent R-07, R-08, R-09 |

## Admission boundary

Before R-13 Stage B2, the canonical RTM must bind each admitted assertion to
one exact fixture, oracle, expected side-effect vector, stop condition,
receipt field, accountable owner, executor, signer, and independent verifier.
Unknown or alternative outcomes are not admissible.
