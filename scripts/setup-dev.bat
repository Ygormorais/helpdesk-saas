@echo off
echo Starting docker-compose services...
docker-compose up -d
echo Waiting for MongoDB to be ready...
setlocal enabledelayedexpansion
for /L %%i in (1,1,60) do (
  docker exec helpdesk-mongodb mongosh --eval "db.runCommand({ ping: 1 })" --quiet >nul 2>&1
  if !errorlevel! == 0 (
    timeout /t 2 >nul
  ) else (
    goto ready
  )
)
echo MongoDB ready.
goto runadmin
:ready
echo MongoDB not ready within timeout.
exit /b 1
:runadmin
echo Creating test admin...
docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js
echo Done. Admin should be accessible at login.
endlocal
