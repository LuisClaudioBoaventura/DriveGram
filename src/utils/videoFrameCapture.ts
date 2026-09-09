/**
 * videoFrameCapture.ts
 * 
 * Utilitário universal para extração e geração de thumbnail a partir do frame
 * central (50% da duração) de um arquivo de vídeo via HTML5 Video e Canvas.
 * 
 * Funciona nativamente tanto no Windows Desktop (WebView2) quanto no Android (Capacitor WebView).
 */

export async function captureVideoMidFrame(videoUrl: string, targetPercent = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('Canvas/DOM não disponível no ambiente atual'));
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let hasCleanedUp = false;

    const cleanup = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.onabort = null;
      video.pause();
      video.removeAttribute('src');
      video.load();
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout ao tentar extrair frame do vídeo (limite de 12s atingido)'));
    }, 12000);

    video.onloadedmetadata = () => {
      const dur = video.duration;
      if (!dur || isNaN(dur) || dur <= 0) {
        // Se a duração não foi reportada, busca o frame no primeiro segundo
        video.currentTime = 1;
        return;
      }
      // Meio do vídeo (50% da duração)
      const seekTarget = Math.max(1, Math.min(dur - 2, dur * targetPercent));
      video.currentTime = seekTarget;
    };

    video.onseeked = () => {
      try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 360;

        // Mantém a proporção com largura máxima razoável para card (640px)
        const scale = Math.min(1, 640 / vw);
        const targetWidth = Math.round(vw * scale);
        const targetHeight = Math.round(vh * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          return reject(new Error('Não foi possível obter o contexto 2D do canvas'));
        }

        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        cleanup();
        resolve(dataUrl);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Falha ao carregar o vídeo para captura do frame'));
    };

    video.src = videoUrl;
  });
}
