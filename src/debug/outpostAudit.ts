import * as THREE from 'three';
import { OutpostLandmarkId } from '../data/missionData';
import { CREW_PROFILES, CrewMemberId, MARS_FACTS, PHYSICS_CONSTANTS } from '../sim/constants';
import {
  CrewAgentState,
  computeCrewNavPath,
  createInitialCrewAgents,
  getOutpostNavGraph,
  stepCrewAgents,
} from '../sim/crewAndRoverSim';
import {
  GAMEPLAY_GREENHOUSE_PROPS,
  OutpostLayoutConfig,
  SHOWCASE_LAYOUT,
  computeTravelTimeMatrix,
  getGreenhouseDoorwaySpec,
  getGreenhouseWallSegments,
} from '../sim/outpostLayout';
import { MarsPhysicsWorld, StaticColliderRecord } from '../sim/rapierWorld';
import { groundHeightAtGrid, seededRandom } from '../sim/terrainField';
import { OutpostRig } from '../three/outpostAssets';

export type AuditEvidenceClass = 'LIVE' | 'REAL-HEADLESS' | 'UNIT' | 'NOT VERIFIED';
export type AuditStatus = 'PASS' | 'FAIL' | 'PARTIAL';

export interface ModuleAuditEntry {
  id: string;
  worldPos: { x: number; y: number; z: number };
  aabbMin: { x: number; y: number; z: number };
  aabbMax: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  colliderIds: string[];
  colliderAabbMin: { x: number; y: number; z: number } | null;
  colliderAabbMax: { x: number; y: number; z: number } | null;
  maxBoundsDiffM: number | null;
}

export interface SeamAuditRecord {
  id: string;
  pair: string;
  gapM: number;
  status: 'OK' | 'GAP' | 'CLIPPING';
  anchorWorld: { x: number; y: number; z: number };
  note: string;
}

export interface SelfTestCheckResult {
  id: 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8';
  name: string;
  evidenceClass: AuditEvidenceClass;
  status: AuditStatus;
  summary: string;
  metrics: Record<string, number | string | boolean | null | Array<Record<string, unknown>>>;
}

export interface SelfTestReport {
  timestamp: string;
  environment: 'browser-live' | 'headless';
  layoutMode: 'showcase' | 'gameplay';
  overallPass: boolean;
  failures: string[];
  checks: Record<'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8', SelfTestCheckResult>;
  modules: ModuleAuditEntry[];
  seams: SeamAuditRecord[];
}

function getColliderIdsForModule(id: string, layout: OutpostLayoutConfig): string[] {
  switch (id) {
    case 'habitat':
      return ['hab-plinth', 'hab-shell', 'hab-roof-mid', 'hab-roof-top', 'hab-dish'];
    case 'hab-suit-vestibule':
      return ['hab-suit-vestibule'];
    case 'hab-airlock':
      return ['hab-airlock', 'hab-airlock-door', 'hab-airlock-steps'];
    case 'chapea':
      return ['chapea-plinth', 'chapea-body', 'chapea-cupola', 'chapea-scrubber-l', 'chapea-scrubber-r'];
    case 'conn-hab-chapea':
      return ['conn-hab-chapea'];
    case 'conn-hab-gh':
      return ['conn-hab-gh'];
    case 'conn-hab-gh-collars':
      return ['conn-hab-gh-collar-hab', 'conn-hab-gh-collar-gh'];
    case 'greenhouse': {
      const wallIds = getGreenhouseWallSegments(layout).map((s) => s.id);
      const propIds =
        layout.mode === 'gameplay'
          ? GAMEPLAY_GREENHOUSE_PROPS.map((p) => p.id)
          : ['greenhouse-center-tower'];
      return [
        'greenhouse-base',
        'greenhouse-door-step',
        ...wallIds,
        'greenhouse-door-lintel',
        'greenhouse-roof-lower',
        'greenhouse-roof-upper',
        'greenhouse-roof-cap',
        ...propIds,
        'greenhouse-water-tank',
      ];
    }
    case 'solar':
      return [
        ...layout.modules.solarPanels.flatMap((_, idx) => [
          `solar-ped-base-${idx}`,
          `solar-ped-pole-${idx}`,
          `solar-panel-${idx}`,
        ]),
        'battery-bank',
      ];
    case 'battery-bank':
      return ['battery-bank'];
    case 'windmills':
      return [
        ...layout.modules.windmills.flatMap((_, idx) => [
          `wind-pad-${idx}`,
          `wind-tower-${idx}`,
          `wind-nacelle-${idx}`,
          `wind-rotor-${idx}`,
        ]),
        'wind-vertical',
      ];
    case 'ice-drill':
      return ['ice-drill-deck', 'ice-drill-mast', 'ice-melt-tank'];
    case 'landing-pad':
      return ['landing-pad-apron', 'prop-tank-1', 'prop-tank-2', 'cargo-pod'];
    case 'rover-pad':
      return ['rover-pad-slab', 'rover-pad-pylon'];
    case 'power-console':
      return ['power-console-base', 'power-console-ped', 'power-console-head'];
    case 'tank2':
      return layout.modules.tank2.hasIsruUnit
        ? ['tank2-rack', 'tank2-cyl-l', 'tank2-cyl-r', 'tank2-isru-unit']
        : ['tank2-rack', 'tank2-cyl-l', 'tank2-cyl-r'];
    case 'recycler':
      return ['water-recycler'];
    case 'shelter':
      return ['rad-shelter'];
    case 'rover':
      return ['rover-chassis', 'rover-head'];
    default:
      return [];
  }
}

function isNonPhysicalVisualMesh(mesh: THREE.Mesh): boolean {
  if (!mesh.isMesh) return true;
  if (mesh.userData?.nonPhysicalMarker === true) return true;
  const mat = mesh.material as THREE.Material | undefined;
  return Boolean(mat && (mat as THREE.MeshBasicMaterial).isMeshBasicMaterial && mat.depthWrite === false);
}

