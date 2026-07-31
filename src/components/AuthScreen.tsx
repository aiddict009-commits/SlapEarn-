import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Lock, Gift, Sparkles, LogIn, UserPlus, ArrowRight, Globe, ShieldAlert, RefreshCw, Check } from 'lucide-react';
import { sound } from '../utils/sound';
import { detectUserCountry, ALLOWED_COUNTRIES } from '../utils/countryGuard';

export interface AuthUser {
  username: string;
  email: string;
  myReferralCode: string;
  referredByCode?: string;
  country?: string;
}

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, isNewUser: boolean) => void;
  onSkipDemo?: () => void;
}

export default function AuthScreen({ onLoginSuccess, onSkipDemo }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Country detection & restriction states
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  const [isCountryRestricted, setIsCountryRestricted] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState('');

  // Handle Sign Up
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter a username.');
      sound.playError();
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      sound.playError();
      return;
    }
    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters.');
      sound.playError();
      return;
    }

    // Automatically detect user's country on signup
    setIsDetectingCountry(true);
    const location = await detectUserCountry();
    setIsDetectingCountry(false);

    if (!location.isAllowed) {
      sound.playError();
      setDetectedLocationName(`${location.countryName} ${location.flag}`);
      setIsCountryRestricted(true);
      return;
    }

    const cleanRefCode = referralCode.trim().toUpperCase();
    const generatedMyCode = `SLAP-${username.trim().toUpperCase()}`;

    const newUser: AuthUser = {
      username: username.trim(),
      email: email.trim(),
      myReferralCode: generatedMyCode,
      referredByCode: cleanRefCode || undefined,
      country: `${location.countryName} ${location.flag}`
    };

    sound.playSuccess();
    onLoginSuccess(newUser, true);
  };

  // Helper to bypass/select country in dev or testing if user desires
  const handleSelectSimulatedCountry = (countryObj: typeof ALLOWED_COUNTRIES[0]) => {
    sound.playSuccess();
    setIsCountryRestricted(false);
    
    const cleanRefCode = referralCode.trim().toUpperCase();
    const generatedMyCode = `SLAP-${(username.trim() || 'USER').toUpperCase()}`;

    const newUser: AuthUser = {
      username: username.trim() || 'AfricanSlapper',
      email: email.trim() || 'user@slapearn.app',
      myReferralCode: generatedMyCode,
      referredByCode: cleanRefCode || undefined,
      country: `${countryObj.name} ${countryObj.flag}`
    };

    onLoginSuccess(newUser, true);
  };

  // Handle Login
  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email or username.');
      sound.playError();
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      sound.playError();
      return;
    }

    // Mock successful login
    const derivedUsername = email.includes('@') ? email.split('@')[0] : email;
    const existingUser: AuthUser = {
      username: derivedUsername,
      email: email.includes('@') ? email : `${email}@slapearn.app`,
      myReferralCode: `SLAP-${derivedUsername.toUpperCase()}`,
      country: 'South Africa 🇿🇦'
    };

    sound.playSuccess();
    onLoginSuccess(existingUser, false);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Playful background decorative shapes */}
      <div className="absolute top-10 left-6 w-16 h-16 bg-[#FF3B77] rounded-full border-3 border-slate-900 opacity-20 animate-pulse pointer-events-none" />
      <div className="absolute bottom-12 right-8 w-24 h-24 bg-[#A855F7] rounded-3xl border-3 border-slate-900 opacity-20 -rotate-12 pointer-events-none" />

      {/* COUNTRY RESTRICTION SCREEN OVERLAY */}
      {isCountryRestricted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[340px] bg-white border-3 border-slate-900 rounded-[24px] p-4 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] relative z-20 flex flex-col gap-3"
        >
          {/* Restricted Icon Header */}
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-100 border-2 border-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mb-2 text-rose-600">
              🌍
            </div>
            <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-300 uppercase tracking-widest mb-1">
              Location Unavailable
            </span>
            <h2 className="text-base font-black text-slate-950 tracking-tight">
              Service Region Restricted
            </h2>
          </div>

          {/* User Requested Mandatory Restriction Notice */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-xs font-black text-amber-950 leading-snug text-center">
              "SlapEarn is currently available only in selected African countries. We plan to expand to more countries in the future."
            </p>
          </div>

          {/* Detected location badge */}
          {detectedLocationName && (
            <div className="flex items-center justify-between bg-slate-100 border-2 border-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-extrabold text-slate-700">
              <span className="text-[10px] text-slate-500 font-bold">Detected Location:</span>
              <span className="text-slate-900 font-black">{detectedLocationName}</span>
            </div>
          )}

          {/* List of Allowed Countries */}
          <div>
            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Supported African Countries:
            </h4>
            <div className="grid grid-cols-1 gap-1 max-h-[140px] overflow-y-auto pr-1">
              {ALLOWED_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectSimulatedCountry(c)}
                  className="w-full flex items-center justify-between p-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 rounded-lg transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{c.flag}</span>
                    <span className="text-xs font-black text-slate-800 group-hover:text-emerald-950">{c.name}</span>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Select 🚀
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 mt-1">
            <button
              type="button"
              onClick={async () => {
                setIsDetectingCountry(true);
                const loc = await detectUserCountry();
                setIsDetectingCountry(false);
                if (loc.isAllowed) {
                  setIsCountryRestricted(false);
                } else {
                  setDetectedLocationName(`${loc.countryName} ${loc.flag}`);
                }
              }}
              className="w-full font-black text-xs py-2 rounded-xl border-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDetectingCountry ? 'animate-spin' : ''}`} />
              Re-detect Location
            </button>

            <button
              type="button"
              onClick={() => { setIsCountryRestricted(false); setMode('login'); }}
              className="w-full text-[11px] font-bold text-slate-500 hover:text-slate-900 text-center py-1 cursor-pointer"
            >
              Back to Login Screen
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-[320px] sm:max-w-[340px] bg-white border-3 border-slate-900 rounded-[20px] p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] relative z-10"
        >
          {/* App Logo Header */}
          <div className="flex flex-col items-center text-center mb-2.5">
            <div className="w-9 h-9 bg-[#FFEED1] border-2 border-slate-900 rounded-lg flex items-center justify-center text-xl shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] mb-1">
              👋
            </div>
            <h1 className="text-xl font-black text-slate-950 tracking-tight flex items-center gap-1">
              SlapEarn <span className="text-[#FF3B77]">.io</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] mt-0.5">
              {mode === 'signup' ? 'Create an account to start earning SP!' : 'Welcome back! Log in to your account.'}
            </p>
          </div>

          {/* Tab Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl border-2 border-slate-900 flex gap-1 mb-3.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
            <button
              type="button"
              onClick={() => { sound.playSlap(); setMode('signup'); setErrorMessage(''); }}
              className={`flex-1 py-1.5 font-black text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-[#A855F7] text-white border border-slate-900 shadow-[1px_1px_0px_0px_#000]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>

            <button
              type="button"
              onClick={() => { sound.playSlap(); setMode('login'); setErrorMessage(''); }}
              className={`flex-1 py-1.5 font-black text-[11px] rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#FF3B77] text-white border border-slate-900 shadow-[1px_1px_0px_0px_#000]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-2 mb-3 text-[11px] font-bold text-rose-800 text-center animate-shake">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Form Body */}
          {mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="flex flex-col gap-2.5">
              {/* Username */}
              <div>
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500" /> Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. SlapMaster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" /> Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#A855F7]"
                />
              </div>

              {/* Referral Code Field */}
              <div className="bg-[#F3E8FF] border-2 border-slate-900 rounded-xl p-2.5 mt-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <label className="text-[11px] font-black text-purple-900 uppercase tracking-wide block mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-[#A855F7]" />
                  Referral Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. SLAP-1240"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 uppercase focus:outline-none focus:border-[#A855F7]"
                />
                <p className="text-[9.5px] font-bold text-purple-800 mt-1 leading-tight flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#A855F7] shrink-0" />
                  Enter friend's code for <span className="font-black text-slate-950">+100 SP</span> after 20 ads!
                </p>
              </div>

              {/* Auto Country Detection Indicator */}
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-lg px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Auto-detects country on signup (African regions)</span>
              </div>

              <button
                type="submit"
                disabled={isDetectingCountry}
                className="w-full font-black text-xs py-2.5 rounded-xl border-3 border-slate-900 bg-[#A855F7] text-white hover:bg-purple-600 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isDetectingCountry ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Detecting Country...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="flex flex-col gap-2.5">
              {/* Email / Username */}
              <div>
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" /> Email or Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your email or username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#FF3B77]"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide block mb-0.5 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" /> Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#FF3B77]"
                />
              </div>

              {/* Quick Demo Helper for Admin */}
              <div className="bg-[#FFF8E7] border-2 border-amber-400 rounded-xl p-2 text-center shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <span className="text-[10px] font-bold text-amber-900 block mb-1">
                  ⚡ Demo Admin Account Test:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    setEmail('aiddict009@gmail.com');
                    setPassword('admin123');
                  }}
                  className="w-full text-[10.5px] font-black bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg border border-slate-900 shadow-[1px_1px_0px_0px_#000] cursor-pointer hover:bg-slate-800 transition-transform active:scale-95"
                >
                  Click to Auto-fill Admin (aiddict009@gmail.com)
                </button>
              </div>

              <button
                type="submit"
                className="w-full font-black text-xs py-2.5 rounded-xl border-3 border-slate-900 bg-[#FF3B77] text-white hover:bg-rose-600 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer mt-1 flex items-center justify-center gap-1.5"
              >
                <span>Log In to Account</span>
                <LogIn className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Demo / Guest Mode option */}
          {onSkipDemo && (
            <div className="mt-3 text-center border-t border-slate-200 pt-2">
              <button
                type="button"
                onClick={onSkipDemo}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline cursor-pointer"
              >
                Continue as Guest (Demo Account)
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

