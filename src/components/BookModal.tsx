import React, { useState, useEffect } from 'react';
import { X, BookOpen, Headphones, Folder, Sparkles, Plus, Layers, User, Mic, Tag, Clock, HardDrive, Globe } from 'lucide-react';
import { FolderItem, DriveItem, Book } from '../types/index.js';
import { getLibraryEligibleFolders } from '../utils/libraryFolderUtils.js';
import { GoogleBooksSearchSection } from './GoogleBooksSearchSection.js';

interface BookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBook: (bookData: Partial<Book>) => Promise<void>;
  onCreateBookFromFolder: (params: {
    folderId: string;
    title?: string;
    author?: string;
    narrationType?: string;
    narrator?: string;
    version?: string;
    totalDuration?: string;
    saga?: string;
    fileSizeFormatted?: string;
    category?: string;
    genre?: string;
    language?: string;
    description?: string;
    coverImage?: string;
  }) => Promise<void>;
  availableFolders: FolderItem[];
  availableFiles: DriveItem[];
  categories?: string[];
  onOpenCategoryManager?: () => void;
}

export const BookModal: React.FC<BookModalProps> = ({
  isOpen,
  onClose,
  onCreateBook,
  onCreateBookFromFolder,
  availableFolders,
  availableFiles,
  categories = [
    'Desenvolvimento Pessoal',
    'Negócios & Carreira',
    'Ficção & Literatura',
    'Finanças & Investimentos',
    'Produtividade',
    'Tecnologia & Ciência',
    'Psicologia & Mente',
    'Biografia & História',
    'Fantasia & Sci-Fi'
  ],
  onOpenCategoryManager
}) => {
  const { rootFolder, folders: eligibleFolders, config: libConfig } = getLibraryEligibleFolders('books', availableFolders);
  const [mode, setMode] = useState<'folder' | 'manual'>('folder');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  
  // Requested Book Fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [narrationType, setNarrationType] = useState<'Humana' | 'Artificial'>('Humana');
  const [narrator, setNarrator] = useState('');
  const [version, setVersion] = useState('Estúdio de áudio');
  const [totalDuration, setTotalDuration] = useState('');
  const [saga, setSaga] = useState('N/A');
  const [fileSizeFormatted, setFileSizeFormatted] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Desenvolvimento Pessoal');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('Português');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [loading, setLoading] = useState(false);

  // When folder is chosen, auto-calculate folder size, chapter count and duration
  useEffect(() => {
    if (selectedFolderId) {
      const f = availableFolders.find(fold => fold.id === selectedFolderId);
      if (f) setTitle(f.name.replace(/^📚\s*|^🎓\s*/, ''));

      const audioFiles = availableFiles.filter(file => file.parentId === selectedFolderId && file.type === 'audio');
      const pdfFiles = availableFiles.filter(file => file.parentId === selectedFolderId && (file.type === 'pdf' || file.extension === 'epub'));
      
      const totalBytes = audioFiles.reduce((acc, file) => acc + file.size, 0) + pdfFiles.reduce((acc, file) => acc + file.size, 0);
      if (totalBytes > 0) {
        const mb = (totalBytes / (1024 * 1024)).toFixed(1);
        setFileSizeFormatted(`${mb} MB`);
      }

      if (audioFiles.length > 0 && !totalDuration) {
        const estimatedMinutes = audioFiles.length * 25;
        const h = Math.floor(estimatedMinutes / 60);
        const m = estimatedMinutes % 60;
        setTotalDuration(h > 0 ? `${h}h ${m}m` : `${m} min`);
      }
    }
  }, [selectedFolderId, availableFolders, availableFiles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'folder') {
        if (!selectedFolderId) {
          alert('Por favor, selecione uma pasta de origem no seu Drive.');
          setLoading(false);
          return;
        }
        await onCreateBookFromFolder({
          folderId: selectedFolderId,
          title: title.trim() || undefined,
          author: author.trim() || undefined,
          narrationType,
          narrator: narrator.trim() || undefined,
          version: version.trim() || undefined,
          totalDuration: totalDuration.trim() || undefined,
          saga: saga.trim() || undefined,
          fileSizeFormatted: fileSizeFormatted.trim() || undefined,
          category: category || undefined,
          genre: genre.trim() || undefined,
          language: language.trim() || undefined,
          description: description.trim() || undefined,
          coverImage: coverImage.trim() || undefined
        });
      } else {
        await onCreateBook({
          title: title.trim() || 'Novo Livro',
          author: author.trim() || 'Autor Desconhecido',
          narrationType,
          narrator: narrator.trim() || undefined,
          version: version.trim() || 'Estúdio de áudio',
          totalDuration: totalDuration.trim() || undefined,
          saga: saga.trim() || 'N/A',
          fileSizeFormatted: fileSizeFormatted.trim() || undefined,
          category: category || categories[0] || 'Desenvolvimento Pessoal',
          genre: genre.trim() || 'Geral',
          language: language.trim() || 'Português',
          description: description.trim(),
          coverImage: coverImage.trim() || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const audioCountInFolder = selectedFolderId ? availableFiles.filter(f => f.parentId === selectedFolderId && f.type === 'audio').length : 0;
  const pdfCountInFolder = selectedFolderId ? availableFiles.filter(f => f.parentId === selectedFolderId && (f.type === 'pdf' || f.extension === 'epub')).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Cadastrar Novo Livro / Audiolivro</h3>
              <p className="text-[11px] text-gray-500">Preencha as informações completas para o catálogo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 px-6 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setMode('folder')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              mode === 'folder'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'border-gray-200 dark:border-drive-darkBorder text-gray-500 hover:bg-gray-50 dark:hover:bg-drive-darkHover'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Importar Pasta do Drive (Recomendado)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              mode === 'manual'
                ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'border-gray-200 dark:border-drive-darkBorder text-gray-500 hover:bg-gray-50 dark:hover:bg-drive-darkHover'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Criar Manualmente</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Drive Folder Selector (if mode is folder) */}
          {mode === 'folder' && (
            <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-300">
                  Selecione a Pasta de Origem no Drive:
                </label>
                <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                  📁 {rootFolder ? rootFolder.name : 'Livros e Audiolivros'}
                </span>
              </div>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-black text-white border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                <option value="" className="bg-black text-white">-- Selecione uma pasta em "{rootFolder ? rootFolder.name : 'Livros e Audiolivros'}" --</option>
                {eligibleFolders.map(f => (
                  <option key={f.id} value={f.id} className="bg-black text-white">
                    📁 {f.name}
                  </option>
                ))}
              </select>

              {selectedFolderId && (
                <div className="flex items-center gap-3 pt-1 text-[11px] text-purple-700 dark:text-purple-300">
                  <span>🎧 {audioCountInFolder} arquivos de áudio detectados</span>
                  <span>📄 {pdfCountInFolder} arquivo PDF detectado</span>
                </div>
              )}
            </div>
          )}

          {/* Google Books Metadata Search (Optional Autofill) */}
          <GoogleBooksSearchSection
            initialQuery={title}
            categories={categories}
            onApplyMetadata={(meta) => {
              if (meta.title) setTitle(meta.title);
              if (meta.author) setAuthor(meta.author);
              if (meta.description) setDescription(meta.description);
              if (meta.coverImage) setCoverImage(meta.coverImage);
              if (meta.category) setCategory(meta.category);
              if (meta.genre) setGenre(meta.genre);
              if (meta.language) setLanguage(meta.language);
            }}
          />

          {/* 1. Título & Autor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Título do Livro / Audiolivro *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: O Poder do Hábito"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Autor
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ex: Charles Duhigg"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* 2. Tipo de Narração & Narrador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Tipo de Narração
              </label>
              <select
                value={narrationType}
                onChange={(e) => setNarrationType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-black text-white border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="Humana" className="bg-black text-white">🎙️ Narração Humana</option>
                <option value="Artificial" className="bg-black text-white">🤖 Narração Artificial / IA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Narrador / Locutor
              </label>
              <input
                type="text"
                value={narrator}
                onChange={(e) => setNarrator(e.target.value)}
                placeholder="Ex: Jorge Rebelo ou Voz Neural"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* 3. Versão & Duração Total */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Versão do Audiolivro
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="Ex: Estúdio de áudio, Storytel, Audible..."
                list="modal-version-suggestions"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <datalist id="modal-version-suggestions">
                <option value="Estúdio de áudio" />
                <option value="Audible Original" />
                <option value="Storytel" />
                <option value="Ubook" />
                <option value="Autopublicação" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Duração Total do Áudio
              </label>
              <input
                type="text"
                value={totalDuration}
                onChange={(e) => setTotalDuration(e.target.value)}
                placeholder="Ex: 06h 30m ou 390 min"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 4. Saga & Tamanho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Saga / Série
              </label>
              <input
                type="text"
                value={saga}
                onChange={(e) => setSaga(e.target.value)}
                placeholder="Ex: N/A, Vol. 1, Livro 2..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Tamanho do Arquivo
              </label>
              <input
                type="text"
                value={fileSizeFormatted}
                onChange={(e) => setFileSizeFormatted(e.target.value)}
                placeholder="Ex: 380 MB"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* 5. Categoria, Gênero & Idioma */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Categoria
                </label>
                {onOpenCategoryManager && (
                  <button
                    type="button"
                    onClick={onOpenCategoryManager}
                    className="text-[10px] text-purple-600 dark:text-purple-400 font-bold hover:underline"
                  >
                    + Gerenciar
                  </button>
                )}
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-black text-white border border-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-black text-white">{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Gênero
              </label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Ex: Não-ficção, Finanças..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Idioma
              </label>
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Ex: Português, Inglês..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* 6. Descrição */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Descrição / Resumo
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve resumo ou sinopse da obra..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 7. Imagem de Capa */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              URL da Imagem de Capa
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (mode === 'folder' && !selectedFolderId)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 disabled:opacity-50 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Cadastrando...' : 'Cadastrar Livro'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
