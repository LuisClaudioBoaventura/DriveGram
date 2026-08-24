import React, { useState } from 'react';
import { 
  BookOpen, 
  Headphones, 
  FileText, 
  Play, 
  Plus, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Trash2, 
  Search, 
  Filter, 
  Layers, 
  User, 
  Mic, 
  Image as ImageIcon,
  Tag,
  FolderKanban,
  Edit3,
  Globe,
  HardDrive,
  RotateCcw,
  Bot
} from 'lucide-react';
import { Book } from '../types/index.js';

interface BooksCatalogProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onNewBook: () => void;
  onDeleteBook: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onToggleBookCompletion?: (bookId: string) => void;
  categories?: string[];
  onOpenCategoryManager?: () => void;
}

export const BooksCatalog: React.FC<BooksCatalogProps> = ({
  books,
  onSelectBook,
  onNewBook,
  onDeleteBook,
  onEditBook,
  onToggleBookCompletion,
  categories = [],
  onOpenCategoryManager
}) => {
  const [filterType, setFilterType] = useState<'all' | 'audiobook' | 'ebook' | 'in-progress' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNarrationType, setSelectedNarrationType] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper functions for completion and progress status
  const isBookCompleted = (book: Book) => {
    if (book.isCompleted) return true;
    const total = book.chapters?.length || 0;
    return total > 0 && (book.chapters?.every(c => c.isCompleted) ?? false);
  };

  const isBookInProgress = (book: Book) => {
    if (isBookCompleted(book)) return false;
    if ((book.lastPositionSeconds || 0) > 0) return true;
    return (book.chapters || []).some(c => c.isCompleted || (c.lastPositionSeconds || 0) > 0);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Extract unique languages and versions present in current books
  const presentLanguages = Array.from(new Set(books.map(b => b.language).filter(Boolean))) as string[];
  const presentVersions = Array.from(new Set(books.map(b => b.version).filter(Boolean))) as string[];

  const hasActiveFilters = selectedCategory !== 'all' || selectedNarrationType !== 'all' || selectedLanguage !== 'all' || selectedVersion !== 'all' || searchQuery.trim() !== '' || filterType !== 'all';

  const handleClearFilters = () => {
    setFilterType('all');
    setSelectedCategory('all');
    setSelectedNarrationType('all');
    setSelectedLanguage('all');
    setSelectedVersion('all');
    setSearchQuery('');
  };

  const filteredBooks = books.filter(book => {
    // 1. Text Search (title, author, narrator, saga, genre, category)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = 
        book.title.toLowerCase().includes(q) ||
        (book.author && book.author.toLowerCase().includes(q)) ||
        (book.narrator && book.narrator.toLowerCase().includes(q)) ||
        (book.saga && book.saga.toLowerCase().includes(q)) ||
        (book.genre && book.genre.toLowerCase().includes(q)) ||
        (book.category && book.category.toLowerCase().includes(q));
      if (!match) return false;
    }

    // 2. Format / Status filter
    if (filterType === 'audiobook' && !(book.format === 'audiobook' || (book.chapters && book.chapters.length > 0))) return false;
    if (filterType === 'ebook' && !(book.format === 'ebook' || !!book.ebookFileId)) return false;
    if (filterType === 'in-progress' && !isBookInProgress(book)) return false;
    if (filterType === 'completed' && !isBookCompleted(book)) return false;

    // 3. Category filter
    if (selectedCategory !== 'all' && book.category !== selectedCategory) return false;

    // 4. Narration Type filter
    if (selectedNarrationType !== 'all' && book.narrationType !== selectedNarrationType) return false;

    // 5. Language filter
    if (selectedLanguage !== 'all' && book.language !== selectedLanguage) return false;

    // 6. Version filter
    if (selectedVersion !== 'all' && book.version !== selectedVersion) return false;

    return true;
  });

  const totalBooks = books.length;
  const audiobooksCount = books.filter(b => b.format === 'audiobook' || (b.chapters && b.chapters.length > 0)).length;
  const ebooksCount = books.filter(b => b.format === 'ebook' || !!b.ebookFileId).length;
  const inProgressCount = books.filter(isBookInProgress).length;
  const completedBooksCount = books.filter(isBookCompleted).length;

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-3 sm:p-6 space-y-6">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-5 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-purple-800/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <BookOpen className="w-80 h-80" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 backdrop-blur-md text-purple-200 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Biblioteca Digital & Audiolivros</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            Livros & Audiolivros
          </h1>

          <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
            Ouça audiolivros com narração humana ou IA, controle de velocidade e marcadores, ou acompanhe seus PDFs sincronizados no Telegram.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onNewBook}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-purple-900 hover:bg-purple-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-purple-600" />
              <span>Novo Livro / Audiolivro</span>
            </button>

            {onOpenCategoryManager && (
              <button
                onClick={onOpenCategoryManager}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-950/60 hover:bg-purple-900 text-purple-200 border border-purple-700/60 text-xs font-bold transition-colors"
              >
                <FolderKanban className="w-4 h-4 text-purple-400" />
                <span>Gerenciar Categorias</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
            <BookOpen className="w-4 h-4 text-purple-300 mb-1" />
            <span className="text-base font-black">{totalBooks}</span>
            <span className="text-[10px] text-purple-200 uppercase font-semibold">Títulos</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
            <Headphones className="w-4 h-4 text-indigo-300 mb-1" />
            <span className="text-base font-black">{audiobooksCount}</span>
            <span className="text-[10px] text-purple-200 uppercase font-semibold">Audiolivros</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
            <FileText className="w-4 h-4 text-sky-300 mb-1" />
            <span className="text-base font-black">{ebooksCount}</span>
            <span className="text-[10px] text-purple-200 uppercase font-semibold">E-books</span>
          </div>

          <div className="p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-0">
            <CheckCircle className="w-4 h-4 text-emerald-300 mb-1" />
            <span className="text-base font-black">{completedBooksCount}</span>
            <span className="text-[10px] text-purple-200 uppercase font-semibold">Concluídos</span>
          </div>
        </div>
      </div>

      {/* Primary Filters & Search Bar */}
      <div className="space-y-3 pb-2 border-b border-gray-200 dark:border-drive-darkBorder">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Format Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              Todos ({books.length})
            </button>

            <button
              onClick={() => setFilterType('audiobook')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'audiobook'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audiolivros</span>
            </button>

            <button
              onClick={() => setFilterType('ebook')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'ebook'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Livros Digitais (PDF)</span>
            </button>

            <button
              onClick={() => setFilterType('in-progress')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'in-progress'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Em Andamento ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setFilterType('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'completed'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Concluídos ({completedBooksCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por livro, autor, narrador ou saga..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
          </div>
        </div>

        {/* Secondary Filter Dropdowns Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-black text-white border border-gray-800 px-2.5 py-1 rounded-xl text-xs shadow-sm">
            <Tag className="w-3.5 h-3.5 text-purple-400" />
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

          {/* Narration Type Filter */}
          <div className="flex items-center gap-1.5 bg-black text-white border border-gray-800 px-2.5 py-1 rounded-xl text-xs shadow-sm">
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <select
              value={selectedNarrationType}
              onChange={(e) => setSelectedNarrationType(e.target.value)}
              className="bg-black text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all">Todas as Narrações</option>
              <option value="Humana">🎙️ Narração Humana</option>
              <option value="Artificial">🤖 Narração Artificial / IA</option>
            </select>
          </div>

          {/* Version Filter */}
          {presentVersions.length > 0 && (
            <div className="flex items-center gap-1.5 bg-black text-white border border-gray-800 px-2.5 py-1 rounded-xl text-xs shadow-sm">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="bg-black text-white focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all">Todas as Versões</option>
                {presentVersions.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {/* Language Filter */}
          {presentLanguages.length > 0 && (
            <div className="flex items-center gap-1.5 bg-black text-white border border-gray-800 px-2.5 py-1 rounded-xl text-xs shadow-sm">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-black text-white focus:outline-none text-xs font-medium cursor-pointer"
              >
                <option value="all">Todos os Idiomas</option>
                {presentLanguages.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters Button */}
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

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredBooks.map((book) => {
          const totalChapters = book.chapters?.length || 0;
          const completedChapters = book.chapters?.filter(c => c.isCompleted).length || 0;
          const progressPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
          const isCompleted = isBookCompleted(book);
          const inProgress = isBookInProgress(book);
          const activeChap = book.lastPlayedChapterId 
            ? book.chapters?.find(c => c.id === book.lastPlayedChapterId) 
            : book.chapters?.find(c => (c.lastPositionSeconds || 0) > 0);

          return (
            <div
              key={book.id}
              onClick={() => onSelectBook(book)}
              className="group relative flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-purple-400 dark:hover:border-purple-600 shadow-sm hover:shadow-xl transition-all overflow-hidden cursor-pointer"
            >
              {/* Cover Image & Format Badges */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-drive-darkBg">
                <img
                  src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />

                {/* Top Badges: Narration Type + Format */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  {book.narrationType === 'Artificial' ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-950/80 backdrop-blur-md text-indigo-300 text-[10px] font-bold border border-indigo-500/40">
                      <Bot className="w-3 h-3" />
                      <span>Voz IA</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-950/80 backdrop-blur-md text-purple-300 text-[10px] font-bold border border-purple-500/40">
                      <Mic className="w-3 h-3" />
                      <span>Humana</span>
                    </span>
                  )}

                  {book.version && (
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-gray-200 text-[10px] font-bold border border-white/20">
                      {book.version}
                    </span>
                  )}
                </div>

                {/* Saga Badge */}
                {book.saga && book.saga !== 'N/A' && (
                  <div className="absolute bottom-3 left-3 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-md text-slate-950 text-[10px] font-extrabold shadow">
                      {book.saga}
                    </span>
                  </div>
                )}

                {/* Top Right Actions: Concluir / Concluído Toggle & Edit/Delete */}
                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                  {/* Completed Quick Toggle */}
                  {isCompleted ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookCompletion?.(book.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-lg shadow-emerald-950/50 transition-transform hover:scale-105 border border-emerald-400/40"
                      title="Concluído! Clique para marcar como não lido"
                    >
                      <CheckCircle className="w-3 h-3 fill-current" />
                      <span>Concluído</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookCompletion?.(book.id);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 hover:bg-emerald-600 text-gray-200 hover:text-white text-[10px] font-bold backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:scale-105 border border-white/20 hover:border-emerald-500 shadow-md"
                      title="Marcar livro como Concluído"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Concluir</span>
                    </button>
                  )}

                  {onEditBook && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBook(book);
                      }}
                      className="p-1.5 rounded-full bg-black/60 hover:bg-purple-600 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Editar Informações"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Deseja excluir "${book.title}" da sua biblioteca?`)) {
                        onDeleteBook(book.id);
                      }
                    }}
                    className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir Livro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Book Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider truncate">
                      {book.category || 'Geral'}
                    </span>
                    {book.language && (
                      <span className="text-[10px] text-gray-400 font-medium">
                        {book.language}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">
                    {book.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                    {book.author ? `Por ${book.author}` : 'Autor Desconhecido'}
                  </p>
                  {book.narrator && (
                    <p className="text-[11px] text-purple-500/80 truncate">
                      🎙️ Voz: {book.narrator}
                    </p>
                  )}
                </div>

                {/* Progress & Duration Footer */}
                {isCompleted ? (
                  <div className="pt-2 border-t border-gray-100 dark:border-drive-darkBorder space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Lido / Concluído</span>
                      </span>
                      <span className="font-mono text-gray-400 font-medium">
                        {book.totalDuration || (totalChapters > 0 ? `${totalChapters} cap.` : 'E-Book')}
                      </span>
                    </div>
                    <div className="w-full bg-emerald-100 dark:bg-emerald-950/40 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-full" />
                    </div>
                  </div>
                ) : inProgress ? (
                  <div className="pt-2 border-t border-gray-100 dark:border-drive-darkBorder space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 truncate max-w-[160px]" title={activeChap ? `Retomar: ${activeChap.title}` : 'Continuar'}>
                        <Clock className="w-3 h-3 shrink-0" />
                        <span className="truncate">{activeChap ? activeChap.title : 'Em andamento'}</span>
                      </span>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold shrink-0">
                        {activeChap && (activeChap.lastPositionSeconds || 0) > 0 ? formatSeconds(activeChap.lastPositionSeconds || 0) : `${progressPercent}%`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-drive-darkBg h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(progressPercent, 8)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-gray-100 dark:border-drive-darkBorder space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {totalChapters > 0 ? `${totalChapters} capítulos` : 'E-Book'}
                      </span>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                        {book.totalDuration || (totalChapters > 0 ? `${totalChapters * 25}m` : '')}
                      </span>
                    </div>

                    {totalChapters > 0 && (
                      <div className="w-full bg-gray-100 dark:bg-drive-darkBg h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredBooks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="w-16 h-16 text-purple-400/40 mb-3" />
          <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
            Nenhum livro ou audiolivro encontrado
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            {hasActiveFilters
              ? 'Tente remover os filtros ou buscar por outros termos.'
              : 'Clique em "Novo Livro ou Audiolivro" para importar uma pasta ou cadastrar um título.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
            >
              Limpar Todos os Filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
};
