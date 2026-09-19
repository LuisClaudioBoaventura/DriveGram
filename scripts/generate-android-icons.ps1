$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
$updateScript = "$rootDir\scripts\update-all-icons.ps1"

if (Test-Path $updateScript) {
    & $updateScript
}

Write-Output "Android icons updated successfully!"
