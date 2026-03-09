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

backend="${1%/}"
email="$2"
password="$3"
frontend="${4:-}"
frontend="${frontend%/}"
tmp_dir="$(mktemp -d)"
failures=0

echo "[info] backend:  $backend"
if [ -n "$frontend" ]; then
  echo "[info] frontend: $frontend"
fi

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

login_body="$tmp_dir/login.json"
login_payload="$tmp_dir/login-payload.json"
me_body="$tmp_dir/me.json"
version_body="$tmp_dir/version.json"
frontend_body="$tmp_dir/frontend.html"

check_frontend() {
  if [ -z "$frontend" ]; then
    return
  fi

  local code
  code="$(curl -sS -L -m 20 -o "$frontend_body" -w "%{http_code}" "$frontend/" || true)"
  [ -n "$code" ] || code="000"
  if [ "$code" != "200" ]; then
    echo "[fail] frontend root - expected HTTP 200, got $code ($frontend/)"
    failures=$((failures + 1))
    return
  fi

  if ! grep -qi "<!doctype html" "$frontend_body"; then
    echo "[fail] frontend root - response did not look like HTML ($frontend/)"
    failures=$((failures + 1))
    return
  fi

  echo "[ok] frontend root"
}

check_frontend

node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], JSON.stringify({ email: process.argv[2], password: process.argv[3] }));" "$login_payload" "$email" "$password"

login_code="$(curl -sS -L -m 20 \
  -H "Content-Type: application/json" \
  --data-binary @"$login_payload" \
  -o "$login_body" \
  -w "%{http_code}" \
  "$backend/api/auth/login" || true)"
[ -n "$login_code" ] || login_code="000"

if [ "$login_code" != "200" ]; then
  echo "[fail] auth login - expected HTTP 200, got $login_code ($backend/api/auth/login)"
  failures=$((failures + 1))
else
  echo "[ok] auth login"
fi

token="$(node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.token) process.stdout.write(String(data.token)); } catch {}" "$login_body")"

if [ -z "$token" ]; then
  echo "[fail] auth login - token missing in response"
  failures=$((failures + 1))
else
  echo "[ok] auth token"
fi

if [ -n "$token" ]; then
  me_code="$(curl -sS -L -m 20 \
    -H "Authorization: Bearer $token" \
    -o "$me_body" \
    -w "%{http_code}" \
    "$backend/api/auth/me" || true)"
  [ -n "$me_code" ] || me_code="000"

  if [ "$me_code" != "200" ]; then
    echo "[fail] auth me - expected HTTP 200, got $me_code ($backend/api/auth/me)"
    failures=$((failures + 1))
  else
    user_email="$(node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.user?.email) process.stdout.write(String(data.user.email)); } catch {}" "$me_body")"
    if [ "${user_email,,}" != "${email,,}" ]; then
      echo "[fail] auth me - expected user email $email, got ${user_email:-<empty>}"
      failures=$((failures + 1))
    else
      echo "[ok] auth me"
    fi
  fi
fi

version_code="$(curl -sS -L -m 20 -o "$version_body" -w "%{http_code}" "$backend/health/version" || true)"
[ -n "$version_code" ] || version_code="000"

if [ "$version_code" != "200" ]; then
  echo "[fail] health version - expected HTTP 200, got $version_code ($backend/health/version)"
  failures=$((failures + 1))
else
  commit_sha="$(node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.commitSha) process.stdout.write(String(data.commitSha)); } catch {}" "$version_body")"
  echo "[ok] health version ${commit_sha:-unknown}"
fi

if [ "$failures" -gt 0 ]; then
  echo "[error] auth smoke test failed with $failures issue(s)"
  exit 1
fi

echo "[ok] auth smoke test passed"
