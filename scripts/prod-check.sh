#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: scripts/prod-check.sh <backend_url> <frontend_url>"
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[error] curl is required"
  exit 2
fi

backend="${1%/}"
frontend="${2%/}"
fail=0

check() {
  local name="$1"
  local url="$2"
  local expected="$3"
  local code
  code="$(curl -sS -L -m 20 -o /dev/null -w "%{http_code}" "$url" || true)"
  [ -n "$code" ] || code="000"
  if [ "$code" != "$expected" ]; then
    echo "[fail] $name - expected HTTP $expected, got $code ($url)"
    fail=1
  else
    echo "[ok] $name"
  fi
}

check "backend live" "$backend/health/live" "200"
check "backend ready" "$backend/health" "200"
check "frontend root" "$frontend/" "200"

if [ "$fail" -ne 0 ]; then
  echo "[error] quick checks failed"
  exit 1
fi

scripts/smoke-deploy.sh "$backend" "$frontend"
echo "[ok] production check passed"
