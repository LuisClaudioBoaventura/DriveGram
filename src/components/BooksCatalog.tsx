import React, { useState, useMemo } from 'react';
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
  Bot,
  Download,
  ChevronRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Book, DriveItem, BookSagaGroup } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { MarqueeTitle } from './MarqueeTitle.js';
import { EditBookSagaCoverModal } from './EditBookSagaCoverModal.js';

interface BooksCatalogProps {
  books: Book[];
  allFiles?: DriveItem[];
  sagas?: BookSagaGroup[];
  onUpdateBookSagaCover?: (sagaName: string, coverImage: string) => Promise<boolean>;
  onUpdateBook?: (book: Book) => Promise<void>;
  onSelectBook: (book: Book) => void;
  onNewBook: () => void;
  onDeleteBook: (bookId: string) => void;
  onEditBook?: (book: Book) => void;
  onToggleBookCompletion?: (bookId: string) => void;
  categories?: string[];
  onOpenCategoryManager?: () => void;
  onSyncRootFolder?: () => Promise<{ importedCount: number; updatedCount: number; totalBooks: number } | void>;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const BooksCatalog: React.FC<BooksCatalogProps> = ({
  books,
  allFiles = [],
  sagas = [],
  onUpdateBookSagaCover,
  onUpdateBook,
  onSelectBook,
  onNewBook,
  onDeleteBook,
  onEditBook,
  onToggleBookCompletion,
  categories = [],
  onOpenCategoryManager,
  onSyncRootFolder,
  onShowToast
}) => {
  const [viewMode, setViewMode] = useState<'books' | 'sagas'>('books');
  const [selectedSagaName, setSelectedSagaName] = useState<string | null>(null);
  const [sagaToEditCover, setSagaToEditCover] = useState<BookSagaGroup | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'audiobook' | 'ebook' | 'in-progress' | 'completed'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNarrationType, setSelectedNarrationType] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedVersion, setSelectedVersion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const computedSagas = useMemo(() => {
    if (sagas && sagas.length > 0) return sagas;
    const map = new Map<string, Book[]>();
    for (const b of books) {
      if (b.saga && b.saga.trim() && b.saga.trim() !== 'N/A') {
        const key = b.saga.trim();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(b);
      }
    }
    const res: BookSagaGroup[] = [];
    for (const [name, sBooks] of map.entries()) {
      const sorted = [...sBooks].sort((a, b) => {
        if (a.sagaOrder !== undefined && b.sagaOrder !== undefined) return a.sagaOrder - b.sagaOrder;
        if (a.sagaOrder !== undefined) return -1;
        if (b.sagaOrder !== undefined) return 1;
        return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' });
      });
      const authorsSet = new Set<string>();
      sorted.forEach(b => {
        if (b.author && b.author.trim() && b.author !== 'Autor Desconhecido') authorsSet.add(b.author.trim());
      });

      let totalSeconds = 0;
      let totalChaptersCount = 0;
      sorted.forEach(b => {
        totalChaptersCount += (b.chapters?.length || 0);
        if (b.totalDuration) {
          const matchHours = b.totalDuration.match(/(\d+)\s*h/);
          const matchMins = b.totalDuration.match(/(\d+)\s*m/);
          if (matchHours || matchMins) {
            const h = matchHours ? parseInt(matchHours[1]) : 0;
            const m = matchMins ? parseInt(matchMins[1]) : 0;
            totalSeconds += (h * 3600 + m * 60);
          }
        }
      });

      let totalDurationText = '';
      if (totalSeconds > 0) {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        totalDurationText = h > 0 ? `${h}h ${m}m` : `${m} min`;
      } else if (totalChaptersCount > 0) {
        totalDurationText = `${totalChaptersCount} capítulos`;
      }

      res.push({
        name,
        coverImage: sorted[0]?.coverImage,
        bookCount: sorted.length,
        completedCount: sorted.filter(isBookCompleted).length,
        totalDuration: totalDurationText || undefined,
        totalDurationSeconds: totalSeconds,
        authors: Array.from(authorsSet),
        books: sorted
      });
    }
    return res.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [books, sagas]);

  const activeSaga = selectedSagaName 
    ? computedSagas.find(s => s.name === selectedSagaName) || null 
    : null;

  const filteredSagas = useMemo(() => {
    if (!searchQuery.trim()) return computedSagas;
    const q = searchQuery.toLowerCase();
    return computedSagas.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.authors.some(a => a.toLowerCase().includes(q)) ||
      s.books.some(b => b.title.toLowerCase().includes(q))
    );
  }, [computedSagas, searchQuery]);

