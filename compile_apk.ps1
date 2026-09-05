$ErrorActionPreference = 'Stop'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         DriveGram - Compilação Completa de APK        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = "c:\Users\luizi\Downloads\Code\Projeto - DriveGram"
Set-Location $rootDir

# ---- 1. Verificar Ambientes JDK e Android SDK ----
$jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*21*" } | Select-Object -First 1 -ExpandProperty FullName
if (-not $jdkDir -or -not (Test-Path $jdkDir)) {
    $jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $jdkDir) {
    $jdkDir = "C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot"
}

$sdkDir = "C:\Users\luizi\AppData\Local\Android\Sdk"

Write-Host "[1/5] Verificando JDK e Android SDK..." -ForegroundColor Cyan
Write-Host "  JDK: $jdkDir" -ForegroundColor Gray
Write-Host "  SDK: $sdkDir" -ForegroundColor Gray

$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$jdkDir\bin;$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;" + $env:PATH

# ---- 2. Compilar Frontend React (Vite) ----
Write-Host "`n[2/5] Compilando frontend React (Vite)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao compilar frontend React." -ForegroundColor Red
    exit 1
}

# ---- 3. Empacotar Servidor Node.js Mobile com Assets ----
Write-Host "`n[3/5] Empacotando servidor Node.js Mobile com assets frontend..." -ForegroundColor Cyan
node scripts/build-embedded-server.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao empacotar servidor embutido." -ForegroundColor Red
    exit 1
}

# ---- 4. Sincronizar com Capacitor Android ----
Write-Host "`n[4/5] Sincronizando assets com o projeto Android (Capacitor)..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao sincronizar assets Capacitor." -ForegroundColor Red
    exit 1
}

# ---- 5. Compilar APK com Gradle ----
Write-Host "`n[5/5] Compilando APK Android via Gradle..." -ForegroundColor Cyan
Set-Location "$rootDir\android"

& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Set-Location $rootDir
    $apkSource = "$rootDir\android\app\build\outputs\apk\debug\app-debug.apk"
    $apkDest = "$rootDir\DriveGram.apk"
    
    if (Test-Path $apkSource) {
        Copy-Item -Path $apkSource -Destination $apkDest -Force
        $item = Get-Item $apkDest
        Write-Host "`n========================================================" -ForegroundColor Green
        Write-Host "       APK COMPILADO COM SUCESSO! 🚀" -ForegroundColor Green
        Write-Host "========================================================" -ForegroundColor Green
        Write-Host "Arquivo gerado:" -ForegroundColor Cyan
        Write-Host "👉 $apkDest ($([Math]::Round($item.Length / 1MB, 2)) MB)" -ForegroundColor Yellow
        Write-Host "`nInstruções:" -ForegroundColor White
        Write-Host "1. Conecte o celular via USB ou envie 'DriveGram.apk' pelo Telegram/WhatsApp." -ForegroundColor Gray
        Write-Host "2. No celular, toque no arquivo e autorize 'Instalar de fontes desconhecidas'." -ForegroundColor Gray
        Write-Host "3. Abra o app: tanto o frontend quanto o backend rodarão 100% no seu aparelho!" -ForegroundColor Gray
    }
} else {
    Set-Location $rootDir
    Write-Host "`n[ERRO] Falha ao compilar APK via Gradle." -ForegroundColor Red
    exit 1
}
