import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

const SERVER_URL_KEY = 'drivegram_custom_server_url';

export function getCustomServerUrl(): string {
  const saved = localStorage.getItem(SERVER_URL_KEY);
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }
  // If running in Capacitor Android/iOS, default to internal embedded server
  if (Capacitor.isNativePlatform()) {
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

export function initMobileBridge(onHardwareBack?: () => boolean): void {
  if (Capacitor.isNativePlatform()) {
    try {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
    } catch (e) {
      console.warn('StatusBar config not available', e);
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
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (onHardwareBack && onHardwareBack()) {
        return; // Consumed by modal or custom handler
      }
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });

    // Intercept fetch calls if needed to prepend base server URL
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const baseUrl = getCustomServerUrl();

      if (baseUrl && (url.startsWith('/api') || url.startsWith('api/'))) {
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${cleanPath}`;
        if (typeof input === 'string' || input instanceof URL) {
          input = url;
        } else {
          input = new Request(url, input);
        }
      }

      return originalFetch(input, init);
    };
  }
}
