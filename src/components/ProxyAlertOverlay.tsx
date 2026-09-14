import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { proxyGuard, NetworkSecurityStatus } from '../utils/proxyGuard';

interface ProxyAlertOverlayProps {
  status: NetworkSecurityStatus;
}

export const ProxyAlertOverlay: React.FC<ProxyAlertOverlayProps> = ({ status }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!status.isProxyDetected || isDismissed) return null;

  const handleRecheck = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    await proxyGuard.checkConnection();
    setIsChecking(false);
  };

  return (
    <AnimatePresence>
      <motion.aside
        aria-label="Security warning"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-2 left-2 right-2 sm:left-auto sm:right-4 sm:max-w-md z-[9999] bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 p-3 rounded-2xl border-2 border-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-sans select-none flex flex-col gap-2"
        id="proxy-soft-alert-banner"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded tracking-wider">
                  VPN / Proxy Active
                </span>
              </div>
              <p className="text-xs font-black text-slate-950 leading-tight mt-0.5">
                Offerwalls & high-value surveys are paused while VPN is connected.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 rounded-lg bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 shrink-0 cursor-pointer"
            title="Dismiss notice"
            id="dismiss-proxy-banner-btn"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-950/20 text-[11px] font-extrabold">
          <span className="text-slate-900 truncate max-w-[200px]">
            {status.isp || status.vpnType || 'Commercial Network'}
          </span>

          <button
            onClick={handleRecheck}
            disabled={isChecking}
            className="flex items-center gap-1 bg-slate-950 text-white hover:bg-slate-800 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0"
            id="recheck-proxy-btn"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Re-check'}</span>
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

export default ProxyAlertOverlay;

