# ADR-001: Canonical Project Identity and Fail-Closed Scope

Status: **Proposed**
Decision owners: Software Architect and Security Architect

## Context

Path identity splits worktrees and aliases; basename identity collides; remotes may contain credentials. Implicit global queries can leak across projects.

## Proposed decision

Use normalized credential-free Git remote identity when available and a hashed canonical-path fallback otherwise. Store aliases separately and migrate only after collision and ownership checks. Namespace all project slots. Require project scope for every record and interface; only an explicit audited `scope=global` bypasses the project guard.

## Consequences

All retrieval, session, file-history, commit-history, expanded-result, dedupe, promotion, and health paths need contract tests. Migration needs idempotency, rollback, and colliding-basename fixtures.

This ADR is not accepted by its owners and must not be cited as authority.
