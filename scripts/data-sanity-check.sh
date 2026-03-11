#!/usr/bin/env bash
set -euo pipefail

if [ -z "${MONGODB_URI:-}" ]; then
  echo "[error] MONGODB_URI nao definido"
  exit 2
fi

(
  cd backend
  node scripts/data-sanity-check.mjs
)
