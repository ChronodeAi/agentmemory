# R-13 Dependency Engine Report Summary

Status: **CANDIDATE UNSIGNED - PARTIAL METADATA EVIDENCE**
Date: 2026-07-26
Machine-readable authority:
`r13-dependency-engine-report-2026-07-26.json`

## Boundary

This report evaluates lockfile `engines.node` declarations only. A compatible
declaration is not proof that a package installs, loads native assets, builds,
or behaves correctly on an exact profile. An absent declaration is unknown,
not compatible. This report does not accept a profile, admit R-13, accept the
MTP, retire risk, pass ABM, or authorize Construction.

## Inputs

| Input | Identity |
|---|---|
| `package-lock.json` | lockfile v3; SHA-256 `3d9c2a3072f99cae648d76584355cacdff079c164f4ab5f863d0252a7cebb197` |
| Range evaluator | `semver@7.8.5`, strict ranges, prereleases excluded |
| Candidate Node targets | `22.23.1` and `24.18.0` |
| JSON report SHA-256 | `2e2d765dcc80524045ea99bb9632aff1fda560f0f3df37ff99453148aac65534` |

## Results

| Classification | Count |
|---|---:|
| Package records | 333 |
| Declared Node engine | 186 |
| Declared compatible with both targets | 186 |
| Declared incompatible | 0 |
| Invalid ranges | 0 |
| No Node engine declaration | 147 |
| No declaration, production non-optional | 33 |
| No declaration, development | 44 |
| No declaration, optional | 77 |
| No declaration, OS/CPU restricted | 10 |

All declared ranges accept both candidate versions. The 147 records without a
declaration remain unresolved, including 33 production non-optional records.

## Required closure

1. Dependency Owner reviews the 147 unknown records and records a disposition.
2. Exact profile installation, native-asset loading, build, harness self-tests,
   and governed test execution succeed on all four accepted profiles.
3. The accepted report digest is bound into the profile registry, source lock,
   raw receipts, cohort statements, and independent verification.
4. Any package or lockfile change regenerates this report and invalidates prior
   qualification inputs.

