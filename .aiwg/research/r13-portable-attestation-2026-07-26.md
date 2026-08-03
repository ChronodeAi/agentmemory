# R-13 Portable Attestation Research

Status: **ADVISORY RESEARCH - NOT AN ACCEPTED EVIDENCE POLICY**
Date: 2026-07-26
Applies to: R-13 deterministic evidence harness

## Question

What interoperable format should bind an R-13 result to immutable source,
manifests, execution profile, builder/verifier identity, and a portable
signature so verification does not depend on the current checkout?

## Current primary-source findings

1. [SLSA v1.2](https://slsa.dev/spec/v1.2/) is the current SLSA
   specification. Its attestation model separates subjects, build/source
   provenance, distribution, and verification.
2. [SLSA source requirements](https://slsa.dev/spec/v1.2/source-requirements)
   require revisions to be immutable and uniquely identifiable and define
   source provenance as contemporaneous, accessible evidence about how a
   revision came to exist.
3. The
   [in-toto Attestation Framework](https://github.com/in-toto/attestation/blob/main/spec/README.md)
   separates a Statement, which binds subjects and predicate type, from an
   Envelope, which handles authentication and serialization.
4. The
   [in-toto Envelope v1 specification](https://github.com/in-toto/attestation/blob/main/spec/v1/envelope.md)
   requires the signed payload type and payload together and supports a
   base64-encoded in-toto Statement in a DSSE envelope.
5. A
   [Sigstore bundle](https://github.com/sigstore/docs/blob/main/content/en/about/bundle.md)
   can carry a DSSE envelope plus verification material and transparency-log
   evidence.
6. [Sigstore verification](https://docs.sigstore.dev/cosign/verifying/verify/)
   supports bundle verification with an expected certificate identity and
   OIDC issuer, as well as explicit public-key verification.

## Proposed R-13 application

Use an in-toto Statement v1 with a versioned Chronode R-13 predicate. Do not
invent a second signing envelope.

### Subjects

Bind cryptographic digests for:

- immutable source archive;
- Git commit and tree;
- governed test filename and content manifests;
- fixture manifest;
- R-13 runner and validator bundle;
- raw machine-readable test result; and
- emitted package or build artifact when qualification includes one.

### Predicate

Record:

- schema and policy version;
- result and complete waiver list;
- accepted profile ID and image/host identity;
- builder/verifier ID and version;
- invocation ID, start, and finish;
- operator identity and independent signer identity;
- Node, npm, Vitest, Agentmemory, iii-engine, OS, architecture, ports, CPU,
  memory, resource limits, and process result;
- expected and observed test denominator;
- auth assertion denominator;
- source, fixture, configuration, receipt, and byproduct digests; and
- complete failures and dispositions without raw secret-bearing output.

The predicate is evidence, not authority by itself. Verification policy decides
which signer, builder, profile, source, parameters, and result are trusted.

### Authentication

- CI qualification should emit a Sigstore bundle or equivalent DSSE
  authentication whose verifier pins the expected workflow/certificate
  identity and OIDC issuer.
- Offline or local qualification may use a separately governed public key, but
  the verifier must pin its identity, key status, and policy scope.
- A checksum written beside a receipt by the same process is integrity
  metadata, not independent authentication.
- The disposable PoC's synthetic key proves format and failure behavior only.
  It cannot represent a Configuration Manager, CI builder, Test Architect, or
  human acceptance.

## Verification policy

A qualification-required verifier must reject:

1. subject digest mismatch;
2. unexpected predicate or schema version;
3. unknown signer, builder, OIDC issuer, profile, or source revision;
4. changed external parameters or unresolved dependencies;
5. provisional result or any waiver;
6. unverified iii-engine provenance;
7. incomplete test/auth/fixture denominator;
8. missing operator, invocation, signer, or timing metadata;
9. expired/revoked key or unaccepted workflow identity; and
10. evidence that can only be checked against ambient worktree state.

Verification should reconstruct or open the immutable source bundle, verify all
subject and byproduct digests, validate the envelope and identity policy, then
evaluate the R-13 predicate. The current checkout must not be part of the trust
root.

## Policy decision register

No row is selected by this research. `PROPOSED` means decision-ready input,
not acceptance.

| Policy surface | Options evaluated | Current disposition | Required human authority |
|---|---|---|---|
| Statement model | Custom JSON; in-toto Statement v1 with R-13 predicate; ordinary SLSA build provenance | **PROPOSED:** in-toto Statement v1 with versioned R-13 predicate; reject mislabelling test evidence as ordinary build provenance | Test Architect, Configuration Manager |
| Envelope | Same-run checksum; custom signature wrapper; DSSE | **PROPOSED:** DSSE; same-run checksum remains integrity metadata only | Configuration Manager, Security Architect |
| CI signer | Static repository key; Sigstore keyless workflow identity; offline operator key | **OPEN:** compare OIDC/workflow identity, revocation, availability, and retention before selection | CI Owner, Configuration Manager, Security Architect |
| Local signer | Reuse CI identity; local static key; separately governed offline signing service | **OPEN:** no signer or custody authority selected | Configuration Manager, Security Architect |
| Verifier separation | Generator process; same host/different process; separate retained operator/environment | **PROPOSED:** separate retained operator/environment with independent trust material | Independent Verifier Owner |
| Source subject | Ambient checkout hash; Git commit only; Git tree plus immutable archive and source lock | **PROPOSED:** separate commit, Git tree, archive, and source-lock identities | Configuration Manager |
| Freshness | Timestamp only; timestamp plus nonce; timestamp/nonce plus replay ledger and policy expiry | **PROPOSED:** timestamp/nonce/replay ledger/policy expiry | Configuration Manager, Security Architect |
| Revocation | No revocation; static denylist; versioned trust registry with expiry and revocation state | **PROPOSED:** versioned trust registry | Configuration Manager, Security Architect |
| Custody | CI artifact retention only; object store only; signed handoff plus independent read-back and retention policy | **PROPOSED:** signed handoff and independent read-back; storage backend remains open | Configuration Manager, CI Owner |
| Transparency | Required public log; optional CI transparency plus retained offline evidence; no transparency | **OPEN:** public CI transparency may be used, but strict/local evidence must not require external disclosure | Privacy Owner, Security Architect, Configuration Manager |

Selections require a policy version, immutable policy digest, named owner,
expiry/review date, negative tests, and rollback/revocation procedure. A later
selection does not admit R-13 execution by itself.

## Recommendation

Use the in-toto Statement/DSSE model as the portable envelope and use SLSA v1.2
field semantics and verification principles wherever they fit. Use a
versioned, documented R-13 predicate for test-specific facts rather than
misrepresenting a test execution as ordinary build provenance. Adopt Sigstore
identity-bound bundles for CI after owner review; retain explicit public-key
verification as an offline option under a separate key-custody policy.

This research does not select a signer, accept a profile, qualify the current
candidate, retire R-13, or authorize release.
