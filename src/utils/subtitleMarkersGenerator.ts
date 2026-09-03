import { VideoTimestamp } from '../types/index.js';

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export type GenerationMode = 'auto' | 'interval_2m' | 'interval_5m' | 'interval_10m';

/**
 * Formats seconds into HH:MM:SS or MM:SS
 */
export function formatTimeFormatted(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remainingSecs = sec % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
}

/**
 * Parses timestamp string (00:01:23.456 or 00:01:23,456 or 01:23.456) into seconds
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

/**
 * Clean subtitle cue text: removes HTML tags, sound cues, speaker names, and excessive whitespace
 */
export function cleanSubtitleText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    // Remove WebVTT formatting / HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove music / sound effect brackets like [Música], [som de chuva], (risos), *aplausos*
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\*[^*]*\*/g, '')
    // Remove speaker prefixes like "JOÃO: ", "- MARIA: "
    .replace(/^[-–—]?\s*[A-ZÀ-Úa-zà-ú0-9_ ]+:\s*/gm, '')
    // Remove dialog hyphens
    .replace(/^[-–—]\s*/gm, '')
    // Normalize newlines to spaces
    .replace(/\s*\n\s*/g, ' ')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse raw WebVTT or SRT content into an array of SubtitleCue
 */
export function parseSubtitleContent(content: string): SubtitleCue[] {
  if (!content) return [];
  const clean = content.replace(/\r\n|\r/g, '\n');
  const blocks = clean.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        const timeMatch = lines[i].split('-->');
        if (timeMatch.length === 2) {
          const start = parseTimeToSeconds(timeMatch[0].trim());
          const end = parseTimeToSeconds(timeMatch[1].trim());
          const rawText = lines.slice(i + 1).join('\n');
          const text = cleanSubtitleText(rawText);
          if (text && !isNaN(start) && !isNaN(end) && start >= 0) {
            cues.push({ start, end, text });
          }
        }
      }
    }
  }

  // Sort chronologically
  return cues.sort((a, b) => a.start - b.start);
}

/**
 * Fetches subtitle text from a given URL and parses into cues
 */
export async function fetchAndParseSubtitle(subtitleUrl: string): Promise<SubtitleCue[]> {
  try {
    const res = await fetch(subtitleUrl);
    if (!res.ok) throw new Error(`Falha ao carregar legenda: HTTP ${res.status}`);
    const text = await res.text();
    return parseSubtitleContent(text);
  } catch (err: any) {
    console.error('[SubtitleMarkers] Error fetching/parsing subtitle:', err);
    throw err;
  }
}

/**
 * Creates a clean chapter title from the beginning of a cue block
 */
function createTitleFromText(text: string, defaultTitle: string): string {
  if (!text) return defaultTitle;
  
  // Try to grab the first full sentence or up to 55 characters
  const firstSentence = text.split(/[.!?]/)[0].trim();
  let candidate = firstSentence.length >= 6 ? firstSentence : text;

  // Truncate cleanly
  if (candidate.length > 55) {
    candidate = candidate.slice(0, 52).trim() + '...';
  }

  // Capitalize first letter
  candidate = candidate.charAt(0).toUpperCase() + candidate.slice(1);

  return candidate.length >= 4 ? candidate : defaultTitle;
}

/**
 * Generates VideoTimestamp markers from subtitle cues using smart segmentation
 */
export function generateTimestampsFromCues(
  cues: SubtitleCue[],
  mode: GenerationMode = 'auto',
  videoDuration?: number
): VideoTimestamp[] {
  if (!cues || cues.length === 0) return [];

  const timestamps: VideoTimestamp[] = [];
  const maxTime = videoDuration || cues[cues.length - 1].end;

  // Always add introductory chapter 00:00
  timestamps.push({
    id: `ts-${Date.now()}-0`,
    seconds: 0,
    timeFormatted: '00:00',
    label: 'Início / Introdução'
  });

  if (mode === 'auto') {
    // Smart heuristic:
    // 1. Detect silence / scene pause gaps >= 12 seconds between cues
    // 2. Minimum interval between consecutive chapters: 60s - 120s
    // 3. Fallback: if no gap found for > 5 minutes, split on next natural sentence start
    const minSpacing = Math.min(120, Math.max(60, Math.floor(maxTime / 15)));
    const maxSpacing = Math.max(minSpacing * 2.5, 300); // 5 mins max silence before forcing a chapter
    let lastChapterTime = 0;

    for (let i = 0; i < cues.length - 1; i++) {
      const current = cues[i];
      const next = cues[i + 1];
      const gap = next.start - current.end;
      const timeSinceLastChapter = next.start - lastChapterTime;

      const isSceneGap = gap >= 12 && timeSinceLastChapter >= minSpacing;
      const isOverdue = timeSinceLastChapter >= maxSpacing;

      if ((isSceneGap || isOverdue) && next.start < maxTime - 30) {
        const chapterNum = timestamps.length + 1;
        const suggestedTitle = createTitleFromText(next.text, `Capítulo ${chapterNum}`);

        timestamps.push({
          id: `ts-${Date.now()}-${chapterNum}`,
          seconds: Math.floor(next.start),
          timeFormatted: formatTimeFormatted(next.start),
          label: suggestedTitle
        });
        lastChapterTime = next.start;
      }
    }
  } else {
    // Fixed interval modes (2 min, 5 min, 10 min) snapping to nearest cue
    let intervalSeconds = 300; // default 5m
    if (mode === 'interval_2m') intervalSeconds = 120;
    if (mode === 'interval_5m') intervalSeconds = 300;
    if (mode === 'interval_10m') intervalSeconds = 600;

    let targetTime = intervalSeconds;

    while (targetTime < maxTime - 30) {
      // Find the closest cue starting at or after targetTime
      const closestCue = cues.find(c => c.start >= targetTime - 15);
      if (closestCue) {
        const chapterNum = timestamps.length + 1;
        const suggestedTitle = createTitleFromText(closestCue.text, `Capítulo ${chapterNum}`);

        timestamps.push({
          id: `ts-${Date.now()}-${chapterNum}`,
          seconds: Math.floor(closestCue.start),
          timeFormatted: formatTimeFormatted(closestCue.start),
          label: suggestedTitle
        });
        targetTime = closestCue.start + intervalSeconds;
      } else {
        targetTime += intervalSeconds;
      }
    }
  }

  return timestamps;
}
