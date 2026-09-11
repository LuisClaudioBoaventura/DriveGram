import { Capacitor } from '@capacitor/core';
import { isTauriPlatform, resolveApiUrl } from './mobileBridge.js';

export const CURRENT_APP_VERSION = '1.9.0';
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

  // 2. Query GitHub Releases API
  try {
    const isAndroid = isAndroidNative();
    // No Android, consultamos os releases recentes para encontrar a última release que possui um APK anexado.
    // No Desktop/Web, consultamos o release mais recente diretamente.
    const endpoint = isAndroid
      ? `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`
      : `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.warn(`[Updater] GitHub API responded with ${response.status}`);
      return result;
    }

    const data = await response.json();

    if (isAndroid) {
      const releases: any[] = Array.isArray(data) ? data : [data];
      let matchedRelease: any = null;
      let matchedApkAsset: any = null;

      for (const rel of releases) {
        if (Array.isArray(rel.assets)) {
          const apk = rel.assets.find(
            (a: any) =>
              typeof a.name === 'string' &&
              a.name.endsWith('.apk') &&
              Boolean(a.browser_download_url)
          );
          if (apk) {
            matchedRelease = rel;
            matchedApkAsset = apk;
            break;
          }
        }
      }

      if (matchedRelease && matchedApkAsset) {
        const tagVer = (matchedRelease.tag_name || '').replace(/^v/i, '');
        result.latestVersion = tagVer || CURRENT_APP_VERSION;
        result.apkDownloadUrl = matchedApkAsset.browser_download_url;
        result.releaseNotes = matchedRelease.body || '';
        result.publishedAt = matchedRelease.published_at;
        result.releaseUrl = matchedRelease.html_url;

        if (compareVersions(result.latestVersion, CURRENT_APP_VERSION) > 0) {
          result.available = true;
        }
      }
      return result;
    }

    // Desktop / Web flow
    const latestRelease = data;
    const latestTag = (latestRelease.tag_name || '').replace(/^v/i, '');
    result.latestVersion = latestTag || CURRENT_APP_VERSION;
    result.releaseNotes = latestRelease.body || '';
    result.publishedAt = latestRelease.published_at;
    result.releaseUrl = latestRelease.html_url;

    // Find direct asset URLs
    if (Array.isArray(latestRelease.assets)) {
      const apkAsset = latestRelease.assets.find(
        (a: any) => a.name?.endsWith('.apk') || a.browser_download_url?.endsWith('.apk')
      );
      if (apkAsset) {
        result.apkDownloadUrl = apkAsset.browser_download_url;
      }

      const exeAsset = latestRelease.assets.find(
        (a: any) =>
          typeof a.name === 'string' &&
          (a.name.endsWith('.exe') || a.name.includes('-setup.exe') || a.name.includes('setup.exe')) &&
          !a.name.endsWith('.sig')
      );
      if (exeAsset) {
        result.windowsDownloadUrl = exeAsset.browser_download_url;
      }
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

  // Faz o download do update (sem instalar ainda)
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

  // Encerra o servidor backend (node.exe) ANTES do Tauri lançar o instalador NSIS.
  // Isso libera o file lock no node.exe no Windows, evitando "Error opening file for writing".
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stop_backend_server');
  } catch (_e) {
    // Fallback: pede ao servidor para se encerrar via API
    try {
      await fetch(resolveApiUrl('/api/system/shutdown'), { method: 'POST' });
    } catch (_err) {}
  }

  // Aguarda 1,5s para o Windows liberar completamente todos os file handles do node.exe
  await new Promise((r) => setTimeout(r, 1500));

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

  // 1. Try Tauri native command if available
  if (isTauriPlatform()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_external_url', { url });
      return;
    } catch (err) {
      console.warn('[Updater] Failed to open external URL via Tauri command, trying backend:', err);
    }
  }

  // 2. Try backend endpoint to launch system default browser
  try {
    const res = await fetch(resolveApiUrl('/api/system/open-url'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (res.ok) {
      return;
    }
  } catch (err) {
    console.warn('[Updater] Failed to open URL via backend:', err);
  }

  // 3. Fallback to window.open
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Downloads and launches the desktop installer via local server with live progress
 */
export async function triggerBackendDesktopUpdate(
  downloadUrl: string,
  version: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const startRes = await fetch(resolveApiUrl('/api/system/download-and-run-update'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ downloadUrl, version })
  });

  if (!startRes.ok) {
    throw new Error('Falha ao iniciar download da atualização pelo servidor local.');
  }

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(resolveApiUrl('/api/system/update-progress'));
        if (!res.ok) return;
        const state = await res.json();

        if (onProgress && typeof state.progress === 'number') {
          onProgress(state.progress);
        }

        if (state.status === 'ready') {
          clearInterval(interval);
          resolve();
        } else if (state.status === 'error') {
          clearInterval(interval);
          reject(new Error(state.error || 'Erro ao processar atualização.'));
        }
      } catch (err) {
        if (attempts > 60) {
          clearInterval(interval);
          reject(err);
        }
      }
    }, 400);
  });
}
