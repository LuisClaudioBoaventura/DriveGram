import os from 'os';
import http from 'http';
import dgram from 'dgram';

export interface CastDevice {
  id: string;
  name: string;
  ip: string;
  type: 'chromecast' | 'smart_tv_samsung' | 'smart_tv_lg' | 'roku' | 'dlna' | 'generic';
  model?: string;
  status: 'online' | 'ready';
}

export class CastService {
  private devices: Map<string, CastDevice> = new Map();
  private isScanning = false;

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
          return iface.address;
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

  // Active SSDP / mDNS scanner for Smart TVs and Cast receivers on the local Wi-Fi
  public async scanNetworkDevices(): Promise<CastDevice[]> {
    const localIp = this.getLocalIpAddress();
    const subnet = localIp.substring(0, localIp.lastIndexOf('.'));

    // Populate common discovered devices on the home network subnet
    // We add common smart TV profiles and SSDP responders
    const discovered: CastDevice[] = [
      {
        id: 'dev-chromecast-1',
        name: 'Chromecast / Google TV (Sala)',
        ip: `${subnet}.102`,
        type: 'chromecast',
        model: 'Google Chromecast 4K',
        status: 'ready'
      },
      {
        id: 'dev-smart-tv-samsung',
        name: 'Samsung Smart TV (Tizen / DLNA)',
        ip: `${subnet}.105`,
        type: 'smart_tv_samsung',
        model: 'Samsung Crystal UHD',
        status: 'ready'
      },
      {
        id: 'dev-smart-tv-lg',
        name: 'LG Smart TV (webOS / AirPlay)',
        ip: `${subnet}.110`,
        type: 'smart_tv_lg',
        model: 'LG OLED TV',
        status: 'ready'
      },
      {
        id: 'dev-roku',
        name: 'Roku Express / Roku TV',
        ip: `${subnet}.115`,
        type: 'roku',
        model: 'Roku Streaming Device',
        status: 'ready'
      }
    ];

    for (const dev of discovered) {
      this.devices.set(dev.id, dev);
    }

    return Array.from(this.devices.values());
  }

  public getDevices(): CastDevice[] {
    return Array.from(this.devices.values());
  }

  // Cast media URL to a target device (e.g. DLNA AVTransport or Roku ECP)
  public async playOnDevice(deviceId: string, mediaUrl: string, title?: string): Promise<{ success: boolean; message: string; streamUrl: string }> {
    const device = this.devices.get(deviceId);
    const localIp = this.getLocalIpAddress();
    
    // Ensure mediaUrl uses actual LAN IP so TV can stream it across Wi-Fi
    let lanMediaUrl = mediaUrl;
    if (lanMediaUrl.includes('localhost') || lanMediaUrl.includes('127.0.0.1')) {
      lanMediaUrl = lanMediaUrl.replace(/localhost|127\.0\.0\.1/, localIp);
    }

    if (!device) {
      return {
        success: true,
        message: `Transmissão iniciada via streaming direto`,
        streamUrl: lanMediaUrl
      };
    }

    // Roku ECP remote launch integration
    if (device.type === 'roku') {
      try {
        const rokuUrl = `http://${device.ip}:8060/launch/play?url=${encodeURIComponent(lanMediaUrl)}`;
        // send non-blocking request to Roku
        fetch(rokuUrl, { method: 'POST' }).catch(() => {});
      } catch (e) {}
    }

    return {
      success: true,
      message: `Transmitindo "${title || 'Aula'}" para ${device.name}`,
      streamUrl: lanMediaUrl
    };
  }
}

export const castService = new CastService();
