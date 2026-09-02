import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { Breadcrumbs } from './components/Breadcrumbs.js';
import { FileGrid } from './components/FileGrid.js';
import { FileList } from './components/FileList.js';
import { CourseCatalog } from './components/CourseCatalog.js';
import { CourseView } from './components/CourseView.js';
import { BooksCatalog } from './components/BooksCatalog.js';
import { BookReaderView } from './components/BookReaderView.js';
import { FloatingAudiobookPlayer } from './components/FloatingAudiobookPlayer.js';
import { FloatingPodcastPlayer } from './components/FloatingPodcastPlayer.js';
import { ComicsCatalog } from './components/ComicsCatalog.js';
import { ComicStudioView } from './components/ComicStudioView.js';
import { NewComicModal } from './components/NewComicModal.js';
import { EditComicModal } from './components/EditComicModal.js';
import { VideosCatalog } from './components/VideosCatalog.js';
import { VideoPlayerView } from './components/VideoPlayerView.js';
import { NewVideoModal } from './components/NewVideoModal.js';
import { EditVideoModal } from './components/EditVideoModal.js';
import { ApiKeysManagerModal } from './components/ApiKeysManagerModal.js';
import { PersonalVideosCatalog } from './components/PersonalVideosCatalog.js';
import { NewPersonalVideoModal } from './components/NewPersonalVideoModal.js';
import { EditPersonalVideoModal } from './components/EditPersonalVideoModal.js';
import { SeriesCatalog } from './components/SeriesCatalog.js';
import { SeriesStudioView } from './components/SeriesStudioView.js';
import { NewSeriesModal } from './components/NewSeriesModal.js';
import { EditSeriesModal } from './components/EditSeriesModal.js';
import { AudioCatalog } from './components/AudioCatalog.js';
import { AudioStudioView } from './components/AudioStudioView.js';
import { NewAudioModal } from './components/NewAudioModal.js';
import { EditAudioModal } from './components/EditAudioModal.js';
import { AdultVideosCatalog } from './components/AdultVideosCatalog.js';
import { AdultPlayerView } from './components/AdultPlayerView.js';
import { AdultVaultLockModal } from './components/AdultVaultLockModal.js';
import { NewAdultVideoModal } from './components/NewAdultVideoModal.js';
import { EditAdultVideoModal } from './components/EditAdultVideoModal.js';
import { PerformerModal } from './components/PerformerModal.js';
import { FileViewerModal } from './components/FileViewerModal.js';
import { UploadManager } from './components/UploadManager.js';
import { AuthModal } from './components/AuthModal.js';
import { LoginRequiredModal } from './components/LoginRequiredModal.js';
import { SyncModal } from './components/SyncModal.js';
import { FolderModal } from './components/FolderModal.js';
import { CourseModal } from './components/CourseModal.js';
import { BookModal } from './components/BookModal.js';
import { EditBookModal } from './components/EditBookModal.js';
import { CategoryManagerModal } from './components/CategoryManagerModal.js';
import { EditItemModal } from './components/EditItemModal.js';
import { DuplicateFilesModal } from './components/DuplicateFilesModal.js';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.js';
import { MobileServerSettingsModal } from './components/MobileServerSettingsModal.js';
import { YouTubeImportModal, YouTubeTargetType } from './components/YouTubeImportModal.js';
import { useFileSystem } from './hooks/useFileSystem.js';
import { useTelegram } from './hooks/useTelegram.js';
import { useCourses } from './hooks/useCourses.js';
import { useBooks } from './hooks/useBooks.js';
import { useComics } from './hooks/useComics.js';
import { useVideos } from './hooks/useVideos.js';
import { usePersonalVideos } from './hooks/usePersonalVideos.js';
import { useSeries } from './hooks/useSeries.js';
import { useAudioShows } from './hooks/useAudioShows.js';
import { useAdultVault } from './hooks/useAdultVault.js';
import { DriveItem, FolderItem, Course, Book, ComicBook, MovieVideo, PersonalVideo, SeriesShow, AudioShow, AdultVideo, AdultPerformer } from './types/index.js';
import { getFilesFromDataTransfer } from './utils/dragDropUtils.js';
import { isRedLockerFolder } from './utils/libraryFolderUtils.js';
import { UploadCloud, Lock, Flame, LockKeyhole } from 'lucide-react';

