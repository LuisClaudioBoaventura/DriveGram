import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause,
  CheckCircle2, 
  Circle, 
  Edit3, 
  Trash2, 
  Tv, 
  Layers, 
  X, 
  Download, 
  SkipForward, 
  SkipBack, 
  FastForward,
  Shuffle,
  Repeat,
  List,
  LayoutGrid,
  Search,
  ExternalLink,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Check,
  Share2,
  Maximize2,
  Film,
  Video,
  Info
} from 'lucide-react';
import { SeriesShow, SeriesEpisode, DriveItem } from '../types/index.js';

interface SeriesStudioViewProps {
  series: SeriesShow;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateSeries: (updated: SeriesShow) => Promise<void>;
  onDeleteSeries: (id: string) => void;
  onToggleEpisodeCompletion: (episodeId: string) => Promise<void>;
  onUpdateEpisodeProgress: (episodeId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
}

export const SeriesStudioView: React.FC<SeriesStudioViewProps> = ({
  series,
  allFiles,
  onBackToCatalog,
  onUpdateSeries,
  onDeleteSeries,
  onToggleEpisodeCompletion,
  onUpdateEpisodeProgress,
  onOpenEditModal
}) => {
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const seasons = series.seasons || [];
  const currentSeason = seasons[selectedSeasonIdx] || seasons[0];
  const allEpisodes = seasons.flatMap(s => s.episodes || []);
  const totalEpisodes = allEpisodes.length;
  const completedEpisodes = allEpisodes.filter(e => e.isCompleted).length;
  const progressPct = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;

  // Active playing episode state
  const [playingEpisode, setPlayingEpisode] = useState<SeriesEpisode | null>(() => {
    return allEpisodes.find(e => !e.isCompleted) || allEpisodes[0] || null;
  });

  // UI Modes & Controls
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextEpisodeToPlay, setNextEpisodeToPlay] = useState<SeriesEpisode | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const activeEpisodeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active item in sidebar into view
  useEffect(() => {
    if (activeEpisodeRef.current) {
      activeEpisodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [playingEpisode?.id]);

  // Keep playing episode status updated if parent series data updates
  useEffect(() => {
    if (playingEpisode) {
      const refreshed = allEpisodes.find(e => e.id === playingEpisode.id);
      if (refreshed && refreshed.isCompleted !== playingEpisode.isCompleted) {
        setPlayingEpisode(prev => prev && prev.id === refreshed.id ? { ...prev, isCompleted: refreshed.isCompleted } : prev);
      }
    }
  }, [series]);

  const handleStartPlaying = (episode: SeriesEpisode) => {
    setCountdown(null);
    setNextEpisodeToPlay(null);
    setPlayingEpisode(episode);

    // Sync selectedSeasonIdx with the episode's season
    const sIdx = seasons.findIndex(s => s.episodes?.some(e => e.id === episode.id));
    if (sIdx >= 0 && sIdx !== selectedSeasonIdx) {
      setSelectedSeasonIdx(sIdx);
    }
  };

  // Next episode finder (supports Shuffle / Random)
  const getNextEpisode = useCallback((currentEp: SeriesEpisode): SeriesEpisode | null => {
    if (isShuffle) {
      const candidates = allEpisodes.filter(e => e.id !== currentEp.id && !e.isCompleted);
      const pool = candidates.length > 0 ? candidates : allEpisodes.filter(e => e.id !== currentEp.id);
      if (pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        return pool[idx];
      }
    }
    const flatIndex = allEpisodes.findIndex(e => e.id === currentEp.id);
    if (flatIndex >= 0 && flatIndex < allEpisodes.length - 1) {
      return allEpisodes[flatIndex + 1];
    } else if (flatIndex === allEpisodes.length - 1 && allEpisodes.length > 1) {
      // Loop back to start if at last episode
      return allEpisodes[0];
    }
    return null;
  }, [allEpisodes, isShuffle]);

  // Previous episode finder
  const getPreviousEpisode = useCallback((currentEp: SeriesEpisode): SeriesEpisode | null => {
    const flatIndex = allEpisodes.findIndex(e => e.id === currentEp.id);
    if (flatIndex > 0) {
      return allEpisodes[flatIndex - 1];
    }
    return null;
  }, [allEpisodes]);

  const handleEpisodeEnded = useCallback(() => {
    if (!playingEpisode) return;
    
    // Mark current episode progress as completed
    onUpdateEpisodeProgress(playingEpisode.id, 0, true);

    if (isAutoPlayNext) {
      const nextEp = getNextEpisode(playingEpisode);
      if (nextEp) {
        setNextEpisodeToPlay(nextEp);
        setCountdown(3); // 3 seconds countdown
      }
    }
  }, [playingEpisode, onUpdateEpisodeProgress, isAutoPlayNext, getNextEpisode]);

  // Countdown timer handler for autoplay
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      if (nextEpisodeToPlay) {
        handleStartPlaying(nextEpisodeToPlay);
      }
      setCountdown(null);
      setNextEpisodeToPlay(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, nextEpisodeToPlay]);

  // YouTube IFrame Player message listener for autoplay
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch {
            return;
          }
        }
        if (!data || typeof data !== 'object') return;

