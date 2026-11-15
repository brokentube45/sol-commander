import * as THREE from 'three';
import { GamePhase } from '../data/missionData';
import { CREW_PROFILES, CrewMemberId, PHYSICS_CONSTANTS } from '../sim/constants';
import {
  CrewAgentState,
  RoverControllerState,
  getOutpostNavGraph,
} from '../sim/crewAndRoverSim';
import {
  GAMEPLAY_LAYOUT,
  OutpostLayoutConfig,
  SHOWCASE_LAYOUT,
  getAirlockWorldPose,
  getGreenhouseDoorwaySpec,
} from '../sim/outpostLayout';
import { MarsPhysicsWorld, StaticColliderRecord } from '../sim/rapierWorld';
import { RockColliderSpec, groundHeightAt } from '../sim/terrainField';
import { OutpostRig } from '../three/outpostAssets';
import {
  ModuleAuditEntry,
  SeamAuditRecord,
  SelfTestReport,
  computeModuleAABBs,
  measurePairwiseSeamGaps,
  runOutpostSelfTest,
} from './outpostAudit';

export type DebugOverlayKey =
  | 'colliders'
  | 'crewGizmos'
  | 'navGraph'
  | 'moduleBounds'
  | 'stationSlots'
  | 'doorways';

export type DebugOverlayFlags = Record<DebugOverlayKey, boolean>;

export interface DebugTeleportOptions {
  kind: 'player' | 'camera' | 'camera-reset' | 'crew';
  x?: number;
  y?: number;
  z?: number;
  lookAt?: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  crewId?: CrewMemberId;
}

export interface DebugCrewSnapshot {
  id: CrewMemberId;
  name: string;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  speedMs: number;
  state: string;
  currentStation: string;
  targetStation: string;
  path: Array<{ x: number; y: number; z: number }>;
  physicsRegistered: boolean;
}

export interface MovementFrameSample {
  tMs: number;
  dtS: number;
  physicsSteps: number;
  interpAlpha: number;
  keysPressed: string[];
  desiredVel: { x: number; z: number };
  actualHorizVel: { x: number; z: number; speedMs: number };
  computedGrounded: boolean;
  grounded: boolean;
  collisionCount: number;
  roverContact: boolean;
  roverPushingInto: boolean;
  cameraPosDeltaM: number;
  cameraJerkMs2: number;
}

export interface MovementDiagnosticsReport {
  sampleCount: number;
  walkSpeedTargetMs: number;
  lopeSpeedTargetMs: number;
  cameraJerkThresholdMs2: number;
  maxCameraJerkMs2: number;
  zeroSpeedFramesWhileWalking: number;
  samples: MovementFrameSample[];
}

export interface MarsDebugWindowAPI {
  readonly enabled: true;
  readonly player: {
    x: number;
    footY: number;
    centerY: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    grounded: boolean;
    speedMs: number;
    yawDeg: number;
    capsuleRadiusM: number;
    capsuleHeightM: number;
  };
  readonly crew: DebugCrewSnapshot[];
  readonly rover: {
    x: number;
    y: number;
    z: number;
    yawRad: number;
    speedMs: number;
    tiltDeg: number;
    state: string;
  };
  readonly camera: {
    x: number;
    y: number;
    z: number;
    yawRad: number;
    pitchRad: number;
    mode: '3p' | '1p';
    overridden: boolean;
  };
  readonly overlays: DebugOverlayFlags;
  setOverlay: (key: DebugOverlayKey, value: boolean) => void;
  toggleOverlay: (key: DebugOverlayKey) => boolean;
  getSelectedCrewId: () => CrewMemberId;
  cycleSelectedCrew: () => CrewMemberId;
  setGameSpeed: (mult: number) => void;
  getGameSpeed: () => number;
  setPhase: (phase: GamePhase) => void;
  teleport: (opts: DebugTeleportOptions) => void;
  getModuleList: () => { modules: ModuleAuditEntry[]; seams: SeamAuditRecord[] };
  getStaticColliders: () => {
    staticColliders: ReadonlyArray<StaticColliderRecord>;
    roverCollider: ReturnType<MarsPhysicsWorld['getRoverColliderState']> | null;
    activeRocks: RockColliderSpec[];
  };
  getMovementDiagnostics: () => MovementDiagnosticsReport;
  runSelfTest: () => Promise<SelfTestReport>;
  getLastReport: () => SelfTestReport | null;
}

