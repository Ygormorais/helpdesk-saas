#!/usr/bin/env bash
set -euo pipefail

DC="docker-compose"
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
fi

echo "[setup-all] Starting services..."
$DC up -d

echo "[setup-all] Waiting for MongoDB to be ready..."
MAX=60
for i in $(seq 1 $MAX); do
  if docker exec helpdesk-mongodb mongosh --eval "db.runCommand({ ping: 1 })" --quiet >/dev/null 2>&1; then
    echo "[setup-all] MongoDB ready."
    break
  fi
  sleep 2
  if [ "$i" -ge "$MAX" ]; then
    echo "[setup-all] MongoDB did not become ready in time. Exiting."
    exit 1
  fi
done

echo "[setup-all] Running seed..."
docker exec -i helpdesk-backend node /app/scripts/seed.js

echo "[setup-all] Creating admin de teste..."
docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js

echo "[setup-all] Running tests (backend/frontend) ..."
docker exec -i helpdesk-backend npm test --silent
docker exec -i helpdesk-frontend npm test --silent || true

echo "[setup-all] Building frontend..."
docker exec -i helpdesk-frontend npm run build

echo "[setup-all] Done. Access: http://localhost:5173/login"
