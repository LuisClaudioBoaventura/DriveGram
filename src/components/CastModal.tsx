import React, { useState, useEffect } from 'react';
import { 
  Cast, Tv, Monitor, RefreshCw, Check, Copy, ExternalLink, 
  X, Laptop, Smartphone, Radio, Wifi, AlertCircle, Play, Square, Airplay 
} from 'lucide-react';
import QRCode from 'qrcode';
import { CastDevice } from '../types/index.js';
import { useCast } from '../hooks/useCast.js';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  title: string;
  subUrl?: string;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  onEnterPiP?: () => void;
}

export const CastModal: React.FC<CastModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  title,
  subUrl,
  videoElementRef,
  onEnterPiP
}) => {
  const {
    castDevices,
    isScanning,
    networkLanIp,
    activeDevice,
    isCasting,
    castFeedback,
    tvPlayerUrl,
    isMirroring,
    mirrorRoomId,
    scanDevices,
    castMedia,
    addManualDevice,
    startScreenMirroring,
    stopScreenMirroring,
    stopCasting
  } = useCast();

  const [activeTab, setActiveTab] = useState<'devices' | 'tv' | 'mirror'>('devices');
  const [manualIpInput, setManualIpInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedTvUrl, setCopiedTvUrl] = useState(false);
  const [copiedMirrorUrl, setCopiedMirrorUrl] = useState(false);
  const [tvQrCodeData, setTvQrCodeData] = useState<string>('');
  const [mirrorQrCodeData, setMirrorQrCodeData] = useState<string>('');

  // Effective direct URLs
  const effectiveTvUrl = tvPlayerUrl || (networkLanIp 
    ? `${networkLanIp}/tv?url=${encodeURIComponent(mediaUrl)}&title=${encodeURIComponent(title)}${subUrl ? `&subUrl=${encodeURIComponent(subUrl)}` : ''}`
    : '');

  const effectiveMirrorUrl = networkLanIp 
    ? `${networkLanIp}/tv/mirror?room=${encodeURIComponent(mirrorRoomId)}`
    : '';

  // Scan on modal open
  useEffect(() => {
    if (isOpen) {
      scanDevices();
    }
  }, [isOpen, scanDevices]);

  // Generate QR Codes
  useEffect(() => {
    if (effectiveTvUrl) {
      QRCode.toDataURL(effectiveTvUrl, { margin: 1, width: 220, color: { dark: '#0284c7', light: '#ffffff' } })
        .then(setTvQrCodeData)
        .catch(() => {});
    }
  }, [effectiveTvUrl]);

  useEffect(() => {
    if (effectiveMirrorUrl) {
      QRCode.toDataURL(effectiveMirrorUrl, { margin: 1, width: 220, color: { dark: '#9333ea', light: '#ffffff' } })
        .then(setMirrorQrCodeData)
        .catch(() => {});
    }
  }, [effectiveMirrorUrl]);

  if (!isOpen) return null;

  const handleDeviceCast = (device: CastDevice) => {
    castMedia(device, mediaUrl, title, subUrl);
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIpInput.trim()) return;
    setIsAdding(true);
    const device = await addManualDevice(manualIpInput.trim());
    if (device) {
      handleDeviceCast(device);
      setManualIpInput('');
    }
    setIsAdding(false);
  };

  const handleNativeCastPrompt = () => {
    if (videoElementRef?.current) {
      const v = videoElementRef.current as any;
      if (v.remote?.prompt) {
        v.remote.prompt().catch(() => {});
      } else if (v.webkitShowPlaybackTargetPicker) {
        v.webkitShowPlaybackTargetPicker();
      }
    }
  };

  const getDeviceIcon = (type: CastDevice['type']) => {
    switch (type) {
      case 'chromecast':
        return <Cast className="w-5 h-5 text-sky-400" />;
      case 'smart_tv_samsung':
      case 'smart_tv_lg':
      case 'roku':
      case 'dlna':
        return <Tv className="w-5 h-5 text-indigo-400" />;
      case 'phone':
        return <Smartphone className="w-5 h-5 text-amber-400" />;
      default:
        return <Laptop className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-drive-darkSurface border border-gray-200 dark:border-drive-darkBorder rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Cast className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Transmitir para Dispositivo
                {isCasting && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Transmitindo
                  </span>
                )}
                {isMirroring && (
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                    Espelhando Tela
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 truncate max-w-sm">
                {title || 'Mídia em reprodução'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-drive-darkHover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-drive-darkBorder px-6 bg-gray-50/30 dark:bg-drive-darkBg/20">
          <button
            onClick={() => setActiveTab('devices')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'devices'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Dispositivos na Rede ({castDevices.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tv')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tv'
                ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>DriveGram TV (QR Code)</span>
          </button>

          <button
            onClick={() => setActiveTab('mirror')}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'mirror'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Espelhar Tela</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Feedback banner */}
          {castFeedback && (
            <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-400" />
                <span>{castFeedback}</span>
              </div>
              {isCasting && (
                <button
                  onClick={stopCasting}
                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-lg text-[10px] font-bold transition-all"
                >
                  Desconectar
                </button>
              )}
            </div>
          )}

          {/* TAB 1: Devices */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Aparelhos e Smart TVs Detectados no Wi-Fi
                </span>
                <button
                  onClick={scanDevices}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-drive-darkBg hover:bg-gray-200 dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Buscando...' : 'Atualizar'}</span>
                </button>
              </div>

              {/* Devices Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {castDevices.map((dev) => {
                  const isCurrent = activeDevice?.id === dev.id;
                  return (
                    <div
                      key={dev.id}
                      className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/30'
                          : 'border-gray-200 dark:border-drive-darkBorder bg-gray-50/30 dark:bg-drive-darkBg/30 hover:border-sky-300 dark:hover:border-sky-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-drive-darkBg shrink-0">
                          {getDeviceIcon(dev.type)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate block">
                            {dev.name}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono block truncate">
                            {dev.ip} {dev.model ? `• ${dev.model}` : ''}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeviceCast(dev)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 ${
                          isCurrent
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                            : 'bg-gray-200 dark:bg-drive-darkHover hover:bg-sky-600 hover:text-white text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {isCurrent ? 'Transmitindo' : 'Transmitir'}
                      </button>
                    </div>
                  );
                })}

                {castDevices.length === 0 && !isScanning && (
                  <div className="col-span-2 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-drive-darkBorder text-center">
                    <Tv className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      Nenhum aparelho detectado automaticamente
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Certifique-se de que os dispositivos estão na mesma rede Wi-Fi, ou use a aba <b>DriveGram TV (QR Code)</b> para abrir pelo navegador do aparelho!
                    </p>
                  </div>
                )}
              </div>

              {/* Add Manual IP */}
              <form onSubmit={handleAddManual} className="flex gap-2 pt-2 border-t border-gray-100 dark:border-drive-darkBorder">
                <input
                  type="text"
                  placeholder="Digitar IP da TV manualmente (ex: 192.168.1.50)..."
                  value={manualIpInput}
                  onChange={e => setManualIpInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={isAdding || !manualIpInput.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-600/20 active:scale-95"
                >
                  {isAdding ? 'Conectando...' : 'Adicionar e Conectar'}
                </button>
              </form>

              {/* Native Prompt and PiP Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleNativeCastPrompt}
                  className="p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/30 hover:border-sky-400 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                    <Airplay className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block">
                      Prompt Nativo do Navegador
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Dispositivos integrados ao Chrome / Edge
                    </span>
                  </div>
                </button>

                {onEnterPiP && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEnterPiP();
                    }}
                    className="p-3 rounded-2xl border border-gray-200 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/30 hover:border-purple-400 flex items-center gap-3 text-left transition-colors"
                  >
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block">
                        Mini-Player Flutuante (PiP)
                      </span>
                      <span className="text-[10px] text-gray-500">
                        Assistir em janela suspensa
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DriveGram TV & QR Code */}
          {activeTab === 'tv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/50 flex flex-col sm:flex-row items-center gap-6">
                {tvQrCodeData ? (
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-gray-200 shrink-0">
                    <img src={tvQrCodeData} alt="QR Code DriveGram TV" className="w-44 h-44 rounded-lg" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl bg-gray-100 dark:bg-drive-darkBg flex items-center justify-center shrink-0">
                    <Tv className="w-10 h-10 text-gray-400 animate-pulse" />
                  </div>
                )}

                <div className="space-y-2.5 text-left">
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                    <Tv className="w-4 h-4" />
                    <span>Como assistir em qualquer Smart TV:</span>
                  </div>
                  <ol className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Aponte a câmera do celular para o QR Code ou abra o navegador da TV (Samsung Internet, LG Web Browser, Fire TV Silk).</li>
                    <li>Digite ou acesse o link direto exibido abaixo.</li>
                    <li>O vídeo tocará em tela cheia com legendas e você pode usar o controle da TV!</li>
                  </ol>
                  <div className="pt-1">
                    <button
                      onClick={() => castMedia(null, mediaUrl, title, subUrl)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                    >
                      Sincronizar com TV Conectada
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct TV Link Copy */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Link Direto para a Smart TV
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveTvUrl || 'Aguardando IP da rede local...'}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!effectiveTvUrl) return;
                      navigator.clipboard.writeText(effectiveTvUrl);
                      setCopiedTvUrl(true);
                      setTimeout(() => setCopiedTvUrl(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow shrink-0 active:scale-95"
                  >
                    {copiedTvUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTvUrl ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href={effectiveTvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-gray-100 dark:bg-drive-darkBg hover:bg-gray-200 dark:hover:bg-drive-darkHover text-gray-700 dark:text-gray-200 rounded-xl transition-all"
                    title="Testar no navegador"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Screen Mirroring */}
          {activeTab === 'mirror' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 flex flex-col sm:flex-row items-center gap-6">
                {mirrorQrCodeData ? (
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-gray-200 shrink-0">
                    <img src={mirrorQrCodeData} alt="QR Code Espelhamento" className="w-44 h-44 rounded-lg" />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl bg-gray-100 dark:bg-drive-darkBg flex items-center justify-center shrink-0">
                    <Monitor className="w-10 h-10 text-purple-400 animate-pulse" />
                  </div>
                )}

                <div className="space-y-2.5 text-left">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                    <Monitor className="w-4 h-4" />
                    <span>Espelhamento de Tela em Tempo Real</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Espelhe a tela inteira do seu PC ou a janela do DriveGram em qualquer TV ou aparelho com navegador via WebRTC com <b>60 FPS e baixíssima latência</b>.
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    {!isMirroring ? (
                      <button
                        onClick={startScreenMirroring}
                        className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all active:scale-95"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Iniciar Espelhamento de Tela</span>
                      </button>
                    ) : (
                      <button
                        onClick={stopScreenMirroring}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 transition-all active:scale-95"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>Parar Espelhamento</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Mirror Link */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  Endereço para abrir na TV (Receptor do Espelhamento):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={effectiveMirrorUrl || 'Aguardando IP da rede local...'}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-gray-50 dark:bg-drive-darkBg border border-gray-200 dark:border-drive-darkBorder text-gray-700 dark:text-gray-300 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!effectiveMirrorUrl) return;
                      navigator.clipboard.writeText(effectiveMirrorUrl);
                      setCopiedMirrorUrl(true);
                      setTimeout(() => setCopiedMirrorUrl(false), 2000);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all shadow shrink-0 active:scale-95"
                  >
                    {copiedMirrorUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMirrorUrl ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-drive-darkBorder bg-gray-50/50 dark:bg-drive-darkBg/50 text-[11px] text-gray-500">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>IP Local: <span className="font-mono text-gray-700 dark:text-gray-300">{networkLanIp || 'Detectando...'}</span></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-gray-200 dark:bg-drive-darkHover text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
