import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  ShieldCheck, 
  KeyRound, 
  Phone, 
  AlertCircle, 
  CheckCircle2, 
  LogOut,
  ExternalLink,
  QrCode as QrIcon,
  RefreshCw,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { TelegramAuthState } from '../types/index.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  authState: TelegramAuthState;
  onStartQrLogin: (apiId?: string, apiHash?: string, password?: string) => Promise<any>;
  onGetQrStatus: () => Promise<any>;
  onSendCode: (apiId: string, apiHash: string, phone: string) => Promise<any>;
  onSignIn: (code: string, password?: string) => Promise<any>;
  onDisconnect: () => Promise<void>;
  onSuccessAuth: () => void;
  onOpenMobileServerSettings?: () => void;
  loading: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  authState,
  onStartQrLogin,
  onGetQrStatus,
  onSendCode,
  onSignIn,
  onDisconnect,
  onSuccessAuth,
  onOpenMobileServerSettings,
  loading
}) => {
  const [authMethod, setAuthMethod] = useState<'qr' | 'phone'>('qr');
  const [qrImage, setQrImage] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string>('');
  
  // Phone auth state
  const [phoneStep, setPhoneStep] = useState<'credentials' | 'code'>('credentials');
  const [apiId, setApiId] = useState('');
  const [apiHash, setApiHash] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Start QR login when modal opens in QR mode
  const initQr = async () => {
    if (authState.isConnected) return;
    setQrLoading(true);
    setQrError('');
    const res = await onStartQrLogin(apiId, apiHash, password);
    setQrLoading(false);
    if (res.success && res.qrDataUrl) {
      setQrImage(res.qrDataUrl);
    } else {
      setQrError(res.message || 'Não foi possível gerar o QR Code');
    }
  };

  useEffect(() => {
    if (isOpen && authMethod === 'qr' && !authState.isConnected) {
      initQr();
    }
  }, [isOpen, authMethod, authState.isConnected]);

  // Polling for QR Code authorization
  useEffect(() => {
    let interval: any;
    if (isOpen && authMethod === 'qr' && !authState.isConnected && qrImage) {
      interval = setInterval(async () => {
        const statusData = await onGetQrStatus();
        if (statusData.isConnected || statusData.status === 'confirmed') {
          clearInterval(interval);
          setSuccessMsg('Telegram conectado com sucesso via QR Code!');
          onSuccessAuth();
          setTimeout(() => {
            onClose();
          }, 1200);
        } else if (statusData.status === 'error') {
          setQrError(statusData.error || 'Erro na autenticação');
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isOpen, authMethod, authState.isConnected, qrImage]);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!phone) {
      setError('Por favor preencha seu Telefone internacional (ex: +5511999999999)');
      return;
    }
    const res = await onSendCode(apiId, apiHash, phone);
    if (res.success) {
      setPhoneStep('code');
      setSuccessMsg(res.message);
    } else {
      setError(res.message || 'Falha ao solicitar código');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code) {
      setError('Por favor digite o código de confirmação recebido');
      return;
    }
    const res = await onSignIn(code, password);
    if (res.success) {
      setSuccessMsg(res.message);
      onSuccessAuth();
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setError(res.message || 'Falha ao autenticar');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder shadow-2xl p-6 text-gray-800 dark:text-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-drive-darkBorder mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <div>
              <h2 className="text-base font-bold">Conectar ao Telegram</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Acesso direto às suas Mensagens Salvas (Storage Ilimitado)
              </span>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-drive-darkHover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Already Connected State */}
        {authState.isConnected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-sm">Telegram Conectado!</p>
                <p className="mt-0.5 opacity-90">
                  Usuário: <strong>{authState.firstName || authState.username || 'Meu Telegram'}</strong> ({authState.phone || 'Autenticado'})
                </p>
                <p className="text-[11px] mt-1 text-emerald-600 dark:text-emerald-400">
                  Seus arquivos e pastas são salvos com segurança nas suas Mensagens Salvas.
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                await onDisconnect();
                setQrImage('');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Sessão do Telegram</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Tabs: QR Code vs Telefone */}
            <div className="flex bg-gray-100 dark:bg-drive-darkBg p-1 rounded-2xl mb-5">
              <button
                type="button"
                onClick={() => setAuthMethod('qr')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMethod === 'qr'
                    ? 'bg-white dark:bg-drive-darkSurface text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <QrIcon className="w-4 h-4 text-sky-500" />
                <span>QR Code (Rápido)</span>
              </button>

              <button
                type="button"
                onClick={() => setAuthMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  authMethod === 'phone'
                    ? 'bg-white dark:bg-drive-darkSurface text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <Phone className="w-4 h-4 text-indigo-500" />
                <span>Telefone & SMS</span>
              </button>
            </div>

            {/* TAB 1: QR CODE LOGIN */}
            {authMethod === 'qr' && (
              <div className="flex flex-col items-center text-center">
                {/* QR Display Card */}
                <div className="relative p-4 rounded-3xl bg-white dark:bg-white shadow-xl border-4 border-sky-500/20 mb-4">
                  {qrLoading ? (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-500 gap-2">
                      <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
                      <span className="text-xs font-semibold">Gerando QR Code...</span>
                    </div>
                  ) : qrImage ? (
                    <img
                      src={qrImage}
                      alt="Telegram QR Code"
                      className="w-56 h-56 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-400 gap-2">
                      <QrIcon className="w-12 h-12 text-gray-300" />
                      <span className="text-xs">Clique abaixo para recarregar</span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1 mb-4 text-left bg-gray-50 dark:bg-drive-darkBg p-3.5 rounded-2xl w-full border border-gray-100 dark:border-drive-darkBorder">
                  <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 mb-1.5">
                    <Smartphone className="w-4 h-4 text-sky-500" />
                    Como escanear no seu celular:
                  </div>
                  <p>1. Abra o app do <strong>Telegram</strong> no seu celular</p>
                  <p>2. Vá em <strong>Configurações</strong> &gt; <strong>Dispositivos</strong></p>
                  <p>3. Toque em <strong>Conectar Dispositivo</strong> e aponte a câmera para a tela</p>
                </div>

                {qrError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex flex-col gap-2 mb-3 w-full text-left">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{qrError}</span>
                    </div>
                    {onOpenMobileServerSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMobileServerSettings();
                        }}
                        className="mt-1 py-1.5 px-3 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-semibold text-[11px] text-center hover:bg-rose-200 transition-colors"
                      >
                        ⚙️ Configurar Endereço IP do Servidor (ex: 192.168.0.6:5000)
                      </button>
                    )}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 mb-3 w-full">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={initQr}
                  disabled={qrLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                  <span>Recarregar QR Code</span>
                </button>
              </div>
            )}

            {/* TAB 2: PHONE & SMS */}
            {authMethod === 'phone' && (
              <div>
                {phoneStep === 'credentials' ? (
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Número de Telefone (com DDI e DDD)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ex: +5511999999999"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1 text-gray-500">API ID (Opcional)</label>
                        <input
                          type="text"
                          value={apiId}
                          onChange={(e) => setApiId(e.target.value)}
                          placeholder="Padrão Desktop"
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none font-mono text-[11px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1 text-gray-500">API Hash (Opcional)</label>
                        <input
                          type="password"
                          value={apiHash}
                          onChange={(e) => setApiHash(e.target.value)}
                          placeholder="Padrão Desktop"
                          className="w-full px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                        {onOpenMobileServerSettings && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onOpenMobileServerSettings();
                            }}
                            className="mt-1 py-1.5 px-3 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 font-semibold text-[11px] text-center hover:bg-rose-200 transition-colors"
                          >
                            ⚙️ Configurar Endereço IP do Servidor (ex: 192.168.0.6:5000)
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{loading ? 'Enviando código...' : 'Solicitar Código de Acesso'}</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {successMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Código de Confirmação (recebido no Telegram)
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Ex: 12345"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest text-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Senha de Duas Etapas (2FA) - Opcional
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha de 2FA (se habilitada)"
                        className="w-full px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPhoneStep('credentials')}
                        className="w-1/3 py-2.5 rounded-xl border border-gray-200 dark:border-drive-darkBorder text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-drive-darkHover"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-2/3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{loading ? 'Validando...' : 'Conectar e Autenticar'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
