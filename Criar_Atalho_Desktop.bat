@echo off
chcp 65001 > nul
title DriveGram - Criando Atalho na Area de Trabalho

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERRO] Ocorreu uma falha ao criar o atalho.
    echo.
)

pause
