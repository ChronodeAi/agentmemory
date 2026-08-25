#!/bin/bash
# Print the current upstream-sync position: deployed release, local main,
# upstream/main, divergence vs the deployed sha, and the newest upstream
# commit subjects. Read-only; run from anywhere inside the repo.
set -euo pipefail

root=$(git rev-parse --show-toplevel)
cd "$root"

app_dir="$HOME/Library/Application Support/Agentmemory"
current_link="$app_dir/current"

deployed_release="unknown"
deployed_sha12="unknown"
if [ -L "$current_link" ]; then
  deployed_release=$(basename "$(readlink "$current_link")")
  case "$deployed_release" in
    merge-*)
      deployed_sha12="${deployed_release#merge-}"
      ;;
  esac
fi

main_sha=$(git rev-parse --verify --quiet refs/heads/main || git rev-parse origin/main)

upstream_sha=unknown
if git show-ref --verify --quiet refs/remotes/upstream/main; then
  upstream_sha=$(git rev-parse upstream/main)
else
  echo "upstream/main missing — fetch with: git fetch upstream refs/heads/main:refs/remotes/upstream/main" >&2
fi

echo "deployed release dir: $deployed_release"
echo "current main sha:     $main_sha"
echo "upstream/main sha:    $upstream_sha"

deployed_full=""
if [ "$deployed_sha12" != "unknown" ]; then
  deployed_full=$(git rev-parse --verify --quiet "${deployed_sha12}" || true)
  if [ -n "$deployed_full" ]; then
    read -r behind ahead <<<"$(git rev-list --left-right --count "refs/heads/main...$deployed_full")"
    echo "main vs deployed:     ahead $ahead, behind $behind (deployed $deployed_full)"
    read -r uback uahead <<<"$(git rev-list --left-right --count "upstream/main...$deployed_full")"
    echo "upstream vs deployed: ahead $uahead, behind $uback"
  else
    echo "main vs deployed:     deployed sha $deployed_sha12 not found in this clone"
  fi
fi

if [ "$upstream_sha" != "unknown" ]; then
  echo
  echo "17 newest upstream commits:"
  git log upstream/main -n 17 --format='  %h %s'
fi
