import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Minimize2, 
  RotateCw, 
  Download, 
  Loader2, 
  Layers, 
  ExternalLink,
  FileText,
  X
} from 'lucide-react';
import { DriveItem } from '../types/index.js';

// Setup pdf.js worker using local bundled asset from Vite
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn('Failed to set PDF worker src', e);
  }
}

interface PdfReaderProps {
  file: DriveItem;
  initialPage?: number;
  onPageChange?: (page: number, totalPages: number) => void;
}

export const PdfReader: React.FC<PdfReaderProps> = ({
  file,
  initialPage = 1,
  onPageChange
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(`drivegram_pdf_page_${file.id}`);
      if (saved) return parseInt(saved, 10) || initialPage;
    } catch (e) {}
    return initialPage;
  });
  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Touch gesture tracking for swipe
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const fileUrl = `/api/stream/${file.id}`;

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Erro ao baixar PDF: HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer)
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Error loading PDF:', err);
        setError(err?.message || 'Não foi possível renderizar o PDF no leitor interno.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [fileUrl]);

  // Persist Page State
  useEffect(() => {
    if (currentPage > 0 && numPages > 0) {
      try {
        localStorage.setItem(`drivegram_pdf_page_${file.id}`, currentPage.toString());
      } catch (e) {}
      onPageChange?.(currentPage, numPages);
    }
  }, [currentPage, numPages, file.id, onPageChange]);

  // Render Single Page on Canvas with High-DPI support
  const renderSinglePage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
    }

    try {
      setRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const containerWidth = containerRef.current.clientWidth - 16;
      const containerHeight = containerRef.current.clientHeight - 16;

      let unscaledViewport = page.getViewport({ scale: 1, rotation });
      let computedScale = scale;

      if (fitMode === 'width' && containerWidth > 0) {
        computedScale = (containerWidth / unscaledViewport.width);
      } else if (fitMode === 'page' && containerHeight > 0) {
        const scaleW = containerWidth / unscaledViewport.width;
        const scaleH = containerHeight / unscaledViewport.height;
        computedScale = Math.min(scaleW, scaleH);
      }

      // Clamp scale
      computedScale = Math.max(0.5, Math.min(computedScale * (fitMode === 'custom' ? scale : 1), 3.5));

      const viewport = page.getViewport({ scale: computedScale, rotation });

      // High DPI ratio for super crisp text on mobile screens
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      ctx.save();
      ctx.scale(pixelRatio, pixelRatio);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      ctx.restore();
      setRenderingPage(false);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err);
      }
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale, fitMode, rotation]);

  useEffect(() => {
    renderSinglePage();
  }, [renderSinglePage]);

  // Window Resize listener to update fit-to-width
  useEffect(() => {
    const handleResize = () => {
      if (fitMode === 'width' || fitMode === 'page') {
        renderSinglePage();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitMode, renderSinglePage]);

  // Page Navigation Handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchStartXRef.current - touchEndX;
    const diffY = touchStartYRef.current - touchEndY;

    // Detect horizontal swipe (distance > 40px and mostly horizontal)
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY) * 1.3) {
      if (diffX > 0) {
        // Swiped Left -> Next page
        goToNextPage();
      } else {
        // Swiped Right -> Previous page
        goToPreviousPage();
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Zoom controls
  const handleZoomIn = () => {
    setFitMode('custom');
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-gray-900 text-gray-100 select-none relative overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Mobile-Friendly Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-gray-950/95 border-b border-gray-800 backdrop-blur-md z-20 shrink-0 text-xs">
        {/* Left: Page Navigator */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white transition-all active:scale-95 shadow-sm"
            title="Página Anterior (Deslize para a direita)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-800/80 border border-gray-700/60 font-mono text-[11px] sm:text-xs">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= numPages) {
                  setCurrentPage(val);
                }
              }}
              className="w-10 bg-transparent text-center font-bold text-purple-400 focus:outline-none focus:bg-gray-700 rounded"
            />
            <span className="text-gray-400">/ {numPages || '...'}</span>
          </div>

          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white transition-all active:scale-95 shadow-sm"
            title="Próxima Página (Deslize para a esquerda)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Zoom, Fit, Rotation */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => {
              setFitMode(fitMode === 'width' ? 'page' : 'width');
              setScale(1.0);
            }}
            className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition-colors ${
              fitMode === 'width' 
                ? 'bg-purple-600 border-purple-500 text-white shadow-sm' 
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
            title={fitMode === 'width' ? 'Modo: Ajustar à Largura' : 'Modo: Ajustar à Página'}
          >
            {fitMode === 'width' ? 'Largura' : 'Página'}
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Reduzir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
            title="Girar 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-xl transition-colors ${
              showThumbnails 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
            }`}
            title="Ver Todas as Páginas / Miniaturas"
          >
            <Layers className="w-4 h-4" />
          </button>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Abrir em Nova Aba"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <a
            href={fileUrl}
            download={file.name}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
            title="Baixar Arquivo PDF"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Reading Viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-auto p-2 sm:p-4 bg-gray-900/90 no-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            <p className="text-xs text-gray-400 font-medium animate-pulse">Carregando páginas do PDF...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
            <FileText className="w-12 h-12 text-rose-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Visualização Indisponível</h4>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir no Navegador</span>
            </a>
          </div>
        )}

        {!loading && !error && (
          <div className="relative shadow-2xl rounded-lg overflow-hidden flex items-center justify-center transition-transform duration-150">
            <canvas 
              ref={canvasRef} 
              className="rounded-lg shadow-2xl bg-white max-w-full touch-pan-y"
            />
            {renderingPage && (
              <div className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white shadow-lg pointer-events-none">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
              </div>
            )}
          </div>
        )}

        {/* Mobile Swipe / Click Navigation Overlays */}
        {!loading && !error && numPages > 1 && (
          <>
            {/* Left Tap Zone for previous page */}
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-r-2xl bg-black/40 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm transition-all disabled:opacity-0"
              title="Página Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Right Tap Zone for next page */}
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-l-2xl bg-black/40 hover:bg-black/80 text-white/70 hover:text-white backdrop-blur-sm transition-all disabled:opacity-0"
              title="Próxima Página"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Drawer / Sidebar */}
      {showThumbnails && numPages > 0 && (
        <div className="absolute inset-y-0 right-0 w-64 max-w-[80vw] bg-gray-950/95 backdrop-blur-xl border-l border-gray-800 shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Índice ({numPages} págs)</span>
            </div>
            <button
              onClick={() => setShowThumbnails(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2.5">
            {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => {
                  setCurrentPage(pageNum);
                  setShowThumbnails(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                  currentPage === pageNum
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300 ring-2 ring-purple-500/50 shadow-md'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                <FileText className="w-6 h-6 mb-1 opacity-60" />
                <span>Pág. {pageNum}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
