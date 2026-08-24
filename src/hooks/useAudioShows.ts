import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Global Audio Playback & Floating Player states
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFloatingOpen, setIsFloatingOpen] = useState<boolean>(false);

  const activeShowRef = useRef<AudioShow | null>(activeShow);
  const activeTrackRef = useRef<AudioTrack | null>(activeTrack);
  const activeTrackIndexRef = useRef<number>(activeTrackIndex);
  const currentTimeRef = useRef<number>(currentTime);

  useEffect(() => {
    activeShowRef.current = activeShow;
  }, [activeShow]);

  useEffect(() => {
    activeTrackRef.current = activeTrack;
  }, [activeTrack]);

  useEffect(() => {
    activeTrackIndexRef.current = activeTrackIndex;
  }, [activeTrackIndex]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

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
    episodes?: any[];
  }): Promise<AudioShow | null> => {
    // Strategy 1: Try backend import endpoint
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
      console.warn('Backend /api/audio-shows/import-podcast failed, trying direct /api/audio-shows save:', e);
    }

    // Strategy 2 (Resilient Fallback): Save directly using standard /api/audio-shows endpoint
    try {
      const fallbackTracks = (podcastData.episodes || []).map((ep: any, idx: number) => ({
        id: ep.id || `ep-${Date.now()}-${idx}`,
        title: ep.title || `Episódio ${idx + 1}`,
        artist: ep.artist || podcastData.host || podcastData.artist,
        duration: ep.duration || '45:00',
        durationSeconds: ep.durationSeconds || 0,
        audioUrl: ep.audioUrl,
        order: idx + 1,
        trackNumber: idx + 1,
        releaseDate: ep.releaseDate || ep.pubDate
      }));

      const fallbackShowData: Partial<AudioShow> = {
        title: podcastData.title.trim(),
        artist: podcastData.artist || podcastData.host,
        host: podcastData.host || podcastData.artist,
        showType: 'podcast',
        category: podcastData.category || 'Podcasts',
        genre: podcastData.genre || 'Podcast',
        description: podcastData.description || '',
        coverImage: podcastData.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60',
        folderId: podcastData.folderId || undefined,
        feedUrl: podcastData.feedUrl || undefined,
        podcastId: podcastData.podcastId ? String(podcastData.podcastId) : undefined,
        lastSyncedAt: new Date().toISOString(),
        tracks: fallbackTracks
      };

      const res = await fetch('/api/audio-shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackShowData)
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
    } catch (fallbackErr) {
      console.error('Error saving podcast fallback:', fallbackErr);
    }

    return null;
  };

  const refreshAllPodcasts = async () => {
    try {
      let res = await fetch('/api/podcasts/refresh-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/audio-shows/refresh-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.updatedShows) {
          setAudioShows(data.updatedShows);
          if (activeShow) {
            const updatedActive = data.updatedShows.find((s: AudioShow) => s.id === activeShow.id);
            if (updatedActive) setActiveShow(updatedActive);
          }
        } else {
          await fetchAudioShows();
        }
        return {
          success: true,
          totalNewEpisodes: data.totalNewEpisodes || 0,
          refreshedCount: data.refreshedCount || 0
        };
      }
    } catch (e) {
      console.warn('Error refreshing all podcasts:', e);
    }
    return { success: false, totalNewEpisodes: 0, refreshedCount: 0 };
  };

  const refreshSinglePodcast = async (showId: string) => {
    try {
      let res = await fetch(`/api/podcasts/${showId}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`/api/audio-shows/${showId}/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.show) {
          setAudioShows(prev => prev.map(s => s.id === showId ? data.show : s));
          if (activeShow && activeShow.id === showId) {
            setActiveShow(data.show);
          }
        }
        return {
          success: true,
          newEpisodesCount: data.newEpisodesCount || 0,
          show: data.show
        };
      }
    } catch (e) {
      console.warn('Error refreshing single podcast:', e);
    }
    return { success: false, newEpisodesCount: 0 };
  };

  const savePlaybackPosition = useCallback(async () => {
    const currentShow = activeShowRef.current;
    const currentTrk = activeTrackRef.current;
    const pos = currentTimeRef.current;
    if (!currentShow || !currentTrk || pos <= 0) return;

    const updatedTracks = (currentShow.tracks || []).map(t => {
      if (t.id === currentTrk.id) {
        return {
          ...t,
          lastPositionSeconds: Math.floor(pos)
        };
      }
      return t;
    });

    const updatedShow: AudioShow = {
      ...currentShow,
      tracks: updatedTracks
    };

    try {
      await fetch(`/api/audio-shows/${updatedShow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedShow)
      });
    } catch (e) {}
  }, []);

  const playShowAndTrack = useCallback((show: AudioShow, trackIndex = 0, autoPlay = false) => {
    setActiveShow(show);
    setActiveTrackIndex(trackIndex);
    const track = show.tracks?.[trackIndex] || null;
    setActiveTrack(track);

    if (autoPlay) {
      setIsFloatingOpen(true);
    }

    if (track?.lastPositionSeconds && track.lastPositionSeconds > 0) {
      setCurrentTime(track.lastPositionSeconds);
      if (audioRef.current) {
        audioRef.current.currentTime = track.lastPositionSeconds;
      }
    } else {
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }

    if (autoPlay) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 100);
    } else {
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [playbackSpeed]);

  const selectTrack = useCallback((trackIndex: number, autoPlay = true) => {
    if (!activeShow || !activeShow.tracks || trackIndex < 0 || trackIndex >= activeShow.tracks.length) return;
    savePlaybackPosition();
    setActiveTrackIndex(trackIndex);
    const track = activeShow.tracks[trackIndex];
    setActiveTrack(track);

    if (track?.lastPositionSeconds && track.lastPositionSeconds > 0) {
      setCurrentTime(track.lastPositionSeconds);
      if (audioRef.current) {
        audioRef.current.currentTime = track.lastPositionSeconds;
      }
    } else {
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }

    if (autoPlay) {
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
      }, 100);
    }
  }, [activeShow, playbackSpeed, savePlaybackPosition]);

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

  const getNextTrack = useCallback((): AudioTrack | null => {
    if (!activeShow || !activeShow.tracks) return null;
    if (activeTrackIndex < activeShow.tracks.length - 1) {
      return activeShow.tracks[activeTrackIndex + 1];
    }
    return null;
  }, [activeShow, activeTrackIndex]);

  const getPreviousTrack = useCallback((): AudioTrack | null => {
    if (!activeShow || !activeShow.tracks) return null;
    if (activeTrackIndex > 0) {
      return activeShow.tracks[activeTrackIndex - 1];
    }
    return null;
  }, [activeShow, activeTrackIndex]);

  const playNextTrack = useCallback(() => {
    const nextIdx = activeTrackIndex + 1;
    if (activeShow?.tracks && nextIdx < activeShow.tracks.length) {
      selectTrack(nextIdx, true);
    }
  }, [activeShow, activeTrackIndex, selectTrack]);

  const playPreviousTrack = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIdx = activeTrackIndex - 1;
    if (prevIdx >= 0) {
      selectTrack(prevIdx, true);
    }
  }, [activeTrackIndex, selectTrack]);

  const handleAudioEnded = useCallback(() => {
    if (activeShow && activeTrack) {
      toggleTrackCompletion(activeTrack.id);
      playNextTrack();
    }
  }, [activeShow, activeTrack, toggleTrackCompletion, playNextTrack]);

  const backupTrackToTelegram = useCallback(async (track: AudioTrack) => {
    if (!activeShow || !track || track.fileId) return;
    try {
      const payload = JSON.stringify({
        showId: activeShow.id,
        trackId: track.id,
        audioUrl: track.audioUrl,
        title: track.title,
        folderId: activeShow.folderId
      });

      let res = await fetch('/api/podcasts/backup-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/audio-shows/backup-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.updatedShow) {
          await updateAudioShow(data.updatedShow);
        }
      }
    } catch (e) {
      console.error('Error backing up track to telegram:', e);
    }
  }, [activeShow, updateAudioShow]);

  return {
    audioShows,
    categories,
    activeShow,
    activeAudioShow: activeShow,
    activeTrack,
    activeTrackIndex,
    loading,
    audioRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackSpeed,
    isFloatingOpen,
    setActiveShow,
    setActiveTrack,
    setActiveTrackIndex,
    setCurrentTime,
    setDuration,
    setPlaybackSpeed: handleSpeedChange,
    setVolume: handleVolumeChange,
    togglePlay,
    seekTo,
    skip,
    toggleMute,
    playShowAndTrack,
    selectTrack,
    playNextTrack,
    playPreviousTrack,
    getNextTrack,
    getPreviousTrack,
    closeFloatingPlayer,
    handleAudioEnded,
    backupTrackToTelegram,
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
    deleteCategory,
    refreshAllPodcasts,
    refreshSinglePodcast
  };
}
