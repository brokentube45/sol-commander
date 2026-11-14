import * as THREE from 'three';
import { ensureHeadlessCanvasShim, createHeadlessMockRenderer } from '../src/debug/headlessCanvasShim';
import { runOutpostSelfTest } from '../src/debug/outpostAudit';
import { CREW_PROFILES, PHYSICS_CONSTANTS } from '../src/sim/constants';
import {
  createInitialCrewAgents,
  createInitialRoverController,
  stepCrewAgents,
  stepRoverController,
} from '../src/sim/crewAndRoverSim';
import {
  GAMEPLAY_LAYOUT,
  OutpostLayoutConfig,
  SHOWCASE_LAYOUT,
  computeTravelTimeMatrix,
  distanceToNearestRoadCenterline,
  formatTravelTimeMatrixReport,
  getOutpostSupportHeightAt,
  isOnPavedSurface,
} from '../src/sim/outpostLayout';
import { MarsPhysicsWorld } from '../src/sim/rapierWorld';
import { generateOutpostRockSpecs, getDefaultTerrainGrid, groundHeightAtGrid } from '../src/sim/terrainField';
import { buildOutpostAssets } from '../src/three/outpostAssets';

async function runLayoutVerification(
  layout: OutpostLayoutConfig,
  wallTargets: Array<{ startX: number; startZ: number; wallX: number; wallZ: number; label: string }>,
) {
  const scene = new THREE.Scene();
  const grid = getDefaultTerrainGrid(layout.mode);
  const rockSpecs = generateOutpostRockSpecs('high', grid, layout.mode);
  const outpost = buildOutpostAssets(scene, createHeadlessMockRenderer(), 'high', true, layout);
  const physicsWorld = await MarsPhysicsWorld.create({
    layout,
    grid,
    quality: 'high',
    rockSpecs,
    startX: outpost.astroBasePos.x,
    startZ: outpost.astroBasePos.z,
  });

  try {
    const initialCrew = createInitialCrewAgents(grid, layout);
    const initialRover = createInitialRoverController(
      outpost.roverBasePos.x,
      outpost.roverBasePos.z,
      layout.modules.roverSpawn.yaw,
      grid,
      layout,
    );

    const report = await runOutpostSelfTest({
      environment: 'headless',
      outpost,
      physicsWorld,
      crewAgents: initialCrew,
      roverState: {
        x: initialRover.x,
        y: initialRover.y,
        z: initialRover.z,
        speedMs: initialRover.speedMs,
        tiltDeg: initialRover.tiltDeg,
      },
      pointerLockSupported: false,
      cameraMode: '3p',
      layout,
    });

    // Extended C5 active player wall-walk check against Greenhouse & Habitat
    let playerWallHits = 0;
    let totalPlayerSteps = 0;
    for (const t of wallTargets) {
      physicsWorld.teleportPlayer(t.startX, t.startZ);
      const yaw = Math.atan2(t.wallX - t.startX, t.wallZ - t.startZ);
      for (let s = 0; s < 360; s++) {
        totalPlayerSteps++;
        const snap = physicsWorld.stepSingleFixed({
          moveFwd: 1,
          moveStrafe: 0,
          camYaw: yaw,
          sprint: true,
          jumpRequested: false,
          quickMode: false,
        });
        if (physicsWorld.isPointInsideStructure(snap.x, snap.footY, snap.z)) {
          playerWallHits++;
        }
      }
    }

    // Extended full 30-minute headless soak (18,000 steps * 0.1s = 1,800s = 30 min)
    let soakCrew = createInitialCrewAgents(grid, layout);
    for (const ag of soakCrew) {
      physicsWorld.teleportCrewMember(ag.id, ag.x, ag.z);
    }
    let soak30Penetrations = 0;
    let soak30OutOfBounds = 0;
    let soak30MaxSpeed = 0;
    for (let step = 0; step < 18000; step++) {
      const members = CREW_PROFILES.map((p, idx) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        health: idx === 0 && step >= 4000 && step < 7000 ? 45 : 92,
        stress: idx === 1 && step >= 9000 && step < 11000 ? 75 : 22,
        alive: true,
      }));
      soakCrew = stepCrewAgents(soakCrew, 0.1, {
        weatherAlertActive: step >= 3000 && step < 3600,
        tank2LeakActive: step >= 5000 && step < 6200,
        radiationAlert: step >= 12000 && step < 12600,
        habitatShelterPos: {
          x: outpost.stationInteractPoints.habitat.x,
          z: outpost.stationInteractPoints.habitat.z,
        },
        crewMembers: members,
        obstacles: [],
        grid,
        layout,
        moveCrewViaPhysics: (id, dx, dz, dtStep) => physicsWorld.stepCrewMember(id, dx, dz, dtStep),
        afterPhysicsCrewStep: () => physicsWorld.stepWorldOnly(),
      });
      for (const ag of soakCrew) {
        if (ag.speedMs > soak30MaxSpeed) soak30MaxSpeed = ag.speedMs;
        if (physicsWorld.isPointInsideStructure(ag.x, ag.y, ag.z, 0.25)) {
          soak30Penetrations++;
        }
        const radial = Math.hypot(
          ag.x - layout.walkableCenter.x,
          ag.z - layout.walkableCenter.z,
        );
        if (radial > layout.walkableRadiusM) {
          soak30OutOfBounds++;
        }
      }
    }

    // Gameplay-specific geometry, slope, rock clearance, skybridge, pipe-bridge & rover pad audits
    let extraAudits: Record<string, unknown> | null = null;
    if (layout.mode === 'gameplay') {
      // 1. Road slope <= 5 deg
      let maxRoadSlopeDeg = 0;
      for (const seg of layout.roads) {
        const steps = 12;
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps;
          const t1 = (i + 1) / steps;
          const x0 = seg.x1 + (seg.x2 - seg.x1) * t0;
          const z0 = seg.z1 + (seg.z2 - seg.z1) * t0;
          const x1 = seg.x1 + (seg.x2 - seg.x1) * t1;
          const z1 = seg.z1 + (seg.z2 - seg.z1) * t1;
          const ds = Math.hypot(x1 - x0, z1 - z0);
          if (ds < 0.05) continue;
          const dh = Math.abs(groundHeightAtGrid(grid, x1, z1) - groundHeightAtGrid(grid, x0, z0));
          const deg = (Math.atan2(dh, ds) * 180) / Math.PI;
          if (deg > maxRoadSlopeDeg) maxRoadSlopeDeg = deg;
        }
      }

      // 2. Rock clearance from roads & pads
      let rocksOnPaved = 0;
      let minRockRoadClearanceM = Infinity;
      for (const r of rockSpecs) {
        if (isOnPavedSurface(r.x, r.z, layout)) rocksOnPaved++;
        const dCenter = distanceToNearestRoadCenterline(r.x, r.z, layout);
        const edgeGap = dCenter - r.radiusXZ;
        if (edgeGap < minRockRoadClearanceM) minRockRoadClearanceM = edgeGap;
      }

      // 3. Skybridge & Pipe-bridge vertical clearances
      const conn = layout.modules.connHabGh;
      const habY = groundHeightAtGrid(grid, layout.modules.habitat.x, layout.modules.habitat.z);
      const eastRoadY = groundHeightAtGrid(grid, 11.4, (conn.startZ + conn.endZ) * 0.5);
      const skybridgeClearM = habY + conn.undersideClearanceY - eastRoadY;
      const pipeSpec = layout.utilityBridges.find((u) => u.kind === 'pipe-bridge');
      const pipeClearM = pipeSpec ? pipeSpec.clearanceY : 0;

      // 4. Rover Pad (+0.12 m) & Landing Pad (+0.22 m) wheel support check
      const groundAt = (x: number, z: number) => groundHeightAtGrid(grid, x, z);
      const rp = layout.modules.roverPad;
      const lp = layout.modules.landingPad;
      const roverOnPad = createInitialRoverController(rp.x, rp.z, 0.82, grid, layout);
      const expectedRoverPadY = getOutpostSupportHeightAt(rp.x, rp.z, groundAt, layout);
      const expectedLandingPadY = getOutpostSupportHeightAt(lp.x, lp.z, groundAt, layout);
      let roverTest = createInitialRoverController(rp.x, rp.z, 0.82, grid, layout);
      for (let i = 0; i < 60; i++) {
        roverTest = stepRoverController(roverTest, 0.1, {
          playerX: 0,
          playerZ: 11.4,
          playerYaw: 0,
          damaged: false,
          holdPosition: false,
          obstacles: [],
          grid,
          layout,
        });
      }
      const roverMaxWheelSinkageM = Math.max(
        0,
        ...roverTest.wheelOffsetsM.map((off) => -off),
      );

      extraAudits = {
        maxRoadSlopeDeg: Number(maxRoadSlopeDeg.toFixed(3)),
        rocksOnPaved,
        minRockRoadClearanceM: Number(minRockRoadClearanceM.toFixed(3)),
        skybridgeClearM: Number(skybridgeClearM.toFixed(3)),
        pipeClearM: Number(pipeClearM.toFixed(3)),
        roverPadSupportYDiffM: Number(Math.abs(roverOnPad.y - expectedRoverPadY).toFixed(4)),
        landingPadSupportTopM: Number((expectedLandingPadY - groundAt(lp.x, lp.z)).toFixed(3)),
        roverMaxWheelSinkageM: Number(roverMaxWheelSinkageM.toFixed(4)),
      };
    }

    console.log(`\n=== STEP C REAL-HEADLESS VERIFICATION (${layout.mode.toUpperCase()} LAYOUT) ===`);
    console.log(`Overall Pass: ${report.overallPass} | Failures: ${report.failures.length}`);
    console.log('\n--- CHECKS (FAILURES FIRST) ---');
    const ordered = Object.values(report.checks).sort((a, b) =>
      a.status === b.status ? 0 : a.status === 'FAIL' ? -1 : 1,
    );
    for (const c of ordered) {
      console.log(`[${c.status}] [${c.evidenceClass}] ${c.id} (${c.name}): ${c.summary}`);
      console.log(`   metrics=${JSON.stringify(c.metrics)}`);
    }

    console.log(
      `\n[EXTENDED C5 PLAYER WALL WALK] playerStructurePenetrations=${playerWallHits}/${totalPlayerSteps} steps`,
    );
    console.log(
      `[EXTENDED C7 30-MIN SOAK (18,000 steps)] penetrations=${soak30Penetrations}, outOfBounds=${soak30OutOfBounds}, maxSpeed=${soak30MaxSpeed.toFixed(3)} m/s`,
    );

    if (extraAudits) {
      console.log(`\n[GAMEPLAY BASE INFRASTRUCTURE AUDIT] ${JSON.stringify(extraAudits)}`);
      const worstModules = report.modules.filter((x) => (x.maxBoundsDiffM ?? 0) > 0.05);
      console.log(`Modules exceeding 0.05m bounds diff: ${worstModules.length}`);
      for (const m of worstModules) {
        console.log(
          ` - ${m.id}: maxBoundsDiffM=${m.maxBoundsDiffM}m | mesh=${JSON.stringify(m.aabbMin)}..${JSON.stringify(m.aabbMax)} | col=${JSON.stringify(m.colliderAabbMin)}..${JSON.stringify(m.colliderAabbMax)}`,
        );
      }
    }

    console.log('\n--- SEAMS & GAPS AUDIT ---');
    for (const s of report.seams) {
      console.log(` - [${s.status}] ${s.pair}: gapM=${s.gapM}m (${s.note})`);
    }

    if (layout.mode === 'gameplay') {
      console.log('\n=== GAMEPLAY TRAVEL-TIME MATRIX (src/sim/constants.ts SPEEDS) ===');
      console.log(formatTravelTimeMatrixReport(computeTravelTimeMatrix(layout)));
    }
  } finally {
    physicsWorld.dispose();
    outpost.dispose();
  }
}

async function main() {
  ensureHeadlessCanvasShim();

  await runLayoutVerification(SHOWCASE_LAYOUT, [
    { startX: 5.2, startZ: 0.2, wallX: 8.6, wallZ: -0.1, label: 'showcase-greenhouse' },
    { startX: 0.4, startZ: -1.4, wallX: 4.4, wallZ: -3.4, label: 'showcase-habitat' },
  ]);

  await runLayoutVerification(GAMEPLAY_LAYOUT, [
    { startX: 16.5, startZ: 5.2, wallX: 20.5, wallZ: 1.5, label: 'gameplay-greenhouse' },
    { startX: -3.5, startZ: 0.0, wallX: 0.0, wallZ: 0.0, label: 'gameplay-habitat' },
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
