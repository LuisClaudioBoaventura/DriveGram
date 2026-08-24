import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, CheckCircle2, Circle, Edit3, Trash2, Tv, Layers, X, Download, SkipForward, FastForward } from 'lucide-react';
import { SeriesShow, SeriesEpisode, DriveItem } from '../types/index.js';

interface SeriesStudioViewProps {
  series: SeriesShow;
  allFiles: DriveItem[];
  onBackToCatalog: () => void;
  onUpdateSeries: (updated: SeriesShow) => Promise<void>;
  onDeleteSeries: (id: string) => void;
  onToggleEpisodeCompletion: (episodeId: string) => Promise<void>;
  onUpdateEpisodeProgress: (episodeId: string, seconds: number, isCompleted?: boolean) => Promise<void>;
  onOpenEditModal?: () => void;
}

export const SeriesStudioView: React.FC<SeriesStudioViewProps> = ({
  series,
  allFiles,
  onBackToCatalog,
  onUpdateSeries,
  onDeleteSeries,
  onToggleEpisodeCompletion,
  onUpdateEpisodeProgress,
  onOpenEditModal
}) => {
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);
  const [playingEpisode, setPlayingEpisode] = useState<SeriesEpisode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const seasons = series.seasons || [];
  const currentSeason = seasons[selectedSeasonIdx] || seasons[0];
  const episodes = currentSeason?.episodes || [];

  const allEpisodes = seasons.flatMap(s => s.episodes || []);
  const totalEpisodes = allEpisodes.length;
  const completedEpisodes = allEpisodes.filter(e => e.isCompleted).length;
  const progressPct = totalEpisodes > 0 ? Math.round((completedEpisodes / totalEpisodes) * 100) : 0;

  // Next unwatched episode finder
  const nextUnwatchedEpisode = allEpisodes.find(e => !e.isCompleted) || allEpisodes[0];

  const handleStartPlaying = (episode: SeriesEpisode) => {
    setPlayingEpisode(episode);
  };

  // Find next episode in sequence
  const getNextEpisode = (currentEp: SeriesEpisode): SeriesEpisode | null => {
    const flatIndex = allEpisodes.findIndex(e => e.id === currentEp.id);
    if (flatIndex >= 0 && flatIndex < allEpisodes.length - 1) {
      return allEpisodes[flatIndex + 1];
    }
    return null;
  };

  const handleEpisodeEnded = () => {
    if (!playingEpisode) return;
    onUpdateEpisodeProgress(playingEpisode.id, 0, true);

    const nextEp = getNextEpisode(playingEpisode);
    if (nextEp) {
      setTimeout(() => {
        setPlayingEpisode(nextEp);
      }, 1500);
    }
  };

  const playingFile = playingEpisode?.fileId ? allFiles.find(f => f.id === playingEpisode.fileId) : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-drive-darkBg overflow-y-auto text-gray-900 dark:text-gray-100">
      {/* Top Navbar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-drive-darkBg/90 backdrop-blur-md border-b border-gray-200 dark:border-drive-darkBorder">
        <button
          onClick={onBackToCatalog}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Catálogo de Séries</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Dados & Capa</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Deseja excluir a série "${series.title}"?`)) {
                onDeleteSeries(series.id);
                onBackToCatalog();
              }
            }}
            className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Excluir Série"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-br from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
          <div
            onClick={onOpenEditModal}
            className="relative w-44 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-purple-500/40 shrink-0 bg-black/60 group cursor-pointer"
            title="Clique para editar"
          >
            <img
              src={series.coverImage || 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800&auto=format&fit=crop&q=60'}
              alt={series.title}
              draggable={false}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
            />
            {series.network && (
              <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                {series.network}
              </span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
              <Edit3 className="w-5 h-5 text-purple-400" />
              <span>Trocar Capa</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between h-full space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
                  {series.category || 'Série'}
                </span>
                {series.genre && (
                  <span className="px-2.5 py-1 rounded-lg bg-gray-800 text-gray-300 text-xs">
                    {series.genre}
                  </span>
                )}
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  progressPct === 100
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {progressPct === 100 ? '✓ Série Concluída' : 'Assistindo'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {series.title}
              </h1>

              <p className="text-xs text-gray-400 mt-3 max-w-2xl leading-relaxed">
                {series.description || 'Nenhuma descrição fornecida para esta série.'}
              </p>
            </div>

            {/* Reading/Watching Progress Bar */}
            <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-300">Progresso Geral</span>
                <span className="text-purple-400 font-mono">
                  {completedEpisodes} de {totalEpisodes} episódios ({progressPct}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {nextUnwatchedEpisode && (
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => handleStartPlaying(nextUnwatchedEpisode)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {completedEpisodes === 0 
                      ? 'Começar T1:E1' 
                      : `Continuar: ${nextUnwatchedEpisode.title}`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Seasons & Episodes Section */}
        <div className="space-y-4">
          {/* Season Tabs */}
          {seasons.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {seasons.map((season, idx) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeasonIdx(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    selectedSeasonIdx === idx
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white dark:bg-drive-darkSurface text-gray-600 dark:text-gray-400 hover:text-white border border-gray-200 dark:border-drive-darkBorder'
                  }`}
                >
                  {season.title || `Temporada ${season.seasonNumber || idx + 1}`} ({season.episodes?.length || 0})
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-500" />
              <h2 className="text-base font-bold">
                {currentSeason?.title || 'Episódios'} ({episodes.length})
              </h2>
            </div>
          </div>

          {/* Episode Cards Grid */}
          {episodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {episodes.map(ep => {
                const epFile = ep.fileId ? allFiles.find(f => f.id === ep.fileId) : null;

                return (
                  <div
                    key={ep.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      ep.isCompleted
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                      <button
                        onClick={() => onToggleEpisodeCompletion(ep.id)}
                        className="shrink-0 text-gray-400 hover:text-emerald-500 transition-colors"
                        title={ep.isCompleted ? 'Marcar como não assistido' : 'Marcar como assistido'}
                      >
                        {ep.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px] font-bold">
                            E{ep.episodeNumber}
                          </span>
                          <h4 className={`text-xs font-bold truncate ${ep.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {ep.title}
                          </h4>
                        </div>
                        {epFile && (
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5 uppercase">
                            {epFile.extension}
                          </span>
                        )}
                      </div>
                    </div>

                    {(epFile || ep.videoUrl || ep.embedUrl) ? (
                      <button
                        onClick={() => handleStartPlaying(ep)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition-all shrink-0 active:scale-95"
                        title="Assistir Episódio"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Assistir</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Sem arquivo</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
              <Tv className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="font-bold text-sm">Nenhum episódio encontrado nesta temporada</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Adicione arquivos de vídeo na pasta da série ou importe uma playlist/canal para que sejam listados automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Video Player Modal */}
      {playingEpisode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="relative flex flex-col w-full max-w-5xl h-[88vh] bg-black rounded-3xl border border-gray-800 shadow-2xl overflow-hidden text-gray-100">
            {/* Player Navbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 border-b border-gray-800 z-30 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[10px] font-black uppercase">
                  {series.title}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  T{playingEpisode.seasonNumber}:E{playingEpisode.episodeNumber} - {playingEpisode.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleEpisodeCompletion(playingEpisode.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    playingEpisode.isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{playingEpisode.isCompleted ? 'Assistido' : 'Marcar Assistido'}</span>
                </button>

                {getNextEpisode(playingEpisode) && (
                  <button
                    onClick={() => {
                      const next = getNextEpisode(playingEpisode);
                      if (next) setPlayingEpisode(next);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow transition-colors"
                    title="Próximo Episódio"
                  >
                    <span>Próximo</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setPlayingEpisode(null)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="flex-1 w-full h-full overflow-hidden flex items-center justify-center bg-black">
              {playingFile ? (
                <video
                  ref={videoRef}
                  key={playingFile.id}
                  src={`/api/stream/${playingFile.id}`}
                  controls
                  autoPlay
                  playsInline
                  crossOrigin="anonymous"
                  onEnded={handleEpisodeEnded}
                  className="max-h-full max-w-full object-contain"
                />
              ) : playingEpisode.embedUrl || (playingEpisode.videoUrl && (playingEpisode.videoUrl.includes('youtube.com') || playingEpisode.videoUrl.includes('youtu.be'))) ? (
                <iframe
                  src={
                    playingEpisode.embedUrl || 
                    `https://www.youtube.com/embed/${playingEpisode.videoUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i)?.[1] || ''}?autoplay=1&enablejsapi=1`
                  }
                  title={playingEpisode.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <Tv className="w-12 h-12 mb-3 text-purple-400" />
                  <p className="text-sm font-semibold">Fonte de vídeo não disponível</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
