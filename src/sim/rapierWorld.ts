import RAPIER from '@dimforge/rapier3d-compat';
import { CREW_PROFILES, CrewMemberId, MARS_FACTS, PHYSICS_CONSTANTS } from './constants';
import { computeLocalMarsGravity } from './marsPhysics';
import {
  GAMEPLAY_GREENHOUSE_PROPS,
  OutpostLayoutConfig,
  SHOWCASE_CRATES,
  SHOWCASE_LAYOUT,
  computeCorridorTransform,
  getAirlockWorldPose,
  getGreenhouseDoorwaySpec,
  getGreenhouseWallSegments,
  getOutpostSupportHeightAt,
  rotateXZ,
} from './outpostLayout';
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
  desiredVx: number;
  desiredVz: number;
  horizontalSpeedMs: number;
  grounded: boolean;
  computedGrounded: boolean;
  isLoping: boolean;
  slopeDeg: number;
  lastLanding: LandingEvent | null;
  activeRockColliders: number;
  physicsStepMs: number;
  physicsSteps: number;
  interpAlpha: number;
  collisionCount: number;
  roverContact: boolean;
  roverPushingInto: boolean;
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

export interface StaticColliderRecord {
  id: string;
  category: 'structure' | 'boundary' | 'terrain' | 'rover';
  shape: 'cuboid' | 'cylinder' | 'heightfield';
  cx: number;
  cy: number;
  cz: number;
  halfExtents: { x: number; y: number; z: number };
  yawRad: number;
  pitchRad: number;
  rollRad: number;
  quaternion: { x: number; y: number; z: number; w: number };
}

