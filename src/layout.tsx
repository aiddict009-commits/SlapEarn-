import React, { useEffect } from 'react';
import { usePWAInstall } from './hooks/usePWAinstall';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();

  useEffect(() => {
    // Ensure meta theme-color and manifest link exist in document head
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/manifest.json';
      document.head.appendChild(link);
    }

    let metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      metaTheme.content = '#0F172A';
      document.head.appendChild(metaTheme);
    } else {
      metaTheme.content = '#0F172A';
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF9EB] text-slate-900 flex flex-col antialiased selection:bg-[#00D09E] selection:text-slate-950">
      {children}
      {!isInstalled && isInstallable && <PWAInstallPrompt />}
    </div>
  );
};

export default Layout;
