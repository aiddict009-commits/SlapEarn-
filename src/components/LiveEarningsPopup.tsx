import React, { useEffect, useState, useRef } from 'react';
import { subscribeLiveEarningsFromFirestore, LiveEarningEvent } from '../lib/firebase';
import { Sparkles } from 'lucide-react';

export function maskUsername(rawName: string): string {
  if (!rawName) return '@sl**r';
  let name = rawName.trim();
  if (name.includes('@') && !name.startsWith('@')) {
    name = name.split('@')[0];
  }
  if (name.startsWith('@')) {
    name = name.substring(1);
  }
  if (!name) return '@sl**r';

  if (name.length <= 2) {
    return `@${name[0]}*${name[name.length - 1] || ''}`;
  }
  if (name.length === 3) {
    return `@${name[0]}*${name[2]}`;
  }
  if (name.length === 4) {
    return `@${name.substring(0, 2)}*${name[3]}`;
  }
  // length >= 5
  const start = name.substring(0, 2);
  const end = name.substring(name.length - 1);
  return `@${start}**${end}`;
}

export default function LiveEarningsPopup() {
  const [activeEarning, setActiveEarning] = useState<LiveEarningEvent | null>(null);
  const seenTxIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<LiveEarningEvent[]>([]);

  useEffect(() => {
    // Process queue when activeEarning clears
    if (!activeEarning && queueRef.current.length > 0) {
      const next = queueRef.current.shift()!;
      setActiveEarning(next);
    }
  }, [activeEarning]);

  useEffect(() => {
    // Listen in real-time to qualifying Firestore reward events (>= 500 SP)
    const unsubscribe = subscribeLiveEarningsFromFirestore((earning) => {
      // Filter out duplicate transaction IDs during the current session
      if (!earning.id || seenTxIdsRef.current.has(earning.id)) {
        return;
      }
      seenTxIdsRef.current.add(earning.id);

      // Verify amount threshold (500 SP or more)
      if (earning.amount < 500) {
        return;
      }

      // Add to queue and trigger popup if idle
      queueRef.current.push(earning);

      setActiveEarning((prev) => {
        if (!prev && queueRef.current.length > 0) {
          return queueRef.current.shift() || null;
        }
        return prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Timer to remove popup after ~5 seconds
  useEffect(() => {
    if (!activeEarning) return;

    const timer = setTimeout(() => {
      setActiveEarning(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeEarning]);

  if (!activeEarning) return null;

  const maskedUser = maskUsername(activeEarning.username);
  const formattedAmount = activeEarning.amount.toLocaleString();
  const messageText = `${maskedUser} earned ${formattedAmount} SP 🎉`;
  const characters = messageText.split('');

  return (
    <div
      key={activeEarning.id}
      className="fixed bottom-20 left-4 z-50 pointer-events-auto max-w-[320px] w-auto transition-all select-none"
      id={`live-earning-popup-${activeEarning.id}`}
    >
      <div className="animate-fall-out bg-slate-900/95 border-3 border-slate-950 text-white rounded-2xl p-3 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center gap-3 backdrop-blur-md relative overflow-hidden">
        {/* Accent Bar */}
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-b from-[#FFD043] to-[#FF3B77]" />

        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-amber-400 border-2 border-slate-900 flex items-center justify-center shrink-0 text-slate-950 font-black shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] ml-1">
          <Sparkles className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>

        {/* Text Content with Sequential Letter Drop */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <span>Live Reward</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-xs font-black text-slate-100 flex flex-wrap leading-snug mt-0.5">
            {characters.map((char, index) => (
              <span
                key={index}
                className="inline-block animate-letter-drop"
                style={{
                  animationDelay: `${index * 0.03}s`
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
