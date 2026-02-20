#!/bin/bash

echo "🚀 DeskFlow - Iniciando Localmente"
echo "===================================="

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se estamos no diretório correto
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erro: Execute este script da raiz do projeto"
    exit 1
fi

# Criar .env se não existir
if [ ! -f "backend/.env" ]; then
    echo "📝 Criando backend/.env..."
    cat > backend/.env << EOF
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/helpdesk
JWT_SECRET=chave-secreta-dev
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
EOF
fi

if [ ! -f "frontend/.env" ]; then
    echo "📝 Criando frontend/.env..."
    echo "VITE_API_URL=http://localhost:3000/api" > frontend/.env
fi

# Instalar dependências se necessário
echo "📦 Verificando dependências..."

if [ ! -d "backend/node_modules" ]; then
    echo "Instalando backend..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Instalando frontend..."
    cd frontend && npm install && cd ..
fi

echo "✅ Dependências OK"
echo ""

# Iniciar backend em segundo plano
echo -e "${BLUE}🚀 Iniciando Backend...${NC}"
cd backend
echo "Backend iniciando em http://localhost:3000"
npm run dev &
BACKEND_PID=$!
cd ..

# Aguardar um pouco
sleep 3

# Iniciar frontend
echo -e "${BLUE}🎨 Iniciando Frontend...${NC}"
cd frontend
echo "Frontend iniciando em http://localhost:5173"
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo -e "${GREEN}✅ DeskFlow rodando localmente!${NC}"
echo ""
echo "Acesse:"
echo "  🌐 Landing: http://localhost:5173"
echo "  🔐 Login:   http://localhost:5173/login"
echo ""
echo "Pressione Ctrl+C para parar todos os serviços"
echo ""

# Aguardar Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
