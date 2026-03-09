# Monitoring Guide - Helpdesk SaaS

## 1) Objetivo

Detectar indisponibilidade cedo e ter acao padrao para:

- backend fora do ar
- backend degradado (deps falhando)
- frontend indisponivel

## 2) Endpoints de monitoramento

- Backend liveness: `GET /health/live`
- Backend readiness: `GET /health`
- Backend version/build: `GET /health/version`
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

## 3.1 Monitoramento automatico via GitHub Actions

Workflow: `.github/workflows/synthetic-health-check.yml`

- Gatilhos:
  - a cada 1 hora (`cron: 0 * * * *`)
  - a cada merge/push em `master`
  - manual (`workflow_dispatch`)
- Checks executados:
  - `GET /health/live`
  - `GET /health`
  - `GET /health/version`
  - `GET /` (frontend)
- Script usado: `scripts/synthetic-health-check.mjs`
- Thresholds de latencia (workflow atual):
  - Backend: `SYNTHETIC_MAX_BACKEND_LATENCY_MS` (default `4000`)
  - Frontend: `SYNTHETIC_MAX_FRONTEND_LATENCY_MS` (default `6000`)
- Retry anti-flake (workflow atual):
  - `SYNTHETIC_HEALTHCHECK_RETRIES` (default `2`)
  - `SYNTHETIC_HEALTHCHECK_RETRY_DELAY_MS` (default `1500`)
- Timeout:
  - `SYNTHETIC_HEALTHCHECK_TIMEOUT_MS` (default `10000`)
- Automacao de incidente:
  - Em falha: abre/atualiza issue `[Incident] Synthetic Health Check failure`
  - Em recuperacao: comenta e fecha a issue automaticamente
  - Opcional: envia alerta para webhook externo (`slack` ou `discord`)
  - Classificacao automatica: `P1` para indisponibilidade, `P2` para degradacao/latencia

Uso manual:

1. GitHub -> Actions -> `Synthetic Health Check`
2. `Run workflow`
3. Validar log final com `status: "ok"`
4. Se falhar por latencia, revisar Railway/Vercel e picos de resposta.
5. Ver `Job Summary` e artefato `synthetic-health-result` para detalhes de latencia/tentativas.

Configuracao recomendada em `GitHub -> Settings -> Secrets and variables -> Actions -> Variables`:

- `PROD_BACKEND_URL`
- `PROD_FRONTEND_URL`
- `SYNTHETIC_HEALTHCHECK_TIMEOUT_MS`
- `SYNTHETIC_HEALTHCHECK_RETRIES`
- `SYNTHETIC_HEALTHCHECK_RETRY_DELAY_MS`
- `SYNTHETIC_MAX_BACKEND_LATENCY_MS`
- `SYNTHETIC_MAX_FRONTEND_LATENCY_MS`
- `INCIDENT_WEBHOOK_PROVIDER` (`slack` ou `discord`, default `slack`)

Configuracao recomendada em `GitHub -> Settings -> Secrets and variables -> Actions -> Secrets`:

- `INCIDENT_WEBHOOK_URL`
- `SMOKE_TEST_EMAIL`
- `SMOKE_TEST_PASSWORD`

## 3.2 Smoke funcional autenticado

Workflow: `.github/workflows/auth-smoke-check.yml`

- Gatilhos:
  - a cada merge/push em `master`
  - manual (`workflow_dispatch`)
- Script usado:
  - Node: `scripts/auth-smoke-check.mjs`
  - Linux/macOS: `scripts/smoke-auth.sh`
  - Windows: `scripts\smoke-auth.bat`
- Checks executados:
  - frontend `/` (opcional)
  - `POST /api/auth/login`
  - validacao do `token`
  - `GET /api/auth/me`
  - `GET /health/version`
- Secrets exigidos:
  - `SMOKE_TEST_EMAIL`
  - `SMOKE_TEST_PASSWORD`
- Se os secrets nao estiverem configurados, o workflow fecha como `skipped` e nao abre incidente.
- Em falha funcional real:
  - abre/atualiza issue `[Incident] Auth Smoke Check failure`
  - publica `Job Summary`
  - salva artefato `auth-smoke-result`
  - opcionalmente envia webhook externo usando `INCIDENT_WEBHOOK_URL`

Uso manual:

```bash
scripts/smoke-auth.sh https://helpdesk-saas-production-0cd0.up.railway.app smoke@example.com sua-senha https://helpdesk-two-livid.vercel.app
scripts\smoke-auth.bat https://helpdesk-saas-production-0cd0.up.railway.app smoke@example.com sua-senha https://helpdesk-two-livid.vercel.app
```

## 4) Severidade e resposta

### P1 - indisponivel

Condicao:

- `/health/live` falha, ou frontend falha por mais de 2 checks seguidos.
- smoke autenticado falha em login/`/api/auth/me` apos deploy.

Acao:

1. Verificar Railway Deploy Logs.
2. Verificar ultimo deploy e fazer rollback/redeploy se necessario.
3. Confirmar retorno de `/health/live`.
4. Rodar rollback conforme `ROLLBACK_RUNBOOK.md` se a falha vier do ultimo deploy.

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
- Se o smoke autenticado falhar em deploy novo, tratar como regressao funcional e bloquear promocao ate corrigir ou rollback.