declare global {
  interface Window {
    __MARS_DEBUG__?: MarsDebugWindowAPI;
  }
}

export function isDebugModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
}

export const DEFAULT_DEBUG_OVERLAY_FLAGS: DebugOverlayFlags = {
  colliders: false,
  crewGizmos: false,
  navGraph: false,
  moduleBounds: false,
  stationSlots: false,
  doorways: false,
};

const CREW_COLOR_MAP: Record<CrewMemberId, string> = {
  amara: '#22C55E',
  kenji: '#FFB703',
  lucia: '#38BDF8',
  rafi: '#E85D04',
};

function createLabelSprite(text: string, borderColor: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 360;
  canvas.height = 84;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(7, 19, 36, 0.88)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8F9FA';
    ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 0.37, 1);
  sprite.renderOrder = 999;
  return sprite;
}

function updateLabelSpriteCanvas(sprite: THREE.Sprite, text: string, borderColor: string): void {
  const mat = sprite.material as THREE.SpriteMaterial;
  const tex = mat.map as THREE.CanvasTexture | null;
  const canvas = tex?.image as HTMLCanvasElement | undefined;
  if (!canvas || !tex) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(7, 19, 36, 0.90)';
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F8F9FA';
  ctx.font = 'bold 21px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  tex.needsUpdate = true;
}

function buildCapsuleWireframe(
  radius: number,
  totalHeight: number,
  color: string,
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
): THREE.Group {
  const g = new THREE.Group();
  const halfCyl = Math.max(0.05, totalHeight * 0.5 - radius);
  const mat = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 });
  materials.push(mat);

  // Cylinder shell wireframe + top/bottom ring + 4 vertical ribs
  const cylGeo = new THREE.CylinderGeometry(radius, radius, halfCyl * 2, 16, 1, true);
  const edges = new THREE.EdgesGeometry(cylGeo);
  cylGeo.dispose();
  geometries.push(edges);
  const cylLines = new THREE.LineSegments(edges, mat);
  cylLines.position.y = totalHeight * 0.5;
  cylLines.renderOrder = 990;
  g.add(cylLines);

  // Top & bottom hemisphere rings
  const ringPts: THREE.Vector3[] = [];
  const segs = 24;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    // Equators
    ringPts.push(
      new THREE.Vector3(Math.cos(a0) * radius, radius, Math.sin(a0) * radius),
      new THREE.Vector3(Math.cos(a1) * radius, radius, Math.sin(a1) * radius),
      new THREE.Vector3(Math.cos(a0) * radius, totalHeight - radius, Math.sin(a0) * radius),
      new THREE.Vector3(Math.cos(a1) * radius, totalHeight - radius, Math.sin(a1) * radius),
    );
    // Vertical meridian arc on XY plane
    const b0 = (i / segs) * Math.PI;
    const b1 = ((i + 1) / segs) * Math.PI;
    ringPts.push(
      new THREE.Vector3(Math.cos(b0) * radius, totalHeight - radius + Math.sin(b0) * radius, 0),
      new THREE.Vector3(Math.cos(b1) * radius, totalHeight - radius + Math.sin(b1) * radius, 0),
      new THREE.Vector3(Math.cos(b0) * radius, radius - Math.sin(b0) * radius, 0),
      new THREE.Vector3(Math.cos(b1) * radius, radius - Math.sin(b1) * radius, 0),
    );
  }
  const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
  geometries.push(ringGeo);
  const ringLines = new THREE.LineSegments(ringGeo, mat);
  ringLines.renderOrder = 990;
  g.add(ringLines);

  return g;
}

export class MarsDebugOverlayManager {
  private readonly scene: THREE.Scene;
  private readonly outpost: OutpostRig;
  private readonly layout: OutpostLayoutConfig;
  private readonly root = new THREE.Group();

  private readonly colliderGroup = new THREE.Group();
  private readonly crewGroup = new THREE.Group();
  private readonly navGroup = new THREE.Group();
  private readonly boundsGroup = new THREE.Group();
  private readonly slotsGroup = new THREE.Group();
  private readonly doorwaysGroup = new THREE.Group();

  private readonly trackedGeos: THREE.BufferGeometry[] = [];
  private readonly trackedMats: THREE.Material[] = [];
  private readonly trackedTexs: THREE.Texture[] = [];

  private collidersBuilt = false;
  private navBuilt = false;
  private boundsBuilt = false;
  private slotsBuilt = false;
  private doorwaysBuilt = false;