        // YouTube IFrame API messages:
        // 1. onStateChange with info === 0 (YT.PlayerState.ENDED)
        // 2. infoDelivery with info.playerState === 0
        const isEnded = 
          (data.event === 'onStateChange' && (data.info === 0 || data.info === '0')) ||
          (data.event === 'infoDelivery' && (data.info?.playerState === 0 || data.info?.playerState === '0'));

        if (isEnded) {
          handleEpisodeEnded();
        }
      } catch (err) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [handleEpisodeEnded]);

  // Continuously register 'listening' to YouTube iframe so it sends stateChange postMessages
  useEffect(() => {
    if (!iframeRef.current) return;
    const sendListening = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening', id: playingEpisode?.id || 'yt-player' }),
          '*'
        );
      } catch (e) {}
    };

    sendListening();
    const interval = setInterval(sendListening, 1500);
    return () => clearInterval(interval);
  }, [playingEpisode?.id]);

  const handlePlayNext = () => {
    if (!playingEpisode) return;
    const next = getNextEpisode(playingEpisode);
    if (next) handleStartPlaying(next);
  };

  const handlePlayPrevious = () => {
    if (!playingEpisode) return;
    const prev = getPreviousEpisode(playingEpisode);
    if (prev) handleStartPlaying(prev);
  };

  const handlePlayRandom = () => {
    const uncompleted = allEpisodes.filter(e => !e.isCompleted);
    const pool = uncompleted.length > 0 ? uncompleted : allEpisodes;
    if (pool.length === 0) return;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];
    setIsShuffle(true);
    handleStartPlaying(chosen);
  };

  const playingFile = playingEpisode?.fileId ? allFiles.find(f => f.id === playingEpisode.fileId) : null;

  // Filter episodes by season and search query
  const seasonEpisodes = currentSeason?.episodes || [];
  const filteredEpisodes = seasonEpisodes.filter(ep => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ep.title.toLowerCase().includes(q) ||
      `episodio ${ep.episodeNumber}`.includes(q) ||
      `e${ep.episodeNumber}`.includes(q)
    );
  });

  // Extract YouTube ID helper for clean thumbnail and embed
  const getYouTubeVideoId = (ep: SeriesEpisode): string | null => {
    const targetUrl = ep.embedUrl || ep.videoUrl || '';
    const match = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : null;
  };

  const getEpisodeThumbnail = (ep: SeriesEpisode): string => {
    const ytId = getYouTubeVideoId(ep);
    if (ytId) {
      return `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
    }
    const epFile = ep.fileId ? allFiles.find(f => f.id === ep.fileId) : null;
    return epFile?.thumbnailUrl || series.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60';
  };

  const embedOrigin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  const ytVideoId = playingEpisode ? getYouTubeVideoId(playingEpisode) : null;
  const ytEmbedUrl = playingEpisode
    ? ytVideoId
      ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&origin=${embedOrigin}`
      : playingEpisode.embedUrl?.includes('?')
      ? `${playingEpisode.embedUrl}&autoplay=1&enablejsapi=1&origin=${embedOrigin}`
      : `${playingEpisode.embedUrl}?autoplay=1&enablejsapi=1&origin=${embedOrigin}`
    : '';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-gray-100 overflow-hidden select-none font-sans">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onBackToCatalog}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-purple-400 border border-gray-800 transition-all active:scale-95 shrink-0"
            title="Voltar para Catálogo de Séries / Canais"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-purple-500/30 shrink-0 bg-black">
              <img
                src={series.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60'}
                alt={series.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-xs sm:text-sm font-black text-white truncate max-w-xs sm:max-w-md">
                {series.title}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="text-purple-400 font-bold">{series.category || 'Série / Canal'}</span>
                <span>•</span>
                <span>{totalEpisodes} vídeos</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">{completedEpisodes} assistidos ({progressPct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Season Selector Tabs (if multi-season) */}
          {seasons.length > 1 && (
            <div className="hidden md:flex items-center gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800">
              {seasons.map((season, idx) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeasonIdx(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    selectedSeasonIdx === idx
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {season.title || `T${season.seasonNumber || idx + 1}`} ({season.episodes?.length || 0})
                </button>
              ))}
            </div>
          )}

          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isSidebarOpen
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-700'
            }`}
            title={isSidebarOpen ? 'Ocultar barra lateral de vídeos' : 'Exibir barra lateral de vídeos'}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSidebarOpen ? 'Barra Lateral' : 'Mostrar Vídeos'}</span>
          </button>

          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-purple-400 border border-gray-800 transition-all"
              title="Editar Dados & Capa"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Deseja excluir "${series.title}"?`)) {
                onDeleteSeries(series.id);
                onBackToCatalog();
              }
            }}
            className="p-2 rounded-xl bg-gray-900 hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-gray-800 hover:border-rose-900 transition-all"
            title="Excluir Coleção"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Workspace (2-Column Player + Sidebar) */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto relative">
        {/* ================= LEFT / MAIN VIDEO PLAYER WORKSPACE ================= */}
        <div className="flex-1 flex flex-col lg:h-full lg:overflow-y-auto bg-black text-white p-3 sm:p-5 space-y-4 shrink-0 lg:shrink">
          {/* Cinema Video Player Container */}
          <div className="relative w-full aspect-video max-h-[70vh] bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-800 shadow-2xl flex items-center justify-center group shrink-0">
            {playingEpisode ? (
              playingFile ? (
                <video
                  ref={videoRef}
                  key={playingFile.id}
                  src={`/api/stream/${playingFile.id}`}
                  controls
                  autoPlay
                  playsInline
                  crossOrigin="anonymous"
                  onEnded={handleEpisodeEnded}
                  className="w-full h-full object-contain"
                />
              ) : ytEmbedUrl ? (
                <iframe
                  ref={iframeRef}
                  key={playingEpisode.id}
                  id="yt-player"
                  src={ytEmbedUrl}
                  title={playingEpisode.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  onLoad={() => {
                    try {
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({ event: 'listening', id: 'yt-player' }),
                        '*'
                      );
                    } catch (e) {}
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <Tv className="w-12 h-12 mb-3 text-purple-400" />
                  <p className="text-sm font-semibold">Fonte de vídeo não disponível</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Tv className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nenhum vídeo selecionado</h3>
                  <p className="text-xs text-gray-400 mt-1">Selecione um vídeo na barra lateral ou clique no botão abaixo para começar.</p>
                </div>
                <button
                  onClick={handlePlayRandom}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all active:scale-95"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Assistir Aleatório</span>
                </button>
              </div>
            )}

            {/* Autoplay Next Episode Countdown Overlay */}
            {countdown !== null && nextEpisodeToPlay && (
              <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 space-y-4 animate-in fade-in duration-200">
                <div className="w-14 h-14 rounded-full bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 animate-pulse font-mono text-xl font-black">
                  {countdown}
                </div>
                <div className="space-y-1 max-w-md">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    ⏭️ Próximo Episódio em {countdown}s
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2">
                    {nextEpisodeToPlay.title}
                  </h3>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCountdown(null);
                      setNextEpisodeToPlay(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-all border border-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleStartPlaying(nextEpisodeToPlay)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Tocar Agora</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Episode Info & Controls Bar */}
          {playingEpisode && (
            <div className="bg-gray-900/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-800/90 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
                <div className="space-y-1 overflow-hidden flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[11px] font-black uppercase">
                      T{playingEpisode.seasonNumber || 1}:E{playingEpisode.episodeNumber}
                    </span>
                    {playingEpisode.duration && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{playingEpisode.duration}</span>
                      </span>
                    )}
                    {playingEpisode.isCompleted && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800/60">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Assistido</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {playingEpisode.title}
                  </h2>
                </div>

                {/* Main Player Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Mark as watched toggle */}
                  <button
                    onClick={() => onToggleEpisodeCompletion(playingEpisode.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      playingEpisode.isCompleted
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30'
                        : 'bg-gray-800 hover:bg-gray-750 text-gray-300 border-gray-700 hover:text-emerald-400'
                    }`}
                    title={playingEpisode.isCompleted ? 'Marcar como não assistido' : 'Marcar como assistido'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{playingEpisode.isCompleted ? 'Concluído' : 'Marcar Visto'}</span>
                  </button>

                  {/* Previous Episode Button */}
                  <button
                    onClick={handlePlayPrevious}
                    disabled={!getPreviousEpisode(playingEpisode)}
                    className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Vídeo Anterior"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  {/* Next Episode Button */}
                  <button
                    onClick={handlePlayNext}
                    disabled={!getNextEpisode(playingEpisode)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                    title="Próximo Vídeo"
                  >
                    <span>Próximo</span>
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description / Additional Info */}
              {playingEpisode.description ? (
                <p className="text-xs text-gray-400 leading-relaxed max-w-4xl whitespace-pre-line">
                  {playingEpisode.description}
                </p>
              ) : series.description ? (
                <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
                  {series.description}
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* ================= RIGHT / BARRA LATERAL DE VÍDEOS (PLAYLIST SIDEBAR) ================= */}
        {isSidebarOpen && (
          <div className="w-full lg:w-96 xl:w-[420px] flex flex-col lg:h-full bg-gray-950 border-t lg:border-t-0 lg:border-l border-gray-800 shrink-0 z-10 transition-all">
            {/* Sidebar Controls Header */}
            <div className="p-3.5 bg-gray-900/90 border-b border-gray-800 space-y-3 shrink-0">
              {/* Header Title & Mode Switches */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Vídeos do Canal ({filteredEpisodes.length})
                  </h3>
                </div>

                {/* View Mode Toggle: Lista vs Grade */}
                <div className="flex items-center bg-gray-950 p-0.5 rounded-xl border border-gray-800">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'list'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Visualizar em Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Lista</span>
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'grid'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    title="Visualizar em Grade"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Grade</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Assistir Aleatório & Tocar Próximo Automático */}
              <div className="grid grid-cols-2 gap-2">
                {/* Botão Assistir Aleatório */}
                <button
                  onClick={handlePlayRandom}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 shadow-sm ${
                    isShuffle
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-gray-800/90 text-gray-300 border-gray-750 hover:bg-gray-800 hover:text-white'
                  }`}
                  title="Tocar um vídeo aleatório da lista"
                >
                  <Shuffle className={`w-3.5 h-3.5 ${isShuffle ? 'text-amber-400' : ''}`} />
                  <span>{isShuffle ? 'Aleatório: Ativo' : 'Aleatório'}</span>
                </button>

                {/* Botão Tocar Próximo Automaticamente */}
                <button
                  onClick={() => setIsAutoPlayNext(!isAutoPlayNext)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 shadow-sm ${
                    isAutoPlayNext
                      ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
                      : 'bg-gray-800/90 text-gray-400 border-gray-750 hover:bg-gray-800 hover:text-white'
                  }`}
                  title={isAutoPlayNext ? 'Autoplay ativado (toca o próximo ao finalizar)' : 'Autoplay desativado'}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAutoPlayNext ? 'text-emerald-400' : ''}`} />
                  <span>{isAutoPlayNext ? 'Autoplay: Ligado' : 'Autoplay: Off'}</span>
                </button>
              </div>

              {/* Fast Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar entre todos os vídeos..."
                  className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-gray-950 border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white placeholder-gray-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sidebar Episode List / Grid Content */}
            <div className="lg:flex-1 lg:overflow-y-auto p-2 sm:p-3 scrollbar-thin scrollbar-thumb-gray-800 max-h-[500px] lg:max-h-none">
              {filteredEpisodes.length > 0 ? (
                viewMode === 'list' ? (
                  // ================= LIST VIEW =================
                  <div className="space-y-1.5">
                    {filteredEpisodes.map((ep) => {
                      const isCurrent = playingEpisode?.id === ep.id;
                      const thumb = getEpisodeThumbnail(ep);

                      return (
                        <div
                          key={ep.id}
                          ref={isCurrent ? activeEpisodeRef : null}
                          onClick={() => handleStartPlaying(ep)}
                          className={`flex items-center gap-2.5 p-2 rounded-2xl cursor-pointer transition-all border text-xs group ${
                            isCurrent
                              ? 'bg-purple-950/60 border-purple-500/80 shadow-md shadow-purple-950/40 text-white font-bold'
                              : ep.isCompleted
                              ? 'bg-gray-900/40 border-gray-850 hover:bg-gray-900/80 text-gray-400'
                              : 'bg-gray-900/70 border-gray-800/80 hover:bg-gray-850 text-gray-200'
                          }`}
                        >
                          {/* Completion Checkbox */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleEpisodeCompletion(ep.id);
                            }}
                            className="p-0.5 text-gray-400 hover:text-emerald-400 shrink-0 transition-colors"
                            title={ep.isCompleted ? 'Assistido' : 'Marcar como assistido'}
                          >
                            {ep.isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>

                          {/* Mini Thumbnail with Duration Overlay */}
                          <div className="relative w-20 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-gray-800">
                            <img
                              src={thumb}
                              alt={ep.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            {ep.duration && (
                              <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/85 text-gray-200 font-mono text-[9px] rounded font-bold">
                                {ep.duration}
                              </span>
                            )}
                            {isCurrent && (
                              <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                <Play className="w-4 h-4 text-white fill-current animate-pulse" />
                              </div>
                            )}
                          </div>

                          {/* Video Info */}
                          <div className="flex-1 overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-purple-400 shrink-0">
                                #{ep.episodeNumber}
                              </span>
                              <span className={`truncate block leading-tight ${isCurrent ? 'text-purple-300 font-bold' : ''}`}>
                                {ep.title}
                              </span>
                            </div>
                            {ep.isCompleted && (
                              <span className="text-[10px] text-emerald-400/90 flex items-center gap-1 mt-0.5">
                                ✓ Assistido
                              </span>
                            )}
                          </div>

                          {/* Quick Play Arrow on Hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartPlaying(ep);
                            }}
                            className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                              isCurrent ? 'bg-purple-600 text-white opacity-100' : 'bg-gray-800 text-gray-300 hover:text-white'
                            }`}
                            title="Assistir agora"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // ================= GRID VIEW =================
                  <div className="grid grid-cols-2 gap-2.5">
                    {filteredEpisodes.map((ep) => {
                      const isCurrent = playingEpisode?.id === ep.id;
                      const thumb = getEpisodeThumbnail(ep);

                      return (
                        <div
                          key={ep.id}
                          ref={isCurrent ? activeEpisodeRef : null}
                          onClick={() => handleStartPlaying(ep)}
                          className={`flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all border group relative ${
                            isCurrent
                              ? 'bg-purple-950/70 border-purple-500 shadow-md shadow-purple-950/50 ring-2 ring-purple-500/50'
                              : ep.isCompleted
                              ? 'bg-gray-900/40 border-gray-850 hover:bg-gray-900 opacity-80'
                              : 'bg-gray-900/80 border-gray-800 hover:bg-gray-850 hover:border-gray-700'
                          }`}
                        >
                          {/* Thumbnail Image Container */}
                          <div className="relative aspect-video w-full bg-black overflow-hidden">
                            <img
                              src={thumb}
                              alt={ep.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            {ep.duration && (
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/85 text-white font-mono text-[9px] rounded-md font-bold">
                                {ep.duration}
                              </span>
                            )}
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-950/90 text-purple-300 font-mono text-[9px] rounded-md font-bold border border-purple-800/60">
                              #{ep.episodeNumber}
                            </span>
                            {isCurrent && (
                              <div className="absolute inset-0 bg-purple-600/40 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white fill-current animate-pulse" />
                              </div>
                            )}
                            {ep.isCompleted && (
                              <div className="absolute top-1 right-1 p-0.5 bg-emerald-950/90 text-emerald-400 rounded-full border border-emerald-700/60">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          {/* Card Text Content */}
                          <div className="p-2.5 space-y-1 flex-1 flex flex-col justify-between">
                            <h4 className={`text-[11px] font-semibold line-clamp-2 leading-tight ${isCurrent ? 'text-purple-300 font-bold' : 'text-gray-200'}`}>
                              {ep.title}
                            </h4>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleEpisodeCompletion(ep.id);
                                }}
                                className="text-[10px] text-gray-400 hover:text-emerald-400 transition-colors"
                              >
                                {ep.isCompleted ? '✓ Visto' : 'Marcar visto'}
                              </button>
                              <Play className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400 space-y-2">
                  <Search className="w-8 h-8 text-gray-500" />
                  <p className="text-xs font-semibold">Nenhum vídeo encontrado</p>
                  <p className="text-[10px] text-gray-500">Tente buscar por outro termo ou limpe o campo de busca.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
