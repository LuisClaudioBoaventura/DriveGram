import { useState, useEffect, useCallback } from 'react';
import { TelegramAuthState, StreamingMode, CacheDurationConfig } from '../types/index.js';

export function useTelegram() {
  const [authState, setAuthState] = useState<TelegramAuthState>({
    isConnected: false,
    savedMessagesChatId: 'me',
    totalSavedFiles: 3,
    storageUsedBytes: 129000000,
    lastSyncDate: new Date().toISOString(),
    streamingMode: 'cloud_direct',
    cacheDuration: {
      value: 24,
      unit: 'hours',
      totalMinutes: 1440
    },
    localCacheSizeBytes: 0
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setAuthState(data);
      }
    } catch (e) {
      console.warn('Backend offline, using local state');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startQrLogin = async (apiId?: string, apiHash?: string, password?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/qr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, apiHash, password })
      });
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (e: any) {
      setLoading(false);
      return { success: false, message: e.message || 'Falha ao iniciar QR Code' };
    }
  };

  const getQrStatus = async () => {
    try {
      const res = await fetch('/api/telegram/qr/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    return { status: 'idle', isConnected: false };
  };

  const sendCode = async (apiId: string, apiHash: string, phone: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiId, apiHash, phone })
      });
      const data = await res.json();
      setLoading(false);
      return data;
    } catch (e: any) {
      setLoading(false);
      return { success: false, message: e.message || 'Falha ao enviar código' };
    }
  };

  const signIn = async (code: string, password?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/sign-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, password })
      });
      const data = await res.json();
      await fetchStatus();
      setLoading(false);
      return data;
    } catch (e: any) {
      setLoading(false);
      return { success: false, message: e.message || 'Falha na autenticação' };
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await fetch('/api/telegram/disconnect', { method: 'POST' });
      await fetchStatus();
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const syncMetadata = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/telegram/sync', { method: 'POST' });
      const data = await res.json();
      await fetchStatus();
      setSyncing(false);
      return data;
    } catch (e: any) {
      setSyncing(false);
      return { success: false, message: e.message };
    }
  };

  const restoreFromTelegram = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/telegram/restore', { method: 'POST' });
      const data = await res.json();
      await fetchStatus();
      setSyncing(false);
    } catch (e: any) {
      setSyncing(false);
      return { success: false, message: e.message };
    }
  };

  const updateStreamingMode = async (mode: StreamingMode) => {
    try {
      const res = await fetch('/api/settings/streaming-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        setAuthState(prev => ({ ...prev, streamingMode: mode }));
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error updating streaming mode:', e);
    }
  };

  const updateCacheDuration = async (value: number, unit: 'minutes' | 'hours' | 'days') => {
    try {
      const res = await fetch('/api/settings/cache-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, unit })
      });
      if (res.ok) {
        const data = await res.json();
        setAuthState(prev => ({ ...prev, cacheDuration: data.config }));
        await fetchStatus();
      }
    } catch (e) {
      console.error('Error updating cache duration:', e);
    }
  };

  const clearLocalCache = async () => {
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      const data = await res.json();
      await fetchStatus();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro ao limpar cache.' };
    }
  };

  return {
    authState,
    loading,
    syncing,
    fetchStatus,
    startQrLogin,
    getQrStatus,
    sendCode,
    signIn,
    disconnect,
    syncMetadata,
    restoreFromTelegram,
    updateStreamingMode,
    updateCacheDuration,
    clearLocalCache
  };
}
