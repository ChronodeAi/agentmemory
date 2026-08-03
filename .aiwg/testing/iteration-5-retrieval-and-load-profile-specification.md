# Iteration 5 Retrieval and Load Profile Specification

Status: **PROPOSED METHOD - NO CORPUS, HOST, OR RUN ADMITTED**

Date: 2026-07-29
Authority source: `.aiwg/testing/master-test-plan.md`

## Decision boundary

Stage A may accept this method. Exact corpora, labels, reviewers, tokenizer,
host, event mix, fixtures, and fault schedules are B2 admission identities.
No benchmark or soak is authorized by this document.

## Retrieval and answer-quality method

1. Freeze at least 50 queries in five equal strata:
   current implementation; stale/conflicting authority; project isolation;
   uncommitted provenance; and secret/irrelevant negatives.
2. Two blind independent reviewers label eligible source IDs, currentness,
   project, supported facts, and prohibited authority claims before seeing
   ranking.
3. Require Cohen's kappa at least 0.80 for categorical eligibility/currentness.
   A third reviewer adjudicates every disagreement before freeze.
4. Score macro precision@5 across all queries and each stratum. Pass requires
   macro at least 0.80, every stratum at least 0.70, and zero cross-project,
   secret, or stale-authority result in a gate-critical packet.
5. Blindly compare no recall, bounded current recall, and adversarial stale
   recall. Bounded recall must improve supported facts without increasing
   unsupported authority claims. Any stale recall that changes a gate-critical
   answer without live corroboration fails.
6. Include the reported failure shapes: obsolete adapter, conflicting database
   posture, wrong language, unrelated activity, synthetic commit links, and
   absent uncommitted provenance.

## Load, backpressure, and soak method

1. Freeze agent mix, event types/rates, dataset/secret fingerprints, host,
   queue policy, fault schedule, and expected terminal count.
2. Run three independent 30-minute repetitions for both baseline and pressure.
   Each repetition emits at least 10,000 governed capture events and 500
   context requests unless an accepted host profile declares a lower bounded
   target before admission.
3. Sample process-tree RSS, queue depth, worker count, and dropped counters at
   250 ms or faster. Measure every hook latency and separate context-injecting
   from telemetry-only distributions.
4. Exercise required-worker loss, KV latency/failure/recovery,
   viewer/backend mismatch, slot-list failure, restart/replay, and log/disk
   pressure. Probe every 30 seconds and require three consecutive complete
   successes before `HEALTHY`.
5. Preserve every attempt; no failed repetition may be replaced or omitted.

Every repetition must satisfy:

- p95 hook latency strictly below 2 seconds and p99 below 5 seconds;
- maximum capture queue depth 256;
- zero lost or duplicated terminal events;
- disk/log growth at most 512 MiB per 30 minutes;
- process-tree RSS at or below the lower of 4 GiB or 50 percent of accepted
  host capacity;
- truthful degraded/critical states, exact replay reconciliation, and three
  consecutive complete recovery successes; and
- zero secret or cross-project leakage.

## Required B2 instance freeze

B2 must name exact corpus/profile IDs, source digests, tokenizer/version,
reviewer identities and independence, adjudicator, host/build/resources,
event-rate manifest, fault schedule, expected counts, runner/validator
identities, recording sinks, and custody path. Until then every observed
metric is exploratory and cannot qualify R-13, a risk, ABM, or release.
