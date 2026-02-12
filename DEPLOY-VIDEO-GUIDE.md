# 📹 Guia em Vídeo - Deploy HelpDesk SaaS

## 🎬 Cena 1: MongoDB Atlas (2 min)

### Passo 1: Criar conta
1. Acesse **https://mongodb.com/atlas**
2. Clique em **"Try Free"**
3. Faça login com Google ou crie conta

### Passo 2: Criar Cluster
```
✓ Create Cluster (Free)
✓ Provider: Google Cloud
✓ Region: us-east-1 (mais barato)
✓ Create Cluster
```

### Passo 3: Criar Usuário
```
✓ Database Access → Add New User
✓ Username: helpdesk_admin
✓ Password: [GERE UMA SENHA FORTE]
✓ Atlas admin → Add User
```

### Passo 4: Liberar IP
```
✓ Network Access → Add IP Address
✓ Allow Access from Anywhere (0.0.0.0/0)
✓ Confirm
```

### Passo 5: Pegar string de conexão
```
✓ Clusters → Connect → Connect your application
✓ Copie: mongodb+srv://...
✓ Substitua <password> pela sua senha
✓ SALVE essa string!
```

---

## 🎬 Cena 2: Railway Backend (3 min)

### Passo 1: Criar projeto
1. Acesse **https://railway.app**
2. **"New Project"**
3. **"Deploy from GitHub repo"**
4. Selecione: `Ygormorais/helpdesk-saas`
5. **"Deploy Now"**

### Passo 2: Configurar variáveis
1. Clique na aba **"Variables"**
2. Adicione:

```
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://helpdesk_admin:SUA_SENHA@cluster0.xxxxx.mongodb.net/helpdesk?retryWrites=true&w=majority
JWT_SECRET=uma-string-segura-de-no-minimo-32-caracteres-aqui
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://seufrontend.vercel.app
```

3. Clique em **"Deploy"** (vai reiniciar)

### Passo 3: Verificar
```
✓ Settings → Domains
✓ Copie a URL: https://xxxxx.railway.app
✓ Teste: https://xxxxx.railway.app/health
✓ Deve retornar: {"status":"ok"}
```

---

## 🎬 Cena 3: Vercel Frontend (3 min)

### Passo 1: Criar projeto
1. Acesse **https://vercel.com**
2. **"Add New..."** → **"Project"**
3. Selecione: `Ygormorais/helpdesk-saas`
4. Configure:
   ```
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

### Passo 2: Variáveis de ambiente
1. Em **Environment Variables**, adicione:
   ```
   VITE_API_URL=https://seu-backend.railway.app/api
   ```

### Passo 3: Deploy
```
✓ Clique em "Deploy"
✓ Espere terminar (~2 min)
✓ Copie a URL: https://xxxxx.vercel.app
```

### Passo 4: Configurar rewrites
Crie arquivo `frontend/vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://SEU-BACKEND.railway.app/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🎬 Cena 4: Configurar Email (Mailgun) - Opcional

### Passo 1: Criar conta
1. Acesse **https://mailgun.com**
2. **"Start Free"**
3. Verifique email

### Passo 2: Configurar
```
✓ Sending → Domain Settings
✓ Copie credenciais SMTP:
  - SMTP Host: smtp.mailgun.org
  - SMTP Port: 587
  - Username: postmaster@seu-dominio.mailgun.org
  - Password: [cole aqui]
```

### Passo 3: Adicionar no Railway
```
✓ Variáveis:
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.mailgun.org
SMTP_PASS=sua-senha
```

---

## ✅ Checklist Final

- [ ] MongoDB Atlas configurado
- [ ] String de conexão salva
- [ ] Backend no Railway deployado
- [ ] Frontend no Vercel deployado
- [ ] Variáveis configuradas
- [ ] Health check funcionando
- [ ] URLs salvas

---

## 📝 Links Importantes

| Serviço | URL |
|---------|-----|
| MongoDB Atlas | https://mongodb.com/atlas |
| Railway | https://railway.app |
| Vercel | https://vercel.com |
| Mailgun | https://mailgun.com |

---

## 🎯 URLs do Seu Projeto (preencha)

```
Frontend:  https://_________________.vercel.app
Backend:   https://_________________.railway.app
API Docs:  https://_________________.railway.app/swagger.json
```

---

## 🚨 Problemas Comuns

### "MongoDB Connection Failed"
```
✓ IP não liberado → Network Access → Add 0.0.0.0/0
✓ String errada → Verifique senha na string
✓ Cluster pausado → MongoDB → Clusters → Resume
```

### "CORS Error"
```
✓ FRONTEND_URL errada no Railway
✓ Backend precisa da URL exata do Vercel
```

### "Build Failed"
```
✓ Verificar logs no Railway/Vercel
✓ Variáveis de ambiente faltando
✓ Dependências não instaladas
```

---

## 🎉 RESULTADO FINAL

```
🌐 SEU PROJETO NO AR!

Frontend:  https://helpdesk.yourname.vercel.app
Backend:   https://helpdesk-api.yourname.railway.app
GitHub:    https://github.com/Ygormorais/helpdesk-saas
```

**Compartilhe nas redes!** 🚀
