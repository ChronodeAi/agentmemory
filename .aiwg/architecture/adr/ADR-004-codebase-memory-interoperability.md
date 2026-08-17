# ADR-004: Codebase Memory 0.9.1 Interoperability

Status: **Proposed**
Decision owners: Agentmemory Software Architect and Codebase Memory maintainer

## Context

Structural navigation needs one canonical project graph. Duplicate canonical/path indexes and inconsistent roots or filters can split authority and preserve stale structure.

## Proposed decision

Adopt the Codebase Memory 0.9.1 canonical project contract and repository-local `.codebase-memory/config.toml`. Declare source roots, AIWG decision roots, excludes, and consistent path filters. Reindex canonically, create a temporary verified alias, move consumers, and retire duplicate indexes only after rollback criteria pass.

## Consequences

All operational work is external to this repository run. No Codebase Memory repository, index, or alias is changed here.

This ADR is not accepted or baselined.
