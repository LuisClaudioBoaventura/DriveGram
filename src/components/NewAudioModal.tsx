import React, { useState, useRef } from 'react';
import { 
  Headphones, 
  X, 
  Folder, 
  Sparkles, 
  Image as ImageIcon, 
  Check, 
  Music2, 
  Mic, 
  Disc, 
  Search, 
  Loader2, 
  Plus, 
  Radio, 
  Square,
  XCircle,
  Rss,
  ExternalLink,
  Layers,
  Globe,
  Link as LinkIcon
} from 'lucide-react';
import { FolderItem, AudioTrack } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';
import { fetchAndParsePodcastRss } from '../utils/podcastRssParser.js';

interface OnlinePodcastResult {
  id: string;
  title: string;
  artist: string;
  host: string;
  coverImage: string;
  genre: string;
  category: string;
  description?: string;
  feedUrl?: string;
  trackCount: number;
  releaseDate?: string;
  country?: string;
  episodes?: any[];
}

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
  onImportPodcast?: (podcastData: {
    podcastId?: string;
    title: string;
    artist?: string;
    host?: string;
    category?: string;
    genre?: string;
    description?: string;
    coverImage?: string;
    feedUrl?: string;
    folderId?: string;
    episodes?: any[];
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

const SUGGESTED_SEARCHES = [
  'Nerdcast',
  'Podpah',
  'Flow Podcast',
  'Mano a Mano',
  'Os Sócios',
  'Huberman Lab',
  'Tecnologia',
  'Ciência sem Fim'
];

export const NewAudioModal: React.FC<NewAudioModalProps> = ({
  isOpen,
  onClose,
  folders,
  categories,
  onCreateAudioShow,
  onImportPodcast,
  onAddCategory
}) => {
  const { rootFolder, folders: eligibleFolders } = getLibraryEligibleFolders('podcasts', folders);
  
  // Active Tab: 'search_online' | 'rss_feed' | 'local_folder'
  const [modalTab, setModalTab] = useState<'search_online' | 'rss_feed' | 'local_folder'>('search_online');

  // Tab 1: Local Folder state
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
  const [loadingLocal, setLoadingLocal] = useState(false);

  // Tab 2: Online Podcast Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OnlinePodcastResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [importingPodcastId, setImportingPodcastId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Tab 3: RSS Feed state
  const [rssUrlInput, setRssUrlInput] = useState('');
  const [isParsingRss, setIsParsingRss] = useState(false);
  const [rssError, setRssError] = useState<string | null>(null);
  const [parsedRssPodcast, setParsedRssPodcast] = useState<OnlinePodcastResult | null>(null);

  // AbortController refs to cancel / stop ongoing search or RSS parse
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const rssAbortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    if (!title) {
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        setTitle(folder.name.replace(/^[🎧🎵🎙️📻s]+/, '').trim());
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

  const handleSubmitLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFolderId) return;

    setLoadingLocal(true);
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
      setLoadingLocal(false);
    }
  };

  const handleStopSearch = () => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
      searchAbortControllerRef.current = null;
    }
    setIsSearching(false);
  };

  const handleStopRss = () => {
    if (rssAbortControllerRef.current) {
      rssAbortControllerRef.current.abort();
      rssAbortControllerRef.current = null;
    }
    setIsParsingRss(false);
  };

  const handleSearchPodcasts = async (queryToSearch = searchQuery) => {
    const trimmed = queryToSearch.trim();
    if (!trimmed) return;

    // Check if query is an RSS feed URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      setRssUrlInput(trimmed);
      setModalTab('rss_feed');
      handleParseRss(trimmed);
      return;
    }

    // Abort previous search if running
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/podcasts/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
      } else {
        setSearchError('Erro ao buscar podcasts. Tente novamente.');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return;
      }
      setSearchError('Falha ao conectar com o serviço de busca.');
    } finally {
      setIsSearching(false);
      searchAbortControllerRef.current = null;
    }
  };

  const handleParseRss = async (urlToParse = rssUrlInput) => {
    const trimmed = urlToParse.trim();
    if (!trimmed) return;

    if (rssAbortControllerRef.current) {
      rssAbortControllerRef.current.abort();
    }

    const controller = new AbortController();
    rssAbortControllerRef.current = controller;

    setIsParsingRss(true);
    setRssError(null);
    setParsedRssPodcast(null);

    try {
      const data = await fetchAndParsePodcastRss(trimmed, controller.signal);
      if (data && data.podcast) {
        setParsedRssPodcast({
          ...data.podcast,
          episodes: data.episodes || []
        });
      } else {
        setRssError('Não foi possível extrair dados válidos deste Feed RSS.');
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      setRssError(e.message || 'Falha ao conectar com o Feed RSS fornecido. Verifique o link.');
    } finally {
      setIsParsingRss(false);
      rssAbortControllerRef.current = null;
    }
  };

  const handleImportPodcast = async (podcast: OnlinePodcastResult) => {
    if (!onImportPodcast) return;
    setImportingPodcastId(podcast.id);
    try {
      await onImportPodcast({
        podcastId: podcast.id.startsWith('rss-') ? undefined : podcast.id,
        title: podcast.title,
        artist: podcast.artist,
        host: podcast.host || podcast.artist,
        category: podcast.category || 'Podcasts',
        genre: podcast.genre || 'Podcast',
        description: podcast.description || `Podcast oficial ${podcast.title} por ${podcast.artist || podcast.host}`,
        coverImage: podcast.coverImage,
        feedUrl: podcast.feedUrl,
        episodes: podcast.episodes
      });
      onClose();
    } catch (e) {
      console.error('Error importing podcast:', e);
    } finally {
      setImportingPodcastId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden my-8 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-500 flex items-center justify-center shadow-inner">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Adicionar Álbum / Podcast</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Busque podcasts online, adicione via Feed RSS ou vincule pastas locais</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleStopSearch();
              handleStopRss();
              onClose();
            }}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center px-6 pt-3 pb-1 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-drive-darkBg/30 gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setModalTab('search_online')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              modalTab === 'search_online'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-500'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Buscar Podcasts Online</span>
          </button>

          <button
            onClick={() => {
              handleStopSearch();
              setModalTab('rss_feed');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              modalTab === 'rss_feed'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-amber-500'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            <span>Adicionar via Feed RSS</span>
          </button>

          <button
            onClick={() => {
              handleStopSearch();
              handleStopRss();
              setModalTab('local_folder');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              modalTab === 'local_folder'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-emerald-500'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Vincular Pasta Local</span>
          </button>
        </div>

        {/* ================= TAB 1: BUSCAR PODCASTS ONLINE ================= */}
        {modalTab === 'search_online' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            {/* Search Input Bar */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Pesquisar Podcast por Nome, Assunto ou Apresentador
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearchPodcasts()}
                    placeholder="Ex: Podpah, Flow, Nerdcast, Huberman Lab, BBC, Ciência..."
                    className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-drive-darkBg rounded-2xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        handleStopSearch();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Limpar pesquisa"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search / Stop Button Switcher */}
                {isSearching ? (
                  <button
                    type="button"
                    onClick={handleStopSearch}
                    className="px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all flex items-center gap-1.5 shrink-0 active:scale-95 animate-in fade-in"
                    title="Parar e cancelar busca"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Parar Busca</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSearchPodcasts()}
                    disabled={!searchQuery.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <Search className="w-4 h-4" />
                    <span>Buscar</span>
                  </button>
                )}
              </div>

              {/* Quick Search Chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Sugestões:</span>
                {SUGGESTED_SEARCHES.map(term => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      setSearchQuery(term);
                      handleSearchPodcasts(term);
                    }}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-gray-100 dark:bg-drive-darkBg hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-800 transition-all"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Error state */}
            {searchError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-between">
                <span>{searchError}</span>
                <button
                  type="button"
                  onClick={() => setSearchError(null)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Search Results List */}
            <div className="space-y-3">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-gray-50/70 dark:bg-drive-darkBg/60 rounded-3xl border border-gray-200/60 dark:border-gray-800">
                  <div className="relative">
                    <Loader2 className="w-9 h-9 text-emerald-500 animate-spin" />
                    <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute inset-0 m-auto" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-800 dark:text-gray-200 font-bold">Buscando podcasts no acervo online...</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Consultando títulos, apresentadores e catálogo de episódios</p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleStopSearch}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all shadow-xs active:scale-95"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Parar Busca</span>
                  </button>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{searchResults.length} podcasts encontrados</span>
                    <span>Clique para adicionar à sua galeria</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchResults.map((podcast) => {
                      const isImporting = importingPodcastId === podcast.id;

                      return (
                        <div
                          key={podcast.id}
                          className="flex flex-col justify-between p-3.5 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface hover:border-emerald-500/60 transition-all shadow-sm group"
                        >
                          <div className="flex items-start gap-3">
                            {/* Podcast Cover */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden shadow bg-black/60 shrink-0 border border-gray-200 dark:border-gray-700">
                              <img
                                src={podcast.coverImage}
                                alt={podcast.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                            </div>

                            {/* Info */}
                            <div className="overflow-hidden flex-1">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-500 transition-colors" title={podcast.title}>
                                {podcast.title}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5" title={podcast.artist}>
                                {podcast.artist}
                              </p>

                              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                {podcast.genre && (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                    {podcast.genre}
                                  </span>
                                )}
                                {podcast.trackCount > 0 && (
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    🎙️ {podcast.trackCount} eps
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-drive-darkBorder/60 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleImportPodcast(podcast)}
                              disabled={isImporting}
                              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Importando Episódios...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Adicionar à Minha Galeria</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : hasSearched ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 dark:bg-drive-darkBg rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Mic className="w-10 h-10 text-gray-400 mb-2" />
                  <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">Nenhum podcast encontrado</h4>
                  <p className="text-[11px] text-gray-500 mt-1">Tente pesquisar com outro nome ou adicione diretamente via link de Feed RSS.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 text-center bg-gray-50 dark:bg-drive-darkBg rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Radio className="w-10 h-10 text-emerald-500 mb-2.5 animate-pulse" />
                  <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200">Encontre milhões de podcasts</h4>
                  <p className="text-[11px] text-gray-500 max-w-sm mt-1">
                    Digite o nome de qualquer podcast para adicioná-lo com capas e episódios completos à sua biblioteca do DriveGram.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: ADICIONAR VIA FEED RSS ================= */}
        {modalTab === 'rss_feed' && (
          <div className="p-6 flex-1 overflow-y-auto space-y-5">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <Rss className="w-4 h-4 text-amber-500" />
                <span>Importação Direta de Feed RSS</span>
              </div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                Cole o link XML / RSS de qualquer podcast (Anchor, Spotify, Substack, Podbean, Libsyn, etc.) para carregar e ouvir todos os episódios no DriveGram.
              </p>
            </div>

            {/* RSS URL Input Bar */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                URL do Feed RSS do Podcast *
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={rssUrlInput}
                    onChange={(e) => setRssUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isParsingRss && handleParseRss()}
                    placeholder="https://feeds.simplecast.com/podcast.rss ou https://anchor.fm/s/.../rss"
                    className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-drive-darkBg rounded-2xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-amber-500 focus:outline-none font-mono text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  {rssUrlInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setRssUrlInput('');
                        setParsedRssPodcast(null);
                        handleStopRss();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      title="Limpar link"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {isParsingRss ? (
                  <button
                    type="button"
                    onClick={handleStopRss}
                    className="px-4 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/25 transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
                    title="Cancelar leitura do Feed RSS"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleParseRss()}
                    disabled={!rssUrlInput.trim()}
                    className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <Rss className="w-4 h-4" />
                    <span>Carregar RSS</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error state */}
            {rssError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-between">
                <span>{rssError}</span>
                <button
                  type="button"
                  onClick={() => setRssError(null)}
                  className="text-rose-500 hover:text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* RSS Loading State */}
            {isParsingRss && (
              <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-gray-50/70 dark:bg-drive-darkBg/60 rounded-3xl border border-gray-200/60 dark:border-gray-800">
                <Loader2 className="w-9 h-9 text-amber-500 animate-spin" />
                <div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 font-bold">Processando e baixando Feed RSS...</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Extraindo metadados, capa e episódios de áudio</p>
                </div>
                <button
                  type="button"
                  onClick={handleStopRss}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all active:scale-95"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Cancelar</span>
                </button>
              </div>
            )}

            {/* Parsed RSS Podcast Preview Card */}
            {parsedRssPodcast && !isParsingRss && (
              <div className="p-5 rounded-3xl border-2 border-amber-500/40 bg-white dark:bg-drive-darkSurface shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-md bg-black shrink-0 border border-gray-200 dark:border-gray-700">
                    <img
                      src={parsedRssPodcast.coverImage}
                      alt={parsedRssPodcast.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="overflow-hidden flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-mono font-bold">
                        FEED RSS VÁLIDO
                      </span>
                      {parsedRssPodcast.category && (
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-bold">
                          {parsedRssPodcast.category}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                      {parsedRssPodcast.title}
                    </h3>
                    {parsedRssPodcast.artist && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Apresentador / Autor: <strong className="text-gray-700 dark:text-gray-200">{parsedRssPodcast.artist}</strong>
                      </p>
                    )}
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      🎙️ {parsedRssPodcast.episodes?.length || parsedRssPodcast.trackCount || 0} episódios indexados com áudio direto
                    </p>
                  </div>
                </div>

                {parsedRssPodcast.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-drive-darkBg p-3 rounded-2xl line-clamp-3">
                    {parsedRssPodcast.description}
                  </p>
                )}

                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setParsedRssPodcast(null)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Descartar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleImportPodcast(parsedRssPodcast)}
                    disabled={importingPodcastId === parsedRssPodcast.id}
                    className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95"
                  >
                    {importingPodcastId === parsedRssPodcast.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Adicionando Podcast à Galeria...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Adicionar Podcast à Minha Galeria</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: VINCULAR PASTA LOCAL ================= */}
        {modalTab === 'local_folder' && (
          <form onSubmit={handleSubmitLocal} className="p-6 space-y-4 flex-1 overflow-y-auto">
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
                  <span>Podcast</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setShowType('playlist'); setCategory('Playlists & Sets'); }}
                  className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    showType === 'playlist' ? 'bg-emerald-600/10 border-emerald-500 text-emerald-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Music2 className="w-4 h-4" />
                  <span>Playlist / Set</span>
                </button>
              </div>
            </div>

            {/* Folder Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Pasta de Origem no DriveGram *
              </label>
              <div className="relative">
                <Folder className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedFolderId}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  required
                  className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-drive-darkBg rounded-2xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none appearance-none"
                >
                  <option value="">Selecione a pasta com as faixas de áudio...</option>
                  {eligibleFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Todas as músicas ou episódios presentes nesta pasta serão indexados automaticamente.
              </p>
            </div>

            {/* Title & Artist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Título da Coleção *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={showType === 'podcast' ? 'Nome do Podcast' : 'Nome do Álbum'}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  {showType === 'podcast' ? 'Apresentador / Host' : 'Artista / Banda'}
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ex: Pink Floyd, Joe Rogan, etc."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none"
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
                  <div className="flex gap-2">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCat(true)}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="Nova Categoria"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da categoria..."
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-emerald-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleCreateNewCategory}
                      className="px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-600 text-white"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCat(false)}
                      className="px-2 py-1 text-xs text-gray-400"
                    >
                      X
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Gênero Musical / Tema
                </label>
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Ex: Rock Clássico, Entrevistas, Lo-Fi"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Descrição ou Sinopse
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve descrição sobre o conteúdo deste álbum ou podcast..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-xs border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Cover Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Imagem da Capa
              </label>

              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-black/60 shadow-md border border-gray-200 dark:border-gray-700 shrink-0">
                  <img
                    src={isCustomCover && customCoverUrl.trim() ? customCoverUrl : coverImage}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="grid grid-cols-6 gap-1.5">
                    {PRESET_COVERS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCoverImage(preset);
                          setIsCustomCover(false);
                        }}
                        className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          !isCustomCover && coverImage === preset ? 'border-emerald-500 scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <input
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => {
                      setCustomCoverUrl(e.target.value);
                      setIsCustomCover(true);
                    }}
                    placeholder="Ou cole uma URL de imagem personalizada..."
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-drive-darkBg rounded-xl text-[11px] border border-gray-200 dark:border-drive-darkBorder focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loadingLocal || !title.trim() || !selectedFolderId}
                className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loadingLocal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Criando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Criar Álbum / Podcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
