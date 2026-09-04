import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DownloadCloud, 
  Film, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Play, 
  HardDrive,
  Activity,
  Clock,
  RefreshCw,
  Zap,
  Minimize2,
  Headphones,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Archive,
  FileCode,
  File
} from 'lucide-react';
import { DriveItem } from '../types/index.js';

interface VideoDownloadProgress {
  progress: number;
  transferred: number;
  size: number;
  speed: string;
  stage: 'cloud' | 'local' | 'completed' | 'error' | 'idle';
  stageLabel: string;
}

interface VideoDownloadModalProps {
  file: DriveItem;
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  onPlayDirect?: () => void;
  customTitle?: string;
  customTypeLabel?: string;
}

function getItemInfo(file: DriveItem) {
  const type = file.type || '';
  const ext = (file.extension || '').toLowerCase();
  const mime = (file.mimeType || '').toLowerCase();

  if (type === 'video' || mime.startsWith('video/') || ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return {
      label: 'vídeo',
      icon: Film,
      actionVerb: 'Assistir',
      colorGradient: 'from-rose-600/30 via-pink-600/30 to-purple-600/30 border-rose-500/40 shadow-rose-500/20',
      accentColor: 'rose'
    };
  }
  if (type === 'audio' || mime.startsWith('audio/') || ['mp3', 'm4a', 'aac', 'ogg', 'flac', 'wav'].includes(ext)) {
    return {
      label: 'áudio',
      icon: Headphones,
      actionVerb: 'Ouvir',
      colorGradient: 'from-purple-600/30 via-indigo-600/30 to-blue-600/30 border-purple-500/40 shadow-purple-500/20',
      accentColor: 'purple'
    };
  }
  if (type === 'comic' || ['cbr', 'cbz'].includes(ext)) {
    return {
      label: 'HQ / Mangá',
      icon: BookOpen,
      actionVerb: 'Ler',
      colorGradient: 'from-pink-600/30 via-rose-600/30 to-amber-600/30 border-pink-500/40 shadow-pink-500/20',
      accentColor: 'pink'
    };
  }
  if (type === 'ebook' || type === 'pdf' || ['epub', 'pdf', 'mobi'].includes(ext)) {
    return {
      label: 'livro',
      icon: FileText,
      actionVerb: 'Ler',
      colorGradient: 'from-emerald-600/30 via-teal-600/30 to-cyan-600/30 border-emerald-500/40 shadow-emerald-500/20',
      accentColor: 'emerald'
    };
  }
  if (type === 'image' || mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
    return {
      label: 'imagem',
      icon: ImageIcon,
      actionVerb: 'Visualizar',
      colorGradient: 'from-amber-600/30 via-orange-600/30 to-yellow-600/30 border-amber-500/40 shadow-amber-500/20',
      accentColor: 'amber'
    };
  }
  if (type === 'archive' || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {
      label: 'arquivo compactado',
      icon: Archive,
      actionVerb: 'Abrir',
      colorGradient: 'from-blue-600/30 via-cyan-600/30 to-sky-600/30 border-blue-500/40 shadow-blue-500/20',
      accentColor: 'blue'
    };
  }
  return {
    label: 'arquivo',
    icon: File,
    actionVerb: 'Abrir',
    colorGradient: 'from-blue-600/30 via-sky-600/30 to-indigo-600/30 border-blue-500/40 shadow-blue-500/20',
    accentColor: 'blue'
  };
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return '0 MB';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(sizes.length - 1, Math.max(0, i));
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

function calculateEta(transferred: number, total: number, speedStr: string): string {
  if (!total || total <= transferred || transferred <= 0) return 'Pronto';
  const remainingBytes = Math.max(0, total - transferred);
  if (remainingBytes === 0) return '0s';

  const match = speedStr ? speedStr.match(/([\d.]+)\s*(MB|KB|GB|B)\/s/i) : null;
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    let bytesPerSec = 0;
    if (unit === 'GB') bytesPerSec = val * 1024 * 1024 * 1024;
    else if (unit === 'MB') bytesPerSec = val * 1024 * 1024;
    else if (unit === 'KB') bytesPerSec = val * 1024;
    else bytesPerSec = val;

    if (bytesPerSec > 1024) {
      const seconds = Math.ceil(remainingBytes / bytesPerSec);
      if (seconds < 60) return `~${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const remSecs = seconds % 60;
      return remSecs > 0 ? `~${mins}m ${remSecs}s` : `~${mins}m`;
    }
  }
  return 'Calculando...';
}

export const VideoDownloadModal: React.FC<VideoDownloadModalProps> = ({
  file,
  isOpen,
  onClose,
  onCompleted,
  onPlayDirect,
  customTitle,
  customTypeLabel
}) => {
  const [downloadProgress, setDownloadProgress] = useState<VideoDownloadProgress | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const isCompletedHandledRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const startDownloadAndCheck = useCallback(async () => {
    if (!file?.id) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOffline(true);
      setError('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      return;
    }

    try {
      setIsStarting(true);
      setError(null);
      setIsOffline(false);

      // 1. Check current status from server
      const statusRes = await fetch(`/api/video/${file.id}/cache-status`);
      if (!statusRes.ok) throw new Error('Falha ao comunicar com o servidor');
      const statusData = await statusRes.json();

      if (!isMountedRef.current) return;

      if (statusData.cached) {
        setIsCached(true);
        setDownloadProgress({
          progress: 100,
          transferred: statusData.size || file.size || 0,
          size: statusData.size || file.size || 0,
          speed: 'Pasta uploads',
          stage: 'completed',
          stageLabel: 'Vídeo disponível na pasta uploads!'
        });
        setIsStarting(false);
        if (!isCompletedHandledRef.current) {
          isCompletedHandledRef.current = true;
          onCompleted?.();
        }
        return;
      }

      // 2. Trigger download into uploads folder if not already cached and not downloading
      if (!statusData.isDownloading) {
        await fetch(`/api/video/${file.id}/cache`, { method: 'POST' });
      }
      setIsStarting(false);
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Erro ao iniciar download do vídeo');
        setIsStarting(false);
      }
    }
  }, [file?.id, file?.size, onCompleted]);

  // Online / Offline network event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (isOpen && !isCached) {
        startDownloadAndCheck();
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      setError('Conexão perdida. Sem internet.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen, isCached, startDownloadAndCheck]);

  // Main polling effect (polls progress exactly like ComicReader)
  useEffect(() => {
    if (!isOpen || !file) return;

    isCompletedHandledRef.current = false;
    setIsCached(false);
    setError(null);
    setDownloadProgress(null);

    startDownloadAndCheck();

    const pollInterval = setInterval(async () => {
      if (!isMountedRef.current || !isOpen) return;

      try {
        // Poll active upload/download progress map directly
        const progressRes = await fetch(`/api/uploads/progress/video-${file.id}`);
        if (progressRes.ok) {
          const data = await progressRes.json();
          if (!isMountedRef.current) return;

          if (data && data.stage && data.stage !== 'idle') {
            const rawPct = typeof data.progress === 'number' && !isNaN(data.progress) ? data.progress : 0;

            if (data.stage === 'completed' || rawPct >= 100) {
              setIsCached(true);
              setDownloadProgress({
                progress: 100,
                transferred: data.size || file.size || 0,
                size: data.size || file.size || 0,
                speed: 'Concluído',
                stage: 'completed',
                stageLabel: 'Vídeo salvo na pasta uploads!'
              });

              if (!isCompletedHandledRef.current) {
                isCompletedHandledRef.current = true;
                onCompleted?.();
              }
              return;
            }

            if (data.stage === 'error') {
              setError(data.stageLabel || 'Falha no download do vídeo');
              return;
            }

            setDownloadProgress({
              progress: Math.min(99, Math.max(0, rawPct)),
              transferred: data.transferred || 0,
              size: data.size || file.size || 0,
              speed: data.speed || 'Conectando...',
              stage: data.stage || 'cloud',
              stageLabel: data.stageLabel || `⚡ Baixando vídeo para a pasta uploads (${rawPct}%)...`
            });
            return;
          }
        }

        // Fallback: check status endpoint
        const statusRes = await fetch(`/api/video/${file.id}/cache-status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (!isMountedRef.current) return;

          if (statusData.cached) {
            setIsCached(true);
            setDownloadProgress({
              progress: 100,
              transferred: statusData.size || file.size || 0,
              size: statusData.size || file.size || 0,
              speed: 'Pasta uploads',
              stage: 'completed',
              stageLabel: 'Vídeo disponível na pasta uploads!'
            });

            if (!isCompletedHandledRef.current) {
              isCompletedHandledRef.current = true;
              onCompleted?.();
            }
          }
        }
      } catch (e) {}
    }, 200);

    return () => {
      clearInterval(pollInterval);
    };
  }, [file?.id, file?.size, isOpen, startDownloadAndCheck, onCompleted]);

  if (!isOpen) return null;

  const itemInfo = getItemInfo(file);
  const IconComponent = itemInfo.icon;
  const typeLabel = customTypeLabel || itemInfo.label;
  const currentSize = downloadProgress?.size || file.size || 0;
  const currentTransferred = isCached ? currentSize : (downloadProgress?.transferred || 0);
  const currentPct = isCached ? 100 : (downloadProgress ? Math.min(100, Math.max(0, downloadProgress.progress)) : 0);
  const currentSpeed = isCached ? 'Salvo em uploads' : (downloadProgress?.speed || (isStarting ? 'Conectando...' : 'Aguardando...'));
  const currentEta = isCached ? 'Concluído' : calculateEta(currentTransferred, currentSize, currentSpeed);
  const isFinished = isCached || (downloadProgress?.stage === 'completed') || currentPct >= 100;
  const fileExt = (file.extension || 'ARQUIVO').toUpperCase();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in select-none"
      onClick={onClose}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div 
        className="w-full max-w-md bg-gray-900/95 border border-gray-800 rounded-3xl p-6 sm:p-7 flex flex-col items-center shadow-2xl backdrop-blur-xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          title="Fechar modal (o download continuará em segundo plano)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Animated Glowing Icon Header */}
        <div className="relative mb-4 mt-1">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl border transition-all duration-500 ${
            isFinished
              ? 'bg-gradient-to-tr from-emerald-600/30 to-teal-600/30 border-emerald-500/50 shadow-emerald-500/20'
              : error
              ? 'bg-gradient-to-tr from-rose-600/30 to-red-600/30 border-rose-500/50 shadow-rose-500/20'
              : `bg-gradient-to-tr ${itemInfo.colorGradient} animate-pulse`
          }`}>
            {isFinished ? (
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400 animate-in zoom-in" />
            ) : error ? (
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-rose-400 animate-in zoom-in" />
            ) : (
              <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 text-rose-400 animate-pulse" />
            )}
          </div>
          <div className={`absolute -bottom-1 -right-1 p-1.5 rounded-xl text-white shadow-lg transition-all ${
            isFinished ? 'bg-emerald-600' : error ? 'bg-rose-600' : 'bg-rose-600 animate-bounce'
          }`}>
            {isFinished ? (
              <HardDrive className="w-3.5 h-3.5" />
            ) : error ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <DownloadCloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-base font-black text-gray-100 text-center mb-1 line-clamp-1 px-4" title={customTitle || file.name}>
          {(customTitle || file.name).replace(/\.[^/.]+$/, "")}
        </h3>

        {/* Dynamic Status Subtitle */}
        <p className={`text-xs font-semibold text-center mb-4 flex items-center justify-center gap-1.5 ${
          isFinished ? 'text-emerald-400' : error ? 'text-rose-400' : 'text-rose-300'
        }`}>
          {!isFinished && !error && <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-amber-400" />}
          <span>
            {isFinished 
              ? `✓ ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} salvo na pasta uploads!` 
              : error || downloadProgress?.stageLabel || (isStarting ? 'Conectando ao Telegram Cloud...' : `Baixando ${typeLabel} ${fileExt} para uploads...`)}
          </span>
        </p>

        {/* Real-time Progress Card */}
        <div className="w-full space-y-3 mb-4 bg-gray-950/80 p-4 rounded-2xl border border-gray-800/90 shadow-inner">
          {/* Top Bar: Speed & Percentage */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-gray-300 flex items-center gap-1.5 truncate">
              {isFinished ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0 shadow-sm shadow-emerald-400/50" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block shrink-0" />
              )}
              <span className="font-semibold text-gray-200">{currentSpeed}</span>
            </span>
            <span className={`text-sm font-black tracking-tight shrink-0 ${isFinished ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentPct}%
            </span>
          </div>

          {/* Animated Gradient Progress Bar */}
          <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden p-0.5 border border-gray-800 shadow-inner relative">
            <div 
              className={`h-full rounded-full transition-all duration-300 shadow-md relative ${
                isFinished 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                  : 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600'
              }`}
              style={{ width: `${Math.max(4, currentPct)}%` }}
            >
              {!isFinished && (
                <div className="absolute inset-0 bg-white/20 animate-[pulse_1.5s_ease-in-out_infinite]" />
              )}
            </div>
          </div>

          {/* Real-time 3-Column Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-800/60 text-center">
            <div className="flex flex-col items-center bg-gray-900/60 p-2 rounded-xl border border-gray-800/40">
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-gray-400" />
                <span>Tamanho</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-gray-200 mt-0.5 truncate w-full">
                {formatBytes(currentTransferred)} / {formatBytes(currentSize)}
              </span>
            </div>

            <div className="flex flex-col items-center bg-gray-900/60 p-2 rounded-xl border border-gray-800/40">
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <Activity className="w-3 h-3 text-rose-400" />
                <span>Velocidade</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-rose-300 mt-0.5 truncate w-full">
                {currentSpeed}
              </span>
            </div>

            <div className="flex flex-col items-center bg-gray-900/60 p-2 rounded-xl border border-gray-800/40">
              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Restante</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-amber-300 mt-0.5 truncate w-full">
                {currentEta}
              </span>
            </div>
          </div>
        </div>

        {/* Informative Help Text */}
        <p className="text-[11px] text-gray-400 text-center leading-relaxed mb-4 px-2">
          {isFinished 
            ? `O ${typeLabel} já está gravado na pasta uploads do seu disco local para uso imediato com zero travamentos.` 
            : 'O arquivo está sendo baixado diretamente para a pasta uploads do seu dispositivo. Você pode fechar este modal que o download continuará em segundo plano.'}
        </p>

        {/* Dynamic Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-2 pt-1">
          {error ? (
            <button
              onClick={() => startDownloadAndCheck()}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          ) : isFinished ? (
            <>
              {onPlayDirect ? (
                <button
                  onClick={() => {
                    onPlayDirect();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{itemInfo.actionVerb} (Local)</span>
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Concluído (Fechar)</span>
                </button>
              )}
            </>
          ) : (
            <>
              {onPlayDirect && (
                <button
                  onClick={() => {
                    onPlayDirect();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold transition-all border border-gray-700 hover:border-gray-600"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{itemInfo.actionVerb} via Stream</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold transition-all border border-gray-700"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Minimizar (2º Plano)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Aliases for clear semantic use in other libraries
export const MediaDownloadModal = VideoDownloadModal;
export const FileDownloadModal = VideoDownloadModal;


