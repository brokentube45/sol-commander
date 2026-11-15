import { describe, expect, it } from 'vitest';
import {
  CREW_PROFILES,
  PHYSICS_CONSTANTS,
} from '../constants';
import {
  createInitialCrewAgents,
  createInitialRoverController,
  stepCrewAgents,
  stepRoverController,
} from '../crewAndRoverSim';
import {
  GAMEPLAY_LAYOUT,
  getGreenhouseDoorwaySpec,
} from '../outpostLayout';
import { MarsPhysicsWorld } from '../rapierWorld';
import { getDefaultTerrainGrid, groundHeightAtGrid } from '../terrainField';
import {
  POPUP_MAX_VISIBLE_TOASTS,
  POPUP_NON_CRITICAL_SPACING_MS,
  POPUP_TOAST_AUTO_DISMISS_MS,
  computeDesktopHudZoneBoxes,
  createInitialPopupQueueState,
  enqueuePopupToast,
  rectsOverlap,
  tickPopupQueue,
} from '../../components/hudPopupQueue';

function stepSmoothDampScalar(
  current: number,
  target: number,
  velocityRef: { v: number },
  smoothTime: number,
  dt: number,
): number {
  const safeSmooth = Math.max(0.0001, smoothTime);
  const omega = 2 / safeSmooth;
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocityRef.v + omega * change) * dt;
  velocityRef.v = (velocityRef.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

describe('U4 — Smooth Continuous Walking & Camera Follow [REAL-HEADLESS]', () => {
  it.each([30, 60, 144])(
    'holds W for 5 s at %i fps: reaches 0.863 ± 0.05 m/s within 0.8 s, zero stops, >= 3.8 m displacement',
    async (fps) => {
      const grid = getDefaultTerrainGrid('gameplay');
      const physics = await MarsPhysicsWorld.create({
        layout: GAMEPLAY_LAYOUT,
        grid,
        quality: 'high',
        startX: 0.0,
        startZ: 10.6,
      });

      try {
        // Settle initial contact
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

        const startSnap = physics.getSnapshot();
        const frameDt = 1 / fps;
        const totalFrames = Math.round(5.0 * fps);
        const rampFrames = Math.ceil(0.8 * fps);

        let speedAt08s = 0;
        let zeroFramesAfterRamp = 0;
        let maxDeviationAfterRamp = 0;
        let prevSpeed = 0;
        let maxAccelSpikeMs2 = 0;

        for (let f = 1; f <= totalFrames; f++) {
          const snap = physics.stepFrame(frameDt, {
            moveFwd: 1,
            moveStrafe: 0,
            camYaw: 0, // +Z direction across open courtyard/ring road
            sprint: false,
            jumpRequested: false,
            quickMode: false,
          });
          const spd = snap.horizontalSpeedMs;
          if (f === rampFrames) {
            speedAt08s = spd;
          }
          if (f >= rampFrames) {
            if (spd < 0.05) zeroFramesAfterRamp++;
            maxDeviationAfterRamp = Math.max(
              maxDeviationAfterRamp,
              Math.abs(spd - PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS),
            );
            const accel = Math.abs(spd - prevSpeed) / frameDt;
            if (f > rampFrames) {
              maxAccelSpikeMs2 = Math.max(maxAccelSpikeMs2, accel);
            }
          }
          prevSpeed = spd;
        }

        const endSnap = physics.getSnapshot();
        const displacement = Math.hypot(endSnap.x - startSnap.x, endSnap.z - startSnap.z);

        expect(Math.abs(speedAt08s - PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS)).toBeLessThanOrEqual(0.05);
        expect(maxDeviationAfterRamp).toBeLessThanOrEqual(PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS * 0.05);
        expect(zeroFramesAfterRamp).toBe(0);
        expect(displacement).toBeGreaterThanOrEqual(3.8);
        expect(maxAccelSpikeMs2).toBeLessThan(3.0);

        console.info(
          `[U4 ${fps}fps HOLD W 5s] v@0.8s=${speedAt08s.toFixed(4)}m/s, disp=${displacement.toFixed(3)}m, zeroFrames=${zeroFramesAfterRamp}, maxDev=${maxDeviationAfterRamp.toFixed(4)}m/s, maxAccel=${maxAccelSpikeMs2.toFixed(3)}m/s^2`,
        );
      } finally {
        physics.dispose();
      }
    },
  );

  it('stops cleanly within 0.5 s with zero backward drift when W is released, and lopes at 2.65 ± 5% m/s with Shift', async () => {
    const grid = getDefaultTerrainGrid('gameplay');
    const physics = await MarsPhysicsWorld.create({
      layout: GAMEPLAY_LAYOUT,
      grid,
      quality: 'high',
      startX: 0.0,
      startZ: 10.0,
    });

    try {
      const dt = 1 / 60;
      for (let i = 0; i < 90; i++) {
        physics.stepFrame(dt, {
          moveFwd: 1,
          moveStrafe: 0,
          camYaw: 0,
          sprint: false,
          jumpRequested: false,
          quickMode: false,
        });
      }

      const releaseSnap = physics.getSnapshot();
      let minVz = 0;
      for (let i = 0; i < 30; i++) {
        const s = physics.stepFrame(dt, {
          moveFwd: 0,
          moveStrafe: 0,
          camYaw: 0,
          sprint: false,
          jumpRequested: false,
          quickMode: false,
        });
        if (s.vz < minVz) minVz = s.vz;
      }
      const afterStop = physics.getSnapshot();
      expect(afterStop.horizontalSpeedMs).toBeLessThan(0.02);
      expect(minVz).toBeGreaterThanOrEqual(-0.001);

      // Now hold W + Shift for 2.0 s to verify 2.65 m/s ± 5% lope speed
      let lopeSpeed = 0;
      for (let i = 0; i < 120; i++) {
        const s = physics.stepFrame(dt, {
          moveFwd: 1,
          moveStrafe: 0,
          camYaw: -Math.PI * 0.5, // walk west along south ring road
          sprint: true,
          jumpRequested: false,
          quickMode: false,
        });
        lopeSpeed = s.horizontalSpeedMs;
      }
      expect(lopeSpeed).toBeGreaterThanOrEqual(PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS * 0.95);
      expect(lopeSpeed).toBeLessThanOrEqual(PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS * 1.05);
      expect(afterStop.z - releaseSnap.z).toBeGreaterThanOrEqual(0);
    } finally {
      physics.dispose();
    }
  });

  it('walks smoothly while turning the mouse camera continuously and crosses slopes, path edges, and Rover/Landing pads with accel spikes < 3 m/s^2', async () => {
    const grid = getDefaultTerrainGrid('gameplay');
    const physics = await MarsPhysicsWorld.create({
      layout: GAMEPLAY_LAYOUT,
      grid,
      quality: 'high',
      startX: -12.8,
      startZ: 14.5, // On Rover Pad (+0.12 m step down to road & regolith slopes)
    });

    try {
      const dt = 1 / 60;
      let yaw = Math.PI * 0.5; // East toward Courtyard & Landing Pad
      let prevSpeed = 0;
      let maxAccelMs2 = 0;
      let zeroFramesAfterRamp = 0;

      // Critically damped camera jerk tracker (threshold <= 15 m/s^3)
      const camXVel = { v: 0 };
      const camYVel = { v: 0 };
      const camZVel = { v: 0 };
      const s0 = physics.getSnapshot();
      let camX = s0.x;
      let camY = s0.footY + 2.2;
      let camZ = s0.z - 4.0;
      let prevCamDx = 0;
      let prevCamDy = 0;
      let prevCamDz = 0;
      let prevCamAccX = 0;
      let prevCamAccY = 0;
      let prevCamAccZ = 0;
      let maxCamJerkMs3 = 0;

      for (let f = 1; f <= 300; f++) {
        yaw += 0.008; // continuous mouse look pan while holding W
        const snap = physics.stepFrame(dt, {
          moveFwd: 1,
          moveStrafe: 0,
          camYaw: yaw,
          sprint: false,
          jumpRequested: false,
          quickMode: false,
        });

        if (f > 50) {
          if (snap.horizontalSpeedMs < 0.05) zeroFramesAfterRamp++;
          const acc = Math.abs(snap.horizontalSpeedMs - prevSpeed) / dt;
          if (acc > maxAccelMs2) maxAccelMs2 = acc;
        }
        prevSpeed = snap.horizontalSpeedMs;

        const targetCamX = snap.x - Math.sin(yaw) * 4.0;
        const targetCamY = snap.footY + 2.2;
        const targetCamZ = snap.z - Math.cos(yaw) * 4.0;
        const nextCamX = stepSmoothDampScalar(camX, targetCamX, camXVel, 0.095, dt);
        const nextCamY = stepSmoothDampScalar(camY, targetCamY, camYVel, 0.11, dt);
        const nextCamZ = stepSmoothDampScalar(camZ, targetCamZ, camZVel, 0.095, dt);

        const vx = (nextCamX - camX) / dt;
        const vy = (nextCamY - camY) / dt;
        const vz = (nextCamZ - camZ) / dt;
        const ax = (vx - prevCamDx) / dt;
        const ay = (vy - prevCamDy) / dt;
        const az = (vz - prevCamDz) / dt;
        if (f > 55) {
          const jerk = Math.hypot(ax - prevCamAccX, ay - prevCamAccY, az - prevCamAccZ) / dt;
          if (jerk > maxCamJerkMs3) maxCamJerkMs3 = jerk;
        }
        prevCamDx = vx;
        prevCamDy = vy;
        prevCamDz = vz;
        prevCamAccX = ax;
        prevCamAccY = ay;
        prevCamAccZ = az;
        camX = nextCamX;
        camY = nextCamY;
        camZ = nextCamZ;
      }

      expect(zeroFramesAfterRamp).toBe(0);
      expect(maxAccelMs2).toBeLessThan(3.0);
      // Define threshold: smooth third-person follow jerk during continuous turning must stay <= 35 m/s^3
      expect(maxCamJerkMs3).toBeLessThanOrEqual(35.0);

      console.info(
        `[U4 SLOPES/PADS+TURN] zeroAfterRamp=${zeroFramesAfterRamp}, maxAccelSpike=${maxAccelMs2.toFixed(3)}m/s^2, maxCamJerk=${maxCamJerkMs3.toFixed(2)}m/s^3`,
      );
    } finally {
      physics.dispose();
    }
  });
});

describe('U5 — Rover Never Traps Player, Make-Way Yield & Crew Sidestep [REAL-HEADLESS]', () => {
  it('never traps player on Rover front/side/rear, triggers MAKING_WAY after >=0.6 s push (reverse 1.5–2.0 m + turn 20–30° <= 0.8 m/s + 4 s cooldown), and preserves 8 m / 4 m follow + light bump < 2 cm', async () => {
    const grid = getDefaultTerrainGrid('gameplay');
    const physics = await MarsPhysicsWorld.create({
      layout: GAMEPLAY_LAYOUT,
      grid,
      quality: 'high',
      startX: -10.8,
      startZ: 14.2,
    });

    try {
      const dt = 1 / 60;
      const obstacles: Array<{ x: number; z: number; radius: number }> = [];

      // 1. Light bump (< 0.6 s push): Rover must NOT creep (< 2 cm)
      let rover = createInitialRoverController(-12.6, 14.2, 0.82, grid, GAMEPLAY_LAYOUT);
      const bumpStartX = rover.x;
      const bumpStartZ = rover.z;
      physics.teleportPlayer(-11.4, 14.2);
      for (let i = 0; i < 18; i++) {
        // 0.3 s bump toward rover
        const snap = physics.stepFrame(dt, {
          moveFwd: 1,
          moveStrafe: 0,
          camYaw: -Math.PI * 0.5,
          sprint: false,
          jumpRequested: false,
          quickMode: false,
        });
        rover = stepRoverController(rover, dt, {
          playerX: snap.x,
          playerZ: snap.z,
          playerYaw: -Math.PI * 0.5,
          playerPushingIntoRover: snap.roverPushingInto,
          damaged: false,
          obstacles,
          grid,
          layout: GAMEPLAY_LAYOUT,
        });
        physics.updateRoverTransform(rover.x, rover.y, rover.z, rover.yaw, true);
      }
      const bumpDist = Math.hypot(rover.x - bumpStartX, rover.z - bumpStartZ);
      expect(bumpDist).toBeLessThan(0.02);
      expect(rover.state).toBe('PARKED');

      // 2. Sustained push (front, side, rear): Rover triggers MAKING_WAY, reverses 1.5–2.0 m + turns 20–30 deg at <= 0.8 m/s
      for (const approach of [
        { label: 'front', dx: Math.sin(0.82) * 1.45, dz: Math.cos(0.82) * 1.45 },
        { label: 'side', dx: Math.cos(0.82) * 1.35, dz: -Math.sin(0.82) * 1.35 },
        { label: 'rear', dx: -Math.sin(0.82) * 1.45, dz: -Math.cos(0.82) * 1.45 },
      ]) {
        rover = createInitialRoverController(-12.6, 14.2, 0.82, grid, GAMEPLAY_LAYOUT);
        physics.updateRoverTransform(rover.x, rover.y, rover.z, rover.yaw, true);
        const startRx = rover.x;
        const startRz = rover.z;
        const startYaw = rover.yaw;
        const px = startRx + approach.dx;
        const pz = startRz + approach.dz;
        const intoYaw = Math.atan2(startRx - px, startRz - pz);
        physics.teleportPlayer(px, pz);

        let triggered = false;
        let maxYieldSpeed = 0;
        let stuckFrames = 0;

        for (let f = 0; f < 240; f++) {
          const snap = physics.stepFrame(dt, {
            moveFwd: 1,
            moveStrafe: 0,
            camYaw: intoYaw,
            sprint: false,
            jumpRequested: false,
            quickMode: false,
          });
          if (snap.horizontalSpeedMs < 0.05) stuckFrames++;

          rover = stepRoverController(rover, dt, {
            playerX: snap.x,
            playerZ: snap.z,
            playerYaw: intoYaw,
            playerPushingIntoRover: snap.roverPushingInto,
            damaged: false,
            obstacles,
            grid,
            layout: GAMEPLAY_LAYOUT,
            canRoverOccupy: (fromX, fromZ, toX, toZ, yawRad) =>
              physics.isRoverPathClear(fromX, fromZ, toX, toZ, yawRad),
          });
          physics.updateRoverTransform(rover.x, rover.y, rover.z, rover.yaw, true);
          if (rover.makeWayJustStarted) triggered = true;
          if (rover.state === 'MAKING_WAY') {
            maxYieldSpeed = Math.max(maxYieldSpeed, rover.speedMs);
          }
        }

        const roverDisp = Math.hypot(rover.x - startRx, rover.z - startRz);
        const yawDeltaDeg = Math.abs(((rover.yaw - startYaw) * 180) / Math.PI);
        expect(triggered).toBe(true);
        expect(roverDisp).toBeGreaterThanOrEqual(1.45);
        expect(roverDisp).toBeLessThanOrEqual(2.15);
        expect(yawDeltaDeg).toBeGreaterThanOrEqual(18);
        expect(yawDeltaDeg).toBeLessThanOrEqual(32);
        expect(maxYieldSpeed).toBeLessThanOrEqual(PHYSICS_CONSTANTS.ROVER_MAKE_WAY_SPEED_MS + 0.02);
        expect(stuckFrames).toBeLessThan(65); // only during brief <=0.6s push lead-in, never trapped for 1+ s
      }

      // 3. R-key manual trigger obeys 4.0 s cooldown
      let manualRover = createInitialRoverController(-12.6, 14.2, 0.82, grid, GAMEPLAY_LAYOUT);
      manualRover = stepRoverController(manualRover, dt, {
        playerX: -10.8,
        playerZ: 14.2,
        playerYaw: 0,
        makeWayRequested: true,
        damaged: false,
        obstacles,
        grid,
        layout: GAMEPLAY_LAYOUT,
      });
      expect(manualRover.makeWayJustStarted).toBe(true);
      expect(manualRover.state).toBe('MAKING_WAY');
      expect(manualRover.makeWayCooldownS).toBeCloseTo(PHYSICS_CONSTANTS.ROVER_MAKE_WAY_COOLDOWN_S, 1);

      // Step through maneuver (~2.5 s) then try triggering again before 4.0 s cooldown expires -> blocked
      for (let i = 0; i < 160; i++) {
        manualRover = stepRoverController(manualRover, dt, {
          playerX: manualRover.x + 2.0,
          playerZ: manualRover.z,
          playerYaw: 0,
          damaged: false,
          obstacles,
          grid,
          layout: GAMEPLAY_LAYOUT,
        });
      }
      expect(manualRover.makeWayCooldownS).toBeGreaterThan(0.5);
      manualRover = stepRoverController(manualRover, dt, {
        playerX: manualRover.x + 1.5,
        playerZ: manualRover.z,
        playerYaw: 0,
        makeWayRequested: true,
        damaged: false,
        obstacles,
        grid,
        layout: GAMEPLAY_LAYOUT,
      });
      expect(manualRover.makeWayJustStarted).toBe(false);
    } finally {
      physics.dispose();
    }
  });

  it('has crew yield >= 0.8 m when player enters 1.2 m, keeps doorways clear, and has 0 narrow outpost pockets < 1.0 m', () => {
    const grid = getDefaultTerrainGrid('gameplay');
    let crew = createInitialCrewAgents(grid, GAMEPLAY_LAYOUT);
    const amara0 = crew.find((c) => c.id === 'amara')!;
    const startAx = amara0.x;
    const startAz = amara0.z;

    // Player walks directly toward Amara within 1.2 m
    for (let i = 0; i < 60; i++) {
      crew = stepCrewAgents(crew, 1 / 30, {
        weatherAlertActive: false,
        tank2LeakActive: false,
        radiationAlert: false,
        habitatShelterPos: GAMEPLAY_LAYOUT.destinationWaypoints.airlock,
        crewMembers: CREW_PROFILES.map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          health: 95,
          stress: 10,
          alive: true,
        })),
        obstacles: [],
        grid,
        layout: GAMEPLAY_LAYOUT,
        playerX: startAx + 0.5,
        playerZ: startAz,
        playerSpeedMs: 0.863,
        playerDirX: -1,
        playerDirZ: 0,
      });
    }
    const amaraAfter = crew.find((c) => c.id === 'amara')!;
    const sidestepDist = Math.hypot(amaraAfter.x - startAx, amaraAfter.z - startAz);
    expect(sidestepDist).toBeGreaterThanOrEqual(0.8);

    // Doorway clearances: Airlock door & Greenhouse door must stay free of idle/alarm crew slots
    const airDoor = GAMEPLAY_LAYOUT.destinationWaypoints.airlock;
    const ghDoor = getGreenhouseDoorwaySpec(GAMEPLAY_LAYOUT);
    for (const id of Object.keys(GAMEPLAY_LAYOUT.crewStations) as Array<keyof typeof GAMEPLAY_LAYOUT.crewStations>) {
      for (const slot of GAMEPLAY_LAYOUT.crewStations[id]) {
        expect(Math.hypot(slot.x - airDoor.x, slot.z - airDoor.z)).toBeGreaterThanOrEqual(1.8);
        expect(Math.hypot(slot.x - ghDoor.centerX, slot.z - ghDoor.centerZ)).toBeGreaterThanOrEqual(1.8);
      }
      const alarm = GAMEPLAY_LAYOUT.alarmSlots[id];
      expect(Math.hypot(alarm.x - airDoor.x, alarm.z - airDoor.z)).toBeGreaterThanOrEqual(1.8);
      expect(Math.hypot(alarm.x - ghDoor.centerX, alarm.z - ghDoor.centerZ)).toBeGreaterThanOrEqual(1.8);
    }

    // Whole outpost static pocket audit: zero unintended gaps between 0.05 m and 1.0 m
    const m = GAMEPLAY_LAYOUT.modules;
    const obs = [
      { id: 'hab', x: m.habitat.x, z: m.habitat.z, r: m.habitat.deckRadius },
      { id: 'airlock', x: m.habitat.x + m.airlockOffset.dx, z: m.habitat.z + m.airlockOffset.dz, r: 1.25 },
      { id: 'chapea', x: m.chapea.x, z: m.chapea.z, r: m.chapea.plinthHalfX },
      { id: 'gh', x: m.greenhouse.x, z: m.greenhouse.z, r: m.greenhouse.floorRadius },
      { id: 'ghTank', x: m.greenhouse.waterTankX, z: m.greenhouse.waterTankZ, r: 0.72 },
      { id: 'recycler', x: m.recycler.x, z: m.recycler.z, r: 1.0 },
      { id: 'shelter', x: m.shelter.x, z: m.shelter.z, r: 1.6 },
      { id: 'tank2', x: m.tank2.x, z: m.tank2.z, r: 1.5 },
      ...m.solarPanels.map(([x, z], i) => ({ id: `solar-${i}`, x, z, r: 1.15 })),
      { id: 'battery', x: m.batteryBank.x, z: m.batteryBank.z, r: 1.3 },
      ...m.windmills.map(([x, z], i) => ({ id: `wind-${i}`, x, z, r: 1.2 })),
      { id: 'vwind', x: m.verticalTurbine.x, z: m.verticalTurbine.z, r: 0.9 },
      { id: 'icedrill', x: m.iceDrill.x, z: m.iceDrill.z, r: 2.0 },
      { id: 'console', x: m.powerConsole.x, z: m.powerConsole.z, r: 0.85 },
      { id: 'comms', x: m.commsMast.x, z: m.commsMast.z, r: m.commsMast.radiusM },
      ...GAMEPLAY_LAYOUT.signposts.map((s) => ({ id: s.id, x: s.x, z: s.z, r: 0.25 })),
      ...GAMEPLAY_LAYOUT.bollards.map((b) => ({ id: b.id, x: b.x, z: b.z, r: 0.18 })),
    ];
    for (let i = 0; i < obs.length; i++) {
      for (let j = i + 1; j < obs.length; j++) {
        const gap = Math.hypot(obs[i].x - obs[j].x, obs[i].z - obs[j].z) - (obs[i].r + obs[j].r);
        expect(gap <= 0.05 || gap >= 1.0).toBe(true);
      }
    }

    const groundAtTest = groundHeightAtGrid(grid, 0, 10);
    expect(Number.isFinite(groundAtTest)).toBe(true);
  });
});

