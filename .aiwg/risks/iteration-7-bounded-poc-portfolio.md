# Agentmemory R27 Successor Bounded PoC Portfolio

Status: DETACHED SPECIFICATION PREPARATION - NOT ADMITTED OR EXECUTABLE

Date: 2026-07-30
Portfolio ID: `AM-P0P1-ARCH-POC-v1`
Project: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`
Candidate local profile:
`R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

## Authority boundary

This is a detached PoC design. It creates no R-13 Stage-A acceptance, no R-13
Stage-B1 mechanics authority, no R-13 Stage-B2 admission, and no execution
authority. It does not authorize product changes, runtime stop/restart,
listener changes, credential handling, a risk disposition, ADR acceptance,
architecture baselining, ABM passage, Construction, package work, canary,
release, deployment, or rollout.

The generic `build-poc` skill must not be invoked directly. Any later work must
use the accepted project governance wrapper, one exact admitted case, and
premium coding/reasoning workers with separate independent verification.

## Current admission result

Detached analysis may continue, but the formal Stage-A specification question
is not presently submission-ready: required human assignments, concurrences,
receipt signer, and independent verifier remain incomplete. The R27
documentary corrections are successor candidates until independently frozen
and reviewed. R-13 Stage-B1, Stage-B2, and execution remain blocked.

Verified predecessor defects and R27 candidate dispositions:

1. The R26 common input left `selected_profile` null. R27 binds the exact
   DEC-12 Stage-A-specification-only profile and keeps execution blocked.
2. The R26 common input stored G-ICM hash `ca1831...`; the imported inventory
   bytes were `cdc649...` and declared stale source commit `3b6794e...`.
   R27 uses the repository generator twice to produce byte-identical,
   candidate-bound inventory hash
   `6821edf7525d5e8f844e2c68922b882df8e531f550220244e9d45721bfba1f42`,
   194 input paths, and input digest
   `6b3b918167885d87ea23f40c9f66da304a5910aa3801957aca2c8d1910916fb8`.
3. R-09's incorrect `TR-UCM-005` join is replaced by `TR-UCM-011`,
   `TR-UCM-012`, `TR-UCM-016`, and `TR-UCM-019`.
4. R-14's incorrect native-sync `TR-UCM-018` join is replaced by
   `TR-UCM-002`, `TR-UCM-009`, `TR-UCM-012`, and `TR-UCM-019`.
5. R-23 retains `TR-UCM-011` and `TR-UCM-014` and adds FR-21 /
   `TR-UCM-019`.
6. Compound PoC oracles are decomposed into candidate independent assertions
   without changing the 33-parent/130-child requirements baseline.
7. `npm ci` fails because `package.json` and `package-lock.json` are not in
   sync. R27 changes neither product file; deterministic dependency admission
   remains blocked.
8. Required Human Test Architect, Configuration Manager, Security Architect,
   Release Owner, executor, receipt signer, and independent-verifier
   assignments/concurrences remain incomplete and must not be inferred.

The sole canonical traceability location remains
`.aiwg/requirements/traceability-matrix.md`. Case cards and realization
worksheets backlink to it; this portfolio must not create a competing trace
matrix.

## Common immutable envelope

Every later admitted hypothesis uses:

- three independent disposable clean homes: `CH-01`, `CH-02`, and `CH-03`;
- a reset disposable state root between hypotheses;
- synthetic projects `AM-POC-A` and `AM-POC-B`;
- no real repository, memory, session, prompt, provider, or account data;
- synthetic credential classes only:
  `C-NONE`, `C-MALFORMED`, `C-PROJ-A`, `C-PROJ-B`, `C-GLOBAL`,
  `C-EXPIRED`, `C-NOT-YET-VALID`, `C-WRONG-ISS`, `C-WRONG-AUD`,
  `C-WRONG-SUB`, `C-WRONG-OP`, `C-WRONG-RESOURCE`,
  `C-WRONG-KID`, `C-WRONG-KEY-GEN`, `C-WRONG-IDENTITY-GEN`,
  `C-WRONG-NONCE`, `C-REVOKED`, and `C-REPLAYED`;
- zero credential values in receipts, logs, screenshots, or retained evidence;
- a child-environment allowlist and recording-deny sinks for every provider
  and network egress attempt;
