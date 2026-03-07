#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: scripts/smoke-deploy.sh <backend_url> <frontend_url>"
  echo "Example: scripts/smoke-deploy.sh https://api.example.com https://app.example.com"
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[error] curl is required"
  exit 2
fi

backend="${1%/}"
frontend="${2%/}"
tmp_dir="$(mktemp -d)"
failures=0

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

check_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="$3"
  local contains="${4:-}"
  local body_file="$tmp_dir/body.txt"

  local code
  code="$(curl -sS -L -m 20 -o "$body_file" -w "%{http_code}" "$url" || true)"
  [ -n "$code" ] || code="000"

  if [ "$code" != "$expected_code" ]; then
    echo "[fail] $name - expected HTTP $expected_code, got $code ($url)"
    failures=$((failures + 1))
    return
  fi

  if [ -n "$contains" ] && ! grep -qi "$contains" "$body_file"; then
    echo "[fail] $name - response did not contain '$contains' ($url)"
    failures=$((failures + 1))
    return
  fi

  echo "[ok] $name"
}

echo "[info] backend:  $backend"
echo "[info] frontend: $frontend"

check_endpoint "frontend root" "$frontend/" "200" "<!doctype html"
check_endpoint "backend liveness" "$backend/health/live" "200" "status"
check_endpoint "backend readiness" "$backend/health" "200" "ready"
check_endpoint "api liveness" "$backend/api/health/live" "200" "status"
check_endpoint "api readiness" "$backend/api/health" "200" "ready"
check_endpoint "socket handshake" "$backend/socket.io/?EIO=4&transport=polling" "200" "sid"

if [ "$failures" -gt 0 ]; then
  echo "[error] smoke test failed with $failures issue(s)"
  exit 1
fi

echo "[ok] deploy smoke test passed"
