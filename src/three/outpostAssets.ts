import * as THREE from 'three';
import { OutpostLandmarkId } from '../data/missionData';
import { CREW_PROFILES, CrewMemberId, PHYSICS_CONSTANTS } from '../sim/constants';
import {
  GAMEPLAY_GREENHOUSE_PROPS,
  OutpostLayoutConfig,
  SHOWCASE_LAYOUT,
  computeCorridorTransform,
  getAirlockWorldPose,
  getGreenhouseDoorwaySpec,
  getGreenhouseWallSegments,
  getOutpostSupportHeightAt,
} from '../sim/outpostLayout';
import {
  TerrainHeightGrid,
  getDefaultTerrainGrid,
  groundHeightAt,
} from '../sim/terrainField';
import { MissionZoneId } from '../sim/missionsData';
import {
  createAstronautChestDisplayTexture,
  createContactShadowTexture,
  createCrewBadgeTexture,
  createDustSpriteTexture,
  createExplorerEmblemTexture,
  createHullPanelTextures,
  createLandingPadDecalTexture,
  createOutpostSignTexture,
  createRoadSurfaceTextures,
  createRoverNameplateTexture,
  createRoverWheelTextures,
  createSolarWaferTextures,
  createSuitFabricTextures,
  createThermalFoilTextures,
} from './proceduralTextures';

export interface CrewAvatarRig {
  id: CrewMemberId;
  group: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightAnkle: THREE.Group;
}

export interface OutpostRig {
  interactiveTargets: THREE.Object3D[];
  dishMast: THREE.Group;
  solarWings: THREE.Group[];
  solarDustMats: THREE.MeshStandardMaterial[];
  windmillRotors: THREE.Group[];
  windmillVerticalRotors: THREE.Group[];
  roverGroup: THREE.Group;
  roverHead: THREE.Group;
  roverLeftRockerPivot: THREE.Group;
  roverRightRockerPivot: THREE.Group;
  roverDiffBar: THREE.Mesh;
  roverWheelOffsets: THREE.Group[];
  roverWheels: THREE.Group[];
  roverEyeMat: THREE.MeshStandardMaterial;
  roverGuideBeam: THREE.Mesh;
  roverGuideBeamMat: THREE.MeshBasicMaterial;
  updateRoverNameplate: (name: string) => void;
  astroGroup: THREE.Group;
  astroPelvisGroup: THREE.Group;
  astroTorsoGroup: THREE.Group;
  astroHeadGroup: THREE.Group;
  astroRightArmPivot: THREE.Group;
  astroLeftArmPivot: THREE.Group;
  astroRightElbowPivot: THREE.Group;
  astroLeftElbowPivot: THREE.Group;
  astroLeftLegPivot: THREE.Group;
  astroRightLegPivot: THREE.Group;
  astroLeftKneePivot: THREE.Group;
  astroRightKneePivot: THREE.Group;
  astroLeftAnklePivot: THREE.Group;
  astroRightAnklePivot: THREE.Group;
  crewRigs: CrewAvatarRig[];
  fpScene: THREE.Scene;
  fpCamera: THREE.PerspectiveCamera;
  fpArmsGroup: THREE.Group;
  fpLeftArm: THREE.Group;
  fpRightArm: THREE.Group;
  powerConsoleGroup: THREE.Group;
  powerBeaconRing: THREE.Mesh;
  powerBeaconDiamond: THREE.Mesh;
  powerBeaconRingMat: THREE.MeshBasicMaterial;
  zoneBeaconGroup: THREE.Group;
  zoneBeaconRing: THREE.Mesh;
  zoneBeaconDiamond: THREE.Mesh;
  zoneBeaconMat: THREE.MeshStandardMaterial;
  dustDevilGroup: THREE.Group;
  dustDevilFunnel: THREE.Mesh;
  dustDevilPoints: THREE.Points;
  dustDevilParticleSeeds: Float32Array;
  habShelterGroup: THREE.Group;
  habShelterRing: THREE.Mesh;
  habShelterDiamond: THREE.Mesh;
  tank2ValveWheel: THREE.Mesh;
  tank2LeakPoints: THREE.Points;
  tank2LeakPositions: Float32Array;
  tank2LeakMat: THREE.PointsMaterial;
  recyclerStatusMat: THREE.MeshStandardMaterial;
  ghFrostMat: THREE.MeshPhysicalMaterial;
  matWarmWindow: THREE.MeshStandardMaterial;
  matConsoleScreen: THREE.MeshStandardMaterial;
  bollardLampMat: THREE.MeshStandardMaterial | null;
  habWindowGlow: THREE.PointLight | null;
  ghLight: THREE.PointLight;
  roverBasePos: { x: number; z: number };
  astroBasePos: { x: number; z: number; yaw: number };
  stationInteractPoints: Record<OutpostLandmarkId, THREE.Vector3>;
  landmarkCenters: Record<OutpostLandmarkId, THREE.Vector3>;
  zonePositions: Record<MissionZoneId, THREE.Vector3>;
  moduleRoots: Record<string, THREE.Object3D>;
  colonyBlinkingLights: THREE.Mesh[];
  distantRover: { group: THREE.Group; wheels: THREE.Group[] } | null;
  dispose: () => void;
}

/** Builds a beveled rounded-rect ExtrudeGeometry centered on X/Z */
function createBeveledPanelGeometry(
  w: number,
  h: number,
  depth: number,
  bevel = 0.04,
  cornerRatio = 0.035,
): THREE.ExtrudeGeometry {
  const hw = w * 0.5;
  const hh = h * 0.5;
  const r = Math.min(w, h) * cornerRatio;
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/** Builds a parabolic dish via LatheGeometry */
function createParabolicDishGeometry(radius: number, depth: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = t * radius;
    const y = t * t * depth;
    pts.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(pts, 24);
}

/** Builds a helical coil spring via TubeGeometry */
function createHelicalSpringGeometry(
  radius: number,
  height: number,
  turns: number,
  wireRadius: number,
): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const samples = turns * 12;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, t * height, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, samples, wireRadius, 6, false);
}

/** Builds an organic arched plant leaf for the hydroponic greenhouse */
function createLeafGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.06, 0.1, 0.02, 0.24);
  shape.lineTo(0, 0.28);
  shape.lineTo(-0.02, 0.24);
  shape.quadraticCurveTo(-0.06, 0.1, 0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: false,
  });
  geo.rotateX(-0.35);
  return geo;
}

