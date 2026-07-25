import React from 'react';

interface CharacterVisualProps {
  id: string;
  expression: 'idle' | 'blink' | 'hit' | 'angry' | 'defeated';
  className?: string;
}

export function CharacterVisual({ id, expression, className }: CharacterVisualProps) {
  // Common eye render helper to keep things incredibly tidy and reusable
  const renderEyes = (characterId: string, currentExpr: typeof expression) => {
    switch (currentExpr) {
      case 'blink':
        return (
          <>
            {/* Happy closed eyes ^ ^ */}
            <path
              d="M 68,110 Q 75,102 82,110"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 118,110 Q 125,102 132,110"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </>
        );
      case 'hit':
        return (
          <>
            {/* Dizzy/impact squeezed eyes > < */}
            <path
              d="M 66,105 L 78,115 M 78,105 L 66,115"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 122,105 L 134,115 M 134,105 L 122,115"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
          </>
        );
      case 'angry':
        return (
          <>
            {/* Angry slanted eyes with eyebrows */}
            <path
              d="M 64,96 L 80,102"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <path
              d="M 136,96 L 120,102"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <circle cx="74" cy="112" r="7.5" fill="#0f172a" />
            <circle cx="126" cy="112" r="7.5" fill="#0f172a" />
            <circle cx="76.5" cy="110" r="2.5" fill="#ffffff" />
            <circle cx="128.5" cy="110" r="2.5" fill="#ffffff" />
          </>
        );
      case 'defeated':
        return (
          <>
            {/* Dizzy spirals or X X eyes */}
            <path
              d="M 66,106 L 78,118 M 78,106 L 66,118"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M 122,106 L 134,118 M 134,106 L 122,118"
              fill="none"
              stroke="#0f172a"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </>
        );
      case 'idle':
      default:
        // Huge sparkly cute anime eyes
        return (
          <>
            {/* Left Eye */}
            <circle cx="74" cy="110" r="9" fill="#0f172a" />
            <circle cx="71.5" cy="107" r="3.2" fill="#ffffff" />
            <circle cx="76.5" cy="113" r="1.5" fill="#ffffff" />
            {/* Right Eye */}
            <circle cx="126" cy="110" r="9" fill="#0f172a" />
            <circle cx="123.5" cy="107" r="3.2" fill="#ffffff" />
            <circle cx="128.5" cy="113" r="1.5" fill="#ffffff" />
          </>
        );
    }
  };

  const renderMouth = (currentExpr: typeof expression) => {
    switch (currentExpr) {
      case 'blink':
        // Happy cat w mouth
        return (
          <path
            d="M 94,121 Q 100,125 100,121 Q 100,125 106,121"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        );
      case 'hit':
        // Small shocked O mouth
        return <circle cx="100" cy="123" r="6" fill="#0f172a" />;
      case 'angry':
        // Frowny triangle or curved arc down
        return (
          <path
            d="M 94,126 Q 100,120 106,126"
            fill="none"
            stroke="#0f172a"
            strokeWidth="4"
            strokeLinecap="round"
          />
        );
      case 'defeated':
        // Squiggly line
        return (
          <path
            d="M 94,123 Q 97,119 100,123 T 106,123"
            fill="none"
            stroke="#0f172a"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        );
      case 'idle':
      default:
        // Cute open smile with tongue showing
        return (
          <g>
            <path
              d="M 93,118 Q 100,129 107,118 Z"
              fill="#0f172a"
            />
            <path
              d="M 96,122 Q 100,129 104,122 Z"
              fill="#f43f5e"
            />
          </g>
        );
    }
  };

  // Switch between character designs
  if (id === 'momo') {
    // ---------------- Momo Peach (COMMON) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(244,63,94,0.18)]"}
        id="momo-peach-svg"
      >
        <defs>
          <radialGradient id="peachGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffccd5" />
            <stop offset="40%" stopColor="#ff85a2" />
            <stop offset="100%" stopColor="#f43f5e" />
          </radialGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>

        {/* Stem & Leaf */}
        <path
          d="M 100,45 Q 98,30 92,20"
          fill="none"
          stroke="#78350f"
          strokeWidth="4.5"
          strokeLinecap="round"
        />
        <path
          d="M 95,30 Q 75,18 70,28 C 70,38 88,40 95,30"
          fill="url(#leafGrad)"
          stroke="#15803d"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Main Peach Body */}
        <path
          d="M 100,45 C 50,44 35,90 35,122 C 35,164 72,175 100,175 C 128,175 165,164 165,122 C 165,90 150,44 100,45 Z"
          fill="url(#peachGrad)"
          stroke="#0f172a"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Peach Middle Crease */}
        <path
          d="M 100,46 C 98,75 97,110 100,145"
          fill="none"
          stroke="#f43f5e"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Blushing Cheeks */}
        <circle cx="56" cy="124" r="11" fill="#f43f5e" opacity="0.45" />
        <circle cx="144" cy="124" r="11" fill="#f43f5e" opacity="0.45" />

        {/* Eyes & Mouth */}
        {renderEyes('momo', expression)}
        {renderMouth(expression)}

        {/* Band-aid for defeated expression */}
        {expression === 'defeated' && (
          <g transform="translate(130, 85) rotate(15)">
            <rect x="0" y="0" width="22" height="9" rx="2.5" fill="#fed7aa" stroke="#0f172a" strokeWidth="2" />
            <line x1="6" y1="0" x2="6" y2="9" stroke="#ea580c" strokeWidth="1.5" />
            <line x1="16" y1="0" x2="16" y2="9" stroke="#ea580c" strokeWidth="1.5" />
          </g>
        )}
      </svg>
    );
  }

  if (id === 'puni') {
    // ---------------- Puni Slime (UNCOMMON) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(6,182,212,0.18)]"}
        id="puni-slime-svg"
      >
        <defs>
          <radialGradient id="slimeGrad" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ecfeff" />
            <stop offset="35%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </radialGradient>
          <linearGradient id="crownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>

        {/* Floating Crown */}
        <g className="animate-bounce" style={{ animationDuration: '3s' }}>
          <path
            d="M 85,34 L 88,20 L 100,28 L 112,20 L 115,34 Z"
            fill="url(#crownGrad)"
            stroke="#0f172a"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="88" cy="18" r="2.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="100" cy="26" r="2.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="112" cy="18" r="2.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.5" />
        </g>

        {/* Slime Droplet Body */}
        <path
          d="M 100,42 C 65,85 32,108 32,135 C 32,168 62,176 100,176 C 138,176 168,168 168,135 C 168,108 135,85 100,42 Z"
          fill="url(#slimeGrad)"
          stroke="#0f172a"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Inner Highlight Loop for 3D glassy look */}
        <path
          d="M 52,130 C 52,105 78,85 100,58"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.55"
        />

        {/* Blushing Cheeks */}
        <circle cx="53" cy="126" r="9.5" fill="#0891b2" opacity="0.35" />
        <circle cx="147" cy="126" r="9.5" fill="#0891b2" opacity="0.35" />

        {/* Eyes & Mouth */}
        {renderEyes('puni', expression)}
        {renderMouth(expression)}

        {/* Tiny water splash if hit */}
        {expression === 'hit' && (
          <g stroke="#22d3ee" strokeWidth="3.5" strokeLinecap="round">
            <line x1="20" y1="120" x2="8" y2="114" />
            <line x1="180" y1="120" x2="192" y2="114" />
          </g>
        )}
      </svg>
    );
  }

  if (id === 'bobo') {
    // ---------------- Bobo Tea (RARE) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(217,119,6,0.18)]"}
        id="bobo-tea-svg"
      >
        <defs>
          <linearGradient id="teaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="strawGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Straw */}
        <g transform={expression === 'hit' ? 'rotate(-8, 100, 100)' : 'none'}>
          <path
            d="M 94,15 L 105,75"
            fill="none"
            stroke="url(#strawGrad)"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </g>

        {/* Translucent Cup Back & Rim */}
        <path
          d="M 52,60 L 148,60 L 132,172 C 131,178 69,178 68,172 Z"
          fill="#f1f5f9"
          stroke="#0f172a"
          strokeWidth="4.5"
          strokeLinejoin="round"
          opacity="0.95"
        />

        {/* Tea Liquid Fill */}
        <path
          d="M 56,76 L 144,76 L 131,168 C 131,173 69,173 69,168 Z"
          fill="url(#teaGrad)"
        />

        {/* Creamy Milk Foam top */}
        <path
          d="M 56,76 Q 66,71 76,76 Q 86,81 96,76 Q 106,71 116,76 Q 126,81 136,76 Q 141,73 144,76 L 144,83 L 56,83 Z"
          fill="#ffffff"
        />

        {/* Tapioca Pearls inside */}
        <g fill="#1e1b4b">
          <circle cx="78" cy="158" r="8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="94" cy="161" r="8.5" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="112" cy="159" r="8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="122" cy="148" r="7.5" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="86" cy="147" r="8" stroke="#0f172a" strokeWidth="1.5" />
          <circle cx="104" cy="150" r="8" stroke="#0f172a" strokeWidth="1.5" />
          
          {/* Sparkles on pearls */}
          <circle cx="76" cy="156" r="1.5" fill="#ffffff" />
          <circle cx="92" cy="159" r="1.8" fill="#ffffff" />
          <circle cx="110" cy="157" r="1.5" fill="#ffffff" />
        </g>

        {/* Blushing Cheeks */}
        <circle cx="71" cy="122" r="8" fill="#f43f5e" opacity="0.4" />
        <circle cx="129" cy="122" r="8" fill="#f43f5e" opacity="0.4" />

        {/* Eyes & Mouth */}
        {renderEyes('bobo', expression)}
        {renderMouth(expression)}

        {/* Flat Flat Lid */}
        <path
          d="M 45,60 C 45,55 155,55 155,60 Z"
          fill="#e2e8f0"
          stroke="#0f172a"
          strokeWidth="4"
        />
      </svg>
    );
  }

  if (id === 'wooly') {
    // ---------------- Wooly Alpaca (EPIC) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(168,85,247,0.18)]"}
        id="wooly-alpaca-svg"
      >
        <defs>
          <radialGradient id="woolyGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fafaf9" />
            <stop offset="85%" stopColor="#f5f5f4" />
            <stop offset="100%" stopColor="#e7e5e4" />
          </radialGradient>
        </defs>

        {/* Fluffy wool cloud around head (constructed of overlapping circles) */}
        <g fill="url(#woolyGrad)" stroke="#0f172a" strokeWidth="4.5">
          {/* Ears */}
          <path d="M 64,55 L 56,25 Q 65,22 72,42 Z" fill="#fee2e2" />
          <path d="M 136,55 L 144,25 Q 135,22 128,42 Z" fill="#fee2e2" />

          {/* Cloud Circles */}
          <circle cx="100" cy="65" r="30" />
          <circle cx="70" cy="85" r="28" />
          <circle cx="130" cy="85" r="28" />
          <circle cx="62" cy="120" r="26" />
          <circle cx="138" cy="120" r="26" />
          <circle cx="80" cy="150" r="28" />
          <circle cx="120" cy="150" r="28" />
          <circle cx="100" cy="154" r="26" />
        </g>

        {/* Inner solid white cloud to mask overlapping stroke lines */}
        <g fill="url(#woolyGrad)">
          <circle cx="100" cy="65" r="28" />
          <circle cx="70" cy="85" r="26" />
          <circle cx="130" cy="85" r="26" />
          <circle cx="62" cy="120" r="24" />
          <circle cx="138" cy="120" r="24" />
          <circle cx="80" cy="150" r="26" />
          <circle cx="120" cy="150" r="26" />
          <circle cx="100" cy="154" r="24" />
        </g>

        {/* Inner face oval skin */}
        <ellipse cx="100" cy="116" rx="36" ry="28" fill="#fcfbf7" stroke="#0f172a" strokeWidth="4" />

        {/* Sweet pink ears inside */}
        <path d="M 60,45 L 58,29 Q 62,28 66,39 Z" fill="#f43f5e" opacity="0.5" />
        <path d="M 140,45 L 142,29 Q 138,28 134,39 Z" fill="#f43f5e" opacity="0.5" />

        {/* Dapper red bow tie */}
        <g transform="translate(100, 150)">
          <polygon points="-16,-8 -16,8 0,0" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <polygon points="16,-8 16,8 0,0" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="0" cy="0" r="5" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" />
        </g>

        {/* Blushing Cheeks */}
        <circle cx="74" cy="124" r="7.5" fill="#f43f5e" opacity="0.4" />
        <circle cx="126" cy="124" r="7.5" fill="#f43f5e" opacity="0.4" />

        {/* Eyes & Mouth (slightly shifted downward for cute baby proportions) */}
        {renderEyes('wooly', expression)}
        {renderMouth(expression)}
      </svg>
    );
  }

  if (id === 'aero') {
    // ---------------- Aero Star (LEGENDARY) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(245,158,11,0.22)]"}
        id="aero-star-svg"
      >
        <defs>
          <radialGradient id="starGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <linearGradient id="wingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>

        {/* Angelic wings at the back */}
        <g stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" fill="url(#wingGrad)">
          {/* Left Wing */}
          <path d="M 45,100 C 15,95 8,118 20,132 C 32,142 50,118 45,100 Z" />
          <path d="M 42,108 C 22,108 18,124 28,132" fill="none" />
          {/* Right Wing */}
          <path d="M 155,100 C 185,95 192,118 180,132 C 168,142 150,118 155,100 Z" />
          <path d="M 158,108 C 178,108 182,124 172,132" fill="none" />
        </g>

        {/* Glowing Halo */}
        <ellipse
          cx="100"
          cy="32"
          rx="25"
          ry="6"
          fill="none"
          stroke="#fef08a"
          strokeWidth="4.5"
          className="animate-pulse"
        />
        <ellipse
          cx="100"
          cy="32"
          rx="25"
          ry="6"
          fill="none"
          stroke="#0f172a"
          strokeWidth="2"
          opacity="0.3"
        />

        {/* Golden Star Body with Rounded corners style */}
        <path
          d="M 100,38 L 118,78 L 160,82 L 128,112 L 138,154 L 100,132 L 62,154 L 72,112 L 40,82 L 82,78 Z"
          fill="url(#starGrad)"
          stroke="#0f172a"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />

        {/* Tiny forehead jewel for star prince feel */}
        <polygon points="100,68 103,74 100,80 97,74" fill="#a855f7" stroke="#0f172a" strokeWidth="1.5" />

        {/* Blushing Cheeks */}
        <circle cx="68" cy="116" r="8" fill="#ef4444" opacity="0.45" />
        <circle cx="132" cy="116" r="8" fill="#ef4444" opacity="0.45" />

        {/* Eyes & Mouth */}
        {renderEyes('aero', expression)}
        {renderMouth(expression)}

        {/* Cosmic Orbit ring */}
        <path
          d="M 45,120 Q 100,145 155,120"
          fill="none"
          stroke="#818cf8"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.6"
          strokeDasharray="6 4"
        />
      </svg>
    );
  }

  if (id === 'pip') {
    // ---------------- Pip Citrus Cat (ORANGE) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(249,115,22,0.18)]"}
        id="pip-orange-svg"
      >
        <defs>
          <radialGradient id="pipGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ffedd5" />
            <stop offset="40%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ea580c" />
          </radialGradient>
        </defs>

        {/* Cat Ears */}
        <path d="M 58,65 L 42,28 Q 62,35 76,55 Z" fill="#ea580c" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 52,55 L 48,36 Q 58,40 66,50 Z" fill="#ffedd5" />
        <path d="M 142,65 L 158,28 Q 138,35 124,55 Z" fill="#ea580c" stroke="#0f172a" strokeWidth="4" strokeLinejoin="round" />
        <path d="M 148,55 L 152,36 Q 142,40 134,50 Z" fill="#ffedd5" />

        {/* Leaf hair sprout */}
        <path d="M 100,42 Q 115,22 125,30 C 125,40 110,48 100,42" fill="#22c55e" stroke="#0f172a" strokeWidth="3" />

        {/* Round Body */}
        <circle cx="100" cy="118" r="62" fill="url(#pipGrad)" stroke="#0f172a" strokeWidth="4.5" />

        {/* Glossy highlight */}
        <ellipse cx="68" cy="82" rx="10" ry="16" fill="#ffffff" opacity="0.4" transform="rotate(-25 68 82)" />

        {/* Blushing Cheeks */}
        <circle cx="58" cy="126" r="10" fill="#f43f5e" opacity="0.45" />
        <circle cx="142" cy="126" r="10" fill="#f43f5e" opacity="0.45" />

        {/* Eyes & Mouth */}
        {renderEyes('pip', expression)}
        {renderMouth(expression)}
      </svg>
    );
  }

  if (id === 'kiki') {
    // ---------------- Kiki Kiwi Bird (KIWI) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(34,197,94,0.18)]"}
        id="kiki-kiwi-svg"
      >
        <defs>
          <radialGradient id="kikiBody" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a16207" />
            <stop offset="100%" stopColor="#713f12" />
          </radialGradient>
          <radialGradient id="kikiBelly" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#dcfce7" />
            <stop offset="60%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#22c55e" />
          </radialGradient>
        </defs>

        {/* Brown Fuzzy Body */}
        <circle cx="100" cy="115" r="62" fill="url(#kikiBody)" stroke="#0f172a" strokeWidth="4.5" />

        {/* Lime Green Slice Belly */}
        <circle cx="100" cy="120" r="46" fill="url(#kikiBelly)" stroke="#0f172a" strokeWidth="3" />
        <circle cx="100" cy="120" r="16" fill="#fefce8" />

        {/* Kiwi Seeds Ring */}
        <g fill="#0f172a">
          <circle cx="75" cy="110" r="2.5" />
          <circle cx="125" cy="110" r="2.5" />
          <circle cx="82" cy="138" r="2.5" />
          <circle cx="118" cy="138" r="2.5" />
          <circle cx="100" cy="144" r="2.5" />
        </g>

        {/* Cute Beak */}
        <polygon points="100,116 112,125 100,128" fill="#f97316" stroke="#0f172a" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Blushing Cheeks */}
        <circle cx="58" cy="118" r="9" fill="#f43f5e" opacity="0.45" />
        <circle cx="142" cy="118" r="9" fill="#f43f5e" opacity="0.45" />

        {/* Eyes & Mouth */}
        {renderEyes('kiki', expression)}
        {renderMouth(expression)}
      </svg>
    );
  }

  if (id === 'niji') {
    // ---------------- Niji Rainbow Bunny (RAINBOW) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(56,189,248,0.22)]"}
        id="niji-bunny-svg"
      >
        <defs>
          <linearGradient id="rainbowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="33%" stopColor="#c084fc" />
            <stop offset="66%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>

        {/* Long Floppy Bunny Ears */}
        <g stroke="#0f172a" strokeWidth="4" strokeLinejoin="round">
          <path d="M 68,68 Q 40,15 62,10 Q 82,10 82,60 Z" fill="url(#rainbowGrad)" />
          <path d="M 65,58 Q 48,22 62,18 Q 74,18 76,52 Z" fill="#fce7f3" />

          <path d="M 132,68 Q 160,15 138,10 Q 118,10 118,60 Z" fill="url(#rainbowGrad)" />
          <path d="M 135,58 Q 152,22 138,18 Q 126,18 124,52 Z" fill="#fce7f3" />
        </g>

        {/* Rainbow Body */}
        <circle cx="100" cy="122" r="58" fill="url(#rainbowGrad)" stroke="#0f172a" strokeWidth="4.5" />

        {/* White Snout patch */}
        <ellipse cx="100" cy="126" rx="22" ry="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />

        {/* Blushing Cheeks */}
        <circle cx="58" cy="126" r="9" fill="#f43f5e" opacity="0.5" />
        <circle cx="142" cy="126" r="9" fill="#f43f5e" opacity="0.5" />

        {/* Eyes & Mouth */}
        {renderEyes('niji', expression)}
        {renderMouth(expression)}
      </svg>
    );
  }

  if (id === 'bambu') {
    // ---------------- Bambu Panda Bomb (BOMB) ----------------
    return (
      <svg
        viewBox="0 0 200 200"
        className={className || "w-48 h-48 select-none pointer-events-none drop-shadow-[0_12px_24px_rgba(71,85,105,0.25)]"}
        id="bambu-panda-svg"
      >
        <defs>
          <radialGradient id="bombGrad" cx="45%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Burning Fuse Wick on head */}
        <path d="M 100,45 Q 120,25 135,32" fill="none" stroke="#d97706" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="138" cy="32" r="6" fill="#ef4444" className="animate-ping" />
        <circle cx="138" cy="32" r="3.5" fill="#facc15" />

        {/* Panda Ears */}
        <circle cx="52" cy="62" r="18" fill="#0f172a" stroke="#0f172a" strokeWidth="3" />
        <circle cx="148" cy="62" r="18" fill="#0f172a" stroke="#0f172a" strokeWidth="3" />

        {/* Main Bomb Sphere Body */}
        <circle cx="100" cy="120" r="60" fill="url(#bombGrad)" stroke="#0f172a" strokeWidth="4.5" />

        {/* Panda Eye Patches */}
        <ellipse cx="72" cy="112" rx="16" ry="20" fill="#0f172a" transform="rotate(-15 72 112)" />
        <ellipse cx="128" cy="112" rx="16" ry="20" fill="#0f172a" transform="rotate(15 128 112)" />

        {/* Glossy Sheen */}
        <ellipse cx="62" cy="85" rx="8" ry="14" fill="#ffffff" opacity="0.3" transform="rotate(-30 62 85)" />

        {/* Blushing Cheeks */}
        <circle cx="56" cy="132" r="8" fill="#ff8ea3" opacity="0.6" />
        <circle cx="144" cy="132" r="8" fill="#ff8ea3" opacity="0.6" />

        {/* Eyes & Mouth */}
        {renderEyes('bambu', expression)}
        {renderMouth(expression)}
      </svg>
    );
  }

  return null;
}
