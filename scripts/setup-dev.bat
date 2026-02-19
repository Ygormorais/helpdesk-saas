@echo off
setlocal enabledelayedexpansion

set "DC=docker-compose"
docker compose version >nul 2>&1 && set "DC=docker compose"

echo [setup] Starting services...
call %DC% up -d

echo [setup] Waiting for MongoDB to be ready...
set "MAX=60"
for /L %%i in (1,1,%MAX%) do (
  docker exec helpdesk-mongodb mongosh --eval "db.runCommand({ ping: 1 }).ok" --quiet >nul 2>&1
  if !errorlevel! EQU 0 (
    goto mongo_ready
  )
  timeout /t 2 >nul
)

echo [setup] MongoDB not ready within timeout.
exit /b 1

:mongo_ready
echo [setup] MongoDB ready.
echo [setup] Creating test admin...
docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js
echo [setup] Done. Admin should be accessible at login.
endlocal
