import React, { useState } from 'react';
import { 
  Folder, 
  FileText, 
  Video, 
  Image as ImageIcon, 
  Music, 
  FileCode, 
  Archive, 
  File as GenericFile, 
  Star, 
  Trash2, 
  Send, 
  GraduationCap, 
  Edit3, 
  RotateCcw, 
  Clock,
  ArrowDownToLine,
  BookOpen,
  LockKeyhole,
  CloudUpload,
  RefreshCw
} from 'lucide-react';
import { DriveItem, FolderItem, FileType } from '../types/index.js';
import { getFilesFromDataTransfer } from '../utils/dragDropUtils.js';
import { isRedLockerFolder } from '../utils/libraryFolderUtils.js';

interface FileListProps {
  folders: FolderItem[];
  files: DriveItem[];
  allFolders?: FolderItem[];
  isAdultVaultUnlocked?: boolean;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: DriveItem) => void;
  onToggleFavorite: (id: string, isFolder: boolean) => void;
  onDeleteItem: (id: string, isFolder: boolean, permanent?: boolean, itemName?: string, itemType?: string) => void;
  onEditItem: (item: DriveItem | FolderItem, isFolder: boolean) => void;
  isTrashView?: boolean;
  onRestoreItem?: (id: string, isFolder: boolean) => void;
  onEmptyTrash?: () => void;
  onMoveItem?: (id: string, isFolder: boolean, targetParentId: string | null) => Promise<boolean>;
  onUploadToFolder?: (files: FileList | File[] | { file: File; relativePath?: string }[], targetFolderId: string) => Promise<void>;
  onRetryUploadTelegram?: (fileId: string) => Promise<any> | void;
  retryingFileIds?: string[];
}

