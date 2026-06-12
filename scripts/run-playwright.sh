#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npx >/dev/null 2>&1; then
  echo "Node.js / npx required." >&2
  exit 1
fi

# Keep browsers in-repo so CI/sandbox does not mix x64 vs arm64 cache paths.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$ROOT/.playwright-browsers}"
if [[ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]]; then
  echo "Installing Playwright Chromium → $PLAYWRIGHT_BROWSERS_PATH" >&2
  npx playwright install chromium
fi

export PLAYWRIGHT_BASE_URL="${PLAYWRIGHT_BASE_URL:-http://127.0.0.1:8081}"

if [[ "${1:-}" == "--no-server" ]]; then
  shift
  export PLAYWRIGHT_SKIP_WEB_SERVER=1
  echo "Playwright → ${PLAYWRIGHT_BASE_URL} (reuse existing Metro web)"
else
  echo "Playwright → ${PLAYWRIGHT_BASE_URL} (will start expo web if needed)"
fi

env PLAYWRIGHT_BROWSERS_PATH="$PLAYWRIGHT_BROWSERS_PATH" npx playwright test "$@"
