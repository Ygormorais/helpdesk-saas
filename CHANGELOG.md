# Changelog

## v1.0.0-prod-stable - 2026-03-07

Baseline estavel de producao para o Helpdesk SaaS.

### Added

- Root `Dockerfile` e `.dockerignore` para deploy consistente no Railway (monorepo).
- Scripts de verificacao pos-deploy:
  - `scripts/smoke-deploy.bat`
  - `scripts/smoke-deploy.sh`
  - `scripts/prod-check.bat`
  - `scripts/prod-check.sh`
- Documentacao operacional:
  - `RUNBOOK_PROD.md`
  - `MONITORING.md`
  - `RELEASE_CHECKLIST.md`
- Endpoint de versao:
  - `GET /health/version` com `commitSha`, `nodeEnv`, `uptimeSeconds` e `timestamp`.

### Changed

- Health/readiness:
  - Ajuste do check de Redis para usar cliente autenticado (elimina falso negativo quando Redis exige auth).
- Seguranca de autenticacao:
  - Suporte a rotacao de JWT sem downtime via `JWT_SECRET_PREVIOUS`.
- Seguranca de CORS:
  - Suporte a `CORS_ALLOWED_ORIGINS` (lista CSV), com compatibilidade por `FRONTEND_URL`.
- Validacao de configuracao em producao:
  - Bloqueio de startup se `JWT_SECRET` for fraco/padrao.
  - Bloqueio de startup se `FRONTEND_URL`/`CORS_ALLOWED_ORIGINS` usarem `localhost` ou `http`.
- Rate limit com Redis:
  - Correcao para nao reutilizar a mesma instancia de store entre limiters (`ERR_ERL_STORE_REUSE`).

### Deployment status

- Backend Railway: saudavel (`/health` com `ready=true`).
- Frontend Vercel: operacional.
