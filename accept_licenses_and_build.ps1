$ErrorActionPreference = 'Stop'

$jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Select-Object -First 1 -ExpandProperty FullName
$sdkDir = "C:\Users\luizi\AppData\Local\Android\Sdk"
$cmdlineToolsDir = "$sdkDir\cmdline-tools\latest"

$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$jdkDir\bin;$cmdlineToolsDir\bin;$sdkDir\platform-tools;" + $env:PATH

Write-Host "=== Aceitando todas as licencas do Android SDK ===" -ForegroundColor Cyan
$licensesDir = "$sdkDir\licenses"
if (-not (Test-Path $licensesDir)) {
    New-Item -ItemType Directory -Path $licensesDir -Force | Out-Null
}

# Standard Google Android License Hashes
@(
    "24333f8a63b6825ea9c5514f83c2829b004d1fee",
    "d56f5187479451eabf01fb78af6dfcb131a6481e",
    "e6b7c2ab7ff22c77c32441093159b43937b0d63c",
    "84831b9409646a533e30ed3cb7e204c9b64e86e2",
    "601085b94cd77f0b54ff86406957099fed79720f",
    "33b6a2b64607f11b759f320ef9dff4ae5c47d97a",
    "8563bc79466d48d8833015d26b723b700ab25835"
) | Out-File -FilePath "$licensesDir\android-sdk-license" -Encoding ascii

@(
    "84831b9409646a533e30ed3cb7e204c9b64e86e2"
) | Out-File -FilePath "$licensesDir\android-sdk-preview-license" -Encoding ascii

Write-Host "Instalando plataformas e build-tools via sdkmanager..." -ForegroundColor Cyan
$sdkManager = "$cmdlineToolsDir\bin\sdkmanager.bat"

# Pipe yes to sdkmanager --licenses
echo "y`ny`ny`ny`ny`ny`ny`ny`ny`n" | & $sdkManager --licenses

# Install platforms 34, 35, 36 and build-tools 34.0.0, 35.0.0
& $sdkManager "platforms;android-34" "platforms;android-35" "build-tools;34.0.0" "build-tools;35.0.0" "platform-tools"

Write-Host "`n=== Compilando APK via Gradle ===" -ForegroundColor Cyan
Set-Location "c:\Users\luizi\Downloads\Code\Projeto - DriveGram\android"
& .\gradlew.bat assembleDebug

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host "       APK COMPILADO COM SUCESSO! 🚀" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    
    $apkSource = "app\build\outputs\apk\debug\app-debug.apk"
    $apkDest = "c:\Users\luizi\Downloads\Code\Projeto - DriveGram\DriveGram.apk"
    
    if (Test-Path $apkSource) {
        Copy-Item -Path $apkSource -Destination $apkDest -Force
        Write-Host "`nO arquivo APK esta pronto em:" -ForegroundColor Cyan
        Write-Host "👉 $apkDest" -ForegroundColor Yellow
        Write-Host "`nBasta transferir para seu celular Android e instalar!" -ForegroundColor White
    }
}
