import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Folder, 
  Sparkles, 
  Image as ImageIcon, 
  Tag, 
  User, 
  ShieldCheck, 
  Plus, 
  Layers
} from 'lucide-react';
import { FolderItem, DriveItem, ComicBook } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewComicModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  allFiles: DriveItem[];
  onCreateComic: (comicData: {
    folderId: string;
    title: string;
    description: string;
    category: string;
    publisher: string;
    author: string;
    artist: string;
    coverImage: string;
  }) => Promise<void>;
  categories: string[];
  onAddCategory: (category: string) => Promise<void>;
}

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60', // Marvel style action
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=60', // Neon Cyberpunk / Manga
  'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&auto=format&fit=crop&q=60', // Comic Book collection
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60', // Anime / Manga art
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60', // Sci-Fi space
];

const POPULAR_PUBLISHERS = [
  'Marvel Comics',
  'DC Comics',
  'Mangá / Shonen Jump',
  'Panini Comics',
  'Image Comics',
  'Dark Horse',
  'Vertigo',
  'IDW Publishing',
  'Indie / Autoral'
];

export const NewComicModal: React.FC<NewComicModalProps> = ({
  isOpen,
  onClose,
  folders,
  allFiles,
  onCreateComic,
  categories,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('comics', folders);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [category, setCategory] = useState<string>(categories[0] || 'Super-Heróis');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [publisher, setPublisher] = useState('Marvel Comics');
  const [author, setAuthor] = useState('');
  const [artist, setArtist] = useState('');
  const [coverImage, setCoverImage] = useState(DEFAULT_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId);
    const selectedFolder = folders.find(f => f.id === folderId);
    if (selectedFolder && !title) {
      setTitle(selectedFolder.name.replace(/^[^\w\s]+/, '').trim());
    }

    // Try finding an image in the folder for cover
    const folderImage = allFiles.find(f => f.parentId === folderId && f.type === 'image');
    if (folderImage) {
      setCoverImage(`/api/stream/${folderImage.id}`);
    }
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim()) return;
    await onAddCategory(newCategoryInput.trim());
    setCategory(newCategoryInput.trim());
    setNewCategoryInput('');
    setIsAddingNewCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFolderId) return;

    setIsSubmitting(true);
    try {
      await onCreateComic({
        folderId: selectedFolderId,
        title: title.trim(),
        description: description.trim(),
        category,
        publisher,
        author: author.trim(),
        artist: artist.trim(),
        coverImage: customCoverUrl.trim() || coverImage
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl bg-white dark:bg-drive-darkSurface rounded-3xl border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-drive-darkBorder bg-gray-50 dark:bg-drive-darkBg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Nova HQ / Mangá / Coleção</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Importe edições (CBR, CBZ, PDF, EPUB) a partir de uma pasta do Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Step 1: Select Drive Folder */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-pink-500" />
                <span>Pasta de Origem (.cbr, .cbz, .pdf ou .epub) *</span>
              </label>
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 text-[10px] font-bold">
                📁 {rootFolder ? rootFolder.name : "HQ's"}
              </span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderSelect(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-semibold"
            >
              <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : "HQ's"}" --</option>
              {eligibleFolders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <span className="text-[11px] text-gray-400 block">
              💡 Todas as edições e capítulos (.cbr, .cbz, .pdf, .epub) dentro desta pasta serão detectados automaticamente.
            </span>
          </div>

          {/* Step 2: Title and Publisher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Título da HQ / Mangá / Saga *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Homem-Aranha: A Última Caçada"
                required
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Editora / Publicadora
              </label>
              <select
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              >
                {POPULAR_PUBLISHERS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Step 3: Author and Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <User className="w-3 h-3 text-pink-500" /> Roteirista / Autor (Opcional)
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: J.M. DeMatteis / Stan Lee"
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Ilustrador / Desenhista (Opcional)
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Mike Zeck / Kentaro Miura"
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>
          </div>

          {/* Step 4: Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-rose-500" /> Gênero / Categoria
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Nova Categoria
              </button>
            </div>

            {isAddingNewCat && (
              <div className="flex items-center gap-2 p-2 bg-pink-500/10 border border-pink-500/30 rounded-2xl animate-in fade-in">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="Nome do gênero (Ex: Manhwa, Noir...)"
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-drive-darkBg rounded-xl border border-gray-300 dark:border-gray-700 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-3 py-1.5 bg-pink-600 text-white rounded-xl text-xs font-bold hover:bg-pink-500"
                >
                  Adicionar
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    category === cat
                      ? 'bg-pink-600 border-pink-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 hover:border-pink-500/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Step 5: Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Sinopse / Descrição
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumo da história, arco ou volume..."
              className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium resize-none"
            />
          </div>

          {/* Step 6: Cover Image Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Capa da Coleção
            </label>
            
            <div className="flex items-center gap-3">
              <div className="w-20 h-28 rounded-2xl overflow-hidden shadow-md border-2 border-pink-500 shrink-0 relative bg-black/40">
                <img
                  src={customCoverUrl || coverImage}
                  alt="Prévia da Capa"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="Cole uma URL personalizada de imagem de capa..."
                  className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                <div className="flex gap-2 overflow-x-auto py-1">
                  {DEFAULT_COVERS.map((cov, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCoverImage(cov);
                        setCustomCoverUrl('');
                      }}
                      className={`relative w-12 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                        coverImage === cov && !customCoverUrl ? 'border-pink-500 scale-105 shadow' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={cov} alt={`Capa ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-drive-darkBorder">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFolderId || !title.trim()}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Importando Edições...' : 'Criar Biblioteca de HQ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
