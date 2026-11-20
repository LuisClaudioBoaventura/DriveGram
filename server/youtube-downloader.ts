import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { Innertube, UniversalCache, Constants, Utils, Platform } from 'youtubei.js';
import { extractYouTubeVideoId } from './youtube-parser.js';

const execFileAsync = promisify(execFile);

// Register a safe JS evaluator for youtubei.js so MWEB/WEB signature & n-parameter deciphering works.
if (!Platform.shim.eval) {
  Platform.shim.eval = async (data: any, env: Record<string, any>) => {
    const properties: string[] = [];
    if (env.n) {
      properties.push(`n: exportedVars.nFunction(${JSON.stringify(env.n)})`);
    }
    if (env.sig) {
      properties.push(`sig: exportedVars.sigFunction(${JSON.stringify(env.sig)})`);
    }
    const code = `(function() { ${data.output}\n return { ${properties.join(', ')} }; })()`;
    return vm.runInNewContext(code, {}, { timeout: 2500 });
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = process.env.DRIVEGRAM_DATA_DIR || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const YT_CACHE_DIR = path.join(DATA_DIR, 'yt-cache');

const MAX_TELEGRAM_FILE_BYTES = 1950 * 1024 * 1024; // ~1.95 GB safety margin under Telegram's 2 GB limit
const PARALLEL_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB chunks
const PARALLEL_WORKERS = 4;

type InnertubeClientName = 'IOS' | 'ANDROID' | 'MWEB' | 'WEB' | 'TV';

let cachedInnertube: Innertube | null = null;
let innertubeInitPromise: Promise<Innertube> | null = null;
let ffmpegAvailableCache: boolean | null = null;

async function getInnertube(forceFresh = false): Promise<Innertube> {
  if (forceFresh) {
    cachedInnertube = null;
    innertubeInitPromise = null;
  }
  if (cachedInnertube) return cachedInnertube;
  if (!innertubeInitPromise) {
    innertubeInitPromise = (async () => {
      try {
        if (!fs.existsSync(YT_CACHE_DIR)) {
          fs.mkdirSync(YT_CACHE_DIR, { recursive: true });
        }
      } catch {}
      const instance = await Innertube.create({
        generate_session_locally: true,
        cache: forceFresh ? undefined : new UniversalCache(true, YT_CACHE_DIR),
      });
      cachedInnertube = instance;
      return instance;
    })().finally(() => {
      innertubeInitPromise = null;
    });
  }
  return innertubeInitPromise;
}

async function isFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailableCache !== null) return ffmpegAvailableCache;
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 4000 });
    ffmpegAvailableCache = true;
  } catch {
    ffmpegAvailableCache = false;
  }
  return ffmpegAvailableCache;
}

export function sanitizeFileName(name: string): string {
  const cleaned = (name || 'youtube-video')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 120) || 'youtube-video';
}

export interface DownloadProgressInfo {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  speedLabel: string;
}

export interface YouTubeDownloadResult {
  filePath: string;
  fileName: string;
  diskFileName: string;
  size: number;
  mimeType: string;
  title: string;
  durationSeconds?: number;
}

interface HdStreamCandidate {
  client: InnertubeClientName;
  info: any;
  videoFormat: any;
  audioFormat: any;
  videoUrl: string;
  audioUrl: string;
}

interface ProgressiveStreamCandidate {
  client: InnertubeClientName;
  info: any;
  format: any;
  url: string | null;
}

