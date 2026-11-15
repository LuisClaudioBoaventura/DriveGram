import React, { useState } from 'react';
import {
  UtensilsCrossed,
  X,
  Folder,
  Sparkles,
  Image as ImageIcon,
  Check,
  Link2,
  User,
  Tag,
  Clock,
  Users,
  ChefHat,
  ListChecks,
  FileText,
  Loader2,
  FolderPlus
} from 'lucide-react';
import { FolderItem, RecipeVideo } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';
import {
  RECIPE_PRESET_COVERS,
  extractYouTubeIdFromUrl,
  detectRecipePlatform,
  buildYouTubeEmbedUrl,
  buildYouTubeThumbnailUrl,
  parseIngredientsText,
  parseTagsText
} from '../utils/recipeUtils.js';

interface NewRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  categories: string[];
  onCreateRecipe: (params: {
    folderId?: string;
    title: string;
    author?: string;
    sourcePlatform?: RecipeVideo['sourcePlatform'];
    sourceUrl?: string;
    videoUrl?: string;
    embedUrl?: string;
    category: string;
    prepTime?: string;
    servings?: string;
    difficulty?: RecipeVideo['difficulty'];
    ingredients?: string[];
    instructions?: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
  }) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
  onEnsureDedicatedFolder?: () => Promise<FolderItem | null>;
}

