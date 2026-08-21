import React, { useState } from 'react';
import { 
  Film, 
  Play, 
  Search, 
  Plus, 
  Sparkles, 
  Filter, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Lock, 
  Flame, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LockKeyhole,
  Star,
  Shuffle,
  ListMusic,
  Heart,
  User,
  Users,
  Globe2
} from 'lucide-react';
import { AdultVideo, AdultPerformer, FolderItem } from '../types/index.js';
import { PerformerDetailModal } from './PerformerDetailModal.js';

interface AdultVideosCatalogProps {
  videos: AdultVideo[];
  performers?: AdultPerformer[];
  categories: string[];
  folders: FolderItem[];
  onSelectVideo: (video: AdultVideo, playlist?: AdultVideo[]) => void;
  onOpenNewModal: () => void;
  onOpenNewPerformerModal?: () => void;
  onEditPerformer?: (performer: AdultPerformer) => void;
  onUpdatePerformer?: (performer: AdultPerformer) => Promise<void>;
  onDeletePerformer?: (id: string) => void;
  onTogglePerformerFavorite?: (id: string) => Promise<boolean>;
  onToggleFavorite: (videoId: string) => Promise<boolean>;
  onEditVideo?: (video: AdultVideo) => void;
  onDeleteVideo?: (id: string) => void;
  onLockVault: () => void;
  onOpenSecuritySettings?: () => void;
}