- at most one accepted owner/runtime generation per admitted fixture;
- explicitly manifested contender or stale processes are permitted only in
  negative lifecycle schedules, with separate resource limits and no
  authority to mutate governed state;
- a 30-minute limit per hypothesis;
- a memory stop ceiling of the lower of 4 GiB or 50 percent of physical RAM;
- immediate stop on an unmanifested child, listener, path, mutation, or egress;
- an executor, receipt signer, and independent verifier with distinct
  identities and trust material;
- immutable source, fixture, route, actor, claim, state-machine, listener,
  fault, assertion, sink, receipt, cleanup, and verifier manifests.

Clean-home preconditions must freeze UID, home root, ports, process tree,
listeners, PID/lease state, provider state, and filesystem roots. Every
hypothesis row or lifecycle schedule receives its own immutable preimage and
isolated state root. Cleanup must prove the exact postcondition rather than
treating process exit as cleanup.

Before Stage-B2 admission, every synthetic event must use the terminal equation

`committed + rejected + failed + quarantined = 1`.

The exact per-sink side-effect vector must also be frozen:

- committed: exactly the admitted domain effect and terminal receipt;
- rejected: zero governed-domain effects and only the accepted bounded denial
  receipt, if policy requires one;
- failed: zero committed governed-domain effects and one typed failure
  receipt, with any partial state deterministically reconciled;
- quarantined: zero domain effect beyond the admitted quarantine record and
  terminal receipt.

A scalar count cannot substitute for the exact sink vector.

## Portfolio 1: H-BIND

### Hypothesis

Every REST, stream, viewer, and iii control listener is loopback-only. Any
proposed non-loopback exception instead requires a separately accepted,
testable authentication and authorization contract.

### Profiles

| Profile | REST | Stream | Viewer | iii control | Expected result |
|---|---:|---:|---:|---:|---|
| `BIND-P0` | 3111 | 3112 | 3113 | 49134 | all explicit loopback |
| `BIND-P1` | 33111 | 33112 | 33113 | 33114 | all materialized loopback |
| `BIND-P2-OMITTED` | fixture-defined | fixture-defined | fixture-defined | omitted host | pre-bind refusal |
| `BIND-P3-WILDCARD` | fixture-defined | fixture-defined | fixture-defined | explicit wildcard host | pre-bind refusal |

### Matrix

For each valid profile and each of the four listeners:

1. record the exact socket address;
2. prove the exact owning generation;
3. prove loopback connectivity;
4. prove a LAN-alias or non-loopback connection cannot succeed.

For each valid profile, correlate direct liveness, viewer liveness,
authenticated direct health, and authenticated viewer health. Record only
connect/handshake state and byte count for the iii control protocol.

For each invalid profile, prove that binary/config identity matches the frozen
manifest, a typed pre-bind configuration refusal, zero spawned children, zero
bound listeners, zero state mutation, and zero residue. The fixture must never
intentionally open a wildcard socket.

Count per clean home:

- listener assertions = 32;
- health correlations = 8;
- two invalid profiles x six refusal/residue assertions = 12;
- total 52 assertions per clean home, 156 total.

### Stop conditions

Stop on a wildcard listener, successful non-loopback connection, missing
owner, undocumented fallback port, fixture data in control-protocol bytes, or
unproved iii binary/config identity.

### Evidence

Config and binary digests, listener inventory, process/generation owner,
connect result, byte count, health correlation, and zero-residue cleanup.

### Proof boundary

May prove binding for the exact admitted iii binary, macOS profile, two valid
configs, and two rejected configs. It does not prove firewall behavior, other operating systems, or
independent control-listener authentication.

## Portfolio 2: H-BOOT

### Hypothesis

The accepted browser bootstrap authenticates the initial viewer shell and
assets, consumes one launch capability exactly once, and yields only a
short-lived caller capability bound to the exact project or separately
authorized global journey. No reusable backend or administrator credential is
present in the viewer process or browser.

### Atomic cohorts

1. Accepted launch-code entropy and generation.
2. TTL boundaries and clock behavior.
3. Atomic single use under concurrent consumption.
4. Exact project, audience, operation, resource, and runtime-generation
   binding.
5. Replay, revocation, restart, and stale-tab behavior.
6. Protected initial shell and every asset path; no anonymous exception.
7. Browser history, cache, storage, Referer, logs, metrics, errors,
   screenshots, and crash remnants.
