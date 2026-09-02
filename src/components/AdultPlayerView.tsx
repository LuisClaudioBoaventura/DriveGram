import React, { useRef, useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  FastForward, 
  Download, 
  Edit3, 
  Bookmark, 
  Lock, 
  Flame, 
  Film, 
  LockKeyhole,
  Star,
  SkipBack,
  SkipForward,
  ListMusic,
  CheckCircle2,
  Shuffle,
  User,
  UserPlus,
  Plus,
  X,
  Camera,
  Check
} from 'lucide-react';
import { AdultVideo, AdultPerformer, DriveItem } from '../types/index.js';
import { PerformerDetailModal } from './PerformerDetailModal.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';

interface AdultPlayerViewProps {
  video: AdultVideo;
  playlist?: AdultVideo[];
  allFiles: DriveItem[];
  performers?: AdultPerformer[];
  allVideos?: AdultVideo[];
  onBackToCatalog: () => void;
  onUpdateProgress: (videoId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onToggleFavorite?: (videoId: string) => Promise<boolean>;
  onSelectVideoInPlaylist?: (video: AdultVideo) => void;
  onOpenEditModal?: () => void;
  onLockVault?: () => void;
  onAddPerformerToVideo?: (videoId: string, performerName: string) => Promise<void>;
  onRemovePerformerFromVideo?: (videoId: string, performerName: string) => Promise<void>;
  onOpenNewPerformerModal?: () => void;
  onTogglePerformerFavorite?: (id: string) => Promise<boolean>;
  onUpdateCoverImage?: (videoId: string, coverDataUrl: string) => Promise<void>;
}

export const AdultPlayerView: React.FC<AdultPlayerViewProps> = ({
  video,
  playlist = [],
  allFiles,
  performers = [],
  allVideos = [],
  onBackToCatalog,
  onUpdateProgress,
  onToggleFavorite,
  onSelectVideoInPlaylist,
  onOpenEditModal,
  onLockVault,
  onAddPerformerToVideo,
  onRemovePerformerFromVideo,
  onOpenNewPerformerModal,
  onTogglePerformerFavorite,
  onUpdateCoverImage
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState<boolean>(false);
  const [isFav, setIsFav] = useState<boolean>(!!video.isFavorite);
  const [isAddPerformerOpen, setIsAddPerformerOpen] = useState<boolean>(false);
  const [newPerformerInput, setNewPerformerInput] = useState<string>('');
  const [selectedPerformerForDetail, setSelectedPerformerForDetail] = useState<AdultPerformer | null>(null);
  const [justCapturedCover, setJustCapturedCover] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState<boolean>(false);

  const [localPerformers, setLocalPerformers] = useState<string[]>(() => {
    return video.performers ? video.performers.split(',').map(s => s.trim()).filter(Boolean) : [];
  });

  useEffect(() => {
    setIsFav(!!video.isFavorite);
  }, [video.id, video.isFavorite]);

  useEffect(() => {
    setLocalPerformers(
      video.performers ? video.performers.split(',').map(s => s.trim()).filter(Boolean) : []
    );
  }, [video.id, video.performers]);

  const currentIndex = playlist.findIndex(v => v.id === video.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < playlist.length - 1;

  const videoFile = video.fileId ? allFiles.find(f => f.id === video.fileId) : null;

  useEffect(() => {
    if (videoRef.current && video.lastPositionSeconds && video.lastPositionSeconds > 5) {
      videoRef.current.currentTime = video.lastPositionSeconds;
    }
  }, [video.id, video.fileId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePauseOrEnded = (isEnded = false) => {
    if (!videoRef.current) return;
    const curr = Math.floor(videoRef.current.currentTime);
    const dur = videoRef.current.duration || 0;
    const isFinished = isEnded || (dur > 0 && curr >= dur - 15);
    onUpdateProgress(video.id, curr, isFinished);

    if (isEnded && hasNext && onSelectVideoInPlaylist) {
      const nextVideo = playlist[currentIndex + 1];
      onSelectVideoInPlaylist(nextVideo);
    }
  };

  const handleToggleFav = async () => {
    if (!onToggleFavorite) return;
    const nextState = !isFav;
    setIsFav(nextState);
    await onToggleFavorite(video.id);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleAddPerformer = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!localPerformers.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setLocalPerformers(prev => [...prev, trimmed]);
    }
    setNewPerformerInput('');
    setIsAddPerformerOpen(false);
    if (onAddPerformerToVideo) {
      await onAddPerformerToVideo(video.id, trimmed);
    }
  };

  const handleCaptureFrameAsCover = async () => {
    if (!videoRef.current || !onUpdateCoverImage) return;
    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      await onUpdateCoverImage(video.id, dataUrl);
      setJustCapturedCover(true);
      setTimeout(() => setJustCapturedCover(false), 3000);
    } catch (err) {
      console.error('Error capturing video frame as cover:', err);
    }
  };

  const handleRemovePerformer = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const trimmed = name.trim();
    setLocalPerformers(prev => prev.filter(p => p.toLowerCase() !== trimmed.toLowerCase()));
    if (onRemovePerformerFromVideo) {
      await onRemovePerformerFromVideo(video.id, trimmed);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-gray-100 overflow-y-auto select-none">
      {/* Slim Top Navbar with Icon-Only Actions */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-1.5 bg-gray-950/95 backdrop-blur-md border-b border-gray-800/80 shrink-0 h-11">
        {/* Back Button (Icon Only) */}
        <button
          onClick={() => {
            handlePauseOrEnded(false);
            onBackToCatalog();
          }}
          className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-rose-400 border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95 shrink-0"
          title="Voltar para o Red Locker"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Video Title & Category Badge */}
        <div className="flex items-center gap-2 overflow-hidden px-2 max-w-[45vw] sm:max-w-md md:max-w-lg">
          <span className="px-2 py-0.5 rounded-lg bg-rose-600/90 text-white text-[10px] font-black uppercase shrink-0 flex items-center gap-1 shadow-sm">
            <LockKeyhole className="w-3 h-3" />
            <span>{video.category || 'Red Locker'}</span>
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-white truncate">
            {video.title}
          </h2>
        </div>

        {/* Action Controls (Icons Only) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Capture Frame As Cover Button (Icon Only) */}
          {videoFile && onUpdateCoverImage && (
            <button
              onClick={handleCaptureFrameAsCover}
              className={`p-2 rounded-xl border transition-all active:scale-95 shadow-sm ${
                justCapturedCover
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/30 animate-in zoom-in-95'
                  : 'bg-gray-900/90 hover:bg-rose-600 text-gray-300 hover:text-white border-gray-800 hover:border-rose-500'
              }`}
              title="Capturar frame atual da cena como foto de capa no Red Locker"
            >
              {justCapturedCover ? (
                <Check className="w-4 h-4 text-white animate-bounce" />
              ) : (
                <Camera className="w-4 h-4 text-rose-400 hover:text-white" />
              )}
            </button>
          )}

          {/* Favorite Toggle Button (Icon Only) */}
          {onToggleFavorite && (
            <button
              onClick={handleToggleFav}
              className={`p-2 rounded-xl border transition-all active:scale-95 shadow-sm ${
                isFav
                  ? 'bg-amber-500 text-black border-amber-400 shadow-amber-500/20'
                  : 'bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-amber-400 border-gray-800 hover:border-gray-700'
              }`}
              title={isFav ? 'Remover dos Favoritos' : 'Adicionar à Playlist de Favoritos'}
            >
              <Star className={`w-4 h-4 ${isFav ? 'fill-black' : ''}`} />
            </button>
          )}

          {/* Playlist Drawer Toggle Button (Icon Only) */}
          {playlist.length > 1 && (
            <button
              onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
              className={`p-2 rounded-xl border transition-all active:scale-95 shadow-sm relative ${
                showPlaylistDrawer
                  ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/30'
                  : 'bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border-gray-800 hover:border-gray-700'
              }`}
              title={`Fila de Reprodução (${currentIndex + 1}/${playlist.length})`}
            >
              <ListMusic className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-gray-900">
                {playlist.length}
              </span>
            </button>
          )}

          {/* Download Button (Icon Only) */}
          {videoFile && (
            <button
              onClick={() => setIsDownloadModalOpen(true)}
              className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95"
              title="Baixar Vídeo para Cache Local"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Edit Button (Icon Only) */}
          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="p-2 rounded-xl bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 hover:border-gray-700 shadow-sm transition-all active:scale-95"
              title="Editar Obra / Capa / Elenco"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {/* Lock Button (Icon Only) */}
          {onLockVault && (
            <button
              onClick={() => {
                handlePauseOrEnded(false);
                onLockVault();
              }}
              className="p-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 border border-rose-500/30 text-rose-300 hover:text-white shadow-sm transition-all active:scale-95"
              title="Trancar Red Locker"
            >
              <LockKeyhole className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container with Video & Optional Playlist Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row p-2 sm:p-4 gap-4 max-w-6xl w-full mx-auto justify-center items-start">
        {/* Cinema Video Player Container */}
        <div className="flex-1 w-full flex flex-col items-center">
          <div className="relative w-full max-h-[70vh] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800/90 flex items-center justify-center group">
            {videoFile ? (
              <video
                ref={videoRef}
                key={videoFile.id}
                src={`/api/stream/${videoFile.id}`}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onPause={() => handlePauseOrEnded(false)}
                onEnded={() => handlePauseOrEnded(true)}
                className="w-full h-full max-h-[70vh] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <Film className="w-16 h-16 text-gray-600 mb-3" />
                <h3 className="text-base font-bold text-gray-200">Arquivo de vídeo não localizado</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">
                  O arquivo de vídeo original não foi encontrado nesta pasta do Drive.
                </p>
              </div>
            )}
          </div>

          {/* Quick Playlist Controls & Speed selector */}
          <div className="w-full mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
            {/* Details & Prev/Next */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Prev Video Button */}
              {playlist.length > 1 && (
                <button
                  disabled={!hasPrev}
                  onClick={() => {
                    handlePauseOrEnded(false);
                    if (hasPrev && onSelectVideoInPlaylist) {
                      onSelectVideoInPlaylist(playlist[currentIndex - 1]);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    hasPrev
                      ? 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-white shadow-sm active:scale-95'
                      : 'opacity-30 border-transparent text-gray-600 cursor-not-allowed'
                  }`}
                  title="Vídeo Anterior"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              {/* Next Video Button */}
              {playlist.length > 1 && (
                <button
                  disabled={!hasNext}
                  onClick={() => {
                    handlePauseOrEnded(false);
                    if (hasNext && onSelectVideoInPlaylist) {
                      onSelectVideoInPlaylist(playlist[currentIndex + 1]);
                    }
                  }}
                  className={`p-2.5 rounded-2xl border transition-all ${
                    hasNext
                      ? 'bg-gray-900 border-gray-700 hover:bg-gray-800 text-white shadow-sm active:scale-95'
                      : 'opacity-30 border-transparent text-gray-600 cursor-not-allowed'
                  }`}
                  title="Próximo Vídeo da Playlist"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              <div className="flex-1">
                <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{video.title}</span>
                  {isFav && <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />}
                </h1>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400 mt-0.5">
                  {video.studio && <span>Estúdio: <strong className="text-gray-200">{video.studio}</strong></span>}
                  {video.aka && <span>• AKA: <strong className="text-rose-300 font-normal">({video.aka})</strong></span>}
                  {video.year && <span>• Ano: {video.year}</span>}
                </div>
              </div>
            </div>

            {/* Speed selector */}
            <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 p-1 rounded-2xl shrink-0">
              <span className="text-[10px] font-bold text-gray-400 px-2 uppercase">Velocidade:</span>
              {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-colors ${
                    playbackRate === speed
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Performers Interactive Hub in Player */}
          <div className="w-full mt-4 p-4 rounded-3xl bg-gray-900/60 border border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <span className="text-xs font-bold text-rose-400 flex items-center gap-1 shrink-0">
                <User className="w-3.5 h-3.5" />
                <span>Elenco / Atores:</span>
              </span>

              {localPerformers.length > 0 ? (
                localPerformers.map((pName, idx) => {
                  const matchedPerformer = performers.find(
                    p => p.name.toLowerCase() === pName.toLowerCase() || (p.aka && p.aka.toLowerCase() === pName.toLowerCase())
                  );
                  return (
                    <div
                      key={idx}
                      className="group flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-2xl bg-gray-800 hover:bg-rose-600/20 border border-gray-700 hover:border-rose-500/50 text-gray-200 hover:text-white text-xs font-bold transition-all shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (matchedPerformer) {
                            setSelectedPerformerForDetail(matchedPerformer);
                          } else {
                            setSelectedPerformerForDetail({
                              id: 'temp-' + idx,
                              name: pName,
                              gender: 'female',
                              createdAt: '',
                              updatedAt: ''
                            });
                          }
                        }}
                        className="flex items-center gap-1.5 hover:underline"
                        title={`Ver ficha e galeria de vídeos de ${pName}`}
                      >
                        {matchedPerformer?.photoUrl ? (
                          <img
                            src={matchedPerformer.photoUrl}
                            alt={pName}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-3 h-3 text-rose-400" />
                        )}
                        <span>{pName}</span>
                        {matchedPerformer?.isFavorite && (
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        )}
                      </button>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => handleRemovePerformer(e, pName)}
                        className="p-0.5 rounded-full hover:bg-rose-600 text-gray-400 hover:text-white transition-colors"
                        title={`Remover ${pName} deste vídeo`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <span className="text-xs text-gray-500 italic">
                  Nenhum ator vinculado a este vídeo ainda.
                </span>
              )}
            </div>

            {/* Add Performer Button */}
            <div className="relative shrink-0">
              <button
                onClick={() => setIsAddPerformerOpen(!isAddPerformerOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all active:scale-95 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Adicionar Performer</span>
              </button>

              {/* Add Performer Popover Dropdown */}
              {isAddPerformerOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-72 bg-gray-900 border border-gray-700 rounded-3xl p-3 shadow-2xl z-40 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-rose-500" />
                      <span>Vincular Performer</span>
                    </span>
                    <button
                      onClick={() => setIsAddPerformerOpen(false)}
                      className="text-gray-400 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Input for new name */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newPerformerInput}
                      onChange={(e) => setNewPerformerInput(e.target.value)}
                      placeholder="Nome do ator..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPerformer(newPerformerInput);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl bg-black border border-gray-700 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      disabled={!newPerformerInput.trim()}
                      onClick={() => handleAddPerformer(newPerformerInput)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {/* Existing Performers Quick Select */}
                  {performers.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 block">
                        Ou selecione da lista:
                      </span>
                      {performers
                        .filter(p => !localPerformers.some(lp => lp.toLowerCase() === p.name.toLowerCase()))
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleAddPerformer(p.name)}
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-rose-600/20 hover:text-white cursor-pointer transition-colors text-xs text-gray-300"
                          >
                            <img
                              src={p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                              alt={p.name}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                            <span className="font-bold truncate flex-1">{p.name}</span>
                            {p.aka && <span className="text-[10px] text-gray-500 truncate">({p.aka})</span>}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Create with full modal button */}
                  {onOpenNewPerformerModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddPerformerOpen(false);
                        onOpenNewPerformerModal();
                      }}
                      className="w-full py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-bold border border-gray-700 transition-colors"
                    >
                      Cadastrar Novo Ator com Foto
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Playlist Queue Sidebar / Drawer */}
        {showPlaylistDrawer && playlist.length > 0 && (
          <div className="w-full lg:w-80 bg-gray-900/90 border border-gray-800 rounded-3xl p-4 flex flex-col space-y-3 shrink-0 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-2.5">
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Fila de Reprodução ({playlist.length})
                </h3>
              </div>
              <button
                onClick={() => setShowPlaylistDrawer(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {playlist.map((item, idx) => {
                const isCurrent = item.id === video.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isCurrent && onSelectVideoInPlaylist) {
                        handlePauseOrEnded(false);
                        onSelectVideoInPlaylist(item);
                      }
                    }}
                    className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-rose-600/20 border-rose-500/50 text-white'
                        : 'bg-black/40 border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="relative w-14 aspect-[16/10] rounded-xl overflow-hidden bg-black shrink-0">
                      <img
                        src={item.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      {isCurrent && (
                        <div className="absolute inset-0 bg-rose-600/60 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 fill-current text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold truncate block flex-1">
                          {idx + 1}. {item.title}
                        </span>
                        {item.isFavorite && (
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 truncate block">
                        {item.performers ? `${item.performers}${item.aka ? ` (${item.aka})` : ''}` : item.studio ? `${item.studio}${item.aka ? ` (${item.aka})` : ''}` : item.aka ? `AKA: ${item.aka}` : item.category || '+18'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Performer Profile Modal when clicked from player */}
      {selectedPerformerForDetail && (
        <PerformerDetailModal
          isOpen={selectedPerformerForDetail !== null}
          onClose={() => setSelectedPerformerForDetail(null)}
          performer={selectedPerformerForDetail}
          videos={allVideos?.length ? allVideos : (playlist || [])}
          onSelectVideo={(v) => {
            if (onSelectVideoInPlaylist) {
              handlePauseOrEnded(false);
              onSelectVideoInPlaylist(v);
            }
          }}
          onToggleFavorite={onTogglePerformerFavorite}
        />
      )}

      {/* Video Download & Cache Progress Modal */}
      {videoFile && (
        <VideoDownloadModal
          file={videoFile}
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          customTitle={video.title}
        />
      )}
    </div>
  );
};
