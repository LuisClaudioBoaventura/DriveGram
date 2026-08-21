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
        if (data.length > 0 && !activeVideo) {
          setActiveVideo(data[0]);
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for videos');
    }
  }, [activeVideo]);

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
    description?: string;
    category?: string;
    genre?: string;
    year?: string | number;
    director?: string;
    coverImage?: string;
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

  const updateVideo = async (updatedVideo: MovieVideo): Promise<void> => {
    try {
      const res = await fetch(`/api/videos/${updatedVideo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVideo)
      });
      if (res.ok) {
        const saved: MovieVideo = await res.json();
        setVideos(prev => prev.map(v => v.id === saved.id ? saved : v));
        if (activeVideo?.id === saved.id) {
          setActiveVideo(saved);
        }
      }
    } catch (e) {
      console.error('Error updating video:', e);
    }
  };

  const deleteVideo = async (videoId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        setVideos(prev => prev.filter(v => v.id !== videoId));
        if (activeVideo?.id === videoId) {
          const remaining = videos.filter(v => v.id !== videoId);
          setActiveVideo(remaining[0] || null);
        }
      }
    } catch (e) {
      console.error('Error deleting video:', e);
    }
  };

  const updateVideoProgress = async (videoId: string, seconds: number, isCompleted = false): Promise<void> => {
    const video = videos.find(v => v.id === videoId);
    if (!video) return;
    const updated: MovieVideo = {
      ...video,
      lastPositionSeconds: seconds,
      isCompleted: isCompleted || video.isCompleted,
      updatedAt: new Date().toISOString()
    };
    await updateVideo(updated);
  };

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
