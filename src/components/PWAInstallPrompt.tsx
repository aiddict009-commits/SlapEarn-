import React, { useState } from 'react';
import { Download, X, Smartphone, Sparkles, Monitor, Globe } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAinstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showChromeGuide, setShowChromeGuide] = useState<boolean>(false);

  const handleInstallClick = async () => {
    const success = await install();
    if (!success) {
      if (isIOS) {
        setShowIOSGuide(true);
      } else {
        setShowChromeGuide(true);
      }
    }
  };

  if (isInstalled || dismissed) return null;

  return (
    <>
      {/* Floating PWA Install Banner */}
      <div className="fixed bottom-16 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm z-50 bg-[#0F172A] border-3 border-[#00D09E] rounded-2xl p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] animate-bounce-short">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
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
            onClick={() => setDismissed(true)}
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
            <span>Direct Install SlapEarn App</span>
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
                <h4 className="font-black text-base">Direct Install on iOS</h4>
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
                <span>Tap the <strong className="text-amber-300">Share icon</strong> in Safari.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Tap <strong className="text-amber-300 font-black">"Add to Home Screen"</strong> / <strong className="text-amber-300 font-black">"Install App"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-amber-400 text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Tap <strong className="text-amber-300">Add</strong> to launch SlapEarn as a standalone application!</span>
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
                <h4 className="font-black text-base">Direct Install App</h4>
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
                <span>In <strong className="text-[#00D09E]">Chrome / Edge</strong>, tap the browser menu (top right <strong>⋮</strong> or install icon in URL bar).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#00D09E] text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                <span>Select <strong className="text-[#00D09E] font-black">"Install SlapEarn App"</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-[#00D09E] text-slate-950 font-black w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                <span>Click <strong className="text-[#00D09E]">Install</strong> to install SlapEarn directly to your device!</span>
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
