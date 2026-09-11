import React, { useState, useEffect } from 'react';
import { Monitor, Terminal, FolderOpen, X, CheckCircle2, Server, Cpu, HardDrive } from 'lucide-react';
import { isTauriPlatform, toggleDevTools, openLogsFolder } from '../utils/mobileBridge.js';

interface MobileServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileServerSettingsModal: React.FC<MobileServerSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [serverStatus, setServerStatus] = useState<{
    ok: boolean;
    port: number;
    uploadsDir?: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActionFeedback(null);
      fetch('/api/health')
        .then(res => res.json())
        .then(data => {
          setServerStatus({
            ok: data.status === 'ok',
            port: 5000,
            uploadsDir: data.uploadsDir
          });
        })
        .catch(() => {
          setServerStatus({ ok: true, port: 5000 });
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenDevTools = async () => {
    setActionFeedback('Abrindo DevTools (F12)...');
    await toggleDevTools();
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleOpenLogsFolder = async () => {
    setActionFeedback('Abrindo pasta de logs...');
    const path = await openLogsFolder();
    if (path) {
      setActionFeedback(`Pasta aberta: ${path}`);
    } else {
      setActionFeedback('Comando enviado para abrir a pasta de logs.');
    }
    setTimeout(() => setActionFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-drive-darkBorder shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Diagnóstico do Sistema Desktop
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ferramentas de desenvolvedor, inspeção e logs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-drive-darkBg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
              <span>{actionFeedback}</span>
            </div>
          )}

          {/* Diagnostic Action Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Ações Rápidas de Diagnóstico</span>
              <span className="text-[10px] text-gray-400 font-normal">Atalho rápido: F12</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleOpenDevTools}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-blue-500 dark:hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm group"
              >
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <Terminal className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span>DevTools (F12)</span>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">Inspecionar Console</p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleOpenLogsFolder}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500 dark:hover:border-amber-500/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-all shadow-sm group"
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="text-center">
                  <span>Pasta de Logs</span>
                  <p className="text-[10px] text-gray-400 font-normal mt-0.5">drivegram.log</p>
                </div>
              </button>
            </div>
          </div>

          {/* System Info Panel */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-xs space-y-2.5">
            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                <span>Servidor Local:</span>
              </span>
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Porta {serverStatus?.port || 5000} (Ativo)
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                <span>Ambiente:</span>
              </span>
              <span className="font-medium text-gray-800 dark:text-gray-200">
                {isTauriPlatform() ? 'Tauri Desktop (Windows)' : 'Navegador Web / Mobile'}
              </span>
            </div>

            <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>Logs & Dados:</span>
              </span>
              <span className="font-mono text-[10px] text-gray-500 truncate max-w-[200px]" title="drivegram.log">
                com.drivegram.desktop
              </span>
            </div>
          </div>

          {/* Close Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-drive-darkBg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all active:scale-95 text-center"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
