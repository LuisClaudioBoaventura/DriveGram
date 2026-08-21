import React from 'react';
import { X, Send, ShieldAlert, Sparkles, Cloud, Lock } from 'lucide-react';

interface LoginRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  title?: string;
  description?: string;
}

export const LoginRequiredModal: React.FC<LoginRequiredModalProps> = ({
  isOpen,
  onClose,
  onOpenAuth,
  title = 'Conexão com o Telegram Necessária',
  description = 'Você não está conectado ao Telegram. Para enviar arquivos para o armazenamento ilimitado em nuvem e manter tudo sincronizado, conecte sua conta agora.'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100 flex flex-col">
        {/* Decorative Header Background */}
        <div className="relative p-6 bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white flex flex-col items-center text-center overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Animated Telegram Logo Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl mb-3 animate-pulse">
            <Send className="w-8 h-8 text-white -rotate-12 translate-x-0.5" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-sky-100 mb-2 border border-white/20">
            <Cloud className="w-3.5 h-3.5" />
            <span>Nuvem Ilimitada Telegram</span>
          </div>

          <h3 className="text-lg font-extrabold tracking-tight">
            {title}
          </h3>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-center">
            {description}
          </p>

          {/* Key Advantages */}
          <div className="p-3.5 rounded-2xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-900/50 space-y-2 text-[11px] text-gray-700 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Armazenamento 100% gratuito e sem limite de espaço</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Criptografia ponta a ponta oficial do MTProto Telegram</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>Acesso a todos os seus arquivos em qualquer dispositivo</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2 p-4 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
          >
            Continuar no Modo Local
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Conectar Telegram Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
