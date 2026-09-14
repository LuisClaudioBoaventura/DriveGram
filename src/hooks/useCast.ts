import { useState, useEffect, useRef, useCallback } from 'react';
import { CastDevice, CastPlaybackState } from '../types/index.js';
import { resolveApiUrl } from '../utils/mobileBridge.js';

export interface UseCastOptions {
  sessionId?: string;
  onCastStateChange?: (state: CastPlaybackState) => void;
}

export function useCast(options?: UseCastOptions) {
  const sessionId = options?.sessionId || 'drivegram-tv';
  const [castDevices, setCastDevices] = useState<CastDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [networkLanIp, setNetworkLanIp] = useState<string>('');
  const [activeDevice, setActiveDevice] = useState<CastDevice | null>(null);
  const [isCasting, setIsCasting] = useState(false);
  const [castFeedback, setCastFeedback] = useState<string | null>(null);
  const [castState, setCastState] = useState<CastPlaybackState | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [tvPlayerUrl, setTvPlayerUrl] = useState<string>('');

  // Screen Mirroring State
  const [isMirroring, setIsMirroring] = useState(false);
  const [mirrorRoomId] = useState(() => `dg-screen-${Math.random().toString(36).substring(2, 7)}`);
  const mirrorStreamRef = useRef<MediaStream | null>(null);
  const mirrorPcRef = useRef<RTCPeerConnection | null>(null);
  const mirrorPollIntervalRef = useRef<any>(null);

  // Scan network for devices and retrieve server LAN IP
  const scanDevices = useCallback(async () => {
    setIsScanning(true);
    setCastFeedback(null);
    try {
      const [devRes, ipRes] = await Promise.all([
        fetch(resolveApiUrl('/api/cast/devices')),
        fetch(resolveApiUrl('/api/cast/network-ip'))
      ]);

      if (devRes.ok) {
        const devices = await devRes.json();
        setCastDevices(devices);
      }

      if (ipRes.ok) {
        const ipData = await ipRes.json();
        setNetworkLanIp(ipData.baseUrl);
      }
    } catch (err) {
      console.warn('[useCast] Erro ao escanear dispositivos:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  // Poll TV session state periodically when casting
  useEffect(() => {
    if (!isCasting) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(resolveApiUrl(`/api/cast/session/${encodeURIComponent(sessionId)}/state`));
        if (res.ok) {
          const state: CastPlaybackState = await res.json();
          setCastState(state);
          if (options?.onCastStateChange) {
            options.onCastStateChange(state);
          }
        }
      } catch {}
    }, 1500);
    return () => clearInterval(interval);
  }, [isCasting, sessionId, options]);

  // Transmit media URL to target device or DriveGram Web TV
  const castMedia = useCallback(async (
    device: CastDevice | null,
    mediaUrl: string,
    title?: string,
    subUrl?: string
  ) => {
    // Determine effective streaming URL on local LAN
    let effectiveUrl = mediaUrl;
    if (networkLanIp && (effectiveUrl.startsWith('/') || effectiveUrl.includes('localhost') || effectiveUrl.includes('127.0.0.1'))) {
      if (effectiveUrl.startsWith('/')) {
        effectiveUrl = `${networkLanIp}${effectiveUrl}`;
      } else {
        effectiveUrl = effectiveUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, networkLanIp);
      }
    }

    const generatedTvUrl = `${networkLanIp || 'http://127.0.0.1:5000'}/tv?url=${encodeURIComponent(effectiveUrl)}&title=${encodeURIComponent(title || 'DriveGram Video')}&session=${encodeURIComponent(sessionId)}${subUrl ? `&subUrl=${encodeURIComponent(subUrl)}` : ''}`;
    setTvPlayerUrl(generatedTvUrl);

    if (device) {
      setActiveDevice(device);
      setIsCasting(true);
      setCastFeedback(`Conectando a "${device.name}" (${device.ip})...`);

      // 1. Send hardware cast request (DLNA / Roku)
      try {
        const res = await fetch(resolveApiUrl('/api/cast/play'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId: device.id,
            mediaUrl: effectiveUrl,
            title: title || 'DriveGram Video'
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCastFeedback(`✅ ${data.message}`);
          if (data.tvPlayerUrl) setTvPlayerUrl(data.tvPlayerUrl);
        }
      } catch (e) {
        setCastFeedback(`Transmissão enviada para ${device.name}`);
      }

      // 2. Also send load command to interactive TV session in case TV is running /tv web player
      try {
        await fetch(resolveApiUrl(`/api/cast/session/${encodeURIComponent(sessionId)}/command`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load',
            mediaUrl: effectiveUrl,
            title: title || 'DriveGram Video',
            subUrl: subUrl || ''
          })
        });
      } catch {}
    } else {
      // Direct Web TV stream session
      setIsCasting(true);
      try {
        await fetch(resolveApiUrl(`/api/cast/session/${encodeURIComponent(sessionId)}/command`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'load',
            mediaUrl: effectiveUrl,
            title: title || 'DriveGram Video',
            subUrl: subUrl || ''
          })
        });
        setCastFeedback('Transmitindo para DriveGram TV Player');
      } catch {}
    }
  }, [networkLanIp, sessionId]);

  // Send playback control action (play, pause, seek, volume, stop)
  const controlPlayback = useCallback(async (
    action: 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'forward' | 'rewind',
    params?: { time?: number; volume?: number; offset?: number }
  ) => {
    // 1. Hardware device control
    if (activeDevice) {
      fetch(resolveApiUrl('/api/cast/control'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: activeDevice.id,
          action,
          params
        })
      }).catch(() => {});
    }

    // 2. TV web player SSE session control
    fetch(resolveApiUrl(`/api/cast/session/${encodeURIComponent(sessionId)}/command`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        ...params
      })
    }).catch(() => {});

    if (action === 'stop') {
      setIsCasting(false);
      setActiveDevice(null);
      setCastState(null);
    }
  }, [activeDevice, sessionId]);

  // Add device manually by IP
  const addManualDevice = useCallback(async (ip: string, name?: string) => {
    if (!ip.trim()) return null;
    setIsAddingManual(true);
    try {
      const res = await fetch(resolveApiUrl('/api/cast/add-device'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: ip.trim(), name: name?.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        await scanDevices();
        return data.device || null;
      }
    } catch (e) {
      console.warn('[useCast] Erro ao adicionar dispositivo manual:', e);
    } finally {
      setIsAddingManual(false);
    }
    return null;
  }, [scanDevices]);

  // Screen Mirroring WebRTC implementation
  const startScreenMirroring = useCallback(async (): Promise<MediaStream | null> => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('Captura de tela não suportada neste ambiente');
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 60, max: 60 }
        } as any,
        audio: true
      });

      mirrorStreamRef.current = stream;
      setIsMirroring(true);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      mirrorPcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          fetch(resolveApiUrl('/api/cast/mirror/signal'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roomId: mirrorRoomId,
              type: 'sender-candidate',
              payload: event.candidate
            })
          }).catch(() => {});
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(resolveApiUrl('/api/cast/mirror/signal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: mirrorRoomId,
          type: 'offer',
          payload: offer
        })
      });

      // Poll answers from TV receiver
      let lastTimestamp = 0;
      mirrorPollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(resolveApiUrl(`/api/cast/mirror/signal?roomId=${encodeURIComponent(mirrorRoomId)}&since=${lastTimestamp}`));
          if (res.ok) {
            const data = await res.json();
            if (data.timestamp) lastTimestamp = data.timestamp;
            for (const sig of data.signals) {
              if (sig.type === 'answer') {
                if (pc.signalingState !== 'stable') {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
                }
              } else if (sig.type === 'receiver-candidate' && sig.payload) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
                } catch (e) {}
              }
            }
          }
        } catch {}
      }, 1000);

      // Handle user stopping screen share from browser/system toolbar
      stream.getVideoTracks()[0].onended = () => {
        stopScreenMirroring();
      };

      return stream;
    } catch (err: any) {
      console.warn('[useCast] Erro ao iniciar espelhamento de tela:', err);
      setIsMirroring(false);
      return null;
    }
  }, [mirrorRoomId]);

  const stopScreenMirroring = useCallback(() => {
    if (mirrorPollIntervalRef.current) {
      clearInterval(mirrorPollIntervalRef.current);
      mirrorPollIntervalRef.current = null;
    }
    if (mirrorStreamRef.current) {
      mirrorStreamRef.current.getTracks().forEach(t => t.stop());
      mirrorStreamRef.current = null;
    }
    if (mirrorPcRef.current) {
      mirrorPcRef.current.close();
      mirrorPcRef.current = null;
    }
    setIsMirroring(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mirrorPollIntervalRef.current) clearInterval(mirrorPollIntervalRef.current);
      if (mirrorStreamRef.current) {
        mirrorStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (mirrorPcRef.current) {
        mirrorPcRef.current.close();
      }
    };
  }, []);

  return {
    castDevices,
    isScanning,
    networkLanIp,
    activeDevice,
    isCasting,
    castFeedback,
    castState,
    isAddingManual,
    tvPlayerUrl,
    sessionId,
    isMirroring,
    mirrorRoomId,
    scanDevices,
    castMedia,
    controlPlayback,
    addManualDevice,
    startScreenMirroring,
    stopScreenMirroring,
    stopCasting: () => controlPlayback('stop')
  };
}
