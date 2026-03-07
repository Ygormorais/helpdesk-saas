# Monitoring Guide - Helpdesk SaaS

## 1) Objetivo

Detectar indisponibilidade cedo e ter acao padrao para:

- backend fora do ar
- backend degradado (deps falhando)
- frontend indisponivel

## 2) Endpoints de monitoramento

- Backend liveness: `GET /health/live`
- Backend readiness: `GET /health`
- Frontend root: `GET /`

URLs atuais:

- Backend: `https://helpdesk-saas-production-0cd0.up.railway.app`
- Frontend: `https://helpdesk-two-livid.vercel.app`

## 3) Configuracao sugerida (UptimeRobot ou Better Stack)

Crie 3 checks HTTP:

1. `https://helpdesk-saas-production-0cd0.up.railway.app/health/live`
2. `https://helpdesk-saas-production-0cd0.up.railway.app/health`
3. `https://helpdesk-two-livid.vercel.app/`

Parametros sugeridos:

- Intervalo: 1 min (critico) ou 5 min (padrao)
- Timeout: 10s
- Confirmacoes antes de alertar: 2
- Canais: email + Telegram/Slack

## 4) Severidade e resposta

### P1 - indisponivel

Condicao:

- `/health/live` falha, ou frontend falha por mais de 2 checks seguidos.

Acao:

1. Verificar Railway Deploy Logs.
2. Verificar ultimo deploy e fazer rollback/redeploy se necessario.
3. Confirmar retorno de `/health/live`.

### P2 - degradado

Condicao:

- `/health` retorna `ready=false`.

Acao:

1. Ler `deps.mongo` e `deps.redis` no JSON.
2. Corrigir variavel/dependencia com falha.
3. Redeploy backend.

## 5) Comando operacional rapido

Windows:

```bash
scripts\prod-check.bat https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app
```

Linux/macOS:

```bash
scripts/prod-check.sh https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app
```

## 6) Escalonamento

- Se P1 durar > 15 min, abrir incidente formal e congelar novos deploys.
- Se P2 repetir mais de 3 vezes na semana, abrir tarefa de correcao definitiva.
