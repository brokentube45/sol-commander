import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ensureHeadlessCanvasShim, createHeadlessMockRenderer } from '../../debug/headlessCanvasShim';
import { runOutpostSelfTest } from '../../debug/outpostAudit';
import { createInitialCrewAgents, createInitialRoverController, stepRoverController } from '../crewAndRoverSim';
import {
  GAMEPLAY_LAYOUT,
  SHOWCASE_LAYOUT,
  computeTravelTimeMatrix,
  distanceToNearestRoadCenterline,
  getOutpostSupportHeightAt,
  isOnPavedSurface,
} from '../outpostLayout';
import { MarsPhysicsWorld } from '../rapierWorld';
import { generateOutpostRockSpecs, getDefaultTerrainGrid, groundHeightAtGrid } from '../terrainField';
import { buildOutpostAssets } from '../../three/outpostAssets';

describe('Real-Outpost QA Verification (SHOWCASE_LAYOUT + GAMEPLAY_LAYOUT)', () => {
  it('verifies legacy SHOWCASE_LAYOUT modules, seams, doorways, and crew physics (C1-C7)', async () => {
    ensureHeadlessCanvasShim();
    const scene = new THREE.Scene();
    const grid = getDefaultTerrainGrid('showcase');
    const rockSpecs = generateOutpostRockSpecs('high', grid, 'showcase');
    const outpost = buildOutpostAssets(scene, createHeadlessMockRenderer(), 'high', true, SHOWCASE_LAYOUT);
    const physicsWorld = await MarsPhysicsWorld.create({
      layout: SHOWCASE_LAYOUT,
      grid,
      quality: 'high',
      rockSpecs,
      startX: outpost.astroBasePos.x,
      startZ: outpost.astroBasePos.z,
    });

    try {
      const report = await runOutpostSelfTest({
        environment: 'headless',
        outpost,
        physicsWorld,
        crewAgents: createInitialCrewAgents(grid, SHOWCASE_LAYOUT),
        roverState: createInitialRoverController(
          outpost.roverBasePos.x,
          outpost.roverBasePos.z,
          SHOWCASE_LAYOUT.modules.roverSpawn.yaw,
          grid,
          SHOWCASE_LAYOUT,
        ),
        pointerLockSupported: false,
        cameraMode: '3p',
        layout: SHOWCASE_LAYOUT,
      });

      expect(report.checks.C1.status).toBe('PASS');
      expect(report.checks.C2.status).toBe('PASS');
      expect(report.checks.C3.status).toBe('PASS');
      expect(report.checks.C4.status).toBe('PASS');
      expect(report.checks.C5.status).toBe('PASS');
      expect(report.checks.C6.status).toBe('PASS');
      expect(report.checks.C7.status).toBe('PASS');
    } finally {
      physicsWorld.dispose();
      outpost.dispose();
    }
  }, 45000);

  it('verifies spacious GAMEPLAY_LAYOUT modules, skybridge/doorway clearance, crew physics, and rock/pad parity (C1-C7)', async () => {
    ensureHeadlessCanvasShim();
    const scene = new THREE.Scene();
    const grid = getDefaultTerrainGrid('gameplay');
    const rockSpecs = generateOutpostRockSpecs('high', grid, 'gameplay');
    const outpost = buildOutpostAssets(scene, createHeadlessMockRenderer(), 'high', true, GAMEPLAY_LAYOUT);
    const physicsWorld = await MarsPhysicsWorld.create({
      layout: GAMEPLAY_LAYOUT,
      grid,
      quality: 'high',
      rockSpecs,
      startX: outpost.astroBasePos.x,
      startZ: outpost.astroBasePos.z,
    });

    try {
      const report = await runOutpostSelfTest({
        environment: 'headless',
        outpost,
        physicsWorld,
        crewAgents: createInitialCrewAgents(grid, GAMEPLAY_LAYOUT),
        roverState: createInitialRoverController(
          outpost.roverBasePos.x,
          outpost.roverBasePos.z,
          GAMEPLAY_LAYOUT.modules.roverSpawn.yaw,
          grid,
          GAMEPLAY_LAYOUT,
        ),
        pointerLockSupported: false,
        cameraMode: '3p',
        layout: GAMEPLAY_LAYOUT,
      });

      expect(report.checks.C1.status).toBe('PASS');
      expect(report.checks.C2.status).toBe('PASS');
      expect(report.checks.C3.status).toBe('PASS');
      expect(report.checks.C4.status).toBe('PASS');
      expect(report.checks.C5.status).toBe('PASS');
      expect(report.checks.C6.status).toBe('PASS');
      expect(report.checks.C7.status).toBe('PASS');

      // Rock clearance & zero rocks on paved roads/pads
      for (const r of rockSpecs) {
        expect(isOnPavedSurface(r.x, r.z, GAMEPLAY_LAYOUT)).toBe(false);
        expect(distanceToNearestRoadCenterline(r.x, r.z, GAMEPLAY_LAYOUT)).toBeGreaterThanOrEqual(2.2);
      }

      // Rover Pad (+0.12 m) & Landing Pad (+0.22 m) zero-sinkage wheel support check
      const groundAt = (x: number, z: number) => groundHeightAtGrid(grid, x, z);
      const rp = GAMEPLAY_LAYOUT.modules.roverPad;
      const lp = GAMEPLAY_LAYOUT.modules.landingPad;
      let rover = createInitialRoverController(rp.x, rp.z, 0.82, grid, GAMEPLAY_LAYOUT);
      expect(rover.y).toBeCloseTo(getOutpostSupportHeightAt(rp.x, rp.z, groundAt, GAMEPLAY_LAYOUT), 3);
      expect(
        getOutpostSupportHeightAt(lp.x, lp.z, groundAt, GAMEPLAY_LAYOUT) - groundAt(lp.x, lp.z),
      ).toBeCloseTo(0.22, 3);
      for (let i = 0; i < 40; i++) {
        rover = stepRoverController(rover, 0.1, {
          playerX: 0,
          playerZ: 11.4,
          playerYaw: 0,
          damaged: false,
          holdPosition: false,
          obstacles: [],
          grid,
          layout: GAMEPLAY_LAYOUT,
        });
        expect(Math.min(...rover.wheelOffsetsM)).toBeGreaterThanOrEqual(-0.001);
      }
    } finally {
      physicsWorld.dispose();
      outpost.dispose();
    }
  }, 60000);

  it('satisfies all GAMEPLAY_LAYOUT travel-time budgets at realistic Mars speeds', () => {
    const matrix = computeTravelTimeMatrix(GAMEPLAY_LAYOUT);
    expect(matrix.maxFromAirlockM).toBeLessThanOrEqual(40);
    expect(matrix.maxAdjacentHopM).toBeLessThanOrEqual(30);
    expect(matrix.fullTour.walkSec).toBeLessThanOrEqual(210);
    expect(matrix.allBudgetsPass).toBe(true);
  });
});
