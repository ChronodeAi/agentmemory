# R-07 Bounded Capture and Observability Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-07`
Priority: P1
Method: bounded build-poc after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-07-v1.json`.
- Qualification source, disposable mechanics bundle, selected host/profile,
  signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Under one exact human-accepted host and load profile, can four-agent capture
remain within latency, memory, disk, logging, and capacity bounds while
truthfully distinguishing active concurrency from durable queue and terminal
delivery outcomes?

## One bounded hypothesis

For one immutable accepted host/load-profile digest and 30-minute four-agent
schedule, nominal capture produces zero loss and meets all frozen latency and
resource ceilings, while every injected pressure or delivery fault records
separate active, queued, rejected, dropped, failed, retried, dispatched, and
delivered transitions with one durable terminal outcome and zero recursive
observability amplification.

## Current-source finding and test gap

At the source candidate:

- `src/functions/observe.ts:21-45` defines a process-local admission object
  whose `active` value and limit of 256 describe in-flight operations;
- `src/functions/observe.ts:166-176` rejects when active operations reach that
  limit, and `src/functions/observe.ts:534-552` updates process-local
  completion/failure counters and decrements `active`;
- `src/health/monitor.ts:137-175` snapshots active/accepted/completed/failed/
  rejected counters and recent deltas, but not a durable queue ledger;
- `src/hooks/_observe-delivery.ts:3-80` performs at most two in-process HTTP
  attempts with a 250 ms attempt timeout and no durable enqueue or terminal
  receipt;
- `src/hooks/_observe-delivery.ts:83-87` writes a final error to stderr, while
  `test/hook-delivery.test.ts:111-123` expressly expects the host command to
  remain successful; and
- `iii-config.yaml:38-55` documents the sampling `0.1` and console-off controls
  used to prevent a prior recursive log-amplification shape.

`test/hook-delivery.test.ts:19-123` and
`test/hook-project.test.ts:141-205` cover bounded retries, project headers,
invalid success bodies, and host-visible error reporting.
`test/health-thresholds.test.ts:200-220` covers alerts derived from active,
rejected, and failed counters. These tests do not establish a durable queue,
per-event terminal outcomes, restart-safe accounting, exact queue depth,
four-agent latency percentiles, a 30-minute resource envelope, or recursion
absence. The current `active` counter must not be relabelled as queue depth.

## Required frozen prerequisites

1. One human-accepted exact host profile manifest containing profile ID, OS
   name/version/build or image digest, architecture, CPU model/count, RAM,
   storage device/filesystem/quota, container/VM limits, Node/npm/Vitest,
   iii-engine and Agentmemory artifact digests, ports, worker count, boot
   identity, background-load policy, and resource-measurement method.
2. One human-accepted exact load profile manifest containing four fixed agent
   identities, hook-class mix, payload-size distribution, arrival rate, burst
   schedule, concurrency schedule, session/project topology, timeout/retry
   policy, 30-minute duration, warm-up, measurement windows, and deterministic
   seed. No host or load tuple may substitute for the accepted digest.
3. Accepted candidate configuration with observability sampling at or below
   `0.1`, console logging off, and a frozen configuration digest.
4. Accepted durable intake/outcome schema defining event and attempt IDs,
   queue capacity and depth, transition ordering, terminal outcomes, fsync/
   commit boundary, and the outcome conservation equation.
5. R-13 accepted profile, immutable source bundle, `G-ICM-01`, fixture
   manifest, signer authority, independent verifier, and synchronized clocks.
6. Disposable state, recording transport/log/metric sinks, deterministic
   fault injector, process-tree resource observer, and isolated network.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Performance Test Owner | Unassigned |
| Service reviewer | Service Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Operations reviewer | Operations Owner | Unassigned |
| Host-profile owner | Operations Owner / CI Owner for the selected host | Unassigned |
| Executor | Isolated load operator, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- Four fixed agents, two synthetic projects, fixed sessions, and a
  content-addressed event corpus spanning every governed hook class.
- Nominal, burst-to-limit, burst-over-limit, oversized, malformed,
  duplicate-attempt, retry, and cross-project event schedules.
- Recording durable queue/outcome ledger with independent sequence and
  persistence probes; active-operation instrumentation remains a separate
  channel.
- Synthetic 429, 503, invalid-200, timeout, connection reset, worker stall,
  process termination, disk pressure, log-sink lag, and recovery controls.
- Process-tree RSS/CPU/event-loop, disk/log-growth, transport-latency,
  queue-depth, transition, trace-ID, and host-visible-result collectors.

## Fault matrix

- Inject faults immediately before and after durable acceptance, queue append,
  dequeue, dispatch, response receipt, retry append, terminal commit, metric
  emission, log emission, and host-result emission.
- Hold active operations at 255, 256, and above-limit attempted admission while
  independently setting durable queue depth below, at, and above its accepted
  threshold.
- Terminate a hook, worker, or sink at each transition; restart only where the
  accepted R-07 recovery oracle defines an attributable outcome. R-23 remains
  owner of full worker replay/reconciliation evidence.
- Force stderr/log delivery failure and repeated observability warnings while
  checking trace ancestry for recursion.
- Repeat the exact nominal and fault schedules without changing the accepted
  host, load, source, configuration, or fixture digests.

## Governed sinks and side effects

The denominator includes hook stdin/stdout/stderr, host exit/result, active
admission counters, durable queue, event/attempt/outcome ledger, transport
requests/responses, retry timers, KV/SQLite, streams, indexes, logs, metrics,
traces, health snapshots, alerts, temporary files, receipts, process tree,
disk/log files, provider/network attempts, rollback artifacts, and failure
remnants. Active concurrency, queue depth, and cumulative outcomes are
different fields with different source clocks and may never be inferred from
one another.

## Measurable pass/fail criteria

Pass requires all of the following:

1. Receipt host-profile, load-profile, source, configuration, fixture, and
   collector digests exactly match the human-accepted manifests.
2. During the nominal 30-minute four-agent run, each hook class has p95
   end-to-end latency strictly below 2 seconds and aggregate p99 strictly below
   5 seconds, with no forced hook timeout.
3. Active concurrency never exceeds 256; separately measured durable queue
   depth never exceeds 256; neither field is labelled or reported as the
   other.
4. Nominal outcome conservation is exact:
   `accepted = delivered + rejected + dropped + failed`, with zero rejected,
   zero dropped, zero failed, and no unattributed event. Retried is an attempt
   transition, not an additional accepted event.
5. Each fault case satisfies its frozen terminal oracle, emits no host-visible
   success before durable acceptance, and has exactly one terminal
   `delivered`, `rejected`, `dropped`, or `failed` outcome. No failure is
   converted into success.
6. Peak process-tree RSS is at or below the lower of 4 GiB or 50% of accepted
   host RAM; disk plus log growth is at most 512 MiB over 30 minutes.
7. Observability sampling remains at or below `0.1`, console logging remains
   off, recursive trace-ID count is zero, and log/metric growth remains
   monotonic and bounded under the recursion faults.
8. Independent verification reconstructs every percentile, maximum,
   conservation equation, and resource delta from immutable raw evidence.

Fail is any profile substitution, percentile or resource breach, active/queue
semantic conflation, missing transition, event loss, duplicate terminal
outcome, fabricated host success, unbounded retry, deadlock, recursive trace,
unattributed side effect, collector gap, or incomplete fault case.

## Stop and backtrack

Stop load immediately on unbounded RSS/disk/log growth, any real content or
secret, queue depth above 256, event loss, recursive trace, deadlock,
unattributed terminal result, profile drift, collector failure, or network
escape. Cap admission, disable nonessential fixture capture, terminate the
fixture process tree, preserve redacted evidence, and return to profile,
queue-contract, or observability review. Do not continue after containment or
measurement integrity is lost.

## Immutable receipt

The sealed receipt binds the risk/card version, source and source-bundle
digests, exact accepted host/load/configuration/profile IDs and manifests,
fixture and fault-schedule digests, four agent/session/project identities,
event and attempt denominators, per-class latency samples, active and queue
time series, transition/outcome ledger hashes, trace graph, process-tree
resource series, disk/log pre/post hashes, collector calibration, start/end
times, executor, signer, and independent verification disposition.

## Rollback and cleanup

Use only disposable state and recording sinks. Stop all four agents and fixture
workers, drain or terminally dispose only manifested queued events according to
the accepted oracle, restore configuration and state pre-images, remove only
manifested temporary/log artifacts, and verify zero process, queue, port, or
network residue. Preserve the immutable receipt and all manifested redacted
raw evidence; do not delete anything named by the receipt.

## Admission blockers and execution prohibition

- Named humans for the owner, reviewers, host-profile owner, executor, signer,
  and independent verifier.
- Human acceptance of one exact host profile and one exact four-agent load
  profile; the MTP values remain proposed until that acceptance is recorded.
- Human acceptance of durable queue/outcome semantics, terminal oracles,
  collectors, thresholds, rollback, receipt, R-13 profile, `G-ICM-01`, and
  immutable source bundle.
- Complete fixtures and deterministic fault controls in an isolated
  synthetic-only environment.

Do not invoke or build a PoC for R-07 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-07; accept a queue design, telemetry architecture, ADR, SAD, MTP, or
ABM decision; authorize Construction; or authorize deployment, distribution,
rollout, production load, or changes to runtime/service configuration.
