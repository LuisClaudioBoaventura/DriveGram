@echo off
chcp 65001 > nul
set "TARGET=%~dp0iniciar.bat"
set "WORKING_DIR=%~dp0"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\DriveGram.lnk"
set "ICON_PATH=%~dp0src-tauri\icons\icon.ico"

powershell -NoProfile -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath='%TARGET%'; $s.WorkingDirectory='%WORKING_DIR%'; if (Test-Path '%ICON_PATH%') { $s.IconLocation='%ICON_PATH%,0' }; $s.Save()"

echo.
echo ======================================================
echo  Atalho "DriveGram" criado na sua Area de Trabalho!
echo ======================================================
echo.
echo Agora voce pode apenas dar 2 cliques no icone da Area de Trabalho.
echo.
pause
