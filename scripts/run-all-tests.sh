#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Typecheck"
npx tsc --noEmit

echo "==> Jest (CI)"
npm run test:ci

if [[ "${RUN_PLAYWRIGHT:-0}" == "1" ]]; then
  echo "==> Playwright Web"
  npm run test:e2e:web
fi

if [[ "${RUN_MAESTRO:-0}" == "1" ]]; then
  echo "==> Maestro (simulator)"
  npm run test:e2e
fi

echo "Done. Unit tests passed."
echo "Optional: RUN_PLAYWRIGHT=1 $0  |  RUN_MAESTRO=1 $0"
