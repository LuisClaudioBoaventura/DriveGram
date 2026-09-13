import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Link as LinkIcon, 
  ImageIcon, 
  Check, 
  BookOpen, 
  Layers, 
  Save, 
  Loader2 
} from 'lucide-react';
import { BookSagaGroup } from '../types/index.js';

interface EditBookSagaCoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  saga: BookSagaGroup | null;
  onSaveCover: (sagaName: string, coverUrl: string) => Promise<void>;
}

const PRESET_BOOK_SAGA_COVERS = [
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507842229452-772d139c8e3a?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=60'
];

export const EditBookSagaCoverModal: React.FC<EditBookSagaCoverModalProps> = ({
  isOpen,
  onClose,
  saga,
  onSaveCover
}) => {
  if (!isOpen || !saga) return null;

  const [selectedCover, setSelectedCover] = useState<string>(
    saga.coverImage || saga.books[0]?.coverImage || PRESET_BOOK_SAGA_COVERS[0]
  );
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [coverTab, setCoverTab] = useState<'books' | 'gallery' | 'url' | 'upload'>('books');
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
      console.error('Erro ao salvar capa da saga literária:', err);
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
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                Alterar Capa da Franquia Literária
              </h3>
              <p className="text-xs text-gray-500">
                Personalize a capa principal da saga <strong className="text-purple-600 dark:text-purple-400">{saga.name}</strong>
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
            <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-xl border-2 border-purple-500/50 bg-black/60 shrink-0">
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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{saga.bookCount} {saga.bookCount === 1 ? 'livro' : 'livros/volumes'} na série</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 dark:text-gray-100 truncate">
                {saga.name}
              </h4>
              {saga.authors.length > 0 && (
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 truncate">
                  Por {saga.authors.join(', ')}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Esta imagem será exibida no card da galeria e no topo do banner da saga literária.
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
                onClick={() => setCoverTab('books')}
                className={`flex-1 min-w-[120px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'books'
                    ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Volumes ({saga.books.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCoverTab('gallery')}
                className={`flex-1 min-w-[100px] py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  coverTab === 'gallery'
                    ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm'
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
                    ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm'
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
                    ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Tab: Books */}
            {coverTab === 'books' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Clique na capa de um dos livros da saga para adotá-la como a imagem principal da franquia:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-1">
                  {saga.books.map((book, idx) => {
                    const isCurrent = selectedCover === (book.coverImage || '');
                    return (
                      <div
                        key={book.id}
                        onClick={() => book.coverImage && setSelectedCover(book.coverImage)}
                        className={`group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isCurrent
                            ? 'border-purple-600 ring-2 ring-purple-600/40 shadow-lg scale-[1.02]'
                            : 'border-gray-200 dark:border-gray-800 hover:border-purple-400 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-2 flex flex-col justify-between">
                          <span className="self-start px-1.5 py-0.5 rounded-md bg-purple-600/90 text-[9px] font-black text-white">
                            #{book.sagaOrder || idx + 1}
                          </span>
                          <span className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
                            {book.title}
                          </span>
                        </div>
                        {isCurrent && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: Gallery */}
            {coverTab === 'gallery' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">
                  Modelos estilizados com estética literária de alta resolução:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                  {PRESET_BOOK_SAGA_COVERS.map((url, idx) => {
                    const isCurrent = selectedCover === url;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedCover(url)}
                        className={`group relative aspect-[2/3] rounded-2xl overflow-hidden cursor-pointer border-2 transition-all ${
                          isCurrent
                            ? 'border-purple-600 ring-2 ring-purple-600/40 shadow-lg scale-[1.02]'
                            : 'border-gray-200 dark:border-gray-800 hover:border-purple-400 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Modelo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        {isCurrent && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab: URL */}
            {coverTab === 'url' && (
              <div className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-gray-800">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  Endereço Direto da Imagem (URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="https://exemplo.com/capa-saga.jpg"
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    Aplicar
                  </button>
                </div>
                <p className="text-[11px] text-gray-400">
                  Cole uma URL pública de imagem (Goodreads, Skoob, Amazon, Unsplash ou Fanart).
                </p>
              </div>
            )}

            {/* Tab: Upload */}
            {coverTab === 'upload' && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 rounded-3xl p-8 text-center cursor-pointer transition-all hover:bg-purple-50/50 dark:hover:bg-purple-950/20 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Clique para selecionar um arquivo do dispositivo
                  </h5>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Formatos recomendados: JPG, PNG, WEBP em proporção vertical (2:3)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-drive-darkBg/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedCover.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Capa</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
