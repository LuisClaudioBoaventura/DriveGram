import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, CheckCircle2, Bookmark, Download, Edit3, Film, Settings, Star, User, Clock, Airplay, Plus, Trash2 } from 'lucide-react';
import { MovieVideo, DriveItem, VideoTimestamp } from '../types/index.js';

interface VideoPlayerViewProps {
  video: MovieVideo;
  allFiles: DriveItem[];
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

  const videoFile = video.fileId ? allFiles.find(f => f.id === video.fileId) : null;
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

  const handleVideoEnded = () => {
    onUpdateProgress(video.id, duration, true);
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

          {/* Video Title & Category */}
          <div className="flex items-center gap-2 overflow-hidden px-2 max-w-[50vw] sm:max-w-md md:max-w-lg">
            <span className="px-2 py-0.5 rounded-lg bg-red-600/90 text-white text-[10px] font-black uppercase shadow-sm shrink-0">
              {video.category || 'Filme'}
            </span>
            <h2 className="text-xs sm:text-sm font-bold text-white truncate">
              {video.titlePt || video.title}
            </h2>
          </div>

          {/* Action Controls (Icons Only) */}
          <div className="flex items-center gap-1.5 shrink-0">
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
              className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-purple-400 hover:text-purple-300 border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95"
              title="Janela Flutuante (Picture-in-Picture) - Assista enquanto navega"
            >
              <Airplay className="w-4 h-4" />
            </button>

            {onOpenEditModal && (
              <button
                onClick={onOpenEditModal}
                className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95"
                title="Editar Obra / Capa"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {videoFile && (
              <a
                href={`/api/stream/${videoFile.id}`}
                download={videoFile.name}
                className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95"
                title="Baixar Vídeo"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Cinema Player Container */}
      <div className={isPiPHidden ? 'w-px h-px overflow-hidden' : 'flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-6xl w-full mx-auto space-y-4'}>
        {videoFile ? (
          <div className={isPiPHidden ? 'w-px h-px' : 'relative w-full max-h-[72vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center group'}>
            <video
              ref={videoRef}
              src={`/api/stream/${videoFile.id}`}
              controls={!isPiPHidden}
              autoPlay
              playsInline
              crossOrigin="anonymous"
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
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-red-500" />
                <span>Capítulos / Timestamps ({localTimestamps.length})</span>
              </h3>
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
    </div>
  );
};
