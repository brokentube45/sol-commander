/**
 * Procedural Web Audio synthesizer & optional Web Speech narration
 * for SOL COMMANDER (Phase 1 & Phase 2 Cinematic + Gameplay).
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;
  private voiceOverEnabled = true;
  private ambientGain: GainNode | null = null;
  private ambientSources: AudioNode[] = [];
  private weatherGain: GainNode | null = null;
  private weatherSources: AudioNode[] = [];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isVoiceOverEnabled(): boolean {
    return this.voiceOverEnabled;
  }

  public setVoiceOverEnabled(next: boolean): void {
    this.voiceOverEnabled = next;
    if (!next) {
      this.stopNarration();
    }
  }

  public setEnabled(next: boolean): boolean {
    this.enabled = next;
    if (next) {
      const ctx = this.ensureContext();
      if (ctx) {
        this.startAmbient(ctx);
        this.playToggleOn();
      }
    } else {
      this.stopAmbient();
      this.stopWeatherLoop();
      this.stopNarration();
    }
    return this.enabled;
  }

  private startAmbient(ctx: AudioContext): void {
    this.stopAmbient();
    try {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.2);
      masterGain.connect(ctx.destination);

      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.setValueAtTime(110, ctx.currentTime);

      const oscE = ctx.createOscillator();
      oscE.type = 'triangle';
      oscE.frequency.setValueAtTime(164.81, ctx.currentTime);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.55, ctx.currentTime);

      oscA.connect(filter);
      oscE.connect(filter);
      filter.connect(padGain);
      padGain.connect(masterGain);

      // Soft Martian breeze
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
      }
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(240, ctx.currentTime);
      windFilter.Q.setValueAtTime(1.4, ctx.currentTime);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.45, ctx.currentTime);

      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(masterGain);

      oscA.start();
      oscE.start();
      noise.start();

      this.ambientGain = masterGain;
      this.ambientSources = [oscA, oscE, noise];
    } catch {
      // Safe fallback
    }
  }

  private stopAmbient(): void {
    const ctx = this.ctx;
    if (ctx && this.ambientGain) {
      try {
        const now = ctx.currentTime;
        this.ambientGain.gain.cancelScheduledValues(now);
        this.ambientGain.gain.setValueAtTime(Math.max(this.ambientGain.gain.value, 0.0001), now);
        this.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } catch {
        // Ignore ramp errors
      }
    }
    const sources = this.ambientSources;
    this.ambientSources = [];
    this.ambientGain = null;
    window.setTimeout(() => {
      sources.forEach((node) => {
        try {
          if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
            (node as AudioScheduledSourceNode).stop();
          }
          node.disconnect();
        } catch {
          // Already stopped
        }
      });
    }, 280);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.08,
    delay = 0,
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Safe fallback
    }
  }

  public playToggleOn(): void {
    this.playTone(523.25, 0.14, 'sine', 0.08, 0);
    this.playTone(659.25, 0.18, 'sine', 0.08, 0.07);
  }

  public playClick(): void {
    this.playTone(587.33, 0.09, 'triangle', 0.07, 0);
  }

  public playInspect(): void {
    this.playTone(440, 0.12, 'sine', 0.07, 0);
    this.playTone(659.25, 0.16, 'sine', 0.06, 0.06);
  }

  public playMissionStart(): void {
    this.playTone(392.0, 0.2, 'triangle', 0.09, 0);
    this.playTone(523.25, 0.24, 'triangle', 0.09, 0.1);
    this.playTone(659.25, 0.28, 'sine', 0.09, 0.2);
    this.playTone(783.99, 0.45, 'sine', 0.1, 0.32);
  }

  public playSceneCue(sceneIndex: number): void {
    if (!this.enabled) return;
    switch (sceneIndex) {
      case 0:
        this.playTone(220, 1.2, 'sine', 0.07, 0);
        this.playTone(329.63, 1.4, 'sine', 0.06, 0.18);
        break;
      case 1:
        this.playTone(293.66, 0.8, 'triangle', 0.06, 0);
        this.playTone(440, 1.0, 'sine', 0.06, 0.16);
        break;
      case 2:
        this.playTone(392, 0.9, 'sine', 0.07, 0);
        this.playTone(523.25, 1.1, 'sine', 0.06, 0.22);
        break;
      case 3:
        // Subtle space-weather radar chime
        this.playTone(698.46, 0.22, 'triangle', 0.07, 0);
        this.playTone(587.33, 0.32, 'triangle', 0.07, 0.24);
        break;
      case 4:
        this.playTone(440, 0.25, 'triangle', 0.08, 0);
        this.playTone(554.37, 0.3, 'triangle', 0.08, 0.14);
        this.playTone(659.25, 0.55, 'sine', 0.09, 0.28);
        break;
      default:
        break;
    }
  }

  public playTutorialComplete(): void {
    this.playTone(523.25, 0.12, 'sine', 0.07, 0);
    this.playTone(659.25, 0.15, 'sine', 0.07, 0.08);
    this.playTone(783.99, 0.24, 'sine', 0.08, 0.16);
  }

  public playConsoleActivate(): void {
    this.playTone(349.23, 0.14, 'triangle', 0.07, 0);
    this.playTone(523.25, 0.2, 'sine', 0.08, 0.09);
  }

  public playDustDevilAlert(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    // Urgent MEDA weather radar beacon + pressure drop whoosh
    this.playTone(784, 0.12, 'triangle', 0.1, 0);
    this.playTone(1046.5, 0.16, 'triangle', 0.1, 0.13);
    this.playTone(784, 0.12, 'triangle', 0.09, 0.3);
    this.playTone(1046.5, 0.22, 'sine', 0.1, 0.43);
  }

  public startWeatherLoop(
    kind: 'dust-devil' | 'katabatic-gust' | 'electrostatic-squall',
    rumbleIntensity = 0.85,
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopWeatherLoop();

    try {
      const now = ctx.currentTime;
      const rumbleScale = Math.max(0.25, Math.min(1, rumbleIntensity));
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.16, now + 0.75);
      master.connect(ctx.destination);

      // Textured pink/brown Martian dust wind buffer
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        const grit = kind === 'electrostatic-squall' && Math.random() < 0.004 ? white * 0.85 : 0;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 0.18 + grit));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      // Swirling vortex bandpass filter
      const vortexFilter = ctx.createBiquadFilter();
      vortexFilter.type = 'bandpass';
      const baseFreq = kind === 'katabatic-gust' ? 240 : kind === 'electrostatic-squall' ? 420 : 340;
      vortexFilter.frequency.setValueAtTime(baseFreq, now);
      vortexFilter.Q.setValueAtTime(kind === 'dust-devil' ? 2.6 : 1.7, now);

      // LFO sweeping filter frequency to create spinning dust-devil whoosh
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(kind === 'dust-devil' ? 1.45 : 0.95, now);

      const lfoFreqGain = ctx.createGain();
      lfoFreqGain.gain.setValueAtTime(kind === 'dust-devil' ? 210 : 145, now);
      lfo.connect(lfoFreqGain);
      lfoFreqGain.connect(vortexFilter.frequency);

      // Continuous low-frequency Martian rumble (dual sub-oscillators + brown rumble noise + tremor LFO)
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.setValueAtTime(0.42 * rumbleScale, now);

      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.setValueAtTime(105, now);
      rumbleFilter.Q.setValueAtTime(1.2, now);

      const rumbleSubOsc = ctx.createOscillator();
      rumbleSubOsc.type = 'sine';
      rumbleSubOsc.frequency.setValueAtTime(kind === 'katabatic-gust' ? 36 : 40, now);
      const rumbleSubGain = ctx.createGain();
      rumbleSubGain.gain.setValueAtTime(0.52, now);

      const rumbleHarmonicOsc = ctx.createOscillator();
      rumbleHarmonicOsc.type = 'triangle';
      rumbleHarmonicOsc.frequency.setValueAtTime(kind === 'katabatic-gust' ? 54 : 58, now);
      const rumbleHarmonicGain = ctx.createGain();
      rumbleHarmonicGain.gain.setValueAtTime(0.22, now);

      const rumbleNoise = ctx.createBufferSource();
      rumbleNoise.buffer = noiseBuffer;
      rumbleNoise.loop = true;
      const rumbleNoiseGain = ctx.createGain();
      rumbleNoiseGain.gain.setValueAtTime(0.75, now);

      const rumbleLfo = ctx.createOscillator();
      rumbleLfo.type = 'sine';
      rumbleLfo.frequency.setValueAtTime(0.28, now);
      const rumbleLfoGain = ctx.createGain();
      rumbleLfoGain.gain.setValueAtTime(0.14 * rumbleScale, now);
      rumbleLfo.connect(rumbleLfoGain);
      rumbleLfoGain.connect(rumbleGain.gain);

      noise.connect(vortexFilter);
      vortexFilter.connect(master);

      rumbleSubOsc.connect(rumbleSubGain);
      rumbleSubGain.connect(rumbleFilter);
      rumbleHarmonicOsc.connect(rumbleHarmonicGain);
      rumbleHarmonicGain.connect(rumbleFilter);
      rumbleNoise.connect(rumbleNoiseGain);
      rumbleNoiseGain.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(master);

      noise.start(now);
      lfo.start(now);
      rumbleSubOsc.start(now);
      rumbleHarmonicOsc.start(now);
      rumbleNoise.start(now);
      rumbleLfo.start(now);

      this.weatherGain = master;
      this.weatherSources = [
        noise,
        lfo,
        rumbleSubOsc,
        rumbleHarmonicOsc,
        rumbleNoise,
        rumbleLfo,
        vortexFilter,
        lfoFreqGain,
        rumbleFilter,
        rumbleSubGain,
        rumbleHarmonicGain,
        rumbleNoiseGain,
        rumbleLfoGain,
        rumbleGain,
      ];
    } catch {
      // Safe fallback
    }
  }

  public stopWeatherLoop(): void {
    const ctx = this.ctx;
    if (ctx && this.weatherGain) {
      try {
        const now = ctx.currentTime;
        this.weatherGain.gain.cancelScheduledValues(now);
        this.weatherGain.gain.setValueAtTime(Math.max(this.weatherGain.gain.value, 0.0001), now);
        this.weatherGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      } catch {
        // Ignore ramp errors
      }
    }
    const sources = this.weatherSources;
    this.weatherSources = [];
    this.weatherGain = null;
    if (sources.length > 0) {
      window.setTimeout(() => {
        sources.forEach((node) => {
          try {
            if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
              (node as AudioScheduledSourceNode).stop();
            }
            node.disconnect();
          } catch {
            // Already stopped
          }
        });
      }, 380);
    }
  }

  public playWindGust(
    strength = 0.8,
    kind: 'dust-devil' | 'katabatic-gust' | 'electrostatic-squall' = 'dust-devil',
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const s = Math.max(0.35, Math.min(1, strength));
      const dur = 1.85;

      // 1. Pink/white noise buffer for sweeping wind whoosh & airborne grit
      const bufferSize = Math.floor(ctx.sampleRate * (dur + 0.1));
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.22) * 0.22));
      }

      const windNoise = ctx.createBufferSource();
      windNoise.buffer = noiseBuffer;

      const sweepFilter = ctx.createBiquadFilter();
      sweepFilter.type = 'bandpass';
      sweepFilter.Q.setValueAtTime(kind === 'dust-devil' ? 2.5 : 2.1, now);
      const peakFreq =
        (kind === 'electrostatic-squall' ? 660 : kind === 'katabatic-gust' ? 500 : 590) *
        (0.85 + 0.2 * s);
      sweepFilter.frequency.setValueAtTime(180, now);
      sweepFilter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.52);
      sweepFilter.frequency.exponentialRampToValueAtTime(240, now + dur);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.0001, now);
      windGain.gain.exponentialRampToValueAtTime(0.16 * s, now + 0.48);
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      windNoise.connect(sweepFilter);
      sweepFilter.connect(windGain);
      windGain.connect(ctx.destination);

      // 2. Highpass airborne dust grit accent
      const gritNoise = ctx.createBufferSource();
      gritNoise.buffer = noiseBuffer;

      const gritFilter = ctx.createBiquadFilter();
      gritFilter.type = 'highpass';
      gritFilter.frequency.setValueAtTime(1600, now);

      const gritGain = ctx.createGain();
      gritGain.gain.setValueAtTime(0.0001, now);
      gritGain.gain.exponentialRampToValueAtTime(0.045 * s, now + 0.5);
      gritGain.gain.exponentialRampToValueAtTime(0.0001, now + dur - 0.1);

      gritNoise.connect(gritFilter);
      gritFilter.connect(gritGain);
      gritGain.connect(ctx.destination);

      // 3. Low-frequency gust pressure thump
      const thumpOsc = ctx.createOscillator();
      thumpOsc.type = 'triangle';
      thumpOsc.frequency.setValueAtTime(48, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(34, now + 0.9);

      const thumpGain = ctx.createGain();
      thumpGain.gain.setValueAtTime(0.0001, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.11 * s, now + 0.26);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

      thumpOsc.connect(thumpGain);
      thumpGain.connect(ctx.destination);

      windNoise.start(now);
      gritNoise.start(now);
      thumpOsc.start(now);

      windNoise.stop(now + dur + 0.05);
      gritNoise.stop(now + dur + 0.05);
      thumpOsc.stop(now + 1.3);

      const nodes: AudioNode[] = [
        windNoise,
        sweepFilter,
        windGain,
        gritNoise,
        gritFilter,
        gritGain,
        thumpOsc,
        thumpGain,
      ];
      window.setTimeout(() => {
        nodes.forEach((n) => {
          try {
            n.disconnect();
          } catch {
            // Already disconnected
          }
        });
      }, 2050);
    } catch {
      // Safe fallback
    }
  }

  public playShelterSafe(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      // Heavy mechanical airlock bulkhead seal thud
      const now = ctx.currentTime;
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(105, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.22);
      thudGain.gain.setValueAtTime(0.18, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.26);
    } catch {
      // Safe fallback
    }

    // Warm safe-in-habitat confirmation chord
    this.playTone(523.25, 0.14, 'sine', 0.08, 0.18);
    this.playTone(659.25, 0.16, 'sine', 0.08, 0.28);
    this.playTone(783.99, 0.28, 'sine', 0.09, 0.38);
  }

  public playWeatherExposed(): void {
    if (!this.enabled) return;
    this.playTone(233.08, 0.18, 'sawtooth', 0.08, 0);
    this.playTone(174.61, 0.3, 'sawtooth', 0.08, 0.18);
  }

  public speakCaption(text: string): void {
    if (!this.enabled || !this.voiceOverEnabled) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 0.8;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors in restricted sandboxes
    }
  }

  public stopNarration(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new SoundEngine();
