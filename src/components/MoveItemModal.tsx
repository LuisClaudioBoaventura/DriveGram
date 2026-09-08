import React, { useState, useEffect, useMemo } from 'react';
import { X, Folder, FolderInput, Home, Search, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { DriveItem, FolderItem } from '../types/index.js';

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DriveItem | FolderItem | null;
  isFolder: boolean;
  allFolders: FolderItem[];
  onMove: (id: string, isFolder: boolean, targetParentId: string | null) => Promise<boolean>;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  isOpen,
  onClose,
  item,
  isFolder,
  allFolders,
  onMove
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize selected target with current item parentId
  useEffect(() => {
    if (item) {
      setSelectedTargetId(item.parentId || null);
      setSearchQuery('');
      setErrorMsg(null);
      setIsSubmitting(false);
    }
  }, [item, isOpen]);

  // Helper: check if candidateId is a descendant of folderId
  const isDescendant = (candidateId: string, folderId: string): boolean => {
    let curr = allFolders.find(f => f.id === candidateId);
    while (curr && curr.parentId) {
      if (curr.parentId === folderId) return true;
      curr = allFolders.find(f => f.id === curr?.parentId);
    }
    return false;
  };

  // Helper: compute full breadcrumb path for a folder
  const getFolderPath = (folderId: string): string => {
    const parts: string[] = [];
    let curr = allFolders.find(f => f.id === folderId);
    const visited = new Set<string>();
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      parts.unshift(curr.name);
      if (!curr.parentId) break;
      curr = allFolders.find(f => f.id === curr?.parentId);
    }
    return parts.join(' / ');
  };

  // Filtered and sorted folders
  const folderList = useMemo(() => {
    const active = allFolders.filter(f => !f.isTrash);
    if (!searchQuery.trim()) {
      return active.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }
    const q = searchQuery.toLowerCase().trim();
    return active
      .filter(f => f.name.toLowerCase().includes(q) || getFolderPath(f.id).toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [allFolders, searchQuery]);

  if (!isOpen || !item) return null;

  const currentParentId = item.parentId || null;
  const isTargetCurrent = selectedTargetId === currentParentId;

  const handleConfirmMove = async () => {
    if (isTargetCurrent) {
      onClose();
      return;
    }

    if (isFolder && selectedTargetId) {
      if (selectedTargetId === item.id) {
        setErrorMsg('Não é possível mover uma pasta para dentro de si mesma.');
        return;
      }
      if (isDescendant(selectedTargetId, item.id)) {
        setErrorMsg('Não é possível mover uma pasta para dentro de uma de suas subpastas.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const success = await onMove(item.id, isFolder, selectedTargetId);
      if (success) {
        onClose();
      } else {
        setErrorMsg('Falha ao mover o item. Tente novamente.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Erro inesperado ao mover item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-drive-darkBorder shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FolderInput className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Mover {isFolder ? 'Pasta' : 'Arquivo'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[240px] sm:max-w-xs font-medium">
                {item.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-drive-darkBorder shrink-0 bg-gray-50/50 dark:bg-drive-darkBg/50">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar pasta de destino..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Destination Tree List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1.5 min-h-[220px]">
          {/* Option: Root (Meu Drive) */}
          <button
            type="button"
            onClick={() => setSelectedTargetId(null)}
            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
              selectedTargetId === null
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                : 'bg-white dark:bg-drive-darkBg border-gray-100 dark:border-drive-darkBorder/60 hover:border-gray-300 dark:hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                    Meu Drive (Pasta Raiz)
                  </span>
                  {currentParentId === null && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-drive-darkHover text-[10px] text-gray-500 font-medium">
                      Local atual
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Desaninhar e mover para o nível inicial do Drive
                </span>
              </div>
            </div>
            {selectedTargetId === null && (
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" />
              </div>
            )}
          </button>

          {/* Divider */}
          <div className="py-1 px-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Pastas Disponíveis ({folderList.length})
          </div>

          {/* Folder Options */}
          {folderList.map((folder) => {
            const isSelf = isFolder && folder.id === item.id;
            const isChild = isFolder && isDescendant(folder.id, item.id);
            const isDisabled = isSelf || isChild;
            const isSelected = selectedTargetId === folder.id;
            const isCurrent = currentParentId === folder.id;
            const pathBreadcrumb = getFolderPath(folder.id);

            return (
              <button
                key={folder.id}
                type="button"
                disabled={isDisabled}
                onClick={() => !isDisabled && setSelectedTargetId(folder.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                  isDisabled
                    ? 'opacity-40 bg-gray-50 dark:bg-drive-darkBg/40 border-dashed border-gray-200 dark:border-gray-800 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white dark:bg-drive-darkBg border-gray-100 dark:border-drive-darkBorder/60 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div 
                    className="p-2 rounded-xl shrink-0"
                    style={{ backgroundColor: `${folder.color || '#1a73e8'}20` }}
                  >
                    <Folder className="w-4 h-4" style={{ color: folder.color || '#1a73e8' }} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {folder.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-drive-darkHover text-[10px] text-gray-500 font-medium shrink-0">
                          Local atual
                        </span>
                      )}
                      {isSelf && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                          Esta pasta
                        </span>
                      )}
                      {isChild && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/40 text-[10px] text-rose-600 dark:text-rose-400 font-medium shrink-0">
                          Subpasta
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 truncate block">
                      {pathBreadcrumb}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 ml-2">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            );
          })}

          {folderList.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Nenhuma pasta encontrada para a pesquisa.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover rounded-xl transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={isSubmitting || isTargetCurrent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Movendo...</span>
              </>
            ) : isTargetCurrent ? (
              <span>Já está nesta pasta</span>
            ) : (
              <>
                <span>Mover para cá</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
