// Comprehensive Multi-Layered Network Request & Proxy/VPN Security Guard Engine

export interface NetworkSecurityStatus {
  isProxyDetected: boolean;
  ip: string | null;
  isp: string | null;
  vpnType: string | null;
  reason: string | null;
  headersAnalyzed: { [key: string]: string };
  lastCheckedAt: number | null;
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
  detectionMethod?: string;
}

export type ProxyGuardCallback = (status: NetworkSecurityStatus) => void;

// High-confidence Datacenter, Cloud, VPN & Proxy Provider Keywords
const DATACENTER_VPN_KEYWORDS = [
  'vpn',
  'proxy',
  'hosting',
  'datacenter',
  'data center',
  'vps',
  'server',
  'cloud',
  'colocation',
  'transit',
  'tor',
  'exit-node',
  'anonymizer',
  'tunnel',
  'relay',
  'gateway',
  // Popular Commercial VPN Providers
  'nordvpn',
  'expressvpn',
  'surfshark',
  'mullvad',
  'proton',
  'cyberghost',
  'private internet access',
  'pia',
  'windscribe',
  'hide.me',
  'purevpn',
  'vyprvpn',
  'hotspot shield',
  'ipvanish',
  'tunnelbear',
  'ivpn',
  'kaspersky vpn',
  'opera vpn',
  // Major Datacenter & Cloud Hosting Networks
  'm247',
  'datacamp',
  'digitalocean',
  'aws',
  'amazon.com',
  'amazon technologies',
  'google cloud',
  'gcp',
  'linode',
  'akamai',
  'ovh',
  'hetzner',
  'vultr',
  'choopa',
  'leaseweb',
  'fastly',
  'cloudflare',
  'hostinger',
  'contabo',
  'cogent',
  'hurricane electric',
  'tzulo',
  'scaleway',
  'equinix',
  'alicloud',
  'alibaba',
  'tencent',
  'oracle cloud',
  'kamatera',
  'interserver',
  'hostgator',
  'bluehost',
  'pureserver',
  'quadranet',
  'clouvider',
  'softlayer',
  'zenlayer',
  'tzulo',
  'ionos',
  'godaddy',
];

class ProxyGuardEngine {
  private status: NetworkSecurityStatus = {
    isProxyDetected: false,
    ip: null,
    isp: null,
    vpnType: null,
    reason: null,
    headersAnalyzed: {},
    lastCheckedAt: null,
  };

  private listeners: Set<ProxyGuardCallback> = new Set();
  private originalFetch: typeof window.fetch = window.fetch ? window.fetch.bind(window) : fetch.bind(window);
  private autoScanIntervalId: any = null;
  private isScanning: boolean = false;

  constructor() {
    this.installFetchInterceptor();
    this.initAutoScan();
  }

  private initAutoScan() {
    // Initial scan on app initialization
    setTimeout(() => {
      this.checkConnection();
    }, 800);

    // Periodic check every 30 seconds
    if (typeof window !== 'undefined') {
      this.autoScanIntervalId = setInterval(() => {
        this.checkConnection();
      }, 30000);

      // Re-scan when browser window regains focus or comes back online
      window.addEventListener('focus', () => this.checkConnection());
      window.addEventListener('online', () => this.checkConnection());
    }
  }

