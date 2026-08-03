# Iteration 4 Configuration Evidence Matrix

Status: **PREPARATION CANDIDATE - ALL HARD VETOES OPEN**
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Boundary

This matrix implements the operator's authorization for architecture evidence
preparation only. It maps every hard veto to proposed fixture identities,
controls, risks, and configuration-specific evidence. It does not assert that
a fixture exists, admit or execute a PoC, close a veto, score or select a
configuration, accept an ADR, baseline the SAD, change a risk, pass ABM, or
authorize Construction.

All rows remain `OPEN`. A row can move only after its exact companion input,
source, profile, fixture, denominator, receipt, signer, verifier, and required
human authority are frozen in a successor manifest and independently
dispositioned.

## Configuration definitions

| Configuration | Prepared definition | Conditional surfaces |
|---|---|---|
| C1 | Strict core, direct cutover, embedded transactional evidence | No compatibility gateway or external receipt relay |
| C2 | C1 strict core plus a temporary compatibility gateway | Exact client/operation allowlist, owner, expiry, zero-use threshold, and retirement deadline remain open |
| C3 | C2 plus an advisory external receipt relay backed by the embedded outbox | Value hypothesis, lag, retention, partition/restart, reconciliation, and operating ownership remain open |

## Hard-veto matrix

| Veto | Condition | ICM controls | Risks/cards | Prepared fixture input | C1 evidence | C2 evidence | C3 evidence | State |
|---|---|---|---|---|---|---|---|---|
| HV-01 | Cross-project disclosure or ambiguous identity | ICM-01, ICM-02, ICM-12 | R-01; R-03; R-10 | `CORE-ID-V1` | Strict identity/cutover and collision oracle | C1 plus gateway client-to-project binding | C2 plus relay project/receipt isolation | OPEN |
| HV-02 | Raw secret disclosure or prohibited external processing | ICM-03, ICM-09, ICM-10, ICM-14 | R-02; R-15 | `CORE-PRIV-V1` | Synthetic pre-boundary taint/sink and strict-local processor denominator | C1 plus gateway zero-secret custody and no authority to bypass policy | C2 plus relay payload/log/retention scan and no core-provider authority | OPEN |
| HV-03 | Unauthenticated protected operation or proxy downgrade | ICM-02, ICM-09 | R-14; R-18 | `CORE-AUTH-V1` | Exact capability and deny-by-default matrix | C1 plus legacy-to-capability translation denial matrix | C2 plus relay read-only/no-core-authority matrix | OPEN |
| HV-04 | Required failure reported as success or false healthy/readiness | ICM-05, ICM-11, ICM-12 | R-08; R-09; R-17; R-23 | `CORE-HEALTH-V1` | Required dependency, browser/body, reconciliation, recovery windows | C1 plus gateway dependency/degradation state | C2 plus relay lag/availability state | OPEN |
| HV-05 | Fabricated acknowledgement or unsupported suppression | ICM-05, ICM-06 | R-04; R-17 | `CORE-ACK-V1` | Provider-native attempt/ack/suppression matrix | Same core invariant; gateway cannot acknowledge | Same core invariant; relay cannot acknowledge or suppress | OPEN |
| HV-06 | Recalled-only or unresolved metadata promoted as authority | ICM-05, ICM-07, ICM-08 | R-03; R-05; R-06 | `CORE-PROMOTE-V1` | Eligibility/provenance/DAG negative corpus | Same core invariant; gateway promotion prohibited | Same core invariant; relay evidence remains advisory | OPEN |
| HV-07 | Mixed migration generation, non-exact restore, or audit loss | ICM-07, ICM-13, ICM-17 | R-06; R-16; R-22 | `CORE-GEN-V1` | Direct-cutover generation/rollback checkpoints | C1 plus gateway state retirement/rollback | C2 plus outbox/relay crash and reconciliation windows | OPEN |
| HV-08 | Incomplete or stale interface/state/fixture/test denominator | ICM-01 through ICM-18 | R-10; R-13 | `CORE-DENOM-V1` | Complete strict-core and 18-connector denominator | C1 plus gateway client/operation denominator | C2 plus relay state/transport/read-model denominator | OPEN |
| HV-09 | Silent compatibility downgrade, missing owner/expiry, or global gateway authority | ICM-02, ICM-09, ICM-14 | Configuration-specific | `C2-GATEWAY-V1` | Absence proof: zero legacy gateway paths | Exact proposed allowlist, denial, owner, expiry, sunset fixtures | Same gateway contract as C2 | OPEN |
| HV-10 | Bypassable evidence, non-atomic state/receipt coupling, or unreconciled relay lag | ICM-06, ICM-17 | R-16; R-22; R-23; configuration-specific | `C3-RELAY-V1` | Embedded outbox atomicity; no relay | Same as C1; no relay | Embedded authority plus advisory relay partition/reorder/restart/reconciliation matrix | OPEN |
| HV-11 | Contract lacks observable outputs, deterministic faults, or bounded criteria | All applicable controls | All P1 cards; R-01; R-05; R-08; R-15 | `CORE-FAULT-V1` | Configuration-specific deterministic fault schedule | C1 plus gateway fault schedule | C2 plus relay fault schedule | OPEN |
| HV-12 | Missing independent verification or required human authority | ICM-16 and all decision gates | R-13; all cards | `CORE-AUTHORITY-V1` | Frozen signer/verifier/owner/profile/receipt chain | Same plus gateway owner/retirement authority | Same plus relay operations/retention authority | OPEN |
| HV-13 | Automatic native sync or unattributable destination mutation | ICM-02, ICM-18 | R-19 | `CORE-NATIVE-V1` | Explicit-action two-project/global-negative matrix | Same; gateway cannot invoke native sync | Same; relay cannot invoke native sync | OPEN |
| HV-14 | Caller-controlled lifecycle binding or stale unguarded closure | ICM-04 | R-20 | `CORE-SESSION-V1` | Immutable bindings and CAS interleavings | Same core invariant through gateway translation | Same core invariant; relay has no lifecycle authority | OPEN |
| HV-15 | Non-durable dedupe success or mixed compaction generation | ICM-03, ICM-17 | R-21; R-22 | `CORE-INTEGRITY-V1` | Full-event identity, reservation/result, generation/tamper matrix | Same strict-core invariant | Same strict-core invariant plus relay duplicate/reorder read model | OPEN |
| HV-16 | Accepted event lacks terminal disposition, replay, singleton ownership, or startup reconciliation | ICM-11, ICM-14, ICM-17 | R-07; R-08; R-23 | `CORE-REPLAY-V1` | Durable intake/worker/replay/readiness process oracle | Same plus gateway-delivered event attribution | Same plus outbox/relay restart and backlog reconciliation | OPEN |

## Prepared companion inputs

The following preparation-only inputs define identities and oracles. Their
presence does not satisfy a row:

- `.aiwg/risks/poc-cards/inputs/common-strict-core-v1.json`
- `.aiwg/risks/poc-cards/inputs/c1-direct-cutover-v1.json`
- `.aiwg/risks/poc-cards/inputs/c2-compatibility-gateway-v1.json`
- `.aiwg/risks/poc-cards/inputs/c3-receipt-relay-v1.json`
- `.aiwg/architecture/iteration-4-p2-hard-veto-evidence-specifications.json`
- `.aiwg/architecture/iteration-4-mcda-input-v1.json`

## Scoring prohibition

C1, C2, and C3 remain unscoreable while any applicable row is `OPEN`.
Prepared fixture IDs, design prose, unit tests, prior containment evidence,
and a locally verified manifest are not qualifying veto-closure evidence.