export const AdultVideosCatalog: React.FC<AdultVideosCatalogProps> = ({
  videos,
  performers = [],
  categories,
  onSelectVideo,
  onOpenNewModal,
  onOpenNewPerformerModal,
  onEditPerformer,
  onUpdatePerformer,
  onDeletePerformer,
  onTogglePerformerFavorite,
  onToggleFavorite,
  onEditVideo,
  onDeleteVideo,
  onLockVault,
  onOpenSecuritySettings
}) => {
  const [activeCatalogTab, setActiveCatalogTab] = useState<'videos' | 'performers'>('videos');
  const [searchQuery, setSearchQuery] = useState('');
  const [performerSearch, setPerformerSearch] = useState('');
  const [performerFilter, setPerformerFilter] = useState<'all' | 'favorites' | 'female' | 'male' | 'trans'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPerformerForDetail, setSelectedPerformerForDetail] = useState<AdultPerformer | null>(null);
  const [isDiscreetMode, setIsDiscreetMode] = useState<boolean>(() => {
    return localStorage.getItem('drivegram_adult_discreet') === 'true';
  });

  const toggleDiscreetMode = () => {
    const next = !isDiscreetMode;
    setIsDiscreetMode(next);
    localStorage.setItem('drivegram_adult_discreet', next ? 'true' : 'false');
  };

  const favoriteVideos = videos.filter(v => !!v.isFavorite);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.performers && video.performers.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.studio && video.studio.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.aka && video.aka.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (video.tags && video.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    if (selectedCategory === 'favorites') {
      return matchesSearch && !!video.isFavorite;
    }

    const matchesCat = selectedCategory === 'all' || video.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filter performers
  const filteredPerformers = performers.filter(p => {
    const matchesText = p.name.toLowerCase().includes(performerSearch.toLowerCase()) ||
      (p.aka && p.aka.toLowerCase().includes(performerSearch.toLowerCase())) ||
      (p.nationality && p.nationality.toLowerCase().includes(performerSearch.toLowerCase())) ||
      (p.bio && p.bio.toLowerCase().includes(performerSearch.toLowerCase()));

    if (performerFilter === 'favorites') return matchesText && !!p.isFavorite;
    if (performerFilter === 'female') return matchesText && p.gender === 'female';
    if (performerFilter === 'male') return matchesText && p.gender === 'male';
    if (performerFilter === 'trans') return matchesText && p.gender === 'trans';
    return matchesText;
  });

  // Calculate video count for each performer
  const getPerformerVideoCount = (performer: AdultPerformer) => {
    const pName = performer.name.toLowerCase();
    const pAka = performer.aka ? performer.aka.toLowerCase() : '';
    return videos.filter(v => {
      const matchP = v.performers && (
        v.performers.toLowerCase().includes(pName) ||
        (pAka && v.performers.toLowerCase().includes(pAka))
      );
      const matchTags = v.tags && v.tags.some(t => t.toLowerCase().includes(pName) || (pAka && t.toLowerCase().includes(pAka)));
      const matchTitle = v.title.toLowerCase().includes(pName) || (pAka && v.title.toLowerCase().includes(pAka));
      return matchP || matchTags || matchTitle;
    }).length;
  };

  // Featured video selection
  const featuredVideo = (selectedCategory === 'favorites' ? favoriteVideos[0] : (videos.find(v => v.isFavorite) || videos[0]));

  const handlePlayAllFavorites = (shuffle = false) => {
    if (favoriteVideos.length === 0) return;
    const list = shuffle ? [...favoriteVideos].sort(() => Math.random() - 0.5) : favoriteVideos;
    onSelectVideo(list[0], list);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 p-4 sm:p-6 space-y-6 select-none">
      {/* Standardized Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-rose-900 via-red-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-rose-800/40 shrink-0">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-6 -bottom-8 opacity-10 pointer-events-none text-white">
          <LockKeyhole className="w-80 h-80" />
        </div>

        <div className="space-y-2.5 z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 backdrop-blur-md text-rose-200 text-xs font-bold uppercase tracking-wider border border-rose-500/30">
            <LockKeyhole className="w-3.5 h-3.5 text-rose-400" />
            <span>Red Locker • Biblioteca Privativa (+18)</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight py-1 drop-shadow-sm">
            Red Locker
          </h1>

          <p className="text-xs sm:text-sm text-rose-200/90 leading-relaxed">
            Espaço privativo com senha mestre, catalogação de atores e produtoras, modo discreto e reprodução contínua na nuvem Telegram.
          </p>

            <div className="pt-2 flex flex-wrap items-center gap-2.5">
              {activeCatalogTab === 'videos' ? (
                <button
                  onClick={onOpenNewModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-rose-900 hover:bg-rose-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Adicionar Vídeo</span>
                </button>
              ) : (
                <button
                  onClick={onOpenNewPerformerModal}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-rose-900 hover:bg-rose-50 text-xs font-bold shadow-lg shadow-black/20 transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-rose-600" />
                  <span>Novo Ator / Performer</span>
                </button>
              )}

              {favoriteVideos.length > 0 && activeCatalogTab === 'videos' && (
                <button
                  onClick={() => handlePlayAllFavorites(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
                  title="Reproduzir todas as cenas e vídeos favoritados em sequência"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>Favoritos ({favoriteVideos.length})</span>
                </button>
              )}

              <button
                onClick={toggleDiscreetMode}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border transition-all ${
                  isDiscreetMode
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                    : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                }`}
                title={isDiscreetMode ? 'Modo Discreto Ativado (capas desfocadas)' : 'Ativar Modo Discreto'}
              >
                {isDiscreetMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{isDiscreetMode ? 'Discreto: ON' : 'Discreto: OFF'}</span>
              </button>

              <button
                onClick={onLockVault}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-black/40 hover:bg-black/60 text-rose-300 border border-rose-800/60 text-xs font-bold transition-all active:scale-95"
                title="Bloquear cofre imediatamente"
              >
                <LockKeyhole className="w-4 h-4 text-rose-400" />
                <span>Trancar</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full md:w-auto z-10">
            <div className="p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[95px]">
              <Film className="w-4 h-4 text-rose-300 mb-1" />
              <span className="text-base font-black">{videos.length}</span>
              <span className="text-[10px] text-rose-200 uppercase font-semibold">Vídeos</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[95px]">
              <Users className="w-4 h-4 text-indigo-300 mb-1" />
              <span className="text-base font-black">{performers.length}</span>
              <span className="text-[10px] text-rose-200 uppercase font-semibold">Atores</span>
            </div>

            <div className="p-3 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center min-w-[95px] col-span-2 sm:col-span-1">
              <Star className="w-4 h-4 text-amber-300 mb-1 fill-amber-300" />
              <span className="text-base font-black">{favoriteVideos.length}</span>
              <span className="text-[10px] text-amber-200 uppercase font-semibold">Favoritos</span>
            </div>
          </div>
        </div>

        {/* Master Navigation Tabs (Vídeos vs Atores) */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
          <button
            onClick={() => setActiveCatalogTab('videos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeCatalogTab === 'videos'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Vídeos & Cenas ({videos.length})</span>
          </button>

          <button
            onClick={() => setActiveCatalogTab('performers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
              activeCatalogTab === 'performers'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Atores & Performers ({performers.length})</span>
          </button>
        </div>

        {/* ---------------- VIDEOS TAB VIEW ---------------- */}
        {activeCatalogTab === 'videos' && (
          <div className="space-y-6">
            {/* Dedicated Favorites Playlist Banner when Favorites Tab is active */}
            {selectedCategory === 'favorites' && favoriteVideos.length > 0 && (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-amber-950/60 via-rose-950/50 to-black border border-amber-500/30 shadow-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
                    <Star className="w-8 h-8 fill-amber-500" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                      Playlist Única Agrupada
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                      Playlist de Favoritos ({favoriteVideos.length})
                    </h2>
                    <p className="text-xs text-gray-300 max-w-xl mt-1">
                      Todos os vídeos favoritados em qualquer pasta do Red Locker reunidos em um único lugar para reprodução sequencial ou contínua.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-center">
                  <button
                    onClick={() => handlePlayAllFavorites(false)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-black font-black text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Reproduzir Todos</span>
                  </button>
                  <button
                    onClick={() => handlePlayAllFavorites(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all active:scale-95"
                    title="Reproduzir em ordem aleatória"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Aleatório</span>
                  </button>
                </div>
              </div>
            )}

            {/* Featured Video Spotlight Banner */}
            {featuredVideo && selectedCategory !== 'favorites' && (
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-rose-950/70 via-red-950/40 to-black border border-rose-500/20 shadow-2xl p-6 sm:p-8 flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
                <div className="relative w-40 sm:w-48 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-rose-500/40 shrink-0 bg-black/60 group">
                  <img
                    src={featuredVideo.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                    alt={featuredVideo.title}
                    draggable={false}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none ${isDiscreetMode ? 'blur-md group-hover:blur-none transition-all' : ''}`}
                  />
                  <button
                    onClick={() => onSelectVideo(featuredVideo, filteredVideos)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50">
                      <Play className="w-5 h-5 ml-1 fill-current" />
                    </div>
                  </button>

                  {/* Favorite Badge Top Right */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(featuredVideo.id);
                    }}
                    className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md transition-all shadow-md z-10 ${
                      featuredVideo.isFavorite
                        ? 'bg-amber-500 text-black'
                        : 'bg-black/60 text-white/80 hover:text-white hover:bg-black/80'
                    }`}
                    title={featuredVideo.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
                  >
                    <Star className={`w-4 h-4 ${featuredVideo.isFavorite ? 'fill-black' : ''}`} />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-between h-full space-y-3 text-center md:text-left">
                  <div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                      <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold">
                        {featuredVideo.category || 'Longas-Metragens'}
                      </span>
                      {featuredVideo.isFavorite && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>Favorito</span>
                        </span>
                      )}
                      {featuredVideo.studio && (
                        <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold">
                          {featuredVideo.studio}
                        </span>
                      )}
                      {featuredVideo.year && (
                        <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs font-mono">
                          {featuredVideo.year}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white">
                      {featuredVideo.title}
                    </h2>

                    {featuredVideo.performers && (
                      <p className="text-xs font-bold text-rose-400 mt-1">
                        Elenco: {featuredVideo.performers} {featuredVideo.aka && <span className="text-gray-300 font-normal ml-1">({featuredVideo.aka})</span>}
                      </p>
                    )}

                    {!featuredVideo.performers && featuredVideo.aka && (
                      <p className="text-xs text-gray-300 mt-1">
                        AKA / Nomes: <span className="text-rose-300 font-medium">{featuredVideo.aka}</span>
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-2 max-w-2xl line-clamp-3 leading-relaxed">
                      {featuredVideo.description || 'Assista em alta resolução com reprodução fluida protegida no cofre.'}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <button
                      onClick={() => onSelectVideo(featuredVideo, filteredVideos)}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Assistir Agora</span>
                    </button>

                    <button
                      onClick={() => onToggleFavorite(featuredVideo.id)}
                      className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                        featuredVideo.isFavorite
                          ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                          : 'bg-white/10 border-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${featuredVideo.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      <span>{featuredVideo.isFavorite ? 'Favoritado ⭐' : 'Favoritar ☆'}</span>
                    </button>

                    {onEditVideo && (
                      <button
                        onClick={() => onEditVideo(featuredVideo)}
                        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Dados</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar título, elenco, AKA, estúdio..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Category Filter Chips with FAVORITES */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  Todos ({videos.length})
                </button>

                {/* ⭐ Favoritos Filter Tab */}
                <button
                  onClick={() => setSelectedCategory('favorites')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedCategory === 'favorites'
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-md shadow-amber-500/20'
                      : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 hover:bg-amber-500/20'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${selectedCategory === 'favorites' || favoriteVideos.length > 0 ? 'fill-current' : ''}`} />
                  <span>Favoritos ({favoriteVideos.length})</span>
                </button>

                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Grid */}
            {filteredVideos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredVideos.map(video => (
                  <div
                    key={video.id}
                    className="group relative flex flex-col rounded-2xl overflow-hidden bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-rose-500/50 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Poster */}
                    <div
                      onClick={() => onSelectVideo(video, filteredVideos)}
                      className="relative aspect-[2/3] w-full overflow-hidden bg-black/60 cursor-pointer select-none"
                    >
                      <img
                        src={video.coverImage || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'}
                        alt={video.title}
                        draggable={false}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none ${isDiscreetMode ? 'blur-md group-hover:blur-none transition-all' : ''}`}
                      />

                      {/* Category badge */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <span className="px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[9px] font-black uppercase shadow">
                          {video.category || 'Filme'}
                        </span>
                      </div>

                      {/* Quick Favorite Star Button (Top Right) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(video.id);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-xl backdrop-blur-md transition-all shadow-md z-20 ${
                          video.isFavorite
                            ? 'bg-amber-500 text-black scale-105'
                            : 'bg-black/60 text-white/70 hover:text-amber-400 hover:bg-black/90 opacity-0 group-hover:opacity-100'
                        }`}
                        title={video.isFavorite ? 'Remover dos Favoritos' : 'Adicionar à Playlist de Favoritos'}
                      >
                        <Star className={`w-3.5 h-3.5 ${video.isFavorite ? 'fill-black' : ''}`} />
                      </button>

                      {/* Play Hover Trigger */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                        <div className="w-11 h-11 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                      </div>

                      {/* Edit/Delete Overlay Actions (Bottom on hover) */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        {onEditVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditVideo(video);
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                            title="Editar Dados"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteVideo && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Excluir "${video.title}"?`)) {
                                onDeleteVideo(video.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white shadow transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                      <div>
                        <h3
                          onClick={() => onSelectVideo(video, filteredVideos)}
                          className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate hover:text-rose-500 cursor-pointer transition-colors"
                          title={video.title}
                        >
                          {video.title}
                        </h3>
                        {video.performers && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {video.performers} {video.aka && <span className="text-gray-500 font-normal">({video.aka})</span>}
                          </p>
                        )}
                        {video.studio && !video.performers && (
                          <p className="text-[10px] text-gray-400 truncate">
                            {video.studio} {video.aka && <span className="text-gray-500 font-normal">({video.aka})</span>}
                          </p>
                        )}
                        {!video.studio && !video.performers && video.aka && (
                          <p className="text-[10px] text-gray-500 truncate italic">
                            AKA: {video.aka}
                          </p>
                        )}
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
                        <span className="truncate max-w-[90px]">{video.studio || video.year || '+18'}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {video.isFavorite && (
                            <span title="Favoritado">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            </span>
                          )}
                          {video.isCompleted && (
                            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Visto</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : selectedCategory === 'favorites' ? (
              /* Empty Favorites state */
              <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-amber-500/30 space-y-3">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-8 h-8 fill-amber-500/20" />
                </div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">Nenhum favorito no Red Locker ainda</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Marque com estrela ⭐ qualquer vídeo ou cena dentro de qualquer pasta do Red Locker para criar sua playlist única de favoritos aqui.
                </p>
                <button
                  onClick={() => setSelectedCategory('all')}
                  className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  Explorar Todos os Vídeos
                </button>
              </div>
            ) : (
              /* General Empty State */
              <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <LockKeyhole className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base">Nenhum item no Red Locker</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Vincule pastas de vídeos do seu Drive para catalogar e reproduzir com segurança e privacidade no Red Locker.
                </p>
                <button
                  onClick={onOpenNewModal}
                  className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all"
                >
                  Adicionar Primeiro Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---------------- PERFORMERS / ATORES TAB VIEW ---------------- */}
        {activeCatalogTab === 'performers' && (
          <div className="space-y-6">
            {/* Search & Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-drive-darkSurface p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder shadow-sm">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={performerSearch}
                  onChange={(e) => setPerformerSearch(e.target.value)}
                  placeholder="Buscar ator por nome, AKA, país..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-transparent focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  onClick={() => setPerformerFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    performerFilter === 'all'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  Todos ({performers.length})
                </button>

                <button
                  onClick={() => setPerformerFilter('favorites')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    performerFilter === 'favorites'
                      ? 'bg-amber-500 text-black shadow-md'
                      : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Favoritos ({performers.filter(p => p.isFavorite).length})</span>
                </button>

                <button
                  onClick={() => setPerformerFilter('female')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    performerFilter === 'female'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  Feminino
                </button>

                <button
                  onClick={() => setPerformerFilter('male')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    performerFilter === 'male'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  Masculino
                </button>

                <button
                  onClick={() => setPerformerFilter('trans')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    performerFilter === 'trans'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  Trans
                </button>
              </div>
            </div>

            {/* Performers Grid */}
            {filteredPerformers.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredPerformers.map(performer => {
                  const videoCount = getPerformerVideoCount(performer);
                  return (
                    <div
                      key={performer.id}
                      onClick={() => setSelectedPerformerForDetail(performer)}
                      className="group relative flex flex-col items-center text-center p-4 rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-rose-500/50 hover:shadow-2xl transition-all cursor-pointer select-none"
                    >
                      {/* Favorite Star Top Right */}
                      {onTogglePerformerFavorite && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePerformerFavorite(performer.id);
                          }}
                          className={`absolute top-3 right-3 p-1.5 rounded-xl transition-all z-10 ${
                            performer.isFavorite
                              ? 'bg-amber-500 text-black shadow-md'
                              : 'bg-black/40 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400 hover:bg-black/60'
                          }`}
                          title={performer.isFavorite ? 'Remover dos Favoritos' : 'Favoritar Performer'}
                        >
                          <Star className={`w-3.5 h-3.5 ${performer.isFavorite ? 'fill-black' : ''}`} />
                        </button>
                      )}

                      {/* Performer Photo */}
                      <div className="relative w-24 sm:w-28 aspect-square rounded-full overflow-hidden border-2 border-rose-500/40 shadow-lg group-hover:scale-105 transition-transform bg-black shrink-0 mb-3">
                        <img
                          src={performer.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                          alt={performer.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-rose-600/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[10px] font-bold text-white uppercase bg-black/60 px-2 py-1 rounded-full">
                            Ver Ficha
                          </span>
                        </div>
                      </div>

                      {/* Name & Details */}
                      <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate w-full group-hover:text-rose-500 transition-colors">
                        {performer.name}
                      </h3>

                      {performer.aka && (
                        <p className="text-[10px] text-rose-400 truncate w-full mt-0.5 font-medium">
                          AKA: {performer.aka}
                        </p>
                      )}

                      {/* Video Count Badge */}
                      <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
                        <Film className="w-3 h-3 text-rose-500" />
                        <span>{videoCount} {videoCount === 1 ? 'vídeo' : 'vídeos'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800 space-y-3">
                <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base">Nenhum ator / performer cadastrado</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  Cadastre as fichas dos atores com fotos e nomes para organizar sua galeria exclusiva e filtrar seus vídeos favoritos por ator.
                </p>
                {onOpenNewPerformerModal && (
                  <button
                    onClick={onOpenNewPerformerModal}
                    className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all"
                  >
                    Cadastrar Primeiro Ator
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      {/* Performer Profile & Gallery Detail Modal */}
      {selectedPerformerForDetail && (
        <PerformerDetailModal
          isOpen={selectedPerformerForDetail !== null}
          onClose={() => setSelectedPerformerForDetail(null)}
          performer={selectedPerformerForDetail}
          videos={videos}
          onSelectVideo={onSelectVideo}
          onEditPerformer={onEditPerformer}
          onUpdatePerformer={async (updated) => {
            if (onUpdatePerformer) {
              await onUpdatePerformer(updated);
              setSelectedPerformerForDetail(updated);
            }
          }}
          onDeletePerformer={onDeletePerformer}
          onToggleFavorite={onTogglePerformerFavorite}
          isDiscreetMode={isDiscreetMode}
        />
      )}
    </div>
  );
};
