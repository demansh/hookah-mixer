#!/usr/bin/env bash
set -euo pipefail

skill_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$skill_dir/../../.." && pwd)"
command="${1:-}"
if [[ -z "$command" ]]; then
  echo "usage: engine-harness.sh diagnose [--pages=N] \"query\" ... | sweep | words" >&2
  exit 1
fi
shift

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT
cp -R "$repo_root/assets" "$work_dir/"
cp "$skill_dir/scripts/"*.mjs "$skill_dir/scripts/wordforms.json" "$work_dir/"
echo '{"type":"module"}' > "$work_dir/package.json"
cd "$work_dir"

case "$command" in
  diagnose) node diagnose.mjs "$@" ;;
  sweep) node sweep.mjs ;;
  words) node words.mjs ;;
  *) echo "unknown command: $command" >&2; exit 1 ;;
esac
