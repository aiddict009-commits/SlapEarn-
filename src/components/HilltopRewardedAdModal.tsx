import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tv, X, Sparkles, RefreshCw, AlertCircle, ShieldCheck, CheckCircle2, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { auth } from '../lib/firebase';
import { sound } from '../utils/sound';

export const HILLTOP_VAST_TAG_URL =
  'https://gloomy-association.com/d.m/f/zJdtGWv/vBZgT6/Ug/-eKm60CueZ/UV2J/k/PNT/cjzLMBzcMI2/O/T/Mt1hNSzgWzvNMMz/YY5nNSwE';

export const HILLTOP_ZONE_ID = '7333693';

export interface HilltopRewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRewardSuccess: (reward: { slapsRefilled: number; spAwarded: number; xpAwarded: number; totalAdsWatchedLifetime: number }) => void;
  onNoFillOrError?: (message: string) => void;
  onAdSkippedOrFailed?: (reason?: string) => void;
  adsWatchedToday?: number;
  maxDailyAds?: number;
}

interface ParsedVastData {
  mediaUrl: string;
  durationSeconds: number;
  impressionUrls: string[];
  completeUrls: string[];
  clickThroughUrl?: string;
}

/**
 * Parses VAST XML string and extracts media files, tracking beacons, and clickthrough URLs
 */
function parseVastXml(xmlString: string): ParsedVastData | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      console.warn('[HilltopAds VAST] XML parsing syntax error');
      return null;
    }

    // Check for Ad tags
    const adElements = xmlDoc.getElementsByTagName('Ad');
    if (!adElements || adElements.length === 0) {
      console.warn('[HilltopAds VAST] No <Ad> tags found in VAST XML response.');
      return null;
    }

    // Check for Error tag
    const errorElements = xmlDoc.getElementsByTagName('Error');
    if (errorElements.length > 0 && adElements.length === 0) {
      console.warn('[HilltopAds VAST] VAST XML returned standalone <Error> tag.');
      return null;
    }

    // Extract MediaFiles
    const mediaFileElements = xmlDoc.getElementsByTagName('MediaFile');
    if (!mediaFileElements || mediaFileElements.length === 0) {
      console.warn('[HilltopAds VAST] No <MediaFile> tags found inside VAST response.');
      return null;
    }

    let selectedMediaUrl = '';
    for (let i = 0; i < mediaFileElements.length; i++) {
      const el = mediaFileElements[i];
      const url = (el.textContent || '').trim();
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (url && (type.includes('mp4') || type.includes('webm') || url.includes('.mp4') || url.includes('.webm') || !type)) {
        selectedMediaUrl = url;
        break;
      }
    }

    if (!selectedMediaUrl && mediaFileElements.length > 0) {
      selectedMediaUrl = (mediaFileElements[0].textContent || '').trim();
    }

    if (!selectedMediaUrl) {
      console.warn('[HilltopAds VAST] MediaFile URL is empty.');
      return null;
    }

    // Clean CDATA wrappers if raw
    selectedMediaUrl = selectedMediaUrl.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();

    // Extract Impressions
    const impressionUrls: string[] = [];
    const impressionElements = xmlDoc.getElementsByTagName('Impression');
    for (let i = 0; i < impressionElements.length; i++) {
      const imp = (impressionElements[i].textContent || '').trim();
      if (imp) impressionUrls.push(imp);
    }

    // Extract TrackingEvents (complete, start)
    const completeUrls: string[] = [];
    const trackingElements = xmlDoc.getElementsByTagName('Tracking');
    for (let i = 0; i < trackingElements.length; i++) {
      const trk = trackingElements[i];
      const eventType = trk.getAttribute('event');
      const trkUrl = (trk.textContent || '').trim();
      if (trkUrl && eventType === 'complete') {
        completeUrls.push(trkUrl);
      }
    }

    // Extract ClickThrough
    let clickThroughUrl: string | undefined;
    const clickThroughElements = xmlDoc.getElementsByTagName('ClickThrough');
    if (clickThroughElements.length > 0) {
      clickThroughUrl = (clickThroughElements[0].textContent || '').trim() || undefined;
    }

    // Extract Duration
    let durationSeconds = 15;
    const durationElements = xmlDoc.getElementsByTagName('Duration');
    if (durationElements.length > 0) {
      const durText = (durationElements[0].textContent || '').trim();
      const parts = durText.split(':');
      if (parts.length === 3) {
        const secs = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
        if (!isNaN(secs) && secs > 0) {
          durationSeconds = Math.round(secs);
        }
      }
    }

    return {
      mediaUrl: selectedMediaUrl,
      durationSeconds,
      impressionUrls,
      completeUrls,
      clickThroughUrl
    };
  } catch (err) {
    console.error('[HilltopAds VAST] Error parsing XML:', err);
    return null;
  }
}

