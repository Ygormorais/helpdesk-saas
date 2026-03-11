@echo off
setlocal

if "%MONGODB_URI%"=="" (
  echo [error] MONGODB_URI nao definido
  exit /b 2
)

pushd backend
node scripts\data-sanity-check.mjs
set "EXIT_CODE=%ERRORLEVEL%"
popd

exit /b %EXIT_CODE%
