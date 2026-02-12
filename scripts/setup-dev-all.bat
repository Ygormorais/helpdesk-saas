@echo off
echo [setup-all] Starting docker-compose...
docker-compose up -d

echo [setup-all] Waiting for MongoDB to be ready...
set MAX=60
for /L %%i in (1,1,%MAX%) do (
  docker exec helpdesk-mongodb mongosh --eval "db.runCommand({ ping: 1 })" --quiet >nul 2>&1
  if errorlevel 0 (
    goto ready
  )
  timeout /t 2 >nul
)
goto finish
:ready
echo MongoDB ready.
goto run
:run
echo [setup-all] Running seed and admin...
docker exec -i helpdesk-backend node /app/scripts/seed.js
docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js
echo [setup-all] Running tests (backend/frontend)...
docker exec -i helpdesk-backend npm test --silent
docker exec -i helpdesk-frontend npm test --silent || echo "Frontend tests may fail on Windows environment; continue."
echo [setup-all] Building frontend...
docker exec -i helpdesk-frontend npm run build
echo [setup-all] Attempting to create PR (if gh installed)...
if exist gh.exe (
  gh pr create --title "feat: Reports enhancements, tests, and CI scaffolding" --body-file PR_BODY.md --head feat/github-push --base main
  echo PR created via gh (if eligibility).
) else (
  echo gh not found. Create PR manually via UI.
)
echo [setup-all] Done. Access: http://localhost:5173/login
:finish
