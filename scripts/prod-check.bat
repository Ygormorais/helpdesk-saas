@echo off
setlocal enabledelayedexpansion

if "%~2"=="" (
  echo Usage: scripts\prod-check.bat ^<backend_url^> ^<frontend_url^>
  exit /b 2
)

set "BACKEND=%~1"
set "FRONTEND=%~2"
if "!BACKEND:~-1!"=="/" set "BACKEND=!BACKEND:~0,-1!"
if "!FRONTEND:~-1!"=="/" set "FRONTEND=!FRONTEND:~0,-1!"

set "FAIL=0"

call :check "backend live" "!BACKEND!/health/live" "200"
call :check "backend ready" "!BACKEND!/health" "200"
call :check "backend version" "!BACKEND!/health/version" "200"
call :check "frontend root" "!FRONTEND!/" "200"

if !FAIL! neq 0 (
  echo [error] quick checks failed
  exit /b 1
)

cmd /c scripts\smoke-deploy.bat "!BACKEND!" "!FRONTEND!"
if errorlevel 1 exit /b 1

set "VERSION_PAYLOAD="
for /f "delims=" %%I in ('curl -s -L -m 20 "!BACKEND!/health/version"') do set "VERSION_PAYLOAD=%%I"
set "COMMIT_SHA="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; $obj = $env:VERSION_PAYLOAD | ConvertFrom-Json; if ($obj -and $obj.commitSha) { $obj.commitSha }"`) do set "COMMIT_SHA=%%I"
if defined COMMIT_SHA (
  echo [ok] backend commitSha: !COMMIT_SHA!
) else (
  echo [warn] could not parse commitSha from /health/version
)

echo [ok] production check passed
exit /b 0

:check
set "NAME=%~1"
set "URL=%~2"
set "EXPECTED=%~3"
set "CODE="
for /f "delims=" %%I in ('curl -s -L -m 20 -o NUL -w "%%{http_code}" "%URL%"') do set "CODE=%%I"
if not "!CODE!"=="%EXPECTED%" (
  echo [fail] %NAME% - expected HTTP %EXPECTED%, got !CODE! ^(%URL%^)
  set "FAIL=1"
) else (
  echo [ok] %NAME%
)
exit /b 0
