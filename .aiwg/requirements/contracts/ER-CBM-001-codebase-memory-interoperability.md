# ER-CBM-001: Codebase Memory Interoperability Contract

Status: **PROPOSED EXTERNAL CONTRACT - HUMAN ACCEPTANCE REQUIRED**

Date: 2026-07-29
Project: `github.com/chronodeai/agentmemory`
Trace: `TR-UCM-015`
Risk: `R-10`
Proposed owner: Codebase Memory Maintainer

## Decision boundary

This contract identifies the external Codebase Memory obligation that was
previously represented only by a trace-row label. It is outside the 33-parent/
130-child Agentmemory requirement denominator and changes neither count. It
does not accept ADR-004, qualify Codebase Memory, close R-10, or authorize an
index/configuration mutation or PoC.

## Contract

Agentmemory and Codebase Memory shall share one credential-free canonical
project identity and an owner-controlled alias registry. For one frozen
canonical index and one temporary alias, the complete accepted 20-query corpus
shall return equivalent structural results, path filters shall constrain actual
repository-relative paths, decision roots shall remain distinguishable from
code roots, and no duplicate index may become independent project authority.

## Required configuration surface

- canonical project ID;
- source roots;
- accepted decision/ADR roots;
- exclusion globs;
- canonical index identity;
- temporary alias identity, owner, expiry, and retirement condition; and
- exact Codebase Memory build/configuration identity.

## Acceptance evidence

1. Frozen 20-query corpus and expected-result manifest.
2. Canonical and alias responses with normalized path/result digests.
3. Positive and negative `search_graph.file_pattern`,
   `search_code.path_filter`, and `detect_changes.scope` cases.
4. Zero result or authority difference outside explicitly normalized alias
   fields.
5. Complete index-coverage metadata and direct-file fallback for every excluded
   or parse-partial path used by a claim.
6. Owner-authenticated alias retirement and canonical-index readback.
7. Independent reviewer disposition bound to exact tool and index identities.

## Current condition

The current Agentmemory index is persisted in moderate mode, excludes most
test-scope paths, reports three parse-partial files, and returns malformed
normalized scope strings from the coverage API. A prior full-index response did
not persist a full-mode generation. No frozen 20-query alias corpus exists.

Result: **NOT ACCEPTED / NOT QUALIFIED / R-10 IDENTIFIED**.
