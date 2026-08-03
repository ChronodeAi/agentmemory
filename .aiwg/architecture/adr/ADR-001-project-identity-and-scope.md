# ADR-001: Canonical Project Identity and Fail-Closed Scope

Status: **Proposed**
Decision owners: Software Architect and Security Architect

## Context

Path identity splits worktrees and aliases; basename identity collides; remotes may contain credentials. Implicit global queries can leak across projects.

## Proposed decision

Use normalized credential-free Git remote identity with an explicitly
designated identity remote. Lowercase the host, preserve path case, preserve
non-default ports, and map equivalent transport forms only through frozen
rules. Use a persisted `local/<repository_uuid>` when no remote exists; a
canonical-path hash is a bootstrap locator only. Worktrees share project
identity and use stable worktree UUIDs.

Configured IDs and aliases must resolve through a versioned, ownership-proven,
collision-checked registry. Alias cycles, chains, conflicting owners, and
one-to-many mappings fail closed. Store canonical IDs only. Namespace all
project slots. Require project scope for every record and interface; only an
explicit audited `scope=global` with separate authority bypasses the project
guard.

Bind each session immutably to canonical project, stable worktree UUID,
privacy, capture profile, and external-processing policy. Resume, parent,
mutation, and stale closure require authority for that existing binding and a
lifecycle version/CAS guard. Missing, self, stale, or cross-project parents
mutate neither endpoint.

## Consequences

All retrieval, session, file-history, commit-history, expanded-result, dedupe,
promotion, graph, mesh, and health paths need contract tests. Migration needs
generation atomicity, ownership proof, rollback, remote-conflict,
case-sensitive path, local-repository move, worktree, alias-cycle, and
colliding-basename fixtures. Session evidence needs spoofed-binding,
cross-project-parent, concurrent resume/close, restart, and counter-attribution
fixtures.

This ADR is not accepted by its owners and must not be cited as authority.
