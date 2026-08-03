# Railway HMAC Secret Exposure Assessment

Assessment ID: SEC-AM-001
Date: 2026-07-26
Latest evidence refresh: 2026-07-26T21:33:00Z
Status: **UNVERIFIED - HISTORICAL AND PROSPECTIVE GATES OPEN**
Candidate revision: `0e9af82dcfdf07dd1f521c4621823f31a9b2eaba`
Related risk: R-02

## Security condition

The Railway template introduced by commit
`a9c3a59da8509cc347b40d5c4c176987af5410e8` on
2026-05-14 generated an HMAC secret and printed its value to deployment logs
when first-boot generation ran. Any deployment that ran the affected entrypoint
with an absent or empty fallback file, causing generation, must treat that
generated credential as exposed regardless of how few operators could read the
logs. Merely executing the entrypoint with an existing non-empty fallback file
does not establish a new disclosure.

The ChronodeAi fork removed value disclosure in commit
`3b6794e409dcc4bbd644904ffbb6edc93761adee` on 2026-07-25. That source fix
prevents printing when the corrected fork entrypoint is actually used. It does
not rotate a value exposed by an earlier deployment, remove it from retained
logs, or protect a deployment that follows the still-upstream-directed README
instead of a commit-bound ChronodeAi artifact.

## Evidence checked

| Surface | Result |
|---|---|
| Current shell resolution | No `railway` executable found |
| Installed package managers | No Railway CLI package found in the active global npm prefix or Homebrew formula list |
| Reviewer-shell environment | No Railway-named environment variables found in the orchestration shell; no service or account environment is inferred |
| Local Railway configuration | No `~/.railway`, `~/.config/railway`, `~/Library/Application Support/railway`, or `~/.local/share/railway` path found |
| Current repository | Generic deployment template only; no project ID or concrete Railway hostname |
| Shell history | The readable zsh sources contained zero Railway login, init/link, deploy/redeploy, variable, log, volume, ssh/run, or domain commands: 7,794 records in `~/.zsh_history`, the same 7,794-record session copy, and 32 records in `historynew`. Their newest modification time was 2026-07-23T14:59:07Z, before the relevant 2026-07-24 through 2026-07-25 fork window. `~/.bash_history` was unreadable (`EACCES`) and fish history absent |
| Public-search observation | Operator-reported same-day advisory search found the generic upstream template and no public ChronodeAi Railway endpoint. No raw search receipt was retained, so this is not gate evidence |
| Public GitHub observation | Operator-reported unauthenticated same-day requests returned zero deployments, workflows, and environments for the public repository. No raw response receipt was retained; a later refresh was rate-limited and the configured `gh` credential is invalid. No authenticated private inventory was performed |
| Current Railway template | Entrypoint no longer prints a generated value, but can still generate a file secret and continue binding when no platform secret is injected |
| Current Railway README | Opening guidance still says to retrieve the generated secret from deployment logs, contradicting its later non-disclosure guidance |
| Current Railway viewer guidance | Current viewer source implements non-loopback bearer authentication and a host allowlist, but Railway guidance neither configures nor validates that contract and does not explain how an ordinary browser supplies the bearer credential |
| Current Railway source identity | README points to upstream `rohitg00/agentmemory`; Dockerfile installs an upstream npm package rather than the frozen ChronodeAi commit |
| Current local Agentmemory logs | The sanitized runtime observation records exact search-query text in the terminal-associated runtime log, and current source independently permits query-text logging. This expands the governed local-log sink but is not evidence of Railway deployment; no credential value was sought, inspected, or reproduced |
| Redacted repository scan | Gitleaks 8.30.1 reported one history finding and three working-tree findings, represented by three unique dispositions with 100% value redaction. The history traversal and working-tree file denominator were not fully reconciled, and the documentation example remains open; no complete-history or secret-free claim is made |

These are negative local and public signals only. They do not prove that a
private Railway project was never created through the dashboard, another
machine, another account, or deleted project history. In particular, the
readable zsh sources stop before the relevant fork window and cannot substitute
for the unreadable bash history or an authenticated Railway account inventory.

