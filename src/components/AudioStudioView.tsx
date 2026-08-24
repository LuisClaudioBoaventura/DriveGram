import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  Circle, 
  Edit3, 
  Trash2, 
  Headphones, 
  Music2, 
  Mic, 
  Clock, 
  Moon, 
  BookmarkPlus, 
  FileText, 
  ListOrdered, 
  Plus, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Image as ImageIcon, 
  Disc,
  Upload,
  Send,
  CloudDownload,
  CloudUpload,
  Loader2,
  ShieldCheck,
  RefreshCw,
  Minimize2
} from 'lucide-react';
import { AudioShow, AudioTrack, DriveItem, VideoTimestamp } from '../types/index.js';

interface AudioStudioViewProps {
  audioShow: AudioShow;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateAudioShow: (updated: AudioShow) => Promise<void>;
  onDeleteAudioShow: (id: string) => void;
  onToggleTrackCompletion: (trackId: string) => Promise<void>;
  onUpdateTrackProgress: (trackId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
  initialTrackIndex?: number;
  onRefreshSinglePodcast?: (showId: string) => Promise<{ success: boolean; newEpisodesCount: number; show?: any }>;
  onMinimizeToFloating?: () => void;
  // Global Audio Playback bindings
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  playbackRate?: number;
  volume?: number;
  isMuted?: boolean;
  activeTrackIndex?: number;
  onTogglePlay?: () => void;
  onSeek?: (seconds: number) => void;
  onSkip?: (seconds: number) => void;
  onSpeedChange?: (speed: number) => void;
  onVolumeChange?: (volume: number) => void;
  onToggleMute?: () => void;
  onPlayNextTrack?: () => void;
  onPlayPreviousTrack?: () => void;
  onSelectTrackIndex?: (index: number) => void;
}

export const AudioStudioView: React.FC<AudioStudioViewProps> = ({
  audioShow,
  allFiles,
  onBackToCatalog,
  onUpdateAudioShow,
  onDeleteAudioShow,
  onToggleTrackCompletion,
  onUpdateTrackProgress,
  onOpenEditModal,
  initialTrackIndex,
  onRefreshSinglePodcast,
  onMinimizeToFloating,
  isPlaying: isPlayingProp,
  currentTime: currentTimeProp,
  duration: durationProp,
  playbackRate: playbackRateProp,
  volume: volumeProp,
  isMuted: isMutedProp,
  activeTrackIndex: activeTrackIndexProp,
  onTogglePlay: onTogglePlayProp,
  onSeek: onSeekProp,
  onSkip: onSkipProp,
  onSpeedChange: onSpeedChangeProp,
  onVolumeChange: onVolumeChangeProp,
  onToggleMute: onToggleMuteProp,
  onPlayNextTrack: onPlayNextTrackProp,
  onPlayPreviousTrack: onPlayPreviousTrackProp,
  onSelectTrackIndex: onSelectTrackIndexProp
}) => {
  const [localTrackIndex, setLocalTrackIndex] = useState(initialTrackIndex !== undefined ? initialTrackIndex : 0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isAutoPlayNext, setIsAutoPlayNext] = useState(true);
  const [localPlaybackRate, setLocalPlaybackRate] = useState(1);
  const [localVolume, setLocalVolume] = useState(1);
  const [localIsMuted, setLocalIsMuted] = useState(false);

  const isPlaying = isPlayingProp !== undefined ? isPlayingProp : localIsPlaying;
  const currentTime = currentTimeProp !== undefined ? currentTimeProp : localCurrentTime;
  const duration = durationProp !== undefined ? durationProp : localDuration;
  const playbackRate = playbackRateProp !== undefined ? playbackRateProp : localPlaybackRate;
  const volume = volumeProp !== undefined ? volumeProp : localVolume;
  const isMuted = isMutedProp !== undefined ? isMutedProp : localIsMuted;
  const currentTrackIndex = activeTrackIndexProp !== undefined ? activeTrackIndexProp : localTrackIndex;

  // Backup Telegram States
  const [backingUpTrackIds, setBackingUpTrackIds] = useState<string[]>([]);
  const [isBackingUpAll, setIsBackingUpAll] = useState<boolean>(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Podcast Refresh State
  const [isRefreshingPodcast, setIsRefreshingPodcast] = useState<boolean>(false);

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  // Collapsible Tracks Sidebar state
  const [isTracksSidebarOpen, setIsTracksSidebarOpen] = useState<boolean>(true);

  // Active Tab for details (Timestamps vs Notes)
  const [activeTab, setActiveTab] = useState<'timestamps' | 'notes'>('timestamps');
  const [trackNotes, setTrackNotes] = useState('');
  const [newBookmarkLabel, setNewBookmarkLabel] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Editing Show Header state
  const [isEditingShow, setIsEditingShow] = useState(false);
  const [titleInput, setTitleInput] = useState(audioShow.title);
  const [artistInput, setArtistInput] = useState(audioShow.artist || audioShow.host || '');

  // Cover image modal state
  const [isChangingCover, setIsChangingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState(audioShow.coverImage || '');
  const coverInputRef = useRef<HTMLInputElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  const tracks = audioShow.tracks || [];
  const activeTrack: AudioTrack | undefined = tracks[currentTrackIndex];
  const activeFile = activeTrack?.fileId ? allFiles.find(f => f.id === activeTrack.fileId) : null;

  // Sync notes when active track changes
  useEffect(() => {
    if (activeTrack) {
      setTrackNotes(activeTrack.notes || '');
      if (activeTrack.lastPositionSeconds && activeTrack.lastPositionSeconds > 0 && currentTime === 0) {
        if (onSeekProp) {
          onSeekProp(activeTrack.lastPositionSeconds);
        } else {
          setLocalCurrentTime(activeTrack.lastPositionSeconds);
          if (audioRef.current) {
            audioRef.current.currentTime = activeTrack.lastPositionSeconds;
          }
        }
      }
    }
  }, [activeTrack?.id]);

  // Sleep timer interval
  useEffect(() => {
    let interval: any;
    if (sleepTimerRemainingSeconds !== null && sleepTimerRemainingSeconds > 0) {
      interval = setInterval(() => {
        setSleepTimerRemainingSeconds(prev => {
          if (prev && prev <= 1) {
            if (onTogglePlayProp && isPlaying) {
              onTogglePlayProp();
            } else if (audioRef.current) {
              audioRef.current.pause();
              setLocalIsPlaying(false);
            }
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sleepTimerRemainingSeconds, isPlaying, onTogglePlayProp]);

  const handleSetSleepTimer = (minutes: number) => {
    if (minutes === 0) {
      setSleepTimerMinutes(null);
      setSleepTimerRemainingSeconds(null);
    } else {
      setSleepTimerMinutes(minutes);
      setSleepTimerRemainingSeconds(minutes * 60);
    }
    setShowSleepMenu(false);
  };

  // Handle Play/Pause
  const togglePlay = () => {
    if (onTogglePlayProp) {
      onTogglePlayProp();
      return;
    }
    if (!audioRef.current) return;
    if (localIsPlaying) {
      audioRef.current.pause();
      setLocalIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setLocalIsPlaying(true)).catch(() => {});
    }
  };

  const playTrackByIndex = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      if (onSelectTrackIndexProp) {
        onSelectTrackIndexProp(index);
        return;
      }
      setLocalTrackIndex(index);
      setLocalIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.playbackRate = playbackRate;
            audioRef.current.play().then(() => setLocalIsPlaying(true)).catch(() => {});
          }
        }, 100);
      }
    }
  };

  const handleNextTrack = () => {
    if (onPlayNextTrackProp) {
      onPlayNextTrackProp();
      return;
    }
    if (tracks.length === 0) return;
    if (isShuffle) {
      const randomIdx = Math.floor(Math.random() * tracks.length);
      playTrackByIndex(randomIdx);
    } else if (currentTrackIndex < tracks.length - 1) {
      playTrackByIndex(currentTrackIndex + 1);
    } else if (isRepeat) {
      playTrackByIndex(0);
    }
  };

  const handlePrevTrack = () => {
    if (onPlayPreviousTrackProp) {
      onPlayPreviousTrackProp();
      return;
    }
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (currentTrackIndex > 0) {
      playTrackByIndex(currentTrackIndex - 1);
    }
  };

  const handleSkip = (seconds: number) => {
    if (onSkipProp) {
      onSkipProp(seconds);
      return;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration || 1000, audioRef.current.currentTime + seconds));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setLocalCurrentTime(curr);
    if (audioRef.current.duration) {
      setLocalDuration(audioRef.current.duration);
    }
    if (activeTrack && Math.floor(curr) % 5 === 0 && curr > 0) {
      onUpdateTrackProgress(activeTrack.id, Math.floor(curr), false);
    }
  };

  const handleTrackEnded = () => {
    if (activeTrack) {
      onUpdateTrackProgress(activeTrack.id, 0, true);
    }
    if (isAutoPlayNext) {
      handleNextTrack();
    } else {
      setLocalIsPlaying(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (onSeekProp) {
      onSeekProp(val);
      return;
    }
    setLocalCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (onSpeedChangeProp) {
      onSpeedChangeProp(speed);
      return;
    }
    setLocalPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (onVolumeChangeProp) {
      onVolumeChangeProp(val);
      return;
    }
    setLocalVolume(val);
    setLocalIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val > 0 && isMuted) {
        setLocalIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const handleToggleMute = () => {
    if (onToggleMuteProp) {
      onToggleMuteProp();
      return;
    }
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setLocalIsMuted(nextMuted);
    audioRef.current.muted = nextMuted;
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ---------------- TELEGRAM BACKUP HANDLERS ----------------
  const handleBackupTrackToTelegram = async (track: AudioTrack) => {
    if (!track || track.fileId) return;
    setBackingUpTrackIds(prev => [...prev, track.id]);
    setBackupSuccessMessage(null);

    try {
      const payload = JSON.stringify({
        showId: audioShow.id,
        trackId: track.id,
        audioUrl: track.audioUrl,
        title: track.title,
        folderId: audioShow.folderId
      });

      let res = await fetch('/api/podcasts/backup-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/audio-shows/backup-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.updatedShow) {
          await onUpdateAudioShow(data.updatedShow);
        }
        setBackupSuccessMessage(`Episódio "${track.title}" salvo no Telegram e pasta criada no Meu Drive!`);
        setTimeout(() => setBackupSuccessMessage(null), 5000);
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        alert(err.error || 'Erro ao realizar backup no Telegram. Verifique se o servidor backend está em execução.');
      }
    } catch (e) {
      console.error('Error backing up to Telegram:', e);
      alert('Falha ao conectar com o serviço de backup.');
    } finally {
      setBackingUpTrackIds(prev => prev.filter(id => id !== track.id));
    }
  };

  const handleBackupAllToTelegram = async () => {
    const unbackedTracks = tracks.filter(t => t.audioUrl && !t.fileId);
    if (unbackedTracks.length === 0) {
      alert('Todos os episódios já estão salvos no Telegram!');
      return;
    }

    setIsBackingUpAll(true);
    setBackupSuccessMessage(null);

    try {
      const payload = JSON.stringify({ showId: audioShow.id });

      let res = await fetch('/api/podcasts/backup-all-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/audio-shows/backup-all-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.updatedShow) {
          await onUpdateAudioShow(data.updatedShow);
        }
        setBackupSuccessMessage(`Backup concluído! ${data.backedUpCount || unbackedTracks.length} episódios salvos no Telegram.`);
        setTimeout(() => setBackupSuccessMessage(null), 6000);
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        alert(err.error || 'Erro ao realizar backup em lote no Telegram. Verifique se o servidor backend está em execução.');
      }
    } catch (e) {
      console.error('Error backing up all to Telegram:', e);
      alert('Falha ao conectar com o serviço de backup.');
    } finally {
      setIsBackingUpAll(false);
    }
  };

  // ---------------- TIMESTAMPS / MARCADORES HANDLERS ----------------
  const handleAddTimestamp = async (customLabel?: string) => {
    if (!activeTrack) return;
    const currentSec = Math.floor(currentTime);
    const formatted = formatTime(currentSec);
    const label = customLabel || newBookmarkLabel.trim() || `Marcador em ${formatted}`;

    const newTs: VideoTimestamp = {
      id: 'ts-audio-' + Date.now(),
      seconds: currentSec,
      timeFormatted: formatted,
      label
    };

    const currentTs = activeTrack.timestamps || [];
    const updatedTs = [...currentTs, newTs].sort((a, b) => a.seconds - b.seconds);

    const updatedTracks = tracks.map(t => 
      t.id === activeTrack.id ? { ...t, timestamps: updatedTs } : t
    );

    await onUpdateAudioShow({ ...audioShow, tracks: updatedTracks });
    setNewBookmarkLabel('');
  };

  const handleSeekTimestamp = (sec: number, trackIndex?: number) => {
    if (trackIndex !== undefined && trackIndex !== currentTrackIndex) {
      playTrackByIndex(trackIndex);
      setTimeout(() => {
        if (onSeekProp) {
          onSeekProp(sec);
        } else if (audioRef.current) {
          audioRef.current.currentTime = sec;
          audioRef.current.play().catch(() => {});
          setLocalIsPlaying(true);
        }
      }, 150);
      return;
    }

    if (onSeekProp) {
      onSeekProp(sec);
      if (!isPlaying && onTogglePlayProp) {
        onTogglePlayProp();
      }
    } else if (audioRef.current) {
      audioRef.current.currentTime = sec;
      audioRef.current.play().catch(() => {});
      setLocalIsPlaying(true);
    }
  };

  const handleDeleteTimestamp = async (tsId: string, trackId = activeTrack?.id) => {
    if (!trackId) return;
    const targetTrack = tracks.find(t => t.id === trackId);
    if (!targetTrack) return;

    const updatedTs = (targetTrack.timestamps || []).filter(t => t.id !== tsId);
    const updatedTracks = tracks.map(t => 
      t.id === trackId ? { ...t, timestamps: updatedTs } : t
    );
    await onUpdateAudioShow({ ...audioShow, tracks: updatedTracks });
  };

  // ---------------- NOTES HANDLER ----------------
  const handleSaveTrackNotes = async () => {
    if (!activeTrack) return;
    setIsSavingNotes(true);
    const updatedTracks = tracks.map(t => 
      t.id === activeTrack.id ? { ...t, notes: trackNotes } : t
    );
    await onUpdateAudioShow({ ...audioShow, tracks: updatedTracks });
    setTimeout(() => setIsSavingNotes(false), 500);
  };

  const isAllTracksCompleted = tracks.length > 0 && tracks.every(t => t.isCompleted);
  const completedTracksCount = tracks.filter(t => t.isCompleted).length;
  const progressPercent = tracks.length > 0 ? Math.round((completedTracksCount / tracks.length) * 100) : 0;

  const totalSavedInTelegram = tracks.filter(t => t.fileId).length;
  const hasUnsavedTracks = tracks.some(t => t.audioUrl && !t.fileId);

  const handleToggleAllTracks = async () => {
    const nextCompleted = !isAllTracksCompleted;
    const updatedTracks = tracks.map(t => ({ ...t, isCompleted: nextCompleted }));
    await onUpdateAudioShow({ ...audioShow, tracks: updatedTracks });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-drive-lightBg dark:bg-drive-darkBg overflow-hidden text-gray-900 dark:text-gray-100 select-none">
      {/* Hidden Audio Player (fallback only if global audio player is not provided) */}
      {!onTogglePlayProp && (activeTrack?.audioUrl || activeFile) && (
        <audio
          ref={audioRef}
          key={activeTrack ? `track-audio-${activeTrack.id}-${currentTrackIndex}` : (activeFile ? activeFile.id : 'audio-player')}
          src={activeTrack?.audioUrl || (activeFile ? `/api/stream/${activeFile.id}` : undefined)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => setLocalDuration((e.target as HTMLAudioElement).duration || 0)}
          onEnded={handleTrackEnded}
          onPlay={() => setLocalIsPlaying(true)}
          onPause={() => setLocalIsPlaying(false)}
        />
      )}

      {/* Top Navbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-2 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 shrink-0 h-13">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Back Button */}
          <button
            onClick={onBackToCatalog}
            className="p-2 rounded-xl bg-gray-100/90 hover:bg-gray-200 dark:bg-gray-900/90 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-gray-200/80 dark:border-gray-800 transition-all active:scale-95 shadow-xs shrink-0"
            title="Voltar para Músicas & Podcasts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Mark All as Completed Toggle */}
          <button
            onClick={handleToggleAllTracks}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 border ${
              isAllTracksCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                : 'bg-gray-100/90 dark:bg-gray-900/90 text-gray-600 dark:text-gray-300 border-gray-200/80 dark:border-gray-800 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
            title={isAllTracksCompleted ? 'Coleção marcada como concluída (Clique para desmarcar)' : 'Marcar todas as faixas como concluídas'}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAllTracksCompleted ? 'Concluído' : 'Concluir'}</span>
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block shrink-0" />

          {/* Inline Edit Header or Display */}
          {isEditingShow ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Título do Álbum/Podcast"
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-50 dark:bg-drive-darkBg border border-emerald-500 focus:outline-none"
              />
              <input
                type="text"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                placeholder="Artista / Apresentador"
                className="px-2.5 py-1 text-xs rounded-lg bg-gray-50 dark:bg-drive-darkBg border border-emerald-500 focus:outline-none"
              />
              <button 
                onClick={async () => {
                  await onUpdateAudioShow({
                    ...audioShow,
                    title: titleInput.trim() || audioShow.title,
                    artist: artistInput.trim() || audioShow.artist,
                    host: artistInput.trim() || audioShow.host
                  });
                  setIsEditingShow(false);
                }} 
                className="p-1 rounded bg-emerald-600 text-white"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setIsEditingShow(false)} className="p-1 rounded text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 truncate">
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {audioShow.title}
              </h1>
              {(audioShow.artist || audioShow.host) && (
                <span className="text-xs text-gray-400 hidden md:inline truncate">
                  • {audioShow.artist || audioShow.host}
                </span>
              )}
              <button
                onClick={() => {
                  setTitleInput(audioShow.title);
                  setArtistInput(audioShow.artist || audioShow.host || '');
                  setIsEditingShow(true);
                }}
                className="p-1 text-gray-400 hover:text-emerald-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Editar Título e Artista"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setCoverUrlInput(audioShow.coverImage || '');
                  setIsChangingCover(true);
                }}
                className="p-1 text-gray-400 hover:text-emerald-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Trocar Capa"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Backup Telegram Quick Action Button */}
          {hasUnsavedTracks ? (
            <button
              onClick={handleBackupAllToTelegram}
              disabled={isBackingUpAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95 disabled:opacity-50"
              title="Salvar todos os episódios no Telegram com 1 clique"
            >
              {isBackingUpAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Salvando no Telegram...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Backup Telegram</span>
                </>
              )}
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Salvo no Telegram ({totalSavedInTelegram})</span>
            </div>
          )}

          {onMinimizeToFloating && (
            <button
              onClick={onMinimizeToFloating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100/90 hover:bg-gray-200 dark:bg-gray-900/90 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-emerald-500 border border-gray-200/80 dark:border-gray-800 text-xs font-bold transition-all shadow-xs"
              title="Minimizar para Disco de Vinil Flutuante e explorar outras pastas"
            >
              <Disc className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="hidden sm:inline">Janela Flutuante</span>
            </button>
          )}

          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Editar</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Excluir "${audioShow.title}"?`)) {
                onDeleteAudioShow(audioShow.id);
                onBackToCatalog();
              }
            }}
            className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Excluir Coleção"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Backup Success Toast Notification */}
      {backupSuccessMessage && (
        <div className="bg-sky-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span>{backupSuccessMessage}</span>
          </div>
          <button onClick={() => setBackupSuccessMessage(null)} className="text-white/80 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-y-auto">
        {/* Main Content / Studio Player */}
        <div className="flex-1 flex flex-col lg:overflow-y-auto p-4 sm:p-6 space-y-6 shrink-0 lg:shrink">
          <div className={`w-full transition-all duration-300 ${
            isTracksSidebarOpen ? 'max-w-3xl mx-auto space-y-6' : 'max-w-5xl mx-auto space-y-6'
          }`}>
            {/* Main Audio Studio Card */}
            <div className={`p-6 sm:p-8 bg-gradient-to-b from-emerald-950/50 via-teal-950/40 to-slate-950 rounded-3xl border border-emerald-800/40 shadow-2xl text-white transition-all ${
              !isTracksSidebarOpen ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-center' : 'flex flex-col items-center justify-center'
            }`}>
              {/* Left / Cover Section */}
              <div className={`flex flex-col items-center justify-center ${!isTracksSidebarOpen ? 'lg:col-span-5' : ''}`}>
                {/* Cover Art */}
                <div 
                  onClick={() => {
                    setCoverUrlInput(audioShow.coverImage || '');
                    setIsChangingCover(true);
                  }}
                  className="relative mb-5 group cursor-pointer"
                  title="Clique para trocar a capa"
                >
                  <div className={`rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 transition-all duration-700 ${
                    !isTracksSidebarOpen ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-52 h-52'
                  } ${isPlaying ? 'ring-8 ring-emerald-500/20 scale-105 shadow-emerald-500/20 shadow-2xl' : 'grayscale-[15%]'}`}>
                    <img
                      src={audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                      alt={audioShow.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                      <ImageIcon className="w-6 h-6 text-emerald-400" />
                      <span>Trocar Capa</span>
                    </div>
                  </div>
                </div>

                {/* Title & Artist Info */}
                <div className="text-center max-w-sm w-full mb-3">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">
                    {audioShow.title}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {activeTrack?.title || 'Selecione uma faixa'}
                  </h2>
                  {(activeTrack?.artist || audioShow.artist || audioShow.host) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {activeTrack?.artist || audioShow.artist || audioShow.host}
                      {activeFile && ` • .${activeFile.extension?.toUpperCase()}`}
                    </p>
                  )}

                  {/* Active Track Telegram Backup Button / Badge */}
                  {activeTrack && (
                    <div className="flex items-center justify-center mt-2">
                      {activeTrack.fileId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                          <Send className="w-3 h-3 text-sky-400" />
                          <span>Salvo no Telegram</span>
                        </span>
                      ) : activeTrack.audioUrl ? (
                        <button
                          onClick={() => handleBackupTrackToTelegram(activeTrack)}
                          disabled={backingUpTrackIds.includes(activeTrack.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-md shadow-sky-600/30 transition-all active:scale-95 disabled:opacity-50"
                          title="Fazer backup deste episódio para o Telegram com 1 clique"
                        >
                          {backingUpTrackIds.includes(activeTrack.id) ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Salvando no Telegram...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Backup no Telegram</span>
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Speed Controls Pill */}
                <div className="flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-700/40 text-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase mr-1">Velocidade:</span>
                  {[0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`font-bold px-1.5 py-0.5 rounded transition-colors ${playbackRate === s ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Right / Controls & Scrubber Section */}
              <div className={`flex flex-col items-center w-full ${!isTracksSidebarOpen ? 'lg:col-span-7 space-y-5' : 'space-y-4 max-w-md mt-2'}`}>
                {/* Scrub bar */}
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between text-xs text-emerald-300 font-mono">
                    <span className="font-semibold">{formatTime(currentTime)}</span>
                    <span className="text-gray-400">{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2.5 rounded-lg bg-emerald-950/80 accent-emerald-500 cursor-pointer transition-all hover:h-3"
                  />
                </div>

                {/* Main Big Controls Bar */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
                  <button 
                    onClick={handlePrevTrack} 
                    disabled={currentTrackIndex === 0 && currentTime <= 3} 
                    className="p-2.5 rounded-full text-emerald-300 hover:text-white disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                    title="Faixa Anterior"
                  >
                    <SkipBack className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>

                  <button 
                    onClick={() => handleSkip(-15)} 
                    className="p-3 rounded-full bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 transition-all hover:scale-105 active:scale-95 shadow-md" 
                    title="Voltar 15s"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button 
                    onClick={togglePlay} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 transition-all hover:scale-105 active:scale-95" 
                    title={isPlaying ? 'Pausar' : 'Reproduzir'}
                  >
                    {isPlaying ? <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" /> : <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />}
                  </button>

                  <button 
                    onClick={() => handleSkip(30)} 
                    className="p-3 rounded-full bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 transition-all hover:scale-105 active:scale-95 shadow-md" 
                    title="Avançar 30s"
                  >
                    <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>

                  <button 
                    onClick={handleNextTrack} 
                    disabled={currentTrackIndex >= tracks.length - 1 && !isRepeat && !isShuffle} 
                    className="p-2.5 rounded-full text-emerald-300 hover:text-white disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                    title="Próxima Faixa"
                  >
                    <SkipForward className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Auxiliary Controls (Shuffle, Repeat, Autoplay, Sleep Timer, Volume) */}
                <div className="flex flex-wrap items-center justify-between gap-2 w-full pt-2 border-t border-emerald-900/40 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsShuffle(!isShuffle)}
                      className={`p-2 rounded-xl transition-all ${isShuffle ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400 hover:text-white hover:bg-emerald-900/40'}`}
                      title="Modo Aleatório (Shuffle)"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={`p-2 rounded-xl transition-all ${isRepeat ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-400 hover:text-white hover:bg-emerald-900/40'}`}
                      title="Repetir Playlist"
                    >
                      <Repeat className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsAutoPlayNext(!isAutoPlayNext)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                        isAutoPlayNext 
                          ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50' 
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}
                      title="Tocar automaticamente a próxima faixa"
                    >
                      Sequência: {isAutoPlayNext ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Sleep Timer Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSleepMenu(!showSleepMenu)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border ${
                        sleepTimerRemainingSeconds !== null
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                          : 'bg-gray-800/80 text-gray-300 border-gray-700 hover:border-emerald-500'
                      }`}
                      title="Temporizador de Sono (Sleep Timer)"
                    >
                      <Moon className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {sleepTimerRemainingSeconds !== null
                          ? `${Math.floor(sleepTimerRemainingSeconds / 60)}m ${sleepTimerRemainingSeconds % 60}s`
                          : 'Sleep Timer'}
                      </span>
                    </button>

                    {showSleepMenu && (
                      <div className="absolute right-0 bottom-full mb-2 w-48 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl p-2 z-50 text-xs space-y-1">
                        <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Desligar áudio em:
                        </div>
                        {[
                          { min: 5, label: '5 minutos' },
                          { min: 10, label: '10 minutos' },
                          { min: 15, label: '15 minutos' },
                          { min: 30, label: '30 minutos' },
                          { min: 45, label: '45 minutos' },
                          { min: 60, label: '1 hora' },
                          { min: 0, label: 'Desativar' }
                        ].map(item => (
                          <button
                            key={item.min}
                            onClick={() => handleSetSleepTimer(item.min)}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-emerald-600 hover:text-white transition-colors"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5 bg-emerald-950/40 px-2 py-1 rounded-xl border border-emerald-900/50">
                    <button onClick={handleToggleMute} className="text-gray-400 hover:text-white">
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 accent-emerald-500 h-1 bg-gray-700 rounded-lg cursor-pointer"
                      title="Ajustar Volume"
                    />
                  </div>
                </div>

                {/* Direct Timestamp Creator Action Bar */}
                <div className="w-full p-3.5 bg-emerald-950/60 rounded-2xl border border-emerald-800/80 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <BookmarkPlus className="w-4 h-4 text-amber-400" />
                      <span>Novo Marcador em {formatTime(currentTime)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newBookmarkLabel}
                      onChange={(e) => setNewBookmarkLabel(e.target.value)}
                      placeholder="Descrição do trecho, verso ou momento marcante..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-gray-900/90 border border-emerald-700/60 focus:outline-none focus:ring-2 focus:ring-amber-400 text-white placeholder-gray-400"
                    />
                    <button
                      onClick={() => handleAddTimestamp()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
                    >
                      + Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Tabs: Timestamps & Notes for Active Track */}
            {activeTrack && (
              <div className="p-5 rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-drive-darkBorder pb-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('timestamps')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'timestamps'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      <span>Marcadores da Faixa ({activeTrack.timestamps?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        activeTab === 'notes'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Anotações / Letra</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono text-gray-400">
                    Faixa {currentTrackIndex + 1} de {tracks.length}
                  </span>
                </div>

                {/* Tab 1: Timestamps */}
                {activeTab === 'timestamps' && (
                  <div className="space-y-2">
                    {activeTrack.timestamps && activeTrack.timestamps.length > 0 ? (
                      [...activeTrack.timestamps].sort((a, b) => a.seconds - b.seconds).map(ts => (
                        <div key={ts.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-drive-darkBg hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors">
                          <button onClick={() => handleSeekTimestamp(ts.seconds)} className="flex items-center gap-2.5 text-xs font-semibold flex-1 text-left">
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px] shrink-0">
                              ▶ {ts.timeFormatted}
                            </span>
                            <span className="truncate">{ts.label}</span>
                          </button>
                          <button onClick={() => handleDeleteTimestamp(ts.id)} className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors" title="Excluir marcador">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhum marcador adicionado nesta faixa. Use o botão acima para marcar momentos importantes.</p>
                    )}
                  </div>
                )}

                {/* Tab 2: Notes / Lyrics */}
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    <textarea
                      value={trackNotes}
                      onChange={(e) => setTrackNotes(e.target.value)}
                      placeholder="Escreva anotações sobre o episódio, pontos de destaque ou a letra da música..."
                      rows={4}
                      className="w-full p-3 text-xs rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveTrackNotes}
                        disabled={isSavingNotes}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Tracks Accordion (Collapsible) */}
        {isTracksSidebarOpen ? (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
            <div className="p-3.5 px-4 border-b border-gray-200 dark:border-drive-darkBorder flex items-center justify-between bg-gray-50/70 dark:bg-drive-darkBg/50">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Faixas ({tracks.length}) • {progressPercent}%
                </h3>
              </div>
              
              <div className="flex items-center gap-1">
                {audioShow.showType === 'podcast' && onRefreshSinglePodcast && (
                  <button
                    onClick={async () => {
                      if (isRefreshingPodcast) return;
                      setIsRefreshingPodcast(true);
                      try {
                        const res = await onRefreshSinglePodcast(audioShow.id);
                        if (res.success && res.newEpisodesCount > 0) {
                          setBackupSuccessMessage(`🎉 ${res.newEpisodesCount} novos episódios encontrados!`);
                          setTimeout(() => setBackupSuccessMessage(null), 5000);
                        }
                      } finally {
                        setIsRefreshingPodcast(false);
                      }
                    }}
                    disabled={isRefreshingPodcast}
                    className="p-1 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Atualizar episódios do podcast agora"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingPodcast ? 'animate-spin text-amber-400' : ''}`} />
                    <span>{isRefreshingPodcast ? 'Atualizando...' : 'Atualizar Feed'}</span>
                  </button>
                )}

                {hasUnsavedTracks && (
                  <button
                    onClick={handleBackupAllToTelegram}
                    disabled={isBackingUpAll}
                    className="p-1 px-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold flex items-center gap-1 transition-colors"
                    title="Backup de todos os episódios no Telegram"
                  >
                    {isBackingUpAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Backup Todos</span>
                  </button>
                )}

                <button
                  onClick={() => setIsTracksSidebarOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                  title="Colapsar coluna de faixas"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:flex-1 lg:overflow-y-auto p-3 space-y-1.5 max-h-[500px] lg:max-h-none">
              {tracks.map((track, idx) => {
                const isCurrent = currentTrackIndex === idx;
                const isBackingUpThis = backingUpTrackIds.includes(track.id);

                return (
                  <div
                    key={`track-row-${track.id || 'idx'}-${idx}`}
                    onClick={() => playTrackByIndex(idx)}
                    className={`flex items-center justify-between p-3 rounded-2xl text-xs cursor-pointer group transition-all border ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                        : 'hover:bg-gray-50 dark:hover:bg-drive-darkHover border-gray-100 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      {/* Track Completion Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTrackCompletion(track.id);
                        }}
                        className="text-gray-400 hover:text-emerald-500 shrink-0"
                        title={track.isCompleted ? 'Ouvido' : 'Marcar como ouvido'}
                      >
                        {track.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      {/* Track Number / Play icon */}
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center font-mono text-[11px] shrink-0">
                        {isCurrent && isPlaying ? (
                          <Pause className="w-3 h-3 text-emerald-500 fill-current" />
                        ) : isCurrent ? (
                          <Play className="w-3 h-3 text-emerald-500 fill-current" />
                        ) : (
                          <span className="text-gray-400">{track.trackNumber || idx + 1}</span>
                        )}
                      </div>

                      {/* Track Title, Artist and Telegram status */}
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate leading-tight block">{track.title}</span>
                          {track.fileId && (
                            <span title="Salvo no Telegram">
                              <Send className="w-3 h-3 text-sky-500 shrink-0 inline" />
                            </span>
                          )}
                        </div>
                        {track.artist && (
                          <span className="text-[10px] text-gray-400 font-normal truncate block">{track.artist}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {/* Individual Track Backup Button */}
                      {!track.fileId && track.audioUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBackupTrackToTelegram(track);
                          }}
                          disabled={isBackingUpThis}
                          className="p-1 rounded-lg text-sky-500 hover:bg-sky-500/10 dark:hover:bg-sky-950/40 transition-colors"
                          title="Fazer Backup no Telegram com 1 clique"
                        >
                          {isBackingUpThis ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CloudUpload className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      <span className="text-[10px] text-gray-400 font-mono">
                        {track.duration || '03:45'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Floating expand tab when sidebar is collapsed */
          <button
            onClick={() => setIsTracksSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 py-3 px-1.5 rounded-l-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xl border-y border-l border-emerald-400/60 text-xs font-bold transition-all hover:pr-2.5 group cursor-pointer"
            title="Expandir Coluna de Faixas"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="[writing-mode:vertical-lr] rotate-180 text-[9px] tracking-widest uppercase font-mono font-black">
              Faixas ({tracks.length})
            </span>
          </button>
        )}
      </div>

      {/* Modal: Change Cover */}
      {isChangingCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-drive-darkBorder mb-4">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm">Alterar Capa do Álbum / Podcast</h3>
              </div>
              <button onClick={() => setIsChangingCover(false)} className="p-1.5 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="h-44 rounded-2xl overflow-hidden bg-gray-100 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder flex items-center justify-center">
                <img
                  src={coverUrlInput || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                  alt="Prévia"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">URL da Imagem</label>
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => setCoverUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                />
              </div>

              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Carregar Imagem do Computador</span>
              </button>
              <input
                type="file"
                ref={coverInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setCoverUrlInput(dataUrl);
                      await onUpdateAudioShow({ ...audioShow, coverImage: dataUrl });
                      setIsChangingCover(false);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                accept="image/*"
                className="hidden"
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                <button onClick={() => setIsChangingCover(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500">
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    await onUpdateAudioShow({ ...audioShow, coverImage: coverUrlInput.trim() || audioShow.coverImage });
                    setIsChangingCover(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Salvar Nova Capa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
