import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  X, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Save, 
  Check, 
  Sparkles, 
  Search, 
  Star, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Key, 
  ExternalLink,
  User,
  Clock
} from 'lucide-react';
import { MovieVideo, DriveItem, OMDbSearchResultItem, OMDbMovieDetail } from '../types/index.js';
import { 
  searchOmdbMovies, 
  getOmdbMovieDetails, 
  getStoredOmdbApiKey, 
  setStoredOmdbApiKey 
} from '../services/omdbService.js';

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: MovieVideo | null;
  categories: string[];
  allFiles?: DriveItem[];
  onSave: (updated: MovieVideo) => Promise<void>;
  onAddCategory?: (category: string) => Promise<void>;
}

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=60'
];

export const EditVideoModal: React.FC<EditVideoModalProps> = ({
  isOpen,
  onClose,
  video,
  categories,
  allFiles = [],
  onSave,
  onAddCategory
}) => {
  if (!isOpen || !video) return null;

  const [title, setTitle] = useState(video.title);
  const [titlePt, setTitlePt] = useState(video.titlePt || '');
  const [category, setCategory] = useState(video.category || 'Filmes');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [genre, setGenre] = useState(video.genre || '');
  const [year, setYear] = useState(video.year?.toString() || '');
  const [director, setDirector] = useState(video.director || '');
  const [actors, setActors] = useState(video.actors || '');
  const [description, setDescription] = useState(video.description || '');
  const [coverImage, setCoverImage] = useState(video.coverImage || PRESET_COVERS[0]);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'upload' | 'url' | 'folder' | 'gallery'>('gallery');
  const [loading, setLoading] = useState(false);

  // Extra IMDb/OMDb Metadata
  const [imdbId, setImdbId] = useState(video.imdbId || '');
  const [imdbRating, setImdbRating] = useState(video.imdbRating || '');
  const [rated, setRated] = useState(video.rated || '');
  const [runtime, setRuntime] = useState(video.runtime || '');

  // OMDb Search & Metadata State
  const [isOmdbOpen, setIsOmdbOpen] = useState(false);
  const [omdbSearchQuery, setOmdbSearchQuery] = useState(video.title || '');
  const [omdbYearQuery, setOmdbYearQuery] = useState(video.year?.toString() || '');
  const [omdbApiKey, setOmdbApiKey] = useState(getStoredOmdbApiKey());
  const [isEditingOmdbKey, setIsEditingOmdbKey] = useState(false);
  const [omdbLoading, setOmdbLoading] = useState(false);
  const [omdbResults, setOmdbResults] = useState<OMDbSearchResultItem[]>([]);
  const [omdbError, setOmdbError] = useState<string | null>(null);
  const [omdbLoadedMovie, setOmdbLoadedMovie] = useState<OMDbMovieDetail | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOmdbApiKey(getStoredOmdbApiKey());
    }
  }, [isOpen]);

  const folderImageFiles = allFiles.filter(f => 
    f.parentId === video.folderId && 
    (f.type === 'image' || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(f.extension.toLowerCase()))
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

  const handleSearchOmdb = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = omdbSearchQuery.trim() || title.trim();
    if (!query) {
      setOmdbError('Digite o título do filme para buscar');
      return;
    }

    setOmdbLoading(true);
    setOmdbError(null);
    setOmdbResults([]);

    const res = await searchOmdbMovies({
      query,
      year: omdbYearQuery.trim() || undefined,
      apiKey: omdbApiKey.trim() || undefined
    });

    setOmdbLoading(false);
    if (res.error) {
      setOmdbError(res.error);
    } else if (res.results.length === 0) {
      setOmdbError('Nenhum filme encontrado com este título');
    } else {
      setOmdbResults(res.results);
    }
  };

  const handleSelectOmdbMovie = async (item: OMDbSearchResultItem) => {
    setOmdbLoading(true);
    setOmdbError(null);

    const { movie, error } = await getOmdbMovieDetails({
      imdbId: item.imdbID,
      apiKey: omdbApiKey.trim() || undefined
    });

    setOmdbLoading(false);
    if (error || !movie) {
      setOmdbError(error || 'Erro ao carregar detalhes do filme');
      return;
    }

    // Update form fields
    setTitle(movie.Title);
    if (movie.Year) {
      const cleanYear = movie.Year.replace(/\D/g, '').slice(0, 4);
      if (cleanYear) setYear(cleanYear);
    }
    if (movie.Genre && movie.Genre !== 'N/A') setGenre(movie.Genre);
    if (movie.Director && movie.Director !== 'N/A') setDirector(movie.Director);
    if (movie.Actors && movie.Actors !== 'N/A') setActors(movie.Actors);
    if (movie.Plot && movie.Plot !== 'N/A') setDescription(movie.Plot);
    if (movie.Poster && movie.Poster !== 'N/A') {
      setCoverImage(movie.Poster);
      setCustomCoverUrl(movie.Poster);
      setCoverTab('url');
    }
    if (movie.imdbID) setImdbId(movie.imdbID);
    if (movie.imdbRating && movie.imdbRating !== 'N/A') setImdbRating(movie.imdbRating);
    if (movie.Rated && movie.Rated !== 'N/A') setRated(movie.Rated);
    if (movie.Runtime && movie.Runtime !== 'N/A') setRuntime(movie.Runtime);

    setOmdbLoadedMovie(movie);
    setOmdbResults([]);
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

      await onSave({
        ...video,
        title: title.trim(),
        titlePt: titlePt.trim() || undefined,
        category,
        genre: genre.trim() || undefined,
        year: year ? parseInt(year, 10) || undefined : undefined,
        director: director.trim() || undefined,
        actors: actors.trim() || undefined,
        description: description.trim() || undefined,
        coverImage: finalCover,
        imdbId: imdbId.trim() || undefined,
        imdbRating: imdbRating.trim() || undefined,
        rated: rated.trim() || undefined,
        runtime: runtime.trim() || undefined,
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-red-600/10 via-amber-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center shadow-inner">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Editar Vídeo / Filme</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atualize metadados, OMDb e foto de capa</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* ================= OPTIONAL OMDB API METADATA PANEL ================= */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-red-500/5 to-transparent p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                <h4 className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Atualizar com Dados do OMDb
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOmdbOpen(!isOmdbOpen)}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {isOmdbOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {isOmdbOpen && (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={omdbSearchQuery}
                      onChange={(e) => setOmdbSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearchOmdb();
                        }
                      }}
                      placeholder="Nome do filme (ex: Interestelar)"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <input
                    type="text"
                    value={omdbYearQuery}
                    onChange={(e) => setOmdbYearQuery(e.target.value)}
                    placeholder="Ano"
                    className="w-24 px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleSearchOmdb()}
                    disabled={omdbLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {omdbLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Buscar</span>
                  </button>
                </div>

                {omdbError && (
                  <p className="text-[11px] font-semibold text-rose-500 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    ⚠️ {omdbError}
                  </p>
                )}

                {omdbLoadedMovie && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-bold truncate">
                        Dados de "{omdbLoadedMovie.Title}" ({omdbLoadedMovie.Year}) aplicados!
                      </span>
                    </div>
                    {omdbLoadedMovie.imdbRating && omdbLoadedMovie.imdbRating !== 'N/A' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[10px] shrink-0">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{omdbLoadedMovie.imdbRating}</span>
                      </span>
                    )}
                  </div>
                )}

                {omdbResults.length > 0 && (
                  <div className="p-2 rounded-2xl bg-white dark:bg-gray-900 border border-amber-500/40 shadow-xl space-y-1.5 max-h-52 overflow-y-auto">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 py-0.5">
                      Resultados ({omdbResults.length}):
                    </div>
                    {omdbResults.map((item) => (
                      <div
                        key={item.imdbID}
                        onClick={() => handleSelectOmdbMovie(item)}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-transparent hover:border-amber-500/30 cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-13 rounded-lg overflow-hidden bg-black/40 border border-gray-300 dark:border-gray-700 shrink-0">
                            {item.Poster && item.Poster !== 'N/A' ? (
                              <img src={item.Poster} alt={item.Title} className="w-full h-full object-cover" />
                            ) : (
                              <Film className="w-full h-full p-2 text-gray-400" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-500 transition-colors truncate">
                              {item.Title}
                            </h5>
                            <span className="text-[10px] text-gray-400 font-mono">
                              Ano: {item.Year}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-bold text-[10px] shrink-0 shadow-sm"
                        >
                          Aplicar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cover & Main Fields Layout */}
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            {/* Cover Preview */}
            <div className="relative w-36 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border-2 border-red-500/40 shrink-0 bg-black/40 group">
              <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 transition-opacity p-2 text-center">
                <span>Capa Selecionada</span>
              </div>
            </div>

            {/* Core Info Fields */}
            <div className="flex-1 space-y-3 w-full">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span>Título em Português / Nome de Exibição</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      Opcional
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  value={titlePt}
                  onChange={(e) => setTitlePt(e.target.value)}
                  placeholder="Ex: A Origem (Se preenchido, aparecerá na galeria)"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  💡 Se preenchido, esse nome terá prioridade na galeria.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Título Original / OMDb *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  {!isAddingNewCat ? (
                    <div className="flex gap-1">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(true)}
                        className="px-2 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-bold hover:bg-gray-200"
                        title="Nova categoria"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Nome"
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-red-500 bg-gray-50 dark:bg-drive-darkBg text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleCreateCategory}
                        className="px-2.5 py-1 rounded-xl bg-red-600 text-white text-xs font-bold"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(false)}
                        className="px-1.5 py-1 rounded-xl bg-gray-200 dark:bg-gray-700 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Gênero / Tags
                  </label>
                  <input
                    type="text"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Ex: Sci-Fi, Drama"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="2024"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Diretor
                  </label>
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Nome do diretor"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actors */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span>Elenco / Atores Principais</span>
            </label>
            <input
              type="text"
              value={actors}
              onChange={(e) => setActors(e.target.value)}
              placeholder="Ex: Leonardo DiCaprio, Joseph Gordon-Levitt"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Sinopse / Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a obra..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
            />
          </div>

          {/* IMDb Badges */}
          {(imdbRating || rated || runtime) && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-gray-100 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800 text-xs">
              {imdbRating && (
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>IMDb: {imdbRating}/10</span>
                </span>
              )}
              {rated && (
                <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 font-bold text-[10px] text-gray-700 dark:text-gray-300">
                  {rated}
                </span>
              )}
              {runtime && (
                <span className="flex items-center gap-1 text-[11px] text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{runtime}</span>
                </span>
              )}
            </div>
          )}

          {/* Cover Art Selection Hub */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Alterar Foto de Capa
            </label>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700/60">
              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'gallery' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'upload' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PC</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'url' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL</span>
              </button>

              {folderImageFiles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCoverTab('folder')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    coverTab === 'folder' ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Pasta ({folderImageFiles.length})</span>
                </button>
              )}
            </div>

            {/* Tab: Gallery */}
            {coverTab === 'gallery' && (
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COVERS.map((cov, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setCoverImage(cov)}
                    className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all group ${
                      coverImage === cov ? 'border-red-500 ring-2 ring-red-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                    {coverImage === cov && (
                      <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Tab: Upload */}
            {coverTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50 dark:bg-drive-darkBg/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-red-500 mb-2 animate-bounce" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Clique para selecionar uma imagem do seu computador
                </span>
                <span className="text-[11px] text-gray-400 mt-1">PNG, JPG, WebP ou GIF</span>
              </div>
            )}

            {/* Tab: URL */}
            {coverTab === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customCoverUrl}
                  onChange={(e) => {
                    setCustomCoverUrl(e.target.value);
                    if (e.target.value.trim()) setCoverImage(e.target.value.trim());
                  }}
                  placeholder="https://exemplo.com/poster.jpg"
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-xs font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>
            )}

            {/* Tab: Folder Images */}
            {coverTab === 'folder' && (
              <div className="grid grid-cols-6 gap-2">
                {folderImageFiles.map(imgFile => {
                  const url = `/api/stream/${imgFile.id}`;
                  return (
                    <button
                      type="button"
                      key={imgFile.id}
                      onClick={() => setCoverImage(url)}
                      className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all ${
                        coverImage === url ? 'border-red-500 ring-2 ring-red-500/30 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={imgFile.name} className="w-full h-full object-cover" />
                    </button>
                  );
                })}
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
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-500/25 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
