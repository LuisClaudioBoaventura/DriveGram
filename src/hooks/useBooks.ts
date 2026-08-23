import { useState, useEffect, useCallback, useRef } from 'react';
import { Book, BookChapter } from '../types/index.js';

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Desenvolvimento Pessoal',
    'Negócios & Carreira',
    'Ficção & Literatura',
    'Finanças & Investimentos',
    'Produtividade',
    'Tecnologia & Ciência',
    'Psicologia & Mente',
    'Biografia & História',
    'Fantasia & Sci-Fi'
  ]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [activeChapter, setActiveChapter] = useState<BookChapter | null>(null);
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Global Audio Playback & Floating Player states
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
        if (data.length > 0 && !activeBook) {
          setActiveBook(data[0]);
          if (data[0].chapters?.[0]) {
            setActiveChapter(data[0].chapters[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for books');
    }
  }, [activeBook]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/book-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchBooks();
    fetchCategories();
  }, [fetchBooks, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/book-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
      }
    } catch (e) {
      setCategories(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
    }
  };

  const updateCategory = async (oldCategory: string, newCategory: string) => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/book-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchBooks();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/book-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  // Refs for consistent auto-save across intervals and closures
  const activeBookRef = useRef<Book | null>(activeBook);
  const activeChapterRef = useRef<BookChapter | null>(activeChapter);
  const currentTimeRef = useRef<number>(currentTime);

  useEffect(() => {
    activeBookRef.current = activeBook;
  }, [activeBook]);

  useEffect(() => {
    activeChapterRef.current = activeChapter;
  }, [activeChapter]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const savePlaybackPosition = useCallback(async () => {
    const book = activeBookRef.current;
    const chapter = activeChapterRef.current;
    if (!book || !chapter) return;

    const sec = Math.floor(currentTimeRef.current);
    if (chapter.lastPositionSeconds === sec && book.lastPlayedChapterId === chapter.id) {
      return;
    }

    const updatedChapters = (book.chapters || []).map(c => 
      c.id === chapter.id ? { ...c, lastPositionSeconds: sec } : c
    );

    const updatedBook: Book = {
      ...book,
      lastPlayedChapterId: chapter.id,
      lastPositionSeconds: sec,
      chapters: updatedChapters
    };

    setActiveBook(updatedBook);
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));

    try {
      await fetch(`/api/books/${updatedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      });
    } catch (e) {}
  }, []);

  // Periodic progress saving every 5 seconds when audio is active
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      savePlaybackPosition();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPlaying, savePlaybackPosition]);

  const selectBook = useCallback((book: Book, autoPlay = false) => {
    setActiveBook(book);
    setIsFloatingOpen(true);
    if (book.chapters && book.chapters.length > 0) {
      // Pick last played chapter, or first uncompleted chapter, or first chapter
      const targetChapter = 
        (book.lastPlayedChapterId && book.chapters.find(c => c.id === book.lastPlayedChapterId)) ||
        book.chapters.find(c => !c.isCompleted) ||
        book.chapters[0];

      setActiveChapter(targetChapter);
      const startSec = targetChapter.lastPositionSeconds || book.lastPositionSeconds || 0;
      setCurrentTime(startSec);
      if (audioRef.current) {
        audioRef.current.currentTime = startSec;
      }
    } else {
      setActiveChapter(null);
      setCurrentTime(0);
    }
    if (autoPlay) {
      setIsPlaying(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }, 50);
    }
  }, []);

  const selectChapter = useCallback((chapter: BookChapter, autoPlay = true) => {
    setActiveChapter(chapter);
    setIsFloatingOpen(true);
    const startSec = chapter.lastPositionSeconds || 0;
    setCurrentTime(startSec);
    if (audioRef.current) {
      audioRef.current.currentTime = startSec;
    }

    if (activeBookRef.current) {
      const book = activeBookRef.current;
      const updatedChapters = (book.chapters || []).map(c => 
        c.id === chapter.id ? { ...c, lastPositionSeconds: startSec } : c
      );
      const updatedBook: Book = {
        ...book,
        lastPlayedChapterId: chapter.id,
        lastPositionSeconds: startSec,
        chapters: updatedChapters
      };
      setActiveBook(updatedBook);
      setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
      fetch(`/api/books/${updatedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      }).catch(() => {});
    }

    if (autoPlay) {
      setIsPlaying(true);
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 50);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) {
      setIsPlaying(prev => !prev);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      savePlaybackPosition();
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying, savePlaybackPosition]);

  const seekTo = useCallback((seconds: number) => {
    const valid = Math.max(0, Math.min(duration || 999999, seconds));
    setCurrentTime(valid);
    if (audioRef.current) {
      audioRef.current.currentTime = valid;
    }
    currentTimeRef.current = valid;
  }, [duration]);

  const skip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const target = Math.max(0, Math.min(duration || 999999, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = target;
      setCurrentTime(target);
      currentTimeRef.current = target;
    } else {
      setCurrentTime(prev => {
        const next = Math.max(0, Math.min(duration || 999999, prev + seconds));
        currentTimeRef.current = next;
        return next;
      });
    }
  }, [duration]);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const handleVolumeChange = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
    setIsMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const closeFloatingPlayer = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    savePlaybackPosition();
    setIsPlaying(false);
    setIsFloatingOpen(false);
  }, [savePlaybackPosition]);

  const getNextChapter = useCallback((): BookChapter | null => {
    if (!activeBook || !activeChapter) return null;
    const chapters = activeBook.chapters || [];
    const idx = chapters.findIndex(c => c.id === activeChapter.id);
    if (idx >= 0 && idx < chapters.length - 1) {
      return chapters[idx + 1];
    }
    return null;
  }, [activeBook, activeChapter]);

  const getPreviousChapter = useCallback((): BookChapter | null => {
    if (!activeBook || !activeChapter) return null;
    const chapters = activeBook.chapters || [];
    const idx = chapters.findIndex(c => c.id === activeChapter.id);
    if (idx > 0) {
      return chapters[idx - 1];
    }
    return null;
  }, [activeBook, activeChapter]);

  const playNextChapter = useCallback(() => {
    const next = getNextChapter();
    if (next) {
      selectChapter(next, true);
    }
  }, [getNextChapter, selectChapter]);

  const playPreviousChapter = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prev = getPreviousChapter();
    if (prev) {
      selectChapter(prev, true);
    }
  }, [getPreviousChapter, selectChapter]);

  const handleAudioEnded = useCallback(() => {
    if (activeBook && activeChapter) {
      // Mark active chapter completed and reset position
      const updatedChapters = (activeBook.chapters || []).map(chap => 
        chap.id === activeChapter.id ? { ...chap, isCompleted: true, lastPositionSeconds: 0 } : chap
      );
      const allDone = updatedChapters.length > 0 && updatedChapters.every(c => c.isCompleted);
      const updatedBook = {
        ...activeBook,
        isCompleted: allDone ? true : activeBook.isCompleted,
        chapters: updatedChapters
      };
      setActiveBook(updatedBook);
      setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
      fetch(`/api/books/${updatedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      }).catch(() => {});
    }

    if (isAutoPlayEnabled) {
      const next = getNextChapter();
      if (next) {
        selectChapter(next, true);
        return;
      }
    }
    setIsPlaying(false);
  }, [activeBook, activeChapter, getNextChapter, isAutoPlayEnabled, selectChapter]);

  const updateBook = async (updated: Book) => {
    setActiveBook(updated);
    setBooks(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (activeChapter) {
      const updatedChap = (updated.chapters || []).find(c => c.id === activeChapter.id);
      if (updatedChap) setActiveChapter(updatedChap);
    }

    try {
      await fetch(`/api/books/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {}
  };

  const toggleBookCompletion = async (bookId: string) => {
    const target = books.find(b => b.id === bookId) || (activeBook?.id === bookId ? activeBook : null);
    if (!target) return;

    const newCompleted = !target.isCompleted;
    const updatedChapters = (target.chapters || []).map(chap => ({
      ...chap,
      isCompleted: newCompleted
    }));

    const updatedBook: Book = {
      ...target,
      isCompleted: newCompleted,
      chapters: updatedChapters
    };

    if (activeBook?.id === bookId) {
      setActiveBook(updatedBook);
      if (activeChapter) {
        setActiveChapter(prev => prev ? { ...prev, isCompleted: newCompleted } : null);
      }
    }

    setBooks(prev => prev.map(b => b.id === bookId ? updatedBook : b));

    try {
      await fetch(`/api/books/${updatedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedBook)
      });
    } catch (e) {}
  };

  const toggleChapterCompletion = async (chapterId: string) => {
    if (!activeBook) return;
    const updatedChapters = (activeBook.chapters || []).map(chap => 
      chap.id === chapterId ? { ...chap, isCompleted: !chap.isCompleted } : chap
    );
    const allDone = updatedChapters.length > 0 && updatedChapters.every(c => c.isCompleted);
    const updatedBook = {
      ...activeBook,
      isCompleted: allDone,
      chapters: updatedChapters
    };
    await updateBook(updatedBook);
  };

  const saveChapterNotes = async (chapterId: string, notes: string) => {
    if (!activeBook) return;
    const updatedChapters = (activeBook.chapters || []).map(chap => 
      chap.id === chapterId ? { ...chap, notes } : chap
    );
    const updatedBook = { ...activeBook, chapters: updatedChapters };
    await updateBook(updatedBook);
  };

  const createBook = async (bookData: Partial<Book>) => {
    const newBook: Book = {
      id: 'book-' + Date.now(),
      title: bookData.title || 'Novo Livro / Audiolivro',
      author: bookData.author || 'Autor Desconhecido',
      narrationType: bookData.narrationType || 'Humana',
      narrator: bookData.narrator || '',
      version: bookData.version || 'Estúdio de áudio',
      totalDuration: bookData.totalDuration || '01h 00m',
      saga: bookData.saga || 'N/A',
      fileSizeFormatted: bookData.fileSizeFormatted || '150 MB',
      category: bookData.category || 'Desenvolvimento Pessoal',
      genre: bookData.genre || 'Geral',
      language: bookData.language || 'Português',
      description: bookData.description || '',
      coverImage: bookData.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=60',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      format: bookData.format || 'audiobook',
      chapters: bookData.chapters || [
        {
          id: 'chap-' + Date.now(),
          title: 'Capítulo 1: Introdução',
          order: 1
        }
      ]
    };

    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });
      if (res.ok) {
        const saved = await res.json();
        setBooks(prev => [...prev, saved]);
        setActiveBook(saved);
        return saved;
      }
    } catch (e) {
      setBooks(prev => [...prev, newBook]);
      setActiveBook(newBook);
      return newBook;
    }
  };

  const createBookFromFolder = async (params: {
    folderId: string;
    title?: string;
    author?: string;
    narrationType?: string;
    narrator?: string;
    version?: string;
    totalDuration?: string;
    saga?: string;
    fileSizeFormatted?: string;
    category?: string;
    genre?: string;
    language?: string;
    description?: string;
    coverImage?: string;
  }) => {
    try {
      const res = await fetch('/api/books/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const saved = await res.json();
        setBooks(prev => [...prev, saved]);
        selectBook(saved);
        return saved;
      }
    } catch (e) {
      console.error('Error creating book from folder:', e);
    }
  };

  const deleteBook = async (bookId: string) => {
    setBooks(prev => prev.filter(b => b.id !== bookId));
    if (activeBook?.id === bookId) {
      setActiveBook(null);
      setActiveChapter(null);
    }
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'DELETE'
      });
    } catch (e) {}
  };

  return {
    books,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,
    activeBook,
    activeChapter,
    isAutoPlayEnabled,
    setIsAutoPlayEnabled,
    playbackSpeed,
    setPlaybackSpeed: handleSpeedChange,
    loading,
    selectBook,
    selectChapter,
    getNextChapter,
    getPreviousChapter,
    updateBook,
    toggleBookCompletion,
    toggleChapterCompletion,
    saveChapterNotes,
    savePlaybackPosition,
    createBook,
    createBookFromFolder,
    deleteBook,
    refreshBooks: fetchBooks,
    // Global Audio Player & Floating states & handlers
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    volume,
    setVolume: handleVolumeChange,
    isMuted,
    toggleMute,
    isFloatingOpen,
    setIsFloatingOpen,
    togglePlay,
    seekTo,
    skip,
    playNextChapter,
    playPreviousChapter,
    closeFloatingPlayer,
    handleAudioEnded
  };
}
