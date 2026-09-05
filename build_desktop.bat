@echo off
chcp 65001 > nul
title DriveGram - Compilar Instalador Desktop
cls

echo ======================================================
echo       COMPILANDO INSTALADOR DESKTOP DO DRIVEGRAM
echo ======================================================
echo.
echo [1/3] Compilando Frontend (React/Vite)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao compilar o frontend.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Compilando Servidor Backend Embarcado...
call npm run package:embedded
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha ao compilar o servidor.
    pause
    exit /b %ERRORLEVEL%
)

echo [3/3] Gerando Instalador Nativo com Tauri v2...
call npx tauri build
if %ERRORLEVEL% neq 0 (
    echo [ERRO] Falha na compilação do pacote Desktop com Tauri.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================
echo [SUCESSO] Aplicativo Desktop compilado com sucesso!
echo Os instaladores estao em: src-tauri\target\release\bundle\
echo ======================================================
echo.
pause
