@echo off
chcp 65001 >nul
cls
echo ================================================
echo   🚀 DEPLOY BACKEND - RAILWAY
echo ================================================
echo.

REM Verificar se está logado
echo 📦 Verificando autenticação...
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Não está logado no Railway!
    echo.
    echo 1. Acesse: https://railway.app/login
    echo 2. Faça login com GitHub
    echo 3. Execute: railway login
    echo.
    pause
    exit /b 1
)

echo ✅ Logado no Railway
echo.

REM Entrar na pasta do backend (monorepo)
if not exist backend\package.json (
    echo ❌ backend\package.json não encontrado neste diretório
    pause
    exit /b 1
)
cd backend

REM Criar/selecionar projeto
echo 📋 Selecionando projeto...
railway list >nul 2>&1
if %errorlevel% neq 0 (
    echo Criando novo projeto...
    railway init
) else (
    echo Selecione o projeto na Railway Dashboard
)

echo.
echo 📦 Fazendo deploy...
railway up

echo.
echo ✅ Deploy concluído!
echo.
echo 📝 Próximos passos:
echo 1. Configure variáveis de ambiente em railway.app
echo 2. Adicione MONGODB_URI, JWT_SECRET, FRONTEND_URL
echo 3. Verifique health: https://seu-app.railway.app/health
echo.
pause