  public subscribe(callback: ProxyGuardCallback) {
    this.listeners.add(callback);
    callback(this.status);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.status));
  }

  public getStatus(): NetworkSecurityStatus {
    return { ...this.status };
  }

  // Intercept fetch requests safely to inspect response headers for proxy signatures
  private installFetchInterceptor() {
    const self = this;
    const origFetch = this.originalFetch;

    const wrappedFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      const response = await origFetch(input, init);

      try {
        if (response && response.headers) {
          const proxyHeadersDetected: { [key: string]: string } = {};
          const suspiciousHeaders = [
            'x-forwarded-for',
            'via',
            'x-proxy-id',
            'x-real-ip',
            'cf-connecting-ip',
            'forwarded',
            'x-vpn-active',
            'x-bluecoat-via',
            'x-authenticated-user',
          ];

          suspiciousHeaders.forEach((h) => {
            const val = response.headers.get(h);
            if (val) {
              proxyHeadersDetected[h] = val;
            }
          });

          const xff = response.headers.get('x-forwarded-for');
          if (xff && xff.includes(',')) {
            self.flagProxyDetected(
              'X-Forwarded-For Multi-hop routing anomaly detected (Proxy chain / TOR exit node)',
              'Multi-hop Proxy / VPN',
              proxyHeadersDetected
            );
          }
        }
      } catch (e) {
        // Silent
      }

      return response;
    };

    try {
      (window as unknown as Record<string, unknown>).fetch = wrappedFetch;
    } catch {
      try {
        Object.defineProperty(window, 'fetch', {
          value: wrappedFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (err) {
        console.warn('ProxyGuard: Unable to override global window.fetch', err);
      }
    }
  }

  public flagProxyDetected(
    reason: string,
    type: string = 'Public Proxy / VPN',
    headers: { [key: string]: string } = {},
    ip: string | null = null,
    isp: string | null = null
  ) {
    this.status = {
      ...this.status,
      isProxyDetected: true,
      ip: ip || this.status.ip || '185.220.101.5',
      isp: isp || this.status.isp || 'Datacenter / Commercial Network',
      vpnType: type,
      reason: reason,
      headersAnalyzed: headers,
      lastCheckedAt: Date.now(),
    };
    this.notify();
  }

  // Multi-Provider & Heuristic Connection Inspector
  public async checkConnection(): Promise<NetworkSecurityStatus> {
    if (this.isScanning) return this.status;
    this.isScanning = true;

    try {
      // 1. WebRTC Local Network Leak Inspection
      const webrtcLeakedIP = await this.inspectWebRTC();

      // 2. Query Primary Endpoint (ipwho.is - fast, CORS-friendly, rich security flags)
      const ipwhoRes = await this.queryIpWhoIs();

      if (ipwhoRes) {
        const { isProxy, reason, vpnType, data } = ipwhoRes;
        if (isProxy) {
          this.isScanning = false;
          return this.applyDetectionResult(true, data.ip, data.connection?.org || data.connection?.isp, vpnType, reason, {
            country: data.country,
            city: data.city,
            timezone: data.timezone?.id,
          });
        }

        // Clean status confirmed by primary endpoint
        this.isScanning = false;
        return this.applyDetectionResult(false, data.ip, data.connection?.org || data.connection?.isp, null, null, {
          country: data.country,
          city: data.city,
          timezone: data.timezone?.id,
        });
      }

      // 3. Fallback Endpoint 2: ipapi.co
      const ipapiRes = await this.queryIpApiCo();
      if (ipapiRes) {
        const { isProxy, reason, vpnType, data } = ipapiRes;
        if (isProxy) {
          this.isScanning = false;
          return this.applyDetectionResult(true, data.ip, data.org || data.asn, vpnType, reason, {
            country: data.country_name,
            city: data.city,
            timezone: data.timezone,
          });
        }

        this.isScanning = false;
        return this.applyDetectionResult(false, data.ip, data.org || data.asn, null, null, {
          country: data.country_name,
          city: data.city,
          timezone: data.timezone,
        });
      }

      // 4. Fallback Endpoint 3: ipwhois.app
      const ipwhoisAppRes = await this.queryIpWhoisApp();
      if (ipwhoisAppRes) {
        const { isProxy, reason, vpnType, data } = ipwhoisAppRes;
        if (isProxy) {
          this.isScanning = false;
          return this.applyDetectionResult(true, data.ip, data.org || data.isp, vpnType, reason, {
            country: data.country,
            city: data.city,
            timezone: data.timezone,
          });
        }

        this.isScanning = false;
        return this.applyDetectionResult(false, data.ip, data.org || data.isp, null, null, {
          country: data.country,
          city: data.city,
          timezone: data.timezone,
        });
      }

    } catch (err) {
      console.warn('ProxyGuard scanning encountered an exception:', err);
    } finally {
      this.isScanning = false;
    }

    // If scanning failed or offline, preserve existing status or return clean
    return this.status;
  }

  // Apply detection status safely
  private applyDetectionResult(
    isProxy: boolean,
    ip: string | null,
    isp: string | null,
    vpnType: string | null,
    reason: string | null,
    location?: { country?: string; city?: string; timezone?: string }
  ): NetworkSecurityStatus {
    this.status = {
      isProxyDetected: isProxy,
      ip: ip || this.status.ip,
      isp: isp || this.status.isp,
      vpnType: isProxy ? (vpnType || 'Commercial VPN / Datacenter Proxy') : null,
      reason: isProxy ? (reason || 'IP belongs to anonymizing proxy or VPN service.') : null,
      headersAnalyzed: this.status.headersAnalyzed,
      lastCheckedAt: Date.now(),
      location: location || this.status.location,
    };
    this.notify();
    return this.status;
  }

  // Check if string contains any Datacenter / VPN keywords
  private containsVpnKeyword(str: string | undefined | null): boolean {
    if (!str) return false;
    const lower = str.toLowerCase();
    return DATACENTER_VPN_KEYWORDS.some((kw) => lower.includes(kw));
  }

  // 1. Provider: ipwho.is
  private async queryIpWhoIs(): Promise<{ isProxy: boolean; reason: string | null; vpnType: string | null; data: any } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          const sec = data.security || {};
          const conn = data.connection || {};
          const orgStr = `${conn.org || ''} ${conn.isp || ''} ${conn.asn || ''} ${conn.domain || ''}`;

          const isFlaggedBySec = sec.proxy || sec.vpn || sec.tor || sec.hosting;
          const isFlaggedByKeyword = this.containsVpnKeyword(orgStr);

          if (isFlaggedBySec || isFlaggedByKeyword) {
            let type = 'Commercial VPN / Proxy Network';
            if (sec.tor) type = 'TOR Exit Node';
            else if (sec.vpn) type = 'Anonymizing VPN';
            else if (sec.hosting) type = 'Datacenter / Cloud Server';

            const reason = `IP ${data.ip} (${conn.org || conn.isp || 'Hosting'}) is identified as a ${type}.`;
            return { isProxy: true, reason, vpnType: type, data };
          }

          return { isProxy: false, reason: null, vpnType: null, data };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // 2. Provider: ipapi.co
  private async queryIpApiCo(): Promise<{ isProxy: boolean; reason: string | null; vpnType: string | null; data: any } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.ip) {
          const orgStr = `${data.org || ''} ${data.asn || ''} ${data.network || ''}`;
          const isProxy = data.proxy || data.hosting || this.containsVpnKeyword(orgStr);

          if (isProxy) {
            const type = 'Datacenter / Commercial VPN';
            const reason = `IP ${data.ip} belongs to datacenter/VPN network (${data.org || 'Proxy'}).`;
            return { isProxy: true, reason, vpnType: type, data };
          }

          return { isProxy: false, reason: null, vpnType: null, data };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // 3. Provider: ipwhois.app
  private async queryIpWhoisApp(): Promise<{ isProxy: boolean; reason: string | null; vpnType: string | null; data: any } | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipwhois.app/json/', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.ip) {
          const orgStr = `${data.org || ''} ${data.isp || ''} ${data.asn || ''}`;
          const isProxy = data.proxy || data.vpn || data.tor || data.hosting || this.containsVpnKeyword(orgStr);

          if (isProxy) {
            const type = 'Public VPN / Datacenter Proxy';
            const reason = `IP ${data.ip} (${data.org || data.isp}) flagged as proxy/VPN.`;
            return { isProxy: true, reason, vpnType: type, data };
          }

          return { isProxy: false, reason: null, vpnType: null, data };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  }

  // WebRTC Leak Inspector
  private async inspectWebRTC(): Promise<string | null> {
    if (typeof window === 'undefined' || !(window.RTCPeerConnection || (window as any).webkitRTCPeerConnection)) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const RTCPeer = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection;
        const pc = new RTCPeer({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        let foundIP: string | null = null;
        const timeout = setTimeout(() => {
          try { pc.close(); } catch {}
          resolve(foundIP);
        }, 1200);

        pc.createDataChannel('');
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .catch(() => {});

        pc.onicecandidate = (event) => {
          if (!event || !event.candidate) return;
          const candidate = event.candidate.candidate;
          const ipRegex = /([0-[#0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/;
          const match = candidate.match(ipRegex);
          if (match && match[1]) {
            const ip = match[1];
            // Look for non-local public IP candidates
            if (!ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.16.')) {
              foundIP = ip;
              clearTimeout(timeout);
              try { pc.close(); } catch {}
              resolve(foundIP);
            }
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  public clearSecurityAlert() {
    this.status = {
      isProxyDetected: false,
      ip: this.status.ip,
      isp: this.status.isp,
      vpnType: null,
      reason: null,
      headersAnalyzed: {},
      lastCheckedAt: Date.now(),
      location: this.status.location,
    };
    this.notify();
  }

  public simulateVpnDetection() {
    this.flagProxyDetected(
      'VPN Guard Security Test: Anonymizing VPN / Proxy Node Detected (IP: 185.220.101.5, Node: M247 Datacenter)',
      'Simulated Commercial VPN / Proxy',
      { 'x-forwarded-for': '185.220.101.5, 10.0.4.1', 'via': '1.1 varnish (Cloud Proxy)', 'x-proxy-id': 'vpn-node-402' },
      '185.220.101.5',
      'M247 Ltd Datacenter VPN'
    );
  }
}

export const proxyGuard = new ProxyGuardEngine();
