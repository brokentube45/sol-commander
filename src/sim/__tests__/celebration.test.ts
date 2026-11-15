import { describe, expect, it } from 'vitest';
import {
  CELEBRATION_CAP,
  CELEBRATION_FINAL_COUNT,
  CELEBRATION_FINAL_DURATION_MS,
  CELEBRATION_GRAVITY_PX_S2,
  CELEBRATION_MARS_GRAVITY_SCALE,
  CELEBRATION_MISSION_COUNT,
  CELEBRATION_MISSION_DURATION_MS,
  CELEBRATION_REDUCED_DURATION_MS,
  CELEBRATION_REDUCED_MAX,
  CelebrationEngine,
  CelebrationMissionId,
  CelebrationShape,
} from '../../utils/celebration';

describe('CelebrationEngine', () => {
  it('caps total active particles at 250 even on overlapping bursts', () => {
    const engine = new CelebrationEngine();
    engine.setViewportSize(1280, 720, 1);

    engine.celebrate({ kind: 'mission', missionId: 1, reducedMotion: false });
    expect(engine.getActiveCount()).toBe(CELEBRATION_MISSION_COUNT);
    expect(engine.getActiveCount()).toBeLessThanOrEqual(CELEBRATION_CAP);

    engine.celebrate({ kind: 'final', reducedMotion: false });
    expect(engine.getActiveCount()).toBe(CELEBRATION_CAP);

    engine.celebrate({ kind: 'mission', missionId: 4, reducedMotion: false });
    expect(engine.getActiveCount()).toBe(CELEBRATION_CAP);
    expect(engine.getPoolLength()).toBe(CELEBRATION_CAP);
  });

  it('expires all mission particles by 2.5s and final particles by 5.0s', () => {
    const engine = new CelebrationEngine();
    engine.setViewportSize(1280, 720, 1);

    engine.celebrate({ kind: 'mission', missionId: 2, reducedMotion: false });
    expect(engine.getActiveCount()).toBe(CELEBRATION_MISSION_COUNT);

    // Step 2500ms in 50ms chunks
    for (let t = 0; t < CELEBRATION_MISSION_DURATION_MS; t += 50) {
      engine.step(50);
    }
    expect(engine.getActiveCount()).toBe(0);

    engine.celebrate({ kind: 'final', reducedMotion: false });
    expect(engine.getActiveCount()).toBe(CELEBRATION_FINAL_COUNT);

    for (let t = 0; t < CELEBRATION_FINAL_DURATION_MS; t += 50) {
      engine.step(50);
    }
    expect(engine.getActiveCount()).toBe(0);
  });

  it('clamps single frame dt to 50 ms so tab switches do not teleport past lifetime', () => {
    const engine = new CelebrationEngine();
    engine.celebrate({ kind: 'mission', missionId: 3, reducedMotion: false });

    // A massive 5000 ms frame delta must be clamped to 50 ms
    engine.step(5000);
    expect(engine.getActiveCount()).toBe(CELEBRATION_MISSION_COUNT);

    // Completing remaining 2450 ms in valid steps expires cleanly
    for (let t = 0; t < 2450; t += 50) {
      engine.step(50);
    }
    expect(engine.getActiveCount()).toBe(0);
  });

  it('uses 0.38 Mars visual confetti gravity scale ([SIM]) and fades smoothly in the last 30%', () => {
    expect(CELEBRATION_MARS_GRAVITY_SCALE).toBe(0.38);
    expect(CELEBRATION_GRAVITY_PX_S2).toBeCloseTo(980 * 0.38, 4);

    const engine = new CelebrationEngine();
    engine.celebrate({ kind: 'mission', missionId: 1, reducedMotion: false });

    // Inspect internal particle alpha progression via a small step (< 70% life) vs late (> 85% life)
    const pool = (engine as unknown as { pool: Array<{ active: boolean; alpha: number; lifeMs: number }> }).pool;
    const sample = pool.find((p) => p.active)!;
    const life = sample.lifeMs;

    // Advance to ~50% of particle life in <=50 ms steps
    const halfSteps = Math.floor((life * 0.5) / 50);
    for (let i = 0; i < halfSteps; i++) engine.step(50);
    expect(sample.active).toBe(true);
    expect(sample.alpha).toBe(1);

    // Advance to ~85% of particle life (inside last 30% fade-out window)
    const lateTarget = life * 0.85 - halfSteps * 50;
    const lateSteps = Math.floor(lateTarget / 40);
    for (let i = 0; i < lateSteps; i++) engine.step(40);
    expect(sample.active).toBe(true);
    expect(sample.alpha).toBeLessThan(0.75);
    expect(sample.alpha).toBeGreaterThan(0);
  });

  it('respects reducedMotion: <= 20 static particles, 0 movement, 1.5s soft fade-in/out', () => {
    const engine = new CelebrationEngine();
    engine.setViewportSize(1280, 720, 1);
    engine.celebrate({ kind: 'final', reducedMotion: true });

    expect(engine.getActiveCount()).toBeLessThanOrEqual(CELEBRATION_REDUCED_MAX);
    expect(engine.getActiveCount()).toBe(CELEBRATION_REDUCED_MAX);

    // Overlapping reducedMotion trigger still never exceeds 20
    engine.celebrate({ kind: 'mission', missionId: 1, reducedMotion: true });
    expect(engine.getActiveCount()).toBeLessThanOrEqual(CELEBRATION_REDUCED_MAX);

    const pool = (
      engine as unknown as {
        pool: Array<{
          active: boolean;
          isStatic: boolean;
          x: number;
          y: number;
          vx: number;
          vy: number;
          vRot: number;
          alpha: number;
        }>;
      }
    ).pool;
    const activeSnapshots = pool
      .filter((p) => p.active)
      .map((p) => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, vRot: p.vRot, isStatic: p.isStatic }));

    for (const s of activeSnapshots) {
      expect(s.isStatic).toBe(true);
      expect(s.vx).toBe(0);
      expect(s.vy).toBe(0);
      expect(s.vRot).toBe(0);
    }

    // Step halfway (750ms) and assert zero position drift + peak alpha
    for (let t = 0; t < 750; t += 50) engine.step(50);
    const midActive = pool.filter((p) => p.active);
    expect(midActive.length).toBe(CELEBRATION_REDUCED_MAX);
    midActive.forEach((p, idx) => {
      expect(p.x).toBe(activeSnapshots[idx].x);
      expect(p.y).toBe(activeSnapshots[idx].y);
      expect(p.alpha).toBe(1);
    });

    // Finish remaining 750ms -> 0 remaining at 1500ms
    for (let t = 0; t < CELEBRATION_REDUCED_DURATION_MS - 750; t += 50) engine.step(50);
    expect(engine.getActiveCount()).toBe(0);
  });

  it('spawns mission-themed shapes for Missions 1-5 and rockets for final', () => {
    const expectedThemeShape: Record<CelebrationMissionId, CelebrationShape> = {
      1: 'bubble',
      2: 'sundot',
      3: 'icehex',
      4: 'leaf',
      5: 'shield',
    };

    ([1, 2, 3, 4, 5] as CelebrationMissionId[]).forEach((mId) => {
      const engine = new CelebrationEngine();
      engine.celebrate({ kind: 'mission', missionId: mId, reducedMotion: false });
      const pool = (engine as unknown as { pool: Array<{ active: boolean; shape: CelebrationShape }> }).pool;
      const shapes = new Set(pool.filter((p) => p.active).map((p) => p.shape));
      expect(shapes.has(expectedThemeShape[mId])).toBe(true);
    });

    const finalEngine = new CelebrationEngine();
    finalEngine.celebrate({ kind: 'final', reducedMotion: false });
    const finalPool = (finalEngine as unknown as { pool: Array<{ active: boolean; shape: CelebrationShape }> }).pool;
    const finalShapes = new Set(finalPool.filter((p) => p.active).map((p) => p.shape));
    expect(finalShapes.has('rocket')).toBe(true);
    expect(finalShapes.has('star5')).toBe(true);
  });

  it('clears all particles immediately on stop() and keeps constant pool across 20 runs', () => {
    const engine = new CelebrationEngine();
    engine.setViewportSize(1280, 720, 1);

    for (let run = 0; run < 20; run++) {
      const kind = run % 6 === 5 ? 'final' : 'mission';
      const missionId = ((run % 5) + 1) as CelebrationMissionId;
      engine.celebrate({ kind, missionId, reducedMotion: false });
      expect(engine.getPoolLength()).toBe(CELEBRATION_CAP);
      expect(engine.getActiveCount()).toBeLessThanOrEqual(CELEBRATION_CAP);

      if (run % 2 === 0) {
        engine.stop();
      } else {
        const dur = kind === 'final' ? CELEBRATION_FINAL_DURATION_MS : CELEBRATION_MISSION_DURATION_MS;
        for (let t = 0; t < dur; t += 50) {
          engine.step(50);
        }
      }
      expect(engine.getActiveCount()).toBe(0);
    }

    expect(engine.getPoolLength()).toBe(CELEBRATION_CAP);
  });
});
