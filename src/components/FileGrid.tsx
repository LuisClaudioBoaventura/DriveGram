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
  MoreVertical, 
  Download, 
  Trash2, 
  GraduationCap, 
  ExternalLink,
  Send,
  Sparkles,
  Edit3,
  RotateCcw,
  Clock,
  ArrowDownToLine,
  BookOpen
} from 'lucide-react';
import { DriveItem, FolderItem, FileType } from '../types/index.js';
import { getFilesFromDataTransfer } from '../utils/dragDropUtils.js';
import { isRedLockerFolder } from '../utils/libraryFolderUtils.js';
import { LockKeyhole } from 'lucide-react';

interface FileGridProps {
  folders: FolderItem[];
  files: DriveItem[];
  allFolders?: FolderItem[];
  isAdultVaultUnlocked?: boolean;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: DriveItem) => void;
  onToggleFavorite: (id: string, isFolder: boolean) => void;
  onDeleteItem: (id: string, isFolder: boolean, permanent?: boolean, itemName?: string, itemType?: string) => void;
  onEditItem: (item: DriveItem | FolderItem, isFolder: boolean) => void;
  onAddToCourse?: (file: DriveItem) => void;
  isTrashView?: boolean;
  onRestoreItem?: (id: string, isFolder: boolean) => void;
  onEmptyTrash?: () => void;
  onMoveItem?: (id: string, isFolder: boolean, targetParentId: string | null) => Promise<boolean>;
  onUploadToFolder?: (files: FileList | File[] | { file: File; relativePath?: string }[], targetFolderId: string) => Promise<void>;
}