function yawToQuat(yawRad: number): { x: number; y: number; z: number; w: number } {
  const half = yawRad * 0.5;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function eulerXYZToQuat(
  rx: number,
  ry: number,
  rz: number,
): { x: number; y: number; z: number; w: number } {
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

function quatMultiply(
  a: { x: number; y: number; z: number; w: number },
  b: { x: number; y: number; z: number; w: number },
): { x: number; y: number; z: number; w: number } {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

/**
 * Authoritative Rapier WASM physics world for Mars Outpost gameplay, testing,
 * single-source heightfield ground collisions, compound structure colliders,
 * streamed >=0.30 m rock colliders, and Froude/Mars EVA character control.
 */
export class MarsPhysicsWorld {
  public readonly world: RAPIER.World;
  public readonly grid: TerrainHeightGrid;
  public readonly layout: OutpostLayoutConfig;
  public readonly structureVolumes: SolidStructureVolume[] = [];
  public readonly staticColliderRecords: StaticColliderRecord[] = [];
  public readonly crewBodyIds: CrewMemberId[] = [];

  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly playerBody: RAPIER.RigidBody;
  private readonly playerCollider: RAPIER.Collider;
  private readonly crewPhysics = new Map<
    CrewMemberId,
    {
      body: RAPIER.RigidBody;
      collider: RAPIER.Collider;
      controller: RAPIER.KinematicCharacterController;
    }
  >();
  private readonly roverBody: RAPIER.RigidBody;
  private readonly roverCollider: RAPIER.Collider;
  private readonly roverColliderHandles = new Set<number>();
  private readonly terrainCollider: RAPIER.Collider;
  private readonly nonModuleColliderHandles = new Set<number>();

  private readonly rockSpecs: RockColliderSpec[];
  private readonly activeRockColliders = new Map<string, RAPIER.Collider>();
  private readonly rockBodies: RAPIER.RigidBody[] = [];
  public readonly colliderIdByHandle = new Map<number, string>();

  private accumulatorS = 0;
  private prevCenter = { x: 0, y: 1.0, z: 0 };
  private currCenter = { x: 0, y: 1.0, z: 0 };
  private interpCenter = { x: 0, y: 1.0, z: 0 };

  private vx = 0;
  private vy = 0;
  private vz = 0;
  private desiredVx = 0;
  private desiredVz = 0;
  private grounded = true;
  private rawGrounded = true;
  private wasGrounded = true;
  private groundGraceTimerS: number = PHYSICS_CONSTANTS.GROUND_HYSTERESIS_S;
  private isLoping = false;
  private airborneTimeS = 0;
  private peakFootY = 0;
  private takeoffFootY = 0;
  private lastLanding: LandingEvent | null = null;
  private lastStepDurationMs = 0;
  private lastPhysicsSteps = 0;
  private lastInterpAlpha = 0;
  private lastCollisionCount = 0;
  private lastRoverContact = false;
  private lastRoverPushingInto = false;
  private lastContactNormals: Array<{ x: number; y: number; z: number }> = [];
  private stuckCheckX = 0;
  private stuckCheckZ = 0;
  private stuckActiveTimeS = 0;
  private lastRockSyncX = Number.NaN;
  private lastRockSyncZ = Number.NaN;
  private disposed = false;

  private constructor(
    grid: TerrainHeightGrid,
    rockSpecs: RockColliderSpec[],
    startX: number,
    startZ: number,
    layout: OutpostLayoutConfig,
  ) {
    this.grid = grid;
    this.layout = layout;
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
    this.nonModuleColliderHandles.add(this.terrainCollider.handle);
    this.staticColliderRecords.push({
      id: 'terrain-heightfield',
      category: 'terrain',
      shape: 'heightfield',
      cx: 0,
      cy: 0,
      cz: 0,
      halfExtents: { x: grid.sizeMeters * 0.5, y: 2.0, z: grid.sizeMeters * 0.5 },
      yawRad: 0,
      pitchRad: 0,
      rollRad: 0,
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
    });

    // 2. Compound Outpost Structure Colliders + Walkable Boundary Ring
    this.buildStructureColliders();
    this.buildBoundaryWalls();

    // 3. Companion Rover Compound Kinematic Colliders (rounded hull + 6 wheel cylinders, zero friction vs character)
    const rv = layout.modules.roverSpawn;
    let rvx = rv.x;
    let rvz = rv.z;
    if (Math.hypot(startX - rvx, startZ - rvz) < 2.0) {
      rvz = 25.0;
    }
    const roverY = this.getGroundSupportHeightAt(rvx, rvz);
    const rBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(rvx, roverY + 0.56, rvz)
      .setRotation(yawToQuat(rv.yaw));
    this.roverBody = this.world.createRigidBody(rBodyDesc);
    const rColDesc = RAPIER.ColliderDesc.roundCuboid(0.76, 0.54, 0.88, 0.08)
      .setTranslation(0, 0.06, 0.02)
      .setFriction(0.0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0.0);
    this.roverCollider = this.world.createCollider(rColDesc, this.roverBody);
    this.roverColliderHandles.add(this.roverCollider.handle);
    this.nonModuleColliderHandles.add(this.roverCollider.handle);

    const rMastColDesc = RAPIER.ColliderDesc.roundCuboid(0.35, 0.34, 0.62, 0.06)
      .setTranslation(0, 0.86, 0.05)
      .setFriction(0.0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
      .setRestitution(0.0);
    const rMastCol = this.world.createCollider(rMastColDesc, this.roverBody);
    this.roverColliderHandles.add(rMastCol.handle);
    this.nonModuleColliderHandles.add(rMastCol.handle);

    // 6-wheel cylinder colliders (visual & contact parity, zero friction against player)
    const wheelZRot = { x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 };
    const wheelCoords: ReadonlyArray<[number, number]> = [
      [-0.78, -0.66],
      [-0.78, 0.0],
      [-0.78, 0.66],
      [0.78, -0.66],
      [0.78, 0.0],
      [0.78, 0.66],
    ];
    for (const [wx, wz] of wheelCoords) {
      const wColDesc = RAPIER.ColliderDesc.roundCylinder(0.09, PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M - 0.03, 0.03)
        .setTranslation(wx, -0.28, wz)
        .setRotation(wheelZRot)
        .setFriction(0.0)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setRestitution(0.0);
      const wCol = this.world.createCollider(wColDesc, this.roverBody);
      this.roverColliderHandles.add(wCol.handle);
      this.nonModuleColliderHandles.add(wCol.handle);
    }

    // 4. Player EVA Character Capsule + KinematicCharacterController
    const footY = this.getGroundSupportHeightAt(startX, startZ);
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
    )
      .setFriction(0.0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
    this.playerCollider = this.world.createCollider(pColDesc, this.playerBody);
    this.nonModuleColliderHandles.add(this.playerCollider.handle);

    this.controller = this.world.createCharacterController(PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M);
    this.controller.setUp({ x: 0, y: 1, z: 0 });
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(
      PHYSICS_CONSTANTS.AUTOSTEP_MAX_HEIGHT_M,
      PHYSICS_CONSTANTS.AUTOSTEP_MIN_WIDTH_M,
      false,
    );
    this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
    this.controller.setMaxSlopeClimbAngle((PHYSICS_CONSTANTS.MAX_SLOPE_CLIMB_DEG * Math.PI) / 180);
    this.controller.setMinSlopeSlideAngle((PHYSICS_CONSTANTS.MIN_SLOPE_SLIDE_DEG * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(false);

    // 5. Register all 4 Crew NPCs as real Rapier KinematicCharacterController Capsules
    const footOffset =
      PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M +
      PHYSICS_CONSTANTS.CAPSULE_RADIUS_M +
      PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M;

    for (const prof of CREW_PROFILES) {
      const startSlot = layout.crewStations[prof.id][0];
      const cx = startSlot.x;
      const cz = startSlot.z;
      const cy = this.getGroundSupportHeightAt(cx, cz) + footOffset;
      const body = this.world.createRigidBody(
        RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(cx, cy, cz),
      );
      const col = this.world.createCollider(
        RAPIER.ColliderDesc.capsule(
          PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M,
          PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
        ).setFriction(MARS_FACTS.REGOLITH_FRICTION_MU),
        body,
      );
      const ctrl = this.world.createCharacterController(PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M);
      ctrl.setUp({ x: 0, y: 1, z: 0 });
      ctrl.enableAutostep(
        PHYSICS_CONSTANTS.AUTOSTEP_MAX_HEIGHT_M,
        PHYSICS_CONSTANTS.AUTOSTEP_MIN_WIDTH_M,
        false,
      );
      ctrl.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
      ctrl.setMaxSlopeClimbAngle((PHYSICS_CONSTANTS.MAX_SLOPE_CLIMB_DEG * Math.PI) / 180);
      ctrl.setMinSlopeSlideAngle((PHYSICS_CONSTANTS.MIN_SLOPE_SLIDE_DEG * Math.PI) / 180);
      ctrl.setApplyImpulsesToDynamicBodies(false);

      this.crewBodyIds.push(prof.id);
      this.nonModuleColliderHandles.add(col.handle);
      this.crewPhysics.set(prof.id, { body, collider: col, controller: ctrl });
    }

    this.prevCenter = { x: startX, y: centerY, z: startZ };
    this.currCenter = { x: startX, y: centerY, z: startZ };
    this.interpCenter = { x: startX, y: centerY, z: startZ };
    this.stuckCheckX = startX;
    this.stuckCheckZ = startZ;
    this.peakFootY = footY;
    this.takeoffFootY = footY;

    this.syncStreamedRocks(startX, startZ);
    this.world.step();
  }

  public static async create(options?: {
    layout?: OutpostLayoutConfig;
    grid?: TerrainHeightGrid;
    quality?: 'high' | 'low';
    rockSpecs?: RockColliderSpec[];
    startX?: number;
    startZ?: number;
  }): Promise<MarsPhysicsWorld> {
    await RAPIER.init();
    const layout = options?.layout ?? SHOWCASE_LAYOUT;
    const grid = options?.grid ?? getDefaultTerrainGrid(layout.mode);
    const rockSpecs =
      options?.rockSpecs ??
      generateOutpostRockSpecs(options?.quality ?? 'high', grid, layout.mode);
    return new MarsPhysicsWorld(
      grid,
      rockSpecs,
      options?.startX ?? layout.modules.astroSpawn.x,
      options?.startZ ?? layout.modules.astroSpawn.z,
      layout,
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
    const created = this.world.createCollider(col, body);
    this.colliderIdByHandle.set(created.handle, id);
    this.staticColliderRecords.push({
      id,
      category: id.startsWith('boundary-') ? 'boundary' : 'structure',
      shape: 'cylinder',
      cx,
      cy,
      cz,
      halfExtents: { x: radius, y: safeHH, z: radius },
      yawRad: 0,
      pitchRad: 0,
      rollRad: 0,
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
    });
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
    allowThin = false,
  ): void {
    const minWall = allowThin ? 0.025 : PHYSICS_CONSTANTS.STRUCTURE_MIN_WALL_THICKNESS_M * 0.5;
    const minFloor = allowThin ? 0.025 : PHYSICS_CONSTANTS.STRUCTURE_MIN_FLOOR_THICKNESS_M * 0.5;
    const safeHx = Math.max(hx, minWall);
    const safeHy = Math.max(hy, minFloor);
    const safeHz = Math.max(hz, minWall);
    const quat =
      pitchRad === 0 && rollRad === 0
        ? yawToQuat(yawRad)
        : eulerXYZToQuat(pitchRad, yawRad, rollRad);

    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
    const col = RAPIER.ColliderDesc.cuboid(safeHx, safeHy, safeHz)
      .setRotation(quat)
      .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU);
    const created = this.world.createCollider(col, body);
    this.colliderIdByHandle.set(created.handle, id);
    if (id.startsWith('boundary-')) {
      this.nonModuleColliderHandles.add(created.handle);
    }
    this.staticColliderRecords.push({
      id,
      category: id.startsWith('boundary-') ? 'boundary' : 'structure',
      shape: 'cuboid',
      cx,
      cy,
      cz,
      halfExtents: { x: safeHx, y: safeHy, z: safeHz },
      yawRad,
      pitchRad,
      rollRad,
      quaternion: quat,
    });

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

  private addFixedQuatCuboid(
    id: string,
    cx: number,
    cy: number,
    cz: number,
    hx: number,
    hy: number,
    hz: number,
    quat: { x: number; y: number; z: number; w: number },
    recordVolume = true,
    yawHint = 0,
  ): void {
    const safeHx = Math.max(hx, PHYSICS_CONSTANTS.STRUCTURE_MIN_WALL_THICKNESS_M * 0.5);
    const safeHy = Math.max(hy, PHYSICS_CONSTANTS.STRUCTURE_MIN_FLOOR_THICKNESS_M * 0.5);
    const safeHz = Math.max(hz, PHYSICS_CONSTANTS.STRUCTURE_MIN_WALL_THICKNESS_M * 0.5);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, cy, cz));
    const col = RAPIER.ColliderDesc.cuboid(safeHx, safeHy, safeHz)
      .setRotation(quat)
      .setFriction(MARS_FACTS.REGOLITH_FRICTION_MU);
    const created = this.world.createCollider(col, body);
    this.colliderIdByHandle.set(created.handle, id);
    this.staticColliderRecords.push({
      id,
      category: 'structure',
      shape: 'cuboid',
      cx,
      cy,
      cz,
      halfExtents: { x: safeHx, y: safeHy, z: safeHz },
      yawRad: yawHint,
      pitchRad: 0,
      rollRad: 0,
      quaternion: quat,
    });
    if (recordVolume) {
      this.structureVolumes.push({
        id,
        kind: 'cuboid',
        cx,
        cy,
        cz,
        halfHeight: safeHy,
        hx: safeHx,
        hz: safeHz,
        yaw: yawHint,
      });
    }
  }

  private buildStructureColliders(): void {
    const m = this.layout.modules;
    const h = (x: number, z: number) => groundHeightAtGrid(this.grid, x, z);

    // 1. Mars Habitat 01 (tiered cylindrical pressure hull + dish mast, airlock & suit vestibule)
    const habSpec = m.habitat;
    const habX = habSpec.x;
    const habZ = habSpec.z;
    const habY = h(habX, habZ);
    this.addFixedCylinder('hab-plinth', habX, habY + 0.34, habZ, 0.34, habSpec.deckRadius);
    this.addFixedCylinder('hab-shell', habX, habY + 1.555, habZ, 0.895, habSpec.shellRadius);
    this.addFixedCylinder('hab-roof-mid', habX, habY + 2.675, habZ, 0.225, 1.92, false);
    this.addFixedCylinder('hab-roof-top', habX, habY + 3.08, habZ, 0.18, 1.22, false);
    const [dishOffX, dishOffZ] = rotateXZ(0.35, -0.2, habSpec.yaw);
    this.addFixedCylinder('hab-dish', habX + dishOffX, habY + 3.9, habZ + dishOffZ, 0.63, 0.88, false);

    // Forward Airlock Vestibule (+ optional Suit Vestibule bridge in Gameplay) & stepped platform
    const airPose = getAirlockWorldPose(this.layout);
    if (m.airlockOffset.hasSuitVestibule) {
      // Connects Habitat South hull (z = 2.48) seamlessly to Airlock North bulkhead (z = 5.215)
      this.addFixedCuboid(
        'hab-suit-vestibule',
        habX,
        habY + 1.15,
        habZ + 3.85,
        0.88,
        1.15,
        1.52,
        0,
      );
    }
    this.addFixedCuboid('hab-airlock', airPose.x, habY + 0.97, airPose.z, 0.74, 1.21, 0.785, airPose.yawRad);
    const [doorOffX, doorOffZ] = rotateXZ(0, 0.8, airPose.yawRad);
    this.addFixedCuboid(
      'hab-airlock-door',
      airPose.x + doorOffX,
      habY + 1.32,
      airPose.z + doorOffZ,
      0.49,
      0.6,
      0.07,
      airPose.yawRad,
      0,
      0,
      true,
      true,
    );
    const [stepOffX, stepOffZ] = rotateXZ(0, 1.1, airPose.yawRad);
    this.addFixedCuboid(
      'hab-airlock-steps',
      airPose.x + stepOffX,
      habY - 0.02,
      airPose.z + stepOffZ,
      0.52,
      0.22,
      0.43,
      airPose.yawRad,
    );

    // 2. CHAPEA Rear Crew & Science Wing + rear connector
    const cw = m.chapea;
    const cwY = h(cw.x, cw.z);
    this.addFixedCuboid('chapea-plinth', cw.x, cwY + 0.02, cw.z, cw.plinthHalfX, 0.37, cw.plinthHalfZ, cw.yaw);
    this.addFixedCuboid('chapea-body', cw.x, cwY + 1.29, cw.z, cw.shellHalfX, 0.9, cw.shellHalfZ, cw.yaw);
    this.addFixedCylinder('chapea-cupola', cw.x, cwY + 2.46, cw.z + 0.15, 0.44, 1.15, false);
    this.addFixedCylinder('chapea-scrubber-l', cw.x - 1.35, cwY + 1.05, cw.z + 1.62, 0.78, 0.3);
    this.addFixedCylinder('chapea-scrubber-r', cw.x + 1.35, cwY + 1.05, cw.z + 1.62, 0.78, 0.3);

    const chConn = m.connHabChapea;
    const rearCorr = computeCorridorTransform(
      habX,
      habY + chConn.centerYOffset,
      habZ + chConn.habStartOffsetZ,
      cw.x,
      cwY + chConn.centerYOffset,
      cw.z + chConn.chapeaEndOffsetZ,
    );
    this.addFixedQuatCuboid(
      'conn-hab-chapea',
      rearCorr.cx,
      rearCorr.cy,
      rearCorr.cz,
      chConn.halfWidth,
      chConn.halfHeight,
      rearCorr.length * 0.5,
      rearCorr.quaternion,
      true,
      0,
    );

    // Greenhouse pressurized connector (ground tunnel in Showcase, elevated skybridge + collars + piers in Gameplay)
    const ghSpec = m.greenhouse;
    const ghX = ghSpec.x;
    const ghZ = ghSpec.z;
    const ghY = h(ghX, ghZ);
    const ghConn = m.connHabGh;

    if (ghConn.elevatedOverpass) {
      // Pressurized attachment collar towers seating Habitat East & Greenhouse West firmly to skybridge
      this.addFixedCuboid(
        'conn-hab-gh-collar-hab',
        ghConn.startX - 0.12,
        habY + 1.9,
        ghConn.startZ,
        0.72,
        1.9,
        0.68,
        0,
      );
      this.addFixedCuboid(
        'conn-hab-gh-collar-gh',
        ghConn.endX + 0.12,
        ghY + 1.9,
        ghConn.endZ,
        0.72,
        1.9,
        0.68,
        0,
      );

      const bridge = computeCorridorTransform(
        ghConn.startX,
        habY + ghConn.startYOffset,
        ghConn.startZ,
        ghConn.endX,
        ghY + ghConn.endYOffset,
        ghConn.endZ,
      );
      const bridgeYaw = Math.atan2(
        ghConn.endX - ghConn.startX,
        ghConn.endZ - ghConn.startZ,
      );
      this.addFixedQuatCuboid(
        'conn-hab-gh',
        bridge.cx,
        bridge.cy,
        bridge.cz,
        ghConn.halfWidth,
        ghConn.halfHeight,
        bridge.length * 0.5,
        bridge.quaternion,
        true,
        bridgeYaw,
      );

      ghConn.pierXs.forEach((px, pIdx) => {
        const t = (px - ghConn.startX) / (ghConn.endX - ghConn.startX);
        const pz = ghConn.startZ + (ghConn.endZ - ghConn.startZ) * t;
        const py = h(px, pz);
        const topY = habY + ghConn.undersideClearanceY + 0.05;
        const hh = topY * 0.5;
        this.addFixedCylinder(`conn-hab-gh-pier-${pIdx}`, px, py + hh, pz, hh, 0.24, true);
      });
    } else {
      const ghCorr = computeCorridorTransform(
        ghConn.startX,
        habY + ghConn.startYOffset,
        ghConn.startZ,
        ghConn.endX,
        ghY + ghConn.endYOffset,
        ghConn.endZ,
      );
      const ghCorrYaw = Math.atan2(ghConn.endX - ghConn.startX, ghConn.endZ - ghConn.startZ);
      this.addFixedQuatCuboid(
        'conn-hab-gh',
        ghCorr.cx,
        ghCorr.cy,
        ghCorr.cz,
        ghConn.halfWidth,
        ghConn.halfHeight,
        ghCorr.length * 0.5,
        ghCorr.quaternion,
        true,
        ghCorrYaw,
      );
    }

    // 3. Hollow Bio-Dome Greenhouse: Walkable Floor + Door Step + Segmented Walls + Upper Roof + Interior Props
    this.addFixedCylinder('greenhouse-base', ghX, ghY - 0.09, ghZ, 0.31, ghSpec.floorRadius, false);
    const ghDoor = getGreenhouseDoorwaySpec(this.layout);
    this.addFixedCuboid(
      'greenhouse-door-step',
      ghDoor.centerX + Math.cos(ghSpec.doorAngleRad) * 0.22,
      ghY - 0.03,
      ghDoor.centerZ + Math.sin(ghSpec.doorAngleRad) * 0.22,
      0.59,
      0.15,
      0.28,
      ghDoor.yawRad,
      0,
      0,
      false,
    );

    for (const seg of getGreenhouseWallSegments(this.layout)) {
      this.addFixedCuboid(
        seg.id,
        seg.cx,
        ghY + ghSpec.floorTopOffset + seg.halfHeight,
        seg.cz,
        seg.halfWidth,
        seg.halfHeight,
        seg.halfThick,
        seg.yawRad,
        0,
        0,
        true,
      );
    }
    this.addFixedCuboid(
      'greenhouse-door-lintel',
      ghDoor.centerX,
      ghY + ghSpec.floorTopOffset + ghSpec.wallHeight + 0.11,
      ghDoor.centerZ,
      0.78,
      0.11,
      0.11,
      ghDoor.yawRad,
      0,
      0,
      false,
    );
    const rScale = ghSpec.floorRadius / 2.25;
    const roofRimBaseY = ghY + ghSpec.floorTopOffset + ghSpec.wallHeight;
    this.addFixedCylinder(
      'greenhouse-roof-lower',
      ghX,
      roofRimBaseY + 0.2,
      ghZ,
      0.17,
      2.15 * rScale,
      false,
    );
    this.addFixedCylinder(
      'greenhouse-roof-upper',
      ghX,
      roofRimBaseY + 0.54,
      ghZ,
      0.14,
      1.6 * rScale,
      false,
    );
    this.addFixedCylinder(
      'greenhouse-roof-cap',
      ghX,
      roofRimBaseY + 0.77,
      ghZ,
      0.14,
      1.49 * rScale,
      false,
    );

    if (this.layout.mode === 'gameplay') {
      const floorY = ghY + ghSpec.floorTopOffset;
      for (const prop of GAMEPLAY_GREENHOUSE_PROPS) {
        const px = ghX + prop.dx;
        const pz = ghZ + prop.dz;
        const hh = prop.height * 0.5;
        if (prop.colliderShape === 'cylinder' && prop.radius !== undefined) {
          this.addFixedCylinder(prop.id, px, floorY + hh, pz, hh, prop.radius, true);
        } else if (prop.hx !== undefined && prop.hz !== undefined) {
          this.addFixedCuboid(prop.id, px, floorY + hh, pz, prop.hx, hh, prop.hz, prop.yawRad, 0, 0, true);
        }
      }
    } else {
      this.addFixedCylinder('greenhouse-center-tower', ghX + 0.88, ghY + 0.91, ghZ - 0.78, 0.69, 0.28, true);
    }
    this.addFixedCylinder('greenhouse-water-tank', ghSpec.waterTankX, ghY + 0.6, ghSpec.waterTankZ, 0.6, 0.44, true);

    // 4. Solar Microgrid (stepped pedestals + tilted panel heads + LiFePO4 Battery Container Bank)
    m.solarPanels.forEach(([sx, sz], idx) => {
      const sy = h(sx, sz);
      this.addFixedCylinder(`solar-ped-base-${idx}`, sx, sy + 0.15, sz, 0.15, 0.48);
      this.addFixedCylinder(`solar-ped-pole-${idx}`, sx, sy + 0.96, sz, 0.66, 0.16);
      this.addFixedCuboid(
        `solar-panel-${idx}`,
        sx,
        sy + 1.67,
        sz,
        1.28,
        0.065,
        0.74,
        -0.52,
        0.55,
        0,
        false,
        true,
      );
    });
    const bb = m.batteryBank;
    this.addFixedCuboid('battery-bank', bb.x, h(bb.x, bb.z) + 0.812, bb.z, 1.23, 0.843, 0.73, bb.yaw);

    // 5. Wind Turbines (horizontal towers + nacelles + rotors + helical vertical)
    m.windmills.forEach(([wx, wz, yaw], idx) => {
      const wy = h(wx, wz);
      this.addFixedCylinder(`wind-pad-${idx}`, wx, wy + 0.13, wz, 0.13, 1.25);
      this.addFixedCylinder(`wind-tower-${idx}`, wx, wy + 3.48, wz, 3.48, 0.56);
      const [nacBodyX, nacBodyZ] = rotateXZ(0, -0.15, yaw);
      this.addFixedCuboid(
        `wind-nacelle-${idx}`,
        wx + nacBodyX,
        wy + 6.72,
        wz + nacBodyZ,
        0.39,
        0.37,
        0.725,
        yaw,
        0,
        0,
        false,
      );
      const [nacX, nacZ] = rotateXZ(0, 0.68, yaw);
      const rotorHx = 2.385;
      this.addFixedCuboid(
        `wind-rotor-${idx}`,
        wx + nacX,
        wy + 6.72,
        wz + nacZ,
        rotorHx,
        2.75,
        0.06,
        yaw,
        0,
        0,
        false,
        true,
      );
    });
    const vw = m.verticalTurbine;
    const vwRadius = this.layout.mode === 'gameplay' ? 0.635 : 0.58;
    this.addFixedCylinder('wind-vertical', vw.x, h(vw.x, vw.z) + 1.58, vw.z, 1.58, vwRadius);

    // 6. SWIM Subsurface Ice Drill Derrick
    const idSpec = m.iceDrill;
    const idY = h(idSpec.x, idSpec.z);
    this.addFixedCylinder('ice-drill-deck', idSpec.x, idY + 0.15, idSpec.z, 0.15, 2.0);
    this.addFixedCylinder('ice-drill-mast', idSpec.x, idY + 1.9875, idSpec.z, 1.6875, 1.48, false);
    const [mtX, mtZ] = rotateXZ(1.25, 0.4, idSpec.yaw);
    this.addFixedCylinder('ice-melt-tank', idSpec.x + mtX, idY + 0.9, idSpec.z + mtZ, 0.66, 0.38);

    // 7. Ares Landing Pad & Propellant Depot + Rover Charging Pad
    const lp = m.landingPad;
    const lpY = h(lp.x, lp.z);
    this.addFixedCylinder('landing-pad-apron', lp.x, lpY - 0.18, lp.z, 0.4, lp.apronRadius, false);
    this.addFixedCylinder('prop-tank-1', lp.x + 4.65, lpY + 0.82, lp.z - 1.2, 0.82, 0.68);
    this.addFixedCylinder('prop-tank-2', lp.x + 4.65, lpY + 0.82, lp.z + 1.2, 0.82, 0.68);
    this.addFixedCuboid('cargo-pod', lp.x + 4.4, lpY + 0.64, lp.z - 3.1, 0.99, 0.62, 0.62, 0.22);

    if (m.roverPad.enabled) {
      const rp = m.roverPad;
      const rpY = h(rp.x, rp.z);
      const slabTop = rpY + rp.topOffset;
      this.addFixedCuboid(
        'rover-pad-slab',
        rp.x,
        slabTop - 0.22,
        rp.z,
        rp.widthM * 0.5,
        0.22,
        rp.depthM * 0.5,
        0,
        0,
        0,
        false,
      );
      this.addFixedCuboid(
        'rover-pad-pylon',
        rp.x - rp.widthM * 0.5 + 0.55,
        slabTop + 0.68,
        rp.z - rp.depthM * 0.5 + 0.55,
        0.34,
        0.68,
        0.34,
        0.3,
      );
    }

    // 8. Interactive Zone Props, Comms/Weather Mast & Gameplay Infrastructure
    const pc = m.powerConsole;
    const pcY = h(pc.x, pc.z);
    this.addFixedCuboid('power-console-base', pc.x, pcY + 0.1, pc.z, 0.46, 0.15, 0.42, pc.yaw);
    this.addFixedCuboid('power-console-ped', pc.x, pcY + 0.54, pc.z, 0.26, 0.44, 0.21, pc.yaw);
    const [pcHx, pcHz] = rotateXZ(0, 0.06, pc.yaw);
    const qPcHead = quatMultiply(yawToQuat(pc.yaw), eulerXYZToQuat(-0.42, 0, 0));
    this.addFixedQuatCuboid(
      'power-console-head',
      pc.x + pcHx,
      pcY + 1.06,
      pc.z + pcHz,
      0.37,
      0.27,
      0.15,
      qPcHead,
      true,
      pc.yaw,
    );

    const t2 = m.tank2;
    const t2Y = h(t2.x, t2.z);
    this.addFixedCuboid('tank2-rack', t2.x, t2Y + 0.1, t2.z, 0.91, 0.15, 0.58, t2.yaw);
    const [t2Lx, t2Lz] = rotateXZ(-0.42, 0, t2.yaw);
    const [t2Rx, t2Rz] = rotateXZ(0.42, 0, t2.yaw);
    this.addFixedCylinder('tank2-cyl-l', t2.x + t2Lx, t2Y + 0.93, t2.z + t2Lz, 0.77, 0.34);
    this.addFixedCylinder('tank2-cyl-r', t2.x + t2Rx, t2Y + 0.93, t2.z + t2Rz, 0.77, 0.34);
    if (t2.hasIsruUnit) {
      const [isruX, isruZ] = rotateXZ(t2.isruOffsetX, t2.isruOffsetZ, t2.yaw);
      this.addFixedCuboid('tank2-isru-unit', t2.x + isruX, t2Y + 0.72, t2.z + isruZ, 0.56, 0.72, 0.48, t2.yaw);
    }

    const rec = m.recycler;
    this.addFixedCuboid('water-recycler-deck', rec.x, h(rec.x, rec.z) + 0.08, rec.z, 0.75, 0.08, 0.525, rec.yaw);
    this.addFixedCuboid('water-recycler', rec.x, h(rec.x, rec.z) + 0.68, rec.z, 0.59, 0.56, 0.36, rec.yaw);

    const sh = m.shelter;
    this.addFixedCuboid('rad-shelter', sh.x, h(sh.x, sh.z) + 0.72, sh.z, 1.28, 0.77, 1.0, sh.yaw);

    if (this.layout.mode === 'showcase') {
      SHOWCASE_CRATES.forEach((cr, idx) => {
        this.addFixedCuboid(`crate-${idx + 1}`, cr.x, h(cr.x, cr.z) + 0.24, cr.z, 0.36, 0.24, 0.26, cr.yaw);
      });
    }

    const cm = m.commsMast;
    const mastHH = cm.tall ? 3.2 : 1.0;
    this.addFixedCylinder('weather-mast', cm.x, h(cm.x, cm.z) + mastHH, cm.z, mastHH, cm.radiusM);

    // Gameplay signposts, perimeter bollards, raised pipe bridge piers, and low cable ramps
    for (const sp of this.layout.signposts) {
      this.addFixedCylinder(sp.id, sp.x, h(sp.x, sp.z) + 0.85, sp.z, 0.85, 0.08, false);
    }
    for (const bol of this.layout.bollards) {
      this.addFixedCylinder(bol.id, bol.x, h(bol.x, bol.z) + 0.45, bol.z, 0.45, 0.11, false);
    }
    for (const ub of this.layout.utilityBridges) {
      const uy = h((ub.x1 + ub.x2) * 0.5, (ub.z1 + ub.z2) * 0.5);
      if (ub.kind === 'pipe-bridge') {
        const halfH = (ub.clearanceY + 0.2) * 0.5;
        this.addFixedCylinder(`${ub.id}-pier-a`, ub.x1, h(ub.x1, ub.z1) + halfH, ub.z1, halfH, 0.18, true);
        this.addFixedCylinder(`${ub.id}-pier-b`, ub.x2, h(ub.x2, ub.z2) + halfH, ub.z2, halfH, 0.18, true);
        const span = computeCorridorTransform(
          ub.x1,
          uy + ub.clearanceY + 0.18,
          ub.z1,
          ub.x2,
          uy + ub.clearanceY + 0.18,
          ub.z2,
        );
        const yaw = Math.atan2(ub.x2 - ub.x1, ub.z2 - ub.z1);
        this.addFixedQuatCuboid(
          `${ub.id}-span`,
          span.cx,
          span.cy,
          span.cz,
          0.22,
          0.18,
          span.length * 0.5,
          span.quaternion,
          true,
          yaw,
        );
      } else {
        const rx = (ub.x1 + ub.x2) * 0.5;
        const rz = (ub.z1 + ub.z2) * 0.5;
        const yaw = Math.atan2(ub.x2 - ub.x1, ub.z2 - ub.z1);
        this.addFixedCuboid(
          ub.id,
          rx,
          uy + 0.032,
          rz,
          ub.widthM * 0.48,
          0.032,
          0.28,
          yaw,
          0,
          0,
          false,
          true,
        );
      }
    }
  }

  private buildBoundaryWalls(): void {
    const cx = this.layout.walkableCenter.x;
    const cz = this.layout.walkableCenter.z;
    const r = this.layout.walkableRadiusM;
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
      Math.hypot(playerX - this.lastRockSyncX, playerZ - this.lastRockSyncZ) < 3.5
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
        this.nonModuleColliderHandles.add(col.handle);
        this.activeRockColliders.set(rock.id, col);
      } else if (existing && distSq > exitSq) {
        const parent = existing.parent();
        this.nonModuleColliderHandles.delete(existing.handle);
        this.world.removeCollider(existing, false);
        if (parent) {
          this.world.removeRigidBody(parent);
        }
        this.activeRockColliders.delete(rock.id);
      }
    }
    return this.activeRockColliders.size;
  }

  public updateRoverTransform(x: number, y: number, z: number, yawRad: number, immediate = false): void {
    if (this.disposed) return;
    if (immediate) {
      this.roverBody.setTranslation({ x, y: y + 0.56, z }, true);
      this.roverBody.setRotation(yawToQuat(yawRad), true);
    } else {
      this.roverBody.setNextKinematicTranslation({ x, y: y + 0.56, z });
      this.roverBody.setNextKinematicRotation(yawToQuat(yawRad));
    }
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
    this.accumulatorS = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.desiredVx = 0;
    this.desiredVz = 0;
    this.grounded = dropOffsetM <= 0.05;
    this.rawGrounded = this.grounded;
    this.wasGrounded = this.grounded;
    this.groundGraceTimerS = this.grounded ? PHYSICS_CONSTANTS.GROUND_HYSTERESIS_S : 0;
    this.isLoping = false;
    this.airborneTimeS = 0;
    this.stuckCheckX = x;
    this.stuckCheckZ = z;
    this.stuckActiveTimeS = 0;
    this.lastRoverContact = false;
    this.lastRoverPushingInto = false;
    this.peakFootY = groundY + dropOffsetM;
    this.takeoffFootY = groundY + dropOffsetM;
    this.syncStreamedRocks(x, z, true);
  }

  /**
   * Returns exact ground/floor surface height (terrain, landing pad apron, rover pad, or Greenhouse floor) at (x, z).
   */
  public getGroundSupportHeightAt(x: number, z: number): number {
    return getOutpostSupportHeightAt(
      x,
      z,
      (px, pz) => groundHeightAtGrid(this.grid, px, pz),
      this.layout,
    );
  }

  public stepCrewMember(
    id: CrewMemberId,
    desiredDx: number,
    desiredDz: number,
    dt: number,
  ): { x: number; footY: number; z: number; vx: number; vz: number; blocked: boolean } {
    const entry = this.crewPhysics.get(id);
    if (!entry || this.disposed) {
      return { x: 0, footY: 0, z: 0, vx: 0, vz: 0, blocked: false };
    }
    const footOffset = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M + PHYSICS_CONSTANTS.CAPSULE_RADIUS_M;
    const pos = entry.body.translation();
    const safeDt = Math.max(1e-4, dt);

    entry.controller.computeColliderMovement(entry.collider, {
      x: desiredDx,
      y: -0.35 * safeDt,
      z: desiredDz,
    });
    const corrected = entry.controller.computedMovement();
    const nextX = pos.x + corrected.x;
    let nextY = pos.y + corrected.y;
    const nextZ = pos.z + corrected.z;

    const supportY = this.getGroundSupportHeightAt(nextX, nextZ);
    const minCenterY = supportY + footOffset + PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M * 0.5;
    if (nextY < minCenterY) nextY = minCenterY;

    entry.body.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });

    const reqDist = Math.hypot(desiredDx, desiredDz);
    const actDist = Math.hypot(corrected.x, corrected.z);
    const blocked = reqDist > 0.005 && actDist < reqDist * 0.45;
    return {
      x: nextX,
      footY: nextY - footOffset,
      z: nextZ,
      vx: corrected.x / safeDt,
      vz: corrected.z / safeDt,
      blocked,
    };
  }

  public teleportCrewMember(id: CrewMemberId, x: number, z: number): { x: number; footY: number; z: number } {
    const entry = this.crewPhysics.get(id);
    const footY = this.getGroundSupportHeightAt(x, z);
    if (!entry || this.disposed) return { x, footY, z };
    const centerY =
      footY +
      PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M +
      PHYSICS_CONSTANTS.CAPSULE_RADIUS_M +
      PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M;
    entry.body.setTranslation({ x, y: centerY, z }, true);
    this.world.step();
    return { x, footY, z };
  }

  public getCrewPhysicsPosition(id: CrewMemberId): { x: number; footY: number; z: number } | null {
    const entry = this.crewPhysics.get(id);
    if (!entry || this.disposed) return null;
    const pos = entry.body.translation();
    const footOffset = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M + PHYSICS_CONSTANTS.CAPSULE_RADIUS_M;
    return { x: pos.x, footY: pos.y - footOffset, z: pos.z };
  }

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

  private stepWithDt(
    dt: number,
    input: CharacterFrameInput,
    jumpPending: { value: boolean },
  ): void {
    if (dt <= 0) return;
    const footOffset = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M + PHYSICS_CONSTANTS.CAPSULE_RADIUS_M;

    const currentPos = this.playerBody.translation();
    this.prevCenter.x = currentPos.x;
    this.prevCenter.y = currentPos.y;
    this.prevCenter.z = currentPos.z;

    const footYBefore = currentPos.y - footOffset;
    const terrainHere = groundHeightAtGrid(this.grid, currentPos.x, currentPos.z);
    const localGrav = computeLocalMarsGravity(currentPos.x, currentPos.z, terrainHere).gravityMs2;

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
    this.desiredVx = targetVx;
    this.desiredVz = targetVz;

    const timeConst =
      dirLen > 0.001 ? PHYSICS_CONSTANTS.PLAYER_ACCEL_TIME_S : PHYSICS_CONSTANTS.PLAYER_DECEL_TIME_S;
    const blend = 1 - Math.exp(-dt / timeConst);
    this.vx += (targetVx - this.vx) * blend;
    this.vz += (targetVz - this.vz) * blend;
    if (dirLen <= 0.001 && Math.hypot(this.vx, this.vz) < 0.004) {
      this.vx = 0;
      this.vz = 0;
    }

    // Exclude rover from autostep & snap-to-ground when close or in contact so player never climbs/snags on rover wheels/bumper
    const roverPos = this.roverBody.translation();
    const distToRover = Math.hypot(currentPos.x - roverPos.x, currentPos.z - roverPos.z);
    const nearRover = distToRover <= 2.35;
    if (nearRover) {
      this.controller.disableAutostep();
      this.controller.disableSnapToGround();
    } else {
      this.controller.enableAutostep(
        PHYSICS_CONSTANTS.AUTOSTEP_MAX_HEIGHT_M,
        PHYSICS_CONSTANTS.AUTOSTEP_MIN_WIDTH_M,
        false,
      );
    }

    if (jumpPending.value && this.grounded) {
      jumpPending.value = false;
      this.vy = PHYSICS_CONSTANTS.SUITED_TAKEOFF_MS;
      this.grounded = false;
      this.groundGraceTimerS = 0;
      this.airborneTimeS = 0;
      this.takeoffFootY = footYBefore;
      this.peakFootY = footYBefore;
      this.controller.disableSnapToGround();
    } else if (this.grounded) {
      this.vy = -0.05;
      if (!nearRover) {
        this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
      }
    } else {
      this.vy -= localGrav * dt;
      if (this.vy <= 0 && !nearRover) {
        this.controller.enableSnapToGround(PHYSICS_CONSTANTS.SNAP_TO_GROUND_M);
      } else {
        this.controller.disableSnapToGround();
      }
    }

    const desiredMovement = {
      x: this.vx * dt,
      y: this.grounded ? 0 : this.vy * dt,
      z: this.vz * dt,
    };

    // Exclude dynamic drop-test clutter if any, keep all static/kinematic world except player itself
    this.controller.computeColliderMovement(this.playerCollider, desiredMovement);
    const corrected = this.controller.computedMovement();
    let nextX = currentPos.x + corrected.x;
    let nextY = currentPos.y + corrected.y;
    let nextZ = currentPos.z + corrected.z;

    // Inspect controller contacts for wall sliding, rover push detection, and anti-stuck normals
    const nCol = this.controller.numComputedCollisions();
    this.lastCollisionCount = nCol;
    this.lastContactNormals = [];
    let hitRover = false;
    let pushingIntoRover = false;
    let blockedByNonTerrainWall = false;

    for (let i = 0; i < nCol; i++) {
      const c = this.controller.computedCollision(i);
      if (!c) continue;
      const n = c.normal1;
      this.lastContactNormals.push({ x: n.x, y: n.y, z: n.z });
      const handle = c.collider?.handle;
      const isTerrain = handle === this.terrainCollider.handle;
      const isRover = handle !== undefined && this.roverColliderHandles.has(handle);

      if (isRover) {
        hitRover = true;
        if (dirLen > 0.001) {
          const toRoverX = roverPos.x - currentPos.x;
          const toRoverZ = roverPos.z - currentPos.z;
          const toRoverLen = Math.hypot(toRoverX, toRoverZ) || 1;
          const dotIntoRover = (dirX * toRoverX + dirZ * toRoverZ) / toRoverLen;
          const dotOppNormal = -(dirX * n.x + dirZ * n.z);
          if (dotIntoRover > 0.2 || dotOppNormal > 0.2) {
            pushingIntoRover = true;
          }
        }
      }

      if (!isTerrain && !isRover) {
        const horizMag = Math.hypot(n.x, n.z);
        if (horizMag > 0.65 && Math.abs(n.y) < 0.65) {
          const vn = this.vx * (n.x / horizMag) + this.vz * (n.z / horizMag);
          if (vn < 0) {
            // Project out only the component into the solid wall so sliding speed stays intact
            this.vx -= vn * (n.x / horizMag);
            this.vz -= vn * (n.z / horizMag);
            blockedByNonTerrainWall = true;
          }
        }
      }
    }

    // Also allow sustained close push detection when pressed right along rover skin envelope
    if (!hitRover && nearRover && distToRover <= 1.85 && dirLen > 0.001) {
      const toRoverX = roverPos.x - currentPos.x;
      const toRoverZ = roverPos.z - currentPos.z;
      const toRoverLen = Math.hypot(toRoverX, toRoverZ) || 1;
      if ((dirX * toRoverX + dirZ * toRoverZ) / toRoverLen > 0.45 && distToRover <= 1.55) {
        hitRover = true;
        pushingIntoRover = true;
      }
    }

    this.lastRoverContact = hitRover;
    this.lastRoverPushingInto = pushingIntoRover;

    // Anti-stuck depenetration: if input is active and net displacement < 0.05 m for >= 1.0 s, free along contact normal
    if (dirLen > 0.001) {
      this.stuckActiveTimeS += dt;
      const netDisp = Math.hypot(nextX - this.stuckCheckX, nextZ - this.stuckCheckZ);
      if (netDisp >= PHYSICS_CONSTANTS.ANTI_STUCK_MIN_DISP_M) {
        this.stuckCheckX = nextX;
        this.stuckCheckZ = nextZ;
        this.stuckActiveTimeS = 0;
      } else if (this.stuckActiveTimeS >= PHYSICS_CONSTANTS.ANTI_STUCK_WINDOW_S) {
        let escX = 0;
        let escZ = 0;
        for (const cn of this.lastContactNormals) {
          if (Math.hypot(cn.x, cn.z) > 0.25) {
            escX += cn.x;
            escZ += cn.z;
          }
        }
        if (Math.hypot(escX, escZ) < 0.05 && nearRover) {
          escX = nextX - roverPos.x;
          escZ = nextZ - roverPos.z;
        }
        if (Math.hypot(escX, escZ) < 0.05) {
          // Perpendicular tangential nudge around desired direction
          escX = -dirZ;
          escZ = dirX;
        }
        const escLen = Math.hypot(escX, escZ) || 1;
        const depenStep = Math.min(PHYSICS_CONSTANTS.ANTI_STUCK_DEPEN_SPEED_MS, 1.35) * dt;
        const candMove = { x: (escX / escLen) * depenStep, y: 0, z: (escZ / escLen) * depenStep };
        this.controller.computeColliderMovement(this.playerCollider, candMove);
        const safeCorr = this.controller.computedMovement();
        nextX += safeCorr.x;
        nextZ += safeCorr.z;
        this.vx = (escX / escLen) * Math.min(0.86, PHYSICS_CONSTANTS.ANTI_STUCK_DEPEN_SPEED_MS);
        this.vz = (escZ / escLen) * Math.min(0.86, PHYSICS_CONSTANTS.ANTI_STUCK_DEPEN_SPEED_MS);
        this.stuckActiveTimeS = 0.65;
        this.stuckCheckX = nextX;
        this.stuckCheckZ = nextZ;
      }
    } else {
      this.stuckActiveTimeS = 0;
      this.stuckCheckX = nextX;
      this.stuckCheckZ = nextZ;
    }

    // Keep floor support slightly above controller skin so capsule never wedges on triangle seams
    const supportY = this.getGroundSupportHeightAt(nextX, nextZ);
    const minCenterY = supportY + footOffset + PHYSICS_CONSTANTS.CONTROLLER_OFFSET_M * 0.5;
    let clampedToFloor = false;
    if (nextY < minCenterY) {
      nextY = minCenterY;
      clampedToFloor = true;
    }

    this.playerBody.setNextKinematicTranslation({ x: nextX, y: nextY, z: nextZ });
    this.world.step();

    this.currCenter.x = nextX;
    this.currCenter.y = nextY;
    this.currCenter.z = nextZ;

    const footYAfter = nextY - footOffset;
    const rawGrounded = this.controller.computedGrounded() || clampedToFloor;
    this.rawGrounded = rawGrounded;
    this.wasGrounded = this.grounded;

    // Ground hysteresis (~80 ms grace) so a one-frame floor flicker never drops horizontal momentum or triggers false airtime
    if (this.vy > 0.15) {
      this.groundGraceTimerS = 0;
      this.grounded = false;
    } else if (rawGrounded) {
      this.groundGraceTimerS = PHYSICS_CONSTANTS.GROUND_HYSTERESIS_S;
      this.grounded = true;
    } else {
      this.groundGraceTimerS = Math.max(0, this.groundGraceTimerS - dt);
      this.grounded = this.groundGraceTimerS > 0;
    }

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

    // Gait hysteresis (±0.1 m/s around walk-to-lope transition threshold 1.099 m/s)
    const speedNow = Math.hypot(this.vx, this.vz);
    const transMs = PHYSICS_CONSTANTS.MARS_SUITED_TRANSITION_MS;
    if (!this.isLoping && speedNow >= transMs + PHYSICS_CONSTANTS.GAIT_HYSTERESIS_MS) {
      this.isLoping = true;
    } else if (this.isLoping && speedNow <= transMs - PHYSICS_CONSTANTS.GAIT_HYSTERESIS_MS) {
      this.isLoping = false;
    }

    // Only clear void unused variable lint warning if needed
    void blockedByNonTerrainWall;
  }

  public stepFrame(frameDtS: number, input: CharacterFrameInput): PlayerStepSnapshot {
    if (this.disposed) {
      return this.getSnapshot();
    }
    const t0 = performance.now();
    const clampedDt = Math.min(Math.max(frameDtS, 0), PHYSICS_CONSTANTS.MAX_FRAME_DT_S);
    const fixedDt = PHYSICS_CONSTANTS.FIXED_DT_S;
    const jumpPending = { value: input.jumpRequested };

    this.accumulatorS += clampedDt;
    const maxStepsPerFrame = 16;
    let steps = 0;
    while (this.accumulatorS >= fixedDt - 1e-9 && steps < maxStepsPerFrame) {
      this.stepWithDt(fixedDt, input, jumpPending);
      this.accumulatorS = Math.max(0, this.accumulatorS - fixedDt);
      steps++;
    }
    if (steps === maxStepsPerFrame && this.accumulatorS > fixedDt * 2) {
      this.accumulatorS = fixedDt;
    }

    this.syncStreamedRocks(this.currCenter.x, this.currCenter.z);

    const alpha = Math.max(0, Math.min(1, this.accumulatorS / fixedDt));
    this.interpCenter.x = this.prevCenter.x + (this.currCenter.x - this.prevCenter.x) * alpha;
    this.interpCenter.y = this.prevCenter.y + (this.currCenter.y - this.prevCenter.y) * alpha;
    this.interpCenter.z = this.prevCenter.z + (this.currCenter.z - this.prevCenter.z) * alpha;

    this.lastPhysicsSteps = steps;
    this.lastInterpAlpha = alpha;
    this.lastStepDurationMs = performance.now() - t0;
    return this.getSnapshot();
  }

  public stepSingleFixed(input: CharacterFrameInput): PlayerStepSnapshot {
    const t0 = performance.now();
    const jumpPending = { value: input.jumpRequested };
    this.stepWithDt(PHYSICS_CONSTANTS.FIXED_DT_S, input, jumpPending);
    this.syncStreamedRocks(this.currCenter.x, this.currCenter.z);
    this.interpCenter.x = this.currCenter.x;
    this.interpCenter.y = this.currCenter.y;
    this.interpCenter.z = this.currCenter.z;
    this.lastPhysicsSteps = 1;
    this.lastInterpAlpha = 1;
    this.lastStepDurationMs = performance.now() - t0;
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
      desiredVx: this.desiredVx,
      desiredVz: this.desiredVz,
      horizontalSpeedMs: speed,
      grounded: this.grounded,
      computedGrounded: this.rawGrounded,
      isLoping: this.isLoping,
      slopeDeg: this.getSlopeDegAt(this.currCenter.x, this.currCenter.z),
      lastLanding: this.lastLanding,
      activeRockColliders: this.activeRockColliders.size,
      physicsStepMs: this.lastStepDurationMs,
      physicsSteps: this.lastPhysicsSteps,
      interpAlpha: this.lastInterpAlpha,
      collisionCount: this.lastCollisionCount,
      roverContact: this.lastRoverContact,
      roverPushingInto: this.lastRoverPushingInto,
    };
  }

  /**
   * Sweeps the Rover hull envelope from (fromX, fromZ) to (toX, toZ) against outpost structures & boulders
   * (excluding terrain, player, and rover itself) to verify a clear Make-Way reverse/turn path.
   */
  public isRoverPathClear(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    yawRad: number,
  ): boolean {
    if (this.disposed) return true;
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    const fromY = this.getGroundSupportHeightAt(fromX, fromZ) + 0.72;
    const toY = this.getGroundSupportHeightAt(toX, toZ) + 0.72;
    const dy = toY - fromY;
    const fullDist = Math.hypot(dx, dy, dz);
    const vel = { x: dx / fullDist, y: dy / fullDist, z: dz / fullDist };
    const shape = new RAPIER.Cuboid(0.84, 0.44, 0.96);
    const rot = yawToQuat(yawRad);
    const ignored = new Set<number>([this.terrainCollider.handle, this.playerCollider.handle]);
    for (const h of this.roverColliderHandles) ignored.add(h);
    const predicate = (col: RAPIER.Collider) => !ignored.has(col.handle);
    const hit = this.world.castShape(
      { x: fromX, y: fromY, z: fromZ },
      rot,
      vel,
      shape,
      0,
      fullDist,
      true,
      undefined,
      undefined,
      this.roverCollider,
      undefined,
      predicate,
    );
    return hit === null;
  }

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

  public getStaticColliderRecords(): ReadonlyArray<StaticColliderRecord> {
    return this.staticColliderRecords;
  }

  public getRoverColliderRecords(): StaticColliderRecord[] {
    const t = this.roverBody.translation();
    const r = this.roverBody.rotation();
    const q = { x: r.x, y: r.y, z: r.z, w: r.w };
    const rotateOffset = (ox: number, oy: number, oz: number) => {
      const ix = q.w * ox + q.y * oz - q.z * oy;
      const iy = q.w * oy + q.z * ox - q.x * oz;
      const iz = q.w * oz + q.x * oy - q.y * ox;
      const iw = -q.x * ox - q.y * oy - q.z * oz;
      return {
        x: t.x + ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
        y: t.y + iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
        z: t.z + iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
      };
    };
    const c1 = rotateOffset(0, -0.06, 0.02);
    const c2 = rotateOffset(0, 0.84, 0.05);
    return [
      {
        id: 'rover-chassis',
        category: 'rover',
        shape: 'cuboid',
        cx: c1.x,
        cy: c1.y,
        cz: c1.z,
        halfExtents: { x: 0.84, y: 0.5, z: 0.96 },
        yawRad: 0,
        pitchRad: 0,
        rollRad: 0,
        quaternion: q,
      },
      {
        id: 'rover-head',
        category: 'rover',
        shape: 'cuboid',
        cx: c2.x,
        cy: c2.y,
        cz: c2.z,
        halfExtents: { x: 0.39, y: 0.35, z: 0.68 },
        yawRad: 0,
        pitchRad: 0,
        rollRad: 0,
        quaternion: q,
      },
    ];
  }

  public getRoverColliderState(): {
    cx: number;
    cy: number;
    cz: number;
    hx: number;
    hy: number;
    hz: number;
    quaternion: { x: number; y: number; z: number; w: number };
  } {
    const t = this.roverBody.translation();
    const r = this.roverBody.rotation();
    return {
      cx: t.x,
      cy: t.y + 0.31,
      cz: t.z,
      hx: 0.9,
      hy: 0.87,
      hz: 1.24,
      quaternion: { x: r.x, y: r.y, z: r.z, w: r.w },
    };
  }

  public getActiveRockSpecs(): RockColliderSpec[] {
    return this.rockSpecs.filter((r) => this.activeRockColliders.has(r.id));
  }

  public castRay(
    origin: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
    maxToi: number,
    solid = true,
    excludeTerrain = false,
    excludeActorsAndRocks = false,
  ): { toi: number; colliderHandle: number; colliderId?: string } | null {
    if (this.disposed) return null;
    const ray = new RAPIER.Ray(origin, dir);
    const predicate = excludeActorsAndRocks
      ? (col: RAPIER.Collider) => !this.nonModuleColliderHandles.has(col.handle)
      : excludeTerrain
        ? (col: RAPIER.Collider) => col.handle !== this.terrainCollider.handle
        : undefined;
    const hit = this.world.castRay(
      ray,
      maxToi,
      solid,
      undefined,
      undefined,
      this.playerCollider,
      undefined,
      predicate,
    );
    if (!hit) return null;
    return {
      toi: hit.timeOfImpact,
      colliderHandle: hit.collider.handle,
      colliderId: this.colliderIdByHandle.get(hit.collider.handle),
    };
  }

  public shapeCastCrewCapsule(
    from: { x: number; y: number; z: number },
    to: { x: number; y: number; z: number },
    radius = PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
    halfHeight = PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M,
    ignoreCrewMemberId?: CrewMemberId,
    excludeCrewAndTerrain = true,
  ): { toi: number; hitPoint: { x: number; y: number; z: number } } | null {
    if (this.disposed) return null;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 1e-4) return null;
    const vel = { x: dx / dist, y: dy / dist, z: dz / dist };
    const shape = new RAPIER.Capsule(halfHeight, radius);
    const ignoredCrewCol = ignoreCrewMemberId ? this.crewPhysics.get(ignoreCrewMemberId)?.collider : undefined;
    const ignoredHandles = new Set<number>([this.playerCollider.handle]);
    if (excludeCrewAndTerrain) {
      ignoredHandles.add(this.terrainCollider.handle);
      for (const entry of this.crewPhysics.values()) {
        ignoredHandles.add(entry.collider.handle);
      }
      for (const handle of this.roverColliderHandles) {
        ignoredHandles.add(handle);
      }
    } else if (ignoredCrewCol) {
      ignoredHandles.add(ignoredCrewCol.handle);
    }
    const predicate = (col: RAPIER.Collider) => !ignoredHandles.has(col.handle);
    const hit = this.world.castShape(
      from,
      { x: 0, y: 0, z: 0, w: 1 },
      vel,
      shape,
      0,
      dist,
      true,
      undefined,
      undefined,
      ignoredCrewCol ?? this.playerCollider,
      undefined,
      predicate,
    );
    if (!hit) return null;
    return {
      toi: hit.time_of_impact,
      hitPoint: {
        x: from.x + vel.x * hit.time_of_impact,
        y: from.y + vel.y * hit.time_of_impact,
        z: from.z + vel.z * hit.time_of_impact,
      },
    };
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.world.free();
  }
}
