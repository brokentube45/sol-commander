export type CelebrationKind = 'mission' | 'final';
export type CelebrationMissionId = 1 | 2 | 3 | 4 | 5;

export type CelebrationShape =
  | 'star5'
  | 'sparkle4'
  | 'circle'
  | 'bubble'
  | 'sundot'
  | 'icehex'
  | 'leaf'
  | 'shield'
  | 'rocket';

export interface CelebrateOrigin {
  x: number;
  y: number;
}

export interface CelebrateOptions {
  kind: CelebrationKind;
  missionId?: CelebrationMissionId;
  origin?: CelebrateOrigin;
  /** Optional explicit override (primarily for tests); runtime also checks reducedMotion + prefers-reduced-motion */
  reducedMotion?: boolean;
}

export interface CelebrationTelemetry {
  activeCount: number;
  running: boolean;
  totalTriggers: number;
  fpsBefore: number;
  fpsDuring: number;
  minFpsDuring: number;
  lastDurationMs: number;
}

export const CELEBRATION_CAP = 250;
export const CELEBRATION_MISSION_COUNT = 120;
export const CELEBRATION_FINAL_COUNT = 220;
export const CELEBRATION_REDUCED_MAX = 20;

export const CELEBRATION_MISSION_DURATION_MS = 2500;
export const CELEBRATION_FINAL_DURATION_MS = 5000;
export const CELEBRATION_REDUCED_DURATION_MS = 1500;

export const CELEBRATION_MAX_DT_S = 0.05; // 50 ms frame clamp

// [SIM] Visual confetti gravity scaled to 0.38x Earth confetti baseline to mirror 3.73 m/s^2 Mars fall feel
export const CELEBRATION_MARS_GRAVITY_SCALE = 0.38;
const EARTH_CONFETTI_GRAVITY_PX_S2 = 980;
export const CELEBRATION_GRAVITY_PX_S2 =
  EARTH_CONFETTI_GRAVITY_PX_S2 * CELEBRATION_MARS_GRAVITY_SCALE;

// Soft & bright palette: Mars rust, warm amber, cyan, white
const CORE_COLORS = ['#E86A33', '#FFB703', '#38BDF8', '#F8F9FA'] as const;
const M1_OXYGEN_COLORS = ['#E0F7FA', '#7DD3FC', '#F8F9FA', '#38BDF8'] as const;
const M2_SUN_COLORS = ['#FFD166', '#FFB703', '#FDE68A', '#F8F9FA'] as const;
const M3_ICE_COLORS = ['#BAE6FD', '#7DD3FC', '#E0F2FE', '#F8F9FA'] as const;
const M4_LEAF_COLORS = ['#4ADE80', '#22C55E', '#86EFAC', '#FFB703'] as const;
const M5_SHIELD_COLORS = ['#38BDF8', '#F8F9FA', '#FFB703', '#7DD3FC'] as const;

export interface PoolParticle {
  active: boolean;
  isStatic: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  scale: number;
  swayAmp: number;
  swayFreq: number;
  swayPhase: number;
  drag: number;
  ageMs: number;
  lifeMs: number;
  alpha: number;
  shape: CelebrationShape;
  color: string;
  spriteKey: string;
}

function createEmptyParticle(): PoolParticle {
  return {
    active: false,
    isStatic: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    rot: 0,
    vRot: 0,
    scale: 1,
    swayAmp: 0,
    swayFreq: 0,
    swayPhase: 0,
    drag: 0,
    ageMs: 0,
    lifeMs: 1000,
    alpha: 0,
    shape: 'star5',
    color: '#FFB703',
    spriteKey: 'star5|#FFB703',
  };
}

const SPRITE_SIZE_PX = 40;

