## Summary
- Implemented advanced Reports deck: CSV exports for Tickets, Status, SLA, and Top Agents; presets for date ranges; API integration with mocks; richer dashboards; tests and CI scaffolding.

## Changes
- Backend
  - analyticsRoutes.js (expose /api/analytics/reports)
  - seed.js (povoar dados, com ajustes para MongoDB v4+)
  - create-test-admin.js (admin de teste)
  - backend/test/analytics.test.ts
- Frontend
  - ReportsPage.tsx (presets, CSV exports, SLA, agents, etc.)
  - utils/csv.ts (helpers CSV)
  - frontend/tests/csv.test.ts
  - logos de clientes fictícios (ainda placeholder)
  - client carousel (com logos)
- CI/CD
  - .github/workflows/ci.yml
- Dados de demonstração
  - frontend/src/data/clients.json
- Setup de ambiente
  - scripts/setup-dev.sh
  - scripts/setup-dev.bat

## How to test
1) Iniciar ambientes (Docker Desktop): docker-compose up -d
2) Seed + admin (no container backend):
   docker exec -i helpdesk-backend node /app/scripts/seed.js
   docker exec -i helpdesk-backend node /app/scripts/create-test-admin.js
3) Acessar: http://localhost:5173/login
   - Email: admin@deskflow.test
   - Senha: admin
4) Acessar relatórios: http://localhost:5173/reports
   - Testar export CSV para Tickets, Status, SLA e Agentes
5) Executar unit tests:
   - Backend: cd backend && npm test
   - Frontend: cd frontend && npm test

## Next steps
- Adicionar mais dashboards (SLA trend, tempo de resolução por agente, etc.).
- Integrar com um pipeline de deploy (Railway/Vercel) se desejado.
- Melhorar a validação de dados e adicionar testes E2E.
