@echo off
chcp 65001 >nul
echo ================================================
echo   🚀 DESKFLOW - Iniciar Localmente
echo ================================================
echo.

echo 📋 Verificando requisitos...

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo Por favor, instale o Node.js 20+ em https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js encontrado

REM Verificar MongoDB
mongod --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB não encontrado no PATH
    echo Você precisa ter o MongoDB rodando localmente
    echo Ou use MongoDB Atlas (cloud) para testes
    echo.
    echo Para instalar MongoDB local:
    echo https://www.mongodb.com/try/download/community
    echo.
    pause
)

echo.
echo ================================================
echo   CONFIGURACAO
echo ================================================
echo.

if not exist backend\.env (
    echo 📝 Criando arquivo .env para backend...
    (
        echo PORT=3000
        echo NODE_ENV=development
        echo MONGODB_URI=mongodb://localhost:27017/helpdesk
        echo JWT_SECRET=chave-secreta-para-desenvolvimento
        echo JWT_EXPIRES_IN=7d
        echo FRONTEND_URL=http://localhost:5173
    ) > backend\.env
    echo ✅ Arquivo .env criado
) else (
    echo ✅ Backend .env ja existe
)

if not exist frontend\.env (
    echo 📝 Criando arquivo .env para frontend...
    (
        echo VITE_API_URL=http://localhost:3000/api
    ) > frontend\.env
    echo ✅ Arquivo .env criado
) else (
    echo ✅ Frontend .env ja existe
)

echo.
echo ================================================
echo   INSTALANDO DEPENDENCIAS
echo ================================================
echo.

if not exist backend\node_modules (
    echo 📦 Instalando dependencias do backend...
    cd backend
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias do backend
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Backend instalado
) else (
    echo ✅ Backend ja instalado
)

if not exist frontend\node_modules (
    echo 📦 Instalando dependencias do frontend...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependencias do frontend
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Frontend instalado
) else (
    echo ✅ Frontend ja instalado
)

echo.
echo ================================================
echo   🎉 PRONTO PARA INICIAR!
echo ================================================
echo.
echo Voce precisa abrir 2 terminais:
echo.
echo TERMINAL 1 - Backend:
echo   cd backend
echo   npm run dev
echo.
echo TERMINAL 2 - Frontend:
echo   cd frontend  
echo   npm run dev
echo.
echo Depois acesse:
echo   🌐 Landing Page: http://localhost:5173
echo   🔐 Login: http://localhost:5173/login
echo   📊 Dashboard: http://localhost:5173/dashboard
echo.
echo Precione qualquer tecla para abrir as instrucoes...
pause >nul

start notepad instrucoes.txt
(
    echo DESKFLOW - INSTRUCOES PARA RODAR LOCALMENTE
    echo ===========================================
    echo.
    echo 1. Certifique-se de que o MongoDB esta rodando:
    echo    - Se instalou localmente: net start MongoDB
    echo    - Ou use MongoDB Atlas gratuito
    echo.
    echo 2. Abra dois terminais (Prompt de Comando)
    echo.
    echo 3. No primeiro terminal (Backend):
    echo    cd %CD%\backend
    echo    npm run dev
    echo.
    echo 4. No segundo terminal (Frontend):
    echo    cd %CD%\frontend
    echo    npm run dev
    echo.
    echo 5. Acesse no navegador:
    echo    http://localhost:5173
    echo.
    echo CREDENCIAIS DE TESTE:
    echo    - Crie uma conta em http://localhost:5173/register
    echo    - Ou use qualquer email/senha para testar
    echo.
    echo IMPORTANTE:
    echo    - Backend rodara em: http://localhost:3000
    echo    - Frontend rodara em: http://localhost:5173
    echo    - MongoDB deve estar acessivel em localhost:27017
) > instrucoes.txt
