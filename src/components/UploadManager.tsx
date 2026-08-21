import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  FileVideo, 
  FileText, 
  File,
  HardDrive,
  Cloud,
  Send,
  Sparkles
} from 'lucide-react';
import { UploadProgress } from '../types/index.js';

interface UploadManagerProps {
  uploads: UploadProgress[];
  onClear: () => void;
}

export const formatBytes = (bytes?: number, decimals = 1): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const UploadManager: React.FC<UploadManagerProps> = ({ uploads, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (uploads.length === 0) return null;

  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const activeCount = uploads.filter(u => u.status === 'uploading').length;

  const totalTransferredAll = uploads.reduce((acc, u) => {
    if (u.status === 'completed') return acc + (u.size || 0);
    return acc + (u.transferred || 0);
  }, 0);
  const totalSizeAll = uploads.reduce((acc, u) => acc + (u.size || 0), 0);
  const overallProgress = totalSizeAll > 0 ? Math.min(100, Math.round((totalTransferredAll / totalSizeAll) * 100)) : 0;

  return (
    <div className="fixed bottom-4 right-6 z-50 w-96 rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 text-xs select-none">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-gray-950 text-white cursor-pointer select-none border-b border-gray-800" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-xl ${activeCount > 0 ? 'bg-sky-500/20 text-sky-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
            <UploadCloud className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs leading-tight text-white">
                {activeCount > 0 
                  ? `Transmitindo (${completedCount}/${uploads.length})`
                  : `${completedCount} arquivo(s) salvo(s)`
                }
              </span>
              {activeCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">
                  {overallProgress}%
                </span>
              )}
            </div>
            {totalSizeAll > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">
                {formatBytes(totalTransferredAll)} de {formatBytes(totalSizeAll)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Header mini overall progress line */}
      {activeCount > 0 && (
        <div className="w-full bg-gray-900 h-1 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {/* Body List */}
      {isExpanded && (
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-drive-darkBorder bg-white dark:bg-drive-darkSurface p-2 space-y-2">
          {uploads.map((u) => {
            const isCompleted = u.status === 'completed';
            const isError = u.status === 'error';
            const transferredBytes = isCompleted ? u.size : (u.transferred || 0);
            const transferredStr = formatBytes(transferredBytes);
            const totalStr = formatBytes(u.size || 0);

            return (
              <div key={u.id} className="p-2.5 rounded-2xl bg-gray-50/50 dark:bg-drive-darkBg/50 hover:bg-gray-100/70 dark:hover:bg-drive-darkHover transition-colors space-y-2 border border-gray-100 dark:border-gray-800/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-gray-900 dark:text-gray-100 truncate flex-1 text-xs" title={u.fileName}>
                    {u.fileName}
                  </span>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-emerald-500 font-bold font-sans bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Salvo
                      </span>
                    )}
                    {u.status === 'uploading' && (
                      <span className="text-sky-500 font-black bg-sky-500/10 px-2 py-0.5 rounded-lg">
                        {u.progress}%
                      </span>
                    )}
                    {isError && (
                      <span className="flex items-center gap-1 text-rose-500 font-bold font-sans bg-rose-500/10 px-2 py-0.5 rounded-lg">
                        <AlertCircle className="w-3 h-3" /> Falha
                      </span>
                    )}
                  </div>
                </div>

                {/* Stage Info & Speed Details */}
                <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                    {u.stage === 'cloud' && (
                      <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                        <Cloud className="w-3 h-3 animate-pulse" />
                        <span className="truncate">{u.stageLabel || 'Telegram Cloud'}</span>
                      </span>
                    )}
                    {u.stage === 'local' && (
                      <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold">
                        <HardDrive className="w-3 h-3" />
                        <span className="truncate">{u.stageLabel || 'Upload local'}</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {u.stageLabel || 'Sincronizado'}
                      </span>
                    )}
                    {isError && (
                      <span className="text-rose-500 font-medium">
                        {u.error || 'Erro no envio'}
                      </span>
                    )}
                  </div>

                  {/* Transferred vs Total & Speed */}
                  <div className="flex items-center gap-2 font-mono shrink-0">
                    <span>
                      {isCompleted ? totalStr : `${transferredStr} / ${totalStr}`}
                    </span>
                    {u.status === 'uploading' && u.speed && (
                      <span className="text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-500/20">
                        {u.speed}
                      </span>
                    )}
                  </div>
                </div>

                {/* Real-time Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden shadow-inner relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-200 ${
                      isCompleted 
                        ? 'bg-emerald-500' 
                        : isError 
                        ? 'bg-rose-500' 
                        : u.stage === 'cloud'
                        ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-sky-500'
                        : 'bg-gradient-to-r from-sky-500 to-blue-600'
                    }`}
                    style={{ width: `${Math.max(u.progress, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
