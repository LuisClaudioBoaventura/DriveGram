@echo off
chcp 65001 > nul
title DriveGram - Inicializador
cls

echo ======================================================
echo           INICIANDO O DRIVEGRAM CLOUD
echo ======================================================
echo.

echo [1/4] Verificando dependencias...
if not exist node_modules (
    echo Instalando pacotes necessarios pela primeira vez...
    call npm install
)

echo [2/4] Liberando portas (encerrando sessao anterior se houver)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo [3/4] Iniciando Servidor Backend e Interface Web...
start "" http://localhost:3000

echo [4/4] Aplicacao pronta! Abrindo navegador...
echo.
echo Pressione Ctrl + C para encerrar o DriveGram quando quiser.
echo ======================================================
echo.

npm start
