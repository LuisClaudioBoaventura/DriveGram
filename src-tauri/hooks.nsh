# NSIS hooks for DriveGram Windows Installer

!macro NSIS_HOOK_PREINSTALL
  # 1. Encerra o DriveGram.exe e todos os subprocessos (incluindo o node.exe filho)
  ExecWait 'cmd.exe /C "taskkill /F /IM DriveGram.exe /T >nul 2>&1"'

  # 2. Kill incondicional de qualquer node.exe rodando dentro da pasta de instalação
  #    (cobre o caso onde o node.exe ainda não foi liberado pelo process.exit)
  ExecWait 'cmd.exe /C "wmic process where (name=''node.exe'' and ExecutablePath like ''%DriveGram%'') call terminate >nul 2>&1"'

  # 3. Fallback: kill geral de node.exe pelo powershell filtrando pelo path de instalação
  ExecWait 'powershell -NoProfile -NonInteractive -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like ''*DriveGram*'' -or $_.Path -like ''*Local\DriveGram*'' } | Stop-Process -Force -ErrorAction SilentlyContinue"'

  # 4. Pausa estendida — garante que o Windows libere todos os file handles antes da extração
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  # Encerra qualquer processo em execução do DriveGram (e seus subprocessos, como o Node.js)
  # para liberar eventuais bloqueios de arquivo (file locks) nas pastas de dados e cache.
  ExecWait 'cmd.exe /C "taskkill /F /IM DriveGram.exe /T >nul 2>&1"'
  ExecWait 'powershell -NoProfile -NonInteractive -Command "Get-Process -ErrorAction SilentlyContinue | Where-Object { `$_.ProcessName -match \"^(node|DriveGram)$\" -and (`$_.Path -like \"*DriveGram*\" -or `$_.Path -like \"*com.drivegram*\") } | Stop-Process -Force"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  # Remove todos os dados do aplicativo e cache do usuário atual
  SetShellVarContext current

  # 1. Pasta de dados do aplicativo (banco de dados, uploads, mídias baixadas, logs, sessões)
  RMDir /r "$APPDATA\com.drivegram.desktop"
  RMDir /r "$APPDATA\DriveGram"

  # 2. Pasta de cache e WebView2 (EBWebView: cache HTTP, cookies, IndexedDB, localStorage, service workers)
  RMDir /r "$LOCALAPPDATA\com.drivegram.desktop"
  RMDir /r "$LOCALAPPDATA\DriveGram"

  # Limpeza preventiva caso a instalação tenha sido realizada em modo per-machine / all users
  SetShellVarContext all
  RMDir /r "$APPDATA\com.drivegram.desktop"
  RMDir /r "$APPDATA\DriveGram"
  RMDir /r "$LOCALAPPDATA\com.drivegram.desktop"
  RMDir /r "$LOCALAPPDATA\DriveGram"
!macroend
