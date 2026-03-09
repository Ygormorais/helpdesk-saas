@echo off
setlocal enabledelayedexpansion

if "%~3"=="" (
  echo Usage: scripts\smoke-auth.bat ^<backend_url^> ^<email^> ^<password^> [frontend_url]
  echo Example: scripts\smoke-auth.bat https://api.example.com admin@example.com secret123 https://app.example.com
  exit /b 2
)

where curl >nul 2>&1
if %errorlevel% neq 0 (
  echo [error] curl is required
  exit /b 2
)

where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [error] node is required
  exit /b 2
)

set "BACKEND=%~1"
set "EMAIL=%~2"
set "PASSWORD=%~3"
set "FRONTEND=%~4"
call :trim_slash BACKEND
call :trim_slash FRONTEND

echo [info] backend:  %BACKEND%
if defined FRONTEND echo [info] frontend: %FRONTEND%

set "TMP_DIR=%TEMP%\smoke-auth-%RANDOM%-%RANDOM%"
mkdir "%TMP_DIR%" >nul 2>&1
set "LOGIN_BODY=%TMP_DIR%\login.json"
set "LOGIN_PAYLOAD=%TMP_DIR%\login-payload.json"
set "ME_BODY=%TMP_DIR%\me.json"
set "VERSION_BODY=%TMP_DIR%\version.json"
set "FRONTEND_BODY=%TMP_DIR%\frontend.html"
set "FAILURES=0"

if defined FRONTEND (
  call :check_frontend
)

node -e "const fs=require('fs'); fs.writeFileSync(process.argv[1], JSON.stringify({ email: process.argv[2], password: process.argv[3] }));" "%LOGIN_PAYLOAD%" "%EMAIL%" "%PASSWORD%"
if %errorlevel% neq 0 (
  echo [error] failed to prepare auth payload
  rd /s /q "%TMP_DIR%" >nul 2>&1
  exit /b 1
)

set "LOGIN_CODE="
for /f "delims=" %%I in ('curl -s -L -m 20 -H "Content-Type: application/json" --data-binary "@%LOGIN_PAYLOAD%" -o "%LOGIN_BODY%" -w "%%{http_code}" "%BACKEND%/api/auth/login"') do set "LOGIN_CODE=%%I"
if not defined LOGIN_CODE set "LOGIN_CODE=000"

if not "!LOGIN_CODE!"=="200" (
  echo [fail] auth login - expected HTTP 200, got !LOGIN_CODE! ^(%BACKEND%/api/auth/login^)
  set /a FAILURES+=1
) else (
  echo [ok] auth login
)

set "TOKEN="
for /f "usebackq delims=" %%I in (`node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.token) process.stdout.write(String(data.token)); } catch {}" "%LOGIN_BODY%"`) do set "TOKEN=%%I"

if not defined TOKEN (
  echo [fail] auth login - token missing in response
  set /a FAILURES+=1
) else (
  echo [ok] auth token
)

if defined TOKEN (
  set "ME_CODE="
  for /f "delims=" %%I in ('curl -s -L -m 20 -H "Authorization: Bearer !TOKEN!" -o "%ME_BODY%" -w "%%{http_code}" "%BACKEND%/api/auth/me"') do set "ME_CODE=%%I"
  if not defined ME_CODE set "ME_CODE=000"

  if not "!ME_CODE!"=="200" (
    echo [fail] auth me - expected HTTP 200, got !ME_CODE! ^(%BACKEND%/api/auth/me^)
    set /a FAILURES+=1
  ) else (
    set "USER_EMAIL="
    for /f "usebackq delims=" %%I in (`node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.user && data.user.email) process.stdout.write(String(data.user.email)); } catch {}" "%ME_BODY%"`) do set "USER_EMAIL=%%I"
    if /I not "!USER_EMAIL!"=="%EMAIL%" (
      if defined USER_EMAIL (
        echo [fail] auth me - expected user email %EMAIL%, got !USER_EMAIL!
      ) else (
        echo [fail] auth me - expected user email %EMAIL%, got ^<empty^>
      )
      set /a FAILURES+=1
    ) else (
      echo [ok] auth me
    )
  )
)

set "VERSION_CODE="
for /f "delims=" %%I in ('curl -s -L -m 20 -o "%VERSION_BODY%" -w "%%{http_code}" "%BACKEND%/health/version"') do set "VERSION_CODE=%%I"
if not defined VERSION_CODE set "VERSION_CODE=000"

if not "!VERSION_CODE!"=="200" (
  echo [fail] health version - expected HTTP 200, got !VERSION_CODE! ^(%BACKEND%/health/version^)
  set /a FAILURES+=1
) else (
  set "COMMIT_SHA="
  for /f "usebackq delims=" %%I in (`node -e "const fs=require('fs'); try { const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); if (data.commitSha) process.stdout.write(String(data.commitSha)); } catch {}" "%VERSION_BODY%"`) do set "COMMIT_SHA=%%I"
  if defined COMMIT_SHA (
    echo [ok] health version !COMMIT_SHA!
  ) else (
    echo [ok] health version unknown
  )
)

if %FAILURES% gtr 0 (
  echo [error] auth smoke test failed with %FAILURES% issue^(s^)
  rd /s /q "%TMP_DIR%" >nul 2>&1
  exit /b 1
)

echo [ok] auth smoke test passed
rd /s /q "%TMP_DIR%" >nul 2>&1
exit /b 0

:trim_slash
set "VALUE=!%~1!"
if not defined VALUE exit /b 0
if "!VALUE:~-1!"=="/" set "VALUE=!VALUE:~0,-1!"
set "%~1=!VALUE!"
exit /b 0

:check_frontend
set "FRONTEND_CODE="
for /f "delims=" %%I in ('curl -s -L -m 20 -o "%FRONTEND_BODY%" -w "%%{http_code}" "%FRONTEND%/"') do set "FRONTEND_CODE=%%I"
if not defined FRONTEND_CODE set "FRONTEND_CODE=000"

if not "!FRONTEND_CODE!"=="200" (
  echo [fail] frontend root - expected HTTP 200, got !FRONTEND_CODE! ^(%FRONTEND%/^)
  set /a FAILURES+=1
  exit /b 0
)

findstr /i /c:"<!doctype html" "%FRONTEND_BODY%" >nul
if errorlevel 1 (
  echo [fail] frontend root - response did not look like HTML ^(%FRONTEND%/^)
  set /a FAILURES+=1
  exit /b 0
)

echo [ok] frontend root
exit /b 0