export const FileGrid: React.FC<FileGridProps> = ({
  folders,
  files,
  allFolders,
  isAdultVaultUnlocked = false,
  onOpenFolder,
  onOpenFile,
  onToggleFavorite,
  onDeleteItem,
  onEditItem,
  onAddToCourse,
  isTrashView,
  onRestoreItem,
  onEmptyTrash,
  onMoveItem,
  onUploadToFolder
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

  const getDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    const msInDay = 1000 * 60 * 60 * 24;
    const elapsedDays = Math.floor((Date.now() - new Date(deletedAt).getTime()) / msInDay);
    return Math.max(0, 30 - elapsedDays);
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'video':
        return <Video className="w-8 h-8 text-rose-500" />;
      case 'audio':
        return <Music className="w-8 h-8 text-purple-500" />;
      case 'comic':
        return <BookOpen className="w-8 h-8 text-blue-500" />;
      case 'ebook':
        return <BookOpen className="w-8 h-8 text-emerald-500" />;
      case 'pdf':
        return <FileText className="w-8 h-8 text-rose-600" />;
      case 'document':
        return <FileText className="w-8 h-8 text-blue-500" />;
      case 'image':
        return <ImageIcon className="w-8 h-8 text-emerald-500" />;
      case 'code':
        return <FileCode className="w-8 h-8 text-amber-500" />;
      case 'archive':
        return <Archive className="w-8 h-8 text-orange-500" />;
      default:
        return <GenericFile className="w-8 h-8 text-gray-400" />;
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

    // 1. External files dropped directly onto folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
      if (droppedItems.length > 0 && onUploadToFolder) {
        await onUploadToFolder(droppedItems, folder.id);
      }
      return;
    }

    // 2. Internal item dropped into folder
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
    <div className="p-6">
      {/* Trash Header Banner */}
      {isTrashView && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Esvaziar Lixeira Agora</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      )}

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span>Pastas ({folders.length})</span>
            <span className="text-[10px] lowercase text-gray-400 font-normal">
              (arraste itens sobre as pastas para movê-los)
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {folders.map((folder) => {
              const daysLeft = getDaysRemaining(folder.deletedAt);
              const isDragTarget = dragOverFolderId === folder.id;
              const isBeingDragged = draggedItemId === folder.id;
              const isLockedRedLocker = isRedLockerFolder(folder.id, allFolders || folders) && !isAdultVaultUnlocked;

              return (
                <div
                  key={folder.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, folder, true)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                  onDragLeave={(e) => handleFolderDragLeave(e, folder.id)}
                  onDrop={(e) => handleFolderDrop(e, folder)}
                  onDoubleClick={() => !isTrashView && onOpenFolder(folder.id)}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-2xl bg-white dark:bg-drive-darkSurface border transition-all cursor-pointer select-none ${
                    isBeingDragged ? 'opacity-40 scale-95 border-dashed border-blue-500' : ''
                  } ${
                    isDragTarget
                      ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50/80 dark:bg-blue-900/30 scale-[1.03] shadow-lg'
                      : isLockedRedLocker
                      ? 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400 dark:hover:border-rose-500 hover:shadow-md'
                      : 'border-gray-200 dark:border-drive-darkBorder hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md'
                  }`}
                >
                  {isDragTarget && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1 z-10 animate-bounce">
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>Solte aqui</span>
                    </div>
                  )}

                  <div 
                    onClick={() => !isTrashView && onOpenFolder(folder.id)}
                    className="flex items-center gap-3 overflow-hidden flex-1"
                  >
                    <div 
                      className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-transform group-hover:scale-105 relative"
                      style={{ backgroundColor: isLockedRedLocker ? 'rgba(225, 29, 72, 0.15)' : (folder.color || '#1a73e8') + '20' }}
                    >
                      {isLockedRedLocker ? (
                        <LockKeyhole className="w-5 h-5 text-rose-500" />
                      ) : (
                        <Folder 
                          className="w-5 h-5" 
                          style={{ color: folder.color || '#1a73e8' }} 
                        />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate block">
                          {folder.name}
                        </span>
                        {isLockedRedLocker && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 text-[9px] font-bold shrink-0">
                            🔒 Protegido
                          </span>
                        )}
                      </div>
                      {isTrashView && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{daysLeft}d restantes</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                    {isTrashView ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreItem?.(folder.id, true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-[11px] font-semibold"
                          title="Restaurar Pasta"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restaurar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(folder.id, true, true, folder.name, 'Pasta');
                          }}
                          className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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
                          className="p-1 rounded-md text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
                          title="Editar / Renomear / Alterar Cor"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(folder.id, true);
                          }}
                          className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-drive-darkHover ${
                            folder.isFavorite ? 'text-amber-500 opacity-100' : 'text-gray-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${folder.isFavorite ? 'fill-amber-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(folder.id, true, false, folder.name, 'Pasta');
                          }}
                          className="p-1 rounded-md text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
                          title="Mover para a Lixeira"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          {isTrashView ? `Arquivos na Lixeira (${files.length})` : `Arquivos no Telegram (${files.length})`}
        </h2>

        {files.length === 0 && folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mb-4">
              {isTrashView ? <Trash2 className="w-8 h-8 text-gray-400" /> : <Send className="w-8 h-8 -rotate-12" />}
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
              {isTrashView ? 'A lixeira está vazia' : 'Esta pasta está vazia'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              {isTrashView 
                ? 'Nenhum item foi enviado para a lixeira recentemente.'
                : 'Arraste arquivos ou pastas diretamente para cá para salvar no Telegram com armazenamento ilimitado.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {files.map((file) => {
              const daysLeft = getDaysRemaining(file.deletedAt);
              const isBeingDragged = draggedItemId === file.id;

              return (
                <div
                  key={file.id}
                  draggable={!isTrashView}
                  onDragStart={(e) => handleDragStart(e, file, false)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isTrashView && onOpenFile(file)}
                  className={`group relative flex flex-col rounded-2xl bg-white dark:bg-drive-darkSurface border transition-all cursor-grab active:cursor-grabbing overflow-hidden ${
                    isBeingDragged ? 'opacity-40 scale-95 border-dashed border-blue-500 shadow-none' : 'border-gray-200 dark:border-drive-darkBorder hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg'
                  }`}
                >
                  {/* File Thumbnail / Type Preview Banner */}
                  <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-drive-darkBg dark:to-drive-darkSurface flex items-center justify-center relative border-b border-gray-100 dark:border-drive-darkBorder">
                    {getFileIcon(file.type)}

                    {/* Telegram Sync Indicator */}
                    {!isTrashView && file.telegramMeta?.isUploadedToTelegram && (
                      <div 
                        title="Salvo nas Mensagens Salvas do Telegram"
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-semibold backdrop-blur-sm"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Telegram</span>
                      </div>
                    )}

                    {/* Trash countdown indicator */}
                    {isTrashView && (
                      <div 
                        title={`Exclusão definitiva do Telegram em ${daysLeft} dias`}
                        className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold backdrop-blur-sm"
                      >
                        <Clock className="w-2.5 h-2.5" />
                        <span>{daysLeft}d restantes</span>
                      </div>
                    )}

                    {/* Course Badge if attached to course */}
                    {!isTrashView && file.courseId && (
                      <div 
                        title="Item vinculado a um Curso"
                        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold backdrop-blur-sm"
                      >
                        <GraduationCap className="w-2.5 h-2.5" />
                        <span>Aula</span>
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div className="flex items-start justify-between gap-1 mb-2">
                      <span 
                        className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                        title={file.name}
                      >
                        {file.name}
                      </span>
                    </div>

                    {file.parentId && allFolders && (
                      (() => {
                        const parentFolder = allFolders.find(f => f.id === file.parentId);
                        if (!parentFolder) return null;
                        return (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFolder(parentFolder.id);
                            }}
                            className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 truncate mb-1.5 transition-colors"
                            title={`Localizado em: ${parentFolder.name}`}
                          >
                            <Folder className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                            <span className="truncate">{parentFolder.name}</span>
                          </div>
                        );
                      })()
                    )}

                    <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500 mt-auto pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                      <span>{formatBytes(file.size)}</span>
                      
                      <div className="flex items-center gap-1">
                        {isTrashView ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRestoreItem?.(file.id, false);
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-[11px]"
                              title="Restaurar Arquivo"
                            >
                              <RotateCcw className="w-3 h-3" />
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
                              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-drive-darkHover text-gray-400 hover:text-blue-500"
                              title="Editar / Renomear Arquivo"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(file.id, false);
                              }}
                              className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-drive-darkHover ${
                                file.isFavorite ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'fill-amber-500' : ''}`} />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteItem(file.id, false, false, file.name, file.type);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover"
                              title="Mover para a Lixeira"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
