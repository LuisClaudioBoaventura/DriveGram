import React, { useState } from 'react';
import { Tv, X, Folder, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { FolderItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  categories: string[];
  onCreateSeries: (params: {
    folderId: string;
    title: string;
    category: string;
    genre?: string;
    network?: string;
    year?: string | number;
    description?: string;
    coverImage?: string;
  }) => Promise<void>;
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

export const NewSeriesModal: React.FC<NewSeriesModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateSeries,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('series', folders);
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Séries de TV');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [genre, setGenre] = useState('');
  const [network, setNetwork] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (!title) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setTitle(folder.name.replace(/^[📺🍿🎬\s]+/, '').trim());
      }
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFolderId) return;

    setLoading(true);
    try {
      await onCreateSeries({
        folderId: selectedFolderId,
        title: title.trim(),
        category,
        genre: genre.trim() || undefined,
        network: network.trim() || undefined,
        year: year ? parseInt(year, 10) || undefined : undefined,
        description: description.trim() || undefined,
        coverImage: isCustomCover && customCoverUrl.trim() ? customCoverUrl.trim() : coverImage
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-600/10 via-indigo-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-500 flex items-center justify-center shadow-inner">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Nova Série / Anime</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vincule uma pasta com temporadas e episódios</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Source Folder Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-purple-500" />
                <span>Pasta da Série no Drive *</span>
              </label>
              <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                📁 {rootFolder ? rootFolder.name : 'Séries e Animes'}
              </span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Séries e Animes'}" --</option>
              {eligibleFolders.map(f => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Subpastas serão organizadas como Temporadas e os vídeos como Episódios numerados.
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Nome da Série / Anime *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Breaking Bad ou Attack on Titan"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Category & Network */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Categoria
              </label>
              {!isAddingNewCat ? (
                <div className="flex gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(true)}
                    className="px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nome"
                    className="flex-1 px-3 py-2 rounded-xl border border-purple-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
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

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Streaming / Distribuidora
              </label>
              <input
                type="text"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="Ex: Netflix, Crunchyroll, HBO"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Genre & Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Gênero / Tags
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Ex: Shonen, Drama, Suspense"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Ano de Estreia
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Sinopse / Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sinopse da série..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
                <span>Foto de Capa / Pôster</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomCover(!isCustomCover)}
                className="text-[11px] text-purple-500 hover:underline font-normal"
              >
                {isCustomCover ? 'Escolher da Galeria' : 'Inserir Link Customizado'}
              </button>
            </label>

            {isCustomCover ? (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="https://exemplo.com/series_poster.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            ) : (
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
              disabled={loading || !title.trim() || !selectedFolderId}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Criando...' : 'Criar Série'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
