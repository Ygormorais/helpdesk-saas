# 🚀 Rodando DeskFlow Localmente

## Pré-requisitos

1. **Node.js 20+** - [Download](https://nodejs.org)
2. **MongoDB** - Uma das opções:
   - Instalar localmente: [MongoDB Community](https://www.mongodb.com/try/download/community)
   - Usar MongoDB Atlas (gratuito): [Criar conta](https://www.mongodb.com/atlas)

## ⚡ Início Rápido (Windows)

### Opção 1: Script Automático
```bash
# No terminal (Prompt de Comando ou PowerShell)
start-local.bat
```

### Opção 2: Manualmente

**Terminal 1 - Backend:**
```bash
cd backend
npm install        # Apenas primeira vez
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install        # Apenas primeira vez
npm run dev
```

## 🌐 Acessando o Sistema

Após iniciar, acesse:

- **Landing Page**: http://localhost:5173
- **Login**: http://localhost:5173/login
- **Dashboard**: http://localhost:5173/dashboard
- **API Backend**: http://localhost:3000

## 🔧 Configuração

### MongoDB Local
Se estiver usando MongoDB local, certifique-se de que está rodando:
```bash
# Windows (como Administrador)
net start MongoDB

# Ou via Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### MongoDB Atlas (Cloud - Gratuito)
1. Crie conta em https://mongodb.com/atlas
2. Crie um cluster gratuito
3. Obtenha a string de conexão
4. Cole em `backend/.env`:
```
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/deskflow
```

## 🧪 Testando

1. Acesse http://localhost:5173
2. Clique em "Começar Grátis"
3. Crie uma conta de teste
4. Explore o dashboard!

## 🐛 Problemas Comuns

### "Cannot find module"
```bash
# Reinstale as dependências
cd backend && npm install
cd ../frontend && npm install
```

### "MongoNetworkError"
- Verifique se o MongoDB está rodando
- Ou use MongoDB Atlas (mais fácil para testes)

### Porta 3000 ou 5173 em uso
```bash
# Backend - use outra porta
PORT=3001 npm run dev

# Frontend - já usa porta automática
```

## 📁 Estrutura de Arquivos

```
deskflow-saas/
├── backend/           # API Node.js
│   ├── src/
│   ├── .env          # Configurações (criado automaticamente)
│   └── package.json
├── frontend/          # React App
│   ├── src/
│   ├── .env          # Configurações (criado automaticamente)
│   └── package.json
└── start-local.bat   # Script Windows
```

## 🎨 O Que Você Vai Ver

### Landing Page
- Hero section com CTA
- Features destacadas
- Depoimentos
- Tabela de preços
- FAQ

### Dashboard
- Métricas em tempo real
- Gráficos de tickets
- Lista de tickets recentes
- Chat em tempo real
- Time tracking

### Sistema de Planos
- Trial 14 dias automático
- Upgrade para Pro/Enterprise
- Pagamento via Asaas (Cartão/Boleto/PIX)

## 🛑 Parar o Servidor

Pressione `Ctrl+C` em cada terminal para parar.

---

**Pronto para desenvolver!** 🚀
