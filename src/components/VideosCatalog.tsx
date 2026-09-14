import React, { useState, useMemo } from 'react';
import { 
  Film, Play, Search, Plus, Sparkles, Filter, Edit3, Trash2, CheckCircle2, 
  Clock, Video, Star, Download, Layers, Shuffle, ArrowLeft, ArrowUp, ArrowDown, ChevronRight,
  ImageIcon, RefreshCw
} from 'lucide-react';
import { MovieVideo, FolderItem, DriveItem, MovieSagaGroup } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { EditSagaCoverModal } from './EditSagaCoverModal.js';

interface VideosCatalogProps {
  videos: MovieVideo[];
  categories: string[];
  folders: FolderItem[];
  allFiles?: DriveItem[];
  sagas?: MovieSagaGroup[];
  onSelectVideo: (video: MovieVideo, playlist?: MovieVideo[], playlistTitle?: string, isShuffle?: boolean) => void;
  onOpenNewModal?: () => void;
  onEditVideo?: (video: MovieVideo) => void;
  onDeleteVideo?: (id: string) => void;
  onUpdateVideo?: (video: MovieVideo) => Promise<void>;
  onUpdateSagaCover?: (sagaName: string, coverUrl: string) => Promise<void | boolean>;
  onSyncRootFolder?: () => Promise<{ importedCount: number; updatedCount: number; totalVideos: number } | void>;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const VideosCatalog: React.FC<VideosCatalogProps> = ({
  videos,
  categories,
  folders,
  allFiles = [],
  sagas,
  onSelectVideo,
  onOpenNewModal,
  onEditVideo,
  onDeleteVideo,
  onUpdateVideo,
  onUpdateSagaCover,
  onSyncRootFolder,
  onShowToast
}) => {
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'watching' | 'completed'>('all');
  const [viewMode, setViewMode] = useState<'movies' | 'sagas'>('movies');
  const [selectedSagaName, setSelectedSagaName] = useState<string | null>(null);
  const [sagaToEditCover, setSagaToEditCover] = useState<MovieSagaGroup | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncRootFolder || isSyncing) return;
    setIsSyncing(true);
    onShowToast?.('⚡ Varrendo pasta Filmes & Cinema e sincronizando com o catálogo...', 'info');
    try {
      const res = await onSyncRootFolder();
      if (res && res.importedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.importedCount} novos filmes importados!`, 'success');
      } else if (res && res.updatedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.updatedCount} filmes atualizados!`, 'success');
      } else {
        onShowToast?.('✅ Catálogo já está 100% atualizado com o Drive!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar pastas de filmes:', err);
      onShowToast?.('Erro ao sincronizar pastas de Filmes & Cinema.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Computed Sagas (Reactive from videos list)
  const computedSagas = useMemo<MovieSagaGroup[]>(() => {
    if (sagas && sagas.length > 0) return sagas;
    const map = new Map<string, MovieVideo[]>();
    for (const v of videos) {
      if (v.saga && v.saga.trim()) {
        const key = v.saga.trim();
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(v);
      }
    }
    const list: MovieSagaGroup[] = [];
    for (const [name, sVideos] of map.entries()) {
      const sorted = [...sVideos].sort((a, b) => {
        if (a.sagaOrder !== undefined && b.sagaOrder !== undefined) return a.sagaOrder - b.sagaOrder;
        if (a.sagaOrder !== undefined) return -1;
        if (b.sagaOrder !== undefined) return 1;
        return (Number(a.year) || 0) - (Number(b.year) || 0);
      });
      list.push({
        name,
        coverImage: sorted[0]?.coverImage,
        movieCount: sorted.length,
        completedCount: sorted.filter(m => m.isCompleted).length,
        totalDurationSeconds: sorted.reduce((acc, m) => acc + (m.durationSeconds || 5400), 0),
        movies: sorted
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [sagas, videos]);

  const activeSaga = useMemo(() => {
    if (!selectedSagaName) return null;
    return computedSagas.find(s => s.name === selectedSagaName) || null;
  }, [computedSagas, selectedSagaName]);

  const formatTotalDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch =
        (video.titlePt && video.titlePt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (video.director && video.director.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (video.genre && video.genre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (video.saga && video.saga.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || video.category === selectedCategory;

      let matchesStatus = true;
      if (filterStatus === 'watching') {
        matchesStatus = (video.lastPositionSeconds || 0) > 0 && !video.isCompleted;
      } else if (filterStatus === 'completed') {
        matchesStatus = !!video.isCompleted;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [videos, searchQuery, selectedCategory, filterStatus]);

  const filteredSagas = useMemo(() => {
    if (!searchQuery.trim()) return computedSagas;
    const q = searchQuery.toLowerCase().trim();
    return computedSagas.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.movies.some(m => m.title.toLowerCase().includes(q) || (m.titlePt && m.titlePt.toLowerCase().includes(q)))
    );
  }, [computedSagas, searchQuery]);

  const featuredVideo = videos.find(v => (v.lastPositionSeconds || 0) > 0 && !v.isCompleted) || videos[0];

  // Marathon action handlers
  const handleStartSequentialMarathon = (sourceList: MovieVideo[], title = 'Maratona Sequencial') => {
    if (sourceList.length === 0) return;
    const firstUnwatched = sourceList.find(v => !v.isCompleted) || sourceList[0];
    onSelectVideo(firstUnwatched, sourceList, title, false);
  };

  const handleStartShuffleMarathon = (sourceList: MovieVideo[], title = 'Maratona Aleatória') => {
    if (sourceList.length === 0) return;
    const randomIdx = Math.floor(Math.random() * sourceList.length);
    onSelectVideo(sourceList[randomIdx], sourceList, title, true);
  };

  // Reordering movies inside a Saga
  const handleMoveSagaMovie = async (movie: MovieVideo, direction: 'up' | 'down') => {
    if (!activeSaga || !onUpdateVideo) return;
    const currentMovies = [...activeSaga.movies];
    const idx = currentMovies.findIndex(m => m.id === movie.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= currentMovies.length) return;

    const targetMovie = currentMovies[targetIdx];
    const currentOrder = movie.sagaOrder ?? (idx + 1);
    const targetOrder = targetMovie.sagaOrder ?? (targetIdx + 1);

    await onUpdateVideo({ ...movie, sagaOrder: targetOrder });
    await onUpdateVideo({ ...targetMovie, sagaOrder: currentOrder });
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-3 sm:p-6 space-y-6">
      {/* Standardized Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-800 via-rose-900 to-slate-900 p-5 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-red-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Film className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {featuredVideo ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1">
              {/* Poster Preview */}
              <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-red-500/40 shrink-0 bg-black/60 group">
                <img
                  src={featuredVideo.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                  alt={featuredVideo.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                />
                <button
                  onClick={() => onSelectVideo(featuredVideo, filteredVideos, 'Cinema & Filmes', false)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50">
                    <Play className="w-5 h-5 ml-1 fill-current" />
                  </div>
                </button>
              </div>

              {/* Video Info */}
              <div className="space-y-2.5 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-md text-red-200 text-xs font-bold uppercase tracking-wider border border-red-500/30">
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  <span>Cinema, Filmes & Vídeos • {videos.length} {videos.length === 1 ? 'Título' : 'Títulos'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight py-1 drop-shadow-sm">
                  {featuredVideo.titlePt || featuredVideo.title}
                </h1>

                {featuredVideo.titlePt && featuredVideo.titlePt !== featuredVideo.title && (
                  <p className="text-xs text-red-200/80 italic font-medium -mt-1">
                    Título Original: <strong>{featuredVideo.title}</strong>
                  </p>
                )}

                {featuredVideo.director && (
                  <p className="text-xs text-red-200 font-medium">
                    Direção: <strong>{featuredVideo.director}</strong>
                  </p>
                )}

                <p className="text-xs text-gray-300 line-clamp-2 max-w-xl leading-relaxed">
                  {featuredVideo.description || 'Assista a este filme ou vídeo diretamente do Telegram Cloud com streaming instantâneo em alta definição.'}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => onSelectVideo(featuredVideo, filteredVideos, 'Cinema & Filmes', false)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-red-900 hover:bg-red-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current text-red-600" />
                    <span>{(featuredVideo.lastPositionSeconds || 0) > 0 ? 'Continuar Assistindo' : 'Assistir Agora'}</span>
                  </button>

                  <button
                    onClick={() => handleStartSequentialMarathon(filteredVideos, 'Maratona de Filmes')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-red-500 text-xs font-bold transition-all shadow-md active:scale-95"
                    title="Assistir catálogo em sequência contínua"
                  >
                    <Play className="w-4 h-4 text-red-400" />
                    <span>Maratona</span>
                  </button>

                  <button
                    onClick={() => handleStartShuffleMarathon(filteredVideos, 'Filmes Aleatórios')}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-amber-500 text-xs font-bold transition-all shadow-md active:scale-95"
                    title="Assistir filmes em ordem aleatória"
                  >
                    <Shuffle className="w-4 h-4 text-amber-400" />
                    <span>Aleatório</span>
                  </button>

                  {(() => {
                    const featuredFile = allFiles?.find(f => f.id === featuredVideo?.fileId);
                    if (!featuredFile) return null;
                    return (
                      <button
                        onClick={() => setDownloadTargetFile(featuredFile)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 text-white border border-white/20 hover:border-red-500 text-xs font-bold transition-all shadow-md active:scale-95"
                        title="Baixar Filme para Cache Local"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Filme</span>
                      </button>
                    );
                  })()}

                  {onSyncRootFolder && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600/30 hover:bg-red-600/50 border border-red-400/40 text-red-100 hover:text-white text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-black/10"
                      title="Escanear e sincronizar pastas da biblioteca Filmes & Cinema automaticamente"
                    >
                      <RefreshCw className={`w-4 h-4 text-red-200 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 backdrop-blur-md text-red-200 text-xs font-bold uppercase tracking-wider border border-red-500/30">
                <Film className="w-3.5 h-3.5 text-red-400" />
                <span>Cinema, Filmes & Vídeos</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
                Filmes & Vídeos
              </h1>

              <p className="text-xs sm:text-sm text-red-200/80 leading-relaxed">
                Assista aos seus filmes, documentários e vídeos com streaming em alta definição e reprodução contínua.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                {onSyncRootFolder && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-red-900 hover:bg-red-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Escanear e sincronizar pastas da biblioteca Filmes & Cinema automaticamente"
                  >
                    <RefreshCw className={`w-4 h-4 text-red-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Switcher Tabs & Global Marathon Controls (Only when not in Saga Detail) */}
      {!activeSaga && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-2xl shadow-sm self-start">
            <button
              onClick={() => setViewMode('movies')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'movies'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Todos os Filmes ({videos.length})</span>
            </button>

            <button
              onClick={() => setViewMode('sagas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'sagas'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sagas & Franquias ({computedSagas.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleStartSequentialMarathon(filteredVideos, 'Maratona Contínua')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-red-500 text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm active:scale-95"
              title="Assistir filmes listados em sequência contínua"
            >
              <Play className="w-3.5 h-3.5 text-red-500 fill-current" />
              <span>Maratona Contínua</span>
            </button>
            <button
              onClick={() => handleStartShuffleMarathon(filteredVideos, 'Maratona Aleatória')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-red-500 text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm active:scale-95"
              title="Assistir filmes em ordem aleatória contínua"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-500" />
              <span>Modo Aleatório</span>
            </button>
          </div>
        </div>
      )}

      {/* When a Saga is selected: Saga Detail View */}
      {activeSaga ? (
        <div className="space-y-6">
          {/* Breadcrumb / Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSagaName(null)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-xs font-bold hover:text-red-500 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Sagas & Franquias</span>
            </button>

            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Saga #{computedSagas.findIndex(s => s.name === activeSaga.name) + 1} de {computedSagas.length}
            </span>
          </div>

          {/* Saga Hero Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-red-500/30 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Stacked or Single Poster */}
              <div className="relative w-28 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-red-500/40 bg-black/60 shrink-0 group">
                <img
                  src={activeSaga.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                  alt={activeSaga.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => setSagaToEditCover(activeSaga)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white gap-1.5 transition-opacity"
                  title="Alterar Capa da Saga"
                >
                  <div className="p-2 rounded-full bg-red-600 shadow-lg">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold">Alterar Capa</span>
                </button>
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[11px] font-bold uppercase tracking-wider border border-red-500/30">
                  <Layers className="w-3 h-3 text-red-400" />
                  <span>Franquia Cinematográfica</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {activeSaga.name}
                </h2>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Film className="w-4 h-4 text-red-400" />
                    {activeSaga.movieCount} {activeSaga.movieCount === 1 ? 'filme' : 'filmes'}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <Clock className="w-4 h-4 text-amber-400" />
                    {formatTotalDuration(activeSaga.totalDurationSeconds)} no total
                  </span>
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {activeSaga.completedCount} de {activeSaga.movieCount} assistidos
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md pt-1">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((activeSaga.completedCount / Math.max(1, activeSaga.movieCount)) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">
                    {Math.round((activeSaga.completedCount / Math.max(1, activeSaga.movieCount)) * 100)}% da saga concluída
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => handleStartSequentialMarathon(activeSaga.movies, activeSaga.name)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Assistir Saga em Sequência</span>
                  </button>

                  <button
                    onClick={() => handleStartShuffleMarathon(activeSaga.movies, `${activeSaga.name} (Aleatório)`)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all active:scale-95"
                  >
                    <Shuffle className="w-4 h-4 text-amber-300" />
                    <span>Maratona Aleatória</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSagaToEditCover(activeSaga)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all active:scale-95"
                    title="Alterar Capa da Franquia"
                  >
                    <ImageIcon className="w-4 h-4 text-rose-300" />
                    <span>Alterar Capa</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chronological Movies List in the Saga */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Film className="w-4 h-4 text-red-500" />
              <span>Ordem Cronológica da Franquia ({activeSaga.movies.length})</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {activeSaga.movies.map((movie, idx) => {
                const isWatched = movie.isCompleted;
                const hasProgress = (movie.lastPositionSeconds || 0) > 0 && !isWatched;
                const sagaNumber = movie.sagaOrder ?? (idx + 1);

                return (
                  <div
                    key={movie.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3.5 bg-white dark:bg-drive-darkSurface rounded-2xl border border-gray-200 dark:border-drive-darkBorder hover:border-red-500/40 shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Order Number Badge */}
                      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-sm shrink-0 border border-red-500/20">
                        #{sagaNumber}
                      </div>

                      {/* Poster Thumbnail */}
                      <div
                        onClick={() => onSelectVideo(movie, activeSaga.movies, activeSaga.name, false)}
                        className="relative w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden bg-black/60 cursor-pointer shrink-0 shadow"
                      >
                        <img
                          src={movie.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Play className="w-5 h-5 text-white fill-current" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-0.5">
                          {movie.year && <span>{movie.year}</span>}
                          {movie.duration && <span>• {movie.duration}</span>}
                          {movie.genre && <span>• {movie.genre}</span>}
                          {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold ml-1">
                              <Star className="w-3 h-3 fill-current" />
                              {movie.imdbRating}
                            </span>
                          )}
                        </div>

                        <h4
                          onClick={() => onSelectVideo(movie, activeSaga.movies, activeSaga.name, false)}
                          className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate hover:text-red-500 cursor-pointer transition-colors"
                        >
                          {movie.titlePt || movie.title}
                        </h4>

                        {movie.titlePt && movie.titlePt !== movie.title && (
                          <p className="text-xs text-gray-400 italic truncate -mt-0.5">
                            Original: {movie.title}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center gap-2">
                          {isWatched ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Assistido
                            </span>
                          ) : hasProgress ? (
                            <span className="text-[11px] text-amber-500 font-bold">
                              Em andamento
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Não assistido
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Order adjustment & actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
                      {/* Move Up / Down Buttons */}
                      <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-0.5">
                        <button
                          onClick={() => handleMoveSagaMovie(movie, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                          title="Mover para cima na ordem da saga"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSagaMovie(movie, 'down')}
                          disabled={idx === activeSaga.movies.length - 1}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                          title="Mover para baixo na ordem da saga"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Play Button */}
                      <button
                        onClick={() => onSelectVideo(movie, activeSaga.movies, activeSaga.name, false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Assistir</span>
                      </button>

                      {/* Edit Button */}
                      {onEditVideo && (
                        <button
                          onClick={() => onEditVideo(movie)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          title="Editar Filme"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : viewMode === 'sagas' ? (
        /* Sagas Grid View */
        <div className="space-y-4">
          {/* Saga Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar saga, franquia ou título de filme..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-red-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0 font-medium">
              {filteredSagas.length} {filteredSagas.length === 1 ? 'franquia' : 'franquias'}
            </span>
          </div>

          {filteredSagas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSagas.map(saga => {
                const percent = Math.round((saga.completedCount / Math.max(1, saga.movieCount)) * 100);
                const chosenCover = saga.coverImage || saga.movies[0]?.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60';
                
                // Other movies to flank the chosen cover in the 3D card presentation
                const otherMovies = saga.movies.filter(m => m.coverImage && m.coverImage !== chosenCover);
                const pool = otherMovies.length > 0 ? otherMovies : saga.movies;
                const leftMovie = (pool.length > 1 || otherMovies.length > 0) ? pool[0] : null;
                const rightMovie = pool.length > 1 ? pool[1] : null;

                return (
                  <div
                    key={saga.name}
                    className="flex flex-col bg-white dark:bg-drive-darkSurface rounded-2xl border border-gray-200 dark:border-drive-darkBorder hover:border-red-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    {/* Header Image / Movie Stack */}
                    <div
                      onClick={() => setSelectedSagaName(saga.name)}
                      className="relative h-48 bg-slate-950 cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                      {/* Ambient background glow from chosen cover */}
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-25 blur-md scale-110 pointer-events-none transition-all duration-500"
                        style={{
                          backgroundImage: `url(${chosenCover})`
                        }}
                      />

                      {/* Poster collage */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 p-3 opacity-95 group-hover:scale-105 transition-transform duration-500">
                        {leftMovie && (
                          <div className="relative aspect-[2/3] h-36 rounded-lg overflow-hidden shadow-xl border border-white/10 opacity-70 scale-95 transition-all">
                            <img
                              src={leftMovie.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                              alt={leftMovie.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Center Spotlight: The Chosen Cover */}
                        <div className="relative aspect-[2/3] h-40 rounded-lg overflow-hidden shadow-2xl border-2 border-red-500/80 z-10 scale-105 ring-2 ring-red-500/50 transition-all">
                          <img
                            src={chosenCover}
                            alt={saga.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {rightMovie && (
                          <div className="relative aspect-[2/3] h-36 rounded-lg overflow-hidden shadow-xl border border-white/10 opacity-70 scale-95 transition-all">
                            <img
                              src={rightMovie.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                              alt={rightMovie.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

                      {/* Top Badges & Edit Cover Action */}
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-none">
                        <div className="flex items-center gap-1.5 pointer-events-auto">
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-600/90 text-white text-[10px] font-black uppercase shadow backdrop-blur-sm">
                            {saga.movieCount} Filmes
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-black/60 text-gray-200 text-[10px] font-bold backdrop-blur-sm">
                            {formatTotalDuration(saga.totalDurationSeconds)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSagaToEditCover(saga);
                          }}
                          className="pointer-events-auto p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white shadow backdrop-blur-sm transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                          title="Alterar Capa da Saga"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => setSelectedSagaName(saga.name)}
                          className="font-black text-sm sm:text-base text-gray-900 dark:text-gray-100 hover:text-red-500 cursor-pointer transition-colors truncate"
                          title={saga.name}
                        >
                          {saga.name}
                        </h3>

                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {saga.movies.map(m => m.titlePt || m.title).join(' • ')}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-gray-500">Progresso</span>
                          <span className={percent === 100 ? 'text-emerald-500' : 'text-gray-700 dark:text-gray-300'}>
                            {saga.completedCount}/{saga.movieCount} assistidos ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => handleStartSequentialMarathon(saga.movies, saga.name)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                          title="Assistir do primeiro filme não assistido em sequência"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Maratona</span>
                        </button>

                        <button
                          onClick={() => handleStartShuffleMarathon(saga.movies, `${saga.name} (Aleatório)`)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          title="Modo Aleatório"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSagaToEditCover(saga)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          title="Alterar Capa da Saga"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedSagaName(saga.name)}
                          className="flex items-center gap-1 py-2 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
                        >
                          <span>Ver</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base">Nenhuma saga ou franquia cadastrada</h3>
              <p className="text-xs text-gray-500 max-w-md">
                Para agrupar filmes em uma franquia contínua (ex: Harry Potter, Star Wars, Matrix), edite um filme existente e preencha o campo <strong>"Saga / Franquia"</strong>.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Regular Movies Catalog */
        <>
          {/* Filter & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar filme, diretor, gênero..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-red-500 focus:outline-none"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl text-[11px] font-bold shrink-0">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('watching')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'watching' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500'}`}
              >
                Assistindo
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'completed' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500'}`}
              >
                Assistidos
              </button>
            </div>
          </div>

          {/* Video Grid */}
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredVideos.map(video => {
                const isWatched = video.isCompleted;
                const hasProgress = (video.lastPositionSeconds || 0) > 0 && !isWatched;

                return (
                  <div
                    key={video.id}
                    className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-red-500/50 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Poster Thumbnail */}
                    <div
                      onClick={() => onSelectVideo(video, filteredVideos, selectedCategory === 'all' ? 'Todos os Filmes' : selectedCategory, false)}
                      className="relative aspect-[2/3] w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                    >
                      <img
                        src={video.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                        alt={video.title}
                        draggable={false}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-red-600/90 text-white text-[9px] font-black uppercase shadow">
                          {video.category || 'Filme'}
                        </span>
                        {video.imdbRating && video.imdbRating !== 'N/A' && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black shadow backdrop-blur-sm w-fit">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <span>{video.imdbRating}</span>
                          </span>
                        )}
                        {video.saga && (
                          <span className="px-1.5 py-0.5 rounded-md bg-black/70 text-gray-200 text-[9px] font-bold shadow backdrop-blur-sm w-fit truncate max-w-[110px]">
                            {video.saga} {video.sagaOrder !== undefined ? `#${video.sagaOrder}` : ''}
                          </span>
                        )}
                      </div>

                      {/* Play Hover Trigger */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                        <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                      </div>

                      {/* Edit/Delete Overlay Actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {(() => {
                          const videoFile = allFiles?.find(f => f.id === video.fileId);
                          if (!videoFile) return null;
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDownloadTargetFile(videoFile);
                              }}
                              className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white shadow transition-colors"
                              title="Baixar Filme para Cache Local"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          );
                        })()}

                        {onEditVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditVideo(video);
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white shadow transition-colors"
                            title="Editar Filme"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Excluir o filme "${video.title}"?`)) {
                                onDeleteVideo(video.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Card Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                          {video.year && <span>{video.year}</span>}
                          {video.duration && <span>{video.duration}</span>}
                        </div>
                        <h3
                          onClick={() => onSelectVideo(video, filteredVideos, selectedCategory === 'all' ? 'Todos os Filmes' : selectedCategory, false)}
                          className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-red-500 cursor-pointer transition-colors"
                          title={video.titlePt ? `${video.titlePt} (${video.title})` : video.title}
                        >
                          {video.titlePt || video.title}
                        </h3>
                        {video.titlePt && video.titlePt !== video.title && (
                          <p className="text-[10px] text-gray-400 italic truncate -mt-0.5" title={`Original: ${video.title}`}>
                            {video.title}
                          </p>
                        )}
                        {video.genre && (
                          <p className="text-[10px] text-gray-400 truncate">{video.genre}</p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-[10px]">
                        {isWatched ? (
                          <span className="flex items-center gap-1 text-emerald-500 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Assistido</span>
                          </span>
                        ) : hasProgress ? (
                          <span className="text-amber-500 font-bold">
                            Continuar
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono">
                            Disponível
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
              <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base">Nenhum filme ou vídeo encontrado</h3>
              <p className="text-xs text-gray-500 max-w-md">
                Conecte pastas de filmes ou vídeos no seu Drive e sincronize com a biblioteca.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {onSyncRootFolder && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}

      {sagaToEditCover && (
        <EditSagaCoverModal
          isOpen={!!sagaToEditCover}
          onClose={() => setSagaToEditCover(null)}
          saga={sagaToEditCover}
          onSaveCover={async (sagaName, coverUrl) => {
            if (onUpdateSagaCover) {
              await onUpdateSagaCover(sagaName, coverUrl);
            }
          }}
        />
      )}
    </div>
  );
};
