import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderItem, PersonalVideo } from '../types/index.js';
import { captureVideoMidFrame } from '../utils/videoFrameCapture.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';
import { isPersonalPhoto, isPlaceholderPersonalCover } from '../utils/personalMediaUtils.js';

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
  const [capturingCoverIds, setCapturingCoverIds] = useState<string[]>([]);

  const attemptedCoverIdsRef = useRef<Set<string>>(new Set());
  const isQueueRunningRef = useRef(false);

  const persistVideoUpdate = useCallback(async (updatedVideo: PersonalVideo): Promise<PersonalVideo | null> => {
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
        return saved;
      }
    } catch (e) {
      console.error('Error updating personal video:', e);
    }
    return null;
  }, []);

  const extractCoverForVideo = useCallback(async (video: PersonalVideo): Promise<string | null> => {
    if (!video.fileId || isPersonalPhoto(video)) return null;
    setCapturingCoverIds(prev => (prev.includes(video.id) ? prev : [...prev, video.id]));
    try {
      const streamUrl = resolveApiUrl(`/api/stream/${video.fileId}`);
      const frameDataUrl = await captureVideoMidFrame(streamUrl, 0.35);
      if (frameDataUrl && frameDataUrl.startsWith('data:image/')) {
        await persistVideoUpdate({ ...video, coverImage: frameDataUrl });
        return frameDataUrl;
      }
    } catch (_) {
      // Ignore if video stream is unavailable or codec is unsupported in browser canvas
    } finally {
      setCapturingCoverIds(prev => prev.filter(id => id !== video.id));
    }
    return null;
  }, [persistVideoUpdate]);

  const queueMissingVideoCovers = useCallback(async (items: PersonalVideo[]) => {
    if (isQueueRunningRef.current) return;

    const candidates = items.filter(v =>
      v.fileId &&
      !isPersonalPhoto(v) &&
      isPlaceholderPersonalCover(v.coverImage) &&
      !attemptedCoverIdsRef.current.has(v.id)
    );

    if (candidates.length === 0) return;

    isQueueRunningRef.current = true;
    try {
      for (const cand of candidates) {
        if (attemptedCoverIdsRef.current.has(cand.id)) continue;
        attemptedCoverIdsRef.current.add(cand.id);
        await extractCoverForVideo(cand);
        // Pequena pausa para não sobrecarregar o streaming/CPU
        await new Promise(r => setTimeout(r, 200));
      }
    } finally {
      isQueueRunningRef.current = false;
    }
  }, [extractCoverForVideo]);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/personal-videos');
      if (res.ok) {
        const data: PersonalVideo[] = await res.json();
        setPersonalVideos(data);
        setActiveVideo(prev => prev ? (data.find(v => v.id === prev.id) || prev) : (data[0] || null));
        setTimeout(() => {
          queueMissingVideoCovers(data);
        }, 500);
      }
    } catch (e) {
      console.warn('Backend unavailable for personal videos');
    }
  }, [queueMissingVideoCovers]);

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

  const ensurePersonalFolder = async (subFolderName?: string, parentFolderId?: string): Promise<FolderItem | null> => {
    try {
      const res = await fetch('/api/personal-videos/ensure-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subFolderName, parentFolderId })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error('Error ensuring personal videos folder:', e);
    }
    return null;
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
        if (newVideo.fileId && !isPersonalPhoto(newVideo) && isPlaceholderPersonalCover(newVideo.coverImage)) {
          queueMissingVideoCovers([newVideo]);
        }
        return newVideo;
      }
    } catch (e) {
      console.error('Error creating personal video:', e);
    }
    return null;
  };

  const createPersonalMediaFromFile = async (params: {
    fileId: string;
    title?: string;
    category?: string;
    date?: string;
    location?: string;
    people?: string;
    description?: string;
    coverImage?: string;
    tags?: string[];
  }): Promise<PersonalVideo | null> => {
    try {
      const res = await fetch('/api/personal-videos/from-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const item: PersonalVideo = await res.json();
        setPersonalVideos(prev => {
          const exists = prev.some(v => v.id === item.id);
          return exists ? prev.map(v => (v.id === item.id ? item : v)) : [item, ...prev];
        });
        if (item.fileId && !isPersonalPhoto(item) && isPlaceholderPersonalCover(item.coverImage)) {
          queueMissingVideoCovers([item]);
        }
        return item;
      }
    } catch (e) {
      console.error('Error creating personal media from file:', e);
    }
    return null;
  };

  const createPersonalVideoFromFolder = async (params: {
    folderId: string;
    fileId?: string;
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
        const data = await res.json();
        const createdList: PersonalVideo[] = Array.isArray(data) ? data : [data];
        setPersonalVideos(prev => {
          const newIds = new Set(createdList.map(v => v.id));
          return [...createdList, ...prev.filter(v => !newIds.has(v.id))];
        });
        if (createdList[0]) setActiveVideo(createdList[0]);
        queueMissingVideoCovers(createdList);
        return createdList[0] || null;
      }
    } catch (e) {
      console.error('Error creating personal video from folder:', e);
    }
    return null;
  };

  const updatePersonalVideo = useCallback(async (updatedVideo: PersonalVideo): Promise<void> => {
    await persistVideoUpdate(updatedVideo);
  }, [persistVideoUpdate]);

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

  const syncFromDriveRoot = async (): Promise<{ importedCount: number; updatedCount: number; totalPersonalVideos: number }> => {
    try {
      setLoading(true);
      const res = await fetch('/api/personal-videos/sync-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const list: PersonalVideo[] = Array.isArray(data.videos) ? data.videos : [];
        if (Array.isArray(data.videos)) {
          setPersonalVideos(list);
          setTimeout(() => {
            queueMissingVideoCovers(list);
          }, 400);
        } else {
          await fetchVideos();
        }
        return {
          importedCount: data.importedCount || 0,
          updatedCount: data.updatedCount || 0,
          totalPersonalVideos: data.totalPersonalVideos ?? data.totalVideos ?? 0
        };
      }
    } catch (e) {
      console.error('Error syncing personal videos from root folder:', e);
    } finally {
      setLoading(false);
    }
    return { importedCount: 0, updatedCount: 0, totalPersonalVideos: personalVideos.length };
  };

  return {
    personalVideos,
    categories,
    activeVideo,
    setActiveVideo,
    loading,
    capturingCoverIds,
    refresh: fetchVideos,
    addCategory,
    updateCategory,
    deleteCategory,
    ensurePersonalFolder,
    createPersonalVideo,
    createPersonalMediaFromFile,
    createPersonalVideoFromFolder,
    syncFromDriveRoot,
    updatePersonalVideo,
    deletePersonalVideo,
    toggleFavorite,
    updateProgress,
    extractCoverForVideo
  };
}