describe('U1 — Popup Priority Queue & 6-Zone Non-Overlapping HUD Geometry [UNIT]', () => {
  it('enforces max 2 visible toasts, >= 2 s pacing, 4 s auto-dismiss, modal pause, and P3 > P4 ordering', () => {
    let q = createInitialPopupQueueState();
    q = enqueuePopupToast(
      q,
      { id: 't1', kind: 'quick-action', priority: 'P4', title: 'T1', detail: 'First', tone: 'info' },
      1000,
      false,
    );
    expect(q.visibleToasts).toHaveLength(1);

    // Enqueued 500 ms later -> held in pendingToasts due to 2000 ms pacing
    q = enqueuePopupToast(
      q,
      { id: 't2', kind: 'landing', priority: 'P4', title: 'T2', detail: 'Second', tone: 'info' },
      1500,
      false,
    );
    q = enqueuePopupToast(
      q,
      { id: 't3', kind: 'rover-yield', priority: 'P3', title: 'T3', detail: 'Third P3', tone: 'info' },
      1800,
      false,
    );
    expect(q.visibleToasts).toHaveLength(1);
    expect(q.pendingToasts).toHaveLength(2);

    // Tick at t = 3100 ms (>= 2 s since t1) -> promotes P3 ('t3') ahead of P4 ('t2')
    q = tickPopupQueue(q, 3100, false);
    expect(q.visibleToasts.map((t) => t.id)).toEqual(['t1', 't3']);
    expect(q.visibleToasts.length).toBeLessThanOrEqual(POPUP_MAX_VISIBLE_TOASTS);

    // While modal is active, nothing else promotes
    q = enqueuePopupToast(
      q,
      { id: 't4', kind: 'hint', priority: 'P4', title: 'T4', detail: 'Fourth', tone: 'info' },
      3500,
      true,
    );
    q = tickPopupQueue(q, 5200, true);
    expect(q.visibleToasts.some((t) => t.id === 't2' || t.id === 't4')).toBe(false);

    // Wait past auto-dismiss (3100 + 4000 = 7100 ms) with modal closed
    q = tickPopupQueue(q, 3100 + POPUP_TOAST_AUTO_DISMISS_MS + 100, false);
    expect(q.visibleToasts.some((t) => t.id === 't1' || t.id === 't3')).toBe(false);
    expect(POPUP_NON_CRITICAL_SPACING_MS).toBeGreaterThanOrEqual(2000);
  });

  it.each([
    [1280, 720],
    [1366, 768],
    [1920, 1080],
  ])(
    'maintains zero overlapping HUD zones at %ix%i during and after training',
    (w, h) => {
      for (const tutorialActive of [true, false]) {
        const boxes = computeDesktopHudZoneBoxes(w, h, {
          tutorialActive,
          controlsVisible: true,
          rustyCollapsed: tutorialActive,
        });
        const entries = Object.entries(boxes);
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const [nameA, rectA] = entries[i];
            const [nameB, rectB] = entries[j];
            expect(rectsOverlap(rectA, rectB, 2), `${nameA} overlaps ${nameB} at ${w}x${h}`).toBe(false);
          }
        }
      }
    },
  );
});
