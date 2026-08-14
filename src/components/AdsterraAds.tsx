import { useEffect, useRef } from 'react';

export function AdsterraBanner() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    const htmlContent = `
      <!質html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              background: transparent;
            }
          </style>
        </head>
        <body>
          <script type="text/javascript">
            atOptions = {
              'key' : 'a5d4d0099f7367c51af7c6fdad81aad1',
              'format' : 'iframe',
              'height' : 250,
              'width' : 300,
              'params' : {}
            };
          </script>
          <script type="text/javascript" src="https://racketgutter.com/a5d4d0099f7367c51af7c6fdad81aad1/invoke.js"></script>
        </body>
      </html>
    `.replace('!質', '!');

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center my-3 p-3 bg-white border-4 border-slate-900 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden w-full text-center">
      <span className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider flex items-center justify-center gap-1">
        <span>📢 Sponsor Banner Ad</span>
      </span>
      <div className="w-[300px] h-[250px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Adsterra Banner"
          width="300"
          height="250"
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}

export function AdsterraNative() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 0;
              background: transparent;
              font-family: sans-serif;
            }
          </style>
        </head>
        <body>
          <script async="async" data-cfasync="false" src="https://racketgutter.com/0f4fde40076447903993040b6a83fa88/invoke.js"></script>
          <div id="container-0f4fde40076447903993040b6a83fa88"></div>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center my-3 p-3 bg-white border-4 border-slate-900 rounded-[24px] shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden w-full">
      <span className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-wider self-start flex items-center gap-1">
        <span>⭐ Sponsored Deals</span>
      </span>
      <div className="w-full min-h-[150px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-2">
        <iframe
          ref={iframeRef}
          title="Adsterra Native Ad"
          width="100%"
          height="150"
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}

export interface RewardedAdCallbacks {
  onAdCompleted?: () => void;
  onUserEarnedReward?: () => void;
  onAdFailedToShow?: (reason?: string) => void;
  onAdSkipped?: () => void;
}

let isAdLoadedGlobal = true;

export function checkRewardedAdLoaded(): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  return isAdLoadedGlobal;
}

export function setRewardedAdLoadedStatus(loaded: boolean) {
  isAdLoadedGlobal = loaded;
}

export function triggerRewardedAdScript() {
  try {
    const existing = document.querySelectorAll('script[data-admpid="450610"]');
    existing.forEach((el) => el.remove());
  } catch (e) {
    console.error('Error cleaning up rewarded ad script:', e);
  }
}

interface RewardedAdScriptProps {
  onAdCompleted?: () => void;
  onUserEarnedReward?: () => void;
  onAdFailedToShow?: (reason?: string) => void;
  onAdSkipped?: () => void;
}

export function RewardedAdScript({ onAdCompleted, onUserEarnedReward, onAdFailedToShow, onAdSkipped }: RewardedAdScriptProps = {}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Bind global window callbacks for third-party script & iframe postMessage triggers
    if (typeof window !== 'undefined') {
      (window as any).onAdCompleted = () => {
        if (onAdCompleted) onAdCompleted();
        if (onUserEarnedReward) onUserEarnedReward();
      };
      (window as any).onUserEarnedReward = () => {
        if (onUserEarnedReward) onUserEarnedReward();
        if (onAdCompleted) onAdCompleted();
      };
      (window as any).onAdFailedToShow = (reason?: string) => {
        if (onAdFailedToShow) onAdFailedToShow(reason);
      };
      (window as any).onAdSkipped = () => {
        if (onAdSkipped) onAdSkipped();
      };
    }

    if (!iframeRef.current) return;

    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #020617;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            * {
              box-sizing: border-box !important;
            }
            body > *, iframe, video, div, ins, object, embed {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: 100% !important;
              min-width: 100% !important;
              min-height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              object-fit: contain !important;
              border: none !important;
            }
          </style>
        </head>
        <body>
          <script async src="https://js.mbidadm.com/static/scripts.js" data-admpid="450610"></script>
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Periodically enforce 100% video/player dimensions inside the iframe
    const interval = setInterval(() => {
      try {
        const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
        if (!doc) return;
        const nodes = doc.querySelectorAll('body *');
        nodes.forEach((node) => {
          const el = node as HTMLElement;
          if (el.tagName === 'SCRIPT') return;
          el.style.setProperty('width', '100%', 'important');
          el.style.setProperty('height', '100%', 'important');
          el.style.setProperty('max-width', '100%', 'important');
          el.style.setProperty('max-height', '100%', 'important');
          el.style.setProperty('top', '0', 'important');
          el.style.setProperty('left', '0', 'important');
          el.style.setProperty('position', 'absolute', 'important');
        });
      } catch {
        // Cross-origin fallback safety
      }
    }, 400);

    return () => {
      clearInterval(interval);
    };
  }, [onAdCompleted, onUserEarnedReward, onAdFailedToShow, onAdSkipped]);

  return (
    <div className="rewarded-ad-wrapper w-full max-w-full flex flex-col items-center justify-center my-2 text-center text-white overflow-hidden">
      <span className="text-[10px] font-black uppercase text-amber-400 mb-1.5 tracking-wider flex items-center justify-center gap-1">
        <span>🎬 Sponsored Rewarded Ad</span>
      </span>
      {/* Aspect-ratio 16:9 responsive ad player container */}
      <div className="rewarded-ad-player-box w-full max-w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-amber-400/30 relative flex items-center justify-center shadow-inner">
        <iframe
          ref={iframeRef}
          title="Rewarded Ad Player"
          className="w-full h-full border-none overflow-hidden"
          style={{ width: '100%', height: '100%', border: 'none' }}
          scrolling="no"
        />
      </div>
    </div>
  );
}


