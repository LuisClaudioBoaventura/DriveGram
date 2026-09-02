import { useState, useEffect, useCallback } from 'react';
import { ComicBook, ComicIssue } from '../types/index.js';

export function useComics() {
  const [comics, setComics] = useState<ComicBook[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Super-Heróis',
    'Mangá (Shonen)',
    'Mangá (Seinen)',
    'Graphic Novels',
    'Ficção Científica',
    'Fantasia & Aventura',
    'Terror & Suspense',
    'Quadrinhos Clássicos',
    'Indie & Autoral'
  ]);
  const [activeComic, setActiveComic] = useState<ComicBook | null>(null);
  const [activeIssue, setActiveIssue] = useState<ComicIssue | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComics = useCallback(async () => {
    try {
      const res = await fetch('/api/comics');
      if (res.ok) {
        const data = await res.json();
        setComics(data);
        if (data.length > 0 && !activeComic) {
          setActiveComic(data[0]);
          if (data[0].issues?.[0]) {
            setActiveIssue(data[0].issues[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for comics');
    }
  }, [activeComic]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/comic-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchComics();
    fetchCategories();
  }, [fetchComics, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/comic-categories', {
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
      const res = await fetch('/api/comic-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchComics();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/comic-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchComics();
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  const createComic = async (comicData: Partial<ComicBook>): Promise<ComicBook | null> => {
    try {
      const res = await fetch('/api/comics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(comicData)
      });
      if (res.ok) {
        const newComic: ComicBook = await res.json();
        setComics(prev => [newComic, ...prev]);
        setActiveComic(newComic);
        if (newComic.issues?.[0]) {
          setActiveIssue(newComic.issues[0]);
        }
        return newComic;
      }
    } catch (e) {
      console.error('Error creating comic:', e);
    }
    return null;
  };

  const createComicFromFolder = async (params: {
    folderId: string;
    title?: string;
    description?: string;
    category?: string;
    publisher?: string;
    author?: string;
    artist?: string;
    coverImage?: string;
  }): Promise<ComicBook | null> => {
    try {
      const res = await fetch('/api/comics/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newComic: ComicBook = await res.json();
        setComics(prev => [newComic, ...prev]);
        setActiveComic(newComic);
        if (newComic.issues?.[0]) {
          setActiveIssue(newComic.issues[0]);
        }
        return newComic;
      }
    } catch (e) {
      console.error('Error creating comic from folder:', e);
    }
    return null;
  };

  const updateComic = async (updatedComic: ComicBook): Promise<void> => {
    try {
      const res = await fetch(`/api/comics/${updatedComic.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedComic)
      });
      if (res.ok) {
        const saved: ComicBook = await res.json();
        setComics(prev => prev.map(c => c.id === saved.id ? saved : c));
        if (activeComic?.id === saved.id) {
          setActiveComic(saved);
        }
      }
    } catch (e) {
      console.error('Error updating comic:', e);
    }
  };

  const deleteComic = async (comicId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/comics/${comicId}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        setComics(prev => prev.filter(c => c.id !== comicId));
        if (activeComic?.id === comicId) {
          const remaining = comics.filter(c => c.id !== comicId);
          setActiveComic(remaining[0] || null);
          setActiveIssue(remaining[0]?.issues?.[0] || null);
        }
      }
    } catch (e) {
      console.error('Error deleting comic:', e);
    }
  };

  const toggleIssueCompletion = async (issueId: string, comicId?: string): Promise<void> => {
    const targetComic = (comicId ? comics.find(c => c.id === comicId) : null)
      || comics.find(c => c.issues?.some(i => i.id === issueId))
      || (activeComic?.issues?.some(i => i.id === issueId) ? activeComic : null)
      || activeComic;

    if (!targetComic) return;

    const updatedIssues = (targetComic.issues || []).map(issue => {
      if (issue.id === issueId) {
        const isCompleted = !issue.isCompleted;
        return {
          ...issue,
          isCompleted,
          lastReadAt: new Date().toISOString()
        };
      }
      return issue;
    });

    const allCompleted = updatedIssues.length > 0 && updatedIssues.every(i => i.isCompleted);
    const updatedComic: ComicBook = {
      ...targetComic,
      issues: updatedIssues,
      status: allCompleted ? 'completed' : 'reading'
    };

    await updateComic(updatedComic);
  };

  const toggleComicCompletion = async (comicId: string): Promise<void> => {
    const targetComic = comics.find(c => c.id === comicId) || (activeComic?.id === comicId ? activeComic : null);
    if (!targetComic) return;

    const total = targetComic.issues?.length || 0;
    const completedCount = targetComic.issues?.filter(i => i.isCompleted).length || 0;
    const isCurrentlyCompleted = (total > 0 && completedCount === total) || targetComic.status === 'completed';
    const nextCompleted = !isCurrentlyCompleted;

    const updatedIssues = (targetComic.issues || []).map(issue => ({
      ...issue,
      isCompleted: nextCompleted,
      lastReadAt: new Date().toISOString()
    }));

    const updatedComic: ComicBook = {
      ...targetComic,
      issues: updatedIssues,
      status: nextCompleted ? 'completed' : 'reading'
    };

    await updateComic(updatedComic);
  };

  const updateIssueProgress = async (issueId: string, currentPage: number): Promise<void> => {
    if (!activeComic) return;
    const updatedIssues = (activeComic.issues || []).map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          currentPage,
          lastReadAt: new Date().toISOString()
        };
      }
      return issue;
    });

    const updatedComic: ComicBook = {
      ...activeComic,
      issues: updatedIssues
    };

    await updateComic(updatedComic);
  };

  return {
    comics,
    categories,
    activeComic,
    activeIssue,
    loading,
    setActiveComic,
    setActiveIssue,
    fetchComics,
    createComic,
    createComicFromFolder,
    updateComic,
    deleteComic,
    toggleIssueCompletion,
    toggleComicCompletion,
    updateIssueProgress,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
