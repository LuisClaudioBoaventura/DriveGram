@echo off
title DriveGram - Inicializador
chcp 65001 > nul
cls

echo ======================================================
echo           🚀 INICIANDO O DRIVEGRAM CLOUD 🚀
echo ======================================================
echo.
echo [1/3] Verificando dependencias...
if not exist node_modules (
    echo Instalando pacotes necessarios pela primeira vez...
    call npm install
)

echo [2/3] Iniciando Servidor Backend e Interface Web...
start "" http://localhost:3000

echo [3/3] Aplicacao pronta! Abrindo navegador...
echo.
echo Pressione Ctrl + C para encerrar o DriveGram quando quiser.
echo ======================================================
echo.

npm start
