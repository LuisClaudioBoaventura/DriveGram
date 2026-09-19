import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Sparkles, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Film, 
  BookOpen, 
  Youtube, 
  Tv, 
  Send, 
  Eye, 
  EyeOff, 
  CheckCircle2 
} from 'lucide-react';
import { 
  API_SERVICES, 
  ApiKeyItem, 
  getStoredApiKey, 
  setStoredApiKey, 
  testApiKey 
} from '../services/apiKeysService.js';
import { TelegramAuthState } from '../types/index.js';

interface ApiKeysSectionProps {
  telegramState?: TelegramAuthState;
  onOpenAuth?: () => void;
}

export const ApiKeysSection: React.FC<ApiKeysSectionProps> = ({
  telegramState,
  onOpenAuth
}) => {
  const [keysState, setKeysState] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [testingServiceId, setTestingServiceId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialKeys: Record<string, string> = {};
    const initialSaved: Record<string, boolean> = {};
    API_SERVICES.forEach(s => {
      const val = getStoredApiKey(s.storageKey);
      initialKeys[s.id] = val;
      initialSaved[s.id] = Boolean(val.trim());
    });
    setKeysState(initialKeys);
    setSavedStatus(initialSaved);
    setTestResults({});
  }, []);

  const handleKeyChange = (serviceId: string, value: string) => {
    setKeysState(prev => ({ ...prev, [serviceId]: value }));
    setSavedStatus(prev => ({ ...prev, [serviceId]: false }));
    setTestResults(prev => {
      const copy = { ...prev };
      delete copy[serviceId];
      return copy;
    });
  };

  const handleSaveKey = (service: ApiKeyItem) => {
    const val = (keysState[service.id] || '').trim();
    setStoredApiKey(service.storageKey, val);
    setSavedStatus(prev => ({ ...prev, [service.id]: Boolean(val) }));
    setTestResults(prev => ({
      ...prev,
      [service.id]: {
        success: true,
        message: val ? `Chave de ${service.name} salva com sucesso!` : `Chave removida. O sistema usará o fallback automático padrão.`
      }
    }));
  };

  const handleTestKey = async (service: ApiKeyItem) => {
    const key = (keysState[service.id] || '').trim();
    if (!key) {
      setTestResults(prev => ({
        ...prev,
        [service.id]: {
          success: false,
          message: 'Digite ou cole uma chave de API antes de testar.'
        }
      }));
      return;
    }

    setTestingServiceId(service.id);
    const result = await testApiKey(service.id, key);
    setTestingServiceId(null);
    setTestResults(prev => ({ ...prev, [service.id]: result }));
  };

  const toggleVisibility = (serviceId: string) => {
    setVisibleKeys(prev => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const getServiceIcon = (id: string) => {
    switch (id) {
      case 'omdb': return <Film className="w-5 h-5 text-amber-500" />;
      case 'thetvdb': return <Tv className="w-5 h-5 text-emerald-500" />;
      case 'tmdb': return <Tv className="w-5 h-5 text-sky-500" />;
      case 'google_books': return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-500" />;
      default: return <Key className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Telegram Cloud Status Banner */}
      {telegramState && (
        <div className="p-3.5 rounded-2xl border bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent border-sky-300/40 dark:border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-gray-100">
                  Telegram Cloud MTProto
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  telegramState.isConnected
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                }`}>
                  {telegramState.isConnected ? '✓ Conectado & Ativo' : 'Não conectado'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {telegramState.isConnected 
                  ? `Conectado como ${telegramState.firstName || telegramState.username || 'Usuário Telegram'} com armazenamento ilimitado.`
                  : 'Conecte sua conta do Telegram para ativar o upload e streaming na nuvem.'}
              </p>
            </div>
          </div>

          {onOpenAuth && !telegramState.isConnected && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shrink-0 active:scale-95 shadow-sm cursor-pointer"
            >
              Conectar Agora
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
        Gerencie integrações externas para enriquecer seus cursos, filmes, séries e livros com capas de alta definição, sinopses e metadados automáticos:
      </p>

      {/* List of API Services */}
      <div className="space-y-3">
        {API_SERVICES.map((service) => {
          const currentKey = keysState[service.id] || '';
          const isConfigured = Boolean(currentKey.trim());
          const isTesting = testingServiceId === service.id;
          const testRes = testResults[service.id];
          const isVisible = Boolean(visibleKeys[service.id]);

          return (
            <div
              key={service.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                isConfigured
                  ? 'border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkBg shadow-xs'
                  : 'border-gray-200 dark:border-drive-darkBorder bg-gray-50/60 dark:bg-drive-darkBg/40'
              }`}
            >
              {/* Service Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gray-100 dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shrink-0">
                    {getServiceIcon(service.id)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {service.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-gray-100 dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-drive-darkBorder">
                        {service.tag}
                      </span>
                      {isConfigured && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Configurada</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {service.description}
                    </p>
                  </div>
                </div>

                <a
                  href={service.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <span>Obter Chave</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Input & Action Buttons */}
              <div className="mt-2.5 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={isVisible ? 'text' : 'password'}
                    value={currentKey}
                    onChange={(e) => handleKeyChange(service.id, e.target.value)}
                    placeholder={service.placeholder}
                    className="w-full pl-3.5 pr-9 py-2 text-xs font-mono rounded-xl bg-gray-50 dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(service.id)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    title={isVisible ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTestKey(service)}
                    disabled={isTesting || !currentKey.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" /> : <Sparkles className="w-3.5 h-3.5 text-blue-500" />}
                    <span>{isTesting ? 'Testando...' : 'Testar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveKey(service)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                </div>
              </div>

              {/* Test Result / Feedback Alert */}
              {testRes && (
                <div className={`mt-2.5 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
                  testRes.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                }`}>
                  {testRes.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="leading-tight">{testRes.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Chaves armazenadas exclusivamente de forma local no seu navegador.</span>
      </div>
    </div>
  );
};
