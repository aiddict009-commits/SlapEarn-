// Web Audio API Sound Synthesizer for SlapEarn
// Provides instant tactical auditory feedback without any external asset latency

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  // Cute, playful anime-style sound ("Pico! / Kyun!") with bouncy pitch sweep, soft tactile tap & sweet anime sparkle
  public playSlap() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // 1. Soft anime tactile tap (filtered soft noise)
      const bufferSize = Math.floor(ctx.sampleRate * 0.035); // 35ms soft impact
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'highpass';
      bandpass.frequency.setValueAtTime(1800, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      // 2. Iconic Anime Cute Pitch Chirp ("Kyun! / Pico!")
      // Rapid upward pitch jump gives the signature anime sound effect feel
      const animeChirp = ctx.createOscillator();
      animeChirp.type = 'sine';
      animeChirp.frequency.setValueAtTime(700, now);
      animeChirp.frequency.exponentialRampToValueAtTime(1950, now + 0.045);
      animeChirp.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

      const chirpGain = ctx.createGain();
      chirpGain.gain.setValueAtTime(0.38, now);
      chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

      // 3. Cute Bouncy Pop/Bloop ("Poyon!")
      const popOsc = ctx.createOscillator();
      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(450, now);
      popOsc.frequency.exponentialRampToValueAtTime(980, now + 0.03);
      popOsc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

      const popGain = ctx.createGain();
      popGain.gain.setValueAtTime(0.28, now);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      // 4. Sparkling Anime Twinkle Chime ("Kira Kira!")
      // High-pitched dual sine sparkles: E6 (1318Hz) -> B6 (1975Hz) -> E7 (2637Hz)
      const sparkle1 = ctx.createOscillator();
      const sparkle2 = ctx.createOscillator();

      sparkle1.type = 'sine';
      sparkle1.frequency.setValueAtTime(1318.51, now); // E6
      sparkle1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.05); // B6

      sparkle2.type = 'sine';
      sparkle2.frequency.setValueAtTime(1975.53, now + 0.015); // B6
      sparkle2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.07); // E7

      const sparkleGain1 = ctx.createGain();
      sparkleGain1.gain.setValueAtTime(0.2, now);
      sparkleGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      const sparkleGain2 = ctx.createGain();
      sparkleGain2.gain.setValueAtTime(0.22, now + 0.015);
      sparkleGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      // Master output node
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.4, now);

      // Connections
      noiseNode.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(masterGain);

      animeChirp.connect(chirpGain);
      chirpGain.connect(masterGain);

      popOsc.connect(popGain);
      popGain.connect(masterGain);

      sparkle1.connect(sparkleGain1);
      sparkleGain1.connect(masterGain);

      sparkle2.connect(sparkleGain2);
      sparkleGain2.connect(masterGain);

      masterGain.connect(ctx.destination);

      // Trigger all sounds
      noiseNode.start(now);
      noiseNode.stop(now + 0.035);

      animeChirp.start(now);
      animeChirp.stop(now + 0.085);

      popOsc.start(now);
      popOsc.stop(now + 0.065);

      sparkle1.start(now);
      sparkle1.stop(now + 0.07);

      sparkle2.start(now + 0.015);
      sparkle2.stop(now + 0.095);
    } catch (e) {
      console.warn('Web Audio cute anime slap failed:', e);
    }
  }

  // High pitched pleasant metal-coin chime
  public playCoin() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Resonant dual oscillators for metallic timbre
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(950, now); // Primary frequency
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1430, now); // Ring frequency (overtone)

      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const master = ctx.createGain();

      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      gain2.gain.setValueAtTime(0.25, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      master.gain.setValueAtTime(0.4, now);

      osc1.connect(gain1);
      osc2.connect(gain2);

      gain1.connect(master);
      gain2.connect(master);

      master.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.4);

      osc2.start(now);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('Web Audio coin failed:', e);
    }
  }

  // Upward major triad arpeggio for task completions
  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

      notes.forEach((freq, index) => {
        const time = now + index * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.3);
      });
    } catch (e) {
      console.warn('Web Audio success failed:', e);
    }
  }

  // Ascending energetic laser arpeggio for leveling up
  public playLevelUp() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const notes = [196.00, 293.66, 392.00, 587.33, 783.99, 1174.66]; // G3, D4, G4, D5, G5, D6

      notes.forEach((freq, index) => {
        const time = now + index * 0.06;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Richer harmonics
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, time + 0.15);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.4);
      });
    } catch (e) {
      console.warn('Web Audio levelUp failed:', e);
    }
  }

  // Low dual tone buzz for errors or lockouts
  public playError() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(110, now);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(112, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);
      osc2.start(now);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn('Web Audio error failed:', e);
    }
  }
}

export const sound = new SoundSynthesizer();
