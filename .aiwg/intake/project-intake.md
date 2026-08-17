# Project Intake: Universal Coding Memory Optimization

Status: Draft for gate review
Date: 2026-07-25
Entry mode: `codebase-analysis` (`intake-from-codebase`)
Repository: ChronodeAi Agentmemory fork
Analyzed revision: `ae4f5e144d1c340f7c949580df94392b77979ad1`

## Intent

Accelerate the adversarially reviewed Universal Coding Memory Optimization into a planning-ready SDLC package. The coding lifecycle is:

`Recall -> Verify -> Explore -> Act -> Test -> Record -> Promote -> Commit -> Close`

Agentmemory supplies episodic and procedural memory. Codebase Memory supplies structural navigation. Neither is authority. Authority, in order, is:

1. founder baseline and accepted ADRs;
2. live repository, tests, and direct runtime evidence;
3. canonical Codebase Memory graph;
4. project-scoped Agentmemory recall;
5. unverified summaries.

Recalled content must be verified before it can influence work. Stale recalled authority must never enter a gate-critical context.

## Run boundaries

- This run creates planning and governance artifacts only.
- Existing source and tests are preserved.
- No architecture decision is accepted and no draft is baselined.
- No waiver or human approval is inferred.
- AIWG coding-memory addon distribution and deployment to other repositories are external work items.
- Codebase Memory 0.9.1 configuration, canonical reindex, temporary aliasing, and duplicate-index retirement are external work items.
- `/Users/base/Desktop/Memetics` is not accessed or modified.
- Memetics recall remains explicit-only; automatic gate-critical injection is prohibited until release gates pass.

## Product outcome

A project-scoped, privacy-preserving coding-memory layer that:

- identifies repositories canonically without credentials and survives worktrees and aliases;
- fails closed on cross-project access and makes global access explicit;
- captures bounded, redacted, deduplicated lifecycle evidence;
- distinguishes current authoritative evidence from stale or unverified recollection;
- produces eligibility-first context packets no larger than 2,000 tokens;
- links eligible work to commits while preserving uncommitted provenance;
- supports reliable Codex and Claude integration without destructive configuration repair;
- reports sustained backend, viewer, slot, and project health accurately;
- promotes only evidence-backed knowledge and never reinforces its own recalled output.

## Acceptance thresholds

- zero cross-project leakage;
- zero secret leakage;
- zero stale-authority leakage in gate-critical contexts;
- 100% project scope on new records;
- at least 80% human-labelled precision at five;
- less than 2% duplicate observations;
- at least 95% eligible commit linkage;
- context packets at or below 2,000 tokens;
- p95 hook latency below two seconds at declared concurrency;
- provenance for committed and uncommitted work;
- no `Unknown` viewer health against a healthy compatible backend;
- canonical `npm test` completion within declared developer and CI resource profiles.

Broad rollout remains blocked until all thresholds pass and a five-session Codex/Claude Memetics canary is accepted by the named release decision owners.
