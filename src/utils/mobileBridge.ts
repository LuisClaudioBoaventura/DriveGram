import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

const SERVER_URL_KEY = 'drivegram_custom_server_url';

export function isTauriPlatform(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof (window as any).__TAURI_INTERNALS__ !== 'undefined' ||
         typeof (window as any).__TAURI__ !== 'undefined' ||
         window.location.hostname === 'tauri.localhost' ||
         window.location.protocol === 'tauri:' ||
         window.location.origin.includes('tauri.localhost');
}

export function getCustomServerUrl(): string {
  const saved = localStorage.getItem(SERVER_URL_KEY);
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }
  // If running in Capacitor (Android/iOS) or Tauri (Desktop), default to internal embedded server
  if (Capacitor.isNativePlatform() || isTauriPlatform()) {
    return 'http://127.0.0.1:5000';
  }
  return '';
}

export function hasCustomServerUrl(): boolean {
  return Boolean(localStorage.getItem(SERVER_URL_KEY));
}

export function setCustomServerUrl(url: string): void {
  if (!url || !url.trim()) {
    localStorage.removeItem(SERVER_URL_KEY);
  } else {
    localStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
  }
}

export function resolveApiUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = getCustomServerUrl();
  if (baseUrl) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }
  return url;
}

export function initMobileBridge(onHardwareBack?: () => boolean): void {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.isPluginAvailable('StatusBar')) {
      try {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
      } catch (e) {
        console.warn('StatusBar config not available', e);
      }
    }

    // Sync status bar height from Android bridge if present
    try {
      const androidBridge = (window as any).DriveGramAndroidBridge;
      if (androidBridge && typeof androidBridge.getStatusBarHeightDp === 'function') {
        const heightDp = Number(androidBridge.getStatusBarHeightDp()) || 0;
        if (heightDp > 0) {
          document.documentElement.style.setProperty('--android-status-bar-height', `${heightDp}px`);
        }
      }
    } catch (e) {
      console.warn('[DriveGram Mobile] Failed to read status bar height from bridge:', e);
    }

    // Start Embedded Local Node.js Mobile Server if available
    try {
      if ((window as any).nodejs && typeof (window as any).nodejs.start === 'function') {
        (window as any).nodejs.start('main.js', (err: any) => {
          if (err) {
            console.error('[DriveGram Mobile] Node.js Mobile start error:', err);
          } else {
            console.log('[DriveGram Mobile] Embedded Node.js server started on 127.0.0.1:5000');
          }
        });
      }
    } catch (e) {
      console.warn('[DriveGram Mobile] Node.js bridge init exception:', e);
    }

    // Handle Android Hardware Back Button
    if (Capacitor.isPluginAvailable('App')) {
      try {
        CapApp.addListener('backButton', ({ canGoBack }) => {
          if (onHardwareBack && onHardwareBack()) {
            return; // Consumed by modal or custom handler
          }
          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp().catch(() => {});
          }
        }).catch((err) => {
          console.warn('[DriveGram Mobile] backButton listener error:', err);
        });
      } catch (e) {
        console.warn('[DriveGram Mobile] CapApp addListener failed:', e);
      }
    }
  }

  // Intercept fetch calls if running natively (Mobile or Tauri Desktop)
  if (Capacitor.isNativePlatform() || isTauriPlatform()) {
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const baseUrl = getCustomServerUrl();

      if (baseUrl) {
        if (url.startsWith('/api') || url.startsWith('api/')) {
          const cleanPath = url.startsWith('/') ? url : `/${url}`;
          url = `${baseUrl}${cleanPath}`;
        } else if (url.includes('tauri.localhost/api/')) {
          url = url.replace(/https?:\/\/tauri\.localhost\/api\//, `${baseUrl}/api/`);
        }
        if (typeof input === 'string' || input instanceof URL) {
          input = url;
        } else {
          input = new Request(url, input);
        }
      }

      return originalFetch(input, init);
    };

    // Intercept media (Audio & Video) and Image element src setters so that
    // tags like <audio src="/api/stream/.."> and <img src="/api/comic/..">
    // load directly from the local backend server (127.0.0.1:5000)
    const baseUrl = getCustomServerUrl() || 'http://127.0.0.1:5000';

    try {
      const mediaProto = HTMLMediaElement.prototype;
      const originalMediaSrcDesc = Object.getOwnPropertyDescriptor(mediaProto, 'src');
      if (originalMediaSrcDesc && originalMediaSrcDesc.set) {
        Object.defineProperty(mediaProto, 'src', {
          set(value: string) {
            let nextVal = value;
            if (typeof nextVal === 'string') {
              if (nextVal.startsWith('/api') || nextVal.startsWith('api/')) {
                const clean = nextVal.startsWith('/') ? nextVal : `/${nextVal}`;
                nextVal = `${baseUrl}${clean}`;
              } else if (nextVal.includes('tauri.localhost/api/')) {
                nextVal = nextVal.replace(/https?:\/\/tauri\.localhost\/api\//, `${baseUrl}/api/`);
              }
            }
            return originalMediaSrcDesc.set!.call(this, nextVal);
          },
          get() {
            return originalMediaSrcDesc.get!.call(this);
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      console.warn('[DriveGram Bridge] MediaElement src hook notice:', e);
    }

    try {
      const imgProto = HTMLImageElement.prototype;
      const originalImgSrcDesc = Object.getOwnPropertyDescriptor(imgProto, 'src');
      if (originalImgSrcDesc && originalImgSrcDesc.set) {
        Object.defineProperty(imgProto, 'src', {
          set(value: string) {
            let nextVal = value;
            if (typeof nextVal === 'string') {
              if (nextVal.startsWith('/api') || nextVal.startsWith('api/')) {
                const clean = nextVal.startsWith('/') ? nextVal : `/${nextVal}`;
                nextVal = `${baseUrl}${clean}`;
              } else if (nextVal.includes('tauri.localhost/api/')) {
                nextVal = nextVal.replace(/https?:\/\/tauri\.localhost\/api\//, `${baseUrl}/api/`);
              }
            }
            return originalImgSrcDesc.set!.call(this, nextVal);
          },
          get() {
            return originalImgSrcDesc.get!.call(this);
          },
          configurable: true,
          enumerable: true,
        });
      }
    } catch (e) {
      console.warn('[DriveGram Bridge] ImageElement src hook notice:', e);
    }
  }

  // Setup F12 shortcut for Desktop DevTools
  if (isTauriPlatform() && typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F12') {
        toggleDevTools();
      }
    });
  }
}

export async function toggleDevTools(): Promise<void> {
  if (isTauriPlatform()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_devtools');
    } catch (e) {
      console.warn('[DriveGram Desktop] Failed to toggle DevTools:', e);
    }
  }
}

export async function openLogsFolder(): Promise<string | null> {
  if (isTauriPlatform()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke<string>('open_logs_folder');
      return res;
    } catch (e) {
      console.warn('[DriveGram Desktop] Failed to open logs folder:', e);
      return null;
    }
  }
  return null;
}
