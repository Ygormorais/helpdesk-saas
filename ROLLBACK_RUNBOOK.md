# Rollback Runbook - Helpdesk SaaS

## 1) Quando fazer rollback

Faca rollback quando houver regressao clara introduzida por deploy recente e a correcao nao puder ser aplicada com seguranca em poucos minutos.

Sinais tipicos:

- `Synthetic Health Check` falhando apos merge/deploy
- `GET /health/live` indisponivel
- `GET /health` com `ready=false` apos deploy
- login ou fluxo principal quebrado apos deploy
- aumento anormal de erro 5xx ou latencia em producao

Priorize rollback em P1. Em P2, compare rollback versus hotfix pelo menor tempo de recuperacao.

## 2) Decisao rapida

1. Confirmar impacto real:
   - `GET /health/live`
   - `GET /health`
   - `GET /health/version`
   - frontend `/`
   - smoke funcional autenticado
2. Confirmar se a falha comecou apos o ultimo deploy.
3. Identificar ultimo commit saudavel:
   - `health/version`
   - ultimo workflow verde em `master`
   - ultimo deploy saudavel no Railway/Vercel
4. Se o problema estiver no backend, faça rollback do backend primeiro.
5. Se o problema estiver no frontend, faça rollback do frontend.
6. Se a causa estiver indefinida e o deploy mudou ambos, reverta os dois.

## 3) Rollback do backend (Railway)

Objetivo: voltar para o ultimo deploy saudavel conhecido.

Passos:

1. Railway -> servico backend -> `Deployments`.
2. Localize o ultimo deployment saudavel anterior ao incidente.
3. Use a opcao `Redeploy` nesse deployment anterior.
4. Aguarde o healthcheck do Railway concluir.
5. Valide:
   - `GET /health/live`
   - `GET /health`
   - `GET /health/version`
   - `scripts/prod-check.*`
   - `scripts/smoke-auth.*`

Se o problema estiver ligado a variaveis:

1. Compare variaveis do deploy atual com o deploy saudavel.
2. Restaure apenas as variaveis alteradas.
3. Faça redeploy.

## 4) Rollback do frontend (Vercel)

Objetivo: promover o ultimo build saudavel conhecido.

Passos:

1. Vercel -> projeto frontend -> `Deployments`.
2. Encontre o ultimo deployment saudavel anterior ao incidente.
3. Use `Promote to Production` ou `Redeploy`, conforme a opcao exibida.
4. Valide:
   - frontend `/`
   - login
   - carregamento inicial
   - chamadas API criticas no navegador

Se o problema estiver em variaveis do frontend:

1. Revise `VITE_API_URL` e demais envs.
2. Restaure valor anterior.
3. Faça novo deploy.

## 5) Validacao obrigatoria apos rollback

Backend:

- `GET /health/live` retorna `status=ok`
- `GET /health` retorna `ready=true`
- `GET /health/version` retorna `commitSha` esperado

Smoke:

- `scripts/prod-check.sh <backend> <frontend>`
- `scripts/smoke-auth.sh <backend> <email> <password> <frontend>`

Smoke Windows:

- `scripts\prod-check.bat <backend> <frontend>`
- `scripts\smoke-auth.bat <backend> <email> <password> <frontend>`

Aplicacao:

- login funciona
- rota principal carrega
- fluxo principal do produto executa sem erro

## 6) Registro do incidente

Apos estabilizar:

1. Atualize ou feche a issue automatica de incidente.
2. Abra postmortem usando `.github/ISSUE_TEMPLATE/postmortem.md` se o impacto justificar.
3. Registre:
   - commit com problema
   - commit restaurado
   - horario de inicio e fim
   - causa raiz
   - acao preventiva

## 7) Prevenir repeticao

Depois do rollback:

1. Reproduza a falha em ambiente controlado.
2. Crie hotfix via PR.
3. Rode CI, synthetic health e smoke autenticado.
4. Reimplante apenas quando o build candidato estiver validado.
