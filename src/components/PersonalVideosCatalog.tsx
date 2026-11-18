import React, { useState, useRef, useMemo } from 'react';
import {
  Video,
  Play,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  User,
  Heart,
  Tag,
  RotateCcw,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Camera,
  Maximize2,
  Upload,
  Loader2,
  Sparkles
} from 'lucide-react';
import { PersonalVideo, FolderItem, DriveItem } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { PersonalPhotoViewerModal } from './PersonalPhotoViewerModal.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';
import {
  getPersonalMediaCoverUrl,
  isPersonalPhoto
} from '../utils/personalMediaUtils.js';

interface PersonalVideosCatalogProps {
  videos: PersonalVideo[];
  categories: string[];
  folders: FolderItem[];
  allFiles?: DriveItem[];
  capturingCoverIds?: string[];
  onSelectVideo: (video: PersonalVideo) => void;
  onOpenNewModal?: () => void;
  onUploadQuickFiles?: (files: File[]) => Promise<void>;
  onEditVideo?: (video: PersonalVideo) => void;
  onDeleteVideo?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onExtractCover?: (video: PersonalVideo) => Promise<string | null>;
  onSyncRootFolder?: () => Promise<{ importedCount: number; updatedCount: number; totalPersonalVideos: number } | void>;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const PersonalVideosCatalog: React.FC<PersonalVideosCatalogProps> = ({
  videos,
  categories,
  allFiles = [],
  capturingCoverIds = [],
  onSelectVideo,
  onOpenNewModal,
  onUploadQuickFiles,
  onEditVideo,
  onDeleteVideo,
  onToggleFavorite,
  onExtractCover,
  onSyncRootFolder,
  onShowToast
}) => {
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'photo'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'favorites' | 'watching' | 'completed'>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isDragOverCatalog, setIsDragOverCatalog] = useState(false);
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});

  const quickPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleSync = async () => {
    if (!onSyncRootFolder || isSyncing) return;
    setIsSyncing(true);
    onShowToast?.('⚡ Varrendo pasta Vídeos e Mídias Pessoais e sincronizando vídeos e fotos...', 'info');
    try {
      const res = await onSyncRootFolder();
      if (res && res.importedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.importedCount} novo(s) item(ns) importado(s)!`, 'success');
      } else if (res && res.updatedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.updatedCount} item(ns) atualizado(s)!`, 'success');
      } else {
        onShowToast?.('✅ Catálogo já está 100% atualizado com o Drive!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar pastas de mídias pessoais:', err);
      onShowToast?.('Erro ao sincronizar pastas de Vídeos e Mídias Pessoais.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleQuickFilesUpload = async (fileList: File[]) => {
    if (!onUploadQuickFiles || fileList.length === 0 || isUploadingPhotos) return;
    setIsUploadingPhotos(true);
    try {
      await onUploadQuickFiles(fileList);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleCatalogDrop = async (e: React.DragEvent) => {
    if (!onUploadQuickFiles) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCatalog(false);

    const dropped = Array.from(e.dataTransfer.files || []).filter(f => {
      const isImg = f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic)$/i.test(f.name);
      const isVid = f.type.startsWith('video/') || /\.(mp4|mkv|webm|mov|avi|m4v|ts|flv|wmv)$/i.test(f.name);
      return isImg || isVid;
    });

    if (dropped.length > 0) {
      await handleQuickFilesUpload(dropped);
    } else {
      onShowToast?.('Solte arquivos de foto ou vídeo suportados.', 'warning');
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    mediaFilter !== 'all' ||
    filterStatus !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setMediaFilter('all');
    setFilterStatus('all');
  };

  const videosOnlyCount = useMemo(
    () => videos.filter(v => !isPersonalPhoto(v, allFiles)).length,
    [videos, allFiles]
  );
  const photosOnlyCount = useMemo(
    () => videos.filter(v => isPersonalPhoto(v, allFiles)).length,
    [videos, allFiles]
  );
  const favoritesCount = useMemo(() => videos.filter(v => v.isFavorite).length, [videos]);
  const inProgressCount = useMemo(
    () => videos.filter(v => !isPersonalPhoto(v, allFiles) && (v.lastPositionSeconds || 0) > 0 && !v.isCompleted).length,
    [videos, allFiles]
  );
  const completedCount = useMemo(
    () => videos.filter(v => !isPersonalPhoto(v, allFiles) && !!v.isCompleted).length,
    [videos, allFiles]
  );

  const filteredItems = useMemo(() => {
    return videos.filter(item => {
      const isPhoto = isPersonalPhoto(item, allFiles);

      if (mediaFilter === 'video' && isPhoto) return false;
      if (mediaFilter === 'photo' && !isPhoto) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.location && item.location.toLowerCase().includes(q)) ||
          (item.people && item.people.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(q)));

        if (!matchSearch) return false;
      }

      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      if (filterStatus === 'favorites' && !item.isFavorite) return false;
      if (filterStatus === 'completed' && (isPhoto || !item.isCompleted)) return false;
      if (filterStatus === 'watching' && (isPhoto || !((item.lastPositionSeconds || 0) > 0) || item.isCompleted)) {
        return false;
      }

      return true;
    });
  }, [videos, allFiles, mediaFilter, searchQuery, selectedCategory, filterStatus]);

  const filteredPhotos = useMemo(
    () => filteredItems.filter(item => isPersonalPhoto(item, allFiles)),
    [filteredItems, allFiles]
  );

  const viewingPhoto = useMemo(
    () => (viewingPhotoId ? videos.find(v => v.id === viewingPhotoId) || null : null),
    [viewingPhotoId, videos]
  );

  const featuredItem =
    videos.find(v => !isPersonalPhoto(v, allFiles) && (v.lastPositionSeconds || 0) > 0 && !v.isCompleted) ||
    videos.find(v => v.isFavorite) ||
    videos[0];

  const featuredIsPhoto = featuredItem ? isPersonalPhoto(featuredItem, allFiles) : false;
  const featuredCoverUrl = featuredItem
    ? getPersonalMediaCoverUrl(featuredItem, allFiles, resolveApiUrl)
    : undefined;
  const featuredIsCapturing = featuredItem ? capturingCoverIds.includes(featuredItem.id) : false;

  const handleOpenItem = (item: PersonalVideo) => {
    if (isPersonalPhoto(item, allFiles)) {
      setViewingPhotoId(item.id);
    } else {
      onSelectVideo(item);
    }
  };

  return (
    <div
      className={`w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-3 sm:p-6 space-y-6 relative transition-colors ${
        isDragOverCatalog ? 'ring-2 ring-inset ring-amber-500 bg-amber-500/5' : ''
      }`}
      onDragOver={(e) => {
        if (!onUploadQuickFiles || !e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        e.stopPropagation();
        if (!isDragOverCatalog) setIsDragOverCatalog(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOverCatalog(false);
      }}
      onDrop={handleCatalogDrop}
    >
      {/* Hidden multi-photo quick picker */}
      <input
        ref={quickPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (e) => {
          const picked = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          if (picked.length > 0) {
            await handleQuickFilesUpload(picked);
          }
        }}
      />

      {isDragOverCatalog && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="px-8 py-6 rounded-3xl bg-slate-900/95 border-2 border-dashed border-amber-400 text-center text-white shadow-2xl space-y-2">
            <Upload className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
            <p className="text-sm font-bold">Solte fotos ou vídeos aqui</p>
            <p className="text-xs text-amber-200/80">
              Serão enviados para "Vídeos e Mídias Pessoais" e catalogados automaticamente
            </p>
          </div>
        </div>
      )}

      {/* Redesigned Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-900 via-stone-900 to-slate-950 p-5 sm:p-6 lg:p-7 text-white shadow-2xl relative overflow-hidden border border-amber-500/30 shrink-0">
        <div className="absolute -right-12 -top-12 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-[0.07] pointer-events-none text-amber-200">
          <Camera className="w-64 h-64 sm:w-72 sm:h-72" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 lg:gap-6">
          {featuredItem ? (
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 flex-1 min-w-0">
              {/* 16:9 Media Spotlight Preview */}
              <div
                onClick={() => handleOpenItem(featuredItem)}
                className="relative w-full max-w-[280px] sm:w-56 md:w-64 lg:w-60 xl:w-72 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-amber-400/35 ring-1 ring-white/10 shrink-0 bg-slate-900/90 group cursor-pointer"
              >
                {featuredCoverUrl && !failedCoverIds[featuredItem.id] ? (
                  <img
                    src={featuredCoverUrl}
                    alt={featuredItem.title}
                    draggable={false}
                    onError={() => setFailedCoverIds(prev => ({ ...prev, [featuredItem.id]: true }))}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-950/80 via-stone-900 to-slate-950 text-amber-300/80 p-3 text-center">
                    {featuredIsCapturing ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin mb-1.5 text-amber-400" />
                        <span className="text-[11px] font-semibold">Gerando capa do vídeo...</span>
                      </>
                    ) : featuredIsPhoto ? (
                      <>
                        <ImageIcon className="w-8 h-8 mb-1 text-amber-400/80" />
                        <span className="text-[11px] font-semibold line-clamp-1">{featuredItem.title}</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-8 h-8 mb-1 text-amber-400/80" />
                        <span className="text-[11px] font-semibold line-clamp-1">{featuredItem.title}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Media type pill */}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-amber-200 text-[10px] font-bold uppercase flex items-center gap-1 border border-white/10">
                  {featuredIsPhoto ? <ImageIcon className="w-3 h-3 text-amber-400" /> : <Video className="w-3 h-3 text-amber-400" />}
                  <span>{featuredIsPhoto ? 'Foto' : 'Vídeo'}</span>
                </span>

                {/* Hover trigger */}
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/40">
                    {featuredIsPhoto ? (
                      <Maximize2 className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    )}
                  </div>
                </div>
              </div>

              {/* Media Info */}
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-200 text-[11px] font-bold uppercase tracking-wider border border-amber-400/30 max-w-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">
                    Vídeos & Fotos Pessoais • {videos.length} {videos.length === 1 ? 'Momento' : 'Momentos'}
                  </span>
                </div>

                <h1
                  title={featuredItem.title}
                  className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm"
                >
                  {featuredItem.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-amber-100/90 font-medium">
                  {featuredItem.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>{featuredItem.date}</span>
                    </span>
                  )}
                  {featuredItem.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>{featuredItem.location}</span>
                    </span>
                  )}
                  {featuredItem.people && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>{featuredItem.people}</span>
                    </span>
                  )}
                  {featuredItem.category && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-amber-200 text-[10px] font-bold">
                      {featuredItem.category}
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-50/80 line-clamp-2 max-w-xl leading-relaxed">
                  {featuredItem.description || 'Reviva viagens, reuniões familiares, fotos especiais e gravações salvas com segurança no seu Drive.'}
                </p>

                <div className="pt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    onClick={() => handleOpenItem(featuredItem)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                  >
                    {featuredIsPhoto ? (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Ver Foto</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-amber-600 shrink-0" />
                        <span>{(featuredItem.lastPositionSeconds || 0) > 0 ? 'Continuar Assistindo' : 'Assistir Agora'}</span>
                      </>
                    )}
                  </button>

                  {onUploadQuickFiles && (
                    <button
                      onClick={() => quickPhotoInputRef.current?.click()}
                      disabled={isUploadingPhotos}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-black/15 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      title="Enviar uma ou mais fotos direto para esta biblioteca"
                    >
                      {isUploadingPhotos ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{isUploadingPhotos ? 'Enviando...' : 'Adicionar Fotos'}</span>
                    </button>
                  )}

                  {onOpenNewModal && (
                    <button
                      onClick={onOpenNewModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Adicionar Mídia</span>
                    </button>
                  )}

                  {onSyncRootFolder && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/35 text-amber-100 hover:text-white text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      title="Escanear e sincronizar vídeos e fotos da pasta Vídeos e Mídias Pessoais"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-200 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 z-10 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md text-amber-200 text-[11px] font-bold uppercase tracking-wider border border-amber-400/30">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Vídeos & Fotos Pessoais</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight drop-shadow-sm">
                Memórias, Fotos & Gravações
              </h1>

              <p className="text-xs sm:text-sm text-amber-100/85 leading-relaxed">
                Guarde vídeos pessoais, viagens, eventos em família e álbuns de fotos na sua nuvem do Telegram com capas automáticas e visualização instantânea.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2.5">
                {onUploadQuickFiles && (
                  <button
                    onClick={() => quickPhotoInputRef.current?.click()}
                    disabled={isUploadingPhotos}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingPhotos ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{isUploadingPhotos ? 'Enviando...' : 'Adicionar Fotos'}</span>
                  </button>
                )}

                {onOpenNewModal && (
                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition-all hover:scale-[1.03] active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Vídeo / Pasta</span>
                  </button>
                )}

                {onSyncRootFolder && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/35 text-amber-100 text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-amber-200 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Compact 2x2 Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 w-full lg:w-[220px] xl:w-[236px] shrink-0 z-10">
            <div className="px-3 py-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <Video className="w-4 h-4 text-amber-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{videosOnlyCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold tracking-wide whitespace-nowrap">Vídeos</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <ImageIcon className="w-4 h-4 text-sky-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{photosOnlyCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold tracking-wide whitespace-nowrap">Fotos</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <Heart className="w-4 h-4 text-rose-300 mb-1 fill-current shrink-0" />
              <span className="text-base font-black leading-none mb-1">{favoritesCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold tracking-wide whitespace-nowrap">Favoritos</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{completedCount}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold tracking-wide whitespace-nowrap">Assistidos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Standardized Primary Filters & Search Bar */}
      <div className="space-y-3 pb-2 border-b border-gray-200 dark:border-drive-darkBorder">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Media Type & Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 scrollbar-none">
            <button
              onClick={() => {
                setMediaFilter('all');
                setFilterStatus('all');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                mediaFilter === 'all' && filterStatus === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              Todos ({videos.length})
            </button>

            <button
              onClick={() => setMediaFilter(prev => prev === 'video' ? 'all' : 'video')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                mediaFilter === 'video'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Vídeos ({videosOnlyCount})</span>
            </button>

            <button
              onClick={() => setMediaFilter(prev => prev === 'photo' ? 'all' : 'photo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                mediaFilter === 'photo'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Fotos ({photosOnlyCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus(prev => prev === 'favorites' ? 'all' : 'favorites')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'favorites'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filterStatus === 'favorites' ? 'fill-current' : 'text-rose-500'}`} />
              <span>Favoritos ({favoritesCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus(prev => prev === 'watching' ? 'all' : 'watching')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'watching'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Assistindo ({inProgressCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus(prev => prev === 'completed' ? 'all' : 'completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Assistidos ({completedCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, local, pessoas ou tags..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
          </div>
        </div>

        {/* Secondary Category Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-white dark:bg-drive-darkSurface text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-drive-darkBorder px-2.5 py-1.5 rounded-xl text-xs shadow-sm">
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-900 text-gray-200 hover:text-white text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Grid (16:9 Cards for Videos & Photos) */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => {
            const isPhoto = isPersonalPhoto(item, allFiles);
            const isWatched = !isPhoto && item.isCompleted;
            const hasProgress = !isPhoto && (item.lastPositionSeconds || 0) > 0 && !isWatched;
            const coverUrl = getPersonalMediaCoverUrl(item, allFiles, resolveApiUrl);
            const isCapturingCover = capturingCoverIds.includes(item.id);
            const hasLoadError = !!failedCoverIds[item.id];
            const progressPercent =
              hasProgress && item.durationSeconds && item.durationSeconds > 0
                ? Math.min(100, Math.round(((item.lastPositionSeconds || 0) / item.durationSeconds) * 100))
                : 0;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-amber-500/50 hover:shadow-xl transition-all duration-300"
              >
                {/* 16:9 Thumbnail */}
                <div
                  onClick={() => handleOpenItem(item)}
                  className="relative aspect-video w-full overflow-hidden bg-slate-900 cursor-pointer select-none flex items-center justify-center"
                >
                  {coverUrl && !hasLoadError ? (
                    <img
                      src={coverUrl}
                      alt={item.title}
                      draggable={false}
                      onError={() => setFailedCoverIds(prev => ({ ...prev, [item.id]: true }))}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-950/70 via-stone-900 to-slate-950 text-amber-300/80 p-3 text-center">
                      {isCapturingCover ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin mb-1 text-amber-400" />
                          <span className="text-[10px] font-semibold">Gerando capa...</span>
                        </>
                      ) : isPhoto ? (
                        <>
                          <ImageIcon className="w-7 h-7 mb-1 text-amber-400/75" />
                          <span className="text-[10px] text-gray-300 line-clamp-1 px-2">{item.title}</span>
                        </>
                      ) : (
                        <>
                          <Video className="w-7 h-7 mb-1 text-amber-400/75" />
                          <span className="text-[10px] text-gray-300 line-clamp-1 px-2">{item.title}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 max-w-[78%]">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[9px] font-black uppercase shadow truncate">
                      {item.category || 'Pessoal'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-black/75 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-0.5">
                      {isPhoto ? <ImageIcon className="w-2.5 h-2.5 text-sky-300" /> : <Video className="w-2.5 h-2.5 text-amber-300" />}
                      <span>{isPhoto ? 'Foto' : 'Vídeo'}</span>
                    </span>
                  </div>

                  {/* Favorite Button */}
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-20 ${
                        item.isFavorite
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                          : 'bg-black/60 text-white opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-rose-600'
                      }`}
                      title={item.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  {/* Hover Action Trigger */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                    <div className="w-11 h-11 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/50">
                      {isPhoto ? (
                        <Maximize2 className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      )}
                    </div>
                  </div>

                  {/* Duration Badge (bottom-left) */}
                  {!isPhoto && item.duration && item.duration !== '00:00' && (
                    <span className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-mono">
                      {item.duration}
                    </span>
                  )}

                  {/* Action Buttons (bottom-right) */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {!isPhoto && !coverUrl && onExtractCover && item.fileId && !isCapturingCover && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExtractCover(item);
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                        title="Gerar capa a partir do vídeo"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {(() => {
                      const targetFile = allFiles?.find(f => f.id === item.fileId);
                      if (!targetFile) return null;
                      if (isPhoto) {
                        return (
                          <a
                            href={resolveApiUrl(`/api/stream/${targetFile.id}`)}
                            download={targetFile.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                            title="Baixar Foto"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        );
                      }
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadTargetFile(targetFile);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                          title="Baixar Vídeo para Cache Local"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      );
                    })()}

                    {onEditVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditVideo(item);
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-amber-500 hover:text-slate-950 text-white shadow transition-colors"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteVideo && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir "${item.title}" da biblioteca?`)) {
                            onDeleteVideo(item.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Watch progress bar */}
                  {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Info Card Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                      {item.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{item.date}</span>
                        </span>
                      )}
                      {!isPhoto && item.duration && item.duration !== '00:00' && <span>{item.duration}</span>}
                    </div>

                    <h3
                      onClick={() => handleOpenItem(item)}
                      className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-amber-500 cursor-pointer transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h3>

                    {item.location && (
                      <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        <span>{item.location}</span>
                      </p>
                    )}

                    {item.people && (
                      <p className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                        <User className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                        <span>{item.people}</span>
                      </p>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-[10px]">
                    {isPhoto ? (
                      <span className="flex items-center gap-1 text-sky-500 dark:text-sky-400 font-bold">
                        <ImageIcon className="w-3 h-3" />
                        <span>Foto</span>
                      </span>
                    ) : isWatched ? (
                      <span className="flex items-center gap-1 text-emerald-500 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Assistido</span>
                      </span>
                    ) : hasProgress ? (
                      <span className="text-amber-500 font-bold">
                        Continuar
                      </span>
                    ) : (
                      <span className="text-gray-400 font-mono">
                        Disponível
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            {mediaFilter === 'photo' ? <ImageIcon className="w-8 h-8" /> : <Video className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {hasActiveFilters
                ? 'Nenhum momento encontrado'
                : 'Nenhuma foto ou vídeo pessoal catalogado'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
              {hasActiveFilters
                ? 'Nenhum item corresponde aos filtros selecionados.'
                : 'Envie fotos ou vídeos diretamente, arraste arquivos para cá ou sincronize sua pasta no Drive.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            {onUploadQuickFiles && (
              <button
                onClick={() => quickPhotoInputRef.current?.click()}
                disabled={isUploadingPhotos}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Adicionar Fotos</span>
              </button>
            )}
            {onOpenNewModal && (
              <button
                onClick={onOpenNewModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 dark:bg-white/10 hover:bg-gray-800 dark:hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Vídeo / Pasta</span>
              </button>
            )}
            {onSyncRootFolder && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pastas'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Photo Lightbox Viewer */}
      <PersonalPhotoViewerModal
        photo={viewingPhoto}
        photos={filteredPhotos}
        allFiles={allFiles}
        onClose={() => setViewingPhotoId(null)}
        onSelectPhoto={(p) => setViewingPhotoId(p.id)}
        onToggleFavorite={onToggleFavorite}
        onEditPhoto={onEditVideo}
        onDeletePhoto={onDeleteVideo}
      />

      {/* Video Download Modal */}
      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}
    </div>
  );
};
