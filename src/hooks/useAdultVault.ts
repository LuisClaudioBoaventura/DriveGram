import { useState, useEffect, useCallback } from 'react';
import { AdultVideo, AdultPerformer } from '../types/index.js';

interface VaultStatus {
  isConfigured: boolean;
  recoveryQuestion?: string;
  hint?: string;
}

export function useAdultVault() {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('drivegram_adult_vault_unlocked') === 'true';
  });
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>({ isConfigured: false });
  const [videos, setVideos] = useState<AdultVideo[]>([]);
  const [performers, setPerformers] = useState<AdultPerformer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<AdultVideo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchVaultStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/adult-vault/status');
      if (res.ok) {
        const data = await res.json();
        setVaultStatus(data);
      }
    } catch (e) {
      console.error('Error fetching vault status:', e);
    }
  }, []);

  const fetchPerformers = useCallback(async () => {
    try {
      const res = await fetch('/api/adult-performers');
      if (res.ok) {
        const data = await res.json();
        setPerformers(data);
      }
    } catch (e) {
      console.error('Error fetching adult performers:', e);
    }
  }, []);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/adult-videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (e) {
      console.error('Error fetching adult videos:', e);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/adult-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error('Error fetching adult categories:', e);
    }
  }, []);

  useEffect(() => {
    fetchVaultStatus();
    fetchCategories();
  }, [fetchVaultStatus, fetchCategories]);

  useEffect(() => {
    if (isUnlocked) {
      fetchVideos();
      fetchPerformers();
    }
  }, [isUnlocked, fetchVideos, fetchPerformers]);

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/adult-vault/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setIsUnlocked(true);
        sessionStorage.setItem('drivegram_adult_vault_unlocked', 'true');
        await fetchVideos();
        await fetchPerformers();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error verifying vault password:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setupVault = async (
    password: string,
    recoveryQuestion: string,
    recoveryAnswer: string,
    hint?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/adult-vault/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, recoveryQuestion, recoveryAnswer, hint })
      });
      if (res.ok) {
        setIsUnlocked(true);
        sessionStorage.setItem('drivegram_adult_vault_unlocked', 'true');
        await fetchVaultStatus();
        await fetchVideos();
        await fetchPerformers();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error setting up vault:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const recoverPassword = async (recoveryAnswer: string, newPassword: string): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/adult-vault/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recoveryAnswer, newPassword })
      });
      if (res.ok) {
        setIsUnlocked(true);
        sessionStorage.setItem('drivegram_adult_vault_unlocked', 'true');
        await fetchVaultStatus();
        await fetchVideos();
        await fetchPerformers();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error recovering vault password:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword?: string,
    recoveryQuestion?: string,
    recoveryAnswer?: string,
    hint?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch('/api/adult-vault/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, recoveryQuestion, recoveryAnswer, hint })
      });
      if (res.ok) {
        await fetchVaultStatus();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error changing vault password:', e);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('drivegram_adult_vault_unlocked');
    setActiveVideo(null);
  };

  const createAdultVideoFromFolder = async (params: {
    folderId: string;
    title?: string;
    description?: string;
    category?: string;
    studio?: string;
    performers?: string;
    aka?: string;
    year?: string | number;
    coverImage?: string;
  }): Promise<AdultVideo | null> => {
    try {
      const res = await fetch('/api/adult-videos/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const data = await res.json();
        const createdList: AdultVideo[] = Array.isArray(data) ? data : [data];
        setVideos((prev: AdultVideo[]) => {
          const newIds = new Set(createdList.map(v => v.id));
          const filteredPrev = prev.filter(v => !newIds.has(v.id));
          return [...createdList, ...filteredPrev];
        });
        return createdList[0] || null;
      }
    } catch (e) {
      console.error('Error creating adult video from folder:', e);
    }
    return null;
  };

  const updateAdultVideo = async (video: AdultVideo): Promise<void> => {
    try {
      const res = await fetch(`/api/adult-videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(video)
      });
      if (res.ok) {
        const updated: AdultVideo = await res.json();
        setVideos((prev: AdultVideo[]) => prev.map((v: AdultVideo) => v.id === updated.id ? updated : v));
        if (activeVideo?.id === updated.id) {
          setActiveVideo(updated);
        }
      }
    } catch (e) {
      console.error('Error updating adult video:', e);
    }
  };

  const deleteAdultVideo = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/adult-videos/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setVideos((prev: AdultVideo[]) => prev.filter((v: AdultVideo) => v.id !== id));
        if (activeVideo?.id === id) {
          setActiveVideo(null);
        }
      }
    } catch (e) {
      console.error('Error deleting adult video:', e);
    }
  };

  const updateAdultVideoProgress = async (videoId: string, seconds: number, isCompleted?: boolean): Promise<void> => {
    try {
      await fetch(`/api/adult-videos/${videoId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds, isCompleted })
      });
      setVideos((prev: AdultVideo[]) => prev.map((v: AdultVideo) => {
        if (v.id === videoId) {
          return {
            ...v,
            lastPositionSeconds: seconds,
            isCompleted: isCompleted !== undefined ? isCompleted : v.isCompleted
          };
        }
        return v;
      }));
    } catch (e) {
      console.error('Error updating adult video progress:', e);
    }
  };

  const addCategory = async (category: string): Promise<void> => {
    try {
      const res = await fetch('/api/adult-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category })
      });
      if (res.ok) {
        const cats = await res.json();
        setCategories(cats);
      }
    } catch (e) {
      console.error('Error adding adult category:', e);
    }
  };

  const toggleFavorite = async (videoId: string): Promise<boolean> => {
    // Optimistic update
    let newFavState = false;
    setVideos((prev: AdultVideo[]) => prev.map((v: AdultVideo) => {
      if (v.id === videoId) {
        newFavState = !v.isFavorite;
        return { ...v, isFavorite: newFavState };
      }
      return v;
    }));

    if (activeVideo?.id === videoId) {
      setActiveVideo((prev: AdultVideo | null) => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }

    try {
      const res = await fetch(`/api/adult-videos/${videoId}/favorite`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.isFavorite;
      }
    } catch (e) {
      console.error('Error toggling adult video favorite:', e);
    }
    return newFavState;
  };

  const createPerformer = async (data: Partial<AdultPerformer> & { name: string }): Promise<AdultPerformer | null> => {
    try {
      const res = await fetch('/api/adult-performers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const newPerf: AdultPerformer = await res.json();
        setPerformers((prev: AdultPerformer[]) => [newPerf, ...prev]);
        return newPerf;
      }
    } catch (e) {
      console.error('Error creating performer:', e);
    }
    return null;
  };

  const updatePerformer = async (performer: AdultPerformer): Promise<void> => {
    try {
      const res = await fetch(`/api/adult-performers/${performer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(performer)
      });
      if (res.ok) {
        const updated: AdultPerformer = await res.json();
        setPerformers((prev: AdultPerformer[]) => prev.map((p: AdultPerformer) => p.id === updated.id ? updated : p));
      }
    } catch (e) {
      console.error('Error updating performer:', e);
    }
  };

  const deletePerformer = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/adult-performers/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPerformers((prev: AdultPerformer[]) => prev.filter((p: AdultPerformer) => p.id !== id));
      }
    } catch (e) {
      console.error('Error deleting performer:', e);
    }
  };

  const togglePerformerFavorite = async (id: string): Promise<boolean> => {
    let nextState = false;
    setPerformers((prev: AdultPerformer[]) => prev.map((p: AdultPerformer) => {
      if (p.id === id) {
        nextState = !p.isFavorite;
        return { ...p, isFavorite: nextState };
      }
      return p;
    }));

    try {
      const res = await fetch(`/api/adult-performers/${id}/favorite`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        return !!data.isFavorite;
      }
    } catch (e) {
      console.error('Error toggling performer favorite:', e);
    }
    return nextState;
  };

  const addPerformerToVideo = async (videoId: string, performerName: string): Promise<AdultVideo | null> => {
    const trimmed = performerName.trim();
    if (!trimmed) return null;
    let targetVideo = videos.find((v: AdultVideo) => v.id === videoId);
    if (!targetVideo && activeVideo?.id === videoId) {
      targetVideo = activeVideo;
    }
    if (!targetVideo) return null;

    const currentPerformers = targetVideo.performers 
      ? targetVideo.performers.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    if (!currentPerformers.some((p: string) => p.toLowerCase() === trimmed.toLowerCase())) {
      currentPerformers.push(trimmed);
      const updatedVideo: AdultVideo = {
        ...targetVideo,
        performers: currentPerformers.join(', ')
      };

      // If performer doesn't exist yet, auto-create a profile card
      const exists = performers.some(
        p => p.name.toLowerCase() === trimmed.toLowerCase() || (p.aka && p.aka.toLowerCase() === trimmed.toLowerCase())
      );
      if (!exists) {
        await createPerformer({
          name: trimmed,
          gender: 'female'
        });
      }

      await updateAdultVideo(updatedVideo);
      return updatedVideo;
    }
    return targetVideo;
  };

  const removePerformerFromVideo = async (videoId: string, performerName: string): Promise<AdultVideo | null> => {
    const trimmed = performerName.trim();
    if (!trimmed) return null;
    let targetVideo = videos.find((v: AdultVideo) => v.id === videoId);
    if (!targetVideo && activeVideo?.id === videoId) {
      targetVideo = activeVideo;
    }
    if (!targetVideo || !targetVideo.performers) return null;

    const currentPerformers = targetVideo.performers
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.toLowerCase() !== trimmed.toLowerCase());

    const updatedVideo: AdultVideo = {
      ...targetVideo,
      performers: currentPerformers.join(', ')
    };
    await updateAdultVideo(updatedVideo);
    return updatedVideo;
  };

  return {
    isUnlocked,
    vaultStatus,
    videos,
    performers,
    categories,
    activeVideo,
    loading,
    setActiveVideo,
    verifyPassword,
    setupVault,
    recoverPassword,
    changePassword,
    lockVault,
    fetchVideos,
    fetchPerformers,
    fetchCategories,
    fetchVaultStatus,
    createAdultVideoFromFolder,
    updateAdultVideo,
    deleteAdultVideo,
    updateAdultVideoProgress,
    toggleFavorite,
    createPerformer,
    updatePerformer,
    deletePerformer,
    togglePerformerFavorite,
    addPerformerToVideo,
    removePerformerFromVideo,
    addCategory
  };
}
