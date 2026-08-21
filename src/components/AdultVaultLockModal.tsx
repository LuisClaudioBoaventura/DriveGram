import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, ShieldAlert, Eye, EyeOff, HelpCircle, ArrowLeft, Check, Sparkles, X, LockKeyhole } from 'lucide-react';

interface AdultVaultLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConfigured: boolean;
  recoveryQuestion?: string;
  hint?: string;
  onVerifyPassword: (password: string) => Promise<boolean>;
  onSetupVault: (password: string, question: string, answer: string, hint?: string) => Promise<boolean>;
  onRecoverPassword: (answer: string, newPassword: string) => Promise<boolean>;
}

const PRESET_SECURITY_QUESTIONS = [
  'Qual o nome do seu primeiro animal de estimação?',
  'Qual o nome da cidade em que você nasceu?',
  'Qual o nome do seu melhor amigo de infância?',
  'Qual foi o modelo do seu primeiro carro?',
  'Qual o nome da sua escola primária?',
  'Personalizada (escrever minha própria pergunta)'
];

export const AdultVaultLockModal: React.FC<AdultVaultLockModalProps> = ({
  isOpen,
  onClose,
  isConfigured,
  recoveryQuestion,
  hint,
  onVerifyPassword,
  onSetupVault,
  onRecoverPassword
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'unlock' | 'setup' | 'recover'>(isConfigured ? 'unlock' : 'setup');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(PRESET_SECURITY_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [customHint, setCustomHint] = useState(hint || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setErrorMessage('');
    setLoading(true);

    const ok = await onVerifyPassword(password);
    setLoading(false);
    if (ok) {
      setPassword('');
      onClose();
    } else {
      setErrorMessage('Senha incorreta. Tente novamente ou use a recuperação de senha.');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 4) {
      setErrorMessage('A senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    const finalQuestion = selectedQuestion === 'Personalizada (escrever minha própria pergunta)'
      ? customQuestion.trim()
      : selectedQuestion;

    if (!finalQuestion) {
      setErrorMessage('Defina uma pergunta de segurança para caso esqueça a senha.');
      return;
    }
    if (!recoveryAnswer.trim()) {
      setErrorMessage('Digite a resposta da sua pergunta de segurança.');
      return;
    }

    setLoading(true);
    const ok = await onSetupVault(password, finalQuestion, recoveryAnswer.trim(), customHint.trim());
    setLoading(false);

    if (ok) {
      setPassword('');
      setConfirmPassword('');
      setRecoveryAnswer('');
      onClose();
    } else {
      setErrorMessage('Erro ao configurar Red Locker. Tente novamente.');
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!recoveryAnswer.trim()) {
      setErrorMessage('Informe a resposta de segurança.');
      return;
    }
    if (password.length < 4) {
      setErrorMessage('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const ok = await onRecoverPassword(recoveryAnswer.trim(), password);
    setLoading(false);

    if (ok) {
      setPassword('');
      setConfirmPassword('');
      setRecoveryAnswer('');
      onClose();
    } else {
      setErrorMessage('Resposta de segurança incorreta. Verifique e tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-3 mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/25 animate-pulse">
            {mode === 'unlock' ? <LockKeyhole className="w-8 h-8" /> : mode === 'setup' ? <ShieldAlert className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                <LockKeyhole className="w-3 h-3" />
                <span>Área Privativa • Red Locker</span>
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white">
              {mode === 'unlock' ? 'Red Locker Protegido' : mode === 'setup' ? 'Configurar Senha do Red Locker' : 'Recuperação de Senha'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              {mode === 'unlock'
                ? 'Digite sua senha mestre para acessar os conteúdos do Red Locker.'
                : mode === 'setup'
                ? 'Defina uma senha mestre e uma pergunta secreta para recuperação.'
                : 'Responda à sua pergunta de segurança para criar uma nova senha.'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold text-center animate-in shake duration-200">
            {errorMessage}
          </div>
        )}

        {/* MODE 1: UNLOCK */}
        {mode === 'unlock' && (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha..."
                  autoFocus
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {hint && (
                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-rose-400" />
                  <span>Dica cadastrada: <strong>{hint}</strong></span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              <Unlock className="w-4 h-4" />
              <span>{loading ? 'Validando...' : 'Desbloquear Red Locker'}</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('recover');
                  setErrorMessage('');
                  setPassword('');
                }}
                className="text-xs font-bold text-rose-500 hover:underline"
              >
                Esqueci minha senha
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: SETUP */}
        {mode === 'setup' && (
          <form onSubmit={handleSetup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Nova Senha Mestre *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 4 caracteres"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Senha *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Pergunta de Segurança (para recuperação) *</span>
              </label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {PRESET_SECURITY_QUESTIONS.map((q, idx) => (
                  <option key={idx} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {selectedQuestion === 'Personalizada (escrever minha própria pergunta)' && (
              <div>
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Escreva sua pergunta personalizada..."
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Resposta da Pergunta *
              </label>
              <input
                type="text"
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Resposta secreta"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Dica de Senha (Opcional)
              </label>
              <input
                type="text"
                value={customHint}
                onChange={(e) => setCustomHint(e.target.value)}
                placeholder="Ex: Ano da formatura"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || !recoveryAnswer}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50 mt-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Proteger e Ativar Cofre'}</span>
            </button>
          </form>
        )}

        {/* MODE 3: RECOVER */}
        {mode === 'recover' && (
          <form onSubmit={handleRecover} className="space-y-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs">
              <span className="text-gray-400 font-bold block text-[10px] uppercase">Sua Pergunta de Segurança:</span>
              <span className="text-gray-800 dark:text-gray-200 font-semibold mt-0.5 block">
                {recoveryQuestion || 'Pergunta não cadastrada.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Sua Resposta *
              </label>
              <input
                type="text"
                value={recoveryAnswer}
                onChange={(e) => setRecoveryAnswer(e.target.value)}
                placeholder="Digite a resposta correta..."
                autoFocus
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nova Senha *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Confirmar *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita"
                  required
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-drive-darkBg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !recoveryAnswer || !password || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? 'Redefinindo...' : 'Redefinir Senha e Entrar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('unlock');
                setErrorMessage('');
                setPassword('');
              }}
              className="w-full flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para tela de desbloqueio</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
