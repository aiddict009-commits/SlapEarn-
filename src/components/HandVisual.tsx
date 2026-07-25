import React from 'react';

interface HandVisualProps {
  id: string;
  className?: string;
}

export function HandVisual({ id, className = '' }: HandVisualProps) {
  switch (id) {
    case 'wooden':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-wooden-svg"
        >
          <defs>
            <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="50%" stopColor="#fdba74" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <radialGradient id="pawPadGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="100%" stopColor="#f43f5e" />
            </radialGradient>
          </defs>

          <rect x="68" y="115" width="24" height="35" rx="6" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />
          <circle cx="80" cy="115" r="8" fill="#fdba74" stroke="#0f172a" strokeWidth="4" />

          <path
            d="M 80,125 Q 96,120 98,132 C 98,140 88,138 80,125"
            fill="#22c55e"
            stroke="#0f172a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <path d="M 74,130 Q 78,138 76,145" fill="none" stroke="#ea580c" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />
          <path d="M 84,124 Q 88,132 85,142" fill="none" stroke="#ea580c" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />

          <rect x="42" y="55" width="76" height="66" rx="30" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <rect x="30" y="70" width="20" height="32" rx="10" transform="rotate(-25 30 70)" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="44" y="32" width="16" height="36" rx="8" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="64" y="24" width="16" height="42" rx="8" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="84" y="27" width="16" height="40" rx="8" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="102" y="38" width="15" height="32" rx="7.5" fill="url(#woodGrad)" stroke="#0f172a" strokeWidth="4" />

          <ellipse cx="80" cy="92" rx="17" ry="13" fill="url(#pawPadGrad)" stroke="#0f172a" strokeWidth="2.5" />
          <circle cx="56" cy="68" r="6" fill="url(#pawPadGrad)" stroke="#0f172a" strokeWidth="2" />
          <circle cx="71" cy="60" r="7.2" fill="url(#pawPadGrad)" stroke="#0f172a" strokeWidth="2" />
          <circle cx="89" cy="62" r="7.2" fill="url(#pawPadGrad)" stroke="#0f172a" strokeWidth="2" />
          <circle cx="103" cy="71" r="5.8" fill="url(#pawPadGrad)" stroke="#0f172a" strokeWidth="2" />

          <circle cx="75" cy="88" r="2.5" fill="#ffffff" />
          <circle cx="54" cy="65" r="1.5" fill="#ffffff" />
        </svg>
      );

    case 'stone':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-stone-svg"
        >
          <defs>
            <linearGradient id="stoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <radialGradient id="rockCoreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#64748b" />
            </radialGradient>
          </defs>

          <rect x="66" y="112" width="28" height="36" rx="6" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4.5" />
          <polygon points="62,122 98,122 90,132 70,132" fill="#334155" stroke="#0f172a" strokeWidth="3" />

          <rect x="38" y="55" width="84" height="68" rx="28" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4.5" />

          {/* Cracked stone texture lines */}
          <path d="M 50,75 L 62,85 L 58,95" fill="none" stroke="#334155" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />
          <path d="M 110,80 L 98,90 L 102,102" fill="none" stroke="#334155" strokeWidth="2.5" opacity="0.6" strokeLinecap="round" />

          {/* Chubby Stone Fingers */}
          <rect x="30" y="70" width="20" height="32" rx="9" transform="rotate(-25 30 70)" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="44" y="32" width="16" height="36" rx="8" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="64" y="24" width="16" height="42" rx="8" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="84" y="27" width="16" height="40" rx="8" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="103" y="38" width="15" height="32" rx="7.5" fill="url(#stoneGrad)" stroke="#0f172a" strokeWidth="4" />

          {/* Cute Stone Palm Emblem */}
          <circle cx="80" cy="88" r="14" fill="url(#rockCoreGrad)" stroke="#0f172a" strokeWidth="2.5" />
          <path d="M 74,88 L 86,88 M 80,82 L 80,94" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );

    case 'iron':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-iron-svg"
        >
          <defs>
            <linearGradient id="ironGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="glowHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>

          <rect x="64" y="112" width="32" height="38" rx="8" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="4.5" />
          <rect x="60" y="125" width="40" height="10" rx="5" fill="#0891b2" stroke="#0f172a" strokeWidth="3" />

          <rect x="38" y="55" width="84" height="68" rx="28" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <g transform="rotate(-20 34 72)">
            <rect x="30" y="70" width="22" height="18" rx="6" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="30" y="56" width="22" height="16" rx="6" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
          </g>

          <g>
            <rect x="44" y="32" width="16" height="18" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="44" y="18" width="16" height="16" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="64" y="24" width="16" height="20" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="64" y="10" width="16" height="16" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="84" y="27" width="16" height="18" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="84" y="13" width="16" height="16" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="104" y="38" width="15" height="16" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
            <rect x="104" y="24" width="15" height="15" rx="5" fill="url(#ironGrad)" stroke="#0f172a" strokeWidth="3.5" />
          </g>

          <g transform="translate(80, 88) scale(1.15)">
            <path
              d="M 0, -8 C -4, -13 -11, -11 -11, -5 C -11, 2 -2, 8 0, 11 C 2, 8 11, 2 11, -5 C 11, -11 4, -13 0, -8 Z"
              fill="url(#glowHeartGrad)"
              stroke="#0f172a"
              strokeWidth="2.5"
              className="animate-pulse"
            />
            <circle cx="-3" cy="-4" r="1.5" fill="#ffffff" />
          </g>

          <circle cx="50" cy="106" r="2.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="110" cy="106" r="2.5" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.5" />
        </svg>
      );

    case 'gold':
    case 'golden':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-golden-svg"
        >
          <defs>
            <linearGradient id="goldHandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="45%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="crownGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          <rect x="66" y="112" width="28" height="36" rx="6" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <g transform="translate(80, 134) scale(0.8)">
            <path
              d="M -16,6 L 16,6 L 12,-6 L 0,-1 L -12,-6 Z"
              fill="url(#crownGoldGrad)"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle cx="-12" cy="-7" r="2" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
            <circle cx="0" cy="-2" r="2" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
            <circle cx="12" cy="-7" r="2" fill="#ef4444" stroke="#0f172a" strokeWidth="1" />
          </g>

          <rect x="40" y="55" width="80" height="66" rx="28" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <rect x="30" y="70" width="19" height="32" rx="9.5" transform="rotate(-25 30 70)" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="44" y="31" width="16" height="36" rx="8" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="64" y="22" width="16" height="43" rx="8" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="84" y="25" width="16" height="40" rx="8" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="103" y="36" width="15" height="32" rx="7.5" fill="url(#goldHandGrad)" stroke="#0f172a" strokeWidth="4" />

          <g transform="translate(80, 88) scale(1.1)">
            <path
              d="M 0,-14 L 4,-4 L 14,-2 L 6,5 L 8,15 L 0,9 L -8,15 L -6,5 L -14,-2 L -4,-4 Z"
              fill="#ffffff"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </g>

          <path d="M 24,40 L 28,40 M 26,38 L 26,42" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
          <path d="M 134,35 L 138,35 M 136,33 L 136,37" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
          <path d="M 132,105 L 136,105 M 134,103 L 134,107" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case 'diamond':
    case 'crystal':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-diamond-svg"
        >
          <defs>
            <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="40%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="facetGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <rect x="66" y="112" width="28" height="36" rx="6" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <path
            d="M 66,128 L 54,136"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <polygon
            points="54,131 56,135 60,135 57,138 58,142 54,139 50,142 51,138 48,135 52,135"
            fill="#38bdf8"
            stroke="#0f172a"
            strokeWidth="1.5"
          />

          <rect x="38" y="55" width="84" height="68" rx="28" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <polygon points="39,84 80,56 80,122 39,112" fill="url(#facetGrad1)" opacity="0.6" />
          <line x1="80" y1="56" x2="80" y2="122" stroke="#ffffff" strokeWidth="3" opacity="0.6" />
          <line x1="39" y1="84" x2="121" y2="84" stroke="#ffffff" strokeWidth="2" opacity="0.4" />
          <line x1="80" y1="84" x2="55" y2="114" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />
          <line x1="80" y1="84" x2="105" y2="114" stroke="#ffffff" strokeWidth="1.5" opacity="0.4" />

          <rect x="30" y="70" width="19" height="32" rx="4" transform="rotate(-25 30 70)" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="44" y="31" width="16" height="36" rx="4" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="64" y="22" width="16" height="43" rx="4" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="84" y="25" width="16" height="40" rx="4" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4" />
          <rect x="103" y="36" width="15" height="32" rx="4" fill="url(#crystalGrad)" stroke="#0f172a" strokeWidth="4" />

          <g transform="translate(118, 38)">
            <path d="M 0,-6 Q 0,0 6,0 Q 0,0 0,6 Q 0,0 -6,0 Q 0,0 0,-6 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
          </g>
          <g transform="translate(30, 102) scale(0.8)">
            <path d="M 0,-6 Q 0,0 6,0 Q 0,0 0,6 Q 0,0 -6,0 Q 0,0 0,-6 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        </svg>
      );

    case 'legendary':
    case 'dragon':
      return (
        <svg
          viewBox="0 0 160 160"
          className={`w-full h-full select-none pointer-events-none ${className}`}
          id="hand-legendary-svg"
        >
          <defs>
            <linearGradient id="legendaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3e8ff" />
              <stop offset="35%" stopColor="#c084fc" />
              <stop offset="70%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id="clawGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>
          </defs>

          <path
            d="M 60,140 Q 50,118 70,116 Q 80,105 90,116 Q 110,118 100,140 Z"
            fill="#a855f7"
            stroke="#0f172a"
            strokeWidth="3.5"
          />
          <path
            d="M 68,140 Q 60,126 74,124 Q 80,116 86,124 Q 100,126 92,140 Z"
            fill="#facc15"
            stroke="#0f172a"
            strokeWidth="2.5"
          />

          <rect x="66" y="112" width="28" height="36" rx="6" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <rect x="38" y="55" width="84" height="68" rx="28" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4.5" />

          <path d="M 70,82 Q 74,86 78,82 M 82,82 Q 86,86 90,82" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
          <path d="M 76,94 Q 80,98 84,94" fill="none" stroke="#facc15" strokeWidth="3" strokeLinecap="round" opacity="0.9" />

          <g transform="rotate(-25 30 70)">
            <rect x="30" y="70" width="20" height="32" rx="9" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4" />
            <path d="M 33,63 Q 40,50 47,63 Z" fill="url(#clawGrad)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          </g>

          <g>
            <rect x="44" y="32" width="16" height="36" rx="8" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4" />
            <path d="M 46,26 Q 52,14 58,26 Z" fill="url(#clawGrad)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />

            <rect x="64" y="24" width="16" height="42" rx="8" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4" />
            <path d="M 66,17 Q 72,5 78,17 Z" fill="url(#clawGrad)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />

            <rect x="84" y="27" width="16" height="39" rx="8" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4" />
            <path d="M 86,20 Q 92,8 98,20 Z" fill="url(#clawGrad)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />

            <rect x="103" y="38" width="15" height="31" rx="7.5" fill="url(#legendaryGrad)" stroke="#0f172a" strokeWidth="4" />
            <path d="M 104,32 Q 110.5,21 117,32 Z" fill="url(#clawGrad)" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          </g>

          <circle cx="56" cy="102" r="6" fill="#fecdd3" opacity="0.6" />
          <circle cx="104" cy="102" r="6" fill="#fecdd3" opacity="0.6" />
        </svg>
      );

    default:
      return null;
  }
}
