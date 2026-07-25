# UC-001: Scoped Recall and Structural Verification

Status: Draft

## Primary flow

1. The client resolves a credential-free canonical project identity.
2. Agentmemory recall is constrained to that project and returns provenance, validity, and eligibility.
3. Codebase Memory explores the canonical graph for relevant symbols and paths.
4. The agent verifies recalled claims against accepted ADRs, live source, tests, Git, or runtime evidence.
5. Only eligible, current evidence can enter a gate-critical context packet.

## Alternate and failure flows

- If no project is resolved, project data access fails closed.
- Global access requires an explicit global scope request.
- A worktree/path alias migrates to the canonical identity without merging colliding repositories.
- A stale or conflicting memory is returned as non-authoritative or excluded, never silently promoted.
- Duplicate canonical/path graph indexes remain an external dependency and cannot be treated as equivalent until alias verification completes.

## Postconditions

No cross-project content is disclosed, every source is attributable, and the packet is no larger than 2,000 tokens.
