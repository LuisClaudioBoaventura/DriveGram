import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Bookmark,
  Download,
  Edit3,
  Star,
  User,
  Clock,
  Airplay,
  Plus,
  Trash2,
  Cast,
  ExternalLink,
  CloudUpload,
  Loader2,
  Heart,
  UtensilsCrossed,
  ChefHat,
  Users,
  ListChecks,
  FileText,
  RotateCcw,
  Save,
  Tv
} from 'lucide-react';
import { RecipeVideo, DriveItem, VideoTimestamp } from '../types/index.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';
import { CastModal } from './CastModal.js';
import { MarqueeTitle } from './MarqueeTitle.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';
import { isYouTubeVideoUrl, saveYouTubeVideoToTelegram, YouTubeSaveProgress } from '../utils/youtubeTelegramSave.js';
import {
  DIFFICULTY_META,
  RECIPE_PRESET_COVERS,
  extractYouTubeIdFromUrl,
  buildYouTubeEmbedUrl
} from '../utils/recipeUtils.js';

interface RecipePlayerViewProps {
  recipe: RecipeVideo;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateProgress: (recipeId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onUpdateRecipe: (updated: RecipeVideo) => Promise<void>;
  onOpenEditModal?: () => void;
}

export const RecipePlayerView: React.FC<RecipePlayerViewProps> = ({
  recipe,
  allFiles,
  onBackToCatalog,
  onUpdateProgress,
  onUpdateRecipe,
  onOpenEditModal
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedSubId, setSelectedSubId] = useState<string>('none');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isCastModalOpen, setIsCastModalOpen] = useState(false);
  const [savingToTelegram, setSavingToTelegram] = useState<YouTubeSaveProgress | null>(null);
  const [localSavedFile, setLocalSavedFile] = useState<DriveItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Interactive kitchen checklist state
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Inline instructions quick-editor
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [draftInstructions, setDraftInstructions] = useState(recipe.instructions || '');
  const [savingNotes, setSavingNotes] = useState(false);

  // Timestamps
  const videoFile =
    (recipe.fileId
      ? (allFiles.find(f => f.id === recipe.fileId && !f.isTrash) ||
         (localSavedFile?.id === recipe.fileId ? localSavedFile : null))
      : null) ||
    (recipe.folderId && !recipe.embedUrl && !recipe.videoUrl
      ? allFiles.find(
          f =>
            f.parentId === recipe.folderId &&
            !f.isTrash &&
            (f.type === 'video' ||
              (f.mimeType && f.mimeType.startsWith('video/')) ||
              ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes((f.extension || '').toLowerCase()))
        )
      : null);

  const subtitles = recipe.subtitles || videoFile?.subtitles || [];
  const [localTimestamps, setLocalTimestamps] = useState<VideoTimestamp[]>(() => {
    const raw = recipe.timestamps || videoFile?.timestamps || [];
    return [...raw].sort((a, b) => a.seconds - b.seconds);
  });
  const [newTimestampLabel, setNewTimestampLabel] = useState('');

  useEffect(() => {
    const raw = recipe.timestamps || videoFile?.timestamps || [];
    setLocalTimestamps([...raw].sort((a, b) => a.seconds - b.seconds));
    setDraftInstructions(recipe.instructions || '');
    setCheckedIngredients(new Set());
    setIsEditingNotes(false);
    setLocalSavedFile(null);
  }, [recipe.id]);

  useEffect(() => {
    if (videoRef.current && (recipe.lastPositionSeconds || 0) > 0) {
      videoRef.current.currentTime = recipe.lastPositionSeconds || 0;
    }
  }, [recipe.id]);

