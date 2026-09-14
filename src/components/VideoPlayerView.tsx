import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, CheckCircle2, Bookmark, 
  Download, Edit3, Film, Settings, Star, User, Clock, Airplay, Plus, Trash2, Sparkles,
  SkipBack, SkipForward, Shuffle, Repeat, List, X, Search, Cast
} from 'lucide-react';
import { MovieVideo, DriveItem, VideoTimestamp } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { GenerateMarkersModal } from './GenerateMarkersModal.js';
import { CastModal } from './CastModal.js';
import { MarqueeTitle } from './MarqueeTitle.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';

interface VideoPlayerViewProps {
  video: MovieVideo;
  allFiles: DriveItem[];
  playlist?: MovieVideo[];
  playlistTitle?: string;
  onSelectVideo?: (video: MovieVideo) => void;
  isShuffleInitial?: boolean;
  onBackToCatalog: () => void;
  onUpdateProgress: (videoId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
  onEnterPiP?: () => void;
  onLeavePiP?: () => void;
  onRestoreToTab?: () => void;
  onUpdateVideo?: (updated: MovieVideo) => Promise<void>;
  isPiPHidden?: boolean;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  video,
  allFiles,
  playlist,
  playlistTitle,
  onSelectVideo,
  isShuffleInitial = false,
  onBackToCatalog,
  onUpdateProgress,
  onOpenEditModal,
  onEnterPiP,
  onLeavePiP,
  onRestoreToTab,
  onUpdateVideo,
  isPiPHidden = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedSubId, setSelectedSubId] = useState<string>('none');
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isGenerateMarkersModalOpen, setIsGenerateMarkersModalOpen] = useState(false);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);

  const videoFile = (video.fileId ? allFiles.find(f => f.id === video.fileId) : null) ||
    (video.folderId ? allFiles.find(f => f.parentId === video.folderId && !f.isTrash && (f.type === 'video' || (f.mimeType && f.mimeType.startsWith('video/')) || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes((f.extension || '').toLowerCase()))) : null);
  const subtitles = video.subtitles || videoFile?.subtitles || [];
  const [localTimestamps, setLocalTimestamps] = useState<VideoTimestamp[]>(() => {
    const raw = video.timestamps || videoFile?.timestamps || [];
    return [...raw].sort((a, b) => a.seconds - b.seconds);
  });
  const [newTimestampLabel, setNewTimestampLabel] = useState('');

  useEffect(() => {
    const raw = video.timestamps || videoFile?.timestamps || [];
    setLocalTimestamps([...raw].sort((a, b) => a.seconds - b.seconds));
  }, [video.id, video.timestamps]);

  // Resume last position on mount
  useEffect(() => {
    if (videoRef.current && (video.lastPositionSeconds || 0) > 0) {
      videoRef.current.currentTime = video.lastPositionSeconds || 0;
    }
  }, [video.id]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  // Continuous Playback & Queue State
  const effectivePlaylist = useMemo(() => {
    return playlist && playlist.length > 0 ? playlist : [video];
  }, [playlist, video]);

  const currentIndex = useMemo(() => {
    const idx = effectivePlaylist.findIndex(v => v.id === video.id);
    return idx >= 0 ? idx : 0;
  }, [effectivePlaylist, video.id]);

  const [isShuffle, setIsShuffle] = useState(isShuffleInitial);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState(true);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueSearch, setQueueSearch] = useState('');
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [nextMovieToPlay, setNextMovieToPlay] = useState<MovieVideo | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getNextMovie = useCallback((): MovieVideo | null => {
    if (effectivePlaylist.length <= 1) return null;

    if (isShuffle) {
      const candidates = effectivePlaylist.filter(v => v.id !== video.id);
      const uncompleted = candidates.filter(v => !v.isCompleted);
      const pool = uncompleted.length > 0 ? uncompleted : candidates;
      const randomIdx = Math.floor(Math.random() * pool.length);
      return pool[randomIdx] || null;
    }

    if (currentIndex < effectivePlaylist.length - 1) {
      return effectivePlaylist[currentIndex + 1];
    }
    return null;
  }, [effectivePlaylist, currentIndex, isShuffle, video.id]);

  const getPrevMovie = useCallback((): MovieVideo | null => {
    if (effectivePlaylist.length <= 1) return null;
    if (currentIndex > 0) {
      return effectivePlaylist[currentIndex - 1];
    }
    return null;
  }, [effectivePlaylist, currentIndex]);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setNextCountdown(null);
    setNextMovieToPlay(null);
  }, []);

  const handlePlayNext = useCallback(() => {
    cancelCountdown();
    const next = nextMovieToPlay || getNextMovie();
    if (next && onSelectVideo) {
      if (videoRef.current) {
        onUpdateProgress(video.id, videoRef.current.currentTime, false);
      }
      onSelectVideo(next);
    }
  }, [cancelCountdown, nextMovieToPlay, getNextMovie, onSelectVideo, onUpdateProgress, video.id]);

  const handlePlayPrev = useCallback(() => {
    cancelCountdown();
    const prev = getPrevMovie();
    if (prev && onSelectVideo) {
      if (videoRef.current) {
        onUpdateProgress(video.id, videoRef.current.currentTime, false);
      }
      onSelectVideo(prev);
    }
  }, [cancelCountdown, getPrevMovie, onSelectVideo, onUpdateProgress, video.id]);

  // Clean countdown on unmount or video change
  useEffect(() => {
    cancelCountdown();
  }, [video.id, cancelCountdown]);

  // Keyboard Shortcuts for continuous playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        handlePlayNext();
      } else if (e.shiftKey && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        handlePlayPrev();
      } else if (e.key === 's' || e.key === 'S') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setIsShuffle(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlayNext, handlePlayPrev]);

  const handleVideoEnded = () => {
    onUpdateProgress(video.id, duration, true);

    if (isAutoPlayNext && onSelectVideo && effectivePlaylist.length > 1) {
      const next = getNextMovie();
      if (next) {
        setNextMovieToPlay(next);
        setNextCountdown(6);

        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }

        countdownTimerRef.current = setInterval(() => {
          setNextCountdown(prev => {
            if (prev === null || prev <= 1) {
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              onSelectVideo(next);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  const onUpdateProgressRef = useRef(onUpdateProgress);
  useEffect(() => {
    onUpdateProgressRef.current = onUpdateProgress;
  }, [onUpdateProgress]);

  const onEnterPiPRef = useRef(onEnterPiP);
  const onLeavePiPRef = useRef(onLeavePiP);
  const onRestoreToTabRef = useRef(onRestoreToTab);
  useEffect(() => {
    onEnterPiPRef.current = onEnterPiP;
    onLeavePiPRef.current = onLeavePiP;
    onRestoreToTabRef.current = onRestoreToTab;
  }, [onEnterPiP, onLeavePiP, onRestoreToTab]);

  const lastSavedTimeRef = useRef<number>(-1);

  // Periodic progress auto-save & unmount sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const curr = Math.floor(videoRef.current.currentTime);
        if (curr !== lastSavedTimeRef.current && curr > 0) {
          lastSavedTimeRef.current = curr;
          onUpdateProgressRef.current(video.id, curr, false);
        }
      }
    }, 4000);

    return () => {
      clearInterval(interval);
      if (videoRef.current) {
        const curr = Math.floor(videoRef.current.currentTime);
        if (curr > 0 && curr !== lastSavedTimeRef.current) {
          lastSavedTimeRef.current = curr;
          onUpdateProgressRef.current(video.id, curr, false);
        }
      }
    };
  }, [video.id]);

  // Picture-in-Picture event listeners
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const handleLeavePiP = () => {
      if (videoEl) {
        const curr = Math.floor(videoEl.currentTime);
        lastSavedTimeRef.current = curr;
        onUpdateProgressRef.current(video.id, curr, false);
        if (!videoEl.paused) {
          videoEl.play().catch(() => {});
        }
      }
      onLeavePiPRef.current?.();
      onRestoreToTabRef.current?.();
    };

    const handleEnterPiP = () => {
      if (videoEl) {
        const curr = Math.floor(videoEl.currentTime);
        lastSavedTimeRef.current = curr;
        onUpdateProgressRef.current(video.id, curr, false);
      }
      onEnterPiPRef.current?.();
    };

    videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);
    videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);

    return () => {
      videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
      videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
    };
  }, [video.id]);

  const handleBack = () => {
    cancelCountdown();
    if (document.pictureInPictureElement && document.exitPictureInPicture) {
      document.exitPictureInPicture().catch(() => {});
    }
    if (videoRef.current) {
      onUpdateProgress(video.id, videoRef.current.currentTime, false);
      videoRef.current.pause();
    }
    onBackToCatalog();
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleAddTimestamp = async () => {
    const time = videoRef.current ? Math.floor(videoRef.current.currentTime) : 0;
    const label = newTimestampLabel.trim() || `Capítulo ${localTimestamps.length + 1} (${formatTime(time)})`;
    const newTs: VideoTimestamp = {
      id: `ts-${Date.now()}`,
      label,
      seconds: time,
      timeFormatted: formatTime(time)
    };

    const updated = [...localTimestamps, newTs].sort((a, b) => a.seconds - b.seconds);
    setLocalTimestamps(updated);
    setNewTimestampLabel('');

    const updatedVideo: MovieVideo = {
      ...video,
      timestamps: updated
    };

    if (onUpdateVideo) {
      await onUpdateVideo(updatedVideo);
    } else {
      try {
        const isPersonal = Boolean((video as any).date || (video as any).people || (video as any).location);
        const endpoint = isPersonal ? `/api/personal-videos/${video.id}` : `/api/videos/${video.id}`;
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedVideo)
        });
      } catch (e) {
        console.error('Error saving timestamp:', e);
      }
    }
  };

  const handleDeleteTimestamp = async (tsId: string) => {
    const updated = localTimestamps.filter(ts => ts.id !== tsId);
    setLocalTimestamps(updated);

    const updatedVideo: MovieVideo = {
      ...video,
      timestamps: updated
    };

    if (onUpdateVideo) {
      await onUpdateVideo(updatedVideo);
    } else {
      try {
        const isPersonal = Boolean((video as any).date || (video as any).people || (video as any).location);
        const endpoint = isPersonal ? `/api/personal-videos/${video.id}` : `/api/videos/${video.id}`;
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedVideo)
        });
      } catch (e) {
        console.error('Error deleting timestamp:', e);
      }
    }
  };

  const handleSaveGeneratedTimestamps = async (newTimestamps: VideoTimestamp[]) => {
    setLocalTimestamps(newTimestamps);
    const updatedVideo: MovieVideo = {
      ...video,
      timestamps: newTimestamps
    };

    if (onUpdateVideo) {
      await onUpdateVideo(updatedVideo);
    } else {
      try {
        const isPersonal = Boolean((video as any).date || (video as any).people || (video as any).location);
        const endpoint = isPersonal ? `/api/personal-videos/${video.id}` : `/api/videos/${video.id}`;
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedVideo)
        });
      } catch (e) {
        console.error('Error saving generated timestamps:', e);
      }
    }
  };

  const activeSub = subtitles.find(s => s.id === selectedSubId);

  return (
    <div
      className={
        isPiPHidden
          ? 'fixed bottom-0 right-0 w-px h-px opacity-0 pointer-events-none -z-50 overflow-hidden'
          : 'flex-1 flex flex-col h-full bg-black text-white overflow-y-auto select-none'
      }
    >
      {/* Slim Top Navbar Bar with Icon-Only Actions */}
      {!isPiPHidden && (
        <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-1.5 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shrink-0 h-11">
          {/* Back Button (Icon Only) */}
          <button
            onClick={handleBack}
            className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-red-400 border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 shrink-0"
            title="Voltar para Catálogo de Filmes"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Video Title & Category & Playlist Context */}
          <div className="flex items-center gap-2 overflow-hidden px-2 flex-1 min-w-0">
            <span className="px-2 py-0.5 rounded-lg bg-red-600/90 text-white text-[10px] font-black uppercase shadow-sm shrink-0">
              {video.category || 'Filme'}
            </span>

            {playlistTitle && (
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 shrink-0 truncate max-w-[130px] sm:max-w-[200px]" title={playlistTitle}>
                {playlistTitle}
              </span>
            )}

            <div className="min-w-0 flex-1 overflow-hidden">
              <MarqueeTitle
                text={video.titlePt || video.title}
                as="h2"
                className="text-xs sm:text-sm font-bold text-white"
              />
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Continuous Playback Navigation Controls */}
            {effectivePlaylist.length > 1 && (
              <>
                <button
                  onClick={handlePlayPrev}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  title="Filme Anterior (Shift+P)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePlayNext}
                  disabled={!isShuffle && currentIndex >= effectivePlaylist.length - 1}
                  className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  title="Próximo Filme (Shift+N)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsShuffle(prev => !prev)}
                  className={`p-2 rounded-xl border shadow-sm transition-all active:scale-95 shrink-0 ${
                    isShuffle 
                      ? 'bg-red-600 text-white border-red-500 shadow-red-600/30' 
                      : 'bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-800 hover:border-gray-700'
                  }`}
                  title={isShuffle ? 'Modo Aleatório Ativo (S)' : 'Ativar Modo Aleatório (S)'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsAutoPlayNext(prev => !prev)}
                  className={`p-2 rounded-xl border shadow-sm transition-all active:scale-95 shrink-0 ${
                    isAutoPlayNext 
                      ? 'bg-amber-600 text-white border-amber-500 shadow-amber-600/30' 
                      : 'bg-gray-900/90 hover:bg-gray-800 text-gray-400 hover:text-white border-gray-800 hover:border-gray-700'
                  }`}
                  title={isAutoPlayNext ? 'Reprodução Contínua Ativa (Autoplay)' : 'Ativar Reprodução Contínua'}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsQueueOpen(prev => !prev)}
                  className={`p-2 rounded-xl border shadow-sm transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                    isQueueOpen
                      ? 'bg-red-600 text-white border-red-500 shadow-red-600/30'
                      : 'bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-800 hover:border-gray-700'
                  }`}
                  title="Fila de Reprodução / Playlist"
                >
                  <List className="w-4 h-4" />
                  <span className="text-[10px] font-mono font-bold hidden sm:inline">
                    {currentIndex + 1}/{effectivePlaylist.length}
                  </span>
                </button>
              </>
            )}

            {/* PiP Button */}
            <button
              onClick={async () => {
                if (!videoRef.current) return;
                try {
                  if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture();
                  } else if (videoRef.current.requestPictureInPicture) {
                    await videoRef.current.requestPictureInPicture();
                  }
                } catch (e) {
                  console.warn('PiP error:', e);
                }
              }}
              className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-purple-400 hover:text-purple-300 border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 shrink-0"
              title="Janela Flutuante (Picture-in-Picture) - Assista enquanto navega"
            >
              <Airplay className="w-4 h-4" />
            </button>

            {/* Cast to Smart TV */}
            <button
              onClick={() => setIsCastModalOpen(true)}
              className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-sky-400 hover:text-sky-300 border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
              title="Transmitir para Smart TV / Chromecast"
            >
              <Cast className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Transmitir</span>
            </button>

            {onOpenEditModal && (
              <button
                onClick={onOpenEditModal}
                className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 shrink-0"
                title="Editar Obra / Capa"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {videoFile && (
              <button
                onClick={() => setIsDownloadModalOpen(true)}
                className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                title="Baixar Vídeo para Cache Local"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Cinema Player Container */}
      <div className={isPiPHidden ? 'w-px h-px overflow-hidden' : 'flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-6xl w-full mx-auto space-y-4'}>
        {(videoFile || video.fileId) ? (
          <div className={isPiPHidden ? 'w-px h-px' : 'relative w-full max-h-[72vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center group'}>
            <video
              ref={videoRef}
              src={resolveApiUrl(`/api/stream/${videoFile?.id || video.fileId}`)}
              controls={!isPiPHidden}
              autoPlay
              preload="auto"
              playsInline
              onLoadedMetadata={() => {
                if (videoRef.current && (video.lastPositionSeconds || 0) > 0) {
                  videoRef.current.currentTime = video.lastPositionSeconds || 0;
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => {
                setIsPlaying(false);
                if (videoRef.current) {
                  onUpdateProgress(video.id, videoRef.current.currentTime, false);
                }
              }}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className={isPiPHidden ? 'w-px h-px' : 'w-full h-full max-h-[72vh] object-contain'}
            >
              {subtitles.map(sub => (
                <track
                  key={sub.id}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.srclang || 'pt'}
                  label={sub.label || 'Português'}
                  default={sub.id === selectedSubId}
                />
              ))}
            </video>

            {/* Next Movie Autoplay Countdown Overlay */}
            {nextCountdown !== null && nextMovieToPlay && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-gray-900/95 p-5 sm:p-6 rounded-3xl border border-red-500/40 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-bold flex items-center gap-1.5 text-red-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Reprodução Contínua</span>
                    </span>
                    <span className="font-mono bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full font-bold border border-red-500/30">
                      Próximo em {nextCountdown}s
                    </span>
                  </div>

                  {/* Next Movie Card */}
                  <div className="flex items-center gap-3.5 bg-gray-950/80 p-3 rounded-2xl border border-gray-800 text-left">
                    <img
                      src={nextMovieToPlay.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                      alt={nextMovieToPlay.title}
                      className="w-14 aspect-[2/3] object-cover rounded-xl shadow-md shrink-0 border border-white/10"
                    />
                    <div className="overflow-hidden flex-1 min-w-0">
                      {nextMovieToPlay.saga && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block truncate">
                          Saga {nextMovieToPlay.saga} {nextMovieToPlay.sagaOrder ? `• #${nextMovieToPlay.sagaOrder}` : ''}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-white truncate">
                        {nextMovieToPlay.titlePt || nextMovieToPlay.title}
                      </h4>
                      {nextMovieToPlay.titlePt && nextMovieToPlay.titlePt !== nextMovieToPlay.title && (
                        <p className="text-xs text-gray-400 italic truncate">{nextMovieToPlay.title}</p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 font-mono">
                        {nextMovieToPlay.year && <span>{nextMovieToPlay.year}</span>}
                        {nextMovieToPlay.duration && <span>• {nextMovieToPlay.duration}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar of countdown */}
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-600 to-rose-500 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${((6 - nextCountdown) / 6) * 100}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handlePlayNext}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Assistir Agora</span>
                    </button>
                    <button
                      onClick={cancelCountdown}
                      className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (video.embedUrl || (video.videoUrl && (video.videoUrl.includes('youtube.com') || video.videoUrl.includes('youtu.be')))) ? (
          <div className={isPiPHidden ? 'w-px h-px' : 'relative w-full min-h-[50vh] max-h-[75vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center'}>
            <iframe
              src={
                video.embedUrl || 
                `https://www.youtube.com/embed/${video.videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i)?.[1] || ''}?autoplay=1&enablejsapi=1`
              }
              title={video.title}
              className="w-full h-full min-h-[50vh] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />

            {/* Next Movie Autoplay Countdown Overlay for Iframe */}
            {nextCountdown !== null && nextMovieToPlay && (
              <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
                <div className="max-w-md w-full bg-gray-900/95 p-5 sm:p-6 rounded-3xl border border-red-500/40 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-bold flex items-center gap-1.5 text-red-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Reprodução Contínua</span>
                    </span>
                    <span className="font-mono bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-full font-bold border border-red-500/30">
                      Próximo em {nextCountdown}s
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 bg-gray-950/80 p-3 rounded-2xl border border-gray-800 text-left">
                    <img
                      src={nextMovieToPlay.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                      alt={nextMovieToPlay.title}
                      className="w-14 aspect-[2/3] object-cover rounded-xl shadow-md shrink-0 border border-white/10"
                    />
                    <div className="overflow-hidden flex-1 min-w-0">
                      {nextMovieToPlay.saga && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block truncate">
                          Saga {nextMovieToPlay.saga} {nextMovieToPlay.sagaOrder ? `• #${nextMovieToPlay.sagaOrder}` : ''}
                        </span>
                      )}
                      <h4 className="font-bold text-sm text-white truncate">
                        {nextMovieToPlay.titlePt || nextMovieToPlay.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 font-mono">
                        {nextMovieToPlay.year && <span>{nextMovieToPlay.year}</span>}
                        {nextMovieToPlay.duration && <span>• {nextMovieToPlay.duration}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handlePlayNext}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all hover:scale-105 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Assistir Agora</span>
                    </button>
                    <button
                      onClick={cancelCountdown}
                      className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : !isPiPHidden ? (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-gray-900/50 rounded-3xl border border-gray-800 max-w-md w-full">
            <Film className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-sm font-bold">Arquivo de vídeo não encontrado</h3>
            <p className="text-xs text-gray-400 mt-1">
              Certifique-se de que a pasta vinculada contém um arquivo de vídeo .mp4 ou .mkv válido ou link de streaming do YouTube.
            </p>
          </div>
        ) : null}

        {/* Video Information & Chapters Hub */}
        {!isPiPHidden && (
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
          {/* Metadata Section */}
          <div className="md:col-span-2 space-y-4 bg-gray-900/60 p-6 rounded-3xl border border-gray-800/80">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold">
                  {video.category || 'Filmes'}
                </span>
                {video.imdbRating && video.imdbRating !== 'N/A' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-xs font-black shadow">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>IMDb {video.imdbRating}</span>
                  </span>
                )}
                {video.rated && video.rated !== 'N/A' && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold">
                    {video.rated}
                  </span>
                )}
                {video.year && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-mono">
                    {video.year}
                  </span>
                )}
                {video.runtime && video.runtime !== 'N/A' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-mono">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{video.runtime}</span>
                  </span>
                )}
                {video.genre && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs">
                    {video.genre}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white">{video.titlePt || video.title}</h1>
              {video.titlePt && video.titlePt !== video.title && (
                <p className="text-xs text-red-300 italic mt-0.5">
                  Título Original: <strong>{video.title}</strong>
                </p>
              )}
              
              {video.director && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Direção: <strong className="text-gray-200">{video.director}</strong>
                </p>
              )}

              {video.actors && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500 shrink-0" />
                  <span>Elenco: <strong className="text-gray-300">{video.actors}</strong></span>
                </p>
              )}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              {video.description || 'Nenhuma sinopse disponível para este vídeo.'}
            </p>

            {/* Quick Playback Speed Switcher */}
            <div className="pt-2 flex items-center gap-2 border-t border-gray-800 text-xs">
              <span className="text-gray-400 font-bold">Velocidade:</span>
              {[0.75, 1, 1.25, 1.5, 2].map(spd => (
                <button
                  key={spd}
                  onClick={() => handleSpeedChange(spd)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors ${
                    playbackRate === spd ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps / Chapters Panel */}
          <div className="space-y-4 bg-gray-900/70 p-5 sm:p-6 rounded-3xl border border-gray-800 shadow-xl backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-red-500" />
                <span>Capítulos / Timestamps ({localTimestamps.length})</span>
              </h3>

              {subtitles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsGenerateMarkersModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
                  title="Gerar capítulos e marcadores a partir da legenda em 1 clique"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>✨ Gerar Marcadores da Legenda</span>
                </button>
              )}
            </div>

            {/* Quick Add Timestamp Input */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1 pb-2">
              <input
                type="text"
                value={newTimestampLabel}
                onChange={(e) => setNewTimestampLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTimestamp();
                  }
                }}
                placeholder="Nome do capítulo ou cena (ex: Início da Batalha)..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-950/90 border border-gray-700/80 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleAddTimestamp}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all active:scale-95 shrink-0"
                title="Criar marcador no tempo atual da reprodução"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Marcar Tempo Atual</span>
              </button>
            </div>

            {/* Timestamps List */}
            {localTimestamps.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {localTimestamps.map(ts => (
                  <div
                    key={ts.id}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-950/60 hover:bg-red-600/15 border border-gray-800/80 hover:border-red-500/40 text-left transition-all group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.currentTime = ts.seconds;
                          videoRef.current.play();
                        }
                      }}
                      className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 text-left"
                      title={`Pular para ${formatTime(ts.seconds)}`}
                    >
                      <span className="text-[10px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-md shrink-0">
                        ▶ {formatTime(ts.seconds)}
                      </span>
                      <span className="text-xs font-semibold text-gray-200 group-hover:text-red-300 truncate">
                        {ts.label}
                      </span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleDeleteTimestamp(ts.id)}
                      className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors shrink-0"
                      title="Excluir capítulo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gray-950/40 border border-gray-800/60 text-center">
                <p className="text-xs text-gray-400 font-medium">
                  Nenhum capítulo marcado ainda.
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  Pause ou dê play no filme no momento desejado, digite o nome e clique em <strong>"+ Marcar Tempo Atual"</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Video Download & Cache Progress Modal */}
      {videoFile && (
        <VideoDownloadModal
          file={videoFile}
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          customTitle={video.title}
        />
      )}

      {/* Generate Subtitle Markers Modal */}
      {subtitles.length > 0 && (
        <GenerateMarkersModal
          isOpen={isGenerateMarkersModalOpen}
          onClose={() => setIsGenerateMarkersModalOpen(false)}
          subtitles={subtitles}
          selectedSubId={selectedSubId}
          videoDuration={duration}
          onSeek={(seconds) => {
            if (videoRef.current) {
              videoRef.current.currentTime = seconds;
            }
          }}
          onSaveTimestamps={handleSaveGeneratedTimestamps}
        />
      )}
      {/* Playlist / Queue Drawer */}
      {isQueueOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm sm:max-w-md bg-gray-950/98 backdrop-blur-2xl border-l border-gray-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 select-none">
          {/* Drawer Header */}
          <div className="p-4 border-b border-gray-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center shrink-0">
                <List className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-sm text-white truncate">
                  {playlistTitle || (video.saga ? `Saga: ${video.saga}` : 'Fila de Reprodução')}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {effectivePlaylist.length} {effectivePlaylist.length === 1 ? 'filme' : 'filmes'} • #{currentIndex + 1} de {effectivePlaylist.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="Fechar fila"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Controls inside Drawer */}
          <div className="px-4 py-2.5 bg-gray-900/60 border-b border-gray-800/60 flex items-center justify-between gap-2 text-xs">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                placeholder="Buscar na fila..."
                className="w-full pl-8 pr-3 py-1.5 bg-gray-800/80 rounded-xl text-xs text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <button
              onClick={() => setIsShuffle(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                isShuffle
                  ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/30'
                  : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
              }`}
              title={isShuffle ? 'Modo Aleatório Ativo (S)' : 'Ativar Modo Aleatório (S)'}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsAutoPlayNext(prev => !prev)}
              className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                isAutoPlayNext
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                  : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:text-white'
              }`}
              title={isAutoPlayNext ? 'Reprodução Contínua Ativa (Autoplay)' : 'Ativar Reprodução Contínua'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Movies List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {effectivePlaylist
              .filter(m => !queueSearch.trim() || 
                m.title.toLowerCase().includes(queueSearch.toLowerCase()) || 
                (m.titlePt && m.titlePt.toLowerCase().includes(queueSearch.toLowerCase()))
              )
              .map((m) => {
                const isCurrent = m.id === video.id;
                const itemIndex = effectivePlaylist.findIndex(item => item.id === m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      if (!isCurrent && onSelectVideo) {
                        if (videoRef.current) {
                          onUpdateProgress(video.id, videoRef.current.currentTime, false);
                        }
                        onSelectVideo(m);
                      }
                    }}
                    className={`group p-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-red-600/20 border-red-500/60 shadow-lg'
                        : 'bg-gray-900/50 hover:bg-gray-900 border-gray-800/80 hover:border-gray-700'
                    }`}
                  >
                    {/* Order indicator */}
                    <span className={`w-6 text-center text-xs font-mono font-bold shrink-0 ${
                      isCurrent ? 'text-red-400' : 'text-gray-500'
                    }`}>
                      {m.sagaOrder ? `#${m.sagaOrder}` : `#${itemIndex + 1}`}
                    </span>

                    {/* Poster */}
                    <div className="relative w-12 aspect-[2/3] rounded-xl overflow-hidden bg-black/60 shrink-0 border border-white/10">
                      <img
                        src={m.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                        alt={m.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-red-600/40 flex items-center justify-center">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                            Tocando
                          </span>
                        )}
                        <h4 className={`text-xs font-bold truncate ${
                          isCurrent ? 'text-red-400' : 'text-gray-200 group-hover:text-white'
                        }`}>
                          {m.titlePt || m.title}
                        </h4>
                      </div>
                      {m.titlePt && m.titlePt !== m.title && (
                        <p className="text-[10px] text-gray-400 italic truncate -mt-0.5">{m.title}</p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                        {m.year && <span>{m.year}</span>}
                        {m.duration && <span>• {m.duration}</span>}
                        {m.isCompleted ? (
                          <span className="text-emerald-400 flex items-center gap-0.5 ml-auto font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Assistido</span>
                          </span>
                        ) : (m.lastPositionSeconds || 0) > 0 ? (
                          <span className="text-amber-400 ml-auto font-medium">Continuar</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Cast & Smart TV Modal */}
      {(videoFile || video.fileId) && (
        <CastModal
          isOpen={isCastModalOpen}
          onClose={() => setIsCastModalOpen(false)}
          mediaUrl={resolveApiUrl(`/api/stream/${videoFile?.id || video.fileId}`)}
          title={video.titlePt || video.title}
          subUrl={selectedSubId !== 'none' ? subtitles.find(s => s.id === selectedSubId)?.url : undefined}
          videoElementRef={videoRef}
          onEnterPiP={async () => {
            try {
              if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
              } else if (videoRef.current?.requestPictureInPicture) {
                await videoRef.current.requestPictureInPicture();
              }
            } catch (e) {}
          }}
        />
      )}
    </div>
  );
};
