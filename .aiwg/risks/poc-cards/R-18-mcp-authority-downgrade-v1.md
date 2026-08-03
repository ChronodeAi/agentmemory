# R-18 MCP Authority Downgrade Case Card

Status: **SPECIFICATION-CANDIDATE - EXECUTION NOT ADMITTED**
Version: 1
Risk: `R-18`
Priority: P1
Evidence method: bounded `build-poc` after admission
Source candidate: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Input identity and stage state

- Design source: commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`,
  tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.
- Common identities and unaccepted profile candidates:
  `inputs/p1-input-control-v1.json`.
- Card companion input: `inputs/R-18-v1.json`.
- Qualification source, disposable mechanics bundle, selected profile,
  offline-mode policy, signer, verifier, and human assignments: **OPEN**.
- Stage B1 mechanics: **NOT AUTHORIZED**.
- Stage B2 execution admission: **NOT AUTHORIZED**.
- Execution and live MCP/store access: **NOT ADMITTED**.

Card and companion digests must be stored externally in a successor manifest;
neither artifact self-hashes.

## Decision question

Can the standalone MCP compatibility surface preserve authentication,
authorization, project scope, operation authority, storage provenance, and
truthful failure semantics across every proxy error, without silently
executing through a less authoritative local path?

## Bounded hypothesis

After authenticated proxy mode is selected, authentication, authorization,
project mismatch, required-backend, gate-critical, and protected-operation
failures execute no local fallback. A separately accepted offline mode, if
human owners choose to retain one, is explicit before invocation,
project-scoped, visibly degraded, limited to a frozen advisory allowlist, and
bound to a distinct local-state provenance.

This card does not select an offline-mode policy. It tests only the
human-accepted policy version supplied at admission.

## Source finding

At candidate commit
`0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`:

- `src/mcp/standalone.ts` catches any proxy error for locally implemented
  tools and then executes `handleLocal()`;
- `src/mcp/rest-proxy.ts` converts every non-2xx response into that error path;
- local `scope=global` requires no administrator credential and does not
  reject a simultaneous project; and
- local save/delete persist fallback state.

These are source findings and existing-test behaviors, not qualifying PoC
evidence and not a risk disposition.

## Required frozen inputs

1. Accepted compatibility/offline-mode policy ID and digest.
2. Complete standalone MCP tool denominator and server-only tool denominator.
3. Proxy error/status matrix: connection refusal, timeout, malformed response,
   401, 403, 404, 409, 422, 429, and representative 5xx.
4. Governed side-effect denominator covering KV reads/writes, persistence,
   files, metrics, access logs, audit/outbox, provider attempts, packet
   creation, suppression, promotion, export, and deletion.
5. Two-project fixture, explicit-global fixture, project-plus-global fixture,
   and distinct server/local state fixtures.
6. Synthetic credentials and secrets only.
7. Accepted R-13 profile, iii anchor, signer authority, independent verifier,
   and immutable source bundle.

## Actor assignments

| Role | Required authority | Assignment |
|---|---|---|
| Accountable owner | MCP Compatibility Owner | Unassigned |
| Security reviewer | Security Architect | Unassigned |
| Authentication reviewer | Authentication Service Owner | Unassigned |
| Test reviewer | Test Architect | Unassigned |
| Configuration reviewer | Configuration Manager | Unassigned |
| Executor | Premium coding worker, separate from reviewers | Unassigned |
| Receipt signer | Human-approved immutable-receipt signer | Unassigned |
| Independent verifier | Separate retained environment and identity | Unassigned |

## Required fixtures

- `AUTH-401`, `AUTH-403`, `AUTH-503`
- `PROJECT-MISMATCH`
- `GLOBAL-NO-ADMIN`
- `PROJECT-PLUS-GLOBAL`
- `BACKEND-404`, `BACKEND-409`, `BACKEND-422`, `BACKEND-429`
- `BACKEND-500`, `BACKEND-TIMEOUT`, `BACKEND-CONNECTION-REFUSED`
- `MALFORMED-PROXY-RESPONSE`
- `LOCAL-SAVE`, `LOCAL-DELETE`, `LOCAL-EXPORT`, `LOCAL-AUDIT`
- `SERVER-ONLY-TOOL`
- `EXPLICIT-OFFLINE-PROJECT-ADVISORY`, only if the accepted policy permits it

## Pass evidence

1. Authentication, authorization, project-binding, required-backend, and
   protected-operation failures return typed failure and execute zero local
   fallback.
2. Global access never executes locally without accepted administrator
   authority; project plus global is rejected.
3. Delete, export, audit, migration, promotion, and gate-critical operations
   never downgrade to local execution.
4. Before/after side-effect manifests show no undeclared read, write, file,
   metric, audit, provider, packet, suppression, promotion, or persistence
   effect.
5. Every allowed offline positive case was explicitly selected before the
   invocation, is project-scoped and visibly degraded, uses a separate state
   identity, and emits attributable provenance.
6. The immutable receipt binds source, policy, fixtures, complete denominator,
   executor, environment, raw outputs, and independent verification.

## Fail evidence

- Any protected proxy failure returns local success.
- Any uncredentialed local global access succeeds.
- Any project-plus-global request succeeds.
- Any fallback mutation occurs outside the accepted explicit offline policy.
- Any error class, tool, side effect, or raw output is missing from the
  declared denominator.

## Stop and containment

Stop on the first unexpected local read/write, cross-project result, global
result without administrator authority, secret occurrence, or undeclared
side effect. Use only disposable homes and synthetic state. Preserve redacted
receipts, disable implicit fallback in the fixture, and do not touch the
normal upstream runtime or production memory.

## Admission blockers

- Human acceptance of the compatibility/offline-mode policy.
- Complete tool, status/error, and side-effect manifests.
- Named owner, executor, signer, and independent reviewers.
- Qualified R-13 profile and portable independent evidence path.
- Frozen fixture manifest and expected outcome for every case.

Until every blocker is closed and the register state is exactly
`READY-FOR-BOUNDED-EXECUTION`, invoking `build-poc` for R-18 is prohibited.

## Decision boundary

A passing run would be candidate evidence only. It cannot change R-18 from
`IDENTIFIED`, accept architecture, pass ABM, authorize Construction, or
authorize deployment or rollout.
