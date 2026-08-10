import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Monitor, Globe } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPWAInstallPrompt?: BeforeInstallPromptEvent;
  }
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(true);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showChromeGuide, setShowChromeGuide] = useState<boolean>(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Capture pre-saved prompt from early window listener if available
    if (window.deferredPWAInstallPrompt) {
      setDeferredPrompt(window.deferredPWAInstallPrompt);
    }

    // Listen for beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPWAInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      window.deferredPWAInstallPrompt = undefined;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const activePrompt = deferredPrompt || window.deferredPWAInstallPrompt;

    if (activePrompt) {
      try {
        await activePrompt.prompt();
        const { outcome } = await activePrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setShowPrompt(false);
        }
        setDeferredPrompt(null);
        window.deferredPWAInstallPrompt = undefined;
      } catch (err) {
        console.warn('[PWA] Native prompt trigger issue, showing install guide:', err);
        if (isIOS) {
          setShowIOSGuide(true);
        } else {
          setShowChromeGuide(true);
        }
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowChromeGuide(true);
    }
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-16 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 bg-[#0F172A] border-3 border-[#00D09E] rounded-2xl p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] animate-bounce-short">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00D09E]/20 border border-[#00D09E] flex items-center justify-center shrink-0 overflow-hidden relative">
              <img src="/icon-192.png" alt="SlapEarn" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-black text-white leading-tight">Install SlapEarn App</span>
                <Sparkles className="w-3 h-3 text-amber-400 stroke-[2.5]" />
              </div>
              <p className="text-[10px] font-bold text-slate-300 mt-0.5">
                Faster slaps, full screen & instant cashouts!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPrompt(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full bg-[#00D09E] hover:bg-[#00B88B] text-slate-950 font-black text-xs py-2 px-3 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_#0F172A] flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[3]" />
            <span>{isIOS ? 'Add to Home Screen' : 'Install SlapEarn App'}</span>
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101426] border-4 border-amber-400 rounded-2xl max-w-sm w-full p-5 text-white shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-400" />
                <h4 className="font-black text-base">Install on iOS Safari</h4>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs space-y-3 font-bold text-slate-200 my-4 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Tap the <strong className="text-amber-300">Share button</strong> (square with arrow up) at the bottom of Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Scroll down and select <strong className="text-amber-300 font-black">"Add to Home Screen"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Tap <strong className="text-amber-300">Add</strong> in top right to launch SlapEarn as a full app!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* Android / Chrome / Desktop Instructions Modal */}
      {showChromeGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#101426] border-4 border-[#00D09E] rounded-2xl max-w-sm w-full p-5 text-white shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00D09E]" />
                <h4 className="font-black text-base">Install App Instructions</h4>
              </div>
              <button
                onClick={() => setShowChromeGuide(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="text-xs space-y-3 font-bold text-slate-200 my-4 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <li className="flex items-start gap-2">
                <span className="bg-[#00D09E] text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                <span>Open <strong className="text-[#00D09E]">Chrome / Edge / Safari</strong> browser menu (top right <strong>⋮</strong> or share icon).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#00D09E] text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Select <strong className="text-[#00D09E] font-black">"Install App"</strong> or <strong className="text-[#00D09E] font-black">"Add to Home screen"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#00D09E] text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Confirm install to play SlapEarn standalone directly from your app drawer!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowChromeGuide(false)}
              className="w-full bg-[#00D09E] hover:bg-[#00B88B] text-slate-950 font-black text-xs py-2.5 rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_#000] cursor-pointer"
            >
              Got It!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
