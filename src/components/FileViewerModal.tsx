import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  Send, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Repeat, 
  Maximize, 
  FileText, 
  Music, 
  Image as ImageIcon, 
  FileCode, 
  HardDrive, 
  Info,
  ChevronLeft,
  ChevronRight,
  BookmarkPlus,
  Subtitles,
  Plus,
  Trash2,
  Upload,
  CloudUpload,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { DriveItem, VideoTimestamp, VideoSubtitle } from '../types/index.js';
import { ComicReader } from './ComicReader.js';
import { EpubReader } from './EpubReader.js';
import { PdfReader } from './PdfReader.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { GenerateMarkersModal } from './GenerateMarkersModal.js';

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(timeStr) || 0;
}

function parseSubtitleContent(content: string): SubtitleCue[] {
  const clean = content.replace(/\r\n|\r/g, '\n');
  const blocks = clean.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        const timeMatch = lines[i].split('-->');
        if (timeMatch.length === 2) {
          const start = parseTimeToSeconds(timeMatch[0]);
          const end = parseTimeToSeconds(timeMatch[1]);
          const text = lines.slice(i + 1).join('\n').replace(/<[^>]*>/g, '').trim();
          if (text && !isNaN(start) && !isNaN(end)) {
            cues.push({ start, end, text });
          }
        }
      }
    }
  }
  return cues;
}

