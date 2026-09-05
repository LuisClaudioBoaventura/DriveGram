import React, { useState, useRef } from 'react';
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
  BookOpen
} from 'lucide-react';
import { Book, BookChapter, DriveItem } from '../types/index.js';

interface FloatingAudiobookPlayerProps {
  book: Book;
  activeChapter: BookChapter | null;
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
  onNextChapter: () => void;
  onPreviousChapter: () => void;
  onOpenFullReader: (book: Book) => void;
  onClose: () => void;
  onAudioEnded: () => void;
  onTimeUpdate: (currentTime: number) => void;
  onLoadedMetadata: (duration: number) => void;
  hasNextChapter?: boolean;
  hasPreviousChapter?: boolean;
  isCardVisible?: boolean;
}

export const FloatingAudiobookPlayer: React.FC<FloatingAudiobookPlayerProps> = ({
  book,
  activeChapter,
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
  onNextChapter,
  onPreviousChapter,
  onOpenFullReader,
  onClose,
  onAudioEnded,
  onTimeUpdate,
  onLoadedMetadata,
  hasNextChapter = true,
  hasPreviousChapter = true,
  isCardVisible = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isVinylToolbarOpen, setIsVinylToolbarOpen] = useState(false);
  const vinylToolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVinylMouseEnter = () => {
    if (vinylToolbarTimeoutRef.current) clearTimeout(vinylToolbarTimeoutRef.current);
    setIsVinylToolbarOpen(true);
  };

  const handleVinylMouseLeave = () => {
    vinylToolbarTimeoutRef.current = setTimeout(() => setIsVinylToolbarOpen(false), 350);
  };


  const activeAudioFile = activeChapter?.fileId
    ? allFiles.find(f => f.id === activeChapter.fileId)
    : null;

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [1, 1.25, 1.5, 2];

  const streamFileId = activeAudioFile?.id || activeChapter?.fileId;

  return (
    <>
      {/* Persistent Global Audio Element */}
      <audio
        ref={audioRef}
        src={streamFileId ? `/api/stream/${streamFileId}` : undefined}
        onTimeUpdate={(e) => {
          onTimeUpdate((e.target as HTMLAudioElement).currentTime);
        }}
        onLoadedMetadata={(e) => {
          onLoadedMetadata((e.target as HTMLAudioElement).duration);
        }}
        onEnded={onAudioEnded}
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
              {/* Quick Action Toolbar – always in DOM, shown/hidden via opacity */}
              <div
                className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-purple-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(168,85,247,0.3)] whitespace-nowrap transition-all duration-200 max-w-[calc(100vw-2rem)] ${
                  isVinylToolbarOpen
                    ? 'opacity-100 pointer-events-auto translate-y-0'
                    : 'opacity-0 pointer-events-none translate-y-2'
                }`}
              >
                {/* Title snippet */}
                <div
                  onClick={() => onOpenFullReader(book)}
                  className="px-2 py-0.5 max-w-[140px] overflow-hidden cursor-pointer group/info"
                  title="Abrir no leitor completo"
                >
                  <p className="text-[10px] font-bold text-white group-hover/info:text-purple-300 truncate leading-tight transition-colors">
                    {book.title}
                  </p>
                  <p className="text-[9px] text-purple-300 truncate">
                    {activeChapter?.title || 'Capítulo em reprodução'}
                  </p>
                </div>

                <div className="h-4 w-px bg-purple-900/60 shrink-0" />

                {/* Skip -15s */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip(-15);
                  }}
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-purple-950 text-purple-300 hover:text-white transition-colors"
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
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-purple-950 text-purple-300 hover:text-white transition-colors"
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
                  className="p-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-colors"
                  title="Expandir janela flutuante"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>

                {/* Open Full Reader Studio */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFullReader(book);
                  }}
                  className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow transition-colors"
                  title="Abrir Estúdio Completo de Leitura"
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
                className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full cursor-pointer transition-transform duration-300 hover:scale-105 select-none shadow-[0_14px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(168,85,247,0.35)]"
                title="Clique para expandir controles do audiolivro"
              >
                {/* Outer Ambient Glow & Pulsing Ring when playing */}
                {isPlaying && (
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-indigo-600 opacity-70 blur-xs animate-pulse" />
                )}

                {/* Vinyl Record Body */}
                <div className="relative w-full h-full rounded-full bg-gray-950 border-2 border-purple-500/60 p-1 flex items-center justify-center overflow-hidden group">
                  {/* Spinning Artwork Circle */}
                  <div
                    className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                    style={{
                      animation: 'spin 12s linear infinite',
                      animationPlayState: isPlaying ? 'running' : 'paused'
                    }}
                  >
                    {/* Book Cover Image */}
                    <img
                      src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                      alt={book.title}
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
                  <div className="absolute w-5 h-5 rounded-full bg-gray-950 border border-purple-400/80 shadow-inner flex items-center justify-center pointer-events-none z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
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
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-gray-950 flex items-center justify-center z-30 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* ================= FULL FLOATING MINI-PLAYER ================= */
            <div className="relative rounded-3xl bg-gray-950/95 backdrop-blur-xl border border-purple-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85),0_0_24px_rgba(168,85,247,0.25)] text-white overflow-hidden p-3.5 sm:p-4">
              {/* Subtle Top Ambient Gradient */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
              <div className="space-y-3">
              {/* Header Info & Window Actions */}
              <div className="flex items-center justify-between gap-3">
                <div 
                  onClick={() => onOpenFullReader(book)}
                  className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                  title="Clique para abrir no estúdio completo"
                >
                  {/* Book Cover with Sound wave effect */}
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-lg border border-purple-500/40 shrink-0 bg-purple-950/60">
                    <img
                      src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                        <span className="w-0.5 h-3 bg-purple-400 animate-pulse" />
                        <span className="w-0.5 h-4 bg-pink-400 animate-pulse delay-75" />
                        <span className="w-0.5 h-2 bg-purple-400 animate-pulse delay-150" />
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9px] font-black uppercase tracking-wider border border-purple-500/30">
                        Audiolivro
                      </span>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                        {book.title}
                      </h4>
                    </div>
                    <p className="text-[11px] font-semibold text-gray-200 truncate mt-0.5">
                      {activeChapter?.title || 'Capítulo Selecionado'}
                    </p>
                    {book.author && (
                      <span className="text-[10px] text-gray-400 truncate block">
                        {book.author} {book.narrator ? `• Voz: ${book.narrator}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onOpenFullReader(book)}
                    className="p-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-colors"
                    title="Abrir Estúdio Completo de Leitura"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setIsCollapsed(true)}
                    className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 transition-colors"
                    title="Minimizar em bolha"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-rose-400 border border-gray-800 transition-colors"
                    title="Fechar e parar áudio"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Progress Scrubber */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-purple-300 font-bold w-10 text-left">
                    {formatSeconds(currentTime)}
                  </span>

                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => onSeek(Number(e.target.value))}
                    className="flex-1 h-1.5 rounded-lg bg-purple-950/80 accent-purple-500 cursor-pointer"
                  />

                  <span className="text-[10px] font-mono text-gray-400 font-bold w-10 text-right">
                    {formatSeconds(duration)}
                  </span>
                </div>
              </div>

              {/* Main Playback Actions Bar */}
              <div className="flex items-center justify-between pt-1">
                {/* Speed Multipliers */}
                <div className="flex items-center bg-gray-900/90 border border-purple-900/40 rounded-xl p-0.5">
                  {speedOptions.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => onSpeedChange(spd)}
                      className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                        playbackSpeed === spd
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                {/* Primary Media Buttons */}
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <button
                    onClick={onPreviousChapter}
                    disabled={!hasPreviousChapter}
                    className="p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-950/50 disabled:opacity-30 transition-colors"
                    title="Capítulo Anterior"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSkip(-15)}
                    className="p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-950/50 transition-colors"
                    title="Voltar 15 segundos"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onTogglePlay}
                    className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white flex items-center justify-center shadow-lg shadow-purple-500/35 transition-all hover:scale-105 active:scale-95"
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <button
                    onClick={() => onSkip(30)}
                    className="p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-950/50 transition-colors"
                    title="Avançar 30 segundos"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onNextChapter}
                    disabled={!hasNextChapter}
                    className="p-1.5 rounded-full text-purple-300 hover:text-white hover:bg-purple-950/50 disabled:opacity-30 transition-colors"
                    title="Próximo Capítulo"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                </div>

                {/* Volume Button / Slider */}
                <div className="relative flex items-center">
                  <button
                    onClick={onToggleMute}
                    onMouseEnter={() => setShowVolumeSlider(true)}
                    className="p-1.5 rounded-xl bg-gray-900/90 text-gray-300 hover:text-white border border-gray-800 transition-colors"
                    title={isMuted ? 'Desmutar' : 'Mutar'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showVolumeSlider && (
                    <div 
                      onMouseLeave={() => setShowVolumeSlider(false)}
                      className="absolute bottom-full right-0 mb-2 p-2 bg-gray-900 border border-gray-800 rounded-xl shadow-xl flex items-center gap-1 z-30"
                    >
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={(e) => onVolumeChange(Number(e.target.value))}
                        className="w-20 h-1.5 bg-gray-700 accent-purple-500 rounded-lg cursor-pointer"
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