function drawProceduralShape(
  ctx: CanvasRenderingContext2D,
  shape: CelebrationShape,
  color: string,
): void {
  const cx = SPRITE_SIZE_PX / 2;
  const cy = SPRITE_SIZE_PX / 2;
  ctx.clearRect(0, 0, SPRITE_SIZE_PX, SPRITE_SIZE_PX);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (shape === 'star5') {
    const outerR = 14;
    const innerR = 6.2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (shape === 'sparkle4') {
    const outerR = 15;
    const innerR = 3.8;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 4;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (shape === 'bubble') {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, -Math.PI * 0.85, -Math.PI * 0.35);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (shape === 'sundot') {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 8.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (shape === 'icehex') {
    const r = 13;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      ctx.moveTo(cx - Math.cos(a) * (r * 0.68), cy - Math.sin(a) * (r * 0.68));
      ctx.lineTo(cx + Math.cos(a) * (r * 0.68), cy + Math.sin(a) * (r * 0.68));
    }
    ctx.stroke();
    return;
  }

  if (shape === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.quadraticCurveTo(cx + 13, cy - 2, cx, cy + 14);
    ctx.quadraticCurveTo(cx - 13, cy - 2, cx, cy - 14);
    ctx.fill();
    ctx.strokeStyle = '#DCFCE7';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
    return;
  }

  if (shape === 'shield') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 14);
    ctx.lineTo(cx + 11, cy - 9);
    ctx.lineTo(cx + 10, cy + 2);
    ctx.quadraticCurveTo(cx + 6, cy + 11, cx, cy + 15);
    ctx.quadraticCurveTo(cx - 6, cy + 11, cx - 10, cy + 2);
    ctx.lineTo(cx - 11, cy - 9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    return;
  }

  // Generic tiny rocket silhouette (no official logos or flags)
  ctx.beginPath();
  ctx.moveTo(cx, cy - 15);
  ctx.quadraticCurveTo(cx + 7, cy - 6, cx + 6, cy + 6);
  ctx.lineTo(cx + 10, cy + 12);
  ctx.lineTo(cx + 4, cy + 10);
  ctx.lineTo(cx - 4, cy + 10);
  ctx.lineTo(cx - 10, cy + 12);
  ctx.lineTo(cx - 6, cy + 6);
  ctx.quadraticCurveTo(cx - 7, cy - 6, cx, cy - 15);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#071324';
  ctx.beginPath();
  ctx.arc(cx, cy - 3, 2.7, 0, Math.PI * 2);
  ctx.fill();
}

function getMissionShapeAndColor(
  kind: CelebrationKind,
  missionId: CelebrationMissionId | undefined,
  roll: number,
  colorIdx: number,
): { shape: CelebrationShape; color: string } {
  const baseShapes: readonly CelebrationShape[] = ['star5', 'sparkle4', 'circle'];

  if (kind === 'final') {
    const allThemed: readonly CelebrationShape[] = [
      'star5',
      'sparkle4',
      'circle',
      'bubble',
      'sundot',
      'icehex',
      'leaf',
      'shield',
      'rocket',
    ];
    const shape = allThemed[Math.floor(roll * allThemed.length) % allThemed.length];
    if (shape === 'bubble') {
      return { shape, color: M1_OXYGEN_COLORS[colorIdx % M1_OXYGEN_COLORS.length] };
    }
    if (shape === 'sundot') {
      return { shape, color: M2_SUN_COLORS[colorIdx % M2_SUN_COLORS.length] };
    }
    if (shape === 'icehex') {
      return { shape, color: M3_ICE_COLORS[colorIdx % M3_ICE_COLORS.length] };
    }
    if (shape === 'leaf') {
      return { shape, color: M4_LEAF_COLORS[colorIdx % M4_LEAF_COLORS.length] };
    }
    if (shape === 'shield') {
      return { shape, color: M5_SHIELD_COLORS[colorIdx % M5_SHIELD_COLORS.length] };
    }
    return { shape, color: CORE_COLORS[colorIdx % CORE_COLORS.length] };
  }

  // Mission celebrations mix base shapes (~55%) with mission-themed extras (~45%)
  if (roll >= 0.55 && missionId) {
    if (missionId === 1) {
      return { shape: 'bubble', color: M1_OXYGEN_COLORS[colorIdx % M1_OXYGEN_COLORS.length] };
    }
    if (missionId === 2) {
      return { shape: 'sundot', color: M2_SUN_COLORS[colorIdx % M2_SUN_COLORS.length] };
    }
    if (missionId === 3) {
      return { shape: 'icehex', color: M3_ICE_COLORS[colorIdx % M3_ICE_COLORS.length] };
    }
    if (missionId === 4) {
      return { shape: 'leaf', color: M4_LEAF_COLORS[colorIdx % M4_LEAF_COLORS.length] };
    }
    if (missionId === 5) {
      return { shape: 'shield', color: M5_SHIELD_COLORS[colorIdx % M5_SHIELD_COLORS.length] };
    }
  }

  const shape = baseShapes[Math.floor((roll / 0.55) * baseShapes.length) % baseShapes.length];
  return { shape, color: CORE_COLORS[colorIdx % CORE_COLORS.length] };
}

export class CelebrationEngine {
  private pool: PoolParticle[] = Array.from({ length: CELEBRATION_CAP }, createEmptyParticle);
  private activeCount = 0;
  private sprites = new Map<string, HTMLCanvasElement>();

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 1280;
  private height = 720;
  private dpr = 1;

  private rafId: number | null = null;
  private running = false;
  private paused = false;
  private lastFrameMs = 0;
  private runStartMs = 0;
  private lastTriggeredMs = 0;

  private reducedMotionPref = false;
  private systemReducedMotion = false;

  private totalTriggers = 0;
  private fpsBefore = 60;
  private fpsDuring = 0;
  private minFpsDuring = 0;
  private fpsFrameCount = 0;
  private fpsAccumMs = 0;
  private lastDurationMs = 0;

  private skipListenersAttached = false;
  private resizeListenerAttached = false;
  private visibilityListenerAttached = false;
  private motionMediaQuery: MediaQueryList | null = null;
  private baselineRafId: number | null = null;

  private rngState = 20260709;

  private nextRand(): number {
    // Fast deterministic-safe LCG fallback when Math.random is unseeded; keeps zero allocations
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  public getPoolLength(): number {
    return this.pool.length;
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getSpriteCacheSize(): number {
    return this.sprites.size;
  }

  public getTelemetry(): CelebrationTelemetry {
    return {
      activeCount: this.activeCount,
      running: this.running,
      totalTriggers: this.totalTriggers,
      fpsBefore: this.fpsBefore,
      fpsDuring: this.fpsDuring,
      minFpsDuring: this.minFpsDuring,
      lastDurationMs: this.lastDurationMs,
    };
  }

  public setViewportSize(width: number, height: number, dpr = 1): void {
    this.width = Math.max(1, Math.floor(width));
    this.height = Math.max(1, Math.floor(height));
    this.dpr = Math.min(2, Math.max(1, dpr));
    if (this.canvas) {
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
    }
  }

  public setReducedMotion(value: boolean): void {
    this.reducedMotionPref = value;
  }

  public isReducedMotionActive(explicitOverride?: boolean): boolean {
    if (typeof explicitOverride === 'boolean') return explicitOverride;
    return this.reducedMotionPref || this.systemReducedMotion;
  }

  private getOrCreateSprite(shape: CelebrationShape, color: string, key: string): HTMLCanvasElement | null {
    const existing = this.sprites.get(key);
    if (existing) return existing;
    if (typeof document === 'undefined') return null;
    const offscreen = document.createElement('canvas');
    offscreen.width = SPRITE_SIZE_PX;
    offscreen.height = SPRITE_SIZE_PX;
    const octx = offscreen.getContext('2d');
    if (octx) {
      drawProceduralShape(octx, shape, color);
    }
    this.sprites.set(key, offscreen);
    return offscreen;
  }

  private warmupSprites(): void {
    if (typeof document === 'undefined') return;
    const shapes: CelebrationShape[] = [
      'star5',
      'sparkle4',
      'circle',
      'bubble',
      'sundot',
      'icehex',
      'leaf',
      'shield',
      'rocket',
    ];
    const colors = [
      ...CORE_COLORS,
      ...M1_OXYGEN_COLORS,
      ...M2_SUN_COLORS,
      ...M3_ICE_COLORS,
      ...M4_LEAF_COLORS,
      ...M5_SHIELD_COLORS,
    ];
    for (let i = 0; i < shapes.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        const key = `${shapes[i]}|${colors[j]}`;
        if (!this.sprites.has(key)) {
          this.getOrCreateSprite(shapes[i], colors[j], key);
        }
      }
    }
  }

  public attachCanvas(canvas: HTMLCanvasElement): () => void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });

    const updateSize = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
      const h = typeof window !== 'undefined' ? window.innerHeight : 720;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      this.setViewportSize(w, h, dpr);
    };
    updateSize();
    this.warmupSprites();
    this.sampleBaselineFps();

    if (typeof window !== 'undefined' && !this.resizeListenerAttached) {
      window.addEventListener('resize', updateSize);
      this.resizeListenerAttached = true;
    }

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.systemReducedMotion = this.motionMediaQuery.matches;
      this.motionMediaQuery.addEventListener('change', this.handleReducedMotionMediaChange);
    }

    return () => {
      if (this.baselineRafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.baselineRafId);
        this.baselineRafId = null;
      }
      this.stop();
      if (typeof window !== 'undefined' && this.resizeListenerAttached) {
        window.removeEventListener('resize', updateSize);
        this.resizeListenerAttached = false;
      }
      if (this.motionMediaQuery) {
        this.motionMediaQuery.removeEventListener('change', this.handleReducedMotionMediaChange);
        this.motionMediaQuery = null;
      }
      this.canvas = null;
      this.ctx = null;
    };
  }

  private handleReducedMotionMediaChange = (ev: MediaQueryListEvent): void => {
    this.systemReducedMotion = ev.matches;
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      this.paused = true;
    } else {
      this.paused = false;
      this.lastFrameMs = performance.now();
    }
  };

  private handleSkipKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      this.stop();
    }
  };

  private handleSkipPointerDown = (ev: PointerEvent): void => {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Ignore the pointerdown that initiated a debug button trigger on the same frame
    if (now - this.lastTriggeredMs < 90) return;
    const target = ev.target as HTMLElement | null;
    if (target?.closest?.('[data-celebration-trigger="true"]')) return;
    this.stop();
  };

  private attachActiveListeners(): void {
    if (typeof document !== 'undefined' && !this.visibilityListenerAttached) {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = true;
    }
    if (typeof window !== 'undefined' && !this.skipListenersAttached) {
      window.addEventListener('keydown', this.handleSkipKeyDown);
      window.addEventListener('pointerdown', this.handleSkipPointerDown, { passive: true });
      this.skipListenersAttached = true;
    }
  }

  private detachActiveListeners(): void {
    if (typeof document !== 'undefined' && this.visibilityListenerAttached) {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
    if (typeof window !== 'undefined' && this.skipListenersAttached) {
      window.removeEventListener('keydown', this.handleSkipKeyDown);
      window.removeEventListener('pointerdown', this.handleSkipPointerDown);
      this.skipListenersAttached = false;
    }
  }

  public celebrate(opts: CelebrateOptions): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.lastTriggeredMs = now;
    this.totalTriggers += 1;

    const useReduced = this.isReducedMotionActive(opts.reducedMotion);
    const defaultOrigin = {
      x: this.width * 0.5,
      y: this.height * 0.45,
    };
    const origin = opts.origin ?? defaultOrigin;

    const requestedCount = useReduced
      ? CELEBRATION_REDUCED_MAX
      : opts.kind === 'final'
        ? CELEBRATION_FINAL_COUNT
        : CELEBRATION_MISSION_COUNT;

    const maxDurationMs = useReduced
      ? CELEBRATION_REDUCED_DURATION_MS
      : opts.kind === 'final'
        ? CELEBRATION_FINAL_DURATION_MS
        : CELEBRATION_MISSION_DURATION_MS;

    // Sample baseline FPS once on idle if not already running
    if (!this.running && this.baselineRafId === null && typeof window !== 'undefined' && typeof requestAnimationFrame === 'function') {
      this.sampleBaselineFps();
    }

    // Spawn into pre-allocated pool without ever exceeding CELEBRATION_CAP (250)
    const headroom = Math.max(0, CELEBRATION_CAP - this.activeCount);
    let toSpawn = Math.min(requestedCount, headroom);

    // If reduced motion is active, enforce <= 20 total active static particles even on overlapping calls
    if (useReduced) {
      const reducedHeadroom = Math.max(0, CELEBRATION_REDUCED_MAX - this.activeCount);
      toSpawn = Math.min(toSpawn, reducedHeadroom);
    }

    let spawned = 0;
    for (let i = 0; i < this.pool.length && spawned < toSpawn; i++) {
      const p = this.pool[i];
      if (p.active) continue;

      const idx = spawned;
      spawned += 1;
      this.activeCount += 1;

      const roll = this.nextRand();
      const colorIdx = Math.floor(this.nextRand() * 16);
      const { shape, color } = getMissionShapeAndColor(opts.kind, opts.missionId, roll, colorIdx);
      const spriteKey = `${shape}|${color}`;
      this.getOrCreateSprite(shape, color, spriteKey);

      p.active = true;
      p.shape = shape;
      p.color = color;
      p.spriteKey = spriteKey;
      p.ageMs = 0;

      if (useReduced) {
        // Static soft sparkle fade-in and fade-out, zero movement
        p.isStatic = true;
        const angle = (idx / Math.max(1, toSpawn)) * Math.PI * 2 + this.nextRand() * 0.35;
        const radius = 36 + this.nextRand() * 180;
        p.x = Math.min(this.width - 24, Math.max(24, origin.x + Math.cos(angle) * radius));
        p.y = Math.min(this.height - 24, Math.max(24, origin.y + Math.sin(angle) * radius * 0.72));
        p.vx = 0;
        p.vy = 0;
        p.rot = this.nextRand() * Math.PI * 2;
        p.vRot = 0;
        p.scale = 0.65 + this.nextRand() * 0.55;
        p.swayAmp = 0;
        p.swayFreq = 0;
        p.swayPhase = 0;
        p.drag = 0;
        p.lifeMs = CELEBRATION_REDUCED_DURATION_MS;
        p.alpha = 0;
        continue;
      }

      p.isStatic = false;
      const minLifeRatio = opts.kind === 'final' ? 0.68 : 0.74;
      p.lifeMs = maxDurationMs * (minLifeRatio + this.nextRand() * (1 - minLifeRatio));
      p.scale = (opts.kind === 'final' ? 0.58 : 0.52) + this.nextRand() * 0.58;
      p.rot = this.nextRand() * Math.PI * 2;
      p.vRot = (this.nextRand() - 0.5) * 6.5;
      p.swayAmp = 14 + this.nextRand() * 26;
      p.swayFreq = 3 + this.nextRand() * 3.5;
      p.swayPhase = this.nextRand() * Math.PI * 2;
      p.drag = 0.45 + this.nextRand() * 0.45;
      p.alpha = 1;

      const emitterRoll = idx % 4;
      if (emitterRoll === 0 || emitterRoll === 1) {
        // Center badge origin radial upward burst (50%)
        const angle = -Math.PI + this.nextRand() * Math.PI * 1.45 - Math.PI * 0.225;
        const speed =
          (opts.kind === 'final' ? 240 : 185) +
          this.nextRand() * (opts.kind === 'final' ? 320 : 240);
        p.x = origin.x + (this.nextRand() - 0.5) * 18;
        p.y = origin.y + (this.nextRand() - 0.5) * 18;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 65;
      } else if (emitterRoll === 2) {
        // Lower-left corner cannon (25%)
        const angle = -Math.PI * 0.42 + (this.nextRand() - 0.5) * 0.44;
        const speed =
          (opts.kind === 'final' ? 540 : 450) +
          this.nextRand() * (opts.kind === 'final' ? 320 : 250);
        p.x = 18;
        p.y = this.height - 18;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      } else {
        // Lower-right corner cannon (25%)
        const angle = -Math.PI * 0.58 + (this.nextRand() - 0.5) * 0.44;
        const speed =
          (opts.kind === 'final' ? 540 : 450) +
          this.nextRand() * (opts.kind === 'final' ? 320 : 250);
        p.x = this.width - 18;
        p.y = this.height - 18;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }
    }

    if (this.activeCount > 0 && !this.running && this.canvas && this.ctx) {
      this.startLoop();
    }
  }

  private sampleBaselineFps(): void {
    if (typeof requestAnimationFrame !== 'function' || this.baselineRafId !== null) return;
    let frames = 0;
    let firstTs = 0;
    const stepSample = (ts: number) => {
      if (frames === 0) {
        firstTs = ts;
      }
      frames += 1;
      if (frames >= 5) {
        this.baselineRafId = null;
        const elapsed = ts - firstTs;
        if (elapsed > 5 && elapsed < 1000) {
          this.fpsBefore = Math.min(240, Math.round(((frames - 1) * 1000) / elapsed));
        }
        return;
      }
      this.baselineRafId = requestAnimationFrame(stepSample);
    };
    this.baselineRafId = requestAnimationFrame(stepSample);
  }

  private startLoop(): void {
    if (this.running || typeof requestAnimationFrame !== 'function') return;
    this.running = true;
    this.paused = typeof document !== 'undefined' ? document.hidden : false;
    const now = performance.now();
    this.runStartMs = now;
    this.lastFrameMs = now;
    this.fpsFrameCount = 0;
    this.fpsAccumMs = 0;
    this.minFpsDuring = 999;
    this.attachActiveListeners();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (nowMs: number): void => {
    if (!this.running) return;
    if (this.paused) {
      this.lastFrameMs = nowMs;
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const rawDtMs = Math.max(0, nowMs - this.lastFrameMs);
    this.lastFrameMs = nowMs;

    if (rawDtMs > 0) {
      this.fpsFrameCount += 1;
      this.fpsAccumMs += rawDtMs;
      const instFps = 1000 / Math.max(1, rawDtMs);
      if (instFps < this.minFpsDuring && this.fpsFrameCount > 2) {
        this.minFpsDuring = Math.round(instFps);
      }
      if (this.fpsAccumMs >= 250) {
        this.fpsDuring = Math.round((this.fpsFrameCount * 1000) / this.fpsAccumMs);
      }
    }

    this.step(rawDtMs);
    this.render();

    if (this.activeCount > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      if (this.fpsFrameCount > 0 && this.fpsAccumMs > 0) {
        this.fpsDuring = Math.round((this.fpsFrameCount * 1000) / this.fpsAccumMs);
        if (this.minFpsDuring === 999) this.minFpsDuring = this.fpsDuring;
      }
      this.lastDurationMs = Math.round(nowMs - this.runStartMs);
      this.stop();
    }
  };

  /**
   * Pure deterministic simulation step (dtMs clamped to 50 ms).
   * Callable directly from unit tests without a browser RAF loop.
   */
  public step(rawDtMs: number): void {
    const dtMs = Math.min(CELEBRATION_MAX_DT_S * 1000, Math.max(0, rawDtMs));
    const dtS = dtMs / 1000;

    let aliveNow = 0;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.ageMs += dtMs;
      if (p.ageMs >= p.lifeMs) {
        p.active = false;
        p.alpha = 0;
        continue;
      }

      aliveNow += 1;
      const progress = p.ageMs / p.lifeMs;

      if (p.isStatic) {
        // Static reduced-motion sparkle: soft fade-in (0..0.2) and fade-out (0.65..1.0), zero movement
        if (progress < 0.2) {
          p.alpha = progress / 0.2;
        } else if (progress > 0.65) {
          p.alpha = Math.max(0, 1 - (progress - 0.65) / 0.35);
        } else {
          p.alpha = 1;
        }
        continue;
      }

      // Mars confetti physics integration
      const dragFactor = Math.exp(-p.drag * dtS);
      p.vx *= dragFactor;
      p.vy = p.vy * dragFactor + CELEBRATION_GRAVITY_PX_S2 * dtS;

      const swayVx = Math.cos(p.ageMs * 0.001 * p.swayFreq + p.swayPhase) * p.swayAmp;
      p.x += (p.vx + swayVx) * dtS;
      p.y += p.vy * dtS;
      p.rot += p.vRot * dtS;

      // Fade out smoothly over the last 30% of the lifetime (0.70 -> 1.00)
      p.alpha = progress > 0.7 ? Math.max(0, 1 - (progress - 0.7) / 0.3) : 1;
    }

    this.activeCount = aliveNow;
  }

  public render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.activeCount === 0) return;

    const dpr = this.dpr;
    const half = SPRITE_SIZE_PX / 2;

    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0.01) continue;

      const sprite = this.sprites.get(p.spriteKey);
      if (!sprite) continue;

      const cos = Math.cos(p.rot) * p.scale * dpr;
      const sin = Math.sin(p.rot) * p.scale * dpr;
      ctx.globalAlpha = p.alpha;
      ctx.setTransform(cos, sin, -sin, cos, p.x * dpr, p.y * dpr);
      ctx.drawImage(sprite, -half, -half, SPRITE_SIZE_PX, SPRITE_SIZE_PX);
    }

    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  public stop(): void {
    if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
    this.paused = false;

    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
      this.pool[i].alpha = 0;
    }
    this.activeCount = 0;

    if (this.ctx && this.canvas) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.detachActiveListeners();
  }
}

export const celebrationEngine = new CelebrationEngine();

export function celebrate(opts: CelebrateOptions): void {
  celebrationEngine.celebrate(opts);
}

export function stopCelebration(): void {
  celebrationEngine.stop();
}
