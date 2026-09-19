$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
$updateScript = "$rootDir\scripts\update-all-icons.ps1"

if (Test-Path $updateScript) {
    & $updateScript
}

$icoPath = "$rootDir\public\icons\app_icon.ico"

# Update Desktop shortcut with the new icon
$ws = New-Object -ComObject WScript.Shell
$desktopShortcut = "$([Environment]::GetFolderPath('Desktop'))\DriveGram.lnk"
if (Test-Path $desktopShortcut) {
    $s = $ws.CreateShortcut($desktopShortcut)
    $s.IconLocation = "$icoPath,0"
    $s.Save()
    Write-Output "Desktop shortcut updated with new icon!"
}

Write-Output "Icons generated and shortcut updated successfully!"
