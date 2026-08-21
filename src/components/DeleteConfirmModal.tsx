import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, RotateCcw, Clock } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  itemTitle: string;
  isFolder: boolean;
  isPermanent?: boolean;
  itemType?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemTitle,
  isFolder,
  isPermanent = false,
  itemType
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('Error executing delete:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header with Warning Accent */}
        <div className={`relative p-6 text-white flex flex-col items-center text-center overflow-hidden ${
          isPermanent 
            ? 'bg-gradient-to-br from-rose-600 via-rose-700 to-red-800' 
            : 'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600'
        }`}>
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon Badge */}
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg mb-3">
            {isPermanent ? (
              <ShieldAlert className="w-7 h-7 text-white" />
            ) : (
              <Trash2 className="w-7 h-7 text-white" />
            )}
          </div>

          <h3 className="text-base font-extrabold tracking-tight">
            {isPermanent ? 'Excluir Definitivamente do Telegram?' : `Mover ${isFolder ? 'Pasta' : 'Arquivo'} para a Lixeira?`}
          </h3>
          <span className="text-[11px] text-white/80 mt-0.5">
            {isPermanent ? 'Esta ação apagará a mensagem do Telegram e não pode ser desfeita' : 'O item poderá ser restaurado nos próximos 30 dias'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isPermanent ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate block">
                {itemTitle || 'Item selecionado'}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">
                {isFolder ? 'Pasta com arquivos' : itemType || 'Arquivo'}
              </span>
            </div>
          </div>

          {/* Information box */}
          {isPermanent ? (
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Exclusão Permanente na Nuvem</span>
              </p>
              <p className="text-rose-700/90 dark:text-rose-300/80 leading-relaxed">
                A mídia será removida permanentemente das suas <strong>Mensagens Salvas do Telegram</strong> e excluída do armazenamento local.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Prazo de 30 Dias na Lixeira</span>
              </p>
              <p className="text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                O arquivo ficará na Lixeira e será <strong>excluído automaticamente do Telegram em 30 dias</strong>. Você pode restaurá-lo a qualquer momento.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-drive-darkBorder hover:bg-gray-100 dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                isPermanent
                  ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{loading ? 'Processando...' : isPermanent ? 'Excluir do Telegram' : 'Mover para Lixeira'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
