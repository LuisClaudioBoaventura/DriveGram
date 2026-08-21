import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, CheckCircle2, Circle, Edit3, Trash2, Headphones, Download, Music2, Mic, Clock } from 'lucide-react';
import { AudioShow, AudioTrack, DriveItem } from '../types/index.js';

interface AudioStudioViewProps {
  audioShow: AudioShow;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateAudioShow: (updated: AudioShow) => Promise<void>;
  onDeleteAudioShow: (id: string) => void;
  onToggleTrackCompletion: (trackId: string) => Promise<void>;
  onUpdateTrackProgress: (trackId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
}

export const AudioStudioView: React.FC<AudioStudioViewProps> = ({
  audioShow,
  allFiles,
  onBackToCatalog,
  onUpdateAudioShow,
  onDeleteAudioShow,
  onToggleTrackCompletion,
  onUpdateTrackProgress,
  onOpenEditModal
}) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const tracks = audioShow.tracks || [];
  const activeTrack: AudioTrack | undefined = tracks[currentTrackIndex];
  const activeFile = activeTrack?.fileId ? allFiles.find(f => f.id === activeTrack.fileId) : null;

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const playTrackByIndex = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setTimeout(() => {
          audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
        }, 100);
      }
    }
  };

  const handleNextTrack = () => {
    if (tracks.length === 0) return;
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playTrackByIndex(randomIdx);
    } else if (currentTrackIndex < tracks.length - 1) {
      playTrackByIndex(currentTrackIndex + 1);
    } else if (isRepeat) {
      playTrackByIndex(0);
    }
  };

  const handlePrevTrack = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (currentTrackIndex > 0) {
      playTrackByIndex(currentTrackIndex - 1);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    if (audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleTrackEnded = () => {
    if (activeTrack) {
      onUpdateTrackProgress(activeTrack.id, 0, true);
    }
    handleNextTrack();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-drive-darkBg overflow-hidden text-gray-900 dark:text-gray-100 select-none">
      {/* Top Navbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-drive-darkBg/90 backdrop-blur-md border-b border-gray-200 dark:border-drive-darkBorder shrink-0">
        <button
          onClick={onBackToCatalog}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Músicas & Podcasts</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Informações</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Excluir "${audioShow.title}"?`)) {
                onDeleteAudioShow(audioShow.id);
                onBackToCatalog();
              }
            }}
            className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl w-full mx-auto pb-28">
        {/* Album Header Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/20 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
          {/* Square Album Cover */}
          <div
            onClick={onOpenEditModal}
            className="relative w-44 sm:w-52 aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 shrink-0 bg-black/60 group cursor-pointer"
            title="Clique para editar capa"
          >
            <img
              src={audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
              alt={audioShow.title}
              draggable={false}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
              <Edit3 className="w-5 h-5 text-emerald-400" />
              <span>Trocar Capa</span>
            </div>
          </div>

          {/* Details & Actions */}
          <div className="flex-1 flex flex-col justify-between h-full space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                  {audioShow.showType === 'podcast' ? 'Podcast' : audioShow.showType === 'playlist' ? 'Playlist' : 'Álbum'}
                </span>
                {audioShow.category && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs">
                    {audioShow.category}
                  </span>
                )}
                {audioShow.genre && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs">
                    {audioShow.genre}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {audioShow.title}
              </h1>

              {(audioShow.artist || audioShow.host) && (
                <p className="text-sm font-bold text-emerald-400 mt-1">
                  {audioShow.artist || audioShow.host}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-2 max-w-2xl leading-relaxed">
                {audioShow.description || 'Ouça as faixas completas em alta fidelidade com sincronização em nuvem.'}
              </p>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => {
                  if (isPlaying) {
                    togglePlay();
                  } else {
                    playTrackByIndex(currentTrackIndex);
                  }
                }}
                disabled={tracks.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isPlaying ? 'Pausar' : 'Tocar Álbum'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tracklist Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Music2 className="w-5 h-5 text-emerald-500" />
              <span>Lista de Faixas / Episódios ({tracks.length})</span>
            </h2>
          </div>

          {tracks.length > 0 ? (
            <div className="space-y-2">
              {tracks.map((track, idx) => {
                const isCurrent = currentTrackIndex === idx;
                const trackFile = track.fileId ? allFiles.find(f => f.id === track.fileId) : null;

                return (
                  <div
                    key={track.id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/60 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-3">
                      {/* Track number or Play icon */}
                      <button
                        onClick={() => playTrackByIndex(idx)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {isCurrent && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : isCurrent ? (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <span>{track.trackNumber || idx + 1}</span>
                        )}
                      </button>

                      {/* Track Details */}
                      <div className="overflow-hidden flex-1">
                        <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {track.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          {track.artist && <span>{track.artist}</span>}
                          {trackFile && <span className="font-mono uppercase">• {trackFile.extension}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-gray-400">
                        {track.duration || '03:45'}
                      </span>

                      <button
                        onClick={() => onToggleTrackCompletion(track.id)}
                        className="text-gray-400 hover:text-emerald-500 transition-colors"
                        title={track.isCompleted ? 'Ouvido' : 'Marcar como ouvido'}
                      >
                        {track.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
              <Headphones className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="font-bold text-sm">Nenhuma faixa de áudio encontrada na pasta</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Adicione arquivos .mp3 ou .wav na pasta de origem para que apareçam aqui automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Player Bar */}
      {activeTrack && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800 p-3 sm:p-4 text-white shadow-2xl">
          {activeFile && (
            <audio
              ref={audioRef}
              key={activeFile.id}
              src={`/api/stream/${activeFile.id}`}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleTrackEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left Track Info */}
            <div className="flex items-center gap-3 w-full sm:w-1/4 overflow-hidden">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 shrink-0 border border-gray-700">
                <img
                  src={audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                  alt="Track art"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-xs font-bold text-white truncate">{activeTrack.title}</h4>
                <p className="text-[10px] text-gray-400 truncate">{activeTrack.artist || audioShow.artist || audioShow.host}</p>
              </div>
            </div>

            {/* Center Controls & Scrubber */}
            <div className="flex-1 flex flex-col items-center space-y-1 w-full max-w-lg">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1.5 rounded-lg transition-colors ${isShuffle ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-white'}`}
                  title="Modo Aleatório"
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <button
                  onClick={handlePrevTrack}
                  className="p-1.5 text-gray-300 hover:text-white transition-colors"
                  title="Faixa Anterior"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                </button>

                <button
                  onClick={handleNextTrack}
                  className="p-1.5 text-gray-300 hover:text-white transition-colors"
                  title="Próxima Faixa"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={`p-1.5 rounded-lg transition-colors ${isRepeat ? 'text-emerald-400 bg-emerald-500/10' : 'text-gray-400 hover:text-white'}`}
                  title="Repetir"
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Scrubber */}
              <div className="flex items-center gap-2 w-full text-[10px] font-mono text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 accent-emerald-500 cursor-pointer h-1 bg-gray-700 rounded-lg"
                />
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Speed & Volume Controls */}
            <div className="hidden sm:flex items-center justify-end gap-2 w-1/4">
              <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-xl text-[10px] font-mono">
                {[1, 1.25, 1.5].map(spd => (
                  <button
                    key={spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`px-1 rounded ${playbackRate === spd ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (audioRef.current) {
                    audioRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
