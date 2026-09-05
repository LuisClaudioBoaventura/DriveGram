import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Database, 
  ShieldCheck,
  HardDrive,
  Zap,
  Check,
  Clock,
  Trash2,
  Sliders,
  Sparkles,
  CloudUpload
} from 'lucide-react';
import { TelegramAuthState, StreamingMode, CacheDurationConfig } from '../types/index.js';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  telegramState: TelegramAuthState;
  onSyncToTelegram: () => Promise<any>;
  onRestoreFromTelegram: () => Promise<any>;
  onRefreshItems: () => void;
  syncing: boolean;
  onUpdateStreamingMode?: (mode: StreamingMode) => Promise<void>;
  onUpdateCacheDuration?: (value: number, unit: 'minutes' | 'hours' | 'days') => Promise<void>;
  onClearCache?: () => Promise<any>;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  telegramState,
  onSyncToTelegram,
  onRestoreFromTelegram,
  onRefreshItems,
  syncing,
  onUpdateStreamingMode,
  onUpdateCacheDuration,
  onClearCache
}) => {
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [importingSaved, setImportingSaved] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [syncingPending, setSyncingPending] = useState(false);
  const [performingStartupSync, setPerformingStartupSync] = useState(false);
  const [pruningOld, setPruningOld] = useState(false);
  const [retentionCount, setRetentionCount] = useState<number>(telegramState.metadataRetentionCount || 1);
  const [pendingInfo, setPendingInfo] = useState<{ totalPending: number; totalBytesFormatted: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (telegramState.metadataRetentionCount) {
      setRetentionCount(telegramState.metadataRetentionCount);
    }
  }, [telegramState.metadataRetentionCount]);

  const handleActiveStartupSync = async () => {
    setPerformingStartupSync(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/startup-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: data.message || 'Sincronização ativa e reconciliação concluídas com sucesso!' });
        onRefreshItems();
      } else {
        setFeedback({ type: 'error', message: data.error || data.message || 'Erro ao executar sincronização ativa.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Falha na conexão com o servidor.' });
    } finally {
      setPerformingStartupSync(false);
    }
  };

  const handlePruneOldMetadata = async () => {
    setPruningOld(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/prune-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keepCount: retentionCount })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ 
          type: 'success', 
          message: data.message || `${data.deletedCount || 0} backups antigos removidos com sucesso das Mensagens Salvas!` 
        });
      } else {
        setFeedback({ type: 'error', message: data.message || 'Erro ao limpar backups antigos.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Falha na conexão ao limpar backups antigos.' });
    } finally {
      setPruningOld(false);
    }
  };

  const handleUpdateRetention = async (count: number) => {
    setRetentionCount(count);
    try {
      const res = await fetch('/api/telegram/metadata-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count })
      });
      if (res.ok) {
        setFeedback({ 
          type: 'success', 
          message: `Política de retenção atualizada: Manter ${count === 1 ? 'apenas 1 backup (Mais recente)' : `os últimos ${count} backups`}.` 
        });
      }
    } catch (e) {}
  };

  const fetchPendingInfo = async () => {
    try {
      const res = await fetch('/api/telegram/pending-uploads');
      if (res.ok) {
        const data = await res.json();
        setPendingInfo({ totalPending: data.totalPending, totalBytesFormatted: data.totalBytesFormatted });
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingInfo();
    }
  }, [isOpen]);

  // Custom cache duration states
  const currentDuration = telegramState.cacheDuration || { value: 24, unit: 'hours', totalMinutes: 1440 };
  const [customValue, setCustomValue] = useState<number>(currentDuration.value || 24);
  const [customUnit, setCustomUnit] = useState<'minutes' | 'hours' | 'days'>(currentDuration.unit || 'hours');
  const [savingDuration, setSavingDuration] = useState(false);

  useEffect(() => {
    if (telegramState.cacheDuration) {
      setCustomValue(telegramState.cacheDuration.value);
      setCustomUnit(telegramState.cacheDuration.unit);
    }
  }, [telegramState.cacheDuration]);

  if (!isOpen) return null;

  const handleSync = async () => {
    setFeedback(null);
    const res = await onSyncToTelegram();
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      onRefreshItems();
    } else {
      setFeedback({ type: 'error', message: res.message || 'Erro ao sincronizar' });
    }
  };

  const handleRestore = async () => {
    setFeedback(null);
    const res = await onRestoreFromTelegram();
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      onRefreshItems();
    } else {
      setFeedback({ type: 'error', message: res.message || 'Erro ao restaurar dados' });
    }
  };

  const handleImportSaved = async () => {
    setFeedback(null);
    setImportingSaved(true);
    try {
      const res = await fetch('/api/telegram/import-saved', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: data.message });
        onRefreshItems();
      } else {
        setFeedback({ type: 'error', message: data.message || data.error || 'Erro ao importar mensagens salvas.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erro de conexão.' });
    } finally {
      setImportingSaved(false);
    }
  };

  const handleSyncPending = async () => {
    setSyncingPending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/telegram/sync-pending', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        await fetchPendingInfo();
        onRefreshItems();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao sincronizar arquivos pendentes.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Falha na conexão com o servidor.' });
    } finally {
      setSyncingPending(false);
    }
  };

  const handleDownloadAllToUploads = async () => {
    setFeedback(null);
    setDownloadingAll(true);
    try {
      const res = await fetch('/api/telegram/download-all', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message });
        onRefreshItems();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao baixar arquivos para a pasta uploads.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erro de conexão.' });
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleClearCache = async () => {
    if (!onClearCache) return;
    setFeedback(null);
    setClearingCache(true);
    try {
      const res = await onClearCache();
      if (res.success) {
        setFeedback({ type: 'success', message: res.message || 'Cache local limpo com sucesso!' });
        onRefreshItems();
      } else {
        setFeedback({ type: 'error', message: res.message || 'Erro ao limpar cache local.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Erro de conexão ao limpar cache.' });
    } finally {
      setClearingCache(false);
    }
  };

  const handleSaveDuration = async (val?: number, unt?: 'minutes' | 'hours' | 'days') => {
    const valueToSave = val !== undefined ? val : customValue;
    const unitToSave = unt !== undefined ? unt : customUnit;
    if (valueToSave < 1) return;

    setSavingDuration(true);
    try {
      await onUpdateCacheDuration?.(valueToSave, unitToSave);
      setCustomValue(valueToSave);
      setCustomUnit(unitToSave);
      setFeedback({ 
        type: 'success', 
        message: `Tempo de auto-limpeza do cache salvo: ${valueToSave} ${unitToSave === 'minutes' ? 'minuto(s)' : unitToSave === 'hours' ? 'hora(s)' : 'dia(s)'}.` 
      });
    } catch (e) {
      setFeedback({ type: 'error', message: 'Falha ao salvar configuração de cache.' });
    } finally {
      setSavingDuration(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const presets: Array<{ label: string; value: number; unit: 'minutes' | 'hours' | 'days' }> = [
    { label: '30 min', value: 30, unit: 'minutes' },
    { label: '1 hora', value: 1, unit: 'hours' },
    { label: '6 horas', value: 6, unit: 'hours' },
    { label: '12 horas', value: 12, unit: 'hours' },
    { label: '24 horas (1 dia)', value: 24, unit: 'hours' },
    { label: '3 dias', value: 3, unit: 'days' },
    { label: '7 dias', value: 7, unit: 'days' },
    { label: '30 dias', value: 30, unit: 'days' }
  ];

  const currentMode = telegramState.streamingMode || 'cloud_direct';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-drive-darkBorder mb-5 sticky top-0 bg-white/95 dark:bg-drive-darkSurface/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                Gerenciamento de Nuvem, Streaming & Cache
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure como suas mídias são reproduzidas, armazenadas e sincronizadas com o Telegram
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div className={`p-3.5 rounded-2xl mb-4 text-xs flex items-center gap-2.5 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* 1. Modo de Reprodução & Streaming com 3 Opções */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-blue-50/40 dark:from-drive-darkBg dark:to-drive-darkBg border border-indigo-100 dark:border-drive-darkBorder space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-indigo-700 dark:text-indigo-400">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Modo de Reprodução & Cache (Vídeos e Áudios)</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentMode === 'cloud_direct' 
                  ? '⚡ Streaming Nuvem' 
                  : currentMode === 'temp_cache' 
                  ? '⏳ Cache Temporário' 
                  : '💾 Cache Permanente'}
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Escolha a estratégia ideal de reprodução para economizar armazenamento ou otimizar a velocidade de buffer:
            </p>

            {/* 3 Option Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Option 1: Cloud Direct */}
              <button
                type="button"
                onClick={() => onUpdateStreamingMode?.('cloud_direct')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                  currentMode === 'cloud_direct'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25 ring-2 ring-blue-400/40'
                    : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Zap className={`w-3.5 h-3.5 ${currentMode === 'cloud_direct' ? 'text-amber-300' : 'text-amber-500'}`} />
                      Nuvem Direta
                    </span>
                    {currentMode === 'cloud_direct' && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <span className={`text-[11px] leading-tight block ${currentMode === 'cloud_direct' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    <strong>Zero Download:</strong> Transmite em tempo real do Telegram sem gravar nada no disco rígido.
                  </span>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold flex items-center gap-1 ${
                  currentMode === 'cloud_direct' ? 'border-white/20 text-blue-200' : 'border-gray-100 dark:border-drive-darkBorder text-gray-400'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  <span>Economia máxima de espaço</span>
                </div>
              </button>

              {/* Option 2: Temp Cache */}
              <button
                type="button"
                onClick={() => onUpdateStreamingMode?.('temp_cache')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                  currentMode === 'temp_cache'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25 ring-2 ring-purple-400/40'
                    : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 hover:border-purple-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${currentMode === 'temp_cache' ? 'text-purple-200' : 'text-purple-500'}`} />
                      Cache Temporário
                    </span>
                    {currentMode === 'temp_cache' && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <span className={`text-[11px] leading-tight block ${currentMode === 'temp_cache' ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    <strong>Auto-Limpeza:</strong> Salva no computador durante o uso e <strong>apaga após o tempo configurado</strong>.
                  </span>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold flex items-center gap-1 ${
                  currentMode === 'temp_cache' ? 'border-white/20 text-purple-200' : 'border-gray-100 dark:border-drive-darkBorder text-gray-400'
                }`}>
                  <Clock className="w-3 h-3" />
                  <span>{currentDuration.value} {currentDuration.unit === 'minutes' ? 'min' : currentDuration.unit === 'hours' ? 'h' : 'd'} de retenção</span>
                </div>
              </button>

              {/* Option 3: Local Cache */}
              <button
                type="button"
                onClick={() => onUpdateStreamingMode?.('local_cache')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between relative ${
                  currentMode === 'local_cache'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                    : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 hover:border-emerald-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <HardDrive className={`w-3.5 h-3.5 ${currentMode === 'local_cache' ? 'text-emerald-200' : 'text-emerald-500'}`} />
                      Cache Permanente
                    </span>
                    {currentMode === 'local_cache' && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </div>
                  <span className={`text-[11px] leading-tight block ${currentMode === 'local_cache' ? 'text-emerald-100' : 'text-gray-500 dark:text-gray-400'}`}>
                    <strong>Offline Local:</strong> Mantém os arquivos salvos para sempre na pasta <code>uploads/</code>.
                  </span>
                </div>
                <div className={`mt-2.5 pt-2 border-t text-[10px] font-semibold flex items-center gap-1 ${
                  currentMode === 'local_cache' ? 'border-white/20 text-emerald-200' : 'border-gray-100 dark:border-drive-darkBorder text-gray-400'
                }`}>
                  <HardDrive className="w-3 h-3" />
                  <span>Sem exclusão automática</span>
                </div>
              </button>
            </div>

            {/* Custom Time Picker for Cache (Shown when temp_cache is active or to customize) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              currentMode === 'temp_cache'
                ? 'bg-white dark:bg-drive-darkSurface border-purple-200 dark:border-purple-900/60 shadow-sm'
                : 'bg-gray-50/70 dark:bg-drive-darkBg/50 border-gray-200 dark:border-drive-darkBorder opacity-90'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Configurar Tempo de Retenção do Cache Temporário</span>
                </span>
                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  Atual: {currentDuration.value} {currentDuration.unit === 'minutes' ? 'minuto(s)' : currentDuration.unit === 'hours' ? 'hora(s)' : 'dia(s)'}
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {presets.map((p) => {
                  const isSelected = currentDuration.value === p.value && currentDuration.unit === p.unit;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleSaveDuration(p.value, p.unit)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-drive-darkBg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-drive-darkBorder'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Number & Unit Selector */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                <span className="text-xs text-gray-500 dark:text-gray-400 self-start sm:self-center">
                  Personalizar tempo exato:
                </span>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={customValue}
                    onChange={(e) => setCustomValue(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-gray-800 dark:text-gray-100 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />

                  {/* Strictly Black background for selector as requested */}
                  <select
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value as any)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-black text-white border border-gray-800 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="minutes" className="bg-black text-white">Minutos</option>
                    <option value="hours" className="bg-black text-white">Horas</option>
                    <option value="days" className="bg-black text-white">Dias</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleSaveDuration()}
                    disabled={savingDuration}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingDuration ? 'Salvando...' : 'Aplicar Tempo'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cache Storage Meter & Instant Clear Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                    Espaço em Cache Local (Disco): {formatBytes(telegramState.localCacheSizeBytes || 0)}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Arquivos salvos na pasta <code>uploads/</code>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                disabled={clearingCache || (telegramState.localCacheSizeBytes || 0) === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearingCache ? 'Limpando...' : 'Limpar Todo o Cache Agora'}</span>
              </button>
            </div>
          </div>

          {/* 2. Sincronização de Arquivos Pendentes */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-300">
                <CloudUpload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Arquivos Pendentes de Envio ao Telegram</span>
              </div>
              {pendingInfo && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  pendingInfo.totalPending > 0 
                    ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200' 
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {pendingInfo.totalPending > 0 ? `${pendingInfo.totalPending} pendente(s)` : 'Tudo salvo na nuvem'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              {pendingInfo && pendingInfo.totalPending > 0
                ? `Você possui ${pendingInfo.totalPending} arquivo(s) (${pendingInfo.totalBytesFormatted}) salvos apenas no cache local. Envie-os agora para salvar de forma permanente e ilimitada no Telegram.`
                : 'Todos os seus arquivos locais estão devidamente salvos e sincronizados com as Mensagens Salvas do Telegram.'}
            </p>

            {pendingInfo && pendingInfo.totalPending > 0 && (
              <button
                onClick={handleSyncPending}
                disabled={syncingPending || !telegramState.isConnected}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              >
                <CloudUpload className={`w-4 h-4 ${syncingPending ? 'animate-bounce' : ''}`} />
                <span>{syncingPending ? 'Enviando Arquivos Pendentes para o Telegram...' : `📤 Enviar ${pendingInfo.totalPending} Arquivo(s) Pendente(s) Agora`}</span>
              </button>
            )}
          </div>

          {/* 3. Sincronização Automática & Contínua com Telegram (Mensagens Salvas) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 via-sky-50/40 to-indigo-50/50 dark:from-drive-darkBg dark:to-drive-darkBg border border-blue-200 dark:border-blue-900/60 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 font-bold text-xs text-blue-700 dark:text-blue-400">
                <Send className="w-4 h-4" />
                <span>Sincronização Ativa & Backup Contínuo de Metadados</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Backup Automático Ativo (3.5s)
              </span>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
              Ao iniciar o app no Desktop ou no celular, os metadados são reconciliados automaticamente com o Telegram. Qualquer alteração (inclusão, renomeação, exclusão de pastas ou arquivos) é salva em segundo plano de forma contínua em disco e nas suas Mensagens Salvas.
            </p>

            {/* Sincronização Ativa Manual / Forçada */}
            <button
              onClick={handleActiveStartupSync}
              disabled={performingStartupSync || syncing || !telegramState.isConnected}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40 mb-3"
            >
              <RefreshCw className={`w-4 h-4 ${performingStartupSync ? 'animate-spin' : ''}`} />
              <span>{performingStartupSync ? 'Reconciliando Metadados com o Telegram...' : '🔄 Executar Sincronização Ativa Agora (Reconciliar com Nuvem)'}</span>
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleSync}
                disabled={syncing || downloadingAll}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Sincronizando...' : 'Fazer Backup no Telegram'}</span>
              </button>

              <button
                onClick={handleRestore}
                disabled={syncing || downloadingAll || !telegramState.isConnected}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 font-bold text-xs transition-all disabled:opacity-40"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Restaurar Metadados</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleImportSaved}
                disabled={importingSaved || syncing || !telegramState.isConnected}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              >
                <Sparkles className={`w-3.5 h-3.5 ${importingSaved ? 'animate-spin' : ''}`} />
                <span>{importingSaved ? 'Escaneando & Importando Mensagens Salvas...' : '✨ Escanear & Importar Histórico Antigo do Telegram'}</span>
              </button>

              <button
                onClick={handleDownloadAllToUploads}
                disabled={downloadingAll || syncing || !telegramState.isConnected}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingAll ? 'animate-bounce' : ''}`} />
                <span>{downloadingAll ? 'Baixando Arquivos do Telegram...' : '📥 Baixar Todos os Arquivos para a Pasta Uploads'}</span>
              </button>
            </div>

            {/* 3.1 Política de Retenção & Faxina de Metadados nas Mensagens Salvas */}
            <div className="mt-3 pt-3 border-t border-blue-100 dark:border-drive-darkBorder">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Política de Retenção (Mensagens Salvas Limpas):</span>
                </span>
                
                <div className="flex items-center gap-1.5 self-start sm:self-auto">
                  {[
                    { label: '1 (Apenas Mais Recente)', count: 1 },
                    { label: '3 (Segurança)', count: 3 },
                    { label: '5 (Histórico)', count: 5 }
                  ].map(opt => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => handleUpdateRetention(opt.count)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                        retentionCount === opt.count
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-drive-darkBorder hover:border-blue-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-blue-100/50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-900/60">
                <span className="text-[11px] text-gray-600 dark:text-gray-300 leading-tight">
                  Auto-limpeza ativa: ao salvar cada alteração, backups excedentes são apagados automaticamente do Telegram.
                </span>
                <button
                  type="button"
                  onClick={handlePruneOldMetadata}
                  disabled={pruningOld || !telegramState.isConnected}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-40 shadow-sm"
                >
                  <Trash2 className={`w-3.5 h-3.5 text-rose-500 ${pruningOld ? 'animate-bounce' : ''}`} />
                  <span>{pruningOld ? 'Limpando Mensagens...' : '🧹 Limpar Backups Duplicados Antigos Agora'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Exportação e Importação Manual (JSON) */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder">
            <div className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-1">
              Exportação e Importação Manual (JSON)
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Guarde uma cópia física do arquivo de índice e metadados no seu computador.
            </p>

            <div className="flex gap-2">
              <a
                href="/api/manifest/export"
                download="drivegram_backup.json"
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:bg-gray-100 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-colors text-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Backup JSON</span>
              </a>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface hover:bg-gray-100 text-gray-700 dark:text-gray-200 font-semibold text-xs transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Backup JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const res = await fetch('/api/manifest/import', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(json)
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setFeedback({ type: 'success', message: 'Backup importado com sucesso!' });
                      onRefreshItems();
                    } else {
                      setFeedback({ type: 'error', message: data.error || 'Erro ao importar backup' });
                    }
                  } catch (err: any) {
                    setFeedback({ type: 'error', message: 'Arquivo JSON inválido' });
                  }
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
