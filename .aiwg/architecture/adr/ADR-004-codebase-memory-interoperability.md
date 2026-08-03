# ADR-004: Codebase Memory 0.9.1 Interoperability

Status: **Proposed**
Decision owners: Agentmemory Software Architect and Codebase Memory maintainer

## Context

Structural navigation needs one canonical project graph. Duplicate canonical/path indexes and inconsistent roots or filters can split authority and preserve stale structure.

## Proposed decision

Adopt the Codebase Memory 0.9.1 canonical project contract and repository-local
`.codebase-memory/config.toml`. Declare source roots, AIWG decision roots,
excludes, consistent path filters, source revision, and identity-registry
generation.

A temporary alias must route to the same physical index, generation, and
single writer; it cannot create a copied second index. Move consumers only
after the frozen 20-query manifest, counts, hashes, roots, filters, and
normalized results match. Rollback removes routing only. Duplicate-index
retirement follows a separate authorization after rollback proof.

## Consequences

All operational work is external to this repository run. No Codebase Memory repository, index, or alias is changed here.

This ADR is not accepted or baselined.
