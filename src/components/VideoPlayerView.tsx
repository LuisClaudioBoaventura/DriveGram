import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, CheckCircle2, Bookmark, Download, Edit3, Film, Settings } from 'lucide-react';
import { MovieVideo, DriveItem } from '../types/index.js';

interface VideoPlayerViewProps {
  video: MovieVideo;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateProgress: (videoId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  video,
  allFiles,
  onBackToCatalog,
  onUpdateProgress,
  onOpenEditModal
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
  const timestamps = video.timestamps || videoFile?.timestamps || [];

  // Resume last position on mount
  useEffect(() => {
    if (videoRef.current && (video.lastPositionSeconds || 0) > 0) {
      videoRef.current.currentTime = video.lastPositionSeconds || 0;
    }
  }, [video.id, video.lastPositionSeconds]);

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

  // Periodic progress auto-save
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        onUpdateProgress(video.id, videoRef.current.currentTime, false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [video.id, onUpdateProgress]);

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

  const activeSub = subtitles.find(s => s.id === selectedSubId);

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-white overflow-y-auto select-none">
      {/* Slim Top Navbar Bar with Icon-Only Actions */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-1.5 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shrink-0 h-11">
        {/* Back Button (Icon Only) */}
        <button
          onClick={() => {
            if (videoRef.current) {
              onUpdateProgress(video.id, videoRef.current.currentTime, false);
            }
            onBackToCatalog();
          }}
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
            {video.title}
          </h2>
        </div>

        {/* Action Controls (Icons Only) */}
        <div className="flex items-center gap-1.5 shrink-0">
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

      {/* Main Cinema Player Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 max-w-6xl w-full mx-auto space-y-4">
        {videoFile ? (
          <div className="relative w-full max-h-[72vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center group">
            <video
              ref={videoRef}
              src={`/api/stream/${videoFile.id}`}
              controls
              autoPlay
              playsInline
              crossOrigin="anonymous"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className="w-full h-full max-h-[72vh] object-contain"
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
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-gray-900/50 rounded-3xl border border-gray-800 max-w-md w-full">
            <Film className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-sm font-bold">Arquivo de vídeo não encontrado</h3>
            <p className="text-xs text-gray-400 mt-1">
              Certifique-se de que a pasta vinculada contém um arquivo de vídeo .mp4 ou .mkv válido.
            </p>
          </div>
        )}

        {/* Video Information & Chapters Hub */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-300">
          {/* Metadata Section */}
          <div className="md:col-span-2 space-y-4 bg-gray-900/60 p-6 rounded-3xl border border-gray-800/80">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-red-600/20 text-red-400 text-xs font-bold">
                  {video.category || 'Filmes'}
                </span>
                {video.year && (
                  <span className="px-2 py-0.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-mono">
                    {video.year}
                  </span>
                )}
                {video.genre && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs">
                    {video.genre}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white">{video.title}</h1>
              {video.director && (
                <p className="text-xs text-gray-400 mt-1">
                  Direção: <strong>{video.director}</strong>
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
          <div className="space-y-3 bg-gray-900/60 p-6 rounded-3xl border border-gray-800/80">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-red-500" />
              <span>Capítulos / Timestamps ({timestamps.length})</span>
            </h3>

            {timestamps.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {timestamps.map(ts => (
                  <button
                    key={ts.id}
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = ts.seconds;
                        videoRef.current.play();
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gray-800/60 hover:bg-red-600/20 text-left transition-colors group"
                  >
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-red-400 truncate mr-2">
                      {ts.label}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-2 py-0.5 rounded-md shrink-0">
                      {formatTime(ts.seconds)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Nenhum timestamp ou capítulo configurado para este vídeo.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
