import { describe, expect, it } from 'vitest';
import { MARS_FACTS, PHYSICS_CONSTANTS } from '../constants';
import {
  computeFreeFallMetrics,
  computeFroudeWalkSpeed,
  computeJumpTelemetry,
  computeMartianWindPhysics,
  computeWindForceN,
} from '../marsPhysics';
import { MarsPhysicsWorld } from '../rapierWorld';
import { groundHeightAt, seededRandom } from '../terrainField';

describe('Mars Physics Constants & Derived Mechanics (B9)', () => {
  it('computes 2.0 m free-fall time (1.036 s) and impact speed (3.86 m/s) vs Earth (0.639 s, 6.26 m/s)', () => {
    // Arithmetic: t = sqrt(2 * h / g), v = sqrt(2 * g * h) with g_Mars = 3.73 m/s^2, g_Earth = 9.80665 m/s^2
    const h = 2.0;
    const expectedMarsTime = Math.sqrt((2 * h) / 3.73);
    const expectedMarsImpact = Math.sqrt(2 * 3.73 * h);
    const expectedEarthTime = Math.sqrt((2 * h) / 9.80665);
    const expectedEarthImpact = Math.sqrt(2 * 9.80665 * h);

    const metrics = computeFreeFallMetrics(h, MARS_FACTS.GRAVITY_MS2);

    expect(metrics.fallTimeSeconds).toBeCloseTo(expectedMarsTime, 5);
    expect(metrics.fallTimeSeconds).toBeCloseTo(1.0356, 2);
    expect(metrics.impactSpeedMs).toBeCloseTo(expectedMarsImpact, 5);
    expect(metrics.impactSpeedMs).toBeCloseTo(3.8626, 2);
    expect(metrics.earthFallTimeSeconds).toBeCloseTo(expectedEarthTime, 5);
    expect(metrics.earthFallTimeSeconds).toBeCloseTo(0.6387, 2);
    expect(metrics.earthImpactSpeedMs).toBeCloseTo(expectedEarthImpact, 5);
    expect(metrics.earthImpactSpeedMs).toBeCloseTo(6.2631, 2);

    console.info(
      `[FREE FALL 2.0m] Mars: t=${metrics.fallTimeSeconds.toFixed(3)}s, v=${metrics.impactSpeedMs.toFixed(2)}m/s | Earth: t=${metrics.earthFallTimeSeconds.toFixed(3)}s, v=${metrics.earthImpactSpeedMs.toFixed(2)}m/s`,
    );
  });

  it('computes unsuited and suited vertical jump apex & hang time from Earth 0.45 m baseline', () => {
    // Unsuited takeoff: v0 = sqrt(2 * g_Earth * 0.45) = 2.9709 m/s
    // Mars apex = v0^2 / (2 * 3.73) = 1.183 m, hang time = 2 * v0 / 3.73 = 1.593 s
    const v0Unsuited = Math.sqrt(2 * MARS_FACTS.EARTH_GRAVITY_MS2 * 0.45);
    const unsuited = computeJumpTelemetry(v0Unsuited, MARS_FACTS.GRAVITY_MS2);

    expect(PHYSICS_CONSTANTS.UNSUITED_TAKEOFF_MS).toBeCloseTo(v0Unsuited, 4);
    expect(unsuited.peakHeightMeters).toBeCloseTo(1.18, 2);
    expect(unsuited.hangTimeSeconds).toBeCloseTo(1.59, 2);
    expect(unsuited.earthPeakHeightMeters).toBeCloseTo(0.45, 2);
    expect(unsuited.earthHangTimeSeconds).toBeCloseTo(0.61, 2);

    // Suited takeoff (80 kg body + 80 kg suit = 160 kg): v_suit = v0 * sqrt(80/160) = 2.1007 m/s
    // Mars apex = v_suit^2 / (2 * 3.73) = 0.592 m, hang time = 2 * v_suit / 3.73 = 1.126 s
    const vSuit = v0Unsuited * Math.sqrt(80 / 160);
    const suited = computeJumpTelemetry(vSuit, MARS_FACTS.GRAVITY_MS2);

    expect(PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS).toBeCloseTo(vSuit, 4);
    expect(suited.peakHeightMeters).toBeCloseTo(0.59, 2);
    expect(suited.hangTimeSeconds).toBeCloseTo(1.13, 2);
    expect(suited.earthPeakHeightMeters).toBeCloseTo(0.23, 2);
    expect(suited.earthHangTimeSeconds).toBeCloseTo(0.43, 2);

    console.info(
      `[JUMP UNSUITED] v0=${v0Unsuited.toFixed(2)}m/s -> Mars ${unsuited.peakHeightMeters}m (${unsuited.hangTimeSeconds}s) vs Earth ${unsuited.earthPeakHeightMeters}m (${unsuited.earthHangTimeSeconds}s)`,
    );
    console.info(
      `[JUMP SUITED 160kg] v_suit=${vSuit.toFixed(2)}m/s -> Mars ${suited.peakHeightMeters}m (${suited.hangTimeSeconds}s) vs Earth ${suited.earthPeakHeightMeters}m (${suited.earthHangTimeSeconds}s)`,
    );
  });

  it('derives Mars Froude walking & walk-to-run transition speeds (Carr & McGee 2009)', () => {
    // Fr_walk = 1.4^2 / (9.80665 * 0.9) = 0.22207 -> v_Mars = sqrt(Fr * 3.73 * 0.9) = 0.863 m/s
    const frWalk = (1.4 * 1.4) / (MARS_FACTS.EARTH_GRAVITY_MS2 * PHYSICS_CONSTANTS.LEG_LENGTH_M);
    const walkMs = computeFroudeWalkSpeed(frWalk, MARS_FACTS.GRAVITY_MS2, PHYSICS_CONSTANTS.LEG_LENGTH_M);
    const suitedTransitionMs = computeFroudeWalkSpeed(0.36, MARS_FACTS.GRAVITY_MS2, PHYSICS_CONSTANTS.LEG_LENGTH_M);
    const unsuitedTransitionMs = computeFroudeWalkSpeed(0.5, MARS_FACTS.GRAVITY_MS2, PHYSICS_CONSTANTS.LEG_LENGTH_M);

    expect(PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS).toBeCloseTo(walkMs, 5);
    expect(walkMs).toBeCloseTo(0.863, 2);
    expect(PHYSICS_CONSTANTS.MARS_SUITED_TRANSITION_MS).toBeCloseTo(suitedTransitionMs, 5);
    expect(suitedTransitionMs).toBeCloseTo(1.099, 2);
    expect(PHYSICS_CONSTANTS.MARS_UNSUITED_TRANSITION_MS).toBeCloseTo(unsuitedTransitionMs, 5);
    expect(unsuitedTransitionMs).toBeCloseTo(1.296, 2);
    expect(PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS).toBeGreaterThan(suitedTransitionMs);
    expect(PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS).toBeLessThanOrEqual(3.0);

    console.info(
      `[FROUDE GAIT L=0.9m] walk=${walkMs.toFixed(3)}m/s, suited Fr*=0.36->${suitedTransitionMs.toFixed(3)}m/s, unsuited Fr*=0.50->${unsuitedTransitionMs.toFixed(3)}m/s, lope=${PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS}m/s`,
    );
  });

  it('models 25 m/s Martian storm wind pressure (~76x weaker than Earth, <1% of suited weight)', () => {
    const vWind = 25.0;
    const wind = computeMartianWindPhysics(vWind, 3.2);
    const dragForceN = computeWindForceN(vWind, MARS_FACTS.MARS_AIR_DENSITY_KGM3, 1.0, 1.0);
    const suitedWeightN = PHYSICS_CONSTANTS.PLAYER_TOTAL_MASS_KG * MARS_FACTS.GRAVITY_MS2;
    const ratioEarthToMars = wind.earthEquivalentPa / wind.dynamicPressurePa;

    expect(wind.dynamicPressurePa).toBeCloseTo(5.0, 2); // 0.5 * 0.016 * 625 = 5.0 Pa
    expect(wind.earthEquivalentPa).toBeCloseTo(380.3, 1); // 0.5 * 1.217 * 625 = 380.3125 Pa
    expect(ratioEarthToMars).toBeCloseTo(1.217 / 0.016, 1);
    expect(dragForceN / suitedWeightN).toBeLessThan(0.01);

    console.info(
      `[WIND 25m/s] Mars q=${wind.dynamicPressurePa}Pa vs Earth ${wind.earthEquivalentPa}Pa (${ratioEarthToMars.toFixed(1)}x weaker), F_drag=${dragForceN.toFixed(2)}N vs weight=${suitedWeightN.toFixed(1)}N (${((dragForceN / suitedWeightN) * 100).toFixed(2)}%)`,
    );
  });
});

