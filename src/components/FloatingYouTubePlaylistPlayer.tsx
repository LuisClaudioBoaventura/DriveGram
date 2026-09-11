import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Youtube, 
  Layers, 
  Airplay, 
  CheckCircle2, 
  Clock, 
  Shuffle,
  ListOrdered
} from 'lucide-react';
import { SeriesShow, SeriesEpisode } from '../types/index.js';
import { MarqueeTitle } from './MarqueeTitle.js';

interface FloatingYouTubePlaylistPlayerProps {
  series: SeriesShow;
  activeEpisode: SeriesEpisode;
  allEpisodes: SeriesEpisode[];
  onSelectEpisode: (episode: SeriesEpisode) => void;
  onOpenFullStudio: (series: SeriesShow, episode?: SeriesEpisode) => void;
  onClose: () => void;
  onToggleEpisodeCompletion?: (episodeId: string) => Promise<void> | void;
  onUpdateEpisodeProgress?: (episodeId: string, seconds: number, isCompleted?: boolean) => Promise<void> | void;
}

export const FloatingYouTubePlaylistPlayer: React.FC<FloatingYouTubePlaylistPlayerProps> = ({
  series,
  activeEpisode,
  allEpisodes,
  onSelectEpisode,
  onOpenFullStudio,
  onClose,
  onToggleEpisodeCompletion,
  onUpdateEpisodeProgress
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isQueueOpen, setIsQueueOpen] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isAutoPlayNext] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextEpisodeToPlay, setNextEpisodeToPlay] = useState<SeriesEpisode | null>(null);
  const [isNativePiPActive, setIsNativePiPActive] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const queueActiveRef = useRef<HTMLButtonElement>(null);
  const pipWindowRef = useRef<Window | null>(null);
  const pipContainerRef = useRef<HTMLDivElement>(null);

  // Extract YouTube ID helper for clean embed
  const getYouTubeVideoId = (ep: SeriesEpisode): string | null => {
    const targetUrl = ep.embedUrl || ep.videoUrl || '';
    const match = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
    return match ? match[1] : ep.videoId || null;
  };

  const ytVideoId = getYouTubeVideoId(activeEpisode);
  const embedOrigin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
  const ytEmbedUrl = ytVideoId
    ? `https://www.youtube.com/embed/${ytVideoId}?autoplay=1&enablejsapi=1&origin=${embedOrigin}`
    : activeEpisode.embedUrl?.includes('?')
    ? `${activeEpisode.embedUrl}&autoplay=1&enablejsapi=1&origin=${embedOrigin}`
    : `${activeEpisode.embedUrl}?autoplay=1&enablejsapi=1&origin=${embedOrigin}`;

  // Current episode index in playlist
  const currentIndex = allEpisodes.findIndex(e => e.id === activeEpisode.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allEpisodes.length - 1;

  // Next episode resolver (supports Shuffle)
  const getNextEpisode = useCallback((): SeriesEpisode | null => {
    if (allEpisodes.length === 0) return null;
    if (isShuffle) {
      const candidates = allEpisodes.filter(e => e.id !== activeEpisode.id);
      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }
    if (hasNext) {
      return allEpisodes[currentIndex + 1];
    }
    return null;
  }, [allEpisodes, activeEpisode.id, isShuffle, hasNext, currentIndex]);

  // Previous episode resolver
  const getPreviousEpisode = useCallback((): SeriesEpisode | null => {
    if (allEpisodes.length === 0) return null;
    if (hasPrevious) {
      return allEpisodes[currentIndex - 1];
    }
    return null;
  }, [allEpisodes, hasPrevious, currentIndex]);

  const handlePlayNext = useCallback(() => {
    const next = getNextEpisode();
    if (next) {
      setCountdown(null);
      setNextEpisodeToPlay(null);
      onSelectEpisode(next);
      setIsPlaying(true);
    }
  }, [getNextEpisode, onSelectEpisode]);

  const handlePlayPrevious = useCallback(() => {
    const prev = getPreviousEpisode();
    if (prev) {
      setCountdown(null);
      setNextEpisodeToPlay(null);
      onSelectEpisode(prev);
      setIsPlaying(true);
    }
  }, [getPreviousEpisode, onSelectEpisode]);

  // YouTube postMessage controls
  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({
          event: 'command',
          func: nextState ? 'playVideo' : 'pauseVideo',
          args: []
        }),
        '*'
      );
    } catch (e) {}
  };

  // Episode ended callback
  const handleEpisodeEnded = useCallback(() => {
    if (onUpdateEpisodeProgress) {
      onUpdateEpisodeProgress(activeEpisode.id, 0, true);
    }
    if (isAutoPlayNext) {
      const nextEp = getNextEpisode();
      if (nextEp) {
        setNextEpisodeToPlay(nextEp);
        setCountdown(3);
      }
    }
  }, [activeEpisode.id, onUpdateEpisodeProgress, isAutoPlayNext, getNextEpisode]);

  // Countdown timer handler for autoplay
  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      if (nextEpisodeToPlay) {
        onSelectEpisode(nextEpisodeToPlay);
        setIsPlaying(true);
      }
      setCountdown(null);
      setNextEpisodeToPlay(null);
    }
    return () => clearTimeout(timer);
  }, [countdown, nextEpisodeToPlay, onSelectEpisode]);

  // YouTube IFrame Player message listener for autoplay & state change
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

        // YouTube IFrame API messages
        const isEnded = 
          (data.event === 'onStateChange' && (data.info === 0 || data.info === '0')) ||
          (data.event === 'infoDelivery' && (data.info?.playerState === 0 || data.info?.playerState === '0'));

        if (isEnded) {
          handleEpisodeEnded();
          return;
        }

        // Track play/pause state from YouTube
        const isNowPlaying = 
          (data.event === 'onStateChange' && (data.info === 1 || data.info === '1')) ||
          (data.event === 'infoDelivery' && (data.info?.playerState === 1 || data.info?.playerState === '1'));
        if (isNowPlaying) setIsPlaying(true);

        const isNowPaused = 
          (data.event === 'onStateChange' && (data.info === 2 || data.info === '2')) ||
          (data.event === 'infoDelivery' && (data.info?.playerState === 2 || data.info?.playerState === '2'));
        if (isNowPaused) setIsPlaying(false);
      } catch (err) {}
    };

    window.addEventListener('message', handleWindowMessage);
    return () => {
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [handleEpisodeEnded]);

  // Register 'listening' to YouTube iframe
  useEffect(() => {
    if (!iframeRef.current) return;
    const sendListening = () => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening', id: activeEpisode?.id || 'yt-pip-player' }),
          '*'
        );
      } catch (e) {}
    };

    sendListening();
    const interval = setInterval(sendListening, 1500);
    return () => clearInterval(interval);
  }, [activeEpisode?.id]);

  // Scroll active item in queue drawer into view
  useEffect(() => {
    if (isQueueOpen && queueActiveRef.current) {
      queueActiveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isQueueOpen, activeEpisode.id]);

  // Document Picture-in-Picture API (Native Always-on-top OS Window)
  const isDocPiPSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window;

  const handleToggleDocumentPiP = async () => {
    if (!isDocPiPSupported) return;

    // If native window already open, close it to restore
    if (pipWindowRef.current) {
      pipWindowRef.current.close();
      pipWindowRef.current = null;
      setIsNativePiPActive(false);
      return;
    }

    try {
      const pipWin = await (window as any).documentPictureInPicture.requestWindow({
        width: 480,
        height: 340
      });

      pipWindowRef.current = pipWin;
      setIsNativePiPActive(true);

      // Copy stylesheets to native PiP window
      [...document.styleSheets].forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            const style = pipWin.document.createElement('style');
            [...sheet.cssRules].forEach((rule) => {
              style.appendChild(pipWin.document.createTextNode(rule.cssText));
            });
            pipWin.document.head.appendChild(style);
          } else if (sheet.href) {
            const link = pipWin.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            pipWin.document.head.appendChild(link);
          }
        } catch (e) {}
      });

      // Transfer player DOM to PiP window
      if (pipContainerRef.current) {
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.backgroundColor = '#020617';
        pipWin.document.body.appendChild(pipContainerRef.current);
      }

      // Handle closing of native PiP window
      pipWin.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setIsNativePiPActive(false);
      });
    } catch (err) {
      console.warn('Document PiP request failed:', err);
      setIsNativePiPActive(false);
    }
  };

  // Close native PiP on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        pipWindowRef.current.close();
        pipWindowRef.current = null;
      }
    };
  }, []);

  const getEpisodeThumbnail = (ep: SeriesEpisode): string => {
    const ytId = getYouTubeVideoId(ep);
    if (ytId) {
      return `https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`;
    }
    return series.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60';
  };

  return (
    <div
      ref={pipContainerRef}
      className={`fixed z-40 transition-all duration-300 select-none ${
        isNativePiPActive
          ? 'w-full h-full inset-0 bg-slate-950 flex flex-col p-2'
          : 'bottom-20 sm:bottom-6 right-3 sm:right-6 w-[calc(100vw-24px)] sm:w-[420px] max-w-full'
      }`}
    >
      <div className="bg-gray-950/95 backdrop-blur-2xl border border-red-500/30 dark:border-red-500/20 shadow-2xl rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col text-gray-100 ring-1 ring-white/10">
        
        {/* ================= HEADER BAR ================= */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-red-600/20 via-gray-900/80 to-purple-900/20 border-b border-gray-800/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
            <div className="p-1 rounded-lg bg-red-600 text-white shadow-md shadow-red-600/30 shrink-0">
              <Youtube className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-black tracking-wider text-red-400 shrink-0">
                  Playlist
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">
                  ({currentIndex + 1}/{allEpisodes.length})
                </span>
              </div>
              <p className="text-xs font-bold text-white truncate leading-none mt-0.5">
                {series.title}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Native OS Document Picture-in-Picture Toggle */}
            {isDocPiPSupported && (
              <button
                onClick={handleToggleDocumentPiP}
                className={`p-1.5 rounded-xl border transition-all ${
                  isNativePiPActive
                    ? 'bg-red-600/30 text-red-300 border-red-500/50'
                    : 'bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-red-400 border-gray-800'
                }`}
                title={isNativePiPActive ? 'Retornar janela ao DriveGram' : 'Destacar em Janela Flutuante do Windows (Sempre no Topo)'}
              >
                <Airplay className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Collapse/Expand Video Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-all"
              title={isCollapsed ? 'Expandir Player' : 'Recolher Vídeo'}
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* Maximize Back to Full Studio */}
            <button
              onClick={() => onOpenFullStudio(series, activeEpisode)}
              className="p-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/40 transition-all shadow-xs"
              title="Voltar ao Studio Completo"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close PiP */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-gray-900 hover:bg-rose-950/60 text-gray-400 hover:text-rose-400 border border-gray-800 hover:border-rose-900 transition-all"
              title="Fechar PiP"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ================= YOUTUBE VIDEO CONTAINER ================= */}
        {!isCollapsed && (
          <div className="relative w-full aspect-video bg-black flex items-center justify-center shrink-0 border-b border-gray-800/80 group">
            {ytEmbedUrl ? (
              <iframe
                ref={iframeRef}
                key={activeEpisode.id}
                id="yt-pip-player"
                src={ytEmbedUrl}
                title={activeEpisode.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={() => {
                  try {
                    iframeRef.current?.contentWindow?.postMessage(
                      JSON.stringify({ event: 'listening', id: 'yt-pip-player' }),
                      '*'
                    );
                  } catch (e) {}
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4 text-gray-400 text-xs">
                <Youtube className="w-8 h-8 text-red-500 mb-1" />
                <span>Vídeo indisponível</span>
              </div>
            )}

            {/* Countdown Overlay for Autoplay Next */}
            {countdown !== null && nextEpisodeToPlay && (
              <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 space-y-2">
                <div className="w-10 h-10 rounded-full bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300 font-mono text-base font-black animate-pulse">
                  {countdown}
                </div>
                <div className="space-y-0.5 max-w-xs">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    Próximo em {countdown}s
                  </span>
                  <p className="text-xs font-semibold text-white line-clamp-1">
                    {nextEpisodeToPlay.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setCountdown(null);
                      setNextEpisodeToPlay(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-[11px] font-bold border border-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      onSelectEpisode(nextEpisodeToPlay);
                      setCountdown(null);
                      setNextEpisodeToPlay(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md shadow-red-600/30"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Tocar Agora</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= CONTROLS & INFO BAR ================= */}
        <div className="p-3 bg-gray-950/90 space-y-2 shrink-0">
          {/* Active Episode Title & Meta */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.2 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 text-[10px] font-black">
                  #{currentIndex + 1}
                </span>
                {activeEpisode.duration && (
                  <span className="text-[10px] text-gray-400 font-mono flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {activeEpisode.duration}
                  </span>
                )}
                {activeEpisode.isCompleted && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Visto
                  </span>
                )}
              </div>
              <MarqueeTitle
                text={activeEpisode.title}
                as="h4"
                className="text-xs font-bold text-white leading-tight"
              />
            </div>

            {/* Mark as watched button */}
            {onToggleEpisodeCompletion && (
              <button
                onClick={() => onToggleEpisodeCompletion(activeEpisode.id)}
                className={`p-1.5 rounded-xl border transition-all shrink-0 ${
                  activeEpisode.isCompleted
                    ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                    : 'bg-gray-900 text-gray-400 hover:text-emerald-400 border-gray-800'
                }`}
                title={activeEpisode.isCompleted ? 'Desmarcar assistido' : 'Marcar como assistido'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Playback Navigation Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-900">
            <div className="flex items-center gap-1">
              {/* Shuffle Toggle */}
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`p-1.5 rounded-xl border transition-all ${
                  isShuffle
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                    : 'bg-gray-900 hover:bg-gray-850 text-gray-400 border-gray-800'
                }`}
                title={isShuffle ? 'Modo Aleatório Ativo' : 'Ativar Modo Aleatório'}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>

              {/* Queue / Playlist Drawer Toggle */}
              <button
                onClick={() => setIsQueueOpen(!isQueueOpen)}
                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-bold border transition-all ${
                  isQueueOpen
                    ? 'bg-red-600/20 text-red-300 border-red-500/40'
                    : 'bg-gray-900 hover:bg-gray-850 text-gray-300 border-gray-800'
                }`}
                title="Ver Fila de Reprodução da Playlist"
              >
                <ListOrdered className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px]">Fila ({allEpisodes.length})</span>
              </button>
            </div>

            {/* Central Transport Controls */}
            <div className="flex items-center gap-1.5">
              {/* Previous Video */}
              <button
                onClick={handlePlayPrevious}
                disabled={!hasPrevious && !isShuffle}
                className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800 transition-all active:scale-95"
                title="Vídeo Anterior"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              {/* Play / Pause Toggle */}
              <button
                onClick={handleTogglePlay}
                className="p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition-all active:scale-95"
                title={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              {/* Next Video */}
              <button
                onClick={handlePlayNext}
                disabled={!hasNext && !isShuffle}
                className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-800 transition-all active:scale-95"
                title="Próximo Vídeo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ================= PLAYLIST QUEUE DRAWER ================= */}
        {isQueueOpen && (
          <div className="max-h-60 overflow-y-auto bg-gray-900/95 border-t border-gray-800 divide-y divide-gray-850 animate-in slide-in-from-bottom-2 duration-200">
            <div className="sticky top-0 z-10 px-3 py-1.5 bg-gray-950/90 backdrop-blur-sm flex items-center justify-between text-[11px] font-bold text-gray-400 border-b border-gray-800">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-red-400" />
                Vídeos da Playlist ({allEpisodes.length})
              </span>
              <button
                onClick={() => setIsQueueOpen(false)}
                className="hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {allEpisodes.map((ep, idx) => {
              const isCurrent = ep.id === activeEpisode.id;
              return (
                <button
                  key={ep.id}
                  ref={isCurrent ? queueActiveRef : null}
                  onClick={() => {
                    setCountdown(null);
                    setNextEpisodeToPlay(null);
                    onSelectEpisode(ep);
                    setIsPlaying(true);
                  }}
                  className={`w-full text-left p-2 flex items-center gap-2.5 transition-all text-xs ${
                    isCurrent
                      ? 'bg-red-600/20 text-white font-semibold'
                      : 'hover:bg-gray-800/60 text-gray-300'
                  }`}
                >
                  <span className="font-mono text-[10px] text-gray-500 w-4 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="w-12 h-7 rounded bg-black overflow-hidden relative shrink-0 border border-gray-800">
                    <img
                      src={getEpisodeThumbnail(ep)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-white fill-current animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className={`truncate leading-snug ${isCurrent ? 'text-red-300 font-bold' : 'text-gray-200'}`}>
                      {ep.title}
                    </p>
                    {ep.duration && (
                      <span className="text-[10px] text-gray-500 font-mono">
                        {ep.duration}
                      </span>
                    )}
                  </div>
                  {ep.isCompleted && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
