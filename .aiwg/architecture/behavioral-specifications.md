# Behavioral Specifications

Status: Draft

## B-01 Scope

Given two projects with colliding basenames, when either project recalls, lists slots, expands results, queries session/file/commit history, deduplicates, promotes, or builds context, then only its canonical project records are visible. Omitted project scope fails. Global results appear only after an explicit global request.

## B-02 Eligibility and delivery

Given relevant but stale or unverified memory, when a gate-critical packet is built, then the item is excluded with a reason. Given an eligible packet that is generated but not acknowledged, when retried, its sources remain eligible. Given an acknowledged packet, subsequent packets suppress the same session/source pair.

## B-03 Provenance

Given uncommitted work, when it is recorded, then its base commit, worktree identity, path, source digest, and observed time are preserved. When matching content is committed, linkage is idempotent. When content changes, prior evidence becomes superseded or invalid.

## B-04 Privacy

Given restricted fixture content in any hook input/output/failure path, when capture runs, then no plaintext restricted value reaches storage, logs, packets, viewer, or external processing.

## B-05 Provider and health

Given existing unrelated Claude/Codex hooks, repair merges only Agentmemory-owned entries. Given sustained pressure or failed required backend, health is degraded/failed and server-backed operations fail closed. Given compatible healthy backend/viewer builds, both identities are displayed and neither is `Unknown`.