const _tmpVert = new THREE.Vector3();
function computeSolidMeshBox3(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const childBox = new THREE.Box3();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (isNonPhysicalVisualMesh(mesh)) return;
    const posAttr = mesh.geometry.getAttribute('position');
    if (posAttr && posAttr.count > 0) {
      for (let i = 0; i < posAttr.count; i++) {
        _tmpVert.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrixWorld);
        box.expandByPoint(_tmpVert);
      }
      return;
    }
    mesh.geometry.computeBoundingBox();
    if (!mesh.geometry.boundingBox) return;
    childBox.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    box.union(childBox);
  });
  return box;
}

function expandBoxByColliderRecord(box: THREE.Box3, rec: StaticColliderRecord): void {
  const q = new THREE.Quaternion(
    rec.quaternion.x,
    rec.quaternion.y,
    rec.quaternion.z,
    rec.quaternion.w,
  );
  const center = new THREE.Vector3(rec.cx, rec.cy, rec.cz);
  const { x: hx, y: hy, z: hz } = rec.halfExtents;
  const corner = new THREE.Vector3();
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        corner.set(sx * hx, sy * hy, sz * hz).applyQuaternion(q).add(center);
        box.expandByPoint(corner);
      }
    }
  }
}

export function computeModuleAABBs(
  outpost: OutpostRig,
  physicsWorld: MarsPhysicsWorld | null,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): ModuleAuditEntry[] {
  const colliderRecords = physicsWorld ? physicsWorld.getStaticColliderRecords() : [];
  const entries: ModuleAuditEntry[] = [];

  for (const [id, obj] of Object.entries(outpost.moduleRoots)) {
    const meshBox = computeSolidMeshBox3(obj);
    const worldPos = new THREE.Vector3();
    obj.getWorldPosition(worldPos);
    const size = new THREE.Vector3();
    meshBox.getSize(size);

    const colliderIds = getColliderIdsForModule(id, layout);
    let colliderBox: THREE.Box3 | null = null;
    if (physicsWorld) {
      if (id === 'rover') {
        const roverRecs = physicsWorld.getRoverColliderRecords();
        if (roverRecs.length > 0) {
          colliderBox = new THREE.Box3();
          roverRecs.forEach((m) => expandBoxByColliderRecord(colliderBox!, m));
        }
      } else {
        const matched = colliderRecords.filter((r) => colliderIds.includes(r.id));
        if (matched.length > 0) {
          colliderBox = new THREE.Box3();
          matched.forEach((m) => expandBoxByColliderRecord(colliderBox!, m));
        }
      }
    }

    let maxBoundsDiffM: number | null = null;
    if (colliderBox && !meshBox.isEmpty()) {
      maxBoundsDiffM = Number(
        Math.max(
          Math.abs(meshBox.min.x - colliderBox.min.x),
          Math.abs(meshBox.min.y - colliderBox.min.y),
          Math.abs(meshBox.min.z - colliderBox.min.z),
          Math.abs(meshBox.max.x - colliderBox.max.x),
          Math.abs(meshBox.max.y - colliderBox.max.y),
          Math.abs(meshBox.max.z - colliderBox.max.z),
        ).toFixed(3),
      );
    }

    entries.push({
      id,
      worldPos: {
        x: Number(worldPos.x.toFixed(3)),
        y: Number(worldPos.y.toFixed(3)),
        z: Number(worldPos.z.toFixed(3)),
      },
      aabbMin: {
        x: Number(meshBox.min.x.toFixed(3)),
        y: Number(meshBox.min.y.toFixed(3)),
        z: Number(meshBox.min.z.toFixed(3)),
      },
      aabbMax: {
        x: Number(meshBox.max.x.toFixed(3)),
        y: Number(meshBox.max.y.toFixed(3)),
        z: Number(meshBox.max.z.toFixed(3)),
      },
      size: {
        x: Number(size.x.toFixed(3)),
        y: Number(size.y.toFixed(3)),
        z: Number(size.z.toFixed(3)),
      },
      colliderIds,
      colliderAabbMin: colliderBox
        ? {
            x: Number(colliderBox.min.x.toFixed(3)),
            y: Number(colliderBox.min.y.toFixed(3)),
            z: Number(colliderBox.min.z.toFixed(3)),
          }
        : null,
      colliderAabbMax: colliderBox
        ? {
            x: Number(colliderBox.max.x.toFixed(3)),
            y: Number(colliderBox.max.y.toFixed(3)),
            z: Number(colliderBox.max.z.toFixed(3)),
          }
        : null,
      maxBoundsDiffM,
    });
  }

  return entries;
}

