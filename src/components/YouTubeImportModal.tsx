import React, { useState, useEffect } from 'react';
import { 
  X, 
  Youtube, 
  Search, 
  Loader2, 
  GraduationCap, 
  Radio, 
  Film, 
  Tv, 
  Check, 
  Folder, 
  FolderPlus, 
  Clock, 
  Play, 
  ExternalLink, 
  Sparkles, 
  AlertCircle, 
  ListChecks, 
  Layers,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { FolderItem } from '../types/index.js';

export type YouTubeTargetType = 'course' | 'podcast' | 'series' | 'video';

interface YouTubeVideoItem {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  author?: string;
  publishedAt?: string;
  url: string;
  embedUrl: string;
}

interface YouTubeParsedResult {
  type: 'playlist' | 'channel' | 'video';
  id: string;
  title: string;
  description: string;
  author: string;
  channelId?: string;
  coverImage: string;
  bannerImage?: string;
  videoCount: number;
  totalDurationSeconds: number;
  videos: YouTubeVideoItem[];
}

interface YouTubeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: YouTubeTargetType;
  allFolders?: FolderItem[];
  onImportSuccess?: (result: { targetType: YouTubeTargetType; item: any }) => void;
}

export const YouTubeImportModal: React.FC<YouTubeImportModalProps> = ({
  isOpen,
  onClose,
  initialType = 'course',
  allFolders = [],
  onImportSuccess
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<YouTubeParsedResult | null>(null);

  // Configuration states
  const [targetType, setTargetType] = useState<YouTubeTargetType>(initialType);
  const [customTitle, setCustomTitle] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [isListExpanded, setIsListExpanded] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  // Get corresponding default root folder name for target type
  const getDefaultTargetFolderName = (type: YouTubeTargetType) => {
    switch (type) {
      case 'course': return '🎓 Cursos & Treinamentos';
      case 'podcast': return '🎙️ Músicas & Podcasts';
      case 'series': return '🎬 Séries & TV Shows';
      case 'video': return '🎥 Filmes & Vídeos';
    }
  };

  const getDefaultTargetFolder = (type: YouTubeTargetType): FolderItem | undefined => {
    const aliases: Record<YouTubeTargetType, string[]> = {
      course: ['cursos & treinamentos', 'cursos e treinamentos', 'cursos', 'treinamentos', 'aulas'],
      podcast: ['musicas e podcasts', 'músicas e podcasts', 'musicas & podcasts', 'músicas & podcasts', 'podcasts', 'músicas', 'musicas'],
      series: ['séries & tv shows', 'series & tv shows', 'séries e tv shows', 'series e tv shows', 'séries', 'series'],
      video: ['filmes & vídeos', 'filmes e vídeos', 'filmes & videos', 'filmes e videos', 'filmes', 'vídeos', 'videos']
    };
    const targetAliases = aliases[type] || [];
    return allFolders.find(f => {
      if (f.parentId) return false;
      const normalized = f.name.toLowerCase().replace(/^[^\w\s]+|\s+/g, ' ').trim();
      return targetAliases.some(alias => normalized === alias || normalized.includes(alias));
    });
  };

  const handleSelectTargetType = (type: YouTubeTargetType) => {
    setTargetType(type);
    const defaultFolder = getDefaultTargetFolder(type);
    setSelectedFolderId(defaultFolder ? defaultFolder.id : '');
  };

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setTargetType(initialType);
      const defaultFolder = getDefaultTargetFolder(initialType);
      setSelectedFolderId(defaultFolder ? defaultFolder.id : '');
    } else {
      setUrlInput('');
      setParseError(null);
      setParsedData(null);
      setIsParsing(false);
      setIsImporting(false);
      setImportProgress(null);
    }
  }, [isOpen, initialType, allFolders]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('youtu')) {
        setUrlInput(text.trim());
        handleParse(text.trim());
      }
    } catch (e) {}
  };

  const handleParse = async (urlToParse = urlInput) => {
    const trimmed = urlToParse.trim();
    if (!trimmed) {
      setParseError('Por favor, cole um link do YouTube (Canal, Playlist ou Vídeo).');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setParsedData(null);

    try {
      const res = await fetch('/api/youtube/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Falha ao analisar o link do YouTube.');
      }

      const data: YouTubeParsedResult = await res.json();
      setParsedData(data);
      setCustomTitle(data.title || 'Conteúdo do YouTube');
      setCustomAuthor(data.author || 'YouTube');

      // Auto-detect best destination if not explicitly locked
      if (data.type === 'playlist') {
        // Playlists are great as courses or podcasts
        if (targetType === 'video') handleSelectTargetType('course');
      } else if (data.type === 'video') {
        handleSelectTargetType('video');
      }

      // Pre-select all videos
      const allIds = new Set(data.videos.map(v => v.id));
      setSelectedVideoIds(allIds);
    } catch (err: any) {
      setParseError(err.message || 'Não foi possível carregar as informações do link.');
    } finally {
      setIsParsing(false);
    }
  };

  const toggleSelectVideo = (id: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!parsedData) return;
    if (selectedVideoIds.size === parsedData.videos.length) {
      setSelectedVideoIds(new Set());
    } else {
      setSelectedVideoIds(new Set(parsedData.videos.map(v => v.id)));
    }
  };

  const formatTotalTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}min`;
    return `${mins} min`;
  };

  const handleImport = async () => {
    if (!parsedData) return;
    if (selectedVideoIds.size === 0) {
      setParseError('Selecione ao menos um vídeo para importar.');
      return;
    }

    const selectedVideos = parsedData.videos.filter(v => selectedVideoIds.has(v.id));

    setIsImporting(true);
    setImportProgress('Criando estrutura e pastas no DriveGram...');

    try {
      const res = await fetch('/api/youtube/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput,
          targetType,
          title: customTitle.trim() || parsedData.title,
          author: customAuthor.trim() || parsedData.author,
          description: parsedData.description,
          coverImage: parsedData.coverImage,
          folderId: selectedFolderId || undefined,
          category: customCategory || undefined,
          selectedVideos
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao importar conteúdo.');
      }

      const result = await res.json();
      setImportProgress('Importação concluída com sucesso!');
      
      setTimeout(() => {
        setIsImporting(false);
        onClose();
        if (onImportSuccess) {
          onImportSuccess(result);
        }
      }, 600);
    } catch (err: any) {
      setIsImporting(false);
      setParseError(err.message || 'Falha ao salvar os itens no banco de dados.');
    }
  };

  // Quick suggestion chips
  const quickSuggestions = [
    { label: '🔥 Curso TypeScript', url: 'https://www.youtube.com/playlist?list=PLHz_AreHm4dkZ_wBx-8m8QCaDLm54n6WU' },
    { label: '🎙️ Flow Podcast', url: 'https://www.youtube.com/@FlowPodcast' },
    { label: '🎵 Lo-Fi Beats', url: 'https://www.youtube.com/playlist?list=PLOzDu-MXXLliO9fBNZOQTBDddoA3FzZUo' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-800/80 overflow-hidden text-gray-900 dark:text-gray-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-800/80 bg-gradient-to-r from-red-500/10 via-transparent to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/30">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Importar do YouTube
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                  Global
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Puxe canais, playlists ou vídeos completos e organize nas suas bibliotecas
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Step 1: Input URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Link do Canal, Playlist ou Vídeo
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://www.youtube.com/playlist?list=... ou @nome_do_canal"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && urlInput.trim()) {
                      handleParse();
                    }
                  }}
                  className="w-full pl-10 pr-24 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                />
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-200/80 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Colar
                </button>
              </div>

              <button
                onClick={() => handleParse()}
                disabled={isParsing || !urlInput.trim()}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-95 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-red-600/25 transition-all shrink-0"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analisando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Buscar</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggestions Chips */}
            {!parsedData && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] text-gray-400">Exemplos rápidos:</span>
                {quickSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setUrlInput(s.url);
                      handleParse(s.url);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 border border-gray-200/60 dark:border-gray-700/60 transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Parse Error */}
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Erro ao buscar conteúdo: </span>
                {parseError}
              </div>
            </div>
          )}

          {/* Parsed Content & Configuration */}
          {parsedData && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Preview Banner / Card */}
              <div className="relative flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/60 dark:from-gray-800/80 dark:to-gray-800/40 border border-gray-200 dark:border-gray-700/80 overflow-hidden">
                <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-black shrink-0 shadow-md">
                  <img
                    src={parsedData.coverImage}
                    alt={parsedData.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white uppercase tracking-wider">
                      {parsedData.type === 'channel' ? 'Canal' : parsedData.type === 'playlist' ? 'Playlist' : 'Vídeo'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-2">
                      {parsedData.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium flex items-center gap-1.5">
                      <span>{parsedData.author}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                      <ListChecks className="w-3.5 h-3.5" />
                      {parsedData.videoCount} vídeos encontrados
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTotalTime(parsedData.totalDurationSeconds)} total
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2: Destination Selector */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-red-500" />
                  Como deseja salvar este conteúdo?
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Option 1: Course */}
                  <button
                    type="button"
                    onClick={() => handleSelectTargetType('course')}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      targetType === 'course'
                        ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      {targetType === 'course' && <Check className="w-4 h-4 text-blue-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">🎓 Curso & Aulas</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Aulas, notas e progresso
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Podcast / Audio */}
                  <button
                    type="button"
                    onClick={() => handleSelectTargetType('podcast')}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      targetType === 'podcast'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Radio className="w-4 h-4" />
                      </div>
                      {targetType === 'podcast' && <Check className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">🎙️ Podcast & Música</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Com vinil flutuante
                      </div>
                    </div>
                  </button>

                  {/* Option 3: Series */}
                  <button
                    type="button"
                    onClick={() => handleSelectTargetType('series')}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      targetType === 'series'
                        ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/30'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
                        <Tv className="w-4 h-4" />
                      </div>
                      {targetType === 'series' && <Check className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">🎬 Séries & Shows</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Temporadas e episódios
                      </div>
                    </div>
                  </button>

                  {/* Option 4: Videos */}
                  <button
                    type="button"
                    onClick={() => handleSelectTargetType('video')}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between ${
                      targetType === 'video'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30'
                        : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                        <Film className="w-4 h-4" />
                      </div>
                      {targetType === 'video' && <Check className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs">🎥 Vídeos / Filmes</div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Catálogo de vídeos
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Title, Author & Folder Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Título no DriveGram
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {targetType === 'course' ? 'Instrutor / Canal' : targetType === 'podcast' ? 'Apresentador / Artista' : 'Criador / Canal'}
                  </label>
                  <input
                    type="text"
                    value={customAuthor}
                    onChange={(e) => setCustomAuthor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-blue-500" />
                      Pasta de Destino no "Meu Drive"
                    </span>
                    <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                      Padrão: {getDefaultTargetFolderName(targetType)}
                    </span>
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  >
                    <option value="">
                      ✨ Criar automaticamente em "{getDefaultTargetFolderName(targetType)}"
                    </option>
                    {allFolders.map((f) => {
                      const isDefault = f.id === getDefaultTargetFolder(targetType)?.id;
                      return (
                        <option key={f.id} value={f.id}>
                          📁 {f.name} {isDefault ? ' ⭐ (Pasta Padrão desta Categoria)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Step 4: Video Selection List */}
              <div className="space-y-2 border border-gray-200 dark:border-gray-700/80 rounded-2xl overflow-hidden">
                <div 
                  onClick={() => setIsListExpanded(!isListExpanded)}
                  className="flex items-center justify-between px-4 py-3 bg-gray-100/80 dark:bg-gray-800/80 cursor-pointer hover:bg-gray-200/60 dark:hover:bg-gray-700/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAll();
                      }}
                      className="p-1 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selectedVideoIds.size === parsedData.videos.length
                          ? 'bg-red-600 border-red-600 text-white'
                          : selectedVideoIds.size > 0
                          ? 'bg-red-600/30 border-red-600 text-white'
                          : 'border-gray-400 bg-transparent'
                      }`}>
                        {selectedVideoIds.size > 0 && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Vídeos a Importar ({selectedVideoIds.size} de {parsedData.videos.length} selecionados)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {isListExpanded ? 'Ocultar' : 'Ver todos'}
                    </span>
                    {isListExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {isListExpanded && (
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/80 p-1">
                    {parsedData.videos.map((v, idx) => {
                      const isSelected = selectedVideoIds.has(v.id);
                      return (
                        <div
                          key={v.id}
                          onClick={() => toggleSelectVideo(v.id)}
                          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSelected 
                              ? 'bg-red-500/5 hover:bg-red-500/10' 
                              : 'opacity-60 hover:opacity-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-red-600 border-red-600 text-white'
                              : 'border-gray-400 bg-transparent'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>

                          <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-black shrink-0">
                            <img
                              src={v.thumbnail}
                              alt={v.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60';
                              }}
                            />
                            <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold px-1 rounded bg-black/80 text-white">
                              {v.duration}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {idx + 1}. {v.title}
                            </h5>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">
                              {v.author || parsedData.author}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>

          {parsedData && (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || selectedVideoIds.size === 0}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{importProgress || 'Importando...'}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>
                    Importar {selectedVideoIds.size} {selectedVideoIds.size === 1 ? 'Vídeo' : 'Vídeos'} para {
                      targetType === 'course' ? 'Cursos' :
                      targetType === 'podcast' ? 'Podcasts' :
                      targetType === 'series' ? 'Séries' : 'Vídeos'
                    }
                  </span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
