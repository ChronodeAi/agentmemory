# R-14 Required Authentication Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-14`
Priority: P1
Method: bounded build-poc after human admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-14-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  assertion/authentication identities, signer, verifier, and human
  assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and live credential inspection: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can every protected REST and MCP surface fail closed when required secret
material is missing, unreadable, empty, invalid, or unavailable, while
enforcing exact operation, resource/action, canonical-project, and separately
authorized global capability bounds with zero governed domain side effect?

## One bounded hypothesis

Against one frozen complete interface denominator, only the liveness allowlist
is unauthenticated; every protected REST route, MCP transport, tool, resource,
prompt, and governed fallback denies absent or invalid authentication and
accepts only a non-replayed, non-revoked capability whose issuer, audience,
subject, identity generation, project or explicit global scope, operation,
resource/action class, key ID, and validity window exactly match the request.

## Current-source finding and test gap

The revision-pinned `G-ICM-01` records 135 HTTP routes: one public
`GET /agentmemory/livez` route and 134 protected routes, plus six protected MCP
HTTP transport routes, 59 MCP tools, five MCP resources, three MCP prompts, and
seven standalone fallback tools.

At the source candidate:

- `src/triggers/api.ts:210-230` adds authentication middleware to every REST
  trigger except the liveness allowlist, and `src/triggers/api.ts:237-288`
  distinguishes explicit global scope from project-bound requests;
- `src/auth.ts:9-23` defines project capability claims as audience, project,
  expiry, optional issue time, and optional capability ID;
- `src/auth.ts:167-232` verifies signature, audience, expiry, and optional
  project, while `src/auth.ts:276-304` returns typed unavailable when required
  shared or administrative secret material is absent;
- `src/mcp/server.ts:104-141` authenticates MCP tool calls using global or
  requested-project authority, and `src/mcp/server.ts:1695-1732` separates
  project resources from administrator-only resources; and
- secret-file readers return an empty value after missing or unreadable files
  (`src/hooks/_auth.ts:13-31`, `src/mcp/rest-proxy.ts:106-143`), while
  `src/project-config.ts:236-244` leaves authentication unset after read
  failure for downstream fail-closed policy.

`test/auth-capability.test.ts:38-150` covers audience, expiry, exact project,
tampering, strict legacy denial, and administrator-only global scope.
`test/integration.test.ts:314-350` checks liveness plus a few unauthenticated or
wrong-token REST requests, and `test/mcp-resources.test.ts:107-170,297-327`
checks selected project/administrator resource behavior. The tests do not
execute the complete protected denominator or prove operation/resource/action
claims, issuer/key separation, identity generation, `jti` replay, revocation,
`nbf`/clock bounds, every global path, every missing/unreadable secret source,
or zero side effects for every denial. R-18 separately owns silent proxy
downgrade, but any R-14 run must preserve the shared no-fallback boundary.

## Required frozen prerequisites

1. Immutable source bundle and content-addressed `G-ICM-01` manifest whose
   admitted denominator is exactly 134 protected REST routes; six MCP
   transports; 59 tools; five resources; three prompts; and seven standalone
   fallback tools, with method/name/URI, operation, resource/action class,
   scope, project-binding locations, and expected status for every row.
2. Human-accepted capability schema and policy binding issuer, audience,
   subject, canonical project or separately authorized global scope,
   operation, resource/action class, identity-registry generation, key ID,
   `jti`, `iat`, `nbf`, `exp`, maximum lifetime, clock skew, key status,
   revocation, replay, and denial semantics.
3. Separate human-approved project-capability and administrative-global
   issuers, keys, audiences, custody, rotation, revocation, and expiry policy;
   compatibility infrastructure receives no global credential.
4. One accepted missing-secret startup policy: either refuse externally
   reachable binding or expose only liveness while every protected surface
   returns typed unavailable. No permissive fallback is allowed.
5. R-13 accepted profile, independent verifier, accepted R-18 no-downgrade
   matrix boundary, complete governed-state denominator, synchronized clock,
   and immutable fixture/receipt schemas.
6. Isolated externally reachable fixture using only synthetic credentials,
   recording state/network sinks, disposable secret files, and no production
   configuration or provider home.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | Authentication Service Owner | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Operations reviewer | Operations Owner | Unassigned |
| Interface denominator signer | Configuration Manager | Unassigned |
| Executor | Isolated black-box operator, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- Missing, unset, empty, whitespace, unreadable, directory-as-file, truncated,
  malformed, wrong-permission, replaced, and rotated synthetic shared,
  project-capability, and administrator secret sources.
- Valid, missing, malformed, wrong-signature, wrong-issuer, wrong-key-ID,
  wrong-audience, wrong-subject, expired, not-yet-valid, overlong,
  wrong-generation, revoked, replayed-`jti`, wrong-project, wrong-operation,
  wrong-resource/action, and project-capability-for-global tokens.
- Header/body/query/tool-argument project agreement and mismatch cases for two
  canonical projects, plus explicit global and absent-scope cases.
- One row per frozen REST/MCP denominator item, including all five resource
  URIs, three prompt names, 59 tool names, six transports, and seven governed
  standalone fallback tools.
- Recording domain-state, denial-ledger, network, local-fallback, filesystem,
  log, stderr, exception, audit, metric, health, receipt, and rollback sinks.

## Fault matrix

