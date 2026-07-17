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

  // A crisp, explosive slapping sound
  public playSlap() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Noise source for the friction slap
      const bufferSize = ctx.sampleRate * 0.08; // 80ms slap
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to sculpt the slap
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(1000, now);
      bandpass.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      bandpass.Q.setValueAtTime(8, now);

      // Low frequency body oscillator for the physical thud
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      // Envelopes
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.6, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.4, now);

      // Connections
      noiseNode.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(masterGain);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      masterGain.connect(ctx.destination);

      // Start and Stop
      noiseNode.start(now);
      noiseNode.stop(now + 0.08);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Web Audio slap failed:', e);
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
