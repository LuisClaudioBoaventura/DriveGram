import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Innertube } from 'youtubei.js';
import { extractYouTubeVideoId } from './youtube-parser.js';

const execFileAsync = promisify(execFile);

const MAX_TELEGRAM_FILE_BYTES = 1950 * 1024 * 1024; // ~1.95 GB safety margin under Telegram's 2 GB limit

let cachedInnertube: Innertube | null = null;
let ffmpegAvailableCache: boolean | null = null;

async function getInnertube(): Promise<Innertube> {
  if (!cachedInnertube) {
    cachedInnertube = await Innertube.create({ generate_session_locally: true });
  }
  return cachedInnertube;
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
          writer.once('drain', resolve);
          writer.once('error', reject);
        });
      }
      if (onChunkProgress) {
        onChunkProgress(downloaded, expectedBytes || downloaded);
      }
    }
    await new Promise<void>((resolve, reject) => {
      writer.end(() => resolve());
      writer.once('error', reject);
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

/**
 * Downloads a YouTube video to `outputDir` as an MP4 file compatible with Telegram & HTML5 players.
 * Uses adaptive HD (up to 1080p) + ffmpeg lossless muxing when ffmpeg is available,
 * and falls back seamlessly to pure-JS progressive MP4 download (works on Desktop & Android).
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

  const yt = await getInnertube();
  const clients: Array<'ANDROID' | 'IOS' | 'TV' | 'WEB'> = ['ANDROID', 'IOS', 'TV', 'WEB'];
  let info: any = null;
  let lastInfoErr: any = null;

  for (const client of clients) {
    try {
      const candidate = await yt.getInfo(videoId, { client });
      const hasProgressive = (candidate?.streaming_data?.formats?.length || 0) > 0;
      const hasAdaptive = (candidate?.streaming_data?.adaptive_formats?.length || 0) > 0;
      if (hasProgressive || hasAdaptive) {
        info = candidate;
        break;
      }
    } catch (err: any) {
      lastInfoErr = err;
    }
  }

  if (!info) {
    // Reset cached Innertube in case session went stale
    cachedInnertube = null;
    throw new Error(
      lastInfoErr?.message || 'Não foi possível obter os fluxos de vídeo do YouTube (vídeo privado, removido ou restrito).'
    );
  }

  const videoTitle = options?.titleOverride?.trim() || info.basic_info?.title || `YouTube-${videoId}`;
  const durationSeconds = info.basic_info?.duration ? Number(info.basic_info.duration) : undefined;
  const safeBase = sanitizeFileName(videoTitle);
  const fileName = `${safeBase}.mp4`;
  const diskFileName = `yt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${safeBase.slice(0, 60)}.mp4`;
  const finalPath = path.join(outputDir, diskFileName);

  const hasFfmpeg = await isFfmpegAvailable();
  const startTime = Date.now();

  // Try HD adaptive (up to 1080p H.264 + AAC) when ffmpeg is available
  if (hasFfmpeg && Array.isArray(info.streaming_data?.adaptive_formats)) {
    const adaptive = info.streaming_data.adaptive_formats as any[];
    const videoFormat = adaptive
      .filter(f => f.has_video && !f.has_audio && f.mime_type?.includes('video/mp4') && f.mime_type?.includes('avc1') && (f.height || 0) <= 1080)
      .sort((a, b) => (b.height || 0) - (a.height || 0) || (b.bitrate || 0) - (a.bitrate || 0))[0];

    const audioFormat = adaptive
      .filter(f => f.has_audio && !f.has_video && f.mime_type?.includes('audio/mp4'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

    if (videoFormat && audioFormat) {
      const estTotal = (Number(videoFormat.content_length) || 0) + (Number(audioFormat.content_length) || 0);
      if (estTotal > MAX_TELEGRAM_FILE_BYTES) {
        throw new Error('O vídeo excede o limite máximo de 2 GB do Telegram.');
      }

      const tmpVideoPath = `${finalPath}.video.tmp.mp4`;
      const tmpAudioPath = `${finalPath}.audio.tmp.m4a`;

      try {
        const vExpected = Number(videoFormat.content_length) || 0;
        const aExpected = Number(audioFormat.content_length) || 0;
        const combinedExpected = vExpected + aExpected;

        const vStream = await info.download({
          type: 'video',
          quality: videoFormat.quality_label || 'best',
          format: 'mp4',
        });

        let videoBytes = 0;
        videoBytes = await writeWebStreamToFile(vStream, tmpVideoPath, vExpected, (dl) => {
          const total = combinedExpected || dl;
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = combinedExpected > 0 ? Math.min(75, Math.round((dl / combinedExpected) * 85)) : 35;
          options?.onProgress?.({
            percent: pct,
            downloadedBytes: dl,
            totalBytes: total,
            speedLabel: formatSpeed(elapsed > 0 ? dl / elapsed : 0),
          });
        });

        const aStream = await info.download({
          type: 'audio',
          quality: 'best',
          format: 'mp4',
        });

        await writeWebStreamToFile(aStream, tmpAudioPath, aExpected, (dl) => {
          const totalDl = videoBytes + dl;
          const total = combinedExpected || totalDl;
          const elapsed = (Date.now() - startTime) / 1000;
          const pct = combinedExpected > 0 ? Math.min(90, Math.round((totalDl / combinedExpected) * 85)) : 80;
          options?.onProgress?.({
            percent: pct,
            downloadedBytes: totalDl,
            totalBytes: total,
            speedLabel: formatSpeed(elapsed > 0 ? totalDl / elapsed : 0),
          });
        });

        options?.onProgress?.({
          percent: 92,
          downloadedBytes: combinedExpected,
          totalBytes: combinedExpected,
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
  }

  // Progressive fallback (pure Node.js, no ffmpeg required)
  const progFormat = info.streaming_data?.formats?.find((f: any) => f.has_video && f.has_audio && f.mime_type?.includes('video/mp4'))
    || info.streaming_data?.formats?.find((f: any) => f.has_video && f.has_audio);

  const expectedSize = Number(progFormat?.content_length) || 0;
  if (expectedSize > MAX_TELEGRAM_FILE_BYTES) {
    throw new Error('O vídeo excede o limite máximo de 2 GB do Telegram.');
  }

  try {
    const stream = await info.download({
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
