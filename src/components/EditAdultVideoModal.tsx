import React, { useState, useRef } from 'react';
import { Film, X, Upload, Link as LinkIcon, Image as ImageIcon, Save, Check, Flame, LockKeyhole, Camera, Play, Pause, RotateCcw } from 'lucide-react';
import { AdultVideo, DriveItem } from '../types/index.js';

interface EditAdultVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: AdultVideo | null;
  categories: string[];
  allFiles?: DriveItem[];
  onSave: (updated: AdultVideo) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60'
];

export const EditAdultVideoModal: React.FC<EditAdultVideoModalProps> = ({
  isOpen,
  onClose,
  video,
  categories,
  allFiles = [],
  onSave,
  onAddCategory
}) => {
  if (!isOpen || !video) return null;

  const [title, setTitle] = useState(video.title);
  const [category, setCategory] = useState(video.category || 'Longas-Metragens');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [studio, setStudio] = useState(video.studio || '');
  const [performers, setPerformers] = useState(video.performers || '');
  const [aka, setAka] = useState(video.aka || '');
  const [year, setYear] = useState(video.year?.toString() || '');
  const [description, setDescription] = useState(video.description || '');
  const [coverImage, setCoverImage] = useState(video.coverImage || PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'upload' | 'url' | 'folder' | 'gallery' | 'video_frame'>('video_frame');
  const [loading, setLoading] = useState(false);
  const [frameCapturedSuccess, setFrameCapturedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const targetVideoFile = allFiles.find(f => 
    f.id === video.fileId || 
    (video.folderId && f.parentId === video.folderId && (f.type === 'video' || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'].includes(f.extension.toLowerCase())))
  );

  const handleCaptureVideoFrame = () => {
    if (!previewVideoRef.current) return;
    try {
      const v = previewVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = v.videoWidth || 640;
      canvas.height = v.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCoverImage(dataUrl);
      setFrameCapturedSuccess(true);
      setTimeout(() => setFrameCapturedSuccess(false), 3000);
    } catch (err) {
      console.error('Error capturing video frame snapshot:', err);
    }
  };

  const folderImageFiles = allFiles.filter(f => 
    f.parentId === video.folderId && 
    (f.type === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(f.extension.toLowerCase()))
  );

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

      await onSave({
        ...video,
        title: title.trim(),
        category,
        studio: studio.trim() || undefined,
        performers: performers.trim() || undefined,
        aka: aka.trim() || undefined,
        year: year ? parseInt(year, 10) || undefined : undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-rose-600/15 via-red-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-500 flex items-center justify-center shadow-inner">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Editar Item • Red Locker (+18)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atualize dados, elenco e foto de capa no Red Locker</p>
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
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Cover Preview */}
            <div className="relative w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border-2 border-rose-500/40 shrink-0 bg-black/40 group">
              <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity p-2 text-center">
                <span>Capa Selecionada</span>
              </div>
            </div>

            {/* Core Info Fields */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Título da Produção *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Estúdio / Produtora
                  </label>
                  <input
                    type="text"
                    value={studio}
                    onChange={(e) => setStudio(e.target.value)}
                    placeholder="Ex: Private, etc."
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Ano de Lançamento
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Elenco / Performers
                  </label>
                  <input
                    type="text"
                    value={performers}
                    onChange={(e) => setPerformers(e.target.value)}
                    placeholder="Ex: Nome 1, Nome 2"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  {!isAddingNewCat ? (
                    <div className="flex gap-1">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200"
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
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-rose-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-2.5 py-1 rounded-xl bg-rose-600 text-white text-xs font-bold"
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
              </div>
            </div>
          </div>

          {/* AKA (Also Known As / Nomes Alternativos) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
              <span>AKA / Nomes Alternativos (Performer ou Produtora)</span>
              <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
            </label>
            <input
              type="text"
              value={aka}
              onChange={(e) => setAka(e.target.value)}
              placeholder="Ex: Nomes artísticos anteriores, pseudônimos, outros apelidos ou nomes da produtora..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Sinopse / Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a produção..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selection Hub */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Alterar Foto de Capa (Poster 2:3)
            </label>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700/60 flex-wrap">
              {targetVideoFile && (
                <button
                  type="button"
                  onClick={() => setCoverTab('video_frame')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[110px] ${
                    coverTab === 'video_frame' ? 'bg-white dark:bg-drive-darkSurface text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Frame do Vídeo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[80px] ${
                  coverTab === 'gallery' ? 'bg-white dark:bg-drive-darkSurface text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[80px] ${
                  coverTab === 'upload' ? 'bg-white dark:bg-drive-darkSurface text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PC</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[80px] ${
                  coverTab === 'url' ? 'bg-white dark:bg-drive-darkSurface text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL</span>
              </button>

              {folderImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverTab('folder')}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 min-w-[80px] ${
                    coverTab === 'folder' ? 'bg-white dark:bg-drive-darkSurface text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Pasta ({folderImageFiles.length})</span>
                </button>
              )}
            </div>

            {/* Tab: Video Frame Snapshot */}
            {coverTab === 'video_frame' && targetVideoFile && (
              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-rose-500" />
                    <span>Navegue pelo vídeo e capture qualquer cena como capa:</span>
                  </span>
                  {frameCapturedSuccess && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>Frame Capturado com Sucesso!</span>
                    </span>
                  )}
                </div>

                {/* Video Player Box */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-black shadow-inner border border-gray-800 flex items-center justify-center">
                  <video
                    ref={previewVideoRef}
                    controls
                    playsInline
                    src={`/api/stream/${targetVideoFile.id}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Snapshot Capture Action Button */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    💡 Dica: Pause na cena perfeita e clique no botão para aplicar como capa.
                  </p>
                  <button
                    type="button"
                    onClick={handleCaptureVideoFrame}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capturar Frame Atual como Capa</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab: Gallery */}
            {coverTab === 'gallery' && (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all group ${
                      coverImage === cov ? 'border-rose-500 ring-2 ring-rose-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-rose-600/30 flex items-center justify-center">
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
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50 dark:bg-drive-darkBg/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-rose-500 mb-2 animate-bounce" />
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
                  placeholder="https://exemplo.com/poster.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            )}

            {/* Tab: Folder Images */}
            {coverTab === 'folder' && (
              <div className="grid grid-cols-6 gap-2">
                {folderImageFiles.map(imgFile => {
                  const url = `/api/stream/${imgFile.id}`;
                  return (
                    <button
                      type="button"
                      key={imgFile.id}
                      onClick={() => setCoverImage(url)}
                      className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all ${
                        coverImage === url ? 'border-rose-500 ring-2 ring-rose-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={imgFile.name} className="w-full h-full object-cover" />
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
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
