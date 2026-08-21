import React, { useState } from 'react';
import { Film, X, Folder, Sparkles, Image as ImageIcon, Check } from 'lucide-react';
import { FolderItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  categories: string[];
  onCreateVideo: (params: {
    folderId: string;
    title: string;
    category: string;
    genre?: string;
    year?: string | number;
    director?: string;
    description?: string;
    coverImage?: string;
  }) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60'
];

export const NewVideoModal: React.FC<NewVideoModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateVideo,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('videos', folders);
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Filmes');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [director, setDirector] = useState('');
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
        setTitle(folder.name.replace(/^[🎬🎥🎞️📽️\s]+/, '').trim());
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
      await onCreateVideo({
        folderId: selectedFolderId,
        title: title.trim(),
        category,
        genre: genre.trim() || undefined,
        year: year.trim() || undefined,
        director: director.trim() || undefined,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-600/15 via-red-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center shadow-inner">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Novo Filme ou Vídeo</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vincule uma pasta do Drive para catalogar</p>
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
                <Folder className="w-3.5 h-3.5 text-red-500" />
                <span>Pasta de Origem no Drive *</span>
              </label>
              <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-[10px] font-bold">
                📁 {rootFolder ? rootFolder.name : 'Filmes'}
              </span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Filmes'}" --</option>
              {eligibleFolders.map(f => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Todos os arquivos de vídeo (.mp4, .mkv, etc.) desta pasta serão sincronizados automaticamente.
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Título da Obra *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Interestelar (2014) ou Aula Inaugural"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Category & Genre */}
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
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(true)}
                    className="px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-200 transition-colors shrink-0"
                    title="Adicionar nova categoria"
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
                    className="flex-1 px-3 py-2 rounded-xl border border-red-500 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
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
                Gênero / Tags
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Ex: Ficção Científica, Aventura"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Year & Director */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Ano de Lançamento
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2024"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Direção / Produtor
              </label>
              <input
                type="text"
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="Ex: Christopher Nolan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
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
              placeholder="Breve descrição da obra..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-red-500" />
                <span>Pôster / Foto de Capa</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomCover(!isCustomCover)}
                className="text-[11px] text-red-500 hover:underline font-normal"
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
                  placeholder="https://exemplo.com/poster.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                {customCoverUrl && (
                  <div className="w-24 h-36 rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 shadow-md">
                    <img src={customCoverUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all group ${
                      coverImage === cov ? 'border-red-500 ring-2 ring-red-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Capa ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Criando...' : 'Criar Vídeo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
