import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  ImageIcon, 
  Check, 
  Film, 
  Layers, 
  Save, 
  Loader2 
} from 'lucide-react';
import { MovieSagaGroup } from '../types/index.js';

interface EditSagaCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  saga: MovieSagaGroup | null;
  onSaveCover: (sagaName: string, coverUrl: string) => Promise<void>;
}

const PRESET_SAGA_COVERS = [
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=60'
];

export const EditSagaCoverModal: React.FC<EditSagaCoverModalProps> = ({
  isOpen,
  onClose,
  saga,
  onSaveCover
}) => {
  if (!isOpen || !saga) return null;

  const [selectedCover, setSelectedCover] = useState<string>(
    saga.coverImage || saga.movies[0]?.coverImage || PRESET_SAGA_COVERS[0]
  );
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'movies' | 'gallery' | 'url' | 'upload'>('movies');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedCover(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyUrl = () => {
    if (customCoverUrl.trim()) {
      setSelectedCover(customCoverUrl.trim());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCover.trim()) return;

    setLoading(true);
    try {
      await onSaveCover(saga.name, selectedCover.trim());
      onClose();
    } catch (err) {
      console.error('Erro ao salvar capa da saga:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-drive-darkSurface rounded-3xl w-full max-w-2xl border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-drive-darkBg/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                Alterar Capa da Saga
              </h3>
              <p className="text-xs text-gray-500">
                Personalize o pôster principal da franquia <strong className="text-red-500">{saga.name}</strong>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Preview Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-100 dark:border-gray-800">
            <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border-2 border-red-500/40 bg-black/60 shrink-0">
              <img
                src={selectedCover}
                alt="Preview da Capa"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Pré-visualização
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[11px] font-bold">
                <Film className="w-3.5 h-3.5" />
                <span>{saga.movieCount} {saga.movieCount === 1 ? 'filme' : 'filmes'} na franquia</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-gray-100 truncate">
                {saga.name}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esta imagem será exibida no card da galeria e no topo do banner da saga.
              </p>
            </div>
          </div>

          {/* Cover Art Hub */}
          <div className="space-y-4">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              Fonte da Imagem de Capa
            </label>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/60 p-1 rounded-2xl border border-gray-200 dark:border-gray-700/60 overflow-x-auto">
              <button
                type="button"
                onClick={() => setCoverTab('movies')}
                className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'movies'
                    ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Filmes da Saga ({saga.movies.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'gallery'
                    ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Modelos</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('url')}
                className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'url'
                    ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Link / URL</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('upload')}
                className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'upload'
                    ? 'bg-white dark:bg-drive-darkSurface text-red-500 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Tab: Movies from this Saga */}
            {coverTab === 'movies' && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Clique no pôster de qualquer um dos filmes abaixo para adotá-lo como a capa oficial da saga:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-64 overflow-y-auto p-1">
                  {saga.movies.map((m, idx) => {
                    const isSelected = selectedCover === m.coverImage;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => m.coverImage && setSelectedCover(m.coverImage)}
                        className={`group relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all text-left bg-black/40 ${
                          isSelected
                            ? 'border-red-500 ring-2 ring-red-500/40 scale-105 shadow-lg'
                            : 'border-transparent opacity-80 hover:opacity-100 hover:border-gray-400 dark:hover:border-gray-600'
                        }`}
                      >
                        <img
                          src={m.coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=60'}
                          alt={m.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-black">
                          #{m.sagaOrder ?? (idx + 1)}
                        </div>
                        {isSelected && (
                          <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                              <Check className="w-4 h-4" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                          <p className="text-[10px] text-white font-bold truncate">
                            {m.titlePt || m.title}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Gallery Presets */}
            {coverTab === 'gallery' && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {PRESET_SAGA_COVERS.map((cov, idx) => {
                  const isSelected = selectedCover === cov;
                  return (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setSelectedCover(cov)}
                      className={`relative rounded-xl overflow-hidden aspect-[2/3] border-2 transition-all group ${
                        isSelected
                          ? 'border-red-500 ring-2 ring-red-500/30 scale-105 shadow-md'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={cov} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab: URL */}
            {coverTab === 'url' && (
              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-700/60">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="Cole o link da imagem (ex: https://site.com/poster.jpg)"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-drive-darkSurface text-gray-900 dark:text-gray-100 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm"
                  >
                    Usar Link
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 block">
                  💡 Cole o link de um pôster de sites como IMDb, TMDB, Fanart.tv ou Google Imagens.
                </span>
              </div>
            )}

            {/* Tab: Upload */}
            {coverTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50 dark:bg-drive-darkBg/50 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Clique para selecionar uma imagem do seu dispositivo
                </span>
                <span className="text-[10px] text-gray-400 mt-1">
                  Formatos aceitos: JPG, PNG, WEBP
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-drive-darkBg/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedCover}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Capa da Saga</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
