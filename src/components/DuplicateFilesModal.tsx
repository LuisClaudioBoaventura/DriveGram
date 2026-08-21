import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Video, 
  Music, 
  Image as ImageIcon, 
  HardDrive, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { DriveItem } from '../types/index.js';

export interface DuplicateGroup {
  id: string;
  original: DriveItem;
  duplicates: DriveItem[];
  reason: string;
  totalWastedBytes: number;
}

interface DuplicateFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  currentFolderName?: string;
  onDeleteDuplicate: (fileId: string) => Promise<void>;
  onRefresh: () => void;
}

export const DuplicateFilesModal: React.FC<DuplicateFilesModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  currentFolderName,
  onDeleteDuplicate,
  onRefresh
}) => {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCleaningAll, setIsCleaningAll] = useState(false);

  const fetchDuplicates = async () => {
    setLoading(true);
    try {
      const url = currentFolderId 
        ? `/api/files/duplicates?parentId=${currentFolderId}`
        : '/api/files/duplicates';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDuplicateGroups(data);
      }
    } catch (e) {
      console.error('Error fetching duplicates:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDuplicates();
    }
  }, [isOpen, currentFolderId]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const totalWastedBytes = duplicateGroups.reduce((acc, g) => acc + g.totalWastedBytes, 0);
  const totalDuplicateFilesCount = duplicateGroups.reduce((acc, g) => acc + g.duplicates.length, 0);

  const handleCleanAllDuplicates = async () => {
    if (!confirm(`Deseja excluir permanentemente todas as ${totalDuplicateFilesCount} cópias duplicadas e liberar ${formatBytes(totalWastedBytes)} de armazenamento?`)) {
      return;
    }

    setIsCleaningAll(true);
    try {
      for (const group of duplicateGroups) {
        for (const dup of group.duplicates) {
          await onDeleteDuplicate(dup.id);
        }
      }
      await fetchDuplicates();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsCleaningAll(false);
    }
  };

  const handleDeleteSingleDuplicate = async (dupId: string) => {
    await onDeleteDuplicate(dupId);
    await fetchDuplicates();
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[88vh] rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Copy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Detector de Arquivos Duplicados
              </h3>
              <p className="text-[11px] text-gray-500">
                {currentFolderName ? `Verificando pasta: "${currentFolderName}"` : 'Verificação por tamanho exato em bytes e duração'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Banner */}
        {duplicateGroups.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>
                <strong>{totalDuplicateFilesCount} arquivos duplicados</strong> encontrados ({formatBytes(totalWastedBytes)} de espaço redundante).
              </span>
            </div>

            <button
              onClick={handleCleanAllDuplicates}
              disabled={isCleaningAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isCleaningAll ? 'Limpando...' : 'Excluir Todos os Duplicados'}</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Analisando estrutura de arquivos...
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                Nenhum arquivo duplicado detectado!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">
                Todos os arquivos desta pasta possuem tamanhos em bytes e conteúdos únicos.
              </p>
            </div>
          ) : (
            duplicateGroups.map((group) => (
              <div 
                key={group.id}
                className="rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/40 overflow-hidden shadow-sm space-y-2 p-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-drive-darkBorder text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px]">
                      {formatBytes(group.original.size)}
                    </span>
                    <span className="text-gray-500 text-[11px]">{group.reason}</span>
                  </div>

                  <span className="text-[10px] text-rose-500 font-bold">
                    +{group.duplicates.length} cópia(s)
                  </span>
                </div>

                {/* Original File */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-emerald-300 dark:border-emerald-800/60">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-gray-800 dark:text-gray-100 truncate block max-w-md">
                        {group.original.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Original • Criado em {formatDate(group.original.createdAt)}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Manter
                  </span>
                </div>

                {/* Duplicate Copies */}
                {group.duplicates.map((dup) => (
                  <div 
                    key={dup.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:border-rose-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Copy className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-200 truncate block max-w-md">
                          {dup.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Duplicata • Criado em {formatDate(dup.createdAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSingleDuplicate(dup.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-[11px] font-bold transition-colors"
                      title="Excluir esta cópia duplicada"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Excluir</span>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 text-xs">
          <span className="text-gray-400 text-[11px]">
            O DriveGram verifica bytes e metadados para proteger seu armazenamento na nuvem.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-drive-darkHover text-gray-700 dark:text-gray-200 font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