  private readonly crewGizmos: Array<{
    id: CrewMemberId;
    group: THREE.Group;
    sprite: THREE.Sprite;
    lastLabel: string;
  }> = [];

  private readonly selectedPathLine: THREE.Line;
  private readonly selectedPathGeo: THREE.BufferGeometry;

  public flags: DebugOverlayFlags = { ...DEFAULT_DEBUG_OVERLAY_FLAGS };
  public selectedCrewId: CrewMemberId = 'rafi';

  constructor(scene: THREE.Scene, outpost: OutpostRig, layout: OutpostLayoutConfig = SHOWCASE_LAYOUT) {
    this.scene = scene;
    this.outpost = outpost;
    this.layout = layout;
    this.root.name = 'MarsDebugOverlaysRoot';

    this.colliderGroup.visible = false;
    this.crewGroup.visible = false;
    this.navGroup.visible = false;
    this.boundsGroup.visible = false;
    this.slotsGroup.visible = false;
    this.doorwaysGroup.visible = false;

    this.root.add(
      this.colliderGroup,
      this.crewGroup,
      this.navGroup,
      this.boundsGroup,
      this.slotsGroup,
      this.doorwaysGroup,
    );
    this.scene.add(this.root);

    // Pre-build Crew gizmos (hidden until crewGizmos flag toggled on)
    CREW_PROFILES.forEach((p) => {
      const cap = buildCapsuleWireframe(
        PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
        PHYSICS_CONSTANTS.CAPSULE_TOTAL_HEIGHT_M,
        CREW_COLOR_MAP[p.id],
        this.trackedGeos,
        this.trackedMats,
      );
      const sprite = createLabelSprite(`${p.id.toUpperCase()} [Working]`, CREW_COLOR_MAP[p.id]);
      sprite.position.set(0, PHYSICS_CONSTANTS.CAPSULE_TOTAL_HEIGHT_M + 0.42, 0);
      if ((sprite.material as THREE.SpriteMaterial).map) {
        this.trackedTexs.push((sprite.material as THREE.SpriteMaterial).map!);
      }
      this.trackedMats.push(sprite.material);
      cap.add(sprite);
      this.crewGroup.add(cap);
      this.crewGizmos.push({ id: p.id, group: cap, sprite, lastLabel: '' });
    });

    // Dynamic line for highlighted selected crew path
    this.selectedPathGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    this.trackedGeos.push(this.selectedPathGeo);
    const selMat = new THREE.LineBasicMaterial({
      color: '#FF3366',
      depthTest: false,
      transparent: true,
      opacity: 0.98,
    });
    this.trackedMats.push(selMat);
    this.selectedPathLine = new THREE.Line(this.selectedPathGeo, selMat);
    this.selectedPathLine.renderOrder = 995;
    this.navGroup.add(this.selectedPathLine);
  }

  public setFlag(key: DebugOverlayKey, val: boolean): void {
    this.flags[key] = val;
    this.colliderGroup.visible = this.flags.colliders;
    this.crewGroup.visible = this.flags.crewGizmos;
    this.navGroup.visible = this.flags.navGraph;
    this.boundsGroup.visible = this.flags.moduleBounds;
    this.slotsGroup.visible = this.flags.stationSlots;
    this.doorwaysGroup.visible = this.flags.doorways;
  }

  public cycleSelectedCrew(): CrewMemberId {
    const idx = CREW_PROFILES.findIndex((p) => p.id === this.selectedCrewId);
    const next = CREW_PROFILES[(idx + 1) % CREW_PROFILES.length].id;
    this.selectedCrewId = next;
    return next;
  }

