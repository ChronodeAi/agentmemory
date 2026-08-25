# Upstream Sync Playbook

How this fork pulls changes from [`rohitg00/agentmemory`](https://github.com/rohitg00/agentmemory)
(`upstream`) into [`ChronodeAi/agentmemory`](https://github.com/ChronodeAi/agentmemory)
(`origin`) using the staged-train process. Every step below has been executed
end-to-end on this machine; follow it in order and do not skip the gates.

Companion tooling: [`scripts/sync/upstream-status.sh`](../scripts/sync/upstream-status.sh)
prints the current sync position at any point in the process.

## 0. Refresh refs (explicit refspecs)

Both remotes pin their refspec. A plain `git fetch origin` does NOT update
`refs/remotes/origin/main` on this checkout — always fetch with explicit
refspecs:

```sh
git fetch origin refs/heads/main:refs/remotes/origin/main
git fetch upstream refs/heads/main:refs/remotes/upstream/main
```

Work on a throwaway branch off `origin/main`, never directly on `main`.

## 1. Classify the delta

List what upstream has that the deployed release does not:

```sh
git log <deployed-sha>..upstream/main --oneline
```

Sort every commit into exactly one bucket before touching code:

| Bucket | Criteria | Action |
| --- | --- | --- |
| **pull-first bugfixes** | Small, self-contained fixes in code paths the fork tracks verbatim | Port first, one commit each, minimal adaptation |
| **decompose-and-port** | Upstream changes bundling several unrelated concerns | Split into fork-sized commits; port piece by piece; drop pieces that collide with fork-only subsystems |
| **re-port-through-bundle-pipeline** | Anything whose real artifact is generated output (dist bundles, plugin sidecars, skill manifests) | Never hand-edit artifacts. Apply the source change, run `npm run build`, commit the regenerated bundles |
| **skip-unused-host-adapters** | Deploy-platform adapters the fork does not run (`deploy/coolify`, `deploy/fly`, `deploy/railway`, `deploy/render`, docker-compose variants) | Skip; note the skip in the train summary |

Record the classification (bucket per upstream sha) in the PR description so
the next train starts from a written baseline instead of archaeology.

## 2. Non-negotiable gates

All of these run against the finished tree before anything is pushed.

### Hook bundles are committed build outputs

`dist/*.mjs` and `plugin/` hook sidecars are build products. After ANY change
they depend on (including version constants):

```sh
npm run build
git add dist plugin   # commit the regenerated bundles together with the source
```

Hand-edited bundles drift silently and ship stale behavior — always rebuild.

### `ci/r13-test-manifest.json` recompute algorithm

Adding, removing, or renaming a file under `test/**.test.ts` invalidates the
frozen manifest. Recompute it with the same algorithm `scripts/r13/run.mjs`
uses (sorted tracked test paths; `count`; `sha256` over the newline-joined
path list plus trailing newline; `content_sha256` over `PATH\0<path>\0` +
file bytes per path):

```sh
node -e '
import("node:fs").then(async ({readdirSync, readFileSync, writeFileSync}) => {
  const {createHash} = await import("node:crypto");
  const {join, relative} = await import("node:path");
  const root = process.cwd();
  const files = [];
  const visit = (d) => { for (const e of readdirSync(d,{withFileTypes:true})) {
    const p=join(d,e.name);
    if(e.isDirectory()) visit(p);
    else if(e.isFile()&&e.name.endsWith(".test.ts")) files.push(relative(root,p).replaceAll("\\\\","/"));
  } };
  visit(join(root,"test"));
  const tests = files.sort();
  const sha = (v)=>createHash("sha256").update(v).digest("hex");
  const content=createHash("sha256");
  for (const p of tests){ content.update(`PATH\0${p}\0`); content.update(readFileSync(join(root,p))); }
  writeFileSync(join(root,"ci/r13-test-manifest.json"),
    JSON.stringify({count:tests.length, sha256:sha(`${tests.join("\n")}\n`), content_sha256:content.digest("hex")},null,2)+"\n");
})'
```

Committing tests without this recompute fails the canonical R13 preflight
with `test manifest mismatch` / `test content mismatch`.

### Evidence inventory refresh

```sh
npm run evidence:interfaces      # regenerates .aiwg/reports/g-icm-01-interface-inventory.json
npm run evidence:interfaces:test # unit-checks the generator itself
```

Commit the refreshed inventory JSON in the same train.

### Skills generation and check

```sh
npm run skills:gen
npm run skills:check
```

Commit regenerated skill outputs; `skills:check` must be green at push time.

### Tool-count consistency surfaces

Any change that adds/removes MCP tools or REST endpoints MUST touch all
surfaces listed in [`AGENTS.md`](../AGENTS.md) ("Consistency Rules"):
tools-registry, server switch, REST registration, index registration +
endpoint log count, `test/mcp-standalone.test.ts` assertion, README counts,
`plugin/.claude-plugin/plugin.json` description, `plugin/plugin.json` /
`plugin/.mcp.copilot.json`, and the evidence inventory. The interface
inventory gate catches drift, but fix the sources rather than suppressing.

## 3. Verification battery (pre-push)

Run locally, in this order; do not push until every line passes:

1. `npx vitest run` — zero failures (known base file-level artifacts are
   exempt; new failures are not).
2. `npx tsc --noEmit 2>&1 | grep "^src/" | sort` — identical to the frozen
   baseline set: `transport.ts` socket-union family, `tools-registry.ts`
   pattern/items TS2353 ×3+1, `coding-memory.ts` TS6133. Any addition or
   removal is a regression.
3. Full canonical R13 with dummy secrets and HF smoke enabled:

   ```sh
   AGENTMEMORY_SECRET=dummy \
   AGENTMEMORY_PROJECT_CAPABILITY_SECRET=dummy \
   RUN_HF_SMOKE=1 \
   node scripts/r13/run.mjs
   ```

   Must end with `R-13 passed`. This is the battery; `npm test` alone is not
   a substitute for a release train.
4. `npm run evidence:interfaces:test` — pass.
5. `npm run skills:check` — green.

## 4. PR flow

- PRs target `origin/main` DIRECTLY. Do not introduce stacked bases: deleting
  a stacked base branch auto-closes every PR stacked on it (learned the hard
  way on this repo).
- One PR per train. Push, wait ~30 s, then
  `gh pr checks --watch --repo ChronodeAi/agentmemory`. On failure read
  `gh run view --log-failed`, fix, push again — repeat until green.
- Merge with `gh pr merge --merge --delete-branch`.

## 5. Deploy recipe (local production)

Executed after the train's PR merges; `sha12` = first 12 chars of the new
main sha.

1. **Build and prove reproducibility** (double-pack: two consecutive packs of
   the same tree must hash identically):

   ```sh
   npm ci && npm run build
   npm pack >/dev/null && cp agentmemory-*.tgz /tmp/pack-a.tgz && rm agentmemory-*.tgz
   npm pack >/dev/null && cp agentmemory-*.tgz /tmp/pack-b.tgz && rm agentmemory-*.tgz
   shasum -a 256 /tmp/pack-a.tgz /tmp/pack-b.tgz   # hashes must match
   TGZ=/tmp/pack-a.tgz
   ```

2. **Stage the release dir** `releases/merge-<sha12>` under
   `~/Library/Application Support/Agentmemory/releases/`:

   ```sh
   REL="$HOME/Library/Application Support/Agentmemory/releases/merge-<sha12>"
   mkdir -p "$REL/lib/node_modules/@agentmemory/agentmemory" "$REL/bin"
   cd "$REL/lib/node_modules/@agentmemory/agentmemory"
   # Anchor package.json pitfall: `npm install ./x.tgz` walks UP looking for
   # the nearest package.json and can unpack into a parent directory. An
   # empty dir has none, so seed one first (or install while already inside
   # the package dir like prior releases did).
   echo '{"name":"anchor","private":true,"version":"0.0.0"}' > package.json
   npm install "$TGZ" --omit=dev
   ```

   Result must mirror the previous release: the package contents land in
   `lib/node_modules/@agentmemory/agentmemory/` (dist/, plugin/, iii-config.yaml…).

3. **Bin symlink**:

   ```sh
   ln -sf ../lib/node_modules/@agentmemory/agentmemory/dist/cli.mjs "$REL/bin/agentmemory"
   ```

4. **Receipt JSON** mirroring `receipts/activation-05b08ffc.json`
   (`~/Library/Application Support/Agentmemory/receipts/activation-<sha12>.json`):

   ```json
   {
     "schema_version": 1,
     "kind": "agentmemory_local_activation_receipt",
     "activated_at": "<ISO-8601 UTC>",
     "source": { "repository": "ChronodeAi/agentmemory", "commit": "<sha12>" },
     "package": { "sha256": "<tgz sha256>", "reproducible": true },
     "supersedes": { "release_dir": "merge-<prev-sha12>", "version": "<prev-version>" }
   }
   ```

5. **Flip and restart**:

   ```sh
   ln -sfn "$REL" "$HOME/Library/Application Support/Agentmemory/current"
   launchctl print "gui/$(id -u)/com.chronode.agentmemory" >/dev/null 2>&1 \
     || launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.chronode.agentmemory.plist
   launchctl kickstart -k "gui/$(id -u)/com.chronode.agentmemory"
   sleep 15
   ```

6. **Verify**:

   ```sh
   curl -s -H "Authorization: Bearer $(cat ~/.agentmemory/secret)" \
     http://127.0.0.1:3113/health | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["build"]["backend"], d["status"])'
   # expect: agentmemory-<version> healthy

   CLAUDE_PLUGIN_ROOT="$HOME/Library/Application Support/Agentmemory/current/plugin" \
     echo '{}' | node "$HOME/Library/Application Support/Agentmemory/current/plugin/scripts/post-tool-use.mjs"
   # then confirm the round-trip landed in the daemon stderr log
   tail -n 20 ~/Library/Logs/Agentmemory/agentmemory.stderr.log
   ```

7. Update the tier-1 decision record (`decisions` table via `dsh-sor.sh`) so
   the deployment is queryable truth, not session folklore.
