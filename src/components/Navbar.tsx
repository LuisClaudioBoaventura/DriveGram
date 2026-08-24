import React from 'react';
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
  Youtube
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
  onOpenOmdbKeyModal?: () => void;
  onOpenYouTubeModal?: (type?: YouTubeTargetType) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
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
  onOpenOmdbKeyModal,
  onOpenYouTubeModal,
  onSyncNow,
  isSyncing
}) => {
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
    <header className="sticky top-0 z-30 flex flex-col border-b border-gray-200 dark:border-drive-darkBorder bg-white/90 dark:bg-drive-darkBg/95 backdrop-blur-md px-4 py-2.5 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 min-w-[220px]">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-sky-500 dark:from-sky-400 dark:to-blue-500 bg-clip-text text-transparent">
                DriveGram
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                Telegram Cloud
              </span>
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Armazenamento Ilimitado em Nuvem
            </span>
          </div>
        </div>

        {/* Global Search Bar (Google Drive Style) */}
        <div className="flex-1 max-w-2xl">
          <div className="relative flex items-center">
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
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            title="Sincronizar metadados e árvore de pastas com o Telegram"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 dark:bg-drive-darkSurface dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-drive-darkBorder transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? 'Sincronizando...' : 'Auto-Sync'}</span>
          </button>

          {/* Backup / Restore Modal Trigger */}
          <button
            onClick={onOpenSync}
            title="Gerenciar Backup e Restauração em Nuvem"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover border border-gray-200 dark:border-drive-darkBorder transition-all"
          >
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </button>

          {/* OMDb API Key Modal Trigger */}
          {onOpenOmdbKeyModal && (
            <button
              onClick={onOpenOmdbKeyModal}
              title="Configurar Chave da API OMDb (Filmes & Cinema)"
              className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-gray-200 dark:border-drive-darkBorder hover:border-amber-400 transition-all"
            >
              <Key className="w-4 h-4 text-amber-500" />
            </button>
          )}

          {/* Telegram Connection Badge & Login Button */}
          <button
            onClick={onOpenAuth}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all shadow-sm ${
              telegramState.isConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-100'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800/60 hover:bg-sky-100'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${telegramState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-sky-500'}`} />
            <span className="font-semibold">
              {telegramState.isConnected 
                ? (telegramState.firstName || telegramState.username || 'Telegram Conectado')
                : 'Conectar Telegram'
              }
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-all"
            title={isDarkMode ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-gray-600" />}
          </button>
        </div>
      </div>

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
