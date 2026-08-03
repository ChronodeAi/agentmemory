# Agentmemory Local macOS Development Case

Status: **ACCEPTED DEVELOPMENT AND EVIDENCE ROUTE; NOT AN ARCHITECTURE BASELINE**
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Change request: `CR-AM-LOCAL-001`
Impact assessment: `IA-AM-LOCAL-001`
Deployment target: `local-macos`

## Purpose

Define the lifecycle, authority, evidence, and tailoring rules for producing a
dependable local macOS Agentmemory package. DEC-11 accepts this development and
evidence route only. It replaces no architecture or process baseline and
authorizes no product implementation.

The target is a local deployment. DEC-13 selects processing-policy Option A:

```text
deployment_target = local-macos
processing_policy = zero-egress (default)
processing_policy = provider-enabled (only with an exact accepted provider manifest)
```

Policy is project-specific. Absence of an accepted provider manifest resolves
to `zero-egress`; malformed, conflicting, or ambiguous policy fails closed.
DEC-14 selects viewer Option A: bearer authentication is required for the
static shell, assets, viewer data, API, and MCP, and only
`GET /agentmemory/livez` is unauthenticated.

Disposition source:
[Iteration 4 Local macOS Human Disposition](../reports/iteration-4-local-macos-human-disposition-2026-07-28.md).

## Product outcome

The intended product is one transactional local experience:

```text
agentmemory setup
agentmemory status
agentmemory doctor
agentmemory project status
agentmemory integrations status
agentmemory backup create
agentmemory upgrade
agentmemory rollback
agentmemory uninstall
```

The package owns and reports compatible identities for the CLI, iii engine,
worker, API, MCP surface, viewer, plugin, hooks, schema, configuration, data
generation, and LaunchAgent. A healthy compatible system shows no unexplained
`Unknown`; degraded states name the failed capability and required action.

## Supported release target

Mandatory release target candidate:

- macOS `26.5.1` build `25F80`;
- Apple Silicon `arm64`;
- Node `24.16.0`;
- npm `11.13.0`;
- user-session LaunchAgent;
- loopback-only API, streams, MCP, and viewer-data paths;
- Codex and Claude on the same host; and
- project-scoped local state.

The host default Node `26.0.0` and npm `11.12.1` are compatibility observations,
not members of the mandatory qualification denominator. Ubuntu, Windows,
containers, public endpoints, and multi-host operation are deferred.

The exact profile remains subject to human Test Architect acceptance. If any
profile component changes, the profile identity and all affected evidence must
change.

## Deployment envelope

The local deployment profile applies orthogonally to architecture
configurations C1, C2, and C3. It does not create a fourth semantic option or
select a configuration.

Every surviving configuration must define:

1. immutable runtime release installation;
2. user-owned LaunchAgent service ownership and shutdown order;
3. managed iii engine and worker lifecycle;
4. bearer-authenticated protected API, MCP, viewer-data, and control paths;
5. bearer-authenticated static shell/assets and exact unauthenticated
   `GET /agentmemory/livez`;
6. canonical project identity and project-scoped state;
7. project-specific zero-egress-default processing policy, accepted provider
   manifest for provider-enabled operation, and attempt receipts;
8. atomic runtime-release and data-generation activation;
9. normal, canary, and rollback isolation;
10. backup, migration, exact restore, rollback, uninstall, and support output.

C2 and C3 remain eligible only when their gateway and receipt-relay components
are local, loopback-bound, explicitly owned, and satisfy every strict-core veto.
Off-host relay operation is outside this release target.

## Lifecycle stages

### 1. Elaboration reconciliation

Permitted:

- change control and impact analysis;
- requirements, realizations, architecture, test, risk, and traceability
  candidates;
- decision packets, evidence manifests, and independent reviews;
- exact runtime observation without mutation; and
- separately authorized bounded P0/P1 PoC mechanics.

Not permitted:

- ordinary product, governed test, CI, package, schema, installed runtime,
  provider-home, Memetics-data, service, or deployment mutation;
- ADR acceptance, SAD baseline, risk retirement, ABM PASS, or inferred human
  authority.

Exit requires:

- one internally consistent frozen decision surface;
- accepted measurable requirements and realizations;
- accepted Stage-A test and evidence specification;
- qualified R-13 evidence method;
- qualified veto and risk evidence;
- human architecture selection and ADR/SAD dispositions;
- required risk dispositions and signoffs; and
- independent ABM PASS.

ABM PASS authorizes only a separate Construction decision request.

### 2. Construction

Entry requires exact human Construction authorization against the accepted
freeze. Implementation proceeds as bounded vertical slices:

1. identity, authentication, and processing-policy enforcement;
2. acknowledgement, health, worker, and session truthfulness;
3. durable event, deduplication, compaction, and provenance behavior;
4. generation-fenced migration, restore, backup, and rollback;
5. connector ownership for Codex and Claude;
6. immutable package, transactional setup, LaunchAgent, status, Doctor, and UI;
7. upgrade, rollback, uninstall, and support output.

Each slice requires requirement and ADR links, focused tests, accepted-profile
evidence, rollback notes, and independent review proportional to risk.

### 3. Local qualification

