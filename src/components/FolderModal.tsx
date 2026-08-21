import React, { useState } from 'react';
import { X, FolderPlus, Palette } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, color?: string) => Promise<boolean>;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1a73e8');

  if (!isOpen) return null;

  const colors = [
    '#1a73e8', // Blue (Drive)
    '#34a853', // Green
    '#fbbc04', // Yellow
    '#ea4335', // Red
    '#9333ea', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    await onCreateFolder(folderName.trim(), selectedColor);
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-sm">Nova Pasta</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
              Nome da Pasta
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ex: Módulo 1 - Backend Node.js"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-gray-400" />
              Cor da Pasta
            </label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    selectedColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-drive-darkSurface' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40"
            >
              Criar Pasta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
