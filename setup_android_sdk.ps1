$ErrorActionPreference = 'Stop'

$sdkDir = "C:\Users\luizi\AppData\Local\Android\Sdk"
$cmdlineToolsDir = "$sdkDir\cmdline-tools\latest"
$zipPath = "$env:TEMP\commandlinetools-win.zip"

Write-Host "=== Configurando Android SDK em $sdkDir ===" -ForegroundColor Cyan

if (-not (Test-Path $cmdlineToolsDir)) {
    New-Item -ItemType Directory -Path $cmdlineToolsDir -Force | Out-Null
    
    $downloadUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    Write-Host "Baixando Android Command Line Tools do Google..." -ForegroundColor Yellow
    
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
    
    Write-Host "Extraindo Command Line Tools..." -ForegroundColor Yellow
    $tempExtract = "$env:TEMP\cmdline-tools-temp"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract }
    Expand-Archive -Path $zipPath -DestinationPath $tempExtract -Force
    
    Copy-Item -Path "$tempExtract\cmdline-tools\*" -Destination $cmdlineToolsDir -Recurse -Force
    Remove-Item -Recurse -Force $tempExtract
    Remove-Item -Force $zipPath
}

# Set environment
$jdkDir = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory | Select-Object -First 1 -ExpandProperty FullName
$env:JAVA_HOME = $jdkDir
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$jdkDir\bin;$cmdlineToolsDir\bin;$sdkDir\platform-tools;" + $env:PATH

# Create local.properties in android folder
$escapedSdk = $sdkDir.Replace("\", "\\")
"sdk.dir=$escapedSdk" | Out-File -FilePath "c:\Users\luizi\Downloads\Code\Projeto - DriveGram\android\local.properties" -Encoding ascii

Write-Host "Aceitando licencas e instalando pacotes necessarios (platforms;android-34, build-tools;34.0.0)..." -ForegroundColor Cyan
$sdkManager = "$cmdlineToolsDir\bin\sdkmanager.bat"

# Auto-accept licenses
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $sdkManager
$processInfo.Arguments = "--licenses"
$processInfo.RedirectStandardInput = $true
$processInfo.RedirectStandardOutput = $true
$processInfo.UseShellExecute = $false
$process = [System.Diagnostics.Process]::Start($processInfo)

for ($i = 0; $i -lt 20; $i++) {
    $process.StandardInput.WriteLine("y")
}
$process.StandardInput.Close()
$process.WaitForExit()

# Install platform and build-tools
Write-Host "Instalando platforms;android-34 e build-tools;34.0.0..." -ForegroundColor Cyan
$installArgs = @(
    "platforms;android-34",
    "build-tools;34.0.0",
    "platform-tools"
)
& $sdkManager $installArgs

Write-Host "Android SDK configurado com sucesso!" -ForegroundColor Green