8. CSP/XSS and cross-origin attempt matrix.
9. Separate global launch and visible step-up; no project-to-global upgrade.

The exact code entropy, TTL, browser set, shell/asset denominator, and launch
transport are formal Stage-A/B2 inputs. Therefore no fixed request total is
claimed before those inputs are accepted and frozen.

### Acceptance evidence

- one independent bootstrap oracle records code class, expected decision,
  project/global class, generation, consumption count, and expiry class
  without recording the code or bearer;
- exactly one concurrent consumer may succeed;
- every failed/replayed/stale/wrong-bound request has zero governed-domain
  effect;
- the browser retains only the admitted in-memory short-lived capability and
  no persistent token;
- history, cache, Referer, logs, metrics, error output, screenshots, and crash
  artifacts contain zero launch code, bearer, root secret, or synthetic
  sentinel;
- the viewer has no reusable backend/global administrator credential in its
  process, files, inherited environment, or client configuration.

### Stop conditions

Stop on insufficient or unproved entropy, overlong or uncertain TTL,
multi-consumer success, replay, wrong binding, anonymous shell/asset success,
project-to-global upgrade, persistent browser token, code/bearer occurrence
outside the oracle, CSP/XSS escape, Referer/history/log leakage, restart
resurrection, or unmanifested process/network/storage activity.

### Proof boundary

May prove the exact accepted bootstrap contract and browser set. It cannot
prove complete API authorization parity, all browser versions, production
credential custody, or R-14 disposition.

## Portfolio 3: H-AUTH

### Hypothesis

For the same credential, scope, operation, resource, and synthetic state, the
direct REST origin and viewer origin produce the same normalized authorization
decision. The viewer never mints, substitutes, or upgrades caller authority.

Normalized decision tuple:

`(allow|deny|unavailable, principal-class, scope, operation, resource, side-effect-vector)`

Matching HTTP status alone is not authorization parity.

An independently controlled authorization oracle freezes the expected tuple
for every row without receiving or retaining secret values or protected
response bodies. The implementation under test cannot generate its own oracle.

### Route shapes

| ID | Method and path | Expected authority |
|---|---|---|
| AUTH-R01 | `GET /agentmemory/livez` | public minimal liveness |
| AUTH-R02 | `GET /agentmemory/health` | separate operational/admin capability |
| AUTH-R03 | `GET /agentmemory/project-health?project=AM-POC-A` | project A, redacted project denominator |
| AUTH-R04 | `GET /agentmemory/sessions?project=AM-POC-A` | project A |
| AUTH-R05 | `GET /agentmemory/sessions?scope=global` | global administrator |
| AUTH-R06 | `POST /agentmemory/session/start` with project-A fixture | project A plus exact operation |
| AUTH-R07 | `POST /agentmemory/remember` with project-A fixture | project A plus exact operation/resource |
| AUTH-R08 | `DELETE /agentmemory/governance/memories` for one synthetic A ID | exact project plus destructive capability |
| AUTH-R09..AUTH-R12 | post-bootstrap viewer `/`, `/viewer`, `/agentmemory/viewer`, `/favicon.svg` | accepted bootstrap/caller capability |

### Matrix

Exercise every applicable route shape through direct and viewer origins against
the complete admitted credential/claim denominator. That denominator includes
the common credential classes plus exact wrong issuer, subject, audience,
operation, resource/action, key ID/generation, identity generation, nonce,
time, revocation, and replay variants.

Restore an identical immutable state snapshot before every direct/viewer
comparison. For an authorized mutation, require the exact oracle post-state
hash and side-effect vector. For denied or unavailable rows, require
byte-identical governed-state pre/post hashes.

For project rows, only exact project-A authority succeeds unless an accepted
policy explicitly grants a separately bounded administrator override. For the
global row, only `C-GLOBAL` may succeed.

The fixed request total is intentionally open until the complete
credential/claim/bootstrap denominator is frozen at Stage-B2.

### Stop conditions

Stop on any unauthenticated protected success, direct/viewer divergence,
authority upgrade, project-B/global marker, denied mutation, raw synthetic
canary outside its oracle, or unmanifested network attempt.

### Evidence

Request-shape ID, status, content type, byte count, normalized decision tuple,
dispatch count, and pre/post state hashes. Retain no response body, bearer,
claim body, memory, or session material.

### Proof boundary

