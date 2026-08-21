import React, { useState } from 'react';
import { Headphones, X, Folder, Sparkles, Image as ImageIcon, Check, Music2, Mic, Disc } from 'lucide-react';
import { FolderItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  categories: string[];
  onCreateAudioShow: (params: {
    folderId: string;
    title: string;
    artist?: string;
    host?: string;
    showType: 'music_album' | 'podcast' | 'playlist';
    category: string;
    genre?: string;
    description?: string;
    coverImage?: string;
  }) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=800&auto=format&fit=crop&q=60'
];

export const NewAudioModal: React.FC<NewAudioModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateAudioShow,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('podcasts', folders);
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [showType, setShowType] = useState<'music_album' | 'podcast' | 'playlist'>('music_album');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Álbuns de Música');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [genre, setGenre] = useState('');
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
        setTitle(folder.name.replace(/^[🎧🎵🎙️📻\s]+/, '').trim());
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
      await onCreateAudioShow({
        folderId: selectedFolderId,
        title: title.trim(),
        artist: showType !== 'podcast' ? artist.trim() || undefined : undefined,
        host: showType === 'podcast' ? artist.trim() || undefined : undefined,
        showType,
        category,
        genre: genre.trim() || undefined,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-500 flex items-center justify-center shadow-inner">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Novo Álbum / Podcast</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vincule uma pasta com arquivos de áudio (.mp3, .wav, etc.)</p>
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
          {/* Format / Type Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Tipo de Conteúdo *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setShowType('music_album'); setCategory('Álbuns de Música'); }}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  showType === 'music_album' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Disc className="w-4 h-4" />
                <span>Álbum de Música</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowType('podcast'); setCategory('Podcasts'); }}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  showType === 'podcast' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Podcast / Show</span>
              </button>

              <button
                type="button"
                onClick={() => { setShowType('playlist'); setCategory('Playlists & Sets'); }}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                  showType === 'playlist' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Music2 className="w-4 h-4" />
                <span>Playlist</span>
              </button>
            </div>
          </div>

          {/* Source Folder Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pasta de Áudios no Drive *</span>
              </label>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                📁 {rootFolder ? rootFolder.name : 'Musicas e Podcasts'}
              </span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Musicas e Podcasts'}" --</option>
              {eligibleFolders.map(f => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-400 mt-1 block">
              Todos os arquivos .mp3, .wav, .m4a, .flac desta pasta serão organizados na playlist automaticamente.
            </span>
          </div>

          {/* Title & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Nome do Álbum / Podcast *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Dark Side of the Moon ou Podpah"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                {showType === 'podcast' ? 'Apresentador(es) / Host' : 'Artista / Banda'}
              </label>
              <input
                type="text"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Ex: Pink Floyd ou Joe Rogan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
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
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="flex-1 px-3 py-2 rounded-xl border border-emerald-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
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
                Gênero / Estilo
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Ex: Rock Clássico, Entrevistas"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
              Descrição / Notas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do álbum ou do podcast..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>Foto de Capa do Álbum (1:1 Quadrada)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomCover(!isCustomCover)}
                className="text-[11px] text-emerald-500 hover:underline font-normal"
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
                  placeholder="https://exemplo.com/album_art.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all group ${
                      coverImage === cov ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Criando...' : 'Criar Hub de Áudio'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
