# AB-STGA-001: R13 Local macOS Stage-A Authority Binding

Status: **ACTIVE - STAGE A ACCEPTED**
Date bound: 2026-07-31
Project: `github.com/chronodeai/agentmemory`
Candidate commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Candidate tree: `8c479b95bb9753911df212089d7faf3d6f35a28d`
Profile: `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1`

## Purpose

Bind the already recorded and independently replay-verified Stage-A human
disposition into the canonical R29 lifecycle workspace without altering any
accepted R29 specification, R30 dependency input, historical request, or
receipt.

The accepted R29 card, Master Test Plan, and deterministic-profile packet
retain their frozen pre-decision wording. Their `Unassigned` and
`BLOCKED / NOT YET ELIGIBLE` placeholders are historical state, not the
current authority state. This successor binding is the current authority
overlay.

## Human authority

Authorizing operator and Human Test Architect: Alexander Roberts

Concurrences:

- Configuration Manager: Alexander Roberts - `CONCUR`
- Security Architect: Alexander Roberts - `CONCUR`
- Release Owner: Alexander Roberts - `CONCUR`
- Local Test Infrastructure Owner: Alexander Roberts - advisory input recorded
- Dependency Owner: Alexander Roberts - advisory input recorded

Role consolidation and reduced human independence are acknowledged. No
independent human review is claimed.

## Bound evidence

Authoritative preparation root:

`/private/tmp/chronode-agentmemory-preparation/ccf849b731aa9f3a5ec8fefa79d95826900d3fe3e7125c7b300c3e41ba40d80e`

| Evidence | SHA-256 |
|---|---|
| Stage-A role assignment disposition JSON | `5dbacb23f1c1baff4c08708d143ec1959cfa6488254a4e55efcd5462561ba992` |
| Stage-A human disposition JSON | `f37ef42dcc531f80c1ac0a3bb61acdf3d04c7400d72c6ac7e7ba2a05906b51ff` |
| Stage-A human disposition Markdown | `31b163a7db814f1accd0cc393030e2db924f3077e7c7bd5a4d3094ad75105f52` |
| Stage-A disposition verification | `cb5bfb30db6a85a6424f0d301170660489cd542c06ab17989cc9b08e4b2b3228` |
| R29 full documentary manifest | `54893895fa4b11918479045e72f0357d33747e9aa38d808f697876a0afdc7829` |
| R29 deterministic receipt | `52f7b201c84fcf52c91729b2efffd81278efa35c4c70cf05cb5b8d474df6d64b` |
| R29 adversarial review | `640f043a1f3a474a2ca881d11a0814cd6647a5a76f2fde21aed1a5fb2aab75ff` |
| R30 repaired package lock | `360911087af6eb74f879404a73f36a1adcb8e8bab9ac186b98376ebbc39e5597` |
| R30 manifest | `50e2ca8d56ee36ab62d73ea0792cb6170580c3a55d150bb565abfdf298da61d5` |
| R30 verification receipt | `2facf225058ba24d5a06fba4f916f04a2a004f6687300145f8a2a7aa6f3e8c85` |
| R30 adversarial review | `fb377d54f771ce032104a3139d6f6935c81bfe346f649ab1bbf9c53a58651356` |

Stage-A record ID:

`3c6204ea3462278e6706afca32af873d7c6d2a5cb9be4b2611b82c76b7b28f58`

The deterministic disposition verifier passed 32 of 32 checks, replayed the
source event, matched every accepted anchor, and found zero secret-scan
findings. Custody remains unsigned and not independently authenticated; that
limitation was explicitly accepted for Stage-A specification only.

## Current lifecycle state

| Stage or gate | Current state |
|---|---|
| Stage A | `ACCEPTED` for R13 local macOS specification only |
| B1 | `ELIGIBLE FOR SEPARATE DECISION - NOT YET EXECUTED` |
| B2 | `BLOCKED` pending exact B1 evidence and separate admission |
| Stage C | `NOT EXECUTED` |
| Stage D | `NOT EXECUTED` |
| Stage E | `NOT EXECUTED` |
| Risks | `23 IDENTIFIED; 0 mitigated; 0 retired` |
| DEC-15 | `NOT MET - 11/49` |
| ABM | `FAIL / NO-GO` unchanged |
| Architecture | proposed; not accepted by this binding |
| Construction | unauthorized |

## B1 successor treatment

The verified R2 B1 decision package remains intact, but its premium-worker
route was returned because the then-available Codex binaries were not
admissible. The later Codex R2-R9 control-plane sequence admitted an exact
disposable Codex `0.146.0` candidate for contained version and help behavior,
and R10 separately confirmed native premium-wrapper dispatch with bounded
synthetic responses. Neither result qualifies CLI authentication or proves
native child-tool isolation.

The lowest-risk successor is therefore an R3 B1 request that:

1. preserves the exact R2 source projection, sandbox, roots, mechanics,
   limits, secret baseline, and stop conditions;
2. explicitly waives external premium-worker use inside B1;
3. creates only deterministic Node-standard-library mechanics under the sole
   B1 write root;
4. keeps any premium advisory review outside qualifying B1 evidence; and
5. retains a separately gated external-model path for later work if an exact
   credential and model boundary is ever required.

This avoids copied token caches, real credential handling, unobservable native
tool startup, and a false claim that R10 qualified the disposable CLI model
path.

## Authority effect

This binding makes Stage-A acceptance and B1 decision eligibility current in
the canonical lifecycle workspace. It does not authorize B1 execution, B2,
Stage C, runtime qualification, risk disposition, ADR acceptance,
architecture baseline, ABM, Construction, packaging, canary, deployment,
release, or rollout.

