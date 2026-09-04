import React, { useState } from 'react';
import { 
  Video, 
  Play, 
  Search, 
  Plus, 
  Sparkles, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Star,
  Heart,
  Tag,
  RotateCcw,
  Download
} from 'lucide-react';
import { PersonalVideo, FolderItem, DriveItem } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';

interface PersonalVideosCatalogProps {
  videos: PersonalVideo[];
  categories: string[];
  folders: FolderItem[];
  allFiles?: DriveItem[];
  onSelectVideo: (video: PersonalVideo) => void;
  onOpenNewModal: () => void;
  onEditVideo?: (video: PersonalVideo) => void;
  onDeleteVideo?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export const PersonalVideosCatalog: React.FC<PersonalVideosCatalogProps> = ({
  videos,
  categories,
  folders,
  allFiles = [],
  onSelectVideo,
  onOpenNewModal,
  onEditVideo,
  onDeleteVideo,
  onToggleFavorite
}) => {
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'favorites' | 'watching' | 'completed'>('all');

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCategory !== 'all' || filterStatus !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setFilterStatus('all');
  };

  const filteredVideos = videos.filter(video => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        video.title.toLowerCase().includes(q) ||
        (video.description && video.description.toLowerCase().includes(q)) ||
        (video.location && video.location.toLowerCase().includes(q)) ||
        (video.people && video.people.toLowerCase().includes(q)) ||
        (video.category && video.category.toLowerCase().includes(q)) ||
        (video.tags && video.tags.some(t => t.toLowerCase().includes(q)));

      if (!matchSearch) return false;
    }

    // 2. Category Filter
    if (selectedCategory !== 'all' && video.category !== selectedCategory) {
      return false;
    }

    // 3. Status Filter
    if (filterStatus === 'favorites' && !video.isFavorite) {
      return false;
    }
    if (filterStatus === 'completed' && !video.isCompleted) {
      return false;
    }
    if (filterStatus === 'watching' && (!((video.lastPositionSeconds || 0) > 0) || video.isCompleted)) {
      return false;
    }

