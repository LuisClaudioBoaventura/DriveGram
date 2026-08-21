import React, { useRef, useState, useEffect } from 'react';
import { 
  HardDrive, 
  GraduationCap, 
  Star, 
  Trash2, 
  Plus, 
  FolderPlus, 
  UploadCloud, 
  FileVideo, 
  Cloud, 
  Database,
  BookOpen,
  Sparkles,
  Film,
  Tv,
  Headphones,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { TelegramAuthState } from '../types/index.js';
import { getFilesFromDataTransfer } from '../utils/dragDropUtils.js';

export type SidebarTab = 'drive' | 'courses' | 'books' | 'comics' | 'videos' | 'series' | 'podcasts' | 'adult' | 'favorites' | 'trash';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onNewFolder: () => void;
  onNewCourse: () => void;
  onNewBook: () => void;
  onNewComic: () => void;
  onNewVideo?: () => void;
  onNewSeries?: () => void;
  onNewAudio?: () => void;
  onNewAdultVideo?: () => void;
  isAdultVaultUnlocked?: boolean;
  onUploadFiles: (files: FileList | File[] | { file: File; relativePath?: string }[]) => void;
  telegramState: TelegramAuthState;
  onOpenAuth: () => void;
  onOpenSync: () => void;
  onMoveItem?: (id: string, isFolder: boolean, targetParentId: string | null) => Promise<boolean>;
  onDeleteItem?: (id: string, isFolder: boolean, permanent?: boolean, itemName?: string, itemType?: string) => void;
  onToggleFavorite?: (id: string, isFolder: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewFolder,
  onNewCourse,
  onNewBook,
  onNewComic,
  onNewVideo,
  onNewSeries,
  onNewAudio,
  onNewAdultVideo,
  isAdultVaultUnlocked,
  onUploadFiles,
  telegramState,
  onOpenAuth,
  onOpenSync,
  onMoveItem,
  onDeleteItem,
  onToggleFavorite
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // Persistent collapsed/expanded state
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('drivegram_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('drivegram_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const navItems: { id: SidebarTab; label: string; icon: React.ReactNode; badge?: string; color: string }[] = [
    { id: 'drive', label: 'Meu Drive', icon: <HardDrive className="w-4 h-4 text-blue-500" />, color: 'blue' },
    { id: 'courses', label: 'Cursos & Estudos', icon: <GraduationCap className="w-4 h-4 text-indigo-500" />, badge: 'Estúdio', color: 'indigo' },
    { id: 'books', label: 'Livros & Audiolivros', icon: <BookOpen className="w-4 h-4 text-purple-500" />, badge: 'Biblioteca', color: 'purple' },
    { id: 'comics', label: 'HQs & Mangás', icon: <Sparkles className="w-4 h-4 text-pink-500" />, badge: 'Biblioteca', color: 'pink' },
    { id: 'videos', label: 'Filmes & Vídeos', icon: <Film className="w-4 h-4 text-red-500" />, badge: 'Cinema', color: 'red' },
    { id: 'series', label: 'Séries & Animes', icon: <Tv className="w-4 h-4 text-purple-500" />, badge: 'TV Shows', color: 'purple' },
    { id: 'podcasts', label: 'Músicas & Podcasts', icon: <Headphones className="w-4 h-4 text-emerald-500" />, badge: 'Áudios', color: 'emerald' },
    { 
      id: 'adult', 
      label: 'Red Locker', 
      icon: <LockKeyhole className="w-4 h-4 text-rose-500" />, 
      badge: isAdultVaultUnlocked ? '🔓 +18' : '🔒 +18',
      color: 'rose'
    },
    { id: 'favorites', label: 'Favoritos', icon: <Star className="w-4 h-4 text-amber-500" />, color: 'amber' },
    { id: 'trash', label: 'Lixeira', icon: <Trash2 className="w-4 h-4 text-rose-500" />, color: 'rose' },
  ];

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTabId !== tabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTabId === tabId) {
      setDragOverTabId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTabId(null);

    // 1. External files dropped onto "Meu Drive"
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
      if (droppedItems.length > 0) {
        onUploadFiles(droppedItems);
      }
      return;
    }

    // 2. Internal items dropped onto sidebar tabs
    const rawData = e.dataTransfer.getData('application/json');
    if (rawData) {
      try {
        const payload = JSON.parse(rawData);
        if (!payload.id) return;

        if (tabId === 'trash' && onDeleteItem) {
          onDeleteItem(payload.id, payload.isFolder, false, payload.name, payload.isFolder ? 'Pasta' : 'Arquivo');
        } else if (tabId === 'favorites' && onToggleFavorite) {
          onToggleFavorite(payload.id, payload.isFolder);
        } else if (tabId === 'drive' && onMoveItem) {
          await onMoveItem(payload.id, payload.isFolder, null);
        }
      } catch (err) {}
    }
  };

  return (
    <aside 
      className={`flex flex-col h-full border-r border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkBg select-none shrink-0 overflow-x-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[72px] p-2.5' : 'w-64 p-3.5'
      }`}
    >
      {/* Sidebar Header with Expand/Collapse Toggle */}
      <div className={`flex items-center mb-3 ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
        {!isCollapsed && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Navegação
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
          title={isCollapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-blue-500" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Scrollable Navigation Area with Discreet Scrollbar */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scrollbar flex flex-col gap-3">
        {/* "NOVO" Action Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNewMenu(!showNewMenu)}
            title={isCollapsed ? 'Novo' : undefined}
            className={`flex items-center rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder hover:shadow-lg dark:hover:shadow-black/40 text-gray-800 dark:text-gray-100 font-semibold text-sm transition-all group ${
              isCollapsed 
                ? 'w-11 h-11 mx-auto justify-center p-0' 
                : 'w-full px-4 py-2.5 gap-3'
            }`}
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 text-white shadow group-hover:rotate-90 transition-transform duration-300 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            {!isCollapsed && <span>Novo</span>}
          </button>

          {/* New Item Dropdown Menu */}
          {showNewMenu && (
            <>
              {/* Invisible backdrop to dismiss dropdown on outside click */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNewMenu(false)} 
              />
              <div 
                className={`rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl z-50 py-2 w-64 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                  isCollapsed ? 'fixed left-20 top-16' : 'absolute left-0 top-12'
                }`}
                onMouseLeave={() => setShowNewMenu(false)}
              >
              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewFolder();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <FolderPlus className="w-4 h-4 text-blue-500" />
                <span>Nova Pasta</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  fileInputRef.current?.click();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-emerald-500" />
                <span>Upload de Arquivos</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  folderInputRef.current?.click();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-sky-500" />
                <span>Upload de Pasta Inteira</span>
              </button>

              <div className="my-1 border-t border-gray-100 dark:border-drive-darkBorder" />

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewCourse();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <FileVideo className="w-4 h-4 text-indigo-500" />
                <span>Novo Curso / Treinamento</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewBook();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-purple-500" />
                <span>Novo Livro / Audiolivro</span>
              </button>

              <button
                onClick={() => {
                  setShowNewMenu(false);
                  onNewComic();
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-pink-500" />
                <span>Nova HQ / Mangá</span>
              </button>

              {onNewVideo && (
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    onNewVideo();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Film className="w-4 h-4 text-red-500" />
                  <span>Novo Filme / Vídeo</span>
                </button>
              )}

              {onNewSeries && (
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    onNewSeries();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <Tv className="w-4 h-4 text-purple-500" />
                  <span>Nova Série / Anime</span>
                </button>
              )}

              {onNewAudio && (
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    onNewAudio();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                >
                  <Headphones className="w-4 h-4 text-emerald-500" />
                  <span>Novo Álbum / Podcast</span>
                </button>
              )}

              {onNewAdultVideo && (
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    onNewAdultVideo();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                >
                  <LockKeyhole className="w-4 h-4 text-rose-500" />
                  <span>Novo Item Red Locker (+18)</span>
                </button>
              )}
            </div>
          </>
          )}

          {/* Hidden inputs for uploading */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
              }
            }}
            multiple
            className="hidden"
          />

          <input
            type="file"
            ref={folderInputRef}
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onUploadFiles(e.target.files);
              }
            }}
            multiple
            className="hidden"
          />
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isDragTarget = dragOverTabId === item.id;

            let dropLabel = '';
            if (isDragTarget) {
              if (item.id === 'trash') dropLabel = 'Mover p/ Lixeira';
              else if (item.id === 'favorites') dropLabel = 'Adicionar aos Favoritos';
              else if (item.id === 'drive') dropLabel = 'Mover p/ Raiz';
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={(e) => handleDragLeave(e, item.id)}
                onDrop={(e) => handleDrop(e, item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`relative flex items-center rounded-2xl text-xs font-medium transition-all ${
                  isCollapsed 
                    ? 'w-11 h-11 mx-auto justify-center p-0' 
                    : 'w-full px-3 py-2.5 justify-between'
                } ${
                  isDragTarget
                    ? 'bg-blue-600 text-white font-bold ring-4 ring-blue-500/30 scale-105 shadow-md'
                    : isActive
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 ${isDragTarget ? 'text-white' : ''}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    {dropLabel ? (
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold shrink-0">{dropLabel}</span>
                    ) : item.badge ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}

                {/* Collapsed Active Dot Indicator */}
                {isCollapsed && isActive && (
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Storage Meter & Telegram Connection Status */}
      <div className="pt-3 mt-2 border-t border-gray-200 dark:border-drive-darkBorder shrink-0 flex flex-col gap-2">
        {isCollapsed ? (
          /* Collapsed Mini Cloud Status Icon Button */
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onOpenSync}
              title={`Telegram Cloud: ${telegramState.isConnected ? 'Conectado (Ilimitado)' : 'Desconectado'}\nTotal Salvo: ${formatBytes(telegramState.storageUsedBytes)}\nArquivos: ${telegramState.totalSavedFiles || 0}`}
              className="relative p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkSurface hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 transition-all shadow-sm"
            >
              <Cloud className={`w-4 h-4 ${telegramState.isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                telegramState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`} />
            </button>
          </div>
        ) : (
          /* Expanded Full Storage Card */
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Cloud className={`w-4 h-4 ${telegramState.isConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Nuvem Telegram
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                telegramState.isConnected 
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}>
                {telegramState.isConnected ? 'Conectado' : 'Desconectado'}
              </span>
            </div>

            <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-1 mb-3">
              <div className="flex justify-between">
                <span>Espaço em Nuvem:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">Ilimitado (∞)</span>
              </div>
              <div className="flex justify-between">
                <span>Total Salvo:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{formatBytes(telegramState.storageUsedBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span>Arquivos:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-200">{telegramState.totalSavedFiles || 0}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button
                onClick={onOpenSync}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <Database className="w-3.5 h-3.5" />
                <span>Gerenciar Nuvem & Backup</span>
              </button>

              {!telegramState.isConnected && (
                <button
                  onClick={onOpenAuth}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-xs font-semibold transition-all"
                >
                  <span>Conectar Telegram</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
