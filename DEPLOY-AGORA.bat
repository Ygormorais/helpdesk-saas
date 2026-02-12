@echo off
chcp 65001 >nul
cls
echo ================================================
echo   🚀 HELPDEK SAAS - DEPLOY AUTOMATICO
echo ================================================
echo.
echo 📦 Verificando CLIs...

REM Verificar Railway
railway --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Railway CLI encontrado
) else (
    echo 📦 Instalando Railway CLI...
    npm install -g @railway/cli
)

REM Verificar Vercel
vercel --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Vercel CLI encontrado
) else (
    echo 📦 Instalando Vercel CLI...
    npm install -g vercel
)

echo.
echo ================================================
echo   PASSO 1: RAILWAY (BACKEND)
echo ================================================
echo.
echo 1. Faca login no Railway:
echo    railway login
echo.
echo 2. Entre no link que abrir no navegador
echo.
echo 3. Apos login, volte aqui e pressione qualquer tecla
echo.
pause >nul

echo.
echo 4. Inicializando projeto Railway...
railway init

echo.
echo 5. Deployando backend...
railway up

echo.
echo ================================================
echo   PASSO 2: VERCEL (FRONTEND)
echo ================================================
echo.
echo 1. Faca login no Vercel:
echo    vercel login
echo.
echo 2. Entre no link que abrir no navegador
echo.
echo 3. Apos login, volte aqui e pressione qualquer tecla
echo.
pause >nul

echo.
echo 4. Deployando frontend...
cd frontend
vercel --prod

echo.
echo ================================================
echo   ✅ DEPLOY CONCLUIDO!
echo ================================================
echo.
echo 📋 RESUMO:
echo - Backend: railway.app
echo - Frontend: vercel.app
echo.
echo 📝 PROXIMOS PASSOS:
echo 1. Configure variaveis de ambiente
echo 2. Adicione MONGODB_URI no Railway
echo 3. Adicione VITE_API_URL no Vercel
echo.
pause
