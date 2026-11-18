import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Video,
  Image as ImageIcon,
  X,
  Upload,
  Link as LinkIcon,
  Save,
  Check,
  Camera
} from 'lucide-react';
import { PersonalVideo, DriveItem } from '../types/index.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';
import {
  PERSONAL_PRESET_COVERS,
  isImageFileItem,
  isPersonalPhoto,
  isVideoFileItem
} from '../utils/personalMediaUtils.js';

interface EditPersonalVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: PersonalVideo | null;
  categories: string[];
  allFiles?: DriveItem[];
  onSave: (updated: PersonalVideo) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

export const EditPersonalVideoModal: React.FC<EditPersonalVideoModalProps> = ({
  isOpen,
  onClose,
  video,
  categories,
  allFiles = [],
  onSave,
  onAddCategory
}) => {
  const isPhoto = video ? isPersonalPhoto(video, allFiles) : false;

  const [title, setTitle] = useState(video?.title || '');
  const [category, setCategory] = useState(video?.category || 'Memórias & Momentos');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [date, setDate] = useState(video?.date || '');
  const [location, setLocation] = useState(video?.location || '');
  const [people, setPeople] = useState(video?.people || '');
  const [tagsInput, setTagsInput] = useState((video?.tags || []).join(', '));
  const [description, setDescription] = useState(video?.description || '');
  const [coverImage, setCoverImage] = useState(video?.coverImage || '');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'video_frame' | 'upload' | 'url' | 'folder' | 'gallery'>('video_frame');
  const [loading, setLoading] = useState(false);
  const [frameCapturedSuccess, setFrameCapturedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const targetVideoFile = useMemo(() => {
    if (!video || isPhoto) return null;
    if (video.fileId) {
      const match = allFiles.find(f => f.id === video.fileId && !f.isTrash);
      if (match && isVideoFileItem(match)) return match;
    }
    if (!video.folderId) return null;
    const folderVideos = allFiles.filter(f => f.parentId === video.folderId && !f.isTrash && isVideoFileItem(f));
    if (folderVideos.length === 1) return folderVideos[0];
    if (video.title) {
      const normTitle = video.title.toLowerCase().trim();
      const byName = folderVideos.find(f => {
        const cleanName = f.name.replace(/\.[^/.]+$/, '').toLowerCase().trim();
        return cleanName.includes(normTitle) || normTitle.includes(cleanName);
      });
      if (byName) return byName;
    }
    return null;
  }, [video, allFiles, isPhoto]);

  const folderImageFiles = useMemo(() => {
    if (!video?.folderId) return [];
    return allFiles.filter(f => f.parentId === video.folderId && !f.isTrash && isImageFileItem(f));
  }, [video?.folderId, allFiles]);

  useEffect(() => {
    if (!video) return;
    const itemIsPhoto = isPersonalPhoto(video, allFiles);
    setTitle(video.title || '');
    setCategory(video.category || 'Memórias & Momentos');
    setDate(video.date || '');
    setLocation(video.location || '');
    setPeople(video.people || '');
    setTagsInput((video.tags || []).join(', '));
    setDescription(video.description || '');
    setCoverImage(
      video.coverImage ||
        (itemIsPhoto && video.fileId ? `/api/stream/${video.fileId}` : '')
    );
    setCustomCoverUrl('');
    setFrameCapturedSuccess(false);
    setIsAddingNewCat(false);
    setNewCategoryName('');

    const hasVideoFile =
      !itemIsPhoto &&
      Boolean(
        (video.fileId && allFiles.some(f => f.id === video.fileId && !f.isTrash && isVideoFileItem(f))) ||
          (video.folderId && allFiles.some(f => f.parentId === video.folderId && !f.isTrash && isVideoFileItem(f)))
      );
    setCoverTab(itemIsPhoto ? 'upload' : hasVideoFile ? 'video_frame' : 'gallery');
  }, [video?.id]);

  if (!isOpen || !video) return null;

  const handleCaptureVideoFrame = () => {
    if (!previewVideoRef.current) return;
    try {
      const v = previewVideoRef.current;
      const vw = v.videoWidth || 640;
      const vh = v.videoHeight || 360;
      const scale = Math.min(1, 720 / vw);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCoverImage(dataUrl);
      setFrameCapturedSuccess(true);
      setTimeout(() => setFrameCapturedSuccess(false), 3000);
    } catch (err) {
      console.error('Error capturing video frame snapshot:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      await onAddCategory(newCategoryName.trim());
    }
    setCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingNewCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      let finalCover = coverImage;
      if (coverTab === 'url' && customCoverUrl.trim()) {
        finalCover = customCoverUrl.trim();
      }

      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      await onSave({
        ...video,
        mediaType: isPhoto ? 'photo' : 'video',
        title: title.trim(),
        category,
        date: date.trim() || undefined,
        location: location.trim() || undefined,
        people: people.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        description: description.trim() || undefined,
        coverImage: finalCover,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const previewCoverSrc = coverImage
    ? resolveApiUrl(coverImage)
    : isPhoto && video.fileId
      ? resolveApiUrl(`/api/stream/${video.fileId}`)
      : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
              {isPhoto ? <ImageIcon className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {isPhoto ? 'Editar Foto Pessoal' : 'Editar Vídeo Pessoal'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Atualize informações e capa desta memória
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* Cover & Main Fields Layout */}
          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            {/* Cover Preview (16:9) */}
            <div className="relative w-52 aspect-video rounded-2xl overflow-hidden shadow-xl border-2 border-amber-500/40 shrink-0 bg-slate-900 group flex items-center justify-center">
              {previewCoverSrc ? (
                <img src={previewCoverSrc} alt="Cover Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-amber-300/70">
                  <Video className="w-7 h-7" />
                  <span className="text-[10px] font-semibold">Sem capa ainda</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity p-2 text-center">
                <span>{isPhoto ? 'Foto da Memória' : 'Capa Selecionada'}</span>
              </div>
            </div>

            {/* Core Info Fields */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Título do Momento *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  {!isAddingNewCat ? (
                    <div className="flex gap-1">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200"
                        title="Nova categoria"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome"
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-amber-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(false)}
                        className="px-1.5 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Data do Evento
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Ex: 2024 ou Maio/2024"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Local / Cidade
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Gramado - RS"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Pessoas Presentes
                  </label>
                  <input
                    type="text"
                    value={people}
                    onChange={(e) => setPeople(e.target.value)}
                    placeholder="Ex: Família, Luiz"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Tags / Palavras-chave (separadas por vírgula)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ex: praia, férias, aniversário, 2024"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Descrição / Anotações
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a memória ou gravação..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selection Hub */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                {isPhoto ? 'Alterar Miniatura / Capa' : 'Alterar Foto de Capa'}
              </label>
              {isPhoto && video.fileId && (
                <button
                  type="button"
                  onClick={() => setCoverImage(`/api/stream/${video.fileId}`)}
                  className="text-[11px] font-semibold text-amber-500 hover:underline"
                >
                  Usar foto original
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700/60">
              {!isPhoto && targetVideoFile && (
                <button
                  type="button"
                  onClick={() => setCoverTab('video_frame')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[110px] ${
                    coverTab === 'video_frame'
                      ? 'bg-white dark:bg-drive-darkSurface text-amber-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Frame do Vídeo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[85px] ${
                  coverTab === 'upload'
                    ? 'bg-white dark:bg-drive-darkSurface text-amber-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PC</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[85px] ${
                  coverTab === 'url'
                    ? 'bg-white dark:bg-drive-darkSurface text-amber-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL</span>
              </button>

              {folderImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverTab('folder')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[85px] ${
                    coverTab === 'folder'
                      ? 'bg-white dark:bg-drive-darkSurface text-amber-500 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Pasta ({folderImageFiles.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[85px] ${
                  coverTab === 'gallery'
                    ? 'bg-white dark:bg-drive-darkSurface text-amber-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>
            </div>

            {/* Tab: Video Frame Snapshot */}
            {coverTab === 'video_frame' && targetVideoFile && (
              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Navegue pelo vídeo e capture qualquer cena como capa:</span>
                  </span>
                  {frameCapturedSuccess && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>Frame Capturado!</span>
                    </span>
                  )}
                </div>

                <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-gray-800 flex items-center justify-center">
                  <video
                    ref={previewVideoRef}
                    controls
                    playsInline
                    crossOrigin="anonymous"
                    src={resolveApiUrl(`/api/stream/${targetVideoFile.id}`)}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Pause na cena desejada e clique para definir como capa.
                  </p>
                  <button
                    type="button"
                    onClick={handleCaptureVideoFrame}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar Frame Atual como Capa</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Gallery */}
            {coverTab === 'gallery' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PERSONAL_PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all group ${
                      coverImage === cov ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Upload */}
            {coverTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50 dark:bg-drive-darkBg/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-amber-500 mb-2" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Clique para selecionar uma imagem do seu computador
                </span>
                <span className="text-[11px] text-gray-400 mt-1">PNG, JPG, WebP ou GIF</span>
              </div>
            )}

            {/* Tab: URL */}
            {coverTab === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => {
                    setCustomCoverUrl(e.target.value);
                    if (e.target.value.trim()) setCoverImage(e.target.value.trim());
                  }}
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            )}

            {/* Tab: Folder Images */}
            {coverTab === 'folder' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {folderImageFiles.map(imgFile => {
                  const url = `/api/stream/${imgFile.id}`;
                  return (
                    <button
                      type="button"
                      key={imgFile.id}
                      onClick={() => setCoverImage(url)}
                      className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all ${
                        coverImage === url ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={resolveApiUrl(url)} alt={imgFile.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
