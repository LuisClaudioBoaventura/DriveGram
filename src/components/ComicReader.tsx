import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  Columns, 
  Square, 
  Rows, 
  Sliders, 
  Loader2,
  BookOpen,
  Image as ImageIcon,
  Search,
  X
} from 'lucide-react';
import { DriveItem } from '../types/index.js';

interface ComicManifest {
  id: string;
  filename: string;
  totalPages: number;
  pages: string[];
  format: 'cbz' | 'cbr';
}

interface ComicReaderProps {
  file: DriveItem;
  initialPage?: number;
  onPageChange?: (pageIndex: number, totalPages: number) => void;
}

export const ComicReader: React.FC<ComicReaderProps> = ({ 
  file, 
  initialPage, 
  onPageChange 
}) => {
  const [manifest, setManifest] = useState<ComicManifest | null>(null);

  // Initialize from prop or localStorage
  const getSavedPage = useCallback(() => {
    if (initialPage !== undefined && initialPage > 0) return initialPage;
    try {
      const saved = localStorage.getItem(`drivegram_comic_page_${file.id}`);
      if (saved) return parseInt(saved, 10) || 0;
    } catch (e) {}
    return 0;
  }, [file.id, initialPage]);

  const [currentPage, setCurrentPage] = useState<number>(getSavedPage);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View modes: 'single' (1 page), 'double' (2 pages side-by-side), 'webtoon' (vertical continuous scroll)
  const [viewMode, setViewMode] = useState<'single' | 'double' | 'webtoon'>('single');
  const [zoom, setZoom] = useState<number>(1);
  const [fitMode, setFitMode] = useState<'height' | 'width' | 'original'>('height');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);

  // Magnifier / Loupe Tool state
  const [isMagnifierActive, setIsMagnifierActive] = useState<boolean>(false);
  const [magnifierZoom, setMagnifierZoom] = useState<number>(2.5); // Zoom factor (1.5x to 4x)
  const [lensSize] = useState<number>(220); // 220px lens diameter
  const [magnifierPos, setMagnifierPos] = useState<{
    visible: boolean;
    x: number;
    y: number;
    bgPosX: number;
    bgPosY: number;
    bgWidth: number;
    bgHeight: number;
    imgSrc: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset magnifier position on page/view mode changes
  useEffect(() => {
    setMagnifierPos(null);
  }, [currentPage, viewMode]);

  // Magnifier mouse move handler
  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!isMagnifierActive) return;
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    if (cursorX < 0 || cursorX > rect.width || cursorY < 0 || cursorY > rect.height) {
      setMagnifierPos(prev => prev ? { ...prev, visible: false } : null);
      return;
    }

    const radius = lensSize / 2;
    const bgWidth = rect.width * magnifierZoom;
    const bgHeight = rect.height * magnifierZoom;

    const targetX = cursorX * magnifierZoom;
    const targetY = cursorY * magnifierZoom;

    const bgPosX = -(targetX - radius);
    const bgPosY = -(targetY - radius);

    setMagnifierPos({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      bgPosX,
      bgPosY,
      bgWidth,
      bgHeight,
      imgSrc: img.src
    });
  }, [isMagnifierActive, magnifierZoom, lensSize]);

  const handleImageMouseLeave = useCallback(() => {
    setMagnifierPos(prev => prev ? { ...prev, visible: false } : null);
  }, []);

  // Fetch comic book manifest
  useEffect(() => {
    let isMounted = true;
    async function loadComic() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/comic/${file.id}/manifest`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Não foi possível carregar os quadrinhos.');
        }
        const data: ComicManifest = await res.json();
        if (isMounted) {
          setManifest(data);
          const startPage = getSavedPage();
          const validStart = Math.min(Math.max(0, startPage), Math.max(0, data.totalPages - 1));
          setCurrentPage(validStart);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Erro ao extrair páginas da HQ.');
          setLoading(false);
        }
      }
    }

    loadComic();
    return () => {
      isMounted = false;
    };
  }, [file.id, getSavedPage]);

  const totalPages = manifest?.totalPages || 0;

  // Persist page change to localStorage and callback
  const handlePageUpdate = useCallback((newPage: number) => {
    if (!manifest) {
      setCurrentPage(newPage);
      return;
    }
    const bounded = Math.min(Math.max(0, newPage), manifest.totalPages - 1);
    setCurrentPage(bounded);
    try {
      localStorage.setItem(`drivegram_comic_page_${file.id}`, String(bounded));
    } catch (e) {}
    if (onPageChange) {
      onPageChange(bounded, manifest.totalPages);
    }
  }, [file.id, manifest, onPageChange]);

  // Page navigation helpers
  const goToNextPage = useCallback(() => {
    if (!manifest) return;
    if (viewMode === 'double') {
      handlePageUpdate(Math.min(currentPage + 2, manifest.totalPages - 1));
    } else {
      handlePageUpdate(Math.min(currentPage + 1, manifest.totalPages - 1));
    }
  }, [currentPage, handlePageUpdate, manifest, viewMode]);

  const goToPrevPage = useCallback(() => {
    if (!manifest) return;
    if (viewMode === 'double') {
      handlePageUpdate(Math.max(currentPage - 2, 0));
    } else {
      handlePageUpdate(Math.max(currentPage - 1, 0));
    }
  }, [currentPage, handlePageUpdate, manifest, viewMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        goToPrevPage();
      } else if (e.key === '+' || e.key === '=') {
        if (isMagnifierActive) {
          setMagnifierZoom(z => Math.min(Number((z + 0.5).toFixed(1)), 5));
        } else {
          setZoom(z => Math.min(z + 0.2, 3));
        }
      } else if (e.key === '-' || e.key === '_') {
        if (isMagnifierActive) {
          setMagnifierZoom(z => Math.max(Number((z - 0.5).toFixed(1)), 1.5));
        } else {
          setZoom(z => Math.max(z - 0.2, 0.6));
        }
      } else if (e.key === '0') {
        setZoom(1);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMagnifierActive(prev => !prev);
      } else if (e.key === 'Escape' && isMagnifierActive) {
        setIsMagnifierActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage, isMagnifierActive]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-drive-darkBg text-white p-8 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-gray-200 mb-1">Processando HQ ({file.extension.toUpperCase()})...</h3>
        <p className="text-xs text-gray-400 text-center max-w-sm">
          Extraindo páginas e imagens em alta definição direto do arquivo.
        </p>
      </div>
    );
  }

  if (error || !manifest || manifest.totalPages === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-drive-darkBg text-white p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-rose-400 mb-2">Erro ao abrir quadrinhos</h3>
        <p className="text-xs text-gray-300 max-w-md mb-6">{error || 'Nenhuma página encontrada no arquivo.'}</p>
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

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full w-full bg-black select-none overflow-hidden relative"
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent backdrop-blur-sm opacity-90 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black text-[10px] tracking-wider uppercase shadow">
            {manifest.format.toUpperCase()}
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md" title={file.name}>
            {file.name.replace(/\.[^/.]+$/, "")}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-900/80 border border-gray-700/80 rounded-xl p-0.5 shadow-sm">
            <button
              onClick={() => { setViewMode('single'); setZoom(1); }}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'single' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Página Única"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => { setViewMode('double'); setZoom(1); }}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'double' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Páginas Lado a Lado (Dupla)"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => { setViewMode('webtoon'); setZoom(1); }}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'webtoon' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Rolagem Vertical (Estilo Webtoon/Manhwa)"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Zoom Controls */}
          {viewMode !== 'webtoon' && (
            <div className="hidden sm:flex items-center bg-gray-900/80 border border-gray-700/80 rounded-xl p-0.5">
              <button
                onClick={() => setZoom(z => Math.max(z - 0.2, 0.6))}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[11px] font-mono text-gray-300 font-bold min-w-[38px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {zoom !== 1 && (
                <button
                  onClick={() => setZoom(1)}
                  className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors"
                  title="Resetar Zoom (0)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Magnifier Tool Toggle Button */}
          <button
            onClick={() => setIsMagnifierActive(prev => !prev)}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isMagnifierActive
                ? 'bg-pink-600 border-pink-400 text-white shadow-lg shadow-pink-500/30 ring-2 ring-pink-500/50'
                : 'bg-gray-900/80 border-gray-700/80 text-gray-400 hover:text-white'
            }`}
            title="Ferramenta de Lupa / Ampliação de Detalhes (Atalho: M)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-bold">Lupa</span>
          </button>

          {/* Thumbnails Drawer Toggle */}
          <button
            onClick={() => setShowThumbnails(t => !t)}
            className={`p-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showThumbnails 
                ? 'bg-blue-600 border-blue-500 text-white shadow' 
                : 'bg-gray-900/80 border-gray-700/80 text-gray-400 hover:text-white'
            }`}
            title="Exibir Grade de Miniaturas"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 text-gray-400 hover:text-white transition-colors"
            title="Tela Cheia (F)"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Magnifier Active Floating Status & Controls Pill */}
      {isMagnifierActive && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gray-950/90 backdrop-blur-md border border-pink-500/50 shadow-2xl shadow-pink-500/20 text-white animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold">
            <Search className="w-3.5 h-3.5 animate-pulse" />
            <span className="text-[11px]">Lupa Ativa:</span>
          </div>

          {/* Quick Zoom Multiplier Buttons */}
          <div className="flex items-center bg-gray-900 rounded-xl p-0.5 border border-gray-800">
            {[1.5, 2, 2.5, 3, 4].map((z) => (
              <button
                key={z}
                onClick={() => setMagnifierZoom(z)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  magnifierZoom === z
                    ? 'bg-pink-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>

          <span className="text-[10px] text-gray-400 hidden sm:inline border-l border-gray-800 pl-2">
            Passe o mouse na página
          </span>

          <button
            onClick={() => setIsMagnifierActive(false)}
            className="p-1 text-gray-400 hover:text-rose-400 transition-colors ml-1"
            title="Desativar Lupa (Esc ou M)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Comic Pages Display Area */}
      <div 
        ref={scrollContainerRef}
        className={`flex-1 w-full h-full overflow-auto relative flex items-center justify-center p-2 sm:p-4 ${
          viewMode === 'webtoon' ? 'flex-col items-center justify-start overflow-y-auto' : ''
        }`}
      >
        {/* VIEW MODE: WEBTOON / CONTINUOUS VERTICAL SCROLL */}
        {viewMode === 'webtoon' && (
          <div className="flex flex-col items-center w-full max-w-4xl space-y-2 py-12">
            {manifest.pages.map((_page, idx) => (
              <div key={idx} className="w-full flex flex-col items-center relative">
                <img
                  src={`/api/comic/${file.id}/page/${idx}`}
                  alt={`Página ${idx + 1}`}
                  loading="lazy"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseMove={isMagnifierActive ? handleImageMouseMove : undefined}
                  onMouseLeave={isMagnifierActive ? handleImageMouseLeave : undefined}
                  className={`w-full h-auto object-contain rounded shadow-2xl select-none ${
                    isMagnifierActive ? 'cursor-crosshair' : 'pointer-events-auto'
                  }`}
                />
                <span className="text-[10px] text-gray-500 font-mono py-1">
                  Página {idx + 1} de {totalPages}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* VIEW MODE: SINGLE PAGE */}
        {viewMode === 'single' && (
          <div 
            className="flex items-center justify-center transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={`/api/comic/${file.id}/page/${currentPage}`}
              alt={`Página ${currentPage + 1}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onMouseMove={isMagnifierActive ? handleImageMouseMove : undefined}
              onMouseLeave={isMagnifierActive ? handleImageMouseLeave : undefined}
              className={`max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl select-none ${
                isMagnifierActive ? 'cursor-crosshair' : 'pointer-events-auto'
              }`}
            />
          </div>
        )}

        {/* VIEW MODE: DOUBLE PAGE (SPREAD) */}
        {viewMode === 'double' && (
          <div 
            className="flex items-center justify-center gap-1 transition-transform duration-100 ease-out"
            style={{ transform: `scale(${zoom})` }}
          >
            <img
              src={`/api/comic/${file.id}/page/${currentPage}`}
              alt={`Página ${currentPage + 1}`}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              onMouseMove={isMagnifierActive ? handleImageMouseMove : undefined}
              onMouseLeave={isMagnifierActive ? handleImageMouseLeave : undefined}
              className={`max-h-[82vh] max-w-[46vw] object-contain rounded-l-lg shadow-2xl select-none ${
                isMagnifierActive ? 'cursor-crosshair' : 'pointer-events-auto'
              }`}
            />
            {currentPage + 1 < totalPages && (
              <img
                src={`/api/comic/${file.id}/page/${currentPage + 1}`}
                alt={`Página ${currentPage + 2}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onMouseMove={isMagnifierActive ? handleImageMouseMove : undefined}
                onMouseLeave={isMagnifierActive ? handleImageMouseLeave : undefined}
                className={`max-h-[82vh] max-w-[46vw] object-contain rounded-r-lg shadow-2xl select-none ${
                  isMagnifierActive ? 'cursor-crosshair' : 'pointer-events-auto'
                }`}
              />
            )}
          </div>
        )}

        {/* Previous / Next Side Floating Click Zones */}
        {viewMode !== 'webtoon' && (
          <>
            {currentPage > 0 && (
              <button
                onClick={goToPrevPage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-gray-700/80 shadow-2xl transition-transform hover:scale-110 z-20 group"
                title="Página Anterior (← ou A)"
              >
                <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}

            {currentPage < totalPages - 1 && (
              <button
                onClick={goToNextPage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-gray-700/80 shadow-2xl transition-transform hover:scale-110 z-20 group"
                title="Próxima Página (→ ou D)"
              >
                <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Magnifier Loupe Lens */}
      {isMagnifierActive && magnifierPos && magnifierPos.visible && (
        <div
          className="fixed pointer-events-none z-50 rounded-full overflow-hidden border-2 border-pink-500 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_24px_rgba(236,72,153,0.35)] ring-4 ring-black/80"
          style={{
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            left: `${magnifierPos.x}px`,
            top: `${magnifierPos.y}px`,
            transform: 'translate(-50%, -50%)',
            backgroundImage: `url(${magnifierPos.imgSrc})`,
            backgroundSize: `${magnifierPos.bgWidth}px ${magnifierPos.bgHeight}px`,
            backgroundPosition: `${magnifierPos.bgPosX}px ${magnifierPos.bgPosY}px`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#050507'
          }}
        >
          {/* Lens Glass Reflection Highlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 rounded-full pointer-events-none" />

          {/* Lens Crosshair / Reticle Dot */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-pink-400/90 bg-pink-500/40 pointer-events-none shadow-sm" />

          {/* Magnifier Zoom Badge */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-pink-500/50 text-[10px] font-mono font-black text-pink-300 shadow-md">
            {magnifierZoom}x
          </div>
        </div>
      )}

      {/* Bottom Floating Scrubber & Page Counter */}
      {viewMode !== 'webtoon' && (
        <div className="absolute bottom-0 inset-x-0 z-30 flex flex-col items-center px-4 py-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent backdrop-blur-sm">
          {/* Thumbnails Strip */}
          {showThumbnails && (
            <div className="w-full flex gap-2 overflow-x-auto py-2 mb-2 scrollbar-thin scrollbar-thumb-gray-700">
              {manifest.pages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    handlePageUpdate(idx);
                  }}
                  className={`relative shrink-0 w-14 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    currentPage === idx || (viewMode === 'double' && currentPage + 1 === idx)
                      ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105'
                      : 'border-gray-800 opacity-60 hover:opacity-100 hover:border-gray-600'
                  }`}
                >
                  <img
                    src={`/api/comic/${file.id}/page/${idx}`}
                    alt={`Pág ${idx + 1}`}
                    loading="lazy"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    className="w-full h-full object-cover select-none"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-white font-mono text-center py-0.5">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Slider & Page Jump input */}
          <div className="flex items-center gap-4 w-full max-w-xl">
            <span className="text-xs font-bold font-mono text-gray-300 shrink-0">
              {viewMode === 'double' ? `${currentPage + 1}-${Math.min(currentPage + 2, totalPages)}` : currentPage + 1}
            </span>

            <input
              type="range"
              min={0}
              max={totalPages - 1}
              value={currentPage}
              onChange={(e) => handlePageUpdate(parseInt(e.target.value, 10))}
              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-gray-800 rounded-lg"
            />

            <span className="text-xs font-bold font-mono text-gray-400 shrink-0">
              de {totalPages}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
