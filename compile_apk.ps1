$ErrorActionPreference = 'Stop'

Write-Host "=== Verificando JDK 21 ===" -ForegroundColor Cyan
$jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Where-Object { $_.Name -like "*21*" } | Select-Object -First 1 -ExpandProperty FullName
if (-not $jdkDir -or -not (Test-Path $jdkDir)) {
    $jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Select-Object -First 1 -ExpandProperty FullName
}

$sdkDir = "C:\Users\luizi\AppData\Local\Android\Sdk"

Write-Host "JDK: $jdkDir" -ForegroundColor Green
Write-Host "SDK: $sdkDir" -ForegroundColor Green

$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$jdkDir\bin;$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;" + $env:PATH

& "$jdkDir\bin\java.exe" -version

Write-Host "`n=== Compilando o APK do DriveGram com Gradle (JDK 21) ===" -ForegroundColor Cyan
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
        $item = Get-Item $apkDest
        Write-Host "`nArquivo gerado:" -ForegroundColor Cyan
        Write-Host "👉 $apkDest ($([Math]::Round($item.Length / 1MB, 2)) MB)" -ForegroundColor Yellow
        Write-Host "`nBasta transferir para seu celular Android e instalar diretamente!" -ForegroundColor White
    }
} else {
    Write-Host "`n[ERRO] Falha ao compilar APK via Gradle" -ForegroundColor Red
}
