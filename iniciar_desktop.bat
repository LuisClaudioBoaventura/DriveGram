@echo off
chcp 65001 > nul
title DriveGram - Aplicativo Desktop Nativo (Tauri)
cls

echo ======================================================
echo       INICIANDO O DRIVEGRAM DESKTOP (TAURI LEVE)
echo ======================================================
echo.
echo [1/2] Verificando dependencias...
if not exist node_modules (
    echo Instalando pacotes necessarios pela primeira vez...
    call npm install
)

echo [2/2] Abrindo Aplicativo Desktop Nativo...
echo.
echo Pressione Ctrl + C para encerrar quando quiser.
echo ======================================================
echo.

call npm run desktop:dev
