# NSIS hooks for DriveGram Windows Installer

!macro NSIS_HOOK_PREINSTALL
  # 1. Encerra DriveGram.exe e todos os subprocessos (incluindo node.exe filho via /T)
  ExecWait 'cmd.exe /C "taskkill /F /IM DriveGram.exe /T >nul 2>&1"'
  # 2. Encerra qualquer node.exe restante (caso não tenha sido encerrado como subprocesso)
  ExecWait 'cmd.exe /C "taskkill /F /IM node.exe >nul 2>&1"'
  # 3. Pausa estendida — garante que o Windows libere todos os file handles antes da extração
  Sleep 2000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  # Encerra DriveGram.exe e subprocessos para liberar file locks antes da desinstalação
  ExecWait 'cmd.exe /C "taskkill /F /IM DriveGram.exe /T >nul 2>&1"'
  ExecWait 'cmd.exe /C "taskkill /F /IM node.exe >nul 2>&1"'
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
