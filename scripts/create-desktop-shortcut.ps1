# DriveGram - Criador de Atalho na Area de Trabalho
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Host.UI.RawUI.WindowTitle = "DriveGram - Criando Atalho"

Write-Host "`n======================================================" -ForegroundColor Cyan
Write-Host "   Criando Atalho do DriveGram na Area de Trabalho" -ForegroundColor Cyan
Write-Host "======================================================`n" -ForegroundColor Cyan

# 1. Obter o caminho real da Area de Trabalho (suporta OneDrive e Windows em Portugues)
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not $desktop -or -not (Test-Path $desktop)) {
    $desktop = Join-Path $env:USERPROFILE 'Desktop'
}

$legacyDesktop = Join-Path $env:USERPROFILE 'Desktop'

# 2. Localizar o diretorio raiz do projeto
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir
if (-not (Test-Path (Join-Path $rootDir "iniciar.bat"))) {
    $rootDir = (Get-Location).Path
}

$targetBat = Join-Path $rootDir "iniciar.bat"
$iconPath = Join-Path $rootDir "src-tauri\icons\icon.ico"

if (-not (Test-Path $targetBat)) {
    Write-Host "  [ERRO] Arquivo 'iniciar.bat' nao encontrado em: $rootDir" -ForegroundColor Red
    exit 1
}

# 3. Criar o atalho via WScript.Shell
try {
    $ws = New-Object -ComObject WScript.Shell
    $shortcutPath = Join-Path $desktop "DriveGram.lnk"
    
    $shortcut = $ws.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $targetBat
    $shortcut.WorkingDirectory = $rootDir
    $shortcut.Description = "Iniciar DriveGram Cloud"
    
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = "$iconPath,0"
    }
    
    $shortcut.Save()
    Write-Host "  [OK] Atalho criado na sua Area de Trabalho ativa:" -ForegroundColor Green
    Write-Host "       $shortcutPath" -ForegroundColor White
    
    # Se a pasta antiga/legada Desktop existir e for diferente do OneDrive, copiar tambem para la
    if ((Test-Path $legacyDesktop) -and ($desktop -ne $legacyDesktop)) {
        $legacyShortcut = Join-Path $legacyDesktop "DriveGram.lnk"
        Copy-Item -Path $shortcutPath -Destination $legacyShortcut -Force -ErrorAction SilentlyContinue
        Write-Host "`n  [OK] Copia sincronizada criada no Desktop local:" -ForegroundColor Gray
        Write-Host "       $legacyShortcut" -ForegroundColor Gray
    }

    Write-Host "`n======================================================" -ForegroundColor Green
    Write-Host "   Pronto! Voce ja pode usar o atalho na sua tela." -ForegroundColor Green
    Write-Host "======================================================`n" -ForegroundColor Green
    exit 0
} catch {
    Write-Host "  [ERRO] Falha ao criar o atalho: $_" -ForegroundColor Red
    exit 1
}
