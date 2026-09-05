@echo off
chcp 65001 > nul
title DriveGram - Gerador de APK Android

echo ========================================================
echo         DriveGram - Gerador de APK Android
echo ========================================================
echo.

echo [1/4] Compilando frontend React (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao compilar o frontend. Verifique os erros acima.
    if "%CI%"=="" pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Compilando e empacotando servidor backend (Node.js Mobile + assets)...
call node scripts/build-embedded-server.js
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao compilar o servidor. Verifique os erros acima.
    if "%CI%"=="" pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Sincronizando assets para o projeto Android (Capacitor)...
call npx cap sync android
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao sincronizar assets Capacitor para Android.
    if "%CI%"=="" pause
    exit /b %errorlevel%
)

echo.
echo [4/4] Compilando o APK Android via Gradle...
cd android
call gradlew assembleDebug
set GRADLE_EXIT=%errorlevel%
cd ..

if %GRADLE_EXIT% equ 0 (
    echo.
    echo Copiando APK para a pasta raiz...
    if exist "android\app\build\outputs\apk\debug\app-debug.apk" (
        copy "android\app\build\outputs\apk\debug\app-debug.apk" "DriveGram.apk" /Y > nul
        echo.
        echo ========================================================
        echo  [SUCESSO] APK gerado com sucesso:
        echo     Arquivo: %~dp0DriveGram.apk
        echo.
        echo   Transferir 'DriveGram.apk' para o celular e instalar.
        echo   Habilitar "Fontes Desconhecidas" nas config. do Android.
        echo ========================================================
    ) else (
        echo [AVISO] APK compilado mas nao encontrado no caminho padrao.
        echo         Procure em: android\app\build\outputs\apk\debug\
    )
) else (
    echo.
    echo ========================================================
    echo   Para compilar pelo Android Studio:
    echo     Execute: npx cap open android
    echo     Depois: Build ^> Build APK(s)
    echo ========================================================
)

echo.
if "%CI%"=="" pause


