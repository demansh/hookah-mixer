#!/usr/bin/env bash
set -euo pipefail

app_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
core_root="${CORE_DIR:-$app_root/../hookah-mixer-core}"
source_dir="$core_root/dist"
target_dir="$app_root/assets/core"

if [[ ! -f "$source_dir/VERSION" ]]; then
  echo "No built core at $source_dir. Run: (cd $core_root && npm install && npm run build)" >&2
  exit 1
fi

rm -rf "$target_dir"
mkdir -p "$target_dir"
cp -R "$source_dir/data" "$source_dir/js" "$source_dir/VERSION" "$target_dir/"
echo "Synced hookah-mixer-core $(cat "$target_dir/VERSION") → assets/core"