export function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('drivegram_theme') === 'dark' || true;
  });

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    name: string;
    isFolder: boolean;
    isPermanent?: boolean;
    itemType?: string;
  } | null>(null);

  const [pendingFolderToOpenAfterUnlock, setPendingFolderToOpenAfterUnlock] = useState<string | null>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('drivegram_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('drivegram_theme', 'light');
    }
  }, [isDarkMode]);

  // Hooks
  const fs = useFileSystem();
  const tg = useTelegram();
  const courses = useCourses();
  const books = useBooks();
  const comics = useComics();
  const videos = useVideos();
  const personalVideos = usePersonalVideos();
  const series = useSeries();
  const audioShows = useAudioShows();
  const adultVault = useAdultVault();

  // Navigation handler with protection for Red Locker folder
  const handleNavigateFolder = (folderId: string | null) => {
    if (folderId && isRedLockerFolder(folderId, fs.allFolders) && !adultVault.isUnlocked) {
      setPendingFolderToOpenAfterUnlock(folderId);
      setIsAdultLockModalOpen(true);
      return;
    }
    fs.setCurrentFolderId(folderId);
  };

  // Modals & Active View states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [loginPromptReason, setLoginPromptReason] = useState<{ title?: string; description?: string }>({});
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isComicModalOpen, setIsComicModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isApiKeysModalOpen, setIsApiKeysModalOpen] = useState(false);
  const [isPersonalVideoModalOpen, setIsPersonalVideoModalOpen] = useState(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isAdultLockModalOpen, setIsAdultLockModalOpen] = useState(false);
  const [isNewAdultVideoModalOpen, setIsNewAdultVideoModalOpen] = useState(false);
  const [isYouTubeModalOpen, setIsYouTubeModalOpen] = useState(false);
  const [youtubeInitialType, setYoutubeInitialType] = useState<YouTubeTargetType>('course');
  const [isMobileServerModalOpen, setIsMobileServerModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingComic, setEditingComic] = useState<ComicBook | null>(null);
  const [editingVideo, setEditingVideo] = useState<MovieVideo | null>(null);
  const [editingPersonalVideo, setEditingPersonalVideo] = useState<PersonalVideo | null>(null);
  const [editingSeries, setEditingSeries] = useState<SeriesShow | null>(null);
  const [editingAudioShow, setEditingAudioShow] = useState<AudioShow | null>(null);
  const [editingAdultVideo, setEditingAdultVideo] = useState<AdultVideo | null>(null);
  const [editingItem, setEditingItem] = useState<{ item: DriveItem | FolderItem; isFolder: boolean } | null>(null);
  const [activePreviewFile, setActivePreviewFile] = useState<DriveItem | null>(null);
  const [selectedCourseForView, setSelectedCourseForView] = useState<Course | null>(null);
  const [selectedBookForView, setSelectedBookForView] = useState<Book | null>(null);
  const [selectedComicForView, setSelectedComicForView] = useState<ComicBook | null>(null);
  const [selectedVideoForView, setSelectedVideoForView] = useState<MovieVideo | null>(null);
  const [selectedPersonalVideoForView, setSelectedPersonalVideoForView] = useState<PersonalVideo | null>(null);
  const [activePipVideo, setActivePipVideo] = useState<{ video: MovieVideo; isPersonal?: boolean } | null>(null);
  const [activePipCourse, setActivePipCourse] = useState<Course | null>(null);

  const activePlayingMovie = (selectedVideoForView || (selectedPersonalVideoForView ? {
    ...selectedPersonalVideoForView,
    year: selectedPersonalVideoForView.date || undefined,
    director: selectedPersonalVideoForView.people || undefined,
    genre: selectedPersonalVideoForView.location || selectedPersonalVideoForView.category
  } as MovieVideo : null) || activePipVideo?.video) as MovieVideo | null;

  const isPersonalMovie = Boolean(selectedPersonalVideoForView || activePipVideo?.isPersonal);
  const isMovieVisibleInMain = Boolean(
    (selectedVideoForView && fs.activeTab === 'videos') ||
    (selectedPersonalVideoForView && fs.activeTab === 'personal-videos')
  );

  const activePlayingCourse = selectedCourseForView || activePipCourse;
  const isCourseVisibleInMain = Boolean(selectedCourseForView && fs.activeTab === 'courses');

  const [selectedSeriesForView, setSelectedSeriesForView] = useState<SeriesShow | null>(null);
  const [selectedAudioForView, setSelectedAudioForView] = useState<AudioShow | null>(null);
  const [selectedAudioTrackIndex, setSelectedAudioTrackIndex] = useState<number>(0);
  const [selectedAdultVideoForView, setSelectedAdultVideoForView] = useState<AdultVideo | null>(null);
  const [adultPlaylist, setAdultPlaylist] = useState<AdultVideo[]>([]);
  const [isPerformerModalOpen, setIsPerformerModalOpen] = useState(false);
  const [editingPerformer, setEditingPerformer] = useState<AdultPerformer | null>(null);

  // Trigger login popup on startup if not logged in (one time per session)
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('drivegram_login_prompted');
    if (!hasPrompted && !tg.authState.isConnected && !tg.loading) {
      sessionStorage.setItem('drivegram_login_prompted', 'true');
      setLoginPromptReason({
        title: 'Bem-vindo ao DriveGram! Conecte seu Telegram',
        description: 'Você não está conectado ao Telegram. Para aproveitar o armazenamento 100% ilimitado em nuvem, uploads de alta velocidade e sincronização contínua, conecte sua conta agora.'
      });
      setIsLoginPromptOpen(true);
    }
  }, [tg.authState.isConnected, tg.loading]);

  // Toast notification state
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 4000);
  };

  // Drag and Drop support
  const [isDragging, setIsDragging] = useState(false);

  const isAnyModalOrViewerOpen = isAuthModalOpen || isLoginPromptOpen || isSyncModalOpen || 
    isFolderModalOpen || isCourseModalOpen || isBookModalOpen || isComicModalOpen || 
    isVideoModalOpen || isSeriesModalOpen || isAudioModalOpen || isAdultLockModalOpen || isNewAdultVideoModalOpen ||
    isDuplicatesModalOpen || isCategoryManagerOpen || editingBook !== null || 
    editingComic !== null || editingVideo !== null || editingSeries !== null || editingAudioShow !== null ||
    editingAdultVideo !== null || editingItem !== null || activePreviewFile !== null || selectedVideoForView !== null ||
    selectedSeriesForView !== null || selectedAudioForView !== null || selectedAdultVideoForView !== null;

  const handleDragOver = (e: React.DragEvent) => {
    if (isAnyModalOrViewerOpen) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const traverseDirectory = async (entry: any, path = ''): Promise<{ file: File; relativePath: string }[]> => {
    let results: { file: File; relativePath: string }[] = [];
    if (entry.isFile) {
      const file: File = await new Promise((resolve) => entry.file(resolve));
      results.push({ file, relativePath: path + file.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        reader.readEntries(resolve);
      });
      for (const child of entries) {
        const subResults = await traverseDirectory(child, path + entry.name + '/');
        results = results.concat(subResults);
      }
    }
    return results;
  };

  const refreshAllLibraries = () => {
    courses.refreshCourses();
    books.refreshBooks();
    comics.fetchComics();
    videos.fetchVideos();
    series.fetchSeries();
    audioShows.fetchAudioShows();
    if (adultVault.isUnlocked) {
      adultVault.fetchVideos();
      adultVault.fetchPerformers();
    }
  };

  const handleOpenYouTubeModal = (type: YouTubeTargetType = 'course') => {
    setYoutubeInitialType(type);
    setIsYouTubeModalOpen(true);
  };

  const handleYouTubeImportSuccess = (result: { targetType: YouTubeTargetType; item: any }) => {
    fs.refresh();
    refreshAllLibraries();
    if (result.targetType === 'course') {
      courses.refreshCourses();
      fs.setActiveTab('courses');
      if (result.item) setSelectedCourseForView(result.item);
      showToast('🎉 Curso importado do YouTube com sucesso!', 'success');
    } else if (result.targetType === 'podcast') {
      audioShows.fetchAudioShows();
      fs.setActiveTab('podcasts');
      if (result.item) {
        setSelectedAudioForView(result.item);
        setSelectedAudioTrackIndex(0);
      }
      showToast('🎉 Podcast importado do YouTube com sucesso!', 'success');
    } else if (result.targetType === 'series') {
      series.fetchSeries();
      fs.setActiveTab('series');
      if (result.item) setSelectedSeriesForView(result.item);
      showToast('🎉 Série importada do YouTube com sucesso!', 'success');
    } else if (result.targetType === 'video') {
      videos.fetchVideos();
      fs.setActiveTab('videos');
      showToast('🎉 Vídeos importados do YouTube com sucesso!', 'success');
    }
  };

  const handleSafeUpload = async (
    files: FileList | File[] | { file: File; relativePath?: string }[],
    targetFolderId = fs.currentFolderId
  ) => {
    if (!tg.authState.isConnected) {
      setLoginPromptReason({
        title: 'Login Necessário para Upload',
        description: 'Você precisa estar conectado à sua conta do Telegram para enviar arquivos diretamente para o armazenamento ilimitado em nuvem.'
      });
      setIsLoginPromptOpen(true);
      return;
    }
    await fs.uploadFiles(files, targetFolderId);
    refreshAllLibraries();
  };

  const handleMoveItemWithFeedback = async (id: string, isFolder: boolean, targetParentId: string | null): Promise<boolean> => {
    const item = isFolder ? fs.allFolders.find(f => f.id === id) : fs.allFiles.find(f => f.id === id);
    const itemName = item?.name || (isFolder ? 'Pasta' : 'Arquivo');

    if (isFolder && targetParentId && fs.isDescendantFolder(targetParentId, id)) {
      showToast(`⚠️ Não é possível mover uma pasta para dentro de si mesma ou de suas subpastas.`, 'error');
      return false;
    }

    const targetFolder = targetParentId ? fs.allFolders.find(f => f.id === targetParentId) : null;
    const targetName = targetFolder ? `"${targetFolder.name}"` : '"Meu Drive" (Raiz)';

    const success = await fs.moveItem(id, isFolder, targetParentId);
    if (success) {
      showToast(`📦 "${itemName}" movido com sucesso para ${targetName}!`, 'success');
      refreshAllLibraries();
    } else {
      showToast(`⚠️ Não foi possível mover "${itemName}".`, 'error');
    }
    return success;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isAnyModalOrViewerOpen) return;
    if (e.dataTransfer.types.includes('application/json')) return;
    if (!e.dataTransfer.types.includes('Files')) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedItems = await getFilesFromDataTransfer(e.dataTransfer);
      if (droppedItems.length > 0) {
        await handleSafeUpload(droppedItems);
      }
    }
  };

  const mainContentRef = useRef<HTMLElement>(null);

  // Automatically reset scroll position when switching tabs or views so content is never cut off
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [
    fs.activeTab,
    selectedCourseForView,
    selectedBookForView,
    selectedComicForView,
    selectedVideoForView,
    selectedSeriesForView,
    selectedAudioForView,
    selectedAdultVideoForView
  ]);

  const handleSelectTab = (tab: any) => {
    fs.setActiveTab(tab);
    if (tab !== 'courses') {
      setSelectedCourseForView(null);
    } else if (activePipCourse) {
      setSelectedCourseForView(activePipCourse);
    }
    if (tab !== 'books') setSelectedBookForView(null);
    if (tab !== 'comics') setSelectedComicForView(null);
    if (tab !== 'videos') {
      setSelectedVideoForView(null);
    } else if (activePipVideo && !activePipVideo.isPersonal) {
      setSelectedVideoForView(activePipVideo.video);
    }
    if (tab !== 'personal-videos') {
      setSelectedPersonalVideoForView(null);
    } else if (activePipVideo && activePipVideo.isPersonal) {
      setSelectedPersonalVideoForView(activePipVideo.video as any);
    }
    if (tab !== 'series') setSelectedSeriesForView(null);
    if (tab !== 'podcasts') setSelectedAudioForView(null);
    if (tab !== 'adult') setSelectedAdultVideoForView(null);
    if (tab === 'adult' && !adultVault.isUnlocked) {
      setIsAdultLockModalOpen(true);
    }
  };

  const currentFolder = fs.allFolders.find(f => f.id === fs.currentFolderId);

  return (
    <div 
      className="flex flex-col h-full h-[100dvh] w-full max-w-full overflow-hidden bg-drive-lightBg dark:bg-drive-darkBg transition-colors select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Navbar */}
      <Navbar
        searchQuery={fs.searchQuery}
        setSearchQuery={fs.setSearchQuery}
        filterType={fs.filterType}
        setFilterType={fs.setFilterType}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        telegramState={tg.authState}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSync={() => {
          if (!tg.authState.isConnected) {
            setLoginPromptReason({
              title: 'Login Necessário para Sincronização',
              description: 'Conecte sua conta do Telegram para sincronizar ou restaurar seus arquivos salvos na nuvem.'
            });
            setIsLoginPromptOpen(true);
          } else {
            setIsSyncModalOpen(true);
          }
        }}
        onOpenApiKeysModal={() => setIsApiKeysModalOpen(true)}
        onOpenYouTubeModal={() => handleOpenYouTubeModal()}
        onOpenMobileServerSettings={() => setIsMobileServerModalOpen(true)}
        onSyncNow={async () => {
          if (!tg.authState.isConnected) {
            setLoginPromptReason({
              title: 'Login Necessário para Sincronização',
              description: 'Conecte sua conta do Telegram para sincronizar sua árvore de pastas e metadados com a nuvem.'
            });
            setIsLoginPromptOpen(true);
            return;
          }
          await tg.syncMetadata();
          fs.refresh();
          refreshAllLibraries();
        }}
        isSyncing={tg.syncing}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex flex-1 w-full max-w-full overflow-hidden relative">
        {/* Left Sidebar / Mobile Drawer */}
        <Sidebar
          activeTab={fs.activeTab}
          setActiveTab={handleSelectTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onNewFolder={() => setIsFolderModalOpen(true)}
          onNewCourse={() => setIsCourseModalOpen(true)}
          onNewBook={() => setIsBookModalOpen(true)}
          onNewComic={() => setIsComicModalOpen(true)}
          onNewVideo={() => setIsVideoModalOpen(true)}
          onNewPersonalVideo={() => setIsPersonalVideoModalOpen(true)}
          onNewSeries={() => setIsSeriesModalOpen(true)}
          onNewAudio={() => setIsAudioModalOpen(true)}
          onNewAdultVideo={() => {
            if (!adultVault.isUnlocked) {
              setIsAdultLockModalOpen(true);
            } else {
              setIsNewAdultVideoModalOpen(true);
            }
          }}
          onOpenYouTubeModal={(type) => handleOpenYouTubeModal(type || 'course')}
          isAdultVaultUnlocked={adultVault.isUnlocked}
          onUploadFiles={async (files) => {
            await handleSafeUpload(files);
          }}
          telegramState={tg.authState}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenSync={() => {
            setIsSyncModalOpen(true);
          }}
          onMoveItem={handleMoveItemWithFeedback}
          onDeleteItem={(id, isFolder, permanent, itemName, itemType) => {
            setDeleteConfirmTarget({
              id,
              name: itemName || (isFolder ? 'Pasta' : 'Arquivo'),
              isFolder,
              isPermanent: permanent,
              itemType
            });
          }}
          onToggleFavorite={async (id, isFolder) => {
            const item = isFolder ? fs.allFolders.find(f => f.id === id) : fs.allFiles.find(f => f.id === id);
            const name = item?.name || (isFolder ? 'Pasta' : 'Arquivo');
            await fs.toggleFavorite(id, isFolder);
            showToast(`⭐ "${name}" atualizado nos Favoritos.`, 'info');
          }}
        />

        {/* Content Area */}
        <main ref={mainContentRef} className="flex-1 flex flex-col w-full max-w-full overflow-y-auto overflow-x-hidden relative pb-20 md:pb-0">
          {/* Single Persistent Video Player */}
          {activePlayingMovie && (
            <VideoPlayerView
              video={activePlayingMovie}
              allFiles={fs.allFiles}
              isPiPHidden={!isMovieVisibleInMain}
              onBackToCatalog={() => {
                setActivePipVideo(null);
                setSelectedVideoForView(null);
                setSelectedPersonalVideoForView(null);
              }}
              onUpdateProgress={isPersonalMovie ? personalVideos.updateProgress : videos.updateVideoProgress}
              onOpenEditModal={() => {
                if (isPersonalMovie && selectedPersonalVideoForView) {
                  setEditingPersonalVideo(selectedPersonalVideoForView);
                } else if (selectedVideoForView) {
                  setEditingVideo(selectedVideoForView);
                }
              }}
              onEnterPiP={() => {
                setActivePipVideo({ video: activePlayingMovie, isPersonal: isPersonalMovie });
              }}
              onLeavePiP={() => {}}
              onRestoreToTab={() => {
                fs.setActiveTab(isPersonalMovie ? 'personal-videos' : 'videos');
                if (isPersonalMovie) {
                  setSelectedPersonalVideoForView(activePlayingMovie as any);
                } else {
                  setSelectedVideoForView(activePlayingMovie);
                }
                setActivePipVideo(null);
              }}
              onUpdateVideo={async (updated) => {
                if (isPersonalMovie) {
                  await personalVideos.updatePersonalVideo(updated as any);
                } else {
                  await videos.updateVideo(updated);
                }
              }}
            />
          )}

          {/* Persistent Course Player / View */}
          {activePlayingCourse && (
            <CourseView
              course={activePlayingCourse}
              isPiPHidden={!isCourseVisibleInMain}
              activeLesson={courses.activeLesson}
              onSelectLesson={courses.selectLesson}
              onToggleCompletion={courses.toggleLessonCompletion}
              onSaveNotes={courses.saveLessonNotes}
              onUpdateCourse={async (updated) => {
                await courses.updateCourse(updated);
                if (selectedCourseForView) setSelectedCourseForView(updated);
                if (activePipCourse) setActivePipCourse(updated);
                fs.refresh();
              }}
              onDeleteCourse={async (id) => {
                await courses.deleteCourse(id);
                setSelectedCourseForView(null);
                setActivePipCourse(null);
                fs.refresh();
              }}
              onBackToDrive={() => {
                setActivePipCourse(null);
                setSelectedCourseForView(null);
              }}
              onOpenFileViewer={(f) => setActivePreviewFile(f)}
              onUpdateLessonProgress={courses.updateLessonProgress}
              getNextLesson={courses.getNextLesson}
              getPreviousLesson={courses.getPreviousLesson}
              allFiles={fs.allFiles}
              onEnterPiP={() => {
                setActivePipCourse(activePlayingCourse);
              }}
              onLeavePiP={() => {}}
              onRestoreToTab={() => {
                fs.setActiveTab('courses');
                setSelectedCourseForView(activePlayingCourse);
                setActivePipCourse(null);
              }}
            />
          )}

          {!isMovieVisibleInMain && !isCourseVisibleInMain && (
            <>
              {selectedBookForView ? (
                /* Active Audiobook / E-Book Reader Studio */
                <BookReaderView
                  book={selectedBookForView}
                  activeChapter={books.activeChapter}
                  onSelectChapter={(chap, autoPlay) => books.selectChapter(chap, autoPlay !== undefined ? autoPlay : true)}
                  onToggleChapterCompletion={books.toggleChapterCompletion}
                  onToggleBookCompletion={books.toggleBookCompletion}
                  onSaveChapterNotes={books.saveChapterNotes}
                  onUpdateBook={async (updated) => {
                    await books.updateBook(updated);
                    setSelectedBookForView(updated);
                    fs.refresh();
                  }}
                  onDeleteBook={async (id) => {
                    await books.deleteBook(id);
                    setSelectedBookForView(null);
                    fs.refresh();
                  }}
                  onBackToLibrary={() => setSelectedBookForView(null)}
                  getNextChapter={books.getNextChapter}
                  getPreviousChapter={books.getPreviousChapter}
                  allFiles={fs.allFiles}
                  // Global Player bindings
                  isPlaying={books.isPlaying}
                  currentTime={books.currentTime}
                  duration={books.duration}
                  playbackSpeed={books.playbackSpeed}
                  onTogglePlay={books.togglePlay}
                  onSeek={books.seekTo}
                  onSkip={books.skip}
                  onSpeedChange={books.setPlaybackSpeed}
                  onPlayNextChapter={books.playNextChapter}
                  onPlayPreviousChapter={books.playPreviousChapter}
                  onMinimizeToFloating={() => setSelectedBookForView(null)}
                />
              ) : selectedComicForView ? (
                /* Active Comic / HQ Studio & Reader */
                <ComicStudioView
                  comic={comics.comics.find(c => c.id === selectedComicForView.id) || selectedComicForView}
                  activeIssue={comics.activeIssue}
                  onSelectIssue={comics.setActiveIssue}
                  onToggleIssueCompletion={async (issueId) => {
                    await comics.toggleIssueCompletion(issueId, selectedComicForView.id);
                  }}
                  onUpdateComic={async (updated) => {
                    await comics.updateComic(updated);
                    setSelectedComicForView(updated);
                    fs.refresh();
                  }}
                  onDeleteComic={async (id) => {
                    await comics.deleteComic(id);
                    setSelectedComicForView(null);
                    fs.refresh();
                  }}
                  onBackToLibrary={() => setSelectedComicForView(null)}
                  onOpenEditModal={() => setEditingComic(comics.comics.find(c => c.id === selectedComicForView.id) || selectedComicForView)}
                  allFiles={fs.allFiles}
                />
              ) : selectedSeriesForView ? (
                /* Active Series & Anime Studio */
                <SeriesStudioView
                  series={selectedSeriesForView}
                  allFiles={fs.allFiles}
                  onBackToCatalog={() => setSelectedSeriesForView(null)}
                  onUpdateSeries={async (updated) => {
                    await series.updateSeries(updated);
                    setSelectedSeriesForView(updated);
                    fs.refresh();
                  }}
                  onDeleteSeries={async (id) => {
                    await series.deleteSeries(id);
                    setSelectedSeriesForView(null);
                    fs.refresh();
                  }}
                  onDeleteEpisode={async (seriesId, episodeId) => {
                    const updated = await series.deleteEpisode(seriesId, episodeId);
                    if (updated) {
                      setSelectedSeriesForView(updated);
                      fs.refresh();
                    }
                  }}
                  onRefreshSeries={async (seriesId) => {
                    const res = await series.refreshSingleSeries(seriesId);
                    if (res.series) {
                      setSelectedSeriesForView(res.series);
                      fs.refresh();
                    }
                    return res;
                  }}
                  onToggleEpisodeCompletion={series.toggleEpisodeCompletion}
                  onUpdateEpisodeProgress={series.updateEpisodeProgress}
                  onOpenEditModal={() => setEditingSeries(selectedSeriesForView)}
                />
              ) : selectedAudioForView ? (
                /* Active Music & Podcast Studio */
                <AudioStudioView
                  audioShow={selectedAudioForView}
                  allFiles={fs.allFiles}
                  initialTrackIndex={selectedAudioTrackIndex}
              onBackToCatalog={() => setSelectedAudioForView(null)}
              onUpdateAudioShow={async (updated) => {
                await audioShows.updateAudioShow(updated);
                setSelectedAudioForView(updated);
                fs.refresh();
              }}
              onDeleteAudioShow={async (id) => {
                await audioShows.deleteAudioShow(id);
                setSelectedAudioForView(null);
                fs.refresh();
              }}
              onToggleTrackCompletion={audioShows.toggleTrackCompletion}
              onUpdateTrackProgress={audioShows.updateTrackProgress}
              onOpenEditModal={() => setEditingAudioShow(selectedAudioForView)}
              onRefreshSinglePodcast={audioShows.refreshSinglePodcast}
              onTrackTask={fs.trackRemoteTask}
              onMinimizeToFloating={() => {
                audioShows.setIsFloatingOpen(true);
                setSelectedAudioForView(null);
              }}
              // Global Player bindings
              isPlaying={audioShows.isPlaying}
              currentTime={audioShows.currentTime}
              duration={audioShows.duration}
              playbackRate={audioShows.playbackSpeed}
              volume={audioShows.volume}
              isMuted={audioShows.isMuted}
              activeTrackIndex={audioShows.activeTrackIndex}
              onTogglePlay={audioShows.togglePlay}
              onSeek={audioShows.seekTo}
              onSkip={audioShows.skip}
              onSpeedChange={audioShows.setPlaybackSpeed}
              onVolumeChange={audioShows.setVolume}
              onToggleMute={audioShows.toggleMute}
              onPlayNextTrack={audioShows.playNextTrack}
              onPlayPreviousTrack={audioShows.playPreviousTrack}
              onSelectTrackIndex={(idx) => audioShows.selectTrack(idx, true)}
            />
          ) : selectedAdultVideoForView ? (
            /* Active Adult Cinema Video Player */
            <AdultPlayerView
              video={selectedAdultVideoForView}
              playlist={adultPlaylist}
              allFiles={fs.allFiles}
              performers={adultVault.performers}
              allVideos={adultVault.videos}
              onBackToCatalog={() => setSelectedAdultVideoForView(null)}
              onUpdateProgress={async (videoId, seconds, isCompleted) => {
                await adultVault.updateAdultVideoProgress(videoId, seconds, isCompleted);
              }}
              onToggleFavorite={adultVault.toggleFavorite}
              onSelectVideoInPlaylist={(v) => {
                adultVault.setActiveVideo(v);
                setSelectedAdultVideoForView(v);
              }}
              onAddPerformerToVideo={async (videoId, name) => {
                const updated = await adultVault.addPerformerToVideo(videoId, name);
                if (updated) {
                  setSelectedAdultVideoForView(updated);
                }
              }}
              onRemovePerformerFromVideo={async (videoId, name) => {
                const updated = await adultVault.removePerformerFromVideo(videoId, name);
                if (updated) {
                  setSelectedAdultVideoForView(updated);
                }
              }}
              onOpenNewPerformerModal={() => setIsPerformerModalOpen(true)}
              onTogglePerformerFavorite={adultVault.togglePerformerFavorite}
              onUpdateCoverImage={async (videoId, coverDataUrl) => {
                const target = adultVault.videos.find((v: AdultVideo) => v.id === videoId) || selectedAdultVideoForView;
                if (target) {
                  const updated = { ...target, coverImage: coverDataUrl };
                  await adultVault.updateAdultVideo(updated);
                  if (selectedAdultVideoForView?.id === videoId) {
                    setSelectedAdultVideoForView(updated);
                  }
                  showToast('📸 Foto de capa atualizada a partir do frame do vídeo!', 'success');
                }
              }}
              onOpenEditModal={() => setEditingAdultVideo(selectedAdultVideoForView)}
              onLockVault={() => {
                adultVault.lockVault();
                setSelectedAdultVideoForView(null);
              }}
            />
          ) : fs.activeTab === 'courses' ? (
            /* Courses Catalog */
            <CourseCatalog
              courses={courses.courses}
              onSelectCourse={(c) => {
                courses.selectCourse(c);
                setSelectedCourseForView(c);
              }}
              onNewCourse={() => setIsCourseModalOpen(true)}
              onOpenYouTubeModal={() => handleOpenYouTubeModal('course')}
              onDeleteCourse={(id) => {
                courses.deleteCourse(id);
                fs.refresh();
              }}
            />
          ) : fs.activeTab === 'books' ? (
            /* Books & Audiobooks Catalog */
            <BooksCatalog
              books={books.books}
              categories={books.categories}
              onSelectBook={(b) => {
                books.selectBook(b);
                setSelectedBookForView(b);
              }}
              onNewBook={() => setIsBookModalOpen(true)}
              onDeleteBook={(id) => {
                books.deleteBook(id);
                fs.refresh();
              }}
              onEditBook={(book) => setEditingBook(book)}
              onToggleBookCompletion={books.toggleBookCompletion}
              onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
            />
          ) : fs.activeTab === 'comics' ? (
            /* Comics & Mangas Catalog */
            <ComicsCatalog
              comics={comics.comics}
              categories={comics.categories}
              onSelectComic={(c) => {
                comics.setActiveComic(c);
                setSelectedComicForView(c);
              }}
              onNewComic={() => setIsComicModalOpen(true)}
              onDeleteComic={(id) => {
                comics.deleteComic(id);
                fs.refresh();
              }}
              onEditComic={(comic) => setEditingComic(comic)}
              onToggleComicCompletion={comics.toggleComicCompletion}
            />
          ) : fs.activeTab === 'videos' ? (
            /* Videos & Movies Catalog */
            <VideosCatalog
              videos={videos.videos}
              categories={videos.categories}
              folders={fs.allFolders}
              onSelectVideo={(v) => {
                videos.setActiveVideo(v);
                setSelectedVideoForView(v);
              }}
              onOpenNewModal={() => setIsVideoModalOpen(true)}
              onEditVideo={(v) => setEditingVideo(v)}
              onDeleteVideo={(id) => {
                videos.deleteVideo(id);
                fs.refresh();
              }}
            />
          ) : fs.activeTab === 'personal-videos' ? (
            /* Personal Videos & Media Catalog */
            <PersonalVideosCatalog
              videos={personalVideos.personalVideos}
              categories={personalVideos.categories}
              folders={fs.allFolders}
              onSelectVideo={(v) => {
                personalVideos.setActiveVideo(v);
                setSelectedPersonalVideoForView(v);
              }}
              onOpenNewModal={() => setIsPersonalVideoModalOpen(true)}
              onEditVideo={(v) => setEditingPersonalVideo(v)}
              onDeleteVideo={(id) => {
                personalVideos.deletePersonalVideo(id);
                fs.refresh();
              }}
              onToggleFavorite={personalVideos.toggleFavorite}
            />
          ) : fs.activeTab === 'series' ? (
            /* Series & Animes Catalog */
            <SeriesCatalog
              seriesList={series.seriesList}
              categories={series.categories}
              folders={fs.allFolders}
              onSelectSeries={(s) => {
                series.setActiveSeries(s);
                setSelectedSeriesForView(s);
              }}
              onOpenNewModal={() => setIsSeriesModalOpen(true)}
              onEditSeries={(s) => setEditingSeries(s)}
              onDeleteSeries={(id) => {
                series.deleteSeries(id);
                fs.refresh();
              }}
              onRefreshSeries={async (seriesId) => {
                const res = await series.refreshSingleSeries(seriesId);
                fs.refresh();
                return res;
              }}
              onRefreshAllSeries={async () => {
                const res = await series.refreshAllSeries();
                fs.refresh();
                return res;
              }}
            />
          ) : fs.activeTab === 'podcasts' ? (
            /* Music & Podcasts Catalog */
            <AudioCatalog
              audioShows={audioShows.audioShows}
              categories={audioShows.categories}
              folders={fs.allFolders}
              onSelectShow={(a, trackIndex) => {
                audioShows.playShowAndTrack(a, trackIndex !== undefined ? trackIndex : 0, true);
                setSelectedAudioForView(a);
                setSelectedAudioTrackIndex(trackIndex !== undefined ? trackIndex : 0);
              }}
              onOpenNewModal={() => setIsAudioModalOpen(true)}
              onOpenYouTubeModal={() => handleOpenYouTubeModal('podcast')}
              onEditShow={(a) => setEditingAudioShow(a)}
              onDeleteShow={(id) => {
                audioShows.deleteAudioShow(id);
                fs.refresh();
              }}
              onRefreshPodcasts={audioShows.refreshAllPodcasts}
            />
          ) : fs.activeTab === 'adult' ? (
            /* Adult +18 Content Catalog / Lock Screen */
            adultVault.isUnlocked ? (
              <AdultVideosCatalog
                videos={adultVault.videos}
                performers={adultVault.performers}
                categories={adultVault.categories}
                folders={fs.allFolders}
                onSelectVideo={(v, playlist) => {
                  adultVault.setActiveVideo(v);
                  setSelectedAdultVideoForView(v);
                  setAdultPlaylist(playlist || (v.isFavorite ? adultVault.videos.filter((x: AdultVideo) => x.isFavorite) : adultVault.videos));
                }}
                onOpenNewModal={() => setIsNewAdultVideoModalOpen(true)}
                onOpenNewPerformerModal={() => setIsPerformerModalOpen(true)}
                onEditPerformer={(p) => setEditingPerformer(p)}
                onUpdatePerformer={adultVault.updatePerformer}
                onDeletePerformer={(id) => adultVault.deletePerformer(id)}
                onTogglePerformerFavorite={adultVault.togglePerformerFavorite}
                onToggleFavorite={adultVault.toggleFavorite}
                onEditVideo={(v) => setEditingAdultVideo(v)}
                onDeleteVideo={(id) => {
                  adultVault.deleteAdultVideo(id);
                  fs.refresh();
                }}
                onLockVault={() => {
                  adultVault.lockVault();
                  setSelectedAdultVideoForView(null);
                  if (fs.currentFolderId && isRedLockerFolder(fs.currentFolderId, fs.allFolders)) {
                    fs.setCurrentFolderId(null);
                  }
                }}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-gray-50 dark:bg-drive-darkBg">
                <div className="w-20 h-20 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center shadow-inner">
                  <LockKeyhole className="w-10 h-10" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-500 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1">
                    <LockKeyhole className="w-3.5 h-3.5" />
                    <span>Red Locker • +18</span>
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                    Red Locker Bloqueado
                  </h2>
                  <p className="text-xs text-gray-500 max-w-sm mt-1">
                    Esta biblioteca privativa é protegida por senha mestre. Desbloqueie para visualizar e gerenciar os itens.
                  </p>
                </div>
                <button
                  onClick={() => setIsAdultLockModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all active:scale-95"
                >
                  <LockKeyhole className="w-4 h-4" />
                  <span>Desbloquear Red Locker</span>
                </button>
              </div>
            )
          ) : (
            /* Standard Drive Files & Folders View */
            <div className="flex flex-col flex-1">
              <Breadcrumbs
                currentPath={fs.getBreadcrumbPath()}
                onNavigate={handleNavigateFolder}
                viewMode={fs.viewMode}
                setViewMode={fs.setViewMode}
                sortBy={fs.sortBy}
                setSortBy={fs.setSortBy}
                sortOrder={fs.sortOrder}
                setSortOrder={fs.setSortOrder}
                totalItems={fs.folders.length + fs.files.length}
                filterType={fs.filterType}
                searchQuery={fs.searchQuery}
                onResetFilters={fs.resetFilters}
                onOpenDuplicates={() => setIsDuplicatesModalOpen(true)}
                onMoveItem={handleMoveItemWithFeedback}
                onUploadToFolder={(files, targetId) => handleSafeUpload(files, targetId)}
              />

              {fs.viewMode === 'grid' ? (
                <FileGrid
                  folders={fs.folders}
                  files={fs.files}
                  allFolders={fs.allFolders}
                  isAdultVaultUnlocked={adultVault.isUnlocked}
                  onOpenFolder={handleNavigateFolder}
                  onOpenFile={(f) => setActivePreviewFile(f)}
                  onToggleFavorite={fs.toggleFavorite}
                  isTrashView={fs.activeTab === 'trash'}
                  onRestoreItem={async (id, isFolder) => {
                    await fs.restoreItem(id, isFolder);
                    courses.refreshCourses();
                    books.refreshBooks();
                  }}
                  onEmptyTrash={async () => {
                    await fs.emptyTrash();
                    courses.refreshCourses();
                    books.refreshBooks();
                  }}
                  onDeleteItem={(id, isFolder, permanent, itemName, itemType) => {
                    setDeleteConfirmTarget({
                      id,
                      name: itemName || (isFolder ? 'Pasta' : 'Arquivo'),
                      isFolder,
                      isPermanent: permanent,
                      itemType
                    });
                  }}
                  onEditItem={(item, isFolder) => setEditingItem({ item, isFolder })}
                  onMoveItem={handleMoveItemWithFeedback}
                  onUploadToFolder={(files, targetId) => handleSafeUpload(files, targetId)}
                  onRetryUploadTelegram={(id) => fs.retryUploadToTelegram(id)}
                  retryingFileIds={fs.retryingFileIds}
                />
              ) : (
                <FileList
                  folders={fs.folders}
                  files={fs.files}
                  allFolders={fs.allFolders}
                  isAdultVaultUnlocked={adultVault.isUnlocked}
                  onOpenFolder={handleNavigateFolder}
                  onOpenFile={(f) => setActivePreviewFile(f)}
                  onToggleFavorite={fs.toggleFavorite}
                  isTrashView={fs.activeTab === 'trash'}
                  onRestoreItem={async (id, isFolder) => {
                    await fs.restoreItem(id, isFolder);
                    courses.refreshCourses();
                    books.refreshBooks();
                  }}
                  onEmptyTrash={async () => {
                    await fs.emptyTrash();
                    courses.refreshCourses();
                    books.refreshBooks();
                  }}
                  onDeleteItem={(id, isFolder, permanent, itemName, itemType) => {
                    setDeleteConfirmTarget({
                      id,
                      name: itemName || (isFolder ? 'Pasta' : 'Arquivo'),
                      isFolder,
                      isPermanent: permanent,
                      itemType
                    });
                  }}
                  onEditItem={(item, isFolder) => setEditingItem({ item, isFolder })}
                  onMoveItem={handleMoveItemWithFeedback}
                  onUploadToFolder={(files, targetId) => handleSafeUpload(files, targetId)}
                  onRetryUploadTelegram={(id) => fs.retryUploadToTelegram(id)}
                  retryingFileIds={fs.retryingFileIds}
                />
              )}
            </div>
          )}
        </>
      )}

          {/* Drag & Drop Visual Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-40 bg-blue-600/20 dark:bg-blue-600/30 backdrop-blur-sm border-4 border-dashed border-blue-500 rounded-3xl m-4 flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
              <div className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 mb-3 animate-bounce">
                <UploadCloud className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                Solte os arquivos ou pastas inteiras aqui
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                A estrutura de subpastas e arquivos será preservada no Telegram
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom-Right Upload Manager */}
      <UploadManager
        uploads={fs.uploads}
        onClear={() => fs.setUploads([])}
      />

      {/* Universal File Viewer Modal */}
      <FileViewerModal
        file={activePreviewFile}
        folderFiles={fs.files}
        onClose={() => setActivePreviewFile(null)}
        onSelectFile={(f) => setActivePreviewFile(f)}
        onRetryUploadTelegram={(id) => fs.retryUploadToTelegram(id)}
        retryingFileIds={fs.retryingFileIds}
      />

      {/* Login Required Warning Modal */}
      <LoginRequiredModal
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        title={loginPromptReason.title}
        description={loginPromptReason.description}
      />

      {/* Telegram MTProto Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authState={tg.authState}
        onStartQrLogin={tg.startQrLogin}
        onGetQrStatus={tg.getQrStatus}
        onSendCode={tg.sendCode}
        onSignIn={tg.signIn}
        onDisconnect={tg.disconnect}
        onSuccessAuth={() => {
          tg.fetchStatus();
          fs.refresh();
          courses.refreshCourses();
          books.refreshBooks();
        }}
        onOpenMobileServerSettings={() => setIsMobileServerModalOpen(true)}
        loading={tg.loading}
      />

      {/* Cloud Sync & Backup Restore Modal */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        telegramState={tg.authState}
        onSyncToTelegram={tg.syncMetadata}
        onRestoreFromTelegram={tg.restoreFromTelegram}
        onRefreshItems={() => {
          fs.refresh();
          courses.refreshCourses();
          books.refreshBooks();
        }}
        syncing={tg.syncing}
        onUpdateStreamingMode={tg.updateStreamingMode}
        onUpdateCacheDuration={tg.updateCacheDuration}
        onClearCache={tg.clearLocalCache}
      />

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreateFolder={async (name, color) => {
          const res = await fs.createFolder(name, color);
          courses.refreshCourses();
          books.refreshBooks();
          return res;
        }}
      />

      {/* Course Builder Modal */}
      <CourseModal
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        onCreateCourse={async (data) => {
          await courses.createCourse(data);
          courses.refreshCourses();
        }}
        onCreateCourseFromFolder={async (folderId, title, desc, cat) => {
          const newCourse = await courses.createCourseFromFolder(folderId, title, desc, cat);
          courses.refreshCourses();
          if (newCourse) setSelectedCourseForView(newCourse);
        }}
        availableFolders={fs.allFolders}
        availableFiles={fs.allFiles}
      />

      {/* Book & Audiobook Builder Modal */}
      <BookModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onCreateBook={async (data) => {
          await books.createBook(data);
          books.refreshBooks();
        }}
        onCreateBookFromFolder={async (params) => {
          const newBook = await books.createBookFromFolder(params);
          books.refreshBooks();
          if (newBook) setSelectedBookForView(newBook);
        }}
        availableFolders={fs.allFolders}
        availableFiles={fs.allFiles}
        categories={books.categories}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
      />

      {/* Book Metadata Editor Modal */}
      <EditBookModal
        isOpen={editingBook !== null}
        onClose={() => setEditingBook(null)}
        book={editingBook}
        categories={books.categories}
        onSave={async (updated) => {
          await books.updateBook(updated);
          books.refreshBooks();
          if (selectedBookForView?.id === updated.id) {
            setSelectedBookForView(updated);
          }
        }}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
      />

      {/* Comic / Manga Builder Modal */}
      <NewComicModal
        isOpen={isComicModalOpen}
        onClose={() => setIsComicModalOpen(false)}
        folders={fs.allFolders}
        allFiles={fs.allFiles}
        categories={comics.categories}
        onAddCategory={comics.addCategory}
        onCreateComic={async (data) => {
          const newComic = await comics.createComicFromFolder(data);
          fs.refresh();
          if (newComic) {
            setSelectedComicForView(newComic);
            fs.setActiveTab('comics');
          }
        }}
      />

      {/* Comic Metadata & Cover Editor Modal */}
      <EditComicModal
        isOpen={editingComic !== null}
        onClose={() => setEditingComic(null)}
        comic={editingComic}
        categories={comics.categories}
        onAddCategory={comics.addCategory}
        allFiles={fs.allFiles}
        onSave={async (updated) => {
          await comics.updateComic(updated);
          fs.refresh();
          if (selectedComicForView?.id === updated.id) {
            setSelectedComicForView(updated);
          }
        }}
      />

      {/* Video Creation Modal */}
      <NewVideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        folders={fs.allFolders}
        categories={videos.categories}
        onAddCategory={videos.addCategory}
        onCreateVideo={async (data) => {
          const newVideo = await videos.createVideoFromFolder(data);
          fs.refresh();
          if (newVideo) {
            setSelectedVideoForView(newVideo);
            fs.setActiveTab('videos');
          }
        }}
      />

      {/* Video Metadata Editor Modal */}
      <EditVideoModal
        isOpen={editingVideo !== null}
        onClose={() => setEditingVideo(null)}
        video={editingVideo}
        categories={videos.categories}
        allFiles={fs.allFiles}
        onAddCategory={videos.addCategory}
        onSave={async (updated) => {
          await videos.updateVideo(updated);
          fs.refresh();
          if (selectedVideoForView?.id === updated.id) {
            setSelectedVideoForView(updated);
          }
        }}
      />

      {/* Central de Chaves de API Manager Modal */}
      <ApiKeysManagerModal
        isOpen={isApiKeysModalOpen}
        onClose={() => setIsApiKeysModalOpen(false)}
        telegramState={tg.authState}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Personal Video Creation Modal */}
      <NewPersonalVideoModal
        isOpen={isPersonalVideoModalOpen}
        onClose={() => setIsPersonalVideoModalOpen(false)}
        folders={fs.allFolders}
        categories={personalVideos.categories}
        onAddCategory={personalVideos.addCategory}
        onCreateVideo={async (data) => {
          const newVideo = await personalVideos.createPersonalVideoFromFolder(data);
          fs.refresh();
          if (newVideo) {
            setSelectedPersonalVideoForView(newVideo);
            fs.setActiveTab('personal-videos');
          }
        }}
      />

      {/* Personal Video Metadata Editor Modal */}
      <EditPersonalVideoModal
        isOpen={editingPersonalVideo !== null}
        onClose={() => setEditingPersonalVideo(null)}
        video={editingPersonalVideo}
        categories={personalVideos.categories}
        allFiles={fs.allFiles}
        onAddCategory={personalVideos.addCategory}
        onSave={async (updated) => {
          await personalVideos.updatePersonalVideo(updated);
          fs.refresh();
          if (selectedPersonalVideoForView?.id === updated.id) {
            setSelectedPersonalVideoForView(updated);
          }
        }}
      />

      {/* Series Creation Modal */}
      <NewSeriesModal
        isOpen={isSeriesModalOpen}
        onClose={() => setIsSeriesModalOpen(false)}
        folders={fs.allFolders}
        categories={series.categories}
        onAddCategory={series.addCategory}
        onCreateSeries={async (data) => {
          const newSeries = await series.createSeriesFromFolder(data);
          fs.refresh();
          if (newSeries) {
            setSelectedSeriesForView(newSeries);
            fs.setActiveTab('series');
          }
        }}
      />

      {/* Series Metadata Editor Modal */}
      <EditSeriesModal
        isOpen={editingSeries !== null}
        onClose={() => setEditingSeries(null)}
        series={editingSeries}
        categories={series.categories}
        allFiles={fs.allFiles}
        onAddCategory={series.addCategory}
        onSave={async (updated) => {
          await series.updateSeries(updated);
          fs.refresh();
          if (selectedSeriesForView?.id === updated.id) {
            setSelectedSeriesForView(updated);
          }
        }}
      />

      {/* Audio Show Creation Modal */}
      <NewAudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        folders={fs.allFolders}
        categories={audioShows.categories}
        onAddCategory={audioShows.addCategory}
        onCreateAudioShow={async (data) => {
          const newShow = await audioShows.createAudioShowFromFolder(data);
          fs.refresh();
          if (newShow) {
            setSelectedAudioForView(newShow);
            fs.setActiveTab('podcasts');
          }
        }}
        onImportPodcast={async (podcastData) => {
          const newShow = await audioShows.importPodcast(podcastData);
          fs.refresh();
          if (newShow) {
            setSelectedAudioForView(newShow);
            fs.setActiveTab('podcasts');
          }
        }}
      />

      {/* Audio Show Metadata Editor Modal */}
      <EditAudioModal
        isOpen={editingAudioShow !== null}
        onClose={() => setEditingAudioShow(null)}
        audioShow={editingAudioShow}
        categories={audioShows.categories}
        allFiles={fs.allFiles}
        onAddCategory={audioShows.addCategory}
        onSave={async (updated) => {
          await audioShows.updateAudioShow(updated);
          fs.refresh();
          if (selectedAudioForView?.id === updated.id) {
            setSelectedAudioForView(updated);
          }
        }}
      />

      {/* Adult Vault Lock / Unlock / Setup / Recovery Modal */}
      <AdultVaultLockModal
        isOpen={isAdultLockModalOpen}
        onClose={() => {
          setIsAdultLockModalOpen(false);
          setPendingFolderToOpenAfterUnlock(null);
        }}
        isConfigured={adultVault.vaultStatus.isConfigured}
        recoveryQuestion={adultVault.vaultStatus.recoveryQuestion}
        hint={adultVault.vaultStatus.hint}
        onVerifyPassword={async (pwd) => {
          const ok = await adultVault.verifyPassword(pwd);
          if (ok && pendingFolderToOpenAfterUnlock) {
            fs.setCurrentFolderId(pendingFolderToOpenAfterUnlock);
            setPendingFolderToOpenAfterUnlock(null);
          }
          return ok;
        }}
        onSetupVault={async (pwd, q, a, hint) => {
          const ok = await adultVault.setupVault(pwd, q, a, hint);
          if (ok && pendingFolderToOpenAfterUnlock) {
            fs.setCurrentFolderId(pendingFolderToOpenAfterUnlock);
            setPendingFolderToOpenAfterUnlock(null);
          }
          return ok;
        }}
        onRecoverPassword={async (answer, newPwd) => {
          const ok = await adultVault.recoverPassword(answer, newPwd);
          if (ok && pendingFolderToOpenAfterUnlock) {
            fs.setCurrentFolderId(pendingFolderToOpenAfterUnlock);
            setPendingFolderToOpenAfterUnlock(null);
          }
          return ok;
        }}
      />

      {/* Adult Video Creation Modal */}
      <NewAdultVideoModal
        isOpen={isNewAdultVideoModalOpen}
        onClose={() => setIsNewAdultVideoModalOpen(false)}
        folders={fs.allFolders}
        allFiles={fs.allFiles}
        categories={adultVault.categories}
        onAddCategory={adultVault.addCategory}
        onCreateAdultVideo={async (data) => {
          const newVid = await adultVault.createAdultVideoFromFolder(data);
          fs.refresh();
          if (newVid) {
            setSelectedAdultVideoForView(newVid);
            fs.setActiveTab('adult');
          }
        }}
      />

      {/* Adult Video Metadata & Cover Editor Modal */}
      <EditAdultVideoModal
        isOpen={editingAdultVideo !== null}
        onClose={() => setEditingAdultVideo(null)}
        video={editingAdultVideo}
        categories={adultVault.categories}
        allFiles={fs.allFiles}
        onAddCategory={adultVault.addCategory}
        onSave={async (updated) => {
          await adultVault.updateAdultVideo(updated);
          fs.refresh();
          if (selectedAdultVideoForView?.id === updated.id) {
            setSelectedAdultVideoForView(updated);
          }
        }}
      />

      {/* Adult Performer Profile Modal (Create / Edit) */}
      <PerformerModal
        isOpen={isPerformerModalOpen || editingPerformer !== null}
        performer={editingPerformer}
        onClose={() => {
          setIsPerformerModalOpen(false);
          setEditingPerformer(null);
        }}
        onSave={async (data) => {
          if (editingPerformer) {
            await adultVault.updatePerformer({ ...editingPerformer, ...data } as any);
          } else {
            await adultVault.createPerformer(data);
          }
          setIsPerformerModalOpen(false);
          setEditingPerformer(null);
        }}
      />

      {/* Book Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={books.categories}
        onAddCategory={async (cat) => {
          await books.addCategory(cat);
          books.refreshBooks();
        }}
        onUpdateCategory={async (oldCat, newCat) => {
          await books.updateCategory(oldCat, newCat);
          books.refreshBooks();
        }}
        onDeleteCategory={async (cat) => {
          await books.deleteCategory(cat);
          books.refreshBooks();
        }}
        books={books.books}
      />

      {/* Duplicate Files Detector & Cleaner Modal */}
      <DuplicateFilesModal
        isOpen={isDuplicatesModalOpen}
        onClose={() => setIsDuplicatesModalOpen(false)}
        currentFolderId={fs.currentFolderId}
        currentFolderName={currentFolder?.name}
        onDeleteDuplicate={async (fileId) => {
          await fs.deleteItem(fileId, false);
          refreshAllLibraries();
        }}
        onRefresh={() => {
          fs.refresh();
          refreshAllLibraries();
        }}
      />

      {/* Global YouTube Importer Modal */}
      <YouTubeImportModal
        isOpen={isYouTubeModalOpen}
        onClose={() => setIsYouTubeModalOpen(false)}
        initialType={youtubeInitialType}
        allFolders={fs.allFolders}
        onImportSuccess={handleYouTubeImportSuccess}
        onTrackTask={fs.trackRemoteTask}
      />

      {/* Edit/Rename File & Folder Modal */}
      <EditItemModal
        isOpen={editingItem !== null}
        item={editingItem?.item || null}
        isFolder={editingItem?.isFolder || false}
        onClose={() => setEditingItem(null)}
        onSave={async (id, isFolder, updates) => {
          await fs.updateItem(id, isFolder, updates);
          refreshAllLibraries();
        }}
        onDelete={async (id, isFolder) => {
          const item = editingItem?.item;
          setDeleteConfirmTarget({
            id,
            name: item?.name || (isFolder ? 'Pasta' : 'Arquivo'),
            isFolder,
            isPermanent: false
          });
        }}
      />

      {/* Delete Confirmation Popup Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmTarget !== null}
        onClose={() => setDeleteConfirmTarget(null)}
        itemTitle={deleteConfirmTarget?.name || ''}
        isFolder={deleteConfirmTarget?.isFolder || false}
        isPermanent={deleteConfirmTarget?.isPermanent || false}
        itemType={deleteConfirmTarget?.itemType}
        onConfirm={async () => {
          if (deleteConfirmTarget) {
            await fs.deleteItem(
              deleteConfirmTarget.id,
              deleteConfirmTarget.isFolder,
              deleteConfirmTarget.isPermanent
            );
            refreshAllLibraries();
          }
        }}
      />

      {/* Mobile Server / Backend Configuration Modal */}
      <MobileServerSettingsModal
        isOpen={isMobileServerModalOpen}
        onClose={() => setIsMobileServerModalOpen(false)}
      />

      {/* Persistent Global Floating Audiobook Player */}
      {books.activeBook && books.isFloatingOpen && (
        <FloatingAudiobookPlayer
          book={books.activeBook}
          activeChapter={books.activeChapter}
          allFiles={fs.allFiles}
          isPlaying={books.isPlaying}
          currentTime={books.currentTime}
          duration={books.duration}
          playbackSpeed={books.playbackSpeed}
          volume={books.volume}
          isMuted={books.isMuted}
          audioRef={books.audioRef}
          onTogglePlay={books.togglePlay}
          onSeek={books.seekTo}
          onSkip={books.skip}
          onSpeedChange={books.setPlaybackSpeed}
          onVolumeChange={books.setVolume}
          onToggleMute={books.toggleMute}
          onNextChapter={books.playNextChapter}
          onPreviousChapter={books.playPreviousChapter}
          onOpenFullReader={(b) => setSelectedBookForView(b)}
          onClose={books.closeFloatingPlayer}
          onAudioEnded={books.handleAudioEnded}
          onTimeUpdate={books.setCurrentTime}
          onLoadedMetadata={books.setDuration}
          hasNextChapter={!!books.getNextChapter()}
          hasPreviousChapter={!!books.getPreviousChapter()}
          isCardVisible={selectedBookForView === null}
        />
      )}

      {/* Persistent Global Floating Podcast / Music Player with Vinyl Disc */}
      {audioShows.activeAudioShow && audioShows.isFloatingOpen && (
        <FloatingPodcastPlayer
          show={audioShows.activeAudioShow}
          activeTrack={audioShows.activeTrack}
          activeTrackIndex={audioShows.activeTrackIndex}
          allFiles={fs.allFiles}
          isPlaying={audioShows.isPlaying}
          currentTime={audioShows.currentTime}
          duration={audioShows.duration}
          playbackSpeed={audioShows.playbackSpeed}
          volume={audioShows.volume}
          isMuted={audioShows.isMuted}
          audioRef={audioShows.audioRef}
          onTogglePlay={audioShows.togglePlay}
          onSeek={audioShows.seekTo}
          onSkip={audioShows.skip}
          onSpeedChange={audioShows.setPlaybackSpeed}
          onVolumeChange={audioShows.setVolume}
          onToggleMute={audioShows.toggleMute}
          onNextTrack={audioShows.playNextTrack}
          onPreviousTrack={audioShows.playPreviousTrack}
          onOpenFullStudio={(show, trackIdx) => {
            setSelectedAudioForView(show);
            if (trackIdx !== undefined) setSelectedAudioTrackIndex(trackIdx);
            fs.setActiveTab('podcasts');
          }}
          onClose={audioShows.closeFloatingPlayer}
          onAudioEnded={audioShows.handleAudioEnded}
          onTimeUpdate={audioShows.setCurrentTime}
          onLoadedMetadata={audioShows.setDuration}
          onPlay={() => audioShows.setIsPlaying(true)}
          onPause={() => audioShows.setIsPlaying(false)}
          hasNextTrack={!!audioShows.getNextTrack()}
          hasPreviousTrack={!!audioShows.getPreviousTrack()}
          isCardVisible={selectedAudioForView === null}
          onBackupTrack={(track) => audioShows.backupTrackToTelegram(track, fs.trackRemoteTask)}
        />
      )}

      {/* Modern Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gray-950/95 text-white shadow-2xl backdrop-blur-md border border-gray-700/80 text-xs font-semibold animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto select-none max-w-md w-[calc(100vw-2rem)] sm:w-auto">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            toast.type === 'error' ? 'bg-rose-500 shadow-rose-500/50 shadow-md' :
            toast.type === 'info' ? 'bg-sky-400 shadow-sky-400/50 shadow-md' :
            'bg-emerald-400 shadow-emerald-400/50 shadow-md animate-pulse'
          }`} />
          <span className="truncate leading-relaxed flex-1">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={fs.activeTab}
        setActiveTab={handleSelectTab}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onNewFolder={() => setIsFolderModalOpen(true)}
        onNewCourse={() => setIsCourseModalOpen(true)}
        onNewBook={() => setIsBookModalOpen(true)}
        onNewComic={() => setIsComicModalOpen(true)}
        onNewVideo={() => setIsVideoModalOpen(true)}
        onNewPersonalVideo={() => setIsPersonalVideoModalOpen(true)}
        onNewSeries={() => setIsSeriesModalOpen(true)}
        onNewAudio={() => setIsAudioModalOpen(true)}
        onNewAdultVideo={() => {
          if (!adultVault.isUnlocked) {
            setIsAdultLockModalOpen(true);
          } else {
            setIsNewAdultVideoModalOpen(true);
          }
        }}
        onOpenYouTubeModal={(type) => handleOpenYouTubeModal(type || 'course')}
        onUploadFiles={async (files) => {
          await handleSafeUpload(files);
        }}
        isAdultVaultUnlocked={adultVault.isUnlocked}
      />
    </div>
  );
}
