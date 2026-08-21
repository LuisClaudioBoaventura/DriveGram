import React, { useState } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Search, 
  Plus, 
  Layers, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  Tag, 
  RotateCcw,
  Zap,
  Flame,
  Bookmark
} from 'lucide-react';
import { ComicBook } from '../types/index.js';

interface ComicsCatalogProps {
  comics: ComicBook[];
  onSelectComic: (comic: ComicBook) => void;
  onNewComic: () => void;
  onDeleteComic: (comicId: string) => void;
  onEditComic?: (comic: ComicBook) => void;
  categories?: string[];
}

export const ComicsCatalog: React.FC<ComicsCatalogProps> = ({
  comics,
  onSelectComic,
  onNewComic,
  onDeleteComic,
  onEditComic,
  categories = []
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'reading' | 'completed'>('all');
  const [selectedPublisher, setSelectedPublisher] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique publishers from comics
  const publishers = Array.from(new Set(comics.map(c => c.publisher).filter(Boolean))) as string[];

  // Quick stats
  const totalComics = comics.length;
  const totalIssues = comics.reduce((acc, c) => acc + (c.issues?.length || 0), 0);
  const readingCount = comics.filter(c => {
    const total = c.issues?.length || 0;
    const completed = c.issues?.filter(i => i.isCompleted).length || 0;
    return total > 0 && completed < total;
  }).length;
  const completedCount = comics.filter(c => {
    const total = c.issues?.length || 0;
    const completed = c.issues?.filter(i => i.isCompleted).length || 0;
    return total > 0 && completed === total;
  }).length;

  const hasActiveFilters = selectedPublisher !== 'all' || selectedCategory !== 'all' || searchQuery.trim() !== '' || filterStatus !== 'all';

  const handleClearFilters = () => {
    setFilterStatus('all');
    setSelectedPublisher('all');
    setSelectedCategory('all');
    setSearchQuery('');
  };

  const filteredComics = comics.filter(comic => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        comic.title.toLowerCase().includes(q) ||
        (comic.publisher && comic.publisher.toLowerCase().includes(q)) ||
        (comic.author && comic.author.toLowerCase().includes(q)) ||
        (comic.artist && comic.artist.toLowerCase().includes(q)) ||
        (comic.category && comic.category.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Status filter
    const total = comic.issues?.length || 0;
    const completed = comic.issues?.filter(i => i.isCompleted).length || 0;
    if (filterStatus === 'reading' && (total === 0 || completed === total)) return false;
    if (filterStatus === 'completed' && (total === 0 || completed < total)) return false;

    // 3. Publisher filter
    if (selectedPublisher !== 'all' && comic.publisher !== selectedPublisher) return false;

    // 4. Category filter
    if (selectedCategory !== 'all' && comic.category !== selectedCategory) return false;

    return true;
  });

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-pink-700 via-rose-700 to-purple-800 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-pink-600/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <Sparkles className="w-80 h-80" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-pink-100 text-xs font-bold uppercase tracking-wider border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Biblioteca de Quadrinhos & Mangás</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            HQs, Mangás & Graphic Novels
          </h1>

          <p className="text-xs sm:text-sm text-pink-100/90 leading-relaxed">
            Sua coleção completa de quadrinhos em CBR, CBZ e PDF organizada com leitura imersiva e acompanhamento de progresso.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNewComic}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-pink-900 hover:bg-pink-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-pink-600" />
              <span>Nova HQ / Mangá</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <BookOpen className="w-4 h-4 text-pink-300 mb-1" />
            <span className="text-base font-black">{totalComics}</span>
            <span className="text-[10px] text-pink-200 uppercase font-semibold">HQs / Obras</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Layers className="w-4 h-4 text-rose-300 mb-1" />
            <span className="text-base font-black">{totalIssues}</span>
            <span className="text-[10px] text-pink-200 uppercase font-semibold">Edições</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <Flame className="w-4 h-4 text-amber-300 mb-1" />
            <span className="text-base font-black">{readingCount}</span>
            <span className="text-[10px] text-pink-200 uppercase font-semibold">Lendo Agora</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[90px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-1" />
            <span className="text-base font-black">{completedCount}</span>
            <span className="text-[10px] text-pink-200 uppercase font-semibold">Concluídas</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & CTA */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-drive-darkSurface p-4 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, editora, autor, personagem..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center bg-gray-100 dark:bg-drive-darkBg p-0.5 rounded-xl border border-gray-200 dark:border-drive-darkBorder text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'all' ? 'bg-pink-600 text-white shadow' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('reading')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'reading' ? 'bg-pink-600 text-white shadow' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Lendo
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${filterStatus === 'completed' ? 'bg-pink-600 text-white shadow' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Concluídas
            </button>
          </div>

          {/* Publisher Select */}
          {publishers.length > 0 && (
            <select
              value={selectedPublisher}
              onChange={(e) => setSelectedPublisher(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Todas as Editoras</option>
              {publishers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}

          {/* Category Select */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="p-2 rounded-xl text-gray-500 hover:text-pink-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Limpar Filtros"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* CTA Button */}
          <button
            onClick={onNewComic}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova HQ / Mangá</span>
          </button>
        </div>
      </div>

      {/* Comic Books Cards Grid */}
      {filteredComics.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredComics.map((comic) => {
            const total = comic.issues?.length || 0;
            const completed = comic.issues?.filter(i => i.isCompleted).length || 0;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={comic.id}
                onClick={() => onSelectComic(comic)}
                className="group relative flex flex-col bg-white dark:bg-drive-darkSurface rounded-2xl border border-gray-200 dark:border-drive-darkBorder hover:border-pink-500/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer"
              >
                {/* 2:3 Aspect Ratio Cover Art */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/60">
                  <img
                    src={comic.coverImage || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60'}
                    alt={comic.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Publisher Badge */}
                  {comic.publisher && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider border border-white/10">
                      {comic.publisher}
                    </span>
                  )}

                  {/* Actions Hover Buttons */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEditComic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditComic(comic);
                        }}
                        className="p-1.5 rounded-lg bg-black/70 text-gray-300 hover:text-pink-400 hover:bg-black/90 transition-colors"
                        title="Editar HQ & Capa"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Deseja excluir a coleção "${comic.title}"?`)) {
                          onDeleteComic(comic.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-black/70 text-gray-300 hover:text-rose-400 hover:bg-black/90 transition-colors"
                      title="Excluir Coleção"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Reading Progress Overlay Bar */}
                  {total > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/50">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Card Info Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    {comic.category && (
                      <span className="text-[10px] font-bold text-pink-500 block truncate uppercase tracking-wider">
                        {comic.category}
                      </span>
                    )}
                    <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors mt-0.5" title={comic.title}>
                      {comic.title}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-gray-100 dark:border-gray-800">
                    <span>{total} {total === 1 ? 'edição' : 'edições'}</span>
                    <span className={progress === 100 ? 'text-emerald-500 font-bold' : 'text-pink-500 font-bold'}>
                      {progress === 100 ? '✓ Completo' : `${progress}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 text-pink-500 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-base">Nenhuma HQ ou Mangá encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-6">
            {hasActiveFilters 
              ? 'Nenhum resultado corresponde aos filtros selecionados.' 
              : 'Crie sua primeira biblioteca de quadrinhos vinculando uma pasta do Drive com arquivos CBR, CBZ ou PDF.'}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={handleClearFilters}
              className="px-5 py-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200"
            >
              Limpar Filtros
            </button>
          ) : (
            <button
              onClick={onNewComic}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeira Coleção de HQ</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