async function writeWebStreamToFile(
  stream: ReadableStream<Uint8Array>,
  destPath: string,
  expectedBytes: number,
  onChunkProgress?: (downloaded: number, total: number) => void
): Promise<number> {
  const writer = fs.createWriteStream(destPath);
  let downloaded = 0;

  try {
    for await (const chunk of stream as any) {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      downloaded += buf.length;
      if (!writer.write(buf)) {
        await new Promise<void>((resolve, reject) => {
          const onDrain = () => {
            writer.off('error', onError);
            resolve();
          };
          const onError = (err: Error) => {
            writer.off('drain', onDrain);
            reject(err);
          };
          writer.once('drain', onDrain);
          writer.once('error', onError);
        });
      }
      if (onChunkProgress) {
        onChunkProgress(downloaded, expectedBytes || downloaded);
      }
    }
    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);
      writer.once('error', onError);
      writer.end(() => {
        writer.off('error', onError);
        resolve();
      });
    });
    return downloaded;
  } catch (err) {
    writer.destroy();
    throw err;
  }
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return 'Baixando...';
  const mbps = bytesPerSec / (1024 * 1024);
  if (mbps >= 1) return `${mbps.toFixed(1)} MB/s`;
  const kbps = bytesPerSec / 1024;
  return `${Math.round(kbps)} KB/s`;
}

function isUsableFormat(f: any): boolean {
  return Boolean(
    f &&
    !f.drm_families &&
    (f.url || f.signature_cipher || f.cipher)
  );
}

async function tryDecipherFormatUrl(format: any, player: any): Promise<string | null> {
  if (!isUsableFormat(format)) return null;
  try {
    const deciphered = await format.decipher(player);
    if (deciphered && /^https?:\/\//i.test(deciphered)) {
      const cpn = Utils.generateRandomString(16);
      const separator = deciphered.includes('?') ? '&' : '?';
      return deciphered.includes('cpn=') ? deciphered : `${deciphered}${separator}cpn=${cpn}`;
    }
  } catch {
    // Format URL could not be deciphered with current player/client
  }
  return null;
}

/**
 * Verifies with a lightweight GET (immediately cancelling the response stream) that YouTube
 * actually allows downloading this URL (catches HTTP 403 / PO-token gated adaptive streams upfront).
 */
async function probeStreamUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: Constants.STREAM_HEADERS,
      redirect: 'follow',
      signal: controller.signal,
    });
    const ok = res.ok;
    try {
      await res.body?.cancel();
    } catch {}
    return ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadDirectUrlToFile(
  url: string,
  destPath: string,
  expectedBytes: number,
  onChunkProgress?: (downloaded: number, total: number) => void
): Promise<number> {
  const res = await fetch(url, {
    method: 'GET',
    headers: Constants.STREAM_HEADERS,
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    try {
      await res.body?.cancel();
    } catch {}
    throw new Error(`HTTP ${res.status}`);
  }
  const contentLength = Number(res.headers.get('content-length')) || expectedBytes || 0;
  return await writeWebStreamToFile(
    res.body as unknown as ReadableStream<Uint8Array>,
    destPath,
    contentLength,
    onChunkProgress
  );
}

/**
 * Downloads a deciphered YouTube media URL to `destPath` using parallel HTTP range chunks.
 * Falls back cleanly if the server rejects range queries.
 */
async function downloadUrlToFileParallel(
  url: string,
  destPath: string,
  totalBytes: number,
  onDeltaBytes?: (delta: number, downloadedTotal: number) => void,
  concurrency = PARALLEL_WORKERS
): Promise<number> {
  if (!totalBytes || totalBytes <= 0) {
    throw new Error('Content length unavailable for parallel range download');
  }

  const chunkCount = Math.ceil(totalBytes / PARALLEL_CHUNK_SIZE);
  const ranges: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < chunkCount; i++) {
    const start = i * PARALLEL_CHUNK_SIZE;
    const end = Math.min(totalBytes - 1, start + PARALLEL_CHUNK_SIZE - 1);
    ranges.push({ start, end });
  }

  const fh = await fs.promises.open(destPath, 'w');
  let downloaded = 0;
  let nextIdx = 0;

  try {
    const workerCount = Math.min(concurrency, ranges.length);
    const workers = Array.from({ length: workerCount }, async () => {
      while (true) {
        const idx = nextIdx++;
        if (idx >= ranges.length) break;
        const { start, end } = ranges[idx];
        const expectedLen = end - start + 1;

        let lastErr: any = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (attempt > 0) {
            await new Promise((r) => setTimeout(r, 400 * attempt));
          }
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          try {
            const sep = url.includes('?') ? '&' : '?';
            const rangeUrl = `${url}${sep}range=${start}-${end}`;
            const res = await fetch(rangeUrl, {
              method: 'GET',
              headers: Constants.STREAM_HEADERS,
              redirect: 'follow',
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }

            const arrayBuf = await res.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            if (buf.length === 0) {
              throw new Error('Empty chunk received');
            }
            // Write exact expected bytes at offset (protect against server ignoring range and returning full body)
            if (idx === 0 && buf.length > expectedLen * 1.5 && ranges.length > 1) {
              throw new Error('Server ignored range parameter');
            }

            await fh.write(buf, 0, buf.length, start);
            downloaded += buf.length;
            onDeltaBytes?.(buf.length, downloaded);
            lastErr = null;
            break;
          } catch (err: any) {
            clearTimeout(timeoutId);
            lastErr = err;
            // Don't retry 403/404 three times per worker
            if (err?.message === 'HTTP 403' || err?.message === 'HTTP 404') {
              break;
            }
          }
        }

        if (lastErr) {
          throw lastErr;
        }
      }
    });

    await Promise.all(workers);
    return downloaded;
  } finally {
    await fh.close().catch(() => {});
  }
}

