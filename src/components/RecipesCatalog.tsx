import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Play,
  Search,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Star,
  Heart,
  Tag,
  RotateCcw,
  Download,
  RefreshCw,
  Youtube,
  ChefHat,
  Users
} from 'lucide-react';
import { RecipeVideo, FolderItem, DriveItem } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { DIFFICULTY_META, PLATFORM_LABELS, RECIPE_PRESET_COVERS } from '../utils/recipeUtils.js';

interface RecipesCatalogProps {
  recipes: RecipeVideo[];
  categories: string[];
  folders: FolderItem[];
  allFiles?: DriveItem[];
  onSelectRecipe: (recipe: RecipeVideo) => void;
  onOpenNewModal?: () => void;
  onOpenYouTubeModal?: () => void;
  onEditRecipe?: (recipe: RecipeVideo) => void;
  onDeleteRecipe?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onToggleCompleted?: (id: string) => void;
  onSyncRootFolder?: () => Promise<{ importedCount: number; updatedCount: number; totalRecipes: number } | void>;
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const RecipesCatalog: React.FC<RecipesCatalogProps> = ({
  recipes,
  categories,
  allFiles = [],
  onSelectRecipe,
  onOpenNewModal,
  onOpenYouTubeModal,
  onEditRecipe,
  onDeleteRecipe,
  onToggleFavorite,
  onToggleCompleted,
  onSyncRootFolder,
  onShowToast
}) => {
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'favorites' | 'completed' | 'todo'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    if (!onSyncRootFolder || isSyncing) return;
    setIsSyncing(true);
    onShowToast?.('🍳 Varrendo a pasta dedicada Receitas e sincronizando com o catálogo...', 'info');
    try {
      const res = await onSyncRootFolder();
      if (res && res.importedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.importedCount} novas receitas importadas!`, 'success');
      } else if (res && res.updatedCount > 0) {
        onShowToast?.(`✨ Sincronização concluída: ${res.updatedCount} receitas atualizadas!`, 'success');
      } else {
        onShowToast?.('✅ Biblioteca de receitas já está 100% atualizada com o Drive!', 'success');
      }
    } catch (err: any) {
      console.error('Erro ao sincronizar pastas de receitas:', err);
      onShowToast?.('Erro ao sincronizar pasta Receitas.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedDifficulty !== 'all' ||
    filterStatus !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDifficulty('all');
    setFilterStatus('all');
  };

  const filteredRecipes = recipes.filter(recipe => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        recipe.title.toLowerCase().includes(q) ||
        (recipe.description && recipe.description.toLowerCase().includes(q)) ||
        (recipe.author && recipe.author.toLowerCase().includes(q)) ||
        (recipe.category && recipe.category.toLowerCase().includes(q)) ||
        (recipe.instructions && recipe.instructions.toLowerCase().includes(q)) ||
        (recipe.ingredients && recipe.ingredients.some(ing => ing.toLowerCase().includes(q))) ||
        (recipe.tags && recipe.tags.some(t => t.toLowerCase().includes(q)));
      if (!matchSearch) return false;
    }

    if (selectedCategory !== 'all' && recipe.category !== selectedCategory) {
      return false;
    }

    if (selectedDifficulty !== 'all' && (recipe.difficulty || 'facil') !== selectedDifficulty) {
      return false;
    }

    if (filterStatus === 'favorites' && !recipe.isFavorite) return false;
    if (filterStatus === 'completed' && !recipe.isCompleted) return false;
    if (filterStatus === 'todo' && recipe.isCompleted) return false;

    return true;
  });

  const totalRecipes = recipes.length;
  const favoritesCount = recipes.filter(r => r.isFavorite).length;
  const completedCount = recipes.filter(r => !!r.isCompleted).length;
  const todoCount = recipes.filter(r => !r.isCompleted).length;

  const featuredRecipe =
    recipes.find(r => r.isFavorite && !r.isCompleted) ||
    recipes.find(r => r.isFavorite) ||
    recipes[0];

  return (
    <div className="w-full max-w-full overflow-x-hidden flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-3 sm:p-6 space-y-6">
      {/* Hero Spotlight Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-orange-900 via-amber-900 to-slate-900 p-5 sm:p-6 lg:p-7 text-white shadow-2xl relative overflow-hidden border border-orange-700/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <UtensilsCrossed className="w-64 h-64 sm:w-72 sm:h-72" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 lg:gap-6">
          {featuredRecipe ? (
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 flex-1 min-w-0">
              {/* 16:9 Thumbnail Preview */}
              <div className="relative w-full max-w-[280px] sm:w-56 md:w-64 lg:w-60 xl:w-72 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-orange-400/40 ring-1 ring-white/10 shrink-0 bg-black/60 group">
                <img
                  src={featuredRecipe.coverImage || RECIPE_PRESET_COVERS[0]}
                  alt={featuredRecipe.title}
                  draggable={false}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                />
                <button
                  onClick={() => onSelectRecipe(featuredRecipe)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  aria-label={`Abrir receita ${featuredRecipe.title}`}
                >
                  <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/50">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </button>
              </div>

              {/* Info */}
              <div className="space-y-2 text-center sm:text-left flex-1 min-w-0 w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 backdrop-blur-md text-orange-200 text-[11px] font-bold uppercase tracking-wider border border-orange-400/30 max-w-full">
                  <ChefHat className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                  <span className="truncate">Receitas & Culinária • {recipes.length} {recipes.length === 1 ? 'Receita' : 'Receitas'}</span>
                </div>

                <h1
                  title={featuredRecipe.title}
                  className="text-xl sm:text-2xl xl:text-3xl font-black text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm"
                >
                  {featuredRecipe.title}
                </h1>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-xs text-orange-100/90 font-medium">
                  {featuredRecipe.author && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                      <span>{featuredRecipe.author}</span>
                    </span>
                  )}
                  {featuredRecipe.prepTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                      <span>{featuredRecipe.prepTime}</span>
                    </span>
                  )}
                  {featuredRecipe.servings && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                      <span>{featuredRecipe.servings}</span>
                    </span>
                  )}
                  {featuredRecipe.category && (
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-orange-200 text-[10px] font-bold">
                      {featuredRecipe.category}
                    </span>
                  )}
                </div>

                <p className="text-xs text-orange-50/80 line-clamp-2 max-w-xl leading-relaxed">
                  {featuredRecipe.description || 'Sua biblioteca dedicada de receitas da internet com ingredientes, modo de preparo e backup no Telegram.'}
                </p>

                <div className="pt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <button
                    onClick={() => onSelectRecipe(featuredRecipe)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-950 hover:bg-orange-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current text-orange-600 shrink-0" />
                    <span>Abrir Receita</span>
                  </button>

                  {onOpenNewModal && (
                    <button
                      onClick={onOpenNewModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-md shadow-black/15 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>Nova Receita</span>
                    </button>
                  )}

                  {onOpenYouTubeModal && (
                    <button
                      onClick={onOpenYouTubeModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-black/15 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                    >
                      <Youtube className="w-3.5 h-3.5 shrink-0" />
                      <span>Importar YouTube</span>
                    </button>
                  )}

                  {onSyncRootFolder && (
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600/30 hover:bg-orange-600/50 border border-orange-400/40 text-orange-100 hover:text-white text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 whitespace-nowrap"
                      title="Escanear e sincronizar pasta dedicada Receitas automaticamente"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-orange-200 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pasta'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 z-10 max-w-xl flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 backdrop-blur-md text-orange-200 text-[11px] font-bold uppercase tracking-wider border border-orange-400/30">
                <ChefHat className="w-3.5 h-3.5 text-orange-300 shrink-0" />
                <span>Receitas & Culinária</span>
              </div>

              <h1 className="text-xl sm:text-2xl xl:text-3xl font-black tracking-tight leading-tight drop-shadow-sm">
                Seu Livro de Receitas em Vídeo
              </h1>

              <p className="text-xs sm:text-sm text-orange-100/90 leading-relaxed">
                Guarde vídeos de receitas do YouTube, Reels, TikTok ou arquivos da pasta dedicada <strong>Receitas</strong>, com lista de ingredientes interativa e backup na nuvem.
              </p>

              <div className="pt-1.5 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {onOpenNewModal && (
                  <button
                    onClick={onOpenNewModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-orange-950 hover:bg-orange-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Nova Receita</span>
                  </button>
                )}

                {onOpenYouTubeModal && (
                  <button
                    onClick={onOpenYouTubeModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-[1.03] active:scale-95 whitespace-nowrap"
                  >
                    <Youtube className="w-3.5 h-3.5 shrink-0" />
                    <span>Importar do YouTube</span>
                  </button>
                )}

                {onSyncRootFolder && (
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600/30 hover:bg-orange-600/50 border border-orange-400/40 text-orange-100 text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-orange-200 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pasta'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2.5 w-full lg:w-[220px] xl:w-[236px] shrink-0 z-10">
            <div className="px-3 py-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <UtensilsCrossed className="w-4 h-4 text-orange-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{totalRecipes}</span>
              <span className="text-[10px] text-orange-200 uppercase font-semibold tracking-wide whitespace-nowrap">Receitas</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <Heart className="w-4 h-4 text-rose-300 mb-1 fill-current shrink-0" />
              <span className="text-base font-black leading-none mb-1">{favoritesCount}</span>
              <span className="text-[10px] text-orange-200 uppercase font-semibold tracking-wide whitespace-nowrap">Favoritas</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{completedCount}</span>
              <span className="text-[10px] text-orange-200 uppercase font-semibold tracking-wide whitespace-nowrap">Testadas</span>
            </div>

            <div className="px-3 py-2.5 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center min-w-0">
              <Clock className="w-4 h-4 text-amber-300 mb-1 shrink-0" />
              <span className="text-base font-black leading-none mb-1">{todoCount}</span>
              <span className="text-[10px] text-orange-200 uppercase font-semibold tracking-wide whitespace-nowrap">Para Testar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="space-y-3 pb-2 border-b border-gray-200 dark:border-drive-darkBorder">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 scrollbar-none">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterStatus === 'all'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              Todas ({recipes.length})
            </button>

            <button
              onClick={() => setFilterStatus('favorites')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'favorites'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${filterStatus === 'favorites' ? 'fill-current' : 'text-rose-500'}`} />
              <span>Favoritas ({favoritesCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'completed'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Já Fiz ({completedCount})</span>
            </button>

            <button
              onClick={() => setFilterStatus('todo')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                filterStatus === 'todo'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Para Testar ({todoCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por prato, ingrediente, canal ou tag..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm"
            />
          </div>
        </div>

        {/* Secondary Category & Difficulty Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="flex items-center gap-1.5 bg-white dark:bg-drive-darkSurface text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-drive-darkBorder px-2.5 py-1.5 rounded-xl text-xs shadow-sm">
            <Tag className="w-3.5 h-3.5 text-orange-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-drive-darkSurface text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-drive-darkBorder px-2.5 py-1.5 rounded-xl text-xs shadow-sm">
            <ChefHat className="w-3.5 h-3.5 text-orange-500" />
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-transparent focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all">Qualquer Dificuldade</option>
              <option value="facil">Fácil</option>
              <option value="medio">Médio</option>
              <option value="dificil">Difícil</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-900 text-gray-200 hover:text-white text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Recipe Cards Grid (16:9 culinary thumbnails) */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRecipes.map(recipe => {
            const diffMeta = DIFFICULTY_META[recipe.difficulty || 'facil'];
            const platformLabel = recipe.fileId
              ? 'Telegram / Drive'
              : PLATFORM_LABELS[recipe.sourcePlatform || 'other'];

            return (
              <div
                key={recipe.id}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-orange-500/50 hover:shadow-xl transition-all duration-300"
              >
                {/* 16:9 Thumbnail */}
                <div
                  onClick={() => onSelectRecipe(recipe)}
                  className="relative aspect-video w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                >
                  <img
                    src={recipe.coverImage || RECIPE_PRESET_COVERS[0]}
                    alt={recipe.title}
                    draggable={false}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1 z-10 max-w-[78%]">
                    <span className="px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-black uppercase shadow truncate">
                      {recipe.category || 'Receita'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/70 text-gray-100 text-[9px] font-bold backdrop-blur-sm">
                      {diffMeta.label}
                    </span>
                  </div>

                  {/* Favorite Button */}
                  {onToggleFavorite && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(recipe.id);
                      }}
                      className={`absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all z-20 ${
                        recipe.isFavorite
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                          : 'bg-black/60 text-white opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-rose-600'
                      }`}
                      title={recipe.isFavorite ? 'Remover dos favoritos' : 'Favoritar receita'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${recipe.isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  {/* Play Hover Trigger */}
                  <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                    <div className="w-11 h-11 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/50">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>

                  {/* Duration / Source bottom-left badge */}
                  <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-semibold">
                      {platformLabel}
                    </span>
                    {recipe.duration && recipe.duration !== '00:00' && (
                      <span className="px-1.5 py-0.5 rounded bg-black/75 text-white text-[9px] font-mono">
                        {recipe.duration}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons bottom-right */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {(() => {
                      const targetFile = allFiles?.find(f => f.id === recipe.fileId);
                      if (!targetFile) return null;
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadTargetFile(targetFile);
                          }}
                          className="p-1.5 rounded-lg bg-black/70 hover:bg-orange-500 text-white shadow transition-colors"
                          title="Baixar Vídeo para Cache Local"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      );
                    })()}

                    {onEditRecipe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditRecipe(recipe);
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-orange-500 text-white shadow transition-colors"
                        title="Editar Receita"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteRecipe && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir a receita "${recipe.title}"?`)) {
                            onDeleteRecipe(recipe.id);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                        title="Excluir Receita"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3
                      onClick={() => onSelectRecipe(recipe)}
                      className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2 hover:text-orange-500 cursor-pointer transition-colors"
                      title={recipe.title}
                    >
                      {recipe.title}
                    </h3>

                    {recipe.author && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-1">
                        <User className="w-3 h-3 text-orange-500 shrink-0" />
                        <span>{recipe.author}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                      {recipe.prepTime && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-orange-400" />
                          <span>{recipe.prepTime}</span>
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-0.5">
                          <Users className="w-3 h-3 text-orange-400" />
                          <span>{recipe.servings}</span>
                        </span>
                      )}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                          • {recipe.ingredients.length} ingred.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Status */}
                  <div className="pt-1.5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-[10px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCompleted?.(recipe.id);
                      }}
                      className={`flex items-center gap-1 font-bold transition-colors ${
                        recipe.isCompleted
                          ? 'text-emerald-500'
                          : 'text-gray-400 hover:text-orange-500'
                      }`}
                      title="Marcar ou desmarcar receita como já testada"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{recipe.isCompleted ? 'Já fiz' : 'Para testar'}</span>
                    </button>

                    {recipe.rating && recipe.rating > 0 ? (
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{recipe.rating}/5</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Nenhuma receita encontrada
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mt-1">
              {hasActiveFilters
                ? 'Nenhuma receita corresponde aos filtros selecionados.'
                : 'Adicione links de receitas (YouTube, Reels, TikTok) ou sincronize sua pasta dedicada "🍳 Receitas" no Drive.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {onOpenNewModal && (
              <button
                onClick={onOpenNewModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-md shadow-orange-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Receita</span>
              </button>
            )}
            {onOpenYouTubeModal && (
              <button
                onClick={onOpenYouTubeModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                <Youtube className="w-4 h-4" />
                <span>Importar do YouTube</span>
              </button>
            )}
            {onSyncRootFolder && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs font-bold"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Pasta'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}
    </div>
  );
};
