import React, { useState, useEffect, useRef, useCallback } from 'react';
import ePub, { Book as EpubBook, Rendition, NavItem } from 'epubjs';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Menu, 
  X, 
  Type, 
  Sun, 
  Moon, 
  Coffee, 
  Maximize, 
  Minimize, 
  Loader2,
  List
} from 'lucide-react';
import { DriveItem } from '../types/index.js';

interface EpubReaderProps {
  file: DriveItem;
}

export const EpubReader: React.FC<EpubReaderProps> = ({ file }) => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<EpubBook | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [isTocOpen, setIsTocOpen] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(100); // 100%
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>('dark');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Apply theme to rendition
  const applyTheme = useCallback((themeName: 'dark' | 'sepia' | 'light', rendition: Rendition) => {
    if (!rendition) return;
    
    rendition.themes.register('dark', {
      body: {
        background: '#0e1117 !important',
        color: '#e2e8f0 !important',
        'font-family': 'system-ui, -apple-system, sans-serif !important',
        'line-height': '1.7 !important',
        padding: '0 20px !important'
      },
      p: { color: '#e2e8f0 !important' },
      h1: { color: '#ffffff !important' },
      h2: { color: '#ffffff !important' },
      h3: { color: '#ffffff !important' },
      a: { color: '#60a5fa !important' },
      img: { 'max-width': '100% !important', 'height': 'auto !important' }
    });

    rendition.themes.register('sepia', {
      body: {
        background: '#fbf0d9 !important',
        color: '#433422 !important',
        'font-family': 'Georgia, serif !important',
        'line-height': '1.7 !important',
        padding: '0 20px !important'
      },
      p: { color: '#433422 !important' },
      h1: { color: '#2c1e11 !important' },
      h2: { color: '#2c1e11 !important' },
      h3: { color: '#2c1e11 !important' },
      a: { color: '#8b5cf6 !important' },
      img: { 'max-width': '100% !important', 'height': 'auto !important' }
    });

    rendition.themes.register('light', {
      body: {
        background: '#ffffff !important',
        color: '#1e293b !important',
        'font-family': 'system-ui, -apple-system, sans-serif !important',
        'line-height': '1.7 !important',
        padding: '0 20px !important'
      },
      p: { color: '#1e293b !important' },
      h1: { color: '#0f172a !important' },
      h2: { color: '#0f172a !important' },
      h3: { color: '#0f172a !important' },
      a: { color: '#2563eb !important' },
      img: { 'max-width': '100% !important', 'height': 'auto !important' }
    });

    rendition.themes.select(themeName);
  }, []);

  // Initialize ePub reader
  useEffect(() => {
    let isMounted = true;
    const url = `/api/stream/${file.id}`;

    async function initEpub() {
      setLoading(true);
      setError(null);

      try {
        if (!viewerRef.current) return;
        viewerRef.current.innerHTML = '';

        const book = ePub(url);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'auto'
        });
        renditionRef.current = rendition;

        applyTheme(theme, rendition);
        rendition.themes.fontSize(`${fontSize}%`);

        await rendition.display();

        // Load Table of Contents
        const navigation = await book.loaded.navigation;
        if (isMounted && navigation.toc) {
          setToc(navigation.toc);
        }

        // Relocated event
        rendition.on('relocated', (location: any) => {
          if (!isMounted) return;
          if (location && location.start) {
            setCurrentLocation(location.start.cfi);
            const chapter = book.navigation.get(location.start.href);
            if (chapter) {
              setCurrentChapter(chapter.label || '');
            }
          }
        });

        if (isMounted) setLoading(false);
      } catch (err: any) {
        console.error('Error initializing ePub reader:', err);
        if (isMounted) {
          setError(err.message || 'Falha ao processar arquivo EPUB.');
          setLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      isMounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
      }
    };
  }, [file.id]);

  // Update theme when changed
  useEffect(() => {
    if (renditionRef.current) {
      applyTheme(theme, renditionRef.current);
    }
  }, [theme, applyTheme]);

  // Update font size when changed
  useEffect(() => {
    if (renditionRef.current) {
      renditionRef.current.themes.fontSize(`${fontSize}%`);
    }
  }, [fontSize]);

  const nextPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.next();
    }
  }, []);

  const prevPage = useCallback(() => {
    if (renditionRef.current) {
      renditionRef.current.prev();
    }
  }, []);

  const goToChapter = (href: string) => {
    if (renditionRef.current) {
      renditionRef.current.display(href);
      setIsTocOpen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-drive-darkBg text-white p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-rose-400 mb-2">Erro ao abrir EPUB</h3>
        <p className="text-xs text-gray-300 max-w-md mb-6">{error}</p>
        <a
          href={`/api/stream/${file.id}`}
          download={file.name}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg"
        >
          Baixar Arquivo Completo
        </a>
      </div>
    );
  }

  const bgClasses = {
    dark: 'bg-[#0e1117] text-gray-200',
    sepia: 'bg-[#fbf0d9] text-[#433422]',
    light: 'bg-white text-gray-800'
  };

  const headerBgClasses = {
    dark: 'bg-[#161b22]/90 border-gray-800 text-white',
    sepia: 'bg-[#f4e6c9]/95 border-[#e2d0ab] text-[#433422]',
    light: 'bg-gray-50/95 border-gray-200 text-gray-900'
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-full w-full relative overflow-hidden transition-colors ${bgClasses[theme]}`}
    >
      {/* Top Navbar Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-md z-20 ${headerBgClasses[theme]}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTocOpen(t => !t)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Sumário / Capítulos"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capítulos</span>
          </button>

          <div className="flex items-center gap-2 overflow-hidden">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              EPUB
            </span>
            <h2 className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md">
              {currentChapter || file.name.replace(/\.[^/.]+$/, "")}
            </h2>
          </div>
        </div>

        {/* Right Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Selector */}
          <div className="flex items-center rounded-xl p-0.5 border border-black/10 dark:border-white/10">
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${theme === 'dark' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              title="Tema Escuro"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTheme('sepia')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${theme === 'sepia' ? 'bg-amber-600 text-white shadow' : 'text-amber-800/60 hover:text-amber-900'}`}
              title="Tema Sépia / Papel"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${theme === 'light' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-black'}`}
              title="Tema Claro"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Font Size Adjustments */}
          <div className="flex items-center rounded-xl p-0.5 border border-black/10 dark:border-white/10 text-xs">
            <button
              onClick={() => setFontSize(s => Math.max(s - 10, 70))}
              className="px-2 py-1 font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Diminuir Fonte (A-)"
            >
              A-
            </button>
            <span className="px-1 text-[10px] font-mono font-bold">
              {fontSize}%
            </span>
            <button
              onClick={() => setFontSize(s => Math.min(s + 10, 200))}
              className="px-2 py-1 font-bold hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Aumentar Fonte (A+)"
            >
              A+
            </button>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Tela Cheia"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main EPUB Reader Viewport */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-30">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
            <span className="text-xs font-semibold text-gray-200">Carregando livro digital...</span>
          </div>
        )}

        {/* The ePub.js render container */}
        <div ref={viewerRef} className="w-full h-full" />

        {/* Prev / Next Page Overlay Buttons */}
        <button
          onClick={prevPage}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/10 transition-transform hover:scale-110 z-10"
          title="Página Anterior (←)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={nextPage}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm border border-white/10 transition-transform hover:scale-110 z-10"
          title="Próxima Página (→)"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Chapters / Table of Contents Drawer */}
      {isTocOpen && (
        <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-gray-900/95 text-white backdrop-blur-xl border-r border-gray-800 shadow-2xl z-40 flex flex-col animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Sumário do Livro</h3>
            </div>
            <button
              onClick={() => setIsTocOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {toc.length > 0 ? (
              toc.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => goToChapter(item.href)}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-gray-800/80 transition-colors truncate"
                  title={item.label.trim()}
                >
                  {item.label.trim()}
                </button>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-6">
                Nenhum índice formal encontrado no arquivo.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
