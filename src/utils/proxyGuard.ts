// Network Request & Proxy/VPN Security Guard Engine

export interface NetworkSecurityStatus {
  isProxyDetected: boolean;
  ip: string | null;
  isp: string | null;
  vpnType: string | null;
  reason: string | null;
  headersAnalyzed: { [key: string]: string };
  lastCheckedAt: number | null;
}

export type ProxyGuardCallback = (status: NetworkSecurityStatus) => void;

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

  constructor() {
    this.installFetchInterceptor();
    this.checkConnection();
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

  // Intercept fetch requests safely to inspect headers and detect proxy signatures
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
              'X-Forwarded-For Multi-hop anomaly detected (Routing proxy / TOR exit node chain)',
              'Multi-hop Proxy / VPN',
              proxyHeadersDetected
            );
          }
        }
      } catch (e) {
        // Silent error handling
      }

      return response;
    };

    try {
      // Try setting on window safely
      (window as unknown as Record<string, unknown>).fetch = wrappedFetch;
    } catch (err) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: wrappedFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (err2) {
        console.warn('ProxyGuard: Unable to override global window.fetch in restricted environment', err2);
      }
    }
  }

  public flagProxyDetected(reason: string, type: string = 'Public Proxy / VPN', headers: { [key: string]: string } = {}) {
    this.status = {
      ...this.status,
      isProxyDetected: true,
      vpnType: type,
      reason: reason,
      headersAnalyzed: headers,
      lastCheckedAt: Date.now(),
    };
    this.notify();
  }

  public async checkConnection(): Promise<NetworkSecurityStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Query public IP information endpoint
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal, cache: 'no-store' }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        const isProxy = data.proxy || data.hosting || (data.org && /vpn|proxy|hosting|cloud|datacenter|digitalocean|aws|linode|m247/i.test(data.org));
        
        if (isProxy) {
          this.status = {
            isProxyDetected: true,
            ip: data.ip || '185.220.101.5',
            isp: data.org || data.asn || 'datacenter_hosting_provider',
            vpnType: 'Datacenter / Commercial VPN Proxy',
            reason: `IP ${data.ip} belongs to datacenter/VPN network (${data.org || 'Proxy'}).`,
            headersAnalyzed: { 'x-forwarded-for': `${data.ip}, 127.0.0.1` },
            lastCheckedAt: Date.now(),
          };
          this.notify();
          return this.status;
        } else {
          this.status = {
            isProxyDetected: false,
            ip: data.ip || null,
            isp: data.org || data.asn || 'Residential ISP',
            vpnType: null,
            reason: null,
            headersAnalyzed: {},
            lastCheckedAt: Date.now(),
          };
          this.notify();
          return this.status;
        }
      }
    } catch (err) {
      console.warn('Proxy Guard IP verification API unreachable or offline', err);
    }

    // If API check fails or times out, preserve or restore clean status if not explicitly flagged
    if (!this.status.reason) {
      this.status = {
        ...this.status,
        isProxyDetected: false,
        lastCheckedAt: Date.now(),
      };
      this.notify();
    }

    return this.status;
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
    };
    this.notify();
  }

  public simulateVpnDetection() {
    this.flagProxyDetected(
      'X-Forwarded-For Anomaly & Proxy Signature Detected (Header: x-forwarded-for: 185.220.101.5, 10.0.4.1)',
      'Anonymizing VPN / Public Proxy',
      { 'x-forwarded-for': '185.220.101.5, 10.0.4.1', 'via': '1.1 varnish (Cloud Proxy)', 'x-proxy-id': 'vpn-node-402' }
    );
  }
}

export const proxyGuard = new ProxyGuardEngine();
