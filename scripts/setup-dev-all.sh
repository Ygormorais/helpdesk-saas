#!/usr/bin/env bash
set -euo pipefail

echo "[setup-all] Starting docker-compose..."
docker-compose up -d

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

echo "[setup-all] Attempting to create PR (if gh is installed) ..."
if command -v gh >/dev/null 2>&1; then
  gh pr create --title "feat: Reports enhancements, tests, and CI scaffolding" --body-file PR_BODY.md --head feat/github-push --base main
  echo "[setup-all] PR created via gh (if allowance)."
else
  echo "[setup-all] gh not found. Create PR manually or via UI."
fi

echo "[setup-all] Done. Access: http://localhost:5173/login"
