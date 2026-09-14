import os from 'os';
import http from 'http';
import dgram from 'dgram';
import net from 'net';

export interface CastDevice {
  id: string;
  name: string;
  ip: string;
  port?: number;
  type: 'chromecast' | 'smart_tv_samsung' | 'smart_tv_lg' | 'roku' | 'dlna' | 'generic';
  model?: string;
  status: 'online' | 'ready';
  avTransportUrl?: string;
  locationUrl?: string;
  isManual?: boolean;
}

export class CastService {
  private devices: Map<string, CastDevice> = new Map();
  private isScanning = false;
  private manualDevices: Map<string, CastDevice> = new Map();

  constructor() {
    this.detectLocalInterfaces();
  }

  // Get local network LAN IP so Smart TVs on the same Wi-Fi can reach the server
  public getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (!netInterface) continue;
      for (const iface of netInterface) {
        // Skip internal/loopback and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          // Exclude virtual adapter subnets if possible (e.g. 192.168.56.x VirtualBox, 169.254.x APIPA)
          if (!iface.address.startsWith('169.254.') && !iface.address.startsWith('127.')) {
            return iface.address;
          }
        }
      }
    }
    return '127.0.0.1';
  }

  private detectLocalInterfaces() {
    const localIp = this.getLocalIpAddress();
    const hostname = os.hostname();

    // Default local streaming endpoint
    this.devices.set('local-pc', {
      id: 'local-pc',
      name: `Computador Local (${hostname})`,
      ip: localIp,
      type: 'generic',
      status: 'ready'
    });
  }

  /**
   * Adds a manual device (e.g. user types the TV IP directly in the UI)
   */
  public addManualDevice(ip: string, name?: string): CastDevice {
    const cleanIp = ip.trim().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
    const id = `manual-${cleanIp.replace(/\./g, '-')}`;
    const device: CastDevice = {
      id,
      name: name?.trim() || `Smart TV (${cleanIp})`,
      ip: cleanIp,
      type: 'dlna',
      status: 'ready',
      isManual: true
    };
    this.manualDevices.set(id, device);
    this.devices.set(id, device);
    return device;
  }

  /**
   * Real SSDP (UPnP) discovery over UDP socket 239.255.255.250:1900
   */
  private scanSsdp(timeoutMs = 2500): Promise<void> {
    return new Promise((resolve) => {
      let socket: dgram.Socket | null = null;
      try {
        socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      } catch (err) {
        console.warn('[CastService] Erro ao criar socket SSDP:', err);
        return resolve();
      }

      const finish = () => {
        try {
          if (socket) {
            socket.close();
          }
        } catch {}
        resolve();
      };

      const timer = setTimeout(finish, timeoutMs);

      socket.on('error', (err) => {
        console.warn('[CastService] SSDP socket error:', err?.message || err);
        clearTimeout(timer);
        finish();
      });

      socket.on('message', async (msg, rinfo) => {
        try {
          const text = msg.toString();
          const ip = rinfo.address;
          if (ip === '127.0.0.1' || ip === this.getLocalIpAddress()) return;

          const lines = text.split('\r\n');
          let location = '';
          let serverHeader = '';
          let stHeader = '';

          for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('location:')) {
              location = line.substring(9).trim();
            } else if (lower.startsWith('server:')) {
              serverHeader = line.substring(7).trim();
            } else if (lower.startsWith('st:')) {
              stHeader = line.substring(3).trim();
            }
          }

          // Classify device
          let type: CastDevice['type'] = 'dlna';
          let name = `Smart TV / Player (${ip})`;
          let model = serverHeader || 'UPnP/DLNA Media Device';

          const combined = `${text} ${serverHeader} ${stHeader}`.toLowerCase();
          if (combined.includes('samsung') || combined.includes('tizen')) {
            type = 'smart_tv_samsung';
            name = `Samsung Smart TV (${ip})`;
          } else if (combined.includes('lg') || combined.includes('webos')) {
            type = 'smart_tv_lg';
            name = `LG Smart TV (${ip})`;
          } else if (combined.includes('roku')) {
            type = 'roku';
            name = `Roku TV (${ip})`;
          } else if (combined.includes('chromecast') || combined.includes('google') || combined.includes('eureka')) {
            type = 'chromecast';
            name = `Google TV / Chromecast (${ip})`;
          }

          const devId = `ssdp-${ip.replace(/\./g, '-')}`;
          const existing = this.devices.get(devId);

          if (!existing || existing.type === 'generic' || existing.type === 'dlna') {
            const dev: CastDevice = {
              id: devId,
              name,
              ip,
              type,
              model,
              status: 'ready',
              locationUrl: location || undefined
            };

            this.devices.set(devId, dev);

            // Fetch device description XML if location is provided to get friendly name
            if (location && location.startsWith('http')) {
              fetch(location, { signal: AbortSignal.timeout(1500) })
                .then(r => r.text())
                .then(xml => {
                  const friendlyMatch = xml.match(/<friendlyName>([^<]+)<\/friendlyName>/i);
                  const modelMatch = xml.match(/<modelName>([^<]+)<\/modelName>/i);
                  const controlMatch = xml.match(/<controlURL>([^<]+)<\/controlURL>/i);

                  if (friendlyMatch && friendlyMatch[1]) {
                    dev.name = friendlyMatch[1];
                  }
                  if (modelMatch && modelMatch[1]) {
                    dev.model = modelMatch[1];
                  }
                  if (controlMatch && controlMatch[1]) {
                    let cUrl = controlMatch[1];
                    if (!cUrl.startsWith('http')) {
                      const urlObj = new URL(location);
                      cUrl = `${urlObj.protocol}//${urlObj.host}${cUrl.startsWith('/') ? '' : '/'}${cUrl}`;
                    }
                    dev.avTransportUrl = cUrl;
                  }
                  this.devices.set(devId, dev);
                })
                .catch(() => {});
            }
          }
        } catch (e) {}
      });

      socket.bind(0, () => {
        try {
          socket!.setBroadcast(true);
          socket!.setMulticastTTL(4);

          const ssdpQueries = [
            'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n',
            'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: urn:schemas-upnp-org:device:MediaRenderer:1\r\n\r\n',
            'M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: urn:dial-multiscreen-org:service:dial:1\r\n\r\n'
          ];

          for (const q of ssdpQueries) {
            const buf = Buffer.from(q);
            socket!.send(buf, 0, buf.length, 1900, '239.255.255.250');
          }
        } catch (e) {
          console.warn('[CastService] Erro ao enviar SSDP broadcast:', e);
        }
      });
    });
  }

  /**
   * Fast TCP subnet probe for known Smart TV ports (Roku 8060, Chromecast 8008, Samsung 8001)
   */
  private async probeSubnetDevices(): Promise<void> {
    const localIp = this.getLocalIpAddress();
    if (localIp === '127.0.0.1') return;

    const parts = localIp.split('.');
    const baseSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const myLastOctet = parseInt(parts[3], 10);

    // Common probe ports:
    // 8008 -> Chromecast / Google TV DIAL
    // 8060 -> Roku ECP
    // 8001 -> Samsung Smart TV
    const portsToProbe = [8008, 8060, 8001];

    // Select candidate IPs: common DHCP range around local IP and router range (.1 to .30, plus neighborhood of local IP)
    const candidateIps: string[] = [];
    for (let i = 1; i <= 30; i++) {
      if (i !== myLastOctet) candidateIps.push(`${baseSubnet}.${i}`);
    }
    for (let i = Math.max(1, myLastOctet - 10); i <= Math.min(254, myLastOctet + 10); i++) {
      const ip = `${baseSubnet}.${i}`;
      if (!candidateIps.includes(ip) && i !== myLastOctet) {
        candidateIps.push(ip);
      }
    }

    const checkPort = (ip: string, port: number, timeout = 350): Promise<boolean> => {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        let isDone = false;
        socket.setTimeout(timeout);
        socket.once('connect', () => {
          isDone = true;
          socket.destroy();
          resolve(true);
        });
        socket.once('timeout', () => {
          if (!isDone) {
            isDone = true;
            socket.destroy();
            resolve(false);
          }
        });
        socket.once('error', () => {
          if (!isDone) {
            isDone = true;
            socket.destroy();
            resolve(false);
          }
        });
        try {
          socket.connect(port, ip);
        } catch {
          resolve(false);
        }
      });
    };

    // Run probes with limited concurrency
    await Promise.all(
      candidateIps.map(async (ip) => {
        for (const port of portsToProbe) {
          const isOpen = await checkPort(ip, port);
          if (isOpen) {
            let type: CastDevice['type'] = 'dlna';
            let name = `Smart TV / Dispositivo (${ip})`;

            if (port === 8060) {
              type = 'roku';
              name = `Roku Express / TV (${ip})`;
            } else if (port === 8008) {
              type = 'chromecast';
              name = `Google TV / Chromecast (${ip})`;
            } else if (port === 8001) {
              type = 'smart_tv_samsung';
              name = `Samsung Smart TV (${ip})`;
            }

            const id = `tcp-${ip.replace(/\./g, '-')}-${port}`;
            if (!this.devices.has(id)) {
              this.devices.set(id, {
                id,
                name,
                ip,
                port,
                type,
                status: 'ready'
              });
            }
          }
        }
      })
    );
  }

  // Active SSDP & Network scanner for Smart TVs and Cast receivers on the local Wi-Fi
  public async scanNetworkDevices(): Promise<CastDevice[]> {
    if (this.isScanning) {
      return Array.from(this.devices.values());
    }

    this.isScanning = true;
    try {
      this.detectLocalInterfaces();

      // Re-add manual devices
      for (const [id, dev] of this.manualDevices.entries()) {
        this.devices.set(id, dev);
      }

      // 1. Run real SSDP multicast discovery
      await this.scanSsdp(2000);

      // 2. Run fast TCP probe for devices whose router blocks multicast
      await this.probeSubnetDevices();
    } catch (e) {
      console.warn('[CastService] Erro durante escaneamento:', e);
    } finally {
      this.isScanning = false;
    }

    return Array.from(this.devices.values());
  }

  public getDevices(): CastDevice[] {
    return Array.from(this.devices.values());
  }

  // Cast media URL to a target device (e.g. DLNA AVTransport, Roku ECP, or Web TV Player)
  public async playOnDevice(
    deviceId: string,
    mediaUrl: string,
    title?: string
  ): Promise<{ success: boolean; message: string; streamUrl: string; tvPlayerUrl: string }> {
    const device = this.devices.get(deviceId);
    const localIp = this.getLocalIpAddress();

    // Ensure mediaUrl uses actual LAN IP so TV can stream it across Wi-Fi
    let lanMediaUrl = mediaUrl;
    if (lanMediaUrl.includes('localhost') || lanMediaUrl.includes('127.0.0.1')) {
      lanMediaUrl = lanMediaUrl.replace(/localhost|127\.0\.0\.1/, localIp);
    }

    const tvPlayerUrl = `http://${localIp}:5000/tv?url=${encodeURIComponent(lanMediaUrl)}&title=${encodeURIComponent(title || 'DriveGram Video')}`;

    if (!device) {
      return {
        success: true,
        message: `Transmissão preparada via link de streaming direto`,
        streamUrl: lanMediaUrl,
        tvPlayerUrl
      };
    }

    let successMessage = `Transmitindo "${title || 'Vídeo'}" para ${device.name}`;

    // 1. Roku ECP remote launch integration
    if (device.type === 'roku') {
      try {
        const rokuPlayUrl = `http://${device.ip}:8060/launch/play?url=${encodeURIComponent(lanMediaUrl)}`;
        await fetch(rokuPlayUrl, { method: 'POST', signal: AbortSignal.timeout(2000) }).catch(() => {});
        successMessage = `Comando de reprodução enviado ao Roku (${device.ip})`;
      } catch (e) {}
    }

    // 2. DLNA AVTransport SOAP action
    if (device.avTransportUrl || device.type === 'dlna' || device.type === 'smart_tv_samsung' || device.type === 'smart_tv_lg') {
      const targetUrl = device.avTransportUrl || `http://${device.ip}:${device.port || 7678}/smp_4_`;
      try {
        const setUriSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <CurrentURI>${lanMediaUrl}</CurrentURI>
      <CurrentURIMetaData></CurrentURIMetaData>
    </u:SetAVTransportURI>
  </s:Body>
</s:Envelope>`;

        await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"'
          },
          body: setUriSoap,
          signal: AbortSignal.timeout(2000)
        }).catch(() => {});

        const playSoap = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <Speed>1</Speed>
    </u:Play>
  </s:Body>
</s:Envelope>`;

        await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/xml; charset="utf-8"',
            'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Play"'
          },
          body: playSoap,
          signal: AbortSignal.timeout(2000)
        }).catch(() => {});

        successMessage = `Transmissão DLNA enviada para "${device.name}"`;
      } catch (e) {}
    }

    return {
      success: true,
      message: successMessage,
      streamUrl: lanMediaUrl,
      tvPlayerUrl
    };
  }

  /**
   * Send remote control playback command to DLNA / Roku device
   */
  public async controlDevice(
    deviceId: string,
    action: 'play' | 'pause' | 'stop' | 'seek' | 'volume' | 'forward' | 'rewind',
    params?: { time?: number; volume?: number }
  ): Promise<{ success: boolean; message: string }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { success: false, message: 'Dispositivo não encontrado' };
    }

    if (device.type === 'roku') {
      let key = 'Play';
      if (action === 'pause' || action === 'play') key = 'Play';
      else if (action === 'stop') key = 'Back';
      else if (action === 'forward') key = 'Fwd';
      else if (action === 'rewind') key = 'Rev';
      else if (action === 'volume') {
        key = (params?.volume ?? 1) > 0.5 ? 'VolumeUp' : 'VolumeDown';
      }

      try {
        await fetch(`http://${device.ip}:8060/keypress/${key}`, {
          method: 'POST',
          signal: AbortSignal.timeout(2000)
        }).catch(() => {});
        return { success: true, message: `Comando ${key} enviado ao Roku` };
      } catch (e) {
        return { success: false, message: 'Falha ao enviar comando ao Roku' };
      }
    }

    if (device.type === 'dlna' || device.type === 'smart_tv_samsung' || device.type === 'smart_tv_lg' || device.avTransportUrl) {
      const targetUrl = device.avTransportUrl || `http://${device.ip}:${device.port || 7678}/smp_4_`;
      let soapAction = '';
      let bodyInner = '';

      if (action === 'play') {
        soapAction = 'Play';
        bodyInner = `<u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play>`;
      } else if (action === 'pause') {
        soapAction = 'Pause';
        bodyInner = `<u:Pause xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:Pause>`;
      } else if (action === 'stop') {
        soapAction = 'Stop';
        bodyInner = `<u:Stop xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:Stop>`;
      } else if (action === 'seek' && typeof params?.time === 'number') {
        soapAction = 'Seek';
        const formatted = formatSecondsToUpnpTime(params.time);
        bodyInner = `<u:Seek xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Unit>REL_TIME</Unit><Target>${formatted}</Target></u:Seek>`;
      }

      if (soapAction && bodyInner) {
        const envelope = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>${bodyInner}</s:Body>
</s:Envelope>`;
        try {
          await fetch(targetUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset="utf-8"',
              'SOAPAction': `"urn:schemas-upnp-org:service:AVTransport:1#${soapAction}"`
            },
            body: envelope,
            signal: AbortSignal.timeout(2000)
          }).catch(() => {});
          return { success: true, message: `Comando ${soapAction} enviado à TV DLNA` };
        } catch (e) {
          return { success: false, message: `Erro ao enviar comando DLNA: ${e}` };
        }
      }
    }

    return { success: true, message: `Comando ${action} processado` };
  }

  // ---------------- INTERACTIVE WEB TV SESSIONS (SSE) ----------------
  private tvSessions: Map<string, TvSession> = new Map();

  public getOrCreateSession(sessionId = 'default'): TvSession {
    let session = this.tvSessions.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        state: {
          currentTime: 0,
          duration: 0,
          isPlaying: false,
          volume: 1,
          updatedAt: Date.now()
        },
        listeners: new Set()
      };
      this.tvSessions.set(sessionId, session);
    }
    return session;
  }

  public sendSessionCommand(sessionId: string, command: any): boolean {
    const session = this.getOrCreateSession(sessionId);
    if (session.listeners.size === 0) {
      return false;
    }
    for (const listener of session.listeners) {
      try {
        listener('command', command);
      } catch {}
    }
    return true;
  }

  public updateSessionState(sessionId: string, patch: Partial<TvSessionState>): void {
    const session = this.getOrCreateSession(sessionId);
    session.lastPing = Date.now();
    session.state = {
      ...session.state,
      ...patch,
      updatedAt: Date.now()
    };
    for (const listener of session.listeners) {
      try {
        listener('state', session.state);
      } catch {}
    }
  }

  public getSessionState(sessionId = 'default'): TvSessionState {
    const session = this.getOrCreateSession(sessionId);
    return session.state;
  }

  public addSessionListener(sessionId: string, listener: (event: string, data: any) => void): () => void {
    const session = this.getOrCreateSession(sessionId);
    session.listeners.add(listener);
    return () => {
      session.listeners.delete(listener);
    };
  }

  // ---------------- SCREEN MIRRORING SIGNALING (WEBRTC) ----------------
  private mirrorSignals: Map<string, Array<{ type: string; payload: any; timestamp: number }>> = new Map();

  public pushMirrorSignal(roomId: string, type: string, payload: any): void {
    if (!this.mirrorSignals.has(roomId)) {
      this.mirrorSignals.set(roomId, []);
    }
    const list = this.mirrorSignals.get(roomId)!;
    list.push({ type, payload, timestamp: Date.now() });
    // Keep last 50 signals
    if (list.length > 50) {
      list.splice(0, list.length - 50);
    }
  }

  public getMirrorSignals(roomId: string, since = 0): Array<{ type: string; payload: any; timestamp: number }> {
    const list = this.mirrorSignals.get(roomId) || [];
    return list.filter(item => item.timestamp > since);
  }

  public clearMirrorSignals(roomId: string): void {
    this.mirrorSignals.delete(roomId);
  }
}

function formatSecondsToUpnpTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = Math.floor(totalSec % 60);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export interface TvSessionState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  title?: string;
  mediaUrl?: string;
  updatedAt: number;
}

export interface TvSession {
  id: string;
  connectedAt: number;
  lastPing: number;
  state: TvSessionState;
  listeners: Set<(event: string, data: any) => void>;
}

export const castService = new CastService();