export const FileList: React.FC<FileListProps> = ({
  folders,
  files,
  allFolders,
  isAdultVaultUnlocked = false,
  onOpenFolder,
  onOpenFile,
  onToggleFavorite,
  onDeleteItem,
  onEditItem,
  isTrashView = false,
  onRestoreItem,
  onEmptyTrash,
  onMoveItem,
  onUploadToFolder,
  onRetryUploadTelegram,
  retryingFileIds = []
}) => {
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return '—';
    }
  };

  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const msInDay = 1000 * 60 * 60 * 24;
    const elapsedDays = Math.floor((Date.now() - new Date(deletedAt).getTime()) / msInDay);
    return Math.max(0, 30 - elapsedDays);
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-rose-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-purple-500" />;
      case 'comic':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'ebook':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-500" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-amber-500" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-orange-500" />;
      default:
        return <GenericFile className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleDragStart = (e: React.DragEvent, item: DriveItem | FolderItem, isFolder: boolean) => {
    if (isTrashView) return;
    setDraggedItemId(item.id);
    const dragPayload = { id: item.id, isFolder, name: item.name };
    e.dataTransfer.setData('application/json', JSON.stringify(dragPayload));
    e.dataTransfer.setData('text/plain', item.name);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    if (isTrashView) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverFolderId === folderId) {
      setDragOverFolderId(null);
    }
  };

  const handleFolderDrop = async (e: React.DragEvent, folder: FolderItem) => {
    if (isTrashView) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setDraggedItemId(null);

    // 1. External files dropped onto folder row
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
      if (droppedItems.length > 0 && onUploadToFolder) {
        await onUploadToFolder(droppedItems, folder.id);
      }
      return;
    }

    // 2. Internal item dropped into folder row
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData) {
      try {
        const payload = JSON.parse(rawData);
        if (payload.id && payload.id !== folder.id && onMoveItem) {
          await onMoveItem(payload.id, payload.isFolder, folder.id);
        }
      } catch (err) {}
    }
  };

  return (
    <div className="p-3 sm:p-6 w-full max-w-full overflow-x-hidden">
      {/* Trash Header Banner */}
      {isTrashView && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <span>Lixeira do DriveGram</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                  Auto-limpeza em 30 dias
                </span>
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Arquivos na lixeira permanecem salvos por 30 dias antes de serem apagados definitivamente do Telegram.
              </p>
            </div>
          </div>

          {files.length > 0 || folders.length > 0 ? (
            <button
              onClick={onEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all shrink-0 active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Esvaziar Lixeira Agora</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 dark:bg-drive-darkBg border-b border-gray-200 dark:border-drive-darkBorder text-gray-500 dark:text-gray-400 font-semibold select-none">
            <tr>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-10 sm:w-12 text-center">Tipo</th>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4">Nome</th>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-44 hidden md:table-cell">
                {isTrashView ? 'Tempo Restante' : 'Modificado'}
              </th>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-20 sm:w-28">Tamanho</th>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-36 hidden sm:table-cell">Telegram</th>
              <th className="py-2.5 sm:py-3 px-2 sm:px-4 w-28 sm:w-32 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-drive-darkBorder">
            {/* Folders */}
            {folders.map((folder) => {
              const daysLeft = getDaysRemaining(folder.deletedAt);
              const isDragTarget = dragOverFolderId === folder.id;
              const isBeingDragged = draggedItemId === folder.id;
              const isLockedRedLocker = isRedLockerFolder(folder.id, allFolders || folders) && !isAdultVaultUnlocked;

              return (
                <tr
                  key={folder.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, folder, true)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                  onDrop={(e) => handleFolderDrop(e, folder)}
                  onDoubleClick={() => !isTrashView && onOpenFolder(folder.id)}
                  className={`cursor-pointer transition-colors group select-none ${
                    isBeingDragged ? 'opacity-40 bg-blue-50/20' : ''
                  } ${
                    isDragTarget 
                      ? 'bg-blue-100/90 dark:bg-blue-900/40 font-bold ring-2 ring-blue-500 ring-inset' 
                      : isLockedRedLocker
                      ? 'hover:bg-rose-50/50 dark:hover:bg-rose-950/20'
                      : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <td className="py-2.5 px-4 text-center">
                    {isLockedRedLocker ? (
                      <LockKeyhole className="w-4 h-4 inline-block text-rose-500" />
                    ) : (
                      <Folder 
                        className="w-4 h-4 inline-block" 
                        style={{ color: folder.color || '#1a73e8' }} 
                      />
                    )}
                  </td>
                  <td 
                    onClick={() => !isTrashView && onOpenFolder(folder.id)}
                    className="py-2.5 px-4 font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[130px] sm:max-w-xs md:max-w-md">{folder.name}</span>
                      {isLockedRedLocker && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[9px] font-bold shrink-0">
                          🔒 Protegido
                        </span>
                      )}
                      {isDragTarget && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold inline-flex items-center gap-1 animate-pulse shrink-0">
                          <ArrowDownToLine className="w-2.5 h-2.5" />
                          <span>Soltar para mover</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-400 hidden md:table-cell">
                    {isTrashView ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>{daysLeft} dia(s) restantes</span>
                      </span>
                    ) : (
                      formatDate(folder.updatedAt)
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">—</td>
                  <td className="py-2.5 px-4 text-gray-400 hidden sm:table-cell">Pasta</td>
                  <td className="py-2.5 px-4 text-right shrink-0 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      {isTrashView ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreItem?.(folder.id, true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-[11px]"
                            title="Restaurar da Lixeira"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(folder.id, true, true, folder.name, 'Pasta');
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Excluir Definitivamente do Telegram"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditItem(folder, true);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-drive-darkHover"
                            title="Editar / Renomear / Mudar Cor"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onToggleFavorite(folder.id, true)}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-drive-darkHover ${
                              folder.isFavorite ? 'text-amber-500' : 'text-gray-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${folder.isFavorite ? 'fill-amber-500' : ''}`} />
                          </button>
                          <button
                            onClick={() => onDeleteItem(folder.id, true, false, folder.name, 'Pasta')}
                            className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-200 dark:hover:bg-drive-darkHover"
                            title="Mover para a Lixeira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Files */}
            {files.map((file) => {
              const daysLeft = getDaysRemaining(file.deletedAt);
              const isBeingDragged = draggedItemId === file.id;

              return (
                <tr
                  key={file.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, file, false)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isTrashView && onOpenFile(file)}
                  className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/20 cursor-grab active:cursor-grabbing transition-colors group select-none ${
                    isBeingDragged ? 'opacity-40 bg-blue-50/20' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 text-center">
                    <span className="inline-block">{getFileIcon(file.type)}</span>
                  </td>
                  <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[130px] sm:max-w-xs md:max-w-md">{file.name}</span>
                        {file.courseId && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold shrink-0">
                            Aula
                          </span>
                        )}
                      </div>
                      {file.parentId && allFolders && (
                        (() => {
                          const parentFolder = allFolders.find(f => f.id === file.parentId);
                          if (!parentFolder) return null;
                          return (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenFolder(parentFolder.id);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer w-fit mt-0.5 transition-colors"
                              title={`Localizado em: ${parentFolder.name}`}
                            >
                              <Folder className="w-2.5 h-2.5 text-blue-500" />
                              <span>{parentFolder.name}</span>
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-gray-400 hidden md:table-cell">
                    {isTrashView ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        <span>{daysLeft} dia(s) restantes</span>
                      </span>
                    ) : (
                      formatDate(file.updatedAt)
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400 font-mono">
                    {formatBytes(file.size)}
                  </td>
                  <td className="py-2.5 px-4 hidden sm:table-cell">
                    {file.telegramMeta?.isUploadedToTelegram ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 rounded-full">
                        <Send className="w-2.5 h-2.5" />
                        <span>Salvas</span>
                      </span>
                    ) : retryingFileIds.includes(file.id) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-950/60 border border-sky-300 dark:border-sky-700/60 px-2.5 py-0.5 rounded-full shadow-xs animate-pulse">
                        <RefreshCw className="w-3 h-3 text-sky-600 dark:text-sky-400 animate-spin" />
                        <span>Enviando...</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRetryUploadTelegram?.(file.id);
                        }}
                        title="Salvo apenas no cache local. Clique para enviar para as Mensagens Salvas do Telegram agora"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 rounded-full transition-all active:scale-95 cursor-pointer shadow-xs"
                      >
                        <CloudUpload className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                        <span>Pendente (Enviar)</span>
                      </button>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right shrink-0 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1 shrink-0">
                      {isTrashView ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreItem?.(file.id, false);
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-[11px]"
                            title="Restaurar da Lixeira"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(file.id, false, true, file.name, file.type);
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Excluir Definitivamente do Telegram"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditItem(file, false);
                            }}
                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-drive-darkHover text-gray-400 hover:text-blue-500"
                            title="Editar Arquivo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(file.id, false);
                            }}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-drive-darkHover ${
                              file.isFavorite ? 'text-amber-500' : 'text-gray-400'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-amber-500' : ''}`} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteItem(file.id, false, false, file.name, file.type);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-200 dark:hover:bg-drive-darkHover"
                            title="Mover para a Lixeira"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
