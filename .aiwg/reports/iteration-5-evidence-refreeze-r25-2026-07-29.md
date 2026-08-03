# Iteration 5 Evidence Refreeze, Revision 25

Status: **CANDIDATE-UNSIGNED - ELABORATION CLOSURE PREPARATION ONLY**

Date: 2026-07-29
Project: `github.com/chronodeai/agentmemory`
Candidate design commit: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Accepted predecessor: Revision 24 successor freeze only

## Decision boundary

Revision 25 layers the iteration-5 governance/evidence delta over the
byte-verified Revision 24 manifest. It does not alter DEC-01..18, accept
requirements or realizations, complete DEC-15, baseline architecture, accept
an ADR or MTP, accept Stage A, authorize B1/B2, qualify evidence, mitigate or
retire a risk, pass ABM, authorize Construction, modify a runtime, admit a
canary, deploy, release, or roll out.

No product source, governed product test, CI, schema, package, migration,
installed runtime, provider home, Memetics repository, Railway/cloud resource,
or external service is changed by this freeze.

## Predecessor chain

Revision 25 is valid only if all of these remain byte exact:

| Artifact | SHA-256 |
|---|---|
| Revision 23 predecessor | `50c0e2669c46b34843d3cd2c4576879a8f47d410abcb1298fc52836806d33619` |
| Revision 24 manifest | `6ca664d7a2b3f5b842960470cf7eb71a0cf878824c2908b5dd0e1aa6099f91e5` |
| Revision 24 deterministic receipt | `f9d79039047c29ae84b94aef979321ba0ecb926a44e16682b6bb3e9ac9914f85` |
| Revision 24 adversarial review | `b359da0cfcc3cc14e85d0503bd8954a92c000980ee01bf04cd1777e724878ab8` |
| Revision 24 entries | 236 accounted for; four declared governance refreshes; zero missing or undeclared drift |

The R25 layered manifest is generated after this report. It records every
iteration-5 addition and each predecessor entry deliberately refreshed for
supersession or traceability correction. It does not duplicate all 236 R24
entries.

An earlier unsigned R25 candidate manifest and receipt were reviewed and
returned after fresh runtime evidence contradicted their baseline. Their hashes
are superseded evidence only and confer no authority. This regenerated R25
candidate admits the refreshed observation before final review.

## Exact iteration-5 effect

- The initial shell-path/LaunchAgent/port probe failed. The refreshed absolute
  CLI and HTTP probes found Agentmemory 0.9.28 live, but its CLI reports
  `Not running`, Doctor reports `server: 0/1`, detailed protected health is
  readable without a credential, the viewer is intermittent, and engine/worker
  supervision is split. These remain open nonconformances against R-08, R-09,
  R-14, R-23, and DPA-025..027. A separate MCP surface supplies no useful
  current project context or commit history and returns HTTP 500 for slot
  listing.
- Codebase Memory remains a ready moderate index. It excludes 148 test files;
  151 is the count of test-scope gap records. Three parse-partial files and
  malformed normalized scope fields remain. Full source/test coverage is not
  claimed.
- The official Codebase Memory upstream release is v0.9.0; the accepted
  Chronode fork target remains 0.9.1. Its local source payload is absent, so
  historical graph symbols are not direct-source authority.
- AIWG uses a 2026.7.24 bootstrap launcher over a 2026.7.16 active customize
  checkout. After index rebuild, Doctor passes 35 checks with three warnings.
  Label ambiguity and one oversized managed agent are framework maintenance,
  not Agentmemory qualification.
- Requirements reconcile to 33 parent groups, 130 unique children, 130/130 RTM
  coverage, 288 child-to-realization memberships, and 19 normalized trace/test
  rows. Acceptance remains zero.
- Realization scorecards are 0/23, 0/54, and 0/27 against independent
  thresholds 19, 44, and 22.
- DEC-15 independent graph verification is not met: only 11 of 49 concrete RTM
  code/test/harness subjects have no recorded coverage gap.
- C1, C2, C3, and C4 remain unselected; SAD/ICM remain Draft; ADR-001..007
  remain Proposed; all 16 hard vetoes remain open.
- All 23 risks remain `IDENTIFIED`: 17 P1, five P2, one P3, zero P0, zero
  mitigated, and zero retired. No PoC is admitted.
- Stage A remains pending. Its local-only method is explicit, every
  DPA-001..027 finding has a proposed non-closing disposition, and future
  instance identities are marked by their earliest authorized stage.

## Required deterministic checks

The layered manifest and receipt must establish:

1. exact Revision 24 chain, all 236 R24 entries accounted for, exactly four
   declared refreshes, and zero missing or undeclared drift;
2. unique, regular, non-symlink, repository-relative R25 delta paths with exact
   SHA-256 values;
3. zero protected product-source/test/CI/schema/package/migration delta;
4. valid JSON and resolved governed local Markdown links;
5. 33/130/130/288/19 requirement and traceability denominators;
6. exact 23/19, 54/44, and 27/22 worksheet rows with zero numerator;
7. 23 risks, 17 P1, 16 open vetoes, and 27 explicit DPA rows;
8. zero new `.aiwg/working/**` entry and no mutable `.aiwg/sessions.json`;
9. no private-key, GitHub-token, AWS-key, or bearer-value pattern in the R25
   delta; and
10. Stage A pending, B1/B2 blocked, ABM NO-GO, Construction unauthorized, and
    no canary/deployment/release authority.

One separate premium read-only post-generation review must inspect the exact
manifest and deterministic receipt. Configured `gpt-5.6-sol` routing is
wrapper evidence only.

## Next decision boundary

After a clean R25 receipt and review, present one external decision only:

`STAGE A SPECIFICATION: ACCEPT | RETURN`

Real human identities and the Configuration Manager, Security Architect, and
Release Owner concurrences are mandatory for acceptance. No later stage may be
bundled into that decision.