interface FileViewerModalProps {
  file: DriveItem | null;
  folderFiles: DriveItem[];
  onClose: () => void;
  onSelectFile: (file: DriveItem) => void;
  onRetryUploadTelegram?: (fileId: string) => Promise<any> | void;
  retryingFileIds?: string[];
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  folderFiles,
  onClose,
  onSelectFile,
  onRetryUploadTelegram,
  retryingFileIds = []
}) => {
  const [isAutoPlaySequence, setIsAutoPlaySequence] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'info' | 'timestamps' | 'subtitles'>('timestamps');
  
  // Local timestamps & subtitles for this file preview
  const [timestamps, setTimestamps] = useState<VideoTimestamp[]>([]);
  const [subtitles, setSubtitles] = useState<VideoSubtitle[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [newTsLabel, setNewTsLabel] = useState('');

  // Video time & cues
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [isVideoDownloadModalOpen, setIsVideoDownloadModalOpen] = useState(false);
  const [isGenerateMarkersModalOpen, setIsGenerateMarkersModalOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      setTimestamps([...(file.timestamps || [])].sort((a, b) => a.seconds - b.seconds));
      setSubtitles(file.subtitles || []);
      if (file.subtitles && file.subtitles.length > 0) {
        setSelectedSubtitleId(file.subtitles[0].id);
      } else {
        setSelectedSubtitleId(null);
      }
    }
  }, [file?.id]);

  // Sync native HTML5 textTrack mode with selectedSubtitleId
  useEffect(() => {
    if (videoRef.current && videoRef.current.textTracks) {
      const tracks = videoRef.current.textTracks;
      const active = subtitles.find(s => s.id === selectedSubtitleId);
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        if (selectedSubtitleId && (track.label === active?.label || track.language === active?.srclang)) {
          track.mode = 'showing';
        } else {
          track.mode = 'disabled';
        }
      }
    }
  }, [selectedSubtitleId, subtitles]);

  if (!file) return null;

  const sameTypeFiles = folderFiles.filter(f => f.type === file.type);
  const currentIndex = sameTypeFiles.findIndex(f => f.id === file.id);
  const hasNext = currentIndex >= 0 && currentIndex < sameTypeFiles.length - 1;
  const hasPrev = currentIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      onSelectFile(sameTypeFiles[currentIndex + 1]);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      onSelectFile(sameTypeFiles[currentIndex - 1]);
    }
  };

  const handleMediaEnded = () => {
    if (isAutoPlaySequence && hasNext) {
      handleNext();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddTimestamp = async () => {
    if (!videoRef.current) return;
    const currentSeconds = Math.floor(videoRef.current.currentTime);
    const timeFormatted = formatSeconds(currentSeconds);
    const label = newTsLabel.trim() || `Ponto ${timeFormatted}`;

    const newTs: VideoTimestamp = {
      id: 'ts-' + Date.now(),
      seconds: currentSeconds,
      timeFormatted,
      label
    };

    const updated = [...timestamps, newTs].sort((a, b) => a.seconds - b.seconds);
    setTimestamps(updated);
    setNewTsLabel('');

    try {
      await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamps: updated })
      });
    } catch (e) {}
  };

  const handleSeek = (sec: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleDeleteTs = async (tsId: string) => {
    const updated = timestamps.filter(t => t.id !== tsId);
    setTimestamps(updated);
    try {
      await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamps: updated })
      });
    } catch (e) {}
  };

  const handleSaveGeneratedFileTimestamps = async (newTimestamps: VideoTimestamp[]) => {
    if (!file) return;
    setTimestamps(newTimestamps);
    try {
      await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamps: newTimestamps })
      });
    } catch (e) {
      console.error('Error saving generated timestamps to file:', e);
    }
  };

  const handleAddSubtitle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const subFile = e.target.files?.[0];
    if (!subFile) return;

    const text = await subFile.text();
    let vttContent = text;
    if (subFile.name.endsWith('.srt')) {
      vttContent = 'WEBVTT\n\n' + text.replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2');
    }

    const vttDataUrl = 'data:text/vtt;charset=utf-8,' + encodeURIComponent(vttContent);
    const newSub: VideoSubtitle = {
      id: 'sub-' + Date.now(),
      label: subFile.name.replace(/\.[^/.]+$/, ""),
      srclang: 'pt',
      url: vttDataUrl
    };

    const updated = [...subtitles, newSub];
    setSubtitles(updated);
    setSelectedSubtitleId(newSub.id);

    try {
      await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitles: updated })
      });
    } catch (e) {}
  };

  const activeSub = subtitles.find(s => s.id === selectedSubtitleId);
  const activeCue = subtitleCues.find(c => videoCurrentTime >= c.start && videoCurrentTime <= c.end);

  const isComic = file.type === 'comic' || 
    ['cbr', 'cbz', 'cbt', 'cb7'].includes(file.extension?.toLowerCase()) || 
    /\.(cbr|cbz|cbt|cb7)$/i.test(file.name);

  const isEpub = file.type === 'ebook' || 
    file.extension?.toLowerCase() === 'epub' || 
    /\.epub$/i.test(file.name);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className={`relative flex flex-col w-full ${isComic || isEpub ? 'max-w-[96vw] h-[94vh]' : 'max-w-5xl h-[88vh]'} bg-drive-darkSurface rounded-3xl border border-gray-800 shadow-2xl overflow-hidden text-gray-100`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-800 bg-gray-900/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2 truncate">
              {file.telegramMeta?.isUploadedToTelegram ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                  <Send className="w-2.5 h-2.5" />
                  TG #{file.telegramMeta.messageId || 'Salvas'}
                </span>
              ) : retryingFileIds.includes(file.id) ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-500/40 animate-pulse shadow-xs">
                  <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
                  <span>Enviando ao Telegram...</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onRetryUploadTelegram?.(file.id)}
                  title="Arquivo salvo apenas no cache local. Clique para enviar para as Mensagens Salvas do Telegram agora"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 transition-transform active:scale-95 cursor-pointer shadow-xs"
                >
                  <CloudUpload className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>Salvar no Telegram</span>
                </button>
              )}
              <h2 className="text-sm font-bold text-white truncate max-w-md" title={file.name}>
                {file.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sequential Autoplay Toggle for Video / Audio */}
            {(file.type === 'video' || file.type === 'audio') && (
              <button
                onClick={() => setIsAutoPlaySequence(!isAutoPlaySequence)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isAutoPlaySequence
                    ? 'bg-sky-950/60 text-sky-300 border-sky-700'
                    : 'bg-gray-800 text-gray-400 border-gray-700'
                }`}
                title="Reproduzir o próximo arquivo da pasta automaticamente"
              >
                <Repeat className={`w-3.5 h-3.5 ${isAutoPlaySequence ? 'text-sky-400 animate-pulse' : ''}`} />
                <span>Sequência: <strong>{isAutoPlaySequence ? 'ON' : 'OFF'}</strong></span>
              </button>
            )}

            {file.type === 'video' && (
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  showInfo ? 'bg-amber-600 text-white border-amber-500' : 'bg-gray-800 text-amber-400 border-gray-700 hover:bg-gray-700'
                }`}
                title="Timestamps e Legendas"
              >
                <BookmarkPlus className="w-4 h-4" />
                <span>Timestamps & Legendas</span>
              </button>
            )}

            <button
              onClick={() => setIsVideoDownloadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all active:scale-95"
              title="Baixar Arquivo para Cache Local"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Media Preview */}
          <div className="flex-1 flex items-center justify-center bg-black/50 p-0 sm:p-2 relative overflow-hidden">
            {/* Comic / HQ CBR/CBZ Viewer */}
            {isComic && (
              <div className="w-full h-full">
                <ComicReader file={file} />
              </div>
            )}

            {/* EPUB E-Book Reader */}
            {isEpub && (
              <div className="w-full h-full">
                <EpubReader file={file} />
              </div>
            )}

            {/* Video Player */}
            {file.type === 'video' && (
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  key={file.id}
                  controls
                  autoPlay
                  playsInline
                  onEnded={handleMediaEnded}
                  onTimeUpdate={(e) => setVideoCurrentTime(e.currentTarget.currentTime)}
                  src={`/api/stream/${file.id}`}
                  className="max-h-full max-w-full rounded-xl shadow-2xl object-contain"
                >
                  {subtitles.map((sub) => (
                    <track
                      key={sub.id}
                      kind="subtitles"
                      src={sub.url}
                      srcLang={sub.srclang || 'pt'}
                      label={sub.label || 'Português'}
                      default={sub.id === selectedSubtitleId}
                    />
                  ))}
                </video>
              </div>
            )}

            {/* Audio Player */}
            {file.type === 'audio' && (
              <div className="flex flex-col items-center justify-center p-8 bg-gray-900/80 rounded-3xl border border-gray-800 max-w-md w-full shadow-2xl">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30">
                  <Music className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-base text-center mb-2 truncate w-full">{file.name}</h3>
                <span className="text-xs text-gray-400 mb-6">{formatBytes(file.size)}</span>
                <audio
                  ref={audioRef}
                  controls
                  autoPlay
                  onEnded={handleMediaEnded}
                  src={`/api/stream/${file.id}`}
                  className="w-full"
                />
              </div>
            )}

            {/* Image Lightbox */}
            {file.type === 'image' && (
              <img
                src={`/api/stream/${file.id}`}
                alt={file.name}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-full max-w-full rounded-xl object-contain shadow-2xl select-none"
              />
            )}

            {/* PDF Viewer */}
            {file.type === 'pdf' && (
              <div className="w-full h-full rounded-xl overflow-hidden">
                <PdfReader file={file} />
              </div>
            )}

            {/* Other / Document Preview */}
            {!['video', 'audio', 'image', 'pdf'].includes(file.type) && !isComic && !isEpub && (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                <FileText className="w-16 h-16 text-blue-400 mb-4" />
                <h3 className="font-bold text-base mb-1">{file.name}</h3>
                <p className="text-xs text-gray-400 mb-6">
                  {file.description || 'Este arquivo está salvo com segurança nas suas Mensagens Salvas do Telegram.'}
                </p>
                <a
                  href={`/api/stream/${file.id}`}
                  download={file.name}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                >
                  Baixar Arquivo Completo ({formatBytes(file.size)})
                </a>
              </div>
            )}

            {/* Previous / Next Arrow Controls for Standard Media */}
            {!isComic && !isEpub && hasPrev && (
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-gray-700 transition-transform hover:scale-110"
                title="Arquivo Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {!isComic && !isEpub && hasNext && (
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-gray-700 transition-transform hover:scale-110"
                title="Próximo Arquivo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Right Timestamps & Subtitles Drawer */}
          {showInfo && (
            <div className="w-80 border-l border-gray-800 bg-gray-900 p-4 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-200 flex flex-col text-xs">
              {/* Drawer Tabs */}
              <div className="flex bg-gray-800 p-1 rounded-xl mb-3">
                <button
                  onClick={() => setActiveSideTab('timestamps')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] ${
                    activeSideTab === 'timestamps' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Timestamps ({timestamps.length})
                </button>
                <button
                  onClick={() => setActiveSideTab('subtitles')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] ${
                    activeSideTab === 'subtitles' ? 'bg-sky-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Legendas ({subtitles.length})
                </button>
                <button
                  onClick={() => setActiveSideTab('info')}
                  className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] ${
                    activeSideTab === 'info' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Info
                </button>
              </div>

              {/* TAB 1: TIMESTAMPS */}
              {activeSideTab === 'timestamps' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  {subtitles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsGenerateMarkersModalOpen(true)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      title="Gerar capítulos e marcadores a partir da legenda em 1 clique"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>✨ Gerar Marcadores da Legenda</span>
                    </button>
                  )}

                  <div className="p-2.5 rounded-xl bg-gray-800/90 border border-gray-700 space-y-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                      Criar Timestamp no Tempo Atual
                    </span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newTsLabel}
                        onChange={(e) => setNewTsLabel(e.target.value)}
                        placeholder="Nome do ponto..."
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-gray-950 border border-gray-700 focus:outline-none"
                      />
                      <button
                        onClick={handleAddTimestamp}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto">
                    {[...timestamps].sort((a, b) => a.seconds - b.seconds).map((ts) => (
                      <div
                        key={ts.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-750 group transition-colors"
                      >
                        <button
                          onClick={() => handleSeek(ts.seconds)}
                          className="flex items-center gap-2 text-left flex-1 truncate"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px] font-bold">
                            ▶ {ts.timeFormatted}
                          </span>
                          <span className="text-gray-200 truncate">{ts.label}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTs(ts.id)}
                          className="p-1 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {timestamps.length === 0 && (
                      <p className="text-gray-500 text-center py-6 text-[11px]">
                        Nenhum timestamp adicionado.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: SUBTITLES */}
              {activeSideTab === 'subtitles' && (
                <div className="space-y-3">
                  <button
                    onClick={() => subtitleInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo (.srt / .vtt)</span>
                  </button>
                  <input
                    type="file"
                    ref={subtitleInputRef}
                    onChange={handleAddSubtitle}
                    accept=".vtt,.srt"
                    className="hidden"
                  />

                  <div className="space-y-1.5 pt-2">
                    {subtitles.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => setSelectedSubtitleId(s.id === selectedSubtitleId ? null : s.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${
                          selectedSubtitleId === s.id
                            ? 'bg-sky-950 border-sky-500 text-sky-200 font-bold'
                            : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span>{s.label}</span>
                        <span className="text-[10px]">{selectedSubtitleId === s.id ? 'Ativa ✅' : 'Desativada'}</span>
                      </div>
                    ))}
                    {subtitles.length === 0 && (
                      <p className="text-gray-500 text-center py-6 text-[11px]">
                        Nenhuma legenda carregada para este vídeo.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FILE INFO */}
              {activeSideTab === 'info' && (
                <div className="space-y-3.5">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Nome</span>
                    <span className="font-semibold text-white break-all">{file.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Tamanho</span>
                    <span className="font-mono text-gray-200">{formatBytes(file.size)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Telegram Saved Messages</span>
                    <span className="text-sky-400 font-mono">#{file.telegramMeta?.messageId || '1042'}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Video Download & Cache Progress Modal */}
      {(file.type === 'video' || file.mimeType?.includes('video')) && (
        <VideoDownloadModal
          file={file}
          isOpen={isVideoDownloadModalOpen}
          onClose={() => setIsVideoDownloadModalOpen(false)}
        />
      )}

      {/* Generate Subtitle Markers Modal */}
      {subtitles.length > 0 && (
        <GenerateMarkersModal
          isOpen={isGenerateMarkersModalOpen}
          onClose={() => setIsGenerateMarkersModalOpen(false)}
          subtitles={subtitles}
          selectedSubId={selectedSubtitleId || undefined}
          videoDuration={videoRef.current?.duration}
          onSeek={(seconds) => handleSeek(seconds)}
          onSaveTimestamps={handleSaveGeneratedFileTimestamps}
        />
      )}
    </div>
  );
};
