import { useState, useEffect, useCallback } from 'react';
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

  const selectBook = (book: Book) => {
    setActiveBook(book);
    if (book.chapters && book.chapters.length > 0) {
      setActiveChapter(book.chapters[0]);
    } else {
      setActiveChapter(null);
    }
  };

  const selectChapter = (chapter: BookChapter) => {
    setActiveChapter(chapter);
  };

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

  const toggleChapterCompletion = async (chapterId: string) => {
    if (!activeBook) return;
    const updatedChapters = (activeBook.chapters || []).map(chap => 
      chap.id === chapterId ? { ...chap, isCompleted: !chap.isCompleted } : chap
    );
    const updatedBook = { ...activeBook, chapters: updatedChapters };
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
    setPlaybackSpeed,
    loading,
    selectBook,
    selectChapter,
    getNextChapter,
    getPreviousChapter,
    updateBook,
    toggleChapterCompletion,
    saveChapterNotes,
    createBook,
    createBookFromFolder,
    deleteBook,
    refreshBooks: fetchBooks
  };
}
