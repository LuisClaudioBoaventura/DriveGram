import React, { useState, useRef } from 'react';
import {
  UtensilsCrossed,
  X,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
  Check,
  User,
  Tag,
  Clock,
  Users,
  ChefHat,
  ListChecks,
  FileText,
  Link2
} from 'lucide-react';
import { RecipeVideo, DriveItem } from '../types/index.js';
import {
  RECIPE_PRESET_COVERS,
  extractYouTubeIdFromUrl,
  detectRecipePlatform,
  buildYouTubeEmbedUrl,
  parseIngredientsText,
  parseTagsText
} from '../utils/recipeUtils.js';

interface EditRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: RecipeVideo | null;
  categories: string[];
  allFiles?: DriveItem[];
  onSave: (updated: RecipeVideo) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

export const EditRecipeModal: React.FC<EditRecipeModalProps> = ({
  isOpen,
  onClose,
  recipe,
  categories,
  allFiles = [],
  onSave,
  onAddCategory
}) => {
  if (!isOpen || !recipe) return null;

  const [title, setTitle] = useState(recipe.title);
  const [author, setAuthor] = useState(recipe.author || '');
  const [sourceUrl, setSourceUrl] = useState(recipe.sourceUrl || recipe.videoUrl || '');
  const [category, setCategory] = useState(recipe.category || categories[0] || 'Outros');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [prepTime, setPrepTime] = useState(recipe.prepTime || '');
  const [servings, setServings] = useState(recipe.servings || '');
  const [difficulty, setDifficulty] = useState<RecipeVideo['difficulty']>(recipe.difficulty || 'facil');
  const [ingredientsText, setIngredientsText] = useState((recipe.ingredients || []).join('\n'));
  const [instructions, setInstructions] = useState(recipe.instructions || '');
  const [tagsInput, setTagsInput] = useState((recipe.tags || []).join(', '));
  const [description, setDescription] = useState(recipe.description || '');
  const [coverImage, setCoverImage] = useState(recipe.coverImage || RECIPE_PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'upload' | 'url' | 'folder' | 'gallery'>('gallery');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const folderImageFiles = allFiles.filter(f =>
    f.parentId === recipe.folderId &&
    (f.type === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes((f.extension || '').toLowerCase()))
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

      const trimmedUrl = sourceUrl.trim();
      const ytId = extractYouTubeIdFromUrl(trimmedUrl);
      const platform = trimmedUrl
        ? detectRecipePlatform(trimmedUrl, !!recipe.fileId)
        : (recipe.fileId ? 'local' : recipe.sourcePlatform || 'other');

      const tags = parseTagsText(tagsInput);
      const ingredients = parseIngredientsText(ingredientsText);

      await onSave({
        ...recipe,
        title: title.trim(),
        author: author.trim() || undefined,
        sourcePlatform: platform,
        sourceUrl: trimmedUrl || undefined,
        videoUrl: ytId ? trimmedUrl : (trimmedUrl || recipe.videoUrl),
        embedUrl: ytId ? buildYouTubeEmbedUrl(ytId) : undefined,
        category,
        prepTime: prepTime.trim() || undefined,
        servings: servings.trim() || undefined,
        difficulty,
        ingredients,
        instructions: instructions.trim() || '',
        tags,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Editar Receita</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Ajuste ingredientes, preparo, link ou thumbnail</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Cover Preview Column */}
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Capa / Foto</label>
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/40 shadow-inner">
                <img
                  src={coverTab === 'url' && customCoverUrl.trim() ? customCoverUrl : coverImage}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center">Visualização 16:9</p>
            </div>

            {/* Form Fields Column */}
            <div className="md:col-span-2 space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Nome da Receita *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <User className="w-3 h-3 text-orange-500" />
                    <span>Chef / Canal</span>
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Canal ou perfil"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-1">
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
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nova..."
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-2.5 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-bold"
                      >
                        Ok
                      </button>
                    </div>
                  ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-orange-500" />
                  <span>Link Original (YouTube, Reels, TikTok...)</span>
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span>Tempo</span>
                  </label>
                  <input
                    type="text"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    placeholder="25 min"
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Users className="w-3 h-3 text-orange-500" />
                    <span>Porções</span>
                  </label>
                  <input
                    type="text"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4 porções"
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <ChefHat className="w-3 h-3 text-orange-500" />
                    <span>Nível</span>
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as RecipeVideo['difficulty'])}
                    className="w-full px-2.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <ListChecks className="w-3.5 h-3.5 text-orange-500" />
                <span>Ingredientes (1 por linha)</span>
              </label>
              <textarea
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                rows={4}
                placeholder={'200g de farinha\n2 ovos\n1 pitada de sal'}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-orange-500" />
                <span>Modo de Preparo / Anotações</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={4}
                placeholder="Passo a passo, temperatura, substituições..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Tag className="w-3 h-3 text-orange-500" />
                <span>Tags (separadas por vírgula)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="rápida, airfryer, doce"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Descrição Curta</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Resumo do prato..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Cover Selector Tabs */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  coverTab === 'gallery' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  coverTab === 'upload' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar Arquivo</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  coverTab === 'url' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Via Link (URL)</span>
              </button>

              {folderImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverTab('folder')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    coverTab === 'folder' ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  <span>Imagens da Pasta ({folderImageFiles.length})</span>
                </button>
              )}
            </div>

            {coverTab === 'gallery' && (
              <div className="grid grid-cols-6 gap-2">
                {RECIPE_PRESET_COVERS.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCoverImage(img)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      coverImage === img ? 'border-orange-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
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

            {coverTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl cursor-pointer hover:border-orange-500 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Clique para selecionar imagem</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {coverTab === 'url' && (
              <input
                type="url"
                value={customCoverUrl}
                onChange={(e) => setCustomCoverUrl(e.target.value)}
                placeholder="https://exemplo.com/foto-prato.jpg"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}

            {coverTab === 'folder' && (
              <div className="grid grid-cols-4 gap-2">
                {folderImageFiles.map(file => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setCoverImage(`/api/stream/${file.id}`)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      coverImage === `/api/stream/${file.id}` ? 'border-orange-500 scale-105' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={`/api/stream/${file.id}`} alt={file.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

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
              disabled={loading || !title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
