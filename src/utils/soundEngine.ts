import { MARS_FACTS } from '../sim/constants';
import { computeSoundDelaySeconds } from '../sim/marsPhysics';

export interface SoundMixerLevels {
  master: number; // 0..1
  ambience: number; // 0..1
  effects: number; // 0..1
}

export type OutpostAudioZone =
  | 'outdoors'
  | 'habitat'
  | 'greenhouse'
  | 'solar'
  | 'tank-recycler'
  | 'wind-field';

/**
 * Procedural Martian Web Audio Synthesizer (zero pre-recorded files, zero TTS).
 * Simulates thin CO2 (-20 dB high-freq attenuation), 240 m/s sound speed delay,
 * EVA suit breathing & PLSS fan, habitat low-pass muffler, footsteps, and 3D Rover telemetry.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled = false;

  private masterBus: GainNode | null = null;
  private ambienceBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private mixer: SoundMixerLevels = { master: 0.85, ambience: 0.75, effects: 0.85 };

  private ambientGain: GainNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private windBandFilter: BiquadFilterNode | null = null;
  private windNoiseGain: GainNode | null = null;
  private habitatHumGain: GainNode | null = null;
  private greenhouseGain: GainNode | null = null;
  private solarHumGain: GainNode | null = null;
  private tankPumpGain: GainNode | null = null;
  private windFieldSwishGain: GainNode | null = null;
  private suitBreathGain: GainNode | null = null;
  private ambientSources: AudioNode[] = [];

  private weatherGain: GainNode | null = null;
  private weatherSources: AudioNode[] = [];

  private roverPanner: PannerNode | null = null;
  private roverMotorGain: GainNode | null = null;
  private roverMotorOsc: OscillatorNode | null = null;
  private roverLowpass: BiquadFilterNode | null = null;
  private lastRoverPingAt = 0;

  private insideHabitat = false;
  private outsideEvaActive = false;
  private currentZone: OutpostAudioZone = 'outdoors';

  private roverVoiceEnabled = true;
  private roverHushed = false;
  private speechSpeaking = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterBus = this.ctx.createGain();
      this.masterBus.gain.setValueAtTime(this.mixer.master, this.ctx.currentTime);
      this.masterBus.connect(this.ctx.destination);

      this.ambienceBus = this.ctx.createGain();
      this.ambienceBus.gain.setValueAtTime(this.mixer.ambience, this.ctx.currentTime);
      this.ambienceBus.connect(this.masterBus);

      this.effectsBus = this.ctx.createGain();
      this.effectsBus.gain.setValueAtTime(this.mixer.effects, this.ctx.currentTime);
      this.effectsBus.connect(this.masterBus);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getMixerLevels(): SoundMixerLevels {
    return { ...this.mixer };
  }

  public setMixerLevels(next: Partial<SoundMixerLevels>): void {
    this.mixer = {
      master: Math.max(0, Math.min(1, next.master ?? this.mixer.master)),
      ambience: Math.max(0, Math.min(1, next.ambience ?? this.mixer.ambience)),
      effects: Math.max(0, Math.min(1, next.effects ?? this.mixer.effects)),
    };
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterBus?.gain.setTargetAtTime(this.mixer.master, now, 0.04);
    this.ambienceBus?.gain.setTargetAtTime(this.mixer.ambience, now, 0.04);
    this.effectsBus?.gain.setTargetAtTime(this.mixer.effects, now, 0.04);
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
      this.stopRoverSpatial();
    }
    return this.enabled;
  }

  public setInsideHabitat(inside: boolean): void {
    if (this.insideHabitat === inside) return;
    this.insideHabitat = inside;
    if (!this.enabled || !this.ctx) return;

    this.playAirlockHiss();
    this.applyZoneMix(this.ctx, this.currentZone);
  }

  public setPlayerZone(zone: OutpostAudioZone): void {
    if (this.currentZone === zone) return;
    const prevZone = this.currentZone;
    this.currentZone = zone;
    if (!this.enabled || !this.ctx) return;

    // Gentle acoustic doorway cue when stepping into or out of pressurized zones
    if (
      (zone === 'greenhouse' || prevZone === 'greenhouse') &&
      zone !== 'habitat' &&
      prevZone !== 'habitat'
    ) {
      this.playTone(zone === 'greenhouse' ? 493.88 : 392.0, 0.14, 'sine', 0.035, 0);
    }

    this.applyZoneMix(this.ctx, zone);
  }

  public getPlayerZone(): OutpostAudioZone {
    return this.currentZone;
  }

  public setOutsideEvaActive(active: boolean): void {
    if (this.outsideEvaActive === active) return;
    this.outsideEvaActive = active;
    this.syncBreathGain();
  }

  private syncBreathGain(): void {
    if (!this.ctx || !this.suitBreathGain) return;
    const enclosed = this.insideHabitat || this.currentZone === 'habitat' || this.currentZone === 'greenhouse';
    const target = this.outsideEvaActive && !enclosed ? 0.25 : 0.0001;
    this.suitBreathGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.28);
  }

  private applyZoneMix(ctx: AudioContext, zone: OutpostAudioZone): void {
    const now = ctx.currentTime;
    const inHab = this.insideHabitat || zone === 'habitat';
    const inGh = zone === 'greenhouse';
    const inSolar = zone === 'solar';
    const inTank = zone === 'tank-recycler';
    const inWind = zone === 'wind-field';

    // Lowpass filter muffles exterior Martian wind when inside habitat or greenhouse dome
    const envCutoff = inHab ? 115 : inGh ? 175 : inSolar ? 390 : inWind ? 460 : 340;
    this.ambientFilter?.frequency.setTargetAtTime(envCutoff, now, 0.35);

    // Martian wind band & gain shift dynamically by zone
    const windFreq = inWind ? 275 : inSolar ? 245 : inGh ? 160 : 210;
    const windLevel = inHab ? 0.18 : inGh ? 0.2 : inWind ? 0.85 : 0.55;
    this.windBandFilter?.frequency.setTargetAtTime(windFreq, now, 0.35);
    this.windNoiseGain?.gain.setTargetAtTime(windLevel, now, 0.35);

    // Zone-specific ambient layers
    this.habitatHumGain?.gain.setTargetAtTime(inHab ? 0.36 : 0.0001, now, 0.35);
    this.greenhouseGain?.gain.setTargetAtTime(inGh ? 0.42 : 0.0001, now, 0.38);
    this.solarHumGain?.gain.setTargetAtTime(inSolar ? 0.34 : 0.0001, now, 0.35);
    this.tankPumpGain?.gain.setTargetAtTime(inTank ? 0.34 : 0.0001, now, 0.35);
    this.windFieldSwishGain?.gain.setTargetAtTime(inWind ? 0.38 : 0.0001, now, 0.35);

    this.syncBreathGain();
  }

  private startAmbient(ctx: AudioContext): void {
    this.stopAmbient();
    if (!this.ambienceBus) return;

    try {
      const now = ctx.currentTime;
      const rootGain = ctx.createGain();
      rootGain.gain.setValueAtTime(0.0001, now);
      rootGain.gain.exponentialRampToValueAtTime(0.072, now + 1.0);
      rootGain.connect(this.ambienceBus);

      // Subtle atmospheric harmonic pad
      const oscA = ctx.createOscillator();
      oscA.type = 'sine';
      oscA.frequency.setValueAtTime(110, now);

      const oscE = ctx.createOscillator();
      oscE.type = 'triangle';
      oscE.frequency.setValueAtTime(164.81, now);

      const envFilter = ctx.createBiquadFilter();
      envFilter.type = 'lowpass';
      envFilter.frequency.setValueAtTime(this.insideHabitat ? 115 : 340, now);

      const padGain = ctx.createGain();
      padGain.gain.setValueAtTime(0.32, now);

      oscA.connect(padGain);
      oscE.connect(padGain);
      padGain.connect(envFilter);

      // Soft Martian wind buffer (low-passed to emulate thin CO2 high-freq roll-off)
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
      windFilter.frequency.setValueAtTime(210, now);
      windFilter.Q.setValueAtTime(1.5, now);

      const windGain = ctx.createGain();
      windGain.gain.setValueAtTime(0.55, now);

      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(envFilter);
      envFilter.connect(rootGain);

      // 1) Habitat pressurized interior: 55 Hz fan + 110 Hz cabin air circulator hum
      const habOsc = ctx.createOscillator();
      habOsc.type = 'sine';
      habOsc.frequency.setValueAtTime(55, now);
      const habHarm = ctx.createOscillator();
      habHarm.type = 'triangle';
      habHarm.frequency.setValueAtTime(110, now);
      const habHarmGain = ctx.createGain();
      habHarmGain.gain.setValueAtTime(0.28, now);
      const habGain = ctx.createGain();
      habGain.gain.setValueAtTime(0.0001, now);
      habOsc.connect(habGain);
      habHarm.connect(habHarmGain);
      habHarmGain.connect(habGain);
      habGain.connect(rootGain);

      // 2) Bio-Dome Greenhouse: warm grow-light ballast (138.6 Hz) + gentle hydroponic water trickle
      const ghWaterNoise = ctx.createBufferSource();
      ghWaterNoise.buffer = noiseBuffer;
      ghWaterNoise.loop = true;
      const ghWaterFilter = ctx.createBiquadFilter();
      ghWaterFilter.type = 'bandpass';
      ghWaterFilter.frequency.setValueAtTime(840, now);
      ghWaterFilter.Q.setValueAtTime(3.2, now);
      const ghWaterLfo = ctx.createOscillator();
      ghWaterLfo.type = 'sine';
      ghWaterLfo.frequency.setValueAtTime(1.8, now);
      const ghWaterLfoGain = ctx.createGain();
      ghWaterLfoGain.gain.setValueAtTime(220, now);
      ghWaterLfo.connect(ghWaterLfoGain);
      ghWaterLfoGain.connect(ghWaterFilter.frequency);

      const ghBallastOsc = ctx.createOscillator();
      ghBallastOsc.type = 'sine';
      ghBallastOsc.frequency.setValueAtTime(138.59, now);
      const ghBallastGain = ctx.createGain();
      ghBallastGain.gain.setValueAtTime(0.22, now);

      const ghMaster = ctx.createGain();
      ghMaster.gain.setValueAtTime(0.0001, now);
      ghWaterNoise.connect(ghWaterFilter);
      ghWaterFilter.connect(ghMaster);
      ghBallastOsc.connect(ghBallastGain);
      ghBallastGain.connect(ghMaster);
      ghMaster.connect(rootGain);

      // 3) Solar Array Microgrid: clean PV inverter hum (185 Hz + 370 Hz shimmer) & fan whisper
      const solarBaseOsc = ctx.createOscillator();
      solarBaseOsc.type = 'triangle';
      solarBaseOsc.frequency.setValueAtTime(185, now);
      const solarHarmOsc = ctx.createOscillator();
      solarHarmOsc.type = 'sine';
      solarHarmOsc.frequency.setValueAtTime(370, now);
      const solarHarmGain = ctx.createGain();
      solarHarmGain.gain.setValueAtTime(0.24, now);
      const solarFilter = ctx.createBiquadFilter();
      solarFilter.type = 'lowpass';
      solarFilter.frequency.setValueAtTime(520, now);
      const solarLfo = ctx.createOscillator();
      solarLfo.type = 'sine';
      solarLfo.frequency.setValueAtTime(0.6, now);
      const solarLfoGain = ctx.createGain();
      solarLfoGain.gain.setValueAtTime(0.08, now);
      const solarMaster = ctx.createGain();
      solarMaster.gain.setValueAtTime(0.0001, now);
      solarBaseOsc.connect(solarFilter);
      solarHarmOsc.connect(solarHarmGain);
      solarHarmGain.connect(solarFilter);
      solarFilter.connect(solarMaster);
      solarLfo.connect(solarLfoGain);
      solarLfoGain.connect(solarMaster.gain);
      solarMaster.connect(rootGain);

      // 4) Tank Farm & Water Recycler: rhythmic cryogenic fluid pump & condenser thrum
      const tankOsc = ctx.createOscillator();
      tankOsc.type = 'sine';
      tankOsc.frequency.setValueAtTime(82.41, now);
      const tankLfo = ctx.createOscillator();
      tankLfo.type = 'sine';
      tankLfo.frequency.setValueAtTime(1.15, now);
      const tankLfoGain = ctx.createGain();
      tankLfoGain.gain.setValueAtTime(0.11, now);
      const tankMaster = ctx.createGain();
      tankMaster.gain.setValueAtTime(0.0001, now);
      tankOsc.connect(tankMaster);
      tankLfo.connect(tankLfoGain);
      tankLfoGain.connect(tankMaster.gain);
      tankMaster.connect(rootGain);

      // 5) Aeolus Wind Field: periodic turbine blade whoosh
      const wfNoise = ctx.createBufferSource();
      wfNoise.buffer = noiseBuffer;
      wfNoise.loop = true;
      const wfFilter = ctx.createBiquadFilter();
      wfFilter.type = 'bandpass';
      wfFilter.frequency.setValueAtTime(320, now);
      wfFilter.Q.setValueAtTime(2.0, now);
      const wfLfo = ctx.createOscillator();
      wfLfo.type = 'sine';
      wfLfo.frequency.setValueAtTime(0.55, now);
      const wfLfoGain = ctx.createGain();
      wfLfoGain.gain.setValueAtTime(140, now);
      wfLfo.connect(wfLfoGain);
      wfLfoGain.connect(wfFilter.frequency);
      const wfMaster = ctx.createGain();
      wfMaster.gain.setValueAtTime(0.0001, now);
      wfNoise.connect(wfFilter);
      wfFilter.connect(wfMaster);
      wfMaster.connect(rootGain);

      // EVA suit breathing cycle (0.25 Hz = 4.0 s inhale/exhale) + 200 Hz PLSS fan whisper
      const breathNoise = ctx.createBufferSource();
      breathNoise.buffer = noiseBuffer;
      breathNoise.loop = true;
      const breathBand = ctx.createBiquadFilter();
      breathBand.type = 'bandpass';
      breathBand.frequency.setValueAtTime(280, now);
      breathBand.Q.setValueAtTime(2.2, now);

      const breathLfo = ctx.createOscillator();
      breathLfo.type = 'sine';
      breathLfo.frequency.setValueAtTime(0.25, now);
      const breathLfoGain = ctx.createGain();
      breathLfoGain.gain.setValueAtTime(0.11, now);
      const breathDepth = ctx.createGain();
      breathDepth.gain.setValueAtTime(0.16, now);
      breathLfo.connect(breathLfoGain);
      breathLfoGain.connect(breathDepth.gain);

      const plssFan = ctx.createOscillator();
      plssFan.type = 'triangle';
      plssFan.frequency.setValueAtTime(200, now);
      const plssFanGain = ctx.createGain();
      plssFanGain.gain.setValueAtTime(0.04, now);

      const suitBreathMaster = ctx.createGain();
      suitBreathMaster.gain.setValueAtTime(0.0001, now);

      breathNoise.connect(breathBand);
      breathBand.connect(breathDepth);
      breathDepth.connect(suitBreathMaster);
      plssFan.connect(plssFanGain);
      plssFanGain.connect(suitBreathMaster);
      suitBreathMaster.connect(rootGain);

      oscA.start();
      oscE.start();
      noise.start();
      habOsc.start();
      habHarm.start();
      ghWaterNoise.start();
      ghWaterLfo.start();
      ghBallastOsc.start();
      solarBaseOsc.start();
      solarHarmOsc.start();
      solarLfo.start();
      tankOsc.start();
      tankLfo.start();
      wfNoise.start();
      wfLfo.start();
      breathNoise.start();
      breathLfo.start();
      plssFan.start();

      this.ambientGain = rootGain;
      this.ambientFilter = envFilter;
      this.windBandFilter = windFilter;
      this.windNoiseGain = windGain;
      this.habitatHumGain = habGain;
      this.greenhouseGain = ghMaster;
      this.solarHumGain = solarMaster;
      this.tankPumpGain = tankMaster;
      this.windFieldSwishGain = wfMaster;
      this.suitBreathGain = suitBreathMaster;
      this.ambientSources = [
        oscA,
        oscE,
        noise,
        habOsc,
        habHarm,
        ghWaterNoise,
        ghWaterLfo,
        ghBallastOsc,
        solarBaseOsc,
        solarHarmOsc,
        solarLfo,
        tankOsc,
        tankLfo,
        wfNoise,
        wfLfo,
        breathNoise,
        breathLfo,
        plssFan,
      ];

      this.applyZoneMix(ctx, this.currentZone);
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
    this.ambientFilter = null;
    this.windBandFilter = null;
    this.windNoiseGain = null;
    this.habitatHumGain = null;
    this.greenhouseGain = null;
    this.solarHumGain = null;
    this.tankPumpGain = null;
    this.windFieldSwishGain = null;
    this.suitBreathGain = null;
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

  private stopRoverSpatial(): void {
    try {
      this.roverMotorOsc?.stop();
      this.roverMotorOsc?.disconnect();
    } catch {
      // Ignore
    }
    this.roverMotorOsc = null;
    this.roverMotorGain = null;
    this.roverPanner = null;
    this.roverLowpass = null;
  }

  /**
   * 3D Spatial Rover audio via Web Audio PannerNode:
   * - Attenuates high frequencies above 1800 Hz (Mars ~ -20 dB thin CO2 absorption)
   * - Schedules delayed telemetry chirps with real Mars speed-of-sound delay d / 240
   */
  public updateRoverSpatialAudio(
    roverX: number,
    roverY: number,
    roverZ: number,
    listenerX: number,
    listenerY: number,
    listenerZ: number,
    listenerYaw: number,
    driving: boolean,
  ): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;

    try {
      const now = ctx.currentTime;
      const listener = ctx.listener;
      if (listener.positionX) {
        listener.positionX.setValueAtTime(listenerX, now);
        listener.positionY.setValueAtTime(listenerY, now);
        listener.positionZ.setValueAtTime(listenerZ, now);
        listener.forwardX.setValueAtTime(Math.sin(listenerYaw), now);
        listener.forwardY.setValueAtTime(0, now);
        listener.forwardZ.setValueAtTime(Math.cos(listenerYaw), now);
        listener.upX.setValueAtTime(0, now);
        listener.upY.setValueAtTime(1, now);
        listener.upZ.setValueAtTime(0, now);
      }

      if (!this.roverPanner || !this.roverMotorGain || !this.roverLowpass) {
        const panner = ctx.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 2.0;
        panner.maxDistance = 42.0;
        panner.rolloffFactor = 1.15;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(1100, now);

        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.0001, now);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(92, now);

        osc.connect(lowpass);
        lowpass.connect(mGain);
        mGain.connect(panner);
        panner.connect(this.effectsBus);
        osc.start(now);

        this.roverPanner = panner;
        this.roverLowpass = lowpass;
        this.roverMotorGain = mGain;
        this.roverMotorOsc = osc;
      }

      if (this.roverPanner.positionX) {
        this.roverPanner.positionX.setValueAtTime(roverX, now);
        this.roverPanner.positionY.setValueAtTime(roverY + 0.5, now);
        this.roverPanner.positionZ.setValueAtTime(roverZ, now);
      }

      const dist = Math.hypot(roverX - listenerX, roverZ - listenerZ);
      // Thin CO2 absorption strips highs further with distance
      const cutoff = Math.max(240, 1600 * Math.exp(-dist * 0.08));
      this.roverLowpass.frequency.setTargetAtTime(cutoff, now, 0.08);
      this.roverMotorGain.gain.setTargetAtTime(driving ? 0.032 : 0.0001, now, 0.12);

      // Subtle spatial ping with realistic c_Mars = 240 m/s acoustic propagation lag
      if (driving && performance.now() - this.lastRoverPingAt > 6500 && dist > 1.5) {
        this.lastRoverPingAt = performance.now();
        const acousticDelay = computeSoundDelaySeconds(dist, MARS_FACTS.SPEED_OF_SOUND_LOW_HZ_MS);
        const pingOsc = ctx.createOscillator();
        const pingGain = ctx.createGain();
        const t = now + acousticDelay;
        pingOsc.type = 'sine';
        pingOsc.frequency.setValueAtTime(640, t);
        pingGain.gain.setValueAtTime(0.0001, t);
        pingGain.gain.exponentialRampToValueAtTime(0.028, t + 0.012);
        pingGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        pingOsc.connect(pingGain);
        pingGain.connect(this.roverPanner);
        pingOsc.start(t);
        pingOsc.stop(t + 0.13);
      }
    } catch {
      // Safe fallback
    }
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
    if (!ctx || !this.effectsBus) return;

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
      gain.connect(this.effectsBus);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Safe fallback
    }
  }

  public playAirlockHiss(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;
    try {
      const now = ctx.currentTime;
      const dur = 0.48;
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(920, now);
      bp.frequency.exponentialRampToValueAtTime(340, now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.075, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(bp);
      bp.connect(g);
      g.connect(this.effectsBus);
      src.start(now);
      src.stop(now + dur);
    } catch {
      // Safe fallback
    }
  }

  /** Muffled regolith footstep in thin Martian air (no crisp Earth gravel) */
  public playFootstep(softSandFactor: number, loping: boolean): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(220 - softSandFactor * 95, now);

      osc.type = 'triangle';
      const startFreq = loping ? 96 : 78;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(36, now + 0.09);

      const amp = (loping ? 0.095 : 0.068) * (1 - softSandFactor * 0.25);
      g.gain.setValueAtTime(amp, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(lp);
      lp.connect(g);
      g.connect(this.effectsBus);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // Safe fallback
    }
  }

  /** Weighted 160 kg boot landing thud scaled by impact speed */
  public playLandingThud(impactSpeedMs: number): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;
    try {
      const now = ctx.currentTime;
      const weight = Math.max(0.25, Math.min(1.0, impactSpeedMs / 4.2));
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(86, now);
      osc.frequency.exponentialRampToValueAtTime(28, now + 0.19);
      g.gain.setValueAtTime(0.15 * weight, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
      osc.connect(g);
      g.connect(this.effectsBus);
      osc.start(now);
      osc.stop(now + 0.22);
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
    if (!ctx || !this.ambienceBus) return;

    this.stopWeatherLoop();

    try {
      const now = ctx.currentTime;
      const rumbleScale = Math.max(0.25, Math.min(1, rumbleIntensity));
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.16, now + 0.75);
      master.connect(this.ambienceBus);

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

      const vortexFilter = ctx.createBiquadFilter();
      vortexFilter.type = 'bandpass';
      const baseFreq = kind === 'katabatic-gust' ? 240 : kind === 'electrostatic-squall' ? 420 : 340;
      vortexFilter.frequency.setValueAtTime(baseFreq, now);
      vortexFilter.Q.setValueAtTime(kind === 'dust-devil' ? 2.6 : 1.7, now);

      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(kind === 'dust-devil' ? 1.45 : 0.95, now);

      const lfoFreqGain = ctx.createGain();
      lfoFreqGain.gain.setValueAtTime(kind === 'dust-devil' ? 210 : 145, now);
      lfo.connect(lfoFreqGain);
      lfoFreqGain.connect(vortexFilter.frequency);

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

      this.weatherGain = master;
      this.weatherSources = [
        noise,
        lfo,
        rumbleSubOsc,
        rumbleHarmonicOsc,
        rumbleNoise,
        vortexFilter,
        lfoFreqGain,
        rumbleFilter,
        rumbleSubGain,
        rumbleHarmonicGain,
        rumbleNoiseGain,
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
    if (!ctx || !this.effectsBus) return;

    try {
      const now = ctx.currentTime;
      const s = Math.max(0.35, Math.min(1, strength));
      const dur = 1.85;

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
      windGain.connect(this.effectsBus);

      windNoise.start(now);
      windNoise.stop(now + dur + 0.05);

      const nodes: AudioNode[] = [windNoise, sweepFilter, windGain];
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
    if (!ctx || !this.effectsBus) return;

    try {
      const now = ctx.currentTime;
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(105, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.22);
      thudGain.gain.setValueAtTime(0.18, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
      thud.connect(thudGain);
      thudGain.connect(this.effectsBus);
      thud.start(now);
      thud.stop(now + 0.26);
    } catch {
      // Safe fallback
    }

    this.playTone(523.25, 0.14, 'sine', 0.08, 0.18);
    this.playTone(659.25, 0.16, 'sine', 0.08, 0.28);
    this.playTone(783.99, 0.28, 'sine', 0.09, 0.38);
  }

  public playWeatherExposed(): void {
    if (!this.enabled) return;
    this.playTone(233.08, 0.18, 'sawtooth', 0.08, 0);
    this.playTone(174.61, 0.3, 'sawtooth', 0.08, 0.18);
  }

  /** Synthesized Rusty companion beeps (no TTS / no voice-over) */
  public playRoverBeep(
    mood: 'ok' | 'lowPower' | 'critical' | 'happy' | 'curious' | 'alert' = 'ok',
  ): void {
    if (!this.enabled) return;
    if (mood === 'critical' || mood === 'alert') {
      this.playTone(740, 0.07, 'triangle', 0.07, 0);
      this.playTone(587.33, 0.09, 'triangle', 0.07, 0.08);
      return;
    }
    if (mood === 'lowPower') {
      this.playTone(523.25, 0.08, 'sine', 0.06, 0);
      this.playTone(440, 0.1, 'sine', 0.06, 0.09);
      return;
    }
    if (mood === 'happy') {
      this.playTone(659.25, 0.06, 'triangle', 0.07, 0);
      this.playTone(880, 0.07, 'triangle', 0.07, 0.065);
      this.playTone(1046.5, 0.1, 'sine', 0.07, 0.14);
      return;
    }
    if (mood === 'curious') {
      this.playTone(587.33, 0.06, 'sine', 0.065, 0);
      this.playTone(783.99, 0.08, 'sine', 0.065, 0.07);
      return;
    }
    this.playTone(698.46, 0.06, 'triangle', 0.065, 0);
    this.playTone(880, 0.08, 'sine', 0.065, 0.07);
  }

  public playSuccess(): void {
    this.playQuizCorrect();
  }

  public playAirlockCycle(): void {
    this.playAirlockHiss();
  }

  /** Soft green-glow chime when a Junior Explorer quiz answer is correct */
  public playQuizCorrect(): void {
    if (!this.enabled) return;
    this.playTone(523.25, 0.12, 'sine', 0.08, 0);
    this.playTone(659.25, 0.14, 'sine', 0.08, 0.08);
    this.playTone(783.99, 0.24, 'sine', 0.085, 0.17);
  }

  /** Gentle nudge tone on a wrong quiz try (never a harsh buzzer) */
  public playQuizHint(): void {
    if (!this.enabled) return;
    this.playTone(392, 0.12, 'sine', 0.06, 0);
    this.playTone(440, 0.14, 'sine', 0.06, 0.1);
  }

  /** Rising crystalline chime when collecting a Mars Gravity Crystal */
  public playCrystalCollect(count = 1): void {
    if (!this.enabled) return;
    const base = 587.33 + Math.max(0, count - 1) * 110;
    this.playTone(base, 0.11, 'sine', 0.08, 0);
    this.playTone(base * 1.25, 0.16, 'triangle', 0.08, 0.07);
    this.playTone(base * 1.5, 0.22, 'sine', 0.08, 0.14);
  }

  /** Celebratory arpeggio when unlocking a Junior Mission Badge */
  public playBadgeUnlock(): void {
    if (!this.enabled) return;
    this.playTone(523.25, 0.12, 'triangle', 0.08, 0);
    this.playTone(659.25, 0.12, 'triangle', 0.08, 0.09);
    this.playTone(783.99, 0.14, 'sine', 0.085, 0.18);
    this.playTone(1046.5, 0.34, 'sine', 0.095, 0.27);
  }

  /** Crisp scanner pulse for Commander's Quick Scan action */
  public playQuickScan(): void {
    if (!this.enabled) return;
    this.playTone(587.33, 0.08, 'sine', 0.065, 0);
    this.playTone(880, 0.09, 'sine', 0.065, 0.075);
    this.playTone(1174.66, 0.16, 'triangle', 0.07, 0.15);
  }

  /** Dual-tone comms carrier chime for Emergency Comms action */
  public playCommsPing(): void {
    if (!this.enabled) return;
    this.playTone(783.99, 0.09, 'triangle', 0.075, 0);
    this.playTone(1046.5, 0.11, 'sine', 0.075, 0.11);
    this.playTone(783.99, 0.09, 'triangle', 0.065, 0.24);
  }

  /** Play decision verdict feedback sound */
  public playDecisionMade(verdict: 'safe' | 'risky' | 'ineffective' = 'safe'): void {
    if (!this.enabled) return;
    if (verdict === 'safe') {
      // Cheerful rising major triad (G4 -> B4 -> D5)
      this.playTone(392.0, 0.12, 'sine', 0.08, 0);
      this.playTone(493.88, 0.14, 'sine', 0.085, 0.09);
      this.playTone(587.33, 0.28, 'triangle', 0.09, 0.18);
    } else if (verdict === 'risky') {
      // Cautionary two-tone pulse (A4 -> F#4)
      this.playTone(440.0, 0.14, 'triangle', 0.08, 0);
      this.playTone(369.99, 0.24, 'sine', 0.085, 0.12);
    } else {
      // Low blunt thud
      this.playTone(130.81, 0.22, 'sine', 0.09, 0);
    }
  }

  /** Soft click for regular buttons and cards */
  public playClickSoft(): void {
    this.playClick();
  }

  /** Bright two-tone confirmation click for mission actions and primary buttons */
  public playClickConfirm(): void {
    if (!this.enabled) return;
    this.playTone(523.25, 0.08, 'sine', 0.07, 0);
    this.playTone(783.99, 0.14, 'sine', 0.075, 0.07);
  }

  /** Descending tone for cancel / close / back actions */
  public playClickBack(): void {
    if (!this.enabled) return;
    this.playTone(493.88, 0.07, 'sine', 0.06, 0);
    this.playTone(392.0, 0.11, 'sine', 0.055, 0.06);
  }

  /** Subtle hover tick when mouse enters an interactive button or card */
  public playHoverSound(): void {
    if (!this.enabled) return;
    this.playTone(880, 0.025, 'sine', 0.02, 0);
  }

  // --- Procedural Speaker Chimes & Dialogue Audio (Zero TTS per Space Apps submission rules) ---

  public isRoverVoiceEnabled(): boolean {
    return this.roverVoiceEnabled;
  }

  public setRoverVoiceEnabled(enabled: boolean): void {
    this.roverVoiceEnabled = enabled;
    if (!enabled) {
      this.speechSpeaking = false;
    }
  }

  public isRoverSpeaking(): boolean {
    return this.speechSpeaking;
  }

  public setRoverHushed(hushed: boolean): void {
    this.roverHushed = hushed;
    if (hushed) {
      this.speechSpeaking = false;
    }
  }

  public isRoverHushed(): boolean {
    return this.roverHushed;
  }

  /**
   * Procedural character audio chimes:
   * Distinct sonic identity for each speaker so kids know who is talking.
   */
  public playSpeakerChime(speaker: 'rusty' | 'hab' | 'amara' | 'kenji' | 'lucia' | 'rafi' | 'earth' | 'log' | string): void {
    if (!this.enabled || this.roverHushed) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const now = ctx.currentTime;
      switch (speaker) {
        case 'rusty': {
          // Rusty: bright friendly two-tone chirp (880 Hz -> 1174 Hz)
          this.playTone(880, 0.08, 'sine', 0.04, 0);
          this.playTone(1174, 0.12, 'sine', 0.045, 0.09);
          break;
        }
        case 'hab': {
          // Hab Computer: calm neutral dual chime (523.25 Hz + 659.25 Hz C5+E5)
          this.playTone(523.25, 0.22, 'sine', 0.035, 0);
          this.playTone(659.25, 0.25, 'sine', 0.035, 0.06);
          break;
        }
        case 'amara': {
          // Dr. Amara: gentle warm bell tone (440 Hz -> 554.37 Hz)
          this.playTone(440, 0.2, 'triangle', 0.035, 0);
          this.playTone(554.37, 0.24, 'sine', 0.03, 0.08);
          break;
        }
        case 'kenji': {
          // Kenji: relaxed lower-mid workshop chime (329.63 Hz -> 392.00 Hz)
          this.playTone(329.63, 0.18, 'triangle', 0.04, 0);
          this.playTone(392.0, 0.22, 'triangle', 0.035, 0.08);
          break;
        }
        case 'lucia': {
          // Lucía: energetic bright crystal chime (659.25 Hz -> 880 Hz)
          this.playTone(659.25, 0.12, 'sine', 0.04, 0);
          this.playTone(880, 0.18, 'sine', 0.04, 0.07);
          break;
        }
        case 'rafi': {
          // Rafi: melodic garden arpeggio (392 Hz -> 493.88 Hz -> 587.33 Hz)
          this.playTone(392.0, 0.12, 'sine', 0.03, 0);
          this.playTone(493.88, 0.14, 'sine', 0.03, 0.07);
          this.playTone(587.33, 0.22, 'sine', 0.035, 0.14);
          break;
        }
        case 'earth': {
          // Earth: deep space telemetry packet blips (440 Hz short pulses)
          this.playTone(440, 0.05, 'sine', 0.025, 0);
          this.playTone(550, 0.05, 'sine', 0.025, 0.08);
          this.playTone(660, 0.08, 'sine', 0.025, 0.16);
          break;
        }
        case 'log': {
          // Commander's Log: warm calm keystroke tone
          this.playTone(587.33, 0.15, 'sine', 0.03, 0);
          break;
        }
        default: {
          this.playTone(600, 0.12, 'sine', 0.03, 0);
          break;
        }
      }
    } catch {
      // Safe fallback
    }
  }

  /**
   * Faint Tank 2 tick-hiss ambient sound for Sol 1 check and Sol 21 leak detection
   */
  public playTankTickHiss(): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.effectsBus) return;

    try {
      const now = ctx.currentTime;
      // 1. Subtle metal 'tick' click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.015);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);
      osc.connect(gain);
      gain.connect(this.effectsBus);
      osc.start(now);
      osc.stop(now + 0.025);

      // 2. Whisper hiss puff (filtered white noise)
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.08;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, now + 0.02);
      filter.Q.setValueAtTime(2.5, now + 0.02);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now + 0.02);
      noiseGain.gain.linearRampToValueAtTime(0.035, now + 0.06);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.effectsBus);
      noise.start(now + 0.02);
      noise.stop(now + 0.38);
    } catch {
      // Safe fallback
    }
  }

  public speakRover(text: string, onEnd?: () => void): void {
    if (!this.roverVoiceEnabled || this.roverHushed) return;
    this.speechSpeaking = true;
    this.playSpeakerChime('rusty');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        this.speechSpeaking = false;
        onEnd?.();
      }, 900);
    }
  }

  public stopSpeaking(): void {
    this.speechSpeaking = false;
  }
}

export const soundEngine = new SoundEngine();
