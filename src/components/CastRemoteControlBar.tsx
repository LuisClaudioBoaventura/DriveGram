import React from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, 
  Square, Cast, Tv, Wifi 
} from 'lucide-react';
import { CastDevice, CastPlaybackState } from '../types/index.js';

interface CastRemoteControlBarProps {
  device: CastDevice | null;
  state: CastPlaybackState | null;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number) => void;
  onForward: (offset?: number) => void;
  onRewind: (offset?: number) => void;
  onVolume: (vol: number) => void;
  onStop: () => void;
  mediaTitle?: string;
}

export const CastRemoteControlBar: React.FC<CastRemoteControlBarProps> = ({
  device,
  state,
  onPlay,
  onPause,
  onSeek,
  onForward,
  onRewind,
  onVolume,
  onStop,
  mediaTitle
}) => {
  const isPlaying = state?.isPlaying ?? true;
  const currentTime = state?.currentTime ?? 0;
  const duration = state?.duration ?? 0;
  const volume = state?.volume ?? 1;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-gray-950/90 dark:bg-gray-900/95 backdrop-blur-md border border-sky-500/40 rounded-3xl shadow-2xl p-3 sm:p-4 text-white flex flex-col gap-2.5 animate-slide-up">
      {/* Top row: Status info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            {device?.type === 'chromecast' ? <Cast className="w-4 h-4" /> : <Tv className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sky-400 text-xs block truncate">
              {device?.name || 'DriveGram TV Player'}
            </span>
            <span className="text-[11px] text-gray-400 truncate block max-w-xs">
              {mediaTitle || state?.title || 'Transmitindo mídia'}
            </span>
          </div>
        </div>

        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
          title="Parar transmissão na TV"
        >
          <Square className="w-3 h-3" />
          <span>Desconectar</span>
        </button>
      </div>

      {/* Progress Bar (if duration exists) */}
      {duration > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
          <span>{formatTime(duration)}</span>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800/80">
        <div className="flex items-center gap-2">
          {/* Rewind 10s */}
          <button
            onClick={() => onRewind(10)}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 transition-colors"
            title="Voltar 10s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className="p-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-gray-950 font-bold shadow-lg shadow-sky-500/30 transition-all active:scale-95"
            title={isPlaying ? 'Pausar na TV' : 'Reproduzir na TV'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => onForward(10)}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-200 transition-colors"
            title="Avançar 10s"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVolume(volume > 0 ? 0 : 1)}
            className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="w-16 sm:w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>
      </div>
    </div>
  );
};
