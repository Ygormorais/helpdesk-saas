@echo off
setlocal

set PORT=%1
if "%PORT%"=="" set PORT=3000

where ngrok >nul 2>&1
if %errorlevel% neq 0 (
  echo [ngrok] ERRO: ngrok nao encontrado no PATH.
  echo [ngrok] Instale o ngrok e tente novamente.
  echo [ngrok] Depois rode: ngrok config add-authtoken SEU_TOKEN
  exit /b 1
)

echo [ngrok] Expondo backend local na porta %PORT%...
echo [ngrok] Dica: depois copie o HTTPS Forwarding e aponte o Asaas para:
echo [ngrok]   https://SEU_NGROK_DOMAIN/api/billing/webhook
echo [ngrok] UI local (requests): http://127.0.0.1:4040
echo.

ngrok http %PORT%