  const handleMoveSagaBook = async (bookToMove: Book, direction: 'up' | 'down') => {
    if (!activeSaga || !onUpdateBook) return;
    const list = [...activeSaga.books];
    const index = list.findIndex(b => b.id === bookToMove.id);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const newOrder = i + 1;
      if (b.sagaOrder !== newOrder) {
        await onUpdateBook({
          ...b,
          sagaOrder: newOrder
        });
      }
    }
  };

  const handleSync = async () => {
    if (!onSyncRootFolder || isSyncing) return;
    setIsSyncing(true);
    try {
      if (onShowToast) onShowToast('⚡ Varrendo pasta Livros e Audiolivros e sincronizando...', 'info');
      const res = await onSyncRootFolder();
      if (res && typeof res === 'object') {
        if (res.importedCount > 0) {
          if (onShowToast) onShowToast(`✨ Sincronização concluída: ${res.importedCount} novos livros importados!`, 'success');
        } else if (res.updatedCount > 0) {
          if (onShowToast) onShowToast(`✨ Sincronização concluída: ${res.updatedCount} livros atualizados com novos capítulos!`, 'success');
        } else {
          if (onShowToast) onShowToast('✅ Catálogo de livros já está 100% atualizado com o Drive!', 'info');
        }
      }
    } catch (_) {
      if (onShowToast) onShowToast('Erro ao sincronizar pastas de livros.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStartSagaMarathon = (sagaBooks: Book[]) => {
    if (!sagaBooks || sagaBooks.length === 0) return;
    const firstUnfinished = sagaBooks.find(b => !isBookCompleted(b)) || sagaBooks[0];
    onSelectBook(firstUnfinished);
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
    if (filterType === 'ebook') {
      const hasDigital = Boolean(
        book.format === 'ebook' || 
        book.format === 'bundle' || 
        book.ebookFileId || 
        (book.folderId && allFiles.some(f => f.parentId === book.folderId && (
          f.type === 'ebook' || 
          f.type === 'pdf' || 
          ['epub', 'pdf', 'mobi', 'azw', 'azw3'].includes((f.extension || '').toLowerCase()) || 
          /\.(epub|pdf|mobi|azw3?)$/i.test(f.name || '')
        )))
      );
      if (!hasDigital) return false;
    }
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
  const ebooksCount = books.filter(b => 
    b.format === 'ebook' || 
    b.format === 'bundle' || 
    !!b.ebookFileId || 
    (b.folderId && allFiles.some(f => f.parentId === b.folderId && (
      f.type === 'ebook' || 
      f.type === 'pdf' || 
      ['epub', 'pdf', 'mobi', 'azw', 'azw3'].includes((f.extension || '').toLowerCase()) || 
      /\.(epub|pdf|mobi|azw3?)$/i.test(f.name || '')
    )))
  ).length;
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

            {onSyncRootFolder && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-100 hover:text-white text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                title="Detectar e sincronizar todas as pastas de livros e audiolivros no Drive automaticamente"
              >
                <RefreshCw className={`w-4 h-4 text-purple-300 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
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

      {/* View Mode Switcher: Livros & Audiolivros vs Sagas & Séries Literárias */}
      {!selectedSagaName && (
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-2 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => { setViewMode('books'); setSelectedSagaName(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'books'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Todos os Livros ({books.length})</span>
            </button>

            <button
              onClick={() => setViewMode('sagas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                viewMode === 'sagas'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sagas & Séries Literárias ({computedSagas.length})</span>
            </button>
          </div>
        </div>
      )}

      {selectedSagaName && activeSaga ? (
        /* SAGA DETAIL VIEW */
        <div className="space-y-6 animate-fadeIn">
          {/* Top Back Navigation & Position */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSagaName(null)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para Sagas & Séries Literárias</span>
            </button>

            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Série #{computedSagas.findIndex(s => s.name === activeSaga.name) + 1} de {computedSagas.length}
            </span>
          </div>

          {/* Saga Hero Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Stacked or Single Poster */}
              <div className="relative w-28 sm:w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/40 bg-black/60 shrink-0 group">
                <img
                  src={activeSaga.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                  alt={activeSaga.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {onUpdateBookSagaCover && (
                  <button
                    type="button"
                    onClick={() => setSagaToEditCover(activeSaga)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white gap-1.5 transition-opacity"
                    title="Alterar Capa da Saga Literária"
                  >
                    <div className="p-2 rounded-full bg-purple-600 shadow-lg">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold">Alterar Capa</span>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold uppercase tracking-wider border border-purple-500/30">
                  <Layers className="w-3 h-3 text-purple-400" />
                  <span>Franquia & Coleção Literária</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {activeSaga.name}
                </h2>

                {activeSaga.authors.length > 0 && (
                  <p className="text-sm font-semibold text-purple-300">
                    Por {activeSaga.authors.join(', ')}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-gray-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    {activeSaga.bookCount} {activeSaga.bookCount === 1 ? 'livro' : 'livros/volumes'}
                  </span>
                  {activeSaga.totalDuration && (
                    <span className="flex items-center gap-1.5 font-bold">
                      <Clock className="w-4 h-4 text-amber-400" />
                      {activeSaga.totalDuration}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {activeSaga.completedCount} de {activeSaga.bookCount} concluídos
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full max-w-md pt-1">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round((activeSaga.completedCount / Math.max(1, activeSaga.bookCount)) * 100)}%`
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 font-medium">
                    {Math.round((activeSaga.completedCount / Math.max(1, activeSaga.bookCount)) * 100)}% da série concluída
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <button
                    onClick={() => handleStartSagaMarathon(activeSaga.books)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Continuar da Última Parada</span>
                  </button>

                  {onUpdateBookSagaCover && (
                    <button
                      type="button"
                      onClick={() => setSagaToEditCover(activeSaga)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all active:scale-95"
                      title="Alterar Capa da Coleção"
                    >
                      <ImageIcon className="w-4 h-4 text-purple-300" />
                      <span>Alterar Capa</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Saga Books List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Volumes da Franquia em Ordem Sequencial</span>
              </h3>
              <span className="text-xs text-gray-500">
                Use as setas ↑ ↓ para reorganizar a ordem de leitura
              </span>
            </div>

            <div className="space-y-2.5">
              {activeSaga.books.map((book, idx) => {
                const isCompleted = isBookCompleted(book);
                const hasProgress = isBookInProgress(book);

                return (
                  <div
                    key={book.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-purple-500/50 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Order Number Badge */}
                      <span className="w-7 h-7 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-xs flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                        #{book.sagaOrder || idx + 1}
                      </span>

                      {/* Cover Thumbnail */}
                      <div
                        onClick={() => onSelectBook(book)}
                        className="relative w-12 h-16 rounded-xl overflow-hidden shadow-sm bg-black/40 shrink-0 cursor-pointer"
                      >
                        <img
                          src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-0.5">
                          {book.author && <span className="font-semibold text-purple-600 dark:text-purple-400">{book.author}</span>}
                          {book.format && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-bold uppercase">
                              {book.format === 'bundle' ? 'Audiobook + E-book' : book.format === 'audiobook' ? 'Audiolivro' : 'E-book'}
                            </span>
                          )}
                        </div>

                        <h4
                          onClick={() => onSelectBook(book)}
                          className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors"
                        >
                          {book.title}
                        </h4>

                        <div className="mt-1 flex items-center gap-2">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              Concluído
                            </span>
                          ) : hasProgress ? (
                            <span className="text-[11px] text-amber-500 font-bold">
                              Em andamento
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">
                              Não iniciado
                            </span>
                          )}
                          {book.totalDuration && (
                            <span className="text-[11px] text-gray-400 font-mono">
                              • {book.totalDuration}
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
                          onClick={() => handleMoveSagaBook(book, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                          title="Mover para cima na ordem da saga"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveSagaBook(book, 'down')}
                          disabled={idx === activeSaga.books.length - 1}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                          title="Mover para baixo na ordem da saga"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Open / Play Button */}
                      <button
                        onClick={() => onSelectBook(book)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Ouvir / Ler</span>
                      </button>

                      {/* Edit Button */}
                      {onEditBook && (
                        <button
                          onClick={() => onEditBook(book)}
                          className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                          title="Editar Livro"
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
        /* SAGAS GRID VIEW */
        <div className="space-y-4">
          {/* Saga Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar saga, série literária ou autor..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-purple-500 focus:outline-none"
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0 font-medium">
              {filteredSagas.length} {filteredSagas.length === 1 ? 'franquia' : 'franquias literárias'}
            </span>
          </div>

          {filteredSagas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSagas.map(saga => {
                const percent = Math.round((saga.completedCount / Math.max(1, saga.bookCount)) * 100);
                const chosenCover = saga.coverImage || saga.books[0]?.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60';
                
                // Other books to flank the chosen cover in the 3D card presentation
                const otherBooks = saga.books.filter(b => b.coverImage && b.coverImage !== chosenCover);
                const pool = otherBooks.length > 0 ? otherBooks : saga.books;
                const leftBook = (pool.length > 1 || otherBooks.length > 0) ? pool[0] : null;
                const rightBook = pool.length > 1 ? pool[1] : null;

                return (
                  <div
                    key={saga.name}
                    className="flex flex-col bg-white dark:bg-drive-darkSurface rounded-2xl border border-gray-200 dark:border-drive-darkBorder hover:border-purple-500/50 hover:shadow-xl transition-all duration-300 overflow-hidden group"
                  >
                    {/* Header Image / Book Stack */}
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
                        {leftBook && (
                          <div className="relative aspect-[2/3] h-36 rounded-lg overflow-hidden shadow-xl border border-white/10 opacity-70 scale-95 transition-all">
                            <img
                              src={leftBook.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                              alt={leftBook.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Center Spotlight: The Chosen Cover */}
                        <div className="relative aspect-[2/3] h-40 rounded-lg overflow-hidden shadow-2xl border-2 border-purple-500/80 z-10 scale-105 ring-2 ring-purple-500/50 transition-all">
                          <img
                            src={chosenCover}
                            alt={saga.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {rightBook && (
                          <div className="relative aspect-[2/3] h-36 rounded-lg overflow-hidden shadow-xl border border-white/10 opacity-70 scale-95 transition-all">
                            <img
                              src={rightBook.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                              alt={rightBook.title}
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
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-600/90 text-white text-[10px] font-black uppercase shadow backdrop-blur-sm">
                            {saga.bookCount} {saga.bookCount === 1 ? 'Volume' : 'Volumes'}
                          </span>
                          {saga.totalDuration && (
                            <span className="px-2 py-0.5 rounded-lg bg-black/60 text-gray-200 text-[10px] font-bold backdrop-blur-sm">
                              {saga.totalDuration}
                            </span>
                          )}
                        </div>

                        {onUpdateBookSagaCover && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSagaToEditCover(saga);
                            }}
                            className="pointer-events-auto p-1.5 rounded-lg bg-black/70 hover:bg-purple-600 text-white shadow backdrop-blur-sm transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100"
                            title="Alterar Capa da Franquia Literária"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3
                          onClick={() => setSelectedSagaName(saga.name)}
                          className="font-black text-sm sm:text-base text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer transition-colors truncate"
                          title={saga.name}
                        >
                          {saga.name}
                        </h3>

                        {saga.authors.length > 0 && (
                          <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 truncate mt-0.5">
                            Por {saga.authors.join(', ')}
                          </p>
                        )}

                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                          {saga.books.map(b => b.title).join(' • ')}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-gray-500">Progresso</span>
                          <span className={percent === 100 ? 'text-emerald-500' : 'text-gray-700 dark:text-gray-300'}>
                            {saga.completedCount}/{saga.bookCount} concluídos ({percent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              percent === 100 ? 'bg-emerald-500' : 'bg-purple-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => handleStartSagaMarathon(saga.books)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                          title="Continuar da última parada ou primeiro volume não lido"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Continuar</span>
                        </button>

                        {onUpdateBookSagaCover && (
                          <button
                            type="button"
                            onClick={() => setSagaToEditCover(saga)}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                            title="Alterar Capa da Coleção"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        )}

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
              <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Layers className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Nenhuma Saga ou Série Literária Encontrada
              </h4>
              <p className="text-xs text-gray-500 max-w-md">
                Para agrupar livros em uma franquia contínua (ex: Harry Potter, Duna, O Senhor dos Anéis), edite um livro existente ou cadastre um novo e preencha o campo <strong>"Saga / Franquia Literária"</strong>.
              </p>
              <button
                onClick={onNewBook}
                className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/25 transition-all"
              >
                Adicionar Livro a uma Saga
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Regular Books Catalog */
        <>
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
              <span>Livros Digitais (EPUB / PDF) ({ebooksCount})</span>
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
                  {book.format === 'ebook' || (!book.chapters || book.chapters.length === 0) ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                      <BookOpen className="w-3 h-3" />
                      <span>E-Book Digital</span>
                    </span>
                  ) : book.format === 'bundle' ? (
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-amber-500/40">
                      <Layers className="w-3 h-3" />
                      <span>Áudio + E-Book</span>
                    </span>
                  ) : book.narrationType === 'Artificial' ? (
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

                  {(() => {
                    const targetFile = book.ebookFileId 
                      ? allFiles.find(f => f.id === book.ebookFileId)
                      : allFiles.find(f => f.id === book.chapters?.[0]?.fileId || (book.folderId && f.parentId === book.folderId && !f.isFolder));
                    if (!targetFile) return null;
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadTargetFile(targetFile);
                        }}
                        className="p-1.5 rounded-full bg-black/60 hover:bg-purple-600 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Baixar para Cache Local"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    );
                  })()}

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

                  <MarqueeTitle
                    text={book.title}
                    as="h3"
                    className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug"
                  />

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
        </>
      )}

      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}

      {sagaToEditCover && onUpdateBookSagaCover && (
        <EditBookSagaCoverModal
          isOpen={!!sagaToEditCover}
          onClose={() => setSagaToEditCover(null)}
          saga={sagaToEditCover}
          onSaveCover={async (sagaName, newCover) => {
            await onUpdateBookSagaCover(sagaName, newCover);
          }}
        />
      )}
    </div>
  );
};
