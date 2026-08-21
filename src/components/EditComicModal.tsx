import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  User, 
  Tag, 
  BookOpen, 
  Check, 
  Layers, 
  Folder,
  Plus
} from 'lucide-react';
import { ComicBook, DriveItem } from '../types/index.js';

interface EditComicModalProps {
  isOpen: boolean;
  onClose: () => void;
  comic: ComicBook | null;
  onSave: (updatedComic: ComicBook) => Promise<void>;
  categories: string[];
  onAddCategory?: (category: string) => Promise<void>;
  allFiles?: DriveItem[];
}

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60', // Action hero
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=60', // Manga cyberpunk
  'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=800&auto=format&fit=crop&q=60', // Marvel / DC comics
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60', // Anime / Manga
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=60', // Sci-fi space
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

export const EditComicModal: React.FC<EditComicModalProps> = ({
  isOpen,
  onClose,
  comic,
  onSave,
  categories,
  onAddCategory,
  allFiles = []
}) => {
  const [title, setTitle] = useState('');
  const [publisher, setPublisher] = useState('');
  const [author, setAuthor] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'reading' | 'completed' | 'plan_to_read'>('reading');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find images in the linked folder
  const folderImages = comic?.folderId 
    ? allFiles.filter(f => f.parentId === comic.folderId && f.type === 'image')
    : [];

  useEffect(() => {
    if (comic) {
      setTitle(comic.title || '');
      setPublisher(comic.publisher || 'Marvel Comics');
      setAuthor(comic.author || '');
      setArtist(comic.artist || '');
      setCategory(comic.category || categories[0] || 'Super-Heróis');
      setStatus(comic.status || 'reading');
      setDescription(comic.description || '');
      setCoverImage(comic.coverImage || DEFAULT_COVERS[0]);
      setCustomCoverUrl('');
    }
  }, [comic, categories]);

  if (!isOpen || !comic) return null;

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCoverImage(ev.target.result as string);
        setCustomCoverUrl('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddNewCategory = async () => {
    if (!newCategoryInput.trim() || !onAddCategory) return;
    await onAddCategory(newCategoryInput.trim());
    setCategory(newCategoryInput.trim());
    setNewCategoryInput('');
    setIsAddingNewCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const finalCover = customCoverUrl.trim() || coverImage || comic.coverImage;
      await onSave({
        ...comic,
        title: title.trim(),
        publisher: publisher.trim() || 'Indie / Autoral',
        author: author.trim() || undefined,
        artist: artist.trim() || undefined,
        category: category || categories[0] || 'Super-Heróis',
        status,
        description: description.trim(),
        coverImage: finalCover,
        updatedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error saving comic metadata:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-2xl bg-white dark:bg-drive-darkSurface rounded-3xl border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-900 dark:text-gray-100 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-drive-darkBorder bg-gray-50 dark:bg-drive-darkBg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Editar Dados da HQ / Mangá</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atualize capa, créditos, editora, gênero e sinopse</p>
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
          {/* Cover Photo Management */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-pink-500" /> Foto de Capa da HQ
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-drive-darkBg p-4 rounded-2xl border border-gray-200 dark:border-drive-darkBorder">
              {/* Cover Preview */}
              <div className="relative w-28 aspect-[2/3] rounded-xl overflow-hidden shadow-xl border-2 border-pink-500 shrink-0 bg-black/60 group">
                <img
                  src={customCoverUrl || coverImage}
                  alt="Capa da HQ"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1 transition-opacity cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Trocar Foto</span>
                </button>
              </div>

              {/* Cover Actions */}
              <div className="flex-1 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload do Computador</span>
                  </button>
                  <span className="text-[11px] text-gray-400">JPG, PNG, WebP ou GIF</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleUploadCover}
                  accept="image/*"
                  className="hidden"
                />

                {/* Custom URL Input */}
                <input
                  type="text"
                  value={customCoverUrl}
                  onChange={(e) => setCustomCoverUrl(e.target.value)}
                  placeholder="Ou cole o link direto de uma imagem (URL)..."
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500"
                />

                {/* Suggestions / Gallery */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Sugestões Rápidas:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto py-1">
                    {DEFAULT_COVERS.map((cov, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCoverImage(cov);
                          setCustomCoverUrl('');
                        }}
                        className={`relative w-10 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          coverImage === cov && !customCoverUrl ? 'border-pink-500 scale-105 shadow' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={cov} alt={`Capa ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}

                    {/* Images from linked folder if available */}
                    {folderImages.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setCoverImage(`/api/stream/${f.id}`);
                          setCustomCoverUrl('');
                        }}
                        className={`relative w-10 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                          coverImage === `/api/stream/${f.id}` && !customCoverUrl ? 'border-pink-500 scale-105 shadow' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                        title={`Imagem da pasta: ${f.name}`}
                      >
                        <img src={`/api/stream/${f.id}`} alt={f.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Title and Publisher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Título da Obra / Coleção *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Batman: O Cavaleiro das Trevas"
                required
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Editora / Publicadora
              </label>
              <input
                type="text"
                list="publishers-list"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Ex: Marvel, DC, Shueisha..."
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
              <datalist id="publishers-list">
                {POPULAR_PUBLISHERS.map(p => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Author and Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <User className="w-3 h-3 text-pink-500" /> Roteirista / Escritor
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Alan Moore / Neil Gaiman"
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Ilustrador / Desenhista
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Dave Gibbons / Todd McFarlane"
                className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium"
              />
            </div>
          </div>

          {/* Status and Category */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Status de Leitura
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('reading')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    status === 'reading'
                      ? 'bg-pink-600 border-pink-500 text-white shadow'
                      : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder text-gray-600 dark:text-gray-300'
                  }`}
                >
                  📖 Lendo Agora
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('completed')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    status === 'completed'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                      : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder text-gray-600 dark:text-gray-300'
                  }`}
                >
                  ✓ Concluído
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('plan_to_read')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    status === 'plan_to_read'
                      ? 'bg-purple-600 border-purple-500 text-white shadow'
                      : 'bg-gray-50 dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder text-gray-600 dark:text-gray-300'
                  }`}
                >
                  ⏳ Quero Ler
                </button>
              </div>
            </div>

            {/* Category selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-rose-500" /> Categoria / Gênero
                </label>
                {onAddCategory && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                    className="text-[11px] font-semibold text-pink-500 hover:text-pink-600 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nova Categoria
                  </button>
                )}
              </div>

              {isAddingNewCat && (
                <div className="flex items-center gap-2 p-2 bg-pink-500/10 border border-pink-500/30 rounded-2xl animate-in fade-in">
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    placeholder="Nome do gênero..."
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
          </div>

          {/* Synopsis / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Sinopse / Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumo da trama ou arco..."
              className="w-full px-4 py-2 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-pink-500 text-xs font-medium resize-none"
            />
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
              disabled={isSaving || !title.trim()}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
