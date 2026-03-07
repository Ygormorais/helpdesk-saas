# Release Checklist - Helpdesk SaaS

## 1) Pre-release (codigo)

- [ ] `master` atualizado e sem conflitos pendentes.
- [ ] Build backend local: `cd backend && npm run build`.
- [ ] Testes backend locais: `cd backend && npm test`.
- [ ] Mudancas de seguranca revisadas (JWT, CORS, rate limit, health).
- [ ] Commit de release pronto e enviado para `origin/master`.

## 2) Pre-release (infra)

- [ ] Railway backend com variaveis obrigatorias:
  - `NODE_ENV=production`
  - `MONGODB_URI`
  - `JWT_SECRET` (>= 32 chars)
  - `FRONTEND_URL` (https, sem localhost)
  - `CORS_ALLOWED_ORIGINS` (https, dominios confiaveis)
  - `REDIS_URL`
- [ ] Vercel frontend com:
  - `VITE_API_URL` apontando para backend `/api`
  - `VITE_SOCKET_URL` apontando para backend (se usado)
- [ ] Monitores ativos (UptimeRobot/Better Stack):
  - `/health/live`
  - `/health`
  - frontend `/`

## 3) Deploy

- [ ] Confirmar deploy backend concluido no Railway.
- [ ] Confirmar deploy frontend concluido no Vercel.

## 4) Validacao pos-deploy (5 minutos)

- [ ] `GET /health/live` retorna `status=ok`.
- [ ] `GET /health` retorna `ready=true`.
- [ ] `GET /health/version` retorna `commitSha` esperado.
- [ ] Login funciona no frontend.
- [ ] Fluxo basico testado: criar chamado, comentar e fechar.
- [ ] Sem erros criticos nos logs de deploy/runtime.

## 5) Encerramento da release

- [ ] Criar tag de release (ex: `v1.0.0-prod-stable`).
- [ ] Atualizar changelog/resumo de release (PR ou issue).
- [ ] Confirmar alertas e contatos de on-call.

## 6) Rotina mensal (operacao)

- [ ] Testar restore de backup Mongo em ambiente de teste.
- [ ] Rotacionar segredos criticos (JWT e DB), quando aplicavel.
- [ ] Revisar dominios em `CORS_ALLOWED_ORIGINS`.
- [ ] Revisar erros 5xx e latencia do backend.
