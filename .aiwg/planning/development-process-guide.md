# Development Process Guide

Status: Draft; applies after Construction authorization

## Required lifecycle

`Recall -> Verify -> Explore -> Act -> Test -> Record -> Promote -> Commit -> Close`

1. **Recall:** invoke Agentmemory explicitly and project-scoped; treat results as candidates.
2. **Verify:** check the founder baseline/accepted ADRs, live repository/tests, and direct runtime evidence.
3. **Explore:** use the canonical Codebase Memory graph, then live source for exact behavior.
4. **Act:** make the smallest authorized change in the isolated worktree.
5. **Test:** run deterministic focused tests, then integration/system evidence proportional to risk.
6. **Record:** capture evidence, temporal validity, and committed/uncommitted provenance; redact first.
7. **Promote:** require independent typed evidence. Recalled content cannot prove itself.
8. **Commit:** link eligible records idempotently and report the true eligible denominator.
9. **Close:** explicitly close or retain truthful abandoned state; do not erase evidence of failure.

## Working rules

- Preserve dirty user work and inspect `git status` before edits.
- Keep project scope explicit at every boundary.
- Never treat memory, graph results, process liveness, configured hooks, or packet generation as proof of authority, health, delivery, or acceptance.
- Use process-environment precedence and never echo secret values.
- Keep automatic gate-critical injection and native-memory synchronization disabled unless explicitly authorized after release gates.
- Update all Agentmemory registry/count surfaces when adding MCP tools or REST endpoints.
- Record implementation, verification, governance acceptance, and rollout authorization as separate states.

## Review evidence

Every change request must identify the requirement/ADR, source changes, tests, failure evidence, privacy effect, rollback path, and whether the evidence is committed or uncommitted. No proposed ADR becomes authoritative through implementation alone.
