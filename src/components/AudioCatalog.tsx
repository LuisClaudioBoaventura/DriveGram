import React, { useState } from 'react';
import { Headphones, Play, Search, Plus, Sparkles, Filter, Edit3, Trash2, CheckCircle2, Music2, Mic, Disc } from 'lucide-react';
import { AudioShow, FolderItem } from '../types/index.js';

interface AudioCatalogProps {
  audioShows: AudioShow[];
  categories: string[];
  folders: FolderItem[];
  onSelectShow: (show: AudioShow) => void;
  onOpenNewModal: () => void;
  onEditShow?: (show: AudioShow) => void;
  onDeleteShow?: (id: string) => void;
}

export const AudioCatalog: React.FC<AudioCatalogProps> = ({
  audioShows,
  categories,
  onSelectShow,
  onOpenNewModal,
  onEditShow,
  onDeleteShow
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'music_album' | 'podcast' | 'playlist'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredShows = audioShows.filter(show => {
    const matchesSearch = show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (show.artist && show.artist.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (show.host && show.host.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (show.genre && show.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || show.showType === selectedType;
    const matchesCat = selectedCategory === 'all' || show.category === selectedCategory;

    return matchesSearch && matchesType && matchesCat;
  });

  const totalShows = audioShows.length;
  const totalTracks = audioShows.reduce((acc, s) => acc + (s.tracks?.length || 0), 0);
  const totalAlbums = audioShows.filter(s => s.showType === 'music_album').length;
  const totalPodcasts = audioShows.filter(s => s.showType === 'podcast').length;

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-emerald-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Headphones className="w-80 h-80" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-emerald-200 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Headphones className="w-3.5 h-3.5 text-emerald-400" />
            <span>Músicas, Álbuns & Podcasts</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            Músicas & Podcasts
          </h1>

          <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            Ouça suas músicas, discografias completas e podcasts favoritos com reprodutor de áudio dedicado e playlists sincronizadas na nuvem Telegram.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Adicionar Álbum / Podcast</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Disc className="w-4 h-4 text-emerald-300 mb-1" />
            <span className="text-base font-black">{totalShows}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Coleções</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Music2 className="w-4 h-4 text-teal-300 mb-1" />
            <span className="text-base font-black">{totalTracks}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Faixas</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Disc className="w-4 h-4 text-sky-300 mb-1" />
            <span className="text-base font-black">{totalAlbums}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Álbuns</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Mic className="w-4 h-4 text-purple-300 mb-1" />
            <span className="text-base font-black">{totalPodcasts}</span>
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">Podcasts</span>
          </div>
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
              placeholder="Buscar por álbum, artista, podcast..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Type Selector (Álbuns / Podcasts / Playlists) */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-0.5 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setSelectedType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'all' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
            >
              <span>Todos</span>
            </button>
            <button
              onClick={() => setSelectedType('music_album')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'music_album' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
            >
              <Disc className="w-3.5 h-3.5" />
              <span>Álbuns</span>
            </button>
            <button
              onClick={() => setSelectedType('podcast')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'podcast' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Podcasts</span>
            </button>
            <button
              onClick={() => setSelectedType('playlist')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${selectedType === 'playlist' ? 'bg-white dark:bg-drive-darkSurface text-emerald-500 shadow-sm' : 'text-gray-500'}`}
            >
              <Music2 className="w-3.5 h-3.5" />
              <span>Playlists</span>
            </button>
          </div>
        </div>

        {/* Shows Grid (1:1 Square Album/Podcast Cards) */}
        {filteredShows.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredShows.map(show => {
              const tracksCount = show.tracks?.length || 0;
              const completedCount = (show.tracks || []).filter(t => t.isCompleted).length;

              return (
                <div
                  key={show.id}
                  className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300"
                >
                  {/* Square Cover Art */}
                  <div
                    onClick={() => onSelectShow(show)}
                    className="relative aspect-square w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                  >
                    <img
                      src={show.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                      alt={show.title}
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600/90 text-white text-[9px] font-black uppercase shadow">
                        {show.showType === 'podcast' ? 'Podcast' : show.showType === 'playlist' ? 'Playlist' : 'Álbum'}
                      </span>
                    </div>

                    {/* Play Hover Trigger */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/50">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Edit/Delete Overlay Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {onEditShow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditShow(show);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-emerald-600 text-white shadow transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteShow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir "${show.title}"?`)) {
                              onDeleteShow(show.id);
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

                  {/* Info Body */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <div>
                      <h3
                        onClick={() => onSelectShow(show)}
                        className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-emerald-500 cursor-pointer transition-colors"
                        title={show.title}
                      >
                        {show.title}
                      </h3>
                      {(show.artist || show.host) && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {show.artist || show.host}
                        </p>
                      )}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
                      <span>{tracksCount} {tracksCount === 1 ? 'faixa' : 'faixas'}</span>
                      {completedCount > 0 && (
                        <span className="text-emerald-500 font-bold">
                          {completedCount}/{tracksCount} ouvidos
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
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Headphones className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base">Nenhum álbum ou podcast catalogado</h3>
            <p className="text-xs text-gray-500 max-w-md">
              Vincule pastas de áudio (.mp3, .wav, .flac) do seu Drive para criar sua biblioteca de músicas e podcasts.
            </p>
            <button
              onClick={onOpenNewModal}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all"
            >
              Adicionar Primeiro Álbum / Podcast
            </button>
          </div>
        )}
    </div>
  );
};
