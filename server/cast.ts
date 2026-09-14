import os from 'os';
import http from 'http';
import dgram from 'dgram';
import net from 'net';
import { execSync } from 'child_process';
import castv2Pkg from 'castv2-client';

let CastV2Client: any = null;
let DefaultMediaReceiver: any = null;
try {
  CastV2Client = (castv2Pkg as any).Client || (castv2Pkg as any).default?.Client || castv2Pkg;
  DefaultMediaReceiver = (castv2Pkg as any).DefaultMediaReceiver || (castv2Pkg as any).default?.DefaultMediaReceiver;
} catch (e) {
  console.warn('[CastService] castv2-client não carregado:', e);
}

export interface CastDevice {
  id: string;
  name: string;
  ip: string;
  port?: number;
  type: 'chromecast' | 'smart_tv_samsung' | 'smart_tv_lg' | 'roku' | 'dlna' | 'phone' | 'generic';
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
  private activeCastClient: any = null;
  private activeCastPlayer: any = null;
  private activeCastDeviceId: string | null = null;

  constructor() {
    this.detectLocalInterfaces();
  }

  // Get local network LAN IP so Smart TVs on the same Wi-Fi can reach the server
  public getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    const candidates: Array<{ address: string; score: number; name: string }> = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      const lower = name.toLowerCase();
      const isVirtual = lower.includes('virtual') || lower.includes('vpn') || 
                        lower.includes('loopback') || lower.includes('veth') || 
                        lower.includes('docker') || lower.includes('wsl') || 
                        lower.includes('vmware') || lower.includes('topaz') || 
                        lower.includes('mcafee') || lower.includes('tailscale') || 
                        lower.includes('zerotier') || lower.includes('hyper-v');

