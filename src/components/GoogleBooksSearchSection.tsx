import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Check, 
  User, 
  Calendar, 
  Layers, 
  Info
} from 'lucide-react';
import { GoogleBookSearchResultItem } from '../types/index.js';
import { searchGoogleBooks } from '../services/googleBooksService.js';

interface GoogleBooksSearchSectionProps {
  initialQuery?: string;
  categories?: string[];
  onApplyMetadata: (metadata: {
    title?: string;
    author?: string;
    description?: string;
    coverImage?: string;
    genre?: string;
    category?: string;
    language?: string;
    pageCount?: number;
    year?: string;
    isbn?: string;
  }) => void;
}

export const GoogleBooksSearchSection: React.FC<GoogleBooksSearchSectionProps> = ({
  initialQuery = '',
  categories = [],
  onApplyMetadata
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GoogleBookSearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [appliedBookId, setAppliedBookId] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuery && !searchQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setError('Digite o título, autor ou ISBN para buscar');
      return;
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setAppliedBookId(null);

    try {
      const res = await searchGoogleBooks({
        query
      });

      if (res.results && res.results.length > 0) {
        setResults(res.results);
      } else {
        setError(res.error || 'Nenhum livro encontrado com esse termo.');
      }
    } catch (err: any) {
      setError('Erro ao consultar o catálogo de livros.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = (book: GoogleBookSearchResultItem) => {
    setAppliedBookId(book.id);

    // Find best category match
    let matchedCategory: string | undefined = undefined;
    if (book.categories && book.categories.length > 0 && categories.length > 0) {
      const bookCatLower = book.categories.join(' ').toLowerCase();
      matchedCategory = categories.find(c => bookCatLower.includes(c.toLowerCase()) || c.toLowerCase().includes(bookCatLower));
    }

    onApplyMetadata({
      title: book.title,
      author: book.authors && book.authors.length > 0 ? book.authors.join(', ') : undefined,
      description: book.description,
      coverImage: book.coverImage,
      genre: book.categories && book.categories.length > 0 ? book.categories.join(', ') : undefined,
      category: matchedCategory,
      language: book.language === 'pt' || book.language === 'por' ? 'Português' : book.language === 'en' || book.language === 'eng' ? 'Inglês' : book.language || 'Português',
      pageCount: book.pageCount,
      year: book.year,
      isbn: book.isbn
    });
  };

  return (
    <div className="rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 overflow-hidden transition-all">
      {/* Accordion Header */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                Buscar Metadados no Google Books
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Opcional
              </span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Preenchimento automático de sinopse, capa HD, autor, ano e categorias
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full">
              {results.length} livros encontrados
            </span>
          )}
          <button type="button" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 pt-1 space-y-3 border-t border-purple-100 dark:border-purple-900/30">
          {/* Search Inputs */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Hábitos Atômicos, James Clear ou ISBN..."
                className="w-full pl-8 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkBg border border-purple-200 dark:border-purple-900/60 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all shrink-0 active:scale-95"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>{loading ? 'Buscando...' : 'Buscar'}</span>
            </button>
          </form>

          {/* Error message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 px-1">
                Selecione o livro correto para preencher automaticamente:
              </div>
              {results.map((item) => {
                const isSelected = appliedBookId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`group flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                        : 'border-purple-100 dark:border-purple-900/40 bg-white dark:bg-drive-darkBg hover:border-purple-400 hover:shadow-sm'
                    }`}
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-12 h-16 rounded-lg bg-gray-100 dark:bg-drive-darkSurface overflow-hidden shrink-0 border border-gray-200 dark:border-drive-darkBorder">
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <BookOpen className="w-5 h-5 opacity-40" />
                        </div>
                      )}
                    </div>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {item.title}
                          </h4>
                          {item.subtitle && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 italic">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                          {item.source === 'google_books' ? 'Google Books' : 'Open Library'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                        {item.authors && item.authors.length > 0 && (
                          <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                            <User className="w-3 h-3 text-purple-500" />
                            {item.authors.join(', ')}
                          </span>
                        )}
                        {item.year && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {item.year}
                          </span>
                        )}
                        {item.pageCount && (
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-gray-400" />
                            {item.pageCount} págs
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectBook(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Aplicado!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Preencher</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
