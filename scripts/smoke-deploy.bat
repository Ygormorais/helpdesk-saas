@echo off
setlocal enabledelayedexpansion

if "%~2"=="" (
  echo Usage: scripts\smoke-deploy.bat ^<backend_url^> ^<frontend_url^>
  echo Example: scripts\smoke-deploy.bat https://api.example.com https://app.example.com
  exit /b 2
)

where curl >nul 2>&1
if %errorlevel% neq 0 (
  echo [error] curl is required
  exit /b 2
)

set "BACKEND=%~1"
set "FRONTEND=%~2"
call :trim_slash BACKEND
call :trim_slash FRONTEND

echo [info] backend:  %BACKEND%
echo [info] frontend: %FRONTEND%

set "FAILURES=0"

call :check_http "frontend root" "%FRONTEND%/" "200"
call :check_http "backend liveness" "%BACKEND%/health/live" "200"
call :check_http "backend readiness" "%BACKEND%/health" "200"
call :check_http "api liveness" "%BACKEND%/api/health/live" "200"
call :check_http "api readiness" "%BACKEND%/api/health" "200"
call :check_http "socket handshake" "%BACKEND%/socket.io/?EIO=4&transport=polling" "200"

if %FAILURES% gtr 0 (
  echo [error] smoke test failed with %FAILURES% issue^(s^)
  exit /b 1
)

echo [ok] deploy smoke test passed
exit /b 0

:trim_slash
set "VALUE=!%~1!"
if not defined VALUE exit /b 0
if "!VALUE:~-1!"=="/" set "VALUE=!VALUE:~0,-1!"
set "%~1=!VALUE!"
exit /b 0

:check_http
set "NAME=%~1"
set "URL=%~2"
set "EXPECTED=%~3"
set "CODE="
for /f "delims=" %%I in ('curl -s -L -m 20 -o NUL -w "%%{http_code}" "%URL%"') do set "CODE=%%I"

if not "!CODE!"=="%EXPECTED%" (
  echo [fail] %NAME% - expected HTTP %EXPECTED%, got !CODE! ^(%URL%^)
  set /a FAILURES+=1
  exit /b 0
)

echo [ok] %NAME%
exit /b 0
