import React, { useState } from 'react';
import { Film, Play, Search, Plus, Sparkles, Filter, Edit3, Trash2, CheckCircle2, Clock, Video, Star, Key } from 'lucide-react';
import { MovieVideo, FolderItem } from '../types/index.js';
import { getStoredOmdbApiKey } from '../services/omdbService.js';

interface VideosCatalogProps {
  videos: MovieVideo[];
  categories: string[];
  folders: FolderItem[];
  onSelectVideo: (video: MovieVideo) => void;
  onOpenNewModal: () => void;
  onEditVideo?: (video: MovieVideo) => void;
  onDeleteVideo?: (id: string) => void;
  onOpenOmdbKeyModal?: () => void;
}

export const VideosCatalog: React.FC<VideosCatalogProps> = ({
  videos,
  categories,
  onSelectVideo,
  onOpenNewModal,
  onEditVideo,
  onDeleteVideo,
  onOpenOmdbKeyModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'watching' | 'completed'>('all');
  const hasOmdbKey = Boolean(getStoredOmdbApiKey());

  const filteredVideos = videos.filter(video => {
    const matchesSearch =
      (video.titlePt && video.titlePt.toLowerCase().includes(searchQuery.toLowerCase())) ||
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.director && video.director.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.genre && video.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || video.category === selectedCategory;

    let matchesStatus = true;
    if (filterStatus === 'watching') {
      matchesStatus = (video.lastPositionSeconds || 0) > 0 && !video.isCompleted;
    } else if (filterStatus === 'completed') {
      matchesStatus = !!video.isCompleted;
    }

    return matchesSearch && matchesCat && matchesStatus;
  });

  const featuredVideo = videos.find(v => (v.lastPositionSeconds || 0) > 0 && !v.isCompleted) || videos[0];

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-red-800 via-rose-900 to-slate-900 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-red-700/40 shrink-0">
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
                  onClick={() => onSelectVideo(featuredVideo)}
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
                    onClick={() => onSelectVideo(featuredVideo)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-red-900 hover:bg-red-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current text-red-600" />
                    <span>{(featuredVideo.lastPositionSeconds || 0) > 0 ? 'Continuar Assistindo' : 'Assistir Agora'}</span>
                  </button>

                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-950/60 hover:bg-red-900 text-red-100 border border-red-600/50 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Filme / Vídeo</span>
                  </button>

                  {onOpenOmdbKeyModal && (
                    <button
                      onClick={onOpenOmdbKeyModal}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm ${
                        hasOmdbKey 
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40' 
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-transparent shadow-amber-500/20'
                      }`}
                      title="Configurar Chave da API OMDb para puxar capas, notas IMDb e metadados automáticos"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>{hasOmdbKey ? 'Chave OMDb Ativa' : 'Configurar Chave OMDb'}</span>
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
                <button
                  onClick={onOpenNewModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-red-900 hover:bg-red-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-red-600" />
                  <span>Adicionar Filme / Vídeo</span>
                </button>

                {onOpenOmdbKeyModal && (
                  <button
                    onClick={onOpenOmdbKeyModal}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border shadow-sm ${
                      hasOmdbKey 
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40' 
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-transparent shadow-amber-500/20'
                    }`}
                    title="Configurar Chave da API OMDb para puxar capas, notas IMDb e metadados automáticos"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{hasOmdbKey ? 'Chave OMDb Ativa' : 'Configurar Chave OMDb'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
                    onClick={() => onSelectVideo(video)}
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
                    </div>

                    {/* Play Hover Trigger */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <div className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Edit/Delete Overlay Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
                        onClick={() => onSelectVideo(video)}
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
              Adicione filmes ou vídeos vinculando pastas com arquivos .mp4, .mkv do seu Drive.
            </p>
            <button
              onClick={onOpenNewModal}
              className="px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all"
            >
              Adicionar Primeiro Vídeo
            </button>
          </div>
        )}
    </div>
  );
};
