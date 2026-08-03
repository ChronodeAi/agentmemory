# PoC Card Input Completion Report

Status: **PREPARATION COMPLETE - EXECUTION BLOCKED**
Date: 2026-07-28
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`

## Result

The authorized input-preparation pass is complete:

- 17 current P1 cards have 17 unique companion JSON inputs.
- All 140 actor-assignment slots remain unassigned.
- Zero cards have B1 mechanics authorization.
- Zero cards have B2 execution admission.
- Zero cards are ready, executed, reviewed, or risk-dispositioned.
- Four P2 hard-veto-related methods now have versioned, non-executable
  specifications; none is authorized for `build-poc` or execution.

This report records preparation completeness only. It does not freeze the
inputs, qualify evidence, accept profiles, close vetoes, change risk status,
select architecture, pass ABM, or authorize Construction.

## Identity control

Every current P1 card points to:

- shared control:
  `.aiwg/risks/poc-cards/inputs/p1-input-control-v1.json`;
- one risk-specific companion under
  `.aiwg/risks/poc-cards/inputs/`; and
- source commit `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
  and tree `8c479b95bb9753911df212089d7faf3d6f35a28d`.

Card and companion digests are intentionally external. They must be captured
by the successor evidence manifest rather than self-reported.

## Current interface authority

`G-ICM-01` remains the current documentary interface inventory:

- artifact SHA-256:
  `ca1831d84bce92f386b8c52ec0f7b1de280123198e9123fffcd5628e6052b5e0`;
- 195 source inputs with source-input SHA-256:
  `ffd39ae1f46c48ea72274df73fb9125fd3d8bfd6bf30517cea870c86441ff0c3`;
- 136 functions, 135 HTTP routes, 134 protected HTTP routes;
- 6 MCP transports, 59 MCP tools, 5 resources, 3 prompts;
- 13 hooks, 44 host hook events, and 18 host connectors;
- 26 viewer expressions, 15 provider adapters, and 49 provider-attempt sites.

The inventory remains documentary evidence. It does not prove executable
coverage or conformance.

## Corrections made

- R-03, R-04, and R-17 now distinguish the current G-ICM artifact digest from
  its source-input digest.
- R-02 no longer treats Railway deployment or exposure as established without
  a named account/project inventory or metadata-only owner attestation.
- R-10 distinguishes documentary ICM-15/TR-UCM-015 authority from the absent
  generated executable backlink.
- R-16 no longer reports the corrected command-target mismatch as current.
- R-18 now has normalized source and specification-candidate status metadata.
- HV-02 now includes R-15 because prohibited external processing is the
  dedicated scope of that risk.

## P2 evidence specifications

The following remain targeted test/review methods, not PoCs:

- `P2-R01-EVIDENCE-SPEC-V1`: canonical identity and scope isolation.
- `P2-R05-EVIDENCE-SPEC-V1`: acyclic promotion evidence lineage.
- `P2-R08-EVIDENCE-SPEC-V1`: truthful readiness under required faults.
- `P2-R15-EVIDENCE-SPEC-V1`: strict/local zero-egress boundary.

The authoritative preparation artifacts are
`.aiwg/architecture/iteration-4-p2-hard-veto-evidence-specifications.md` and
its JSON companion.

## Remaining blockers

1. Freeze these July 28 artifacts in a successor manifest.
2. Supply named actor assignments and exact authority boundaries.
3. Accept exact profiles and qualification source where required.
4. Authorize and independently review B1 disposable mechanics.
5. Separately admit each complete B2 input bundle.
6. Execute only the individually admitted method and preserve immutable
   receipts for independent disposition.

All 16 architecture hard vetoes remain open. C1, C2, and C3 remain
unscoreable, and no recommendation exists.
