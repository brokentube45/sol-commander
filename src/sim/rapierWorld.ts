import RAPIER from '@dimforge/rapier3d-compat';
import { MARS_FACTS, PHYSICS_CONSTANTS } from './constants';
import { computeLocalMarsGravity } from './marsPhysics';
import {
  RockColliderSpec,
  TerrainHeightGrid,
  generateOutpostRockSpecs,
  getDefaultTerrainGrid,
  groundHeightAtGrid,
} from './terrainField';

export interface CharacterFrameInput {
  moveFwd: number;
  moveStrafe: number;
  camYaw: number;
  sprint: boolean;
  jumpRequested: boolean;
  quickMode: boolean;
}

export interface LandingEvent {
  fallHeightM: number;
  hangTimeS: number;
  impactSpeedMs: number;
  noDamage: boolean;
}

export interface PlayerStepSnapshot {
  x: number;
  footY: number;
  centerY: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  horizontalSpeedMs: number;
  grounded: boolean;
  isLoping: boolean;
  slopeDeg: number;
  lastLanding: LandingEvent | null;
  activeRockColliders: number;
  physicsStepMs: number;
}

export interface SolidStructureVolume {
  id: string;
  kind: 'cylinder' | 'cuboid';
  cx: number;
  cy: number;
  cz: number;
  halfHeight: number;
  radius?: number;
  hx?: number;
  hz?: number;
  yaw?: number;
}

export interface DroppedBodyRecord {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  radius: number;
}

