import React, { useState } from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Play, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Calendar, 
  User, 
  Layers, 
  Tag, 
  Download, 
  Maximize2,
  X,
  Plus
} from 'lucide-react';
import { ComicBook, ComicIssue, DriveItem } from '../types/index.js';
import { ComicReader } from './ComicReader.js';
import { EpubReader } from './EpubReader.js';
import { VideoDownloadModal } from './VideoDownloadModal.js';

interface ComicStudioViewProps {
  comic: ComicBook;
  activeIssue: ComicIssue | null;
  onSelectIssue: (issue: ComicIssue) => void;
  onToggleIssueCompletion: (issueId: string) => void;
  onUpdateComic: (updatedComic: ComicBook) => Promise<void>;
  onDeleteComic: (comicId: string) => Promise<void>;
  onBackToLibrary: () => void;
  allFiles: DriveItem[];
  onOpenEditModal?: () => void;
}

export const ComicStudioView: React.FC<ComicStudioViewProps> = ({
  comic,
  activeIssue,
  onSelectIssue,
  onToggleIssueCompletion,
  onUpdateComic,
  onDeleteComic,
  onBackToLibrary,
  allFiles,
  onOpenEditModal
}) => {
  const [readingIssue, setReadingIssue] = useState<ComicIssue | null>(null);
  const [downloadTargetFile, setDownloadTargetFile] = useState<DriveItem | null>(null);

  const totalIssues = comic.issues?.length || 0;
  const completedIssues = comic.issues?.filter(i => i.isCompleted).length || 0;
  const progressPercent = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;

  // Find file for the currently reading issue
  const activeFile = readingIssue?.fileId 
    ? allFiles.find(f => f.id === readingIssue.fileId) 
    : (activeIssue?.fileId ? allFiles.find(f => f.id === activeIssue.fileId) : null);

  const handleStartReadingNext = () => {
    const nextUnread = comic.issues?.find(i => !i.isCompleted) || comic.issues?.[0];
    if (nextUnread) {
      onSelectIssue(nextUnread);
      setReadingIssue(nextUnread);
    }
  };

  const handleUpdateProgress = async (issueId: string, pageIndex: number, totalPages: number) => {
    const isCompleted = pageIndex >= totalPages - 1 && totalPages > 0;
    const updatedIssues = (comic.issues || []).map(i => {
      if (i.id === issueId) {
        return {
          ...i,
          currentPage: pageIndex,
          totalPages: totalPages || i.totalPages,
          isCompleted: isCompleted ? true : i.isCompleted,
          lastReadAt: new Date().toISOString()
        };
      }
      return i;
    });

    if (readingIssue && readingIssue.id === issueId && isCompleted) {
      setReadingIssue(prev => prev ? { ...prev, currentPage: pageIndex, totalPages, isCompleted: true } : null);
    }

    const allCompleted = updatedIssues.length > 0 && updatedIssues.every(i => i.isCompleted);
    const updatedComic = {
      ...comic,
      issues: updatedIssues,
      status: allCompleted ? 'completed' as const : 'reading' as const
    };

    await onUpdateComic(updatedComic);
  };

  const handleToggleIssue = async (issueId: string) => {
    await onToggleIssueCompletion(issueId);
    if (readingIssue && readingIssue.id === issueId) {
      setReadingIssue(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : null);
    }
  };

  const handleToggleAllIssues = async () => {
    const nextCompleted = progressPercent !== 100;
    const updatedIssues = (comic.issues || []).map(i => ({
      ...i,
      isCompleted: nextCompleted,
      lastReadAt: new Date().toISOString()
    }));
    const updatedComic = {
      ...comic,
      issues: updatedIssues,
      status: nextCompleted ? 'completed' as const : 'reading' as const
    };
    await onUpdateComic(updatedComic);
    if (readingIssue) {
      setReadingIssue(prev => prev ? { ...prev, isCompleted: nextCompleted } : null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-drive-darkBg overflow-y-auto text-gray-900 dark:text-gray-100">
      {/* Top Breadcrumb Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-drive-darkBg/90 backdrop-blur-md border-b border-gray-200 dark:border-drive-darkBorder">
        <button
          onClick={onBackToLibrary}
          className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Biblioteca de HQs</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md shadow-pink-500/20 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Dados & Capa</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm(`Deseja realmente excluir a coleção "${comic.title}"?`)) {
                onDeleteComic(comic.id);
                onBackToLibrary();
              }
            }}
            className="p-1.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Excluir Coleção"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero Banner Card */}
        <div className="relative rounded-3xl bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-slate-900 border border-pink-500/20 p-6 sm:p-8 shadow-2xl overflow-hidden flex flex-col md:flex-row gap-6 sm:gap-8 items-center md:items-start">
          {/* Cover Art with Edit Trigger */}
          <div 
            onClick={onOpenEditModal}
            className="relative w-44 sm:w-52 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border-2 border-pink-500/40 shrink-0 bg-black/60 group cursor-pointer"
            title="Clique para trocar a foto de capa ou editar informações"
          >
            <img
              src={comic.coverImage || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=60'}
              alt={comic.title}
              draggable={false}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
            />
            {comic.publisher && (
              <span className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-pink-600 text-white text-[10px] font-black uppercase tracking-wider shadow">
                {comic.publisher}
              </span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-bold gap-1 transition-opacity">
              <Edit3 className="w-5 h-5 text-pink-400" />
              <span>Trocar Capa</span>
            </div>
          </div>

          {/* Details & Action Hub */}
          <div className="flex-1 flex flex-col justify-between h-full space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-bold">
                  {comic.category || 'HQ / Quadrinho'}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  progressPercent === 100 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {progressPercent === 100 ? '✓ Coleção Completa' : 'Lendo Agora'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {comic.title}
              </h1>

              {(comic.author || comic.artist) && (
                <p className="text-xs text-gray-300 font-medium mt-1 flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {comic.author && <span>✍️ Roteiro: <strong>{comic.author}</strong></span>}
                  {comic.artist && <span>🎨 Arte: <strong>{comic.artist}</strong></span>}
                </p>
              )}

              <p className="text-xs text-gray-400 mt-3 max-w-2xl leading-relaxed">
                {comic.description || 'Nenhuma descrição fornecida para esta coleção.'}
              </p>
            </div>

            {/* Reading Progress Bar */}
            <div className="space-y-2 bg-black/30 p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-300">Progresso de Leitura</span>
                <span className="text-pink-400 font-mono">{completedIssues} de {totalIssues} edições ({progressPercent}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={handleStartReadingNext}
                disabled={totalIssues === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50"
              >
                <BookOpen className="w-4 h-4" />
                <span>{completedIssues === 0 ? 'Começar a Ler #01' : 'Continuar Leitura'}</span>
              </button>

              <button
                onClick={handleToggleAllIssues}
                disabled={totalIssues === 0}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all border disabled:opacity-50 ${
                  progressPercent === 100
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-lg shadow-emerald-950/40'
                    : 'bg-black/40 hover:bg-emerald-600 text-gray-200 hover:text-white border-white/20 hover:border-emerald-500 shadow-md'
                }`}
                title={progressPercent === 100 ? 'Marcar coleção como não lida' : 'Marcar coleção como lida'}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{progressPercent === 100 ? '✓ Coleção Lida' : 'Marcar como Lida'}</span>
              </button>

              {activeFile && (
                <button
                  onClick={() => setDownloadTargetFile(activeFile)}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-black/40 hover:bg-pink-600 text-gray-200 hover:text-white border border-white/20 hover:border-pink-500 text-xs font-bold transition-all shadow-md active:scale-95"
                  title="Baixar edição atual para cache local"
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Edição</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Issues & Chapters List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-pink-500" />
              <h2 className="text-base font-bold">Edições & Capítulos ({totalIssues})</h2>
            </div>
          </div>

          {totalIssues > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {comic.issues.map((issue, idx) => {
                const issueFile = issue.fileId ? allFiles.find(f => f.id === issue.fileId) : null;
                const isSelected = activeIssue?.id === issue.id;

                return (
                  <div
                    key={issue.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-pink-500/10 border-pink-500/60 shadow-md ring-2 ring-pink-500/20' 
                        : 'bg-white dark:bg-drive-darkSurface border-gray-200 dark:border-drive-darkBorder hover:border-pink-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden flex-1 mr-2">
                      <button
                        onClick={() => handleToggleIssue(issue.id)}
                        className="shrink-0 text-gray-400 hover:text-emerald-500 transition-colors"
                        title={issue.isCompleted ? 'Marcar como não lida' : 'Marcar como lida'}
                      >
                        {issue.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono text-[10px] font-bold">
                            #{issue.issueNumber || idx + 1}
                          </span>
                          <h4 className={`text-xs font-bold truncate ${issue.isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                            {issue.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {issueFile && (
                            <span className="text-[10px] text-gray-400 font-mono uppercase">
                              {issueFile.extension}
                            </span>
                          )}
                          {issue.currentPage !== undefined && issue.currentPage > 0 && !issue.isCompleted && (
                            <span className="text-[10px] text-pink-500 font-semibold">
                              • Pág {issue.currentPage + 1} {issue.totalPages ? `de ${issue.totalPages}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Launch Reader Action */}
                    {issueFile ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            onSelectIssue(issue);
                            setReadingIssue(issue);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md transition-all shrink-0"
                          title="Abrir Leitor de HQ"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{issue.currentPage && issue.currentPage > 0 && !issue.isCompleted ? 'Continuar' : 'Ler'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadTargetFile(issueFile);
                          }}
                          className="p-1.5 rounded-xl bg-gray-100 hover:bg-pink-100 dark:bg-gray-800 dark:hover:bg-pink-950/50 text-gray-500 hover:text-pink-500 transition-colors shrink-0"
                          title="Baixar HQ para Cache Local"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400 italic">Sem arquivo</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-drive-darkSurface rounded-3xl border border-dashed border-gray-300 dark:border-gray-800">
              <BookOpen className="w-12 h-12 text-gray-400 mb-3" />
              <h3 className="font-bold text-sm">Nenhum arquivo de HQ encontrado na pasta vinculada</h3>
              <p className="text-xs text-gray-500 max-w-sm mt-1">
                Adicione arquivos no formato .cbr, .cbz, .pdf ou .epub na pasta de origem do Drive para que as edições apareçam aqui automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Reader Modal when an issue is opened */}
      {readingIssue && activeFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-150"
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="relative flex flex-col w-full max-w-[96vw] h-[94vh] bg-black rounded-3xl border border-gray-800 shadow-2xl overflow-hidden text-gray-100">
            {/* Top Reader Navbar */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 border-b border-gray-800 z-30 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded-lg bg-pink-600 text-white text-[10px] font-black uppercase">
                  {comic.title}
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {readingIssue.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleIssue(readingIssue.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    readingIssue.isCompleted 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-500/30' 
                      : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-emerald-600/90 hover:text-white hover:border-emerald-500'
                  }`}
                  title={readingIssue.isCompleted ? 'Marcar como não lida' : 'Marcar como lida'}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{readingIssue.isCompleted ? 'Lida' : 'Marcar como lida'}</span>
                </button>

                <button
                  onClick={() => setReadingIssue(null)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Comic / EPUB Reader Content */}
            <div className="flex-1 w-full h-full overflow-hidden">
              {activeFile.extension?.toLowerCase() === 'epub' || activeFile.type === 'ebook' || activeFile.mimeType?.includes('epub') ? (
                <EpubReader file={activeFile} />
              ) : (
                <ComicReader 
                  file={activeFile} 
                  initialPage={readingIssue.currentPage || 0}
                  onPageChange={(page, total) => handleUpdateProgress(readingIssue.id, page, total)}
                />
              )}
            </div>
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
