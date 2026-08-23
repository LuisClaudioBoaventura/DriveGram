import React, { useState, useEffect } from 'react';
import { Key, Sparkles, Check, ExternalLink, X, ShieldCheck, AlertCircle, Loader2, Film } from 'lucide-react';
import { getStoredOmdbApiKey, setStoredOmdbApiKey, searchOmdbMovies } from '../services/omdbService.js';

interface OmdbKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (newKey: string) => void;
}

export const OmdbKeyModal: React.FC<OmdbKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredOmdbApiKey();
      setApiKey(stored);
      setIsSaved(Boolean(stored));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredOmdbApiKey(apiKey);
    setIsSaved(Boolean(apiKey.trim()));
    if (onKeySaved) {
      onKeySaved(apiKey.trim());
    }
    setTestResult({
      success: true,
      message: apiKey.trim() ? 'Chave salva com sucesso! O DriveGram usará esta chave para todas as buscas automáticas.' : 'Chave removida. O sistema utilizará o fallback padrão.'
    });
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Digite uma chave de API antes de testar.'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await searchOmdbMovies({
      query: 'Inception',
      apiKey: keyToTest
    });

    setTesting(false);
    if (res.error) {
      setTestResult({
        success: false,
        message: `Falha no teste: ${res.error}`
      });
    } else {
      setTestResult({
        success: true,
        message: 'Conexão com OMDb realizada com sucesso! A chave é válida e funcional.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>Chave de API do OMDb</span>
                {isSaved && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Configurada</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure uma única vez para puxar dados automáticos de filmes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Explanation Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-red-500/5 to-transparent border border-amber-500/20 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
              <Film className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Para que serve a chave OMDb?</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
              Com a chave cadastrada, ao adicionar qualquer filme, o DriveGram preenche automaticamente <strong>pôster em alta definição, nota IMDb, sinopse, diretor, elenco, gênero e ano</strong> com 1 clique.
            </p>
          </div>

          {/* Key Input Form */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Sua Chave de API (API Key)
              </label>
              <a
                href="https://www.omdbapi.com/apikey.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-amber-500 hover:underline font-bold flex items-center gap-1"
              >
                <span>Obter chave gratuita (OMDb API)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ex: 8a4c12ef ou sua chave de 8 dígitos"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-gray-400 block">
              🔒 A chave é armazenada de forma segura e local no seu navegador.
            </span>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight text-[11px] font-medium">{testResult.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={testing || !apiKey.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-bold transition-all disabled:opacity-40"
            >
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
              <span>Testar Chave</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Chave</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
