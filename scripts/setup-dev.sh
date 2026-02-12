#!/usr/bin/env bash
set -euo pipefail

echo "[setup] Starting docker-compose services..."
docker-compose up -d

echo "[setup] Waiting for MongoDB to be ready..."
MAX=60
for i in $(seq 1 $MAX); do
  if docker exec helpdesk-mongodb mongosh --eval "db.runCommand({ ping: 1 })" --quiet >/dev/null 2>&1; then
    echo "[setup] MongoDB is ready."
    break
  else
    sleep 2
  fi
  if [ "$i" -eq "$MAX" ]; then
    echo "[setup] MongoDB did not become ready in time. Exiting."
    exit 1
  fi
done

echo "[setup] Creating test admin user..."
docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js

echo "[setup] All set. Admin user should be available at login."
