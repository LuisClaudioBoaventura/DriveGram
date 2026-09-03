import React, { useState, useEffect } from 'react';
import { Smartphone, Server, CheckCircle2, AlertCircle, RefreshCw, X, Wifi, Save, Radio } from 'lucide-react';
import { getCustomServerUrl, setCustomServerUrl } from '../utils/mobileBridge.js';

interface MobileServerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileServerSettingsModal: React.FC<MobileServerSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(getCustomServerUrl() || 'http://192.168.0.6:5000');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const target = serverUrl.trim().replace(/\/+$/, '') || 'http://192.168.0.6:5000';
      const res = await fetch(`${target}/api/telegram/status`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Conectado com sucesso! Servidor ativo. Telegram: ${data.isConnected ? 'Conectado' : 'Aguardando Login'}`
        });
      } else {
        setTestResult({
          success: false,
          message: `Servidor respondeu com erro HTTP ${res.status}.`
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: 'Não foi possível conectar ao servidor (Failed to fetch). Verifique se o backend do DriveGram está em execução no PC e se o celular está no mesmo Wi-Fi.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setCustomServerUrl(serverUrl);
    onClose();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-drive-darkBorder shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Conexão com o Servidor
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configuração para App Android / Mobile
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
          <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 leading-relaxed space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
              <Wifi className="w-3.5 h-3.5" />
              <span>Conexão no mesmo Wi-Fi / Rede:</span>
            </p>
            <p>
              No smartphone, o app precisa saber o IP do computador onde o servidor do DriveGram está rodando.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span>Endereço do Servidor (IP + Porta)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Server className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://192.168.0.6:5000"
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-xs"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-gray-400 self-center mr-1">Sugestões:</span>
              <button
                type="button"
                onClick={() => setServerUrl('http://192.168.0.6:5000')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-blue-100/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
              >
                192.168.0.6:5000 (Seu PC)
              </button>
              <button
                type="button"
                onClick={() => setServerUrl('http://127.0.0.1:5000')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Localhost
              </button>
            </div>
          </div>

          {/* Test connection result */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 shrink-0">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-drive-darkBg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all disabled:opacity-50 text-center"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testando...' : 'Testar Conexão'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95 text-center"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar e Conectar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
