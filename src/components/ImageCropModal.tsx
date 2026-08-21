import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Check, 
  Move, 
  Sparkles, 
  Maximize2,
  Crop,
  User
} from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  aspectRatio?: 'circle' | 'square' | 'poster';
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 'circle'
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset parameters whenever a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageRef.current = img;
        setImageLoaded(true);
        setZoom(1);
        setRotation(0);
        setOffset({ x: 0, y: 0 });
      };
      img.src = imageSrc;
    }
  }, [isOpen, imageSrc]);

  // Draw the preview canvas
  const drawPreview = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Save context for transform operations
    ctx.save();

    // Move to canvas center
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate aspect ratio fit
    const imgAspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (imgAspect > 1) {
      drawHeight = size;
      drawWidth = size * imgAspect;
    } else {
      drawWidth = size;
      drawHeight = size / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
  }, [zoom, rotation, offset, imageLoaded]);

  useEffect(() => {
    drawPreview();
  }, [drawPreview]);

  if (!isOpen) return null;

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.min(3.5, Math.max(0.8, prev + delta)));
  };

  // Quick preset alignments
  const alignTopFace = () => {
    setZoom(1.3);
    setOffset({ x: 0, y: 50 });
  };

  const alignCenter = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const alignBottom = () => {
    setZoom(1.3);
    setOffset({ x: 0, y: -50 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Final export canvas to high quality cropped data URL
  const handleSaveCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const exportCanvas = document.createElement('canvas');
    const exportSize = 512; // High resolution avatar
    exportCanvas.width = exportSize;
    exportCanvas.height = exportSize;

    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();

    // Scale offset and position proportional to exportSize / 320
    const scaleFactor = exportSize / 320;
    ctx.translate(exportSize / 2 + offset.x * scaleFactor, exportSize / 2 + offset.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor);

    const imgAspect = img.width / img.height;
    let drawWidth = 320;
    let drawHeight = 320;

    if (imgAspect > 1) {
      drawHeight = 320;
      drawWidth = 320 * imgAspect;
    } else {
      drawWidth = 320;
      drawHeight = 320 / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    const croppedDataUrl = exportCanvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedDataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-rose-500" />
            <h3 className="text-sm font-black text-white">
              Ajustar e Enquadrar Foto do Ator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Box */}
        <div className="p-6 flex flex-col items-center justify-center bg-black">
          <div 
            className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-rose-500/80 shadow-2xl cursor-grab active:cursor-grabbing bg-gray-950 flex items-center justify-center touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Subtle Crop Grid Overlay */}
            <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
            <div className="absolute inset-x-0 top-1/3 border-b border-white/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-2/3 border-b border-white/10 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/3 border-r border-white/10 pointer-events-none" />
            <div className="absolute inset-y-0 left-2/3 border-r border-white/10 pointer-events-none" />

            <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none">
              <span className="px-2 py-0.5 rounded-full bg-black/70 text-[9px] font-bold text-gray-300 backdrop-blur-sm flex items-center gap-1">
                <Move className="w-2.5 h-2.5" />
                <span>Arraste para posicionar</span>
              </span>
            </div>
          </div>
        </div>

        {/* Control Tools */}
        <div className="p-4 space-y-4 bg-gray-900 border-t border-gray-800">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-gray-300 font-bold">
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <ZoomIn className="w-3.5 h-3.5" />
                <span>Zoom / Escala</span>
              </span>
              <span className="font-mono text-rose-400">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(0.8, prev - 0.15))}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="0.8"
                max="3.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-rose-500 cursor-pointer h-1.5 bg-gray-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(3.5, prev + 0.15))}
                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Preset Alignments & Rotation */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mr-1">
                Foco:
              </span>
              <button
                type="button"
                onClick={alignTopFace}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-rose-600/30 text-gray-300 hover:text-white text-[11px] font-bold border border-gray-700 transition-colors"
                title="Enquadrar Rosto / Topo"
              >
                👤 Rosto
              </button>
              <button
                type="button"
                onClick={alignCenter}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-rose-600/30 text-gray-300 hover:text-white text-[11px] font-bold border border-gray-700 transition-colors"
                title="Enquadrar Centro"
              >
                🎯 Centro
              </button>
              <button
                type="button"
                onClick={alignBottom}
                className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-rose-600/30 text-gray-300 hover:text-white text-[11px] font-bold border border-gray-700 transition-colors"
                title="Enquadrar Base"
              >
                📐 Base
              </button>
            </div>

            <button
              type="button"
              onClick={handleRotate}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold border border-gray-700 transition-colors"
              title="Girar 90 Graus"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{rotation}°</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCrop}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Ajuste</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