export const NewRecipeModal: React.FC<NewRecipeModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateRecipe,
  onAddCategory,
  onEnsureDedicatedFolder
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('recipes', folders);
  const [sourceMode, setSourceMode] = useState<'link' | 'folder'>('link');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Doces & Sobremesas');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [prepTime, setPrepTime] = useState('');
  const [servings, setServings] = useState('');
  const [difficulty, setDifficulty] = useState<RecipeVideo['difficulty']>('facil');
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState(RECIPE_PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [isCustomCover, setIsCustomCover] = useState(false);
  const [fetchingYouTube, setFetchingYouTube] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const detectedYtId = extractYouTubeIdFromUrl(linkUrl);

  const handleLinkChange = (val: string) => {
    setLinkUrl(val);
    const ytId = extractYouTubeIdFromUrl(val);
    if (ytId && !isCustomCover) {
      setCoverImage(buildYouTubeThumbnailUrl(ytId));
    }
  };

  const handleFetchYouTubeMeta = async () => {
    if (!detectedYtId || fetchingYouTube) return;
    setFetchingYouTube(true);
    try {
      const res = await fetch('/api/youtube/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        const first = data?.videos?.[0];
        if (!title.trim() && (first?.title || data?.title)) {
          setTitle(first?.title || data.title);
        }
        if (!author.trim() && (first?.author || data?.author)) {
          setAuthor(first?.author || data.author);
        }
        if (!description.trim() && (first?.description || data?.description)) {
          setDescription(first?.description || data.description);
        }
        if (first?.thumbnail || data?.coverImage) {
          setCoverImage(first?.thumbnail || data.coverImage);
          setIsCustomCover(false);
        }
      }
    } catch {
      // Non-blocking metadata enrichment
    } finally {
      setFetchingYouTube(false);
    }
  };

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (!title) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setTitle(folder.name.replace(/^[🍳🍲🥘🍰🍝🎬🎥🎞️📽️📹📼\s]+/, '').trim());
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
    if (!title.trim()) return;
    if (sourceMode === 'folder' && !selectedFolderId) return;
    if (sourceMode === 'link' && !linkUrl.trim()) return;

    setLoading(true);
    try {
      const trimmedLink = linkUrl.trim();
      const ytId = sourceMode === 'link' ? extractYouTubeIdFromUrl(trimmedLink) : null;
      const platform = sourceMode === 'link' ? detectRecipePlatform(trimmedLink, false) : 'local';
      const tags = parseTagsText(tagsInput);
      const ingredients = parseIngredientsText(ingredientsText);

      let targetFolderId = selectedFolderId || rootFolder?.id;
      if (!targetFolderId && onEnsureDedicatedFolder) {
        const ensured = await onEnsureDedicatedFolder();
        targetFolderId = ensured?.id;
      }

      await onCreateRecipe({
        folderId: targetFolderId,
        title: title.trim(),
        author: author.trim() || undefined,
        sourcePlatform: platform,
        sourceUrl: sourceMode === 'link' ? trimmedLink : undefined,
        videoUrl: ytId ? trimmedLink : undefined,
        embedUrl: ytId ? buildYouTubeEmbedUrl(ytId) : undefined,
        category,
        prepTime: prepTime.trim() || undefined,
        servings: servings.trim() || undefined,
        difficulty,
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        instructions: instructions.trim() || undefined,
        description: description.trim() || undefined,
        coverImage: isCustomCover && customCoverUrl.trim() ? customCoverUrl.trim() : coverImage,
        tags: tags.length > 0 ? tags : undefined
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-orange-500/15 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center shadow-inner">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Nova Receita em Vídeo</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Salve receitas da internet (YouTube, Reels, TikTok) ou vídeos da pasta Receitas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setSourceMode('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              sourceMode === 'link'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                : 'bg-gray-50 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Link da Internet</span>
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('folder')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              sourceMode === 'folder'
                ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                : 'bg-gray-50 dark:bg-drive-darkBg text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Pasta do Drive</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {sourceMode === 'link' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-orange-500" />
                <span>URL do Vídeo da Receita (YouTube, Instagram Reels, TikTok, etc.) *</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou https://instagram.com/reel/..."
                  required
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                {detectedYtId && (
                  <button
                    type="button"
                    onClick={handleFetchYouTubeMeta}
                    disabled={fetchingYouTube}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
                    title="Preencher título, canal e capa automaticamente do YouTube"
                  >
                    {fetchingYouTube ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Puxar Dados</span>
                  </button>
                )}
              </div>
              {detectedYtId && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Vídeo do YouTube detectado — pronto para assistir aqui e salvar no Telegram!
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-orange-500" />
                <span>Pasta de Receita no Drive *</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => handleFolderChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">
                  {rootFolder
                    ? `Selecione uma pasta dentro de "${rootFolder.name}"...`
                    : 'Selecione a pasta da receita...'}
                </option>
                {eligibleFolders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    📁 {folder.name}
                  </option>
                ))}
              </select>
              {!rootFolder && (
                <div className="flex items-center justify-between gap-2 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                  <span>Pasta dedicada "🍳 Receitas" ainda não existe no Drive.</span>
                  {onEnsureDedicatedFolder && (
                    <button
                      type="button"
                      onClick={async () => {
                        const created = await onEnsureDedicatedFolder();
                        if (created) setSelectedFolderId(created.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-orange-400 font-bold"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      Criar Pasta Receitas
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Nome da Receita *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Macarrão Carbonara Cremoso"
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-orange-500" />
                <span>Chef / Canal / Perfil</span>
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Paola Carosella, @receitas..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Categoria</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                  className="text-[11px] font-semibold text-orange-500 hover:underline"
                >
                  {isAddingNewCat ? 'Cancelar' : '+ Nova'}
                </button>
              </div>
              {isAddingNewCat ? (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Ex: Café da Manhã"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold"
                  >
                    Ok
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5 text-orange-500" />
                <span>Dificuldade</span>
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as RecipeVideo['difficulty'])}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
              </select>
            </div>
          </div>

          {/* Prep time, Servings, Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-500" />
                <span>Tempo de Preparo</span>
              </label>
              <input
                type="text"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="Ex: 25 min"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>Rendimento</span>
              </label>
              <input
                type="text"
                value={servings}
                onChange={(e) => setServings(e.target.value)}
                placeholder="Ex: 4 porções"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                <span>Tags</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="rápida, airfryer, queijo"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Ingredients & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5 text-orange-500" />
                <span>Ingredientes (1 por linha)</span>
              </label>
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
                placeholder={'200g de macarrão\n2 ovos\n100g de bacon\n50g de parmesão'}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>Modo de Preparo / Notas</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Anote dicas importantes, temperatura do forno ou passo a passo..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                <span>Foto / Thumbnail do Prato</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomCover(!isCustomCover)}
                className="text-[11px] font-semibold text-orange-500 hover:underline"
              >
                {isCustomCover ? 'Usar galeria' : 'Inserir URL customizada'}
              </button>
            </div>

            {isCustomCover ? (
              <input
                type="url"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {RECIPE_PRESET_COVERS.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCoverImage(img)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      coverImage === img
                        ? 'border-orange-500 scale-105 shadow-md shadow-orange-500/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="Preset" className="w-full h-full object-cover" />
                    {coverImage === img && (
                      <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || (sourceMode === 'folder' && !selectedFolderId) || (sourceMode === 'link' && !linkUrl.trim())}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : 'Salvar Receita'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