- Fail immediately before and after secret-source resolution, file open/read,
  key selection, claim parse, signature verification, time check, revocation/
  replay check, project/scope reconciliation, operation/resource decision,
  middleware return, handler dispatch, denial-ledger append, and response.
- Inject permission change, symlink substitution, partial read, file
  replacement, rotation race, clock boundary, key revocation, replay race,
  middleware failure, denial-ledger failure, backend timeout, proxy error, and
  local-fallback availability.
- Interleave project A, project B, and global requests at every verification
  and dispatch barrier.
- Repeat every denial with recording sinks faulted to prove that evidence
  failure cannot relax authentication or authorize a domain effect.

## Governed sinks and side effects

The denominator includes REST/MCP responses, handler dispatch, KV/SQLite,
sessions, observations, memories, actions, slots, graph, mesh, provider/native
attempts, exports, snapshots, migration/restore, connector state, queues,
indexes, exact-facts ledgers, files, local fallback, network calls, logs,
stderr, exceptions, metrics, health, denial ledger, receipts, temporary files,
rollback artifacts, and failure remnants. A denied request may append exactly
one bounded redacted control-plane denial receipt if the accepted policy
requires it; it changes zero governed domain state. Denial-receipt failure
cannot permit the request.

## Measurable pass/fail criteria

Pass requires all of the following:

1. Unauthenticated `GET /agentmemory/livez` succeeds according to its frozen
   oracle, and no other route, transport, operation, resource, prompt, tool, or
   fallback succeeds without its required authority.
2. Every one of the 134 protected REST rows returns the accepted 401 or typed
   503 result for each applicable missing/invalid credential case, with zero
   handler dispatch and zero governed domain effect.
3. All six MCP transports and the complete 59-tool, five-resource,
   three-prompt, and seven-fallback denominator enforce their exact operation,
   resource/action, project/global, and no-downgrade oracle.
4. Missing, unreadable, empty, invalid, or replaced required secret material
   follows the one accepted startup policy and never disables authentication,
   binds a protected service permissively, or exposes credential material.
5. A project capability succeeds only for its exact canonical project,
   operation, resource/action, identity generation, issuer/key, audience,
   subject, validity window, unrevoked key, and unused `jti`; every mismatch or
   uncertainty denies.
6. Global access succeeds only with explicit global scope and the separate
   administrator authority; a project capability or compatibility path has
   zero global authority.
7. Header, body, query, URI, and MCP tool-argument bindings agree for every
   accepted request; any mismatch denies before dispatch.
8. No raw synthetic credential appears in logs, stderr, exceptions, health,
   metrics, responses, receipts, backups, or failure remnants; no test row is
   skipped or removed because setup is absent.
9. Independent verification reconciles the full interface matrix and
   before/after state manifests with no missing row or unexplained side effect.

Fail is any unauthenticated protected success, wrong-operation/resource/
project/global success, legacy or local downgrade, permissive missing-secret
state, skipped denominator row, secret disclosure, replay/revocation failure,
handler dispatch before authorization, governed domain mutation on denial,
source/profile mismatch, or incomplete fault case.

## Stop and backtrack

Stop on the first unauthenticated protected response, wrong-authority success,
secret occurrence, local downgrade, domain-state mutation after denial,
unmanifested network attempt, interface-denominator gap, or rollback mismatch.
Isolate ingress, terminate fixture sessions, revoke synthetic keys/tokens,
block local fallback and recording egress, preserve redacted evidence, and
return to capability, startup-policy, or interface review. Do not continue to
later rows after a hard-veto breach.

## Immutable receipt

The sealed receipt binds the risk/card version, source/source-bundle and
`G-ICM-01` digests, accepted capability/startup/no-downgrade policy versions,
exact REST/MCP denominator manifest, secret-source and token-fixture manifests,
fault schedule, request IDs, redacted claim-class IDs, expected/observed
statuses, dispatch counts, before/after governed-state hashes, denial-ledger
hashes, network/local-fallback recordings, synthetic-secret scan results,
clock/key/revocation snapshots, executor, signer, and independent verification
disposition. No secret or bearer value appears in the receipt.

## Rollback and cleanup

Use only disposable secret files, homes, state, ports, and recording sinks.
Stop the fixture service, revoke all synthetic keys and tokens, restore
manifested state/configuration pre-images, remove only manifested temporary
secret files and denial artifacts, terminate fixture workers, and verify zero
port, process, queue, network, or local-fallback residue. Preserve the
immutable receipt and manifested redacted raw evidence; do not delete anything
named by the receipt.

## Admission blockers and execution prohibition

- Named humans for the owner, reviewers, Configuration Manager, executor,
  signer, and independent verifier.
- Human acceptance of the complete `G-ICM-01` denominator and classification,
  capability schema/policy, separate issuer/key authorities, exact startup
  policy, denial semantics, R-18 boundary, rollback, receipt, R-13 profile,
  and immutable source bundle.
- Complete synthetic credentials, protected-interface cases, governed-state
  manifest, deterministic faults, and isolated externally reachable fixture.

Do not invoke or build a PoC for R-14 until the register state becomes exactly
`READY-FOR-BOUNDED-EXECUTION` through named human admission. This card's
current `SPECIFICATION-CANDIDATE` state provides no execution authority.

## Decision boundary

A passing run is candidate evidence only. It cannot retire, mitigate, or
accept R-14; accept a capability model, issuer/key policy, compatibility
gateway, ADR, SAD, MTP, or ABM decision; authorize Construction; or authorize
deployment, distribution, rollout, credential rotation, or production use.
