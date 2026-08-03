# Iteration 4 Local macOS Validation Receipt

Status: **LOCAL ADVISORY VALIDATION - NOT GATE ACCEPTANCE**
Observed: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
AIWG session: `aiwg-iteration-dual-track-elaboration-iter4-2026-07-28-1805`

## Boundary

This receipt validates documentary consistency and samples the installed local
runtime without modifying product code, runtime configuration, credentials,
hooks, memory data, service ownership, or Railway.

It does not accept requirements, realizations, ADRs, the SAD, MTP, risks,
Stage A, a successor freeze, ABM, Construction, a canary, or release.

## Documentary validation

| Check | Result |
|---|---|
| Candidate source identity | PASS: HEAD remained `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba` |
| Diff whitespace | PASS: `git diff --check` returned no error |
| Requirement parents | PASS: 33 unique, comprising 21 FR and 12 NFR |
| Atomic child contracts | PASS: 130 unique, comprising 115 FR and 15 NFR |
| RTM child set | PASS: 130/130; zero missing, extra, or duplicate child IDs |
| Risk register | PASS: 23 identified risks; 0 P0, 17 P1, 5 P2, 1 P3 |
| Risk retirement | PASS as inventory truth: zero mitigated or retired |
| Candidate hash ledger | PASS: 28/28 path/hash entries reproduced current bytes |
| Public liveness route | PASS as source fact: indexed API, CLI, MCP proxy, and R-13 runner use `GET /agentmemory/livez` |
| Product source changes by this orchestration | NONE |

The shared worktree already contained changes to
`scripts/evidence/generate-interface-inventory.mjs` and its test. They were not
created, modified, reverted, staged, or accepted by this orchestration.

## AIWG validation

`aiwg index build` completed successfully:

- final project index after adding this receipt: 293 artifacts across 291
  files;
- codebase index: 337 artifacts, all unchanged;
- registry: four of five graph classes built, source graph unbuilt, zero
  registry warnings.

`aiwg doctor` returned 35 passed and three warnings:

1. one unmanaged/project-local Codex agent definition exceeds the 16 KB
   dispatch ceiling;
2. local branch `main` is absent; and
3. one legacy permission source remains.

`aiwg status --probe --json` returned:

- engaged: true;
- status: ready;
- workspace health: healthy;
- framework: `sdlc-complete` 1.0.0;
- provider deployments: Claude Code, Codex, Copilot, and universal.

The Codex project skill listing limit is 13,000 characters.

### AIWG index anomaly

`aiwg index stats --json` reported 293 project artifacts but 291 project files
and calculated project coverage as 101 percent. It also reported 266 orphaned
project artifacts before this receipt and 267 afterward, plus 337 orphaned
codebase artifacts. Doctor still classified
the artifact index as current and the workspace graph as healthy.

Coverage above 100 percent is not a valid coverage metric. This receipt treats
the index build as operationally successful but its coverage/orphan metrics as
unqualified. A later release gate must either correct the denominator or
document exact multi-artifact-per-file semantics and compute a bounded metric.

## Installed Agentmemory refresh

The exact installed NVM CLI reports:

- connected version: `0.9.28`;
- endpoint: `http://localhost:3111`;
- scope: `github.com/chronodeai/agentmemory`;
- health: healthy;
- sessions: 1;
- observations: 1;
- durable memories: 0;
- circuit: closed;
- viewer: `http://localhost:3113`;
- context injection: disabled.

Doctor reports 9 of 10 checks passing because context injection is disabled,
while the same dry-run plan says all checks pass and no fixes are required.
This is a wording/denominator ambiguity, not authorization to enable injection.

Project health reports:

- scope coverage: 1;
- project-unscoped records: 0;
- global-unscoped records: 1,887;
- context packets: 2;
- p95 injection latency: 33 ms;
- retrieval use: 0;
- commit coverage: 0;
- project memories, lessons, insights, and promotions: 0.

Project slot listing still returns HTTP 500. Top-level health therefore remains
false-complete for the gate-relevant slot capability. No heal, scope inference,
migration, or data mutation was run.

## Disposition

The local documentary packet is consistent enough for the bounded human
decisions in:

`.aiwg/reports/iteration-4-local-macos-human-decision-request-2026-07-28.md`

It is not ready for successor freeze acceptance, Stage A, B1, B2, ABM rerun,
Construction, service switch, Memetics canary, or release. Those transitions
remain ordered and separately authorized.

Historical Railway exposure remains `UNVERIFIED / NOT EVALUATED` in its
parallel security lane. Prospective Railway deployment remains deferred and
was not accessed by this validation.
