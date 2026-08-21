import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Headphones, 
  BookOpen, 
  CheckCircle, 
  Circle, 
  Clock, 
  Moon, 
  BookmarkPlus, 
  FileText, 
  ListOrdered, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Download, 
  Maximize2, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Upload, 
  SplitSquareVertical, 
  User, 
  Mic, 
  Image as ImageIcon,
  Tag,
  Sparkles,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Book, BookChapter, DriveItem, VideoTimestamp } from '../types/index.js';
import { ComicReader } from './ComicReader.js';
import { EpubReader } from './EpubReader.js';

interface BookReaderViewProps {
  book: Book;
  activeChapter: BookChapter | null;
  onSelectChapter: (chapter: BookChapter) => void;
  onToggleChapterCompletion: (chapterId: string) => void;
  onSaveChapterNotes: (chapterId: string, notes: string) => void;
  onUpdateBook: (updatedBook: Book) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
  onBackToLibrary: () => void;
  getNextChapter: () => BookChapter | null;
  getPreviousChapter: () => BookChapter | null;
  allFiles: DriveItem[];
}

export const BookReaderView: React.FC<BookReaderViewProps> = ({
  book,
  activeChapter,
  onSelectChapter,
  onToggleChapterCompletion,
  onSaveChapterNotes,
  onUpdateBook,
  onDeleteBook,
  onBackToLibrary,
  getNextChapter,
  getPreviousChapter,
  allFiles
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState(true);

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);

  // Find ebook file (by ebookFileId OR any pdf in the book's folder)
  const ebookFile = book.ebookFileId 
    ? allFiles.find(f => f.id === book.ebookFileId) 
    : allFiles.find(f => f.parentId === book.folderId && (f.type === 'pdf' || f.extension === 'epub' || f.name.endsWith('.pdf')));

  // Layout View Mode: 'audio' | 'split' | 'ebook'
  const [viewMode, setViewMode] = useState<'audio' | 'split' | 'ebook'>(() => {
    if (ebookFile && (!book.chapters || book.chapters.length === 0)) return 'ebook';
    if (ebookFile && book.chapters && book.chapters.length > 0) return 'split';
    return 'audio';
  });

  // Active Tab for details
  const [activeTab, setActiveTab] = useState<'timestamps' | 'notes'>('timestamps');
  const [sidebarTab, setSidebarTab] = useState<'chapters' | 'allTimestamps'>('chapters');
  const [chapterNotes, setChapterNotes] = useState('');
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');

  // PDF attachment input
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Editing Book Info state
  const [isEditingBook, setIsEditingBook] = useState(false);
  const [titleInput, setTitleInput] = useState(book.title);
  const [authorInput, setAuthorInput] = useState(book.author || '');
  const [narratorInput, setNarratorInput] = useState(book.narrator || '');

  // Cover image modal state
  const [isChangingCover, setIsChangingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState(book.coverImage || '');
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Sync active chapter
  useEffect(() => {
    if (activeChapter) {
      setChapterNotes(activeChapter.notes || '');
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = activeChapter.lastPositionSeconds || 0;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [activeChapter?.id]);

  // Sleep timer interval
  useEffect(() => {
    let interval: any;
    if (sleepTimerRemainingSeconds !== null && sleepTimerRemainingSeconds > 0) {
      interval = setInterval(() => {
        setSleepTimerRemainingSeconds(prev => {
          if (prev && prev <= 1) {
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sleepTimerRemainingSeconds]);

  const handleSetSleepTimer = (minutes: number) => {
    if (minutes === 0) {
      setSleepTimerMinutes(null);
      setSleepTimerRemainingSeconds(null);
    } else {
      setSleepTimerMinutes(minutes);
      setSleepTimerRemainingSeconds(minutes * 60);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (activeChapter) {
      if (!activeChapter.isCompleted) {
        onToggleChapterCompletion(activeChapter.id);
      }
      if (isAutoPlayNext) {
        const next = getNextChapter();
        if (next) onSelectChapter(next);
      }
    }
  };

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSkip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ---------------- TIMESTAMPS / MARCADORES HANDLERS ----------------
  const handleAddTimestamp = async (customLabel?: string) => {
    if (!activeChapter || !audioRef.current) return;
    const currentSec = Math.floor(audioRef.current.currentTime);
    const formatted = formatSeconds(currentSec);
    const label = customLabel || newBookmarkLabel.trim() || `Marcador em ${formatted}`;

    const newTs: VideoTimestamp = {
      id: 'ts-b-' + Date.now(),
      seconds: currentSec,
      timeFormatted: formatted,
      label
    };

    const currentTs = activeChapter.timestamps || [];
    const updatedTs = [...currentTs, newTs].sort((a, b) => a.seconds - b.seconds);

    const updatedChapters = (book.chapters || []).map(c => 
      c.id === activeChapter.id ? { ...c, timestamps: updatedTs } : c
    );

    await onUpdateBook({ ...book, chapters: updatedChapters });
    setNewBookmarkLabel('');
  };

  const handleSeekTimestamp = (sec: number, chapterToSeek?: BookChapter) => {
    if (chapterToSeek && chapterToSeek.id !== activeChapter?.id) {
      onSelectChapter(chapterToSeek);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = sec;
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }, 100);
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = sec;
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleDeleteTimestamp = async (tsId: string, chapterId = activeChapter?.id) => {
    if (!chapterId) return;
    const targetChapter = (book.chapters || []).find(c => c.id === chapterId);
    if (!targetChapter) return;

    const updatedTs = (targetChapter.timestamps || []).filter(t => t.id !== tsId);
    const updatedChapters = (book.chapters || []).map(c => 
      c.id === chapterId ? { ...c, timestamps: updatedTs } : c
    );
    await onUpdateBook({ ...book, chapters: updatedChapters });
  };

  // ---------------- ATTACH PDF HANDLER ----------------
  const handleAttachPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (book.folderId) formData.append('parentId', book.folderId);

    try {
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const saved = await res.json();
        await onUpdateBook({
          ...book,
          ebookFileId: saved.id,
          format: book.chapters && book.chapters.length > 0 ? 'bundle' : 'ebook'
        });
        setViewMode('split');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeAudioFile = activeChapter?.fileId ? allFiles.find(f => f.id === activeChapter.fileId) : null;
  const allBookTimestamps = (book.chapters || []).flatMap(c => 
    (c.timestamps || []).map(ts => ({ ...ts, chapter: c }))
  );

  return (
    <div className="flex flex-col h-full bg-drive-lightBg dark:bg-drive-darkBg overflow-hidden">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors border border-gray-200 dark:border-drive-darkBorder shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Biblioteca</span>
          </button>

          <div className="h-4 w-px bg-gray-300 dark:bg-drive-darkBorder hidden sm:block shrink-0" />

          {isEditingBook ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Título do Livro"
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-50 dark:bg-drive-darkBg border border-purple-500 focus:outline-none"
              />
              <input
                type="text"
                value={authorInput}
                onChange={(e) => setAuthorInput(e.target.value)}
                placeholder="Autor"
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-50 dark:bg-drive-darkBg border border-purple-500 focus:outline-none"
              />
              <button 
                onClick={async () => {
                  await onUpdateBook({
                    ...book,
                    title: titleInput.trim() || book.title,
                    author: authorInput.trim() || book.author
                  });
                  setIsEditingBook(false);
                }} 
                className="p-1 rounded bg-purple-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingBook(false)} className="p-1 rounded text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {book.title}
              </h1>
              {book.author && (
                <span className="text-xs text-gray-400 hidden md:inline truncate">
                  • {book.author}
                </span>
              )}
              <button
                onClick={() => {
                  setTitleInput(book.title);
                  setAuthorInput(book.author || '');
                  setIsEditingBook(true);
                }}
                className="p-1 text-gray-400 hover:text-purple-500"
                title="Editar Livro"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setCoverUrlInput(book.coverImage || '');
                  setIsChangingCover(true);
                }}
                className="p-1 text-gray-400 hover:text-purple-500"
                title="Trocar Capa"
              >
                <ImageIcon className="w-3 h-3 text-purple-500" />
              </button>
            </div>
          )}
        </div>

        {/* View Mode Switcher (Áudio / Ouvir & Ler / PDF) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-drive-darkBg p-1 rounded-xl border border-gray-200 dark:border-drive-darkBorder">
            <button
              onClick={() => setViewMode('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'audio' ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500'
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Apenas Áudio</span>
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'split' ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ouvir & Ler (Dividido)</span>
            </button>

            <button
              onClick={() => setViewMode('ebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'ebook' ? 'bg-white dark:bg-drive-darkSurface text-purple-600 dark:text-purple-400 shadow-sm' : 'text-gray-500'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Leitor PDF</span>
            </button>
          </div>

          {!ebookFile && (
            <>
              <button
                onClick={() => pdfInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-colors"
                title="Carregar arquivo PDF do livro"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Anexar Livro (PDF)</span>
              </button>
              <input
                type="file"
                ref={pdfInputRef}
                onChange={handleAttachPdf}
                accept=".pdf,.epub"
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Hidden Global Audio Element so audio plays seamlessly across all view modes */}
      <audio
        ref={audioRef}
        src={activeAudioFile ? `/api/stream/${activeAudioFile.id}` : undefined}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        onEnded={handleAudioEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* ================= MODE 1: SPLIT VIEW (OUVIR & LER) ================= */}
          {viewMode === 'split' && (
            <div className="flex-1 flex flex-col xl:flex-row gap-4 h-full overflow-hidden">
              {/* Left Column: Compact Audiobook Player & Timestamps (Fixed Width) */}
              <div className="w-full xl:w-96 flex flex-col gap-3 overflow-y-auto shrink-0 pr-1">
                {/* Compact Player Card */}
                <div className="p-5 rounded-3xl bg-gradient-to-b from-purple-950/50 via-slate-900 to-gray-950 border border-purple-800/40 shadow-xl text-white flex flex-col items-center">
                  <div className="flex items-center gap-4 w-full mb-3">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border border-purple-500/30 shrink-0">
                      <img
                        src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block truncate">
                        {book.title}
                      </span>
                      <h3 className="text-xs font-bold text-white truncate leading-tight mt-0.5">
                        {activeChapter?.title || 'Capítulo Selecionado'}
                      </h3>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatSeconds(currentTime)} / {formatSeconds(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Scrubber */}
                  <div className="w-full space-y-1 mb-3">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCurrentTime(val);
                        if (audioRef.current) audioRef.current.currentTime = val;
                      }}
                      className="w-full h-1.5 rounded-lg bg-purple-950 accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-3 w-full mb-2">
                    <button onClick={() => handleSkip(-15)} className="p-2 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleTogglePlay}
                      className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/40"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                    </button>
                    <button onClick={() => handleSkip(30)} className="p-2 rounded-full bg-purple-900/60 hover:bg-purple-800 text-purple-200">
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed & Sleep Timer Pills */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-purple-900/40 w-full justify-between text-[10px]">
                    <div className="flex items-center gap-1 bg-purple-900/40 px-2 py-0.5 rounded-lg">
                      {[1, 1.25, 1.5].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedChange(s)}
                          className={`font-bold ${playbackSpeed === s ? 'text-purple-300' : 'text-gray-400'}`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleAddTimestamp()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                    >
                      <BookmarkPlus className="w-3 h-3" /> + Marcador
                    </button>
                  </div>
                </div>

                {/* Timestamps of Chapter */}
                <div className="p-3 rounded-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder space-y-2">
                  <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block">
                    📌 Marcadores ({activeChapter?.timestamps?.length || 0})
                  </span>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {activeChapter?.timestamps && activeChapter.timestamps.length > 0 ? (
                      activeChapter.timestamps.map(ts => (
                        <button
                          key={ts.id}
                          onClick={() => handleSeekTimestamp(ts.seconds)}
                          className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-drive-darkBg hover:bg-purple-50 text-left text-xs"
                        >
                          <span className="truncate flex-1 font-medium">{ts.label}</span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-bold">
                            ▶ {ts.timeFormatted}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="text-[11px] text-gray-400 text-center py-2">Nenhum marcador neste capítulo.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Full Expanded PDF E-Book Reader */}
              <div className="flex-1 flex flex-col bg-white dark:bg-drive-darkSurface rounded-3xl border border-gray-200 dark:border-drive-darkBorder overflow-hidden shadow-2xl min-h-[500px] h-full">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-drive-darkBg border-b border-gray-200 dark:border-drive-darkBorder text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-md">
                      {ebookFile?.name || 'Leitura Acompanhada'}
                    </span>
                  </div>
                  {ebookFile && (
                    <a
                      href={`/api/stream/${ebookFile.id}`}
                      download={ebookFile.name}
                      className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> <span>Baixar PDF</span>
                    </a>
                  )}
                </div>

                <div className="flex-1 bg-gray-200 dark:bg-gray-900 w-full h-full relative overflow-hidden">
                  {ebookFile ? (
                    ebookFile.extension === 'epub' || /\.epub$/i.test(ebookFile.name) ? (
                      <EpubReader file={ebookFile} />
                    ) : ['cbr', 'cbz'].includes(ebookFile.extension) || /\.(cbr|cbz)$/i.test(ebookFile.name) ? (
                      <ComicReader file={ebookFile} />
                    ) : (
                      <iframe
                        src={`/api/stream/${ebookFile.id}#toolbar=1&navpanes=0`}
                        className="w-full h-full border-none bg-white"
                        title={book.title}
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                      <FileText className="w-16 h-16 text-gray-400 mb-3" />
                      <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Nenhum livro digital anexado</h4>
                      <p className="text-xs text-gray-500 mb-4">Anexe um arquivo PDF, EPUB ou HQ (CBR/CBZ) para ler e ouvir ao mesmo tempo.</p>
                      <button
                        onClick={() => pdfInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                      >
                        Carregar Livro / HQ Agora
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE 2: E-BOOK FULL VIEW ================= */}
          {viewMode === 'ebook' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-drive-darkSurface rounded-3xl border border-gray-200 dark:border-drive-darkBorder overflow-hidden shadow-2xl h-full relative">
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-drive-darkBg border-b border-gray-200 dark:border-drive-darkBorder text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span className="font-bold text-gray-800 dark:text-gray-200 truncate">
                    {ebookFile?.name || book.title}
                  </span>
                </div>
                {ebookFile && (
                  <a
                    href={`/api/stream/${ebookFile.id}`}
                    download={ebookFile.name}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-purple-600 text-white font-bold text-xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar {ebookFile.extension?.toUpperCase() || 'Arquivo'}
                  </a>
                )}
              </div>

              <div className="flex-1 bg-gray-200 dark:bg-gray-900 w-full h-full overflow-hidden">
                {ebookFile ? (
                  ebookFile.extension === 'epub' || /\.epub$/i.test(ebookFile.name) ? (
                    <EpubReader file={ebookFile} />
                  ) : ['cbr', 'cbz'].includes(ebookFile.extension) || /\.(cbr|cbz)$/i.test(ebookFile.name) ? (
                    <ComicReader file={ebookFile} />
                  ) : (
                    <iframe
                      src={`/api/stream/${ebookFile.id}#toolbar=1`}
                      className="w-full h-full border-none bg-white"
                      title={book.title}
                    />
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 text-center h-full">
                    <FileText className="w-16 h-16 text-gray-400 mb-3" />
                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">Nenhum livro digital (PDF/EPUB/CBR) encontrado</h4>
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className="mt-4 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold"
                    >
                      Selecionar Arquivo PDF / EPUB / CBR
                    </button>
                  </div>
                )}
              </div>

              {/* Floating Bottom Audio Strip if audio is playing */}
              {activeChapter && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-950/90 backdrop-blur-md text-white border border-purple-700/60 shadow-2xl px-5 py-2.5 rounded-2xl flex items-center gap-4 z-40">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold truncate max-w-xs">{activeChapter.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleSkip(-15)} className="p-1 text-purple-300 hover:text-white">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleTogglePlay}
                      className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <button onClick={() => handleSkip(30)} className="p-1 text-purple-300 hover:text-white">
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= MODE 3: FULL AUDIO STUDIO ================= */}
          {viewMode === 'audio' && (
            <div className="flex-1 flex flex-col overflow-y-auto max-w-3xl mx-auto w-full space-y-6">
              <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-purple-950/50 via-slate-900 to-gray-950 rounded-3xl border border-purple-800/40 shadow-2xl text-white">
                {/* Large Vinyl */}
                <div className="relative mb-6">
                  <div className={`w-52 h-52 rounded-3xl overflow-hidden shadow-2xl border-2 border-purple-500/30 transition-all duration-700 ${isPlaying ? 'ring-8 ring-purple-500/20 scale-105' : 'grayscale-[20%]'}`}>
                    <img
                      src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="text-center max-w-md w-full mb-6">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block mb-1">
                    {book.title}
                  </span>
                  <h2 className="text-lg font-bold text-white truncate">
                    {activeChapter?.title || 'Selecione um capítulo'}
                  </h2>
                </div>

                {/* Scrub bar */}
                <div className="w-full max-w-md space-y-1 mb-4">
                  <div className="flex justify-between text-xs text-purple-300 font-mono">
                    <span>{formatSeconds(currentTime)}</span>
                    <span>{formatSeconds(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCurrentTime(val);
                      if (audioRef.current) audioRef.current.currentTime = val;
                    }}
                    className="w-full h-2 rounded-lg bg-purple-950 accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Big Controls */}
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => { const prev = getPreviousChapter(); if (prev) onSelectChapter(prev); }} disabled={!getPreviousChapter()} className="p-2 rounded-full text-purple-300 hover:text-white disabled:opacity-30">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleSkip(-15)} className="p-2.5 rounded-full bg-purple-900/60 text-purple-200">
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button onClick={handleTogglePlay} className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-xl shadow-purple-500/40">
                    {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                  </button>
                  <button onClick={() => handleSkip(30)} className="p-2.5 rounded-full bg-purple-900/60 text-purple-200">
                    <RotateCw className="w-5 h-5" />
                  </button>
                  <button onClick={() => { const next = getNextChapter(); if (next) onSelectChapter(next); }} disabled={!getNextChapter()} className="p-2 rounded-full text-purple-300 hover:text-white disabled:opacity-30">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Direct Timestamp Creator Action Bar */}
                <div className="w-full max-w-md mb-4 p-3 bg-purple-950/60 rounded-2xl border border-purple-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <BookmarkPlus className="w-4 h-4 text-amber-400" />
                      <span>Timestamp no tempo atual ({formatSeconds(currentTime)})</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBookmarkLabel}
                      onChange={(e) => setNewBookmarkLabel(e.target.value)}
                      placeholder="Descrição do trecho ou citação importante..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-gray-900/90 border border-purple-700/60 focus:outline-none focus:ring-2 focus:ring-amber-400 text-white placeholder-gray-400"
                    />
                    <button
                      onClick={() => handleAddTimestamp()}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
                    >
                      + Salvar
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Timestamps & Notes list */}
              {activeChapter && (
                <div className="p-5 rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder space-y-3">
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Marcadores deste Capítulo ({activeChapter.timestamps?.length || 0})
                  </h4>
                  <div className="space-y-1.5">
                    {activeChapter.timestamps && activeChapter.timestamps.map(ts => (
                      <div key={ts.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-drive-darkBg">
                        <button onClick={() => handleSeekTimestamp(ts.seconds)} className="flex items-center gap-2 text-xs font-semibold">
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px]">
                            ▶ {ts.timeFormatted}
                          </span>
                          <span>{ts.label}</span>
                        </button>
                        <button onClick={() => handleDeleteTimestamp(ts.id)} className="p-1 text-gray-400 hover:text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Chapters Accordion */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface flex flex-col shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-drive-darkBorder flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Capítulos ({book.chapters?.length || 0})
              </h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {book.chapters && book.chapters.map((chap) => {
              const isActive = activeChapter?.id === chap.id;
              return (
                <div
                  key={chap.id}
                  onClick={() => onSelectChapter(chap)}
                  className={`flex items-center justify-between p-3 rounded-2xl text-xs cursor-pointer group transition-all border ${
                    isActive
                      ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 text-purple-900 dark:text-purple-200 font-bold'
                      : 'hover:bg-gray-50 dark:hover:bg-drive-darkHover border-gray-100 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleChapterCompletion(chap.id);
                      }}
                      className="text-gray-400 hover:text-emerald-500 shrink-0"
                    >
                      {chap.isCompleted ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    {chap.isCompleted && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500 shrink-0" title="Capítulo Concluído" />
                    )}

                    <span className="truncate leading-tight">{chap.title}</span>
                  </div>

                  <span className="text-[10px] text-gray-400 font-mono ml-2 shrink-0">{chap.duration || '20:00'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal: Change Cover */}
      {isChangingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-sm">Alterar Capa do Livro</h3>
              </div>
              <button onClick={() => setIsChangingCover(false)} className="p-1.5 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="h-44 rounded-2xl overflow-hidden bg-gray-100 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder flex items-center justify-center">
                <img
                  src={coverUrlInput || book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60'}
                  alt="Prévia"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">URL da Imagem</label>
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => setCoverUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-800 hover:border-purple-500 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Carregar Imagem do Computador</span>
              </button>
              <input
                type="file"
                ref={coverInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setCoverUrlInput(dataUrl);
                      await onUpdateBook({ ...book, coverImage: dataUrl });
                      setIsChangingCover(false);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                accept="image/*"
                className="hidden"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                <button onClick={() => setIsChangingCover(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onUpdateBook({ ...book, coverImage: coverUrlInput.trim() || book.coverImage });
                    setIsChangingCover(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/20"
                >
                  Salvar Nova Capa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
