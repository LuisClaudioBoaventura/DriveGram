# NSIS hooks for DriveGram Windows Installer

!macro NSIS_HOOK_PREUNINSTALL
  # Encerra qualquer processo em execução do DriveGram (e seus subprocessos, como o Node.js)
  # para liberar eventuais bloqueios de arquivo (file locks) nas pastas de dados e cache.
  ExecWait 'cmd.exe /C "taskkill /F /IM DriveGram.exe /T >nul 2>&1"'
  ExecWait 'cmd.exe /C "taskkill /F /IM node.exe /FI \"WINDOWTITLE eq DriveGram*\" /T >nul 2>&1"'
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
