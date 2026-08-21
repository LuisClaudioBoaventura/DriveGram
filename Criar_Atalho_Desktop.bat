@echo off
chcp 65001 > nul
set "TARGET=%~dp0iniciar.bat"
set "WORKING_DIR=%~dp0"
set "SHORTCUT_PATH=%USERPROFILE%\Desktop\DriveGram.lnk"

powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath='%TARGET%'; $s.WorkingDirectory='%WORKING_DIR%'; $s.Save()"

echo.
echo ======================================================
echo  ✅ Atalho "DriveGram" criado na sua Area de Trabalho!
echo ======================================================
echo.
echo Agora voce pode apenas dar 2 cliques no icone da Área de Trabalho.
echo.
pause
