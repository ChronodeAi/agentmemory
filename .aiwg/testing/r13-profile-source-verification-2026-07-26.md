# R-13 Profile Source Verification Summary

Status: **OBSERVATION CANDIDATE UNSIGNED - NOT PROFILE ACCEPTANCE**
Date: 2026-07-26
Machine-readable authority:
`r13-profile-source-verification-2026-07-26.json`

## Boundary

This report records primary-source release/image metadata and local
availability observations. Download transport and response hashes do not
establish Configuration Manager custody, signer trust, extracted-binary
identity, schedulability, profile acceptance, R-13 admission, MTP acceptance,
risk retirement, ABM passage, or Construction authority.

## Node release observations

| Release | Date | npm | LTS | Candidate archive classes |
|---|---|---|---|---|
| Node `v22.23.1` | 2026-06-22 | `10.9.8` | Jod | macOS arm64 and Linux x64 official archives |
| Node `v24.18.0` | 2026-06-23 | `11.16.0` | Krypton | macOS arm64 and Linux x64 official archives |

The JSON report records official SHASUMS response hashes and archive candidate
digests. It also records OpenPGP packet issuer fingerprints:

- Node 22: `890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4`
- Node 24: `C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C`

Neither fingerprint has been verified against an accepted Configuration
Manager trust root. No archive format has been selected for admission.

## GitHub runner observation

| Field | Observation |
|---|---|
| Release tag | `ubuntu24/20260720.247` |
| Release target | `3850f608d0fe18261d09374791da65a78e68bdfb` |
| Image | Ubuntu 24.04.4, image `20260720.247.2` |
| Kernel | `6.17.0-1020-azure` |
| Included Node/npm | `22.23.1` / `10.9.8` |
| Included Git | `2.54.0` |
| Internal manifest SHA-256 | `8b809704dd440c398b1bb35109655bde74d484b5d813d806fe8f11284fa26f77` |

This proves a published image record, not that a future GitHub-hosted job can
schedule the exact image or that the label is immutable.

## Local host observation

The observed developer host is macOS 26.5.1 build `25F80`, Darwin `25.5.0`,
arm64. Neither accepted Node candidate is installed:

- active shell Node: `v26.0.0`;
- installed Agentmemory Node: `v24.16.0`;
- local iii `0.11.2` binary digest:
  `341d45266f39ed78e30d4b3d74730662fe97e7706e1a23a5c877646462215ca8`,
  not Configuration Manager verified.

## Required closure

1. Select one archive format for each OS/architecture/Node profile.
2. Verify Node signature identities against an accepted trust root.
3. Acquire, hash, and retain selected archives and extracted binaries under
   governed custody.
4. Assign the macOS host asset, boot identity rules, and profile expiry.
5. Prove exact CI image scheduling or accept a controlled replacement profile.
6. Install no profile runtime until Stage A specification acceptance and the
   applicable implementation authorization.

The JSON report SHA-256 is
`0d12d0325ba01875bd12d17c097835983bf5576f2c161fbec4f70ef277be55f3`.
