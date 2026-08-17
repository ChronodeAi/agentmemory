# Solution Profile

Status: Draft
Date: 2026-07-25

## Classification

- Solution type: local-first developer infrastructure and agent integration
- Change type: hardening and completing an implemented branch
- Data sensitivity: source code, prompts, tool events, file paths, session metadata, possible credentials and regulated content
- Availability sensitivity: medium for individual sessions; high when automatically injected into coding workflows
- Integrity sensitivity: critical because stale or cross-project context can alter code and governance decisions
- Deployment scope: this repository only for construction; broader distribution is external

## Actors

- Developer or agent operator: owns explicit recall, execution, and acknowledgement.
- Agentmemory service: stores and retrieves episodic/procedural evidence.
- Codebase Memory: supplies structural navigation from its canonical graph.
- Git and live repository: supply versioned and uncommitted authority.
- Codex and Claude connectors: configure MCP and lifecycle hooks.
- Founder/Product Owner: accepts product scope, rollout risk, and the Memetics canary.
- Software Architect: accepts architecture decisions and baseline.
- Security Architect/Privacy Owner: accepts redaction, local-processing, and authentication controls.
- Test Architect/Release Owner: accepts benchmark, load, soak, rollback, and canary evidence.
- Codebase Memory maintainer and AIWG maintainer: own external interoperability/distribution items.

## Existing branch posture

The branch contains substantial implementation and tests for project identity, scoping, sessions, capture, privacy, slots, provider connections, context packets, promotions, commit linkage, and viewer behavior. It is not a release candidate because authority eligibility, delivery acknowledgement, exact-fact compaction, temporal validity, uncommitted provenance, typed disabled-feature behavior, sustained health, viewer build identity, and release evidence are incomplete or unproven.

## Constraints

- iii-engine remains the state and trigger boundary.
- Configuration precedence is process environment, path-scoped user override, repository manifest, then inferred default.
- Strict privacy cannot send content to external processing.
- Authentication secrets are supplied by environment or secret file and are never stored in generated planning artifacts.
- Project identity must be credential-free and stable across paths.
- Every read interface is project-filtered unless the caller explicitly asks for global scope.
- Automatic memory injection is disabled for gate-critical use until release acceptance.
