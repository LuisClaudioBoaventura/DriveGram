import React, { useState } from 'react';
import { 
  Search, 
  Send, 
  RefreshCw, 
  Moon, 
  Sun, 
  HardDrive, 
  ShieldCheck, 
  Video, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  GraduationCap,
  Layers,
  BookOpen,
  Archive,
  FileCode,
  Key,
  Youtube,
  Menu,
  Smartphone,
  X
} from 'lucide-react';
import { TelegramAuthState, FileType } from '../types/index.js';
import { YouTubeTargetType } from './YouTubeImportModal.js';

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: FileType | 'all';
  setFilterType: (t: FileType | 'all') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  telegramState: TelegramAuthState;
  onOpenAuth: () => void;
  onOpenSync: () => void;
  onOpenApiKeysModal?: () => void;
  onOpenOmdbKeyModal?: () => void;
  onOpenYouTubeModal?: (type?: YouTubeTargetType) => void;
  onOpenMobileServerSettings?: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onOpenMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  isDarkMode,
  setIsDarkMode,
  telegramState,
  onOpenAuth,
  onOpenSync,
  onOpenApiKeysModal,
  onOpenOmdbKeyModal,
  onOpenYouTubeModal,
  onOpenMobileServerSettings,
  onSyncNow,
  isSyncing,
  onOpenMobileMenu
}) => {
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const filterChips: { type: FileType | 'all'; label: string; icon: React.ReactNode }[] = [
    { type: 'all', label: 'Tudo', icon: <Layers className="w-3.5 h-3.5" /> },
    { type: 'video', label: 'Vídeos', icon: <Video className="w-3.5 h-3.5 text-red-500" /> },
    { type: 'comic', label: 'HQs & Mangás', icon: <BookOpen className="w-3.5 h-3.5 text-pink-500" /> },
    { type: 'ebook', label: 'E-books', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" /> },
    { type: 'pdf', label: 'PDFs', icon: <FileText className="w-3.5 h-3.5 text-rose-500" /> },
    { type: 'document', label: 'Documentos', icon: <FileText className="w-3.5 h-3.5 text-blue-500" /> },
    { type: 'image', label: 'Imagens', icon: <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> },
    { type: 'audio', label: 'Áudios', icon: <Music className="w-3.5 h-3.5 text-purple-500" /> },
    { type: 'archive', label: 'Compactados', icon: <Archive className="w-3.5 h-3.5 text-orange-500" /> },
    { type: 'code', label: 'Código', icon: <FileCode className="w-3.5 h-3.5 text-cyan-500" /> },
  ];

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-gray-200 dark:border-drive-darkBorder bg-white/95 dark:bg-drive-darkBg/95 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-2.5 transition-colors w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Mobile Hamburger & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors active:scale-95 shrink-0"
              title="Abrir Menu Lateral"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 shrink-0">
            <Send className="w-4 h-4 sm:w-5 sm:h-5 -rotate-12 translate-x-0.5" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 dark:from-sky-400 dark:to-blue-500 bg-clip-text text-transparent truncate">
                DriveGram
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0">
                Telegram Cloud
              </span>
            </div>
            <span className="hidden sm:block text-[11px] text-gray-500 dark:text-gray-400 truncate">
              Armazenamento Ilimitado em Nuvem
            </span>
          </div>
        </div>

        {/* Desktop Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-2xl">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar em Meu Drive, cursos, vídeos, aulas, PDFs ou tags..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-full bg-gray-100 dark:bg-drive-darkSurface border border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-drive-darkSurface focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Header Action Buttons & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={`md:hidden p-2 rounded-xl transition-colors ${
              isMobileSearchOpen || searchQuery
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover'
            }`}
            title="Pesquisar"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Cloud Sync Status */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            title="Sincronizar metadados e árvore de pastas com o Telegram"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-drive-darkSurface dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-drive-darkBorder transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? 'Sincronizando...' : 'Auto-Sync'}</span>
          </button>

          {/* Backup / Restore Modal Trigger */}
          <button
            onClick={onOpenSync}
            title="Gerenciar Backup e Restauração em Nuvem"
            className="hidden sm:inline-flex p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder transition-all"
          >
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </button>

          {/* Central de Chaves de API Modal Trigger */}
          {(onOpenApiKeysModal || onOpenOmdbKeyModal) && (
            <button
              onClick={onOpenApiKeysModal || onOpenOmdbKeyModal}
              title="Central de Chaves de API (OMDb, Google Books, YouTube, TMDb)"
              className="inline-flex p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-gray-200 dark:border-drive-darkBorder hover:border-amber-400 transition-all active:scale-95"
            >
              <Key className="w-4 h-4 text-amber-500" />
            </button>
          )}

          {/* Configurações Mobile / Servidor Modal Trigger */}
          {onOpenMobileServerSettings && (
            <button
              onClick={onOpenMobileServerSettings}
              title="Configurações do Servidor Mobile / App"
              className="inline-flex p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-gray-200 dark:border-drive-darkBorder hover:border-blue-400 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-blue-500" />
            </button>
          )}

          {/* Telegram Connection Badge & Login Button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm active:scale-95 ${
              telegramState.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/60 hover:bg-sky-100'
            }`}
            title={telegramState.isConnected ? 'Telegram Conectado' : 'Conectar Telegram'}
          >
            <div className={`w-2 h-2 rounded-full ${telegramState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`} />
            <span className="font-semibold text-[11px] sm:text-xs">
              {telegramState.isConnected 
                ? (telegramState.firstName || telegramState.username || 'Conectado')
                : 'Conectar'
              }
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-all active:scale-95"
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
      </div>

      {/* Mobile Search Bar Expandable Drawer/Row */}
      {isMobileSearchOpen && (
        <div className="md:hidden mt-2 pt-1 border-t border-gray-100 dark:border-drive-darkBorder animate-in slide-in-from-top-2 duration-200">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar arquivos, vídeos, PDFs..."
              className="w-full pl-9 pr-12 py-2 text-xs rounded-xl bg-gray-100 dark:bg-drive-darkSurface border border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:bg-white dark:focus:bg-drive-darkSurface focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-semibold"
              >
                Limpar
              </button>
            ) : (
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="absolute right-3 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5 no-scrollbar">
        {filterChips.map(chip => (
          <button
            key={chip.type}
            onClick={() => setFilterType(chip.type)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filterType === chip.type
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-drive-darkSurface dark:hover:bg-drive-darkHover text-gray-600 dark:text-gray-300'
            }`}
          >
            {chip.icon}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
};
