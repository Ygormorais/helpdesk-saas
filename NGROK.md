# ngrok (Webhook Local)

Este projeto recebe webhooks do Asaas em `POST /api/billing/webhook`.

Para testar localmente, voce precisa expor seu backend (localhost) com uma URL publica HTTPS. A forma mais simples e usar ngrok.

## Passo a passo

1) Inicie o backend local (porta 3000 por padrao):

```bash
cd backend
npm run dev
```

2) Em outro terminal, suba o tunnel do ngrok apontando para a porta do backend:

```bash
ngrok http 3000
```

3) Copie a URL `Forwarding` (HTTPS) exibida pelo ngrok.

4) No painel do Asaas, configure o webhook para:

```
https://<seu-subdominio-ngrok>/api/billing/webhook
```

Dica: a UI local do ngrok normalmente fica em `http://127.0.0.1:4040` (lista requisicoes e a URL publica).

## Scripts

- Windows: `scripts/ngrok-asaas-webhook.bat [porta]`
- Linux/macOS: `scripts/ngrok-asaas-webhook.sh [porta]`

## Observacoes

- Se o ngrok pedir autenticacao, crie uma conta e adicione seu authtoken (comando `ngrok config add-authtoken ...`).
- Se voce trocar a porta do backend, passe a porta no comando (ex: `ngrok http 3001`).
