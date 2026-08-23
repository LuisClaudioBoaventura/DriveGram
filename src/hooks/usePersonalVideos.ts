import { useState, useEffect, useCallback } from 'react';
import { PersonalVideo } from '../types/index.js';

export function usePersonalVideos() {
  const [personalVideos, setPersonalVideos] = useState<PersonalVideo[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Viagens',
    'Família & Eventos',
    'Aniversários & Festas',
    'Memórias & Momentos',
    'Gravações & Projetos',
    'Vlogs & Dia a Dia',
    'Outros'
  ]);
  const [activeVideo, setActiveVideo] = useState<PersonalVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/personal-videos');
      if (res.ok) {
        const data = await res.json();
        setPersonalVideos(data);
        setActiveVideo(prev => prev ? (data.find((v: PersonalVideo) => v.id === prev.id) || prev) : (data[0] || null));
      }
    } catch (e) {
      console.warn('Backend unavailable for personal videos');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/personal-video-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchVideos();
    fetchCategories();
  }, [fetchVideos, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/personal-video-categories', {
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
      const res = await fetch('/api/personal-video-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchVideos();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/personal-video-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchVideos();
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  const createPersonalVideo = async (videoData: Partial<PersonalVideo>): Promise<PersonalVideo | null> => {
    try {
      const res = await fetch('/api/personal-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });
      if (res.ok) {
        const newVideo: PersonalVideo = await res.json();
        setPersonalVideos(prev => [newVideo, ...prev]);
        setActiveVideo(newVideo);
        return newVideo;
      }
    } catch (e) {
      console.error('Error creating personal video:', e);
    }
    return null;
  };

  const createPersonalVideoFromFolder = async (params: {
    folderId: string;
    title?: string;
    description?: string;
    category?: string;
    date?: string;
    location?: string;
    people?: string;
    coverImage?: string;
    tags?: string[];
  }): Promise<PersonalVideo | null> => {
    try {
      const res = await fetch('/api/personal-videos/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newVideo: PersonalVideo = await res.json();
        setPersonalVideos(prev => [newVideo, ...prev]);
        setActiveVideo(newVideo);
        return newVideo;
      }
    } catch (e) {
      console.error('Error creating personal video from folder:', e);
    }
    return null;
  };

  const updatePersonalVideo = useCallback(async (updatedVideo: PersonalVideo): Promise<void> => {
    setPersonalVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
    setActiveVideo(prev => prev?.id === updatedVideo.id ? updatedVideo : prev);
    try {
      const res = await fetch(`/api/personal-videos/${updatedVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVideo)
      });
      if (res.ok) {
        const saved: PersonalVideo = await res.json();
        setPersonalVideos(prev => prev.map(v => v.id === saved.id ? saved : v));
        setActiveVideo(prev => prev?.id === saved.id ? saved : prev);
      }
    } catch (e) {
      console.error('Error updating personal video:', e);
    }
  }, []);

  const deletePersonalVideo = useCallback(async (id: string): Promise<void> => {
    setPersonalVideos(prev => prev.filter(v => v.id !== id));
    setActiveVideo(prev => prev?.id === id ? null : prev);
    try {
      await fetch(`/api/personal-videos/${id}`, { method: 'DELETE' });
    } catch (e) {}
  }, []);

  const toggleFavorite = useCallback(async (id: string): Promise<void> => {
    setPersonalVideos(prev => {
      const video = prev.find(v => v.id === id);
      if (!video) return prev;
      const updated = { ...video, isFavorite: !video.isFavorite };
      fetch(`/api/personal-videos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(e => console.error('Error toggling favorite:', e));
      return prev.map(v => v.id === id ? updated : v);
    });
  }, []);

  const updateProgress = useCallback(async (id: string, seconds: number, isCompleted?: boolean): Promise<void> => {
    const currentSecs = Math.floor(seconds);
    let updatedObj: PersonalVideo | null = null;

    setPersonalVideos(prev => {
      const video = prev.find(v => v.id === id);
      if (!video) return prev;
      updatedObj = {
        ...video,
        lastPositionSeconds: currentSecs,
        isCompleted: isCompleted !== undefined ? isCompleted : video.isCompleted
      };
      return prev.map(v => v.id === id ? updatedObj! : v);
    });

    setActiveVideo(prev => {
      if (prev?.id === id) {
        return {
          ...prev,
          lastPositionSeconds: currentSecs,
          isCompleted: isCompleted !== undefined ? isCompleted : prev.isCompleted
        };
      }
      return prev;
    });

    if (updatedObj) {
      try {
        await fetch(`/api/personal-videos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      } catch (e) {}
    }
  }, []);

  return {
    personalVideos,
    categories,
    activeVideo,
    setActiveVideo,
    loading,
    refresh: fetchVideos,
    addCategory,
    updateCategory,
    deleteCategory,
    createPersonalVideo,
    createPersonalVideoFromFolder,
    updatePersonalVideo,
    deletePersonalVideo,
    toggleFavorite,
    updateProgress
  };
}
