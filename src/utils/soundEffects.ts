/**
 * soundEffects.ts
 * Sistema de efeitos sonoros sintéticos via Web Audio API para o DriveGram.
 * 100% offline, zero dependências externas, latência ultrabaixa e compatível com Desktop e Mobile.
 */

export type UploadSoundOption = 
  | 'chime' 
  | 'success' 
  | 'bell' 
  | 'marimba' 
  | 'futuristic' 
  | 'complete' 
  | 'arcade' 
  | 'none';

export interface UploadSoundDefinition {
  id: UploadSoundOption;
  name: string;
  description: string;
  badge?: string;
  iconName?: string;
}

export const UPLOAD_SOUND_OPTIONS: UploadSoundDefinition[] = [
  {
    id: 'chime',
    name: 'Chime Cristalino',
    description: 'Toque melódico suave ascendente, cristalino e moderno',
    badge: 'Recomendado'
  },
  {
    id: 'success',
    name: 'Sucesso Pop',
    description: 'Arpejo triunfante harmônico, rápido e satisfatório',
    badge: 'Popular'
  },
  {
    id: 'bell',
    name: 'Sino Suave',
    description: 'Ressonância cristalina com decay longo e elegante'
  },
  {
    id: 'marimba',
    name: 'Marimba Acústica',
    description: 'Toque percussivo amadeirado orgânico, acolhedor e sutil'
  },
  {
    id: 'futuristic',
    name: 'Futurista / Cyber',
    description: 'Bips eletrônicos modernos com modulação suave estilo sci-fi'
  },
  {
    id: 'complete',
    name: 'Acorde Relaxante',
    description: 'Acorde maior harmônico e calmo com ressonância calorosa'
  },
  {
    id: 'arcade',
    name: 'Arcade Level-Up',
    description: 'Toque retrô 8-bit alegre estilo conquista nostálgica'
  },
  {
    id: 'none',
    name: 'Silencioso (Desativado)',
    description: 'Nenhum som será reproduzido ao concluir os envios'
  }
];

const STORAGE_KEY_SOUND = 'drivegram_upload_sound';
const STORAGE_KEY_ENABLED = 'drivegram_upload_sound_enabled';
const STORAGE_KEY_VOLUME = 'drivegram_upload_sound_volume';

export function getSelectedUploadSound(): UploadSoundOption {
  if (typeof window === 'undefined') return 'chime';
  const saved = localStorage.getItem(STORAGE_KEY_SOUND) as UploadSoundOption;
  if (saved && UPLOAD_SOUND_OPTIONS.some(o => o.id === saved)) {
    return saved;
  }
  return 'chime';
}

export function setSelectedUploadSound(sound: UploadSoundOption): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SOUND, sound);
  window.dispatchEvent(new CustomEvent('drivegram_upload_sound_changed', { detail: { sound } }));
}

export function isUploadSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
}

export function setUploadSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('drivegram_upload_sound_changed', { detail: { enabled } }));
}

export function getUploadSoundVolume(): number {
  if (typeof window === 'undefined') return 0.7;
  const val = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME) || '0.7');
  return isNaN(val) ? 0.7 : Math.max(0, Math.min(1, val));
}

export function setUploadSoundVolume(volume: number): void {
  if (typeof window === 'undefined') return;
  const clamped = Math.max(0, Math.min(1, volume));
  localStorage.setItem(STORAGE_KEY_VOLUME, clamped.toString());
  window.dispatchEvent(new CustomEvent('drivegram_upload_sound_changed', { detail: { volume: clamped } }));
}

let sharedAudioContext: AudioContext | null = null;

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function playTone(
  ctx: AudioContext, 
  freq: number, 
  startTime: number, 
  duration: number, 
  vol: number, 
  type: OscillatorType = 'sine'
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playPercussiveTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  vol: number
) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 3, startTime);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(vol * 0.15, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  osc2.connect(gain2);
  gain2.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc2.start(startTime);
  osc.stop(startTime + duration + 0.05);
  osc2.stop(startTime + duration + 0.05);
}

