import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Edit3,
  Trash2,
  Download,
  Calendar,
  MapPin,
  User,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon
} from 'lucide-react';
import { DriveItem, PersonalVideo } from '../types/index.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';
import { getPersonalMediaCoverUrl } from '../utils/personalMediaUtils.js';

interface PersonalPhotoViewerModalProps {
  photo: PersonalVideo | null;
  photos: PersonalVideo[];
  allFiles?: DriveItem[];
  onClose: () => void;
  onSelectPhoto: (photo: PersonalVideo) => void;
  onToggleFavorite?: (id: string) => void;
  onEditPhoto?: (photo: PersonalVideo) => void;
  onDeletePhoto?: (id: string) => void;
}

export const PersonalPhotoViewerModal: React.FC<PersonalPhotoViewerModalProps> = ({
  photo,
  photos,
  allFiles = [],
  onClose,
  onSelectPhoto,
  onToggleFavorite,
  onEditPhoto,
  onDeletePhoto
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    setIsZoomed(false);
  }, [photo?.id]);

  const currentIdx = photo ? photos.findIndex(p => p.id === photo.id) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < photos.length - 1;

  const handlePrev = () => {
    if (hasPrev) onSelectPhoto(photos[currentIdx - 1]);
  };

  const handleNext = () => {
    if (hasNext) onSelectPhoto(photos[currentIdx + 1]);
  };

  useEffect(() => {
    if (!photo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) handlePrev();
      else if (e.key === 'ArrowRight' && hasNext) handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photo?.id, hasPrev, hasNext]);

  if (!photo) return null;

  const imageUrl =
    (photo.fileId ? resolveApiUrl(`/api/stream/${photo.fileId}`) : undefined) ||
    getPersonalMediaCoverUrl(photo, allFiles, resolveApiUrl) ||
    '';

  const linkedFile = photo.fileId ? allFiles.find(f => f.id === photo.fileId) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md text-white animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/70 border-b border-white/10 shrink-0 gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold truncate text-white">{photo.title}</h2>
              {photo.category && (
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase shrink-0">
                  {photo.category}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-400">
              {photos.length > 1 && (
                <span className="font-mono text-amber-300/90">
                  {currentIdx + 1} / {photos.length}
                </span>
              )}
              {photo.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{photo.date}</span>
                </span>
              )}
              {photo.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-400" />
                  <span>{photo.location}</span>
                </span>
              )}
              {photo.people && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-400" />
                  <span>{photo.people}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setIsZoomed(prev => !prev)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
            title={isZoomed ? 'Ajustar à tela' : 'Ampliar foto'}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(photo.id)}
              className={`p-2 rounded-xl transition-colors ${
                photo.isFavorite
                  ? 'bg-rose-600 text-white'
                  : 'bg-white/10 hover:bg-rose-600/80 text-gray-200'
              }`}
              title={photo.isFavorite ? 'Remover dos favoritos' : 'Favoritar foto'}
            >
              <Heart className={`w-4 h-4 ${photo.isFavorite ? 'fill-current' : ''}`} />
            </button>
          )}

          {imageUrl && (
            <a
              href={imageUrl}
              download={linkedFile?.name || `${photo.title}.jpg`}
              className="p-2 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-gray-200 transition-colors"
              title="Baixar Foto"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          {onEditPhoto && (
            <button
              onClick={() => onEditPhoto(photo)}
              className="p-2 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 text-gray-200 transition-colors"
              title="Editar detalhes"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}

          {onDeletePhoto && (
            <button
              onClick={() => {
                if (confirm(`Excluir a foto "${photo.title}" da biblioteca?`)) {
                  onDeletePhoto(photo.id);
                  if (hasNext) handleNext();
                  else if (hasPrev) handlePrev();
                  else onClose();
                }
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-600 text-gray-200 transition-colors"
              title="Excluir foto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors ml-1"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Canvas */}
      <div
        className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/15 backdrop-blur-md transition-all hover:scale-110 shadow-xl"
            title="Foto Anterior (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={photo.title}
            onClick={() => setIsZoomed(prev => !prev)}
            draggable={false}
            className={`rounded-xl shadow-2xl transition-transform duration-200 ${
              isZoomed
                ? 'max-w-none max-h-none cursor-zoom-out scale-100'
                : 'max-h-[calc(100vh-190px)] max-w-full object-contain cursor-zoom-in'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <ImageIcon className="w-12 h-12" />
            <span className="text-xs">Imagem indisponível</span>
          </div>
        )}

        {hasNext && (
          <button
            onClick={handleNext}
            className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-slate-950 text-white border border-white/15 backdrop-blur-md transition-all hover:scale-110 shadow-xl"
            title="Próxima Foto (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Description & Thumbnail Strip */}
      <div
        className="px-4 sm:px-6 py-3 bg-black/80 border-t border-white/10 space-y-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {(photo.description || (photo.tags && photo.tags.length > 0)) && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
            {photo.description && (
              <p className="line-clamp-1 text-gray-300">{photo.description}</p>
            )}
            {photo.tags && photo.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {photo.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-white/10 text-amber-200 text-[10px] font-semibold"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {photos.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {photos.map(item => {
              const thumbUrl =
                (item.fileId ? resolveApiUrl(`/api/stream/${item.fileId}`) : undefined) ||
                getPersonalMediaCoverUrl(item, allFiles, resolveApiUrl) ||
                '';
              const isActive = item.id === photo.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectPhoto(item)}
                  className={`relative w-14 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                    isActive
                      ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                      : 'border-transparent opacity-55 hover:opacity-100'
                  }`}
                  title={item.title}
                >
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