export function measurePairwiseSeamGaps(
  outpost: OutpostRig,
  physicsWorld: MarsPhysicsWorld | null,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
): SeamAuditRecord[] {
  const seams: SeamAuditRecord[] = [];
  const raycaster = new THREE.Raycaster();
  const habObj = outpost.moduleRoots.habitat;
  const chapeaObj = outpost.moduleRoots.chapea;
  const ghObj = outpost.moduleRoots.greenhouse;
  const airlockObj = outpost.moduleRoots['hab-airlock'];
  const vestObj = outpost.moduleRoots['hab-suit-vestibule'];
  const rearConnObj = outpost.moduleRoots['conn-hab-chapea'];
  const ghConnObj = outpost.moduleRoots['conn-hab-gh'];
  const recyclerObj = outpost.moduleRoots.recycler;
  const lpObj = outpost.moduleRoots['landing-pad'];
  const roverPadObj = outpost.moduleRoots['rover-pad'];

  // 1. Habitat <-> CHAPEA Connector (crown height ray along -Z toward CHAPEA front wall)
  if (rearConnObj && chapeaObj) {
    rearConnObj.updateMatrixWorld(true);
    chapeaObj.updateMatrixWorld(true);
    const connBox = computeSolidMeshBox3(rearConnObj);
    const chapeaBox = computeSolidMeshBox3(chapeaObj);
    const cwPos = new THREE.Vector3();
    chapeaObj.getWorldPosition(cwPos);
    const chSpec = layout.modules.chapea;
    const rayY = cwPos.y + 1.54;
    const rayOriginZ = cwPos.z + chSpec.plinthHalfZ + 0.85;
    raycaster.set(new THREE.Vector3(cwPos.x, rayY, rayOriginZ), new THREE.Vector3(0, 0, -1));
    const chHits = raycaster.intersectObject(chapeaObj, true);
    const chFrontZ = chHits.length > 0 ? chHits[0].point.z : chapeaBox.max.z;
    const gapM = Number((connBox.min.z - chFrontZ).toFixed(3));
    seams.push({
      id: 'seam-conn-chapea',
      pair: 'conn-hab-chapea <-> chapea',
      gapM,
      status: gapM > 0.01 ? 'GAP' : 'OK',
      anchorWorld: { x: Number(cwPos.x.toFixed(2)), y: Number(rayY.toFixed(2)), z: Number(connBox.min.z.toFixed(2)) },
      note:
        gapM > 0.01
          ? `Upper corridor box ends at z=${connBox.min.z.toFixed(3)}, leaving ${(gapM * 100).toFixed(1)} cm gap before CHAPEA upper wall z=${chFrontZ.toFixed(3)}.`
          : `Corridor embeds cleanly ${Math.abs(gapM * 100).toFixed(1)} cm into CHAPEA wall.`,
    });
  }

  // 2. Habitat <-> Greenhouse Connector / Skybridge embedding into Greenhouse perimeter wall
  if (ghConnObj && ghObj) {
    ghObj.updateMatrixWorld(true);
    ghConnObj.updateMatrixWorld(true);
    const ghPos = new THREE.Vector3();
    ghObj.getWorldPosition(ghPos);
    const ghSpec = layout.modules.greenhouse;
    const ghConn = layout.modules.connHabGh;
    const endX = ghConn.endX;
    const endZ = ghConn.endZ;
    const horizDistToCenter = Math.hypot(endX - ghPos.x, endZ - ghPos.z);
    const outerWallR = ghSpec.wallMidRadius + ghSpec.wallThick * 0.5;
    const gapM = Number((horizDistToCenter - outerWallR).toFixed(3));
    seams.push({
      id: 'seam-conn-gh',
      pair: ghConn.elevatedOverpass ? 'skybridge <-> greenhouse' : 'conn-hab-gh <-> greenhouse',
      gapM,
      status: gapM > 0.01 ? 'GAP' : 'OK',
      anchorWorld: {
        x: Number(endX.toFixed(2)),
        y: Number((ghPos.y + ghConn.endYOffset).toFixed(2)),
        z: Number(endZ.toFixed(2)),
      },
      note:
        gapM > 0.01
          ? `Greenhouse corridor tip sits ${horizDistToCenter.toFixed(3)} m from center outside wall outer radius ${outerWallR.toFixed(3)} m.`
          : `Corridor embeds ${Math.abs(gapM * 100).toFixed(1)} cm into Greenhouse perimeter wall (radius ${outerWallR.toFixed(2)} m).`,
    });

    if (ghConn.elevatedOverpass) {
      const roadPassY = physicsWorld
        ? groundHeightAtGrid(physicsWorld.grid, 11.4, (ghConn.startZ + ghConn.endZ) * 0.5)
        : 0;
      const habBaseY = physicsWorld
        ? groundHeightAtGrid(physicsWorld.grid, layout.modules.habitat.x, layout.modules.habitat.z)
        : 0;
      const clearH = habBaseY + ghConn.undersideClearanceY - roadPassY;
      seams.push({
        id: 'skybridge-underpass-clearance',
        pair: 'skybridge <-> East Ring Road',
        gapM: Number(Math.max(0, 2.2 - clearH).toFixed(3)),
        status: clearH < 2.2 ? 'CLIPPING' : 'OK',
        anchorWorld: {
          x: 11.4,
          y: Number((roadPassY + clearH).toFixed(2)),
          z: Number(((ghConn.startZ + ghConn.endZ) * 0.5).toFixed(2)),
        },
        note: `Skybridge clear vertical clearance ${clearH.toFixed(2)} m over East Ring Road (>= 2.20 m required).`,
      });
    }
  }

  // 3. Habitat <-> Suit Vestibule / Airlock junction
  if (habObj && airlockObj) {
    const habPos = new THREE.Vector3();
    const airPos = new THREE.Vector3();
    habObj.getWorldPosition(habPos);
    airlockObj.getWorldPosition(airPos);
    if (layout.modules.airlockOffset.hasSuitVestibule && vestObj) {
      const vestBox = computeSolidMeshBox3(vestObj);
      const airBox = computeSolidMeshBox3(airlockObj);
      const habShellSouth = habPos.z + layout.modules.habitat.shellRadius;
      const gapHabVest = Number((vestBox.min.z - habShellSouth).toFixed(3));
      const gapVestAir = Number((airBox.min.z - vestBox.max.z).toFixed(3));
      const worstVestGap = Math.max(gapHabVest, gapVestAir);
      seams.push({
        id: 'seam-hab-airlock',
        pair: 'habitat <-> hab-suit-vestibule <-> hab-airlock',
        gapM: Math.max(0, worstVestGap),
        status: worstVestGap > 0.01 ? 'GAP' : 'OK',
        anchorWorld: {
          x: Number(airPos.x.toFixed(2)),
          y: Number((habPos.y + 1.2).toFixed(2)),
          z: Number(((habShellSouth + airBox.min.z) * 0.5).toFixed(2)),
        },
        note:
          worstVestGap > 0.01
            ? `Suit vestibule gap detected (hab->vest=${gapHabVest}m, vest->airlock=${gapVestAir}m).`
            : `Suit vestibule embeds cleanly into Habitat (${Math.abs(gapHabVest * 100).toFixed(1)} cm) and Airlock (${Math.abs(gapVestAir * 100).toFixed(1)} cm).`,
      });
    } else {
      const dist = Math.hypot(airPos.x - habPos.x, airPos.z - habPos.z);
      const clearance = Number((dist - layout.modules.habitat.shellRadius - 0.785).toFixed(3));
      seams.push({
        id: 'seam-hab-airlock',
        pair: 'habitat <-> hab-airlock',
        gapM: Math.max(0, clearance),
        status: clearance > 0.01 ? 'GAP' : 'OK',
        anchorWorld: {
          x: Number(airPos.x.toFixed(2)),
          y: Number((habPos.y + 1.2).toFixed(2)),
          z: Number(airPos.z.toFixed(2)),
        },
        note: `Airlock center is ${dist.toFixed(2)} m from Habitat axis (< 2.48 + 0.78 m continuous overlap).`,
      });
    }
  }

  // 4. Habitat / CHAPEA <-> Water Recycler clearance check
  if (habObj && chapeaObj && recyclerObj) {
    const habPos = new THREE.Vector3();
    const recPos = new THREE.Vector3();
    habObj.getWorldPosition(habPos);
    recyclerObj.getWorldPosition(recPos);
    const distHab = Math.hypot(recPos.x - habPos.x, recPos.z - habPos.z);
    const overlapHab = layout.modules.habitat.deckRadius + 0.78 - distHab;
    const chapeaBox = computeSolidMeshBox3(chapeaObj);
    const recBox = computeSolidMeshBox3(recyclerObj);
    const dxChapea = Math.max(0, Math.max(chapeaBox.min.x - recBox.max.x, recBox.min.x - chapeaBox.max.x));
    const dzChapea = Math.max(0, Math.max(chapeaBox.min.z - recBox.max.z, recBox.min.z - chapeaBox.max.z));
    const sepChapea = Math.hypot(dxChapea, dzChapea);
    const clipping = overlapHab > 0.02 || sepChapea === 0;
    seams.push({
      id: 'overlap-hab-recycler',
      pair: 'habitat/chapea <-> recycler',
      gapM: clipping
        ? Number((-Math.max(overlapHab, 0.1)).toFixed(3))
        : Number(Math.min(distHab - layout.modules.habitat.deckRadius - 0.78, sepChapea).toFixed(3)),
      status: clipping ? 'CLIPPING' : 'OK',
      anchorWorld: {
        x: Number(recPos.x.toFixed(2)),
        y: Number((recPos.y + 0.7).toFixed(2)),
        z: Number(recPos.z.toFixed(2)),
      },
      note: clipping
        ? `Water Recycler overlaps adjacent habitat/CHAPEA module.`
        : `Recycler sits cleanly ${(distHab - layout.modules.habitat.deckRadius - 0.78).toFixed(2)} m from Habitat & ${sepChapea.toFixed(2)} m from CHAPEA.`,
    });
  }

  // 5. Foundation skirt vs sloped terrain edge gaps (Landing Pad, CHAPEA, & Rover Pad)
  if (physicsWorld && lpObj) {
    const lpPos = new THREE.Vector3();
    lpObj.getWorldPosition(lpPos);
    const lpSpec = layout.modules.landingPad;
    const skirtBottomY = lpPos.y - 0.58;
    let worstDrop = 0;
    let worstPt = { x: lpPos.x, z: lpPos.z };
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const ox = lpPos.x + Math.cos(a) * (lpSpec.apronRadius + 0.04);
      const oz = lpPos.z + Math.sin(a) * (lpSpec.apronRadius + 0.04);
      const edgeTerrainY = groundHeightAtGrid(physicsWorld.grid, ox, oz);
      const drop = skirtBottomY - edgeTerrainY;
      if (drop > worstDrop) {
        worstDrop = drop;
        worstPt = { x: ox, z: oz };
      }
    }
    seams.push({
      id: 'seam-landing-pad-skirt',
      pair: 'landing-pad <-> terrain',
      gapM: Number(Math.max(0, worstDrop).toFixed(3)),
      status: worstDrop > 0.01 ? 'GAP' : 'OK',
      anchorWorld: {
        x: Number(worstPt.x.toFixed(2)),
        y: Number(skirtBottomY.toFixed(2)),
        z: Number(worstPt.z.toFixed(2)),
      },
      note:
        worstDrop > 0.01
          ? `Apron slab outer skirt hovers up to ${(worstDrop * 100).toFixed(1)} cm above sloped terrain.`
          : 'Landing pad apron foundation skirt buried cleanly below surrounding terrain.',
    });
  }

  if (physicsWorld && roverPadObj && layout.modules.roverPad.enabled) {
    const rpPos = new THREE.Vector3();
    roverPadObj.getWorldPosition(rpPos);
    const rp = layout.modules.roverPad;
    const skirtBottomY = rpPos.y + rp.topOffset - 0.44;
    let worstDrop = 0;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tx = rpPos.x + sx * rp.widthM * 0.5;
        const tz = rpPos.z + sz * rp.depthM * 0.5;
        const tY = groundHeightAtGrid(physicsWorld.grid, tx, tz);
        worstDrop = Math.max(worstDrop, skirtBottomY - tY);
      }
    }
    seams.push({
      id: 'seam-rover-pad-skirt',
      pair: 'rover-pad <-> terrain',
      gapM: Number(Math.max(0, worstDrop).toFixed(3)),
      status: worstDrop > 0.01 ? 'GAP' : 'OK',
      anchorWorld: { x: rpPos.x, y: Number(skirtBottomY.toFixed(2)), z: rpPos.z },
      note:
        worstDrop > 0.01
          ? `Rover pad corner hovers ${(worstDrop * 100).toFixed(1)} cm above terrain.`
          : 'Rover pad slab grounded all around.',
    });
  }

  if (physicsWorld && chapeaObj) {
    const cwPos = new THREE.Vector3();
    chapeaObj.getWorldPosition(cwPos);
    const skirtBottomY = cwPos.y - 0.35;
    let worstDrop = 0;
    const chSpec = layout.modules.chapea;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tx = cwPos.x + sx * chSpec.plinthHalfX;
        const tz = cwPos.z + sz * chSpec.plinthHalfZ;
        const tY = groundHeightAtGrid(physicsWorld.grid, tx, tz);
        worstDrop = Math.max(worstDrop, skirtBottomY - tY);
      }
    }
    seams.push({
      id: 'seam-chapea-skirt',
      pair: 'chapea-plinth <-> terrain',
      gapM: Number(Math.max(0, worstDrop).toFixed(3)),
      status: worstDrop > 0.01 ? 'GAP' : 'OK',
      anchorWorld: { x: cwPos.x, y: Number(skirtBottomY.toFixed(2)), z: cwPos.z },
      note:
        worstDrop > 0.01
          ? `CHAPEA plinth corner hovers ${(worstDrop * 100).toFixed(1)} cm above terrain.`
          : 'CHAPEA plinth foundation skirt grounded all around.',
    });
  }

  return seams;
}

