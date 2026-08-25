import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  BookOpen, 
  Upload, 
  Check, 
  Mic, 
  User, 
  Layers, 
  Clock, 
  HardDrive, 
  Globe, 
  Sparkles, 
  Tag,
  Bookmark,
  Image as ImageIcon
} from 'lucide-react';
import { Book } from '../types/index.js';
import { GoogleBooksSearchSection } from './GoogleBooksSearchSection.js';

interface EditBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onSave: (updatedBook: Book) => Promise<void>;
  categories: string[];
  onOpenCategoryManager?: () => void;
}

export const EditBookModal: React.FC<EditBookModalProps> = ({
  isOpen,
  onClose,
  book,
  onSave,
  categories,
  onOpenCategoryManager
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [narrationType, setNarrationType] = useState<'Humana' | 'Artificial'>('Humana');
  const [narrator, setNarrator] = useState('');
  const [version, setVersion] = useState('Estúdio de áudio');
  const [totalDuration, setTotalDuration] = useState('');
  const [saga, setSaga] = useState('N/A');
  const [fileSizeFormatted, setFileSizeFormatted] = useState('');
  const [category, setCategory] = useState('Desenvolvimento Pessoal');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('Português');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setNarrationType((book.narrationType as any) || 'Humana');
      setNarrator(book.narrator || '');
      setVersion(book.version || 'Estúdio de áudio');
      setTotalDuration(book.totalDuration || '');
      setSaga(book.saga || 'N/A');
      setFileSizeFormatted(book.fileSizeFormatted || '');
      setCategory(book.category || categories[0] || 'Desenvolvimento Pessoal');
      setGenre(book.genre || '');
      setLanguage(book.language || 'Português');
      setDescription(book.description || '');
      setCoverImage(book.coverImage || '');
    }
  }, [book, categories]);

  if (!isOpen || !book) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await onSave({
      ...book,
      title: title.trim(),
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
      coverImage: coverImage.trim() || book.coverImage
    });

    onClose();
  };

  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Editar Informações do Livro / Audiolivro</h3>
              <p className="text-[11px] text-gray-500 truncate max-w-sm">
                {book.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
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

          {/* Título & Autor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Título do Livro *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Hábitos Atômicos"
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
                placeholder="Ex: James Clear"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Tipo de Narração & Narrador */}
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
                placeholder="Ex: Carlos Silveira ou Voz Neural"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Versão & Duração */}
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
                list="version-suggestions"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <datalist id="version-suggestions">
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
                placeholder="Ex: 05h 40m ou 340 min"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Saga & Tamanho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                Saga / Série (Opcional)
              </label>
              <input
                type="text"
                value={saga}
                onChange={(e) => setSaga(e.target.value)}
                placeholder="Ex: N/A, Vol. 1, Livro #2..."
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
                placeholder="Ex: 450 MB"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Categoria, Gênero & Idioma */}
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
                placeholder="Ex: Autoajuda, Ficção..."
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

          {/* Descrição & Sinopse */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Descrição / Sinopse
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Resumo ou anotações sobre este livro..."
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Imagem de Capa */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Imagem de Capa (URL ou Upload)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-drive-darkBorder hover:bg-gray-100 dark:hover:bg-drive-darkHover text-xs font-bold flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <input
                type="file"
                ref={coverInputRef}
                onChange={handleUploadCover}
                accept="image/*"
                className="hidden"
              />
            </div>
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};
