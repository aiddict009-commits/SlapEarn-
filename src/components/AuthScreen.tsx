import { useState, FormEvent, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Lock, Gift, Sparkles, LogIn, UserPlus, ArrowRight, RefreshCw, Check, KeyRound, Globe, Info } from 'lucide-react';
import { sound } from '../utils/sound';
import { detectUserCountry, ALLOWED_COUNTRIES } from '../utils/countryGuard';
import { registerUserInFirebase, loginUserInFirebase, checkPreLoginRateLimitApi, recordLoginAttemptApi } from '../lib/firebase';
import LandingPage from './LandingPage';
import LegalModal, { LegalTab } from './LegalModal';

export interface AuthUser {
  uid?: string;
  username: string;
  email: string;
  myReferralCode: string;
  referredByCode?: string;
  country?: string;
}

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, isNewUser: boolean) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'landing' | 'login' | 'signup'>('landing');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isRefCodeAutoFilled, setIsRefCodeAutoFilled] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');

  // Parse referral code from URL search parameters (?ref=... or ?referral=... or ?code=...) or path
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const codeFromQuery = searchParams.get('ref') || searchParams.get('referral') || searchParams.get('code');
      
      let detectedCode = codeFromQuery;

      if (!detectedCode) {
        const pathMatch = window.location.pathname.match(/\/ref\/([^\/]+)/i);
        if (pathMatch && pathMatch[1]) {
          detectedCode = pathMatch[1];
        }
      }

      if (detectedCode) {
        const cleanCode = detectedCode.trim().toUpperCase();
        setReferralCode(cleanCode);
        setIsRefCodeAutoFilled(true);
        sessionStorage.setItem('slapearn_pending_ref_code', cleanCode);
        setMode('signup');
      } else {
        const savedCode = sessionStorage.getItem('slapearn_pending_ref_code');
        if (savedCode) {
          const cleanSaved = savedCode.trim().toUpperCase();
          setReferralCode(cleanSaved);
          setIsRefCodeAutoFilled(true);
        }
      }
    } catch (err) {
      console.error('Error parsing referral code from URL:', err);
    }
  }, []);

  const [unregisteredAccount, setUnregisteredAccount] = useState<string | null>(null);
  const [suggestedUsername, setSuggestedUsername] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  // Password requirement real-time checks
  const hasMinLength = password.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const isPasswordValid = hasMinLength;

  // Country detection & restriction states
  const [isDetectingCountry, setIsDetectingCountry] = useState(false);
  const [isCountryRestricted, setIsCountryRestricted] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState('');
  const [cachedLocation, setCachedLocation] = useState<{ isAllowed: boolean; countryName: string; flag: string } | null>(null);

  // Pre-fetch country detection in background as soon as AuthScreen renders
  useEffect(() => {
    let isMounted = true;
    detectUserCountry().then(loc => {
      if (isMounted) setCachedLocation(loc);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // When installed PWA is launched and user already has an active account, directly log in!
  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    const storedUid = localStorage.getItem('slapearn_active_uid');
    const storedProfile = localStorage.getItem('slapearn_user_profile');

    if (isPWA && storedUid && storedProfile) {
      try {
        const user = JSON.parse(storedProfile);
        onLoginSuccess(user, false);
      } catch {}
    }
  }, [onLoginSuccess]);

  // Handle Sign Up via Firebase Auth & Firestore
  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setUnregisteredAccount(null);
    setSuggestedUsername(null);
    setRegisteredEmail(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim() || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail);

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      sound.playError();
      return;
    }
    if (!cleanUsername) {
      setErrorMessage('Please enter a username.');
      sound.playError();
      return;
    }
    if (!isPasswordValid) {
      setErrorMessage('Password must be at least 6 characters long.');
      sound.playError();
      return;
    }
    if (!agreedToTerms) {
      setErrorMessage('You must agree to the Terms of Service and Privacy Policy to continue.');
      sound.playError();
      return;
    }

    // Automatically detect user's country on signup (use pre-fetched location if available)
    let location = cachedLocation;
    if (!location) {
      setIsDetectingCountry(true);
      try {
        location = await detectUserCountry();
      } catch {
        location = { isAllowed: true, countryName: 'South Africa', flag: '🇿🇦' };
      }
      setIsDetectingCountry(false);
    }

    if (!location.isAllowed) {
      sound.playError();
      setDetectedLocationName(`${location.countryName} ${location.flag}`);
      setIsCountryRestricted(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanRefCode = referralCode.trim().toUpperCase();
      const countryStr = `${location.countryName} ${location.flag}`;

      const { uid, stats } = await registerUserInFirebase({
        username: cleanUsername,
        email: cleanEmail,
        password,
        referralCode: cleanRefCode || undefined,
        country: countryStr
      });

      const newUser: AuthUser = {
        uid,
        username: stats.username || cleanUsername,
        email: stats.email || cleanEmail,
        myReferralCode: stats.myReferralCode || `SLAP-${cleanUsername.toUpperCase()}`,
        referredByCode: cleanRefCode || undefined,
        country: countryStr
      };

      sound.playSuccess();
      onLoginSuccess(newUser, true);
    } catch (err: any) {
      sound.playError();
      console.error('Sign up error:', err);
      if (err.code === 'auth/username-already-in-use' || err.message?.includes('username')) {
        const suggestion = err.suggestedUsername || `${cleanUsername}${Math.floor(100 + Math.random() * 899)}`;
        setSuggestedUsername(suggestion);
        setErrorMessage(`This username "${cleanUsername}" is already taken. Please choose another username.`);
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('email')) {
        setRegisteredEmail(cleanEmail);
        setErrorMessage(`This email "${cleanEmail}" is already registered. Please log in instead.`);
      } else if (err.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
      } else {
        setErrorMessage(err.message || 'Server signup failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to select country and finish signup
  const handleSelectSimulatedCountry = async (countryObj: typeof ALLOWED_COUNTRIES[0]) => {
    sound.playSuccess();
    setIsCountryRestricted(false);
    
    const cleanRefCode = referralCode.trim().toUpperCase();
    const cleanUsername = username.trim() || 'AfricanSlapper';
    const cleanEmail = (email.trim() || `user_${Date.now()}@slapearn.app`).toLowerCase();
    const countryStr = `${countryObj.name} ${countryObj.flag}`;

    setIsSubmitting(true);
    try {
      const { uid, stats } = await registerUserInFirebase({
        username: cleanUsername,
        email: cleanEmail,
        password: password || 'SlapEarn123!',
        referralCode: cleanRefCode || undefined,
        country: countryStr
      });

      const newUser: AuthUser = {
        uid,
        username: stats.username || cleanUsername,
        email: stats.email || cleanEmail,
        myReferralCode: stats.myReferralCode || `SLAP-${cleanUsername.toUpperCase()}`,
        country: countryStr
      };

      onLoginSuccess(newUser, true);
    } catch (err: any) {
      sound.playError();
      setErrorMessage(err.message || 'Signup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login via Firebase Auth & Firestore
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setUnregisteredAccount(null);

    const inputKey = email.trim().toLowerCase();
    if (!inputKey) {
      setErrorMessage('Please enter your registered email or username.');
      sound.playError();
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      sound.playError();
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Pre-login rate limit & abuse protection check (Fix 13)
      const rateCheck = await checkPreLoginRateLimitApi(inputKey);
      if (rateCheck && rateCheck.allowed === false) {
        sound.playError();
        setErrorMessage(rateCheck.message || 'Too many login attempts. Please wait a moment before trying again.');
        setIsSubmitting(false);
        return;
      }

      const { uid, stats } = await loginUserInFirebase(inputKey, password);
      
      // Record successful login
      await recordLoginAttemptApi(inputKey, true);

      const existingUser: AuthUser = {
        uid,
        username: stats.username || 'Slapper',
        email: stats.email || inputKey,
        myReferralCode: stats.myReferralCode || `SLAP-${(stats.username || 'SLAPPER').toUpperCase()}`,
        country: stats.country || 'South Africa 🇿🇦'
      };

      sound.playSuccess();
      onLoginSuccess(existingUser, false);
    } catch (err: any) {
      sound.playError();
      console.error('Login error:', err);
      // Record failed login attempt (Fix 13)
      await recordLoginAttemptApi(inputKey, false);

      if (err.code === 'auth/user-not-found' || err.message?.includes('not found') || err.message?.includes('sign up first')) {
        setUnregisteredAccount(inputKey);
        setErrorMessage(`Account not found for "${inputKey}". Please sign up first.`);
      } else if (err.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password. Please check your password and try again.');
      } else if (err.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid credentials. If you do not have an account yet, please click Sign Up.');
      } else {
        setErrorMessage(err.message || 'Server login failed. Please check your network connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'landing') {
    return <LandingPage onGetStarted={(target) => setMode(target)} />;
  }

  return (
    <div className="min-h-screen bg-[#FFFDF7] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Clean background without floating shapes */}

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
          className="w-full max-w-[320px] sm:max-w-[340px] bg-white border-3 border-slate-900 rounded-[20px] p-3.5 sm:p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] relative z-10 flex flex-col"
        >
          {/* Top navigation back to Landing Page */}
          <button
            type="button"
            onClick={() => setMode('landing')}
            className="text-slate-500 hover:text-slate-900 font-extrabold text-[10px] flex items-center gap-1 mb-2 self-start cursor-pointer group"
          >
            <Info className="w-3 h-3 text-[#FF3B77] group-hover:scale-110 transition-transform" />
            <span>← View Site Details & Overview</span>
          </button>

          {/* App Title Header */}
          <div className="flex flex-col items-center text-center mb-3">
            <h1 className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-1.5">
              <span>SlapEarn</span>
              <span className="bg-[#FFD043] text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-md border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] font-mono leading-none tracking-tight">
                .io
              </span>
            </h1>
            <p className="text-slate-500 font-bold text-[10.5px] mt-0.5">
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
            <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-2.5 mb-3 text-[11px] font-bold text-rose-900 text-center animate-shake flex flex-col items-center gap-2">
              <div>⚠️ {errorMessage}</div>
              {suggestedUsername && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    setUsername(suggestedUsername);
                    setErrorMessage('');
                    setSuggestedUsername(null);
                  }}
                  className="w-full bg-[#10B981] hover:bg-emerald-600 text-white font-black text-xs py-2 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Use Available Username: "{suggestedUsername}" →</span>
                </button>
              )}
              {registeredEmail && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    setEmail(registeredEmail);
                    setMode('login');
                    setErrorMessage('');
                    setRegisteredEmail(null);
                  }}
                  className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-black text-xs py-2 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Switch to Login for "{registeredEmail}" →</span>
                </button>
              )}
              {unregisteredAccount && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playSuccess();
                    setEmail(unregisteredAccount);
                    if (!username) {
                      const derivedUser = unregisteredAccount.includes('@') ? unregisteredAccount.split('@')[0] : unregisteredAccount;
                      setUsername(derivedUser);
                    }
                    setMode('signup');
                    setErrorMessage('');
                    setUnregisteredAccount(null);
                  }}
                  className="w-full bg-[#A855F7] hover:bg-purple-600 text-white font-black text-xs py-2 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account for "{unregisteredAccount}" Now →</span>
                </button>
              )}
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
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" /> Password
                  </label>
                  {password ? (
                    <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md ${isPasswordValid ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' : 'bg-amber-100 text-amber-800 border border-amber-400'}`}>
                      {isPasswordValid ? '✓ Requirements Met' : 'Incomplete'}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-bold text-slate-400">Google passwords supported</span>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#A855F7]"
                />

                {/* Real-time Password Requirements Checklist */}
                <div className="mt-1.5 bg-slate-50 border border-slate-300 rounded-xl p-2 space-y-1">
                  <div className="text-[9.5px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-purple-600" />
                    <span>Password Requirements:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[10px] font-bold">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                      <Check className={`w-3 h-3 shrink-0 ${hasMinLength ? 'text-emerald-600 stroke-[3]' : 'text-slate-300'}`} />
                      <span>At least 6 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                      <Check className={`w-3 h-3 shrink-0 ${hasLetter ? 'text-emerald-600 stroke-[3]' : 'text-slate-300'}`} />
                      <span>Contains letters (A-Z, a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                      <Check className={`w-3 h-3 shrink-0 ${hasNumberOrSymbol ? 'text-emerald-600 stroke-[3]' : 'text-slate-300'}`} />
                      <span>Contains numbers or symbols</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Code Field */}
              <div className="bg-[#F3E8FF] border-2 border-slate-900 rounded-xl p-2.5 mt-0.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-purple-900 uppercase tracking-wide flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-[#A855F7]" />
                    Referral Code (Optional)
                  </label>
                  {isRefCodeAutoFilled && referralCode && (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 text-[9px] font-black px-1.5 py-0.2 rounded-md flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                      Auto-filled from link
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. SLAP-1240"
                  value={referralCode}
                  onChange={(e) => {
                    setReferralCode(e.target.value);
                    if (isRefCodeAutoFilled) setIsRefCodeAutoFilled(false);
                  }}
                  className="w-full bg-white border-2 border-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-black text-slate-900 uppercase focus:outline-none focus:border-[#A855F7]"
                />
                <p className="text-[9.5px] font-bold text-purple-800 mt-1 leading-tight flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#A855F7] shrink-0" />
                  Enter friend's code for <span className="font-black text-slate-950">+100 SP</span> after 20 ads!
                </p>
              </div>

              {/* Terms & Conditions and Privacy Policy Agreement */}
              <div className="bg-slate-50 border-2 border-slate-900 rounded-xl p-2.5 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      sound.playSlap();
                      setAgreedToTerms(e.target.checked);
                      if (errorMessage.includes('Terms') || errorMessage.includes('agree')) {
                        setErrorMessage('');
                      }
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-2 border-slate-900 text-[#A855F7] focus:ring-[#A855F7] cursor-pointer shrink-0 accent-[#A855F7]"
                  />
                  <span className="text-[10.5px] font-bold text-slate-700 leading-tight">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playSlap();
                        setLegalModalTab('terms');
                        setIsLegalModalOpen(true);
                      }}
                      className="font-black text-purple-700 underline hover:text-purple-900 cursor-pointer"
                    >
                      Terms of Service
                    </button>
                    {' '}and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playSlap();
                        setLegalModalTab('privacy');
                        setIsLegalModalOpen(true);
                      }}
                      className="font-black text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    . (Must be 13+, real account, no VPN/proxies/bots).
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isDetectingCountry || isSubmitting}
                className="w-full font-black text-xs py-2.5 rounded-xl border-3 border-slate-900 bg-[#A855F7] text-white hover:bg-purple-600 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isDetectingCountry || isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting to Server...</span>
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full font-black text-xs py-2.5 rounded-xl border-3 border-slate-900 bg-[#FF3B77] text-white hover:bg-rose-600 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all active:scale-95 cursor-pointer mt-1 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Log In to Account</span>
                    <LogIn className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      )}

      {/* Terms of Service & Privacy Policy Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}

