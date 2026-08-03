# Iteration 5 AIWG Diagnostics Disposition

Status: **RECONCILED - INFORMATIONAL TOOLING MAINTENANCE OPEN**

Date: 2026-07-29
Session: `aiwg-iteration-dual-track-elaboration-iter5-2026-07-29-1548`

## Decision boundary

This record classifies read-only diagnostics. It does not refresh AIWG,
regenerate providers, change the active channel, repair permissions, edit the
AIWG fork, close prior sessions, or qualify Agentmemory.

## Provenance tuple

| Surface | Exact observation |
|---|---|
| Bootstrap launcher | `2026.7.24`, `/opt/homebrew/lib/node_modules/aiwg` |
| Active command source | `2026.7.16`, `/Users/base/my-aiwg` |
| Channel composition | `channel=edge`, `devMode=true` |
| Active source commit | `fdbed5d0344d0e4a161c38bb7b46a3139265afd9` |
| Active source branch | `fix/telegram-chat-allowlist` |

`aiwg --version` exits from the bootstrap launcher before customize-mode
routing. Normal commands, `aiwg version`, and Doctor load the configured
checkout. The version split is intentional composition. The remaining defect
is ambiguous labeling: fast version output looks global, while the same active
checkout is labelled `[dev]` by one command and `[edge]` by Doctor.

This is an AIWG provenance-label issue, not an Agentmemory runtime mismatch and
not a Stage-A blocker. Future receipts must retain the complete tuple rather
than one unqualified "AIWG version."

## Doctor and provider findings

| Finding | Disposition |
|---|---|
| 35 passes, three warnings after index rebuild | Retain exact output in the final receipt; no automatic repair |
| `ai-ml-engineer.toml` is 16,452 bytes | Framework-owned according to `.codex/agents/.aiwg-manifest.json`; Doctor's unmanaged attribution is a false negative. Do not dispatch this agent until separate AIWG maintenance. |
| Local `main` absent | Informational in this branch/worktree; remote `origin/main` exists |
| One legacy permission source | Project-governance warning; DEC-07 defers normalization |
| Artifact index | Rebuilt; the stale-by-one warning cleared |
| Doctor/status provider counts differ | Status includes `.aiwg-manifest.json`; four Claude `.soul.md` companions and four Codex-only regeneration commands explain provider-specific differences |
| Five AIWG graphs, four built, no missing/orphan/warnings | Registry health only; unrelated to Codebase Memory source coverage |

## Required maintenance outside this decision

AIWG should later distinguish launcher version from active source version,
normalize `[edge]`/`[dev]` labels, and correct the managed-artifact ownership
check for the 16 KB dispatch ceiling. No refresh or channel switch is warranted
by this evidence.
