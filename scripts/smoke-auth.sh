#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "Usage: scripts/smoke-auth.sh <backend_url> <email> <password> [frontend_url]"
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[error] curl is required"
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[error] node is required"
  exit 2
fi

node scripts/auth-smoke-check.mjs "$@"
