import { resolveApiUrl } from './mobileBridge.js';

export interface YouTubeSaveProgress {
  progress: number;
  stageLabel: string;
  speed?: string;
}

export interface SaveYouTubeToTelegramParams {
  videoUrl: string;
  title?: string;
  targetType: 'series_episode' | 'course_lesson' | 'movie_video' | 'standalone';
  parentId?: string;
  episodeId?: string;
  lessonId?: string;
  videoId?: string;
  folderId?: string;
}

export function isYouTubeVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i.test(url);
}

export async function saveYouTubeVideoToTelegram(
  params: SaveYouTubeToTelegramParams,
  onProgress?: (info: YouTubeSaveProgress) => void
): Promise<{
  success: boolean;
  alreadySaved?: boolean;
  file?: any;
  series?: any;
  course?: any;
  video?: any;
}> {
  const uploadId = `yt-save-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let stopped = false;

  const pollInterval = onProgress
    ? setInterval(async () => {
        if (stopped) return;
        try {
          const res = await fetch(resolveApiUrl(`/api/uploads/progress/${uploadId}`));
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data.progress === 'number') {
              onProgress({
                progress: data.progress,
                stageLabel: data.stageLabel || 'Processando...',
                speed: data.speed
              });
            }
          }
        } catch {
          // Ignore transient poll errors
        }
      }, 650)
    : null;

  try {
    onProgress?.({
      progress: 2,
      stageLabel: 'Iniciando download do YouTube...'
    });

    const response = await fetch(resolveApiUrl('/api/youtube/save-to-telegram'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, uploadId })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao salvar vídeo no Telegram');
    }

    onProgress?.({
      progress: 100,
      stageLabel: 'Salvo no Telegram!'
    });

    return data;
  } finally {
    stopped = true;
    if (pollInterval) clearInterval(pollInterval);
  }
}
