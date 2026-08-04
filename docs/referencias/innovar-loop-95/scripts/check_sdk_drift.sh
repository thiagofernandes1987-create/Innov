#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SDK="$ROOT/06-sdk/typescript"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -a "$SDK" "$TMP/sdk"
rm -rf "$TMP/sdk/dist"
(cd "$TMP/sdk" && npx tsc -p tsconfig.json)
if diff -ru "$SDK/dist" "$TMP/sdk/dist"; then
  echo 'SDK_DRIFT_GATE: PASS generated dist matches committed dist'
else
  echo 'SDK_DRIFT_GATE: FAIL committed dist differs from generated dist' >&2
  exit 1
fi