export function buildOutpostAssets(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  quality: 'high' | 'low',
  isSoftwareGl: boolean,
  layout: OutpostLayoutConfig = SHOWCASE_LAYOUT,
  terrainGrid?: TerrainHeightGrid,
): OutpostRig {
  const m = layout.modules;
  const resolvedTerrainGrid = terrainGrid ?? getDefaultTerrainGrid(layout.mode);
  const gAt = (x: number, z: number) => groundHeightAt(x, z, resolvedTerrainGrid);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    textures.push(t);
    return t;
  };

  const castShadow = !isSoftwareGl;
  const maxAniso = isSoftwareGl ? 1 : Math.min(renderer.capabilities.getMaxAnisotropy(), 8);

  // Procedural PBR texture sets
  const hullTex = createHullPanelTextures(maxAniso, 3, 2);
  trackTex(hullTex.map);
  trackTex(hullTex.normalMap);
  trackTex(hullTex.roughnessMap);

  const solarTex = createSolarWaferTextures(maxAniso);
  trackTex(solarTex.map);
  trackTex(solarTex.normalMap);
  trackTex(solarTex.roughnessMap);

  const foilTex = createThermalFoilTextures(maxAniso);
  trackTex(foilTex.map);
  trackTex(foilTex.normalMap);
  trackTex(foilTex.roughnessMap);

  const suitTex = createSuitFabricTextures(maxAniso);
  trackTex(suitTex.map);
  trackTex(suitTex.normalMap);
  trackTex(suitTex.roughnessMap);

  const shadowTex = trackTex(createContactShadowTexture());
  const roverNameTex = trackTex(createRoverNameplateTexture(maxAniso));
  const chestDcmTex = trackTex(createAstronautChestDisplayTexture(maxAniso));
  const explorerEmblemTex = trackTex(createExplorerEmblemTexture(maxAniso));
  const wheelTex = createRoverWheelTextures(maxAniso);
  trackTex(wheelTex.treadMap);
  trackTex(wheelTex.treadBump);
  trackTex(wheelTex.spokeAlpha);

  // Calibrated PBR Materials
  const matHullPanel = trackMat(
    new THREE.MeshStandardMaterial({
      map: hullTex.map,
      normalMap: hullTex.normalMap,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: hullTex.roughnessMap,
      roughness: 0.52,
      metalness: 0.22,
    }),
  );
  const matDarkSteel = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#4a6788',
      roughness: 0.42,
      metalness: 0.48,
    }),
  );
  const matBrushedAlum = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#cad6e4',
      roughness: 0.24,
      metalness: 0.85,
    }),
  );
  const matMarsOrange = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f26419',
      roughness: 0.4,
      metalness: 0.14,
    }),
  );
  const matScienceTeal = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2ec4b6',
      roughness: 0.34,
      metalness: 0.22,
    }),
  );
  const matCyanGlow = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      emissive: '#0ea5e9',
      emissiveIntensity: 1.45,
      roughness: 0.2,
    }),
  );
  const matGreenGlow = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#86efac',
      emissive: '#22c55e',
      emissiveIntensity: 1.45,
      roughness: 0.2,
    }),
  );
  const matCoralBloom = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fb7185',
      emissive: '#be123c',
      emissiveIntensity: 0.18,
      roughness: 0.45,
    }),
  );
  const matYellowBloom = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#ca8a04',
      emissiveIntensity: 0.18,
      roughness: 0.45,
    }),
  );
  const matThermalFoil = trackMat(
    new THREE.MeshStandardMaterial({
      map: foilTex.map,
      normalMap: foilTex.normalMap,
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: foilTex.roughnessMap,
      roughness: 0.28,
      metalness: 0.9,
    }),
  );
  const matSuitFabric = trackMat(
    new THREE.MeshStandardMaterial({
      map: suitTex.map,
      normalMap: suitTex.normalMap,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: suitTex.roughnessMap,
      roughness: 0.72,
      metalness: 0.06,
    }),
  );
  const matGoldVisor = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#eab354',
      emissive: '#382108',
      emissiveIntensity: 0.14,
      metalness: 0.92,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.85,
    }),
  );
  const matSolarWafer = trackMat(
    new THREE.MeshPhysicalMaterial({
      map: solarTex.map,
      normalMap: solarTex.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: solarTex.roughnessMap,
      roughness: 0.22,
      metalness: 0.65,
      clearcoat: 0.92,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.55,
    }),
  );
  const matWarmWindow = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffe599',
      emissive: '#ffb703',
      emissiveIntensity: 1.45,
      roughness: 0.15,
      metalness: 0.1,
    }),
  );
  const matTireRubber = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1b2029',
      roughness: 0.88,
      metalness: 0.08,
    }),
  );
  const matOpticGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#10243d',
      roughness: 0.05,
      metalness: 0.35,
      clearcoat: 1.0,
    }),
  );
  const matGreenhouseGlass = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#dcf5ff',
      roughness: 0.07,
      metalness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  const matPlantLeaf = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#2dd468',
      roughness: 0.54,
      metalness: 0.04,
      emissive: '#15803d',
      emissiveIntensity: 0.26,
      side: THREE.DoubleSide,
    }),
  );
  const matCopperPipe = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#d9844e',
      roughness: 0.3,
      metalness: 0.8,
    }),
  );

  const addContactShadow = (parent: THREE.Object3D, rx: number, rz: number, opacity = 0.68) => {
    const plane = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(rx * 2, rz * 2)),
      trackMat(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: 2,
          polygonOffsetUnits: 2,
          opacity,
        }),
      ),
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.005;
    plane.renderOrder = 1;
    parent.add(plane);
  };

  const interactiveTargets: THREE.Object3D[] = [];
  const colonyBlinkingLights: THREE.Mesh[] = [];
  const registerInteractive = (group: THREE.Group, id: OutpostLandmarkId) => {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.landmarkId = id;
        interactiveTargets.push(child);
      }
    });
  };

  // ============================================================================
  // 1. MARS HABITAT (Modular Pressurized Outpost Base)
  // ============================================================================
  const habGroup = new THREE.Group();
  const habX = m.habitat.x;
  const habZ = m.habitat.z;
  const habY = gAt(habX, habZ);
  habGroup.position.set(habX, habY, habZ);
  habGroup.rotation.y = m.habitat.yaw;
  addContactShadow(habGroup, 3.8, 3.5, 0.72);

  // Heavy structural sub-frame & 6 hydraulic landing legs
  const deckTruss = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(m.habitat.deckRadius, m.habitat.deckRadius, 0.68, 32)),
    matDarkSteel,
  );
  deckTruss.position.y = 0.34;
  deckTruss.castShadow = castShadow;
  deckTruss.receiveShadow = true;
  habGroup.add(deckTruss);

  const legProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.32, 0.0),
    new THREE.Vector2(0.28, 0.09),
    new THREE.Vector2(0.16, 0.14),
    new THREE.Vector2(0.13, 0.58),
    new THREE.Vector2(0.18, 0.64),
    new THREE.Vector2(0.0, 0.64),
  ];
  const legGeo = trackGeo(new THREE.LatheGeometry(legProfile, 12));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const leg = new THREE.Mesh(legGeo, matBrushedAlum);
    leg.position.set(Math.cos(a) * 2.40, 0.0, Math.sin(a) * 2.40);
    leg.castShadow = castShadow;
    habGroup.add(leg);
  }

  // Modular main hull in crisp tiered cylindrical bands matching Rapier cylinder colliders
  const habHullProfile = [
    new THREE.Vector2(0.0, 0.66),
    new THREE.Vector2(2.48, 0.66),
    new THREE.Vector2(2.48, 2.45),
    new THREE.Vector2(1.92, 2.45),
    new THREE.Vector2(1.92, 2.90),
    new THREE.Vector2(1.22, 2.90),
    new THREE.Vector2(1.22, 3.26),
    new THREE.Vector2(0.0, 3.26),
  ];
  const habShell = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(habHullProfile, 128)), matHullPanel);
  habShell.castShadow = castShadow;
  habShell.receiveShadow = true;
  habGroup.add(habShell);

  // Orange thermal collar & gold foil thermal skirt around lower hull
  const foilSkirt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.5, 2.52, 0.24, 16)), matThermalFoil);
  foilSkirt.position.y = 0.78;
  habGroup.add(foilSkirt);

  const orangeBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(2.44, 2.48, 0.18, 16)), matMarsOrange);
  orangeBand.position.y = 2.32;
  habGroup.add(orangeBand);

  // 8 Curved structural exterior buttress ribs recessed flush within hab-shell radius
  const ribShape = new THREE.Shape();
  ribShape.moveTo(0, 0);
  ribShape.lineTo(0.24, 0);
  ribShape.lineTo(0.20, 1.45);
  ribShape.quadraticCurveTo(0.12, 1.85, -0.28, 2.15);
  ribShape.lineTo(-0.38, 2.04);
  ribShape.quadraticCurveTo(-0.02, 1.76, 0.02, 1.38);
  ribShape.closePath();
  const ribGeo = trackGeo(
    new THREE.ExtrudeGeometry(ribShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  );
  ribGeo.translate(0, 0, -0.07);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    // Leave front-left bay clear for airlock module
    if (Math.abs(Math.sin(a - 2.1)) < 0.28 && Math.cos(a - 2.1) > 0) continue;
    const rib = new THREE.Mesh(ribGeo, matDarkSteel);
    rib.position.set(Math.cos(a) * 2.22, 0.68, Math.sin(a) * 2.22);
    rib.rotation.y = -a;
    rib.castShadow = castShadow;
    habGroup.add(rib);
  }

  // Recessed Multi-Pane Cockpit/Lab Windows with hollow beveled frame + glowing interior light
  const winOuterShape = new THREE.Shape();
  winOuterShape.moveTo(-0.44, -0.26);
  winOuterShape.lineTo(0.44, -0.26);
  winOuterShape.lineTo(0.44, 0.26);
  winOuterShape.lineTo(-0.44, 0.26);
  winOuterShape.closePath();
  const winHole = new THREE.Path();
  winHole.moveTo(-0.34, -0.17);
  winHole.lineTo(0.34, -0.17);
  winHole.lineTo(0.34, 0.17);
  winHole.lineTo(-0.34, 0.17);
  winHole.closePath();
  winOuterShape.holes.push(winHole);

  const winFrameGeo = trackGeo(
    new THREE.ExtrudeGeometry(winOuterShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
  );
  winFrameGeo.center();

  const winGlassGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.34, 0.06));
  const winMullionGeo = trackGeo(new THREE.BoxGeometry(0.05, 0.34, 0.09));
  [-0.56, 0.0, 0.56].forEach((ang) => {
    const wx = Math.sin(ang) * 2.41;
    const wz = Math.cos(ang) * 2.41;
    const frame = new THREE.Mesh(winFrameGeo, matDarkSteel);
    frame.position.set(wx, 1.62, wz);
    frame.rotation.y = ang;
    habGroup.add(frame);

    const glass = new THREE.Mesh(winGlassGeo, matWarmWindow);
    glass.position.set(Math.sin(ang) * 2.38, 1.62, Math.cos(ang) * 2.38);
    glass.rotation.y = ang;
    habGroup.add(glass);

    const mullion = new THREE.Mesh(winMullionGeo, matDarkSteel);
    mullion.position.set(wx, 1.62, wz);
    mullion.rotation.y = ang;
    habGroup.add(mullion);
  });

  let habWindowGlow: THREE.PointLight | null = null;
  if (quality === 'high') {
    habWindowGlow = new THREE.PointLight('#ffb703', 2.4, 7.0, 2);
    habWindowGlow.position.set(0, 1.7, 3.2);
    habGroup.add(habWindowGlow);
  }

  // Detailed Forward Airlock Vestibule (+ optional Suit Vestibule link in Gameplay)
  let suitVestibuleGroup: THREE.Group | null = null;
  if (m.airlockOffset.hasSuitVestibule) {
    suitVestibuleGroup = new THREE.Group();
    suitVestibuleGroup.position.set(habX, habY, habZ + 3.85);
    const vestPlinth = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(1.76, 0.58, 3.04)),
      matDarkSteel,
    );
    vestPlinth.position.y = 0.29;
    vestPlinth.castShadow = castShadow;
    vestPlinth.receiveShadow = true;
    suitVestibuleGroup.add(vestPlinth);

    const vestBody = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(1.68, 1.72, 2.96, 0.05)),
      matHullPanel,
    );
    vestBody.position.y = 1.38;
    vestBody.castShadow = castShadow;
    vestBody.receiveShadow = true;
    suitVestibuleGroup.add(vestBody);

    [-0.95, 0, 0.95].forEach((rz) => {
      const rib = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 1.78, 0.09)), matDarkSteel);
      rib.position.set(0, 1.38, rz);
      suitVestibuleGroup!.add(rib);
    });
    const vestStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.14, 2.88)), matMarsOrange);
    vestStripe.position.y = 1.98;
    suitVestibuleGroup.add(vestStripe);
    registerInteractive(suitVestibuleGroup, 'habitat');
    scene.add(suitVestibuleGroup);
  }

  const airPose = getAirlockWorldPose(layout);
  const airlockGroup = new THREE.Group();
  airlockGroup.position.set(airPose.x, habY, airPose.z);
  airlockGroup.rotation.y = airPose.yawRad;

  const airlockBody = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.36, 1.48, 1.45, 0.06)),
    matHullPanel,
  );
  airlockBody.position.y = 1.38;
  airlockBody.castShadow = castShadow;
  airlockBody.receiveShadow = true;
  airlockGroup.add(airlockBody);

  // Solid airlock support plinth grounded deep into Martian terrain
  const airlockPlinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.36, 0.92, 1.48)), matDarkSteel);
  airlockPlinth.position.set(0, 0.22, 0.02);
  airlockPlinth.castShadow = castShadow;
  airlockPlinth.receiveShadow = true;
  airlockGroup.add(airlockPlinth);

  // Mechanical bulkhead door frame & wheel lock
  const doorFrame = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.92, 1.15, 0.14, 0.03)),
    matDarkSteel,
  );
  doorFrame.position.set(0, 1.32, 0.74);
  airlockGroup.add(doorFrame);

  const doorLeaf = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.72, 0.96, 0.08, 0.02)),
    matMarsOrange,
  );
  doorLeaf.position.set(0, 1.32, 0.79);
  airlockGroup.add(doorLeaf);

  const doorPorthole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14)), matWarmWindow);
  doorPorthole.rotation.x = Math.PI / 2;
  doorPorthole.position.set(0, 1.54, 0.82);
  airlockGroup.add(doorPorthole);

  const lockWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.1, 0.022, 8, 16)), matBrushedAlum);
  lockWheel.position.set(0.18, 1.24, 0.86);
  airlockGroup.add(lockWheel);

  // Grounded entry steps & compact step guardrails aligned to step bounds
  const stepFoundation = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.04, 0.44, 0.86)), matDarkSteel);
  stepFoundation.position.set(0, -0.02, 1.10);
  stepFoundation.receiveShadow = true;
  airlockGroup.add(stepFoundation);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.14, 0.28)), matBrushedAlum);
    step.position.set(0, 0.12 + s * 0.14, 1.34 - s * 0.24);
    step.castShadow = castShadow;
    airlockGroup.add(step);
  }
  [-0.48, 0.48].forEach((hx) => {
    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(hx, 0.06, 1.44),
      new THREE.Vector3(hx, 0.24, 1.44),
      new THREE.Vector3(hx, 0.56, 0.84),
    ]);
    const rail = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(railCurve, 10, 0.022, 6, false)), matBrushedAlum);
    airlockGroup.add(rail);
  });
  registerInteractive(airlockGroup, 'habitat');
  scene.add(airlockGroup);

  // Exterior HVAC Ventilation & Coolant Pipes recessed flush on right flank
  const hvacBox = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.60, 0.55, 0.40, 0.04)), matDarkSteel);
  hvacBox.position.set(1.98, 1.42, -0.45);
  hvacBox.rotation.y = 0.2;
  hvacBox.castShadow = castShadow;
  habGroup.add(hvacBox);

  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.98, 1.7, -0.45),
    new THREE.Vector3(2.12, 2.35, -0.45),
    new THREE.Vector3(1.85, 2.85, -0.4),
  ]);
  const habPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(pipeCurve, 12, 0.06, 8, false)), matCopperPipe);
  habGroup.add(habPipe);

  // Rooftop High-Gain Parabolic Communications Dish + Compact Whip (within hab-dish collider band)
  const dishMast = new THREE.Group();
  dishMast.position.set(0.35, 3.2, -0.2);

  const turretBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.36, 0.25, 10)), matDarkSteel);
  turretBase.position.y = 0.12;
  dishMast.add(turretBase);

  const mastCol = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.07, 0.1, 0.62, 10)), matBrushedAlum);
  mastCol.position.y = 0.48;
  mastCol.castShadow = castShadow;
  dishMast.add(mastCol);

  const dishHolder = new THREE.Group();
  dishHolder.position.set(0, 0.78, 0.04);
  dishHolder.rotation.x = 0.65;

  const parabolicDish = new THREE.Mesh(
    trackGeo(createParabolicDishGeometry(0.62, 0.22)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f2f5f9',
        roughness: 0.3,
        metalness: 0.35,
        side: THREE.DoubleSide,
      }),
    ),
  );
  dishHolder.add(parabolicDish);

  const feedHorn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.07, 0.36, 8)), matMarsOrange);
  feedHorn.position.y = 0.24;
  dishHolder.add(feedHorn);
  dishMast.add(dishHolder);
  habGroup.add(dishMast);

  // Secondary telemetry whip antenna kept compact inside upper turret cylinder
  const whip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.014, 0.028, 0.95, 6)), matBrushedAlum);
  whip.position.set(-0.62, 3.68, -0.35);
  habGroup.add(whip);
  const beaconTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 8, 8)), trackMat(matCyanGlow.clone()));
  beaconTip.position.set(-0.62, 4.18, -0.35);
  beaconTip.userData.nonPhysicalMarker = true;
  habGroup.add(beaconTip);
  colonyBlinkingLights.push(beaconTip);

  // Futuristic teal telemetry band near upper turret collar
  const habTealCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.24, 1.24, 0.08, 20)), matScienceTeal);
  habTealCollar.position.y = 3.16;
  habTealCollar.userData.nonPhysicalMarker = true;
  habGroup.add(habTealCollar);

  // Exterior airlock floodlights, glowing teal entry beacon, safety chevron trim & radiator louvers on Habitat 01
  const floodLamp = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.36, 0.12, 0.09, 0.015)), matWarmWindow);
  floodLamp.position.set(0, 2.08, 0.8);
  airlockGroup.add(floodLamp);

  const airlockStatusBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 8)), trackMat(matGreenGlow.clone()));
  airlockStatusBeacon.position.set(0.48, 2.02, 0.78);
  airlockStatusBeacon.userData.nonPhysicalMarker = true;
  airlockGroup.add(airlockStatusBeacon);
  colonyBlinkingLights.push(airlockStatusBeacon);

  const louverBarGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.045, 0.14));
  for (let l = 0; l < 4; l++) {
    const louver = new THREE.Mesh(louverBarGeo, matBrushedAlum);
    louver.position.set(-0.85, 3.12 + l * 0.08, 0.55);
    louver.rotation.x = 0.25;
    habGroup.add(louver);
  }

  // CHAPEA-Inspired 3D-Printed Regolith-Shielded Rear Crew & Science Wing (4.4, -8.0)
  const matRegolithPrint = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#a8674b',
      roughness: 0.9,
      metalness: 0.06,
    }),
  );
  const chapeaWing = new THREE.Group();
  const cwX = m.chapea.x;
  const cwZ = m.chapea.z;
  const cwY = gAt(cwX, cwZ);
  chapeaWing.position.set(cwX, cwY, cwZ);
  chapeaWing.rotation.y = m.chapea.yaw;
  addContactShadow(chapeaWing, 3.6, 3.0, 0.65);

  const chapeaPlinth = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(4.6, 0.64, 3.4, 0.05)), matDarkSteel);
  chapeaPlinth.position.y = 0.02;
  chapeaPlinth.castShadow = castShadow;
  chapeaPlinth.receiveShadow = true;
  chapeaWing.add(chapeaPlinth);

  for (let layer = 0; layer < 5; layer++) {
    const w = 4.24 - (layer % 2) * 0.02;
    const d = 3.04 - (layer % 2) * 0.02;
    const ring = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(w, 0.34, d, 0.03)),
      layer % 2 === 0 ? matRegolithPrint : matHullPanel,
    );
    ring.position.y = 0.52 + layer * 0.34;
    ring.castShadow = castShadow;
    ring.receiveShadow = true;
    chapeaWing.add(ring);
  }

  const cupola = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.95, 1.15, 0.68, 14)), matDarkSteel);
  cupola.position.set(0, 2.35, 0.15);
  cupola.castShadow = castShadow;
  chapeaWing.add(cupola);

  const cupolaGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.88, 0.88, 0.28, 14)), matWarmWindow);
  cupolaGlass.position.set(0, 2.42, 0.15);
  chapeaWing.add(cupolaGlass);

  const cupolaCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.55, 1.0, 0.24, 14)), matHullPanel);
  cupolaCap.position.set(0, 2.78, 0.15);
  chapeaWing.add(cupolaCap);

  const chapeaLabBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 8, 8)), trackMat(matCyanGlow.clone()));
  chapeaLabBeacon.position.set(0, 2.94, 0.15);
  chapeaLabBeacon.userData.nonPhysicalMarker = true;
  chapeaWing.add(chapeaLabBeacon);
  colonyBlinkingLights.push(chapeaLabBeacon);

  const chapeaLabBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.28, 0.09, 3.08)), matScienceTeal);
  chapeaLabBand.position.set(0, 1.98, 0);
  chapeaLabBand.userData.nonPhysicalMarker = true;
  chapeaWing.add(chapeaLabBand);

  [-1.35, 1.35].forEach((sx) => {
    const scrubber = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 1.55, 12)), matBrushedAlum);
    scrubber.position.set(sx, 1.05, 1.62);
    scrubber.castShadow = castShadow;
    chapeaWing.add(scrubber);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 12)), matMarsOrange);
    collar.position.set(sx, 1.55, 1.62);
    chapeaWing.add(collar);
  });

  [-0.2, 0.2].forEach((lz) => {
    const rail = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 6)), matBrushedAlum);
    rail.position.set(2.15, 1.25, lz);
    chapeaWing.add(rail);
  });
  for (let r = 0; r < 6; r++) {
    const rung = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.42, 6)), matBrushedAlum);
    rung.rotation.x = Math.PI / 2;
    rung.position.set(2.15, 0.45 + r * 0.34, 0);
    chapeaWing.add(rung);
  }

  // Pressurized connector corridor linking Habitat 01 cleanly into CHAPEA wall
  const chConn = m.connHabChapea;
  const rearCorr = computeCorridorTransform(
    habX,
    habY + chConn.centerYOffset,
    habZ + chConn.habStartOffsetZ,
    cwX,
    cwY + chConn.centerYOffset,
    cwZ + chConn.chapeaEndOffsetZ,
  );
  const rearConnMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(chConn.halfWidth * 2, chConn.halfHeight * 2, rearCorr.length)),
    matHullPanel,
  );
  rearConnMesh.position.set(rearCorr.cx, rearCorr.cy, rearCorr.cz);
  rearConnMesh.quaternion.set(
    rearCorr.quaternion.x,
    rearCorr.quaternion.y,
    rearCorr.quaternion.z,
    rearCorr.quaternion.w,
  );
  rearConnMesh.castShadow = castShadow;
  rearConnMesh.receiveShadow = true;
  for (let r = -1; r <= 1; r++) {
    const rib = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(chConn.halfWidth * 2.06, chConn.halfHeight * 2.06, 0.08)),
      matDarkSteel,
    );
    rib.position.set(0, 0, r * (rearCorr.length * 0.26));
    rearConnMesh.add(rib);
  }
  scene.add(rearConnMesh);

  registerInteractive(chapeaWing, 'habitat');
  scene.add(chapeaWing);

  registerInteractive(habGroup, 'habitat');
  scene.add(habGroup);

  // ============================================================================
  // 2. BIO-DOME GREENHOUSE (Hollow Segmented Perimeter, Open Doorway, Walkable Floor)
  // ============================================================================
  const ghGroup = new THREE.Group();
  const ghSpec = m.greenhouse;
  const ghX = ghSpec.x;
  const ghZ = ghSpec.z;
  const ghY = gAt(ghX, ghZ);
  ghGroup.position.set(ghX, ghY, ghZ);
  const ghRScale = ghSpec.floorRadius / 2.25;
  addContactShadow(ghGroup, ghSpec.floorRadius * 1.15, ghSpec.floorRadius * 1.15, 0.68);

  const ghFoundation = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(ghSpec.floorRadius, ghSpec.floorRadius, 0.62, 32)),
    matDarkSteel,
  );
  ghFoundation.position.y = -0.09;
  ghFoundation.castShadow = castShadow;
  ghFoundation.receiveShadow = true;
  ghGroup.add(ghFoundation);

  const ghDoor = getGreenhouseDoorwaySpec(layout);
  const doorLocalX = ghDoor.centerX - ghX;
  const doorLocalZ = ghDoor.centerZ - ghZ;
  const doorStepMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.18, 0.3, 0.56)),
    matBrushedAlum,
  );
  doorStepMesh.position.set(
    doorLocalX + Math.cos(ghSpec.doorAngleRad) * 0.22,
    -0.03,
    doorLocalZ + Math.sin(ghSpec.doorAngleRad) * 0.22,
  );
  doorStepMesh.rotation.y = ghDoor.yawRad;
  doorStepMesh.receiveShadow = true;
  ghGroup.add(doorStepMesh);

  const ghWalls = getGreenhouseWallSegments(layout);
  ghWalls.forEach((seg) => {
    const bayGroup = new THREE.Group();
    bayGroup.position.set(seg.cx - ghX, ghSpec.floorTopOffset + seg.halfHeight, seg.cz - ghZ);
    bayGroup.rotation.y = seg.yawRad;

    const glassWall = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(seg.halfWidth * 2, seg.halfHeight * 2, seg.halfThick * 2)),
      matGreenhouseGlass,
    );
    glassWall.renderOrder = 3;
    bayGroup.add(glassWall);

    const sill = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(seg.halfWidth * 1.98, 0.16, seg.halfThick * 1.98)),
      matBrushedAlum,
    );
    sill.position.y = -seg.halfHeight + 0.08;
    sill.castShadow = castShadow;
    bayGroup.add(sill);

    const topFrame = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(seg.halfWidth * 1.98, 0.12, seg.halfThick * 1.98)),
      matDarkSteel,
    );
    topFrame.position.y = seg.halfHeight - 0.06;
    bayGroup.add(topFrame);

    ghGroup.add(bayGroup);
  });

  const doorLintel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.56, 0.22, 0.22)),
    matMarsOrange,
  );
  doorLintel.position.set(doorLocalX, ghSpec.floorTopOffset + ghSpec.wallHeight + 0.11, doorLocalZ);
  doorLintel.rotation.y = ghDoor.yawRad;
  ghGroup.add(doorLintel);

  const roofBaseY = ghSpec.floorTopOffset + ghSpec.wallHeight;
  const roofLower = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.14 * ghRScale, 2.14 * ghRScale, 0.34, 28)),
    matGreenhouseGlass,
  );
  roofLower.position.y = roofBaseY + 0.19;
  roofLower.renderOrder = 3;
  ghGroup.add(roofLower);

  const roofRimMid = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.15 * ghRScale, 2.15 * ghRScale, 0.08, 28)),
    matBrushedAlum,
  );
  roofRimMid.position.y = roofBaseY + 0.02;
  ghGroup.add(roofRimMid);

  const roofUpper = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(1.45 * ghRScale, 1.62 * ghRScale, 0.56, 24)),
    matGreenhouseGlass,
  );
  roofUpper.position.y = roofBaseY + 0.64;
  roofUpper.renderOrder = 3;
  ghGroup.add(roofUpper);

  const ghFrostMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#bfe8ff',
      emissive: '#7dd3fc',
      emissiveIntensity: 0.18,
      roughness: 0.72,
      metalness: 0.05,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    }),
  );
  const ghFrostDome = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(2.16 * ghRScale, 2.16 * ghRScale, 0.88, 28)),
    ghFrostMat,
  );
  ghFrostDome.position.y = roofBaseY + 0.46;
  ghFrostDome.renderOrder = 4;
  ghFrostDome.userData.nonPhysicalMarker = true;
  ghGroup.add(ghFrostDome);

  const bedMat = trackMat(new THREE.MeshStandardMaterial({ color: '#2b3b4e', roughness: 0.55, metalness: 0.4 }));
  const leafGeo = trackGeo(createLeafGeometry());

  if (layout.mode === 'gameplay') {
    const floorOffset = ghSpec.floorTopOffset;
    const matWoodBark = trackMat(new THREE.MeshStandardMaterial({ color: '#6b4226', roughness: 0.88 }));
    const matCanopyDeep = trackMat(new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.65, emissive: '#052e16', emissiveIntensity: 0.25 }));
    const matPurpleLed = trackMat(new THREE.MeshStandardMaterial({ color: '#c084fc', emissive: '#a855f7', emissiveIntensity: 2.0, roughness: 0.2 }));
    const matCitrus = trackMat(new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.35 }));
    const matTomato = trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.32 }));

    for (const prop of GAMEPLAY_GREENHOUSE_PROPS) {
      const pGroup = new THREE.Group();
      pGroup.position.set(prop.dx, floorOffset, prop.dz);
      pGroup.rotation.y = prop.yawRad;

      if (prop.kind === 'orchard-tree') {
        const isCitrus = prop.id.includes('citrus');
        const tub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.5, 0.44, 0.48, 14)), bedMat);
        tub.position.y = 0.24;
        tub.castShadow = castShadow;
        pGroup.add(tub);
        const tubCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.52, 0.52, 0.06, 14)), matBrushedAlum);
        tubCollar.position.y = 0.46;
        pGroup.add(tubCollar);
        const trunk = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.11, 0.95, 8)), matWoodBark);
        trunk.position.y = 0.92;
        trunk.castShadow = castShadow;
        pGroup.add(trunk);
        const canopyOffsets: [number, number, number, number][] = [
          [0, 1.58, 0, 0.46],
          [0.24, 1.42, 0.14, 0.32],
          [-0.22, 1.44, -0.15, 0.3],
          [0.05, 1.78, -0.1, 0.28],
        ];
        canopyOffsets.forEach(([cx, cy, cz, cr], idx) => {
          const foliage = new THREE.Mesh(
            trackGeo(new THREE.DodecahedronGeometry(cr, 1)),
            idx % 2 === 0 ? matCanopyDeep : matPlantLeaf,
          );
          foliage.position.set(cx, cy, cz);
          foliage.castShadow = castShadow;
          pGroup.add(foliage);
        });
        const fruitMat = isCitrus ? matCitrus : matTomato;
        [
          [0.28, 1.38, 0.26],
          [-0.24, 1.52, 0.22],
          [0.12, 1.65, -0.25],
          [-0.18, 1.34, -0.24],
        ].forEach(([fx, fy, fz]) => {
          const fruit = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 6)), fruitMat);
          fruit.position.set(fx, fy, fz);
          pGroup.add(fruit);
        });
      } else if (prop.kind === 'led-rack') {
        [-0.78, 0.78].forEach((px) => {
          [-0.28, 0.28].forEach((pz) => {
            const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 1.84, 6)), matBrushedAlum);
            post.position.set(px, 0.92, pz);
            pGroup.add(post);
          });
        });
        [0.42, 0.98, 1.54].forEach((sy) => {
          const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.72, 0.08, 0.68)), bedMat);
          tray.position.y = sy;
          tray.castShadow = castShadow;
          pGroup.add(tray);
          const led = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.56, 0.035, 0.14)), matPurpleLed);
          led.position.y = sy + 0.38;
          pGroup.add(led);
          for (let lx = -0.62; lx <= 0.62; lx += 0.31) {
            const leaf = new THREE.Mesh(leafGeo, matPlantLeaf);
            leaf.position.set(lx, sy + 0.05, 0);
            leaf.scale.setScalar(0.95);
            pGroup.add(leaf);
          }
        });
      } else if (prop.kind === 'planter') {
        const trough = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.4, 0.44, 0.68, 0.03)), bedMat);
        trough.position.y = 0.24;
        trough.castShadow = castShadow;
        pGroup.add(trough);
        [-0.42, 0, 0.42].forEach((tx, idx) => {
          const stake = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.75, 6)), matBrushedAlum);
          stake.position.set(tx, 0.78, 0);
          pGroup.add(stake);
          const bush = new THREE.Mesh(trackGeo(new THREE.DodecahedronGeometry(0.24, 1)), matPlantLeaf);
          bush.position.set(tx, 0.62 + (idx % 2) * 0.08, 0);
          pGroup.add(bush);
          const veg = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 8, 6)), matTomato);
          veg.position.set(tx + 0.12, 0.68, 0.14);
          pGroup.add(veg);
          const bloom = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.042, 7, 5)),
            idx % 2 === 0 ? matYellowBloom : matCoralBloom,
          );
          bloom.position.set(tx - 0.1, 0.78, -0.09);
          bloom.userData.nonPhysicalMarker = true;
          pGroup.add(bloom);
        });
      } else if (prop.kind === 'mist-tower') {
        const baseTank = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.4, 0.42, 0.42, 14)), bedMat);
        baseTank.position.y = 0.21;
        pGroup.add(baseTank);
        const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.24, 1.5, 12)), matBrushedAlum);
        col.position.y = 1.15;
        col.castShadow = castShadow;
        pGroup.add(col);
        for (let r = 0; r < 5; r++) {
          const ang = r * 1.25;
          const pod = new THREE.Mesh(leafGeo, matPlantLeaf);
          pod.position.set(Math.cos(ang) * 0.24, 0.58 + r * 0.25, Math.sin(ang) * 0.24);
          pod.rotation.y = -ang;
          pod.scale.setScalar(0.95);
          pGroup.add(pod);
          const blossom = new THREE.Mesh(
            trackGeo(new THREE.SphereGeometry(0.038, 6, 5)),
            r % 2 === 0 ? matCoralBloom : matYellowBloom,
          );
          blossom.position.set(Math.cos(ang) * 0.3, 0.72 + r * 0.25, Math.sin(ang) * 0.3);
          blossom.userData.nonPhysicalMarker = true;
          pGroup.add(blossom);
        }
      } else if (prop.kind === 'workbench') {
        const table = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.18, 0.08, 0.66, 0.02)), matBrushedAlum);
        table.position.y = 0.86;
        table.castShadow = castShadow;
        pGroup.add(table);
        const legBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.82, 0.56)), bedMat);
        legBlock.position.y = 0.41;
        pGroup.add(legBlock);
        const tablet = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.03, 0.22)), matWarmWindow);
        tablet.position.set(-0.22, 0.92, 0.08);
        pGroup.add(tablet);
      }

      ghGroup.add(pGroup);
    }
  } else {
    const planterAngles = [-0.55, 0.35, 3.35, 4.35];
    planterAngles.forEach((a, pIdx) => {
      const rack = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.68, 0.22, 0.34, 0.02)), bedMat);
      rack.position.set(Math.cos(a) * 1.48, 0.33, Math.sin(a) * 1.48);
      rack.rotation.y = -a + Math.PI / 2;
      ghGroup.add(rack);

      [-0.18, 0, 0.18].forEach((offset, oIdx) => {
        const px = Math.cos(a) * 1.48 - Math.sin(a) * offset;
        const pz = Math.sin(a) * 1.48 + Math.cos(a) * offset;
        for (let l = 0; l < 4; l++) {
          const leaf = new THREE.Mesh(leafGeo, matPlantLeaf);
          leaf.position.set(px, 0.46, pz);
          leaf.rotation.y = (l / 4) * Math.PI * 2 + a;
          leaf.scale.setScalar(0.82 + (l % 2) * 0.22);
          ghGroup.add(leaf);
        }
        const flower = new THREE.Mesh(
          trackGeo(new THREE.SphereGeometry(0.044, 6, 5)),
          (pIdx + oIdx) % 2 === 0 ? matCoralBloom : matYellowBloom,
        );
        flower.position.set(px, 0.62, pz);
        flower.userData.nonPhysicalMarker = true;
        ghGroup.add(flower);
      });
    });

    const centerTower = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.28, 1.38, 12)), matBrushedAlum);
    centerTower.position.set(0.88, 0.91, -0.78);
    ghGroup.add(centerTower);
  }

  const growRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.68 * ghRScale, 0.045, 8, 28)), matWarmWindow);
  growRing.rotation.x = Math.PI / 2;
  growRing.position.set(0, roofBaseY - 0.14, 0);
  ghGroup.add(growRing);

  const ghLight = new THREE.PointLight('#ffd166', 2.8, ghSpec.floorRadius * 3.6, 2);
  ghLight.position.set(0, roofBaseY - 0.24, 0);
  ghGroup.add(ghLight);

  // Exterior Water Storage Tank & Supply Pipes
  const tankProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.43, 0),
    new THREE.Vector2(0.44, 1.15),
    new THREE.Vector2(0.41, 1.19),
    new THREE.Vector2(0, 1.2),
  ];
  const waterTank = new THREE.Mesh(trackGeo(new THREE.LatheGeometry(tankProfile, 16)), matHullPanel);
  const wtLocalX = ghSpec.waterTankX - ghX;
  const wtLocalZ = ghSpec.waterTankZ - ghZ;
  waterTank.position.set(wtLocalX, 0.0, wtLocalZ);
  waterTank.castShadow = castShadow;
  ghGroup.add(waterTank);

  const waterGauge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.08, 0.72, 0.06)), matCyanGlow);
  waterGauge.position.set(wtLocalX, 0.62, wtLocalZ + 0.44);
  waterGauge.userData.nonPhysicalMarker = true;
  ghGroup.add(waterGauge);

  const wtDist = Math.hypot(wtLocalX, wtLocalZ) || 1;
  const wallInX = (wtLocalX / wtDist) * (ghSpec.floorRadius - 0.35);
  const wallInZ = (wtLocalZ / wtDist) * (ghSpec.floorRadius - 0.35);
  const waterPipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(wtLocalX, 0.55, wtLocalZ),
    new THREE.Vector3((wtLocalX + wallInX) * 0.5, 0.45, (wtLocalZ + wallInZ) * 0.5),
    new THREE.Vector3(wallInX, 0.32, wallInZ),
  ]);
  const waterPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(waterPipeCurve, 10, 0.05, 8, false)), matCopperPipe);
  ghGroup.add(waterPipe);

  // Pressurized connector / elevated skybridge linking Habitat & Greenhouse
  const ghConn = m.connHabGh;
  const ghCorr = computeCorridorTransform(
    ghConn.startX,
    habY + ghConn.startYOffset,
    ghConn.startZ,
    ghConn.endX,
    ghY + ghConn.endYOffset,
    ghConn.endZ,
  );
  const tunnelMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(ghConn.halfWidth * 2, ghConn.halfHeight * 2, ghCorr.length)),
    matHullPanel,
  );
  tunnelMesh.position.set(ghCorr.cx, ghCorr.cy, ghCorr.cz);
  tunnelMesh.quaternion.set(
    ghCorr.quaternion.x,
    ghCorr.quaternion.y,
    ghCorr.quaternion.z,
    ghCorr.quaternion.w,
  );
  tunnelMesh.castShadow = castShadow;
  tunnelMesh.receiveShadow = true;
  const ribSteps = ghConn.elevatedOverpass ? [-3, -2, -1, 0, 1, 2, 3] : [-1, 0, 1];
  const ribSpanFrac = ghConn.elevatedOverpass ? 0.12 : 0.25;
  for (const r of ribSteps) {
    const rib = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(ghConn.halfWidth * 2.08, ghConn.halfHeight * 2.08, 0.08)),
      matDarkSteel,
    );
    rib.position.set(0, 0, r * (ghCorr.length * ribSpanFrac));
    tunnelMesh.add(rib);
  }
  scene.add(tunnelMesh);

  let skybridgeCollarsGroup: THREE.Group | null = null;
  if (ghConn.elevatedOverpass) {
    skybridgeCollarsGroup = new THREE.Group();
    // Pressurized attachment collar towers at Habitat East & Greenhouse West
    const buildCollarTower = (wx: number, wy: number, wz: number) => {
      const collar = new THREE.Group();
      collar.position.set(wx, wy, wz);
      const plinth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.46, 0.65, 1.38)), matDarkSteel);
      plinth.position.y = 0.325;
      collar.add(plinth);
      const tower = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.36, 3.6, 1.28, 0.04)), matHullPanel);
      tower.position.y = 2.0;
      tower.castShadow = castShadow;
      tower.receiveShadow = true;
      collar.add(tower);
      const band = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 0.16, 1.32)), matMarsOrange);
      band.position.y = 3.15;
      collar.add(band);
      skybridgeCollarsGroup!.add(collar);
    };
    buildCollarTower(ghConn.startX - 0.12, habY, ghConn.startZ);
    buildCollarTower(ghConn.endX + 0.12, ghY, ghConn.endZ);
    scene.add(skybridgeCollarsGroup);

    // Slender structural support piers outside East Ring Road clearance
    ghConn.pierXs.forEach((px) => {
      const t = (px - ghConn.startX) / (ghConn.endX - ghConn.startX);
      const pz = ghConn.startZ + (ghConn.endZ - ghConn.startZ) * t;
      const py = gAt(px, pz);
      const pierH = ghConn.undersideClearanceY + 0.05;
      const pierGroup = new THREE.Group();
      pierGroup.position.set(px, py, pz);
      const footing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.44, 0.52, 0.3, 12)), matDarkSteel);
      footing.position.y = 0.15;
      pierGroup.add(footing);
      const col = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.24, pierH, 12)), matBrushedAlum);
      col.position.y = pierH * 0.5;
      col.castShadow = castShadow;
      pierGroup.add(col);
      scene.add(pierGroup);
    });

    // Underpass amber clearance markers above East Ring Road
    const underLight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.72, 0.06, 0.22)), matWarmWindow);
    underLight.position.set(11.4, habY + ghConn.undersideClearanceY - 0.01, (ghConn.startZ + ghConn.endZ) * 0.5);
    scene.add(underLight);
  }

  registerInteractive(ghGroup, 'greenhouse');
  scene.add(ghGroup);

  // ============================================================================
  // 3. SOLAR MICROGRID (Tracking Arrays + LiFePO4 Battery Container Bank)
  // ============================================================================
  const solarGroup = new THREE.Group();
  const solarWings: THREE.Group[] = [];
  const solarLocations = m.solarPanels;

  const pedProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.48, 0),
    new THREE.Vector2(0.42, 0.22),
    new THREE.Vector2(0.18, 0.32),
    new THREE.Vector2(0.12, 1.45),
    new THREE.Vector2(0.22, 1.58),
    new THREE.Vector2(0, 1.62),
  ];
  const pedGeo = trackGeo(new THREE.LatheGeometry(pedProfile, 14));
  const subPanelGeo = trackGeo(createBeveledPanelGeometry(0.72, 0.62, 0.04, 0.015));

  const solarDustMats: THREE.MeshStandardMaterial[] = [];

  solarLocations.forEach(([sx, sz]) => {
    const unit = new THREE.Group();
    unit.position.set(sx, gAt(sx, sz), sz);
    addContactShadow(unit, 1.5, 1.2, 0.6);

    const pedestal = new THREE.Mesh(pedGeo, matDarkSteel);
    pedestal.castShadow = castShadow;
    pedestal.receiveShadow = true;
    unit.add(pedestal);

    const wingPivot = new THREE.Group();
    wingPivot.position.set(0, 1.65, 0);

    const backingFrame = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(2.55, 1.48, 0.05, 0.02)),
      matBrushedAlum,
    );
    backingFrame.rotation.x = Math.PI / 2;
    backingFrame.castShadow = castShadow;
    wingPivot.add(backingFrame);

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const panel = new THREE.Mesh(subPanelGeo, matSolarWafer);
        panel.rotation.x = Math.PI / 2;
        panel.position.set((col - 1) * 0.78, 0.055, (row - 0.5) * 0.68);
        wingPivot.add(panel);
      }
    }

    const dustCoatMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#c96f3b',
        roughness: 0.95,
        metalness: 0.02,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      }),
    );
    solarDustMats.push(dustCoatMat);
    const dustOverlay = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(2.42, 1.38)),
      dustCoatMat,
    );
    dustOverlay.rotation.x = -Math.PI / 2;
    dustOverlay.position.y = 0.095;
    dustOverlay.userData.nonPhysicalMarker = true;
    wingPivot.add(dustOverlay);

    const jBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.35, 0.16, 0.28)), matMarsOrange);
    jBox.position.set(0, -0.1, 0);
    wingPivot.add(jBox);

    wingPivot.rotation.set(0.55, -0.52, 0);
    unit.add(wingPivot);
    solarWings.push(wingPivot);
    solarGroup.add(unit);
  });

  // Armored LiFePO4 Battery Container Bank & Inverter Skid
  const batBank = new THREE.Group();
  const bbX = m.batteryBank.x;
  const bbZ = m.batteryBank.z;
  batBank.position.set(bbX, gAt(bbX, bbZ), bbZ);
  batBank.rotation.y = m.batteryBank.yaw;
  addContactShadow(batBank, 1.8, 1.2, 0.64);

  const batSkid = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(2.4, 0.22, 1.4, 0.03)), matDarkSteel);
  batSkid.position.y = 0.11;
  batSkid.castShadow = castShadow;
  batBank.add(batSkid);

  const batContainer = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(2.15, 1.18, 1.15, 0.04)), matHullPanel);
  batContainer.position.y = 0.8;
  batContainer.castShadow = castShadow;
  batBank.add(batContainer);

  const batOrangeStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.14, 1.18)), matMarsOrange);
  batOrangeStripe.position.y = 1.2;
  batBank.add(batOrangeStripe);

  for (let b = -1; b <= 1; b++) {
    const bus = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8)), matCopperPipe);
    bus.position.set(b * 0.52, 1.48, 0);
    batBank.add(bus);
  }
  const batStatusLed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.44, 0.14, 0.06)), trackMat(matGreenGlow.clone()));
  batStatusLed.position.set(0, 0.86, 0.59);
  batStatusLed.userData.nonPhysicalMarker = true;
  batBank.add(batStatusLed);
  colonyBlinkingLights.push(batStatusLed);
  solarGroup.add(batBank);

  registerInteractive(solarGroup, 'solar');
  scene.add(solarGroup);

  // ============================================================================
  // 4. ROVER-7 (Sculpted Chassis, Rocker-Bogie Suspension, Treaded Wheels, Optics)
  // ============================================================================
  const roverGroup = new THREE.Group();
  const roverBaseX = m.roverSpawn.x;
  const roverBaseZ = m.roverSpawn.z;
  const roverInitY = getOutpostSupportHeightAt(roverBaseX, roverBaseZ, gAt, layout);
  roverGroup.position.set(roverBaseX, roverInitY, roverBaseZ);
  roverGroup.rotation.y = m.roverSpawn.yaw;
  addContactShadow(roverGroup, 1.45, 1.15, 0.74);

  // Sculpted beveled aerospace chassis
  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-0.85, -0.2);
  chassisShape.lineTo(0.75, -0.2);
  chassisShape.lineTo(0.95, 0.05);
  chassisShape.lineTo(0.78, 0.28);
  chassisShape.lineTo(-0.78, 0.28);
  chassisShape.lineTo(-0.92, 0.06);
  chassisShape.closePath();
  const chassisGeo = trackGeo(
    new THREE.ExtrudeGeometry(chassisShape, {
      depth: 1.12,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    }),
  );
  chassisGeo.center();
  chassisGeo.rotateY(Math.PI / 2);

  const roverChassis = new THREE.Mesh(chassisGeo, matHullPanel);
  roverChassis.position.y = 0.64;
  roverChassis.castShadow = castShadow;
  roverChassis.receiveShadow = true;
  roverGroup.add(roverChassis);

  // Gold Kapton thermal foil battery compartment
  const foilBelly = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.96, 0.24, 1.24, 0.02)),
    matThermalFoil,
  );
  foilBelly.position.y = 0.44;
  roverGroup.add(foilBelly);

  // Dynamic Nameplate decal on left side (updates with child's custom Rover name)
  const namePlateMat = trackMat(new THREE.MeshStandardMaterial({ map: roverNameTex, roughness: 0.4 }));
  const namePlate = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.92, 0.34)),
    namePlateMat,
  );
  namePlate.position.set(-0.62, 0.68, 0.0);
  namePlate.rotation.y = -Math.PI / 2;
  roverGroup.add(namePlate);

  let currentRoverLabel = 'ROVER-7';
  const updateRoverNameplate = (rawName: string) => {
    const clean = (rawName.trim() || 'Rusty').toUpperCase().slice(0, 12);
    if (clean === currentRoverLabel) return;
    currentRoverLabel = clean;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d');
    if (!g) return;
    g.fillStyle = '#0B1D36';
    g.fillRect(0, 0, 256, 96);
    g.strokeStyle = '#FFB703';
    g.lineWidth = 6;
    g.strokeRect(5, 5, 246, 86);
    g.fillStyle = '#F8F9FA';
    g.font = 'bold 34px Orbitron, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(clean, 128, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    trackTex(tex);
    namePlateMat.map = tex;
    namePlateMat.needsUpdate = true;
  };

  // Dorsal solar deck on rear of rover
  const roverSolarDeck = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.02, 0.88, 0.05, 0.015)),
    matSolarWafer,
  );
  roverSolarDeck.rotation.x = Math.PI / 2;
  roverSolarDeck.position.set(0, 0.94, -0.24);
  roverGroup.add(roverSolarDeck);

  // Rear RTG cooling radiator fins
  for (let f = -2; f <= 2; f++) {
    const fin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.03, 0.3, 0.24)), matDarkSteel);
    fin.position.set(f * 0.14, 0.72, -0.94);
    roverGroup.add(fin);
  }

  // Rocker-Bogie Differential Suspension Arms & 6 Detailed 48-Grouser Wheels (0.525 m diameter)
  const roverWheelOffsets: THREE.Group[] = [];
  const roverWheels: THREE.Group[] = [];
  const wheelZList = [-0.66, 0.0, 0.66];
  const lugGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.022, 0.035));
  const springGeo = trackGeo(createHelicalSpringGeometry(0.05, 0.24, 5, 0.014));
  const wheelRadius = PHYSICS_CONSTANTS.ROVER_WHEEL_RADIUS_M; // 0.2625 m -> 0.525 m diameter
  const matRoverWheelTread = trackMat(
    new THREE.MeshStandardMaterial({
      map: wheelTex.treadMap,
      bumpMap: wheelTex.treadBump,
      bumpScale: 0.025,
      roughness: 0.58,
      metalness: 0.52,
    }),
  );
  const matWheelSpoke = trackMat(
    new THREE.MeshStandardMaterial({
      map: wheelTex.spokeAlpha,
      roughness: 0.36,
      metalness: 0.78,
    }),
  );

  // Differential bar linking Left & Right rocker-bogie arms across top chassis spine
  const roverDiffBar = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.16, 0.055, 0.07, 0.01)),
    matBrushedAlum,
  );
  roverDiffBar.position.set(0, 0.96, 0.05);
  roverDiffBar.castShadow = castShadow;
  roverGroup.add(roverDiffBar);

  let roverLeftRockerPivot = new THREE.Group();
  let roverRightRockerPivot = new THREE.Group();

  [-1, 1].forEach((side) => {
    const sx = side * 0.78;
    const rockerPivot = new THREE.Group();
    rockerPivot.position.set(side * 0.56, 0.62, 0.04);
    roverGroup.add(rockerPivot);
    if (side === -1) roverLeftRockerPivot = rockerPivot;
    else roverRightRockerPivot = rockerPivot;

    const localDx = sx - side * 0.56;
    const rockerCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.01),
      new THREE.Vector3(localDx, -0.1, 0.3),
      new THREE.Vector3(localDx, -0.34, 0.62),
    ]);
    const rockerCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0.01),
      new THREE.Vector3(localDx, -0.12, -0.36),
      new THREE.Vector3(localDx, -0.34, -0.7),
    ]);
    const middleStrut = new THREE.CatmullRomCurve3([
      new THREE.Vector3(localDx, -0.1, -0.04),
      new THREE.Vector3(localDx, -0.34, -0.04),
    ]);
    [rockerCurve1, rockerCurve2, middleStrut].forEach((c) => {
      const arm = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(c, 10, 0.032, 6, false)), matBrushedAlum);
      arm.castShadow = castShadow;
      rockerPivot.add(arm);
    });

    // Helical shock springs
    [-0.45, 0.45].forEach((sz) => {
      const spring = new THREE.Mesh(springGeo, matMarsOrange);
      spring.position.set(side * 0.66, 0.4, sz);
      roverGroup.add(spring);
    });

    // 3 detailed wheels per side (suspension offset group + inner spin group)
    wheelZList.forEach((wz) => {
      const offsetGroup = new THREE.Group();
      offsetGroup.position.set(sx, wheelRadius + 0.012, wz);

      const spinGroup = new THREE.Group();
      offsetGroup.add(spinGroup);

      const tire = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.22, 24)),
        matRoverWheelTread,
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = castShadow;
      spinGroup.add(tire);

      // 16 sculpted titanium tread lugs around tire perimeter (matches 48 grousers texture)
      for (let t = 0; t < 16; t++) {
        const ta = (t / 16) * Math.PI * 2;
        const lug = new THREE.Mesh(lugGeo, matDarkSteel);
        lug.position.set(0, Math.cos(ta) * (wheelRadius + 0.005), Math.sin(ta) * (wheelRadius + 0.005));
        lug.rotation.x = ta;
        spinGroup.add(lug);
      }

      // 6-spoke titanium flex wheel faces on outer & inner wheel disks
      [-0.112, 0.112].forEach((faceX) => {
        const spokeFace = new THREE.Mesh(
          trackGeo(new THREE.CircleGeometry(wheelRadius * 0.78, 20)),
          matWheelSpoke,
        );
        spokeFace.position.set(faceX, 0, 0);
        spokeFace.rotation.y = faceX > 0 ? Math.PI / 2 : -Math.PI / 2;
        spinGroup.add(spokeFace);
      });

      const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.072, 0.072, 0.24, 12)), matGoldVisor);
      hub.rotation.z = Math.PI / 2;
      spinGroup.add(hub);

      roverWheelOffsets.push(offsetGroup);
      roverWheels.push(spinGroup);
      roverGroup.add(offsetGroup);
    });
  });

  // Forward Deployed 5-DOF Robotic Sample Arm & Coring Turret (Perseverance style)
  const sampleArmShoulder = new THREE.Group();
  sampleArmShoulder.position.set(0.24, 0.62, 0.96);
  const armJoint1 = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 10, 8)), matDarkSteel);
  sampleArmShoulder.add(armJoint1);
  const armSegment1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.06, 0.34)), matBrushedAlum);
  armSegment1.position.set(0, 0.04, 0.16);
  armSegment1.rotation.x = -0.25;
  sampleArmShoulder.add(armSegment1);
  const turretPod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 12)), matDarkSteel);
  turretPod.position.set(-0.04, 0.08, 0.34);
  turretPod.rotation.z = Math.PI / 2;
  sampleArmShoulder.add(turretPod);
  const coringBit = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.008, 0.14, 8)), matMarsOrange);
  coringBit.position.set(-0.04, -0.02, 0.38);
  sampleArmShoulder.add(coringBit);
  roverGroup.add(sampleArmShoulder);

  // Stereo Camera Mast + Lathe Lens Barrels + Headlamps
  const mastTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.075, 0.66, 10)), matBrushedAlum);
  mastTube.position.set(0, 1.14, 0.56);
  mastTube.castShadow = castShadow;
  roverGroup.add(mastTube);

  const roverHead = new THREE.Group();
  roverHead.position.set(0, 1.5, 0.56);
  const headPod = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.62, 0.24, 0.32, 0.04)),
    matHullPanel,
  );
  headPod.castShadow = castShadow;
  roverHead.add(headPod);

  const lensBarrelProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.075, 0),
    new THREE.Vector2(0.075, 0.12),
    new THREE.Vector2(0.06, 0.14),
    new THREE.Vector2(0.055, 0.09),
  ];
  const barrelGeo = trackGeo(new THREE.LatheGeometry(lensBarrelProfile, 14));
  barrelGeo.rotateX(Math.PI / 2);

  [-0.16, 0.16].forEach((lx) => {
    const barrel = new THREE.Mesh(barrelGeo, matDarkSteel);
    barrel.position.set(lx, 0, 0.14);
    roverHead.add(barrel);

    const optic = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 12, 10)), matOpticGlass);
    optic.position.set(lx, 0, 0.24);
    roverHead.add(optic);
  });

  // Glowing mood sensor bar & companion target spotlight beam
  const roverEyeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22C55E',
      emissive: '#22C55E',
      emissiveIntensity: 1.9,
      roughness: 0.2,
    }),
  );
  const sensorBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.055, 0.045)), roverEyeMat);
  sensorBar.position.set(0, -0.05, 0.18);
  roverHead.add(sensorBar);

  // Soft volumetric guide beam pointing from Rover head toward active mission zone
  const roverGuideBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#FFB703',
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  const beamGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.24, 2.0, 16, 1, true));
  beamGeo.translate(0, -1.0, 0);
  beamGeo.rotateX(-Math.PI / 2);
  const roverGuideBeam = new THREE.Mesh(beamGeo, roverGuideBeamMat);
  roverGuideBeam.position.set(0, 0.0, 0.22);
  roverGuideBeam.visible = false;
  roverHead.add(roverGuideBeam);

  roverGroup.add(roverHead);

  [-0.38, 0.38].forEach((hx) => {
    const lamp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 10)), matWarmWindow);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(hx, 0.72, 0.94);
    roverGroup.add(lamp);
  });

  // Front tubular bullbar bumper on rover
  const bumperCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 0.45, 0.92),
    new THREE.Vector3(-0.42, 0.56, 1.04),
    new THREE.Vector3(0.42, 0.56, 1.04),
    new THREE.Vector3(0.46, 0.45, 0.92),
  ]);
  const bumperMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(bumperCurve, 12, 0.032, 8, false)),
    matBrushedAlum,
  );
  roverGroup.add(bumperMesh);

  // Rear whip antenna on rover
  const roverAntenna = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.02, 0.85, 6)), matBrushedAlum);
  roverAntenna.position.set(-0.42, 1.32, -0.68);
  roverGroup.add(roverAntenna);

  registerInteractive(roverGroup, 'rover');
  scene.add(roverGroup);

  // ============================================================================
  // 5. PRESSURIZED EVA ASTRONAUT BUILDER (Commander + 4 Articulated Crew NPCs)
  // ============================================================================
  const astroX = m.astroSpawn.x;
  const astroZ = m.astroSpawn.z;

  const matEvaSuitWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#eff2f7',
      normalMap: suitTex.normalMap,
      normalScale: new THREE.Vector2(0.38, 0.38),
      roughnessMap: suitTex.roughnessMap,
      roughness: 0.72,
      metalness: 0.04,
    }),
  );
  const matEvaSuitDusty = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#d8b6a2', // Regolith dust patina on lower shins & boots
      normalMap: suitTex.normalMap,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughness: 0.88,
      metalness: 0.02,
    }),
  );
  const matHelmetShellWhite = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#f4f6fa',
      roughness: 0.3,
      metalness: 0.1,
    }),
  );
  const matSlateGear = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#3f4a59',
      roughness: 0.62,
      metalness: 0.18,
    }),
  );
  const matAnodizedRing = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#7c899b',
      roughness: 0.28,
      metalness: 0.84,
    }),
  );
  const matAmberLed = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffd166',
      emissive: '#ff9e1b',
      emissiveIntensity: 2.0,
      roughness: 0.2,
    }),
  );
  const matHeadlampLed = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#dbeafe',
      emissiveIntensity: 2.3,
      roughness: 0.12,
    }),
  );
  const matChestDcm = trackMat(
    new THREE.MeshStandardMaterial({
      map: chestDcmTex,
      emissiveMap: chestDcmTex,
      emissive: '#ffffff',
      emissiveIntensity: 0.45,
      roughness: 0.35,
    }),
  );
  const matEmblemFace = trackMat(
    new THREE.MeshStandardMaterial({
      map: explorerEmblemTex,
      roughness: 0.48,
      metalness: 0.04,
    }),
  );

  // Shared geometries across all 5 EVA suits so draw calls & GPU memory stay super lean
  const pelvisGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, -0.08),
        new THREE.Vector2(0.138, -0.068),
        new THREE.Vector2(0.172, 0.0),
        new THREE.Vector2(0.162, 0.075),
        new THREE.Vector2(0.0, 0.082),
      ],
      18,
    ),
  );
  const thighGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.07, -0.38),
        new THREE.Vector2(0.084, -0.31),
        new THREE.Vector2(0.08, -0.24),
        new THREE.Vector2(0.088, -0.14),
        new THREE.Vector2(0.088, -0.05),
        new THREE.Vector2(0.084, 0.0),
      ],
      14,
    ),
  );
  const shinGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.062, -0.35),
        new THREE.Vector2(0.082, -0.29),
        new THREE.Vector2(0.072, -0.22),
        new THREE.Vector2(0.082, -0.14),
        new THREE.Vector2(0.072, -0.06),
        new THREE.Vector2(0.068, 0.0),
      ],
      14,
    ),
  );
  const torsoGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.15, 0.02),
        new THREE.Vector2(0.168, 0.14),
        new THREE.Vector2(0.194, 0.3),
        new THREE.Vector2(0.184, 0.4),
        new THREE.Vector2(0.132, 0.45),
        new THREE.Vector2(0.0, 0.46),
      ],
      18,
    ),
  );
  const upperArmGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.054, -0.22),
        new THREE.Vector2(0.064, -0.14),
        new THREE.Vector2(0.06, -0.07),
        new THREE.Vector2(0.066, 0.0),
      ],
      12,
    ),
  );
  const foreArmGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.048, -0.2),
        new THREE.Vector2(0.058, -0.12),
        new THREE.Vector2(0.052, -0.05),
        new THREE.Vector2(0.054, 0.0),
      ],
      12,
    ),
  );

  const buildEvaExplorer = (
    accentColor: string,
    badgeTex: THREE.Texture,
    scaleFactor = 1.0,
  ) => {
    const matAccent = trackMat(
      new THREE.MeshStandardMaterial({
        color: accentColor,
        roughness: 0.42,
        metalness: 0.12,
      }),
    );
    const matBadge = trackMat(
      new THREE.MeshStandardMaterial({
        map: badgeTex,
        roughness: 0.45,
      }),
    );

    const group = new THREE.Group();
    group.scale.setScalar(scaleFactor);
    addContactShadow(group, 0.54, 0.54, 0.68);

    const pelvis = new THREE.Group();
    pelvis.position.y = 0.86;
    group.add(pelvis);

    const pelvisBrief = new THREE.Mesh(pelvisGeo, matEvaSuitWhite);
    pelvisBrief.scale.set(1.06, 1.0, 0.8);
    pelvisBrief.castShadow = castShadow;
    pelvis.add(pelvisBrief);

    const waistRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.162, 0.02, 8, 22)),
      matAnodizedRing,
    );
    waistRing.rotation.x = Math.PI / 2;
    waistRing.scale.set(1.07, 0.82, 1.0);
    waistRing.position.y = 0.04;
    pelvis.add(waistRing);

    const buckle = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.07, 0.054, 0.026, 0.008)),
      matBrushedAlum,
    );
    buckle.position.set(0, 0.04, 0.145);
    pelvis.add(buckle);

    const buildLeg = (isRight: boolean) => {
      const side = isRight ? 1 : -1;
      const hipPivot = new THREE.Group();
      hipPivot.position.set(side * 0.112, -0.02, 0);
      hipPivot.rotation.y = side * -0.055;

      const hipSocket = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.086, 12, 10)),
        matAnodizedRing,
      );
      hipPivot.add(hipSocket);

      const thigh = new THREE.Mesh(thighGeo, matEvaSuitWhite);
      thigh.scale.set(0.98, 1.0, 1.05);
      thigh.castShadow = castShadow;
      hipPivot.add(thigh);

      const thighBand = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.085, 0.014, 6, 16)),
        matAccent,
      );
      thighBand.rotation.x = Math.PI / 2;
      thighBand.position.y = -0.17;
      hipPivot.add(thighBand);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -0.38, 0);
      hipPivot.add(kneePivot);

      const kneeRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.072, 0.012, 6, 16)),
        matAnodizedRing,
      );
      kneeRing.rotation.x = Math.PI / 2;
      kneePivot.add(kneeRing);

      const kneePad = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.084, 0.095, 0.034, 0.014)),
        matSlateGear,
      );
      kneePad.position.set(0, -0.01, 0.068);
      kneePad.castShadow = castShadow;
      kneePivot.add(kneePad);

      // Lower shin & dusty boot patina from Martian regolith exposure
      const shin = new THREE.Mesh(shinGeo, matEvaSuitDusty);
      shin.scale.set(0.98, 1.0, 1.05);
      shin.castShadow = castShadow;
      kneePivot.add(shin);

      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -0.35, 0);
      kneePivot.add(anklePivot);

      const bootUpper = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.074, 0.078, 0.095, 14)),
        matEvaSuitDusty,
      );
      bootUpper.position.set(0, -0.01, 0.005);
      bootUpper.castShadow = castShadow;
      anklePivot.add(bootUpper);

      const bootAccent = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.036, 0.062, 0.022, 0.006)),
        matAccent,
      );
      bootAccent.position.set(0, -0.02, 0.078);
      anklePivot.add(bootAccent);

      const toeBox = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.08, 12, 10)),
        matSlateGear,
      );
      toeBox.scale.set(0.95, 0.54, 1.44);
      toeBox.position.set(0, -0.062, 0.056);
      toeBox.castShadow = castShadow;
      anklePivot.add(toeBox);

      const bootSole = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.084, 0.088, 0.036, 14)),
        matSlateGear,
      );
      bootSole.scale.set(0.98, 1.0, 1.64);
      bootSole.position.set(0, -0.092, 0.034);
      bootSole.castShadow = castShadow;
      anklePivot.add(bootSole);

      pelvis.add(hipPivot);
      return { hipPivot, kneePivot, anklePivot };
    };

    const leftLegRig = buildLeg(false);
    const rightLegRig = buildLeg(true);

    const torso = new THREE.Group();
    torso.position.y = 0.07;
    pelvis.add(torso);

    const suitTorso = new THREE.Mesh(torsoGeo, matEvaSuitWhite);
    suitTorso.scale.set(1.06, 1.0, 0.8);
    suitTorso.castShadow = castShadow;
    torso.add(suitTorso);

    // Shoulder harness & suit stripe markings
    [-1, 1].forEach((side) => {
      const chestStripeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.125, 0.38, 0.075),
        new THREE.Vector3(side * 0.115, 0.24, 0.132),
        new THREE.Vector3(side * 0.095, 0.05, 0.125),
      ]);
      const chestStripe = new THREE.Mesh(
        trackGeo(new THREE.TubeGeometry(chestStripeCurve, 10, 0.018, 6, false)),
        matAccent,
      );
      torso.add(chestStripe);
    });

    // Chest Display & Control Module (DCM) with illuminated O2 / kPa / H2O readout
    const chestPackGroup = new THREE.Group();
    chestPackGroup.position.set(0, 0.25, 0.158);
    const chestPackBody = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.18, 0.15, 0.064, 0.02)),
      matHelmetShellWhite,
    );
    chestPackBody.castShadow = castShadow;
    chestPackGroup.add(chestPackBody);

    const chestScreen = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.14, 0.072)),
      matChestDcm,
    );
    chestScreen.position.set(0, 0.025, 0.052);
    chestPackGroup.add(chestScreen);

    const chestAmberBar = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.11, 0.016, 0.012, 0.004)),
      matAmberLed,
    );
    chestAmberBar.position.set(0, -0.044, 0.048);
    chestPackGroup.add(chestAmberBar);
    torso.add(chestPackGroup);

    // Tall Pressurized PLSS Backpack + Dual Telemetry Whip Antenna + Callsign Badge
    const backpackGroup = new THREE.Group();
    backpackGroup.position.set(0, 0.28, -0.195);
    const packBody = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.24, 0.36, 0.12, 0.026)),
      matHelmetShellWhite,
    );
    packBody.castShadow = castShadow;
    backpackGroup.add(packBody);

    const packBadge = new THREE.Mesh(
      trackGeo(new THREE.PlaneGeometry(0.14, 0.095)),
      matBadge,
    );
    packBadge.rotation.y = Math.PI;
    packBadge.position.set(0, 0.06, -0.088);
    backpackGroup.add(packBadge);

    const packLed = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.12, 0.018, 0.014, 0.005)),
      matAmberLed,
    );
    packLed.position.set(0, -0.06, -0.086);
    backpackGroup.add(packLed);

    const plssWhip = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.006, 0.012, 0.42, 6)),
      matBrushedAlum,
    );
    plssWhip.position.set(0.095, 0.34, -0.02);
    backpackGroup.add(plssWhip);
    torso.add(backpackGroup);

    // Zero-Gap EVA Head: Anodized Neck Disconnect Ring + Soft Pleated Collar + Closed Gold-Visor Helmet
    const head = new THREE.Group();
    head.position.set(0, 0.435, 0.005);
    torso.add(head);

    const neckSealCollar = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.12, 0.145, 0.085, 18)),
      matSlateGear,
    );
    neckSealCollar.position.y = 0.015;
    head.add(neckSealCollar);

    const neckDisconnectRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.132, 0.022, 10, 22)),
      matAnodizedRing,
    );
    neckDisconnectRing.rotation.x = Math.PI / 2;
    neckDisconnectRing.position.y = 0.052;
    head.add(neckDisconnectRing);

    // Closed white pressure helmet shell
    const helmetShell = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.205, 22, 16)),
      matHelmetShellWhite,
    );
    helmetShell.scale.set(0.96, 1.02, 1.04);
    helmetShell.position.set(0, 0.215, -0.005);
    helmetShell.castShadow = castShadow;
    head.add(helmetShell);

    // Reflective Gold Polycarbonate Sun Visor Dome (completely opaque, reflects Martian environment)
    const goldVisor = new THREE.Mesh(
      trackGeo(
        new THREE.SphereGeometry(
          0.194,
          22,
          16,
          Math.PI * 0.14,
          Math.PI * 0.72,
          Math.PI * 0.18,
          Math.PI * 0.62,
        ),
      ),
      matGoldVisor,
    );
    goldVisor.position.set(0, 0.218, 0.044);
    head.add(goldVisor);

    // Anodized visor rim trim
    const visorTrim = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.165, 0.014, 8, 24)),
      matAnodizedRing,
    );
    visorTrim.position.set(0, 0.218, 0.105);
    head.add(visorTrim);

    // Twin Helmet Side LED Floodlights
    [-0.198, 0.198].forEach((hx) => {
      const pod = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.045, 0.062, 0.09, 0.01)),
        matSlateGear,
      );
      pod.position.set(hx, 0.23, 0.035);
      head.add(pod);

      const led = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10)),
        matHeadlampLed,
      );
      led.rotation.x = Math.PI / 2;
      led.position.set(hx, 0.23, 0.088);
      head.add(led);
    });

    const buildArm = (isRight: boolean) => {
      const side = isRight ? 1 : -1;
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.222, 0.37, 0);

      const shoulderRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.068, 0.012, 8, 16)),
        matAnodizedRing,
      );
      shoulderRing.rotation.y = Math.PI / 2;
      shoulderPivot.add(shoulderRing);

      const pad = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.052, 0.115, 0.11, 0.016)),
        matAccent,
      );
      pad.position.set(side * 0.038, -0.02, 0);
      pad.castShadow = castShadow;
      shoulderPivot.add(pad);

      const upperArm = new THREE.Mesh(upperArmGeo, matEvaSuitWhite);
      upperArm.castShadow = castShadow;
      shoulderPivot.add(upperArm);

      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(0, -0.22, 0);
      shoulderPivot.add(elbowPivot);

      const elbowRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.052, 0.01, 6, 14)),
        matAnodizedRing,
      );
      elbowRing.rotation.x = Math.PI / 2;
      elbowPivot.add(elbowRing);

      const foreArm = new THREE.Mesh(foreArmGeo, matEvaSuitWhite);
      foreArm.castShadow = castShadow;
      elbowPivot.add(foreArm);

      const wristRing = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.048, 14)),
        matAnodizedRing,
      );
      wristRing.position.y = -0.185;
      elbowPivot.add(wristRing);

      const palm = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.046, 10, 8)),
        matSlateGear,
      );
      palm.scale.set(0.76, 1.08, 0.96);
      palm.position.set(0, -0.24, 0.006);
      elbowPivot.add(palm);

      const backPatch = new THREE.Mesh(
        trackGeo(createBeveledPanelGeometry(0.024, 0.048, 0.044, 0.008)),
        matAccent,
      );
      backPatch.position.set(side * 0.024, -0.235, 0.004);
      elbowPivot.add(backPatch);

      [-0.016, 0, 0.016].forEach((fz) => {
        const finger = new THREE.Mesh(
          trackGeo(new THREE.CapsuleGeometry(0.011, 0.036, 4, 6)),
          matSlateGear,
        );
        finger.position.set(-side * 0.008, -0.288, fz + 0.006);
        finger.rotation.z = side * -0.2;
        elbowPivot.add(finger);
      });

      torso.add(shoulderPivot);
      return { shoulderPivot, elbowPivot };
    };

    const leftArmRig = buildArm(false);
    const rightArmRig = buildArm(true);

    return {
      group,
      pelvis,
      torso,
      head,
      leftLegPivot: leftLegRig.hipPivot,
      rightLegPivot: rightLegRig.hipPivot,
      leftKneePivot: leftLegRig.kneePivot,
      rightKneePivot: rightLegRig.kneePivot,
      leftAnklePivot: leftLegRig.anklePivot,
      rightAnklePivot: rightLegRig.anklePivot,
      leftArmPivot: leftArmRig.shoulderPivot,
      rightArmPivot: rightArmRig.shoulderPivot,
      leftElbowPivot: leftArmRig.elbowPivot,
      rightElbowPivot: rightArmRig.elbowPivot,
    };
  };

  // Player Commander EVA Suit
  const cmdrBadgeTex = trackTex(createCrewBadgeTexture('CMD', '#f97316', maxAniso));
  const cmdrRig = buildEvaExplorer('#f97316', cmdrBadgeTex, 1.0);
  const astroGroup = cmdrRig.group;
  astroGroup.position.set(astroX, gAt(astroX, astroZ), astroZ);
  astroGroup.rotation.y = m.astroSpawn.yaw;
  const astroPelvisGroup = cmdrRig.pelvis;
  const astroTorsoGroup = cmdrRig.torso;
  const astroHeadGroup = cmdrRig.head;
  const astroLeftLegPivot = cmdrRig.leftLegPivot;
  const astroRightLegPivot = cmdrRig.rightLegPivot;
  const astroLeftKneePivot = cmdrRig.leftKneePivot;
  const astroRightKneePivot = cmdrRig.rightKneePivot;
  const astroLeftAnklePivot = cmdrRig.leftAnklePivot;
  const astroRightAnklePivot = cmdrRig.rightAnklePivot;
  const astroLeftArmPivot = cmdrRig.leftArmPivot;
  const astroRightArmPivot = cmdrRig.rightArmPivot;
  const astroLeftElbowPivot = cmdrRig.leftElbowPivot;
  const astroRightElbowPivot = cmdrRig.rightElbowPivot;

  astroLeftArmPivot.rotation.z = -0.11;
  astroRightArmPivot.rotation.z = 0.11;
  astroLeftElbowPivot.rotation.x = -0.34;
  astroRightElbowPivot.rotation.x = -0.34;

  registerInteractive(astroGroup, 'astronaut');
  scene.add(astroGroup);

  // 4 Articulated Outpost Crew NPCs (Medical, Flight Eng, Science, ISRU)
  const crewRigs: CrewAvatarRig[] = CREW_PROFILES.map((prof) => {
    const badgeTex = trackTex(createCrewBadgeTexture(prof.initials, prof.avatarColor, maxAniso));
    const rig = buildEvaExplorer(prof.avatarColor, badgeTex, 0.96);
    rig.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData.crewId = prof.id;
        interactiveTargets.push(child);
      }
    });
    scene.add(rig.group);
    return {
      id: prof.id,
      group: rig.group,
      pelvis: rig.pelvis,
      torso: rig.torso,
      head: rig.head,
      leftArm: rig.leftArmPivot,
      rightArm: rig.rightArmPivot,
      leftElbow: rig.leftElbowPivot,
      rightElbow: rig.rightElbowPivot,
      leftLeg: rig.leftLegPivot,
      rightLeg: rig.rightLegPivot,
      leftKnee: rig.leftKneePivot,
      rightKnee: rig.rightKneePivot,
      leftAnkle: rig.leftAnklePivot,
      rightAnkle: rig.rightAnklePivot,
    };
  });

  // ============================================================================
  // 5B. FIRST-PERSON DEPTH-CLEARED EVA ARMS VIEW-MODEL (fpScene + fpCamera)
  // ============================================================================
  const fpScene = new THREE.Scene();
  const fpCamera = new THREE.PerspectiveCamera(48, 16 / 9, 0.02, 10);
  const fpHemi = new THREE.HemisphereLight('#a8c4e0', '#8c3b20', 1.25);
  fpScene.add(fpHemi);
  const fpKey = new THREE.DirectionalLight('#ffd59e', 2.2);
  fpKey.position.set(1.5, 2.5, 1.0);
  fpScene.add(fpKey);

  const fpArmsGroup = new THREE.Group();
  fpScene.add(fpArmsGroup);

  const matFpOrange = trackMat(
    new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.42, metalness: 0.1 }),
  );
  const buildFpArm = (isRight: boolean) => {
    const side = isRight ? 1 : -1;
    const arm = new THREE.Group();
    arm.position.set(side * 0.27, -0.26, -0.32);

    const sleeve = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056, 0.068, 0.42, 14)),
      matEvaSuitWhite,
    );
    sleeve.rotation.x = Math.PI * 0.44;
    sleeve.rotation.z = side * 0.16;
    arm.add(sleeve);

    const stripe = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.022, 0.28, 0.018)),
      matFpOrange,
    );
    stripe.rotation.x = Math.PI * 0.44;
    stripe.position.set(side * 0.04, 0.03, -0.02);
    arm.add(stripe);

    const cuff = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.056, 0.012, 8, 18)),
      matAnodizedRing,
    );
    cuff.position.set(-side * 0.03, 0.04, -0.18);
    cuff.rotation.x = 0.15;
    arm.add(cuff);

    const glovePalm = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.09, 0.055, 0.11, 0.016)),
      matSlateGear,
    );
    glovePalm.position.set(-side * 0.04, 0.045, -0.26);
    arm.add(glovePalm);

    // Left forearm carries wrist sample status display
    if (!isRight) {
      const wristDisplay = new THREE.Mesh(
        trackGeo(new THREE.PlaneGeometry(0.068, 0.036)),
        matChestDcm,
      );
      wristDisplay.position.set(0.02, 0.072, -0.12);
      wristDisplay.rotation.x = -Math.PI / 2 + 0.35;
      wristDisplay.rotation.z = -0.22;
      arm.add(wristDisplay);
    }

    fpArmsGroup.add(arm);
    return arm;
  };
  const fpLeftArm = buildFpArm(false);
  const fpRightArm = buildFpArm(true);
  void matEmblemFace;

  // ============================================================================
  // 6. OUTPOST POWER CONSOLE (Central Energy Router + Glowing World Beacon)
  // ============================================================================
  const powerConsoleGroup = new THREE.Group();
  const consoleX = m.powerConsole.x;
  const consoleZ = m.powerConsole.z;
  const consoleY = gAt(consoleX, consoleZ);
  powerConsoleGroup.position.set(consoleX, consoleY, consoleZ);
  powerConsoleGroup.rotation.y = m.powerConsole.yaw;
  addContactShadow(powerConsoleGroup, 0.72, 0.72, 0.65);

  const consoleBase = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.86, 0.18, 0.78, 0.03)),
    matDarkSteel,
  );
  consoleBase.position.y = 0.09;
  consoleBase.castShadow = castShadow;
  consoleBase.receiveShadow = true;
  powerConsoleGroup.add(consoleBase);

  const consolePedestal = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.46, 0.88, 0.36, 0.03)),
    matHullPanel,
  );
  consolePedestal.position.y = 0.54;
  consolePedestal.castShadow = castShadow;
  powerConsoleGroup.add(consolePedestal);

  const consoleHead = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.68, 0.48, 0.24, 0.03)),
    matDarkSteel,
  );
  consoleHead.position.set(0, 1.06, 0.06);
  consoleHead.rotation.x = -0.42;
  consoleHead.castShadow = castShadow;
  powerConsoleGroup.add(consoleHead);

  const matConsoleScreen = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffb703',
      emissive: '#ffb703',
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.15,
    }),
  );
  const consoleScreen = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.54, 0.32)),
    matConsoleScreen,
  );
  consoleScreen.position.set(0, 0.01, 0.155);
  consoleHead.add(consoleScreen);

  const consoleTrim = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.56, 0.12, 0.08, 0.015)),
    matMarsOrange,
  );
  consoleTrim.position.set(0, 0.84, 0.18);
  powerConsoleGroup.add(consoleTrim);

  const powerBeaconRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#ffb703',
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const powerBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(0.82, 0.98, 32)),
    powerBeaconRingMat,
  );
  powerBeaconRing.rotation.x = -Math.PI / 2;
  powerBeaconRing.position.y = 0.08;
  powerConsoleGroup.add(powerBeaconRing);

  const powerBeaconDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.16, 0)),
    matConsoleScreen,
  );
  powerBeaconDiamond.position.set(0, 1.85, 0.04);
  powerBeaconDiamond.userData.nonPhysicalMarker = true;
  powerConsoleGroup.add(powerBeaconDiamond);

  registerInteractive(powerConsoleGroup, 'power-console');
  scene.add(powerConsoleGroup);

  // ============================================================================
  // 7. MISSION 1 ZONE: O2 TANK 2 & ISRU VALVE ASSEMBLY (with White Vapour Leak)
  // ============================================================================
  const tank2Group = new THREE.Group();
  const tank2X = m.tank2.x;
  const tank2Z = m.tank2.z;
  const tank2Y = gAt(tank2X, tank2Z);
  tank2Group.position.set(tank2X, tank2Y, tank2Z);
  tank2Group.rotation.y = m.tank2.yaw;
  addContactShadow(tank2Group, 1.35, 1.0, 0.65);

  const tankRack = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.75, 0.18, 1.1, 0.03)),
    matDarkSteel,
  );
  tankRack.position.y = 0.09;
  tankRack.castShadow = castShadow;
  tankRack.receiveShadow = true;
  tank2Group.add(tankRack);

  const o2BodyProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.32, 0),
    new THREE.Vector2(0.34, 1.25),
    new THREE.Vector2(0.24, 1.48),
    new THREE.Vector2(0, 1.54),
  ];
  const o2TankGeo = trackGeo(new THREE.LatheGeometry(o2BodyProfile, 16));
  const tank1Mesh = new THREE.Mesh(o2TankGeo, matHullPanel);
  tank1Mesh.position.set(-0.42, 0.16, 0);
  tank1Mesh.castShadow = castShadow;
  tank2Group.add(tank1Mesh);

  const tank2Mesh = new THREE.Mesh(o2TankGeo, matHullPanel);
  tank2Mesh.position.set(0.42, 0.16, 0);
  tank2Mesh.castShadow = castShadow;
  tank2Group.add(tank2Mesh);

  const tank2Band = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.18, 16)), matMarsOrange);
  tank2Band.position.set(0.42, 1.15, 0);
  tank2Group.add(tank2Band);

  const tank1TealBand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.14, 16)), matScienceTeal);
  tank1TealBand.position.set(-0.42, 1.15, 0);
  tank1TealBand.userData.nonPhysicalMarker = true;
  tank2Group.add(tank1TealBand);

  if (m.tank2.hasIsruUnit) {
    const isruGroup = new THREE.Group();
    isruGroup.position.set(m.tank2.isruOffsetX, 0, m.tank2.isruOffsetZ);
    const isruSkid = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.12, 0.2, 0.96, 0.03)), matDarkSteel);
    isruSkid.position.y = 0.1;
    isruGroup.add(isruSkid);
    const isruCab = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.02, 1.18, 0.86, 0.04)), matHullPanel);
    isruCab.position.y = 0.78;
    isruCab.castShadow = castShadow;
    isruGroup.add(isruCab);
    const isruStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.16, 0.9)), matMarsOrange);
    isruStripe.position.y = 1.12;
    isruGroup.add(isruStripe);
    const isruPipeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.45, 0.88, 0),
      new THREE.Vector3(-m.tank2.isruOffsetX * 0.5, 0.96, -m.tank2.isruOffsetZ * 0.5),
      new THREE.Vector3(-m.tank2.isruOffsetX - 0.42, 0.85, -m.tank2.isruOffsetZ),
    ]);
    const isruPipe = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(isruPipeCurve, 10, 0.045, 8, false)), matCopperPipe);
    isruGroup.add(isruPipe);
    tank2Group.add(isruGroup);
  }

  const manifoldCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.42, 1.52, 0),
    new THREE.Vector3(0, 1.66, 0.12),
    new THREE.Vector3(0.42, 1.52, 0),
    new THREE.Vector3(0.42, 1.12, 0.42),
  ]);
  const manifoldPipe = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(manifoldCurve, 16, 0.045, 8, false)),
    matCopperPipe,
  );
  tank2Group.add(manifoldPipe);

  const tank2ValveWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.14, 0.025, 8, 16)), matMarsOrange);
  tank2ValveWheel.position.set(0.42, 1.12, 0.48);
  tank2Group.add(tank2ValveWheel);

  const leakCount = 42;
  const tank2LeakPositions = new Float32Array(leakCount * 3);
  for (let i = 0; i < leakCount; i++) {
    tank2LeakPositions[i * 3] = 0.42 + (Math.random() - 0.5) * 0.08;
    tank2LeakPositions[i * 3 + 1] = 1.15 + Math.random() * 0.65;
    tank2LeakPositions[i * 3 + 2] = 0.48 + Math.random() * 0.9;
  }
  const leakGeo = trackGeo(new THREE.BufferGeometry());
  leakGeo.setAttribute('position', new THREE.BufferAttribute(tank2LeakPositions, 3));
  const dustSpriteTex = trackTex(createDustSpriteTexture());
  const tank2LeakMat = trackMat(
    new THREE.PointsMaterial({
      map: dustSpriteTex,
      color: '#e0f2fe',
      size: 0.28,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const tank2LeakPoints = new THREE.Points(leakGeo, tank2LeakMat);
  tank2Group.add(tank2LeakPoints);
  tank2Group.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'tank2';
  });
  scene.add(tank2Group);

  // ============================================================================
  // 8. MISSION 3 ZONE: WATER RECYCLER & SPARE-PARTS BAY
  // ============================================================================
  const recyclerGroup = new THREE.Group();
  const recX = m.recycler.x;
  const recZ = m.recycler.z;
  const recY = gAt(recX, recZ);
  recyclerGroup.position.set(recX, recY, recZ);
  recyclerGroup.rotation.y = m.recycler.yaw;
  addContactShadow(recyclerGroup, 1.2, 1.0, 0.62);

  const recDeck = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.5, 0.16, 1.05, 0.03)),
    matDarkSteel,
  );
  recDeck.position.y = 0.08;
  recDeck.castShadow = castShadow;
  recyclerGroup.add(recDeck);

  const recCabinet = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(1.18, 1.12, 0.72, 0.04)),
    matHullPanel,
  );
  recCabinet.position.y = 0.68;
  recCabinet.castShadow = castShadow;
  recyclerGroup.add(recCabinet);

  const matWaterBlue = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.72,
    }),
  );
  const sightGlass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.76, 14)), matWaterBlue);
  sightGlass.position.set(-0.28, 0.7, 0.38);
  recyclerGroup.add(sightGlass);

  const recyclerStatusMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#22C55E',
      emissive: '#22C55E',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  const recGauge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.24, 0.06)), recyclerStatusMat);
  recGauge.position.set(0.24, 0.85, 0.38);
  recyclerGroup.add(recGauge);

  recyclerGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'recycler';
  });
  scene.add(recyclerGroup);

  // ============================================================================
  // 9. MISSION 5 ZONE: WATER-WALL RADIATION STORM SHELTER
  // ============================================================================
  const shelterGroup = new THREE.Group();
  const shX = m.shelter.x;
  const shZ = m.shelter.z;
  const shY = gAt(shX, shZ);
  shelterGroup.position.set(shX, shY, shZ);
  shelterGroup.rotation.y = m.shelter.yaw;
  addContactShadow(shelterGroup, 1.75, 1.5, 0.7);

  const shelterVault = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(2.35, 1.38, 1.95, 0.08)),
    matDarkSteel,
  );
  shelterVault.position.y = 0.72;
  shelterVault.castShadow = castShadow;
  shelterVault.receiveShadow = true;
  shelterGroup.add(shelterVault);

  // Visible translucent blue water-wall shielding tanks hugging exterior walls
  const waterWallMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: '#0ea5e9',
      emissive: '#0369a1',
      emissiveIntensity: 0.28,
      roughness: 0.15,
      metalness: 0.08,
      transparent: true,
      opacity: 0.68,
    }),
  );
  [-1.24, 1.24].forEach((wx) => {
    const wallTank = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.18, 1.12, 1.72, 0.03)),
      waterWallMat,
    );
    wallTank.position.set(wx, 0.68, 0);
    wallTank.castShadow = castShadow;
    shelterGroup.add(wallTank);
  });

  const shelterHatch = new THREE.Mesh(
    trackGeo(createBeveledPanelGeometry(0.92, 1.05, 0.12, 0.03)),
    matMarsOrange,
  );
  shelterHatch.position.set(0, 0.64, 1.01);
  shelterGroup.add(shelterHatch);

  const shelterSign = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.56, 0.16, 0.04)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#ffb703',
        emissive: '#ffb703',
        emissiveIntensity: 1.2,
      }),
    ),
  );
  shelterSign.position.set(0, 1.26, 1.02);
  shelterGroup.add(shelterSign);

  shelterGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.userData.missionZoneId = 'shelter';
  });
  scene.add(shelterGroup);

  // ============================================================================
  // 10. ACTIVE CRITICAL SOL WORLD BEACON (Highlights current Mission Zone)
  // ============================================================================
  const zoneBeaconGroup = new THREE.Group();
  const zoneBeaconMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#FFB703',
      emissive: '#E85D04',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  const zoneBeaconRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.15, 1.38, 32)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#FFB703',
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  zoneBeaconRing.rotation.x = -Math.PI / 2;
  zoneBeaconRing.position.y = 0.08;
  zoneBeaconGroup.add(zoneBeaconRing);

  const zoneBeaconDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.2, 0)),
    zoneBeaconMat,
  );
  zoneBeaconDiamond.position.set(0, 2.35, 0);
  zoneBeaconDiamond.userData.nonPhysicalMarker = true;
  zoneBeaconGroup.add(zoneBeaconDiamond);
  zoneBeaconGroup.visible = false;
  scene.add(zoneBeaconGroup);

  // ============================================================================
  // 11. LOCALIZED MARS DUST DEVIL VORTEX + HABITAT AIRLOCK SHELTER BEACON
  // ============================================================================
  const dustDevilGroup = new THREE.Group();
  const funnelGeo = trackGeo(new THREE.CylinderGeometry(1.75, 0.42, 7.2, 20, 1, true));
  funnelGeo.translate(0, 3.6, 0);
  const funnelMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: '#d97736',
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const dustDevilFunnel = new THREE.Mesh(funnelGeo, funnelMat);
  dustDevilGroup.add(dustDevilFunnel);

  const vortexCount = quality === 'high' ? 160 : 90;
  const vortexPos = new Float32Array(vortexCount * 3);
  const dustDevilParticleSeeds = new Float32Array(vortexCount * 3); // [phaseAngle, heightNorm, swirlSpeed]
  for (let i = 0; i < vortexCount; i++) {
    const hNorm = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.45 + hNorm * 1.65 + (Math.random() - 0.5) * 0.25;
    vortexPos[i * 3] = Math.cos(angle) * radius;
    vortexPos[i * 3 + 1] = hNorm * 7.2;
    vortexPos[i * 3 + 2] = Math.sin(angle) * radius;
    dustDevilParticleSeeds[i * 3] = angle;
    dustDevilParticleSeeds[i * 3 + 1] = hNorm;
    dustDevilParticleSeeds[i * 3 + 2] = 3.2 + (1 - hNorm) * 4.5;
  }
  const vortexGeo = trackGeo(new THREE.BufferGeometry());
  vortexGeo.setAttribute('position', new THREE.BufferAttribute(vortexPos, 3));
  const vortexMat = trackMat(
    new THREE.PointsMaterial({
      map: dustSpriteTex,
      color: '#f59e56',
      size: 0.58,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    }),
  );
  const dustDevilPoints = new THREE.Points(vortexGeo, vortexMat);
  dustDevilGroup.add(dustDevilPoints);
  dustDevilGroup.visible = false;
  scene.add(dustDevilGroup);

  const habShelterGroup = new THREE.Group();
  habShelterGroup.position.set(airPose.stepX, habY + 0.08, airPose.stepZ);
  const habShelterRing = new THREE.Mesh(
    trackGeo(new THREE.RingGeometry(1.55, 1.88, 36)),
    trackMat(
      new THREE.MeshBasicMaterial({
        color: '#22C55E',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  habShelterRing.rotation.x = -Math.PI / 2;
  habShelterGroup.add(habShelterRing);

  const habShelterDiamond = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.28, 0)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#22C55E',
        emissive: '#22C55E',
        emissiveIntensity: 2.1,
        roughness: 0.2,
      }),
    ),
  );
  habShelterDiamond.position.set(0, 2.85, 0);
  habShelterDiamond.userData.nonPhysicalMarker = true;
  habShelterGroup.add(habShelterDiamond);
  habShelterGroup.visible = false;
  scene.add(habShelterGroup);

  // ============================================================================
  // 12. AEOLUS MARS WIND TURBINES (2 Ridge Horizontal Wide-Chord + 1 Vertical Helical)
  // ============================================================================
  const windmillGroup = new THREE.Group();
  const windmillRotors: THREE.Group[] = [];
  const windmillVerticalRotors: THREE.Group[] = [];

  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(0, 0);
  bladeShape.lineTo(0.24, 0.35);
  bladeShape.lineTo(0.18, 2.35);
  bladeShape.lineTo(0.05, 2.75);
  bladeShape.lineTo(-0.06, 2.72);
  bladeShape.lineTo(-0.11, 0.32);
  bladeShape.closePath();
  const windBladeGeo = trackGeo(
    new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.012,
      bevelSegments: 2,
    }),
  );
  windBladeGeo.translate(0, 0, -0.022);

  const towerProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.56, 0.0),
    new THREE.Vector2(0.42, 0.45),
    new THREE.Vector2(0.28, 3.2),
    new THREE.Vector2(0.2, 6.4),
    new THREE.Vector2(0.0, 6.45),
  ];
  const windTowerGeo = trackGeo(new THREE.LatheGeometry(towerProfile, 14));

  const windLocations = m.windmills;

  windLocations.forEach(([wx, wz, yaw]) => {
    const turbine = new THREE.Group();
    turbine.position.set(wx, gAt(wx, wz), wz);
    turbine.rotation.y = yaw;
    addContactShadow(turbine, 1.9, 1.9, 0.65);

    const pad = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.15, 1.25, 0.26, 24)), matDarkSteel);
    pad.position.y = 0.13;
    pad.castShadow = castShadow;
    pad.receiveShadow = true;
    turbine.add(pad);

    const tower = new THREE.Mesh(windTowerGeo, matHullPanel);
    tower.position.y = 0.24;
    tower.castShadow = castShadow;
    turbine.add(tower);

    const orangeCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.29, 0.31, 0.24, 14)), matMarsOrange);
    orangeCollar.position.y = 3.45;
    turbine.add(orangeCollar);

    // 4 steel guy-struts anchoring base
    for (let s = 0; s < 4; s++) {
      const a = (s / 4) * Math.PI * 2 + Math.PI / 4;
      const strutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * 1.05, 0.25, Math.sin(a) * 1.05),
        new THREE.Vector3(Math.cos(a) * 0.32, 1.95, Math.sin(a) * 0.32),
      ]);
      const strut = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(strutCurve, 6, 0.032, 6, false)), matDarkSteel);
      turbine.add(strut);
    }

    // Nacelle housing + aviation strobe + rear cooler
    const nacelle = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.68, 0.64, 1.35, 0.05)), matHullPanel);
    nacelle.position.set(0, 6.72, -0.15);
    nacelle.castShadow = castShadow;
    turbine.add(nacelle);

    const nacelleBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.085, 10, 8)), trackMat(matWarmWindow.clone()));
    nacelleBeacon.position.set(0, 7.12, -0.45);
    nacelleBeacon.userData.nonPhysicalMarker = true;
    turbine.add(nacelleBeacon);
    colonyBlinkingLights.push(nacelleBeacon);

    // 3-blade wide-chord rotor assembly (spins around local Z)
    const rotorHub = new THREE.Group();
    rotorHub.position.set(0, 6.72, 0.68);
    const noseCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.24, 0.56, 14)), matMarsOrange);
    noseCone.rotation.x = Math.PI / 2;
    noseCone.position.z = 0.24;
    rotorHub.add(noseCone);

    for (let b = 0; b < 3; b++) {
      const bWrap = new THREE.Group();
      bWrap.rotation.z = (b / 3) * Math.PI * 2;
      const blade = new THREE.Mesh(windBladeGeo, matBrushedAlum);
      blade.rotation.y = 0.22; // wide-chord pitch angle for thin 0.02 kg/m3 Mars air
      blade.castShadow = castShadow;
      const tipStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.38, 0.065)), matMarsOrange);
      tipStripe.position.set(0.04, 2.5, 0);
      tipStripe.userData.nonPhysicalMarker = true;
      blade.add(tipStripe);
      bWrap.add(blade);
      rotorHub.add(bWrap);
    }

    turbine.add(rotorHub);
    windmillRotors.push(rotorHub);
    windmillGroup.add(turbine);
  });

  // Compact Vertical-Axis Helical Turbine
  const vTurbine = new THREE.Group();
  const vtX = m.verticalTurbine.x;
  const vtZ = m.verticalTurbine.z;
  vTurbine.position.set(vtX, gAt(vtX, vtZ), vtZ);
  addContactShadow(vTurbine, 0.9, 0.9, 0.55);

  const vtBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.58, 0.34, 10)), matDarkSteel);
  vtBase.position.y = 0.17;
  vtBase.castShadow = castShadow;
  vTurbine.add(vtBase);

  const vtShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 3.0, 10)), matBrushedAlum);
  vtShaft.position.y = 1.65;
  vtShaft.castShadow = castShadow;
  vTurbine.add(vtShaft);

  const vRotor = new THREE.Group();
  vRotor.position.y = 2.05;
  for (let b = 0; b < 3; b++) {
    const startAng = (b / 3) * Math.PI * 2;
    const hPts: THREE.Vector3[] = [];
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      const ang = startAng + t * 1.45;
      const rad = 0.42 + Math.sin(t * Math.PI) * 0.22;
      hPts.push(new THREE.Vector3(Math.cos(ang) * rad, (t - 0.5) * 1.65, Math.sin(ang) * rad));
    }
    const hBlade = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hPts), 14, 0.048, 8, false)),
      matMarsOrange,
    );
    hBlade.castShadow = castShadow;
    vRotor.add(hBlade);
  }
  vTurbine.add(vRotor);
  windmillVerticalRotors.push(vRotor);
  windmillGroup.add(vTurbine);

  registerInteractive(windmillGroup, 'windmill');
  scene.add(windmillGroup);

  // ============================================================================
  // 13. SWIM SUBSURFACE ICE DRILL DERRICK & CORE LAB
  // ============================================================================
  const iceDrillGroup = new THREE.Group();
  const idX = m.iceDrill.x;
  const idZ = m.iceDrill.z;
  const idY = gAt(idX, idZ);
  iceDrillGroup.position.set(idX, idY, idZ);
  iceDrillGroup.rotation.y = m.iceDrill.yaw;
  addContactShadow(iceDrillGroup, 2.4, 2.4, 0.65);

  const drillDeck = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.90, 2.00, 0.30, 12)), matDarkSteel);
  drillDeck.position.y = 0.15;
  drillDeck.castShadow = castShadow;
  drillDeck.receiveShadow = true;
  iceDrillGroup.add(drillDeck);

  // Frosted ice borehole collar
  const iceCollar = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.45, 0.11, 8, 18)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: '#bae6fd',
        emissive: '#0284c7',
        emissiveIntensity: 0.35,
        roughness: 0.25,
      }),
    ),
  );
  iceCollar.rotation.x = Math.PI / 2;
  iceCollar.position.y = 0.28;
  iceDrillGroup.add(iceCollar);

  // 3 Tripod derrick legs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 1.45, 0.24, Math.sin(a) * 1.45),
      new THREE.Vector3(0, 3.65, 0),
    ]);
    const leg = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(c, 8, 0.065, 8, false)), matMarsOrange);
    leg.castShadow = castShadow;
    iceDrillGroup.add(leg);
  }
  const drillMotor = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.68, 0.56, 0.68, 0.04)), matDarkSteel);
  drillMotor.position.y = 2.6;
  iceDrillGroup.add(drillMotor);

  const drillBit = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.07, 2.6, 10)), matBrushedAlum);
  drillBit.position.y = 1.3;
  iceDrillGroup.add(drillBit);

  // Meltwater condenser tank & core tray beside derrick
  const meltTank = new THREE.Mesh(trackGeo(o2TankGeo), matWaterBlue);
  meltTank.scale.setScalar(0.85);
  meltTank.position.set(1.25, 0.25, 0.4);
  meltTank.castShadow = castShadow;
  iceDrillGroup.add(meltTank);

  const drillBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, 10, 8)), trackMat(matCyanGlow.clone()));
  drillBeacon.position.set(0, 3.75, 0);
  drillBeacon.userData.nonPhysicalMarker = true;
  iceDrillGroup.add(drillBeacon);
  colonyBlinkingLights.push(drillBeacon);

  registerInteractive(iceDrillGroup, 'ice-drill');
  scene.add(iceDrillGroup);

  // ============================================================================
  // 14. ARES HEAVY LANDING PAD & PROPELLANT DEPOT + GAMEPLAY INFRASTRUCTURE
  // ============================================================================
  const landingPadGroup = new THREE.Group();
  const lpX = m.landingPad.x;
  const lpZ = m.landingPad.z;
  const lpY = gAt(lpX, lpZ);
  landingPadGroup.position.set(lpX, lpY, lpZ);
  addContactShadow(landingPadGroup, 5.4, 5.4, 0.5);

  const apronSlab = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(m.landingPad.apronRadius - 0.04, m.landingPad.apronRadius, 0.8, 24)),
    matDarkSteel,
  );
  apronSlab.position.y = -0.18;
  apronSlab.receiveShadow = true;
  landingPadGroup.add(apronSlab);

  const landingPadDecalTex = trackTex(createLandingPadDecalTexture(maxAniso));
  const landingPadDecalMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: landingPadDecalTex,
      roughness: 0.62,
      metalness: 0.12,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const padDecalMesh = new THREE.Mesh(
    trackGeo(new THREE.CircleGeometry(m.landingPad.apronRadius - 0.16, 48)),
    landingPadDecalMat,
  );
  padDecalMesh.rotation.x = -Math.PI / 2;
  padDecalMesh.position.y = 0.232;
  padDecalMesh.renderOrder = 5;
  padDecalMesh.receiveShadow = true;
  padDecalMesh.userData.nonPhysicalMarker = true;
  landingPadGroup.add(padDecalMesh);

  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
    const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 0.65, 8)), matDarkSteel);
    post.position.set(Math.cos(a) * 4.45, 0.42, Math.sin(a) * 4.45);
    landingPadGroup.add(post);

    const lamp = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.095, 8, 8)), trackMat(matWarmWindow.clone()));
    lamp.position.set(Math.cos(a) * 4.45, 0.78, Math.sin(a) * 4.45);
    lamp.userData.nonPhysicalMarker = true;
    landingPadGroup.add(lamp);
    colonyBlinkingLights.push(lamp);
  }

  [-1.2, 1.2].forEach((cz, idx) => {
    const propTank = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.68, 16, 12)),
      idx === 0 ? matHullPanel : matBrushedAlum,
    );
    propTank.position.set(4.65, 0.95, cz);
    propTank.castShadow = castShadow;
    landingPadGroup.add(propTank);

    const leg = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.44, 0.55, 8)), matDarkSteel);
    leg.position.set(4.65, 0.28, cz);
    landingPadGroup.add(leg);
  });

  const cargoPod = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(1.9, 1.15, 1.15, 0.04)), matMarsOrange);
  cargoPod.position.set(4.4, 0.64, -3.1);
  cargoPod.rotation.y = 0.22;
  cargoPod.castShadow = castShadow;
  landingPadGroup.add(cargoPod);

  const cargoTealStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.94, 0.14, 1.19)), matScienceTeal);
  cargoTealStripe.position.set(4.4, 0.92, -3.1);
  cargoTealStripe.rotation.y = 0.22;
  cargoTealStripe.userData.nonPhysicalMarker = true;
  landingPadGroup.add(cargoTealStripe);

  registerInteractive(landingPadGroup, 'landing-pad');
  scene.add(landingPadGroup);

  // Gameplay Rover Charging Pad + Roads + Instanced Kerbs + Solar Bollards + Signposts + Utility Bridges
  let roverPadGroup: THREE.Group | null = null;
  let bollardLampMat: THREE.MeshStandardMaterial | null = null;

  if (m.roverPad.enabled) {
    const rp = m.roverPad;
    const rpY = gAt(rp.x, rp.z);
    roverPadGroup = new THREE.Group();
    roverPadGroup.position.set(rp.x, rpY, rp.z);

    const slabMesh = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(rp.widthM, 0.44, rp.depthM)),
      matDarkSteel,
    );
    slabMesh.position.y = rp.topOffset - 0.22;
    slabMesh.receiveShadow = true;
    roverPadGroup.add(slabMesh);

    const bayStripeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#f59e0b',
        roughness: 0.55,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    const bayBox = new THREE.Mesh(trackGeo(new THREE.RingGeometry(2.1, 2.32, 4)), bayStripeMat);
    bayBox.rotation.x = -Math.PI / 2;
    bayBox.rotation.z = Math.PI / 4;
    bayBox.position.y = rp.topOffset + 0.012;
    bayBox.renderOrder = 5;
    roverPadGroup.add(bayBox);

    // Corner charging pylon clear of rover parking bay
    const pylonGroup = new THREE.Group();
    pylonGroup.position.set(-rp.widthM * 0.5 + 0.55, rp.topOffset, -rp.depthM * 0.5 + 0.55);
    pylonGroup.rotation.y = 0.3;
    const pylonBody = new THREE.Mesh(
      trackGeo(createBeveledPanelGeometry(0.64, 1.32, 0.64, 0.03)),
      matHullPanel,
    );
    pylonBody.position.y = 0.66;
    pylonBody.castShadow = castShadow;
    pylonGroup.add(pylonBody);
    const pylonLed = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.14, 0.06)), trackMat(matCyanGlow.clone()));
    pylonLed.position.set(0, 1.05, 0.33);
    pylonLed.userData.nonPhysicalMarker = true;
    pylonGroup.add(pylonLed);

    const pylonMast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 8)), matBrushedAlum);
    pylonMast.position.set(0, 1.75, 0);
    pylonMast.userData.nonPhysicalMarker = true;
    pylonGroup.add(pylonMast);

    const pylonSolar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 0.04, 0.55)), matSolarWafer);
    pylonSolar.position.set(0, 2.32, 0);
    pylonSolar.rotation.x = 0.28;
    pylonSolar.userData.nonPhysicalMarker = true;
    pylonGroup.add(pylonSolar);

    const pylonBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.065, 8, 8)), trackMat(matGreenGlow.clone()));
    pylonBeacon.position.set(0.28, 2.4, 0);
    pylonBeacon.userData.nonPhysicalMarker = true;
    pylonGroup.add(pylonBeacon);
    colonyBlinkingLights.push(pylonBeacon);

    roverPadGroup.add(pylonGroup);

    registerInteractive(roverPadGroup, 'rover');
    scene.add(roverPadGroup);
  }

  if (layout.mode === 'gameplay' && layout.roads.length > 0) {
    const roadTex = createRoadSurfaceTextures(maxAniso);
    trackTex(roadTex.map);
    trackTex(roadTex.roughnessMap);

    roadTex.map.repeat.set(1, 1);
    roadTex.roughnessMap.repeat.set(1, 1);

    const matMainRoad = trackMat(
      new THREE.MeshStandardMaterial({
        map: roadTex.map,
        roughnessMap: roadTex.roughnessMap,
        color: '#b58d7f',
        roughness: 0.88,
        metalness: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      }),
    );
    const matFootpath = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#b88874',
        roughness: 0.9,
        metalness: 0.03,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    const matKerb = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#64748b',
        roughness: 0.72,
        metalness: 0.25,
      }),
    );

    const buildRoadStadiumGeometry = (widthM: number, lenM: number): THREE.ShapeGeometry => {
      const halfW = widthM * 0.5;
      const halfL = lenM * 0.5;
      const shape = new THREE.Shape();
      shape.moveTo(halfW, -halfL);
      shape.lineTo(halfW, halfL);
      shape.absarc(0, halfL, halfW, 0, Math.PI, false);
      shape.lineTo(-halfW, -halfL);
      shape.absarc(0, -halfL, halfW, Math.PI, Math.PI * 2, false);
      const geo = new THREE.ShapeGeometry(shape, 12);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const uvs = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        uvs[i * 2] = px / widthM + 0.5;
        uvs[i * 2 + 1] = py / 3.4;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.rotateX(-Math.PI / 2);
      return geo;
    };

    // Compacted Courtyard Plaza (base layer below footpaths & ring spokes so zero Z-fighting)
    const courtyard = layout.pads.find((p) => p.id === 'airlock-courtyard');
    if (courtyard && courtyard.halfX && courtyard.halfZ) {
      const courtGeo = trackGeo(new THREE.PlaneGeometry(courtyard.halfX * 2, courtyard.halfZ * 2));
      const courtUv = courtGeo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < courtUv.count; i++) {
        courtUv.setXY(i, courtUv.getX(i) * 1.5, courtUv.getY(i) * 1.2);
      }
      const courtMesh = new THREE.Mesh(courtGeo, matFootpath);
      courtMesh.rotation.x = -Math.PI / 2;
      courtMesh.position.set(courtyard.x, gAt(courtyard.x, courtyard.z) + 0.01, courtyard.z);
      courtMesh.renderOrder = 2;
      courtMesh.receiveShadow = true;
      scene.add(courtMesh);
    }

    // Road strips & kerb instance transforms (unique staggered Y per segment eliminates all junction Z-fighting)
    const kerbMatrices: THREE.Matrix4[] = [];
    const kDummy = new THREE.Object3D();
    let footpathLayer = 0;
    let mainRoadLayer = 0;

    for (const seg of layout.roads) {
      const dx = seg.x2 - seg.x1;
      const dz = seg.z2 - seg.z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      const cx = (seg.x1 + seg.x2) * 0.5;
      const cz = (seg.z1 + seg.z2) * 0.5;
      const isFootpath = seg.category === 'footpath';
      const yOff = isFootpath
        ? 0.014 + footpathLayer++ * 0.0008
        : 0.025 + mainRoadLayer++ * 0.0008;
      const cy = gAt(cx, cz) + yOff;
      const yaw = Math.atan2(dx, dz);

      const strip = new THREE.Mesh(
        trackGeo(buildRoadStadiumGeometry(seg.widthM, len)),
        isFootpath ? matFootpath : matMainRoad,
      );
      strip.rotation.y = yaw;
      strip.position.set(cx, cy, cz);
      strip.renderOrder = isFootpath ? 3 : 4;
      strip.receiveShadow = true;
      scene.add(strip);

      // Decorative kerb blocks on ring & spoke edges (collider-free, stepped smoothly)
      if (seg.category === 'ring' || seg.category === 'spoke') {
        const ux = dx / len;
        const uz = dz / len;
        const rx = uz;
        const rz = -ux;
        const steps = Math.max(2, Math.floor(len / 3.2));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          const px = seg.x1 + dx * t;
          const pz = seg.z1 + dz * t;
          for (const side of [-1, 1]) {
            const kx = px + rx * side * (seg.widthM * 0.5 + 0.08);
            const kz = pz + rz * side * (seg.widthM * 0.5 + 0.08);
            kDummy.position.set(kx, gAt(kx, kz) + 0.03, kz);
            kDummy.rotation.set(0, yaw, 0);
            kDummy.updateMatrix();
            kerbMatrices.push(kDummy.matrix.clone());
          }
        }
      }
    }

    if (kerbMatrices.length > 0) {
      const kerbGeo = trackGeo(new THREE.BoxGeometry(0.14, 0.06, 0.72));
      const kerbInst = new THREE.InstancedMesh(kerbGeo, matKerb, kerbMatrices.length);
      kerbMatrices.forEach((mat4, idx) => kerbInst.setMatrixAt(idx, mat4));
      kerbInst.instanceMatrix.needsUpdate = true;
      kerbInst.receiveShadow = true;
      kerbInst.computeBoundingSphere();
      scene.add(kerbInst);
    }

    // Instanced Solar Corridor Bollards
    if (layout.bollards.length > 0) {
      bollardLampMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: '#ffd166',
          emissive: '#ffb703',
          emissiveIntensity: 1.75,
          roughness: 0.2,
        }),
      );
      const postGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.09, 0.78, 8));
      const lensGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 8));
      const postInst = new THREE.InstancedMesh(postGeo, matDarkSteel, layout.bollards.length);
      const lensInst = new THREE.InstancedMesh(lensGeo, bollardLampMat, layout.bollards.length);
      layout.bollards.forEach((bol, idx) => {
        const by = gAt(bol.x, bol.z);
        kDummy.position.set(bol.x, by + 0.39, bol.z);
        kDummy.rotation.set(0, 0, 0);
        kDummy.updateMatrix();
        postInst.setMatrixAt(idx, kDummy.matrix);

        kDummy.position.set(bol.x, by + 0.84, bol.z);
        kDummy.updateMatrix();
        lensInst.setMatrixAt(idx, kDummy.matrix);
      });
      postInst.instanceMatrix.needsUpdate = true;
      lensInst.instanceMatrix.needsUpdate = true;
      postInst.computeBoundingSphere();
      lensInst.computeBoundingSphere();
      postInst.castShadow = castShadow;
      scene.add(postInst);
      scene.add(lensInst);
    }

    // Crisp Text-Only Base Signposts
    for (const sp of layout.signposts) {
      const sGroup = new THREE.Group();
      sGroup.position.set(sp.x, gAt(sp.x, sp.z), sp.z);
      sGroup.rotation.y = sp.yawRad;

      const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.06, 1.62, 8)), matDarkSteel);
      pole.position.y = 0.81;
      pole.castShadow = castShadow;
      sGroup.add(pole);

      const boardBack = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.94, 0.48, 0.06, 0.015)), matDarkSteel);
      boardBack.position.set(0, 1.52, 0);
      boardBack.castShadow = castShadow;
      sGroup.add(boardBack);

      const plaqueTex = trackTex(createOutpostSignTexture(sp.title, sp.subtitle, maxAniso));
      const plaqueMat = trackMat(
        new THREE.MeshStandardMaterial({
          map: plaqueTex,
          roughness: 0.38,
        }),
      );
      const faceF = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.86, 0.42)), plaqueMat);
      faceF.position.set(0, 1.52, 0.05);
      sGroup.add(faceF);

      const faceB = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.86, 0.42)), plaqueMat);
      faceB.rotation.y = Math.PI;
      faceB.position.set(0, 1.52, -0.05);
      sGroup.add(faceB);

      scene.add(sGroup);
    }

    // Raised Pipe Bridges & Bevelled Cable Ramps
    for (const ub of layout.utilityBridges) {
      const cyBase = gAt((ub.x1 + ub.x2) * 0.5, (ub.z1 + ub.z2) * 0.5);
      if (ub.kind === 'pipe-bridge') {
        const yA = gAt(ub.x1, ub.z1);
        const yB = gAt(ub.x2, ub.z2);
        const postH = ub.clearanceY + 0.28;
        [
          [ub.x1, yA, ub.z1],
          [ub.x2, yB, ub.z2],
        ].forEach(([px, py, pz]) => {
          const p = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.17, postH, 10)), matDarkSteel);
          p.position.set(px, py + postH * 0.5, pz);
          p.castShadow = castShadow;
          scene.add(p);
        });
        const span = computeCorridorTransform(
          ub.x1,
          cyBase + ub.clearanceY + 0.18,
          ub.z1,
          ub.x2,
          cyBase + ub.clearanceY + 0.18,
          ub.z2,
        );
        const spanMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.4, 0.32, span.length)), matBrushedAlum);
        spanMesh.position.set(span.cx, span.cy, span.cz);
        spanMesh.quaternion.set(span.quaternion.x, span.quaternion.y, span.quaternion.z, span.quaternion.w);
        spanMesh.castShadow = castShadow;
        scene.add(spanMesh);
      } else {
        const rx = (ub.x1 + ub.x2) * 0.5;
        const rz = (ub.z1 + ub.z2) * 0.5;
        const yaw = Math.atan2(ub.x2 - ub.x1, ub.z2 - ub.z1);
        const ramp = new THREE.Mesh(
          trackGeo(createBeveledPanelGeometry(ub.widthM * 0.96, 0.064, 0.48, 0.02)),
          matMarsOrange,
        );
        ramp.position.set(rx, cyBase + 0.036, rz);
        ramp.rotation.y = yaw;
        ramp.receiveShadow = true;
        scene.add(ramp);
      }
    }
  }

  // ============================================================================
  // 15. DISTANT AUTONOMOUS SCOUT ROVER (Animated Patrol Outside Colony Perimeter)
  // ============================================================================
  let distantRover: { group: THREE.Group; wheels: THREE.Group[] } | null = null;
  {
    const drGroup = new THREE.Group();
    const drR = layout.mode === 'gameplay' ? 55 : 37;
    drGroup.position.set(drR, gAt(drR, 0), 0);

    const drBody = new THREE.Mesh(trackGeo(createBeveledPanelGeometry(0.95, 0.34, 1.35, 0.03)), matHullPanel);
    drBody.position.y = 0.44;
    drBody.castShadow = castShadow;
    drGroup.add(drBody);

    const drTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.98, 0.1, 1.2)), matMarsOrange);
    drTrim.position.y = 0.56;
    drGroup.add(drTrim);

    const drSolar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.86, 0.04, 0.75)), matSolarWafer);
    drSolar.position.set(0, 0.63, -0.22);
    drGroup.add(drSolar);

    const drMast = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.035, 0.04, 0.58, 8)), matBrushedAlum);
    drMast.position.set(0, 0.85, 0.38);
    drGroup.add(drMast);

    const drHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.14, 0.16)), matDarkSteel);
    drHead.position.set(0, 1.15, 0.42);
    drGroup.add(drHead);

    const drVisor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.06, 0.03)), matCyanGlow);
    drVisor.position.set(0, 1.15, 0.51);
    drGroup.add(drVisor);

    const drBeacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.055, 8, 8)), trackMat(matGreenGlow.clone()));
    drBeacon.position.set(-0.34, 0.92, -0.48);
    drGroup.add(drBeacon);
    colonyBlinkingLights.push(drBeacon);

    const drWheels: THREE.Group[] = [];
    const drWheelGeo = trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12));
    drWheelGeo.rotateZ(Math.PI / 2);
    const drHubGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 8));
    drHubGeo.rotateZ(Math.PI / 2);
    [
      [-0.56, 0.22, 0.46],
      [0.56, 0.22, 0.46],
      [-0.56, 0.22, -0.46],
      [0.56, 0.22, -0.46],
    ].forEach(([wx, wy, wz]) => {
      const wPivot = new THREE.Group();
      wPivot.position.set(wx, wy, wz);
      const tire = new THREE.Mesh(drWheelGeo, matTireRubber);
      tire.castShadow = castShadow;
      wPivot.add(tire);
      const hub = new THREE.Mesh(drHubGeo, matMarsOrange);
      wPivot.add(hub);
      drGroup.add(wPivot);
      drWheels.push(wPivot);
    });

    scene.add(drGroup);
    distantRover = { group: drGroup, wheels: drWheels };
  }

  const buildPoint = (spec: { x: number; z: number; yOffset?: number }) =>
    new THREE.Vector3(spec.x, gAt(spec.x, spec.z) + (spec.yOffset ?? 0), spec.z);

  const landmarkCenters: Record<OutpostLandmarkId, THREE.Vector3> = {
    habitat: buildPoint(layout.landmarkFocusCoords.habitat),
    greenhouse: buildPoint(layout.landmarkFocusCoords.greenhouse),
    solar: buildPoint(layout.landmarkFocusCoords.solar),
    rover: buildPoint(layout.landmarkFocusCoords.rover),
    astronaut: buildPoint(layout.landmarkFocusCoords.astronaut),
    'power-console': buildPoint(layout.landmarkFocusCoords['power-console']),
    windmill: buildPoint(layout.landmarkFocusCoords.windmill),
    'ice-drill': buildPoint(layout.landmarkFocusCoords['ice-drill']),
    'landing-pad': buildPoint(layout.landmarkFocusCoords['landing-pad']),
  };

  const stationInteractPoints: Record<OutpostLandmarkId, THREE.Vector3> = {
    habitat: buildPoint(layout.stationInteractCoords.habitat),
    greenhouse: buildPoint(layout.stationInteractCoords.greenhouse),
    solar: buildPoint(layout.stationInteractCoords.solar),
    rover: buildPoint(layout.stationInteractCoords.rover),
    astronaut: buildPoint(layout.stationInteractCoords.astronaut),
    'power-console': buildPoint(layout.stationInteractCoords['power-console']),
    windmill: buildPoint(layout.stationInteractCoords.windmill),
    'ice-drill': buildPoint(layout.stationInteractCoords['ice-drill']),
    'landing-pad': buildPoint(layout.stationInteractCoords['landing-pad']),
  };

  const zonePositions: Record<MissionZoneId, THREE.Vector3> = {
    tank2: buildPoint(layout.zoneCoords.tank2),
    solar: buildPoint(layout.zoneCoords.solar),
    recycler: buildPoint(layout.zoneCoords.recycler),
    greenhouse: buildPoint(layout.zoneCoords.greenhouse),
    shelter: buildPoint(layout.zoneCoords.shelter),
  };

  const moduleRoots: Record<string, THREE.Object3D> = {
    habitat: habGroup,
    'hab-airlock': airlockGroup,
    chapea: chapeaWing,
    'conn-hab-chapea': rearConnMesh,
    greenhouse: ghGroup,
    'conn-hab-gh': tunnelMesh,
    solar: solarGroup,
    'battery-bank': batBank,
    windmills: windmillGroup,
    'ice-drill': iceDrillGroup,
    'landing-pad': landingPadGroup,
    'power-console': powerConsoleGroup,
    tank2: tank2Group,
    recycler: recyclerGroup,
    shelter: shelterGroup,
    rover: roverGroup,
  };
  if (suitVestibuleGroup) moduleRoots['hab-suit-vestibule'] = suitVestibuleGroup;
  if (skybridgeCollarsGroup) moduleRoots['conn-hab-gh-collars'] = skybridgeCollarsGroup;
  if (roverPadGroup) moduleRoots['rover-pad'] = roverPadGroup;

  return {
    interactiveTargets,
    dishMast,
    solarWings,
    solarDustMats,
    windmillRotors,
    windmillVerticalRotors,
    roverGroup,
    roverHead,
    roverLeftRockerPivot,
    roverRightRockerPivot,
    roverDiffBar,
    roverWheelOffsets,
    roverWheels,
    roverEyeMat,
    roverGuideBeam,
    roverGuideBeamMat,
    updateRoverNameplate,
    astroGroup,
    astroPelvisGroup,
    astroTorsoGroup,
    astroHeadGroup,
    astroRightArmPivot,
    astroLeftArmPivot,
    astroRightElbowPivot,
    astroLeftElbowPivot,
    astroLeftLegPivot,
    astroRightLegPivot,
    astroLeftKneePivot,
    astroRightKneePivot,
    astroLeftAnklePivot,
    astroRightAnklePivot,
    crewRigs,
    fpScene,
    fpCamera,
    fpArmsGroup,
    fpLeftArm,
    fpRightArm,
    powerConsoleGroup,
    powerBeaconRing,
    powerBeaconDiamond,
    powerBeaconRingMat,
    zoneBeaconGroup,
    zoneBeaconRing,
    zoneBeaconDiamond,
    zoneBeaconMat,
    dustDevilGroup,
    dustDevilFunnel,
    dustDevilPoints,
    dustDevilParticleSeeds,
    habShelterGroup,
    habShelterRing,
    habShelterDiamond,
    tank2ValveWheel,
    tank2LeakPoints,
    tank2LeakPositions,
    tank2LeakMat,
    recyclerStatusMat,
    ghFrostMat,
    matWarmWindow,
    matConsoleScreen,
    bollardLampMat,
    habWindowGlow,
    ghLight,
    roverBasePos: { x: roverBaseX, z: roverBaseZ },
    astroBasePos: { x: astroX, z: astroZ, yaw: m.astroSpawn.yaw },
    stationInteractPoints,
    landmarkCenters,
    zonePositions,
    moduleRoots,
    colonyBlinkingLights,
    distantRover,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
