import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Check, 
  Trash2, 
  Plus, 
  Clock, 
  Play, 
  Sliders, 
  FileText, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { VideoSubtitle, VideoTimestamp } from '../types/index.js';
import { 
  SubtitleCue, 
  GenerationMode, 
  fetchAndParseSubtitle, 
  parseSubtitleContent,
  generateTimestampsFromCues, 
  formatTimeFormatted 
} from '../utils/subtitleMarkersGenerator.js';

interface GenerateMarkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitles: VideoSubtitle[];
  selectedSubId?: string;
  rawSubtitleText?: string;
  videoDuration?: number;
  onSaveTimestamps: (timestamps: VideoTimestamp[]) => Promise<void> | void;
  onSeek?: (seconds: number) => void;
}

export const GenerateMarkersModal: React.FC<GenerateMarkersModalProps> = ({
  isOpen,
  onClose,
  subtitles,
  selectedSubId,
  rawSubtitleText,
  videoDuration = 0,
  onSaveTimestamps,
  onSeek
}) => {
  const [activeSubId, setActiveSubId] = useState<string>(() => {
    if (selectedSubId && selectedSubId !== 'none') return selectedSubId;
    return subtitles[0]?.id || '';
  });
  const [generationMode, setGenerationMode] = useState<GenerationMode>('auto');
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [generatedTimestamps, setGeneratedTimestamps] = useState<VideoTimestamp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load and parse subtitle cues
  useEffect(() => {
    if (!isOpen) return;

    const loadCues = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (rawSubtitleText) {
          const parsed = parseSubtitleContent(rawSubtitleText);
          if (parsed.length === 0) throw new Error('Nenhuma fala encontrada no texto da legenda.');
          setCues(parsed);
          const initialTs = generateTimestampsFromCues(parsed, generationMode, videoDuration);
          setGeneratedTimestamps(initialTs);
          return;
        }

        const targetSub = subtitles.find(s => s.id === activeSubId) || subtitles[0];
        if (!targetSub) throw new Error('Nenhuma legenda selecionada.');

        const url = targetSub.url || `/api/subtitles/${targetSub.id}`;
        const parsed = await fetchAndParseSubtitle(url);
        if (parsed.length === 0) throw new Error('Legenda vazia ou sem falas identificadas.');

        setCues(parsed);
        const initialTs = generateTimestampsFromCues(parsed, generationMode, videoDuration);
        setGeneratedTimestamps(initialTs);
      } catch (err: any) {
        console.error('Error parsing subtitles for markers:', err);
        setError(err.message || 'Erro ao ler arquivo de legenda.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCues();
  }, [isOpen, activeSubId, rawSubtitleText]);

  // Recalculate when mode changes
  const handleModeChange = (mode: GenerationMode) => {
    setGenerationMode(mode);
    if (cues.length > 0) {
      const updated = generateTimestampsFromCues(cues, mode, videoDuration);
      setGeneratedTimestamps(updated);
    }
  };

  const handleUpdateTitle = (id: string, newLabel: string) => {
    setGeneratedTimestamps(prev => 
      prev.map(ts => ts.id === id ? { ...ts, label: newLabel } : ts)
    );
  };

  const handleDeleteTimestamp = (id: string) => {
    setGeneratedTimestamps(prev => prev.filter(ts => ts.id !== id));
  };

  const handleAddManualMarker = () => {
    const last = generatedTimestamps[generatedTimestamps.length - 1];
    const newSeconds = last ? last.seconds + 60 : 0;
    const newTs: VideoTimestamp = {
      id: `ts-${Date.now()}-custom`,
      seconds: newSeconds,
      timeFormatted: formatTimeFormatted(newSeconds),
      label: `Novo Capítulo ${generatedTimestamps.length + 1}`
    };
    setGeneratedTimestamps(prev => [...prev, newTs].sort((a, b) => a.seconds - b.seconds));
  };

  const handleSave = async () => {
    if (generatedTimestamps.length === 0) return;
    setIsSaving(true);
    try {
      await onSaveTimestamps(generatedTimestamps);
      onClose();
    } catch (err) {
      console.error('Error saving generated timestamps:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-gray-950/80 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Gerar Marcadores da Legenda
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 font-semibold">
                  1 Clique
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Identifica pausas, transições de cena e tópicos para criar capítulos automáticos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Subtitle Selector if multiple subtitles exist */}
          {subtitles.length > 1 && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-gray-950/60 border border-gray-800">
              <FileText className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-300">Legenda Fonte:</span>
              <select
                value={activeSubId}
                onChange={(e) => setActiveSubId(e.target.value)}
                className="flex-1 bg-gray-900 text-xs text-white px-3 py-1.5 rounded-xl border border-gray-700 focus:outline-none focus:border-purple-500"
              >
                {subtitles.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.label || sub.srclang || 'Legenda'} ({sub.srclang || 'pt'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Generation Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span>Modo de Segmentação:</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('auto')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left flex flex-col gap-0.5 ${
                  generationMode === 'auto'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/80 shadow-md shadow-purple-600/10'
                    : 'bg-gray-950/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  ✨ Automático
                </span>
                <span className="text-[10px] text-gray-400">Por Cenas / Pausas</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('interval_2m')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left flex flex-col gap-0.5 ${
                  generationMode === 'interval_2m'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/80 shadow-md shadow-purple-600/10'
                    : 'bg-gray-950/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  ⏱️ A cada 2 min
                </span>
                <span className="text-[10px] text-gray-400">Capítulos curtos</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('interval_5m')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left flex flex-col gap-0.5 ${
                  generationMode === 'interval_5m'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/80 shadow-md shadow-purple-600/10'
                    : 'bg-gray-950/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  ⏱️ A cada 5 min
                </span>
                <span className="text-[10px] text-gray-400">Padrão balanceado</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('interval_10m')}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left flex flex-col gap-0.5 ${
                  generationMode === 'interval_10m'
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/80 shadow-md shadow-purple-600/10'
                    : 'bg-gray-950/60 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                }`}
              >
                <span className="font-bold flex items-center gap-1">
                  ⏱️ A cada 10 min
                </span>
                <span className="text-[10px] text-gray-400">Filmes longos</span>
              </button>
            </div>
          </div>

          {/* Loading / Error / List States */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-xs text-gray-300 font-medium">Analisando legendas e segmentando cenas...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-300">Não foi possível processar a legenda</h4>
                <p className="text-xs text-rose-400/90 mt-0.5">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300">
                  Marcadores Gerados ({generatedTimestamps.length}):
                </span>
                <button
                  type="button"
                  onClick={handleAddManualMarker}
                  className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Marcador</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {generatedTimestamps.map((ts, index) => (
                  <div
                    key={ts.id}
                    className="flex items-center gap-2 p-2.5 rounded-2xl bg-gray-950/70 border border-gray-800 hover:border-purple-500/50 transition-all group"
                  >
                    {/* Timestamp Badge / Seek Button */}
                    <button
                      type="button"
                      onClick={() => onSeek?.(ts.seconds)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 hover:bg-purple-900 text-xs font-mono font-bold shrink-0 transition-colors"
                      title="Testar e pular para este ponto no vídeo"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>{ts.timeFormatted}</span>
                    </button>

                    {/* Editable Title */}
                    <input
                      type="text"
                      value={ts.label}
                      onChange={(e) => handleUpdateTitle(ts.id, e.target.value)}
                      placeholder="Nome do capítulo..."
                      className="flex-1 min-w-0 bg-transparent text-xs text-gray-200 font-medium placeholder-gray-500 focus:outline-none focus:text-white"
                    />

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteTimestamp(ts.id)}
                      className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors shrink-0 opacity-80 group-hover:opacity-100"
                      title="Excluir este capítulo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 bg-gray-950/90 border-t border-gray-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isLoading || !!error || generatedTimestamps.length === 0 || isSaving}
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSaving 
                ? 'Salvando...' 
                : `Salvar ${generatedTimestamps.length} Marcadores`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
