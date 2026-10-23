#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(dirname "$script_dir")"
env_file="$script_dir/sheets.env"

if [[ ! -f "$env_file" ]]; then
  echo "Missing $env_file. Copy tools/sheets.env.example to tools/sheets.env and fill it in." >&2
  exit 1
fi
source "$env_file"
: "${SHEET_ID:?SHEET_ID is empty in tools/sheets.env}"

download_tab() {
  local tab_name="$1"
  local gid="$2"
  local target="$repo_root/data-src/$tab_name.csv"
  if [[ -z "$gid" ]]; then
    echo "skip  $tab_name (gid is empty)"
    return
  fi
  curl -fsSL "https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}" -o "$target.tmp"
  mv "$target.tmp" "$target"
  echo "ok    $tab_name → data-src/$tab_name.csv"
}

download_tab tags "${GID_TAGS:-}"
download_tab brands "${GID_BRANDS:-}"
download_tab tobaccos "${GID_TOBACCOS:-}"