  private ensureCollidersBuilt(physicsWorld: MarsPhysicsWorld): void {
    if (this.collidersBuilt) return;
    this.collidersBuilt = true;

    const structMat = new THREE.LineBasicMaterial({
      color: '#00F5D4',
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const boundaryMat = new THREE.LineBasicMaterial({
      color: '#FFB703',
      transparent: true,
      opacity: 0.35,
    });
    const rockMat = new THREE.LineBasicMaterial({
      color: '#F472B6',
      transparent: true,
      opacity: 0.75,
    });
    this.trackedMats.push(structMat, boundaryMat, rockMat);

    for (const rec of physicsWorld.getStaticColliderRecords()) {
      if (rec.shape === 'heightfield') continue;
      let wireGeo: THREE.BufferGeometry;
      if (rec.shape === 'cylinder') {
        const raw = new THREE.CylinderGeometry(
          rec.halfExtents.x,
          rec.halfExtents.x,
          rec.halfExtents.y * 2,
          18,
          1,
        );
        wireGeo = new THREE.EdgesGeometry(raw);
        raw.dispose();
      } else {
        const raw = new THREE.BoxGeometry(
          rec.halfExtents.x * 2,
          rec.halfExtents.y * 2,
          rec.halfExtents.z * 2,
        );
        wireGeo = new THREE.EdgesGeometry(raw);
        raw.dispose();
      }
      this.trackedGeos.push(wireGeo);
      const lines = new THREE.LineSegments(
        wireGeo,
        rec.category === 'boundary' ? boundaryMat : structMat,
      );
      lines.position.set(rec.cx, rec.cy, rec.cz);
      lines.quaternion.set(
        rec.quaternion.x,
        rec.quaternion.y,
        rec.quaternion.z,
        rec.quaternion.w,
      );
      lines.renderOrder = 980;
      this.colliderGroup.add(lines);
    }

    // Active rock colliders
    for (const rk of physicsWorld.getActiveRockSpecs()) {
      const raw = new THREE.CylinderGeometry(rk.radiusXZ, rk.radiusXZ, Math.max(0.3, rk.height), 10);
      const edges = new THREE.EdgesGeometry(raw);
      raw.dispose();
      this.trackedGeos.push(edges);
      const lines = new THREE.LineSegments(edges, rockMat);
      lines.position.set(rk.x, rk.y, rk.z);
      lines.rotation.set(rk.rotX, rk.rotY, rk.rotZ);
      this.colliderGroup.add(lines);
    }
  }

  private ensureBoundsAndSeamsBuilt(physicsWorld: MarsPhysicsWorld | null): void {
    if (this.boundsBuilt) return;
    this.boundsBuilt = true;

    const modules = computeModuleAABBs(this.outpost, physicsWorld, this.layout);
    const seams = measurePairwiseSeamGaps(this.outpost, physicsWorld, this.layout);

    for (const mod of modules) {
      const box = new THREE.Box3(
        new THREE.Vector3(mod.aabbMin.x, mod.aabbMin.y, mod.aabbMin.z),
        new THREE.Vector3(mod.aabbMax.x, mod.aabbMax.y, mod.aabbMax.z),
      );
      if (box.isEmpty()) continue;
      const colorHex =
        mod.maxBoundsDiffM !== null && mod.maxBoundsDiffM > 0.15 ? 0xf97316 : 0x38bdf8;
      const helper = new THREE.Box3Helper(box, new THREE.Color(colorHex));
      this.trackedGeos.push(helper.geometry);
      this.trackedMats.push(helper.material as THREE.Material);
      this.boundsGroup.add(helper);
    }

    // Highlight every seam GAP (> 1 cm) & CLIPPING failure in bright RED
    const redMat = new THREE.MeshBasicMaterial({
      color: '#FF1E38',
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const okMat = new THREE.MeshBasicMaterial({
      color: '#22C55E',
      wireframe: true,
      depthTest: false,
      transparent: true,
      opacity: 0.65,
    });
    this.trackedMats.push(redMat, okMat);

    for (const s of seams) {
      const isBad = s.status !== 'OK';
      const geo = new THREE.SphereGeometry(isBad ? 0.34 : 0.18, 12, 8);
      this.trackedGeos.push(geo);
      const marker = new THREE.Mesh(geo, isBad ? redMat : okMat);
      marker.position.set(s.anchorWorld.x, s.anchorWorld.y, s.anchorWorld.z);
      marker.renderOrder = 996;
      this.boundsGroup.add(marker);

      if (isBad) {
        // Tall bright-red vertical pole & label for instant camera readability
        const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6);
        this.trackedGeos.push(poleGeo);
        const pole = new THREE.Mesh(poleGeo, redMat);
        pole.position.set(s.anchorWorld.x, s.anchorWorld.y + 1.1, s.anchorWorld.z);
        this.boundsGroup.add(pole);

        const tag = createLabelSprite(`${s.status}: ${s.pair} (${(s.gapM * 100).toFixed(1)}cm)`, '#FF1E38');
        tag.position.set(s.anchorWorld.x, s.anchorWorld.y + 2.35, s.anchorWorld.z);
        tag.scale.set(2.3, 0.44, 1);
        if ((tag.material as THREE.SpriteMaterial).map) {
          this.trackedTexs.push((tag.material as THREE.SpriteMaterial).map!);
        }
        this.trackedMats.push(tag.material);
        this.boundsGroup.add(tag);
      }
    }
  }

  private ensureNavAndSlotsBuilt(crewAgents: CrewAgentState[], physicsWorld: MarsPhysicsWorld | null): void {
    const grid = physicsWorld?.grid;
    const supportY = (x: number, z: number) =>
      physicsWorld ? physicsWorld.getGroundSupportHeightAt(x, z) : groundHeightAt(x, z, grid);

    if (!this.navBuilt) {
      this.navBuilt = true;
      const { nodes, edges } = getOutpostNavGraph(this.layout);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const graphMat = new THREE.LineBasicMaterial({
        color: '#22C55E',
        transparent: true,
        opacity: 0.72,
        depthTest: false,
      });
      this.trackedMats.push(graphMat);

      const segPts: THREE.Vector3[] = [];
      for (const [aId, bId] of edges) {
        const a = nodeMap.get(aId);
        const b = nodeMap.get(bId);
        if (!a || !b) continue;
        segPts.push(
          new THREE.Vector3(a.x, supportY(a.x, a.z) + 0.35, a.z),
          new THREE.Vector3(b.x, supportY(b.x, b.z) + 0.35, b.z),
        );
      }
      const graphGeo = new THREE.BufferGeometry().setFromPoints(segPts);
      this.trackedGeos.push(graphGeo);
      const graphLines = new THREE.LineSegments(graphGeo, graphMat);
      graphLines.renderOrder = 988;
      this.navGroup.add(graphLines);
    }

    if (!this.slotsBuilt) {
      this.slotsBuilt = true;
      const ringGeo = new THREE.RingGeometry(0.32, 0.46, 20);
      ringGeo.rotateX(-Math.PI / 2);
      this.trackedGeos.push(ringGeo);

      for (const ag of crewAgents) {
        const mat = new THREE.MeshBasicMaterial({
          color: CREW_COLOR_MAP[ag.id],
          side: THREE.DoubleSide,
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        });
        this.trackedMats.push(mat);

        ag.stations.forEach((st, idx) => {
          const m = new THREE.Mesh(ringGeo, mat);
          m.position.set(st.x, supportY(st.x, st.z) + 0.08, st.z);
          m.renderOrder = 985;
          this.slotsGroup.add(m);

          const sp = createLabelSprite(`${ag.id.toUpperCase()} S${idx + 1}`, CREW_COLOR_MAP[ag.id]);
          sp.position.set(st.x, m.position.y + 0.65, st.z);
          sp.scale.set(1.25, 0.28, 1);
          if ((sp.material as THREE.SpriteMaterial).map) {
            this.trackedTexs.push((sp.material as THREE.SpriteMaterial).map!);
          }
          this.trackedMats.push(sp.material);
          this.slotsGroup.add(sp);
        });
      }
    }
  }

  private ensureDoorwaysBuilt(physicsWorld: MarsPhysicsWorld | null): void {
    if (this.doorwaysBuilt) return;
    this.doorwaysBuilt = true;
    const grid = physicsWorld?.grid;
    const airPose = getAirlockWorldPose(this.layout);
    const ghDoor = getGreenhouseDoorwaySpec(this.layout);
    const minGhDoorM = this.layout.mode === 'gameplay' ? 1.25 : 0.9;
    const chapeaMidZ = (this.layout.modules.habitat.z + this.layout.modules.chapea.z) * 0.5;

    const specs: Array<{ label: string; x: number; z: number; yaw: number; widthM: number; pass: boolean }> = [
      {
        label: 'AIRLOCK FRONT (0.95m)',
        x: airPose.stepX,
        z: airPose.stepZ,
        yaw: airPose.yawRad,
        widthM: 0.95,
        pass: true,
      },
      {
        label: `GREENHOUSE DOOR (${ghDoor.clearWidthM.toFixed(2)}m OPEN)`,
        x: ghDoor.centerX,
        z: ghDoor.centerZ,
        yaw: ghDoor.yawRad,
        widthM: ghDoor.clearWidthM,
        pass: ghDoor.clearWidthM >= minGhDoorM,
      },
      {
        label: 'CHAPEA CORRIDOR LINK (SEALED)',
        x: this.layout.modules.chapea.x,
        z: chapeaMidZ,
        yaw: 0,
        widthM: this.layout.modules.connHabChapea.halfWidth * 2,
        pass: true,
      },
    ];

    for (const d of specs) {
      const y = physicsWorld
        ? physicsWorld.getGroundSupportHeightAt(d.x, d.z)
        : groundHeightAt(d.x, d.z, grid);
      const col = d.pass ? '#22C55E' : '#FF1E38';
      const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(d.widthM, 2.0, 0.25));
      const frameMat = new THREE.LineBasicMaterial({ color: col, depthTest: false });
      this.trackedGeos.push(frameGeo);
      this.trackedMats.push(frameMat);
      const lines = new THREE.LineSegments(frameGeo, frameMat);
      lines.position.set(d.x, y + 1.0, d.z);
      lines.rotation.y = d.yaw;
      lines.renderOrder = 994;
      this.doorwaysGroup.add(lines);

      const sp = createLabelSprite(d.label, col);
      sp.position.set(d.x, y + 2.3, d.z);
      sp.scale.set(2.0, 0.4, 1);
      if ((sp.material as THREE.SpriteMaterial).map) {
        this.trackedTexs.push((sp.material as THREE.SpriteMaterial).map!);
      }
      this.trackedMats.push(sp.material);
      this.doorwaysGroup.add(sp);
    }
  }

  public update(
    physicsWorld: MarsPhysicsWorld | null,
    crewAgents: CrewAgentState[],
  ): void {
    if (this.flags.colliders && physicsWorld) {
      this.ensureCollidersBuilt(physicsWorld);
    }
    if (this.flags.moduleBounds) {
      this.ensureBoundsAndSeamsBuilt(physicsWorld);
    }
    if (this.flags.navGraph || this.flags.stationSlots) {
      this.ensureNavAndSlotsBuilt(crewAgents, physicsWorld);
    }
    if (this.flags.doorways) {
      this.ensureDoorwaysBuilt(physicsWorld);
    }

    if (this.flags.crewGizmos) {
      const hasPhys = (physicsWorld?.crewBodyIds.length ?? 0) > 0;
      crewAgents.forEach((ag, idx) => {
        const g = this.crewGizmos[idx];
        if (!g) return;
        g.group.position.set(ag.x, ag.y, ag.z);
        const label = `${ag.id.toUpperCase()} | ${ag.mode}${hasPhys ? '' : ' | NO-PHYS'}`;
        if (label !== g.lastLabel) {
          g.lastLabel = label;
          updateLabelSpriteCanvas(g.sprite, label, CREW_COLOR_MAP[ag.id]);
        }
      });
    }

    if (this.flags.navGraph) {
      const sel = crewAgents.find((a) => a.id === this.selectedCrewId) ?? crewAgents[0];
      if (sel) {
        const pts: THREE.Vector3[] = [new THREE.Vector3(sel.x, sel.y + 0.9, sel.z)];
        for (let k = sel.pathCursor; k < sel.path.length; k++) {
          const p = sel.path[k];
          const py = physicsWorld
            ? physicsWorld.getGroundSupportHeightAt(p.x, p.z)
            : groundHeightAt(p.x, p.z);
          pts.push(new THREE.Vector3(p.x, py + 0.9, p.z));
        }
        this.selectedPathGeo.setFromPoints(pts);
      }
    }
  }

  public dispose(): void {
    this.scene.remove(this.root);
    this.trackedGeos.forEach((g) => g.dispose());
    this.trackedMats.forEach((m) => m.dispose());
    this.trackedTexs.forEach((t) => t.dispose());
  }
}

export async function runLiveDiagnosticsSelfTest(opts: {
  outpost: OutpostRig;
  physicsWorld: MarsPhysicsWorld | null;
  crewAgents: CrewAgentState[];
  roverState: RoverControllerState;
  cameraMode: '3p' | '1p';
  layout?: OutpostLayoutConfig;
}): Promise<SelfTestReport> {
  return runOutpostSelfTest({
    environment: 'browser-live',
    outpost: opts.outpost,
    physicsWorld: opts.physicsWorld,
    crewAgents: opts.crewAgents,
    roverState: {
      x: opts.roverState.x,
      y: opts.roverState.y,
      z: opts.roverState.z,
      speedMs: opts.roverState.speedMs,
      tiltDeg: opts.roverState.tiltDeg,
    },
    pointerLockSupported: typeof document !== 'undefined' && 'pointerLockElement' in document,
    cameraMode: opts.cameraMode,
    layout: opts.layout ?? GAMEPLAY_LAYOUT,
  });
}
