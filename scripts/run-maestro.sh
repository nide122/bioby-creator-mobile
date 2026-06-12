#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI not found. Install: https://maestro.mobile.dev/docs/getting-started/installing-maestro" >&2
  exit 1
fi

export EXPO_URL="${EXPO_URL:-exp://127.0.0.1:8081}"
export MAESTRO_APP_ID="${MAESTRO_APP_ID:-host.exp.Exponent}"

echo "Maestro E2E → ${EXPO_URL} (appId=${MAESTRO_APP_ID})"
echo "Ensure Metro is running: npm start"

maestro test .maestro/flows "$@"
