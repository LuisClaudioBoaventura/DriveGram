import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Video,
  X,
  Folder,
  Sparkles,
  Image as ImageIcon,
  Calendar,
  MapPin,
  User,
  Tag,
  Upload,
  FolderPlus,
  Loader2,
  Trash2
} from 'lucide-react';
import { FolderItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewPersonalVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  categories: string[];
  onCreateVideo: (params: {
    folderId: string;
    title: string;
    category: string;
    date?: string;
    location?: string;
    people?: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
  }) => Promise<void>;
  onUploadMedia?: (params: {
    files: File[];
    subFolderName?: string;
    targetFolderId?: string;
    title?: string;
    category: string;
    date?: string;
    location?: string;
    people?: string;
    description?: string;
    tags?: string[];
  }) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

export const NewPersonalVideoModal: React.FC<NewPersonalVideoModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateVideo,
  onUploadMedia,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('personal-videos', folders);
  const [sourceMode, setSourceMode] = useState<'upload' | 'folder'>(onUploadMedia ? 'upload' : 'folder');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [albumMode, setAlbumMode] = useState<'root' | 'existing' | 'new'>('root');
  const [newAlbumName, setNewAlbumName] = useState('');

  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Memórias & Momentos');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [people, setPeople] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filePreviews = useMemo(() => {
    return selectedFiles.map(file => {
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic)$/i.test(file.name);
      return {
        file,
        isImage,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined
      };
    });
  }, [selectedFiles]);

  useEffect(() => {
    return () => {
      filePreviews.forEach(item => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [filePreviews]);

  if (!isOpen) return null;

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (!title && sourceMode === 'folder') {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setTitle(folder.name.replace(/^[🎬🎥🎞️📽️📹📼📷📸🖼️\s]+/, '').trim());
      }
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;
    setSelectedFiles(prev => [...prev, ...picked]);
    if (picked.length === 1 && !title) {
      setTitle(picked[0].name.replace(/\.[^/.]+$/, '').trim());
    }
    e.target.value = '';
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleCreateNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      await onAddCategory(newCategoryName.trim());
    }
    setCategory(newCategoryName.trim());
    setNewCategoryName('');
    setIsAddingNewCat(false);
  };

  const resetAndClose = () => {
    setSelectedFiles([]);
    setTitle('');
    setNewAlbumName('');
    setSelectedFolderId('');
    setDate('');
    setLocation('');
    setPeople('');
    setTagsInput('');
    setDescription('');
    setCustomCoverUrl('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (sourceMode === 'upload') {
      if (!onUploadMedia || selectedFiles.length === 0) return;
      setLoading(true);
      try {
        await onUploadMedia({
          files: selectedFiles,
          subFolderName: albumMode === 'new' && newAlbumName.trim() ? newAlbumName.trim() : undefined,
          targetFolderId: albumMode === 'existing' && selectedFolderId ? selectedFolderId : undefined,
          title: selectedFiles.length === 1 && title.trim() ? title.trim() : undefined,
          category,
          date: date.trim() || undefined,
          location: location.trim() || undefined,
          people: people.trim() || undefined,
          description: description.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined
        });
        resetAndClose();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!title.trim() || !selectedFolderId) return;

    setLoading(true);
    try {
      await onCreateVideo({
        folderId: selectedFolderId,
        title: title.trim(),
        category,
        date: date.trim() || undefined,
        location: location.trim() || undefined,
        people: people.trim() || undefined,
        description: description.trim() || undefined,
        coverImage: customCoverUrl.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined
      });
      resetAndClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const photoCount = selectedFiles.filter(
    f => f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|avif|heic)$/i.test(f.name)
  ).length;
  const videoCount = selectedFiles.length - photoCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-inner">
              {sourceMode === 'upload' ? <Upload className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Adicionar Foto / Vídeo Pessoal
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Envie fotos e gravações ou vincule uma pasta do Drive
              </p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        {onUploadMedia && (
          <div className="px-6 pt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setSourceMode('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                sourceMode === 'upload'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-gray-50 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Enviar Fotos / Vídeos</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('folder')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                sourceMode === 'folder'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-gray-50 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Pasta do Drive</span>
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {sourceMode === 'upload' ? (
            <>
              {/* File Drop / Picker */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/70 dark:bg-drive-darkBg/60"
                >
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-2">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Clique para selecionar fotos e/ou vídeos do dispositivo
                  </span>
                  <span className="text-[11px] text-gray-400 mt-1">
                    Suporta múltiplas fotos (JPG, PNG, WebP, HEIC) e vídeos (MP4, MOV, MKV, WebM)
                  </span>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      <span>
                        {selectedFiles.length} selecionado(s)
                        {photoCount > 0 ? ` • ${photoCount} foto${photoCount > 1 ? 's' : ''}` : ''}
                        {videoCount > 0 ? ` • ${videoCount} vídeo${videoCount > 1 ? 's' : ''}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedFiles([])}
                        className="text-rose-500 hover:underline"
                      >
                        Limpar lista
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                      {filePreviews.map((item, idx) => (
                        <div
                          key={`${item.file.name}-${idx}`}
                          className="relative group rounded-xl overflow-hidden aspect-video bg-slate-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center"
                        >
                          {item.isImage && item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-2 text-center">
                              <Video className="w-4 h-4 text-amber-400 mb-1" />
                              <span className="text-[9px] text-gray-300 line-clamp-1 w-full">
                                {item.file.name}
                              </span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSelectedFile(idx)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-black/75 hover:bg-rose-600 text-white opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remover"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Destination Folder / Album */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Destino em "{rootFolder ? rootFolder.name : 'Vídeos e Mídias Pessoais'}"</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAlbumMode('root')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                      albumMode === 'root'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300'
                        : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    Pasta Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlbumMode('new')}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                      albumMode === 'new'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300'
                        : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    + Novo Álbum
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlbumMode('existing')}
                    disabled={eligibleFolders.length === 0}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-colors disabled:opacity-40 ${
                      albumMode === 'existing'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-300'
                        : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-gray-800 text-gray-500'
                    }`}
                  >
                    Subpasta Existente
                  </button>
                </div>

                {albumMode === 'new' && (
                  <input
                    type="text"
                    value={newAlbumName}
                    onChange={(e) => setNewAlbumName(e.target.value)}
                    placeholder="Nome do novo álbum/pasta (ex: Viagem Gramado 2026)"
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-500/60 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                )}

                {albumMode === 'existing' && (
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="">-- Selecione uma subpasta --</option>
                    {eligibleFolders.map(f => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedFiles.length <= 1 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Título (opcional — usa nome do arquivo se vazio)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Pôr do Sol na Praia"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              {/* Source Folder Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pasta de Origem no Drive *</span>
                  </label>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                    📁 {rootFolder ? rootFolder.name : 'Vídeos e Mídias Pessoais'}
                  </span>
                </div>
                <select
                  value={selectedFolderId}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Vídeos e Mídias Pessoais'}" --</option>
                  {eligibleFolders.map(f => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-400 mt-1 block">
                  Os vídeos (.mp4, .mov, etc.) e fotos (.jpg, .png, etc.) desta pasta serão catalogados.
                </span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Título do Momento / Álbum *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Viagem para Gramado - Dia 1 ou Aniversário 30 anos"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Optional Custom Cover URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Link de Capa Personalizada (opcional — vídeos extraem capa automaticamente)</span>
                </label>
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://exemplo.com/capa.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Categoria
            </label>
            {!isAddingNewCat ? (
              <div className="flex gap-1.5">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCat(true)}
                  className="px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 transition-colors shrink-0"
                  title="Nova categoria"
                >
                  + Nova
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nome da categoria"
                  className="flex-1 px-3 py-2 rounded-xl border border-amber-500 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCreateNewCategory}
                  className="px-3 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCat(false)}
                  className="px-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Data do Evento</span>
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Ex: Maio/2024 ou 25/12/2023"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Local / Cidade</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Gramado - RS"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* People & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-500" />
                <span>Pessoas Presentes</span>
              </label>
              <input
                type="text"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                placeholder="Ex: Luiz, Família, Amigos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Tags (separadas por vírgula)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: férias, praia, 2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Descrição / Anotações
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas ou memórias sobre este momento..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={resetAndClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                (sourceMode === 'upload'
                  ? selectedFiles.length === 0
                  : !title.trim() || !selectedFolderId)
              }
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>
                {loading
                  ? 'Enviando...'
                  : sourceMode === 'upload'
                    ? `Enviar e Catalogar (${selectedFiles.length})`
                    : 'Catalogar Momento'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
