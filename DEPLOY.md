# 🚀 Guia de Deploy - HelpDesk SaaS

Este guia passo a passo vai te ajudar a colocar seu projeto em produção.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Banco de Dados (MongoDB Atlas)](#banco-de-dados-mongodb-atlas)
3. [Backend (Railway)](#backend-railway)
4. [Frontend (Vercel)](#frontend-vercel)
5. [Email (Mailgun/SendGrid)](#email-mailgunsendgrid)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Custom Domain](#custom-domain)
8. [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

- [GitHub](https://github.com) account
- [Railway](https://railway.app) account (backend)
- [Vercel](https://vercel.com) account (frontend)
- [MongoDB Atlas](https://mongodb.com/atlas) (banco de dados)

---

## Banco de Dados (MongoDB Atlas)

### Passo 1: Criar conta e cluster

1. Acesse [MongoDB Atlas](https://mongodb.com/atlas)
2. Clique em "Create Free Cluster"
3. Escolha:
   - **Provider**: Google Cloud ou AWS (qualquer um)
   - **Region**: us-east-1 (mais econômico) ou sa-east-1 (São Paulo)
4. Clique em "Create Cluster"

### Passo 2: Configurar acesso

1. No menu lateral, clique em **Database Access**
2. Clique em "Add New Database User"
3. Preencha:
   - **Username**: helpdesk_admin
   - **Password**: Generate strong password e salve!
4. **Database User Privileges**: Atlas admin
5. Clique em "Add User"

### Passo 3: Configurar rede

1. Clique em **Network Access**
2. Clique em "Add IP Address"
3. Selecione "Allow Access from Anywhere" (0.0.0.0/0)
4. Clique em "Confirm"

### Passo 4: Obter string de conexão

1. Clique em **Clusters** → "Connect" → "Connect your application"
2. Copie a string de conexão:
   ```
   mongodb+srv://helpdesk_admin:<password>@cluster0.xxxxx.mongodb.net/helpdesk?retryWrites=true&w=majority
   ```
3. Substitua `<password>` pela senha que você salvou

---

## Backend (Railway)

### Passo 1: Criar projeto

1. Acesse [Railway](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha seu repositório (selecione apenas a pasta `backend` se necessário)
5. Clique em "Deploy Now"

### Passo 2: Configurar variáveis de ambiente

1. No painel do Railway, clique na aba **Variables**
2. Adicione as seguintes variáveis:

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://helpdesk_admin:SUA_SENHA@cluster0.xxxxx.mongodb.net/helpdesk?retryWrites=true&w=majority
JWT_SECRET=uma-string-super-segura-de-no-minimo-32-caracteres
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://seu-frontend.vercel.app
```

3. Clique em "Deploy" para reiniciar o serviço

### Passo 3: Verificar deploy

1. Após o deploy, clique em **Deployments**
2. Verifique se o status está como "Deployed"
3. Clique no link em "Domains" para testar
4. Deve retornar: `{"message":"Welcome to HelpDesk API"}`

### Passo 4: Obter URL do backend

A URL será algo como: `https://helpdesk-backend.up.railway.app`

Guarde essa URL para usar no frontend!

---

## Frontend (Vercel)

### Passo 1: Criar projeto

1. Acesse [Vercel](https://vercel.com)
2. Clique em "Add New..." → "Project"
3. Selecione seu repositório GitHub
4. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Passo 2: Configurar variáveis de ambiente

1. Na tela de configuração, clique em "Environment Variables"
2. Adicione:

```env
VITE_API_URL=https://helpdesk-backend.up.railway.app/api
```

3. Clique em "Deploy"

### Passo 3: Configurar rewrites (importante!)

Use o `frontend/vercel.json` que já está no repositório (fallback SPA para `index.html`).
Para API e Socket.IO em produção, configure `VITE_API_URL` (e opcionalmente `VITE_SOCKET_URL`) com a URL pública do backend.

### Passo 4: Atualizar configuração do Vercel

1. No painel do Vercel, vá em **Settings** → **Environment Variables**
2. Confirme que `VITE_API_URL` aponta para seu backend (ex: `https://seu-backend.railway.app/api`)
3. Se necessário, adicione `VITE_SOCKET_URL` (ex: `https://seu-backend.railway.app`)

---

## Email (Mailgun/SendGrid)

### Opção 1: Mailgun (Recomendado para início)

1. Acesse [Mailgun](https://mailgun.com)
2. Crie conta gratuita (10,000 emails/mês)
3. Verifique seu domínio ou use o sandbox
4. Em "Sending" → "Domain Settings", copie:
   - SMTP Host: `smtp.mailgun.org`
   - SMTP Port: `587`
   - Username: `postmaster@seu-dominio.mailgun.org`
   - Password: Clique em "Show" para ver

### Opção 2: SendGrid (Twilio)

1. Acesse [SendGrid](https://sendgrid.com)
2. Crie conta gratuita (100 emails/dia)
3. Crie API Key
4. Configure SMTP relay

### Configurar no Railway

No Railway, adicione:

```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-smtp
```

---

## Variáveis de Ambiente Completa

### Backend (.env)

```env
# ==========================================
# PRODUCTION - Backend
# ==========================================

# Server
NODE_ENV=production
PORT=3000

# MongoDB (MongoDB Atlas)
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/helpdesk?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=uma-string-segura-de-32-ou-mais-caracteres-aqui
JWT_EXPIRES_IN=7d

# Frontend URL (for CORS)
FRONTEND_URL=https://seu-projeto.vercel.app

# Email (Mailgun/SendGrid)
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha-smtp

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=helpdesk-uploads
AWS_REGION=us-east-1
```

### Frontend (.env.production)

```env
# ==========================================
# PRODUCTION - Frontend
# ==========================================

VITE_API_URL=https://seu-backend.railway.app/api
VITE_SOCKET_URL=https://seu-backend.railway.app
```

---

## Custom Domain

### Backend (Railway)

1. No Railway, vá em **Settings** → **Domains**
2. Clique em "Add Domain"
3. Digite: `api.seudominio.com`
4. No seu registrar (GoDaddy, Namecheap, etc.):
   - Crie um registro CNAME
   - Name: `api`
   - Value: `your-app.up.railway.app`
   - TTL: 5 minutos

### Frontend (Vercel)

1. No Vercel, vá em **Settings** → **Domains**
2. Clique em "Add Domain"
3. Digite: `helpdesk.seudominio.com`
4. No seu registrar:
   - Crie um registro CNAME ou ALIAS
   - Value: `cname.vercel-dns.com` ou `vercel.com`

---

## Troubleshooting

### CORS Error

```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solução:** Verifique se `FRONTEND_URL` está configurado corretamente no backend.

### MongoDB Connection Failed

```
MongooseServerSelectionError: Could not connect to any servers
```

**Solução:**
1. Verifique se o IP está liberado no MongoDB Atlas
2. Verifique se a string de conexão está correta
3. Verifique se a senha não contém caracteres especiais

### Emails não funcionando

1. Verifique credenciais SMTP
2. Verifique se o domínio está verificado (sandbox tem limite)
3. Verifique pasta de spam

### Build falhando

1. Verifique logs no Railway/Vercel
2. Certifique-se de que todas as dependências estão no `package.json`
3. Verifique versão do Node.js (use 20.x)

### Sessão expirando

1. Aumente `JWT_EXPIRES_IN` se necessário
2. Verifique `SESSION_TIMEOUT` nas configurações

---

## 📊 Arquitetura Final

```
                    ┌─────────────────┐
                    │   Vercel        │
                    │   Frontend      │
                    │   (React)       │
                    └────────┬────────┘
                             │
                             │ HTTPS
                             ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MongoDB       │    │   Railway       │    │   Mailgun       │
│   Atlas         │    │   Backend       │    │   (Email)       │
│   (Database)    │    │   (Node.js)     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## ✅ Checklist de Deploy

- [ ] MongoDB Atlas configurado
- [ ] Cluster criado
- [ ] Usuário criado
- [ ] IP liberado
- [ ] String de conexão copiada
- [ ] Backend deployado no Railway
- [ ] Variáveis de ambiente configuradas
- [ ] Backend funcionando (health check)
- [ ] Frontend deployado no Vercel
- [ ] API URL configurada
- [ ] Rewrites configuradas
- [ ] Emails funcionando (opcional)
- [ ] Custom domain configurado (opcional)
- [ ] SSL funcionando
- [ ] Smoke test executado (`scripts/smoke-deploy.sh <backend_url> <frontend_url>` ou `scripts\smoke-deploy.bat <backend_url> <frontend_url>`)

---

## 🎉 Parabéns!

Seu HelpDesk SaaS está no ar! 

**URLs de exemplo:**
- Frontend: https://helpdesk.vercel.app
- Backend API: https://api.helpdesk.railway.app
- API Docs: https://api.helpdesk.railway.app/swagger.json

**Próximos passos:**
1. Teste todas as funcionalidades
2. Configure custom domain
3. Configure email profissional
4. Adicione monitoramento (New Relic, DataDog)
5. Configure backup do banco de dados
