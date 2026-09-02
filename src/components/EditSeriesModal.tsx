import React, { useState, useRef } from 'react';
import { Tv, X, Upload, Link as LinkIcon, Image as ImageIcon, Save, Check, Youtube, RotateCcw } from 'lucide-react';
import { SeriesShow, DriveItem } from '../types/index.js';

interface EditSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: SeriesShow | null;
  categories: string[];
  allFiles?: DriveItem[];
  onSave: (updated: SeriesShow) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'
];

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({
  isOpen,
  onClose,
  series,
  categories,
  allFiles = [],
  onSave,
  onAddCategory
}) => {
  if (!isOpen || !series) return null;

  const [title, setTitle] = useState(series.title);
  const [category, setCategory] = useState(series.category || 'Séries de TV');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [genre, setGenre] = useState(series.genre || '');
  const [network, setNetwork] = useState(series.network || '');
  const [year, setYear] = useState(series.year?.toString() || '');
  const [status, setStatus] = useState<'watching' | 'completed' | 'plan_to_watch'>(series.status || 'watching');
  const [description, setDescription] = useState(series.description || '');
  const [youtubeUrl, setYoutubeUrl] = useState(series.youtubeUrl || '');
  const [autoSyncDaily, setAutoSyncDaily] = useState(series.autoSyncDaily !== false);
  const [deletedCount, setDeletedCount] = useState((series.deletedEpisodeIds || []).length);
  const [coverImage, setCoverImage] = useState(series.coverImage || PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'upload' | 'url' | 'folder' | 'gallery'>('gallery');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const folderImageFiles = allFiles.filter(f => 
    f.parentId === series.folderId && 
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
        ...series,
        title: title.trim(),
        category,
        genre: genre.trim() || undefined,
        network: network.trim() || undefined,
        year: year ? parseInt(year, 10) || undefined : undefined,
        status,
        description: description.trim() || undefined,
        youtubeUrl: youtubeUrl.trim() || undefined,
        autoSyncDaily,
        deletedEpisodeIds: deletedCount === 0 ? [] : series.deletedEpisodeIds,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-600/10 via-indigo-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-500 flex items-center justify-center shadow-inner">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Editar Série / Anime</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atualize metadados e foto de capa</p>
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
            <div className="relative w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border-2 border-purple-500/40 shrink-0 bg-black/40 group">
              <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity p-2 text-center">
                <span>Capa Selecionada</span>
              </div>
            </div>

            {/* Core Info Fields */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Título da Série / Anime *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-purple-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-xs font-bold"
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
                    Streaming / Rede
                  </label>
                  <input
                    type="text"
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    placeholder="Ex: Netflix, HBO"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Gênero
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Ex: Shonen, Ficção"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="watching">Assistindo</option>
                    <option value="completed">Concluída</option>
                    <option value="plan_to_watch">Quero Assistir</option>
                  </select>
                </div>
              </div>
            </div>
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
              placeholder="Descreva a série..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* YouTube Playlist & Auto-Sync Section */}
          <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/20 dark:border-red-500/30 space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-red-600 text-white">
                <Youtube className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  Integração com YouTube Playlist
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Atualização automática diária e detecção de novos vídeos
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Link da Playlist / Canal do YouTube
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/playlist?list=... ou canal"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {youtubeUrl.trim() && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={autoSyncDaily}
                      onChange={(e) => setAutoSyncDaily(e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-700"
                    />
                    <span>Atualização diária automática (detectar novos vídeos uma vez por dia)</span>
                  </label>
                </div>
              )}

              {deletedCount > 0 && (
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 text-[11px] text-gray-600 dark:text-gray-400">
                  <span>🚫 {deletedCount} vídeo(s) excluído(s) da playlist (ignorados na sincronização)</span>
                  <button
                    type="button"
                    onClick={() => setDeletedCount(0)}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cover Art Selection Hub */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Alterar Foto de Capa
            </label>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700/60">
              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'gallery' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'upload' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PC</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'url' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL</span>
              </button>

              {folderImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverTab('folder')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    coverTab === 'folder' ? 'bg-white dark:bg-drive-darkSurface text-purple-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Pasta ({folderImageFiles.length})</span>
                </button>
              )}
            </div>

            {/* Tab: Gallery */}
            {coverTab === 'gallery' && (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all group ${
                      coverImage === cov ? 'border-purple-500 ring-2 ring-purple-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-purple-600/30 flex items-center justify-center">
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
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50 dark:bg-drive-darkBg/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-purple-500 mb-2 animate-bounce" />
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
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        coverImage === url ? 'border-purple-500 ring-2 ring-purple-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
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
