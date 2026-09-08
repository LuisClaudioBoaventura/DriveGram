import { Capacitor } from '@capacitor/core';
import { isTauriPlatform } from './mobileBridge.js';

export const CURRENT_APP_VERSION = '1.6.3';
export const GITHUB_REPO = 'LuisClaudioBoaventura/DriveGram';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes?: string;
  publishedAt?: string;
  releaseUrl?: string;
  apkDownloadUrl?: string;
  windowsDownloadUrl?: string;
  tauriUpdateObj?: any;
}

export function isAndroidNative(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Boolean((window as any).DriveGramAndroidBridge) ||
    Capacitor.getPlatform() === 'android' ||
    navigator.userAgent.toLowerCase().includes('android')
  );
}

/**
 * Normalizes semver strings for comparison (e.g. "v1.0.1" -> [1, 0, 1])
 */
export function compareVersions(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Checks for updates across Tauri (PC), Android, and Web
 */
export async function checkForAppUpdates(): Promise<UpdateInfo> {
  const result: UpdateInfo = {
    available: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
  };

  // 1. Check via official Tauri Updater if running on Desktop (PC)
  if (isTauriPlatform()) {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      if (update && update.available) {
        result.available = true;
        result.latestVersion = update.version;
        result.releaseNotes = update.body || 'Atualização disponível.';
        result.publishedAt = update.date;
        result.tauriUpdateObj = update;
        return result;
      }
    } catch (tauriErr) {
      console.warn('[Updater] Tauri plugin check notice, falling back to GitHub API:', tauriErr);
    }
  }

  // 2. Query GitHub Releases API directly
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.warn(`[Updater] GitHub API responded with ${response.status}`);
      return result;
    }

    const data = await response.json();
    const latestTag = (data.tag_name || '').replace(/^v/i, '');
    result.latestVersion = latestTag || CURRENT_APP_VERSION;
    result.releaseNotes = data.body || '';
    result.publishedAt = data.published_at;
    result.releaseUrl = data.html_url;

    // Find direct asset URLs
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find(
        (a: any) => a.name?.endsWith('.apk') || a.browser_download_url?.endsWith('.apk')
      );
      if (apkAsset) {
        result.apkDownloadUrl = apkAsset.browser_download_url;
      }

      const exeAsset = data.assets.find(
        (a: any) => a.name?.includes('setup.exe') || a.name?.endsWith('.exe')
      );
      if (exeAsset) {
        result.windowsDownloadUrl = exeAsset.browser_download_url;
      }
    }

    // Default fallback URLs if asset was not parsed directly
    if (!result.apkDownloadUrl && latestTag) {
      result.apkDownloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${latestTag}/DriveGram.apk`;
    }

    if (compareVersions(result.latestVersion, CURRENT_APP_VERSION) > 0) {
      result.available = true;
    }
  } catch (err) {
    console.error('[Updater] Error checking for updates:', err);
  }

  return result;
}

/**
 * Downloads and installs the update on PC (Tauri)
 */
export async function installTauriDesktopUpdate(
  updateObj: any,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  if (!updateObj) {
    throw new Error('Objeto de atualização Tauri indisponível.');
  }

  let downloadedBytes = 0;
  let totalBytes = 0;

  await updateObj.downloadAndInstall((event: any) => {
    if (event.event === 'Started') {
      totalBytes = event.data?.contentLength || 0;
    } else if (event.event === 'Progress') {
      downloadedBytes += event.data?.chunkLength || 0;
      if (onProgress) {
        onProgress(downloadedBytes, totalBytes);
      }
    } else if (event.event === 'Finished') {
      if (onProgress) {
        onProgress(totalBytes, totalBytes);
      }
    }
  });

  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}

/**
 * Starts APK download and prompts installation on Android
 */
export function installAndroidUpdate(apkUrl: string, versionName: string): void {
  if (typeof window !== 'undefined' && (window as any).DriveGramAndroidBridge?.downloadAndInstallApk) {
    (window as any).DriveGramAndroidBridge.downloadAndInstallApk(apkUrl, versionName);
    return;
  }

  // Fallback: open direct APK link in browser
  window.open(apkUrl, '_system');
}

/**
 * Opens a URL in the user's default browser safely across Desktop (Tauri), Mobile (Android), and Web.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (!url) return;

  if (isTauriPlatform()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.warn('[Updater] Failed to open external URL via Tauri command:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
