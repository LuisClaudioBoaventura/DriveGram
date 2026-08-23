import { useState, useEffect, useCallback } from 'react';
import { AudioShow, AudioTrack } from '../types/index.js';

export function useAudioShows() {
  const [audioShows, setAudioShows] = useState<AudioShow[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Podcasts',
    'Álbuns de Música',
    'Entrevistas',
    'Tecnologia & Inovação',
    'Negócios & Carreira',
    'Notícias & Atualidades',
    'Comédia & Variedades',
    'Playlists & Sets'
  ]);
  const [activeShow, setActiveShow] = useState<AudioShow | null>(null);
  const [activeTrack, setActiveTrack] = useState<AudioTrack | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudioShows = useCallback(async () => {
    try {
      const res = await fetch('/api/audio-shows');
      if (res.ok) {
        const data = await res.json();
        setAudioShows(data);
        if (data.length > 0 && !activeShow) {
          setActiveShow(data[0]);
          if (data[0].tracks?.[0]) {
            setActiveTrack(data[0].tracks[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for audio shows');
    }
  }, [activeShow]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/audio-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchAudioShows();
    fetchCategories();
  }, [fetchAudioShows, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/audio-categories', {
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
      const res = await fetch('/api/audio-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchAudioShows();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/audio-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchAudioShows();
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  const createAudioShow = async (showData: Partial<AudioShow>): Promise<AudioShow | null> => {
    try {
      const res = await fetch('/api/audio-shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(showData)
      });
      if (res.ok) {
        const newShow: AudioShow = await res.json();
        setAudioShows(prev => [newShow, ...prev]);
        setActiveShow(newShow);
        if (newShow.tracks?.[0]) {
          setActiveTrack(newShow.tracks[0]);
        }
        return newShow;
      }
    } catch (e) {
      console.error('Error creating audio show:', e);
    }
    return null;
  };

  const createAudioShowFromFolder = async (params: {
    folderId: string;
    title?: string;
    artist?: string;
    host?: string;
    showType?: 'music_album' | 'podcast' | 'playlist';
    category?: string;
    genre?: string;
    description?: string;
    coverImage?: string;
  }): Promise<AudioShow | null> => {
    try {
      const res = await fetch('/api/audio-shows/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newShow: AudioShow = await res.json();
        setAudioShows(prev => [newShow, ...prev]);
        setActiveShow(newShow);
        if (newShow.tracks?.[0]) {
          setActiveTrack(newShow.tracks[0]);
        }
        return newShow;
      }
    } catch (e) {
      console.error('Error creating audio show from folder:', e);
    }
    return null;
  };

  const updateAudioShow = async (updatedShow: AudioShow): Promise<void> => {
    try {
      const res = await fetch(`/api/audio-shows/${updatedShow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShow)
      });
      if (res.ok) {
        const saved: AudioShow = await res.json();
        setAudioShows(prev => prev.map(s => s.id === saved.id ? saved : s));
        if (activeShow?.id === saved.id) {
          setActiveShow(saved);
        }
      }
    } catch (e) {
      console.error('Error updating audio show:', e);
    }
  };

  const deleteAudioShow = async (showId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/audio-shows/${showId}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        setAudioShows(prev => prev.filter(s => s.id !== showId));
        if (activeShow?.id === showId) {
          const remaining = audioShows.filter(s => s.id !== showId);
          setActiveShow(remaining[0] || null);
          setActiveTrack(remaining[0]?.tracks?.[0] || null);
        }
      }
    } catch (e) {
      console.error('Error deleting audio show:', e);
    }
  };

  const toggleTrackCompletion = async (trackId: string): Promise<void> => {
    if (!activeShow) return;
    const updatedTracks = (activeShow.tracks || []).map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          isCompleted: !track.isCompleted
        };
      }
      return track;
    });

    const updatedShow: AudioShow = {
      ...activeShow,
      tracks: updatedTracks
    };

    await updateAudioShow(updatedShow);
  };

  const updateTrackProgress = async (trackId: string, seconds: number, isCompleted = false): Promise<void> => {
    if (!activeShow) return;
    const updatedTracks = (activeShow.tracks || []).map(track => {
      if (track.id === trackId) {
        return {
          ...track,
          lastPositionSeconds: seconds,
          isCompleted: isCompleted || track.isCompleted
        };
      }
      return track;
    });

    const updatedShow: AudioShow = {
      ...activeShow,
      tracks: updatedTracks
    };

    await updateAudioShow(updatedShow);
  };

  const importPodcast = async (podcastData: {
    podcastId?: string;
    title: string;
    artist?: string;
    host?: string;
    category?: string;
    genre?: string;
    description?: string;
    coverImage?: string;
    feedUrl?: string;
    folderId?: string;
  }): Promise<AudioShow | null> => {
    try {
      const res = await fetch('/api/audio-shows/import-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(podcastData)
      });
      if (res.ok) {
        const newShow: AudioShow = await res.json();
        setAudioShows(prev => [newShow, ...prev]);
        setActiveShow(newShow);
        if (newShow.tracks?.[0]) {
          setActiveTrack(newShow.tracks[0]);
        }
        return newShow;
      }
    } catch (e) {
      console.error('Error importing podcast:', e);
    }
    return null;
  };

  return {
    audioShows,
    categories,
    activeShow,
    activeTrack,
    loading,
    setActiveShow,
    setActiveTrack,
    fetchAudioShows,
    createAudioShow,
    createAudioShowFromFolder,
    importPodcast,
    updateAudioShow,
    deleteAudioShow,
    toggleTrackCompletion,
    updateTrackProgress,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