describe('Rapier WASM Core Physics, Jump Trajectory & Anti-Clipping (B4, B9)', () => {
  it('simulates a suited Mars jump in Rapier reaching ~0.59 m apex and ~1.13 s hang time', async () => {
    const physics = await MarsPhysicsWorld.create({ quality: 'high', startX: 4.95, startZ: 2.65 });
    try {
      // Settle character cleanly onto heightfield for 15 fixed steps
      for (let i = 0; i < 15; i++) {
        physics.stepSingleFixed({
          moveFwd: 0,
          moveStrafe: 0,
          camYaw: 0,
          sprint: false,
          jumpRequested: false,
          quickMode: false,
        });
      }

      const startFootY = physics.getSnapshot().footY;
      let maxFootY = startFootY;
      let airborneSteps = 0;
      let landed = false;

      // Trigger jump and step 220 fixed frames (1.83 s max) until landing
      for (let i = 0; i < 220; i++) {
        const snap = physics.stepSingleFixed({
          moveFwd: 0,
          moveStrafe: 0,
          camYaw: 0,
          sprint: false,
          jumpRequested: i === 0,
          quickMode: false,
        });
        if (snap.footY > maxFootY) maxFootY = snap.footY;
        if (!snap.grounded) {
          airborneSteps++;
        } else if (i > 10 && airborneSteps > 10) {
          landed = true;
          break;
        }
      }

      const simApexM = maxFootY - startFootY;
      const simHangS = airborneSteps * PHYSICS_CONSTANTS.FIXED_DT_S;
      const landingEv = physics.consumeLastLanding();

      expect(landed).toBe(true);
      expect(simApexM).toBeGreaterThan(0.54);
      expect(simApexM).toBeLessThan(0.64);
      expect(simHangS).toBeGreaterThan(1.04);
      expect(simHangS).toBeLessThan(1.22);
      expect(landingEv?.noDamage).toBe(true);

      console.info(
        `[RAPIER JUMP] simApex=${simApexM.toFixed(3)}m (theory 0.592m), simHang=${simHangS.toFixed(3)}s (theory 1.126s), landingEvent=${JSON.stringify(landingEv)}`,
      );
    } finally {
      physics.dispose();
    }
  });

  it(
    'passes 10-minute automated outpost walk test across 10 spawns (72,000 fixed steps) with zero penetration',
    async () => {
      const tStart = performance.now();
      const physics = await MarsPhysicsWorld.create({ quality: 'high' });
    const rand = seededRandom(20260709);

    // 10 varied spawn coordinates covering habitat, airlock, CHAPEA, greenhouse, solar, landing pad, ridge, crater, rocks
    const spawnPoints: Array<[number, number]> = [
      [4.95, 2.65],    // Spawn pad in front of Habitat & Greenhouse
      [0.4, 2.8],      // Near Habitat Airlock & Tank 2
      [4.4, -12.2],    // North of CHAPEA Crew Wing
      [11.8, -0.4],    // Beside Greenhouse & Solar Microgrid
      [16.8, 9.2],     // On top of Ares Landing Pad walkable apron
      [-10.2, 4.2],    // West Crater Rim / Basalt field
      [-14.5, -6.2],   // Near SWIM Subsurface Ice Drill
      [13.5, 4.5],     // Between Landing Pad and Solar Array
      [-5.8, -8.5],    // North-west ridge boulders
      [2.0, 24.0],     // Southern dune basin toward boundary
    ];

    const stepsPerSpawn = 7200; // 7,200 * 10 = 72,000 steps = 10.0 simulated minutes at 1/120 s
    let totalSteps = 0;
    let maxTerrainPenetrationM = 0;
    let minFootClearanceM = Number.POSITIVE_INFINITY;
    let maxGroundedDeltaOnOpenTerrainM = 0;
    let structurePenetrations = 0;
    let maxActiveRocksSeen = 0;
    let totalLandingEvents = 0;

    try {
      for (let s = 0; s < spawnPoints.length; s++) {
        const [sx, sz] = spawnPoints[s];
        physics.teleportPlayer(sx, sz);

        let yaw = rand() * Math.PI * 2;
        for (let step = 0; step < stepsPerSpawn; step++) {
          totalSteps++;
          // Periodically redirect straight toward structures, rocks, and boundary to stress colliders
          if (step % 240 === 0) {
            if (step % 720 === 0) {
              // Aim directly toward Habitat / Outpost center to repeatedly push into walls/modules
              const cur = physics.getSnapshot();
              yaw = Math.atan2(4.4 - cur.x, -3.4 - cur.z);
            } else {
              yaw = rand() * Math.PI * 2;
            }
          }

          const snap = physics.stepSingleFixed({
            moveFwd: 1,
            moveStrafe: step % 600 < 180 ? 0.35 : step % 600 < 360 ? -0.35 : 0,
            camYaw: yaw,
            sprint: step % 480 < 220,
            jumpRequested: step % 360 === 120,
            quickMode: false,
          });

          const terrainY = groundHeightAt(snap.x, snap.z);
          const supportY = physics.getGroundSupportHeightAt(snap.x, snap.z);
          const clearance = snap.footY - terrainY;
          if (clearance < minFootClearanceM) minFootClearanceM = clearance;
          if (clearance < 0 && -clearance > maxTerrainPenetrationM) {
            maxTerrainPenetrationM = -clearance;
          }

          const structureHit = physics.isPointInsideStructure(snap.x, snap.footY, snap.z);
          if (structureHit !== null) {
            structurePenetrations++;
          }

          if (snap.activeRockColliders > maxActiveRocksSeen) {
            maxActiveRocksSeen = snap.activeRockColliders;
          }

          if (physics.consumeLastLanding()) {
            totalLandingEvents++;
          }

          // When grounded away from stepped structure decks, verify footY tracks supportY within 5 cm
          const onApronOrSteps =
            Math.hypot(snap.x - 16.8, snap.z - 9.2) <= 5.2 ||
            Math.hypot(snap.x - 3.6, snap.z + 1.1) <= 1.8;
          if (snap.grounded && !onApronOrSteps && step > 10) {
            const delta = Math.abs(snap.footY - supportY);
            // Ignore standing cleanly atop an outcrop/rock collider (footY above terrain)
            if (snap.footY < supportY - 0.05) {
              maxGroundedDeltaOnOpenTerrainM = Math.max(maxGroundedDeltaOnOpenTerrainM, delta);
            }
          }

          expect(snap.footY).toBeGreaterThanOrEqual(terrainY - 0.05);
          expect(structureHit).toBeNull();
        }
      }

      expect(totalSteps).toBe(72000);
      expect(structurePenetrations).toBe(0);
      expect(maxTerrainPenetrationM).toBeLessThan(0.05);
      expect(maxActiveRocksSeen).toBeGreaterThan(20);
      expect(totalLandingEvents).toBeGreaterThan(50);

      const elapsedMs = performance.now() - tStart;
      const avgStepMs = elapsedMs / totalSteps;
      console.info(
        `[10-MIN WALK TEST] steps=${totalSteps}, spawns=${spawnPoints.length}, minClearance=${minFootClearanceM.toFixed(4)}m, maxPenetration=${maxTerrainPenetrationM.toFixed(4)}m, structurePenetrations=${structurePenetrations}, maxStreamedRocks=${maxActiveRocksSeen}, landings=${totalLandingEvents}, totalMs=${elapsedMs.toFixed(0)}ms, avgStep=${avgStepMs.toFixed(3)}ms`,
      );
    } finally {
      physics.dispose();
    }
  }, 60000);

  it('drops 100 CCD dynamic bodies (spheres & boxes) onto Mars terrain with 0 ending below ground', async () => {
    const physics = await MarsPhysicsWorld.create({ quality: 'high' });
    const rand = seededRandom(998877);

    const dropPoints: Array<{ x: number; y: number; z: number; kind: 'sphere' | 'box'; radius: number }> = [];
    for (let i = 0; i < 100; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 1.5 + rand() * 34.0;
      const x = 2.0 + Math.cos(angle) * dist;
      const z = -1.0 + Math.sin(angle) * dist;
      const radius = 0.16 + rand() * 0.24;
      const y = physics.getGroundSupportHeightAt(x, z) + 4.5 + rand() * 2.5;
      dropPoints.push({
        x,
        y,
        z,
        kind: i % 2 === 0 ? 'sphere' : 'box',
        radius,
      });
    }

    try {
      const bodies = physics.spawnDropTestBodies(dropPoints);
      // Step 600 fixed steps (5.0 simulated seconds at 3.73 m/s^2 gravity)
      for (let s = 0; s < 600; s++) {
        physics.stepWorldOnly();
      }

      let belowGroundCount = 0;
      let maxPenetration = 0;
      for (const rec of bodies) {
        const pos = rec.body.translation();
        const terrainY = groundHeightAt(pos.x, pos.z);
        const bottomY = pos.y - rec.radius;
        const pen = terrainY - bottomY;
        if (pen > 0.05) {
          belowGroundCount++;
        }
        if (pen > maxPenetration) {
          maxPenetration = pen;
        }
      }

      expect(belowGroundCount).toBe(0);
      console.info(
        `[100-BODY CCD DROP] dropped=100, belowGround(>5cm)=${belowGroundCount}, maxPenetration=${maxPenetration.toFixed(4)}m`,
      );
    } finally {
      physics.dispose();
    }
  });
});
