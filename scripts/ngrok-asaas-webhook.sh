#!/bin/bash
set -euo pipefail

PORT="${1:-3000}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "[ngrok] ERROR: ngrok not found in PATH."
  echo "[ngrok] Install ngrok and then run: ngrok config add-authtoken <YOUR_TOKEN>"
  exit 1
fi

echo "[ngrok] Exposing local backend on port ${PORT}..."
echo "[ngrok] Configure Asaas webhook to: https://<your-ngrok-domain>/api/billing/webhook"
echo "[ngrok] Local UI (requests): http://127.0.0.1:4040"
echo ""

ngrok http "${PORT}"