      for (const iface of addrs) {
        if (iface.family === 'IPv4' && !iface.internal) {
          // Exclude point-to-point / host-only masks, APIPA and loopback
          if (iface.netmask === '255.255.255.255' || iface.address.startsWith('169.254.') || iface.address.startsWith('127.')) {
            continue;
          }

          let score = 0;
          if (!isVirtual) score += 50;
          if (lower.includes('wi-fi') || lower.includes('wlan') || lower.includes('wireless')) score += 40;
          else if (lower.includes('ethernet') || lower.includes('eth')) score += 30;

          if (iface.address.startsWith('192.168.')) score += 20;
          else if (iface.address.startsWith('10.')) score += 10;
          else if (iface.address.startsWith('172.')) score += 10;

          candidates.push({ address: iface.address, score, name });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].address;
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
   * Automatically registers or updates a connected device (e.g. mobile browser or TV opening /tv or SSE)
   */
  public registerConnectedClient(ip: string, userAgent?: string, customName?: string): CastDevice {
    const cleanIp = ip.replace(/^.*:/, '').trim();
    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === this.getLocalIpAddress()) {
      return this.devices.get('local-pc') || {
        id: 'local-pc',
        name: `Computador Local (${os.hostname()})`,
        ip: cleanIp,
        type: 'generic',
        status: 'ready'
      };
    }

    let type: CastDevice['type'] = 'phone';
    let name = customName || `Dispositivo Móvel (${cleanIp})`;
    let model = 'Navegador Web';

    const ua = (userAgent || '').toLowerCase();
    if (
      ua.includes('smart-tv') || ua.includes('tizen') || ua.includes('web0s') || 
      ua.includes('webos') || ua.includes('viera') || ua.includes('crkey') || 
      ua.includes('googletv') || ua.includes('android tv') || ua.includes('appletv')
    ) {
      type = 'dlna';
      if (ua.includes('tizen')) {
        name = `Samsung Smart TV (${cleanIp})`;
        type = 'smart_tv_samsung';
        model = 'Samsung Tizen OS';
      } else if (ua.includes('webos') || ua.includes('web0s')) {
        name = `LG Smart TV (${cleanIp})`;
        type = 'smart_tv_lg';
        model = 'LG webOS';
      } else if (ua.includes('googletv') || ua.includes('crkey') || ua.includes('android tv')) {
        name = `Google TV / Android TV (${cleanIp})`;
        type = 'chromecast';
        model = 'Google Cast / Android TV';
      } else {
        name = `Smart TV Web (${cleanIp})`;
        model = 'Smart TV Browser';
      }
    } else if (ua.includes('iphone')) {
      type = 'phone';
      name = `iPhone (${cleanIp})`;
      model = 'Apple iOS';
    } else if (ua.includes('ipad')) {
      type = 'phone';
      name = `iPad (${cleanIp})`;
      model = 'Apple iPadOS';
    } else if (ua.includes('android')) {
      type = 'phone';
      name = `Smartphone Android (${cleanIp})`;
      model = 'Google Android';
    } else if (ua.includes('windows')) {
      type = 'generic';
      name = `PC Windows (${cleanIp})`;
      model = 'Windows PC';
    } else if (ua.includes('macintosh') || ua.includes('mac os')) {
      type = 'generic';
      name = `Mac (${cleanIp})`;
      model = 'macOS';
    }

    const id = `client-${cleanIp.replace(/\./g, '-')}`;
    const existing = this.devices.get(id);

    const dev: CastDevice = {
      id,
      name: existing?.name && !existing.name.startsWith('Dispositivo Móvel') ? existing.name : name,
      ip: cleanIp,
      type: existing?.type && existing.type !== 'phone' ? existing.type : type,
      model: existing?.model || model,
      status: 'ready'
    };

    this.devices.set(id, dev);
    return dev;
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
   * Discovers active IP addresses and MACs on the local Wi-Fi subnet using the OS ARP cache
   */
  private getArpNeighbors(localIp: string): Array<{ ip: string; mac?: string }> {
    const neighbors: Array<{ ip: string; mac?: string }> = [];
    try {
      const output = execSync('arp -a', { encoding: 'utf-8', timeout: 2000 });
      const subnetPrefix = localIp.substring(0, localIp.lastIndexOf('.') + 1);
      const lines = output.split('\n');
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]+)/);
        if (match) {
          const ip = match[1];
          const mac = match[2].toLowerCase();
          if (ip.startsWith(subnetPrefix) && ip !== localIp && !ip.endsWith('.255') && !ip.endsWith('.1')) {
            if (!mac.includes('ff-ff-ff-ff-ff-ff') && !mac.includes('01-00-5e') && mac !== '00-00-00-00-00-00') {
              neighbors.push({ ip, mac });
            }
          }
        }
      }
    } catch (e) {
      console.warn('[CastService] Erro ao consultar tabela ARP:', e);
    }
    return neighbors;
  }

  /**
   * Fast probe for Chromecast (8008), Samsung (8001), Roku (8060) and connected mobile devices
   */
  private async probeSubnetDevices(): Promise<void> {
    const localIp = this.getLocalIpAddress();
    if (localIp === '127.0.0.1') return;

    const parts = localIp.split('.');
    const baseSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
    const myLastOctet = parseInt(parts[3], 10);

    // 1. Get active neighbor devices from ARP table (e.g. mobile phones, smart TVs)
    const arpNeighbors = this.getArpNeighbors(localIp);

    // 2. Build candidates list: all ARP neighbors + common router DHCP range (.1 to .30) + local vicinity
    const candidateIps = new Set<string>();
    for (const n of arpNeighbors) {
      candidateIps.add(n.ip);
    }
    for (let i = 1; i <= 30; i++) {
      if (i !== myLastOctet && i !== 1) candidateIps.add(`${baseSubnet}.${i}`);
    }
    for (let i = Math.max(2, myLastOctet - 8); i <= Math.min(254, myLastOctet + 8); i++) {
      if (i !== myLastOctet) candidateIps.add(`${baseSubnet}.${i}`);
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

    // Probe candidate IPs
    await Promise.all(
      Array.from(candidateIps).map(async (ip) => {
        // A. Google TV / Chromecast (port 8008)
        try {
          const is8008Open = await checkPort(ip, 8008, 350);
          if (is8008Open) {
            const devId = `cast-${ip.replace(/\./g, '-')}`;
            let name = `Google TV / Chromecast (${ip})`;
            let model = 'Google Cast / Android TV';

            try {
              const res = await fetch(`http://${ip}:8008/setup/eureka_info`, { signal: AbortSignal.timeout(900) });
              if (res.ok) {
                const data: any = await res.json();
                if (data.name) name = data.name;
                if (data.model_name) model = data.model_name;
              }
            } catch {}

            this.devices.set(devId, {
              id: devId,
              name,
              ip,
              port: 8008,
              type: 'chromecast',
              model,
              status: 'ready'
            });
            return;
          }
        } catch {}

        // B. Samsung Smart TV (port 8001)
        try {
          const is8001Open = await checkPort(ip, 8001, 350);
          if (is8001Open) {
            const devId = `samsung-${ip.replace(/\./g, '-')}`;
            let name = `Samsung Smart TV (${ip})`;
            let model = 'Samsung Tizen';

            try {
              const res = await fetch(`http://${ip}:8001/api/v2/`, { signal: AbortSignal.timeout(900) });
              if (res.ok) {
                const data: any = await res.json();
                if (data?.device?.name) name = data.device.name;
                if (data?.device?.modelName) model = data.device.modelName;
              }
            } catch {}

            this.devices.set(devId, {
              id: devId,
              name,
              ip,
              port: 8001,
              type: 'smart_tv_samsung',
              model,
              status: 'ready'
            });
            return;
          }
        } catch {}

        // C. Roku TV (port 8060)
        try {
          const is8060Open = await checkPort(ip, 8060, 350);
          if (is8060Open) {
            const devId = `roku-${ip.replace(/\./g, '-')}`;
            let name = `Roku TV (${ip})`;
            let model = 'Roku OS';

            try {
              const res = await fetch(`http://${ip}:8060/query/device-info`, { signal: AbortSignal.timeout(900) });
              if (res.ok) {
                const xml = await res.text();
                const friendlyMatch = xml.match(/<(?:user-device-name|friendly-device-name)>([^<]+)<\//i);
                const modelMatch = xml.match(/<model-name>([^<]+)<\//i);
                if (friendlyMatch && friendlyMatch[1]) name = friendlyMatch[1];
                if (modelMatch && modelMatch[1]) model = modelMatch[1];
              }
            } catch {}

            this.devices.set(devId, {
              id: devId,
              name,
              ip,
              port: 8060,
              type: 'roku',
              model,
              status: 'ready'
            });
            return;
          }
        } catch {}
      })
    );

    // 3. For ARP neighbors that were not recognized as TV endpoints, register as connected mobile/network devices
    for (const neighbor of arpNeighbors) {
      const alreadyRegistered = Array.from(this.devices.values()).some(
        d => d.ip === neighbor.ip && (d.type === 'chromecast' || d.type === 'smart_tv_samsung' || d.type === 'smart_tv_lg' || d.type === 'roku')
      );
      if (!alreadyRegistered) {
        const phoneId = `phone-${neighbor.ip.replace(/\./g, '-')}`;
        if (!this.devices.has(phoneId)) {
          this.devices.set(phoneId, {
            id: phoneId,
            name: `Celular / Dispositivo Móvel (${neighbor.ip})`,
            ip: neighbor.ip,
            type: 'phone',
            model: neighbor.mac ? `Wi-Fi (MAC ${neighbor.mac.toUpperCase()})` : 'Rede Wi-Fi',
            status: 'ready'
          });
        }
      }
    }
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

    const serverPort = process.env.PORT || 5000;

    // Ensure mediaUrl uses actual LAN IP so TV can stream it across Wi-Fi
    let lanMediaUrl = mediaUrl;
    if (lanMediaUrl.startsWith('/')) {
      lanMediaUrl = `http://${localIp}:${serverPort}${lanMediaUrl}`;
    } else if (lanMediaUrl.includes('localhost') || lanMediaUrl.includes('127.0.0.1')) {
      lanMediaUrl = lanMediaUrl.replace(/localhost|127\.0\.0\.1/, localIp);
    }

    const tvPlayerUrl = `http://${localIp}:${serverPort}/tv?url=${encodeURIComponent(lanMediaUrl)}&title=${encodeURIComponent(title || 'DriveGram Video')}`;

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

    // 3. Google Cast / Chromecast V2 native integration (port 8009 TLS)
    if (device.type === 'chromecast' && CastV2Client && DefaultMediaReceiver) {
      try {
        if (this.activeCastClient) {
          try { this.activeCastClient.close(); } catch {}
          this.activeCastClient = null;
          this.activeCastPlayer = null;
          this.activeCastDeviceId = null;
        }

        const client = new CastV2Client();
        const connectPromise = new Promise<{ success: boolean; message: string }>((resolve) => {
          const timeoutTimer = setTimeout(() => {
            try { client.close(); } catch {}
            resolve({ success: false, message: 'Tempo limite ao conectar com a TV via Google Cast' });
          }, 8000);

          client.connect(device.ip, () => {
            console.log(`[CastService] Conectado ao Google TV (${device.ip}:8009). Iniciando DefaultMediaReceiver...`);
            client.launch(DefaultMediaReceiver, (err: any, player: any) => {
              if (err) {
                clearTimeout(timeoutTimer);
                try { client.close(); } catch {}
                console.warn('[CastService] Erro ao iniciar DefaultMediaReceiver:', err);
                return resolve({ success: false, message: `Falha ao iniciar player na TV: ${err?.message || err}` });
              }

              this.activeCastClient = client;
              this.activeCastPlayer = player;
              this.activeCastDeviceId = device.id;

              // Detect MIME type
              let mimeType = 'video/mp4';
              const cleanUrlLower = lanMediaUrl.toLowerCase().split('?')[0];
              if (cleanUrlLower.endsWith('.webm')) mimeType = 'video/webm';
              else if (cleanUrlLower.endsWith('.mp3')) mimeType = 'audio/mp3';
              else if (cleanUrlLower.endsWith('.flac')) mimeType = 'audio/flac';
              else if (cleanUrlLower.endsWith('.m4a')) mimeType = 'audio/mp4';

              const mediaPayload = {
                contentId: lanMediaUrl,
                contentType: mimeType,
                streamType: 'BUFFERED',
                metadata: {
                  type: 0,
                  metadataType: 0,
                  title: title || 'DriveGram Vídeo'
                }
              };

              console.log(`[CastService] Carregando mídia na TV (${lanMediaUrl})...`);
              player.load(mediaPayload, { autoplay: true }, (errLoad: any, status: any) => {
                clearTimeout(timeoutTimer);
                if (errLoad) {
                  console.warn('[CastService] Erro ao carregar mídia no player:', errLoad);
                  return resolve({ success: false, message: `Erro ao reproduzir vídeo na TV: ${errLoad?.message || errLoad}` });
                }

                console.log('[CastService] Mídia iniciada com sucesso na TV!', status?.playerState);

                player.on('status', (st: any) => {
                  if (st) {
                    this.updateSessionState('drivegram-tv', {
                      currentTime: st.currentTime || 0,
                      duration: st.media?.duration || 0,
                      isPlaying: st.playerState === 'PLAYING',
                      title: title || 'DriveGram Vídeo',
                      mediaUrl: lanMediaUrl
                    });
                  }
                });

                resolve({
                  success: true,
                  message: `Reproduzindo "${title || 'Vídeo'}" diretamente na "${device.name}"`
                });
              });
            });
          });

          client.on('error', (err: any) => {
            console.warn('[CastService] CastV2 client error:', err?.message || err);
            if (this.activeCastDeviceId === device.id) {
              this.activeCastClient = null;
              this.activeCastPlayer = null;
              this.activeCastDeviceId = null;
            }
          });
        });

        const castResult = await connectPromise;
        if (castResult.success) {
          successMessage = castResult.message;
        } else {
          console.warn('[CastService]', castResult.message);
        }
      } catch (err: any) {
        console.warn('[CastService] Erro no fluxo CastV2:', err);
      }
    }

    // 4. Mobile / Connected devices
    if (device.type === 'phone') {
      successMessage = `Transmissão sincronizada com "${device.name}". O player pode ser aberto via QR Code ou link!`;
    }

    return {
      success: true,
      message: successMessage,
      streamUrl: lanMediaUrl,
      tvPlayerUrl
    };
  }

  /**
   * Send remote control playback command to DLNA / Roku / Chromecast device
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

    // 0. Google Cast V2 active player control
    if (this.activeCastPlayer && (this.activeCastDeviceId === deviceId || device.type === 'chromecast')) {
      try {
        if (action === 'play') {
          this.activeCastPlayer.play(() => {});
          return { success: true, message: 'Comando Play enviado à TV' };
        } else if (action === 'pause') {
          this.activeCastPlayer.pause(() => {});
          return { success: true, message: 'Comando Pause enviado à TV' };
        } else if (action === 'stop') {
          this.activeCastPlayer.stop(() => {
            try { this.activeCastClient?.close(); } catch {}
            this.activeCastClient = null;
            this.activeCastPlayer = null;
            this.activeCastDeviceId = null;
          });
          return { success: true, message: 'Reprodução parada na TV' };
        } else if (action === 'seek' && typeof params?.time === 'number') {
          this.activeCastPlayer.seek(params.time, () => {});
          return { success: true, message: `Avançado para ${Math.round(params.time)}s` };
        } else if (action === 'volume' && typeof params?.volume === 'number') {
          this.activeCastClient?.setVolume({ level: params.volume }, () => {});
          return { success: true, message: `Volume ajustado para ${Math.round(params.volume * 100)}%` };
        } else if (action === 'forward') {
          this.activeCastPlayer.getStatus((_err: any, st: any) => {
            const cur = st?.currentTime || 0;
            this.activeCastPlayer.seek(cur + 10, () => {});
          });
          return { success: true, message: 'Avançado 10 segundos' };
        } else if (action === 'rewind') {
          this.activeCastPlayer.getStatus((_err: any, st: any) => {
            const cur = st?.currentTime || 0;
            this.activeCastPlayer.seek(Math.max(0, cur - 10), () => {});
          });
          return { success: true, message: 'Retrocedido 10 segundos' };
        }
      } catch (e: any) {
        console.warn('[CastService] Erro ao enviar comando CastV2:', e);
      }
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

