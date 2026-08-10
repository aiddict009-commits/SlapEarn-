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

export function triggerRewardedAdScript() {
  try {
    const existing = document.querySelector('script[data-admpid="450610"]');
    if (existing) {
      existing.remove();
    }
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://js.mbidadm.com/static/scripts.js';
    script.setAttribute('data-admpid', '450610');
    document.head.appendChild(script);
  } catch (e) {
    console.error('Error triggering rewarded ad script:', e);
  }
}

export function RewardedAdScript() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://js.mbidadm.com/static/scripts.js';
    script.setAttribute('data-admpid', '450610');

    containerRef.current.appendChild(script);

    // Function to enforce responsive 16:9 sizing and override bottom-right floating styles
    const enforceStyles = () => {
      if (!containerRef.current) return;

      // Target all elements inside containerRef
      const children = containerRef.current.querySelectorAll('*');
      children.forEach((node) => {
        const el = node as HTMLElement;
        if (el.tagName === 'SCRIPT') return;

        el.style.setProperty('position', 'absolute', 'important');
        el.style.setProperty('top', '0', 'important');
        el.style.setProperty('left', '0', 'important');
        el.style.setProperty('right', '0', 'important');
        el.style.setProperty('bottom', '0', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('height', '100%', 'important');
        el.style.setProperty('min-width', '100%', 'important');
        el.style.setProperty('min-height', '100%', 'important');
        el.style.setProperty('max-width', '100%', 'important');
        el.style.setProperty('max-height', '100%', 'important');
        el.style.setProperty('margin', '0', 'important');
        el.style.setProperty('padding', '0', 'important');
        el.style.setProperty('float', 'none', 'important');
        el.style.setProperty('transform', 'none', 'important');
        el.style.setProperty('object-fit', 'contain', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
      });

      // Reparent any orphaned ad containers dynamically injected into body by mbidadm
      const bodyNodes = document.querySelectorAll('body > div, body > iframe');
      bodyNodes.forEach((node) => {
        const el = node as HTMLElement;
        const outerHtml = el.outerHTML || '';
        if (
          outerHtml.includes('mbidadm') ||
          outerHtml.includes('450610') ||
          el.getAttribute('data-admpid') === '450610'
        ) {
          if (containerRef.current && !containerRef.current.contains(el)) {
            containerRef.current.appendChild(el);
          }
        }
      });
    };

    enforceStyles();

    const observer = new MutationObserver(() => {
      enforceStyles();
    });

    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const bodyObserver = new MutationObserver(() => {
      enforceStyles();
    });
    bodyObserver.observe(document.body, { childList: true });

    const interval = setInterval(enforceStyles, 300);

    return () => {
      observer.disconnect();
      bodyObserver.disconnect();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="rewarded-ad-wrapper w-full max-w-full flex flex-col items-center justify-center my-2 text-center text-white overflow-hidden">
      <span className="text-[10px] font-black uppercase text-amber-400 mb-1.5 tracking-wider flex items-center justify-center gap-1">
        <span>🎬 Sponsored Rewarded Ad</span>
      </span>
      {/* Aspect-ratio 16:9 responsive ad player container */}
      <div className="rewarded-ad-player-box w-full max-w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-amber-400/30 relative flex items-center justify-center shadow-inner">
        <div
          ref={containerRef}
          className="rewarded-ad-container w-full h-full max-w-full relative flex items-center justify-center overflow-hidden"
        />
      </div>
    </div>
  );
}


