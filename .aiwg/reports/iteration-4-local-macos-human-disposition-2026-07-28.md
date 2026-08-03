# Iteration 4 Local macOS Human Disposition

Status: **HUMAN DISPOSITION RECORDED - DOWNSTREAM GATES REMAIN OPEN**
Recorded: 2026-07-28T14:10:38-05:00
Project: `github.com/chronodeai/agentmemory`
Candidate source: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
AIWG session: `aiwg-iteration-dual-track-elaboration-iter4-2026-07-28-1910`

## Source

The operator selected Annotation 1 containing this exact disposition:

```text
LOCAL DEVELOPMENT CASE: ACCEPT
LOCAL PROFILE: ACCEPT
PROCESSING POLICY: A
VIEWER STATIC SHELL: A
CRD-01 TRACEABILITY: A
CRD-02 REALIZATIONS: A
STAGE-A AUTHORITY MATRIX: ACCEPT
CRD-05 RISK THRESHOLD: CONFIRM
```

The selected response binds:

- decision request:
  `.aiwg/reports/iteration-4-local-macos-human-decision-request-2026-07-28.md`;
- decision-request SHA-256:
  `969c49a14dfa254d8887df43069343d729e6e5ae157559b7e51e8d67d0b407f8`;
- reconciliation SHA-256:
  `6fc384a62e40b78a2d6784bb21fe6d58525167bdbbd133dacacce64e9902b1f0`;
- validation-receipt SHA-256:
  `6d1338474310082d725abe9664faf56f800c187ff6e76c1c971f44ff63d9fffa`.

## Recorded decisions

| ID | Decision | Disposition | Exact effect |
|---|---|---|---|
| DEC-11 | Local development case | ACCEPTED | Establishes the local macOS development and evidence route; selects no architecture configuration and authorizes no implementation |
| DEC-12 | Exact local profile | ACCEPTED FOR STAGE-A SPECIFICATION | Selects `R13-LOCAL-MAC26.5.1-25F80-ARM64-N24.16.0-NPM11.13.0-V1` and its 740-file-execution/42-lifecycle-journey denominators; authorizes no B1, B2, or execution |
| DEC-13 | Processing policy | OPTION A SELECTED | Project-specific policy; `zero-egress` is default and `provider-enabled` requires an exact accepted provider manifest |
| DEC-14 | Viewer static shell | OPTION A SELECTED | Static shell, assets, viewer data, API, and MCP require bearer authentication; only `GET /agentmemory/livez` is unauthenticated; bearer issuance/bootstrap remains an open implementation contract |
| DEC-15 | CRD-01 traceability timing | OPTION A SELECTED | Accepted canonical RTM paths plus independently verified graph links may satisfy Elaboration bidirectionality; live source/test annotations remain Construction work |
| DEC-16 | CRD-02 realization denominator | OPTION A SELECTED | DES-UCR-001..003 are the complete significant-use-case denominator; MIC/PSC layers are tailored out; each use case independently requires at least 80 percent of a frozen binary behavioral-unit denominator |
| DEC-17 | Stage-A authority matrix | ACCEPTED | Human Test Architect is the accountable role; Configuration Manager, Security Architect, and Release Owner are required concurrence roles; Local Test Infrastructure and Dependency Owners are advisory; CI Owner is deferred for the local target; identities and concurrence records remain open |
| DEC-18 | CRD-05 risk threshold | CONFIRMED | Denominator 23, threshold 17, only mitigated/retired count, accepted-but-open does not count, and one unresolved mandatory veto prevents ABM PASS |

## Non-expansion boundary

These decisions do not:

- accept the 130 requirements or any DES-UCR realization;
- accept Stage A, the MTP, the R-13 card, or any finding disposition;
- authorize B1 disposable mechanics, B2 execution, Stage C, or Stage D;
- select C1, C2, or C3;
- accept an ADR or baseline the SAD;
- mitigate, retire, or accept any risk;
- pass ABM or authorize Construction;
- authorize product code, test, CI, migration, healing, provider calls,
  official-upstream preparation, service switching, or runtime mutation;
- authorize a Memetics canary, release, distribution, or broad rollout; or
- resolve historical Railway exposure.

Historical Railway exposure remains `UNVERIFIED / NOT EVALUATED` in a parallel
security lane. Prospective Railway deployment remains deferred and outside the
local release target.

## Required downstream action

1. Propagate DEC-11 through DEC-18 without changing unrelated authority.
2. Recompute requirements, RTM, risk, and hash denominators.
3. Run independent requirements, architecture, security, test, risk, and
   configuration reviews.
4. Generate a monotonic successor evidence freeze and local verification
   receipt.
5. Present the exact successor hashes for a separate human acceptance or
   return decision.

No later gate is inferred from this record.
