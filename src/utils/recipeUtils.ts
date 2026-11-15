import { RecipeVideo } from '../types/index.js';

export const RECIPE_PRESET_COVERS = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&auto=format&fit=crop&q=60',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&auto=format&fit=crop&q=60'
];

export const DIFFICULTY_META: Record<NonNullable<RecipeVideo['difficulty']>, { label: string; badgeClass: string }> = {
  facil: {
    label: 'Fácil',
    badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
  },
  medio: {
    label: 'Médio',
    badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
  },
  dificil: {
    label: 'Difícil',
    badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
  }
};

export const PLATFORM_LABELS: Record<NonNullable<RecipeVideo['sourcePlatform']>, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  local: 'Drive / Telegram',
  other: 'Web'
};

export function extractYouTubeIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

export function detectRecipePlatform(url?: string | null, hasFile = false): RecipeVideo['sourcePlatform'] {
  if (url) {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
    if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.startsWith('http')) return 'other';
  }
  return hasFile ? 'local' : 'other';
}

export function buildYouTubeEmbedUrl(videoId: string, autoplay = false): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1${autoplay ? '&autoplay=1' : ''}`;
}

export function buildYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function parseIngredientsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.replace(/^[-*•\d.)\s]+(?=\S)/, '').trim())
    .filter(Boolean);
}

export function parseTagsText(text: string): string[] {
  return text
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}
