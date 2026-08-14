import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, RefreshCw, AlertTriangle, Globe } from 'lucide-react';
import { proxyGuard, NetworkSecurityStatus } from '../utils/proxyGuard';

interface ProxyAlertOverlayProps {
  status: NetworkSecurityStatus;
}

export const ProxyAlertOverlay: React.FC<ProxyAlertOverlayProps> = ({ status }) => {
  const [isChecking, setIsChecking] = useState(false);

  if (!status.isProxyDetected) return null;

  const handleRecheck = async () => {
    setIsChecking(true);
    await proxyGuard.checkConnection();
    setIsChecking(false);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-[#7F1D1D] text-white flex items-center justify-center p-4 overflow-y-auto font-sans select-none animate-fadeIn">
      {/* Background Warning Mesh & Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#EF4444_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative max-w-md w-full bg-red-950 border-4 border-red-500 rounded-3xl p-6 shadow-[0_0_80px_rgba(239,68,68,0.8)] text-center flex flex-col items-center gap-4 z-10"
      >
        {/* Pulsing Red Icon Header */}
        <div className="relative">
          <div className="w-20 h-20 bg-red-600/40 rounded-full flex items-center justify-center animate-ping absolute inset-0" />
          <div className="w-20 h-20 bg-red-600 border-3 border-white rounded-full flex items-center justify-center relative z-10 shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-white stroke-[2.5]" />
          </div>
        </div>

        {/* Warning Title */}
        <div>
          <span className="inline-block bg-red-500/30 border border-red-400 text-red-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            🚨 SECURITY GUARD — VPN / PROXY BLOCKED
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">
            Abnormal Network Detected!
          </h2>
          <p className="text-red-200 text-xs font-bold mt-1.5 leading-relaxed">
            SlapEarn has blocked access because an active <span className="text-amber-300 font-extrabold">VPN, Proxy, or Anonymizing Network</span> was detected on your device.
          </p>
        </div>

        {/* Technical Details Box */}
        <div className="w-full bg-red-900/80 border-2 border-red-500/50 rounded-2xl p-3.5 text-left flex flex-col gap-2 text-xs shadow-inner">
          <div className="flex justify-between items-center pb-2 border-b border-red-800">
            <span className="text-red-300 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Detection Status:
            </span>
            <span className="font-black text-rose-200 text-[10px] uppercase bg-red-950 px-2 py-0.5 rounded border border-red-700">
              {status.vpnType || 'Proxy / VPN Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-red-300/80 text-[10px] block font-semibold">Detected IP:</span>
              <span className="font-mono font-bold text-white">{status.ip || 'Flagged IP'}</span>
            </div>
            <div>
              <span className="text-red-300/80 text-[10px] block font-semibold">Provider / Network:</span>
              <span className="font-mono font-bold text-white truncate block">{status.isp || 'Datacenter Proxy'}</span>
            </div>
          </div>

          {status.reason && (
            <div className="mt-1 pt-2 border-t border-red-800/80 text-[10.5px] text-red-100 leading-snug">
              <strong className="text-white">Reason:</strong> {status.reason}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-[11.5px] text-red-200 font-medium leading-relaxed bg-red-900/40 p-3 rounded-2xl border border-red-800/80 text-left w-full">
          💡 <strong className="text-white">How to restore full access:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1 text-[11px]">
            <li>Disconnect your VPN or Proxy application.</li>
            <li>Turn off any Data Saver or Warp accelerator.</li>
            <li>Click <strong>Re-check Connection</strong> below.</li>
          </ol>
        </div>

        {/* Re-check Connection Button */}
        <button
          onClick={handleRecheck}
          disabled={isChecking}
          className="w-full py-3.5 rounded-2xl border-3 border-slate-950 bg-[#FFD043] hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5px] ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Scanning Network Connection...' : 'Re-check Network Connection 🔄'}</span>
        </button>

        {/* Dev Override For Testing */}
        <button
          onClick={() => proxyGuard.clearSecurityAlert()}
          className="text-[10px] text-red-400/80 hover:text-red-200 font-bold uppercase tracking-wider underline transition-colors"
        >
          Dev Override (Clear Proxy Alert For Testing)
        </button>
      </motion.div>
    </div>
  );
};

export default ProxyAlertOverlay;
