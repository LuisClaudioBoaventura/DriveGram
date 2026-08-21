import React, { useState } from 'react';
import { Tv, Play, Search, Plus, Sparkles, Filter, Edit3, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { SeriesShow, FolderItem } from '../types/index.js';

interface SeriesCatalogProps {
  seriesList: SeriesShow[];
  categories: string[];
  folders: FolderItem[];
  onSelectSeries: (series: SeriesShow) => void;
  onOpenNewModal: () => void;
  onEditSeries?: (series: SeriesShow) => void;
  onDeleteSeries?: (id: string) => void;
}

export const SeriesCatalog: React.FC<SeriesCatalogProps> = ({
  seriesList,
  categories,
  onSelectSeries,
  onOpenNewModal,
  onEditSeries,
  onDeleteSeries
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'watching' | 'completed' | 'plan_to_watch'>('all');

  const filteredSeries = seriesList.filter(series => {
    const matchesSearch = series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (series.network && series.network.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (series.genre && series.genre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'all' || series.category === selectedCategory;
    const matchesStatus = filterStatus === 'all' || series.status === filterStatus;

    return matchesSearch && matchesCat && matchesStatus;
  });

  const featuredSeries = seriesList.find(s => s.status === 'watching') || seriesList[0];

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-purple-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Tv className="w-80 h-80" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {featuredSeries ? (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1">
              {/* Poster Preview */}
              <div className="relative w-36 sm:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/40 shrink-0 bg-black/60 group">
                <img
                  src={featuredSeries.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60'}
                  alt={featuredSeries.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                />
                <button
                  onClick={() => onSelectSeries(featuredSeries)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50">
                    <Play className="w-5 h-5 ml-1 fill-current" />
                  </div>
                </button>
              </div>

              {/* Series Info */}
              <div className="space-y-2.5 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>TV Shows, Séries & Animes • {seriesList.length} {seriesList.length === 1 ? 'Título' : 'Títulos'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight py-1 drop-shadow-sm">
                  {featuredSeries.title}
                </h1>

                {featuredSeries.network && (
                  <p className="text-xs text-purple-200 font-medium">
                    Plataforma / Emissora: <strong>{featuredSeries.network}</strong>
                  </p>
                )}

                <p className="text-xs text-gray-300 line-clamp-2 max-w-xl leading-relaxed">
                  {featuredSeries.description || 'Assista a episódios e temporadas completas organizadas no seu espaço com streaming fluido.'}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => onSelectSeries(featuredSeries)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current text-purple-600" />
                    <span>Abrir Temporadas & Episódios</span>
                  </button>

                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-950/60 hover:bg-purple-900 text-purple-100 border border-purple-600/50 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar Série / Anime</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                <Tv className="w-3.5 h-3.5 text-purple-400" />
                <span>TV Shows, Séries & Animes</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight drop-shadow-sm">
                Séries & Animes
              </h1>

              <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">
                Acompanhe temporadas e episódios organizados no seu espaço com streaming fluido e progresso de episódios.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenNewModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-purple-600" />
                  <span>Adicionar Série / Anime</span>
                </button>
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
              placeholder="Buscar série, anime, emissora..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
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
                    ? 'bg-purple-600 text-white shadow-md'
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
              className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('watching')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'watching' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500'}`}
            >
              Assistindo
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${filterStatus === 'completed' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500'}`}
            >
              Concluídas
            </button>
          </div>
        </div>

        {/* Series Grid */}
        {filteredSeries.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredSeries.map(series => {
              const allEpisodes = (series.seasons || []).flatMap(s => s.episodes || []);
              const completedEpisodes = allEpisodes.filter(e => e.isCompleted).length;
              const totalEpisodes = allEpisodes.length;
              const progressPct = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;
              const totalSeasons = (series.seasons || []).length;

              return (
                <div
                  key={series.id}
                  className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-purple-500/50 hover:shadow-xl transition-all duration-300"
                >
                  {/* Poster */}
                  <div
                    onClick={() => onSelectSeries(series)}
                    className="relative aspect-[2/3] w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                  >
                    <img
                      src={series.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60'}
                      alt={series.title}
                      draggable={false}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    />

                    {/* Category badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      <span className="px-2 py-0.5 rounded-md bg-purple-600/90 text-white text-[9px] font-black uppercase shadow">
                        {series.category || 'Série'}
                      </span>
                    </div>

                    {/* Play Hover Trigger */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                      <div className="w-11 h-11 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/50">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                    </div>

                    {/* Edit/Delete Overlay Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {onEditSeries && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditSeries(series);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-purple-600 text-white shadow transition-colors"
                          title="Editar Série"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteSeries && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Excluir a série "${series.title}"?`)) {
                              onDeleteSeries(series.id);
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
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>{totalSeasons} {totalSeasons === 1 ? 'temporada' : 'temporadas'}</span>
                        {totalEpisodes > 0 && <span>{totalEpisodes} eps</span>}
                      </div>
                      <h3
                        onClick={() => onSelectSeries(series)}
                        className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-purple-500 cursor-pointer transition-colors"
                        title={series.title}
                      >
                        {series.title}
                      </h3>
                      {series.network && (
                        <p className="text-[10px] text-gray-400 truncate">{series.network}</p>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-1 space-y-1 border-t border-gray-100 dark:border-gray-800">
                      <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-gray-400">
                        <span>{completedEpisodes}/{totalEpisodes} assistidos</span>
                        <span className="font-mono">{progressPct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Tv className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-base">Nenhuma série ou anime catalogado</h3>
            <p className="text-xs text-gray-500 max-w-md">
              Organize temporadas e episódios conectando pastas com vídeos do seu Drive.
            </p>
            <button
              onClick={onOpenNewModal}
              className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
            >
              Adicionar Primeira Série
            </button>
          </div>
        )}
    </div>
  );
};
