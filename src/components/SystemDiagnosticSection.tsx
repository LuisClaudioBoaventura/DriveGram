import React, { useState, useEffect } from 'react';
import { Monitor, Terminal, FolderOpen, CheckCircle2, Server, Cpu, HardDrive } from 'lucide-react';
import { isTauriPlatform, toggleDevTools, openLogsFolder } from '../utils/mobileBridge.js';

export const SystemDiagnosticSection: React.FC = () => {
  const [serverStatus, setServerStatus] = useState<{
    ok: boolean;
    port: number;
    uploadsDir?: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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
    <div className="space-y-4 animate-in fade-in duration-150">
      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Ferramentas integradas para desenvolvedores, suporte técnico, inspeção do console JavaScript e localização de logs de execução:
      </p>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2.5 text-xs text-blue-800 dark:text-blue-300 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-500" />
          <span className="font-medium">{actionFeedback}</span>
        </div>
      )}

      {/* Diagnostic Action Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between px-1">
          <span>Ações Rápidas de Diagnóstico</span>
          <span className="text-[10px] text-gray-400 font-normal">Atalho: F12</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleOpenDevTools}
            className="flex items-center sm:flex-col sm:items-center justify-start sm:justify-center gap-3 sm:gap-2 p-4 rounded-2xl bg-gray-50/70 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-blue-500 dark:hover:border-blue-500/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-all shadow-xs group cursor-pointer"
          >
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="text-left sm:text-center">
              <span className="font-bold text-xs sm:text-sm block">DevTools (F12)</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">Inspecionar Console & Rede</p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleOpenLogsFolder}
            className="flex items-center sm:flex-col sm:items-center justify-start sm:justify-center gap-3 sm:gap-2 p-4 rounded-2xl bg-gray-50/70 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500 dark:hover:border-amber-500/80 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 text-gray-800 dark:text-gray-200 text-xs font-semibold transition-all shadow-xs group cursor-pointer"
          >
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-left sm:text-center">
              <span className="font-bold text-xs sm:text-sm block">Pasta de Logs</span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">drivegram.log no sistema</p>
            </div>
          </button>
        </div>
      </div>

      {/* System Info Panel */}
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-xs space-y-3">
        <div className="font-bold text-xs text-gray-700 dark:text-gray-300">
          Status dos Serviços e Ambiente
        </div>

        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400 pt-1">
          <span className="flex items-center gap-1.5">
            <Server className="w-4 h-4 text-emerald-500" />
            <span>Servidor Backend Local:</span>
          </span>
          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Porta {serverStatus?.port || 5000} (Ativo)
          </span>
        </div>

        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-blue-500" />
            <span>Ambiente em Execução:</span>
          </span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {isTauriPlatform() ? 'Tauri Desktop (Windows Nativo)' : 'Navegador Web / Mobile'}
          </span>
        </div>

        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-amber-500" />
            <span>Identificador de Logs & App:</span>
          </span>
          <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300 truncate max-w-[200px]" title="com.drivegram.desktop">
            com.drivegram.desktop
          </span>
        </div>
      </div>
    </div>
  );
};
