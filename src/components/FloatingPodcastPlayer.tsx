import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  X, 
  Volume2, 
  VolumeX, 
  Headphones,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Radio,
  Send,
  Loader2,
  CloudUpload,
  Download
} from 'lucide-react';
import { AudioShow, AudioTrack, DriveItem } from '../types/index.js';

interface FloatingPodcastPlayerProps {
  show: AudioShow;
  activeTrack: AudioTrack | null;
  activeTrackIndex: number;
  allFiles: DriveItem[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  volume: number;
  isMuted: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (seconds: number) => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onNextTrack: () => void;
  onPreviousTrack: () => void;
  onOpenFullStudio: (show: AudioShow, trackIndex?: number) => void;
  onClose: () => void;
  onAudioEnded: () => void;
  onTimeUpdate: (currentTime: number) => void;
  onLoadedMetadata: (duration: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  hasNextTrack?: boolean;
  hasPreviousTrack?: boolean;
  isCardVisible?: boolean;
  onBackupTrack?: (track: AudioTrack) => Promise<void>;
}

export const FloatingPodcastPlayer: React.FC<FloatingPodcastPlayerProps> = ({
  show,
  activeTrack,
  activeTrackIndex,
  allFiles,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  volume,
  isMuted,
  audioRef,
  onTogglePlay,
  onSeek,
  onSkip,
  onSpeedChange,
  onVolumeChange,
  onToggleMute,
  onNextTrack,
  onPreviousTrack,
  onOpenFullStudio,
  onClose,
  onAudioEnded,
  onTimeUpdate,
  onLoadedMetadata,
  onPlay,
  onPause,
  hasNextTrack = true,
  hasPreviousTrack = true,
  isCardVisible = true,
  onBackupTrack
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [hasStreamError, setHasStreamError] = useState(false);
  const [isVinylToolbarOpen, setIsVinylToolbarOpen] = useState(false);
  const vinylToolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVinylMouseEnter = () => {
    if (vinylToolbarTimeoutRef.current) {
      clearTimeout(vinylToolbarTimeoutRef.current);
      vinylToolbarTimeoutRef.current = null;
    }
    setIsVinylToolbarOpen(true);
  };

  const handleVinylMouseLeave = () => {
    if (vinylToolbarTimeoutRef.current) {
      clearTimeout(vinylToolbarTimeoutRef.current);
    }
    vinylToolbarTimeoutRef.current = setTimeout(() => {
      setIsVinylToolbarOpen(false);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (vinylToolbarTimeoutRef.current) {
        clearTimeout(vinylToolbarTimeoutRef.current);
      }
    };
  }, []);

  // Priority 1: Direct fileId match in allFiles
  // Priority 2: Match by podcast folder and track title in allFiles
  const activeAudioFile = useMemo(() => {
    if (!activeTrack) return null;
    if (activeTrack.fileId) {
      const direct = allFiles.find(f => f.id === activeTrack.fileId && !f.isTrash);
      if (direct) return direct;
    }
    const cleanTrackTitle = (activeTrack.title || '').toLowerCase().replace(/[/\\?%*:|"<>_.-]/g, ' ').trim();
    if (cleanTrackTitle && show.folderId) {
      const matchInFolder = allFiles.find(f => 
        !f.isTrash &&
        f.parentId === show.folderId &&
        (f.type === 'audio' || f.mimeType?.startsWith('audio/') || f.name.endsWith('.mp3')) &&
        (
          f.name.toLowerCase().includes(cleanTrackTitle) ||
          cleanTrackTitle.includes(f.name.toLowerCase().replace(/\.[^/.]+$/, '').trim())
        )
      );
      if (matchInFolder) return matchInFolder;
    }
    return null;
  }, [activeTrack, allFiles, show.folderId]);

  // Reset stream error when switching tracks
  useEffect(() => {
    setHasStreamError(false);
  }, [activeTrack?.id, activeTrack?.fileId]);

  // PRIORITY SYSTEM (ONLINE FIRST):
  // 1. If original remote source (audioUrl) is available AND no stream error -> PRIORITIZE ONLINE WEB SOURCE
  // 2. Fallback: If online source fails or is missing AND file is saved on Telegram -> PLAY FROM TELEGRAM (/api/stream/:id)
  const streamFileId = activeAudioFile?.id || activeTrack?.fileId;
  const isSavedOnTelegram = Boolean(streamFileId);
  const isOnlineSourceAvailable = Boolean(activeTrack?.audioUrl && !hasStreamError);
  const isPlayingOnline = isOnlineSourceAvailable;
  const isPlayingFromTelegram = !isOnlineSourceAvailable && Boolean(streamFileId);
  const audioSource = isOnlineSourceAvailable
    ? activeTrack!.audioUrl
    : (streamFileId ? `/api/stream/${streamFileId}` : activeTrack?.audioUrl);

  const handleAudioError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    if (isOnlineSourceAvailable && streamFileId) {
      console.warn(`[DriveGram Audio] Falha na reprodução online para "${activeTrack?.title}". Alternando para a versão salva no Telegram...`);
      setHasStreamError(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          if (isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
      }, 60);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [1, 1.25, 1.5, 2];

  const handleQuickBackup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTrack || activeTrack.fileId || isBackingUp || !onBackupTrack) return;
    setIsBackingUp(true);
    try {
      await onBackupTrack(activeTrack);
    } finally {
      setIsBackingUp(false);
    }
  };

  const savedTrackPosition = useMemo(() => {
    if (!activeTrack) return 0;
    if (activeTrack.lastPositionSeconds && activeTrack.lastPositionSeconds > 0) {
      return activeTrack.lastPositionSeconds;
    }
    try {
      const raw = localStorage.getItem(`drivegram_podcast_pos_${activeTrack.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.pos === 'number' && parsed.pos > 0) return parsed.pos;
      }
    } catch (e) {}
    return 0;
  }, [activeTrack?.id, activeTrack?.lastPositionSeconds]);

  const restoredTrackRef = useRef<string | null>(null);

  // Reset restored ref when track changes
  useEffect(() => {
    restoredTrackRef.current = null;
  }, [activeTrack?.id]);

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audioEl = e.currentTarget;
    onLoadedMetadata(audioEl.duration);

    if (activeTrack && savedTrackPosition > 0 && restoredTrackRef.current !== activeTrack.id) {
      audioEl.currentTime = savedTrackPosition;
      onTimeUpdate(savedTrackPosition);
      restoredTrackRef.current = activeTrack.id;
    }
  };

  const handleCanPlay = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audioEl = e.currentTarget;
    if (activeTrack && savedTrackPosition > 0 && restoredTrackRef.current !== activeTrack.id) {
      audioEl.currentTime = savedTrackPosition;
      onTimeUpdate(savedTrackPosition);
      restoredTrackRef.current = activeTrack.id;
    }
  };

  return (
    <>
      {/* Persistent Global Audio Element */}
      <audio
        ref={audioRef}
        src={audioSource}
        onTimeUpdate={(e) => {
          onTimeUpdate((e.target as HTMLAudioElement).currentTime);
        }}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onAudioEnded}
        onError={handleAudioError}
      />

      {/* Floating MiniPlayer Card / Vinyl Bubble */}
      {isCardVisible && (
        <div 
          className={`fixed bottom-20 md:bottom-4 right-3 sm:right-4 z-40 transition-all duration-300 select-none animate-in slide-in-from-bottom-4 fade-in ${
            isCollapsed 
              ? 'w-auto' 
              : 'w-[calc(100vw-1.5rem)] sm:w-[460px]'
          }`}
        >
          {/* ================= COMPACT / COLLAPSED ROUND VINYL BUBBLE MODE ================= */}
          {isCollapsed ? (
            /* Wrapper: flex-col keeps toolbar + disc in the SAME bounding box,
               so onMouseLeave only fires when the cursor exits the whole group,
               not when moving between the disc and the toolbar above it. */
            <div 
              onMouseEnter={handleVinylMouseEnter}
              onMouseLeave={handleVinylMouseLeave}
              className="flex flex-col items-end gap-3"
            >
              {/* Quick Action Toolbar – always in the DOM, shown/hidden via opacity */}
              <div 
                className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-emerald-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(16,185,129,0.3)] whitespace-nowrap transition-all duration-200 max-w-[calc(100vw-2rem)] ${
                  isVinylToolbarOpen 
                    ? 'opacity-100 pointer-events-auto translate-y-0' 
                    : 'opacity-0 pointer-events-none translate-y-2'
                }`}
              >
                {/* Title snippet */}
                <div 
                  onClick={() => onOpenFullStudio(show, activeTrackIndex)}
                  className="px-2 py-0.5 max-w-[110px] sm:max-w-[150px] overflow-hidden cursor-pointer group/info"
                  title="Abrir no estúdio completo"
                >
                  <p className="text-[10px] font-bold text-white group-hover/info:text-emerald-300 truncate leading-tight transition-colors">
                    {show.title}
                  </p>
                  <p className="text-[9px] text-emerald-400 truncate">
                    {activeTrack?.title || 'Episódio em reprodução'}
                  </p>
                </div>

                <div className="h-4 w-px bg-emerald-900/60 shrink-0" />

                {/* Skip -15s */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip(-15);
                  }}
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-emerald-950 text-emerald-300 hover:text-white transition-colors"
                  title="Voltar 15s"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Skip +30s */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip(30);
                  }}
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-emerald-950 text-emerald-300 hover:text-white transition-colors"
                  title="Avançar 30s"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                {/* Expand to Full Card */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(false);
                  }}
                  className="p-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-colors"
                  title="Expandir janela flutuante"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>

                {/* Open Full Studio */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFullStudio(show, activeTrackIndex);
                  }}
                  className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition-colors"
                  title="Abrir Estúdio Completo"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Close Player */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-rose-600 text-gray-400 hover:text-white transition-colors"
                  title="Fechar player"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* The Round Vinyl Disc */}
              <div 
                onClick={() => setIsCollapsed(false)}
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full cursor-pointer transition-transform duration-300 hover:scale-105 select-none shadow-[0_14px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(16,185,129,0.35)]"
                title="Clique para expandir controles do podcast"
              >
                {/* Outer Ambient Glow & Pulsing Ring when playing */}
                {isPlaying && (
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-600 opacity-75 blur-xs animate-pulse" />
                )}

                {/* Vinyl Record Body */}
                <div className="relative w-full h-full rounded-full bg-gray-950 border-2 border-emerald-500/60 p-1 flex items-center justify-center overflow-hidden group">
                  {/* Spinning Artwork Circle */}
                  <div 
                    className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      animation: 'spin 12s linear infinite',
                      animationPlayState: isPlaying ? 'running' : 'paused'
                    }}
                  >
                    {/* Podcast Cover Image */}
                    <img
                      src={show.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                      alt={show.title}
                      className="w-full h-full object-cover scale-110"
                    />

                    {/* Concentric Vinyl Grooves Overlay */}
                    <div className="absolute inset-0 rounded-full border-[3px] border-black/40 pointer-events-none" />
                    <div className="absolute inset-1.5 rounded-full border border-white/10 pointer-events-none" />
                    <div className="absolute inset-3 rounded-full border border-black/30 pointer-events-none" />

                    {/* Vinyl Gloss Reflection Sheen */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
                  </div>

                  {/* Center Spindle Hole */}
                  <div className="absolute w-5 h-5 rounded-full bg-gray-950 border border-emerald-400/80 shadow-inner flex items-center justify-center pointer-events-none z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>

                  {/* Quick Play/Pause Center Overlay on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePlay();
                    }}
                    className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current text-white" />
                    ) : (
                      <Play className="w-5 h-5 fill-current text-white ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Miniature Playing Indicator Badge */}
                {isPlaying && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center z-30 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* ================= FULL FLOATING MINI-PLAYER ================= */
            <div className="relative rounded-3xl bg-gray-950/95 backdrop-blur-xl border border-emerald-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_24px_rgba(16,185,129,0.25)] text-white overflow-hidden p-3.5 sm:p-4">
              {/* Subtle Top Ambient Gradient */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
              
              <div className="space-y-3">
                {/* Header Info & Window Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div 
                    onClick={() => onOpenFullStudio(show, activeTrackIndex)}
                    className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                    title="Clique para abrir no estúdio completo"
                  >
                    {/* Podcast Cover with Sound wave effect */}
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-emerald-500/40 shrink-0 bg-emerald-950/60">
                      <img
                        src={show.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                        alt={show.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isPlaying && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                          <span className="w-0.5 h-3 bg-emerald-400 animate-pulse" />
                          <span className="w-0.5 h-4 bg-teal-400 animate-pulse delay-75" />
                          <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-150" />
                        </div>
                      )}
                    </div>

                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                          {show.showType === 'podcast' ? '🎙️ Podcast' : '🎵 Música'}
                        </span>
                        {isPlayingOnline ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30" title="Prioridade: Executando da Fonte Online (Web)">
                            <Radio className="w-2.5 h-2.5" />
                            <span>Online</span>
                          </span>
                        ) : isPlayingFromTelegram ? (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-sky-400 bg-sky-500/15 px-1.5 py-0.2 rounded border border-sky-500/30" title="Executando da cópia salva no Telegram">
                            <Send className="w-2.5 h-2.5" />
                            <span>Telegram</span>
                          </span>
                        ) : null}

                        {isSavedOnTelegram && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-sky-300 bg-sky-500/20 px-1.5 py-0.2 rounded border border-sky-400/40" title="Episódio salvo no Telegram">
                            <Send className="w-2.5 h-2.5 text-sky-400" />
                            <span>Salvo no Telegram</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 truncate leading-tight mt-0.5 transition-colors">
                        {activeTrack?.title || show.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 truncate">
                        {show.title} {show.artist || show.host ? `• ${show.artist || show.host}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Window Control Buttons */}
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    {/* Download button if file is saved on Telegram */}
                    {activeAudioFile && (
                      <a
                        href={`/api/stream/${activeAudioFile.id}?download=true`}
                        download={`${activeTrack?.title || 'episodio'}.mp3`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors"
                        title="Baixar episódio do Telegram para o seu dispositivo"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Backup to Telegram button if unbacked */}
                    {activeTrack && !isSavedOnTelegram && activeTrack.audioUrl && onBackupTrack && (
                      <button
                        onClick={handleQuickBackup}
                        disabled={isBackingUp}
                        className="p-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 transition-colors disabled:opacity-50"
                        title="Salvar episódio no Telegram"
                      >
                        {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Minimize to Vinyl Bubble */}
                    <button
                      onClick={() => setIsCollapsed(true)}
                      className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      title="Minimizar para Disco de Vinil"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {/* Maximize to Studio */}
                    <button
                      onClick={() => onOpenFullStudio(show, activeTrackIndex)}
                      className="p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-colors"
                      title="Abrir no Estúdio Completo"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Close */}
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-xl bg-gray-900 hover:bg-rose-600 text-gray-400 hover:text-white transition-colors"
                      title="Fechar player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Seek Slider */}
                <div className="space-y-1">
                  <div className="relative group/progress flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => onSeek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-gray-800 group-hover/progress:h-2 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{formatSeconds(duration)}</span>
                  </div>
                </div>

                {/* Media Controls Bar */}
                <div className="flex items-center justify-between pt-1">
                  {/* Playback Speed Switcher */}
                  <div className="flex items-center gap-1">
                    {speedOptions.map(spd => (
                      <button
                        key={spd}
                        onClick={() => onSpeedChange(spd)}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                          playbackSpeed === spd
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Central Playback Controls */}
                  <div className="flex items-center gap-2">
                    {/* Previous Track */}
                    <button
                      onClick={onPreviousTrack}
                      disabled={!hasPreviousTrack}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title="Faixa anterior"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    {/* Skip -15s */}
                    <button
                      onClick={() => onSkip(-15)}
                      className="p-1.5 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-950/60 transition-colors"
                      title="Voltar 15s"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Main Play/Pause Button */}
                    <button
                      onClick={onTogglePlay}
                      className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all"
                      title={isPlaying ? 'Pausar' : 'Reproduzir'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Skip +30s */}
                    <button
                      onClick={() => onSkip(30)}
                      className="p-1.5 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-950/60 transition-colors"
                      title="Avançar 30s"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>

                    {/* Next Track */}
                    <button
                      onClick={onNextTrack}
                      disabled={!hasNextTrack}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      title="Próxima faixa"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="relative flex items-center">
                    <button
                      onClick={onToggleMute}
                      onMouseEnter={() => setShowVolumeSlider(true)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                      title={isMuted ? 'Desmutar' : 'Mutar'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>

                    {/* Popover Volume Slider */}
                    {showVolumeSlider && (
                      <div 
                        onMouseLeave={() => setShowVolumeSlider(false)}
                        className="absolute bottom-full right-0 mb-2 p-2 rounded-xl bg-gray-900/95 border border-gray-800 shadow-xl flex items-center gap-2 z-50 animate-in fade-in zoom-in-95"
                      >
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                          className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
