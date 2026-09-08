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
  X,
  ScrollText
} from 'lucide-react';
import { DriveItem } from '../types/index.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';

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

interface ContinuousPageItemProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  scale: number;
  rotation: number;
  fitMode: 'width' | 'page' | 'custom';
  containerWidth: number;
  onVisible?: (pageNum: number) => void;
}

const ContinuousPageItem: React.FC<ContinuousPageItemProps> = ({
  pdfDoc,
  pageNum,
  scale,
  rotation,
  fitMode,
  containerWidth,
  onVisible
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsVisible(true);
          onVisible?.(pageNum);
        }
      },
      { rootMargin: '300px 0px 300px 0px', threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, onVisible]);

  useEffect(() => {
    if (!isVisible || !canvasRef.current || !pdfDoc) return;

    let isCancelled = false;
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
    }

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const unscaledViewport = page.getViewport({ scale: 1, rotation });
        let computedScale = scale;
        if (fitMode === 'width' && containerWidth > 0) {
          computedScale = (containerWidth - 32) / unscaledViewport.width;
        }
        computedScale = Math.max(0.4, Math.min(computedScale * (fitMode === 'custom' ? scale : 1), 3.0));

        const viewport = page.getViewport({ scale: computedScale, rotation });
        const pixelRatio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.save();
        ctx.scale(pixelRatio, pixelRatio);

        const renderTask = page.render({
          canvasContext: ctx,
          viewport
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        ctx.restore();
        if (!isCancelled) setIsRendered(true);
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Erro ao renderizar página ${pageNum}:`, err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [isVisible, pdfDoc, pageNum, scale, rotation, fitMode, containerWidth]);

  return (
    <div 
      ref={containerRef} 
      className="my-3 flex flex-col items-center justify-center relative min-h-[400px] w-full"
    >
      <canvas 
        ref={canvasRef} 
        className="rounded-xl shadow-2xl bg-white max-w-full"
      />
      {!isRendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/40 rounded-xl">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      )}
      <span className="mt-1.5 text-[11px] text-gray-400 font-mono font-semibold">
        Página {pageNum}
      </span>
    </div>
  );
};

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

  // Viewer modes: 'integrated' (PDF.js canvas) or 'native' (Browser iframe)
  const [viewerMode, setViewerMode] = useState<'integrated' | 'native'>(() => {
    return (localStorage.getItem('drivegram_pdf_viewer_mode') as any) || 'integrated';
  });

  // Scroll mode in integrated reader: 'single' (page flip) or 'continuous' (vertical roll)
  const [scrollMode, setScrollMode] = useState<'single' | 'continuous'>(() => {
    return (localStorage.getItem('drivegram_pdf_scroll_mode') as any) || 'single';
  });

  const [scale, setScale] = useState<number>(1.0);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderingPage, setRenderingPage] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const lastWheelTimeRef = useRef<number>(0);

  // Touch gesture tracking for mobile swipe
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const fileUrl = resolveApiUrl(`/api/stream/${file.id}`);

  // Measure container width dynamically via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Erro ao carregar PDF: HTTP ${response.status}`);
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

  // Page Navigation Handlers
  const goToPreviousPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev < numPages) {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        return prev + 1;
      }
      return prev;
    });
  }, [numPages]);

  // Keyboard navigation for desktop exploration
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        goToPreviousPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(numPages);
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPreviousPage, numPages]);

  // Mouse wheel handler to advance pages when scrolling reaches top/bottom in single page mode
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollMode !== 'single' || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 15;
    const isAtTop = container.scrollTop <= 15;
    const now = Date.now();

    if (now - lastWheelTimeRef.current < 350) return;

    if (e.deltaY > 40 && isAtBottom && currentPage < numPages) {
      lastWheelTimeRef.current = now;
      goToNextPage();
    } else if (e.deltaY < -40 && isAtTop && currentPage > 1) {
      lastWheelTimeRef.current = now;
      goToPreviousPage();
    }
  };

  // Render Single Page on Canvas with High-DPI support
  const renderSinglePage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !scrollContainerRef.current || scrollMode !== 'single') return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {}
    }

    try {
      setRenderingPage(true);
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      const availableWidth = (scrollContainerRef.current.clientWidth || containerWidth) - 32;
      const availableHeight = (scrollContainerRef.current.clientHeight || 600) - 32;

      let unscaledViewport = page.getViewport({ scale: 1, rotation });
      let computedScale = scale;

      if (fitMode === 'width' && availableWidth > 0) {
        computedScale = (availableWidth / unscaledViewport.width);
      } else if (fitMode === 'page' && availableHeight > 0) {
        const scaleW = availableWidth / unscaledViewport.width;
        const scaleH = availableHeight / unscaledViewport.height;
        computedScale = Math.min(scaleW, scaleH);
      }

      // Clamp scale
      computedScale = Math.max(0.4, Math.min(computedScale * (fitMode === 'custom' ? scale : 1), 3.5));

      const viewport = page.getViewport({ scale: computedScale, rotation });

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
        console.error('Error rendering single page:', err);
      }
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, scale, fitMode, rotation, scrollMode, containerWidth]);

  useEffect(() => {
    if (scrollMode === 'single') {
      renderSinglePage();
    }
  }, [renderSinglePage, scrollMode]);

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
        goToNextPage();
      } else {
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

  // Toggle Viewer Mode (Native vs Integrated)
  const toggleViewerMode = () => {
    const nextMode = viewerMode === 'integrated' ? 'native' : 'integrated';
    setViewerMode(nextMode);
    try {
      localStorage.setItem('drivegram_pdf_viewer_mode', nextMode);
    } catch (e) {}
  };

  // Toggle Scroll Mode (Single vs Continuous)
  const toggleScrollMode = () => {
    const nextScroll = scrollMode === 'single' ? 'continuous' : 'single';
    setScrollMode(nextScroll);
    try {
      localStorage.setItem('drivegram_pdf_scroll_mode', nextScroll);
    } catch (e) {}
  };

  // ---------------- RENDER NATIVE IFRAME MODE ----------------
  if (viewerMode === 'native') {
    return (
      <div 
        ref={containerRef}
        className={`flex flex-col w-full h-full bg-gray-950 text-gray-100 relative overflow-hidden ${
          isFullscreen ? 'fixed inset-0 z-50' : ''
        }`}
      >
        {/* Top Control Bar for Native Mode */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-950 border-b border-gray-800 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-bold text-white truncate max-w-[150px] sm:max-w-md">{file.name}</span>
            <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              Modo Nativo (Navegador)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleViewerMode}
              className="px-2.5 py-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              title="Voltar para o Leitor Integrado com índice e miniaturas"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Usar Leitor Integrado</span>
            </button>

            <a
              href={fileUrl}
              download={file.name}
              className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Baixar Arquivo PDF"
            >
              <Download className="w-4 h-4" />
            </a>

            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title="Abrir em Nova Aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Embedded Native Browser Viewer */}
        <div className="flex-1 w-full h-full relative bg-gray-900">
          <iframe
            src={`${fileUrl}#page=${currentPage}&toolbar=1&navpanes=1`}
            className="w-full h-full border-0"
            title={file.name}
          />
        </div>
      </div>
    );
  }

  // ---------------- RENDER INTEGRATED CANVAS MODE ----------------
  return (
    <div 
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-gray-950 text-gray-100 relative overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Mobile-Friendly Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-2 bg-gray-950 border-b border-gray-800/80 backdrop-blur-md z-20 shrink-0 text-xs">
        {/* Left: Page Navigator */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white transition-all active:scale-95 shadow-sm"
            title="Página Anterior (Seta Esquerda / PgUp)"
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
            title="Próxima Página (Seta Direita / PgDown / Espaço)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Modes, Zoom, Fit, Rotation */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Toggle Scroll Mode: Single vs Continuous */}
          <button
            onClick={toggleScrollMode}
            className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 ${
              scrollMode === 'continuous'
                ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
            title={scrollMode === 'continuous' ? 'Alternar para Modo Página Única' : 'Alternar para Rolagem Contínua Vertical'}
          >
            <ScrollText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{scrollMode === 'continuous' ? 'Rolagem Contínua' : 'Página a Página'}</span>
          </button>

          {/* Fit Mode Toggle */}
          <button
            onClick={() => {
              setFitMode(fitMode === 'width' ? 'page' : 'width');
              setScale(1.0);
            }}
            className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition-colors ${
              fitMode === 'width' 
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm' 
                : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-700'
            }`}
            title={fitMode === 'width' ? 'Ajustado à Largura' : 'Ajustado à Página'}
          >
            {fitMode === 'width' ? 'Largura' : 'Página'}
          </button>

          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Reduzir Zoom (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            title="Aumentar Zoom (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors hidden sm:inline-flex"
            title="Girar 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Actions, Native Viewer & Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Switch to Native Browser Viewer Mode */}
          <button
            onClick={toggleViewerMode}
            className="px-2 py-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
            title="Abrir no Visualizador Nativo do Navegador (Chrome/Edge)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Modo Navegador</span>
          </button>

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className={`p-1.5 rounded-xl transition-colors ${
              showThumbnails 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white'
            }`}
            title="Ver Índice de Miniaturas"
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

      {/* Main Reading Scroll Viewport */}
      <div 
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex-1 relative overflow-y-auto overflow-x-auto p-2 sm:p-4 bg-gray-900/95 scroll-smooth"
      >
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-12 min-h-full">
            <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            <p className="text-xs text-gray-400 font-semibold animate-pulse">Carregando páginas do documento PDF...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto min-h-full">
            <FileText className="w-12 h-12 text-rose-400 mb-2" />
            <h4 className="text-sm font-bold text-white mb-1">Visualização Indisponível no Leitor Integrado</h4>
            <p className="text-xs text-gray-400 mb-4">{error}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleViewerMode}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Tentar Modo Navegador</span>
              </button>
              <a
                href={fileUrl}
                download={file.name}
                className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Baixar</span>
              </a>
            </div>
          </div>
        )}

        {/* CONTINUOUS SCROLL VIEW */}
        {!loading && !error && scrollMode === 'continuous' && pdfDoc && (
          <div className="min-h-full w-full flex flex-col items-center justify-start pb-12">
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pNum) => (
              <ContinuousPageItem
                key={pNum}
                pdfDoc={pdfDoc}
                pageNum={pNum}
                scale={scale}
                rotation={rotation}
                fitMode={fitMode}
                containerWidth={containerWidth}
                onVisible={(visiblePage) => setCurrentPage(visiblePage)}
              />
            ))}
          </div>
        )}

        {/* SINGLE PAGE VIEW */}
        {!loading && !error && scrollMode === 'single' && (
          <div className="min-h-full w-full flex flex-col items-center justify-start py-2">
            <div className="relative shadow-2xl rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-150">
              <canvas 
                ref={canvasRef} 
                className="rounded-xl shadow-2xl bg-white max-w-full touch-pan-y"
              />
              {renderingPage && (
                <div className="absolute top-3 right-3 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white shadow-lg pointer-events-none">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Tap Zones for Previous/Next in Single Mode */}
        {!loading && !error && scrollMode === 'single' && numPages > 1 && (
          <>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-r-2xl bg-black/40 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all disabled:opacity-0 z-10"
              title="Página Anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-l-2xl bg-black/40 hover:bg-black/70 text-white/70 hover:text-white backdrop-blur-sm transition-all disabled:opacity-0 z-10"
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
                  if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
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
