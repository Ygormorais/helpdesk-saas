# 🚀 Comandos Rápidos de Deploy

## Preparação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/helpdesk-saas.git
cd helpdesk-saas

# Entre na pasta backend
cd backend

# Instale dependências
npm install

# Volte e entre na pasta frontend
cd ../frontend

# Instale dependências
npm install
```

## Deploy Backend (Railway)

### Opção 1: Via CLI

```bash
# Instale Railway CLI
npm i -g @railway/cli

# Faça login
railway login

# Inicialize o projeto
railway init

# Configure variáveis de ambiente
railway variables set MONGODB_URI="sua-string-mongodb"
railway variables set JWT_SECRET="sua-chave-secreta"
railway variables set FRONTEND_URL="https://seu-frontend.vercel.app"

# Deploy
railway up
```

### Opção 2: Via GitHub

1. Acesse https://railway.app
2. Clique em "New Project" → "Deploy from GitHub repo"
3. Selecione seu repositório
4. Configure variáveis de ambiente
5. Clique em "Deploy"

## Deploy Frontend (Vercel)

### Opção 1: Via CLI

```bash
# Instale Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy (siga as instruções)
vercel
```

### Opção 2: Via GitHub

1. Acesse https://vercel.com
2. Clique em "Add New..." → "Project"
3. Selecione seu repositório GitHub
4. Configure:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Em Environment Variables, adicione:
   - `VITE_API_URL=https://seu-backend.railway.app/api`
6. Clique em "Deploy"

## Configurar Domínio Personalizado

### Backend (Railway)

```bash
railway domain add api.seudominio.com
```

### Frontend (Vercel)

```bash
vercel domains add helpdesk.seudominio.com
```

## Verificar Status

```bash
# Backend
curl https://seu-backend.railway.app/health

# Deve retornar: {"status":"ok"}

# Frontend
curl https://seu-frontend.vercel.app

# Deve retornar a página inicial
```

## Logs

```bash
# Backend logs
railway logs

# Frontend logs
vercel logs
```

## Variáveis de Ambiente

### Backend (Railway)

```bash
railway variables set NODE_ENV=production
railway variables set MONGODB_URI="mongodb+srv://..."
railway variables set JWT_SECRET="sua-chave-secreta"
railway variables set JWT_EXPIRES_IN=7d
railway variables set FRONTEND_URL="https://..."
railway variables set SMTP_HOST="smtp.mailgun.org"
railway variables set SMTP_PORT=587
railway variables set SMTP_USER="postmaster@..."
railway variables set SMTP_PASS="..."
```

### Frontend (Vercel)

```bash
vercel env add VITE_API_URL production
# Digite: https://seu-backend.railway.app/api
```

## Rollback (se algo der errado)

```bash
# Railway
railway rollback

# Vercel
vercel rollback
```

## Comandos Úteis

```bash
# Restart do backend
railway restart

# Rebuild do frontend
cd frontend
npm run build
vercel --prod

# Verificar variáveis
railway variables

# Tunnel para testes locais
railway up --detach
```
