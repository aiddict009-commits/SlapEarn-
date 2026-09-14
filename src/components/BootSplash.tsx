import React from 'react';
import { RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';

interface BootSplashProps {
  /** Small status line under the logo */
  label?: string;
  /** Fatal error — renders a retry action instead of the spinner */
  error?: string | null;
  /** Extra hint shown when something needs the operator's attention */
  hint?: string | null;
  onRetry?: () => void;
}

/**
 * Shown while the formless session bootstrap runs (Telegram verification or
 * instant guest sign-in). Replaces the old sign-up / login screens.
 */
export const BootSplash: React.FC<BootSplashProps> = ({ label, error, hint, onRetry }) => {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 select-none"
      id="boot-splash"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-[#FFD043] border-4 border-slate-900 rounded-[28px] flex items-center justify-center shadow-[4px_5px_0px_0px_rgba(15,23,42,1)] rotate-[-4deg]">
          <span className="text-5xl leading-none">👋</span>
        </div>

        <div
          className="flex items-center font-sans font-black text-[34px] italic tracking-[-0.06em] rotate-[-3deg] mt-1"
          style={{
            textShadow:
              '2.5px 2.5px 0px #0F172A, -1.5px -1.5px 0px #0F172A, 1.5px -1.5px 0px #0F172A, -1.5px 1.5px 0px #0F172A',
          }}
        >
          <span className="text-white">Slap</span>
          <span className="text-[#FF2B6D] -ml-0.5">Earn</span>
        </div>
      </div>

      {error ? (
        <div className="w-full max-w-xs flex flex-col items-center gap-3">
          <div className="w-full bg-rose-50 border-2 border-rose-500 rounded-2xl p-3 text-rose-900">
            <p className="font-black text-[12px] uppercase tracking-wider">Session unavailable</p>
            <p className="text-[12px] font-semibold mt-1 leading-snug">{error}</p>
          </div>
          {hint && <p className="text-[11px] font-bold text-slate-500 leading-snug">{hint}</p>}
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 bg-[#FFD043] border-2 border-slate-900 px-4 py-2 rounded-full font-black text-sm text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-transform"
              id="boot-retry-btn"
            >
              <RefreshCw className="w-4 h-4 stroke-[2.5px]" />
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B77] animate-bounce" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFD043] animate-bounce [animation-delay:120ms]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D09E] animate-bounce [animation-delay:240ms]" />
          </div>
          <p className="font-black text-slate-700 text-[13px]" id="boot-splash-label">
            {label || 'Opening your session…'}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FF3B77]" />
            No sign-up, no passwords — you play instantly.
          </p>
          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" />
            Secured by Telegram identity & Firebase
          </p>
        </div>
      )}
    </div>
  );
};

export default BootSplash;
