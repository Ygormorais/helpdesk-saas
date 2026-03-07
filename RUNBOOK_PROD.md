# RUNBOOK Production - Helpdesk SaaS

## 1) Ambientes e URLs

- Backend (Railway): `https://helpdesk-saas-production-0cd0.up.railway.app`
- Frontend (Vercel): `https://helpdesk-two-livid.vercel.app`

## 2) Variaveis obrigatorias (Backend)

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_SECRET_PREVIOUS` (opcional, para rotacao sem downtime)
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS` (opcional, lista separada por virgula)
- `REDIS_URL`
- `NODE_ENV=production`

## 3) Health checks

- Liveness: `GET /health/live`
- Readiness: `GET /health`

Exemplo:

```bash
curl https://helpdesk-saas-production-0cd0.up.railway.app/health/live
curl https://helpdesk-saas-production-0cd0.up.railway.app/health
```

Saude esperada:

- `status = "ok"`
- `ready = true`
- `deps.mongo.connected = true`
- `deps.redis.configured = true`
- `deps.redis.ok = true`

## 4) Smoke test pos-deploy

Windows:

```bash
scripts\smoke-deploy.bat https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app
```

Linux/macOS:

```bash
scripts/smoke-deploy.sh https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app
```

## 5) Deploy seguro (resumo)

1. Confirmar variaveis no Railway e Vercel.
2. Deploy backend (Railway).
3. Validar `/health/live` e `/health`.
4. Deploy frontend (Vercel).
5. Rodar smoke test.
6. Validar fluxo funcional: login, criar ticket, comentar e fechar ticket.

## 6) Incidentes comuns

### 6.1 `ready=false` e `mongo.connected=false`

- Verificar `MONGODB_URI` no Railway.
- Verificar usuario/senha no Atlas.
- Verificar Network Access no Atlas (IP allowlist).

### 6.2 `ready=false` e `redis.configured=true`, `redis.ok=false`

- Verificar `REDIS_URL` no backend.
- Preferir referencia privada (`Redis.REDIS_URL`) ao inves de endpoint publico.
- Fazer redeploy do backend.

### 6.3 Healthcheck do Railway falhando no deploy

- `Settings -> Deploy`:
  - `Healthcheck Path`: `/health/live`
- `Settings -> Networking`:
  - dominio apontando para porta correta do app.

### 6.4 Frontend sobe mas API falha

- Verificar `VITE_API_URL` no Vercel:
  - `https://helpdesk-saas-production-0cd0.up.railway.app/api`
- Fazer redeploy do frontend.

## 7) Rotina operacional

Diario:

- Verificar `/health`.
- Conferir ultimo deploy e logs de erro.

Semanal:

- Revisar erros 5xx no backend.
- Validar fluxo de login e abertura de ticket.

Mensal:

- Testar restore de backup no Atlas (ambiente de teste).
- Rotacionar segredos criticos (`JWT_SECRET` e credenciais DB), se aplicavel.

## 8) Checklist de hardening

- `FRONTEND_URL` em producao (sem localhost).
- `CORS_ALLOWED_ORIGINS` revisado (somente dominios confiaveis).
- `JWT_SECRET` com alta entropia e armazenado em cofre.
- `JWT_SECRET_PREVIOUS` definido somente durante janela de rotacao.
- Usuario Mongo com menor privilegio necessario.
- Redis privado.
- Alertas de uptime para `/health/live` e `/health`.
- Observacao: o backend agora bloqueia startup em `NODE_ENV=production` se detectar `JWT_SECRET` fraco/padrao ou origens CORS inseguras.

## 9) Monitoramento continuo

- Guia completo: `MONITORING.md`
- Check operacional diario (rapido):
  - Windows: `scripts\prod-check.bat https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app`
  - Linux/macOS: `scripts/prod-check.sh https://helpdesk-saas-production-0cd0.up.railway.app https://helpdesk-two-livid.vercel.app`
