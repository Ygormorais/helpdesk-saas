# HelpDesk SaaS

Sistema SaaS de Help Desk multi-tenancy para gestão de atendimento ao cliente, construído com stack MERN.

## 🚀 Funcionalidades

### Módulo de Tickets
- Criação e gerenciamento de tickets
- Categorias e prioridades
- Status workflow (Aberto → Em Andamento → Resolvido → Fechado)
- SLA (Service Level Agreement)
- Anexos e comentários
- Filtros e busca avançada

### Base de Conhecimento
- Artigos publicados
- Busca por texto
- Categorização
- Feedback de utilidade
- Artigos relacionados

### Dashboard & Relatórios
- Métricas em tempo real
- Gráficos de tickets por status/prioridade/categoria
- Tendência temporal
- Top agentes
- Compliance SLA
- Satisfação do cliente

### Autenticação & Autorização
- JWT Authentication
- Roles: Admin, Manager, Agent, Client
- Multi-tenancy (empresas isoladas)

## 🛠 Tech Stack

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Redis (cache)
- Socket.io (tempo real)
- JWT + Bcrypt

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI + shadcn/ui
- TanStack Query
- Recharts
- React Hook Form + Zod

### DevOps
- Docker + Docker Compose
- GitHub Actions
- Railway / Render / Vercel

## 🔒 Security / npm audit

- Para checar dependencias de producao (ignorando toolchain de dev como ESLint), use:
  - `cd backend && npm run audit:prod`
  - `cd frontend && npm run audit:prod`
- `npm audit` no frontend pode reportar vulnerabilidades em dependencias de desenvolvimento (ESLint/@eslint/*) sem fix semver-safe ate a toolchain suportar ESLint 10.

## 📦 Instalação

### Pré-requisitos
- Node.js 20+
- MongoDB
- Redis (opcional)

### Configuração

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/helpdesk-saas.git
cd helpdesk-saas

# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
npm install
```

Se o backend estiver rodando em outra porta/URL no modo dev, ajuste o proxy do Vite em `frontend/.env.development`:

```env
VITE_PROXY_TARGET=http://localhost:3000
```

### Variáveis de Ambiente (Backend)

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/helpdesk
JWT_SECRET=sua-chave-secreta
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173

# Billing (Asaas)
ASAAS_API_KEY=
ASAAS_WEBHOOK_SECRET=

# Platform admin (optional)
PLATFORM_ADMIN_EMAILS=admin@exemplo.com

# Billing reminders (optional)
BILLING_REMINDERS_ENABLED=false
```

### Variáveis de Ambiente (Frontend)

```env
VITE_API_URL=/api
# ou, se estiver chamando um backend externo:
# VITE_BACKEND_URL=https://seu-backend.com
```

## 💳 Billing (Asaas)

- Webhook: configure no painel do Asaas para apontar para `POST /api/billing/webhook`
- Header de seguranca (opcional): se `ASAAS_WEBHOOK_SECRET` estiver definido, o backend valida o header `asaas-access-token`

### Testar webhook local (ngrok)

Para testar o webhook do Asaas apontando para sua maquina (localhost), use ngrok para expor o backend com HTTPS.

- Guia rapido: `NGROK.md`

### Smoke test (cobranca)

1) Crie um tenant e entre como admin/manager
2) Va em `Planos` e faca checkout de um plano pago
3) Confirme que o Asaas chama o webhook e que o tenant passa a ter acesso liberado (ex: `Relatorios`)
4) Se o webhook falhar, use `Planos > Sincronizar` (chama `POST /api/billing/sync`) para puxar status/periodo do Asaas
5) Teste troca de plano em `Planos` (upgrade imediato, downgrade agendado para o fim do ciclo)

## 🚀 Executando

```bash
# Backend (development com hot reload)
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

Acesse:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🐳 Docker

```bash
# Executar todos os serviços (build de imagens)
docker compose up -d --build

# Parar serviços
docker compose down
```

### Modo Dev (hot reload)

```bash
docker compose -f docker-compose.dev.yml up
```

## 🩺 Health & Metrics

- Liveness: `GET /health/live` (sempre 200)
- Readiness: `GET /health` (200 quando deps ok, 503 quando degradado)
- API health (para o frontend/dev proxy): `GET /api/health` e `GET /api/health/live`
- Metrics (admin/manager): `GET /api/metrics` (contadores e percentis basicos, in-memory)
- Prometheus: `GET /api/metrics?format=prom` (text/plain)

### Logs

- `LOG_LEVEL=debug|info|warn|error|silent` (default: info)
- `LOG_HTTP_SUCCESS=false` para nao logar requests 2xx/3xx (default: true)

### Redis

- Se `REDIS_URL` estiver definido em producao, rate limiting e metrics passam a usar Redis (sobrevive a restart)

## 📁 Estrutura

```
helpdesk-saas/
├── backend/
│   ├── src/
│   │   ├── config/       # Configurações
│   │   ├── controllers/  # Controladores
│   │   ├── middlewares/   # Middlewares
│   │   ├── models/       # Models Mongoose
│   │   ├── routes/       # Rotas
│   │   └── index.ts      # Entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas
│   │   ├── contexts/    # Contextos React
│   │   ├── config/     # Configurações
│   │   └── types/      # Tipos TypeScript
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 📊 API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Perfil atual

### Tickets
- `GET /api/tickets` - Listar tickets
- `POST /api/tickets` - Criar ticket
- `GET /api/tickets/:id` - Detalhe ticket
- `PUT /api/tickets/:id` - Atualizar ticket
- `POST /api/tickets/:id/comments` - Adicionar comentário

### Categorias
- `GET /api/categories` - Listar
- `POST /api/categories` - Criar
- `PUT /api/categories/:id` - Atualizar
- `DELETE /api/categories/:id` - Deletar

### Artigos
- `GET /api/articles` - Listar artigos
- `GET /api/articles/public` - Artigos públicos
- `POST /api/articles` - Criar artigo
- `PUT /api/articles/:id` - Atualizar
- `POST /api/articles/:id/vote` - Votar

### Analytics
- `GET /api/analytics/dashboard` - Stats dashboard
- `GET /api/analytics/tickets-by-status` - Por status
- `GET /api/analytics/tickets-by-priority` - Por prioridade
- `GET /api/analytics/tickets-trend` - Tendência
- `GET /api/analytics/top-agents` - Top agentes
- `GET /api/analytics/sla-compliance` - Compliance SLA
- `GET /api/analytics/satisfaction` - Satisfação

## 🎨 Screenshots

[Adicione screenshots do projeto]

## 📝 Licença

MIT License

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
