import React, { useState } from 'react';
import { 
  HardDrive, 
  GraduationCap, 
  Film, 
  Menu, 
  Plus, 
  FolderPlus, 
  UploadCloud, 
  FileVideo, 
  BookOpen, 
  Sparkles, 
  Video, 
  Tv, 
  Headphones, 
  LockKeyhole, 
  Youtube, 
  X,
  Star,
  Trash2
} from 'lucide-react';
import { SidebarTab } from './Sidebar.js';
import { YouTubeTargetType } from './YouTubeImportModal.js';

interface BottomNavProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  onOpenMobileMenu: () => void;
  onNewFolder: () => void;
  onNewCourse: () => void;
  onNewBook: () => void;
  onNewComic: () => void;
  onNewVideo?: () => void;
  onNewPersonalVideo?: () => void;
  onNewSeries?: () => void;
  onNewAudio?: () => void;
  onNewAdultVideo?: () => void;
  onOpenYouTubeModal?: (type?: YouTubeTargetType) => void;
  onUploadFiles: (files: FileList | File[] | { file: File; relativePath?: string }[]) => void;
  isAdultVaultUnlocked?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileMenu,
  onNewFolder,
  onNewCourse,
  onNewBook,
  onNewComic,
  onNewVideo,
  onNewPersonalVideo,
  onNewSeries,
  onNewAudio,
  onNewAdultVideo,
  onOpenYouTubeModal,
  onUploadFiles,
  isAdultVaultUnlocked
}) => {
  const [showActionSheet, setShowActionSheet] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <>
      {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-drive-darkBg/95 backdrop-blur-xl border-t border-gray-200 dark:border-drive-darkBorder pb-safe select-none shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-around px-2 h-14">
          {/* Tab: Drive */}
          <button
            onClick={() => setActiveTab('drive')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'drive'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'drive' ? 'bg-blue-50 dark:bg-blue-900/40 scale-110' : ''}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Drive</span>
          </button>

          {/* Tab: Cursos */}
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'courses'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'courses' ? 'bg-indigo-50 dark:bg-indigo-900/40 scale-110' : ''}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Cursos</span>
          </button>

          {/* Central Floating "NOVO" Action Button */}
          <div className="flex items-center justify-center flex-1 -translate-y-2">
            <button
              onClick={() => setShowActionSheet(true)}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/40 active:scale-90 transition-transform ring-4 ring-white dark:ring-drive-darkBg"
              title="Novo Item / Upload"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab: Cinema / Filmes */}
          <button
            onClick={() => setActiveTab('videos')}
            className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'videos'
                ? 'text-red-600 dark:text-red-400 font-bold'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium'
            }`}
          >
            <div className={`p-1 rounded-xl transition-all ${activeTab === 'videos' ? 'bg-red-50 dark:bg-red-900/40 scale-110' : ''}`}>
              <Film className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Cinema</span>
          </button>

          {/* Tab: Menu / Mais */}
          <button
            onClick={onOpenMobileMenu}
            className="flex flex-col items-center justify-center flex-1 py-1 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium transition-all active:scale-95"
          >
            <div className="p-1 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5">Mais</span>
          </button>
        </div>
      </nav>

      {/* ================= MOBILE "NOVO" ACTION SHEET MODAL ================= */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowActionSheet(false)}
          />

          {/* Action Sheet Panel */}
          <div className="relative z-10 w-full max-h-[85dvh] overflow-y-auto bg-white dark:bg-drive-darkSurface rounded-t-3xl border-t border-gray-200 dark:border-drive-darkBorder p-5 pb-safe animate-in slide-in-from-bottom duration-250 shadow-2xl space-y-4">
            {/* Sheet Handle Bar & Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 mb-3" />
              <div className="flex items-center justify-between w-full">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Adicionar ao DriveGram
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecione uma ação ou crie um novo item
                  </p>
                </div>
                <button
                  onClick={() => setShowActionSheet(false)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-drive-darkBg text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Upload Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => {
                  setShowActionSheet(false);
                  onNewFolder();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 text-center transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-1.5 shadow-md shadow-blue-500/20">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Nova Pasta</span>
              </button>

              <button
                onClick={() => {
                  setShowActionSheet(false);
                  fileInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-center transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-md shadow-emerald-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Upload Arquivo</span>
              </button>

              <button
                onClick={() => {
                  setShowActionSheet(false);
                  folderInputRef.current?.click();
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 text-sky-700 dark:text-sky-300 text-center transition-all active:scale-95"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center mb-1.5 shadow-md shadow-sky-500/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold">Upload Pasta</span>
              </button>
            </div>

            {/* Specialized Studios & Catalogs */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                Estúdios & Bibliotecas
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    onNewCourse();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-left transition-all active:scale-95"
                >
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                    <FileVideo className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    Novo Curso
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    onNewBook();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-purple-50 dark:hover:bg-purple-950/30 text-left transition-all active:scale-95"
                >
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    Novo Livro
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    onNewComic();
                  }}
                  className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-pink-50 dark:hover:bg-pink-950/30 text-left transition-all active:scale-95"
                >
                  <div className="p-2 rounded-xl bg-pink-500/10 text-pink-500 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    Nova HQ / Mangá
                  </span>
                </button>

                {onNewVideo && (
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      onNewVideo();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-red-50 dark:hover:bg-red-950/30 text-left transition-all active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500 shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      Novo Filme
                    </span>
                  </button>
                )}

                {onNewPersonalVideo && (
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      onNewPersonalVideo();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-amber-50 dark:hover:bg-amber-950/30 text-left transition-all active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      Vídeo Pessoal
                    </span>
                  </button>
                )}

                {onNewSeries && (
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      onNewSeries();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-purple-50 dark:hover:bg-purple-950/30 text-left transition-all active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                      <Tv className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      Nova Série / Anime
                    </span>
                  </button>
                )}

                {onNewAudio && (
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      onNewAudio();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-left transition-all active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
                      <Headphones className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                      Novo Álbum / Podcast
                    </span>
                  </button>
                )}

                {onNewAdultVideo && (
                  <button
                    onClick={() => {
                      setShowActionSheet(false);
                      onNewAdultVideo();
                    }}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-all active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                      <LockKeyhole className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 truncate">
                      Red Locker (+18)
                    </span>
                  </button>
                )}
              </div>

              {onOpenYouTubeModal && (
                <button
                  onClick={() => {
                    setShowActionSheet(false);
                    onOpenYouTubeModal();
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20 transition-all active:scale-95"
                >
                  <Youtube className="w-4 h-4" />
                  <span>Importar Conteúdo do YouTube</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs for uploading from mobile */}
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
    </>
  );
};
