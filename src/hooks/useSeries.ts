import { useState, useEffect, useCallback } from 'react';
import { SeriesShow, SeriesEpisode } from '../types/index.js';

export function useSeries() {
  const [seriesList, setSeriesList] = useState<SeriesShow[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'Séries de TV',
    'Animes',
    'Minisséries',
    'Doramas & K-Dramas',
    'Desenhos & Animações',
    'Reality Shows',
    'Web Séries',
    'Clássicos'
  ]);
  const [activeSeries, setActiveSeries] = useState<SeriesShow | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<SeriesEpisode | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/series');
      if (res.ok) {
        const data = await res.json();
        setSeriesList(data);
        if (data.length > 0 && !activeSeries) {
          setActiveSeries(data[0]);
          const firstEp = data[0].seasons?.[0]?.episodes?.[0];
          if (firstEp) setActiveEpisode(firstEp);
        }
      }
    } catch (e) {
      console.warn('Backend unavailable for series');
    }
  }, [activeSeries]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/series-categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchSeries();
    fetchCategories();
  }, [fetchSeries, fetchCategories]);

  const addCategory = async (category: string) => {
    const trimmed = category.trim();
    if (!trimmed) return;
    try {
      const res = await fetch('/api/series-categories', {
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
      const res = await fetch('/api/series-categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldCategory, newCategory: trimmed })
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchSeries();
      }
    } catch (e) {
      setCategories(prev => prev.map(c => c === oldCategory ? trimmed : c));
    }
  };

  const deleteCategory = async (category: string) => {
    try {
      const res = await fetch(`/api/series-categories/${encodeURIComponent(category)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const updated = await res.json();
        setCategories(updated);
        fetchSeries();
      }
    } catch (e) {
      setCategories(prev => prev.filter(c => c !== category));
    }
  };

  const createSeries = async (seriesData: Partial<SeriesShow>): Promise<SeriesShow | null> => {
    try {
      const res = await fetch('/api/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seriesData)
      });
      if (res.ok) {
        const newSeries: SeriesShow = await res.json();
        setSeriesList(prev => [newSeries, ...prev]);
        setActiveSeries(newSeries);
        const firstEp = newSeries.seasons?.[0]?.episodes?.[0];
        if (firstEp) setActiveEpisode(firstEp);
        return newSeries;
      }
    } catch (e) {
      console.error('Error creating series:', e);
    }
    return null;
  };

  const createSeriesFromFolder = async (params: {
    folderId: string;
    title?: string;
    description?: string;
    category?: string;
    genre?: string;
    network?: string;
    year?: string | number;
    coverImage?: string;
    bannerImage?: string;
  }): Promise<SeriesShow | null> => {
    try {
      const res = await fetch('/api/series/from-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (res.ok) {
        const newSeries: SeriesShow = await res.json();
        setSeriesList(prev => [newSeries, ...prev]);
        setActiveSeries(newSeries);
        const firstEp = newSeries.seasons?.[0]?.episodes?.[0];
        if (firstEp) setActiveEpisode(firstEp);
        return newSeries;
      }
    } catch (e) {
      console.error('Error creating series from folder:', e);
    }
    return null;
  };

  const updateSeries = async (updatedSeries: SeriesShow): Promise<void> => {
    try {
      const res = await fetch(`/api/series/${updatedSeries.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSeries)
      });
      if (res.ok) {
        const saved: SeriesShow = await res.json();
        setSeriesList(prev => prev.map(s => s.id === saved.id ? saved : s));
        if (activeSeries?.id === saved.id) {
          setActiveSeries(saved);
        }
      }
    } catch (e) {
      console.error('Error updating series:', e);
    }
  };

  const deleteSeries = async (seriesId: string): Promise<void> => {
    try {
      const res = await fetch(`/api/series/${seriesId}`, {
        method: 'DELETE'
      });
      if (res.ok || res.status === 204) {
        setSeriesList(prev => prev.filter(s => s.id !== seriesId));
        if (activeSeries?.id === seriesId) {
          const remaining = seriesList.filter(s => s.id !== seriesId);
          setActiveSeries(remaining[0] || null);
          const firstEp = remaining[0]?.seasons?.[0]?.episodes?.[0];
          setActiveEpisode(firstEp || null);
        }
      }
    } catch (e) {
      console.error('Error deleting series:', e);
    }
  };

  const toggleEpisodeCompletion = async (episodeId: string): Promise<void> => {
    if (!activeSeries) return;
    const updatedSeasons = (activeSeries.seasons || []).map(season => ({
      ...season,
      episodes: (season.episodes || []).map(ep => {
        if (ep.id === episodeId) {
          return {
            ...ep,
            isCompleted: !ep.isCompleted
          };
        }
        return ep;
      })
    }));

    const allEpisodes = updatedSeasons.flatMap(s => s.episodes);
    const allCompleted = allEpisodes.length > 0 && allEpisodes.every(e => e.isCompleted);

    const updatedSeries: SeriesShow = {
      ...activeSeries,
      seasons: updatedSeasons,
      status: allCompleted ? 'completed' : 'watching'
    };

    await updateSeries(updatedSeries);
  };

  const updateEpisodeProgress = async (episodeId: string, seconds: number, isCompleted = false): Promise<void> => {
    if (!activeSeries) return;
    const updatedSeasons = (activeSeries.seasons || []).map(season => ({
      ...season,
      episodes: (season.episodes || []).map(ep => {
        if (ep.id === episodeId) {
          return {
            ...ep,
            lastPositionSeconds: seconds,
            isCompleted: isCompleted || ep.isCompleted
          };
        }
        return ep;
      })
    }));

    const updatedSeries: SeriesShow = {
      ...activeSeries,
      seasons: updatedSeasons
    };

    await updateSeries(updatedSeries);
  };

  return {
    seriesList,
    categories,
    activeSeries,
    activeEpisode,
    loading,
    setActiveSeries,
    setActiveEpisode,
    fetchSeries,
    createSeries,
    createSeriesFromFolder,
    updateSeries,
    deleteSeries,
    toggleEpisodeCompletion,
    updateEpisodeProgress,
    addCategory,
    updateCategory,
    deleteCategory
  };
}
