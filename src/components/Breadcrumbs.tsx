import React, { useState } from 'react';
import { ChevronRight, Home, LayoutGrid, List, ArrowUpDown, Copy, ArrowDownToLine, X, Filter, Search as SearchIcon } from 'lucide-react';
import { FolderItem, FileType } from '../types/index.js';
import { getFilesFromDataTransfer } from '../utils/dragDropUtils.js';

interface BreadcrumbsProps {
  currentPath: FolderItem[];
  onNavigate: (folderId: string | null) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  sortBy: 'name' | 'date' | 'size' | 'type';
  setSortBy: (sort: 'name' | 'date' | 'size' | 'type') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  totalItems: number;
  filterType?: FileType | 'all';
  searchQuery?: string;
  onResetFilters?: () => void;
  onOpenDuplicates?: () => void;
  onMoveItem?: (id: string, isFolder: boolean, targetParentId: string | null) => Promise<boolean>;
  onUploadToFolder?: (files: FileList | File[] | { file: File; relativePath?: string }[], targetFolderId: string | null) => Promise<void>;
}

const FILTER_LABELS: Record<string, string> = {
  video: 'Vídeos',
  comic: 'HQs & Mangás',
  ebook: 'E-books',
  pdf: 'PDFs',
  document: 'Documentos',
  image: 'Imagens',
  audio: 'Áudios',
  archive: 'Compactados',
  code: 'Código',
  subtitle: 'Legendas'
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentPath,
  onNavigate,
  viewMode,
  setViewMode,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  totalItems,
  filterType = 'all',
  searchQuery = '',
  onResetFilters,
  onOpenDuplicates,
  onMoveItem,
  onUploadToFolder
}) => {
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const key = targetId === null ? '__root__' : targetId;
    if (dragOverTargetId !== key) {
      setDragOverTargetId(key);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const key = targetId === null ? '__root__' : targetId;
    if (dragOverTargetId === key) {
      setDragOverTargetId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTargetId(null);

    // 1. External files dropped onto breadcrumb item
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
      if (droppedItems.length > 0 && onUploadToFolder) {
        await onUploadToFolder(droppedItems, targetId);
      }
      return;
    }

    // 2. Internal item dropped
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData && onMoveItem) {
      try {
        const payload = JSON.parse(rawData);
        if (payload.id && payload.id !== targetId) {
          await onMoveItem(payload.id, payload.isFolder, targetId);
        }
      } catch (err) {}
    }
  };

  const isFiltered = (filterType && filterType !== 'all') || (searchQuery && searchQuery.trim().length > 0);

  return (
    <div className="flex flex-col border-b border-gray-200 dark:border-drive-darkBorder bg-white/50 dark:bg-drive-darkBg/50 transition-colors">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Folder Navigation Trail */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-sm">
          {/* Root: Meu Drive */}
          <button
            onClick={() => onNavigate(null)}
            onDragOver={(e) => handleDragOver(e, null)}
            onDragLeave={(e) => handleDragLeave(e, null)}
            onDrop={(e) => handleDrop(e, null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all relative ${
              dragOverTargetId === '__root__'
                ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105 shadow-md font-bold'
                : currentPath.length === 0
                ? 'font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-drive-darkSurface'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-drive-darkHover'
            }`}
          >
            <Home className={`w-4 h-4 ${dragOverTargetId === '__root__' ? 'text-white' : 'text-blue-500'}`} />
            <span>Meu Drive</span>
            {dragOverTargetId === '__root__' && (
              <span className="text-[10px] bg-white/20 px-1 rounded ml-1 font-semibold">Mover p/ Raiz</span>
            )}
          </button>

          {currentPath.map((folder, idx) => {
            const isLast = idx === currentPath.length - 1;
            const isDragTarget = dragOverTargetId === folder.id;

            return (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                <button
                  onClick={() => onNavigate(folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={(e) => handleDragLeave(e, folder.id)}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl truncate max-w-[180px] transition-all relative ${
                    isDragTarget
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105 shadow-md font-bold'
                      : isLast
                      ? 'font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-drive-darkSurface'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-drive-darkHover'
                  }`}
                >
                  <span 
                    className="w-2 h-2 rounded-full shrink-0" 
                    style={{ backgroundColor: isDragTarget ? '#ffffff' : (folder.color || '#1a73e8') }}
                  />
                  <span className="truncate">{folder.name}</span>
                  {isDragTarget && (
                    <span className="text-[10px] bg-white/20 px-1 rounded ml-1 font-semibold">Mover aqui</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}

          <span className="text-xs text-gray-400 ml-2 hidden sm:inline select-none font-medium">
            ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
          </span>
        </div>

        {/* View Mode & Sort Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenDuplicates && (
            <button
              onClick={onOpenDuplicates}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100 text-xs font-semibold transition-colors"
              title="Detectar e limpar arquivos com o mesmo tamanho ou duração nesta pasta"
            >
              <Copy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Verificar Duplicados</span>
            </button>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-gray-900 text-white rounded-xl p-1 border border-gray-800 shadow-sm">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-900 text-xs text-white focus:outline-none cursor-pointer pl-1 rounded"
            >
              <option value="date">Data de Modificação</option>
              <option value="name">Nome</option>
              <option value="size">Tamanho</option>
              <option value="type">Tipo</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1 text-gray-400 hover:text-white rounded"
              title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              <ArrowUpDown className={`w-3.5 h-3.5 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
            </button>
          </div>

          {/* View mode toggle (Grid / List) */}
          <div className="flex items-center bg-gray-100 dark:bg-drive-darkSurface rounded-xl p-1 border border-gray-200 dark:border-drive-darkBorder">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-drive-darkHover text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-drive-darkHover text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Filter Banner when filterType or searchQuery is applied */}
      {isFiltered && (
        <div className="flex items-center justify-between px-6 py-2 bg-blue-50/80 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/40 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filtro Ativo:</span>
            </span>

            {filterType !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-medium text-[11px] shadow-sm">
                Tipo: {FILTER_LABELS[filterType] || filterType}
              </span>
            )}

            {searchQuery.trim().length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-medium text-[11px] flex items-center gap-1 shadow-sm">
                <SearchIcon className="w-3 h-3" />
                <span>"{searchQuery}"</span>
              </span>
            )}

            <span className="text-gray-500 dark:text-gray-400">
              — {totalItems} {totalItems === 1 ? 'resultado encontrado' : 'resultados encontrados'} {currentPath.length === 0 ? 'em todo o Meu Drive' : `dentro de "${currentPath[currentPath.length - 1].name}"`}
            </span>
          </div>

          {onResetFilters && (
            <button
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-drive-darkSurface hover:bg-gray-100 dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300 font-semibold border border-gray-200 dark:border-drive-darkBorder transition-all shrink-0 ml-2"
              title="Limpar todos os filtros e pesquisa"
            >
              <X className="w-3.5 h-3.5 text-rose-500" />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
