import React, { useState, useMemo } from 'react';
import { Film, X, Folder, Sparkles, Image as ImageIcon, Check, Flame, LockKeyhole, Layers, Video } from 'lucide-react';
import { FolderItem, DriveItem } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';

interface NewAdultVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  allFiles?: DriveItem[];
  categories: string[];
  onCreateAdultVideo: (params: {
    folderId: string;
    title: string;
    description?: string;
    category: string;
    studio?: string;
    performers?: string;
    aka?: string;
    year?: string;
    coverImage?: string;
  }) => Promise<void>;
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

export const NewAdultVideoModal: React.FC<NewAdultVideoModalProps> = ({
  isOpen,
  onClose,
  folders,
  allFiles = [],
  categories,
  onCreateAdultVideo,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('adult', folders);
  const [title, setTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Longas-Metragens');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [studio, setStudio] = useState('');
  const [performers, setPerformers] = useState('');
  const [aka, setAka] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [loading, setLoading] = useState(false);

  // Identify all video files inside the selected folder and subfolders
  const folderVideos = useMemo(() => {
    if (!selectedFolderId || !allFiles.length) return [];

    const subFolderIds = new Set<string>();
    const queue = [selectedFolderId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = folders.filter(f => f.parentId === currentId && !f.isTrash);
      for (const child of children) {
        subFolderIds.add(child.id);
        queue.push(child.id);
      }
    }

    const vids = allFiles.filter(f => 
      !f.isTrash &&
      (f.parentId === selectedFolderId || subFolderIds.has(f.parentId || '')) &&
      (f.type === 'video' || ['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', 'ts', 'flv', 'wmv'].includes(f.extension?.toLowerCase() || ''))
    );

    return vids.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [selectedFolderId, folders, allFiles]);

  if (!isOpen) return null;

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (!title) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setTitle(folder.name.replace(/^[🔞🔥🎬🍿\s]+/, '').trim());
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
      await onCreateAdultVideo({
        folderId: selectedFolderId,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        studio: studio.trim() || undefined,
        performers: performers.trim() || undefined,
        aka: aka.trim() || undefined,
        year: year.trim() || undefined,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-rose-600/15 via-red-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-500 flex items-center justify-center shadow-inner">
              <LockKeyhole className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Novo Item • Red Locker (+18)</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Vincule uma pasta do Drive para carregar todos os vídeos no Red Locker</p>
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
                <Folder className="w-3.5 h-3.5 text-rose-500" />
                <span>Pasta de Origem no Drive *</span>
              </label>
              <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                📁 {rootFolder ? rootFolder.name : 'Red Locker'}
              </span>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Red Locker'}" --</option>
              {eligibleFolders.map(f => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>

            {/* Folder Videos Detection Card */}
            {selectedFolderId && (
              <div className="mt-2.5 p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300">
                    <Video className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>
                      {folderVideos.length === 0 
                        ? 'Nenhum arquivo de vídeo detectado nesta pasta ainda'
                        : folderVideos.length === 1
                        ? '1 vídeo detectado nesta pasta'
                        : `${folderVideos.length} vídeos detectados nesta pasta`}
                    </span>
                  </div>
                  {folderVideos.length > 1 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                      Carregamento em Lote
                    </span>
                  )}
                </div>

                {folderVideos.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                      {folderVideos.length > 1 
                        ? 'Todos os vídeos abaixo serão carregados e catalogados individualmente no Red Locker com as informações deste formulário:'
                        : 'O vídeo abaixo será catalogado com as informações deste formulário:'}
                    </p>
                    <div className="max-h-28 overflow-y-auto space-y-1 pr-1 sidebar-scrollbar">
                      {folderVideos.map((fv, idx) => (
                        <div 
                          key={fv.id}
                          className="flex items-center justify-between text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-drive-darkBg border border-rose-100 dark:border-rose-900/40 text-gray-800 dark:text-gray-200"
                        >
                          <span className="truncate flex-1 font-medium">🎬 {idx + 1}. {fv.name}</span>
                          <span className="text-[10px] text-gray-400 shrink-0 ml-2 uppercase font-mono">{fv.extension}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">
                    Ao salvar, a pasta será vinculada. Quando novos vídeos forem enviados para esta pasta no Drive, eles serão sincronizados automaticamente.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Title & Studio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Título da Produção *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do filme ou cena"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Estúdio / Produtora
              </label>
              <input
                type="text"
                value={studio}
                onChange={(e) => setStudio(e.target.value)}
                placeholder="Ex: Private, Evil Angel, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Performers & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Elenco / Performers
              </label>
              <input
                type="text"
                value={performers}
                onChange={(e) => setPerformers(e.target.value)}
                placeholder="Ex: Nome 1, Nome 2"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Categoria
              </label>
              {!isAddingNewCat ? (
                <div className="flex gap-1.5">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                    className="flex-1 px-3 py-2 rounded-xl border border-rose-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
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
          </div>

          {/* AKA (Also Known As / Nomes Alternativos) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
              <span>AKA / Nomes Alternativos (Performer ou Produtora)</span>
              <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
            </label>
            <input
              type="text"
              value={aka}
              onChange={(e) => setAka(e.target.value)}
              placeholder="Ex: Nome Artístico Anterior, Outros apelidos, Nome Fantasia ou Produtora Antiga..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              💡 Facilita encontrar o conteúdo ao buscar por qualquer um dos nomes conhecidos ou pseudônimos.
            </span>
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
              placeholder="Descrição ou observações..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none"
            />
          </div>

          {/* Cover Art Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                <span>Foto de Capa (Poster 2:3)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCustomCover(!isCustomCover)}
                className="text-[11px] text-rose-500 hover:underline font-normal"
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
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {loading 
                  ? 'Carregando vídeos...' 
                  : folderVideos.length > 1
                  ? `Carregar e Cadastrar ${folderVideos.length} Vídeos`
                  : 'Cadastrar no Red Locker'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