function playSweepTone(
  ctx: AudioContext,
  startFreq: number,
  endFreq: number,
  startTime: number,
  duration: number,
  vol: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0001), startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function play8BitTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  vol: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, startTime);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1800, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol * 0.5, 0.0001), startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

function playWarmPad(
  ctx: AudioContext,
  freqs: number[],
  startTime: number,
  duration: number,
  vol: number
) {
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1400, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(vol / freqs.length, 0.0001), startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  gain.connect(filter);
  filter.connect(ctx.destination);

  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    osc.connect(gain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  });
}

/**
 * Toca o efeito sonoro especificado.
 * Pode ser chamado diretamente para prévias e testes.
 */
export function playSoundEffect(soundId: UploadSoundOption, customVolume?: number): void {
  if (soundId === 'none') return;
  const enabled = isUploadSoundEnabled();
  if (!enabled && customVolume === undefined) return;

  const ctx = getOrCreateAudioContext();
  if (!ctx) return;

  const baseVolume = customVolume !== undefined ? customVolume : getUploadSoundVolume();
  if (baseVolume <= 0) return;

  const now = ctx.currentTime;

  try {
    switch (soundId) {
      case 'chime': {
        playTone(ctx, 1046.5, now, 0.25, baseVolume * 0.8, 'sine');
        playTone(ctx, 1318.5, now + 0.09, 0.45, baseVolume * 0.9, 'sine');
        playTone(ctx, 2093.0, now + 0.09, 0.2, baseVolume * 0.2, 'sine');
        break;
      }
      case 'success': {
        playTone(ctx, 783.99, now, 0.12, baseVolume * 0.6, 'triangle');
        playTone(ctx, 1046.5, now + 0.08, 0.15, baseVolume * 0.75, 'triangle');
        playTone(ctx, 1318.51, now + 0.16, 0.45, baseVolume * 0.9, 'triangle');
        playTone(ctx, 1318.51, now + 0.16, 0.35, baseVolume * 0.3, 'sine');
        break;
      }
      case 'bell': {
        playTone(ctx, 880.0, now, 0.9, baseVolume * 0.85, 'sine');
        playTone(ctx, 1760.0, now + 0.005, 0.6, baseVolume * 0.3, 'sine');
        playTone(ctx, 2489.0, now + 0.01, 0.4, baseVolume * 0.15, 'sine');
        break;
      }
      case 'marimba': {
        playPercussiveTone(ctx, 523.25, now, 0.18, baseVolume * 0.85);
        playPercussiveTone(ctx, 783.99, now + 0.11, 0.35, baseVolume * 0.9);
        break;
      }
      case 'futuristic': {
        playSweepTone(ctx, 587.33, 880.0, now, 0.07, baseVolume * 0.7);
        playSweepTone(ctx, 880.0, 1318.5, now + 0.09, 0.12, baseVolume * 0.85);
        break;
      }
      case 'complete': {
        playWarmPad(ctx, [523.25, 659.25, 783.99], now, 0.7, baseVolume * 0.7);
        break;
      }
      case 'arcade': {
        play8BitTone(ctx, 523.25, now, 0.06, baseVolume * 0.6);
        play8BitTone(ctx, 659.25, now + 0.06, 0.06, baseVolume * 0.65);
        play8BitTone(ctx, 783.99, now + 0.12, 0.06, baseVolume * 0.7);
        play8BitTone(ctx, 1046.5, now + 0.18, 0.25, baseVolume * 0.8);
        break;
      }
    }
  } catch (err) {
    console.warn('[SoundEffects] Erro ao reproduzir som de upload:', err);
  }
}

let lastSoundPlayTime = 0;

/**
 * Disparado automaticamente na conclusão de um ou mais uploads.
 * Possui throttle de 600ms para evitar distorção ou sobreposição em uploads em massa.
 */
export function triggerUploadCompleteSound(): void {
  const now = Date.now();
  if (now - lastSoundPlayTime < 600) return;
  lastSoundPlayTime = now;

  if (!isUploadSoundEnabled()) return;
  const currentSound = getSelectedUploadSound();
  playSoundEffect(currentSound);
}
