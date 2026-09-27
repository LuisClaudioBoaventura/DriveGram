/**
 * Utilitários para estimativa e formatação de duração de arquivos de áudio
 * baseados no tamanho em bytes e codecs típicos para audiolivros / voz falada.
 */

export function estimateAudioDurationSeconds(fileSizeBytes: number, extensionOrMime?: string): number {
  if (!fileSizeBytes || fileSizeBytes <= 0) return 0;

  const ext = (extensionOrMime || '')
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/^audio\//, '');

  // Bitrates médios de referência para audiolivros e voz falada (em kbps)
  let assumedBitrateKbps = 96; // Média padrão para voz

  if (['m4b', 'm4a', 'aac', 'mp4a'].includes(ext)) {
    assumedBitrateKbps = 64; // AAC / M4B em audiolivros costuma usar 64kbps mono/stereo otimizado
  } else if (['opus', 'ogg', 'oga'].includes(ext)) {
    assumedBitrateKbps = 48; // Opus comprime voz com altíssima fidelidade a 48-64kbps
  } else if (['flac'].includes(ext)) {
    assumedBitrateKbps = 400; // FLAC comprimido
  } else if (['wav'].includes(ext)) {
    assumedBitrateKbps = 705; // WAV PCM mono 16-bit 44.1kHz (~705 kbps)
  } else if (['wma'].includes(ext)) {
    assumedBitrateKbps = 64;
  } else if (['mp3'].includes(ext)) {
    assumedBitrateKbps = 96; // 96 kbps é o ponto ideal de equilíbrio para áudio-leituras e audiolivros
  }

  // Duração = (Bytes * 8 bits) / (bps)
  const durationSeconds = Math.round((fileSizeBytes * 8) / (assumedBitrateKbps * 1000));
  return Math.max(1, durationSeconds);
}

export function formatSecondsToDurationString(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function parseDurationStringToSeconds(durationStr?: string): number {
  if (!durationStr || !durationStr.trim()) return 0;
  const parts = durationStr.trim().split(':').map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

export function formatTotalBookDuration(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0 min';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);

  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins} min`;
}

export function getOrEstimateAudioDurationString(
  audio: { size?: number; extension?: string; mimeType?: string; duration?: number },
  existingDuration?: string
): string {
  // Se o capítulo já tem uma duração válida que não seja os placeholders legados
  if (existingDuration && existingDuration !== '20:00' && existingDuration !== '25:00' && existingDuration !== '00:00') {
    return existingDuration;
  }
  // Se o arquivo possui duração nativa em segundos
  if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
    return formatSecondsToDurationString(audio.duration);
  }
  // Estimativa pelo tamanho do arquivo
  const estSec = estimateAudioDurationSeconds(audio.size || 0, audio.extension || audio.mimeType);
  return formatSecondsToDurationString(estSec);
}

/**
 * Extrai a duração total de um livro em segundos de forma resiliente,
 * analisando totalDuration ("1h 30m", "45 min", "1:30:00", etc.) ou
 * somando a duração dos seus capítulos.
 */
export function getBookTotalSeconds(book: { totalDuration?: string; chapters?: Array<{ duration?: string }> }): number {
  if (!book) return 0;

  // 1. Se tem totalDuration formatado em texto
  if (book.totalDuration && book.totalDuration.trim()) {
    const raw = book.totalDuration.trim();
    // Padrão "Xh Ym", "X h", "Y min", "Y m"
    const matchHours = raw.match(/(\d+)\s*h(?:oras?)?/i);
    const matchMins = raw.match(/(\d+)\s*m(?:in(?:utos?)?)?/i);
    const matchSecs = raw.match(/(\d+)\s*s(?:eg(?:undos?)?)?/i);
    if (matchHours || matchMins || matchSecs) {
      const h = matchHours ? parseInt(matchHours[1], 10) : 0;
      const m = matchMins ? parseInt(matchMins[1], 10) : 0;
      const s = matchSecs ? parseInt(matchSecs[1], 10) : 0;
      const sec = h * 3600 + m * 60 + s;
      if (sec > 0) return sec;
    }
    // Padrão com dois pontos "HH:MM:SS" ou "MM:SS"
    if (raw.includes(':')) {
      const sec = parseDurationStringToSeconds(raw);
      if (sec > 0) return sec;
    }
  }

  // 2. Se o livro tem capítulos, soma a duração de cada capítulo
  if (book.chapters && Array.isArray(book.chapters) && book.chapters.length > 0) {
    const chapterSeconds = book.chapters.reduce((acc, chap) => {
      if (chap.duration && chap.duration.trim()) {
        const sec = parseDurationStringToSeconds(chap.duration);
        if (sec > 0) return acc + sec;
      }
      return acc;
    }, 0);
    if (chapterSeconds > 0) return chapterSeconds;
  }

  return 0;
}


