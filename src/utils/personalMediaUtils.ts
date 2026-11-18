import { DriveItem, PersonalVideo } from '../types/index.js';

export const DEFAULT_PERSONAL_UNSPLASH_COVER =
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60';

export const PERSONAL_PRESET_COVERS = [
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=60'
];

export const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'avif',
  'heic',
  'heif'
]);

export const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mkv',
  'webm',
  'mov',
  'avi',
  'm4v',
  'ts',
  'flv',
  'wmv'
]);

export function isImageFileItem(file?: DriveItem | null): boolean {
  if (!file) return false;
  if (file.type === 'image') return true;
  if (file.mimeType && file.mimeType.toLowerCase().startsWith('image/')) return true;
  const ext = (file.extension || file.name.split('.').pop() || '').toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function isVideoFileItem(file?: DriveItem | null): boolean {
  if (!file) return false;
  if (file.type === 'video') return true;
  if (file.mimeType && file.mimeType.toLowerCase().startsWith('video/')) return true;
  const ext = (file.extension || file.name.split('.').pop() || '').toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

export function isPersonalPhoto(item: PersonalVideo, allFiles?: DriveItem[]): boolean {
  if (item.mediaType === 'photo') return true;
  if (item.mediaType === 'video') return false;
  if (item.fileId && allFiles && allFiles.length > 0) {
    const file = allFiles.find(f => f.id === item.fileId);
    if (file) return isImageFileItem(file);
  }
  return false;
}

export function normalizePersonalCoverUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  const legacyMatch = trimmed.match(/^\/api\/files\/([^/]+)\/stream$/);
  if (legacyMatch) {
    return `/api/stream/${legacyMatch[1]}`;
  }
  return trimmed;
}

export function isPlaceholderPersonalCover(url?: string): boolean {
  const normalized = normalizePersonalCoverUrl(url);
  if (!normalized) return true;
  if (normalized.includes('photo-1518709268805-4e9042af9f23')) return true;
  return false;
}

export function getPersonalMediaCoverUrl(
  item: PersonalVideo,
  allFiles?: DriveItem[],
  resolveUrl?: (path: string) => string
): string | undefined {
  const isPhoto = isPersonalPhoto(item, allFiles);
  const normalized = normalizePersonalCoverUrl(item.coverImage);

  if (!isPlaceholderPersonalCover(normalized)) {
    return resolveUrl ? resolveUrl(normalized) : normalized;
  }

  if (isPhoto && item.fileId) {
    const streamPath = `/api/stream/${item.fileId}`;
    return resolveUrl ? resolveUrl(streamPath) : streamPath;
  }

  return undefined;
}