async function resolveStreamCandidates(
  yt: Innertube,
  videoId: string,
  hasFfmpeg: boolean,
  clients: InnertubeClientName[],
  options?: { progressiveOnly?: boolean }
): Promise<{
  hdCandidate: HdStreamCandidate | null;
  progCandidate: ProgressiveStreamCandidate | null;
  fallbackProgCandidate: ProgressiveStreamCandidate | null;
  fallbackInfo: any;
  lastError: any;
}> {
  let hdCandidate: HdStreamCandidate | null = null;
  let progCandidate: ProgressiveStreamCandidate | null = null;
  let fallbackProgCandidate: ProgressiveStreamCandidate | null = null;
  let fallbackInfo: any = null;
  let lastError: any = null;

  for (const client of clients) {
    try {
      const candidate = await yt.getInfo(videoId, { client });
      if (!fallbackInfo && candidate?.basic_info) {
        fallbackInfo = candidate;
      }

      const adaptive = Array.isArray(candidate?.streaming_data?.adaptive_formats)
        ? (candidate.streaming_data.adaptive_formats as any[])
        : [];
      const progressive = Array.isArray(candidate?.streaming_data?.formats)
        ? (candidate.streaming_data.formats as any[])
        : [];

      // 1. Check for a verified HTTP 200 progressive video+audio MP4 format
      if (!progCandidate && progressive.length > 0) {
        const pFmt =
          progressive.find((f: any) => isUsableFormat(f) && f.has_video && f.has_audio && f.mime_type?.includes('video/mp4')) ||
          progressive.find((f: any) => isUsableFormat(f) && f.has_video && f.has_audio);

        if (pFmt) {
          const pUrl = await tryDecipherFormatUrl(pFmt, yt.session.player);
          if (!fallbackProgCandidate) {
            fallbackProgCandidate = { client, info: candidate, format: pFmt, url: pUrl };
          }
          if (pUrl && (await probeStreamUrl(pUrl))) {
            progCandidate = { client, info: candidate, format: pFmt, url: pUrl };
            if (options?.progressiveOnly || !hasFfmpeg) {
              break;
            }
          }
        }
      }

      // 2. Check for verified HTTP 200 HD adaptive streams (H.264 <= 1080p + AAC) when ffmpeg is available
      if (!options?.progressiveOnly && hasFfmpeg && !hdCandidate && adaptive.length > 0) {
        const vFmt = adaptive
          .filter(
            (f) =>
              isUsableFormat(f) &&
              f.has_video &&
              !f.has_audio &&
              f.mime_type?.includes('video/mp4') &&
              f.mime_type?.includes('avc1') &&
              (f.height || 0) <= 1080
          )
          .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0))[0];

        const aFmt = adaptive
          .filter((f) => isUsableFormat(f) && f.has_audio && !f.has_video && f.mime_type?.includes('audio/mp4'))
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

        if (vFmt && aFmt) {
          const [vUrl, aUrl] = await Promise.all([
            tryDecipherFormatUrl(vFmt, yt.session.player),
            tryDecipherFormatUrl(aFmt, yt.session.player),
          ]);
          if (vUrl && aUrl) {
            const [vOk, aOk] = await Promise.all([probeStreamUrl(vUrl), probeStreamUrl(aUrl)]);
            if (vOk && aOk) {
              hdCandidate = {
                client,
                info: candidate,
                videoFormat: vFmt,
                audioFormat: aFmt,
                videoUrl: vUrl,
                audioUrl: aUrl,
              };
              break;
            }
          }
        }
      }

      // Once we already have a verified progressive stream and have already checked IOS for HD,
      // stop early rather than spending extra seconds on MWEB/WEB/TV clients unnecessarily.
      if (progCandidate && (client === 'ANDROID' || client === 'MWEB' || client === 'WEB')) {
        break;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  return { hdCandidate, progCandidate, fallbackProgCandidate, fallbackInfo, lastError };
}

/**
 * Downloads a YouTube video to `outputDir` as an MP4 file compatible with Telegram & HTML5 players.
 * Probes stream URLs upfront to bypass PO-token / HTTP 403 gated clients, uses parallel range chunks
 * with HD adaptive muxing (up to 1080p) when available & ffmpeg is installed, and falls back reliably
 * to verified progressive MP4 download (works on Desktop & Android).
 */
export async function downloadYouTubeVideoToFile(
  videoUrlOrId: string,
  outputDir: string,
  options?: {
    titleOverride?: string;
    onProgress?: (info: DownloadProgressInfo) => void;
  }
): Promise<YouTubeDownloadResult> {
  const videoId = /^[a-zA-Z0-9_-]{11}$/.test(videoUrlOrId.trim())
    ? videoUrlOrId.trim()
    : extractYouTubeVideoId(videoUrlOrId);

  if (!videoId) {
    throw new Error('URL ou ID do YouTube inválido.');
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const hasFfmpeg = await isFfmpegAvailable();
  const primaryClients: InnertubeClientName[] = ['IOS', 'ANDROID', 'MWEB', 'WEB', 'TV'];

  let yt = await getInnertube(false);
  let resolved = await resolveStreamCandidates(yt, videoId, hasFfmpeg, primaryClients);

  // If cached session returned zero usable streams, retry once with a fresh Innertube instance
  if (!resolved.hdCandidate && !resolved.progCandidate && !resolved.fallbackProgCandidate) {
    yt = await getInnertube(true);
    resolved = await resolveStreamCandidates(yt, videoId, hasFfmpeg, primaryClients);
  }

  let { hdCandidate, progCandidate, fallbackProgCandidate, fallbackInfo, lastError } = resolved;

  const metaInfo = hdCandidate?.info || progCandidate?.info || fallbackProgCandidate?.info || fallbackInfo;
  if (!metaInfo) {
    cachedInnertube = null;
    throw new Error(
      lastError?.message || 'Não foi possível obter os fluxos de vídeo do YouTube (vídeo privado, removido ou restrito).'
    );
  }

  const videoTitle = options?.titleOverride?.trim() || metaInfo.basic_info?.title || `YouTube-${videoId}`;
  const durationSeconds = metaInfo.basic_info?.duration ? Number(metaInfo.basic_info.duration) : undefined;
  const safeBase = sanitizeFileName(videoTitle);
  const fileName = `${safeBase}.mp4`;
  const diskFileName = `yt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${safeBase.slice(0, 60)}.mp4`;
  const finalPath = path.join(outputDir, diskFileName);

  const startTime = Date.now();

  // 1. Try HD adaptive (up to 1080p H.264 + AAC) when verified HTTP 200 and ffmpeg is available
  if (hasFfmpeg && hdCandidate) {
    const vExpected = Number(hdCandidate.videoFormat.content_length) || 0;
    const aExpected = Number(hdCandidate.audioFormat.content_length) || 0;
    const combinedExpected = vExpected + aExpected;

    if (combinedExpected > MAX_TELEGRAM_FILE_BYTES) {
      throw new Error('O vídeo excede o limite máximo de 2 GB do Telegram.');
    }

    const tmpVideoPath = `${finalPath}.video.tmp.mp4`;
    const tmpAudioPath = `${finalPath}.audio.tmp.m4a`;

    try {
      const trackDownloaded = { video: 0, audio: 0 };
      const reportCombinedProgress = () => {
        const totalDownloaded = trackDownloaded.video + trackDownloaded.audio;
        const total = combinedExpected || totalDownloaded;
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = combinedExpected > 0 ? Math.min(90, Math.round((totalDownloaded / combinedExpected) * 90)) : 50;
        options?.onProgress?.({
          percent: pct,
          downloadedBytes: totalDownloaded,
          totalBytes: total,
          speedLabel: formatSpeed(elapsed > 0 ? totalDownloaded / elapsed : 0),
        });
      };

      const downloadTrack = async (url: string, dest: string, expected: number, itag: number, type: 'video' | 'audio') => {
        if (expected > 0) {
          try {
            trackDownloaded[type] = 0;
            await downloadUrlToFileParallel(url, dest, expected, (_delta, dl) => {
              trackDownloaded[type] = dl;
              reportCombinedProgress();
            });
            return;
          } catch (rangeErr: any) {
            console.warn(`[YouTubeDownloader] Parallel range failed for ${type}, falling back to direct stream:`, rangeErr?.message || rangeErr);
            try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
          }
        }
        try {
          trackDownloaded[type] = 0;
          await downloadDirectUrlToFile(url, dest, expected, (dl) => {
            trackDownloaded[type] = dl;
            reportCombinedProgress();
          });
          return;
        } catch (directErr: any) {
          console.warn(`[YouTubeDownloader] Direct stream failed for ${type}, falling back to innertube download:`, directErr?.message || directErr);
          try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch {}
        }
        trackDownloaded[type] = 0;
        const stream = await hdCandidate!.info.download({ itag, type });
        await writeWebStreamToFile(stream, dest, expected, (dl) => {
          trackDownloaded[type] = dl;
          reportCombinedProgress();
        });
      };

      await Promise.all([
        downloadTrack(hdCandidate.videoUrl, tmpVideoPath, vExpected, hdCandidate.videoFormat.itag, 'video'),
        downloadTrack(hdCandidate.audioUrl, tmpAudioPath, aExpected, hdCandidate.audioFormat.itag, 'audio'),
      ]);

      options?.onProgress?.({
        percent: 92,
        downloadedBytes: combinedExpected || (trackDownloaded.video + trackDownloaded.audio),
        totalBytes: combinedExpected || (trackDownloaded.video + trackDownloaded.audio),
        speedLabel: 'Combinando vídeo e áudio...',
      });

      await execFileAsync(
        'ffmpeg',
        ['-y', '-i', tmpVideoPath, '-i', tmpAudioPath, '-c', 'copy', '-movflags', '+faststart', finalPath],
        { timeout: 5 * 60 * 1000 }
      );

      const stats = fs.statSync(finalPath);
      if (stats.size > MAX_TELEGRAM_FILE_BYTES) {
        fs.unlinkSync(finalPath);
        throw new Error('O vídeo final excede o limite de 2 GB do Telegram.');
      }

      options?.onProgress?.({
        percent: 100,
        downloadedBytes: stats.size,
        totalBytes: stats.size,
        speedLabel: 'Download concluído',
      });

      return {
        filePath: finalPath,
        fileName,
        diskFileName,
        size: stats.size,
        mimeType: 'video/mp4',
        title: videoTitle,
        durationSeconds,
      };
    } catch (hdErr: any) {
      console.warn('[YouTubeDownloader] HD mux fallback to progressive:', hdErr?.message || hdErr);
      try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
    } finally {
      try { if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath); } catch {}
      try { if (fs.existsSync(tmpAudioPath)) fs.unlinkSync(tmpAudioPath); } catch {}
    }
  }

  // 2. Ensure we have a progressive candidate from a client that supports progressive MP4 (ANDROID/MWEB/WEB/TV)
  if (!progCandidate && !fallbackProgCandidate) {
    const progSearch = await resolveStreamCandidates(
      yt,
      videoId,
      false,
      ['ANDROID', 'MWEB', 'WEB', 'TV'],
      { progressiveOnly: true }
    );
    progCandidate = progSearch.progCandidate;
    fallbackProgCandidate = progSearch.fallbackProgCandidate;
  }

  const chosenProg = progCandidate || fallbackProgCandidate;
  if (!chosenProg) {
    cachedInnertube = null;
    throw new Error('Não foi possível encontrar um formato de vídeo compatível para download no YouTube.');
  }

  // 3. Progressive download (pure Node.js, parallel range chunks -> direct GET -> innertube stream)
  const progFormat = chosenProg.format;
  const progUrl = chosenProg.url;
  const expectedSize = Number(progFormat?.content_length) || 0;
  if (expectedSize > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error('O vídeo excede o limite máximo de 2 GB do Telegram.');
  }

  try {
    let downloadedOk = false;

    if (progUrl && expectedSize > 0) {
      try {
        await downloadUrlToFileParallel(progUrl, finalPath, expectedSize, (_delta, dl) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = Math.min(99, Math.round((dl / expectedSize) * 100));
          options?.onProgress?.({
            percent: pct,
            downloadedBytes: dl,
            totalBytes: expectedSize,
            speedLabel: formatSpeed(elapsed > 0 ? dl / elapsed : 0),
          });
        });
        downloadedOk = true;
      } catch (rangeErr: any) {
        console.warn('[YouTubeDownloader] Progressive parallel range fallback to direct stream:', rangeErr?.message || rangeErr);
        try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
      }
    }

    if (!downloadedOk && progUrl) {
      try {
        await downloadDirectUrlToFile(progUrl, finalPath, expectedSize, (dl, total) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = total > 0 ? Math.min(99, Math.round((dl / total) * 100)) : 50;
          options?.onProgress?.({
            percent: pct,
            downloadedBytes: dl,
            totalBytes: total,
            speedLabel: formatSpeed(elapsed > 0 ? dl / elapsed : 0),
          });
        });
        downloadedOk = true;
      } catch (directErr: any) {
        console.warn('[YouTubeDownloader] Progressive direct GET fallback to innertube stream:', directErr?.message || directErr);
        try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
      }
    }

    if (!downloadedOk) {
      const stream = await chosenProg.info.download({
        itag: progFormat?.itag,
        type: 'video+audio',
        quality: 'best',
        format: progFormat?.mime_type?.includes('mp4') ? 'mp4' : 'any',
      });

      await writeWebStreamToFile(stream, finalPath, expectedSize, (dl, total) => {
        const elapsed = (Date.now() - startTime) / 1000;
        const pct = total > 0 ? Math.min(99, Math.round((dl / total) * 100)) : 50;
        options?.onProgress?.({
          percent: pct,
          downloadedBytes: dl,
          totalBytes: total,
          speedLabel: formatSpeed(elapsed > 0 ? dl / elapsed : 0),
        });
      });
    }

    const stats = fs.statSync(finalPath);
    if (stats.size <= 0) {
      throw new Error('O arquivo baixado do YouTube está vazio.');
    }
    if (stats.size > MAX_TELEGRAM_FILE_BYTES) {
      fs.unlinkSync(finalPath);
      throw new Error('O vídeo excede o limite máximo de 2 GB do Telegram.');
    }

    options?.onProgress?.({
      percent: 100,
      downloadedBytes: stats.size,
      totalBytes: stats.size,
      speedLabel: 'Download concluído',
    });

    return {
      filePath: finalPath,
      fileName,
      diskFileName,
      size: stats.size,
      mimeType: 'video/mp4',
      title: videoTitle,
      durationSeconds,
    };
  } catch (err) {
    try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
    throw err;
  }
}
