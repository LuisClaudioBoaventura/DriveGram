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
 * somando prioritariamente a duração de cada capítulo/áudio individual
 * (com estimativa a partir de allFiles caso necessário) ou analisando totalDuration.
 */
export function getBookTotalSeconds(
  book: { totalDuration?: string; chapters?: Array<{ duration?: string; fileId?: string }> },
  allFiles?: Array<{ id: string; size?: number; extension?: string; mimeType?: string; duration?: number }>
): number {
  if (!book) return 0;

  // 1. Se o livro possui capítulos individuais (áudios separados), soma os tempos individuais
  if (book.chapters && Array.isArray(book.chapters) && book.chapters.length > 0) {
    let chapterSeconds = 0;
    let validCount = 0;

    for (const chap of book.chapters) {
      // Duração válida já gravada no capítulo (ignorando placeholders legados '20:00' e '25:00')
      if (chap.duration && chap.duration.trim() && chap.duration !== '20:00' && chap.duration !== '25:00' && chap.duration !== '00:00') {
        const sec = parseDurationStringToSeconds(chap.duration);
        if (sec > 0) {
          chapterSeconds += sec;
          validCount++;
          continue;
        }
      }

      // Se temos allFiles e o capítulo possui fileId, extrai a duração ou estima pelo tamanho
      if (allFiles && chap.fileId) {
        const file = allFiles.find(f => f.id === chap.fileId);
        if (file) {
          if (file.duration && file.duration > 0) {
            chapterSeconds += file.duration;
            validCount++;
            continue;
          }
          if (file.size && file.size > 0) {
            const estSec = estimateAudioDurationSeconds(file.size, file.extension || file.mimeType);
            if (estSec > 0) {
              chapterSeconds += estSec;
              validCount++;
              continue;
            }
          }
        }
      }

      // Fallback: se havia duração definida no capítulo, usa como última alternativa
      if (chap.duration && chap.duration.trim()) {
        const sec = parseDurationStringToSeconds(chap.duration);
        if (sec > 0) {
          chapterSeconds += sec;
          validCount++;
        }
      }
    }

    if (validCount > 0 && chapterSeconds > 0) {
      return chapterSeconds;
    }
  }

  // 2. Se o livro não tem capítulos individuais com duração, analisa o totalDuration textual
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

  return 0;
}