Entry requires a commit-identified package and accepted local profile. Run only
in isolated homes, ports, service labels, state roots, provider roots, and
project identities.

Qualification covers:

- five-run deterministic source/test cohort;
- three clean-home repetitions of the local lifecycle journeys;
- both processing modes using synthetic recording sinks;
- browser-level health and degraded-state rendering;
- two-project and colliding-identity isolation;
- fresh credentials and complete secret/sensitive-data sink scans;
- restart, singleton, replay, reconciliation, and failure recovery;
- exact backup, migration, restore, upgrade, rollback, and uninstall;
- official-upstream rollback-subject compatibility.

Qualification evidence does not admit the normal runtime or Memetics.

### 4. Local admission and Memetics canary

Normal-runtime switching requires:

- separately installed and independently qualified official-upstream rollback
  subject;
- exact candidate and rollback release identities;
- passed local qualification;
- named Release, Operations, Security, and Test dispositions; and
- separate operator authorization for the switch.

The five-session Codex/Claude Memetics canary is a later independent decision.
It must remain project-scoped, explicit-recall-only unless injection is
separately admitted, and rollback-ready.

### 5. Release and distribution

Release requires a separate human decision after local admission and any named
canary. Broader platforms, repositories, agents, and cloud targets require new
profiles and admission decisions.

## Processing modes

DEC-13 selects this Option A policy model. `zero-egress` is the project
default. `provider-enabled` is available only under an exact accepted provider
manifest; selecting the model does not accept any manifest or authorize a real
provider call.

### Zero egress

- no external model, embedding, fallback, telemetry, or content-processing
  attempt;
- missing policy fails closed;
- network-attempt recording proves the complete denominator;
- local feature unavailability is truthful and does not become fallback.

### Provider enabled

- exact provider, destination, purpose, data class, project, and session are
  authorized before the boundary;
- minimization and redaction occur before transmission;
- attempt and result are observable without storing protected payloads;
- failure never changes mode or destination silently.

Real provider probes require separate authorization. Synthetic recording sinks
may qualify the policy mechanics without external transfer.

## Railway applicability

| Concern | This development case |
|---|---|
| Local secret flow | Mandatory local evidence under `R-02` |
| Historical Railway exposure | Parallel `UNVERIFIED / NOT EVALUATED` security issue; named human owner required and currently unassigned |
| Prospective Railway deployment | Deferred and excluded from package, qualification, ABM, canary, and release denominators |

No Railway operation is a predecessor to local ABM. No artifact may claim
historical non-deployment or containment without attributable evidence. Any
later Railway investigation, rotation, log restriction, or purge requires
separate security authorization.

## Evidence and custody

- Git, live source, accepted ADRs, tests, immutable receipts, and attributable
  human decisions outrank Agentmemory recall and agent summaries.
- Exact current bytes are frozen; a dirty governance tree cannot be represented
  solely by a commit label.
- Every evidence cohort declares profile, denominator, source, package, engine,
  schema, signer, executor, reviewer, custody, and failed attempts.
- Same-run checksums are integrity metadata, not independent signatures.
- Recalled content cannot prove or promote itself without fresh verification.
- Secrets, raw memory content, and provider payloads are excluded from evidence.

## Authority matrix

| Decision | Accountable human authority | Required concurrence |
|---|---|---|
| Development-case acceptance | Project Manager / Process Owner | Test Architect, Configuration Manager, Gate Authority |
| Requirement and realization acceptance | Product Owner or Founder and Requirements Owner | Named requirement, Security, Test, and Architecture reviewers |
| Stage-A test specification | Test Architect | Configuration Manager, Security Architect, Release Owner |
| PoC B1/B2 | Named human authorizer | Configuration Manager, executor, independent verifier as specified |
| Architecture selection and ADR/SAD | Software Architect | Security, Operations, Requirements, Configuration |
| Risk disposition | Named accountable Risk Owner | Required reviewers in the frozen card |
| ABM | Independent Gate Authority | Required lifecycle reviewers |
| Construction | Human Construction Authority | Accepted ABM and exact frozen revision |
| Local switch | Release Owner / Operator | Operations, Security, Test, rollback verifier |
| Memetics canary | Memetics Product Owner / Operator | Agentmemory Release, Security, Test |
| Release | Release Owner | Configuration, Security, Test, Operations |

Agents prepare evidence and recommendations only. Blank role lines are open.

## Change control

- Scope changes require a change request, impact assessment, affected artifact
  map, and successor freeze.
- Cloud-only rows are marked deferred or not applicable for this target, never
  deleted or represented as passed.
- No risk changes status from tailoring alone.
- A failed or stopped evidence run is preserved and never repaired in place.
- Every new run uses a fresh identity and exact bounded authorization.
- Architecture, requirements, tests, ABM, Construction, local admission,
  Memetics canary, and release remain separate decisions.

## Disposition

DEC-11 accepts this local macOS development and evidence route. DEC-13 and
DEC-14 supply its processing-policy and viewer-authentication choices. These
dispositions do not select C1, C2, or C3; accept an ADR; baseline the SAD;
close a veto; accept Stage A; pass ABM; or authorize implementation,
Construction, qualification, service mutation, canary, release, or
deployment. The existing ABM `FAIL / NO-GO` and Construction prohibition
remain controlling.
