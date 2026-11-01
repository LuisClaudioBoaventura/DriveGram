import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Minimize2,
  Radio,
  Download,
  LayoutGrid,
  List,
  Search,
  Info,
  Calendar,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { AudioShow, AudioTrack, DriveItem, VideoTimestamp } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { MarqueeTitle } from './MarqueeTitle.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';

/**
 * Robust parser for podcast / track release date
 */
function parseEpisodePublicationDate(track: AudioTrack, show?: AudioShow, trackIndex: number = 0): Date | null {
  if (track.releaseDate) {
    const raw = track.releaseDate.trim();
    const d1 = new Date(raw);
    if (!isNaN(d1.getTime())) return d1;

    const cleaned = raw.replace(/^[a-zA-Z]+,\s*/, '').trim();
    const d2 = new Date(cleaned);
    if (!isNaN(d2.getTime())) return d2;

    if (/^\d{10,13}$/.test(raw)) {
      const num = parseInt(raw, 10);
      const dNum = new Date(num > 1e11 ? num : num * 1000);
      if (!isNaN(dNum.getTime())) return dNum;
    }
  }

  if (track.title) {
    const isoMatch = track.title.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const d = new Date(`${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }

    const brMatch = track.title.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (brMatch) {
      const d = new Date(`${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`);
      if (!isNaN(d.getTime())) return d;
    }
  }

  if (show && show.showType === 'podcast') {
    const baseDate = show.createdAt ? new Date(show.createdAt) : new Date();
    if (!isNaN(baseDate.getTime())) {
      if (trackIndex < 5) {
        return new Date(baseDate.getTime() - (trackIndex * 3 * 24 * 60 * 60 * 1000));
      }
    }
  }

  return null;
}

function formatEpisodeFullDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatEpisodeBadgeDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  });
}

function formatEpisodeDescription(raw?: string): string {
  if (!raw) return '';
  let formatted = raw
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n');

  formatted = formatted.replace(/<[^>]+>/g, '');

  formatted = formatted
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

  return formatted.replace(/\n{3,}/g, '\n\n').trim();
}

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
  onTrackTask?: (uploadId: string, fileName: string, initialStageLabel?: string, initialSize?: number) => any;
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
  onTrackTask,
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
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);

  // Podcast Refresh State
  const [isRefreshingPodcast, setIsRefreshingPodcast] = useState<boolean>(false);

  // Sleep Timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSeconds, setSleepTimerRemainingSeconds] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState(false);

  // Collapsible Tracks Sidebar state (closed by default for podcasts to maximize player view)
  const [isTracksSidebarOpen, setIsTracksSidebarOpen] = useState<boolean>(audioShow.showType !== 'podcast');

  // Episodes Modal & View Mode States (Blocos vs Lista)
  const [isEpisodesModalOpen, setIsEpisodesModalOpen] = useState<boolean>(false);
  const [episodesViewMode, setEpisodesViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('drivegram_podcast_episodes_view_mode');
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [selectedEpisodeForDetail, setSelectedEpisodeForDetail] = useState<AudioTrack | null>(null);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState<string>('');

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setEpisodesViewMode(mode);
    try {
      localStorage.setItem('drivegram_podcast_episodes_view_mode', mode);
    } catch {}
  };

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

  // Modo Disco de Vinil integrado no estúdio
  const [isStudioVinylMode, setIsStudioVinylMode] = useState(false);
  const trackRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  const tracks = audioShow.tracks || [];
  const activeTrack: AudioTrack | undefined = tracks[currentTrackIndex];

  // Filtro de episódios no modal
  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery.trim()) return tracks;
    const q = episodeSearchQuery.toLowerCase().trim();
    return tracks.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.notes && t.notes.toLowerCase().includes(q))
    );
  }, [tracks, episodeSearchQuery]);

  // Tocar episódio e fechar o modal imediatamente
  const handlePlayEpisodeAndCloseModal = (index: number) => {
    playTrackByIndex(index);
    setIsEpisodesModalOpen(false);
  };

  // Fechar modal ao pressionar ESC
  useEffect(() => {
    if (!isEpisodesModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedEpisodeForDetail) {
          setSelectedEpisodeForDetail(null);
        } else {
          setIsEpisodesModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEpisodesModalOpen, selectedEpisodeForDetail]);

  // Rolagem suave automática para a faixa ativa quando mudar
  useEffect(() => {
    if (trackRowRefs.current[currentTrackIndex]) {
      trackRowRefs.current[currentTrackIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentTrackIndex]);
  
  // Priority 1: Direct fileId match in allFiles
  // Priority 2: Match by show folder and track title in allFiles
  const activeFile = useMemo(() => {
    if (!activeTrack) return null;
    if (activeTrack.fileId) {
      const direct = allFiles.find(f => f.id === activeTrack.fileId && !f.isTrash);
      if (direct) return direct;
    }
    const cleanTrackTitle = (activeTrack.title || '').toLowerCase().replace(/[/\\?%*:|"<>_.-]/g, ' ').trim();
    if (cleanTrackTitle && audioShow.folderId) {
      const matchInFolder = allFiles.find(f => 
        !f.isTrash &&
        f.parentId === audioShow.folderId &&
        (f.type === 'audio' || f.mimeType?.startsWith('audio/') || f.name.endsWith('.mp3')) &&
        (
          f.name.toLowerCase().includes(cleanTrackTitle) ||
          cleanTrackTitle.includes(f.name.toLowerCase().replace(/\.[^/.]+$/, '').trim())
        )
      );
      if (matchInFolder) return matchInFolder;
    }
    return null;
  }, [activeTrack, allFiles, audioShow.folderId]);

  const [hasStudioStreamError, setHasStudioStreamError] = useState(false);

  // Reset studio stream error when switching tracks
  useEffect(() => {
    setHasStudioStreamError(false);
  }, [activeTrack?.id, activeTrack?.fileId]);

  // PRIORITY SYSTEM (ONLINE FIRST):
  const streamFileId = activeFile?.id || activeTrack?.fileId;
  const isSavedOnTelegram = Boolean(streamFileId);
  const isOnlineSourceAvailable = Boolean(activeTrack?.audioUrl && !hasStudioStreamError);
  const isPlayingOnline = isOnlineSourceAvailable;
  const isPlayingFromTelegram = !isOnlineSourceAvailable && Boolean(streamFileId);
  const studioAudioSource = isOnlineSourceAvailable
    ? activeTrack!.audioUrl
    : (streamFileId ? resolveApiUrl(`/api/stream/${streamFileId}`) : activeTrack?.audioUrl);

  const handleStudioAudioError = () => {
    if (isOnlineSourceAvailable && streamFileId) {
      console.warn(`[AudioStudioView] Erro na reprodução online para "${activeTrack?.title}". Alternando para a versão salva no Telegram...`);
      setHasStudioStreamError(true);
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.load();
          if (isPlaying) {
            audioRef.current.play().catch(() => {});
          }
        }
      }, 60);
    }
  };

  // Sync notes and restore saved exact playback position when active track changes
  useEffect(() => {
    if (activeTrack) {
      setTrackNotes(activeTrack.notes || '');
      
      // Determine exact saved position from track or localStorage
      let savedSec = activeTrack.lastPositionSeconds || 0;
      if (!savedSec) {
        try {
          const raw = localStorage.getItem(`drivegram_podcast_pos_${activeTrack.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.pos === 'number' && parsed.pos > 0) savedSec = parsed.pos;
          }
        } catch (e) {}
      }

      if (savedSec > 0) {
        if (onSeekProp) {
          onSeekProp(savedSec);
        } else {
          setLocalCurrentTime(savedSec);
          if (audioRef.current) {
            audioRef.current.currentTime = savedSec;
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
    const uploadId = `backup-${track.id}-${Date.now()}`;
    const cleanTitle = (track.title || 'episodio').replace(/[/\\?%*:|"<>]/g, '_').trim();
    
    setBackingUpTrackIds(prev => [...prev, track.id]);
    setBackupSuccessMessage(null);

    let tracker: any = null;
    if (onTrackTask) {
      tracker = onTrackTask(uploadId, `${cleanTitle}.mp3`, '1/2 • Conectando ao servidor do podcast...');
    }

    try {
      const payload = JSON.stringify({
        uploadId,
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
        if (tracker?.finish) {
          tracker.finish(true);
        }
        setBackupSuccessMessage(`Episódio "${track.title}" salvo no Telegram e pasta criada no Meu Drive!`);
        setTimeout(() => setBackupSuccessMessage(null), 5000);
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        if (tracker?.finish) {
          tracker.finish(false, err.error || 'Erro ao realizar backup');
        }
        alert(err.error || 'Erro ao realizar backup no Telegram. Verifique se o servidor backend está em execução.');
      }
    } catch (e: any) {
      console.error('Error backing up to Telegram:', e);
      if (tracker?.finish) {
        tracker.finish(false, e?.message || 'Falha na conexão');
      }
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

    // Register all unbacked tracks with onTrackTask
    if (onTrackTask) {
      unbackedTracks.forEach((t) => {
        const trkUploadId = `backup-${t.id}-${Date.now()}`;
        const cleanTitle = (t.title || 'episodio').replace(/[/\\?%*:|"<>]/g, '_').trim();
        onTrackTask(trkUploadId, `${cleanTitle}.mp3`, 'Na fila para backup...');
      });
    }

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
          src={studioAudioSource}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            const audioEl = e.currentTarget;
            setLocalDuration(audioEl.duration || 0);
            const savedSec = activeTrack?.lastPositionSeconds || 0;
            if (savedSec > 0 && audioEl.currentTime === 0) {
              audioEl.currentTime = savedSec;
              setLocalCurrentTime(savedSec);
            }
          }}
          onEnded={handleTrackEnded}
          onPlay={() => setLocalIsPlaying(true)}
          onPause={() => setLocalIsPlaying(false)}
          onError={handleStudioAudioError}
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
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <MarqueeTitle
                text={audioShow.title}
                as="h1"
                className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 max-w-[130px] sm:max-w-xs md:max-w-md"
              />
              {(audioShow.artist || audioShow.host) && (
                <span className="text-xs text-gray-400 hidden md:inline truncate max-w-[120px]">
                  • {audioShow.artist || audioShow.host}
                </span>
              )}
              <button
                onClick={() => {
                  setTitleInput(audioShow.title);
                  setArtistInput(audioShow.artist || audioShow.host || '');
                  setIsEditingShow(true);
                }}
                className="p-1 text-gray-400 hover:text-emerald-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                title="Editar Título e Artista"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setCoverUrlInput(audioShow.coverImage || '');
                  setIsChangingCover(true);
                }}
                className="p-1 text-gray-400 hover:text-emerald-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
                title="Trocar Capa"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Episódios / Faixas Modal Trigger Button */}
          <button
            onClick={() => {
              setSelectedEpisodeForDetail(null);
              setEpisodeSearchQuery('');
              setIsEpisodesModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all active:scale-95 shadow-xs shrink-0 cursor-pointer"
            title={audioShow.showType === 'podcast' ? 'Ver catálogo de episódios em modal' : 'Ver lista de faixas em modal'}
          >
            <ListOrdered className="w-3.5 h-3.5 text-emerald-500" />
            <span>{audioShow.showType === 'podcast' ? 'Episódios' : 'Faixas'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-[10px] font-mono font-bold">
              {tracks.length}
            </span>
          </button>

          {/* Backup Telegram Quick Action Button */}
          {hasUnsavedTracks ? (
            <button
              onClick={handleBackupAllToTelegram}
              disabled={isBackingUpAll}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
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
                  <span className="hidden sm:inline">Backup Telegram</span>
                </>
              )}
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-[11px] font-bold shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Salvo no Telegram ({totalSavedInTelegram})</span>
            </div>
          )}

          {onMinimizeToFloating && (
            <button
              onClick={onMinimizeToFloating}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gray-100/90 hover:bg-gray-200 dark:bg-gray-900/90 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-emerald-500 border border-gray-200/80 dark:border-gray-800 text-xs font-bold transition-all shadow-xs shrink-0"
              title="Minimizar para Disco de Vinil Flutuante e explorar outras pastas"
            >
              <Disc className="w-3.5 h-3.5 text-emerald-500 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="hidden sm:inline">Janela Flutuante</span>
            </button>
          )}

          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Excluir "${audioShow.title}"?`)) {
                onDeleteAudioShow(audioShow.id);
                onBackToCatalog();
              }
            }}
            className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
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
            isTracksSidebarOpen && audioShow.showType !== 'podcast' ? 'max-w-3xl mx-auto space-y-6' : 'max-w-5xl mx-auto space-y-6'
          }`}>
            {/* Main Audio Studio Card */}
            <div className={`p-6 sm:p-8 bg-gradient-to-b from-emerald-950/50 via-teal-950/40 to-slate-950 rounded-3xl border border-emerald-800/40 shadow-2xl text-white transition-all ${
              !isTracksSidebarOpen || audioShow.showType === 'podcast' ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-center' : 'flex flex-col items-center justify-center'
            }`}>
              {/* Left / Cover Section */}
              <div className={`flex flex-col items-center justify-center ${!isTracksSidebarOpen || audioShow.showType === 'podcast' ? 'lg:col-span-5' : ''}`}>
                {/* Vinyl Record Mode View vs Standard Cover Art */}
                {isStudioVinylMode ? (
                  <div 
                    key={`studio-vinyl-${activeTrack?.id || audioShow.id}`}
                    className="relative mb-4 group cursor-pointer transition-all duration-700 animate-in fade-in"
                  >
                    <div className={`relative rounded-full bg-gray-950 border-4 border-emerald-500/60 p-2 flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(16,185,129,0.3)] transition-all duration-700 ${
                      !isTracksSidebarOpen || audioShow.showType === 'podcast' ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-52 h-52'
                    }`}>
                      {/* Ambient Glow */}
                      {isPlaying && (
                        <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-600 opacity-70 blur-xs animate-pulse" />
                      )}

                      {/* Spinning Artwork & Grooves */}
                      <div 
                        className="relative w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                        style={{
                          animation: 'spin 12s linear infinite',
                          animationPlayState: isPlaying ? 'running' : 'paused'
                        }}
                      >
                        <img
                          src={activeTrack?.coverImage || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                          alt={activeTrack?.showTitle || audioShow.title}
                          className="w-full h-full object-cover scale-110 transition-transform duration-500"
                        />
                        {/* Grooves */}
                        <div className="absolute inset-0 rounded-full border-[4px] border-black/40 pointer-events-none" />
                        <div className="absolute inset-2 rounded-full border border-white/10 pointer-events-none" />
                        <div className="absolute inset-5 rounded-full border border-black/40 pointer-events-none" />
                        <div className="absolute inset-8 rounded-full border border-white/5 pointer-events-none" />
                        {/* Sheen */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/15 to-transparent pointer-events-none" />
                      </div>

                      {/* Center Spindle */}
                      <div className="absolute w-8 h-8 rounded-full bg-gray-950 border-2 border-emerald-400 shadow-inner flex items-center justify-center pointer-events-none z-10">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Cover Art */
                  <div 
                    key={`studio-cover-${activeTrack?.id || audioShow.id}`}
                    onClick={() => {
                      setCoverUrlInput(activeTrack?.coverImage || audioShow.coverImage || '');
                      setIsChangingCover(true);
                    }}
                    className="relative mb-4 group cursor-pointer animate-in fade-in transition-all duration-500"
                    title="Clique para trocar a capa"
                  >
                    <div className={`rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 transition-all duration-700 ${
                      !isTracksSidebarOpen || audioShow.showType === 'podcast' ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-52 h-52'
                    } ${isPlaying ? 'ring-8 ring-emerald-500/20 scale-105 shadow-emerald-500/20 shadow-2xl' : 'grayscale-[15%]'}`}>
                      <img
                        src={activeTrack?.coverImage || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                        alt={activeTrack?.showTitle || audioShow.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
                        <ImageIcon className="w-6 h-6 text-emerald-400" />
                        <span>Trocar Capa</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Vinyl Mode & Cover Art Switcher Pill */}
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setIsStudioVinylMode(!isStudioVinylMode)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all border ${
                      isStudioVinylMode
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm shadow-emerald-500/40'
                        : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border-emerald-700/40'
                    }`}
                    title={isStudioVinylMode ? 'Alternar para Capa Padrão' : 'Alternar para Modo Disco de Vinil'}
                  >
                    <Disc className={`w-3.5 h-3.5 ${isStudioVinylMode ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                    <span>{isStudioVinylMode ? 'Modo Vinil Ativo' : 'Modo Vinil'}</span>
                  </button>
                </div>

                {/* Title & Artist Info */}
                <div 
                  key={`track-info-${activeTrack?.id || audioShow.id}`}
                  className="text-center max-w-sm w-full mb-3 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest block mb-1 truncate">
                    {activeTrack?.showTitle || audioShow.title}
                  </span>
                  <MarqueeTitle
                    text={activeTrack?.title || 'Selecione uma faixa'}
                    as="h2"
                    className="text-base sm:text-lg font-bold text-white"
                  />
                  {(activeTrack?.artist || audioShow.artist || audioShow.host) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {activeTrack?.artist || audioShow.artist || audioShow.host}
                      {activeFile && ` • .${activeFile.extension?.toUpperCase()}`}
                    </p>
                  )}

                  {/* Active Track Telegram Backup Button / Download / Source Badge */}
                  {activeTrack && (
                    <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                      {isPlayingOnline ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold" title="Prioridade: Executando da Fonte Online na Web">
                          <Radio className="w-3 h-3 text-emerald-400" />
                          <span>Online (Web)</span>
                        </span>
                      ) : isPlayingFromTelegram ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold" title="Executando da cópia salva no Telegram">
                          <Send className="w-3 h-3 text-sky-400" />
                          <span>Telegram</span>
                        </span>
                      ) : null}

                      {isSavedOnTelegram && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10px] font-bold" title="Episódio salvo no Telegram">
                          <Send className="w-3 h-3 text-sky-400" />
                          <span>Salvo no Telegram</span>
                        </span>
                      )}

                      {/* Direct Download Button if saved on Telegram */}
                      {activeFile && (
                        <a
                          href={`/api/stream/${activeFile.id}?download=true`}
                          download={`${activeTrack.title}.mp3`}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white border border-sky-500/40 text-[11px] font-bold transition-all shadow-sm"
                          title="Baixar episódio do Telegram para o seu dispositivo"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar MP3</span>
                        </a>
                      )}

                      {/* Backup Button if not saved */}
                      {!isSavedOnTelegram && activeTrack.audioUrl && (
                        <button
                          onClick={() => handleBackupTrackToTelegram(activeTrack)}
                          disabled={backingUpTrackIds.includes(activeTrack.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-md shadow-sky-600/30 transition-all active:scale-95 disabled:opacity-50"
                          title="Fazer backup deste episódio para o Telegram com 1 clique"
                        >
                          {backingUpTrackIds.includes(activeTrack.id) ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Salvando...</span>
                            </>
                          ) : (
                            <>
                              <CloudUpload className="w-3 h-3" />
                              <span>Salvar no Telegram</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Download Active Track Button */}
                {activeFile && (
                  <button
                    onClick={() => setDownloadTargetFile(activeFile)}
                    className="flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 px-3 py-1.5 rounded-xl border border-emerald-700/40 text-emerald-200 text-xs font-bold transition-all active:scale-95 shadow-xs"
                    title="Baixar faixa atual para o cache local"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Baixar Faixa</span>
                  </button>
                )}

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
              <div className={`flex flex-col items-center w-full ${!isTracksSidebarOpen || audioShow.showType === 'podcast' ? 'lg:col-span-7 space-y-5' : 'space-y-4 max-w-md mt-2'}`}>
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

        {/* Right Sidebar: Tracks Accordion (Collapsible - Only for non-podcasts) */}
        {audioShow.showType !== 'podcast' && (
          isTracksSidebarOpen ? (
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-drive-darkBorder bg-white dark:bg-drive-darkSurface flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
              <div className="p-3.5 px-4 border-b border-gray-200 dark:border-drive-darkBorder flex items-center justify-between bg-gray-50/70 dark:bg-drive-darkBg/50">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Faixas ({tracks.length}) • {progressPercent}%
                  </h3>
                </div>
              
              <div className="flex items-center gap-1">
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
                const matchedTrackFile = track.fileId 
                  ? allFiles.find(f => f.id === track.fileId && !f.isTrash)
                  : (audioShow.folderId 
                      ? allFiles.find(f => !f.isTrash && f.parentId === audioShow.folderId && f.name.toLowerCase().includes((track.title || '').toLowerCase().trim())) 
                      : null);
                const isTrackSaved = Boolean(matchedTrackFile || track.fileId);

                return (
                  <div
                    key={track.id || `track-row-${idx}`}
                    ref={(el) => { trackRowRefs.current[idx] = el; }}
                    onClick={() => playTrackByIndex(idx)}
                    className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isCurrent
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-950 dark:text-emerald-200 font-bold shadow-xs'
                        : 'hover:bg-gray-100 dark:hover:bg-drive-darkBg border border-transparent text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                      {/* Completion Toggle */}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate leading-tight block">{track.title}</span>
                          {isTrackSaved ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20 shrink-0" title="Salvo no Telegram">
                              <Send className="w-2.5 h-2.5" />
                              <span>Telegram</span>
                            </span>
                          ) : track.audioUrl ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-gray-400 bg-gray-500/10 px-1 py-0.2 rounded shrink-0" title="Fonte Web">
                              <span>Web</span>
                            </span>
                          ) : null}
                        </div>
                        {track.artist && (
                          <span className="text-[10px] text-gray-400 font-normal truncate block">{track.artist}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {/* Download Button via Progress Modal */}
                      {matchedTrackFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadTargetFile(matchedTrackFile);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Baixar episódio / faixa para cache local"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Individual Track Backup Button if not saved */}
                      {!isTrackSaved && track.audioUrl && (
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
        ))}
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

      {/* ==================================================================== */}
      {/* MODAL CENTRAL DE EPISÓDIOS (CARDS / LISTA & DETALHES COMPLETOS)     */}
      {/* ==================================================================== */}
      {isEpisodesModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setIsEpisodesModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-5xl h-[90vh] max-h-[820px] flex flex-col bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-gray-800 dark:text-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar do Modal */}
            <div className="p-4 sm:px-6 border-b border-gray-200/80 dark:border-drive-darkBorder flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-drive-darkBg/60 shrink-0">
              {selectedEpisodeForDetail ? (
                /* Header da Tela de Detalhes do Episódio */
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedEpisodeForDetail(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-200/70 hover:bg-gray-200 dark:bg-drive-darkSurface dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold transition-all active:scale-95 shadow-xs"
                      title="Voltar para a lista de episódios"
                    >
                      <ArrowLeft className="w-4 h-4 text-emerald-500" />
                      <span>Voltar para Lista</span>
                    </button>

                    <div className="hidden sm:flex items-center gap-1.5 ml-2 text-xs text-gray-500 dark:text-gray-400">
                      <Radio className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-semibold truncate max-w-xs">{audioShow.title}</span>
                    </div>
                  </div>

                  {/* Paginação / Próximo e Anterior Episódio */}
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selIdx = tracks.findIndex(t => t.id === selectedEpisodeForDetail.id);
                      return (
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-drive-darkSurface p-1 rounded-xl border border-gray-200 dark:border-drive-darkBorder text-xs">
                          <button
                            disabled={selIdx <= 0}
                            onClick={() => {
                              if (selIdx > 0) setSelectedEpisodeForDetail(tracks[selIdx - 1]);
                            }}
                            className="p-1 rounded-lg text-gray-600 dark:text-gray-300 hover:text-emerald-500 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Episódio Anterior"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="px-1.5 text-[11px] font-mono font-bold text-gray-500">
                            {selIdx + 1} / {tracks.length}
                          </span>
                          <button
                            disabled={selIdx < 0 || selIdx >= tracks.length - 1}
                            onClick={() => {
                              if (selIdx >= 0 && selIdx < tracks.length - 1) setSelectedEpisodeForDetail(tracks[selIdx + 1]);
                            }}
                            className="p-1 rounded-lg text-gray-600 dark:text-gray-300 hover:text-emerald-500 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                            title="Próximo Episódio"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setIsEpisodesModalOpen(false)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1"
                      title="Fechar Janela"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Header da Listagem (Busca, Modo de Visualização e Ações) */
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                          {audioShow.title}
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold shrink-0">
                          {tracks.length} {audioShow.showType === 'podcast' ? 'episódios' : 'faixas'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate hidden sm:block">
                        Selecione um episódio para ouvir ou visualizar todas as informações e descrição
                      </p>
                    </div>
                  </div>

                  {/* Barra de Busca rápida */}
                  <div className="flex-1 max-w-xs relative hidden md:block">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={episodeSearchQuery}
                      onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                      placeholder="Pesquisar episódio..."
                      className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {episodeSearchQuery && (
                      <button
                        onClick={() => setEpisodeSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Switcher de Visualização: Blocos (Grid) vs Lista & Ações */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botões Blocos vs Lista */}
                    <div className="flex items-center p-1 rounded-xl bg-gray-100 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder">
                      <button
                        onClick={() => handleToggleViewMode('grid')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          episodesViewMode === 'grid'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Visualizar em Blocos / Cards"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Blocos</span>
                      </button>
                      <button
                        onClick={() => handleToggleViewMode('list')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          episodesViewMode === 'list'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="Visualizar em Lista"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Lista</span>
                      </button>
                    </div>

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
                        className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 transition-colors disabled:opacity-50"
                        title="Atualizar feed do podcast"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingPodcast ? 'animate-spin' : ''}`} />
                        <span>{isRefreshingPodcast ? 'Atualizando...' : 'Atualizar Feed'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsEpisodesModalOpen(false)}
                      className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-1"
                      title="Fechar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sub-barra de busca mobile quando em tela pequena */}
            {!selectedEpisodeForDetail && (
              <div className="p-3 border-b border-gray-100 dark:border-drive-darkBorder md:hidden bg-gray-50/50 dark:bg-drive-darkBg/30">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={episodeSearchQuery}
                    onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                    placeholder="Pesquisar episódio por título ou assunto..."
                    className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {episodeSearchQuery && (
                    <button
                      onClick={() => setEpisodeSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedEpisodeForDetail ? (
              /* ========================================================== */
              /* TELA DE DETALHES COMPLETOS DO EPISÓDIO                     */
              /* ========================================================== */
              (() => {
                const epIndex = tracks.findIndex(t => t.id === selectedEpisodeForDetail.id);
                const isCurrentActive = currentTrackIndex === epIndex;
                const parsedDate = parseEpisodePublicationDate(selectedEpisodeForDetail, audioShow, epIndex >= 0 ? epIndex : 0);
                const fullDateStr = formatEpisodeFullDate(parsedDate);
                const isBackingUpThis = backingUpTrackIds.includes(selectedEpisodeForDetail.id);
                
                const matchedFile = selectedEpisodeForDetail.fileId
                  ? allFiles.find(f => f.id === selectedEpisodeForDetail.fileId && !f.isTrash)
                  : (audioShow.folderId
                      ? allFiles.find(f => !f.isTrash && f.parentId === audioShow.folderId && f.name.toLowerCase().includes((selectedEpisodeForDetail.title || '').toLowerCase().trim()))
                      : null);
                const isSavedInTelegram = Boolean(matchedFile || selectedEpisodeForDetail.fileId);

                return (
                  <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
                    {/* Hero Card do Episódio */}
                    <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-slate-900 border border-emerald-800/30 text-white shadow-xl flex flex-col md:flex-row gap-6 items-start">
                      {/* Capa */}
                      <div className="relative group shrink-0 mx-auto md:mx-0">
                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500/40 bg-black/40">
                          <img
                            src={selectedEpisodeForDetail.coverImage || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60'}
                            alt={selectedEpisodeForDetail.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        {isCurrentActive && isPlaying && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-bold shadow-md animate-pulse">
                            Tocando
                          </div>
                        )}
                      </div>

                      {/* Informações Principais & Ações */}
                      <div className="flex-1 flex flex-col justify-between space-y-4 w-full">
                        <div>
                          {/* Badges de Metadados */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                              Episódio #{epIndex >= 0 ? epIndex + 1 : 1}
                            </span>
                            {selectedEpisodeForDetail.coverImage && selectedEpisodeForDetail.coverImage !== audioShow.coverImage && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                <ImageIcon className="w-3 h-3 text-emerald-400" />
                                <span>Capa Original</span>
                              </span>
                            )}
                            {fullDateStr && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-semibold border border-amber-500/30">
                                <Calendar className="w-3 h-3 text-amber-400" />
                                <span>{fullDateStr}</span>
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-gray-200 text-[10px] font-mono border border-white/10">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              <span>{selectedEpisodeForDetail.duration || '45:00'}</span>
                            </span>
                            {isSavedInTelegram ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold border border-sky-400/40">
                                <ShieldCheck className="w-3 h-3 text-sky-400" />
                                <span>Salvo no Telegram</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-500/20 text-gray-300 text-[10px] font-semibold border border-white/10">
                                <Radio className="w-3 h-3 text-emerald-400" />
                                <span>Web RSS</span>
                              </span>
                            )}
                          </div>

                          {/* Título */}
                          <h1 className="text-lg sm:text-2xl font-black text-white leading-tight mb-1">
                            {selectedEpisodeForDetail.title}
                          </h1>

                          {/* Artista / Host */}
                          {(selectedEpisodeForDetail.artist || audioShow.artist || audioShow.host) && (
                            <p className="text-xs sm:text-sm text-gray-300 font-medium flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{selectedEpisodeForDetail.artist || audioShow.artist || audioShow.host}</span>
                            </p>
                          )}
                        </div>

                        {/* Barra de Ações: Tocar (Fecha Modal e mostra tela principal) */}
                        <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-white/10">
                          <button
                            onClick={() => {
                              if (epIndex >= 0) {
                                handlePlayEpisodeAndCloseModal(epIndex);
                              }
                            }}
                            className="flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-gray-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                            title="Tocar este episódio e voltar para a tela principal"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            <span>{isCurrentActive && isPlaying ? 'Ver no Player Principal' : 'Ouvir Agora'}</span>
                          </button>

                          {/* Backup para o Telegram se não estiver salvo */}
                          {!isSavedInTelegram && selectedEpisodeForDetail.audioUrl && (
                            <button
                              onClick={() => handleBackupTrackToTelegram(selectedEpisodeForDetail)}
                              disabled={isBackingUpThis}
                              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md shadow-sky-600/30 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                              title="Fazer backup deste episódio para o Telegram"
                            >
                              {isBackingUpThis ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Salvando no Telegram...</span>
                                </>
                              ) : (
                                <>
                                  <CloudUpload className="w-3.5 h-3.5" />
                                  <span>Salvar no Telegram</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Download MP3 se disponível */}
                          {matchedFile && (
                            <a
                              href={`/api/stream/${matchedFile.id}?download=true`}
                              download={`${selectedEpisodeForDetail.title}.mp3`}
                              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-200 border border-sky-500/40 text-xs font-bold transition-all"
                              title="Baixar arquivo MP3 para o computador"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar MP3</span>
                            </a>
                          )}

                          {/* Concluir / Marcar como Ouvido */}
                          <button
                            onClick={() => onToggleTrackCompletion(selectedEpisodeForDetail.id)}
                            className={`flex items-center gap-1 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all border ${
                              selectedEpisodeForDetail.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                            }`}
                            title={selectedEpisodeForDetail.isCompleted ? 'Marcar como não ouvido' : 'Marcar como ouvido'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{selectedEpisodeForDetail.isCompleted ? 'Concluído' : 'Marcar como Lido'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Descrição Detalhada do Episódio */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                          Sobre este Episódio
                        </h3>
                      </div>
                      
                      <div className="p-5 rounded-3xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder">
                        {selectedEpisodeForDetail.description || selectedEpisodeForDetail.notes ? (
                          <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap select-text space-y-2">
                            {formatEpisodeDescription(selectedEpisodeForDetail.description || selectedEpisodeForDetail.notes)}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-400 text-xs">
                            <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma descrição detalhada fornecida para este episódio.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Marcadores / Timestamps deste episódio (se existirem) */}
                    {selectedEpisodeForDetail.timestamps && selectedEpisodeForDetail.timestamps.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                          <BookmarkPlus className="w-4 h-4 text-amber-500" />
                          <span>Marcadores do Episódio ({selectedEpisodeForDetail.timestamps.length})</span>
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selectedEpisodeForDetail.timestamps.map(ts => (
                            <button
                              key={ts.id}
                              onClick={() => {
                                if (epIndex >= 0) {
                                  playTrackByIndex(epIndex);
                                  handleSeekTimestamp(ts.seconds);
                                  setIsEpisodesModalOpen(false);
                                }
                              }}
                              className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/40 text-left transition-all group"
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-mono font-bold text-xs shrink-0">
                                  ▶ {ts.timeFormatted}
                                </span>
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {ts.label}
                                </span>
                              </div>
                              <Play className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              /* ========================================================== */
              /* LISTAGEM DE EPISÓDIOS (MODO BLOCOS OU MODO LISTA)          */
              /* ========================================================== */
              <div className="flex-1 overflow-y-auto">
                {filteredEpisodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                    <Search className="w-8 h-8 mb-2 opacity-40 text-emerald-500" />
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Nenhum episódio encontrado</p>
                    <p className="text-xs mt-1">Tente pesquisar com outros termos ou limpe a busca.</p>
                    {episodeSearchQuery && (
                      <button
                        onClick={() => setEpisodeSearchQuery('')}
                        className="mt-3 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                      >
                        Limpar Busca
                      </button>
                    )}
                  </div>
                ) : episodesViewMode === 'grid' ? (
                  /* ---------------- VISUALIZAÇÃO EM BLOCOS (GRID) ---------------- */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 p-4 sm:p-6">
                    {filteredEpisodes.map((track) => {
                      const realIndex = tracks.findIndex(t => t.id === track.id);
                      const isCurrent = currentTrackIndex === realIndex;
                      const parsedDate = parseEpisodePublicationDate(track, audioShow, realIndex >= 0 ? realIndex : 0);
                      const badgeDateStr = formatEpisodeBadgeDate(parsedDate);
                      const isBackingUpThis = backingUpTrackIds.includes(track.id);
                      
                      const matchedTrackFile = track.fileId
                        ? allFiles.find(f => f.id === track.fileId && !f.isTrash)
                        : (audioShow.folderId
                            ? allFiles.find(f => !f.isTrash && f.parentId === audioShow.folderId && f.name.toLowerCase().includes((track.title || '').toLowerCase().trim()))
                            : null);
                      const isTrackSaved = Boolean(matchedTrackFile || track.fileId);
                      const hasOriginalCover = Boolean(track.coverImage && track.coverImage !== audioShow.coverImage);
                      const episodeCoverUrl = track.coverImage || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';

                      return (
                        <div
                          key={track.id}
                          onClick={() => setSelectedEpisodeForDetail(track)}
                          className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-xl ${
                            isCurrent
                              ? 'bg-emerald-500/10 border-emerald-500/60 shadow-lg shadow-emerald-500/10 dark:bg-emerald-950/20'
                              : 'bg-white dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/40 hover:shadow-xl dark:hover:border-emerald-500/30'
                          }`}
                        >
                          {/* Topo do Card com Imagem e Badges */}
                          <div className="relative aspect-square w-full overflow-hidden bg-gray-950">
                            <img
                              src={episodeCoverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />

                            {/* Badge de Capa Original ou Data no Topo Esquerdo */}
                            <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
                              {hasOriginalCover ? (
                                <span 
                                  className="px-1.5 py-0.5 rounded-md bg-emerald-600/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider shadow-md border border-emerald-400/40 flex items-center gap-1"
                                  title="Capa original individual deste episódio"
                                >
                                  <ImageIcon className="w-2.5 h-2.5" />
                                  <span>Original</span>
                                </span>
                              ) : badgeDateStr ? (
                                <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-amber-300 text-[9px] font-bold border border-amber-500/30 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>{badgeDateStr}</span>
                                </span>
                              ) : null}
                            </div>

                            {/* Badges de Status no Topo Direito */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                              {isTrackSaved && (
                                <span className="p-1 rounded-md bg-sky-500/90 text-white shadow-xs" title="Salvo no Telegram">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                </span>
                              )}
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-black text-[9px] font-bold shadow-md animate-pulse">
                                  {isPlaying ? 'Tocando' : 'Pausado'}
                                </span>
                              )}
                            </div>

                            {/* Duração no Canto Inferior Direito da Imagem */}
                            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-gray-200 text-[9px] font-mono font-semibold z-10">
                              {track.duration || '45:00'}
                            </div>

                            {/* Hover Quick Play Overlay Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (realIndex >= 0) {
                                  handlePlayEpisodeAndCloseModal(realIndex);
                                }
                              }}
                              className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-emerald-600/95 hover:bg-emerald-500 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all cursor-pointer z-20"
                              title="Tocar este episódio agora"
                            >
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </button>
                          </div>

                          {/* Conteúdo Central do Card Compacto */}
                          <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  Ep. #{realIndex >= 0 ? realIndex + 1 : 1}
                                </span>
                                {badgeDateStr && (
                                  <span className="truncate text-[9px] text-gray-400 dark:text-gray-500">
                                    {badgeDateStr}
                                  </span>
                                )}
                              </div>
                              <h3
                                className="text-xs font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug"
                                title={track.title}
                              >
                                {track.title}
                              </h3>
                            </div>

                            {/* Rodapé do Card com Ações Rápidas */}
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-drive-darkBorder/60">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (realIndex >= 0) {
                                    handlePlayEpisodeAndCloseModal(realIndex);
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                                title="Tocar episódio e voltar à tela principal"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Tocar</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {!isTrackSaved && track.audioUrl && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBackupTrackToTelegram(track);
                                    }}
                                    disabled={isBackingUpThis}
                                    className="p-1 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                                    title="Salvar no Telegram"
                                  >
                                    {isBackingUpThis ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CloudUpload className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEpisodeForDetail(track);
                                  }}
                                  className="p-1.5 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                  title="Ver informações completas do episódio"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* ---------------- VISUALIZAÇÃO EM LISTA ---------------- */
                  <div className="p-4 sm:p-6 space-y-2">
                    {filteredEpisodes.map((track) => {
                      const realIndex = tracks.findIndex(t => t.id === track.id);
                      const isCurrent = currentTrackIndex === realIndex;
                      const parsedDate = parseEpisodePublicationDate(track, audioShow, realIndex >= 0 ? realIndex : 0);
                      const badgeDateStr = formatEpisodeBadgeDate(parsedDate);
                      const isBackingUpThis = backingUpTrackIds.includes(track.id);
                      
                      const matchedTrackFile = track.fileId
                        ? allFiles.find(f => f.id === track.fileId && !f.isTrash)
                        : (audioShow.folderId
                            ? allFiles.find(f => !f.isTrash && f.parentId === audioShow.folderId && f.name.toLowerCase().includes((track.title || '').toLowerCase().trim()))
                            : null);
                      const isTrackSaved = Boolean(matchedTrackFile || track.fileId);
                      const hasOriginalCover = Boolean(track.coverImage && track.coverImage !== audioShow.coverImage);
                      const episodeCoverUrl = track.coverImage || audioShow.coverImage || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=60';

                      return (
                        <div
                          key={track.id}
                          onClick={() => setSelectedEpisodeForDetail(track)}
                          className={`group flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                            isCurrent
                              ? 'bg-emerald-500/10 border-emerald-500/50 dark:bg-emerald-950/20 shadow-xs'
                              : 'bg-white dark:bg-drive-darkBg border-gray-200 dark:border-drive-darkBorder hover:border-emerald-500/40 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                            {/* Número / Posição */}
                            <span className="w-6 text-center text-xs font-mono font-bold text-gray-400 shrink-0">
                              #{realIndex >= 0 ? realIndex + 1 : 1}
                            </span>

                            {/* Mini Capa */}
                            <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-900 shrink-0 border border-gray-200 dark:border-drive-darkBorder">
                              <img
                                src={episodeCoverUrl}
                                alt={track.title}
                                className="w-full h-full object-cover"
                              />
                            </div>

                            {/* Textos */}
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                                {track.title}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {hasOriginalCover && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] border border-emerald-500/25 flex items-center gap-0.5">
                                    <ImageIcon className="w-2.5 h-2.5" />
                                    <span>Original</span>
                                  </span>
                                )}
                                {badgeDateStr && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">{badgeDateStr}</span>
                                )}
                                <span>•</span>
                                <span className="font-mono">{track.duration || '45:00'}</span>
                                {track.description && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-xs">{formatEpisodeDescription(track.description)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações da Lista */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isTrackSaved ? (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-500/20">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Telegram</span>
                              </span>
                            ) : null}

                            {!isTrackSaved && track.audioUrl && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBackupTrackToTelegram(track);
                                }}
                                disabled={isBackingUpThis}
                                className="p-1.5 rounded-xl text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                                title="Salvar no Telegram"
                              >
                                {isBackingUpThis ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CloudUpload className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {/* Botão Play Rápido */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (realIndex >= 0) {
                                  handlePlayEpisodeAndCloseModal(realIndex);
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                              title="Tocar episódio e ir para tela principal"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span className="hidden sm:inline">Tocar</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEpisodeForDetail(track);
                              }}
                              className="p-1.5 rounded-xl text-gray-400 hover:text-emerald-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Ver detalhes"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {downloadTargetFile && (
        <VideoDownloadModal
          file={downloadTargetFile}
          isOpen={!!downloadTargetFile}
          onClose={() => setDownloadTargetFile(null)}
        />
      )}
    </div>
  );
};