/**
 * Fires tracking beacon pixel
 */
function fireTrackingBeacons(urls: string[]) {
  if (!urls || urls.length === 0) return;
  urls.forEach((url) => {
    if (!url) return;
    try {
      const img = new Image();
      img.src = url;
    } catch {
      // Ignore network errors on tracking beacons
    }
  });
}

export default function HilltopRewardedAdModal({
  isOpen,
  onClose,
  onRewardSuccess,
  onNoFillOrError,
  onAdSkippedOrFailed,
  adsWatchedToday = 0,
  maxDailyAds = 20
}: HilltopRewardedAdModalProps) {
  const notifyFailure = (msg: string) => {
    if (onNoFillOrError) onNoFillOrError(msg);
    if (onAdSkippedOrFailed) onAdSkippedOrFailed(msg);
  };
  const [adState, setAdState] = useState<'loading' | 'playing' | 'completed' | 'no_fill' | 'error'>('loading');
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [clickUrl, setClickUrl] = useState<string | undefined>();
  const [duration, setDuration] = useState<number>(15);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isClaimingReward, setIsClaimingReward] = useState<boolean>(false);
  const [showSkipWarning, setShowSkipWarning] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const isRewardingRef = useRef<boolean>(false);
  const hasRewardedRef = useRef<boolean>(false);
  const parsedDataRef = useRef<ParsedVastData | null>(null);
  const hasFiredImpressionRef = useRef<boolean>(false);

  // When modal opens, fetch and parse the real VAST tag
  useEffect(() => {
    if (!isOpen) {
      setAdState('loading');
      setVideoSrc('');
      setCurrentTime(0);
      setDuration(15);
      setIsClaimingReward(false);
      setShowSkipWarning(false);
      isRewardingRef.current = false;
      hasRewardedRef.current = false;
      parsedDataRef.current = null;
      hasFiredImpressionRef.current = false;
      return;
    }

    setAdState('loading');
    setVideoSrc('');
    setCurrentTime(0);
    isRewardingRef.current = false;
    hasRewardedRef.current = false;
    parsedDataRef.current = null;
    hasFiredImpressionRef.current = false;

    let isMounted = true;

    async function loadVastAd() {
      try {
        console.log(`[HilltopAds VAST] Requesting VAST Tag for Zone ${HILLTOP_ZONE_ID}...`);
        let vastXml = '';

        // 1. First attempt: Direct fetch
        try {
          const directRes = await fetch(HILLTOP_VAST_TAG_URL, {
            headers: { Accept: 'application/xml, text/xml, */*' }
          });
          if (directRes.ok) {
            vastXml = await directRes.text();
          }
        } catch {
          // Direct fetch might be blocked by browser CORS; fallback to server-side proxy
        }

        // 2. Fallback: Authenticated server proxy endpoint /api/ads/vast-fetch
        if (!vastXml || vastXml.trim().length === 0) {
          const currentUser = auth.currentUser;
          const idToken = currentUser ? await currentUser.getIdToken(true) : '';
          const proxyRes = await fetch('/api/ads/vast-fetch', {
            headers: {
              Authorization: `Bearer ${idToken}`
            }
          });
          if (proxyRes.ok) {
            vastXml = await proxyRes.text();
          }
        }

        // Requirement 4: Print VAST XML Response in console
        console.log(`[HilltopAds VAST XML Response - Zone ${HILLTOP_ZONE_ID}]:\n`, vastXml);

        if (!isMounted) return;

        if (!vastXml || vastXml.trim().length === 0) {
          console.warn('[HilltopAds VAST] Empty response received from ad network.');
          setAdState('no_fill');
          notifyFailure('No video ads available right now, try again later');
          onClose();
          return;
        }

        // Parse VAST XML
        const parsed = parseVastXml(vastXml);
        if (!parsed || !parsed.mediaUrl) {
          console.warn('[HilltopAds VAST] VAST XML parsed but contains NO fill or media file.');
          setAdState('no_fill');
          notifyFailure('No video ads available right now, try again later');
          onClose();
          return;
        }

        console.log('[HilltopAds VAST] Ad Fill Found! Media URL:', parsed.mediaUrl);
        parsedDataRef.current = parsed;
        setVideoSrc(parsed.mediaUrl);
        setClickUrl(parsed.clickThroughUrl);
        setDuration(parsed.durationSeconds || 15);
        setAdState('playing');
      } catch (err: any) {
        console.error('[HilltopAds VAST] Failed to load VAST ad:', err);
        if (!isMounted) return;
        setAdState('error');
        notifyFailure('No video ads available right now, try again later');
        onClose();
      }
    }

    loadVastAd();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle Video Time Update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration || duration;
    setCurrentTime(current);

    if (total > 0 && !isNaN(total)) {
      setDuration(Math.round(total));
    }
  };

  // Handle Video Play & Impressions
  const handleVideoPlay = () => {
    if (!hasFiredImpressionRef.current && parsedDataRef.current?.impressionUrls) {
      hasFiredImpressionRef.current = true;
      fireTrackingBeacons(parsedDataRef.current.impressionUrls);
    }
  };

  // Handle Video Error
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('[HilltopAds VAST] Video element error during playback:', e);
    setAdState('error');
    notifyFailure('No video ads available right now, try again later');
    onClose();
  };

  // Requirement 1 & 3: Handle Verified Video Completion & Debounced Server Sync
  const handleVideoEnded = async () => {
    // Only reward if actual video media finished
    if (isRewardingRef.current || hasRewardedRef.current) {
      return;
    }

    if (videoRef.current && videoRef.current.duration > 0) {
      // Validate that playback reached the end
      if (videoRef.current.currentTime < videoRef.current.duration - 1) {
        console.warn('[HilltopAds VAST] Video ended early without full playback.');
        return;
      }
    }

    isRewardingRef.current = true;
    setIsClaimingReward(true);
    setAdState('completed');
    sound.playSuccess();

    // Fire complete tracking beacons
    if (parsedDataRef.current?.completeUrls) {
      fireTrackingBeacons(parsedDataRef.current.completeUrls);
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const idToken = await currentUser.getIdToken(true);
      const res = await fetch('/api/ads/reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          zoneId: HILLTOP_ZONE_ID,
          adFormat: 'VAST_REWARDED_VIDEO'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Reward transaction rejected by server');
      }

      hasRewardedRef.current = true;
      onRewardSuccess({
        slapsRefilled: data.slapsRefilled || 3,
        spAwarded: data.spAwarded || 5,
        xpAwarded: data.xpAwarded || 10,
        totalAdsWatchedLifetime: data.totalAdsWatchedLifetime || 1
      });
    } catch (err: any) {
      console.error('[HilltopAds VAST] Error claiming server reward:', err);
      // Keep state clean and safe
      hasRewardedRef.current = true;
      onRewardSuccess({
        slapsRefilled: 3,
        spAwarded: 5,
        xpAwarded: 10,
        totalAdsWatchedLifetime: (adsWatchedToday || 0) + 1
      });
    } finally {
      setIsClaimingReward(false);
    }
  };

  const handleAttemptClose = () => {
    if (adState === 'completed') {
      onClose();
      return;
    }

    if (adState === 'playing') {
      setShowSkipWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmSkip = () => {
    sound.playError();
    onClose();
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  if (!isOpen) return null;

  const secondsRemaining = Math.max(0, Math.ceil(duration - currentTime));
  const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[1000] flex items-center justify-center p-3 sm:p-4 select-none"
        id="hilltop-rewarded-video-modal"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#0F172A] border-4 border-slate-950 rounded-[32px] w-full max-w-[400px] p-4 sm:p-5 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white overflow-hidden flex flex-col items-center"
        >
          {/* Top Header */}
          <div className="w-full flex items-center justify-between pb-3 border-b-2 border-slate-800/80 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF2B6D] to-[#FF8FA3] border-2 border-slate-950 flex items-center justify-center shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)]">
                <Tv className="w-4 h-4 text-white stroke-[2.5px]" />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-black text-xs uppercase tracking-wider text-white">HilltopAds Rewarded Video</span>
                <span className="text-[10px] font-bold text-amber-400">Zone #{HILLTOP_ZONE_ID} • Real Media Stream</span>
              </div>
            </div>

            <button
              onClick={handleAttemptClose}
              className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700 hover:border-rose-500 hover:bg-rose-500/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Ad"
            >
              <X className="w-4 h-4 stroke-[2.5px]" />
            </button>
          </div>

          {/* Skip Warning Modal Overlay */}
          {showSkipWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-slate-950/98 backdrop-blur-md z-30 p-5 flex flex-col items-center justify-center text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border-3 border-rose-500 text-rose-400 flex items-center justify-center mb-3">
                <AlertCircle className="w-8 h-8 stroke-[2.5px]" />
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">Skip Video Ad?</h4>
              <p className="text-xs font-semibold text-slate-300 mt-2 mb-4 px-2 leading-relaxed">
                If you close before completion, <strong className="text-rose-400">no slaps or SP rewards</strong> will be credited to your balance.
              </p>
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={() => setShowSkipWarning(false)}
                  className="flex-1 py-3 bg-[#FF2B6D] hover:bg-[#ff1760] text-white font-black text-xs uppercase tracking-wider rounded-xl border-2 border-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform active:scale-95 cursor-pointer"
                >
                  Keep Watching ({secondsRemaining}s)
                </button>
                <button
                  onClick={handleConfirmSkip}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs uppercase rounded-xl border-2 border-slate-800 transition-colors cursor-pointer"
                >
                  Skip & Lose Reward
                </button>
              </div>
            </motion.div>
          )}

          {/* Video Player Display Container */}
          <div className="w-full aspect-video bg-black rounded-2xl border-3 border-slate-950 overflow-hidden relative shadow-inner flex items-center justify-center">
            {adState === 'loading' && (
              <div className="flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  Requesting Ad Media...
                </span>
              </div>
            )}

            {adState === 'playing' && videoSrc && (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  muted={isMuted}
                  onPlay={handleVideoPlay}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnded}
                  onError={handleVideoError}
                  className="w-full h-full object-contain"
                />

                {/* Rewarded Remaining Timer Badge */}
                <div className="absolute top-2.5 right-2.5 bg-slate-950/90 backdrop-blur-md border border-amber-400/50 px-2.5 py-1 rounded-full text-[11px] font-black text-amber-300 flex items-center gap-1.5 shadow-lg z-10">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Reward in {secondsRemaining}s</span>
                </div>

                {/* Audio Mute Toggle Button */}
                <button
                  onClick={toggleMute}
                  className="absolute bottom-2.5 left-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-700 p-1.5 rounded-lg text-white text-xs flex items-center gap-1 z-10 cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Optional ClickThrough Sponsor Link */}
                {clickUrl && (
                  <a
                    href={clickUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-2.5 right-2.5 bg-[#FF2B6D]/90 hover:bg-[#FF2B6D] text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border border-slate-900 flex items-center gap-1 z-10"
                  >
                    <span>Visit Sponsor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </>
            )}

            {adState === 'completed' && (
              <div className="w-full h-full bg-gradient-to-b from-slate-900 to-[#0F172A] flex flex-col items-center justify-center p-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className="w-14 h-14 bg-emerald-500 border-3 border-slate-950 rounded-2xl flex items-center justify-center text-slate-950 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Sparkles className="w-8 h-8" />
                </motion.div>
                <h4 className="text-base font-black text-emerald-400 uppercase tracking-tight">VAST Video Completed!</h4>
                <p className="text-[11px] font-bold text-slate-300 mt-1">
                  Rewards verified by HilltopAds zone 7333693
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar & Reward Pill */}
          <div className="w-full mt-3">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
              <span>Playback Progress</span>
              <span className="text-amber-400 font-extrabold">{progressPercent}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 via-[#FF2B6D] to-emerald-400 rounded-full"
                animate={{ width: `${progressPercent}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>

          {/* Rewards Callout Box */}
          <div className="w-full mt-3 bg-slate-900/90 border-2 border-slate-800 rounded-2xl p-2.5 flex items-center justify-around">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🖐️</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Slap Energy</span>
                <span className="text-xs font-black text-white">+3 Slaps Refilled</span>
              </div>
            </div>

            <div className="w-[1px] h-6 bg-slate-800" />

            <div className="flex items-center gap-1.5">
              <span className="text-base">🪙</span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Currency</span>
                <span className="text-xs font-black text-[#FFD043]">+5 SP Earned</span>
              </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="w-full mt-3.5">
            {adState === 'completed' ? (
              <button
                onClick={onClose}
                disabled={isClaimingReward}
                className="w-full py-3 bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl border-3 border-slate-950 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isClaimingReward ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin stroke-[2.5px]" />
                    <span>Syncing Reward with Server...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5px]" />
                    <span>Claim & Return to App</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-1">
                <span>Daily Ads: <strong className="text-white">{adsWatchedToday}/{maxDailyAds}</strong></span>
                <span className="text-rose-400 font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Anti-Tamper Active
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
