import React, { useState, useEffect } from 'react';
import { X, Edit3, Trash2, Tag, FileText, Folder, Check, Palette, Sparkles } from 'lucide-react';
import { DriveItem, FolderItem } from '../types/index.js';

interface EditItemModalProps {
  item: DriveItem | FolderItem | null;
  isFolder: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, isFolder: boolean, updates: { name: string; description?: string; tags?: string[]; color?: string }) => Promise<void>;
  onDelete: (id: string, isFolder: boolean) => Promise<void>;
}

export const EditItemModal: React.FC<EditItemModalProps> = ({
  item,
  isFolder,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1a73e8');
  const [customHex, setCustomHex] = useState('#1a73e8');

  const folderColors = [
    { label: 'Azul Google', hex: '#1a73e8' },
    { label: 'Verde Esmeralda', hex: '#34a853' },
    { label: 'Amarelo Ouro', hex: '#fbbc04' },
    { label: 'Vermelho Rubi', hex: '#ea4335' },
    { label: 'Roxo Imperial', hex: '#9333ea' },
    { label: 'Ciano Oceano', hex: '#06b6d4' },
    { label: 'Laranja Vibrante', hex: '#f97316' },
    { label: 'Rosa Pink', hex: '#ec4899' },
    { label: 'Verde Teal', hex: '#14b8a6' },
    { label: 'Índigo Noturno', hex: '#6366f1' },
    { label: 'Verde Limão', hex: '#84cc16' },
    { label: 'Cinza Slate', hex: '#64748b' }
  ];

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setDescription((item as any).description || '');
      const existingColor = (item as FolderItem).color || '#1a73e8';
      setSelectedColor(existingColor);
      setCustomHex(existingColor);
      const tags = (item as DriveItem).tags || [];
      setTagsInput(tags.join(', '));
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    await onSave(item.id, isFolder, {
      name: name.trim(),
      description: description.trim(),
      tags: parsedTags,
      color: isFolder ? selectedColor : undefined
    });

    onClose();
  };

  const handleDelete = async () => {
    await onDelete(item.id, isFolder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
          <div className="flex items-center gap-2.5">
            <div 
              className="p-2.5 rounded-2xl transition-colors shadow-sm flex items-center justify-center"
              style={{
                backgroundColor: isFolder ? `${selectedColor}20` : undefined,
                color: isFolder ? selectedColor : undefined
              }}
            >
              {isFolder ? <Folder className="w-5 h-5" style={{ color: selectedColor }} /> : <FileText className="w-5 h-5 text-blue-500" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                Editar {isFolder ? 'Pasta' : 'Arquivo'}
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs block">
                {item.name}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Nome / Título
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color Picker for Folders */}
          {isFolder && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-blue-500" />
                  <span>Cor da Pasta</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase" style={{ color: selectedColor }}>
                    {selectedColor}
                  </span>
                  <div 
                    className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-inner"
                    style={{ backgroundColor: selectedColor }}
                  />
                </div>
              </div>

              {/* Color Swatches Grid */}
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder space-y-2.5">
                <div className="grid grid-cols-6 gap-2">
                  {folderColors.map((c) => {
                    const isSelected = selectedColor.toLowerCase() === c.hex.toLowerCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => {
                          setSelectedColor(c.hex);
                          setCustomHex(c.hex);
                        }}
                        title={c.label}
                        className={`h-7 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 shadow-md'
                            : 'hover:scale-105 opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-drive-darkBorder/60">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                    Cor personalizada:
                  </span>
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                    title="Escolher cor personalizada"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => {
                      setSelectedColor(e.target.value);
                      setCustomHex(e.target.value);
                    }}
                    placeholder="#1a73e8"
                    maxLength={7}
                    className="flex-1 px-2.5 py-1 text-[11px] font-mono rounded-lg bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Descrição / Observações
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione notas ou descrição deste item..."
              rows={3}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tags (Apenas para Arquivos) */}
          {!isFolder && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: aula-01, telegram, backend"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-drive-darkBorder">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
