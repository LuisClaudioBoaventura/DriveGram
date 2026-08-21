import React, { useState } from 'react';
import { X, Tag, Plus, Edit3, Trash2, Check, Sparkles, FolderKanban } from 'lucide-react';
import { Book } from '../types/index.js';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  onAddCategory: (category: string) => Promise<void>;
  onUpdateCategory: (oldCategory: string, newCategory: string) => Promise<void>;
  onDeleteCategory: (category: string) => Promise<void>;
  books: Book[];
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  books
}) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim());
    setNewCategoryName('');
  };

  const handleStartEdit = (category: string) => {
    setEditingCategory(category);
    setEditingName(category);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingName.trim()) return;
    await onUpdateCategory(editingCategory, editingName.trim());
    setEditingCategory(null);
    setEditingName('');
  };

  const handleDelete = async (category: string) => {
    const count = books.filter(b => b.category === category).length;
    const msg = count > 0
      ? `A categoria "${category}" possui ${count} livro(s) vinculados. Deseja realmente excluí-la?`
      : `Deseja excluir a categoria "${category}"?`;

    if (confirm(msg)) {
      await onDeleteCategory(category);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Gerenciar Categorias</h3>
              <p className="text-[11px] text-gray-500">
                Organize sua biblioteca de livros e audiolivros
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add New Category Form */}
        <form onSubmit={handleAdd} className="p-6 pb-2 border-b border-gray-100 dark:border-drive-darkBorder">
          <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
            Criar Nova Categoria
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Ex: Filosofia, Fantasia Épica, Suspense..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow disabled:opacity-50 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar</span>
            </button>
          </div>
        </form>

        {/* Categories List */}
        <div className="p-6 overflow-y-auto space-y-2 flex-1">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
            Categorias Existentes ({categories.length})
          </span>

          {categories.map((cat) => {
            const count = books.filter(b => b.category === cat).length;
            const isEditing = editingCategory === cat;

            return (
              <div
                key={cat}
                className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 dark:border-drive-darkBorder bg-gray-50/60 dark:bg-drive-darkBg/40 hover:bg-white dark:hover:bg-drive-darkSurface transition-all group"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-drive-darkBg border border-purple-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-1.5 rounded-lg bg-gray-200 dark:bg-drive-darkHover text-gray-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <Tag className="w-4 h-4 text-purple-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      {cat}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                      {count} {count === 1 ? 'livro' : 'livros'}
                    </span>
                  </div>
                )}

                {!isEditing && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
                      title="Renomear Categoria"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
                      title="Excluir Categoria"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {categories.length === 0 && (
            <p className="text-center py-6 text-xs text-gray-400">
              Nenhuma categoria cadastrada. Crie uma acima!
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gray-200 dark:bg-drive-darkHover text-gray-700 dark:text-gray-200 text-xs font-bold"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