function yawToQuat(yawRad: number): { x: number; y: number; z: number; w: number } {
  const half = yawRad * 0.5;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function eulerXYZToQuat(rx: number, ry: number, rz: number): { x: number; y: number; z: number; w: number } {
  const cx = Math.cos(rx * 0.5);
  const sx = Math.sin(rx * 0.5);
  const cy = Math.cos(ry * 0.5);
  const sy = Math.sin(ry * 0.5);
  const cz = Math.cos(rz * 0.5);
  const sz = Math.sin(rz * 0.5);

  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
}

function rotateXZ(lx: number, lz: number, yawRad: number): [number, number] {
  const c = Math.cos(yawRad);
  const s = Math.sin(yawRad);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/**
 * Authoritative Rapier WASM physics world for Mars Outpost gameplay, testing,
 * single-source heightfield ground collisions, compound structure colliders,
 * streamed >=0.30 m rock colliders, and Froude/Mars EVA character control.
 */
export class MarsPhysicsWorld {
  public readonly world: RAPIER.World;
  public readonly grid: TerrainHeightGrid;
  public readonly structureVolumes: SolidStructureVolume[] = [];

  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly playerBody: RAPIER.RigidBody;
  private readonly playerCollider: RAPIER.Collider;
  private readonly roverBody: RAPIER.RigidBody;
  private readonly roverCollider: RAPIER.Collider;
  private readonly terrainCollider: RAPIER.Collider;

  private readonly rockSpecs: RockColliderSpec[];
  private readonly activeRockColliders = new Map<string, RAPIER.Collider>();
  private readonly rockBodies: RAPIER.RigidBody[] = [];

  private accumulatorS = 0;
  private prevCenter = { x: 4.95, y: 1.0, z: 2.65 };
  private currCenter = { x: 4.95, y: 1.0, z: 2.65 };
  private interpCenter = { x: 4.95, y: 1.0, z: 2.65 };

  private vx = 0;
  private vy = 0;
  private vz = 0;
  private grounded = true;
  private wasGrounded = true;
  private airborneTimeS = 0;
  private peakFootY = 0;
  private takeoffFootY = 0;
  private lastLanding: LandingEvent | null = null;
  private lastStepDurationMs = 0;
  private lastRockSyncX = Number.NaN;
  private lastRockSyncZ = Number.NaN;
  private disposed = false;

  private constructor(
    grid: TerrainHeightGrid,
    rockSpecs: RockColliderSpec[],
    startX: number,
    startZ: number,
  ) {
    this.grid = grid;
    this.rockSpecs = rockSpecs.filter(
      (r) => r.diameter >= PHYSICS_CONSTANTS.ROCK_COLLIDER_MIN_DIAMETER_M,
    );

    this.world = new RAPIER.World({ x: 0, y: -MARS_FACTS.GRAVITY_MS2, z: 0 });
    this.world.integrationParameters.dt = PHYSICS_CONSTANTS.FIXED_DT_S;

    // 1. Single-source-of-truth Terrain Heightfield Collider
    const terrainBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    const hfDesc = RAPIER.ColliderDesc.heightfield(
      grid.segments,
      grid.segments,
      grid.heights,
      { x: grid.sizeMeters, y: 1.0, z: grid.sizeMeters },
    )
      .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU)
      .setRestitution(0.05);
    this.terrainCollider = this.world.createCollider(hfDesc, terrainBody);

    // 2. Compound Outpost Structure Colliders + Walkable Boundary Ring
    this.buildStructureColliders();
    this.buildBoundaryWalls();

    // 3. Companion Rover Kinematic Collider (synced with rover world transform)
    const roverY = groundHeightAtGrid(grid, 2.1, 3.25);
    const rBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      2.1,
      roverY + 0.56,
      3.25,
    );
    this.roverBody = this.world.createRigidBody(rBodyDesc);
    const rColDesc = RAPIER.ColliderDesc.cuboid(0.84, 0.56, 0.98)
      .setRotation(yawToQuat(-1.02))
      .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU);
    this.roverCollider = this.world.createCollider(rColDesc, this.roverBody);

    // 4. Player EVA Character Capsule + KinematicCharacterController
    const footY = groundHeightAtGrid(grid, startX, startZ);
    const centerY =
      footY +
      PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M +
      PHYSICS_CONSTANTS.CAPSULE_RADIUS_M +
      PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M;

    const pBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      startX,
      centerY,
      startZ,
    );
    this.playerBody = this.world.createRigidBody(pBodyDesc);
    const pColDesc = RAPIER.ColliderDesc.capsule(
      PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M,
      PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
    ).setFriction(MARS_FACTS.REGOLITH_FRICTION_MU);
    this.playerCollider = this.world.createCollider(pColDesc, this.playerBody);

    this.controller = this.world.createCharacterController(PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.enableAutostep(
      PHYSICS_CONSTANTS.AUTOSTEP_MAX_HEIGHT_M,
      PHYSICS_CONSTANTS.AUTOSTEP_MIN_WIDTH_M,
      false,
    );
    this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
    this.controller.setMaxSlopeClimbAngle((PHYSICS_CONSTANTS.MAX_SLOPE_CLIMB_DEG * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((PHYSICS_CONSTANTS.MIN_SLOPE_SLIDE_DEG * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(true);

    this.prevCenter = { x: startX, y: centerY, z: startZ };
    this.currCenter = { x: startX, y: centerY, z: startZ };
    this.interpCenter = { x: startX, y: centerY, z: startZ };
    this.peakFootY = footY;
    this.takeoffFootY = footY;

    this.syncStreamedRocks(startX, startZ);
  }

  public static async create(options?: {
    grid?: TerrainHeightGrid;
    quality?: 'high' | 'low';
    rockSpecs?: RockColliderSpec[];
    startX?: number;
    startZ?: number;
  }): Promise<MarsPhysicsWorld> {
    await RAPIER.init();
    const grid = options?.grid ?? getDefaultTerrainGrid();
    const rockSpecs =
      options?.rockSpecs ?? generateOutpostRockSpecs(options?.quality ?? 'high', grid);
    return new MarsPhysicsWorld(
      grid,
      rockSpecs,
      options?.startX ?? 4.95,
      options?.startZ ?? 2.65,
    );
  }

  private addFixedCylinder(
    id: string,
    cx: number,
    cy: number,
    cz: number,
    halfHeight: number,
    radius: number,
    recordVolume = true,
  ): void {
    const safeHH = Math.max(halfHeight, PHYSICS_CONSTANTS.STRUCTURE_MIN_FLOOR_THICKNESS_M * 0.5);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
    const col = RAPIER.ColliderDesc.cylinder(safeHH, radius).setFriction(
      MARS_FACTS.REGOLITH_FRICTION_MU,
    );
    this.world.createCollider(col, body);
    if (recordVolume) {
      this.structureVolumes.push({
        id,
        kind: 'cylinder',
        cx,
        cy,
        cz,
        halfHeight: safeHH,
        radius,
      });
    }
  }

  private addFixedCuboid(
    id: string,
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    yawRad = 0,
    pitchRad = 0,
    rollRad = 0,
    recordVolume = true,
  ): void {
    const minWall = PHYSICS_CONSTANTS.STRUCTURE_MIN_WALL_THICKNESS_M * 0.5;
    const minFloor = PHYSICS_CONSTANTS.STRUCTURE_MIN_FLOOR_THICKNESS_M * 0.5;
    const safeHx = Math.max(hx, minWall);
    const safeHy = Math.max(hy, minFloor);
    const safeHz = Math.max(hz, minWall);

    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
    const col = RAPIER.ColliderDesc.cuboid(safeHx, safeHy, safeHz)
      .setRotation(
        pitchRad === 0 && rollRad === 0 ? yawToQuat(yawRad) : eulerXYZToQuat(pitchRad, yawRad, rollRad),
      )
      .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU);
    this.world.createCollider(col, body);

    if (recordVolume && pitchRad === 0 && rollRad === 0) {
      this.structureVolumes.push({
        id,
        kind: 'cuboid',
        cx,
        cy,
        cz,
        halfHeight: safeHy,
        hx: safeHx,
        hz: safeHz,
        yaw: yawRad,
      });
    }
  }

  private buildStructureColliders(): void {
    const h = (x: number, z: number) => groundHeightAtGrid(this.grid, x, z);

    // 1. Mars Habitat 01 (4.4, -3.4, yaw = -0.34)
    const habX = 4.4;
    const habZ = -3.4;
    const habY = h(habX, habZ);
    const habYaw = -0.34;
    this.addFixedCylinder('hab-plinth', habX, habY + 0.36, habZ, 0.36, 2.74);
    this.addFixedCylinder('hab-shell', habX, habY + 1.85, habZ, 1.35, 2.48);

    // Forward Airlock Vestibule & stepped platform (-1.55, 0, 1.85 rotated by habYaw)
    const [axOff, azOff] = rotateXZ(-1.55, 1.85, habYaw);
    const airX = habX + axOff;
    const airZ = habZ + azOff;
    const airYaw = habYaw - 0.62;
    this.addFixedCuboid('hab-airlock', airX, habY + 1.15, airZ, 0.72, 1.15, 0.76, airYaw);
    const [stepOffX, stepOffZ] = rotateXZ(0, 1.15, airYaw);
    this.addFixedCuboid(
      'hab-airlock-steps',
      airX + stepOffX,
      habY + 0.08,
      airZ + stepOffZ,
      0.54,
      0.22,
      0.48,
      airYaw,
    );

    // 2. CHAPEA Rear Crew & Science Wing (4.4, -8.0)
    const cwX = 4.4;
    const cwZ = -8.0;
    const cwY = h(cwX, cwZ);
    this.addFixedCuboid('chapea-plinth', cwX, cwY + 0.18, cwZ, 2.34, 0.22, 1.74, 0);
    this.addFixedCuboid('chapea-body', cwX, cwY + 1.35, cwZ, 2.15, 1.15, 1.56, 0);

    // Connector corridors (thick solid cylinders/cuboids)
    this.addFixedCuboid('conn-hab-chapea', 4.4, (habY + cwY) * 0.5 + 1.15, -5.9, 0.58, 0.58, 1.1, 0);
    this.addFixedCuboid(
      'conn-hab-gh',
      6.65,
      (habY + h(8.6, -0.1)) * 0.5 + 1.0,
      -1.5,
      0.48,
      0.55,
      1.05,
      -0.88,
    );

    // 3. Bio-Dome Greenhouse (8.6, -0.1) + External Water Tank
    const ghX = 8.6;
    const ghZ = -0.1;
    const ghY = h(ghX, ghZ);
    this.addFixedCylinder('greenhouse-base', ghX, ghY + 0.2, ghZ, 0.2, 2.14);
    this.addFixedCylinder('greenhouse-dome', ghX, ghY + 1.25, ghZ, 1.05, 1.98);
    this.addFixedCylinder('greenhouse-water-tank', ghX - 2.35, ghY + 0.65, ghZ + 1.1, 0.65, 0.46);

    // 4. Solar Microgrid (5 pedestals + tilted panel heads + LiFePO4 Battery Container Bank)
    const solarLocs: [number, number][] = [
      [9.4, -4.6],
      [11.4, -2.4],
      [13.8, -5.2],
      [14.2, -1.5],
      [11.8, -7.2],
    ];
    solarLocs.forEach(([sx, sz], idx) => {
      const sy = h(sx, sz);
      this.addFixedCylinder(`solar-ped-${idx}`, sx, sy + 0.85, sz, 0.85, 0.44);
      this.addFixedCuboid(
        `solar-panel-${idx}`,
        sx,
        sy + 1.68,
        sz,
        1.28,
        0.16,
        0.74,
        -0.52,
        0.55,
        0,
        false,
      );
    });
    const bbX = 14.5;
    const bbZ = -3.6;
    this.addFixedCuboid('battery-bank', bbX, h(bbX, bbZ) + 0.72, bbZ, 1.2, 0.72, 0.7, -0.35);

    // 5. Wind Turbines (2 ridge horizontal + 1 helical vertical)
    const windLocs: [number, number][] = [
      [-10.2, -7.8],
      [16.8, -8.2],
    ];
    windLocs.forEach(([wx, wz], idx) => {
      const wy = h(wx, wz);
      this.addFixedCylinder(`wind-pad-${idx}`, wx, wy + 0.14, wz, 0.2, 1.28);
      this.addFixedCylinder(`wind-tower-${idx}`, wx, wy + 2.4, wz, 2.4, 0.48);
    });
    this.addFixedCylinder('wind-vertical', -2.6, h(-2.6, 1.2) + 1.5, 1.2, 1.5, 0.6);

    // 6. SWIM Subsurface Ice Drill Derrick (-14.5, -10.5, yaw = 0.48)
    const idX = -14.5;
    const idZ = -10.5;
    const idY = h(idX, idZ);
    this.addFixedCylinder('ice-drill-deck', idX, idY + 0.13, idZ, 0.2, 1.98);
    this.addFixedCylinder('ice-drill-mast', idX, idY + 1.4, idZ, 1.4, 0.92);
    const [mtX, mtZ] = rotateXZ(1.25, 0.4, 0.48);
    this.addFixedCylinder('ice-melt-tank', idX + mtX, idY + 0.72, idZ + mtZ, 0.72, 0.44);

    // 7. Ares Landing Pad & Propellant Depot (16.8, 9.2)
    // Apron slab top sits at lpY + 0.22; thick 0.50m slab prevents any tunneling while letting player step onto it
    const lpX = 16.8;
    const lpZ = 9.2;
    const lpY = h(lpX, lpZ);
    this.addFixedCylinder('landing-pad-apron', lpX, lpY - 0.03, lpZ, 0.25, 4.95, false);
    this.addFixedCylinder('prop-tank-1', lpX + 4.65, lpY + 0.82, lpZ - 1.2, 0.82, 0.72);
    this.addFixedCylinder('prop-tank-2', lpX + 4.65, lpY + 0.82, lpZ + 1.2, 0.82, 0.72);
    this.addFixedCuboid('cargo-pod', lpX + 4.4, lpY + 0.64, lpZ - 3.1, 0.98, 0.62, 0.62, 0.22);

    // 8. Interactive Zone Props, Crates & Weather Mast
    this.addFixedCuboid('power-console', 6.15, h(6.15, -0.35) + 0.65, -0.35, 0.46, 0.65, 0.42, -0.45);
    this.addFixedCuboid('tank2-bay', 1.45, h(1.45, -0.85) + 0.85, -0.85, 0.92, 0.85, 0.58, 0.25);
    this.addFixedCuboid('water-recycler', 6.45, h(6.45, -2.55) + 0.65, -2.55, 0.78, 0.65, 0.54, -0.3);
    this.addFixedCuboid('rad-shelter', -0.35, h(-0.35, -4.25) + 0.75, -4.25, 1.38, 0.75, 1.02, 0.38);
    this.addFixedCuboid('crate-1', 1.65, h(1.65, -2.05) + 0.24, -2.05, 0.36, 0.24, 0.26, 0.3);
    this.addFixedCuboid('crate-2', 1.25, h(1.25, -1.65) + 0.24, -1.65, 0.36, 0.24, 0.26, -0.4);
    this.addFixedCylinder('weather-mast', -0.6, h(-0.6, 1.4) + 1.0, 1.4, 1.0, 0.38);
  }

  private buildBoundaryWalls(): void {
    const cx = PHYSICS_CONSTANTS.WALKABLE_CENTER_X;
    const cz = PHYSICS_CONSTANTS.WALKABLE_CENTER_Z;
    const r = PHYSICS_CONSTANTS.WALKABLE_BOUNDARY_RADIUS_M;
    const segments = 32;
    const segLen = (2 * Math.PI * r) / segments + 0.6;
    for (let i = 0; i < segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      const wx = cx + Math.cos(ang) * r;
      const wz = cz + Math.sin(ang) * r;
      const wy = groundHeightAtGrid(this.grid, wx, wz);
      const wallYaw = -ang + Math.PI * 0.5;
      this.addFixedCuboid(`boundary-${i}`, wx, wy + 2.5, wz, segLen * 0.5, 4.5, 0.35, wallYaw, 0, 0, false);
    }
  }

  public syncStreamedRocks(playerX: number, playerZ: number, force = false): number {
    if (
      !force &&
      Number.isFinite(this.lastRockSyncX) &&
      Math.hypot(playerX - this.lastRockSyncX, playerZ - this.lastRockSyncZ) < 1.0
    ) {
      return this.activeRockColliders.size;
    }
    this.lastRockSyncX = playerX;
    this.lastRockSyncZ = playerZ;

    const enterSq = PHYSICS_CONSTANTS.ROCK_STREAM_ENTER_RADIUS_M ** 2;
    const exitSq = PHYSICS_CONSTANTS.ROCK_STREAM_EXIT_RADIUS_M ** 2;

    for (const rock of this.rockSpecs) {
      const dx = rock.x - playerX;
      const dz = rock.z - playerZ;
      const distSq = dx * dx + dz * dz;
      const existing = this.activeRockColliders.get(rock.id);

      if (!existing && distSq <= enterSq) {
        const body = this.world.createRigidBody(
          RAPIER.RigidBodyDesc.fixed().setTranslation(rock.x, rock.y, rock.z),
        );
        const col = this.world.createCollider(
          RAPIER.ColliderDesc.cylinder(Math.max(0.15, rock.height * 0.5), rock.radiusXZ)
            .setRotation(eulerXYZToQuat(rock.rotX, rock.rotY, rock.rotZ))
            .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU),
          body,
        );
        this.rockBodies.push(body);
        this.activeRockColliders.set(rock.id, col);
      } else if (existing && distSq > exitSq) {
        const parent = existing.parent();
        this.world.removeCollider(existing, false);
        if (parent) {
          this.world.removeRigidBody(parent);
        }
        this.activeRockColliders.delete(rock.id);
      }
    }
    return this.activeRockColliders.size;
  }

  public updateRoverTransform(x: number, y: number, z: number, yawRad: number): void {
    if (this.disposed) return;
    this.roverBody.setNextKinematicTranslation({ x, y: y + 0.56, z });
    this.roverBody.setNextKinematicRotation(yawToQuat(yawRad));
  }

  public teleportPlayer(x: number, z: number, dropOffsetM = 0.02): void {
    const groundY = this.getGroundSupportHeightAt(x, z);
    const centerY =
      groundY +
      PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M +
      PHYSICS_CONSTANTS.CAPSULE_RADIUS_M +
      dropOffsetM;
    this.playerBody.setTranslation({ x, y: centerY, z }, true);
    this.prevCenter = { x, y: centerY, z };
    this.currCenter = { x, y: centerY, z };
    this.interpCenter = { x, y: centerY, z };
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = dropOffsetM <= 0.05;
    this.wasGrounded = this.grounded;
    this.airborneTimeS = 0;
    this.peakFootY = groundY + dropOffsetM;
    this.takeoffFootY = groundY + dropOffsetM;
    this.syncStreamedRocks(x, z, true);
  }

  /**
   * Returns exact ground/floor surface height (terrain or landing pad apron) at (x, z).
   */
  public getGroundSupportHeightAt(x: number, z: number): number {
    const terrainY = groundHeightAtGrid(this.grid, x, z);
    // Landing pad apron slab walkable floor top
    const dxPad = x - 16.8;
    const dzPad = z - 9.2;
    if (Math.hypot(dxPad, dzPad) <= 4.95) {
      const lpBase = groundHeightAtGrid(this.grid, 16.8, 9.2);
      return Math.max(terrainY, lpBase + 0.22);
    }
    return terrainY;
  }

  /**
   * Computes current terrain slope angle in degrees using finite differences on shared TerrainHeightGrid.
   */
  public getSlopeDegAt(x: number, z: number): number {
    const eps = 0.35;
    const hL = groundHeightAtGrid(this.grid, x - eps, z);
    const hR = groundHeightAtGrid(this.grid, x + eps, z);
    const hD = groundHeightAtGrid(this.grid, x, z - eps);
    const hU = groundHeightAtGrid(this.grid, x, z + eps);
    const dhdx = (hR - hL) / (2 * eps);
    const dhdz = (hU - hD) / (2 * eps);
    const grad = Math.hypot(dhdx, dhdz);
    return (Math.atan(grad) * 180) / Math.PI;
  }

  private stepFixed(input: CharacterFrameInput, jumpPending: { value: boolean }): void {
    const dt = PHYSICS_CONSTANTS.FIXED_DT_S;
    const footOffset = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M + PHYSICS_CONSTANTS.CAPSULE_RADIUS_M;

    const currentPos = this.playerBody.translation();
    this.prevCenter.x = currentPos.x;
    this.prevCenter.y = currentPos.y;
    this.prevCenter.z = currentPos.z;

    const footYBefore = currentPos.y - footOffset;
    const terrainHere = groundHeightAtGrid(this.grid, currentPos.x, currentPos.z);
    const localGrav = computeLocalMarsGravity(currentPos.x, currentPos.z, terrainHere).gravityMs2;

    // 1. Horizontal target velocity from Froude gait speeds & Quick Mode flag
    const fwdX = Math.sin(input.camYaw);
    const fwdZ = Math.cos(input.camYaw);
    const rightX = -Math.cos(input.camYaw);
    const rightZ = Math.sin(input.camYaw);

    let dirX = fwdX * input.moveFwd + rightX * input.moveStrafe;
    let dirZ = fwdZ * input.moveFwd + rightZ * input.moveStrafe;
    const dirLen = Math.hypot(dirX, dirZ);

    let targetVx = 0;
    let targetVz = 0;
    if (dirLen > 0.001) {
      dirX /= dirLen;
      dirZ /= dirLen;
      const baseSpeed = input.sprint
        ? PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS
        : PHYSICS_CONSTANTS.MARS_WALK_SPEED_MS;
      const speedMult = input.quickMode ? PHYSICS_CONSTANTS.QUICK_MODE_SPEED_MULT : 1.0;
      targetVx = dirX * baseSpeed * speedMult;
      targetVz = dirZ * baseSpeed * speedMult;
    }

    // Gradual inertia ramp for 160 kg suited explorer (no instant arcade snapping)
    const timeConst =
      dirLen > 0.001 ? PHYSICS_CONSTANTS.PLAYER_ACCEL_TIME_S : PHYSICS_CONSTANTS.PLAYER_DECEL_TIME_S;
    const blend = 1 - Math.exp(-dt / timeConst);
    this.vx += (targetVx - this.vx) * blend;
    this.vz += (targetVz - this.vz) * blend;

    // 2. Vertical velocity + Mars suited jump (2.101 m/s takeoff, -localGrav * dt)
    if (jumpPending.value && this.grounded) {
      jumpPending.value = false;
      this.vy = PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS;
      this.grounded = false;
      this.airborneTimeS = 0;
      this.takeoffFootY = footYBefore;
      this.peakFootY = footYBefore;
      // Temporarily disable snapToGround during ascent so Rapier does not glue capsule back down
      this.controller.disableSnapToGround();
    } else if (this.grounded) {
      // Gentle downward bias keeps snapToGround & ground contact reliable over rolling regolith
      this.vy = -0.35;
      this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
    } else {
      this.vy -= localGrav * dt;
      if (this.vy <= 0) {
        this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
      } else {
        this.controller.disableSnapToGround();
      }
    }

    const desiredMovement = {
      x: this.vx * dt,
      y: this.vy * dt,
      z: this.vz * dt,
    };

    this.controller.computeColliderMovement(this.playerCollider, desiredMovement);
    const corrected = this.controller.computedMovement();
    let nextX = currentPos.x + corrected.x;
    let nextY = currentPos.y + corrected.y;
    let nextZ = currentPos.z + corrected.z;

    // Hard safety net: capsule bottom may never drop below analytical/grid terrain floor
    const supportY = this.getGroundSupportHeightAt(nextX, nextZ);
    const minCenterY = supportY + footOffset + PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M * 0.5;
    let clampedToFloor = false;
    if (nextY < minCenterY) {
      nextY = minCenterY;
      clampedToFloor = true;
    }

    this.playerBody.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
    this.world.step();

    // Update currCenter & grounded/landing telemetry
    this.currCenter.x = nextX;
    this.currCenter.y = nextY;
    this.currCenter.z = nextZ;

    const footYAfter = nextY - footOffset;
    const rawGrounded = this.controller.computedGrounded() || clampedToFloor;
    this.wasGrounded = this.grounded;
    this.grounded = rawGrounded && this.vy <= 0.15;

    if (!this.grounded) {
      this.airborneTimeS += dt;
      if (footYAfter > this.peakFootY) {
        this.peakFootY = footYAfter;
      }
    } else if (!this.wasGrounded && this.airborneTimeS > 0.12) {
      const fallHeightM = Math.max(0, this.peakFootY - footYAfter);
      const impactSpeedMs = Math.abs(this.vy);
      if (fallHeightM >= PHYSICS_CONSTANTS.SOFT_LANDING_THUD_MIN_HEIGHT_M) {
        this.lastLanding = {
          fallHeightM: Number(fallHeightM.toFixed(2)),
          hangTimeS: Number(this.airborneTimeS.toFixed(2)),
          impactSpeedMs: Number(impactSpeedMs.toFixed(2)),
          noDamage: fallHeightM < PHYSICS_CONSTANTS.SAFE_FALL_NO_DAMAGE_HEIGHT_M,
        };
      }
      this.airborneTimeS = 0;
      this.vy = 0;
    } else if (this.grounded) {
      this.airborneTimeS = 0;
      this.peakFootY = footYAfter;
    }

    // Damp horizontal velocity along blocked axis if wall stopped motion
    if (dt > 0) {
      const actualVx = corrected.x / dt;
      const actualVz = corrected.z / dt;
      if (Math.abs(desiredMovement.x) > 1e-6 && Math.abs(corrected.x) < Math.abs(desiredMovement.x) * 0.25) {
        this.vx = actualVx;
      }
      if (Math.abs(desiredMovement.z) > 1e-6 && Math.abs(corrected.z) < Math.abs(desiredMovement.z) * 0.25) {
        this.vz = actualVz;
      }
    }
  }

  public stepFrame(frameDtS: number, input: CharacterFrameInput): PlayerStepSnapshot {
    if (this.disposed) {
      return this.getSnapshot();
    }
    const t0 = performance.now();
    const clampedDt = Math.min(Math.max(frameDtS, 0), PHYSICS_CONSTANTS.MAX_FRAME_DT_S);
    this.accumulatorS += clampedDt;

    const jumpPending = { value: input.jumpRequested };
    const dt = PHYSICS_CONSTANTS.FIXED_DT_S;
    let steps = 0;
    const maxSteps = 16;

    while (this.accumulatorS >= dt && steps < maxSteps) {
      this.stepFixed(input, jumpPending);
      this.accumulatorS -= dt;
      steps++;
    }

    if (steps === 0) {
      this.syncStreamedRocks(this.currCenter.x, this.currCenter.z);
    } else {
      this.syncStreamedRocks(this.currCenter.x, this.currCenter.z);
    }

    const alpha = Math.min(1, Math.max(0, this.accumulatorS / dt));
    this.interpCenter.x = this.prevCenter.x + (this.currCenter.x - this.prevCenter.x) * alpha;
    this.interpCenter.y = this.prevCenter.y + (this.currCenter.y - this.prevCenter.y) * alpha;
    this.interpCenter.z = this.prevCenter.z + (this.currCenter.z - this.prevCenter.z) * alpha;

    this.lastStepDurationMs = performance.now() - t0;
    return this.getSnapshot();
  }

  /**
   * Executes one exact deterministic fixed timestep (1/120 s) — used by automated verification tests.
   */
  public stepSingleFixed(input: CharacterFrameInput): PlayerStepSnapshot {
    const jumpPending = { value: input.jumpRequested };
    this.stepFixed(input, jumpPending);
    this.syncStreamedRocks(this.currCenter.x, this.currCenter.z);
    this.interpCenter.x = this.currCenter.x;
    this.interpCenter.y = this.currCenter.y;
    this.interpCenter.z = this.currCenter.z;
    return this.getSnapshot();
  }

  public consumeLastLanding(): LandingEvent | null {
    const ev = this.lastLanding;
    this.lastLanding = null;
    return ev;
  }

  public getSnapshot(): PlayerStepSnapshot {
    const footOffset = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M + PHYSICS_CONSTANTS.CAPSULE_RADIUS_M;
    const speed = Math.hypot(this.vx, this.vz);
    return {
      x: this.interpCenter.x,
      footY: this.interpCenter.y - footOffset,
      centerY: this.interpCenter.y,
      z: this.interpCenter.z,
      vx: this.vx,
      vy: this.vy,
      vz: this.vz,
      horizontalSpeedMs: speed,
      grounded: this.grounded,
      isLoping: speed > PHYSICS_CONSTANTS.MARS_SUITED_TRANSITION_MS,
      slopeDeg: this.getSlopeDegAt(this.currCenter.x, this.currCenter.z),
      lastLanding: this.lastLanding,
      activeRockColliders: this.activeRockColliders.size,
      physicsStepMs: this.lastStepDurationMs,
    };
  }

  /**
   * Spawns dynamic CCD-enabled test spheres/boxes at given coordinates for automated drop tests.
   */
  public spawnDropTestBodies(
    points: Array<{ x: number; y: number; z: number; kind: 'sphere' | 'box'; radius: number }>,
  ): DroppedBodyRecord[] {
    return points.map((pt) => {
      const desc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pt.x, pt.y, pt.z)
        .setCcdEnabled(true)
        .setCanSleep(true);
      const body = this.world.createRigidBody(desc);
      const colDesc =
        pt.kind === 'sphere'
          ? RAPIER.ColliderDesc.ball(pt.radius)
          : RAPIER.ColliderDesc.cuboid(pt.radius, pt.radius, pt.radius);
      colDesc.setFriction(MARS_FACTS.REGOLITH_FRICTION_MU).setRestitution(0.15);
      const collider = this.world.createCollider(colDesc, body);
      return { body, collider, radius: pt.radius };
    });
  }

  public stepWorldOnly(): void {
    this.world.step();
  }

  /**
   * Checks whether a capsule center (x, y, z) penetrates strictly inside any recorded structure volume.
   */
  public isPointInsideStructure(x: number, footY: number, z: number, playerRadius = 0.2): string | null {
    const capsuleMidY = footY + PHYSICS_CONSTANTS.CAPSULE_TOTAL_HEIGHT_M * 0.5;
    const capsuleHalfH = PHYSICS_CONSTANTS.CAPSULE_TOTAL_HEIGHT_M * 0.5;
    for (const v of this.structureVolumes) {
      if (Math.abs(capsuleMidY - v.cy) >= v.halfHeight + capsuleHalfH - 0.12) continue;
      if (v.kind === 'cylinder' && v.radius !== undefined) {
        const d = Math.hypot(x - v.cx, z - v.cz);
        if (d < v.radius - playerRadius * 0.4) {
          return v.id;
        }
      } else if (v.kind === 'cuboid' && v.hx !== undefined && v.hz !== undefined) {
        const yaw = -(v.yaw ?? 0);
        const [lx, lz] = rotateXZ(x - v.cx, z - v.cz, yaw);
        if (
          Math.abs(lx) < v.hx - playerRadius * 0.4 &&
          Math.abs(lz) < v.hz - playerRadius * 0.4
        ) {
          return v.id;
        }
      }
    }
    return null;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.free();
  }
}
