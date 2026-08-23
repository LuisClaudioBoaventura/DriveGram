import { useState, useEffect, useCallback } from 'react';
import { MovieVideo } from '../types/index.js';

export function useVideos() {
  const [videos, setVideos] = useState<MovieVideo[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Filmes',
    'Documentários',
    'Ação & Aventura',
    'Ficção Científica',
    'Comédia',
    'Drama & Suspense',
    'Palestras & Workshops',
    'Vídeos Curtos & Clipes',
    'Outros'
  ]);
  const [activeVideo, setActiveVideo] = useState<MovieVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
        setActiveVideo(prev => prev ? (data.find((v: MovieVideo) => v.id === prev.id) || prev) : (data[0] || null));
      }
    } catch (e) {
      console.warn('Backend unavailable for videos');
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/video-categories');
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
      const res = await fetch('/api/video-categories', {
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
      const res = await fetch('/api/video-categories', {
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
      const res = await fetch(`/api/video-categories/${encodeURIComponent(category)}`, {
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

  const createVideo = async (videoData: Partial<MovieVideo>): Promise<MovieVideo | null> => {
    try {
      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData)
      });
      if (res.ok) {
        const newVideo: MovieVideo = await res.json();
        setVideos(prev => [newVideo, ...prev]);
        setActiveVideo(newVideo);
        return newVideo;
      }
    } catch (e) {
      console.error('Error creating video:', e);
    }
    return null;
  };

  const createVideoFromFolder = async (params: {
    folderId: string;
    title?: string;
    titlePt?: string;
    description?: string;
    category?: string;
    genre?: string;
    year?: string | number;
    director?: string;
    coverImage?: string;
    imdbId?: string;
    imdbRating?: string;
    actors?: string;
    rated?: string;
    runtime?: string;
    awards?: string;
    writer?: string;
    metascore?: string;
    country?: string;
  }): Promise<MovieVideo | null> => {
    try {
      const res = await fetch('/api/videos/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newVideo: MovieVideo = await res.json();
        setVideos(prev => [newVideo, ...prev]);
        setActiveVideo(newVideo);
        return newVideo;
      }
    } catch (e) {
      console.error('Error creating video from folder:', e);
    }
    return null;
  };

  const updateVideo = useCallback(async (updatedVideo: MovieVideo): Promise<void> => {
    setVideos(prev => prev.map(v => v.id === updatedVideo.id ? updatedVideo : v));
    setActiveVideo(prev => prev?.id === updatedVideo.id ? updatedVideo : prev);
    try {
      const res = await fetch(`/api/videos/${updatedVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVideo)
      });
      if (res.ok) {
        const saved: MovieVideo = await res.json();
        setVideos(prev => prev.map(v => v.id === saved.id ? saved : v));
        setActiveVideo(prev => prev?.id === saved.id ? saved : prev);
      }
    } catch (e) {
      console.error('Error updating video:', e);
    }
  }, []);

  const deleteVideo = useCallback(async (videoId: string): Promise<void> => {
    setVideos(prev => prev.filter(v => v.id !== videoId));
    setActiveVideo(prev => prev?.id === videoId ? null : prev);
    try {
      await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.error('Error deleting video:', e);
    }
  }, []);

  const updateVideoProgress = useCallback(async (videoId: string, seconds: number, isCompleted = false): Promise<void> => {
    const currentSecs = Math.floor(seconds);
    let updatedObj: MovieVideo | null = null;

    setVideos(prev => {
      const video = prev.find(v => v.id === videoId);
      if (!video) return prev;
      updatedObj = {
        ...video,
        lastPositionSeconds: currentSecs,
        isCompleted: isCompleted || video.isCompleted,
        updatedAt: new Date().toISOString()
      };
      return prev.map(v => v.id === videoId ? updatedObj! : v);
    });

    setActiveVideo(prev => {
      if (prev?.id === videoId) {
        return {
          ...prev,
          lastPositionSeconds: currentSecs,
          isCompleted: isCompleted || prev.isCompleted,
          updatedAt: new Date().toISOString()
        };
      }
      return prev;
    });

    if (updatedObj) {
      try {
        await fetch(`/api/videos/${videoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedObj)
        });
      } catch (e) {}
    }
  }, []);

  return {
    videos,
    categories,
    activeVideo,
    loading,
    setActiveVideo,
    fetchVideos,
    createVideo,
    createVideoFromFolder,
    updateVideo,
    deleteVideo,
    updateVideoProgress,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
