@echo off
chcp 65001 >nul
echo ================================================
echo   🚀 HELPDEK SAAS - GIT SETUP
echo ================================================
echo.

REM Verificar se é diretório git
if exist .git\config (
    echo ✅ Repositório Git já inicializado
) else (
    echo 📦 Inicializando Git...
    git init
    echo.
)

REM Configurar usuário
echo.
echo 👤 Configurando usuário Git...
set /p gitname="Digite seu nome: "
set /p gitemail="Digite seu email: "

git config user.name "%gitname%"
git config user.email "%gitemail%"
echo ✅ Usuário configurado!
echo.

REM Mostrar status
echo 📊 Status atual:
git status
echo.

REM Mostrar próximos passos
echo ================================================
echo   📋 PRÓXIMOS PASSOS:
echo ================================================
echo.
echo 1. Crie um repositório em: https://github.com/new
echo    - Nome: helpdesk-saas
echo    - Description: Sistema SaaS de Help Desk
echo    - Marque: Public
echo.
echo 2. Execute os comandos abaixo:
echo.
echo    git remote add origin https://github.com/SEU-USERNAME/helpdesk-saas.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Acesse: https://github.com/SEU-USERNAME/helpdesk-saas
echo.
echo ================================================
echo.
pause