May prove parity for the admitted route subset and claim contract. It cannot
retire R-14 or prove the complete 134-route REST denominator, MCP transports,
tools, resources, prompts, standalone fallbacks, production credentials, or
remote exposure.

## Portfolio 4: H-HEALTH

### Hypothesis

Direct API, viewer, browser rendering, CLI status, and Doctor preserve distinct
service, fetch, compatibility, component-readiness, ownership, reconciliation,
and scope states. A valid non-2xx health body remains visible and never becomes
`Unknown` or healthy.

### Proposed authority contract

- `GET /agentmemory/livez` is public and minimal.
- `GET /agentmemory/health` is service-wide and requires a separate
  operational/admin capability.
- `GET /agentmemory/project-health?project=<id>` requires the exact project
  capability and returns the defined redacted project denominator.
- An ignored `project` query on service-wide health is not project scoping and
  earns no project-isolation evidence.

This contract requires explicit human acceptance before Stage-B2 admission.

### Ordered states

1. Healthy.
2. Optional-component degraded.
3. KV critical.
4. Required worker missing.
5. Slot backend unavailable.
6. Stale snapshot.
7. Disconnected engine.
8. First healthy recovery sample.
9. Second healthy recovery sample.
10. Third healthy recovery sample.
11. Unauthorized response.
12. Malformed body.
13. Timeout or refusal.
14. Backend/viewer/API-contract mismatch.

### Matrix

For each state, observe:

- direct and viewer service-health responses with operational authority;
- direct and viewer project-health responses with project-A authority;
- one browser-rendered service/project component vector;
- one non-mutating CLI-status vector;
- one non-mutating Doctor vector.

Count per three homes:

- 14 states x five direct/viewer/project/browser observations x three homes =
  210 observations;
- 14 states x CLI status x three homes = 42 vectors;
- 14 states x Doctor x three homes = 42 vectors;
- total = 294 observations/vectors.

Expected:

- only liveness is anonymous and contains no detailed diagnostics;
- detailed health denies unauthenticated access;
- valid critical/unavailable 503 bodies remain visible;
- recovery samples one and two remain `RECOVERING`;
- only the accepted consecutive-success threshold may return `HEALTHY`;
- unauthorized, malformed, timeout, refusal, stale, and incompatible remain
  distinct;
- no required worker, slot, viewer/auth, reconciliation, or denominator
  failure can produce "all checks passing."

### Stop conditions

Stop on false health, discarded valid 503 body, scope leakage, stale response
overwriting a newer response, CLI/UI/Doctor contradiction, response data in
logs, or unmanifested listener/egress.

### Evidence

Redacted response-schema digest, HTTP status, state enum, snapshot/time,
component vector, process-tree resource vector, browser screenshot and
accessibility tree, CLI/Doctor vector, transition history, and
stale-ordering receipt.

### Proof boundary

May prove the admitted 14-state contract on the exact selected artifact pair.
It does not prove sustained availability, production load, every FR-20
component, or every build pair.

## Portfolio 5: H-LIFE

### Atomic hypotheses

- `H-LIFE-1`: one fenced runtime generation owns the configured engine,
  worker, and viewer.
- `H-LIFE-2`: stop closes every generation-owned process/listener and
  preserves every unowned process.
- `H-LIFE-3`: host-visible acceptance occurs only after durable synthetic
  intake.
- `H-LIFE-4`: pending, partial, and completed-unacknowledged events reconcile
  exactly once.
- `H-LIFE-5`: readiness remains unavailable until reconciliation converges.

### Schedules

1. Fresh single start and graceful stop.
2. Barrier-released dual start.
3. Stale PID.
4. Reused PID.
5. Worker death after intake but before claim.
6. Death after a partial side effect.
7. Completed but unacknowledged replay.
8. Poison event.
9. Engine death with worker present.
10. Stop with a modelled sibling or stale viewer generation.

Count: 10 schedules per clean home, 30 total. Each includes one project-A
event and one project-B negative control.

Expected:

- one lease/fence owner and one worker/viewer generation;
- second start rejects before listener or mutation;
- stop closes all and only owned resources;
- each accepted project-A event reaches one terminal disposition;
- a wrong-project or wrong-fence event cannot mutate A;
- partial events reconcile once, completed events are not replayed, and poison
  events quarantine without blocking unrelated work;
- readiness remains unavailable until process, lease, journal, side-effect,
  index, count, session, queue, and checkpoint reconciliation completes;
