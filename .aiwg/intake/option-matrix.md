# Option Matrix

Status: Draft; no option accepted
Date: 2026-07-25

| Option | Description | Benefits | Material risks | Disposition |
|---|---|---|---|---|
| A | Release the branch largely as implemented | Fastest | Fails evidence, stale-authority, delivery-acknowledgement, soak, and canary gates | Rejected for planning |
| B | Complete correctness controls, benchmark, soak, and canary before rollout | Preserves implemented value while closing known gaps | Requires architecture/security/test decisions and external dependencies | Recommended, not accepted |
| C | Disable all automated capture and use manual recall only | Lowest injection risk | Does not meet lifecycle or usability goals | Contingency/rollback mode |
| D | Replace Agentmemory or Codebase Memory with a single system | Simpler conceptual surface | Conflates episodic memory with structural authority and expands scope | Out of scope |

## Recommended sequencing

1. Close fail-closed authority, temporal, provenance, acknowledgement, promotion, and health gaps.
2. Complete deterministic unit and integration verification.
3. Run adversarial retrieval, secret, collision, concurrency, soak, and rollback evidence.
4. Obtain architecture, security, and test baseline acceptance.
5. Run a five-session explicit-only Codex/Claude Memetics canary.
6. Consider broad rollout only after metrics and human acceptance pass.