  const showTempFeedback = (msg: string, ms = 4500) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), ms);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const lastSavedTimeRef = useRef<number>(0);
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (Math.abs(curr - lastSavedTimeRef.current) >= 5) {
      lastSavedTimeRef.current = curr;
      onUpdateProgress(recipe.id, Math.floor(curr));
    }
  };

  const handleBack = () => {
    if (videoRef.current) {
      onUpdateProgress(recipe.id, Math.floor(videoRef.current.currentTime));
    }
    onBackToCatalog();
  };

  const handleSaveToTelegram = async () => {
    const targetUrl = recipe.videoUrl || recipe.embedUrl || recipe.sourceUrl;
    if (!targetUrl || savingToTelegram) return;
    setSavingToTelegram({ progress: 2, stageLabel: 'Iniciando...' });
    try {
      const result = await saveYouTubeVideoToTelegram(
        {
          videoUrl: targetUrl,
          title: recipe.title,
          targetType: 'recipe',
          videoId: recipe.id,
          folderId: recipe.folderId
        },
        (info) => setSavingToTelegram(info)
      );
      if (result.file) {
        setLocalSavedFile(result.file);
      }
      if (result.video) {
        await onUpdateRecipe(result.video);
      } else if (result.file) {
        await onUpdateRecipe({
          ...recipe,
          fileId: result.file.id,
          folderId: recipe.folderId || result.file.parentId || undefined,
          updatedAt: new Date().toISOString()
        });
      }
      showTempFeedback('✅ Vídeo da receita salvo no seu Telegram!');
    } catch (err: any) {
      showTempFeedback(err?.message || 'Erro ao salvar vídeo no Telegram.', 6000);
    } finally {
      setSavingToTelegram(null);
    }
  };

  const handleOpenExternalPlayer = async () => {
    const fileId = videoFile?.id || recipe.fileId;
    if (!fileId) return;
    const streamUrl = resolveApiUrl(`/api/stream/${fileId}`);

    showTempFeedback('Iniciando player externo...');
    try {
      if ((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('open_in_external_player', { url: streamUrl, title: recipe.title });
        showTempFeedback('✅ Aberto no VLC / Player do Sistema!');
        return;
      }
    } catch {}

    try {
      const res = await fetch(resolveApiUrl('/api/media/open-external'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: streamUrl, title: recipe.title })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showTempFeedback('✅ Aberto no VLC / Player do Sistema!');
          return;
        }
      }
    } catch {}

    window.open(resolveApiUrl(`/api/stream/${fileId}/playlist.m3u`), '_blank');
    showTempFeedback('✅ Playlist M3U aberta!');
  };

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const handleAddTimestamp = async () => {
    const secs = Math.floor(videoRef.current?.currentTime || currentTime || 0);
    const label = newTimestampLabel.trim() || `Etapa em ${formatTime(secs)}`;
    const newTs: VideoTimestamp = {
      id: `ts-${Date.now()}`,
      label,
      seconds: secs,
      timeFormatted: formatTime(secs)
    };
    const nextList = [...localTimestamps, newTs].sort((a, b) => a.seconds - b.seconds);
    setLocalTimestamps(nextList);
    setNewTimestampLabel('');
    await onUpdateRecipe({
      ...recipe,
      timestamps: nextList,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteTimestamp = async (tsId: string) => {
    const nextList = localTimestamps.filter(t => t.id !== tsId);
    setLocalTimestamps(nextList);
    await onUpdateRecipe({
      ...recipe,
      timestamps: nextList,
      updatedAt: new Date().toISOString()
    });
  };

  const handleSaveInlineInstructions = async () => {
    setSavingNotes(true);
    try {
      await onUpdateRecipe({
        ...recipe,
        instructions: draftInstructions,
        updatedAt: new Date().toISOString()
      });
      setIsEditingNotes(false);
      showTempFeedback('✅ Modo de preparo salvo!');
    } finally {
      setSavingNotes(false);
    }
  };

  const toggleIngredientCheck = (index: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const ytId = extractYouTubeIdFromUrl(recipe.videoUrl || recipe.embedUrl || recipe.sourceUrl);
  const diffMeta = DIFFICULTY_META[recipe.difficulty || 'facil'];
  const ingredientsList = recipe.ingredients || [];
  const activeSub = subtitles.find(s => s.id === selectedSubId);

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-black text-gray-900 dark:text-white overflow-y-auto">
      {/* Slim Sticky Top Bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-1.5 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 shrink-0 h-11">
        <button
          onClick={handleBack}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900/90 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 border border-gray-200 dark:border-gray-800 shadow-sm transition-all active:scale-95 shrink-0"
          title="Voltar para Receitas & Culinária"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 overflow-hidden px-2 flex-1 min-w-0">
          <span className="px-2 py-0.5 rounded-lg bg-orange-500 text-white text-[10px] font-black uppercase shadow-sm shrink-0">
            {recipe.category || 'Receita'}
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            <MarqueeTitle
              text={recipe.title}
              as="h2"
              className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!videoFile && isYouTubeVideoUrl(recipe.videoUrl || recipe.embedUrl || recipe.sourceUrl) && (
            <button
              onClick={handleSaveToTelegram}
              disabled={!!savingToTelegram}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-sm transition-all active:scale-95 ${
                savingToTelegram
                  ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/50 cursor-wait'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-700 dark:text-sky-300 border-sky-400/40'
              }`}
              title={savingToTelegram?.stageLabel || 'Baixar do YouTube e salvar permanentemente no Telegram'}
            >
              {savingToTelegram ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{savingToTelegram.progress}%</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salvar no Telegram</span>
                </>
              )}
            </button>
          )}

          {videoFile && (
            <>
              <span
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold"
                title="Vídeo salvo permanentemente no Telegram"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Salvo no Telegram</span>
              </span>

              <button
                onClick={async () => {
                  if (!videoRef.current) return;
                  try {
                    if (document.pictureInPictureElement) {
                      await document.exitPictureInPicture();
                    } else if (videoRef.current.requestPictureInPicture) {
                      await videoRef.current.requestPictureInPicture();
                    }
                  } catch {}
                }}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                title="Picture-in-Picture (Flutuante)"
              >
                <Airplay className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsCastModalOpen(true)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                title="Transmitir para TV / Chromecast"
              >
                <Cast className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsDownloadModalOpen(true)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                title="Baixar para Cache Local"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            onClick={() =>
              onUpdateRecipe({
                ...recipe,
                isFavorite: !recipe.isFavorite,
                updatedAt: new Date().toISOString()
              })
            }
            className={`p-2 rounded-xl border transition-all ${
              recipe.isFavorite
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300'
            }`}
            title={recipe.isFavorite ? 'Remover dos favoritos' : 'Favoritar receita'}
          >
            <Heart className={`w-4 h-4 ${recipe.isFavorite ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={() =>
              onUpdateRecipe({
                ...recipe,
                isCompleted: !recipe.isCompleted,
                updatedAt: new Date().toISOString()
              })
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              recipe.isCompleted
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            title="Marcar se já fez esta receita"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{recipe.isCompleted ? 'Já Fiz ✓' : 'Marcar como Feita'}</span>
          </button>

          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
              title="Editar Receita"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="mx-4 mt-3 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-700 dark:text-orange-300 text-xs font-semibold text-center">
          {feedbackMsg}
        </div>
      )}

      {/* Main Content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Video Player Area */}
        {videoFile ? (
          <>
            <div className="relative w-full max-h-[72vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center">
              <video
                ref={videoRef}
                src={resolveApiUrl(`/api/stream/${videoFile.id}`)}
                controls
                autoPlay
                playsInline
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => onUpdateProgress(recipe.id, Math.floor(videoRef.current?.duration || currentTime), true)}
                className="w-full h-full max-h-[72vh] object-contain"
                crossOrigin="anonymous"
              >
                {activeSub && (
                  <track
                    kind="subtitles"
                    src={activeSub.url || (activeSub.fileId ? resolveApiUrl(`/api/stream/${activeSub.fileId}`) : '')}
                    srcLang={activeSub.srclang || 'pt'}
                    label={activeSub.label}
                    default
                  />
                )}
              </video>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs bg-amber-50 dark:bg-gray-900/60 rounded-xl border border-amber-200 dark:border-gray-800">
              <span className="flex items-center gap-1.5 text-amber-950 dark:text-gray-300">
                <Tv className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Problemas de codec no vídeo?</span>
              </span>
              <div className="flex items-center gap-3">
                {subtitles.length > 0 && (
                  <select
                    value={selectedSubId}
                    onChange={(e) => setSelectedSubId(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs"
                  >
                    <option value="none">Sem Legenda</option>
                    {subtitles.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={handleOpenExternalPlayer}
                  className="text-amber-700 dark:text-amber-400 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no VLC / Player do Sistema
                </button>
              </div>
            </div>
          </>
        ) : ytId ? (
          <div className="relative w-full min-h-[45vh] max-h-[72vh] aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800/90 flex items-center justify-center">
            <iframe
              src={recipe.embedUrl || buildYouTubeEmbedUrl(ytId, true)}
              title={recipe.title}
              className="w-full h-full min-h-[45vh] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-orange-950 via-amber-950 to-slate-900 border border-orange-500/30 p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6 text-white shadow-xl">
            <img
              src={recipe.coverImage || RECIPE_PRESET_COVERS[0]}
              alt={recipe.title}
              className="w-full sm:w-72 aspect-video object-cover rounded-2xl border border-white/15 shadow-lg shrink-0"
            />
            <div className="space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 text-orange-200 text-xs font-bold border border-orange-400/30">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Link Externo de Receita</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black">{recipe.title}</h3>
              <p className="text-xs text-gray-300 max-w-lg">
                Esta receita aponta para um link externo ({recipe.sourcePlatform || 'Web'}). Você pode abrir o vídeo original no navegador ou salvar o arquivo .mp4 na pasta dedicada <strong>Receitas</strong> do Drive e sincronizar.
              </p>
              {recipe.sourceUrl && (
                <a
                  href={recipe.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold shadow-lg"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Vídeo Original</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Kitchen Workspace: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 cols: Ingredients Checklist + Instructions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipe Header Metadata Card */}
            <div className="bg-white dark:bg-gray-900/60 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-500/20">
                  {recipe.category || 'Receita'}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${diffMeta.badgeClass}`}>
                  <ChefHat className="w-3 h-3 inline mr-1" />
                  {diffMeta.label}
                </span>
                {recipe.prepTime && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    {recipe.prepTime}
                  </span>
                )}
                {recipe.servings && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
                    <Users className="w-3.5 h-3.5 text-orange-500" />
                    {recipe.servings}
                  </span>
                )}
                {recipe.author && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-semibold">
                    <User className="w-3.5 h-3.5 text-orange-500" />
                    {recipe.author}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{recipe.title}</h1>
                {recipe.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-relaxed">
                    {recipe.description}
                  </p>
                )}
              </div>

              {/* Rating + Original Link + Speed */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1">Sua Nota:</span>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        onUpdateRecipe({
                          ...recipe,
                          rating: recipe.rating === star ? 0 : star,
                          updatedAt: new Date().toISOString()
                        })
                      }
                      className="p-0.5 transition-transform hover:scale-110"
                      title={`${star} estrela(s)`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          (recipe.rating || 0) >= star
                            ? 'text-amber-500 fill-current'
                            : 'text-gray-300 dark:text-gray-700'
                        }`}
                      />
                    </button>
                  ))}
                </div>

                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver link original</span>
                  </a>
                )}

                {videoFile && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500 font-bold">Velocidade:</span>
                    {[0.75, 1, 1.25, 1.5, 2].map(spd => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${
                          playbackRate === spd
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Interactive Ingredients Checklist */}
            <div className="bg-white dark:bg-gray-900/60 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-orange-500" />
                  <span>Ingredientes ({ingredientsList.length})</span>
                </h3>
                {checkedIngredients.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setCheckedIngredients(new Set())}
                    className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Desmarcar todos</span>
                  </button>
                )}
              </div>

              {ingredientsList.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ingredientsList.map((ing, idx) => {
                    const isChecked = checkedIngredients.has(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleIngredientCheck(idx)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-gray-400 line-through'
                            : 'bg-gray-50 dark:bg-gray-950/60 border-gray-200 dark:border-gray-800 hover:border-orange-500/40 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3 h-3" />}
                        </div>
                        <span className="font-medium">{ing}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-950/40 border border-dashed border-gray-200 dark:border-gray-800 text-center space-y-2">
                  <p className="text-xs text-gray-500">Nenhum ingrediente cadastrado ainda.</p>
                  {onOpenEditModal && (
                    <button
                      type="button"
                      onClick={onOpenEditModal}
                      className="text-xs font-bold text-orange-500 hover:underline"
                    >
                      + Adicionar lista de ingredientes
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Preparation Notes / Instructions */}
            <div className="bg-white dark:bg-gray-900/60 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500" />
                  <span>Modo de Preparo & Dicas</span>
                </h3>
                {!isEditingNotes ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar notas</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftInstructions(recipe.instructions || '');
                        setIsEditingNotes(false);
                      }}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={savingNotes}
                      onClick={handleSaveInlineInstructions}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold"
                    >
                      <Save className="w-3 h-3" />
                      <span>{savingNotes ? 'Salvando...' : 'Salvar'}</span>
                    </button>
                  </div>
                )}
              </div>

              {isEditingNotes ? (
                <textarea
                  value={draftInstructions}
                  onChange={(e) => setDraftInstructions(e.target.value)}
                  rows={6}
                  placeholder="Anote o passo a passo, temperatura, tempo de forno ou adaptações que você fez..."
                  className="w-full p-3.5 text-xs rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : recipe.instructions ? (
                <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed bg-gray-50 dark:bg-gray-950/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                  {recipe.instructions}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  Sem anotações de preparo ainda. Clique em "Editar notas" para registrar dicas e passos.
                </p>
              )}
            </div>
          </div>

          {/* Right Col: Recipe Timestamps & Tags */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-900/70 p-5 sm:p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-orange-500" />
                <span>Marcadores da Receita ({localTimestamps.length})</span>
              </h3>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newTimestampLabel}
                  onChange={(e) => setNewTimestampLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTimestamp();
                    }
                  }}
                  placeholder="Ex: Ponto da massa, Calda, Forno..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-950/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddTimestamp}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Marcar Tempo Atual</span>
                </button>
              </div>

              {localTimestamps.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {localTimestamps.map(ts => (
                    <div
                      key={ts.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-950/60 hover:bg-orange-50 dark:hover:bg-orange-500/15 border border-gray-200 dark:border-gray-800 transition-all group"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = ts.seconds;
                            videoRef.current.play();
                          }
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 pr-2 text-left"
                      >
                        <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800/60 px-2 py-0.5 rounded-md shrink-0">
                          ▶ {formatTime(ts.seconds)}
                        </span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {ts.label}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTimestamp(ts.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"
                        title="Excluir marcador"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800/60 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Nenhum marcador ainda. Marque o momento exato de cada etapa!
                  </p>
                </div>
              )}

              {recipe.tags && recipe.tags.length > 0 && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5">
                  {recipe.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold border border-orange-500/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {videoFile && (
        <VideoDownloadModal
          file={videoFile}
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          customTitle={recipe.title}
        />
      )}

      {videoFile && (
        <CastModal
          isOpen={isCastModalOpen}
          onClose={() => setIsCastModalOpen(false)}
          mediaUrl={resolveApiUrl(`/api/stream/${videoFile.id}`)}
          title={recipe.title}
          videoElementRef={videoRef}
        />
      )}
    </div>
  );
};
