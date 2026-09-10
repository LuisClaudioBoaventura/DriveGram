import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { TelegramAuthState, StreamingMode, CacheDurationConfig, SavedAuditResult } from '../types/index.js';

export function useTelegram() {
  const [authState, setAuthState] = useState<TelegramAuthState>({
    isConnected: false,
    savedMessagesChatId: 'me',
    totalSavedFiles: 0,
    storageUsedBytes: 0,
    lastSyncDate: new Date().toISOString(),
    streamingMode: 'cloud_direct',
    cacheDuration: {
      value: 24,
      unit: 'hours',
      totalMinutes: 1440
    },
    localCacheSizeBytes: 0,
    metadataRetentionCount: 1
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const startupSyncTriggered = useRef(false);
  const startupSyncInProgress = useRef(false);
  const startupSyncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerStartupSync = useCallback(() => {
    // Ignora se já foi disparado ou está em progresso
    if (startupSyncTriggered.current || startupSyncInProgress.current) return;

    // Debounce de 500ms para absorver duplas chamadas do React StrictMode em dev
    if (startupSyncDebounceTimer.current) clearTimeout(startupSyncDebounceTimer.current);
    startupSyncDebounceTimer.current = setTimeout(() => {
      if (startupSyncTriggered.current || startupSyncInProgress.current) return;
      startupSyncTriggered.current = true;
      startupSyncInProgress.current = true;

      fetch('/api/telegram/startup-sync', {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })
        .then(async r => {
          if (!r.ok) return null;
          return r.json().catch(() => null);
        })
        .then(syncRes => {
          if (syncRes && syncRes.success) {
            console.log('[DriveGram] Sincronização ativa concluída:', syncRes.message);
            window.dispatchEvent(new CustomEvent('drivegram-metadata-updated', { detail: syncRes }));
          }
        })
        .catch(() => {})
        .finally(() => {
          startupSyncInProgress.current = false;
        });
    }, 500);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setAuthState(data);
        if (data.isConnected) {
          triggerStartupSync();
        }
      }
    } catch (e) {
      console.warn('Backend offline, using local state');
    }
  }, [triggerStartupSync]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Sincronização em Tempo Real via Server-Sent Events (SSE)
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/telegram/events');
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'metadata-updated') {
              console.log('[DriveGram Real-Time SSE] Atualização de metadados recebida:', data);
              fetchStatus();
              window.dispatchEvent(new CustomEvent('drivegram-metadata-updated', { detail: data }));
            }
          } catch (_) {}
        };
        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connectSSE, 8000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [fetchStatus]);

  // Sincronização por Ciclo de Vida: verifica alterações ao focar a janela ou retomar o aplicativo (Desktop e Celular)
  const isSyncingActiveRef = useRef(false);
  useEffect(() => {
    let lastResumeSync = 0;
    const handleResumeOrFocus = () => {
      const now = Date.now();
      // Debounce para não disparar mais de uma vez a cada 30 segundos
      if (now - lastResumeSync < 30000 || isSyncingActiveRef.current) return;
      lastResumeSync = now;
      isSyncingActiveRef.current = true;

      fetchStatus();
      setTimeout(() => { isSyncingActiveRef.current = false; }, 5000);
    };


    window.addEventListener('focus', handleResumeOrFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResumeOrFocus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Listener nativo do Capacitor para Android / Mobile
    let capAppListener: any = null;
    if (Capacitor.isPluginAvailable('App')) {
      try {
        capAppListener = CapApp.addListener('appStateChange', (state) => {
          if (state.isActive) {
            handleResumeOrFocus();
          }
        });
        if (capAppListener && typeof capAppListener.catch === 'function') {
          capAppListener.catch(() => {});
        }
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('focus', handleResumeOrFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (capAppListener && typeof capAppListener.then === 'function') {
        capAppListener.then((handle: any) => handle?.remove?.()).catch(() => {});
      } else if (capAppListener?.remove) {
        capAppListener.remove();
      }
    };
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
      const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
      const data = await res.json().catch(() => ({ success: true }));
      await fetchStatus();
      setLoading(false);
      return data;
    } catch (e: any) {
      setLoading(false);
      return { success: false, message: e.message };
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
      return data;
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

  const auditSavedMessages = async (limit = 500): Promise<SavedAuditResult> => {
    try {
      const res = await fetch(`/api/telegram/audit-saved?limit=${limit}`);
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        telegramTotalFiles: 0,
        manifestTotalFiles: 0,
        missingCount: 0,
        missingFiles: [],
        message: e?.message || 'Falha de comunicação com o servidor.'
      };
    }
  };

  const reconcileMissingFiles = async (messageIds?: number[]) => {
    try {
      const res = await fetch('/api/telegram/reconcile-saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds })
      });
      const data = await res.json();
      await fetchStatus();
      window.dispatchEvent(new CustomEvent('drivegram-metadata-updated', { detail: data }));
      return data;
    } catch (e: any) {
      return { success: false, addedCount: 0, addedFoldersCount: 0, message: e?.message || 'Falha ao conectar com o servidor.' };
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
    clearLocalCache,
    auditSavedMessages,
    reconcileMissingFiles
  };
}