    return true;
  });

  const totalVideos = videos.length;
  const favoritesCount = videos.filter(v => v.isFavorite).length;
  const inProgressCount = videos.filter(v => (v.lastPositionSeconds || 0) > 0 && !v.isCompleted).length;
  const completedCount = videos.filter(v => !!v.isCompleted).length;

  const featuredVideo = 
    videos.find(v => (v.lastPositionSeconds || 0) > 0 && !v.isCompleted) || 
    videos.find(v => v.isFavorite) || 
    videos[0];

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-3 sm:p-6 space-y-6">
      {/* Standardized Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-800 via-orange-900 to-slate-900 p-5 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-amber-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Video className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {featuredVideo ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1">
              {/* Poster Preview */}
              <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40 shrink-0 bg-black/60 group">
                <img
                  src={featuredVideo.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                  alt={featuredVideo.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                />
                <button
                  onClick={() => onSelectVideo(featuredVideo)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/50">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </button>
              </div>

              {/* Video Info */}
              <div className="space-y-2.5 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-200 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                  <Video className="w-3.5 h-3.5 text-amber-400" />
                  <span>Vídeos & Mídias Pessoais • {videos.length} {videos.length === 1 ? 'Momento' : 'Momentos'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight py-1 drop-shadow-sm">
                  {featuredVideo.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-amber-200/90 font-medium">
                  {featuredVideo.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{featuredVideo.date}</span>
                    </span>
                  )}
                  {featuredVideo.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>{featuredVideo.location}</span>
                    </span>
                  )}
                  {featuredVideo.people && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{featuredVideo.people}</span>
                    </span>
                  )}
                  {featuredVideo.category && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-200 text-[10px] font-bold">
                      {featuredVideo.category}
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-300 line-clamp-2 max-w-xl leading-relaxed">
                  {featuredVideo.description || 'Reviva viagens, reuniões familiares, aniversários, vlogs e registros especiais salvos no seu Drive.'}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => onSelectVideo(featuredVideo)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current text-amber-600" />
                    <span>{(featuredVideo.lastPositionSeconds || 0) > 0 ? 'Continuar Assistindo' : 'Assistir Agora'}</span>
                  </button>

                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-950/60 hover:bg-amber-900 text-amber-100 border border-amber-600/50 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Vídeo Pessoal</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-200 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                <Video className="w-3.5 h-3.5 text-amber-400" />
                <span>Vídeos & Mídias Pessoais</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
                Memórias & Gravações Pessoais
              </h1>

              <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
                Reviva viagens, reuniões familiares, aniversários, vlogs e registros especiais salvos na sua nuvem do Telegram com streaming instantâneo.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenNewModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Novo Vídeo Pessoal</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full lg:w-auto z-10">
            <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
              <Video className="w-4 h-4 text-amber-300 mb-1" />
              <span className="text-base font-black">{totalVideos}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold">Momentos</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
              <Heart className="w-4 h-4 text-rose-300 mb-1 fill-current" />
              <span className="text-base font-black">{favoritesCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold">Favoritos</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
              <Clock className="w-4 h-4 text-amber-400 mb-1" />
              <span className="text-base font-black">{inProgressCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold">Assistindo</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-1" />
              <span className="text-base font-black">{completedCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold">Assistidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Standardized Primary Filters & Search Bar */}
      <div className="space-y-3 pb-2 border-b border-gray-200 dark:border-drive-darkBorder">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              Todos ({videos.length})
            </button>

            <button
              onClick={() => setFilterStatus('favorites')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'favorites'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filterStatus === 'favorites' ? 'fill-current' : 'text-rose-500'}`} />
              <span>Favoritos ({favoritesCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('watching')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'watching'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Assistindo ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterStatus === 'completed'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Assistidos ({completedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, local, pessoas ou tags..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Secondary Category Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-black text-white border border-gray-800 px-2.5 py-1 rounded-xl text-xs shadow-sm">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-black text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
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
                  className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500/50 hover:shadow-xl transition-all duration-300"
                >
                  {/* Poster Thumbnail */}
                  <div
                    onClick={() => onSelectVideo(video)}
                    className="relative aspect-[2/3] w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                  >
                    <img
                      src={video.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                      alt={video.title}
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase shadow">
                        {video.category || 'Pessoal'}
                      </span>
                    </div>

                    {/* Favorite Button */}
                    {onToggleFavorite && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(video.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all ${
                          video.isFavorite
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                            : 'bg-black/60 text-white opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-rose-600'
                        }`}
                        title={video.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                      >
                        <Heart className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    {/* Play Hover Trigger */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <div className="w-11 h-11 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/50">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Edit/Delete Overlay Actions */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {(() => {
                        const targetFile = allFiles?.find(f => f.id === video.fileId);
                        if (!targetFile) return null;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDownloadTargetFile(targetFile);
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                            title="Baixar Vídeo para Cache Local"
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
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteVideo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir o vídeo "${video.title}"?`)) {
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
                        {video.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{video.date}</span>
                          </span>
                        )}
                        {video.duration && <span>{video.duration}</span>}
                      </div>

                      <h3
                        onClick={() => onSelectVideo(video)}
                        className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-amber-500 cursor-pointer transition-colors"
                        title={video.title}
                      >
                        {video.title}
                      </h3>

                      {video.location && (
                        <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>{video.location}</span>
                        </p>
                      )}

                      {video.people && (
                        <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <User className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                          <span>{video.people}</span>
                        </p>
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
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Nenhum vídeo pessoal catalogado
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Nenhum vídeo corresponde aos filtros selecionados.'
                  : 'Vincule uma pasta de vídeos pessoais no Drive para organizar suas memórias.'}
              </p>
            </div>
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Catalogar Primeiro Vídeo Pessoal</span>
            </button>
          </div>
        )}
      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}
    </div>
  );
};
