import React, { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  X, 
  Smartphone, 
  Monitor 
} from 'lucide-react';
import { 
  UpdateInfo, 
  installTauriDesktopUpdate, 
  installAndroidUpdate, 
  isAndroidNative,
  openExternalUrl,
  triggerBackendDesktopUpdate
} from '../utils/updater.js';
import { isTauriPlatform } from '../utils/mobileBridge.js';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateInfo: UpdateInfo | null;
  onCheckAgain: () => Promise<void>;
  isChecking: boolean;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  isChecking
}) => {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isReadyToRestart, setIsReadyToRestart] = useState(false);

  if (!isOpen) return null;

  const isTauri = isTauriPlatform();
  const isAndroid = isAndroidNative();

  const handleApplyUpdate = async () => {
    if (!updateInfo) return;
    setErrorMsg(null);
    setIsUpdating(true);

    try {
      // Flow 1: Tauri on Windows (PC)
      if (isTauri) {
        if (updateInfo.tauriUpdateObj) {
          try {
            setDownloadProgress(0);
            await installTauriDesktopUpdate(updateInfo.tauriUpdateObj, (downloaded, total) => {
              if (total > 0) {
                setDownloadProgress(Math.min(100, Math.round((downloaded / total) * 100)));
              }
            });
            setIsReadyToRestart(true);
            return;
          } catch (tauriErr) {
            console.warn('[UpdateModal] Tauri plugin update failed, falling back to direct installer download:', tauriErr);
          }
        }

        // Fallback for PC: trigger backend direct download and launch of the installer
        const downloadUrl =
          updateInfo.windowsDownloadUrl ||
          `https://github.com/LuisClaudioBoaventura/DriveGram/releases/download/v${updateInfo.latestVersion}/DriveGram_${updateInfo.latestVersion}_x64-setup.exe`;

        if (downloadUrl) {
          setDownloadProgress(0);
          try {
            await triggerBackendDesktopUpdate(downloadUrl, updateInfo.latestVersion, (prog) => {
              setDownloadProgress(prog);
            });
            setIsReadyToRestart(true);
            return;
          } catch (backendErr) {
            console.warn('[UpdateModal] Backend update failed, opening external URL:', backendErr);
            await openExternalUrl(downloadUrl || updateInfo.releaseUrl || '');
          }
        }
        setIsUpdating(false);
        return;
      }

      // Flow 2: Android (APK)
      if (isAndroid) {
        if (!updateInfo.apkDownloadUrl) {
          throw new Error('O pacote de atualização (APK) para Android ainda não está disponível nesta versão.');
        }

        installAndroidUpdate(updateInfo.apkDownloadUrl, updateInfo.latestVersion);
        setIsUpdating(false);
        onClose();
        return;
      }

      // Flow 3: Web or manual browser download
      const targetUrl = updateInfo.windowsDownloadUrl || updateInfo.apkDownloadUrl || updateInfo.releaseUrl;
      if (targetUrl) {
        await openExternalUrl(targetUrl);
      }
      setIsUpdating(false);
    } catch (err: any) {
      console.error('[UpdateModal] Update error:', err);
      setErrorMsg(err?.message || 'Falha ao processar atualização.');
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkSurface/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                Atualização do DriveGram
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isTauri ? 'Versão para Desktop (PC)' : isAndroid ? 'Versão para Android (Celular)' : 'DriveGram Web'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-drive-darkSurface rounded-xl border border-gray-100 dark:border-drive-darkBorder">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Versão Instalada
              </span>
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-0.5">
                v{updateInfo?.currentVersion || '1.0.0'}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                Versão Mais Recente
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  v{updateInfo?.latestVersion || '1.0.0'}
                </span>
                {updateInfo?.available && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    NOVA
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status message */}
          {updateInfo?.available ? (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                Uma nova versão do DriveGram está disponível no GitHub Releases!
              </div>

              {/* Release Notes */}
              {updateInfo.releaseNotes && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Novidades e Mudanças:
                  </div>
                  <div className="max-h-36 overflow-y-auto p-3 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-drive-darkSurface rounded-xl border border-gray-100 dark:border-drive-darkBorder whitespace-pre-wrap leading-relaxed font-sans">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}

              {/* Progress Bar (Desktop) */}
              {downloadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                    <span>Baixando atualização...</span>
                    <span className="font-semibold">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-drive-darkBorder rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {isReadyToRestart && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Download concluído com sucesso! O instalador do DriveGram foi iniciado.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                Seu DriveGram está atualizado!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs">
                Você já está utilizando a versão mais recente disponível no GitHub.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl flex items-start gap-2.5 text-red-700 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkSurface/30 flex items-center justify-between gap-3">
          <button
            onClick={() => onCheckAgain()}
            disabled={isChecking || isUpdating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-xl hover:bg-gray-50 dark:hover:bg-drive-darkHover transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-500' : ''}`} />
            <span>{isChecking ? 'Verificando...' : 'Verificar Novamente'}</span>
          </button>

          <div className="flex items-center gap-2">
            {updateInfo?.releaseUrl && (
              <button
                type="button"
                onClick={() => updateInfo.releaseUrl && openExternalUrl(updateInfo.releaseUrl)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
                title="Abrir no GitHub Releases"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {updateInfo?.available ? (
              <button
                onClick={handleApplyUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isUpdating 
                    ? 'Baixando...' 
                    : isTauri 
                    ? 'Atualizar PC Agora' 
                    : isAndroid 
                    ? 'Baixar e Instalar APK' 
                    : 'Baixar Atualização'}
                </span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-drive-darkHover hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium text-xs rounded-xl transition-colors"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
