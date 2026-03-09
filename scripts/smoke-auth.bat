@echo off
setlocal enabledelayedexpansion

if "%~3"=="" (
  echo Usage: scripts\smoke-auth.bat ^<backend_url^> ^<email^> ^<password^> [frontend_url]
  echo Example: scripts\smoke-auth.bat https://api.example.com admin@example.com secret123 https://app.example.com
  exit /b 2
)

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [error] node is required
  exit /b 2
)

node scripts/auth-smoke-check.mjs %*
exit /b %errorlevel%