The redacted scan disposition is recorded at
`.aiwg/security/secret-scan-disposition-2026-07-26.json`. Its classifications
do not prove that the repository is secret-free, and repository scanning cannot
find a value that existed only in an external deployment log.

The local query-log observation is a separate prospective containment input.
Any accepted secret-flow corpus must treat launchd stdout/stderr and current
runtime logs as governed sinks. It does not authorize inspection of real
credential values or convert local logging into evidence of Railway history.

The current template inconsistencies are prospective release blockers even if
historical deployment is denied. A publicly reachable profile must require an
injected platform secret and fail before binding when it is absent. Only the
authenticated API port is public by default. Viewer publication requires the
existing non-loopback bearer and host-allowlist controls to be explicitly
configured, validated, and paired with a documented browser credential-delivery
mechanism. Source and operator documentation must describe the same behavior.

## Historical exposure-disposition gate

One of the following is required to disposition historical exposure uncertainty
within an explicitly named account/project scope:

1. An accountable operator confirms that no affected first-boot generation ran
   in every named relevant Railway account and project; or
2. An authenticated read-only Railway account/project inventory finds no
   current or historical affected first-boot generation; or
3. An affected deployment is identified and the containment procedure below
   completes with redacted receipts.

An operator denial or negative inventory can disposition only the named
historical scope. It cannot close the prospective template, viewer,
source-identity, backup, R-02, canary, or release-readiness gates.

## Containment procedure if affected first-boot generation existed

1. Restrict project and deployment-log access to the smallest authorized
   operator group.
2. Generate a replacement HMAC value locally or through the platform secret
   manager. Never print or copy the value into chat, Git, receipts, or command
   output.
3. Set the replacement as the Railway `AGENTMEMORY_SECRET` service variable.
4. Remove, replace, or permanently disable any existing `/data/.hmac` value
   across the live volume, volume snapshots, `/data` archives, restore media,
   and backup exports. An environment-variable rotation alone is insufficient
   because removing the variable or restoring old media could reactivate the
   old file fallback.
5. Redeploy the service from a non-disclosing, commit-bound ChronodeAi
   artifact. The current upstream-repository/npm-package instructions do not
   identify the fork candidate.
6. Verify with redacted probes that the prior credential fails and the
   replacement credential succeeds.
7. Verify in isolated recovery rehearsals that loss of the environment
   variable and restoration from every retained snapshot, archive, or backup
   cannot reactivate the exposed file credential.
8. Update every authorized client and revoke or remove stale client
   configuration.
9. Search deployment logs, support exports, build artifacts, retained captures,
   volume snapshots, `/data` archives, restore media, and backup exports for the
   exposure without reproducing the value in assessment output.
10. Purge affected logs only when platform capability and retention or
   incident-evidence policy authorize deletion. Otherwise restrict access,
   record retention expiry, and preserve a sealed incident reference.
11. Record rotation time, affected service/revision, commit-bound artifact,
    verifier identities, live and retained-media fallback-file disposition,
    restore-rehearsal outcomes, old credential rejection, new credential
    success, and log disposition without secret material.

## Prospective Railway release-readiness gate

This separate gate remains open regardless of the historical decision. Closure
requires accepted and verified evidence that:

1. a public profile receives an injected platform secret and fails before
   binding when required material is missing, unreadable, or invalid;
2. fallback-file migration and retirement cannot reintroduce an old credential
   through restart, snapshot, archive, backup, or restore;
3. the deployed source and package are bound to one reviewed ChronodeAi commit
   and artifact digest;
4. entrypoint behavior, README guidance, backup/restore procedures, and
   rotation instructions are consistent;
5. any public viewer path configures and validates non-loopback bearer and host
   controls and documents a workable browser credential mechanism; and
6. synthetic all-sink evidence and independent review satisfy the admitted R-02
   contract.

## Gate decision

R-02 remains IDENTIFIED. No secret rotation, log purge, risk mitigation, or
risk retirement is claimed.

Architecture evidence preparation may continue, but no Railway deployment,
external canary, production migration, or release admission may proceed while
either the scoped historical exposure-disposition gate or the prospective
Railway release-readiness gate is open.