- uncertain persistence or flush is reported as degraded/failure, never
  categorically "persisted."

### Stop conditions

Stop on duplicate owner, event loss, duplicate governed effect, cross-project
effect, unbounded retry, readiness before convergence, process escape,
ambiguous cleanup, or any attempt to signal a process not created by the
fixture.

### Evidence

Process-tree and listener snapshots; PID, lease, owner-token, and fencing
transitions; append-only intake/replay ledger; pre/post state hashes; terminal
outcome equation; readiness timeline; flush disposition; and cleanup
inventory. Capture no process environment or payload body.

### Proof boundary

May prove the disposable supervisor mechanics for the exact schedules. It does
not prove current-installed-runtime safety, real logout/reboot recovery,
production durability, or completeness of the present CLI stop path.

## Canonical trace boundary

The sole PoC join table is the Iteration 7 section of
`.aiwg/requirements/traceability-matrix.md`. This portfolio intentionally
contains no competing trace matrix. Assertion candidates resolve in
`.aiwg/requirements/iteration-7-poc-assertion-decomposition.md`.

All DPA-001..027 remain open. These portfolios bound candidate evidence; they
close no DPA finding and change no requirement, realization, or trace state.

## Required atomic requirement splits

The R27 assertion decomposition prepares the following independent,
measurable candidates:

- R-14: public allowlist/shell bootstrap; direct/viewer parity;
  project/global authority; operation/resource claims; denied no-write;
  missing-secret startup; complete interface denominator.
- R-09: backend health; fetch state; compatibility; component readiness;
  scope/counter/action truthfulness.
- R-23: durable acceptance; singleton fencing; stop completeness;
  replay/idempotency; poison handling; readiness reconciliation.
- FR-15.f: issuer, audience, subject, project/global scope, operation,
  resource/action, key generation, validity, replay, and revocation.
- FR-20.a/c: vocabulary, transition table, sample interval, recovery count,
  and stale-response ordering.
- FR-20.g/h: worker presence, ownership/fence, each reconciliation component,
  and readiness transition.
- FR-20.l: preserve each of its four readiness fields as its own assertion.
- FR-21.c: ownership, start order, stop completeness, crash restart, and
  reconciliation.
- FR-21.d: bind address, liveness exception, shell/assets, viewer-data API,
  REST, MCP, stream, and control listener.

No "every" or "zero" claim is measurable until its complete interface or sink
denominator is frozen. The assertion candidates themselves require human
acceptance and Stage-B2 binding before execution.

## Gated retirement sequence

1. Repair documentary joins and atomic splits only in the canonical RTM and
   successor input set; select the exact profile and reconcile G-ICM identity.
2. Obtain explicit authority for, execute, and verify the exact emergency
   local containment sequence in
   `.aiwg/security/iteration-7-emergency-containment-decision-request.md`.
   Until this succeeds, Stage-A submission, PoC admission or execution, and
   architecture advancement remain blocked.
3. Obtain valid R-13 Stage-A human acceptance or return-for-revision.
4. If separately authorized, build only disposable R-13 Stage-B1 mechanics
   under `.aiwg/working/pocs/**`.
5. Obtain R-13 Stage-B2 admission with exact bundle digests, actors, limits,
   ports, stops, cleanup, signer, and independent verifier.
6. Execute H-BIND. A wildcard or unowned listener stops the portfolio.
7. Execute H-BOOT. Any anonymous shell/asset, credential leakage, replay, or
   authority upgrade stops the portfolio.
8. Execute H-AUTH. A confused-deputy path or denied mutation stops the
   portfolio.
9. Execute H-HEALTH only after the authentication boundary is trustworthy.
10. Execute H-LIFE last because it is the most fault-heavy and
    process-mutating.
11. Independently verify and seal each cohort before considering the next.
12. Use results only as candidate inputs to later risk-owner and architecture
    decisions. No result self-retires a risk or authorizes the next stage.

## Current disposition

- Portfolio: specification preparation only.
- R-13 Stage A: not accepted.
- R-13 Stage B1: not authorized.
- R-13 Stage B2: not admitted.
- Execution: prohibited.
- Product/runtime mutation: prohibited.
- Risk status: all `IDENTIFIED`.
- Architecture and ADRs: unaccepted.
- ABM: NO-GO.
- Construction and release: unauthorized.