export interface LiveSelfTestInput {
  environment: 'browser-live' | 'headless';
  outpost: OutpostRig;
  physicsWorld: MarsPhysicsWorld | null;
  crewAgents: CrewAgentState[];
  roverState: {
    x: number;
    y: number;
    z: number;
    speedMs: number;
    tiltDeg: number;
  };
  pointerLockSupported: boolean;
  cameraMode: '3p' | '1p';
  layout?: OutpostLayoutConfig;
}

export async function runOutpostSelfTest(input: LiveSelfTestInput): Promise<SelfTestReport> {
  const { outpost, physicsWorld } = input;
  const layout = input.layout ?? SHOWCASE_LAYOUT;
  const modules = computeModuleAABBs(outpost, physicsWorld, layout);
  const seams = measurePairwiseSeamGaps(outpost, physicsWorld, layout);

  // Save current crew physics coordinates so live browser diagnostics don't disturb running crew
  const savedCrewCoords = new Map<CrewMemberId, { x: number; z: number }>();
  if (physicsWorld) {
    for (const cid of physicsWorld.crewBodyIds) {
      const p = physicsWorld.getCrewPhysicsPosition(cid);
      if (p) savedCrewCoords.set(cid, { x: p.x, z: p.z });
    }
  }

  try {
    // C1 — Collider vs Visual parity + raycast sample (200 rays across key modules, excluding terrain heightfield)
    const diffs = modules
      .map((m) => m.maxBoundsDiffM)
      .filter((v): v is number => v !== null);
    const worstBoundsDiffM = diffs.length > 0 ? Math.max(...diffs) : 0;
    const uncollidedModules = modules.filter((m) => m.colliderIds.length === 0).length;

    let rayMismatchCount = 0;
    let worstRayDiffM = 0;
    let totalRaysCast = 0;
    if (physicsWorld) {
      const raycaster = new THREE.Raycaster();
      const rand = seededRandom(4242);
      const allModuleObjs = Object.values(outpost.moduleRoots);
      const auditIds =
        layout.mode === 'gameplay'
          ? ['greenhouse', 'habitat', 'chapea', 'hab-airlock', 'hab-suit-vestibule']
          : ['conn-hab-gh', 'greenhouse', 'habitat', 'chapea', 'hab-airlock'];
      for (const id of auditIds) {
        const mod = modules.find((m) => m.id === id);
        const obj = outpost.moduleRoots[id];
        if (!mod || !obj) continue;
        const cx = (mod.aabbMin.x + mod.aabbMax.x) * 0.5;
        const cy = (mod.aabbMin.y + mod.aabbMax.y) * 0.5;
        const cz = (mod.aabbMin.z + mod.aabbMax.z) * 0.5;
        const raysPerMod = 40; // 5 * 40 = 200 rays
        const radiusR = Math.max(mod.size.x, mod.size.z) * 0.5 + 1.8;
        const rayMax = Math.max(8.0, radiusR + 2.5);
        let castForMod = 0;
        let guard = 0;
        while (castForMod < raysPerMod && guard < 240) {
          guard++;
          const ang = rand() * Math.PI * 2;
          const ox = cx + Math.cos(ang) * radiusR;
          const oz = cz + Math.sin(ang) * radiusR;
          const groundAtO = physicsWorld.getGroundSupportHeightAt(ox, oz);
          const oy = Math.max(
            groundAtO + 0.5,
            mod.aabbMin.y + 0.35 + rand() * Math.max(0.4, mod.size.y - 0.5),
          );
          const dirV = new THREE.Vector3(cx - ox, cy - oy, cz - oz).normalize();
          const pCheck = physicsWorld.castRay(
            { x: ox, y: oy, z: oz },
            { x: dirV.x, y: dirV.y, z: dirV.z },
            rayMax,
            true,
            true,
            true,
          );
          // Skip sample positions that land inside an adjacent structure (toi === 0)
          if (pCheck && pCheck.toi < 0.05) continue;

          castForMod++;
          totalRaysCast++;
          raycaster.set(new THREE.Vector3(ox, oy, oz), dirV);
          raycaster.far = rayMax;
          const vHits = raycaster
            .intersectObjects(allModuleObjs, true)
            .filter((h) => !isNonPhysicalVisualMesh(h.object as THREE.Mesh));
          if (vHits.length > 0 && pCheck) {
            const d = Math.abs(vHits[0].distance - pCheck.toi);
            if (d > worstRayDiffM) worstRayDiffM = d;
            if (d > 0.05) rayMismatchCount++;
          } else if ((vHits.length > 0) !== Boolean(pCheck)) {
            rayMismatchCount++;
          }
        }
      }
    }
    const c1Pass =
      worstBoundsDiffM <= 0.05 &&
      worstRayDiffM <= 0.05 &&
      rayMismatchCount === 0 &&
      uncollidedModules === 0;

    // C2 — Seams, clearances & floor grid
    let floorHoleCount = 0;
    let floorSamples = 0;
    let maxGapM = 0;
    for (const s of seams) {
      if (s.status === 'GAP' && s.gapM > maxGapM) maxGapM = s.gapM;
    }
    if (physicsWorld) {
      const castDown = (x: number, z: number, startY: number) => {
        floorSamples++;
        const hit = physicsWorld.castRay(
          { x: x + 0.013, y: startY, z: z + 0.017 },
          { x: 0, y: -1, z: 0 },
          10.0,
          true,
        );
        if (!hit) floorHoleCount++;
      };
      if (layout.mode === 'gameplay') {
        for (let x = -32; x <= 32; x += 2.0) {
          for (let z = -28; z <= 28; z += 2.0) {
            castDown(x, z, 2.3);
          }
        }
        // Dense courtyard & greenhouse plaza floor checks
        for (let x = -4; x <= 4; x += 0.5) {
          for (let z = 6; z <= 13; z += 0.5) castDown(x, z, 2.2);
        }
        for (let x = 16; x <= 25; x += 0.5) {
          for (let z = -3; z <= 6; z += 0.5) castDown(x, z, 2.2);
        }
      } else {
        for (let x = -1.0; x <= 11.0; x += 0.5) {
          for (let z = -3.0; z <= 6.0; z += 0.5) castDown(x, z, 4.0);
        }
      }
    }

    // Dome interior walkable check: cast downward inside Greenhouse dome below roof canopy
    let domeInteriorBlocked = true;
    if (physicsWorld) {
      const gh = layout.modules.greenhouse;
      const ghY = groundHeightAtGrid(physicsWorld.grid, gh.x, gh.z);
      const domeCenterHit = physicsWorld.castRay(
        { x: gh.x, y: ghY + 1.8, z: gh.z },
        { x: 0, y: -1, z: 0 },
        3.0,
        true,
        false,
        true,
      );
      domeInteriorBlocked = !domeCenterHit || domeCenterHit.toi < 0.05;
    }
    const hasClipping = seams.some((s) => s.status === 'CLIPPING');
    const c2Pass = maxGapM <= 0.01 && floorHoleCount === 0 && !domeInteriorBlocked && !hasClipping;

    // C3 — Crew are real physics bodies
    const registeredCrewCount = physicsWorld ? physicsWorld.crewBodyIds.length : 0;
    const c3Pass = registeredCrewCount === CREW_PROFILES.length;

    // C4 — Doorways, Navigation Capsule Sweep & Travel-Time Budgets
    const ghDoor = getGreenhouseDoorwaySpec(layout);
    const ghDoorWidthM = ghDoor.clearWidthM;
    const minDoorWidthM = layout.mode === 'gameplay' ? 1.25 : 0.9;
    let pathCapsuleHits = 0;
    if (physicsWorld) {
      const { nodes, edges } = getOutpostNavGraph(layout);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const [aId, bId] of edges) {
        const a = nodeMap.get(aId);
        const b = nodeMap.get(bId);
        if (!a || !b) continue;
        const ya = physicsWorld.getGroundSupportHeightAt(a.x, a.z) + 1.06;
        const yb = physicsWorld.getGroundSupportHeightAt(b.x, b.z) + 1.06;
        const cast = physicsWorld.shapeCastCrewCapsule(
          { x: a.x, y: ya, z: a.z },
          { x: b.x, y: yb, z: b.z },
          PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
          PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M,
          undefined,
          true,
        );
        if (cast) pathCapsuleHits++;
      }
      // Also sweep each crew member's full patrol loop
      for (const prof of CREW_PROFILES) {
        const stations = layout.crewStations[prof.id];
        for (let i = 0; i < stations.length; i++) {
          const from = stations[i];
          const to = stations[(i + 1) % stations.length];
          const poly = [
            { x: from.x, z: from.z },
            ...computeCrewNavPath(from.x, from.z, to.x, to.z, layout),
          ];
          for (let k = 0; k < poly.length - 1; k++) {
            const p0 = poly[k];
            const p1 = poly[k + 1];
            const y0 = physicsWorld.getGroundSupportHeightAt(p0.x, p0.z) + 1.06;
            const y1 = physicsWorld.getGroundSupportHeightAt(p1.x, p1.z) + 1.06;
            const cast = physicsWorld.shapeCastCrewCapsule(
              { x: p0.x, y: y0, z: p0.z },
              { x: p1.x, y: y1, z: p1.z },
              PHYSICS_CONSTANTS.CAPSULE_RADIUS_M,
              PHYSICS_CONSTANTS.CAPSULE_HALF_HEIGHT_M,
              prof.id,
              true,
            );
            if (cast) pathCapsuleHits++;
          }
        }
      }
    }
    const travelAudit =
      layout.mode === 'gameplay' ? computeTravelTimeMatrix(layout) : null;
    const travelBudgetsPass = travelAudit ? travelAudit.allBudgetsPass : true;
    const c4Pass = ghDoorWidthM >= minDoorWidthM && pathCapsuleHits === 0 && travelBudgetsPass;

    // Helper to step crew simulation using the REAL Rapier crew character controllers
    const runRealPhysicsCrewStep = (
      crewList: CrewAgentState[],
      dt: number,
      members: Array<{
        id: CrewMemberId;
        name: string;
        role: string;
        health: number;
        stress: number;
        alive: boolean;
      }>,
      opts: { weatherAlertActive: boolean; tank2LeakActive: boolean; radiationAlert: boolean },
    ) =>
      stepCrewAgents(crewList, dt, {
        weatherAlertActive: opts.weatherAlertActive,
        tank2LeakActive: opts.tank2LeakActive,
        radiationAlert: opts.radiationAlert,
        habitatShelterPos: {
          x: outpost.stationInteractPoints.habitat.x,
          z: outpost.stationInteractPoints.habitat.z,
        },
        crewMembers: members,
        obstacles: [],
        grid: physicsWorld!.grid,
        layout,
        moveCrewViaPhysics: (id, dx, dz, dtStep) =>
          physicsWorld!.stepCrewMember(id, dx, dz, dtStep),
        afterPhysicsCrewStep: () => physicsWorld!.stepWorldOnly(),
      });

    // C5 — Wall Test (Command Crew + Player via real Rapier controllers)
    let playerWorstPenetrationM = 0;
    let crewWallBreaches = 0;
    if (physicsWorld) {
      let testCrew: CrewAgentState[] = createInitialCrewAgents(physicsWorld.grid, layout);
      for (const ag of testCrew) {
        physicsWorld.teleportCrewMember(ag.id, ag.x, ag.z);
      }
      const crewMembersMock = CREW_PROFILES.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        health: 95,
        stress: 20,
        alive: true,
      }));
      for (let s = 0; s < 160; s++) {
        testCrew = runRealPhysicsCrewStep(testCrew, 0.05, crewMembersMock, {
          weatherAlertActive: false,
          tank2LeakActive: false,
          radiationAlert: false,
        });
        for (const ag of testCrew) {
          if (physicsWorld.isPointInsideStructure(ag.x, ag.y, ag.z, 0.25)) {
            crewWallBreaches++;
          }
        }
      }
      const snap = physicsWorld.getSnapshot();
      if (physicsWorld.isPointInsideStructure(snap.x, snap.footY, snap.z)) {
        playerWorstPenetrationM = 0.2;
      }
    }
    const c5Pass = crewWallBreaches === 0 && playerWorstPenetrationM <= 0.02;

    // C6 — Spread-out & Not Stacked (10-minute headless run through real Rapier physics controllers)
    let spawnMinDistM = Number.POSITIVE_INFINITY;
    let minPairDistM = Number.POSITIVE_INFINITY;
    let overlapSeconds = 0;
    let distinctStationsPerCrewMin = 4;
    if (physicsWorld) {
      let simCrew = createInitialCrewAgents(physicsWorld.grid, layout);
      for (const ag of simCrew) {
        physicsWorld.teleportCrewMember(ag.id, ag.x, ag.z);
      }
      for (let i = 0; i < simCrew.length; i++) {
        for (let j = i + 1; j < simCrew.length; j++) {
          const d = Math.hypot(simCrew[i].x - simCrew[j].x, simCrew[i].z - simCrew[j].z);
          if (d < spawnMinDistM) spawnMinDistM = d;
        }
      }
      const members = CREW_PROFILES.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        health: 90,
        stress: 20,
        alive: true,
      }));
      const visited = new Map<CrewMemberId, Set<number>>();
      CREW_PROFILES.forEach((p) => visited.set(p.id, new Set([0])));
      for (let step = 0; step < 6000; step++) {
        const alert = step >= 1800 && step < 2700;
        simCrew = runRealPhysicsCrewStep(simCrew, 0.1, members, {
          weatherAlertActive: alert,
          tank2LeakActive: false,
          radiationAlert: false,
        });
        simCrew.forEach((ag) => {
          const st = ag.stations[ag.activeStationIndex];
          if (st && Math.hypot(ag.x - st.x, ag.z - st.z) < 0.75) {
            visited.get(ag.id)?.add(ag.activeStationIndex);
          }
        });
        for (let i = 0; i < simCrew.length; i++) {
          for (let j = i + 1; j < simCrew.length; j++) {
            const d = Math.hypot(simCrew[i].x - simCrew[j].x, simCrew[i].z - simCrew[j].z);
            if (d < minPairDistM) minPairDistM = d;
            if (d < 0.5) overlapSeconds += 0.1;
          }
        }
      }
      for (const set of visited.values()) {
        if (set.size < distinctStationsPerCrewMin) distinctStationsPerCrewMin = set.size;
      }
    }
    const c6Pass =
      spawnMinDistM >= 1.5 &&
      overlapSeconds <= 2.0 &&
      distinctStationsPerCrewMin >= 3;

    // C7 — Soak Test (Behavior & Bounds through real Rapier physics controllers)
    let soakMaxSpeedMs = 0;
    let soakPenetrations = 0;
    let soakOutOfBounds = 0;
    if (physicsWorld) {
      let soakCrew = createInitialCrewAgents(physicsWorld.grid, layout);
      for (const ag of soakCrew) {
        physicsWorld.teleportCrewMember(ag.id, ag.x, ag.z);
      }
      for (let step = 0; step < 3600; step++) {
        const members = CREW_PROFILES.map((p, idx) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          health: idx === 0 && step > 1200 ? 45 : 92,
          stress: idx === 1 && step > 2000 ? 75 : 22,
          alive: true,
        }));
        soakCrew = runRealPhysicsCrewStep(soakCrew, 0.1, members, {
          weatherAlertActive: step >= 600 && step < 900,
          tank2LeakActive: step >= 1000 && step < 1400,
          radiationAlert: step >= 2400 && step < 2600,
        });
        for (const ag of soakCrew) {
          if (ag.speedMs > soakMaxSpeedMs) soakMaxSpeedMs = ag.speedMs;
          if (physicsWorld.isPointInsideStructure(ag.x, ag.y, ag.z, 0.25)) {
            soakPenetrations++;
          }
          const radial = Math.hypot(
            ag.x - layout.walkableCenter.x,
            ag.z - layout.walkableCenter.z,
          );
          if (radial > layout.walkableRadiusM) soakOutOfBounds++;
        }
      }
    }
    const c7Pass =
      soakPenetrations === 0 &&
      soakOutOfBounds === 0 &&
      soakMaxSpeedMs <= PHYSICS_CONSTANTS.MARS_LOPE_SPEED_MS;

    // C8 — Live runtime telemetry check
    const pSnap = physicsWorld ? physicsWorld.getSnapshot() : null;

    const checks: SelfTestReport['checks'] = {
      C1: {
        id: 'C1',
        name: 'Collider / Visual Parity',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c1Pass ? 'PASS' : 'FAIL',
        summary: c1Pass
          ? `All ${modules.length} modules within 5 cm bounds & 0/${totalRaysCast} ray mismatches (worst ${(worstRayDiffM * 100).toFixed(1)} cm).`
          : `Worst bounds diff ${worstBoundsDiffM.toFixed(3)} m, ${rayMismatchCount}/${totalRaysCast} ray mismatches (worst ${worstRayDiffM.toFixed(3)} m), uncollided=${uncollidedModules}.`,
        metrics: {
          moduleCount: modules.length,
          worstBoundsDiffM: Number(worstBoundsDiffM.toFixed(3)),
          raysCast: totalRaysCast,
          rayMismatchCount,
          worstRayDiffM: Number(worstRayDiffM.toFixed(3)),
          uncollidedModules,
        },
      },
      C2: {
        id: 'C2',
        name: 'Seam, Gap & Floor Audit (F3)',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c2Pass ? 'PASS' : 'FAIL',
        summary: c2Pass
          ? `Max gap ${(maxGapM * 100).toFixed(1)} cm, 0 floor holes across ${floorSamples} casts, dome interior walkable.`
          : `Max gap ${(maxGapM * 100).toFixed(1)} cm (> 1 cm), holes=${floorHoleCount}, domeInteriorBlocked=${domeInteriorBlocked}, clipping=${hasClipping}.`,
        metrics: {
          maxGapM: Number(maxGapM.toFixed(3)),
          floorSamples,
          floorHoleCount,
          domeInteriorBlocked,
          clippingDetected: hasClipping,
        },
      },
      C3: {
        id: 'C3',
        name: 'Crew Real Physics Bodies (F4)',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c3Pass ? 'PASS' : 'FAIL',
        summary: c3Pass
          ? `4/4 crew registered as Rapier KinematicCharacterController capsules (0.35 m, 1.80 m, g=${MARS_FACTS.GRAVITY_MS2}).`
          : `${registeredCrewCount}/4 crew registered in Rapier world.`,
        metrics: {
          registeredCrewCount,
          expectedCrewCount: CREW_PROFILES.length,
          gravityMs2: MARS_FACTS.GRAVITY_MS2,
        },
      },
      C4: {
        id: 'C4',
        name: 'Doorways, Nav Sweep & Travel Budget (F1)',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c4Pass ? 'PASS' : 'FAIL',
        summary: c4Pass
          ? `Doorway clear width ${ghDoorWidthM.toFixed(2)} m >= ${minDoorWidthM.toFixed(2)} m, 0 capsule hits across all nav edges & station loops${travelAudit ? `, max ${travelAudit.maxFromAirlockM} m (tour ${travelAudit.fullTour.walkMin} min)` : ''}.`
          : `Greenhouse doorway width ${ghDoorWidthM.toFixed(2)} m; ${pathCapsuleHits} capsule hits; travelBudgetsPass=${travelBudgetsPass}.`,
        metrics: {
          greenhouseDoorWidthM: ghDoorWidthM,
          minDoorWidthM,
          pathCapsuleHits,
          travelBudgetsPass,
          ...(travelAudit
            ? {
                maxFromAirlockM: travelAudit.maxFromAirlockM,
                maxAdjacentHopM: travelAudit.maxAdjacentHopM,
                fullTourWalkMin: travelAudit.fullTour.walkMin,
              }
            : {}),
        },
      },
      C5: {
        id: 'C5',
        name: 'Wall & Dome Collision Test (F1)',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c5Pass ? 'PASS' : 'FAIL',
        summary: c5Pass
          ? `Zero crew or player wall breaches across Rapier-driven wall test.`
          : `Crew penetrated solid structure volumes ${crewWallBreaches} frames.`,
        metrics: {
          crewWallBreaches,
          playerWorstPenetrationM: Number(playerWorstPenetrationM.toFixed(3)),
        },
      },
      C6: {
        id: 'C6',
        name: 'Crew Spread & Anti-Stacking (F2)',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'REAL-HEADLESS',
        status: c6Pass ? 'PASS' : 'FAIL',
        summary: c6Pass
          ? `Spawn min ${spawnMinDistM.toFixed(2)} m, min pair dist ${minPairDistM.toFixed(2)} m, ${distinctStationsPerCrewMin}+ stations/crew, ${overlapSeconds.toFixed(1)}s overlap.`
          : `${distinctStationsPerCrewMin} stations/crew (< 3 required), min pair dist ${minPairDistM.toFixed(2)} m, <0.5m overlap=${overlapSeconds.toFixed(1)}s.`,
        metrics: {
          spawnMinDistM: Number(spawnMinDistM.toFixed(3)),
          minPairDistM: Number(minPairDistM.toFixed(3)),
          overlapSeconds: Number(overlapSeconds.toFixed(2)),
          distinctStationsPerCrewMin,
        },
      },
      C7: {
        id: 'C7',
        name: 'Soak Test (Behavior & Bounds)',
        evidenceClass: 'REAL-HEADLESS',
        status: c7Pass ? 'PASS' : 'FAIL',
        summary: c7Pass
          ? `Zero penetrations, 0 OOB, max speed ${soakMaxSpeedMs.toFixed(2)} m/s <= 2.65 m/s.`
          : `Penetrations=${soakPenetrations}, OOB=${soakOutOfBounds}, maxSpeed=${soakMaxSpeedMs.toFixed(2)} m/s.`,
        metrics: {
          soakPenetrations,
          soakOutOfBounds,
          soakMaxSpeedMs: Number(soakMaxSpeedMs.toFixed(3)),
        },
      },
      C8: {
        id: 'C8',
        name: 'Live Game Physics & Controls Telemetry',
        evidenceClass: input.environment === 'browser-live' ? 'LIVE' : 'NOT VERIFIED',
        status: input.environment === 'browser-live' ? 'PARTIAL' : 'FAIL',
        summary:
          input.environment === 'browser-live'
            ? `Physics step ${pSnap ? pSnap.physicsStepMs.toFixed(2) : 'n/a'} ms, grounded=${pSnap?.grounded ?? false}, camera=${input.cameraMode}. Interactive jump/Esc/rover bump checks ready.`
            : 'Requires live browser session.',
        metrics: {
          physicsStepMs: pSnap ? Number(pSnap.physicsStepMs.toFixed(3)) : null,
          playerSpeedMs: pSnap ? Number(pSnap.horizontalSpeedMs.toFixed(3)) : null,
          roverSpeedMs: Number(input.roverState.speedMs.toFixed(3)),
          roverTiltDeg: input.roverState.tiltDeg,
          pointerLockSupported: input.pointerLockSupported,
          cameraMode: input.cameraMode,
        },
      },
    };

    const failures = Object.values(checks)
      .filter((c) => c.status !== 'PASS')
      .map((c) => `${c.id}: ${c.summary}`);

    return {
      timestamp: new Date().toISOString(),
      environment: input.environment,
      layoutMode: layout.mode,
      overallPass: failures.length === 0,
      failures,
      checks,
      modules,
      seams,
    };
  } finally {
    // Restore original physics body coords cleanly
    if (physicsWorld) {
      for (const [cid, pos] of savedCrewCoords.entries()) {
        physicsWorld.teleportCrewMember(cid, pos.x, pos.z);
      }
    }
  }
}

export function getLandmarkAuditSummary(id: OutpostLandmarkId, modules: ModuleAuditEntry[]) {
  return modules.find((m) => m.id === id) ?? null;
}
